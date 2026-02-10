from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
import httpx
import time
import logging

from app.db.session import get_db
from app.models.proxy import ProxyTemplate
from app.models.account import Account
from app.schemas.proxy import (
    ProxyTemplateCreate, ProxyTemplateResponse, AssignProxyRequest, 
    ProxyTestRequest, ProxyTestResponse, ProxyDistributionRequest,
    ProxyBatchImportRequest, ProxyAssignmentResponse
)
from app.models.subscription import ProxyAssignment
import random
from app.routers.deps import get_current_user, check_role
from app.models.user import User

router = APIRouter()

logger = logging.getLogger(__name__)

@router.post("/check", response_model=ProxyTestResponse)
async def check_proxy_connection(
    request: ProxyTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Test a proxy connection."""
    start_time = time.time()
    try:
        # httpx >= 0.23.0 uses 'proxy' argument for single proxy or 'mounts'
        # We pass the full proxy URL string directly
        
        async with httpx.AsyncClient(proxy=request.proxy_url, timeout=10.0) as client:
            # We use a reliable geo-ip service to check connectivity and IP
            response = await client.get("http://ip-api.com/json", follow_redirects=True)
            response.raise_for_status()
            data = response.json()
            
            latency = (time.time() - start_time) * 1000
            
            return ProxyTestResponse(
                success=True,
                message="Connection successful",
                latency_ms=round(latency, 2),
                ip=data.get("query"),
                country=data.get("country")
            )
            
    except Exception as e:
        logger.error(f"Proxy test failed: {str(e)}")
        return ProxyTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}"
        )


@router.post("/", response_model=ProxyTemplateResponse)
async def create_proxy_template(
    template_in: ProxyTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new proxy template."""
    # Check if name already exists
    stmt = select(ProxyTemplate).where(ProxyTemplate.name == template_in.name)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    new_template = ProxyTemplate(
        name=template_in.name,
        proxy_url=template_in.proxy_url,
        description=template_in.description,
        user_id=current_user.id
    )
    
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    
    return new_template

@router.get("/", response_model=List[ProxyTemplateResponse])
async def list_proxy_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all proxy templates with account counts."""
    from sqlalchemy import func
    
    # Subquery to count accounts per proxy URL
    # We join with Account where Account.proxy == ProxyTemplate.proxy_url
    stmt = (
        select(
            ProxyTemplate.id,
            ProxyTemplate.name,
            ProxyTemplate.proxy_url,
            ProxyTemplate.description,
            ProxyTemplate.created_at,
            ProxyTemplate.updated_at,
            func.count(Account.id).label("accounts_count")
        )
        .outerjoin(Account, ProxyTemplate.proxy_url == Account.proxy)
    )
    
    if current_user.role != "admin":
        stmt = stmt.where(ProxyTemplate.user_id == current_user.id)
        
    stmt = stmt.group_by(ProxyTemplate.id).order_by(ProxyTemplate.created_at.desc())
    
    result = await db.execute(stmt)
    templates = []
    for row in result:
        templates.append({
            "id": row.id,
            "name": row.name,
            "proxy_url": row.proxy_url,
            "description": row.description,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "accounts_count": row.accounts_count
        })
    return templates

@router.get("/my-proxies", response_model=List[ProxyAssignmentResponse])
async def list_my_proxies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List static residential proxies assigned to the current user."""
    stmt = select(ProxyAssignment).where(ProxyAssignment.user_id == current_user.id).order_by(ProxyAssignment.assigned_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{template_id}", response_model=ProxyTemplateResponse)
async def get_proxy_template(
    template_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific proxy template by ID with account count."""
    from sqlalchemy import func
    
    stmt = (
        select(
            ProxyTemplate.id,
            ProxyTemplate.name,
            ProxyTemplate.proxy_url,
            ProxyTemplate.description,
            ProxyTemplate.created_at,
            ProxyTemplate.updated_at,
            func.count(Account.id).label("accounts_count")
        )
        .outerjoin(Account, ProxyTemplate.proxy_url == Account.proxy)
        .where(ProxyTemplate.id == template_id)
    )
    
    if current_user.role != "admin":
        stmt = stmt.where(ProxyTemplate.user_id == current_user.id)
        
    stmt = stmt.group_by(ProxyTemplate.id)
    
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "id": row.id,
        "name": row.name,
        "proxy_url": row.proxy_url,
        "description": row.description,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "accounts_count": row.accounts_count
    }

@router.delete("/{template_id}")
async def delete_proxy_template(
    template_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a proxy template."""
    stmt = select(ProxyTemplate).where(ProxyTemplate.id == template_id)
    if current_user.role != "admin":
        stmt = stmt.where(ProxyTemplate.user_id == current_user.id)
        
    result = await db.execute(stmt)
    template = result.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.commit()
    
    return {"message": f"Template '{template.name}' deleted successfully"}

@router.delete("/")
async def delete_all_proxy_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all proxy templates."""
    # First clear proxy references in accounts to avoid foreign key constraints if any
    # (Assuming nullable, which they are based on Account schema seen previously)
    stmt_accounts = select(Account).where(or_(Account.proxy.isnot(None), Account.proxy != ""))
    result_accounts = await db.execute(stmt_accounts)
    accounts = result_accounts.scalars().all()
    
    for account in accounts:
        # Check if the proxy matches any template being deleted? 
        # Actually, simpler to just delete templates. 
        # If accounts store the proxy string and not a foreign key content, 
        # deleting templates won't affect accounts' current proxy connection string 
        # unless there's an explicit relationship.
        # Based on previous file reads, Account has `proxy` as a string.
        # So deleting templates doesn't break accounts, but let's just delete the templates.
        pass

    stmt = select(ProxyTemplate)
    if current_user.role != "admin":
        stmt = stmt.where(ProxyTemplate.user_id == current_user.id)
        
    result = await db.execute(stmt)
    templates = result.scalars().all()
    
    for template in templates:
        await db.delete(template)
        
    await db.commit()
    
    return {"message": f"All {len(templates)} templates deleted successfully"}

@router.post("/{template_id}/assign/{account_id}")
async def assign_template_to_account(
    template_id: int,
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a proxy template to an account."""
    # Get template
    stmt_template = select(ProxyTemplate).where(ProxyTemplate.id == template_id)
    if current_user.role != "admin":
        stmt_template = stmt_template.where(ProxyTemplate.user_id == current_user.id)
        
    result_template = await db.execute(stmt_template)
    template = result_template.scalars().first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or access denied")
    
    # Get account
    stmt_account = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt_account = stmt_account.where(Account.user_id == current_user.id)
        
    result_account = await db.execute(stmt_account)
    account = result_account.scalars().first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    # Assign proxy
    account.proxy = template.proxy_url
    await db.commit()
    
    return {
        "message": f"Proxy '{template.name}' assigned to @{account.username}",
        "account_id": account.id,
        "proxy": account.proxy
    }

@router.post("/clear/{account_id}")
async def clear_proxy(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear (remove) proxy from an account."""
    stmt = select(Account).where(Account.id == account_id)
    if current_user.role != "admin":
        stmt = stmt.where(Account.user_id == current_user.id)
        
    result = await db.execute(stmt)
    account = result.scalars().first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or access denied")
    
    account.proxy = None
    await db.commit()
    
    return {"message": f"Proxy cleared for @{account.username}"}

@router.post("/distribute")
async def distribute_proxies(
    request: ProxyDistributionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Randomly distribute proxy templates to accounts."""
    # 1. Get all active accounts
    # Filter by existing proxy if overwrite is False
    stmt_accounts = select(Account)
    if not request.overwrite_existing:
        stmt_accounts = stmt_accounts.where(or_(Account.proxy == None, Account.proxy == ""))
        
    if current_user.role != "admin":
        stmt_accounts = stmt_accounts.where(Account.user_id == current_user.id)
        
    result_accounts = await db.execute(stmt_accounts)
    accounts = result_accounts.scalars().all()
    
    if not accounts:
        return {"message": "No accounts found to assign proxies to"}
        
    # 2. Get all proxy templates
    stmt_templates = select(ProxyTemplate)
    if current_user.role != "admin":
        stmt_templates = stmt_templates.where(ProxyTemplate.user_id == current_user.id)
        
    result_templates = await db.execute(stmt_templates)
    templates = result_templates.scalars().all()
    
    if not templates:
        return {"message": "No proxy templates available"}
        
    # 3. Get current usage counts for templates to respect limits
    # We need to calculate usage from accounts *NOT* being updated in this batch
    # This effectively "frees up" the slots held by the accounts we are about to re-assign
    account_ids_to_update = [acc.id for acc in accounts]
    
    # Query accounts that have proxies AND are NOT in our update list
    stmt_usage = select(Account.proxy).where(
        Account.proxy != None,
        Account.proxy != "",
        Account.id.notin_(account_ids_to_update)
    )
    result_usage = await db.execute(stmt_usage)
    static_usage_proxies = result_usage.scalars().all()
    
    # Map proxy_url -> count from static usage (accounts NOT being updated)
    proxy_usage_count = {}
    for p_url in static_usage_proxies:
        proxy_usage_count[p_url] = proxy_usage_count.get(p_url, 0) + 1
        
    # 4. Prepare available templates
    # We want to distribute based on UNIQUE proxy URLs to ensure we respect the limit per proxy resource
    # If multiple templates have the same URL, we just treat them as the same resource
    
    unique_templates_by_url = {}
    for tmpl in templates:
        if tmpl.proxy_url not in unique_templates_by_url:
            unique_templates_by_url[tmpl.proxy_url] = tmpl
            
    # Filter those that have space
    available_templates = []
    
    for p_url, tmpl in unique_templates_by_url.items():
        current_count = proxy_usage_count.get(p_url, 0)
        if current_count < request.max_accounts_per_proxy:
             available_templates.append({
                 "template": tmpl,
                 "current_count": current_count # Track live count
             })

    # If no templates are available, we still proceed to Reclaim Logic
    # provided there are active accounts that might need them.
        
    # 5. Distribute
    # Prioritize 'active' accounts first, then others
    # Use case-insensitive check and strip for safety
    active_accounts = [acc for acc in accounts if (acc.status or "").lower().strip() == 'active']
    other_accounts = [acc for acc in accounts if (acc.status or "").lower().strip() != 'active']
    
    # Shuffle both groups independently to maintain randomness within groups
    random.shuffle(active_accounts)
    random.shuffle(other_accounts)
    
    # Combine completely - Active MUST come before others
    accounts_list = active_accounts + other_accounts
    
    assigned_count = 0
    
    for account in accounts_list:
        # If overwriting, reset proxy to ensure we don't keep old values if slots run out
        if request.overwrite_existing:
            account.proxy = None
            
        # Filter available templates again to ensure dynamic limit is respected
        if not available_templates:
            continue
            
        # Pick a random template
        choice_idx = random.randint(0, len(available_templates) - 1)
        choice = available_templates[choice_idx]
        template = choice["template"]
        
        # Assign
        account.proxy = template.proxy_url
        assigned_count += 1
        
        # Increment usage
        choice["current_count"] += 1
        
        # If limit reached, remove from pool
        if choice["current_count"] >= request.max_accounts_per_proxy:
            available_templates.pop(choice_idx)
            
    # NEW: Reclaim Logic
    # If there are still active accounts without proxies, steal from non-active accounts
    # This handles the case where Overwrite=False but active accounts are starving
    # caused by 'challenge' or 'failed' accounts hogging slots.
    
    starving_active = [acc for acc in accounts 
                      if (acc.status or "").lower().strip() == 'active' 
                      and (acc.proxy is None or acc.proxy == "")]
                      
    if starving_active:
        # Find victims: Non-active accounts that HAVE a proxy
        # CRITICAL FIX: Must filter by current_user.id to prevent stealing from other users
        stmt_victims = select(Account).where(
            Account.proxy != None,
            Account.proxy != "",
            Account.status != 'active',
            Account.user_id == current_user.id
        )
        result_victims = await db.execute(stmt_victims)
        possible_victims = result_victims.scalars().all()
        
        # Filter strictly
        victims = [v for v in possible_victims if (v.status or "").lower().strip() != 'active']
        random.shuffle(victims)
        
        reclaimed_count = 0
        for starving_acc in starving_active:
            if not victims:
                break
                
            victim = victims.pop(0)
            starving_acc.proxy = victim.proxy
            victim.proxy = None
            
            reclaimed_count += 1
            assigned_count += 1
            
        # Note: 'assigned_count' might now include re-assignments, which is fine for the message.
            
    await db.commit()
    
    return {
        "message": f"Successfully assigned proxies to {assigned_count} accounts",
        "assigned_count": assigned_count,
        "total_candidates": len(accounts_list)
    }

@router.post("/reset-all")
async def reset_all_proxies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset (clear) proxies for ALL accounts."""
    try:
        # Update all accounts to have proxy = None
        stmt = select(Account).where(or_(Account.proxy.isnot(None), Account.proxy != ""))
        if current_user.role != "admin":
            stmt = stmt.where(Account.user_id == current_user.id)
            
        result = await db.execute(stmt)
        accounts = result.scalars().all()
        
        count = 0
        for account in accounts:
            account.proxy = None
            count += 1
            
        await db.commit()
        
        return {
            "message": f"Successfully cleared proxies for {count} accounts",
            "count": count
        }
    except Exception as e:
        logger.error(f"Failed to reset all proxies: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch")
async def batch_import_proxies(
    request: ProxyBatchImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import multiple proxies from a raw text list."""
    lines = request.raw_data.splitlines()
    imported_count = 0
    errors = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
            
        try:
            proxy_url = None
            
            # Format 1: Full URL (http://user:pass@host:port or socks5://...)
            if "://" in line:
                proxy_url = line
            else:
                parts = line.split(":")
                if len(parts) == 4:
                    # Format 2: host:port:user:pass
                    if parts[1].isdigit():
                        host, port, user, pw = parts
                        proxy_url = f"http://{user}:{pw}@{host}:{port}"
                    # Format 3: user:pass:host:port
                    elif parts[3].isdigit():
                        user, pw, host, port = parts
                        proxy_url = f"http://{user}:{pw}@{host}:{port}"
                    else:
                        raise ValueError("Unable to determine host/port in 4-part string")
                elif len(parts) == 2:
                    # Format 4: host:port
                    host, port = parts
                    proxy_url = f"http://{host}:{port}"
                else:
                    raise ValueError("Unsupported proxy format")

            if proxy_url:
                # Generate a unique name
                from urllib.parse import urlparse
                try:
                    hostname = urlparse(proxy_url).hostname or "proxy"
                except:
                    hostname = "proxy"
                
                # Check for duplicate proxy_url in this user's templates to avoid double-adding
                # (Optional but good UX)
                
                name = f"Batch_{hostname}_{random.randint(10000, 99999)}"
                
                new_proxy = ProxyTemplate(
                    name=name,
                    proxy_url=proxy_url,
                    user_id=current_user.id
                )
                db.add(new_proxy)
                imported_count += 1
                
        except Exception as e:
            errors.append(f"Error parsing '{line}': {str(e)}")
            
    if imported_count > 0:
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during commit: {str(e)}")
        
    return {
        "success": True,
        "imported_count": imported_count,
        "total_processed": len(lines),
        "errors": errors
    }
