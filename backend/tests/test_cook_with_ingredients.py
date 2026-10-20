"""Automated tests for 'Cook With Ingredients You Have' endpoint and pantry matcher engine."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.schemas.recipes import CookWithIngredientsRequest
from app.services.pantry_matcher import (
    canonicalize_ingredient,
    extract_ingredient_tokens,
    is_recipe_vegan,
    is_recipe_vegetarian,
    PantryMatcher,
)


# ---------------------------------------------------------------------------
# 1. Ingredient Normalization & Synonyms Tests
# ---------------------------------------------------------------------------

def test_canonicalize_and_synonym_resolution():
    """Verify that Hindi culinary terms, plurals, and aliases resolve to canonical names."""
    assert canonicalize_ingredient("aloo") == "potato"
    assert canonicalize_ingredient("potatoes") == "potato"
    assert canonicalize_ingredient("tamatar") == "tomato"
    assert canonicalize_ingredient("pyaz") == "onion"
    assert canonicalize_ingredient("lahsun") == "garlic"
    assert canonicalize_ingredient("garlic cloves") == "garlic"
    assert canonicalize_ingredient("all-purpose flour (maida)") == "flour"
    assert canonicalize_ingredient("dahi") == "yogurt"
    assert canonicalize_ingredient("paneer") == "paneer"
    assert canonicalize_ingredient("cottage cheese") == "paneer"
    assert canonicalize_ingredient("chana") == "chickpeas"
    assert canonicalize_ingredient("kabuli chana") == "chickpeas"
    assert canonicalize_ingredient("palak") == "spinach"
    assert canonicalize_ingredient("spaghetti") == "pasta"
    assert canonicalize_ingredient("poha") == "flattened rice"


def test_token_extraction_stems():
    """Verify ingredient tokens include singular and stem forms."""
    tokens = extract_ingredient_tokens("Fresh Tomatoes")
    assert "tomato" in tokens
    assert "tomatoes" in tokens


# ---------------------------------------------------------------------------
# 2. Strict Dietary Constraints Logic Tests
# ---------------------------------------------------------------------------

def test_strict_vegetarian_and_vegan_classifiers():
    """Ensure meat/fish are non-vegetarian, and dairy/eggs/honey are non-vegan."""
    non_veg_recipe = {
        "title": "Chashu Pork Ramen",
        "ingredients": [("Pork Chashu", 100, "g", "sliced"), ("Ramen noodles", 1, "pack", "")]
    }
    assert is_recipe_vegetarian(non_veg_recipe) is False
    assert is_recipe_vegan(non_veg_recipe) is False

    dairy_recipe = {
        "title": "Paneer Bhurji",
        "ingredients": [("Paneer", 200, "g", "crumbled"), ("Onion", 1, "piece", "chopped"), ("Butter", 15, "g", "")]
    }
    assert is_recipe_vegetarian(dairy_recipe) is True
    assert is_recipe_vegan(dairy_recipe) is False

    egg_recipe = {
        "title": "Scrambled Eggs",
        "ingredients": [("Eggs", 3, "pieces", "beaten"), ("Butter", 10, "g", "")]
    }
    assert is_recipe_vegetarian(egg_recipe) is True
    assert is_recipe_vegan(egg_recipe) is False

    pure_vegan_recipe = {
        "title": "Garlic Tomato Pasta",
        "ingredients": [
            ("Pasta", 180, "g", ""),
            ("Ripe Tomatoes", 3, "pieces", "diced"),
            ("Garlic", 4, "cloves", "sliced"),
            ("Olive Oil", 2, "tbsp", ""),
        ]
    }
    assert is_recipe_vegetarian(pure_vegan_recipe) is True
    assert is_recipe_vegan(pure_vegan_recipe) is True


# ---------------------------------------------------------------------------
# 3. Validation & Error Handling Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_rejects_empty_ingredients():
    """Verify endpoint rejects empty ingredients with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={"ingredients": []},
        )
        assert response.status_code == 422
        body = response.json()
        assert "error" in body


