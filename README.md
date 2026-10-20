# Food Verse AI 🍽️

**Multi-Modal Food Image Classification, Generative Recipe Assistance, Pantry Matching & Nutritional Estimation Platform.**

*Developed for the **NASSCOM FutureSkills Generative AI with Google Cloud** Internship Program.*

Food Verse AI is a full-stack platform built with a **React 19 (Vite 8)** frontend and **FastAPI (Python 3.11+)** backend. The system integrates deep-learning computer vision with generative AI reasoning to classify food images, authenticate regional cuisine profiles, synthesize personalized portion-scaled recipes, track nutritional estimates against USDA reference benchmarks, manage favorites and analysis logs, and find recipes using available pantry ingredients.

> [!IMPORTANT]
> **Culinary & Nutritional Disclaimers:**
> - **Prediction Accuracy:** The computer vision classifier uses a pretrained 101-category MobileNetV2 neural network (`rajkr/mobilenet-v2-food101`). It is trained on 101 general international dish categories and may misclassify regional dishes (such as Indian, Nepalese, or street foods). Always use the built-in **Food Prediction Correction & Confirmation** feature to verify dishes and retrieve authentic recipes and nutrition.
> - **Nutrition Figures:** Nutritional metrics are culinary estimates computed from verified USDA reference benchmarks and portion approximations. They are not laboratory measurements and should not be used as clinical or medical advice.
> - **Food Safety:** Visual analysis cannot detect bacterial contamination, foodborne pathogens, spoilage, internal cooking temperature, or allergens.

---

## 🌟 Implemented Features

### 1. Multi-Tier AI Vision & Generative Architecture
- **Default Local Pretrained Inference (Zero Cost):** Employs Hugging Face Transformers (`rajkr/mobilenet-v2-food101`) running locally without requiring paid API keys or cloud quotas.
- **Model Preloading:** Model weights are initialized once at backend startup via `Food101ModelManager` (singleton pattern) for sub-second subsequent inference requests.
- **Google Cloud Generative AI Ready:** Built-in provider adapters for **Google Cloud Vertex AI** (`VertexAIGeminiProvider`) and **Google AI Studio Gemini Developer API** (`GeminiDeveloperProvider`) using `google-genai` and `gemini-1.5-flash` for multimodal reasoning.
- **Image Sanitization Guard (`ImageGuard`):** Enforces strict file validation (max 10 MB, allowed MIME types: JPEG, PNG, WebP), strips sensitive EXIF metadata, and downsamples oversized images.
- **Confidence Metrics:** Returns top candidate probabilities and confidence distributions in the frontend to convey model certainty honestly.
- **Interactive Question Input:** Supports optional user inquiries alongside food photographs (e.g., checking preparation styles or ingredients).

### 2. Prediction Confirmation & Food Correction
- **Disambiguation Workflow:** Allows users to review top classifier suggestions and override misclassifications (e.g., correcting "ramen" to "Pav Bhaji" or "spring rolls" to "Steamed Momos").
- **Authentic Regional Knowledge Base:** Linking to verified dish profiles retrieves authentic baseline ingredients, cooking techniques, and calibrated nutritional values without hallucinating ingredients.

### 3. Cook With Ingredients You Have (Pantry Matching)
- **Pantry Ingredient Input:** Add ingredients via an interactive text tag bar (Enter or comma separated) or quick-click common staple chips (Potatoes, Onions, Tomatoes, Rice, Garlic, Ginger, Flour, Milk, Eggs, Butter, Olive Oil, Pasta).
- **Intelligent Ingredient Matching:** Matches pantry items against the curated recipe database using canonical names, English and Hindi synonyms (e.g., *aloo* → potato, *pyaz* → onion, *tamatar* → tomato), and word stemming.
- **Match Percentage & Ready-to-Cook Badges:** Calculates match percentages and highlights recipes with a "Can make now!" badge when 100% of required ingredients are present.
- **Ingredient Separation & Accuracy:** Accurately separates user pantry items from recipe requirements. Grouped items (e.g., "cabbage, carrots, and onions") are strictly evaluated at the individual ingredient level to prevent false availability.
- **Missing Ingredients & Substitutions:** Highlights missing ingredients needed to complete the dish along with supported culinary substitutions (e.g., Greek yogurt for sour cream, lemon juice for vinegar).
- **Dietary & Time Filtering:**
  - **Dietary:** *No Restriction*, *Vegetarian* (strictly excludes meat, poultry, fish, seafood), or *Vegan* (strictly excludes all animal products, dairy, and eggs).
  - **Maximum Cook Time:** Filter by cooking duration (≤ 15, ≤ 30, ≤ 45, or ≤ 60 minutes).
- **Recipe Detail Modal:** Comprehensive modal view containing cook time, prep time, serving count, ingredient availability indicators, step-by-step instructions, and estimated nutrition breakdown.

