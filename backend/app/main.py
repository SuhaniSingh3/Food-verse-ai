"""Food Verse AI — FastAPI Application Entry Point."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("food_verse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for startup and shutdown events."""
    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} "
        f"in [{settings.ENVIRONMENT}] mode (AI Provider: {settings.AI_PROVIDER})"
    )
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Culinary & Nutritional Analysis Platform",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# CORS Policy Configuration
# In production, wildcard '*' is strictly disallowed.
cors_origins = settings.CORS_ORIGINS
if settings.is_production and ("*" in cors_origins or not cors_origins):
    logger.warning(
        "Production environment detected: Insecure CORS wildcard prevented. "
        "Defaulting to empty allowed origins."
    )
    cors_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)


@app.get("/", summary="Root Welcome")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "documentation": "/docs" if not settings.is_production else "disabled in production",
        "health_check": f"{settings.API_V1_PREFIX}/health"
    }
