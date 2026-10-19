# Food Verse AI 🍽️

**Food image classification, recipe assistance, and nutrition estimates
in one web application.**

Food Verse AI is a full-stack project built with a React frontend and
FastAPI backend. Users can upload food images, review predictions from a
pretrained Food-101 classifier, and explore recipe and nutrition
information available in the application.

> **Project status:** The classifier is a general-purpose 101-category
> food model and may misclassify regional dishes, including Indian
> foods. Recipes and nutrition information depend on the data available
> in the app and should be treated as estimates where indicated. The
> application does not determine food freshness, spoilage, allergens, or
> food safety.

## Features

-   **Food image classification:** Upload an image and view the top
    food-category predictions.
-   **Confidence scores:** Review prediction scores to understand the
    model's uncertainty.
-   **Recipe assistance:** View recipe information available in the
    application's recipe catalogue and workflow.
-   **Nutrition information:** View available nutrition estimates;
    values may vary with ingredients and serving sizes.
-   **Food-name correction:** Where available, confirm or correct a
    model prediction before using it in recipe or nutrition views.
-   **Analysis history:** Review previous analyses and clear history.
-   **Recipe utilities:** Favorites and an interactive ingredients
    checklist, where available in the current build.
-   **Convenience tools:** Search history and download analysis reports,
    where available in the current build.

Features can vary with the checked-out code and configuration. Do not
interpret planned enhancements as implemented capabilities.

## Technology stack

-   **Frontend:** React, Vite, JavaScript
-   **Backend:** Python, FastAPI
-   **Image classification:** Hugging Face Transformers
-   **Classifier:** `rajkr/mobilenet-v2-food101` (Food-101, 101
    categories)
-   **Local application data:** Recipe catalogue and browser-side
    state/storage where implemented

## Repository structure

``` text
Food-verse-ai/
├── .gitignore
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── ai/                 # AI providers, classifier and recipe helpers
│   │   ├── api/                # API routes
│   │   ├── core/               # Configuration
│   │   ├── schemas/             # Request and response schemas
│   │   └── services/            # Food analysis and nutrition services
│   └── tests/                  # Backend tests and verification scripts
└── frontend/
    ├── package.json
    ├── src/
    │   ├── components/         # Shared UI components
    │   ├── context/            # Application state
    │   ├── services/           # API client
    │   ├── utils/              # Utility functions
    │   └── views/              # Application pages
    └── tests/                  # Frontend verification scripts
```

## Prerequisites

-   Python compatible with the packages pinned in
    `backend/requirements.txt` (Python 3.11 is a reasonable starting
    point)
-   Node.js and npm compatible with `frontend/package.json`
-   Git
-   Internet access for installing dependencies and downloading the
    model on first use

The pretrained model and machine-learning dependencies can take
substantial disk space and may require a compatible machine. The local
Food-101 classifier does not inherently require a paid API.

## Run locally on Windows

Run the backend and frontend in separate terminals from the project
root.

### 1. Clone the repository

``` powershell
git clone https://github.com/SuhaniSingh3/Food-verse-ai.git
cd Food-verse-ai
```

### 2. Set up the backend

``` powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, you can invoke the environment's Python
directly:

``` powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

If the repository contains `backend/.env.example`, use it as a reference
for local configuration and create `backend/.env` only if required. Do
not copy real credentials into the repository.

Start the backend from the `backend` directory:

``` powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If your local configuration uses a different entry point or port, follow
the actual application configuration.

If enabled by the backend, API endpoints are commonly available at:

-   Health check: `http://127.0.0.1:8000/api/health`
-   Interactive API docs: `http://127.0.0.1:8000/docs`

### 3. Set up the frontend

Open a second terminal at the project root:

``` powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (commonly `http://localhost:5173`).

If PowerShell script execution blocks `npm`, try `npm.cmd install` and
`npm.cmd run dev`.

### 4. Troubleshooting

-   **Frontend cannot reach backend:** Check that both servers are
    running and verify the API base URL in
    `frontend/src/services/api.js` and the backend CORS configuration.
-   **Model loads slowly:** The first run may download model files.
    Allow time and disk space for this download.
-   **Unexpected food prediction:** Food-101 only covers its trained
    categories; try another image and use the app's correction control
    if available.
-   **Recipe or nutrition details are missing:** The app can only
    display details supported by its current catalogue and data flow.

## Testing

The repository contains backend tests and frontend verification scripts.
Run the backend tests from the `backend` directory after installing the
development dependencies:

``` powershell
python -m pytest tests -v
```

Some frontend verification files are standalone scripts rather than a
configured test-runner suite. Check `frontend/package.json` before
assuming a standard `npm test` command is available.

Only report a test as passing after actually running it.

## Limitations and responsible use

-   The model predicts among 101 food categories and may label a food
    with a visually similar but incorrect category.
-   Confidence scores are model outputs, not guarantees of correctness.
-   Many Indian and regional dishes may not be represented adequately in
    Food-101.
-   Ingredients inferred from an image may be wrong or incomplete.
-   Nutrition values are approximate and depend on recipe, preparation
    method, portion size, and available data.
-   A photograph cannot establish microbial safety, spoilage, allergens,
    internal temperature, or safe storage.
-   Do not use the application as a substitute for professional medical,
    dietary, or food-safety advice.

## Security

-   Never commit `.env` files, API keys, passwords, or personal data.
-   Keep virtual environments, `node_modules`, model weights, caches,
    and local uploads out of Git.
-   Review `.gitignore` before each upload.
-   If a secret is accidentally committed, rotate or revoke it; deleting
    it in a later commit does not remove it from Git history.

## Roadmap

Potential future improvements, not claims of current functionality:

-   Improve recognition of Indian and regional foods.
-   Expand and validate recipe and nutrition data.
-   Add additional automated end-to-end tests.
-   Improve user feedback and model uncertainty handling.

## License

No license is specified in this repository. Until a license is added,
others do not automatically receive permission to reuse, distribute, or
modify this code.

## Repository

<https://github.com/SuhaniSingh3/Food-verse-ai>
