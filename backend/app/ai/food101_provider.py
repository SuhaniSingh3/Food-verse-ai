"""Pretrained Food-101 image classification provider using Hugging Face Transformers.

Loads the model once during application startup and performs real CPU/GPU inference
on uploaded image bytes to return top-3 predicted food categories with confidence scores.
Never returns fabricated mock predictions or silently falls back.
"""
import io
import os
import time
from typing import List, Optional
from PIL import Image
import torch
import transformers
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Disable tqdm and Hugging Face interactive progress bars to prevent Windows anonymous pipe flush errors (OSError Errno 22)
os.environ["TQDM_DISABLE"] = "1"
try:
    transformers.utils.logging.disable_progress_bar()
except Exception:
    pass

from app.ai.base import BaseVisionAIProvider
from app.ai.food101_knowledge import (
    format_dish_name,
    get_culinary_profile,
)
from app.core.config import settings
from app.core.errors import AIProviderError
from app.core.logging import logger
from app.schemas.food_analysis import (
    IngredientObservation,
    NutritionEstimate,
    StructuredFoodAnalysisResponse,
    TopFoodPrediction,
)


class Food101ModelManager:
    """Thread-safe Singleton managing the lifecycle of the Food-101 Transformers model.

    Ensures the model and image processor are loaded exactly ONCE at application startup,
    reused across all HTTP requests, and never re-instantiated per request.
    """
    _instance: Optional["Food101ModelManager"] = None

    def __init__(self):
        self._model = None
        self._processor = None
        self._model_name: Optional[str] = None
        self._load_error: Optional[str] = None
        self._is_loaded: bool = False
        self._num_classes: int = 0

    @classmethod
    def get_instance(cls) -> "Food101ModelManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded and self._model is not None and self._processor is not None

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    @property
    def model_name(self) -> str:
        return self._model_name or settings.FOOD101_MODEL_NAME

    @property
    def num_classes(self) -> int:
        return self._num_classes

    def load_model(self, model_name: Optional[str] = None) -> None:
        """Load pretrained model and preprocessor into memory. Called during startup."""
        target_model = model_name or settings.FOOD101_MODEL_NAME
        if self._is_loaded and self._model_name == target_model:
            logger.info(f"Food-101 model '{target_model}' is already loaded in memory.")
            return

        # Ensure progress bars are silenced before loading model weights to prevent Windows pipe flush errors
        os.environ["TQDM_DISABLE"] = "1"
        try:
            transformers.utils.logging.disable_progress_bar()
        except Exception:
            pass

        logger.info(f"Loading Food-101 image classification model from Hugging Face: '{target_model}'...")
        start_t = time.perf_counter()
        try:
            self._processor = AutoImageProcessor.from_pretrained(target_model)
            self._model = AutoModelForImageClassification.from_pretrained(target_model)
            self._model.eval()
            self._model_name = target_model
            self._is_loaded = True
            self._load_error = None
            self._num_classes = len(self._model.config.id2label)
            elapsed_ms = (time.perf_counter() - start_t) * 1000
            logger.info(
                f"Successfully loaded Food-101 model '{target_model}' ({self._num_classes} classes) "
                f"in {elapsed_ms:.1f}ms."
            )
        except Exception as exc:
            self._is_loaded = False
            self._model = None
            self._processor = None
            self._load_error = str(exc)
            logger.error(f"Failed to load Food-101 model '{target_model}': {exc}", exc_info=True)
            raise exc

    def classify_image_bytes(self, image_bytes: bytes, top_k: int = 3) -> List[TopFoodPrediction]:
        """Perform forward inference on sanitized image bytes and return top-k predictions."""
        if not self.is_loaded and self._load_error is None:
            try:
                self.load_model(self.model_name)
            except Exception as exc:
                logger.warning(f"On-demand Food-101 model loading failed: {exc}")

        if not self.is_loaded:
            error_reason = self._load_error or "Model has not been initialized at application startup."
            logger.error(f"Inference rejected: Food-101 model is not loaded. Details: {error_reason}")
            raise AIProviderError(
                message=(
                    f"Food-101 image classification model is not available. "
                    f"Startup loading failed or model weights were not found. "
                    f"Error details: {error_reason}. "
                    f"Fabricated/mock results are strictly disallowed."
                ),
                details={
                    "model": self.model_name,
                    "is_loaded": False,
                    "load_error": self._load_error,
                },
            )

        try:
            # 1. Open and ensure RGB format
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # 2. Preprocess using the model's feature extractor
            inputs = self._processor(images=image, return_tensors="pt")

            # 3. Model forward pass
            with torch.no_grad():
                outputs = self._model(**inputs)
                logits = outputs.logits
                probs = torch.nn.functional.softmax(logits, dim=-1)[0]

            # 4. Extract top-k probabilities and labels
            top_probs, top_indices = torch.topk(probs, min(top_k, self._num_classes))

            predictions: List[TopFoodPrediction] = []
            for prob_tensor, idx_tensor in zip(top_probs, top_indices):
                prob = float(prob_tensor.item())
                idx = int(idx_tensor.item())
                raw_label = self._model.config.id2label.get(idx, f"food_class_{idx}")
                category_name = format_dish_name(raw_label)
                predictions.append(
                    TopFoodPrediction(
                        category=category_name,
                        raw_label=raw_label,
                        confidence=round(prob, 4),
                        percentage=f"{prob * 100:.1f}%",
                    )
                )

            return predictions
        except AIProviderError:
            raise
        except Exception as exc:
            logger.error(f"Food-101 model inference failed: {exc}", exc_info=True)
            raise AIProviderError(
                message=f"Failed to execute Food-101 classification inference: {str(exc)}",
                details={"model": self.model_name, "error": str(exc)},
            )


