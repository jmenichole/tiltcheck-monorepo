import http from 'http';
import { app } from '../src/index.js';
import { upsertUser, createSession } from '../src/db.js';

async function run() {
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}`;

  // Ensure route accessibility before any review-close call
  const unauthResp = await fetch(base + '/api/admin/multisig/propose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  if (unauthResp.status !== 401 && unauthResp.status !== 403) {
    console.error('Expected unauthenticated/forbidden for propose without session. Got', unauthResp.status);
    process.exit(1);
  }

  // Create operator user & session
  const operatorId = 'test-operator-wallet';
  upsertUser({ discord_id: operatorId, wallet_address: operatorId, tier: 'operator' });
  const session = createSession(operatorId, undefined, '127.0.0.1');

  // Attempt propose with missing required fields (should 400 not 404)
  const proposeResp = await fetch(base + '/api/admin/multisig/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': `tc_session=${session.id}` },
    body: JSON.stringify({ actionType: 'config.rotate', payload: {}, requiredSigners: ['a','b'], signature: 'placeholder', nonce: 'placeholder' })
  });
  const proposeJson = await proposeResp.json().catch(() => ({}));
  if (proposeResp.status === 401) {
    console.error('Signature enforcement blocked test (set ENFORCE_ACTION_SIGNATURES=0 for this script).');
    process.exit(1);
  }
  if (![200,400].includes(proposeResp.status)) {
    console.error('Unexpected status for propose accessibility', proposeResp.status, proposeJson);
    process.exit(1);
  }

  console.log('[AdminRouteTest] Multi-sig routes accessible pre review-close. Statuses:', { unauth: unauthResp.status, propose: proposeResp.status });
  server.close();
}

run().catch(e => { console.error(e); process.exit(1); });
