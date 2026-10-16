# Food Verse AI — Features & Functional Requirements Specification

**Program:** NASSCOM FutureSkills Generative AI with Google Cloud  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Feature Classification Matrix

| Feature Identifier | Feature Name | Classification | Target Milestone | Priority |
| :--- | :--- | :---: | :---: | :---: |
| **FEAT-CORE-01** | Food Image Recognition & Ingredient Decomposition | Core | Milestone 2 / 3 | P0 |
| **FEAT-CORE-02** | Pantry-Driven Cooking Assistant & Recipe Generator | Core | Milestone 3 | P0 |
| **FEAT-CORE-03** | Personalized Nutrition Planner & Calibrated Calorie Tracker | Core | Milestone 3 | P0 |
| **FEAT-CORE-04** | Interactive Dashboard & Meal History Timeline | Core | Milestone 4 | P1 |
| **FEAT-CORE-05** | Responsive UI & Resilience / Error Boundary System | Core | Milestone 4 | P1 |
| **FEAT-OPT-01** | Visual Produce & Food Freshness Analysis | Optional | Milestone 5 | P2 |
| **FEAT-OPT-02** | Restaurant & Kitchen Hygiene Audit Screener | Optional | Milestone 5 | P2 |

---

## 2. Core Feature Specifications

### 2.1 FEAT-CORE-01: Food Image Recognition & Ingredient Analysis
- **User Story:** As a health-conscious user or home cook, I want to upload or snap a photo of my meal or raw grocery haul, so that the AI can accurately identify every component, estimate portions, and prepare it for nutritional calculation.
- **Inputs:**
  - Image file (`JPEG`, `PNG`, `WEBP`, max 10MB) via drag-and-drop, file picker, or web camera.
  - Optional meal context tag (`Breakfast`, `Lunch`, `Dinner`, `Snack`, `Raw Pantry Items`).
- **Processing Logic:**
  1. Image received by `/api/v1/vision/analyze`.
  2. Pillow validates image format, sanitizes headers, and strips EXIF metadata.
  3. Image passed to AI Provider (`GoogleGeminiProvider` or `MockAIProvider`).
  4. Multi-modal vision model analyzes visual features using a strict JSON schema prompt.
  5. Returns decomposed food items with bounding labels, estimated grams, and confidence ratings (0.0 to 1.0).
- **Output Schema:**
  ```json
  {
    "dish_name": "Mediterranean Grilled Salmon Bowl",
    "overall_confidence": 0.94,
    "identified_ingredients": [
      {
        "name": "Grilled Atlantic Salmon",
        "estimated_portion_grams": 170,
        "confidence": 0.98,
        "category": "Protein"
      },
      {
        "name": "Quinoa",
        "estimated_portion_grams": 120,
        "confidence": 0.92,
        "category": "Grain"
      },
      {
        "name": "Avocado slices",
        "estimated_portion_grams": 50,
        "confidence": 0.90,
        "category": "Healthy Fat"
      }
    ],
    "dietary_tags": ["High-Protein", "Pescatarian", "Gluten-Free"],
    "processing_time_ms": 1150
  }
  ```
- **Acceptance Criteria:**
  - [ ] Multi-item plates are correctly separated into individual constituents.
  - [ ] Ambiguous or blurry images return a courteous prompt asking for a clearer photo rather than fabricating guesses.
  - [ ] Non-food images (e.g., cars, documents) are detected and rejected gracefully with HTTP 422 / warning code.

---

### 2.2 FEAT-CORE-02: Cooking Assistant & Dynamic Recipe Generator
- **User Story:** As a user with limited ingredients in my fridge, I want the cooking assistant to suggest delicious, practical recipes utilizing what I already have, while respecting my time and dietary constraints.
- **Inputs:**
  - List of available ingredients (strings, auto-populated from image recognition or entered manually).
  - Dietary preferences (e.g., Vegetarian, Vegan, Halal, Kosher, Nut-Free, Dairy-Free, Low-Carb).
  - Target cook time limit (e.g., 15 mins, 30 mins, 60 mins).
  - Available appliances/tools (e.g., Stovetop, Oven, Air Fryer, Microwave).
