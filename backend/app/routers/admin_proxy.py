from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.subscription import SubscriptionAddon, ProxyAssignment
from app.routers.deps import get_current_user

router = APIRouter()

# ===== Pydantic Schemas =====

class ProxyInput(BaseModel):
    ip: str
    port: Optional[int] = 80
    username: Optional[str] = None
    password: Optional[str] = None

class AssignProxiesRequest(BaseModel):
    proxies: List[ProxyInput]

class ProxyAssignmentResponse(BaseModel):
    id: int
    proxy_ip: str
    proxy_port: int
    proxy_username: Optional[str]
    proxy_password: Optional[str]
    assigned_at: datetime
    
    class Config:
        from_attributes = True

class ProxyOrderResponse(BaseModel):
    id: int
    user_id: int
    username: str
    email: Optional[str]  # Can be None
    addon_type: str
    sub_type: Optional[str]
    quantity: int
    price_paid: float
    start_date: datetime
    end_date: datetime
    is_active: bool
    fulfilled_at: Optional[datetime]
    assigned_count: int  # Number of proxies already assigned
    
    class Config:
        from_attributes = True

# ===== Helper Functions =====

def check_admin(current_user: User):
    """Verify user is admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

# ===== API Endpoints =====

@router.get("/proxy-orders", response_model=List[ProxyOrderResponse])
async def get_proxy_orders(
    status_filter: str = "all",  # all, pending, fulfilled
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all proxy addon purchases with fulfillment status.
    Admin only.
    """
    check_admin(current_user)
    
    # Base query: get all proxy addons with user info
    stmt = (
        select(SubscriptionAddon, User.username, User.email, func.count(ProxyAssignment.id).label('assigned_count'))
        .join(User, SubscriptionAddon.user_id == User.id)
        .outerjoin(ProxyAssignment, SubscriptionAddon.id == ProxyAssignment.addon_id)
        .where(SubscriptionAddon.addon_type == 'proxy')
        .group_by(SubscriptionAddon.id, User.username, User.email)
    )
    
    # Apply status filter
    if status_filter == "pending":
        stmt = stmt.where(SubscriptionAddon.fulfilled_at.is_(None))
    elif status_filter == "fulfilled":
        stmt = stmt.where(SubscriptionAddon.fulfilled_at.isnot(None))
    
    stmt = stmt.order_by(SubscriptionAddon.start_date.desc())
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Map to response model
    orders = []
    for addon, username, email, assigned_count in rows:
        orders.append(ProxyOrderResponse(
            id=addon.id,
            user_id=addon.user_id,
            username=username,
            email=email,
            addon_type=addon.addon_type,
            sub_type=addon.sub_type,
            quantity=addon.quantity,
            price_paid=float(addon.price_paid),
            start_date=addon.start_date,
            end_date=addon.end_date,
            is_active=addon.is_active,
            fulfilled_at=addon.fulfilled_at,
            assigned_count=assigned_count or 0
        ))
    
    return orders


@router.post("/proxy-orders/{addon_id}/assign")
async def assign_proxies(
    addon_id: int,
    request: AssignProxiesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign proxy IPs to a proxy addon order.
    Admin only.
    """
    check_admin(current_user)
    
    # 1. Get addon
    stmt = select(SubscriptionAddon).where(SubscriptionAddon.id == addon_id)
    result = await db.execute(stmt)
    addon = result.scalar_one_or_none()
    
    if not addon:
        raise HTTPException(status_code=404, detail="Addon order not found")
    
    if addon.addon_type != 'proxy':
        raise HTTPException(status_code=400, detail="This is not a proxy addon")
    
    # 2. Validate quantity matches
    if len(request.proxies) != addon.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Proxy count mismatch. Expected {addon.quantity}, got {len(request.proxies)}"
        )
    
    # 3. Check if already fulfilled
    if addon.fulfilled_at:
        raise HTTPException(status_code=400, detail="This order has already been fulfilled")
    
    # 4. Insert proxy assignments
    for proxy_input in request.proxies:
        assignment = ProxyAssignment(
            addon_id=addon_id,
            user_id=addon.user_id,
            proxy_ip=proxy_input.ip,
            proxy_port=proxy_input.port,
            proxy_username=proxy_input.username,
            proxy_password=proxy_input.password,
            assigned_by=current_user.id
        )
        db.add(assignment)
    
    # 5. Mark addon as fulfilled
    addon.fulfilled_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Successfully assigned {len(request.proxies)} proxies to user {addon.user_id}",
        "addon_id": addon_id
    }


@router.get("/proxy-orders/{addon_id}/assignments", response_model=List[ProxyAssignmentResponse])
async def get_proxy_assignments(
    addon_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all proxy IP assignments for a specific addon order.
    Admin only.
    """
    check_admin(current_user)
    
    # Verify addon exists
    stmt = select(SubscriptionAddon).where(SubscriptionAddon.id == addon_id)
    result = await db.execute(stmt)
    addon = result.scalar_one_or_none()
    
    if not addon:
        raise HTTPException(status_code=404, detail="Addon order not found")
    
    # Get assignments
    stmt = select(ProxyAssignment).where(ProxyAssignment.addon_id == addon_id)
    result = await db.execute(stmt)
    assignments = result.scalars().all()
    
    return assignments


@router.delete("/proxy-assignments/{assignment_id}")
async def delete_proxy_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a proxy assignment (if admin needs to correct a mistake).
    Admin only.
    """
    check_admin(current_user)
    
    stmt = select(ProxyAssignment).where(ProxyAssignment.id == assignment_id)
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Proxy assignment not found")
    
    await db.delete(assignment)
    await db.commit()
    
    return {"status": "success", "message": "Proxy assignment deleted"}
