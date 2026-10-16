"""Food Verse AI — FastAPI Application Entry Point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.food import router as food_router
from app.api.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook managing application startup and shutdown."""
    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} "
        f"in [{settings.ENVIRONMENT}] mode (AI Provider: {settings.AI_PROVIDER})"
    )
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Multi-Modal Culinary & Nutritional Analysis Platform",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# Register uniform application exception handlers
register_exception_handlers(app)

# CORS Policy Configuration
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
app.include_router(food_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", summary="Root Welcome")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "documentation": "/docs" if not settings.is_production else "disabled in production",
        "health_check": f"{settings.API_V1_PREFIX}/health",
        "api_v1_prefix": f"{settings.API_V1_PREFIX}/v1",
    }
