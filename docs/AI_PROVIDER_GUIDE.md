# AI Provider Integration Guide — Food Verse AI

## 1. Architecture Overview

Food Verse AI incorporates a decoupled provider abstraction layer designed to satisfy the strict requirements of the **NASSCOM FutureSkills Generative AI with Google Cloud** program.

```
                           +------------------------+
                           |  POST /api/food/analyze|
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                           |   FoodAnalysisService  |
                           +-----------+------------+
                                       |
                                       v
                           +------------------------+
                           |    Provider Factory    |
                           +-----------+------------+
                                       | (Strict AI_PROVIDER env switch)
         +-----------------------------+-----------------------------+
         |                             |                             |
         v                             v                             v
+------------------+         +--------------------+         +------------------+
| VertexAIGemini   |         | GeminiDeveloper    |         | MockVisionAI     |
| Provider         |         | Provider           |         | Provider         |
| (Google Cloud)   |         | (Google AI Studio) |         | (Deterministic)  |
+------------------+         +--------------------+         +------------------+
         |                             |                             |
         v                             v                             v
+------------------+         +--------------------+         +------------------+
| google-genai     |         | google-genai       |         | Offline Schema   |
| (vertexai=True)  |         | (api_key=...)      |         | Simulation       |
+------------------+         +--------------------+         +------------------+
```

### Strict Provider Guarantees
- **No Silent Fallback**: If an AI provider is requested in `AI_PROVIDER` but required credentials or project IDs are missing, the system raises an explicit `ServiceNotConfiguredError` (HTTP 501) with actionable instructions. It never silently switches between providers.
- **Zero Credential Exposure**: API keys, Bearer tokens, and service account keys are never logged (automated scrubbing via `SensitiveDataFilter`), never returned in API payloads, and never exposed to the frontend.
- **Physical vs. Inferred Separation**: The model prompt and Pydantic schema strictly delineate direct physical observations (`is_directly_visible=True`) from culinary inferences/guesses (`is_directly_visible=False`).

---

## 2. Choosing an AI Provider

The active provider is determined exclusively by the `AI_PROVIDER` environment variable in `backend/.env`:

| Provider Option | Value of `AI_PROVIDER` | Best Used For | Authentication Mechanism |
| :--- | :--- | :--- | :--- |
| **Google Cloud Vertex AI** *(Preferred)* | `vertexai` | Internship evaluation, enterprise GCP environments, production deployments | Application Default Credentials (ADC) or Service Account JSON |
| **Gemini Developer API** *(Permitted)* | `gemini` | Rapid local prototyping, developer experiments via Google AI Studio | API Key (`GEMINI_API_KEY`) |
| **Deterministic Mock** | `mock` | Automated CI/CD test runs, offline UI development | None required (deterministic payload) |

---

## 3. Provider Setup & Local Development Authentication

### Option A: Google Cloud Vertex AI (Internship Preferred)

Google Cloud Vertex AI integrates directly with your Google Cloud Project and enterprise IAM.

#### Prerequisites:
1. Google Cloud Project with billing enabled.
2. The **Vertex AI API** (`aiplatform.googleapis.com`) enabled:
   ```powershell
   gcloud services enable aiplatform.googleapis.com
   ```
3. Your Google Cloud account or service account granted the role:
   - `roles/aiplatform.user` (Vertex AI User)

#### Local Development Authentication Method 1: Application Default Credentials (ADC) — Recommended
If you have the Google Cloud CLI (`gcloud`) installed on your workstation:
1. Authenticate your local development environment:
   ```powershell
   gcloud auth application-default login
   ```
