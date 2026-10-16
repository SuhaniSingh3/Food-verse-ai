/**
 * Food Verse AI — Frontend-to-Backend Health Integration Test
 * Verifies that the client environment can reach FastAPI /api/health,
 * receive a 200 OK status, and validate the health response schema.
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function verifyBackendHealth() {
  const targetUrl = `${API_BASE_URL}/api/health`;
  console.log(`[TEST] Pinging backend health endpoint at: ${targetUrl}`);

  const startTime = Date.now();
  let response;

  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    console.error(`[FAIL] Connection refused or network error connecting to ${targetUrl}:`, err.message);
    console.error('[HINT] Ensure the backend is running via: cd backend; .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000');
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;

  if (response.status !== 200) {
    console.error(`[FAIL] Expected HTTP 200, received HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error('[FAIL] Response could not be parsed as JSON:', err.message);
    process.exit(1);
  }

  console.log('[INFO] Received Health Response payload:');
  console.log(JSON.stringify(data, null, 2));

  // Assert schema properties
  const requiredKeys = ['status', 'service', 'version', 'environment', 'ai_provider', 'timestamp'];
  const missingKeys = requiredKeys.filter((k) => !(k in data));

  if (missingKeys.length > 0) {
    console.error(`[FAIL] Health payload is missing required keys: ${missingKeys.join(', ')}`);
    process.exit(1);
  }

  if (data.status !== 'healthy') {
    console.error(`[FAIL] Expected status 'healthy', got '${data.status}'`);
    process.exit(1);
  }

  console.log(`[PASS] Health check verified in ${durationMs}ms. Status is healthy!`);
  process.exit(0);
}

verifyBackendHealth();