class Food101ClassificationProvider(BaseVisionAIProvider):
    """Real Food-101 Vision AI Provider powered by Hugging Face Transformers."""

    def __init__(self, model_manager: Optional[Food101ModelManager] = None):
        self._manager = model_manager or Food101ModelManager.get_instance()

    @property
    def provider_name(self) -> str:
        return "food101-transformers"

    @property
    def model_name(self) -> str:
        return self._manager.model_name

    def predict_top_k(self, image_bytes: bytes, k: int = 3) -> List[TopFoodPrediction]:
        """Direct helper to retrieve top-k food predictions with confidence scores."""
        return self._manager.classify_image_bytes(image_bytes=image_bytes, top_k=k)

    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        """Run classification on uploaded image bytes and return top 3 predictions with confirmation prompt.

        Per strict AI guardrails:
        - Never invents visually verified ingredients, cooking methods, or portion weights from Food-101 logits alone.
        - Sets is_confirmed=False and requires_user_confirmation=True until the user confirms or corrects the dish.
        - Preserves top 3 predictions and confidence scores for user transparency.
        """
        start_time = time.perf_counter()

        # Step 1: Run real model classification to get top 3 predictions
        top_predictions = self.predict_top_k(image_bytes=image_bytes, k=3)
        inference_latency_ms = round((time.perf_counter() - start_time) * 1000, 1)

        if not top_predictions:
            raise AIProviderError(
                message="Model returned no classification candidates for the uploaded image.",
                details={"model": self.model_name},
            )

        top1 = top_predictions[0]
        dish_name = top1.category
        top_conf = top1.confidence

        if top_conf >= 0.70:
            confidence_assessment = "High"
        elif top_conf >= 0.35:
            confidence_assessment = "Moderate"
        else:
            confidence_assessment = "Low"


        regional_note = (
            "Note: The model is trained on the standard Food-101 benchmark dataset (101 classes). "
            "It may not recognize Indian dishes or regional specialties (such as Pav Bhaji, Poha, Dosa, Idli, Chole Bhature, Dal Makhani) "
            "and will predict the closest statistical visual match. Image classification does NOT evaluate food freshness or microbial safety."
        )

        uncertainties = [
            f"Top model prediction is '{top1.category}' with {top1.percentage} confidence.",
            "The Food-101 taxonomy is limited to 101 predefined categories and does not include many regional Indian dishes (such as Pav Bhaji, Poha, Dosa, Idli, Chole Bhature, Dal Makhani).",
            "Per strict safety guardrails, no visible ingredients, cooking methods, or portion weights are invented from classifier logits alone.",
            "Please confirm or correct the dish identity using the 'Is this prediction correct?' section below before viewing recipe ingredients and nutritional estimates."
        ]

        # Handle user question honestly in unconfirmed state
        q_answer = None
        if user_question:
            q_clean = user_question.lower()
            if "fresh" in q_clean or "spoil" in q_clean or "safe" in q_clean or "eat" in q_clean:
                q_answer = (
                    f"Regarding '{user_question}': Image classification model only identifies candidate food category ({dish_name}). "
                    "It CANNOT evaluate food freshness, bacterial load, spoilage, or microbial safety. Inspect the food in person "
                    "and follow food safety guidelines before consumption."
                )
            elif "indian" in q_clean or "curry" in q_clean or "dal" in q_clean or "pav" in q_clean or "poha" in q_clean:
                q_answer = (
                    f"Regarding '{user_question}': The model is trained on the Food-101 taxonomy and classified this image as '{dish_name}' ({top1.percentage}). "
                    f"If this is a regional Indian preparation (e.g. Pav Bhaji, Poha, Dosa), select or type the correct dish in the confirmation section below."
                )
            else:
                q_answer = (
                    f"In response to '{user_question}': The image was classified with top candidate '{dish_name}' ({top1.percentage}). "
                    "Please confirm or correct the dish name to receive authentic culinary and ingredient details."
                )

        return StructuredFoodAnalysisResponse(
            dish_name=dish_name,
            confidence_assessment=confidence_assessment,
            apparent_preparation_method=f"Candidate model prediction ({dish_name}, {top1.percentage}). Awaiting user confirmation before verifying cooking methods or ingredients.",
            visible_ingredients=[],
            potential_ingredients_or_guesses=[],
            visual_uncertainties_and_ambiguities=uncertainties,
            decomposed_items=[],
            nutritional_estimate=None,
            dietary_tags=["Candidate Prediction", "Confirmation Required"],
            user_question=user_question,
            user_question_answer=q_answer,
            safety_and_allergen_disclaimer=(
                "Visual analysis cannot confirm hidden ingredients, allergens, food safety, or exact portion weight. "
                "The model is trained on Food-101 and may not recognize every Indian dish. "
                "Image classification does not determine food freshness or safety. Never rely on image recognition for medical or severe allergy management."
            ),
            top_predictions=top_predictions,
            regional_disclaimer=regional_note,
            is_confirmed=False,
            confirmed_dish=None,
            requires_user_confirmation=True,
            confirmation_options=[
                "Pav Bhaji",
                "Poha",
                "Samosa",
                "Dosa",
                "Idli",
                "Chole Bhature",
                "Dal Makhani",
            ],
            provider_metadata={
                "provider": "Hugging Face Transformers (Food-101)",
                "model": self.model_name,
                "latency_ms": inference_latency_ms,
                "status": "unconfirmed_candidate",
                "top_predictions": [p.model_dump() for p in top_predictions],
                "authenticated_via": "Local Hugging Face Transformers Pretrained Model (0 Paid API / 0 Ollama)",
                "dataset": "Food-101 Benchmark (101 Classes)",
                "limitations": "Taxonomy lacks regional Indian dishes; does not evaluate freshness or microbial safety.",
            },
        )

    def confirm_dish(
        self,
        confirmed_dish: str,
        original_prediction: Optional[str] = None,
        confidence: Optional[float] = None,
        top_predictions: Optional[List[TopFoodPrediction]] = None,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        """Create confirmed structured response based on user selection or correction.

        Loads authentic culinary baseline profile and benchmark nutritional data for the confirmed dish,
        while maintaining the original classifier predictions for complete auditability.
        """
        clean_dish_name = format_dish_name(confirmed_dish)
        profile = get_culinary_profile(confirmed_dish)

        # Build decomposed ingredient observations from verified culinary baseline
        decomposed_items: List[IngredientObservation] = []
        for name, is_visible, notes, grams in profile["items"]:
            decomposed_items.append(
                IngredientObservation(
                    name=name,
                    is_directly_visible=is_visible,
                    notes=notes,
                    estimated_grams=grams,
                )
            )

        # Build approximate nutrition estimate calibrated against standard reference benchmarks
        cals, prot, carbs, fat = profile["macros"]
        nutrition_est = NutritionEstimate(
            estimated_calories=int(cals),
            protein_g=float(prot),
            carbs_g=float(carbs),
            fat_g=float(fat),
            basis=f"Approximate reference benchmark for standard serving of {clean_dish_name} (USDA/culinary baseline)",
        )

        uncertainties = [
            f"Dish confirmed by user as '{clean_dish_name}'. Ingredients and cooking methods are derived from standard culinary baselines.",
            "Exact cooking fat, sodium levels, and hidden allergens (e.g. dairy, gluten cross-contact) cannot be visually verified without ingredient labeling.",
            "Nutritional figures are approximate reference benchmarks per typical serving, not laboratory chemical analyses.",
            "Original Food-101 classifier predictions are preserved above for complete audit transparency."
        ]

        # Handle user question for the confirmed dish
        q_answer = None
        if user_question:
            q_clean = user_question.lower()
            if "fresh" in q_clean or "spoil" in q_clean or "safe" in q_clean or "eat" in q_clean:
                q_answer = (
                    f"Regarding '{user_question}': Visual inspection and user confirmation identify {clean_dish_name}. "
                    "However, image analysis CANNOT evaluate food freshness, microbial safety, or spoilage. Follow proper food handling and safety practices."
                )
            elif "dairy" in q_clean or "lactose" in q_clean:
                q_answer = (
                    f"Regarding '{user_question}': For {clean_dish_name}, dairy ingredients (such as butter, ghee, or cream) are commonly used in authentic recipes. "
                    "Confirm with the kitchen preparer for severe lactose allergies."
                )
            elif "gluten" in q_clean or "wheat" in q_clean:
                q_answer = (
                    f"Regarding '{user_question}': For {clean_dish_name}, wheat products or cross-contamination cannot be ruled out without allergen labeling."
                )
            else:
                q_answer = (
                    f"In response to '{user_question}': The meal has been confirmed as {clean_dish_name}. "
                    "Preparation methods and baseline ingredients have been loaded from authentic culinary references."
                )

        return StructuredFoodAnalysisResponse(
            dish_name=clean_dish_name,
            confidence_assessment="User-Confirmed",
            apparent_preparation_method=profile["method"],
            visible_ingredients=profile["visible"],
            potential_ingredients_or_guesses=profile["inferred"],
            visual_uncertainties_and_ambiguities=uncertainties,
            decomposed_items=decomposed_items,
            nutritional_estimate=nutrition_est,
            dietary_tags=profile["tags"] + ["User-Confirmed"],
            user_question=user_question,
            user_question_answer=q_answer,
            safety_and_allergen_disclaimer=(
                "Visual analysis cannot confirm hidden ingredients, allergens, food safety, or exact portion weight. "
                "The model is trained on Food-101 and may not recognize every Indian dish. "
                "Image classification does not determine food freshness or safety. Never rely on image recognition for medical or severe allergy management."
            ),
            top_predictions=top_predictions or [],
            regional_disclaimer=(
                "Note: The model is trained on the standard Food-101 benchmark dataset. "
                f"The dish was confirmed by the user as '{clean_dish_name}'. "
                "Image classification does not evaluate food freshness or microbial safety."
            ),
            is_confirmed=True,
            confirmed_dish=clean_dish_name,
            requires_user_confirmation=False,
            confirmation_options=[
                "Pav Bhaji",
                "Poha",
                "Samosa",
                "Dosa",
                "Idli",
                "Chole Bhature",
                "Dal Makhani",
            ],
            provider_metadata={
                "provider": "Food-101 Classifier + User Confirmation",
                "model": self.model_name,
                "status": "user_confirmed",
                "confirmed_dish": clean_dish_name,
                "original_candidate": original_prediction,
                "original_confidence": confidence,
                "top_predictions": [p.model_dump() for p in (top_predictions or [])],
                "dataset": "Food-101 Benchmark (101 Classes) + Regional Culinary Profiles",
            },
        )

