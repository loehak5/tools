from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from app.core.tz_utils import now_jakarta

from app.db.session import get_db
from app.models.account import Account
from app.models.task import Task
from app.models.proxy import ProxyTemplate

from app.models.user import User
from app.models.subscription import Subscription, SubscriptionPlan, SubscriptionAddon
from app.middleware.auth_check import get_user_subscription
from app.routers.deps import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    period: str = "today",  # today, yesterday, 7days
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate period parameter
    if period not in ["today", "yesterday", "7days"]:
        period = "today"
    
    # Determine time range based on period (Asia/Jakarta)
    now = now_jakarta()
    today_jakarta = now.date()
    
    if period == "today":
        period_start = datetime.combine(today_jakarta, datetime.min.time()).replace(tzinfo=now.tzinfo)
        period_end = now
    elif period == "yesterday":
        yesterday_jakarta = today_jakarta - timedelta(days=1)
        period_start = datetime.combine(yesterday_jakarta, datetime.min.time()).replace(tzinfo=now.tzinfo)
        period_end = datetime.combine(yesterday_jakarta, datetime.max.time()).replace(tzinfo=now.tzinfo)
    else:  # 7days
        period_start = datetime.combine(today_jakarta - timedelta(days=6), datetime.min.time()).replace(tzinfo=now.tzinfo)
        period_end = now
    
    try:
        # 1. Account Stats (unchanged - still shows overall stats)
        # Total accounts
        stmt_total_acc = select(func.count(Account.id))
        if current_user.role != "admin":
            stmt_total_acc = stmt_total_acc.where(Account.user_id == current_user.id)
        total_accounts = (await db.execute(stmt_total_acc)).scalar_one()

        # Active accounts (status='active')
        stmt_active_acc = select(func.count(Account.id)).where(Account.status == 'active')
        if current_user.role != "admin":
            stmt_active_acc = stmt_active_acc.where(Account.user_id == current_user.id)
        active_accounts = (await db.execute(stmt_active_acc)).scalar_one()

        # Issues/Bans (status in ['failed', 'challenge', 'banned'])
        stmt_issues_acc = select(func.count(Account.id)).where(Account.status.in_(['failed', 'challenge', 'banned']))
        if current_user.role != "admin":
            stmt_issues_acc = stmt_issues_acc.where(Account.user_id == current_user.id)
        issues_accounts = (await db.execute(stmt_issues_acc)).scalar_one()

        # 2. Task Stats - now based on selected period
        # Total tasks in period
        stmt_tasks_period = select(func.count(Task.id)).where(
            and_(Task.created_at >= period_start, Task.created_at <= period_end)
        )
        if current_user.role != "admin":
            stmt_tasks_period = stmt_tasks_period.where(Task.user_id == current_user.id)
        tasks_period = (await db.execute(stmt_tasks_period)).scalar_one()

        # Completed tasks in period
        stmt_completed_period = select(func.count(Task.id)).where(
            and_(
                Task.status == 'completed', 
                Task.executed_at >= period_start,
                Task.executed_at <= period_end
            )
        )
        if current_user.role != "admin":
            stmt_completed_period = stmt_completed_period.where(Task.user_id == current_user.id)
        completed_period = (await db.execute(stmt_completed_period)).scalar_one()

        # 3. Proxy Stats
        stmt_proxies = select(func.count(ProxyTemplate.id))
        if current_user.role != "admin":
            stmt_proxies = stmt_proxies.where(ProxyTemplate.user_id == current_user.id)
        total_proxies = (await db.execute(stmt_proxies)).scalar_one()

        # 4. Task Trends - Based on selected period
        # Fetch all tasks in the period window
        stmt_trend = select(Task.executed_at, Task.status).where(
            and_(
                Task.executed_at >= period_start,
                Task.executed_at <= period_end,
                Task.executed_at.isnot(None)  # Only tasks that have been executed
            )
        )
        if current_user.role != "admin":
            stmt_trend = stmt_trend.where(Task.user_id == current_user.id)
        trend_tasks_result = await db.execute(stmt_trend)
        trend_tasks = trend_tasks_result.all()
        
        # Generate trends based on period type
        trend_data = []
        
        if period in ["today", "yesterday"]:
            # Hourly grouping for today/yesterday
            hourly_trends = {}
            
            # Initialize all hours in the period
            current_time = period_start
            while current_time <= period_end:
                hour_key = current_time.strftime("%Y-%m-%d %H:00:00")
                hourly_trends[hour_key] = {"completed": 0, "failed": 0, "total": 0, "time": current_time.strftime("%H:%M")}
                current_time += timedelta(hours=1)
            
            # Populate with actual data
            for t_executed_at, t_status in trend_tasks:
                if t_executed_at:
                    hour_key = t_executed_at.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:00:00")
                    if hour_key in hourly_trends:
                        hourly_trends[hour_key]["total"] += 1
                        if t_status == 'completed':
                            hourly_trends[hour_key]["completed"] += 1
                        elif t_status == 'failed':
                            hourly_trends[hour_key]["failed"] += 1
            
            # Convert to sorted list (chronological: oldest to newest)
            for hour_key in sorted(hourly_trends.keys()):
                trend_data.append({
                    "time": hourly_trends[hour_key]["time"],
                    "completed": hourly_trends[hour_key]["completed"],
                    "failed": hourly_trends[hour_key]["failed"],
                    "total": hourly_trends[hour_key]["total"]
                })
        
        else:  # 7days - Daily grouping
            daily_trends = {}
            
            # Initialize all days in the period (last 7 days)
            for i in range(7):
                day = today_jakarta - timedelta(days=6-i)  # Start from oldest
                day_key = day.strftime("%Y-%m-%d")
                daily_trends[day_key] = {
                    "completed": 0, 
                    "failed": 0, 
                    "total": 0, 
                    "time": day.strftime("%b %d")  # e.g., "Feb 05"
                }
            
            # Populate with actual data
            for t_executed_at, t_status in trend_tasks:
                if t_executed_at:
                    day_key = t_executed_at.date().strftime("%Y-%m-%d")
                    if day_key in daily_trends:
                        daily_trends[day_key]["total"] += 1
                        if t_status == 'completed':
                            daily_trends[day_key]["completed"] += 1
                        elif t_status == 'failed':
                            daily_trends[day_key]["failed"] += 1
            
            # Convert to sorted list (chronological: oldest to newest)
            for day_key in sorted(daily_trends.keys()):
                trend_data.append({
                    "time": daily_trends[day_key]["time"],
                    "completed": daily_trends[day_key]["completed"],
                    "failed": daily_trends[day_key]["failed"],
                    "total": daily_trends[day_key]["total"]
                })

        # 5. Active & Upcoming Tasks (pending or running)
        stmt_active = select(Task).where(
            Task.status.in_(['pending', 'running'])
        )
        if current_user.role != "admin":
            stmt_active = stmt_active.where(Task.user_id == current_user.id)
            
        stmt_active = stmt_active.order_by(Task.scheduled_at.asc()).limit(10)
        
        active_tasks_result = await db.execute(stmt_active)
        active_tasks = active_tasks_result.scalars().all()

        schedules = []
        for t in active_tasks:
            schedules.append({
                "id": t.id,
                "username": t.account_username,
                "type": t.task_type,
                "status": t.status,
                "scheduled_at": t.scheduled_at.isoformat() if t.scheduled_at else None,
                "time": t.created_at.isoformat() if t.created_at else None
            })

        # 6. Account Status Breakdown
        # Useful for Pie Chart
        stmt_status_breakdown = select(Account.status, func.count(Account.id))
        if current_user.role != "admin":
            stmt_status_breakdown = stmt_status_breakdown.where(Account.user_id == current_user.id)
        
        stmt_status_breakdown = stmt_status_breakdown.group_by(Account.status)
        status_result = await db.execute(stmt_status_breakdown)
        status_rows = status_result.all()
        status_breakdown = { "active": 0, "offline": 0, "failed": 0, "challenge": 0, "banned": 0 }
        for row in status_rows:
            if row.status in status_breakdown:
                status_breakdown[row.status] = row[1]
            else:
                status_breakdown[row.status] = row[1]


        # 7. Recent Activity Stats (Counts by Type for selected period)
        stmt_performance = select(Task).where(
            and_(
                Task.status == 'completed', 
                Task.executed_at >= period_start,
                Task.executed_at <= period_end
            )
        )
        if current_user.role != "admin":
            stmt_performance = stmt_performance.where(Task.user_id == current_user.id)
        
        perf_result = await db.execute(stmt_performance)
        perf_tasks = perf_result.scalars().all()
        
        # Count by task type
        activity_stats = {
            "like": 0, "follow": 0, "post": 0, "story": 0, "reels": 0, "view": 0
        }
        
        for t in perf_tasks:
            t_type = t.task_type
            if t_type not in activity_stats:
                activity_stats[t_type] = 0
            activity_stats[t_type] += 1

        # 8. Subscription & Quota Info
        sub = await get_user_subscription(current_user, db)
        
        # Calculate limits
        ig_limit = 0
        proxy_limit = 0
        plan_name = "FREE"
        expiry_date = None
        
        if sub:
            # CAST DECIMAL TO INT TO AVOID JSON ERROR
            ig_limit = int(sub.plan.ig_account_limit)
            proxy_limit = int(sub.plan.proxy_slot_limit)
            plan_name = sub.plan.name
            expiry_date = sub.end_date.isoformat() if sub.end_date else None
            
            # Addons
            stmt_addons = select(SubscriptionAddon).where(
                SubscriptionAddon.user_id == current_user.id,
                SubscriptionAddon.is_active == True
            )
            addons_result = await db.execute(stmt_addons)
            addons = addons_result.scalars().all()

            for addon in addons:
                if addon.addon_type == "quota":
                    if addon.sub_type == "account":
                        ig_limit += int(addon.quantity)
                    elif addon.sub_type == "proxy":
                        proxy_limit += int(addon.quantity)

        # --- EXPIRY ALERT LOGIC ---
        expiry_alert = None
        if sub and sub.end_date:
            now_tz = now_jakarta()
            # Handle naive end_date (likely stored as wall clock Jakarta time)
            end_date_safe = sub.end_date
            if end_date_safe.tzinfo is None:
                end_date_safe = end_date_safe.replace(tzinfo=now_tz.tzinfo)
            
            remaining = end_date_safe - now_tz
            rem_seconds = remaining.total_seconds()
            rem_days = rem_seconds / (24 * 3600)
            rem_hours = rem_seconds / 3600

            is_prematur = plan_name.lower() == "prematur"

            if is_prematur:
                if 0 < rem_hours <= 3:
                    expiry_alert = {
                        "show": True,
                        "type": "hourly",
                        "message": f"Masa aktif paket Prematur anda tinggal {round(rem_hours, 1)} jam lagi!",
                        "rem_hours": round(rem_hours, 1)
                    }
            else:
                if 0 < rem_days <= 3:
                    expiry_alert = {
                        "show": True,
                        "type": "daily",
                        "message": f"Masa aktif langganan anda tinggal {round(rem_days)} hari lagi!",
                        "rem_days": round(rem_days)
                    }
        # ---------------------------

        # 9. Admin Specific Stats
        admin_stats = {}
        if current_user.role == "admin":
            # Total Operators
            stmt_ops = select(func.count(User.id)).where(User.role == "operator")
            total_operators = (await db.execute(stmt_ops)).scalar_one()
            
            # Total System IG Accounts
            stmt_sys_ig = select(func.count(Account.id))
            total_sys_ig = (await db.execute(stmt_sys_ig)).scalar_one()
            
            # Monthly Revenue (Estimasi)
            # Sum of plan prices for active subscriptions
            stmt_rev_subs = select(func.sum(SubscriptionPlan.price_idr)).select_from(Subscription).join(SubscriptionPlan).where(Subscription.status == 'active')
            rev_subs = (await db.execute(stmt_rev_subs)).scalar_one() or 0
            
            # Sum of addons prices (active)
            stmt_rev_addons = select(func.sum(SubscriptionAddon.price_paid)).where(SubscriptionAddon.is_active == True)
            rev_addons = (await db.execute(stmt_rev_addons)).scalar_one() or 0
            
            admin_stats = {
                "total_operators": total_operators,
                "total_sys_ig": total_sys_ig,
                "monthly_revenue": float(rev_subs + rev_addons)
            }

        stats_response = {
            "accounts": {
                "total": total_accounts,
                "active": active_accounts,
                "issues": issues_accounts,
                "uptime_pct": round((active_accounts / total_accounts * 100), 1) if total_accounts > 0 else 0,
                "breakdown": status_breakdown,
                "limit": ig_limit
            },
            "tasks": {
                "total_today": tasks_period,  # Now represents selected period
                "completed_today": completed_period,  # Now represents selected period
                "success_rate": round((completed_period / tasks_period * 100), 1) if tasks_period > 0 else 0,
                "trends": trend_data
            },
            "proxies": {
                "total": total_proxies,
                "limit": proxy_limit
            },
            "subscription": {
                "plan": plan_name,
                "expiry": expiry_date,
                "status": "active" if sub else "inactive"
            },
            "expiry_alert": expiry_alert,
            "schedules": schedules,
            "activity_stats": activity_stats,
            "period": period,
            "admin_stats": admin_stats
        }
        
        return stats_response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"CRITICAL ERROR in dashboard stats: {e}")
        # Return fallback data to prevent frontend crash
        return {
            "accounts": { "total": 0, "active": 0, "issues": 0, "uptime_pct": 0, "breakdown": {}, "limit": 0 },
            "tasks": { "total_today": 0, "completed_today": 0, "success_rate": 0, "trends": [] },
            "proxies": { "total": 0, "limit": 0 },
            "subscription": { "plan": "Error", "expiry": None, "status": "inactive" },
            "expiry_alert": None,
            "schedules": [],
            "activity_stats": {},
            "period": "today",
            "admin_stats": {}
        }
