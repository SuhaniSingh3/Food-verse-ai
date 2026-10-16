"""Abstract base interface for Food Verse AI vision providers."""
from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.food_analysis import StructuredFoodAnalysisResponse


class BaseVisionAIProvider(ABC):
    """Abstract base class defining the contract for all AI vision providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider identifier (e.g. 'vertexai', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Provider model tag (e.g. 'gemini-1.5-flash')."""
        pass

    @abstractmethod
    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        """Perform multimodal food recognition and ingredient decomposition on sanitized image bytes.

        Args:
            image_bytes: Sanitized raw image binary.
            mime_type: Validated MIME type (e.g. 'image/jpeg', 'image/png').
            user_question: Optional user query to answer in context of the image.

        Returns:
            StructuredFoodAnalysisResponse separating observations from inferences.

        Raises:
            AIProviderError: When upstream model call fails or times out.
            ServiceNotConfiguredError: When required credentials or environment vars are missing.
        """
        pass