2. Set your default project:
   ```powershell
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
3. In `backend/.env`, configure:
   ```env
   AI_PROVIDER=vertexai
   GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
   GCP_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=""
   GEMINI_MODEL=gemini-1.5-flash
   ```

#### Local Development Authentication Method 2: Service Account Key JSON
If using a dedicated service account:
1. In the Google Cloud Console, navigate to **IAM & Admin > Service Accounts**.
2. Create a service account (e.g. `food-verse-backend@YOUR_PROJECT.iam.gserviceaccount.com`).
3. Grant the `Vertex AI User` role.
4. Create a JSON key and download it to a secure location outside your git directory (e.g., `C:\Users\ASUS\keys\food-verse-gcp-key.json`).
5. In `backend/.env`, configure:
   ```env
   AI_PROVIDER=vertexai
   GCP_PROJECT_ID=YOUR_GCP_PROJECT_ID
   GCP_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=C:\Users\ASUS\keys\food-verse-gcp-key.json
   GEMINI_MODEL=gemini-1.5-flash
   ```

---

### Option B: Google AI Studio Gemini Developer API (Permitted Alternative)

If your internship permits using the Gemini Developer API directly:
1. Go to [Google AI Studio](https://aistudio.google.com/) and generate an API key.
2. In `backend/.env`, configure:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

---

### Option C: Deterministic Mock Provider (Testing & CI/CD)

Requires zero credentials. Simulates full multimodal analysis, including visible item separation, preparation techniques, uncertainties, dynamic question answering, and portion estimates.
1. In `backend/.env`, configure:
   ```env
   AI_PROVIDER=mock
   ```

---

## 4. Ethical AI & Scientific Guardrails

In compliance with project specifications, the multimodal prompt and Pydantic validation schema enforce four strict non-negotiable guardrails:

1. **Direct Observations vs. Culinary Guesses**:
   - `visible_ingredients`: Only items clearly visible in the image.
   - `potential_ingredients_or_guesses`: Seasonings, cooking oils, fillings, or broths inferred by culinary convention.
2. **No Certainty on Hidden Allergens**:
   - Visual imagery cannot detect whether a sauce contains dairy solids, peanut traces, gluten, or soy. These are surfaced under `visual_uncertainties_and_ambiguities`.
3. **No Certainty on Food Safety or Microbial Quality**:
   - Internal core temperature and bacterial pathogens cannot be evaluated visually.
4. **Visual Portion Approximation Only**:
   - 2D depth and internal density cannot be measured with clinical accuracy; macro calculations are educational estimates relative to USDA reference data.

---

## 5. Manual Live Integration Verification Procedure

Follow these step-by-step instructions when you are ready to test against a live Google AI provider using real credentials:

### Step 1: Configure Credentials in `backend/.env`
Open `backend/.env` in your editor and choose either Vertex AI or Gemini Developer API:

**For Vertex AI:**
```env
AI_PROVIDER=vertexai
GCP_PROJECT_ID=your-actual-gcp-project-id
GCP_LOCATION=us-central1
GEMINI_MODEL=gemini-1.5-flash
```
*(Ensure `gcloud auth application-default login` has been executed).*

**For Gemini Developer API:**
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyYourActualKeyGoesHere
GEMINI_MODEL=gemini-1.5-flash
```

### Step 2: Start the Backend Server
In Windows PowerShell:
```powershell
cd "c:\Users\ASUS\Desktop\Food Verse AI\backend"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Verify the startup log outputs:
```
Starting Food Verse AI API v1.0.0 in [development] mode (AI Provider: vertexai)
```

### Step 3: Dispatch a Live Image Analysis Request
Run this test script in a separate PowerShell window to send a live photo:
```powershell
cd "c:\Users\ASUS\Desktop\Food Verse AI\backend"
@"
import urllib.request
import io
from PIL import Image

# Create a sample test image
buf = io.BytesIO()
Image.new('RGB', (200, 200), color='salmon').save(buf, format='JPEG')
img_bytes = buf.getvalue()

boundary = '----WebKitFormBoundaryFoodVerseTest'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="salmon_dish.jpg"\r\n'
    f'Content-Type: image/jpeg\r\n\r\n'
).encode('utf-8') + img_bytes + (
    f'\r\n--{boundary}\r\n'
    f'Content-Disposition: form-data; name="question"\r\n\r\n'
    f'Are there visible dairy garnishes?\r\n'
    f'--{boundary}--\r\n'
).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/food/analyze',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

with urllib.request.urlopen(req) as resp:
    print('HTTP Status:', resp.status)
    print('Live Model Response:\n', resp.read().decode('utf-8'))
"@ | .\venv\Scripts\python.exe
```

### Step 4: Verify Structured Output
Confirm that the returned JSON payload includes:
1. `dish_name`
2. `confidence_assessment`
3. `apparent_preparation_method`
4. `visible_ingredients`
5. `potential_ingredients_or_guesses`
6. `visual_uncertainties_and_ambiguities`
7. `provider_metadata` showing your configured provider and latency.

### Step 5: Post-Test Cleanup
Once your manual verification test is complete:
1. If you added an API key or project ID to `backend/.env`, verify that `git status` shows `.env` is ignored.
2. Run `git status` to ensure no keys or temporary files are staged.
