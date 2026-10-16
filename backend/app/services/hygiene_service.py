"""Kitchen and restaurant hygiene screener service (Optional Module P2)."""
from app.core.config import settings
from app.core.errors import ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.hygiene import HygieneAuditResponse
from app.utils.image_guard import ImageGuard, SanitizedImageResult


class HygieneService:
    """Service evaluating visual cleanliness and sanitation risk cues for prep areas."""

    @classmethod
    async def audit_hygiene(
        cls,
        image_bytes: bytes,
        mime_type: str,
        filename: str = "kitchen_image"
    ) -> HygieneAuditResponse:
        # Validate and sanitize input image
        sanitized: SanitizedImageResult = ImageGuard.validate_and_sanitize(
            file_bytes=image_bytes,
            declared_mime_type=mime_type,
            filename=filename,
        )

        logger.info(
            f"Validated image for hygiene audit: {sanitized.width}x{sanitized.height} {sanitized.format} "
            f"({len(sanitized.raw_bytes)} bytes)"
        )

        # Hygiene screening is an optional P2 module scheduled for Phase 5
        raise ServiceNotConfiguredError(
            service_name="hygiene_audit",
            message="Kitchen and dining hygiene screening is an optional module (P2) scheduled for Phase 5. "
                    "Image verification and sanitization succeeded, but audit evaluation pipeline is not configured.",
            details={
                "sanitized_image": {
                    "width": sanitized.width,
                    "height": sanitized.height,
                    "format": sanitized.format,
                }
            }
        )