- **Processing Logic:**
  1. Request validated via Pydantic model at `/api/v1/recipes/generate`.
  2. Recipe engine constructs prompt prioritizing minimal missing ingredients ("zero-waste cooking").
  3. AI Provider generates 1 to 3 candidate recipes conforming to structured instructions.
  4. Each recipe includes preparation time, step-by-step instructions, equipment required, and common ingredient substitutions.
- **Output Schema:**
  ```json
  {
    "recipes": [
      {
        "id": "rec_01",
        "title": "Crispy Pan-Seared Salmon with Herb Quinoa",
        "servings": 2,
        "prep_time_minutes": 10,
        "cook_time_minutes": 15,
        "difficulty": "Easy",
        "ingredients_used": ["Grilled Atlantic Salmon", "Quinoa", "Avocado slices"],
        "pantry_staples_needed": ["Olive oil", "Salt", "Black pepper", "Lemon juice"],
        "substitutions": [
          {"original": "Lemon juice", "substitute": "White wine vinegar"}
        ],
        "instructions": [
          "Heat olive oil in a non-stick pan over medium-high heat.",
          "Sear salmon for 4 minutes skin-side down until crispy.",
          "Warm pre-cooked quinoa and toss with fresh herbs.",
          "Slice avocado and plate alongside salmon."
        ],
        "estimated_nutrition": {
          "calories": 520,
          "protein_g": 38,
          "carbs_g": 34,
          "fat_g": 24
        }
      }
    ]
  }
  ```
- **Acceptance Criteria:**
  - [ ] Generated recipes strictly honor selected allergy and dietary exclusions.
  - [ ] Instructions are broken down into numbered, concise steps.
  - [ ] User can save recipes to their profile with one click.

---

### 2.3 FEAT-CORE-03: Personalized Nutrition Planner & Calorie Tracker
- **User Story:** As a health-conscious individual, I want to track my daily macro and micronutrients against personalized targets, backed by reliable nutritional reference data.
- **Inputs:**
  - User profile attributes: Age, gender, height, weight, activity level, health goal (maintenance, fat loss, muscle gain).
  - Daily target macros (customizable or auto-calculated via Mifflin-St Jeor formula).
  - Logged food items with portion sizes.
- **Processing Logic:**
  1. `/api/v1/nutrition/calculate` receives ingredient list with estimated or user-adjusted weights.
  2. Verified baseline data queried from benchmark reference table (calories, protein, carbohydrates, dietary fiber, total fat, sodium).
  3. Aggregated daily intake calculated against user's daily budget.
  4. Generates contextual recommendations (e.g., "You are 15g short of your protein target for today; consider Greek yogurt for an evening snack").
- **Output Schema:**
  ```json
  {
    "user_id": "usr_9921",
    "date": "2026-10-17",
    "daily_targets": {
      "calories": 2200,
      "protein_g": 140.0,
      "carbs_g": 220.0,
      "fat_g": 70.0
    },
    "consumed_so_far": {
      "calories": 1650,
      "protein_g": 115.0,
      "carbs_g": 160.0,
      "fat_g": 52.0
    },
    "remaining_budget": {
      "calories": 550,
      "protein_g": 25.0,
      "carbs_g": 60.0,
      "fat_g": 18.0
    },
    "macro_percentages": {
      "protein": 28,
      "carbs": 43,
      "fat": 29
    },
    "coach_insight": "Great balance today! High fiber intake from quinoa has kept your satiety high."
  }
  ```
- **Acceptance Criteria:**
  - [ ] Nutritional numbers are verified against standard reference datasets; extreme outliers are flagged.
  - [ ] Allows manual portion adjustments (e.g., sliding grams from 100g to 150g dynamically updates macros).
  - [ ] Visual progress bars display percentage of daily goals met with warning colors when approaching limits.

---

