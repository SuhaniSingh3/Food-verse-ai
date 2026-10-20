"""Automated tests for Smart Cooking Assistant: validation, structured response, provider errors, portion scaling, and allergen auditing."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.ai.recipe_generator import RecipeGenerator
from app.ai.recipe_prompts import audit_recipe_allergens
from app.core.config import settings
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.main import app
from app.schemas.recipes import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    RecipeIngredientQuantity,
    RecipeItem,
    RecipeScaleRequest,
    RecipeSubstitution,
)
from app.services.recipe_service import RecipeService


# ---------------------------------------------------------------------------
# 1. Validation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recipe_validation_rejects_empty_ingredients():
    """Verify endpoint rejects empty ingredients list with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "ingredients": [],
            "servings": 2,
        }
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 422
        body = response.json()
        assert "error" in body


@pytest.mark.asyncio
async def test_recipe_validation_rejects_whitespace_ingredients():
    """Verify endpoint rejects list containing only whitespace strings."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "ingredients": ["   ", "   "],
            "servings": 2,
        }
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "MEDIA_VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_recipe_validation_rejects_invalid_servings():
    """Verify endpoint rejects servings < 1 or > 12."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Servings 0
        response = await client.post("/api/recipes/generate", json={"ingredients": ["Rice"], "servings": 0})
        assert response.status_code == 422

        # Servings 15 (exceeds max 12)
        response = await client.post("/api/recipes/generate", json={"ingredients": ["Rice"], "servings": 15})
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_recipe_validation_rejects_invalid_cook_time():
    """Verify endpoint rejects cook time < 5 or > 180."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/generate",
            json={"ingredients": ["Rice"], "max_cook_time_minutes": 2}
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# 2. Structured Response & Generation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recipe_generation_success_with_structured_data(monkeypatch):
    """Verify successful recipe synthesis returning structured fields."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "ingredients": ["Salmon", "Quinoa", "Broccoli", "Lemon", "Garlic"],
            "cuisine": "Mediterranean",
            "dietary_preference": "Pescatarian",
            "allergies_and_avoid": ["Peanuts"],
            "servings": 3,
            "max_cook_time_minutes": 25,
            "skill_level": "Beginner",
        }
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 200

        body = response.json()
        assert "recipes" in body
        assert len(body["recipes"]) >= 1

        first_recipe = body["recipes"][0]
        assert "title" in first_recipe
        assert "description" in first_recipe
        assert first_recipe["servings"] == 3
        assert first_recipe["cuisine"] == "Mediterranean"
        assert len(first_recipe["ingredient_quantities"]) > 0

        # Check ingredient quantities have name, amount, and unit
        first_ing = first_recipe["ingredient_quantities"][0]
        assert "name" in first_ing
        assert first_ing["amount"] > 0
        assert "unit" in first_ing

        # Check step-by-step instructions
        assert len(first_recipe["preparation_steps"]) > 0
        assert len(first_recipe["substitutions"]) > 0

        # Check health advisory
        assert "inspirational" in first_recipe["allergen_advisory"].lower()


# ---------------------------------------------------------------------------
# 3. Portion Scaling Tests
# ---------------------------------------------------------------------------

def test_recipe_service_scale_recipe():
    """Verify scaling ingredient quantities proportionally when servings change."""
    base_recipe = RecipeItem(
        id="test_recipe_01",
        title="Lemon Herb Salmon",
        description="Fresh seared salmon",
        cuisine="Mediterranean",
        difficulty="Beginner",
        prep_time_minutes=10,
        cook_time_minutes=15,
        base_servings=2,
        servings=2,
        ingredient_quantities=[
            RecipeIngredientQuantity(name="Salmon Fillet", amount=200.0, unit="g"),
            RecipeIngredientQuantity(name="Olive Oil", amount=2.0, unit="tbsp"),
            RecipeIngredientQuantity(name="Garlic", amount=2.0, unit="cloves"),
        ],
        preparation_steps=["Sear salmon for 4 minutes."],
        substitutions=[],
    )

    # Scale from 2 servings to 4 servings (factor of 2.0)
    scaled = RecipeService.scale_recipe(base_recipe, target_servings=4)
    assert scaled.servings == 4
    assert scaled.ingredient_quantities[0].name == "Salmon Fillet"
    assert scaled.ingredient_quantities[0].amount == 400.0
    assert scaled.ingredient_quantities[1].amount == 4.0
    assert scaled.ingredient_quantities[2].amount == 4.0

    # Scale down to 1 serving (factor of 0.5)
    scaled_1 = RecipeService.scale_recipe(base_recipe, target_servings=1)
    assert scaled_1.servings == 1
    assert scaled_1.ingredient_quantities[0].amount == 100.0
    assert scaled_1.ingredient_quantities[1].amount == 1.0


