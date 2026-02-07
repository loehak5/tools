from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, clients, activity, analytics
from app.db.session import engine
from app.models.base import Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS - Configure based on your needs
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}/clients", tags=["clients"])
app.include_router(activity.router, prefix=f"{settings.API_V1_STR}/activity", tags=["activity"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])


@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
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
    print("✅ Central Server database initialized")


@app.get("/")
def read_root():
    """Root endpoint"""
    return {
        "message": "Instagram Tools Central Server",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
