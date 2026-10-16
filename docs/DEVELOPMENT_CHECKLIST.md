# Food Verse AI — Development Checklist & Verification Matrix

**Program:** NASSCOM FutureSkills Generative AI with Google Cloud  
**Document Version:** 1.0.0  
**Status:** Active Tracking  

This checklist serves as the authoritative, step-by-step implementation guide. No phase is marked complete until all associated verification gates pass.

---

## Phase 0: Workspace Setup, Version Control & Planning
- [x] **TASK-0.1:** Inspect workspace and confirm runtime environments (Python 3.13, Node 24, npm 11, Git).
- [ ] **TASK-0.2:** Initialize Git repository and configure `.gitignore` (ignoring `.env`, `__pycache__`, `node_modules`, `dist`, `.pytest_cache`, `*.sqlite3`).
- [x] **TASK-0.3:** Create `docs/PROJECT_PLAN.md` covering scope, milestones, and the GCP vs AWS CLI discrepancy.
- [x] **TASK-0.4:** Create `docs/ARCHITECTURE.md` with system diagrams, database ERD, and component specs.
- [x] **TASK-0.5:** Create `docs/FEATURES.md` classifying Core (P0/P1) vs Optional (P2) capabilities.
- [x] **TASK-0.6:** Create `docs/DEVELOPMENT_CHECKLIST.md` (this document).
- [ ] **TASK-0.7:** Set up environment configuration templates (`backend/.env.example`, `frontend/.env.example`).

*Verification Gate 0:* Documentation fully reviewed; Git tracking active; environment templates present.

---

## Phase 1: Backend Architecture & Database Foundation
- [ ] **TASK-1.1:** Scaffold backend directory structure (`backend/app/{core,api,models,schemas,services,ai_providers,db}`).
- [ ] **TASK-1.2:** Configure `requirements.txt` with verified, pinned dependencies (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `sqlalchemy`, `pillow`, `google-genai`, `pytest`, `httpx`).
- [ ] **TASK-1.3:** Implement application settings manager in `app/core/config.py` using `pydantic-settings` (loading API keys, environment, CORS origins).
- [ ] **TASK-1.4:** Configure database engine (`app/db/session.py`) with SQLite (WAL mode) and async session support.
- [ ] **TASK-1.5:** Define SQLAlchemy models in `app/models/`:
  - [ ] `User` and `UserPreference`
  - [ ] `MealLog` and `MealItem`
  - [ ] `SavedRecipe`
  - [ ] `FreshnessReport` and `HygieneAudit`
- [ ] **TASK-1.6:** Implement database migration initialization (Alembic or schema bootstrap).
- [ ] **TASK-1.7:** Create global exception handlers and standardized JSON error response middleware (`app/core/errors.py`).
- [ ] **TASK-1.8:** Create health check endpoint (`GET /api/v1/health`) returning server status, database connectivity, and active AI provider name.

*Verification Gate 1:* `pytest tests/test_health.py` passes; database initializes tables successfully without runtime errors.

---

## Phase 2: AI Provider Abstraction & Vision Pipeline
- [ ] **TASK-2.1:** Implement `BaseAIProvider` abstract base class (`app/ai_providers/base.py`) with method signatures for:
  - `analyze_food_image()`
  - `generate_recipes()`
  - `analyze_freshness()`
  - `audit_hygiene()`
- [ ] **TASK-2.2:** Implement `MockAIProvider` (`app/ai_providers/mock_provider.py`) with realistic, deterministic fixture data for local/offline testing and CI.
- [ ] **TASK-2.3:** Implement `GoogleGeminiProvider` (`app/ai_providers/gemini_provider.py`) using the official Google GenAI / Vertex AI client with Gemini 1.5 Flash / Pro models.
- [ ] **TASK-2.4:** Build AI provider factory (`app/ai_providers/factory.py`) dynamically instantiating provider based on `AI_PROVIDER` setting (`gemini` or `mock`).
- [ ] **TASK-2.5:** Create image validation and sanitization utility (`app/services/image_guard.py`):
  - [ ] Validate MIME type (`image/jpeg`, `image/png`, `image/webp`).
  - [ ] Check file size <= 10MB.
  - [ ] Strip EXIF data and resize dimensions > 2048px via Pillow.
