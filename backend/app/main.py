from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import accounts, tasks, proxies, dashboard, reporting
from app.db.session import engine
from app.models.base import Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Request logging middleware for debugging
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"🔍 Incoming: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"✅ Response: {request.method} {request.url.path} -> {response.status_code}")
    return response

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["accounts"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(proxies.router, prefix="/api/v1/proxies", tags=["proxies"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(reporting.router, prefix="/api/v1/reporting", tags=["reporting"])

@app.on_event("startup")
async def startup():
    from tenacity import retry, stop_after_attempt, wait_fixed
    
    @retry(stop=stop_after_attempt(5), wait=wait_fixed(2))
    async def init_db():
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            print(f"DB Init failed, retrying... Error: {e}")
            raise e
            
    await init_db()
    
    # Central Server License Validation (if enabled)
    if settings.CENTRAL_SERVER_ENABLED:
        from app.services.central_client import get_central_client
        import asyncio
        
        central_client = get_central_client()
        is_valid = await central_client.login()
        
        if not is_valid:
            print("="*60)
            print("❌ CRITICAL: License validation failed!")
            print("="*60)
            print("Please check:")
            print("1. Central Server is running")
            print("2. CENTRAL_SERVER_URL in .env is correct")
            print("3. CLIENT_NAME and CLIENT_PASSWORD are correct")
            print("4. Your client account is active")
            print("="*60)
            raise Exception("License validation failed. Cannot start application.")
        
        # Start background heartbeat task (optional)
        async def heartbeat_loop():
            """Send periodic heartbeat to central server"""
            while True:
                try:
                    await asyncio.sleep(settings.HEARTBEAT_INTERVAL)
                    
                    # Get stats from database
                    from app.db.session import AsyncSessionLocal
                    from app.models.account import Account
                    from app.models.proxy import ProxyTemplate
                    from sqlalchemy import select, func
                    
                    async with AsyncSessionLocal() as db:
                        # Count accounts
                        total_accounts_result = await db.execute(select(func.count(Account.id)))
                        total_accounts = total_accounts_result.scalar()
                        
                        active_accounts_result = await db.execute(
                            select(func.count(Account.id)).where(Account.status == "active")
                        )
                        active_accounts = active_accounts_result.scalar()
                        
                        # Count proxies
                        total_proxies_result = await db.execute(select(func.count(ProxyTemplate.id)))
                        total_proxies = total_proxies_result.scalar()
                        
                        active_proxies_result = await db.execute(
                            select(func.count(ProxyTemplate.id)).where(ProxyTemplate.is_active == True)
                        )
                        active_proxies = active_proxies_result.scalar()
                    
                    # Send heartbeat
                    await central_client.send_heartbeat({
                        "total_accounts": total_accounts,
                        "active_accounts": active_accounts,
                        "total_proxies": total_proxies,
                        "active_proxies": active_proxies
                    })
                    
                except Exception as e:
                    print(f"⚠️ Heartbeat error: {e}")
        
        # Start heartbeat in background
        asyncio.create_task(heartbeat_loop())
        print(f"✅ Central Server integration enabled - heartbeat every {settings.HEARTBEAT_INTERVAL}s")

@app.get("/")
def read_root():
    return {"message": "Welcome to Instagram Automation API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
