# Food Verse AI 🍳

**Multi-Modal Culinary & Nutritional Intelligence Platform**  
*Internship Completion Project for the NASSCOM FutureSkills Generative AI with Google Cloud Program.*

---

## 📌 Project Overview

**Food Verse AI** is an intelligent full-stack application designed to transform food perception, personalized nutrition, and kitchen waste management. Built using Google Cloud-compatible generative vision and language AI alongside deterministic nutritional databases, Food Verse AI provides:

- **Food Image Recognition & Ingredient Decomposition (Core - P0):** Identifies items and calculates portion sizes from plate photos.
- **Smart Cooking Assistant (Core - P0):** Suggests practical recipes utilizing currently available pantry ingredients to eliminate food waste.
- **Personalized Nutrition Planner (Core - P0):** Real-time daily calorie and macro tracking calibrated against USDA reference benchmarks.
- **Central Dashboard & Meal History (Core - P1):** Responsive timeline of nutritional intake with interactive diagnostic telemetry.
- **Produce Freshness & Spoilage Inspector (Optional - P2):** Visual detection of produce freshness and estimated shelf-life.
- **Kitchen Hygiene & Cleanliness Screener (Optional - P2):** Rapid sanitation checklist audit for prep areas.

---

## 📁 Repository Structure

```
Food Verse AI/
├── .gitignore                   # Excludes .env, virtualenvs, node_modules, sqlite
├── README.md                    # Project overview & running instructions
│
├── docs/                        # Architecture & engineering specifications
│   ├── PROJECT_PLAN.md          # Scope, phases, risk matrix, GCP vs AWS analysis
│   ├── ARCHITECTURE.md          # System diagrams, component specs, database ERD
│   ├── FEATURES.md              # Functional specifications & acceptance criteria
│   └── DEVELOPMENT_CHECKLIST.md # Phased implementation checklist & verification gates
│
├── backend/                     # Python & FastAPI Service
│   ├── requirements.txt         # Pinned production & development dependencies
│   ├── .env.example             # Environment template
│   ├── .env                     # Local configuration (Git-ignored)
│   ├── app/
│   │   ├── main.py              # FastAPI application & CORS security
│   │   ├── core/config.py       # Pydantic Settings & environment loader
│   │   └── api/health.py        # /api/health endpoint
│   └── tests/                   # Pytest test suite
│       └── test_health.py       # Health check integration tests
│
└── frontend/                    # React 19 SPA (Vite)
    ├── package.json             # NPM dependencies
    ├── .env.example             # Frontend environment template
    ├── .env                     # Local Vite environment config
    ├── src/
    │   ├── main.jsx             # React entrypoint
    │   ├── App.jsx              # Navigation shell, dashboard & health telemetry
    │   ├── index.css            # Custom Vanilla CSS Design System (no Tailwind)
    │   └── services/api.js      # Reusable API client with error handling
    └── index.html               # Semantic HTML5 entry
```

---

## ⚙️ Prerequisites

- **Python:** 3.11 or newer (Python 3.13 supported)
- **Node.js:** v18 or newer (v24 supported)
- **npm:** v9 or newer (v11 supported)
- **Git:** 2.x

---

## 🚀 Quickstart Guide (Windows PowerShell)

Open two separate Windows PowerShell windows (one for Backend, one for Frontend):

### Terminal 1: Backend Service (FastAPI)

```powershell
# Navigate to the backend directory
cd "c:\Users\ASUS\Desktop\Food Verse AI\backend"

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# (Optional - if dependencies are not yet installed)
pip install -r requirements.txt

# Start the FastAPI development server with hot-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **API Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)  
> **Interactive Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Terminal 2: Frontend Service (React + Vite)

> **Note on Windows Execution Policy:** If your system blocks `.ps1` script execution, use `npm.cmd` instead of `npm`.

```powershell
# Navigate to the frontend directory
cd "c:\Users\ASUS\Desktop\Food Verse AI\frontend"

# (Optional - if dependencies are not yet installed)
npm.cmd install

# Start the Vite development server
npm.cmd run dev
```

> **Web Application:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests

Run backend tests using `pytest` inside the virtual environment:

```powershell
cd "c:\Users\ASUS\Desktop\Food Verse AI\backend"
.\venv\Scripts\python.exe -m pytest tests -v
```

---

## 🔒 Security & Guardrails

- **Zero Client-Side Keys:** Google Cloud API keys are strictly configured on the backend via environment variables (`.env`) and never exposed to the browser.
- **CORS Protection:** By default in development, only requests from `http://localhost:5173` and `http://127.0.0.1:5173` are accepted. In production, wildcard `*` origins are blocked.
- **Media Sanitization:** Pillow verifies image magic bytes and strips EXIF metadata before processing.

---

## ☁️ Deployment Architecture & Unresolved Decision

- **Program Charter:** NASSCOM FutureSkills Generative AI with Google Cloud.
- **Primary Deployment:** Google Cloud Run (containerized serverless) + Google GenAI / Vertex AI.
- **Unresolved AWS CLI Reference:** The original project brief mentions AWS CLI. To resolve this without blocking progress, the application adheres to 12-Factor principles and OCI Docker containerization, allowing seamless execution on either Google Cloud Run or AWS App Runner / ECS with zero code modifications. Full details are recorded in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).
