"""Freshness and hygiene screening endpoints (Optional Modules P2)."""
from fastapi import APIRouter, File, UploadFile
from app.schemas.freshness import FreshnessAnalysisResponse
from app.schemas.hygiene import HygieneAuditResponse
from app.services.freshness_service import FreshnessService
from app.services.hygiene_service import HygieneService

router = APIRouter(prefix="/optional", tags=["Optional Modules"])


@router.post(
    "/freshness",
    response_model=FreshnessAnalysisResponse,
    summary="Evaluate Produce Freshness & Spoilage Indicators",
    description="Inspects produce photo for discoloration, mold, and turgidity to estimate shelf life.",
)
async def analyze_freshness(
    file: UploadFile = File(..., description="Produce image file (JPEG, PNG, WEBP, max 10MB)"),
) -> FreshnessAnalysisResponse:
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    return await FreshnessService.analyze_freshness(
        image_bytes=content,
        mime_type=content_type,
        filename=file.filename or "produce.jpg",
    )


@router.post(
    "/hygiene",
    response_model=HygieneAuditResponse,
    summary="Conduct Visual Kitchen & Dining Hygiene Audit",
    description="Inspects food prep surfaces and dining areas against sanitation checklists.",
)
async def audit_hygiene(
    file: UploadFile = File(..., description="Kitchen or dining image file (JPEG, PNG, WEBP, max 10MB)"),
) -> HygieneAuditResponse:
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    return await HygieneService.audit_hygiene(
        image_bytes=content,
        mime_type=content_type,
        filename=file.filename or "kitchen.jpg",
    )
