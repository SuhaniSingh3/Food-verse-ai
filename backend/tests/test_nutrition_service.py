"""Unit tests for deterministic NutritionService calculations."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.schemas.nutrition import IngredientPortionInput, NutritionCalculationRequest
from app.services.nutrition_service import NutritionService


def test_nutrition_calculation_known_ingredients():
    """Verify exact macro calculation for Salmon (180g) and Quinoa (120g)."""
    request = NutritionCalculationRequest(
        items=[
            IngredientPortionInput(name="Salmon", grams=180.0),
            IngredientPortionInput(name="Quinoa", grams=120.0),
        ]
    )
    result = NutritionService.calculate_nutrition(request)

    assert len(result.items) == 2
    salmon = result.items[0]
    quinoa = result.items[1]

    # Salmon 206 kcal/100g -> 180g = 370.8 kcal
    assert salmon.is_benchmark_match is True
    assert pytest.approx(salmon.calories, rel=1e-1) == 370.8
    assert pytest.approx(salmon.protein_g, rel=1e-1) == 36.7

    # Quinoa 120 kcal/100g -> 120g = 144.0 kcal
    assert quinoa.is_benchmark_match is True
    assert pytest.approx(quinoa.calories, rel=1e-1) == 144.0

    # Total calories sum
    assert pytest.approx(result.totals.calories, rel=1e-1) == (370.8 + 144.0)


def test_nutrition_calculation_unknown_ingredient_fallback():
    """Verify unknown food item gets handled with baseline calculation and is_benchmark_match=False."""
    request = NutritionCalculationRequest(
        items=[
            IngredientPortionInput(name="Exotic Dragon Herb Secret Root", grams=100.0)
        ]
    )
    result = NutritionService.calculate_nutrition(request)
    assert len(result.items) == 1
    assert result.items[0].is_benchmark_match is False
    assert result.items[0].calories > 0


@pytest.mark.asyncio
async def test_nutrition_api_endpoint():
    """Verify POST /api/v1/nutrition/calculate returns 200 and schema compliant JSON."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "items": [
                {"name": "Chicken Breast", "grams": 150.0},
                {"name": "Steamed Broccoli", "grams": 100.0},
            ]
        }
        response = await client.post("/api/v1/nutrition/calculate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "totals" in data
        assert len(data["items"]) == 2
        assert data["totals"]["calories"] > 0
        assert data["totals"]["protein_g"] > 0


@pytest.mark.asyncio
async def test_nutrition_api_validation_rejects_empty():
    """Verify POST /api/v1/nutrition/calculate rejects empty items list with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/api/v1/nutrition/calculate", json={"items": []})
        assert response.status_code == 422