- [ ] **TASK-2.6:** Write unit tests for provider abstraction and image guard in `tests/test_ai_providers.py`.

*Verification Gate 2:* `MockAIProvider` passes all contract tests; image guard successfully rejects corrupted files and strips EXIF metadata.

---

## Phase 3: Core Domain Services & API Endpoints
- [ ] **TASK-3.1:** Implement Nutrition Intelligence Engine (`app/services/nutrition_service.py`):
  - [ ] Seed benchmark database of common ingredients with reference macro/micronutrient densities (USDA-aligned).
  - [ ] Calculate calories, protein, carbs, and fats based on gram weight.
  - [ ] Formulate daily budget progress and contextual dietary tips.
- [ ] **TASK-3.2:** Implement Food Recognition Router (`app/api/v1/endpoints/vision.py`):
  - [ ] `POST /api/v1/vision/analyze`: Accepts image, runs vision model, calibrates nutrients, returns structured JSON.
- [ ] **TASK-3.3:** Implement Recipe Assistant Router (`app/api/v1/endpoints/recipes.py`):
  - [ ] `POST /api/v1/recipes/generate`: Takes ingredients & dietary filters, prompts AI provider, returns formatted recipes.
  - [ ] `POST /api/v1/recipes/save`: Persists a recipe to user profile.
  - [ ] `GET /api/v1/recipes`: Lists saved user recipes.
- [ ] **TASK-3.4:** Implement Nutrition & Meal History Router (`app/api/v1/endpoints/meals.py`):
  - [ ] `POST /api/v1/meals`: Logs meal entry with individual food items.
  - [ ] `GET /api/v1/meals`: Retrieves historical meal timeline with date filtering.
  - [ ] `DELETE /api/v1/meals/{meal_id}`: Deletes a meal entry and recalculates daily totals.
- [ ] **TASK-3.5:** Write integration tests in `tests/test_endpoints.py` testing all core endpoints using `httpx.AsyncClient`.

*Verification Gate 3:* All core API endpoints return valid HTTP 200/201 responses with valid Pydantic schemas; full test suite passes.

---

## Phase 4: Frontend Application & UI/UX Design System
- [ ] **TASK-4.1:** Initialize React SPA frontend using Vite (`npx.cmd -y create-vite@latest frontend --template react`).
- [ ] **TASK-4.2:** Build the Core Design System in `frontend/src/index.css`:
  - [ ] Define CSS custom property design tokens (colors, typography, shadows, border-radii, glassmorphism).
  - [ ] Implement responsive grid and flexbox utilities.
  - [ ] Establish micro-interactions, button hover states, and smooth transitions.
- [ ] **TASK-4.3:** Build shared UI components (`frontend/src/components/common/`):
  - [ ] `Navbar` / Header with active view indicator.
  - [ ] `ImageUploader` with drag-and-drop, camera snap, and file preview.
  - [ ] `Button`, `Badge`, `Card`, `Modal`, `AlertBanner`.
  - [ ] `LoadingSkeleton` and animated AI processing spinners.
- [ ] **TASK-4.4:** Build `DashboardView` (`frontend/src/views/DashboardView.jsx`):
  - [ ] Daily calorie and macro progress rings (Protein, Carbs, Fat).
  - [ ] Quick-action cards (Scan Food, Generate Recipe, View History).
  - [ ] Recent meals list with thumbnails and calorie counts.
- [ ] **TASK-4.5:** Build `VisionAnalysisView` (`frontend/src/views/VisionAnalysisView.jsx`):
  - [ ] Image upload canvas.
  - [ ] Recognition results card showing detected ingredients, confidence scores, and portion adjustment sliders.
  - [ ] "Add to Meal Log" and "Generate Recipe with These" action buttons.
