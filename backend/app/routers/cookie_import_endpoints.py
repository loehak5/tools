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
        # Create account with cookie-based login
        new_account = Account(
            username=username,
            password_encrypted="",  # No password for cookie-based accounts
            cookies=cookie_data.cookies,
            proxy=cookie_data.proxy or "",
            login_method=3,
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
            
            # Create account
            new_account = Account(
                username=username,
                password_encrypted="",
                cookies=cookie_data.cookies,
                proxy=cookie_data.proxy or "",
                login_method=3,
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
