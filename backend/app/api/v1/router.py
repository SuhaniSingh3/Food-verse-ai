"""API v1 router aggregating all domain endpoints."""
from fastapi import APIRouter
from app.api.v1.endpoints.vision import router as vision_router
from app.api.v1.endpoints.recipes import router as recipes_router
from app.api.v1.endpoints.nutrition import router as nutrition_router
from app.api.v1.endpoints.optional import router as optional_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(vision_router)
api_v1_router.include_router(recipes_router)
api_v1_router.include_router(nutrition_router)
api_v1_router.include_router(optional_router)
