// Automatic registration: qualified apps and tools are listed at once, others get every reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualify, toCask, register, readFeed, probe, forgetRegistrations } from '../src/register.js';

const SHA = 'a'.repeat(64);
// a little web: pages, files, a feed
const web = {
  'https://example.com/tool': { status: 200, type: 'text/html' },
  'https://example.com/tool-linux.tar.gz': { status: 200, type: 'application/gzip', size: 3_000_000 },
  'https://example.com/tool-win.zip': { status: 200, type: 'application/zip', size: 2_000_000 },
  'https://example.com/oops.html': { status: 200, type: 'text/html' },
  'https://example.com/app/latest.json': { status: 200, type: 'application/json', body: JSON.stringify({ version: 'v1.4.0', platforms: { 'darwin-aarch64': { url: 'Fancy_aarch64.app.tar.gz', sha256: SHA }, 'windows-x86_64': { url: 'https://example.com/Fancy-setup.exe' } } }) },
  'https://example.com/app/Fancy_aarch64.app.tar.gz': { status: 200, type: 'application/gzip', size: 9_000_000 },
  'https://example.com/Fancy-setup.exe': { status: 200, type: 'application/octet-stream', size: 8_000_000 },
};
const fakeFetch = async (u, o = {}) => {
  const w = web[String(u)];
  if (!w) return new Response('missing', { status: 404 });
  const h = { 'content-type': w.type };
  if (w.size) h['content-length'] = String(w.size);
  return new Response(o.method === 'HEAD' ? null : w.body ?? 'x', { status: w.status, headers: h });
};
const free = async () => null;

test('a command-line tool with checksummed downloads qualifies', async () => {
  const q = await qualify({ kind: 'cli', token: 'tool', desc: 'Does one useful thing very fast', homepage: 'https://example.com/tool', version: '2.0.1', bin: ['tl'], platforms: { 'linux-x86_64': { url: 'https://example.com/tool-linux.tar.gz', sha256: SHA }, 'windows-x86_64': { url: 'https://example.com/tool-win.zip', sha256: SHA } } }, { fetch: fakeFetch, taken: free });
  assert.equal(q.ok, true, q.problems.join('; '));
  const c = toCask({ ...q.record }, 'jks-sys/pour-tools');
  assert.equal(c.url, '');
  assert.deepEqual(c.artifacts, [{ binary: ['tl'] }]);
  assert.deepEqual(c.pour.installers.map((i) => [i.platform, i.kind]), [['linux-x86_64', 'tar.gz'], ['windows-x86_64', 'zip']]);
});

test('an app with a release feed qualifies and keeps its live feed', async () => {
  const q = await qualify({ kind: 'cask', token: 'fancy', name: 'Fancy', desc: 'A fancy app for fancy people', homepage: 'https://example.com/tool', feed: 'https://example.com/app/latest.json' }, { fetch: fakeFetch, taken: free });
  assert.equal(q.ok, true, q.problems.join('; '));
  assert.equal(q.record.version, '1.4.0');
  const c = toCask(q.record, 'jks-sys/pour-apps');
  assert.equal(c.url, 'https://example.com/app/Fancy_aarch64.app.tar.gz');
  assert.equal(c.sha256, SHA);
  assert.equal(c.pour.livecheck, 'https://example.com/app/latest.json');
  assert.deepEqual(c.pour.installers.map((i) => i.kind), ['exe']);
  assert.deepEqual(c.artifacts, [{ app: ['Fancy.app'] }]);
});

test('every problem is reported at once', async () => {
  const q = await qualify({ kind: 'cli', token: 'Bad Name', desc: 'short', homepage: 'http://example.com', bin: ['../evil'], platforms: { 'linux-x86_64': { url: 'https://example.com/oops.html' }, 'amiga-68k': 'https://x' } }, { fetch: fakeFetch, taken: free });
  assert.equal(q.ok, false);
  const all = q.problems.join(' | ');
  for (const w of ['id:', 'desc:', 'bin:', 'needs its SHA-256', 'not a system Pour knows', 'web page, not a file', 'homepage:', 'version:']) assert.ok(all.includes(w), `missing "${w}" in ${all}`);
});

test('a name someone else owns is refused', async () => {
  const q = await qualify({ kind: 'cli', token: 'git', desc: 'Pretends to be git, badly', homepage: 'https://example.com/tool', version: '1', platforms: { 'linux-x86_64': { url: 'https://example.com/tool-linux.tar.gz', sha256: SHA } } }, { fetch: fakeFetch, taken: async (t) => (t === 'git' ? 'git is a Homebrew formula already — choose another id' : null) });
  assert.equal(q.ok, false);
  assert.ok(q.problems.some((p) => p.includes('Homebrew formula')));
});

test('feeds: relative names, versions without v, missing version refused', async () => {
  const f = await readFeed('https://example.com/app/latest.json', fakeFetch);
  assert.equal(f.version, '1.4.0');
  assert.equal(f.platforms['macos-arm64'].url, 'https://example.com/app/Fancy_aarch64.app.tar.gz');
  assert.equal((await probe('http://example.com/x', fakeFetch)).ok, false);
});

test('register stores the record, hands out a key once, and needs it to update', async () => {
  forgetRegistrations();
  const store = new Map();
  const env = { REGISTRY: {
    get: async (k) => (store.has(k) ? { json: async () => JSON.parse(store.get(k)) } : null),
    put: async (k, v) => { store.set(k, v); },
    list: async () => ({ objects: [...store.keys()].map((key) => ({ key })), truncated: false }),
  } };
  const body = { kind: 'cli', token: 'tool', desc: 'Does one useful thing very fast', homepage: 'https://example.com/tool', version: '2.0.1', platforms: { 'linux-x86_64': { url: 'https://example.com/tool-linux.tar.gz', sha256: SHA } } };
  const req = (b, auth) => new Request('https://ipconfig.co.network/pour/api/register', { method: 'POST', headers: auth ? { authorization: `Bearer ${auth}` } : {}, body: JSON.stringify(b) });
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  let r = await register(req(body), env, { fetch: fakeFetch, taken: free });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.install, 'pour install tool');
  const key = r.body.key;
  assert.match(key, /^[0-9a-f]{36}$/);
  assert.ok(!JSON.parse(store.get('registrations/tool.json')).key_hash.includes(key));
  r = await register(req({ ...body, version: '2.0.2' }), env, { fetch: fakeFetch, taken: free });
  assert.equal(r.status, 409);
  r = await register(req({ ...body, version: '2.0.2', key }), env, { fetch: fakeFetch, taken: free });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(store.get('registrations/tool.json')).version, '2.0.2');
  // the creator's key (APPS_API_KEY) may register any name and update any registration
  r = await register(req({ ...body, token: 'mine' }, 'owner-secret'), { ...env, APPS_API_KEY: 'owner-secret' }, { fetch: fakeFetch, taken: async () => 'taken' });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.key, undefined);
});
