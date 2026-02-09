from app.db.session import AsyncSessionLocal
from app.models.task import Task
from app.models.task_batch import TaskBatch
from app.models.account import Account, Fingerprint
from app.services.instagram_service import InstagramService
from sqlalchemy import select
from datetime import datetime
import os
from instagrapi.exceptions import LoginRequired
from pydantic import ValidationError
from app.core.config import settings
import asyncio

def get_absolute_media_path(media_path: str) -> str:
    """
    Resolves a media path to an absolute path on the local filesystem.
    Handles:
    - Absolute paths (stays as is, or resolved if it starts with /app)
    - Filenames (resolved relative to settings.MEDIA_PATH)
    """
    if not media_path:
        return ""
        
    # If it's just a filename (no path separators)
    if os.path.sep not in media_path and "/" not in media_path and "\\" not in media_path:
        return os.path.join(settings.MEDIA_PATH, media_path)
        
    # If it's an absolute path from Docker (/app/...)
    if media_path.replace("\\", "/").startswith("/app/"):
        # Resolve it relative to the 'backend' folder
        # /app corresponds to the 'backend' folder
        relative_to_app = media_path.replace("\\", "/")[len("/app/"):] # e.g. "media/scheduled/file.jpg"
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.abspath(os.path.join(backend_dir, relative_to_app))
        
    # Otherwise return as is (might already be a host path)
    return media_path

