from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
import random
import uuid
import asyncio
import time

from app.db.session import get_db, AsyncSessionLocal
from app.models.account import Account, Fingerprint
from app.models.task import Task
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, BulkDisconnectRequest, BulkAccountCreate, BulkImportStatus
from app.schemas.user import UserResponse, Token, UserCreate
from app.services.fingerprint_service import FingerprintService
from app.services.instagram_service import InstagramService
from app.core.security import verify_password, create_access_token, get_password_hash
from app.routers.deps import get_current_user, check_role
from instagrapi.exceptions import ChallengeRequired, TwoFactorRequired
from fastapi.security import OAuth2PasswordRequestForm

# In-memory storage for bulk import jobs (for progress tracking)
bulk_import_jobs: Dict[str, Dict[str, Any]] = {}

router = APIRouter()

@router.post("/auth/login", response_model=Token)
async def login_for_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(["admin"]))
):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.post("/users", response_model=UserResponse)
async def create_new_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_role(["admin"]))
):
    # Check if exists
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or "operator",
        is_active=user_in.is_active
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/", response_model=AccountResponse)
async def create_account(
    account_in: AccountCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"Received create_account request: {account_in}")
        # 1. Check if exists
        stmt = select(Account).where(Account.username == account_in.username)
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Username already exists")

        # 2. Proxy Validation (Optional)
        # if not account_in.proxy or not account_in.proxy.strip():
        #     raise HTTPException(status_code=400, detail="Proxy is required for login. Please provide a proxy or select a template.")

        # 3. Generate Fingerprint
        fp_service = FingerprintService(db)
        print("Generating fingerprint...")
        fp = await fp_service.create_fingerprint(user_id=current_user.id)
        print(f"Fingerprint generated: {fp.id}")

        # 3. Create Account
        new_account = Account(
            username=account_in.username,
            password_encrypted=account_in.password,
            seed_2fa=account_in.seed_2fa,
            proxy=account_in.proxy,
            cookies=account_in.cookies,
            login_method=account_in.login_method,
            fingerprint_id=fp.id,
            user_id=current_user.id
        )
        
        db.add(new_account)
        await db.commit()
        await db.refresh(new_account)
        
        # 4. Trigger Login (Async) if credentials provided
        if account_in.password or account_in.cookies:
            background_tasks.add_task(perform_login, new_account.id)

        return new_account
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR IN create_account: {e}")
        raise e

from fastapi import Query
from datetime import datetime
from typing import Optional