### 4. Recipe Generation & Interactive Cooking Assistant
- **Curated & Dynamic Synthesis:** Generates portion-scaled recipes based on confirmed food identities or user ingredients.
- **Interactive Ingredients Checklist:** Check off ingredients as you prepare them with visual strike-through styling, real-time progress indicators (*"X of Y ingredients completed"*), and a one-click checklist reset.
- **Serving Scaler:** Proportional recalculation of ingredient quantities for target serving sizes.

### 5. Nutrition Information & USDA Benchmark Engine
- **Ingredient Decomposition:** Maps ingredients and estimated portion weights against calibrated USDA reference nutritional data.
- **Macronutrient Breakdown:** Calculates total calories, protein, carbohydrates, fats, and dietary fiber per serving.
- **Benchmark Traceability:** Indicates whether an ingredient directly matched a known reference benchmark.

### 6. Favorites & Analysis History
- **Favorite Recipes:** Save favorite recipes with one click (heart icon); persisted in browser `localStorage` (`foodverse_saved_recipes`).
- **Storage Isolation:** Saved favorites remain safely preserved even when clearing meal analysis history.
- **Analysis History Log:** Automatically logs meal analyses with timestamps, predicted labels, confidence levels, and confirmed dish names to `localStorage` (`foodverse_meals`).
- **Live History Search:** Instant case-insensitive filtering by food name, predicted label, confirmed name, or ingredient.
- **Downloadable Reports:** Generates structured `.txt` analysis summaries containing observations, ingredients, and nutritional estimates.
- **History Management:** Clear individual searches or wipe entire history with confirmation modal safeguard.

---

## 🛠️ Technology Stack & Dependency Specifications

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | `^19.2.8` (19.3.1) | Component-driven UI architecture |
| **Build Tool & Dev Server** | Vite | `^8.3.0` (8.3.4) | ESM-native fast client build and hot reload |
| **Backend Framework** | FastAPI | `>=0.115.0,<0.116.0` | Asynchronous REST API service |
| **ASGI Server** | Uvicorn | `>=0.31.0,<0.32.0` | Production-grade ASGI application runner |
| **Data Validation** | Pydantic v2 | `>=2.9.0,<2.11.0` | Strict schema validation and settings |
| **Computer Vision Model** | PyTorch / Transformers | `torch>=2.2.0`, `transformers>=4.40.0` | Pretrained Food-101 MobileNetV2 image classification |
| **Google Cloud Generative AI** | Google GenAI SDK | `google-genai>=0.1.1` | Vertex AI & Gemini multimodal API integration |
| **Image Security Guard** | Pillow (PIL) | `>=10.4.0,<11.1.0` | Image verification, dimension clamping, EXIF removal |
| **Storage & Persistence** | Browser `localStorage` | HTML5 Standard | Client-side isolation for favorites and analysis logs |
| **Testing** | Pytest / Node.js | `pytest>=8.3.3`, Node test runners | 74 automated backend tests, 9 frontend integration scripts |

---

## 📁 Repository Structure

```text
Food-verse-ai/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env.example
│   ├── app/
│   │   ├── ai/                      # AI providers (Food-101, Gemini, Vertex AI, Ollama, factory)
│   │   ├── api/                     # REST API routes (/api/food, /api/health, /api/v1/...)
│   │   ├── core/                    # App config (config.py), security, logging, errors
│   │   ├── schemas/                 # Pydantic v2 validation models
│   │   ├── services/                # Food analysis, pantry matcher, nutrition calculation
│   │   └── utils/                   # Image guard, sanitation, file management
│   └── tests/                       # Pytest test suite (74 tests) + verification scripts
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── components/              # Navbar, modals, layout elements
    │   ├── context/                 # Application state
    │   ├── services/                # Backend API client (api.js)
    │   ├── utils/                   # Storage helpers, report generation
    │   └── views/                   # Application pages (FoodAnalyzer, CookWithIngredients, etc.)
    └── tests/                       # Node.js integration verification scripts
```

---

## 🚀 Local Setup Instructions (Windows)

### Prerequisites
- **Python 3.11+** installed and added to `PATH` (verified on Python 3.13)
- **Node.js 18+** and **npm** installed
- **Git**
- Internet access for installing dependencies and downloading pretrained model weights on initial launch

Run the backend and frontend in separate PowerShell terminal windows.

### 1. Backend Setup & Startup

From the project root directory:

```powershell
# Navigate into backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install pinned dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> [!NOTE]
> If PowerShell script execution policy prevents activating the virtual environment, invoke commands directly with `.\venv\Scripts\python.exe`.

Start the FastAPI backend server:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **API Base URL:** `http://127.0.0.1:8000`
- **Health Check:** `http://127.0.0.1:8000/api/health`
- **Interactive OpenAPI Documentation:** `http://127.0.0.1:8000/docs`

#### AI Provider Configuration (Optional)
By default, the backend runs completely offline using the free local Food-101 model (`AI_PROVIDER=food101`). To use Google Cloud Vertex AI or Google AI Studio Gemini:
1. Copy `backend/.env.example` to `backend/.env`.
2. For Vertex AI: Set `AI_PROVIDER=vertexai`, `GCP_PROJECT_ID=your_project_id`, and authenticate via `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS`.
3. For Gemini API: Set `AI_PROVIDER=gemini` and set `GEMINI_API_KEY=your_key`.