### 2.4 FEAT-CORE-04: Central Dashboard & Meal History Timeline
- **User Story:** As an active user, I want a unified dashboard showing today's nutritional snapshot, recent meal logs, quick analysis triggers, and historical meal trends.
- **Components:**
  - **Quick Action Bar:** "Snap / Upload Meal", "Plan Next Meal", "View Pantry".
  - **Daily Nutrition Wheel / Rings:** Visual macro and calorie completion gauge.
  - **Meal Stream:** Chronological feed of logged meals with thumbnails, timestamps, and calorie tags.
  - **History Filter:** Filter by date range, meal category (Breakfast/Lunch/Dinner), or dietary label.
  - **Export / Reset:** Option to export weekly summaries or clear history.
- **Acceptance Criteria:**
  - [ ] Meals logged via FEAT-CORE-01 automatically appear in the dashboard stream without manual refresh.
  - [ ] User can edit or delete historical meal entries with instantaneous calculation recalculation.

---

### 2.5 FEAT-CORE-05: Responsive UI, Aesthetics & Resilient Error Handling
- **User Story:** As any user on a mobile phone, tablet, or desktop, I want a fluid, aesthetically stunning, and reliable experience with clear error messages when something goes wrong.
- **Design Standards:**
  - Color palette: High-contrast culinary tones (Warm amber/saffron, crisp emerald greens, deep obsidian dark mode, crisp slate text).
  - Glassmorphic card overlays, subtle hover elevations, and fluid CSS transitions.
  - Accessible typography with responsive scaling.
- **Resilience Specifications:**
  - Global React Error Boundary prevents entire screen crashes.
  - Network timeouts (e.g., slow AI response > 15s) display friendly retry prompts.
  - Inline field validation on every form input with assistive aria labels.

---

## 3. Optional Feature Specifications (P2)

### 3.1 FEAT-OPT-01: Produce & Food Freshness Analysis
- **User Story:** As an ingredient shopper or home cook, I want to inspect a piece of fruit, vegetable, or dairy item via vision AI to check if it is still fresh or showing signs of spoilage.
- **Processing Logic:**
  1. Image submitted to `/api/v1/optional/freshness`.
  2. Model evaluates visual markers: surface discoloration, bruising, fungal/mold patterns, skin wrinkling, or liquid separation.
  3. Returns a Freshness Grade (A = Peak Fresh, B = Good/Usable, C = Consume Immediately, D = Spoilage Detected / Discard).
  4. Provides estimated remaining shelf life and optimal storage guidance (e.g., "Transfer to airtight container in crisper drawer").
- **Safety Disclaimer:** Prominently displays: *"Visual AI estimates are for informational guidance only. Never consume food that smells rancid, tastes abnormal, or exhibits mold."*

---

### 3.2 FEAT-OPT-02: Restaurant & Kitchen Hygiene Audit Screener
- **User Story:** As a diner or food service worker, I want to analyze a photo of a dining area, food prep counter, or kitchen station to get a rapid cleanliness checklist evaluation.
- **Processing Logic:**
  1. Image submitted to `/api/v1/optional/hygiene`.
  2. Model examines key sanitation markers: surface clutter, visible debris/grease stains, unsealed food containers, presence of cleaning tools near food, and glove usage.
  3. Returns an aggregate Cleanliness Score (0 to 100), risk tier (Low, Medium, High Risk), and positive/negative observation bullet points.
- **Safety Disclaimer:** Explicitly marks results as an exploratory visual audit tool, not an official regulatory health inspection certificate.

---

## 4. Non-Functional Requirements (NFRs)

| NFR Domain | Specification Requirement | Verification Method |
| :--- | :--- | :--- |
| **Response Latency** | Vision analysis responses returned under 3.5 seconds on average broadband. | Server-side request timer logging & frontend network waterfall tests. |
| **Mobile Responsiveness** | Flawless rendering from 360px viewport (mobile) to 2560px (4K monitors). | Responsive design testing across mobile, tablet, and desktop viewports. |
| **Accessibility** | Meets WCAG 2.1 Level AA (color contrast >= 4.5:1, keyboard navigable, screen-reader labeled). | Axe-core automated audits and manual keyboard navigation checks. |
| **Data Integrity** | Zero data loss on concurrent meal writes; atomic SQLite/Postgres transactions. | Concurrent request test scripts via `pytest-asyncio`. |
| **Telemetry & Observability** | Structured logging for every inference call (token count, latency, model ID, HTTP status). | Python standard logging with JSON output formatting. |
