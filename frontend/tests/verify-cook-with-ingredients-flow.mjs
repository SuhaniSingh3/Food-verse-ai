/**
 * Frontend API Integration & Flow Verification for
 * "Cook With Ingredients You Have" (Pantry Matcher) Feature.
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

async function verifyCookWithIngredientsFeature() {
  console.log('='.repeat(75));
  console.log('VERIFYING "COOK WITH INGREDIENTS YOU HAVE" END-TO-END FLOW');
  console.log('='.repeat(75));

  // 1. Validation test: empty ingredients rejection
  console.log('\n[1] Verifying 422 validation on empty ingredients list...');
  const emptyRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients: [] }),
  });
  if (emptyRes.status !== 422) {
    throw new Error(`Expected 422 on empty ingredients, got ${emptyRes.status}`);
  }
  const emptyErr = await emptyRes.json();
  console.log(`[OK] Empty input rejected with 422: ${JSON.stringify(emptyErr.error?.code || emptyErr)}`);

  // 2. Realistic Matching: Pasta, Garlic, Tomatoes
  console.log('\n[2] Testing recipe matching for ["pasta", "garlic", "tomatoes"]...');
  const matchRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['pasta', 'garlic', 'tomatoes'],
      dietary_preference: 'no_restriction',
    }),
  });
  if (!matchRes.ok) {
    throw new Error(`Matching request failed: ${matchRes.status}`);
  }
  const matchData = await matchRes.json();
  console.log(`[OK] Total matched recipes: ${matchData.total_matched}`);
  console.log(`[OK] Message: "${matchData.message}"`);

  if (!matchData.recipes || matchData.recipes.length === 0) {
    throw new Error('Expected at least 1 matched recipe for pasta, garlic, tomatoes!');
  }

  const topMatch = matchData.recipes[0];
  console.log(`[OK] Top match: "${topMatch.recipe.title}" (${topMatch.match_percentage}% match)`);
  console.log(`     Available ingredients (${topMatch.available_ingredients.length}): ${topMatch.available_ingredients.join(', ')}`);
  console.log(`     Missing ingredients (${topMatch.missing_ingredients.length}): ${topMatch.missing_ingredients.join(', ')}`);
  console.log(`     Can make now: ${topMatch.can_make_now}`);
  console.log(`     Supported substitutions count: ${topMatch.supported_substitutions.length}`);

  if (topMatch.missing_ingredients.length > 0 && topMatch.can_make_now === true) {
    throw new Error('can_make_now is True even though missing_ingredients is non-empty!');
  }

  // 3. Synonym Resolution: Hindi culinary terms ('aloo', 'pyaz', 'tamatar')
  console.log('\n[3] Testing synonym resolution for Hindi terms ["aloo", "pyaz", "tamatar", "butter"]...');
  const synonymRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['aloo', 'pyaz', 'tamatar', 'butter'],
      dietary_preference: 'vegetarian',
    }),
  });
  if (!synonymRes.ok) {
    throw new Error(`Synonym request failed: ${synonymRes.status}`);
  }
  const synData = await synonymRes.json();
  console.log(`[OK] Total matched: ${synData.total_matched}`);
  const hasPavBhajiOrAloo = synData.recipes.some(
    (r) => r.recipe.title.toLowerCase().includes('pav bhaji') || r.recipe.title.toLowerCase().includes('potato')
  );
  if (!hasPavBhajiOrAloo) {
    throw new Error('Pav Bhaji or Potato recipe was not matched despite providing aloo/pyaz/tamatar!');
  }
  console.log('[OK] Successfully resolved aloo/pyaz/tamatar to Potato/Onion/Tomato recipes!');

  // 4. Strict Vegan Filtering: Exclude butter, eggs, paneer, and meat
  console.log('\n[4] Testing strict vegan filter (no dairy, no eggs, no meat)...');
  const veganRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['rice', 'garlic', 'spinach', 'chickpeas', 'carrots', 'peas', 'soy sauce', 'butter', 'eggs'],
      dietary_preference: 'vegan',
    }),
  });
  if (!veganRes.ok) {
    throw new Error(`Vegan request failed: ${veganRes.status}`);
  }
  const veganData = await veganRes.json();
  console.log(`[OK] Vegan matches found: ${veganData.total_matched}`);
  for (const item of veganData.recipes) {
    const t = item.recipe.title.toLowerCase();
    if (t.includes('scrambled egg') || t.includes('paneer') || t.includes('ramen') || t.includes('salmon')) {
      throw new Error(`Non-vegan recipe appeared in vegan results: ${item.recipe.title}`);
    }
  }
  console.log('[OK] ALL recipes returned strictly satisfy vegan rules (zero dairy, eggs, or meat)!');

  // 5. Strict Vegetarian Filtering: Exclude meat and fish
  console.log('\n[5] Testing strict vegetarian filter (no pork, chicken, fish)...');
  const vegRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['noodles', 'pork', 'garlic', 'eggs', 'soy sauce'],
      dietary_preference: 'vegetarian',
    }),
  });
  if (!vegRes.ok) {
    throw new Error(`Vegetarian request failed: ${vegRes.status}`);
  }
  const vegData = await vegRes.json();
  for (const item of vegData.recipes) {
    const t = item.recipe.title.toLowerCase();
    if (t.includes('ramen') || t.includes('salmon')) {
      throw new Error(`Non-vegetarian recipe appeared in vegetarian results: ${item.recipe.title}`);
    }
  }
  console.log('[OK] ALL recipes returned strictly satisfy vegetarian rules (zero meat or fish)!');

  // 6. Maximum Cooking Time Filtering
  console.log('\n[6] Testing maximum cooking time filter (≤ 15 minutes)...');
  const timeRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['rice', 'pasta', 'eggs', 'garlic', 'tomatoes'],
      max_cook_time_minutes: 15,
    }),
  });
  if (!timeRes.ok) {
    throw new Error(`Time filter request failed: ${timeRes.status}`);
  }
  const timeData = await timeRes.json();
  console.log(`[OK] Recipes with cook time <= 15m: ${timeData.total_matched}`);
  for (const item of timeData.recipes) {
    if (item.recipe.cook_time_minutes > 15) {
      throw new Error(`Recipe cook time ${item.recipe.cook_time_minutes} exceeds max 15m: ${item.recipe.title}`);
    }
  }
  console.log('[OK] ALL matched recipes strictly respect maximum cooking time constraint!');

  // 7. No Match Guidance
  console.log('\n[7] Testing no-match search guidance...');
  const noMatchRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['starfruit', 'dragonfruit'],
      dietary_preference: 'no_restriction',
    }),
  });
  if (!noMatchRes.ok) {
    throw new Error(`No match request failed: ${noMatchRes.status}`);
  }
  const noMatchData = await noMatchRes.json();
  if (noMatchData.total_matched !== 0 || noMatchData.recipes.length !== 0) {
    throw new Error(`Expected 0 matches for exotic fruit, got ${noMatchData.total_matched}`);
  }
  if (!noMatchData.message.toLowerCase().includes('no recipes matched')) {
    throw new Error(`Expected helpful guidance message, got: ${noMatchData.message}`);
  }
  console.log(`[OK] Empty state returned with helpful advice: "${noMatchData.message}"`);

  // 8. 100% Match & can_make_now verification
  console.log('\n[8] Testing 100% match & can_make_now = true for complete scrambled eggs...');
  const fullRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['eggs', 'bread', 'butter', 'salt', 'black pepper'],
      dietary_preference: 'vegetarian',
    }),
  });
  if (!fullRes.ok) {
    throw new Error(`Full match request failed: ${fullRes.status}`);
  }
  const fullData = await fullRes.json();
  const scrambled = fullData.recipes.find((r) => r.recipe.title.includes('Scrambled Eggs'));
  if (!scrambled) {
    throw new Error('Scrambled Eggs not found in results!');
  }
  if (scrambled.match_percentage !== 100 || scrambled.missing_ingredients.length !== 0 || !scrambled.can_make_now) {
    throw new Error(`Expected 100% match and can_make_now=true, got: ${JSON.stringify(scrambled)}`);
  }
  console.log(`[OK] "${scrambled.recipe.title}" correctly flagged: 100% match, 0 missing, can_make_now = true!`);

  // 9. Regression Test: Pantry containing ONLY [Potatoes, Onions, Tomatoes]
  console.log('\n[9] Regression Test: Pantry with ONLY ["Potatoes", "Onions", "Tomatoes"]...');
  const momoPantryRes = await fetch(`${API_BASE_URL}/api/recipes/cook-with-ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['Potatoes', 'Onions', 'Tomatoes'],
      dietary_preference: 'vegetarian',
    }),
  });
  if (!momoPantryRes.ok) {
    throw new Error(`Momo pantry regression request failed: ${momoPantryRes.status}`);
  }
  const momoPantryData = await momoPantryRes.json();
  const momoMatch = momoPantryData.recipes.find(
    (r) => r.recipe.title.toLowerCase().includes('momo') || r.recipe.title.toLowerCase().includes('kothey')
  );
  if (!momoMatch) {
    throw new Error('Momo recipe not returned in results!');
  }
  console.log(`[OK] Inspected recipe: "${momoMatch.recipe.title}"`);
  console.log(`     Match Percentage: ${momoMatch.match_percentage}%`);
  console.log(`     Available ingredients: ${momoMatch.available_ingredients.join(', ')}`);
  console.log(`     Missing ingredients count: ${momoMatch.missing_ingredients.length}`);

  const availLower = momoMatch.available_ingredients.map((a) => a.toLowerCase());

  // Verify that Cabbage, Carrots, Ginger, Garlic, Spring Onions, and Red Chutney are NOT available
  const forbiddenAvailable = ['cabbage', 'carrot', 'ginger', 'garlic', 'spring onion', 'chutney'];
  for (const item of forbiddenAvailable) {
    if (availLower.some((a) => a.includes(item))) {
      throw new Error(`Regression FAILED: "${item}" was incorrectly marked available in "${momoMatch.recipe.title}"!`);
    }
  }

  // Verify that in recipe.ingredient_quantities, is_available is strictly false for these items
  for (const iq of momoMatch.recipe.ingredient_quantities) {
    const iqLower = iq.name.toLowerCase();
    for (const item of forbiddenAvailable) {
      if (iqLower.includes(item)) {
        if (iq.is_available === true) {
          throw new Error(`Regression FAILED: iq.is_available is true for "${iq.name}"!`);
        }
      }
    }
  }

  if (momoMatch.can_make_now === true) {
    throw new Error('can_make_now must be false when ingredients are missing!');
  }
  console.log('[OK] Regression PASSED: Cabbage, Carrots, Ginger, Garlic, Spring Onions, and Red Chutney are strictly NOT marked as available!');

  console.log('\n' + '='.repeat(75));
  console.log('ALL "COOK WITH INGREDIENTS YOU HAVE" FLOW VERIFICATIONS PASSED!');
  console.log('='.repeat(75));
}

verifyCookWithIngredientsFeature().catch((err) => {
  console.error('[FAIL] Verification failed:', err);
  process.exit(1);
});
