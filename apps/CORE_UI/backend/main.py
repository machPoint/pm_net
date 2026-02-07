"""
CORE-SE Demo Backend
FastAPI application serving as the API gateway for the React frontend.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from dotenv import load_dotenv

from app.config import get_settings
from app.routers import (
    pulse,
    impact,
    tasks,
    notes,
    knowledge,
    windows,
    ai,
    config as config_router,
    auth,
    settings as settings_router,
    system_model,
)
from src.routes import agents as agents_router

# Load environment variables
load_dotenv()

settings = get_settings()
logger = logging.getLogger("core-se-backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and agent service on startup"""
    # await init_db()  # Disabled for now
    
    # Initialize agent service
    from src.agents import AgentService
    import json
    from pathlib import Path
    
    try:
        # Load agent configuration
        config_path = Path(__file__).parent / "config" / "agents.json"
        with open(config_path) as f:
            agent_config = json.load(f)
        
        provider_type = agent_config.get("provider", "mock")
        provider_config = agent_config.get("providers", {}).get(provider_type, {})
        
        logger.info(f"Initializing agent service with provider: {provider_type}")
        await AgentService.initialize(provider_type=provider_type, config=provider_config)
        logger.info("Agent service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize agent service: {e}")
        logger.info("Continuing without agent service")
    
    yield
    
    # Shutdown agent service
    try:
        service = AgentService.get_instance()
        await service.shutdown()
        logger.info("Agent service shut down")
    except Exception as e:
        logger.error(f"Error shutting down agent service: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="CORE-SE Demo API",
    description="Backend API for CORE-SE engineering workspace demo",
    version="1.0.0",
    lifespan=lifespan,
)

# Import auth dependencies
from app.dependencies import get_optional_user

# CORS middleware
allowed_origins = settings.ALLOWED_ORIGINS or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(
    "CORE-SE backend starting (mode=%s) host=%s port=%s",
    settings.MODE,
    settings.BACKEND_HOST,
    settings.BACKEND_PORT,
)

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "core-se-api",
        "mode": settings.MODE,
        "fds_configured": bool(settings.FDS_BASE_URL),
    }

# Include routers
app.include_router(auth.router, prefix="/api")  # Auth routes don't need auth
app.include_router(pulse.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(impact.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(tasks.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(notes.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(knowledge.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(windows.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(ai.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(settings_router.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(system_model.router, prefix="/api", dependencies=[Depends(get_optional_user)])
app.include_router(config_router.router, prefix="/api")  # Config doesn't need auth
app.include_router(agents_router.router, prefix="/api", dependencies=[Depends(get_optional_user)])  # Agent management

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
