// Automatic registration for Pour — apps (`pour install --cask NAME`) and command-line
// tools (`pour install NAME`). No human approves anything: a registration is checked
// here, and when it qualifies it is listed in the registry at once (the next
// `pour update` on any computer picks it up). When it does not qualify, the answer
// lists every reason, so the author can fix them and send it again.
//
// What "qualified" means:
//   · a clean id (2–40 of a-z 0-9 - . + @) that is not already someone else's: not a
//     Homebrew formula or cask, not one of the creator's apps or the curated tools
//   · a name, a one-line description (10–200 characters, no markup), an https web page
//     that answers
//   · at least one download for a known system — from a release feed (latest.json) or
//     listed per system — every one over https, answering with a real file (not a web
//     page), at most 2 GB; listed downloads carry their SHA-256
//   · command-line tools name the programs they put on PATH (plain names, no paths)
//   · at most 10 new registrations a day from one address
// Updating a registration needs the key handed out the first time (or the creator's
// APPS_API_KEY, which the ship stack's update.sh sends for every new app).
//
// Copyright (c) 2026 Jagadeesh Kumar S. All rights reserved.

export const PLATFORMS = ["macos-arm64", "macos-x86_64", "linux-x86_64", "linux-arm64", "linux-i686", "windows-x86_64", "windows-arm64", "freebsd-x86_64"];
const FEED_KEYS = {
  "macos-arm64": ["darwin-aarch64", "darwin-aarch64-app", "macos-aarch64", "macos-arm64", "mac_arm"],
  "macos-x86_64": ["darwin-x86_64", "darwin-x86_64-app", "macos-x86_64", "macos-intel", "mac_intel"],
  "linux-x86_64": ["linux-x86_64-deb", "deb", "linux-x86_64", "linux-x86_64-appimage", "appimage"],
  "linux-arm64": ["linux-aarch64-deb", "deb_arm", "linux-aarch64", "linux-arm64"],
  "linux-i686": ["linux-i686", "linux-x86"],
  "windows-x86_64": ["windows-x86_64", "windows-x86_64-nsis", "windows"],
  "windows-arm64": ["windows-aarch64", "windows-arm64"],
  "freebsd-x86_64": ["freebsd", "freebsd-x86_64", "freebsd_amd64"],
};
export const TOKEN_RE = /^[a-z0-9][a-z0-9+._@-]{1,39}$/;
const MAX_BYTES = 2 * 1024 ** 3;
const UA = "pour-register (+https://ipconfig.co.network/pour)";

const clean = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function sha256(s) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function kindOf(url) {
  const p = url.split(/[?#]/)[0].toLowerCase();
  if (p.endsWith(".app.tar.gz")) return "tar.gz";
  for (const k of ["dmg", "zip", "pkg", "exe", "msi", "deb", "rpm", "appimage"]) if (p.endsWith("." + k)) return k;
  if (p.endsWith(".tar.gz") || p.endsWith(".tgz")) return "tar.gz";
  if (p.endsWith(".tar.xz")) return "tar.xz";
  return "binary";
}

async function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => (t = setTimeout(() => rej(new Error("timed out")), ms)))]).finally(() => clearTimeout(t));
}