@pytest.mark.asyncio
async def test_endpoint_rejects_whitespace_ingredients():
    """Verify endpoint rejects ingredients with only whitespace with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={"ingredients": ["   ", "  \t  "]},
        )
        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "MEDIA_VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_endpoint_rejects_invalid_cooking_time():
    """Verify endpoint rejects max_cook_time_minutes <= 0 with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={"ingredients": ["potato"], "max_cook_time_minutes": 0},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# 4. Search, Matching, Coverage & Ranking Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cook_with_ingredients_pasta_success():
    """Test matching Garlic Tomato Pasta with partial and full ingredients."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Partial match
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["pasta", "tomatoes", "garlic"],
                "dietary_preference": "vegan",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_matched"] >= 1
        assert "pasta" in [i.lower() for i in data["query_ingredients"]]

        # Find Garlic Tomato Pasta in results
        pasta_matches = [r for r in data["recipes"] if "Pasta" in r["recipe"]["title"]]
        assert len(pasta_matches) > 0
        pasta_match = pasta_matches[0]

        # Verify available vs missing lists
        assert len(pasta_match["available_ingredients"]) >= 3
        assert len(pasta_match["missing_ingredients"]) > 0  # Missing olive oil / basil / salt
        assert pasta_match["can_make_now"] is False
        assert 0.0 < pasta_match["match_percentage"] < 100.0

        # Check supported substitutions exist
        assert len(pasta_match["supported_substitutions"]) > 0


@pytest.mark.asyncio
async def test_can_make_now_flag_when_all_ingredients_supplied():
    """Ensure can_make_now is True ONLY when missing_ingredients is empty."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["eggs", "butter", "salt", "black pepper", "bread"],
                "dietary_preference": "vegetarian",
            },
        )
        assert response.status_code == 200
        data = response.json()
        scrambled_matches = [r for r in data["recipes"] if "Scrambled Eggs" in r["recipe"]["title"]]
        assert len(scrambled_matches) > 0
        scrambled = scrambled_matches[0]
        assert scrambled["match_percentage"] == 100.0
        assert len(scrambled["missing_ingredients"]) == 0
        assert scrambled["can_make_now"] is True


@pytest.mark.asyncio
async def test_strict_vegan_filtering_excludes_dairy_and_eggs():
    """Ensure vegan filter excludes recipes with butter, eggs, paneer, and meat."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["eggs", "paneer", "butter", "rice", "garlic", "onion", "spinach", "chickpeas"],
                "dietary_preference": "vegan",
            },
        )
        assert response.status_code == 200
        data = response.json()

        for item in data["recipes"]:
            title = item["recipe"]["title"]
            assert "Scrambled Eggs" not in title, f"Eggs recipe {title} found in vegan results!"
            assert "Paneer Bhurji" not in title, f"Paneer recipe {title} found in vegan results!"
            assert "Ramen" not in title, f"Pork ramen {title} found in vegan results!"


@pytest.mark.asyncio
async def test_strict_vegetarian_filtering_excludes_meat():
    """Ensure vegetarian filter excludes pork, chicken, salmon, etc."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["noodles", "garlic", "soy sauce", "pork", "chicken"],
                "dietary_preference": "vegetarian",
            },
        )
        assert response.status_code == 200
        data = response.json()

        for item in data["recipes"]:
            title = item["recipe"]["title"]
            assert "Ramen" not in title, f"Meat recipe {title} found in vegetarian results!"


@pytest.mark.asyncio
async def test_max_cooking_time_filter():
    """Ensure recipes exceeding max cooking time are omitted."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["rice", "garlic", "chickpeas", "spinach", "eggs"],
                "max_cook_time_minutes": 10,
            },
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["recipes"]:
            assert item["recipe"]["cook_time_minutes"] <= 10


@pytest.mark.asyncio
async def test_no_matches_returns_empty_result_with_guidance():
    """Ensure completely unmatched ingredients return clean empty result with helpful advice."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["dragonfruit", "marshmallows"],
                "dietary_preference": "no_restriction",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_matched"] == 0
        assert data["recipes"] == []
        assert "No recipes matched" in data["message"]


