// The apps registry Pour reads merges pour-apps with the dashboard's apps, so an app that
// registers (and is switched on) is `pour install --cask <app>` without touching pour-apps.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = { meta: { name: 'pour-apps' }, formulae: [], casks: [{ token: 'peek', name: ['Peek'], version: '2.0.13', url: 'u' }] };
globalThis.fetch = async (u) => {
  if (String(u).includes('pour-apps-13-Oct-2026')) return new Response(JSON.stringify(base), { status: 200 });
  return new Response('not here', { status: 404 });
};
const { appsIndex, dashboardCask, default: worker } = await import('../src/worker.js');
const SITE = { fetch: async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/api/v1/apps') return Response.json({ ok: true, apps: [{ id: 'peek', name: 'Peek', status: 'on' }, { id: 'hone', name: 'Hone', line: 'AI mastering', latest_version: '1.2.0', status: 'on' }] });
  if (url.pathname === '/api/v1/apps/register') return Response.json({ ok: true, added: true, status: 'pending' }, { status: 201 });
  return new Response('nope', { status: 404 });
} };

test('a dashboard app joins the casks with a live feed', async () => {
  const idx = await appsIndex({ SITE, SITE_HOST: 'ipconfig.co.network' });
  const tokens = idx.casks.map((c) => c.token);
  assert.deepEqual(tokens, ['peek', 'hone']);
  const hone = idx.casks[1];
  assert.equal(hone.pour.livecheck, 'https://ipconfig.co.network/updates/hone/latest.json');
  assert.equal(hone.version, '1.2.0');
  assert.deepEqual(hone.artifacts, [{ app: ['Hone.app'] }]);
  assert.equal(idx.meta.from_dashboard, 1);
});

test('a feed URL given as the download is used as is', () => {
  const c = dashboardCask({ id: 'deft', name: 'Deft', download_url: 'https://x.example/deft/latest.json' });
  assert.equal(c.pour.livecheck, 'https://x.example/deft/latest.json');
  assert.equal(c.homepage, 'https://ipconfig.co.network/deft');
});

test('/pour/apps/index.json and /pour/api/apps answer from the merged list; register forwards to the dashboard', async () => {
  const env = { SITE, SITE_HOST: 'ipconfig.co.network' };
  let r = await worker.fetch(new Request('https://ipconfig.co.network/pour/apps/index.json'), env, {});
  assert.equal(r.status, 200); assert.ok((await r.json()).casks.some((c) => c.token === 'hone'));
  r = await worker.fetch(new Request('https://ipconfig.co.network/pour/api/apps'), env, {});
  const j = await r.json(); assert.equal(j.apps.find((a) => a.token === 'hone').install, 'pour install --cask hone');
  r = await worker.fetch(new Request('https://ipconfig.co.network/pour/api/apps/register', { method: 'POST', body: '{"app":"newapp"}' }), env, {});
  assert.equal(r.status, 201);
});
