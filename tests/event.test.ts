import assert from 'assert';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function run() {
  // This test assumes you created a site and have an API key
  console.log('Event Test: Ensure API up and /api/event responds');

  // Try to create a site
  const createResp = await fetch(`${API_BASE}/api/site/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test-site' })
  });
  const createData = await createResp.json();
  assert(createResp.ok && createData.site_id && createData.api_key, 'Site creation failed');

  // Send an event
  const resp = await fetch(`${API_BASE}/api/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': createData.api_key },
    body: JSON.stringify({ event_type: 'pageview', path: '/test', user_id: 'user-1' })
  });
  const data = await resp.json();
  assert(resp.ok && data.success, 'Ingestion failed');

  console.log('Event test passed');
}

run().catch(err => { console.error(err); process.exit(1); });