@router.get("/", response_model=List[AccountResponse])
async def list_accounts(
    skip: int = 0, 
    limit: int = 100, 
    login_after: Optional[datetime] = None,
    login_before: Optional[datetime] = None,
    has_executed: Optional[List[str]] = Query(None),
    status: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Account)
    
    # Isolation: Only show own accounts unless admin
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
    
    # Filter by Last Login Date (or Created At if login is null, matching UI behavior)
    date_field = func.coalesce(Account.last_login, Account.created_at)
    
    if login_after:
        stmt = stmt.where(date_field >= login_after)
    if login_before:
        stmt = stmt.where(date_field <= login_before)
        
    # Filter by Status
    if status:
        stmt = stmt.where(Account.status.in_(status))

    # Filter by Executed Activity
    if has_executed:
        stmt = stmt.join(Task, Task.account_id == Account.id).where(
            Task.task_type.in_(has_executed),
            Task.status == 'completed'
        ).distinct()

    stmt = stmt.order_by(Account.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/bulk")
async def bulk_create_accounts(
    bulk_data: BulkAccountCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create multiple accounts at once with staggered login support.
    Returns a job_id for progress tracking.
    """
    job_id = str(uuid.uuid4())
    results = []
    created_count = 0
    error_count = 0
    account_ids = []
    
    # Initialize job tracking
    bulk_import_jobs[job_id] = {
        "user_id": current_user.id,
        "status": "creating",
        "total": len(bulk_data.accounts),
        "created": 0,
        "failed": 0,
        "pending_login": 0,
        "logged_in": 0,
        "login_failed": 0,
        "results": [],
        "staggered_login": bulk_data.staggered_login,
        "min_delay": bulk_data.min_delay,
        "max_delay": bulk_data.max_delay,
        "batch_size": bulk_data.batch_size
    }
    
    # Validation: Proxy is now optional. If none provided, server IP will be used.
    
    # 10 Proxy Minimum Validation - REMOVED or RELAXED
    # We'll allow any number of proxies in the pool.

    for item in bulk_data.accounts:
        try:
            # Check if username already exists
            stmt = select(Account).where(Account.username == item.username)
            result = await db.execute(stmt)
            if result.scalars().first():
                results.append({
                    "username": item.username,
                    "success": False,
                    "error": "Username already exists",
                    "login_status": "skipped"
                })
                error_count += 1
                continue
            
            # Generate fingerprint
            fp_service = FingerprintService(db)
            fp = await fp_service.create_fingerprint()
            
            # Determine proxy (individual -> pool/random -> common)
            proxy = item.proxy
            if not proxy or not proxy.strip():
                if bulk_data.proxy_pool:
                    proxy = random.choice(bulk_data.proxy_pool)
                else:
                    proxy = bulk_data.common_proxy
            
            # Create account
            new_account = Account(
                username=item.username,
                password_encrypted=item.password,
                seed_2fa=item.seed_2fa,
                proxy=proxy,
                cookies=item.cookies,
                login_method=item.login_method,
                fingerprint_id=fp.id,
                status="pending",
                user_id=current_user.id
            )
            
            db.add(new_account)
            await db.flush()  # Get the ID
            
            account_ids.append(new_account.id)
            
            results.append({
                "username": item.username,
                "success": True,
                "account_id": new_account.id,
                "login_status": "pending"
            })
            created_count += 1
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            results.append({
                "username": item.username,
                "success": False,
                "error": str(e),
                "login_status": "skipped"
            })
            error_count += 1
    
    await db.commit()
    
    # Update job status
    bulk_import_jobs[job_id]["created"] = created_count
    bulk_import_jobs[job_id]["failed"] = error_count
    bulk_import_jobs[job_id]["pending_login"] = len(account_ids)
    bulk_import_jobs[job_id]["results"] = results
    
    # Start staggered login in background if enabled
    if account_ids:
        bulk_import_jobs[job_id]["status"] = "logging_in"
        
        # Determine settings based on staggered flag
        if bulk_data.staggered_login:
            run_min_delay = bulk_data.min_delay
            run_max_delay = bulk_data.max_delay
            run_batch_size = bulk_data.batch_size
        else:
            # Non-staggered: 0 delays, execute sequentially (for now) but with tracking
            run_min_delay = 0
            run_max_delay = 0
            run_batch_size = 100 # Larger batch size for faster processing
            
        background_tasks.add_task(
            perform_bulk_login_job,
            job_id,
            account_ids,
            run_min_delay,
            run_max_delay,
            run_batch_size
        )
    else:
        bulk_import_jobs[job_id]["status"] = "completed"
    
    return {
        "job_id": job_id,
        "message": f"Created {created_count} accounts, {error_count} failed",
        "created": created_count,
        "errors": error_count,
        "pending_login": len(account_ids),
        "staggered": bulk_data.staggered_login,
        "results": results
    }


@router.get("/bulk/status/{job_id}")
async def get_bulk_import_status(job_id: str):
    """
    Get the status of a bulk import job.
    """
    if job_id not in bulk_import_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = bulk_import_jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "total": job["total"],
        "created": job["created"],
        "failed": job["failed"],
        "pending_login": job["pending_login"],
        "logged_in": job["logged_in"],
        "login_failed": job["login_failed"],
        "results": job["results"]
    }


@router.get("/bulk/active")
async def get_active_bulk_jobs(current_user: User = Depends(get_current_user)):
    """
    Get all active or recently completed bulk import jobs for the current user.
    """
    user_jobs = []
    for job_id, job in bulk_import_jobs.items():
        if job.get("user_id") == current_user.id:
            user_jobs.append({
                "job_id": job_id,
                "status": job["status"],
                "total": job["total"],
                "created": job["created"],
                "failed": job["failed"],
                "logged_in": job.get("logged_in", 0),
                "login_failed": job.get("login_failed", 0),
                "pending_login": job.get("pending_login", 0)
            })
    return user_jobs


async def perform_bulk_login_job(
    job_id: str, 
    account_ids: list, 
    min_delay: int, 
    max_delay: int,
    batch_size: int
):
    """
    Perform bulk login for multiple accounts.
    Tracks progress in bulk_import_jobs.
    If min_delay and max_delay are 0, runs without artificial delays.
    """
    print(f"Starting bulk login job {job_id}: {len(account_ids)} accounts. Delays: {min_delay}-{max_delay}s")
    
    # Process in batches
    for batch_start in range(0, len(account_ids), batch_size):
        batch = account_ids[batch_start:batch_start + batch_size]
        
        for i, account_id in enumerate(batch):
            try:
                # Apply delay only if requested
                if max_delay > 0:
                    # Generate unique random delay for this account
                    delay = random.uniform(min_delay, max_delay)
                    
                    # Add additional randomness based on position
                    position_jitter = random.uniform(0, 5) * (i + 1)
                    total_delay = delay + position_jitter
                    
                    print(f"[Job {job_id}] Waiting {total_delay:.1f}s before login for account {account_id}")
                    await asyncio.sleep(total_delay)
                
                # Perform login
                await perform_login(account_id)
                
                # Update job status
                if job_id in bulk_import_jobs:
                    # Check account status to determine success
                    async with AsyncSessionLocal() as session:
                        stmt = select(Account).where(Account.id == account_id)
                        result = await session.execute(stmt)
                        account = result.scalars().first()
                        
                        if account and account.status == "active":
                            bulk_import_jobs[job_id]["logged_in"] += 1
                        else:
                            bulk_import_jobs[job_id]["login_failed"] += 1
                        
                        bulk_import_jobs[job_id]["pending_login"] -= 1
                        
                        # Update results with status and progress
                        for r in bulk_import_jobs[job_id]["results"]:
                            if r.get("account_id") == account_id:
                                r["login_status"] = account.status if account else "failed"
                                if account and account.last_error:
                                    r["error_reason"] = account.last_error
                                break
                
            except Exception as e:
                print(f"[Job {job_id}] Login failed for account {account_id}: {e}")
                if job_id in bulk_import_jobs:
                    bulk_import_jobs[job_id]["login_failed"] += 1
                    bulk_import_jobs[job_id]["pending_login"] -= 1
        
        # Add delay between batches only if staggered
        if max_delay > 0 and batch_start + batch_size < len(account_ids):
            batch_delay = random.uniform(min_delay * 2, max_delay * 2)
            print(f"[Job {job_id}] Batch complete, waiting {batch_delay:.1f}s before next batch")
            await asyncio.sleep(batch_delay)
    
    # Mark job as completed
    if job_id in bulk_import_jobs:
        bulk_import_jobs[job_id]["status"] = "completed"
        print(f"[Job {job_id}] Bulk login job completed")


@router.post("/{account_id}/login")
async def login_account(
    account_id: int, 
    background_tasks: BackgroundTasks, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    print(f"DEBUG: Endpoint hit for account {account_id}")
    # isolation
    stmt = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
        
    account.status = "authenticating"
    await db.commit()
    
    background_tasks.add_task(perform_login, account_id)
    return {"message": "Login task started"}

@router.delete("/{account_id}")
async def delete_account(
    account_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete/logout an account by ID."""
    try:
        print(f"DEBUG: DELETE request received for account_id: {account_id}")
        # Find the account with isolation
        stmt = select(Account).where(Account.id == account_id)
        if current_user.role != "admin":
            stmt = stmt.where(Account.user_id == current_user.id)
            
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found or access denied")
        
        username = account.username
        fingerprint_id = account.fingerprint_id
        
        # Delete tasks for this account first to avoid foreign key constraint errors
        from sqlalchemy import delete
        await db.execute(delete(Task).where(Task.account_id == account_id))
        
        # Delete the account
        await db.delete(account)
        await db.flush()
        
        # Delete the fingerprint if exists
        if fingerprint_id:
            fp_stmt = select(Fingerprint).where(Fingerprint.id == fingerprint_id)
            fp_result = await db.execute(fp_stmt)
            fp = fp_result.scalars().first()
            if fp:
                await db.delete(fp)
        
        await db.commit()
        
        print(f"Account @{username} deleted successfully")
        return {"message": f"Account @{username} disconnected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error deleting account: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-disconnect")
async def bulk_disconnect_accounts(
    request: BulkDisconnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect/delete accounts that have performed specific activities or have specific statuses.
    """
    try:
        activity_types = request.activity_types
        statuses = request.statuses
        
        if not activity_types and not statuses:
            return {"message": "No activity types or statuses selected", "count": 0}

        account_ids = set()

        # 1. Accounts by Activity
        if activity_types:
            stmt = select(Task.account_id).where(
                Task.task_type.in_(activity_types),
                Task.status == 'completed'
            )
            if current_user.role != "admin":
                stmt = stmt.where(Task.user_id == current_user.id)
                
            stmt = stmt.distinct()
            
            result = await db.execute(stmt)
            ids_from_tasks = result.scalars().all()
            account_ids.update(ids_from_tasks)
        
        # 2. Accounts by Status
        if statuses:
            effective_statuses = set(statuses)
            if "banned" in effective_statuses:
                effective_statuses.add("inactive")
                
            stmt = select(Account.id).where(
                Account.status.in_(list(effective_statuses))
            )
            if current_user.role != "admin":
                stmt = stmt.where(Account.user_id == current_user.id)
                
            result = await db.execute(stmt)
            ids_from_status = result.scalars().all()
            account_ids.update(ids_from_status)
        
        if not account_ids:
            return {"message": "No accounts found matching criteria", "count": 0, "ids": []}

        deleted_count = 0
        deleted_usernames = []
        
        for account_id in account_ids:
            # Re-fetch account to get data for response/logging
            acc_stmt = select(Account).where(Account.id == account_id)
            res = await db.execute(acc_stmt)
            account = res.scalars().first()
            
            if not account:
                continue

            username = account.username
            fingerprint_id = account.fingerprint_id
            
            # Delete tasks for this account first
            t_stmt = select(Task).where(Task.account_id == account_id)
            t_res = await db.execute(t_stmt)
            tasks = t_res.scalars().all()
            for t in tasks:
                 await db.delete(t)
            
            # Delete account
            await db.delete(account)
            
            # Delete fingerprint
            if fingerprint_id:
                fp_stmt = select(Fingerprint).where(Fingerprint.id == fingerprint_id)
                fp_res = await db.execute(fp_stmt)
                fp = fp_res.scalars().first()
                if fp:
                    await db.delete(fp)
            
            deleted_count += 1
            deleted_usernames.append(username)

        await db.commit()
        
        return {
            "message": f"Successfully disconnected {deleted_count} accounts", 
            "count": deleted_count,
            "usernames": deleted_usernames
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{account_id}/rotate-fingerprint")
async def rotate_fingerprint(
    account_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new fingerprint for the account and clear session data.
    Useful when a fingerprint is blocked or blacklisted.
    """
    try:
        # Find the account with isolation
        stmt = select(Account).where(Account.id == account_id)
        if current_user.role != "admin":
            stmt = stmt.where(Account.user_id == current_user.id)
            
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found or access denied")
            
        old_fingerprint_id = account.fingerprint_id
        
        # 1. Generate New Fingerprint
        fp_service = FingerprintService(db)
        new_fp = await fp_service.create_fingerprint()
        
        # 2. Update Account
        account.fingerprint_id = new_fp.id
        account.cookies = None
        account.last_login_state = None
        account.status = "offline"
        account.last_error = "Fingerprint rotated. Please re-login."
        
        # 3. Delete old fingerprint if it's not being used by others (optional, but good practice)
        # For simplicity, we just keep the record or let a cleanup script handle it.
        
        await db.commit()
        await db.refresh(account)
        
        return {
            "message": "Fingerprint rotated successfully. Session cleared.",
            "status": account.status,
            "fingerprint_id": account.fingerprint_id
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{account_id}/toggle-checker")
async def toggle_checker(
    account_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Designate an account as the Checker (only one can be active per user)."""
    # 1. Clear existing checker for this user
    from sqlalchemy import update
    stmt_clear = update(Account).where(Account.is_checker == True)
    if current_user.role != "admin":
        stmt_clear = stmt_clear.where(Account.user_id == current_user.id)
    else:
        # Admin clears all? Or just their own? 
        # Usually admin designates a global checker or per-user. 
        # Let's do per-user for simplicity.
        pass # Admin likely manages their own too.
        
    await db.execute(stmt_clear.values(is_checker=False))
    
    # 2. Set new checker with isolation
    stmt = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    account = result.scalars().first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    account.is_checker = True
    await db.commit()
    await db.refresh(account)
    return account

@router.post("/{account_id}/check")
async def check_account_session(
    account_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if the account session is still valid."""
    try:
        stmt = select(Account).where(Account.id == account_id)
        if current_user.role != "admin":
            stmt = stmt.where(Account.user_id == current_user.id)
            
        result = await db.execute(stmt)
        account = result.scalars().first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found or access denied")
            
        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        res_fp = await db.execute(stmt_fp)
        fp = res_fp.scalars().first()
        
        if not fp:
            raise HTTPException(status_code=400, detail="Fingerprint missing")

        service = InstagramService(account, fp)
        updates = await run_in_threadpool(service.check_session)
        
        # Apply updates
        if "status" in updates:
            account.status = updates["status"]
            
        # Log Task
        task_status = "completed" if updates.get("status") == "active" else "failed"
        check_task = Task(
            account_id=account.id,
            task_type="check_session",
            scheduled_at=func.now(),
            executed_at=func.now(),
            status=task_status,
            error_message="Session invalid" if task_status == "failed" else None,
            params={"source": "manual_check"},
            user_id=current_user.id
        )
        db.add(check_task)

        await db.commit()
        
        return {
            "status": account.status,
            "valid": updates.get("status") == "active",
            "message": "Session is valid" if updates.get("status") == "active" else "Session expired or invalid"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



async def perform_login(account_id: int):
    with open("login_debug.log", "a") as f:
        f.write(f"Starting login task for account_id {account_id}\n")
    
    async with AsyncSessionLocal() as session:
        stmt = select(Account).where(Account.id == account_id)
        result = await session.execute(stmt)
        account = result.scalars().first()
        if not account:
            with open("login_debug.log", "a") as f:
                f.write(f"Account {account_id} not found\n")
            return
            
        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        res_fp = await session.execute(stmt_fp)
        fp = res_fp.scalars().first()
        
        if not fp:
            print(f"Fingerprint missing for account {account.username}")
            with open("login_debug.log", "a") as f:
                f.write(f"Fingerprint missing for {account.username}\n")
            return

        service = InstagramService(account, fp)
        try:
            # Note: This calls the synchronous instagrapi login. 
            # In production, offload to thread/celery.
            with open("login_debug.log", "a") as f:
                f.write(f"Calling service.login() for {account.username}\n")
                
            # Capture print output from the service (jitter logs, retry logs, etc.)
            import io
            import contextlib
            f_capture = io.StringIO()
            with contextlib.redirect_stdout(f_capture):
                updates = await run_in_threadpool(service.login) 
            
            # Log the captured output
            with open("login_debug.log", "a") as f:
                f.write(f_capture.getvalue())
            
            # Apply updates
            if "status" in updates:
                account.status = updates["status"]
            if "cookies" in updates:
                account.cookies = updates["cookies"]
            if "last_login_state" in updates:
                account.last_login_state = updates["last_login_state"]
            
            # Clear error on success
            account.last_error = None
            
            with open("login_debug.log", "a") as f:
                f.write(f"Login completed for {account.username}, status: {account.status}\n")
        
        except ChallengeRequired as e:
            print(f"Checkpoint/Challenge required for {account.username}")
            account.status = "challenge"
            account.last_error = "Instagram checkpoint/challenge required. Please verify on your phone/email."
            with open("login_debug.log", "a") as f:
                f.write(f"Login CHALLENGE for {account.username}: {e}\n")
                
        except Exception as e:
            print(f"Bg Login Error for {account.username}: {e}")
            account.status = "failed"
            
            # Save error message for UI display
            error_msg = str(e)
            
            # Custom detection for specific error patterns
            if "blacklist" in error_msg.lower() or "isp" in error_msg.lower():
                error_msg = "Instagram has flagged this IP/Proxy as suspicious. Please wait or change proxy."
            elif "proxy" in error_msg.lower():
                error_msg = f"Proxy Connection Failed: {error_msg}"
            elif "400" in error_msg or "429" in error_msg:
                error_msg = "Rate limited or Bad Request (400/429). Change proxy or wait."
            elif "eof" in error_msg.lower():
                error_msg = "Connection reset by Instagram (EOF). Try individual login or wait a few minutes."
            
            # Truncate if too long
            if len(error_msg) > 500:
                error_msg = error_msg[:500] + "..."
                
            account.last_error = error_msg
            with open("login_debug.log", "a") as f:
                f.write(f"Login FAILED for {account.username}: {e}\n")
        
        if account.status == "active":
             task_status = "completed"
             error_msg = None
        else:
             task_status = "failed"
             error_msg = account.last_error

        # Log Task
        login_task = Task(
            account_id=account.id,
            task_type="login",
            scheduled_at=func.now(),
            executed_at=func.now(),
            status=task_status,
            error_message=error_msg,
            params={"method": "manual" if not account.last_login_state else "session"}
        )
        session.add(login_task)

        await session.commit()
        with open("login_debug.log", "a") as f:
            f.write(f"Session committed for {account.username}\n")
"""
Cookie Import Endpoints

These endpoints allow importing Instagram accounts using cookies exported from the Chrome extension.
This is more reliable than password-based login as it doesn't trigger Instagram security measures.
"""

from app.schemas.cookie_import import (
    CookieImportSchema, 
    BatchCookieImportSchema,
    CookieImportResponse,
    BatchImportResponse
)
import json


@router.post("/import-cookie", response_model=CookieImportResponse)
async def import_account_from_cookie(
    cookie_data: CookieImportSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import a single Instagram account from exported cookies.
    
    This is the recommended way to add accounts as it doesn't require Instagram API login,
    which reduces the risk of triggering security measures.
    """
    try:
        username = cookie_data.account.username
        
        # Check if account already exists
        stmt = select(Account).where(Account.username == username)
        result = await db.execute(stmt)
        existing_account = result.scalars().first()
        
        if existing_account:
            return CookieImportResponse(
                success=False,
                username=username,
                message=f"Account @{username} already exists",
                skipped=True
            )
        
        # Generate fingerprint
        fp_service = FingerprintService(db)
        fp = await fp_service.create_fingerprint(user_id=current_user.id)
        
        # Convert cookies dict to JSON string for storage
        cookies_json = json.dumps(cookie_data.cookies)
        
        # Create account with cookie-based login
        new_account = Account(
            username=username,
            password_encrypted="",  # No password for cookie-based accounts
            cookies=cookies_json,
            proxy=cookie_data.proxy or "",
            login_method="cookies",
            fingerprint_id=fp.id,
            user_id=current_user.id,
            status="active",  # Assume active since cookies were exported from active session
            last_login=cookie_data.exported_at
        )
        
        db.add(new_account)
        await db.commit()
        await db.refresh(new_account)
        
        return CookieImportResponse(
            success=True,
            account_id=new_account.id,
            username=username,
            message=f"Successfully imported @{username}"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return CookieImportResponse(
            success=False,
            username=cookie_data.account.username,
            message=f"Import failed: {str(e)}"
        )


@router.post("/batch-import-cookies", response_model=BatchImportResponse)
async def batch_import_accounts_from_cookies(
    batch_data: BatchCookieImportSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Batch import multiple Instagram accounts from exported cookies.
    
    Accepts an array of cookie export data and imports all accounts at once.
    """
    results = []
    imported = 0
    skipped = 0
    failed = 0
    
    for cookie_data in batch_data.accounts:
        try:
            username = cookie_data.account.username
            
            # Check if account already exists
            stmt = select(Account).where(Account.username == username)
            result = await db.execute(stmt)
            existing_account = result.scalars().first()
            
            if existing_account:
                results.append(CookieImportResponse(
                    success=False,
                    username=username,
                    message=f"Account already exists",
                    skipped=True
                ))
                skipped += 1
                continue
            
            # Generate fingerprint
            fp_service = FingerprintService(db)
            fp = await fp_service.create_fingerprint(user_id=current_user.id)
            
            # Convert cookies dict to JSON string
            cookies_json = json.dumps(cookie_data.cookies)
            
            # Create account
            new_account = Account(
                username=username,
                password_encrypted="",
                cookies=cookies_json,
                proxy=cookie_data.proxy or "",
                login_method="cookies",
                fingerprint_id=fp.id,
                user_id=current_user.id,
                status="active",
                last_login=cookie_data.exported_at
            )
            
            db.add(new_account)
            await db.flush()  # Get ID without committing
            
            results.append(CookieImportResponse(
                success=True,
                account_id=new_account.id,
                username=username,
                message="Successfully imported"
            ))
            imported += 1
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            results.append(CookieImportResponse(
                success=False,
                username=cookie_data.account.username,
                message=f"Import failed: {str(e)}"
            ))
            failed += 1
    
    # Commit all successful imports
    await db.commit()
    
    return BatchImportResponse(
        total=len(batch_data.accounts),
        imported=imported,
        skipped=skipped,
        failed=failed,
        results=results
    )