### 2. Frontend Setup & Startup

Open a second PowerShell terminal from the project root directory:

```powershell
# Navigate into frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at the local Vite URL (default: `http://localhost:5173`).

---

## 🧪 Verified Test Commands

All test suites and verification scripts documented below have been executed and verified.

### Backend Tests (Pytest)
Run the automated test suite from the `backend/` directory:

```powershell
cd backend
.\venv\Scripts\pytest.exe -v
```

**Results: 74 passed in ~17 seconds.**

**Coverage breakdown:**
- `tests/test_cook_with_ingredients.py`: Ingredient canonicalization, Hindi/English synonym resolution, vegan/vegetarian filters, time limits, ranking, and availability regression prevention.
- `tests/test_ai_provider.py`: Food-101 model loading, classification output, image MIME/corruption validation, API endpoint contracts.
- `tests/test_recipe_assistant.py`: Recipe scaling, allergen audits, ingredient validation.
- `tests/test_nutrition_service.py`: Ingredient parsing, USDA benchmark matching, fallback handling.
- `tests/test_image_guard.py`: EXIF data stripping, dimension clamping, file integrity.
- `tests/test_logging_security.py`: Sensitive data scrubbing (API keys, authorization headers, passwords).
- `tests/test_unconfigured_services.py`: Verification that unconfigured P2 stubs return explicit HTTP 501 responses.
- `tests/test_health.py` & `tests/test_temp_files.py`: Root health contract and file lifecycle safety.

### End-to-End Pipeline Verification Script
Run the automated multi-stage pipeline verification script (tests image upload → classification → dish correction → recipe generation → USDA nutrition calculation):

```powershell
cd backend
.\venv\Scripts\python.exe tests/verify_pav_bhaji_flow.py
```

### Frontend Verification Scripts
Run the frontend integration scripts from the `frontend/` directory (requires backend running on `http://127.0.0.1:8000`):

```powershell
cd frontend

# API health check verification
npm test

# "Cook With Ingredients You Have" end-to-end matching & regression verification
node tests/verify-cook-with-ingredients-flow.mjs

# Favorite recipes persistence and storage isolation verification
node tests/verify-favorite-recipes-flow.mjs

# Dish confirmation and recipe contract verification
node tests/verify-pav-bhaji-frontend-flow.mjs

# Interactive ingredients checklist progress tracking verification
node tests/verify-ingredients-checklist-flow.mjs

# Analysis search history filter verification
node tests/verify-search-history-flow.mjs

# History clear confirmation modal verification
node tests/verify-clear-history-flow.mjs

# Downloadable text report verification
node tests/verify-download-report-flow.mjs
```

### Production Build Validation
Confirm that the client bundle compiles cleanly for production:

```powershell
cd frontend
npm run build
```

---

## ⚠️ Known Limitations & Boundaries

1. **Food-101 Classifier Scope:**
   - The classifier is strictly bounded to 101 predefined categories. Non-Western and regional dishes (e.g., Momos, Pav Bhaji, Biryani, Dosa) may be assigned visual nearest neighbors (e.g., dumplings, ramen, crepes).
   - Use the dish confirmation workflow to select the intended dish when misclassified.
2. **Nutritional Estimates:**
   - Values are calculated per standard serving using USDA baseline data and estimated ingredient weights. Cooking oil absorption, specific brands, and cooking technique variances can alter real-world nutrition.
3. **Pantry Recipe Matching:**
   - Matches against the curated recipe catalogue. Completely novel or highly obscure combinations will return friendly no-match guidance rather than hallucinating cooking steps.
4. **Unconfigured P2 Modules (Freshness & Hygiene):**
   - The backend routes `/api/v1/optional/freshness` and `/api/v1/optional/hygiene` are architectural stubs scheduled for future releases. They return HTTP 501 `ServiceNotConfiguredError` and are not operational features. The UI reflects this with informative status banners.
5. **No Medical or Safety Assessment:**
   - Visual inspection cannot detect biological contamination, spoilage toxins, allergens, or foodborne illness risks.

---

## 🔒 Security Best Practices

- Do not commit `.env` files, API keys, passwords, or personal credentials.
- Virtual environments (`venv/`), `node_modules/`, cache directories (`.pytest_cache/`, `__pycache__/`), and build outputs (`dist/`) are strictly excluded via `.gitignore`.
- Image uploads are validated, sanitized, and stripped of metadata in memory before processing.

---

## 🗺️ Roadmap

Potential future improvements:
- Expand recognition coverage for Indian and regional cuisines beyond the 101 base categories.
- Integrate active produce freshness and kitchen hygiene computer vision models.
- Support barcode scanning and custom pantry inventory tracking.
- Add user account synchronization across devices.

---

## 📄 License

No license is currently specified for this repository. Until a license is added, permissions for reuse, redistribution, or modification are reserved.

---

## 🔗 Repository

<https://github.com/SuhaniSingh3/Food-verse-ai>