@pytest.mark.asyncio
async def test_ranking_orders_highest_coverage_first():
    """Ensure recipes with highest match percentage and fewest missing ingredients rank first."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["rice", "carrots", "green peas", "garlic", "soy sauce", "sesame oil"],
                "dietary_preference": "no_restriction",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["recipes"]) >= 2
        # Verify monotonically descending match_percentage or fewer missing ingredients
        for i in range(len(data["recipes"]) - 1):
            curr = data["recipes"][i]
            nxt = data["recipes"][i + 1]
            assert curr["match_percentage"] >= nxt["match_percentage"]


# ---------------------------------------------------------------------------
# 5. Regression Tests for Pantry Availability Isolation (Requirements 8 & 9)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_potatoes_onions_tomatoes_momos_regression():
    """Verify that a pantry containing only potatoes, onions, and tomatoes
    does NOT incorrectly mark cabbage, carrots, ginger, garlic, spring onions,
    or red chutney as available in momo recipes.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/recipes/cook-with-ingredients",
            json={
                "ingredients": ["Potatoes", "Onions", "Tomatoes"],
                "dietary_preference": "vegetarian",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Find momo recipes in response
        momo_matches = [
            r for r in data["recipes"]
            if "momo" in r["recipe"]["title"].lower() or "kothey" in r["recipe"]["title"].lower()
        ]
        assert len(momo_matches) > 0, "Momo recipes should be matched on onions/tomatoes"

        for match_item in momo_matches:
            title = match_item["recipe"]["title"]
            available = [a.lower() for a in match_item["available_ingredients"]]
            missing = [m.lower() for m in match_item["missing_ingredients"]]

            # 1. Cabbage must NOT be available
            assert not any("cabbage" in a for a in available), f"Cabbage incorrectly marked available in '{title}'"

            # 2. Carrots must NOT be available
            assert not any("carrot" in a for a in available), f"Carrot incorrectly marked available in '{title}'"

            # 3. Ginger must NOT be available
            assert not any("ginger" in a for a in available), f"Ginger incorrectly marked available in '{title}'"

            # 4. Garlic must NOT be available
            assert not any("garlic" in a for a in available), f"Garlic incorrectly marked available in '{title}'"

            # 5. Spring onions must NOT be available (even though onions are in pantry!)
            assert not any("spring onion" in a for a in available), f"Spring onions incorrectly marked available in '{title}'"

            # 6. Red chutney must NOT be available (even though tomatoes are in pantry!)
            assert not any("chutney" in a for a in available), f"Red chutney incorrectly marked available in '{title}'"

            # 7. Check individual ingredient quantities in the structured recipe object
            ing_quantities = match_item["recipe"]["ingredient_quantities"]
            for iq in ing_quantities:
                iq_name = iq["name"].lower()
                if any(k in iq_name for k in ["cabbage", "carrot", "ginger", "garlic", "spring onion", "chutney"]):
                    assert iq["is_available"] is False, f"Ingredient {iq['name']} should have is_available=False"

            # 8. can_make_now must be strictly False
            assert match_item["can_make_now"] is False, f"can_make_now must be False for '{title}'"


def test_distinct_synonym_separation():
    """Verify that distinct culinary ingredients are never cross-matched as synonyms."""
    # Spring onion is distinct from onion
    assert canonicalize_ingredient("spring onions") == "spring onion"
    assert canonicalize_ingredient("scallions") == "spring onion"
    assert canonicalize_ingredient("green onions") == "spring onion"
    assert canonicalize_ingredient("onions") == "onion"
    assert canonicalize_ingredient("pyaz") == "onion"
    assert canonicalize_ingredient("kanda") == "onion"
    assert canonicalize_ingredient("spring onions") != canonicalize_ingredient("onions")

    # Sweet potato is distinct from potato
    assert canonicalize_ingredient("sweet potatoes") == "sweet potato"
    assert canonicalize_ingredient("potatoes") == "potato"
    assert canonicalize_ingredient("aloo") == "potato"
    assert canonicalize_ingredient("sweet potatoes") != canonicalize_ingredient("potatoes")

    # Chutney is distinct from raw tomato
    assert canonicalize_ingredient("fiery red tomato-chili chutney") == "red chutney"
    assert canonicalize_ingredient("tomatoes") == "tomato"
    assert canonicalize_ingredient("tamatar") == "tomato"
    assert canonicalize_ingredient("fiery red tomato-chili chutney") != canonicalize_ingredient("tomatoes")