- [ ] **TASK-4.6:** Build `RecipeAssistantView` (`frontend/src/views/RecipeAssistantView.jsx`):
  - [ ] Pantry ingredient tag input.
  - [ ] Filter chips: Prep time, dietary preference (Keto, Vegan, Halal, Gluten-Free).
  - [ ] Interactive recipe cards with step-by-step cooking modal.
- [ ] **TASK-4.7:** Build `NutritionPlannerView` (`frontend/src/views/NutritionPlannerView.jsx`):
  - [ ] Daily target configuration modal.
  - [ ] Historical meal timeline with date picker.
  - [ ] Meal item deletion and macro breakdown charts.
- [ ] **TASK-4.8:** Implement API Service Client (`frontend/src/services/api.js`) with error handling and fallback alerts.

*Verification Gate 4:* Responsive layout renders flawlessly on mobile (375px), tablet (768px), and desktop (1280px); zero console errors; smooth API interaction.

---

## Phase 5: Optional Modules (Freshness & Hygiene)
- [ ] **TASK-5.1:** Implement Freshness Analysis Backend Endpoint (`POST /api/v1/optional/freshness`):
  - [ ] Evaluate visual spoilage cues, shelf life estimation, and food storage advice.
- [ ] **TASK-5.2:** Implement Hygiene Audit Backend Endpoint (`POST /api/v1/optional/hygiene`):
  - [ ] Evaluate visual kitchen/dining cleanliness score (0-100) and risk factors.
- [ ] **TASK-5.3:** Build Frontend Views for Optional Features:
  - [ ] `FreshnessInspectorView.jsx` with freshness grading badge (A/B/C/D) and storage tips.
  - [ ] `HygieneAuditorView.jsx` with hygiene radar/scorecard and safety disclaimers.
- [ ] **TASK-5.4:** Implement configuration toggles (`ENABLE_OPTIONAL_MODULES=true`) to enable/disable these modules cleanly.

*Verification Gate 5:* Optional features operate without impacting core flows; disclaimers render prominently.

---

## Phase 6: Automated Testing & Security Verification
- [ ] **TASK-6.1:** Run comprehensive backend test suite (`pytest --cov=app tests/`):
  - [ ] Unit tests for nutrition calculator.
  - [ ] Unit tests for image validation guard.
  - [ ] Provider abstraction tests (Mock & Gemini integration contract).
  - [ ] Integration tests for all REST endpoints.
- [ ] **TASK-6.2:** Conduct security and privacy audit:
  - [ ] Verify no API keys are logged or returned to frontend.
  - [ ] Test upload of oversized files (>10MB) and non-image binaries to verify rejection.
  - [ ] Verify CORS headers allow only configured origins.
- [ ] **TASK-6.3:** Verify frontend error boundaries catch simulated network failures.

*Verification Gate 6:* 100% of test suite passes; zero security regressions or key leakages detected.

---

## Phase 7: Containerization & Deployment Documentation
- [ ] **TASK-7.1:** Create production multi-stage `backend/Dockerfile` with non-root user.
- [ ] **TASK-7.2:** Create production `frontend/Dockerfile` with Nginx reverse proxy.
- [ ] **TASK-7.3:** Create `docker-compose.yml` for unified one-command local orchestration.
- [ ] **TASK-7.4:** Author `docs/DEPLOYMENT_GUIDE.md`:
  - [ ] Step-by-step Google Cloud deployment guide (Google Cloud Run + Cloud SQL + Secret Manager).
  - [ ] Step-by-step AWS fallback deployment guide (AWS App Runner / ECS + RDS via AWS CLI) resolving the deployment discrepancy.
- [ ] **TASK-7.5:** Final project README (`README.md`) with architecture overview, quickstart instructions, and demo walkthrough.

*Verification Gate 7:* `docker-compose up` builds and starts both services cleanly; deployment guides verified.