@pytest.mark.asyncio
async def test_api_scale_endpoint():
    """Verify POST /api/v1/recipes/scale endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        recipe_dict = {
            "id": "scale_test",
            "title": "Quinoa Bowl",
            "description": "Simple bowl",
            "cuisine": "Any",
            "difficulty": "Beginner",
            "prep_time_minutes": 5,
            "cook_time_minutes": 10,
            "base_servings": 1,
            "servings": 1,
            "ingredient_quantities": [
                {"name": "Quinoa", "amount": 100.0, "unit": "g"}
            ],
            "preparation_steps": ["Boil quinoa."],
            "substitutions": [],
        }

        payload = {
            "recipe": recipe_dict,
            "target_servings": 3,
        }
        response = await client.post("/api/v1/recipes/scale", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["servings"] == 3
        assert body["ingredient_quantities"][0]["amount"] == 300.0


# ---------------------------------------------------------------------------
# 4. Allergen Conflict Detection Tests
# ---------------------------------------------------------------------------

def test_allergen_audit_flags_direct_conflict():
    """Verify allergen audit flags when prohibited ingredient appears in recipe."""
    recipe = RecipeItem(
        id="peanut_sauce_dish",
        title="Chicken with Thai Peanut Sauce",
        description="Savory chicken tossed in creamy peanut butter sauce",
        cuisine="Asian",
        difficulty="Beginner",
        prep_time_minutes=10,
        cook_time_minutes=15,
        base_servings=2,
        servings=2,
        ingredient_quantities=[
            RecipeIngredientQuantity(name="Chicken Breast", amount=250.0, unit="g"),
            RecipeIngredientQuantity(name="Peanut Butter", amount=3.0, unit="tbsp"),
        ],
        preparation_steps=["Simmer peanut sauce."],
        substitutions=[],
    )

    # User declared peanuts as allergy
    conflicts = audit_recipe_allergens(recipe, ["Peanuts"])
    assert len(conflicts) > 0
    assert any("peanut" in c.lower() for c in conflicts)


def test_allergen_audit_flags_derivative_conflict():
    """Verify allergen audit flags derivative ingredients (e.g. dairy -> cheese or butter)."""
    recipe = RecipeItem(
        id="parmesan_pasta",
        title="Garlic Butter Pasta",
        description="Tossed in melted butter and grated parmesan cheese",
        cuisine="Italian",
        difficulty="Beginner",
        prep_time_minutes=5,
        cook_time_minutes=10,
        base_servings=1,
        servings=1,
        ingredient_quantities=[
            RecipeIngredientQuantity(name="Pasta", amount=120.0, unit="g"),
            RecipeIngredientQuantity(name="Butter", amount=2.0, unit="tbsp"),
        ],
        preparation_steps=["Melt butter in pan."],
        substitutions=[],
    )

    # User declared Dairy allergy
    conflicts = audit_recipe_allergens(recipe, ["Dairy"])
    assert len(conflicts) > 0
    assert any("butter" in c.lower() or "dairy" in c.lower() for c in conflicts)


# ---------------------------------------------------------------------------
# 5. Provider Error Handling Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recipe_provider_unconfigured_error(monkeypatch):
    """Verify 501 ServiceNotConfiguredError when vertexai is selected without project id."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "vertexai")
    monkeypatch.setattr(settings, "GCP_PROJECT_ID", "")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {"ingredients": ["Rice", "Beans"]}
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 501
        body = response.json()
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_recipe_provider_timeout_error(monkeypatch):
    """Verify 504 AI_TIMEOUT when model call times out."""
    async def mock_timeout(*args, **kwargs):
        raise AIProviderError("Recipe model timed out", is_timeout=True)

    monkeypatch.setattr(RecipeGenerator, "generate_recipes", mock_timeout)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {"ingredients": ["Rice", "Beans"]}
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 504
        body = response.json()
        assert body["error"]["code"] == "AI_TIMEOUT"


@pytest.mark.asyncio
async def test_recipe_generation_momos_with_red_chutney(monkeypatch):
    """Verify momos recipe contains authentic ingredients/instructions and zero placeholder phrases."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "dish_name": "Momos with Red Chutney",
            "ingredients": [
                "Steamed flour dumpling wrappers (momos)",
                "Finely minced seasoned vegetable filling (cabbage, carrots, onions)",
                "Fiery red tomato-garlic chili dipping chutney",
            ],
            "servings": 2,
            "max_cook_time_minutes": 30,
        }
        response = await client.post("/api/recipes/generate", json=payload)
        assert response.status_code == 200
        body = response.json()
        recipes = body.get("recipes", [])
        assert len(recipes) >= 1

        # Check that recipes are authentic momos
        assert any("momo" in r["title"].lower() for r in recipes)

        # Check relevant ingredients
        all_ingredients = " ".join(
            ing["name"].lower() + " " + ing.get("notes", "").lower()
            for rec in recipes
            for ing in rec.get("ingredient_quantities", [])
        )
        assert "flour" in all_ingredients or "maida" in all_ingredients
        assert "cabbage" in all_ingredients
        assert "chili" in all_ingredients or "chilies" in all_ingredients or "chutney" in all_ingredients

        # Check relevant preparation steps (steaming / pan-frying, pleating, red chutney)
        all_steps = " ".join(
            step.lower()
            for rec in recipes
            for step in rec.get("preparation_steps", [])
        )
        assert "steam" in all_steps
        assert "pleat" in all_steps or "wrapper" in all_steps
        assert "chutney" in all_steps

        # Strictly verify complete absence of placeholder phrases
        body_dump = str(body).lower()
        forbidden_phrases = [
            "primary momo",
            "primary ",
            "characteristic garnish",
            "surface texture",
            "accompanying base",
            "side elements",
            "rinse, pat dry, and slice into uniform portions",
            "cook undisturbed for 10 minutes until golden",
        ]
        for phrase in forbidden_phrases:
            assert phrase not in body_dump, f"Forbidden placeholder phrase found: '{phrase}'"