async def execute_task(task_id: int):
    """
    Execute a task immediately.
    Can be called by API (background task) or Celery Worker (scheduled task).
    """
    async with AsyncSessionLocal() as session:
        # Get task with account
        stmt = select(Task).where(Task.id == task_id)
        result = await session.execute(stmt)
        task = result.scalars().first()
        
        if not task:
            with open("task_debug.log", "a") as f:
                f.write(f"Task {task_id} not found in DB\n")
            print(f"Task {task_id} not found")
            return
            
        with open("task_debug.log", "a") as f:
            f.write(f"Starting execution for Task {task_id}\n")
        
        # Get account
        stmt_acc = select(Account).where(Account.id == task.account_id)
        result_acc = await session.execute(stmt_acc)
        account = result_acc.scalars().first()
        
        if not account:
            task.status = "failed"
            task.error_message = "Account not found"
            await session.commit()
            with open("task_debug.log", "a") as f:
                f.write(f"Task {task_id} failed: Account {task.account_id} not found\n")
            return
        
        # Get fingerprint
        stmt_fp = select(Fingerprint).where(Fingerprint.id == account.fingerprint_id)
        result_fp = await session.execute(stmt_fp)
        fingerprint = result_fp.scalars().first()
        
        if not fingerprint:
            task.status = "failed"
            task.error_message = "Fingerprint not found"
            await session.commit()
            with open("task_debug.log", "a") as f:
                f.write(f"Task {task_id} failed: Fingerprint for account {account.username} not found\n")
            return
        
        task.status = "running"
        
        # If part of a batch, mark batch as running if it was pending
        if task.batch_id:
            stmt_batch = select(TaskBatch).where(TaskBatch.id == task.batch_id)
            result_batch = await session.execute(stmt_batch)
            batch = result_batch.scalars().first()
            if batch and batch.status == "pending":
                batch.status = "running"
                if not batch.started_at:
                    batch.started_at = datetime.utcnow()
                    
        await session.commit()
        
        try:
            service = InstagramService(account, fingerprint)
            
            # ALWAYS validate/ensure we have a valid Instagram session
            print(f"Task {task_id}: Checking Instagram session for {account.username}...")
            session_valid = False
            
            # Try to check current session if account was previously active
            if account.status == "active" and account.cookies:
                try:
                    check_result = await asyncio.to_thread(service.check_session)
                    session_valid = check_result.get("status") == "active"
                    if session_valid:
                        print(f"Task {task_id}: Existing session is valid for {account.username}")
                except Exception as e:
                    print(f"Task {task_id}: Session check failed for {account.username}: {e}")
                    session_valid = False
            
            # If session is not valid, perform login
            if not session_valid:
                print(f"Task {task_id}: Session invalid, performing login for {account.username}...")
                try:
                    login_updates = await asyncio.to_thread(service.login)
                    if login_updates:
                        # Update account status from login result
                        for key, val in login_updates.items():
                            setattr(account, key, val)
                        await session.commit()
                        
                        # Verify login was successful
                        if login_updates.get("status") == "active":
                            print(f"Task {task_id}: Login successful for {account.username}")
                            session_valid = True
                        else:
                            raise Exception(f"Login failed with status: {login_updates.get('status')}")
                    else:
                        raise Exception("Login returned no updates")
                except Exception as e:
                    print(f"Task {task_id}: Login failed for {account.username}: {e}")
                    raise Exception(f"Failed to establish valid session: {str(e)}")
            
            # Warmup session for story/post/reel tasks to ensure stability
            if task.task_type in ["story", "post", "reels"]:
                print(f"Task {task_id}: Performing warmup for {task.task_type} task...")
                try:
                    warmup_result = await asyncio.to_thread(service.warmup)
                    if warmup_result:
                        print(f"Task {task_id}: Warmup successful")
                    else:
                        print(f"Task {task_id}: Warmup returned False (continuing anyway)")
                except Exception as e:
                    print(f"Task {task_id}: Warmup failed: {e} (continuing anyway)")
            
            
            params = task.params or {}
            
            # Retry loop for LoginRequired
            max_retries = 1
            for attempt in range(max_retries + 1):
                try:
                    if task.task_type == "post":
                        media_path = get_absolute_media_path(params.get("media_path", ""))
                        caption = params.get("caption", "")
                        share_to_threads = params.get("share_to_threads", False)
                        if media_path and os.path.exists(media_path):
                            await asyncio.to_thread(service.post_photo, media_path, caption, share_to_threads=share_to_threads)
                        else:
                            raise ValueError(f"Media file not found: {media_path} (original: {params.get('media_path')})")

                    elif task.task_type == "reels":
                        media_path = get_absolute_media_path(params.get("media_path", ""))
                        caption = params.get("caption", "")
                        share_to_threads = params.get("share_to_threads", False)
                        if media_path and os.path.exists(media_path):
                            await asyncio.to_thread(service.post_reel, media_path, caption, share_to_threads=share_to_threads)
                        else:
                            raise ValueError(f"Media file not found: {media_path} (original: {params.get('media_path')})")

                    elif task.task_type == "story":
                        media_path = get_absolute_media_path(params.get("media_path", ""))
                        caption = params.get("caption", "")
                        link = params.get("link")
                        if media_path and os.path.exists(media_path):
                            await asyncio.to_thread(service.post_story, media_path, caption, link=link)
                        else:
                            raise ValueError(f"Media file not found: {media_path} (original: {params.get('media_path')})")
                            
                    elif task.task_type == "like":
                        media_url = params.get("media_url", "")
                        if media_url:
                            # Extract shortcode from URL
                            # Supports p, reel, reels, tv, posts etc.
                            import re
                            shortcode = None
                            match = re.search(r"(?:/p/|/reel/|/reels/|/tv/|/posts/)([\w-]+)", media_url)
                            if match:
                                shortcode = match.group(1)
                            
                            if shortcode:
                                # Use media_pk_from_code which is offline/math-based
                                # This is safer to avoid extra requests initially
                                media_id = await asyncio.to_thread(service.client.media_pk_from_code, shortcode)
                                
                                # Pre-load media info to simulate human behavior and check accessibility
                                try:
                                    await asyncio.to_thread(service.client.media_info, str(media_id))
                                except Exception as e:
                                    print(f"Warning: Could not fetch media_info for {media_id}: {e}")
                                    # Continue anyway, it might work
                                
                                await asyncio.to_thread(service.like_media, str(media_id))
                            else:
                                # Fallback to original method if shortcode extraction fails
                                # Clean URL first
                                if "?" in media_url:
                                    media_url = media_url.split("?")[0]
                                media_id = await asyncio.to_thread(service.client.media_pk_from_url, media_url)
                                await asyncio.to_thread(service.like_media, str(media_id))
                        else:
                            raise ValueError("Media URL not provided")
                            
                    elif task.task_type == "follow":
                        target_username = params.get("target_username", "")
                        if target_username:
                            import random
                            # 1. Visit Profile (Get User ID)
                            user_id = await asyncio.to_thread(service.client.user_id_from_username, target_username)
                            
                            # 2. Random Delay (Simulate looking at profile)
                            await asyncio.sleep(random.uniform(2.0, 5.0))
                            
                            # 3. Try to fetch recent media for Warm-up
                            try:
                                # Get latest 3 posts
                                medias = await asyncio.to_thread(service.client.user_medias, user_id, 3)
                                if medias:
                                    # 60% chance to like a random post from the top 3
                                    if random.random() < 0.6:
                                        target_media = random.choice(medias)
                                        print(f"Warm-up: Liking post {target_media.pk} for {target_username}")
                                        await asyncio.to_thread(service.client.media_like, target_media.id)
                                        await asyncio.sleep(random.uniform(1.0, 3.0))
                            except Exception as e:
                                # If media is private or fails, skip silently and continue with Follow
                                print(f"Warm-up: Skipping like for {target_username} (Media empty, private, or error: {e})")
                            
                            # 4. Final Follow Action
                            await asyncio.to_thread(service.client.user_follow, user_id)
                        else:
                            raise ValueError("Target username not provided")

                            
                    elif task.task_type == "view":
                        story_url = params.get("story_url", "")
                        if story_url:
                            # For stories, we need to extract story_pk
                            story_pk = await asyncio.to_thread(service.client.story_pk_from_url, story_url)
                            await asyncio.to_thread(service.client.story_seen, [story_pk])
                        else:
                            raise ValueError("Story URL not provided")
                    
                    # If successful, break the retry loop
                    break
                    
                except ValidationError as e:
                    # Specific Pydantic Validation Error (Instagrapi issue)
                    print(f"Task {task_id}: ignoring Pydantic validation error: {e}")
                    with open("task_debug.log", "a") as f:
                        f.write(f"Task {task_id}: Pydantic Validation error ignored. Assuming success.\n")
                    # Break loop to treat as SUCCESS
                    break

                except Exception as e:
                    error_str = str(e).lower()
                    
                    # Detect if error is essentially "login required" even if wrapped
                    # instagrapi often wraps it in PhotoNotUpload for stories
                    is_login_issue = "login_required" in error_str or isinstance(e, LoginRequired)
                    
                    # 1. Handle Inactive User
                    if "this user is inactive" in error_str:
                        print(f"Task {task_id}: Account {account.username} is inactive! Marking as failed.")
                        with open("task_debug.log", "a") as f:
                            f.write(f"Task {task_id} failed: Account inactive. Usually due to IP/Proxy block or account restriction.\n")
                        
                        # Update account status
                        account.status = "inactive"
                        await session.commit()
                        
                        # Raise to fail the task
                        raise e

                    # 2. Handle Login Issues
                    if is_login_issue and attempt < max_retries:
                        print(f"Task {task_id}: Login required ({type(e).__name__}: {str(e)}), re-connecting and re-logging in (forced=True)...")
                        
                        # Use the new reconnect method to clear stale internal states
                        await asyncio.to_thread(service.reconnect)
                        
                        # Force a full login to refresh everything
                        login_updates = await asyncio.to_thread(service.login, force_full_login=True)
                        if login_updates:
                             # Update account status from login result
                             for key, val in login_updates.items():
                                 setattr(account, key, val)
                             await session.commit()
                        
                        # Small delay to let the session "settle"
                        await asyncio.sleep(2)
                        continue
                    
                    # 4. Handle SOCKS5 Authentication Errors
                    if "SOCKS5 authentication failed" in error_str:
                        print(f"Task {task_id}: Proxy authentication failed. Marking as failed.")
                        task.error_message = f"Proxy Authentication Failed: Please check your proxy credentials. ({str(e)})"
                        raise e
                        
                    # 3. Handle Generic Validation Error (fallback string check)
                    if "validation error" in error_str or "field required" in error_str:
                         print(f"Task {task_id}: ignoring string-based validation error: {e}")
                         with open("task_debug.log", "a") as f:
                             f.write(f"Task {task_id}: String-based Validation error ignored. Assuming success.\n")
                         break

                    # Else raise error
                    raise e
            
            task.status = "completed"
            task.executed_at = datetime.utcnow()
            
        except Exception as e:
            task.status = "failed"
            task.error_message = str(e)
            task.executed_at = datetime.utcnow()
            with open("task_debug.log", "a") as f:
                f.write(f"Task {task_id} failed: {e}\n")
                import traceback
                traceback.print_exc(file=f)
            print(f"Task {task_id} failed: {e}")
        
        await session.commit()
        
        # Update batch completion status if necessary
        if task.batch_id:
            from sqlalchemy import func
            async with AsyncSessionLocal() as update_session:
                # Use a fresh session to update counts to avoid isolation issues in heavy load
                stmt_b = select(TaskBatch).where(TaskBatch.id == task.batch_id)
                res_b = await update_session.execute(stmt_b)
                batch = res_b.scalars().first()
                if batch:
                    if task.status == "completed":
                        batch.success_count += 1
                    else:
                        batch.failed_count += 1
                    
                    # Check if all tasks in batch are finished
                    stmt_all = select(func.count(Task.id)).where(
                        Task.batch_id == task.batch_id,
                        Task.status.in_(["pending", "running"])
                    )
                    remaining = (await update_session.execute(stmt_all)).scalar_one()
                    
                    if remaining == 0:
                        batch.status = "completed"
                        batch.completed_at = datetime.utcnow()
                    
                    await update_session.commit()