/** Does `url` answer with a file? HEAD first, then a 1-byte ranged GET (some hosts refuse HEAD). */
export async function probe(url, fetchFn = fetch) {
  if (!/^https:\/\//.test(url)) return { ok: false, why: "is not https" };
  for (const method of ["HEAD", "GET"]) {
    try {
      const r = await withTimeout(fetchFn(url, { method, redirect: "follow", headers: { "user-agent": UA, ...(method === "GET" ? { range: "bytes=0-0" } : {}) } }), 8000);
      if (method === "GET") try { await r.body?.cancel(); } catch {}
      if (r.status >= 400) { if (method === "HEAD") continue; return { ok: false, why: `answers HTTP ${r.status}` }; }
      const type = (r.headers.get("content-type") || "").toLowerCase();
      const size = Number(r.headers.get("content-range")?.split("/")[1] || r.headers.get("content-length") || 0);
      if (type.startsWith("text/html")) return { ok: false, why: "answers with a web page, not a file" };
      if (size > MAX_BYTES) return { ok: false, why: "is larger than 2 GB" };
      return { ok: true, size };
    } catch (e) {
      if (method === "GET") return { ok: false, why: `did not answer (${e.message})` };
    }
  }
  return { ok: false, why: "did not answer" };
}

async function page(url, fetchFn) {
  if (!/^https:\/\//.test(url)) return "is not https";
  try {
    const r = await withTimeout(fetchFn(url, { method: "GET", redirect: "follow", headers: { "user-agent": UA } }), 8000);
    try { await r.body?.cancel(); } catch {}
    return r.status < 400 ? null : `answers HTTP ${r.status}`;
  } catch (e) {
    return `did not answer (${e.message})`;
  }
}

/** A release feed (latest.json): version plus downloads per system. */
export async function readFeed(url, fetchFn = fetch) {
  const r = await withTimeout(fetchFn(url, { headers: { "user-agent": UA, accept: "application/json" } }), 8000);
  if (!r.ok) throw new Error(`answers HTTP ${r.status}`);
  const text = await r.text();
  if (text.length > 1_000_000) throw new Error("is larger than 1 MB");
  const j = JSON.parse(text);
  const version = clean(String(j.version ?? ""), 40).replace(/^v/, "");
  if (!version) throw new Error("has no version");
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  const map = {};
  for (const section of ["platforms", "files", "downloads", "assets"]) {
    for (const [k, e] of Object.entries(j[section] ?? {})) {
      const u = typeof e === "string" ? e : e?.url || e?.mirror || e?.file || e?.name;
      if (u) map[k.toLowerCase()] = { url: /^https?:/.test(u) ? u : base + u, sha256: typeof e === "object" && /^[0-9a-f]{64}$/i.test(e?.sha256 || "") ? e.sha256.toLowerCase() : null };
    }
  }
  const platforms = {};
  for (const [plat, keys] of Object.entries(FEED_KEYS)) {
    const hit = keys.map((k) => map[k]).find(Boolean) || map[`pour-${plat}`] || map[plat];
    if (hit) platforms[plat] = hit;
  }
  return { version, platforms };
}

/**
 * Check a registration. `ctx`: { fetch, taken(token, kind) → reason|null, isOwner }.
 * Returns { ok, problems[], checks[], record } — `record` is what gets stored.
 */
export async function qualify(body, ctx) {
  const f = ctx.fetch || fetch;
  const problems = [];
  const checks = [];
  const kind = body.kind === "cli" || body.kind === "formula" || body.kind === "tool" ? "cli" : "cask";
  const token = clean(body.token || body.app || body.id, 40).toLowerCase();
  if (!TOKEN_RE.test(token)) problems.push("id: 2–40 lowercase letters, digits, - . + @, starting with a letter or digit");
  const name = clean(body.name, 40) || (token ? token[0].toUpperCase() + token.slice(1) : "");
  const desc = clean(body.desc || body.line, 200);
  if (desc.length < 10) problems.push("desc: one line of 10–200 characters saying what it does");
  if (/[<>]|https?:\/\//i.test(desc)) problems.push("desc: plain words only (no markup, no links)");
  if (/[<>]/.test(name)) problems.push("name: plain words only");
  const homepage = clean(body.homepage, 300) || (body.feed ? "" : "");
  if (!homepage) problems.push("homepage: an https web page about it");
  if (token && TOKEN_RE.test(token)) {
    const t = await ctx.taken(token, kind);
    if (t) problems.push(`id: ${t}`);
  }
  const bins = (Array.isArray(body.bin) ? body.bin : body.bin ? [body.bin] : []).map((b) => clean(String(b), 40)).filter(Boolean);
  if (kind === "cli" && bins.some((b) => !/^[A-Za-z0-9._+-]{1,40}$/.test(b))) problems.push("bin: plain program names (no folders)");
  const app = clean(body.app_bundle || (typeof body.app === "string" && body.app.endsWith(".app") ? body.app : ""), 80) || `${name}.app`;
  if (kind === "cask" && !/^[^/\\]{1,80}\.app$/.test(app)) problems.push("app: the bundle's file name, like Peek.app");

  // downloads
  let version = clean(body.version, 40).replace(/^v/, "");
  let platforms = {};
  const feed = clean(body.feed || body.download_url, 400);
  if (feed && /latest\.json(\?|$)/.test(feed)) {
    try {
      const fd = await readFeed(feed, f);
      version = fd.version;
      platforms = fd.platforms;
      checks.push(`release feed answers: version ${version}, ${Object.keys(platforms).length} system(s)`);
    } catch (e) {
      problems.push(`feed: ${feed} ${e.message}`);
    }
  } else if (feed) {
    problems.push("feed: a release feed ending in latest.json (or list downloads per system)");
  }
  for (const [plat, v] of Object.entries(body.platforms || {})) {
    if (!PLATFORMS.includes(plat)) { problems.push(`${plat}: not a system Pour knows (${PLATFORMS.join(", ")})`); continue; }
    const url = clean(typeof v === "string" ? v : v?.url, 600);
    const sha = clean(typeof v === "object" ? v?.sha256 || "" : "", 64).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(sha)) problems.push(`${plat}: needs its SHA-256 (64 hex digits)`);
    platforms[plat] = { url, sha256: /^[0-9a-f]{64}$/.test(sha) ? sha : null };
  }
  if (!version) problems.push("version: its current version (or a feed that says it)");
  if (!Object.keys(platforms).length) problems.push("downloads: at least one, for any system");
  if (homepage) {
    const why = await page(homepage, f);
    if (why) problems.push(`homepage: ${homepage} ${why}`);
    else checks.push("homepage answers");
  }
  const probed = await Promise.all(Object.entries(platforms).map(async ([plat, d]) => [plat, d, await probe(d.url, f)]));
  for (const [plat, d, r] of probed) {
    if (!r.ok) problems.push(`${plat}: ${d.url} ${r.why}`);
    else { d.size = r.size || null; checks.push(`${plat} download answers${r.size ? ` (${(r.size / 1e6).toFixed(1)} MB)` : ""}${d.sha256 ? ", SHA-256 given" : ""}`); }
  }
  const record = { kind, token, name, desc, homepage, version, feed: feed || null, platforms, bin: kind === "cli" ? (bins.length ? bins : [token]) : [], app: kind === "cask" ? app : null };
  return { ok: problems.length === 0, problems, checks, record };
}

/** The registry entry Pour reads (Homebrew API shape, Pour-native installers). */
export function toCask(r, tap) {
  const native = Object.entries(r.platforms || {})
    .filter(([p]) => r.kind === "cli" || !p.startsWith("macos"))
    .map(([platform, d]) => ({ platform, url: d.url, kind: kindOf(d.url), ...(d.sha256 ? { sha256: d.sha256 } : {}) }));
  const arm = r.platforms?.["macos-arm64"];
  const intel = r.platforms?.["macos-x86_64"];
  const variations = {};
  if (r.kind === "cask" && intel) for (const t of ["golden_gate", "tahoe", "sequoia", "sonoma", "ventura", "monterey", "big_sur"]) variations[t] = { url: intel.url, ...(intel.sha256 ? { sha256: intel.sha256 } : {}) };
  const mac = arm || intel;
  return {
    token: r.token,
    full_token: `${tap}/${r.token}`,
    tap,
    name: [r.name],
    desc: r.desc,
    homepage: r.homepage,
    version: r.version,
    sha256: r.kind === "cask" ? mac?.sha256 || "no_check" : "no_check",
    url: r.kind === "cask" ? mac?.url || "" : "",
    artifacts: r.kind === "cli" ? [{ binary: r.bin }] : [{ app: [r.app] }],
    auto_updates: r.kind === "cask",
    variations,
    caveats: null,
    pour: { kind: r.kind, livecheck: r.feed, clear_quarantine: false, installers: native, status: "registered", source: "register", registered_at: r.created_at || null },
  };
}

/** Per-address daily limit through the Cache API (per data centre — good enough to stop floods). */
export async function underLimit(ip, limit = 10) {
  try {
    const cache = caches.default;
    const key = new Request(`https://pour-rate.invalid/${new Date().toISOString().slice(0, 10)}/${encodeURIComponent(ip)}`);
    const hit = await cache.match(key);
    const n = hit ? Number(await hit.text()) || 0 : 0;
    if (n >= limit) return false;
    await cache.put(key, new Response(String(n + 1), { headers: { "cache-control": "max-age=86400" } }));
    return true;
  } catch {
    return true;
  }
}

/** Every stored registration (R2 registrations/*.json), cached per isolate for a minute. */
let regMemo = { until: 0, value: [] };
export async function registrations(env) {
  if (regMemo.until > Date.now()) return regMemo.value;
  const out = [];
  if (env.REGISTRY) {
    let cursor;
    do {
      const page = await env.REGISTRY.list({ prefix: "registrations/", cursor, limit: 1000 });
      const objs = await Promise.all(page.objects.map((o) => env.REGISTRY.get(o.key).then((x) => x?.json()).catch(() => null)));
      out.push(...objs.filter(Boolean));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
  regMemo = { until: Date.now() + 60_000, value: out };
  return out;
}
export function forgetRegistrations() {
  regMemo = { until: 0, value: [] };
}

/** POST /pour/api/register */
export async function register(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { ok: false, error: "bad_json", message: "Send JSON: { kind, token, name, desc, homepage, feed | platforms, bin }" } };
  }
  const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const key = clean(body.key || auth, 200);
  const isOwner = !!env.APPS_API_KEY && timingSafeEqual(key, env.APPS_API_KEY);
  const token = clean(body.token || body.app || body.id, 40).toLowerCase();
  const existing = TOKEN_RE.test(token) && env.REGISTRY ? await env.REGISTRY.get(`registrations/${token}.json`).then((o) => o?.json()).catch(() => null) : null;
  if (existing && !isOwner && !(key && timingSafeEqual(await sha256(key), existing.key_hash || ""))) {
    return { status: 409, body: { ok: false, error: "taken", message: `${token} is registered already; send its key to update it.`, problems: [`id: ${token} is registered already — updating it needs the key from the first registration`] } };
  }
  const ip = request.headers.get("cf-connecting-ip") || "local";
  if (!existing && !isOwner && !(await underLimit(ip))) {
    return { status: 429, body: { ok: false, error: "rate_limited", message: "Ten new registrations a day per address; try again tomorrow." } };
  }
  const q = await qualify(body, {
    fetch: ctx?.fetch || fetch,
    isOwner,
    taken: async (t, kind) => (existing || isOwner ? null : ctx.taken(t, kind, isOwner)),
  });
  if (!q.ok) return { status: 422, body: { ok: false, error: "not_qualified", message: `${token || "it"} does not qualify yet: ${q.problems.length} thing(s) to fix.`, problems: q.problems, checks: q.checks } };
  const now = new Date().toISOString();
  let newKey = null;
  const rec = { ...q.record, created_at: existing?.created_at || now, updated_at: now, owner: isOwner || !!existing?.owner, from: clean(body.from, 60) || null, checks: q.checks };
  if (existing) rec.key_hash = existing.key_hash || null;
  else if (!isOwner) {
    newKey = hex(crypto.getRandomValues(new Uint8Array(18)).buffer);
    rec.key_hash = await sha256(newKey);
  }
  await env.REGISTRY.put(`registrations/${rec.token}.json`, JSON.stringify(rec), { httpMetadata: { contentType: "application/json" } });
  forgetRegistrations();
  const install = rec.kind === "cli" ? `pour install ${rec.token}` : `pour install --cask ${rec.token}`;
  return { status: existing ? 200 : 201, body: { ok: true, added: !existing, status: "on", kind: rec.kind, token: rec.token, version: rec.version, install, checks: q.checks, ...(newKey ? { key: newKey } : {}) } };
}
