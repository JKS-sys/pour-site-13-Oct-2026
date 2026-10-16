// Pour site Worker — https://ipconfig.co.network/pour
// Serves the install page, the package browser, downloads, the registry
// mirror and the live release feed. Data lives in the pour-registry R2
// bucket (filled by pour-registry/update.sh and pour/update.sh); GitHub is
// the fallback for everything, so the site keeps working with an empty bucket.
// Copyright (c) 2026 Jagadeesh Kumar S. All rights reserved.

import { home, appsPage, packagePage, searchPage, notFound, docsPage, layout } from "./pages.js";
import { register, registrations, toCask, readFeed } from "./register.js";

const GH = "https://github.com/JKS-sys";
const RAW = "https://raw.githubusercontent.com/JKS-sys";
const HOMEBREW_API = "https://formulae.brew.sh/api";
const UA = "pour-site (+https://ipconfig.co.network/pour)";
// Every repository carries its date suffix (github.com/JKS-sys/pour-13-Oct-2026); the bare names 404.
const SFX = "-13-Oct-2026";

const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120, s-maxage=600", ...SECURITY, ...extra } });
}
function json(obj, status = 200, maxAge = 300) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${maxAge}`, "access-control-allow-origin": "*", ...SECURITY } });
}
function text(body, status = 200, type = "text/plain; charset=utf-8") {
  return new Response(body, { status, headers: { "content-type": type, "cache-control": "public, max-age=300", ...SECURITY } });
}

/** Stream an R2 object with ETag/304 handling; `null` when missing. */
async function fromR2(env, key, request, contentType, maxAge = 300) {
  if (!env.REGISTRY) return null;
  const obj = await env.REGISTRY.get(key);
  if (!obj) return null;
  const etag = obj.httpEtag;
  // Cloudflare weakens the ETag (W/"…") when it compresses JSON on the way out; honour both forms.
  const inm = (request.headers.get("if-none-match") || "").split(",").map((t) => t.trim().replace(/^W\//, ""));
  if (inm.includes(etag) || inm.includes(etag.replace(/^W\//, ""))) return new Response(null, { status: 304, headers: { etag, "cache-control": `public, max-age=${maxAge}` } });
  const headers = new Headers({ etag, "cache-control": `public, max-age=${maxAge}`, "access-control-allow-origin": "*", "content-type": contentType || obj.httpMetadata?.contentType || "application/octet-stream", "content-length": String(obj.size), ...SECURITY });
  if (obj.uploaded) headers.set("last-modified", obj.uploaded.toUTCString());
  return new Response(obj.body, { status: 200, headers });
}

/** The live site's page shell (header, footer, stylesheet, scripts), cached. */
let shellMemo = { until: 0, value: null };
async function siteShell(env) {
  if (shellMemo.until > Date.now()) return shellMemo.value;
  let value = null;
  try {
    const host = env.SITE_HOST || "ipconfig.co.network";
    // SHELL_ORIGIN lets a local run borrow the shell from a local copy of the site (http://127.0.0.1:8787).
    const origin = env.SHELL_ORIGIN || `https://${host}`;
    const r = await fetch(`${origin}/about`, { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", accept: "text/html" }, cf: { cacheTtl: 600 } });
    if (r.ok) {
      const html = await r.text();
      const h0 = html.indexOf('<header class="bar"'), h1 = html.indexOf("<main");
      const f0 = html.indexOf("<footer"), f1 = html.indexOf("</footer>");
      const head = (html.match(/<link rel="stylesheet"[^>]*>/g) || []).filter((t) => !t.includes("/pour/")).join("\n");
      const scripts = (html.match(/<script[^>]*src="\/[^"]+"[^>]*><\/script>/g) || []).filter((t) => !t.includes("/pour/")).join("\n");
      if (h0 > 0 && h1 > h0 && f0 > h1 && f1 > f0 && head) {
        // the shell came from /about: move the "current page" mark onto the Pour link
        // (the bar's own link is a plain <a href="/pour">; the Apps menu also links /pour, so match exactly)
        const header = html.slice(h0, h1).replace(/ aria-current="page"/g, "").replace('<a href="/pour">', '<a href="/pour" aria-current="page">');
        value = { head, header, footer: html.slice(f0, f1 + 9), scripts };
      }
    }
  } catch {}
  shellMemo = { until: Date.now() + (value ? 600_000 : 60_000), value };
  return value;
}


/* The apps registry: pour-apps (R2, else GitHub) merged with the dashboard's apps (service
   binding SITE → GET /api/v1/apps, which lists only the apps switched on). An app the
   dashboard knows but pour-apps does not becomes a cask that follows its release feed
   /updates/<app>/latest.json, the way every app made with the ship stack publishes. */
let appsMemo = { until: 0, value: null };
export async function appsIndex(env) {
  if (appsMemo.until > Date.now()) return appsMemo.value;
  const host = env.SITE_HOST || "ipconfig.co.network";
  const base = (await cachedJson(env, "apps/index.json", `${RAW}/pour-apps${SFX}/main/index.json`)) || { meta: { name: "pour-apps" }, formulae: [], casks: [] };
  let dash = [];
  try {
    // ?pour=1: every app the dashboard knows except the ones switched off — a new app that
    // registered itself (first ping, crash report, Owner Panel sync) is in Pour as soon as
    // its release feed answers with a version and a download; nobody has to approve it.
    const r = env.SITE ? await env.SITE.fetch(new Request(`https://${host}/api/v1/apps?pour=1`, { headers: { accept: "application/json" } })) : null;
    if (r && r.ok) dash = (await r.json()).apps || [];
  } catch {}
  const have = new Set((base.casks || []).map((c) => c.token));
  const fresh = dash.filter((a) => a && /^[a-z][a-z0-9-]{1,23}$/.test(a.id) && !have.has(a.id) && a.status !== "off");
  const added = (await Promise.all(fresh.map(async (a) => (a.status === "on" || (await feedQualifies(env, a, host)) ? dashboardCask(a, host) : null)))).filter(Boolean);
  for (const c of added) have.add(c.token);
  const regs = (await registrations(env)).filter((r) => r.kind === "cask" && !have.has(r.token)).map((r) => toCask(r, "jks-sys/pour-apps"));
  const casks = [...(base.casks || []), ...added, ...regs];
  const value = { ...base, meta: { ...(base.meta || {}), apps: casks.length, from_dashboard: added.length, registered: regs.length }, casks };
  appsMemo = { until: Date.now() + 60_000, value };
  return value;
}

/** A dashboard app qualifies when its release feed answers with a version and a download. */
const feedMemo = new Map();
async function feedQualifies(env, a, host) {
  const feed = /latest\.json$/.test(a.download_url || "") ? a.download_url : `https://${host}/updates/${a.id}/latest.json`;
  const hit = feedMemo.get(feed);
  if (hit && hit.until > Date.now()) return hit.ok;
  let ok = false;
  try {
    const f = await readFeed(feed, (u, o) => (u.startsWith(`https://${host}/`) && env.SITE ? env.SITE.fetch(new Request(u, o)) : fetch(u, o)));
    ok = Object.keys(f.platforms).length > 0;
  } catch {}
  feedMemo.set(feed, { ok, until: Date.now() + 3_600_000 });
  return ok;
}

/* Command-line tools with builds for every system: pour-apps/tools.index.json (built by
   build-tools.mjs, mirrored to R2 tools/index.json) plus every tool registered through
   /pour/api/register. */
let toolsMemo = { until: 0, value: null };
export async function toolsIndex(env) {
  if (toolsMemo.until > Date.now()) return toolsMemo.value;
  const base = (await cachedJson(env, "tools/index.json", `${RAW}/pour-apps${SFX}/main/tools.index.json`)) || { meta: { name: "pour-tools" }, formulae: [], casks: [] };
  const have = new Set((base.casks || []).map((c) => c.token));
  const regs = (await registrations(env)).filter((r) => r.kind === "cli" && !have.has(r.token)).map((r) => toCask(r, "jks-sys/pour-tools"));
  const casks = [...(base.casks || []), ...regs];
  const value = { ...base, meta: { ...(base.meta || {}), tools: casks.length, registered: regs.length }, casks };
  toolsMemo = { until: Date.now() + 60_000, value };
  return value;
}

/* Desktop apps' own installers for Windows, Linux and FreeBSD, named like Homebrew's casks
   (pour-apps/desktop.index.json, mirrored to R2 desktop/index.json). */
let desktopMemo = { until: 0, value: null };
export async function desktopIndex(env) {
  if (desktopMemo.until > Date.now()) return desktopMemo.value;
  const value = (await cachedJson(env, "desktop/index.json", `${RAW}/pour-apps${SFX}/main/desktop.index.json`)) || { meta: { name: "pour-desktop" }, formulae: [], casks: [] };
  desktopMemo = { until: Date.now() + 300_000, value };
  return value;
}

/** Who already owns a name: Homebrew, the creator's apps, the curated tools, the dashboard. */
async function taken(env, token, kind, isOwner) {
  if (isOwner) return null;
  const [apps, tools] = await Promise.all([appsIndex(env), toolsIndex(env)]);
  if ((apps?.casks || []).some((c) => c.token === token)) return `${token} is one of the apps made at ipconfig.co.network`;
  if ((tools?.casks || []).some((c) => c.token === token)) return `${token} is already a listed tool`;
  for (const k of ["formula", "cask"]) {
    try {
      const r = await fetch(`${HOMEBREW_API}/${k}/${encodeURIComponent(token)}.json`, { method: "HEAD", headers: { "user-agent": UA }, cf: { cacheTtl: 3600 } });
      if (r.ok) return `${token} is a Homebrew ${k} already — choose another id`;
    } catch {}
  }
  return null;
}

export function dashboardCask(a, host = "ipconfig.co.network") {
  const name = String(a.name || a.id);
  const feed = /latest\.json$/.test(a.download_url || "") ? a.download_url : `https://${host}/updates/${a.id}/latest.json`;
  return {
    token: a.id, full_token: `jks-sys/pour-apps/${a.id}`, tap: "jks-sys/pour-apps", name: [name],
    desc: a.line ? `${name} — ${a.line}` : name, homepage: a.download_url && !/latest\.json$/.test(a.download_url) ? a.download_url : `https://${host}/${a.id}`,
    version: a.latest_version || "latest", sha256: "no_check", url: "", container: { type: "tar" },
    artifacts: [{ app: [`${name}.app`] }], auto_updates: true,
    caveats: `${name} was registered on the dashboard; Pour installs the newest build from its release feed.`,
    pour: { livecheck: feed, clear_quarantine: true, installers: [], status: "registered", source: "dashboard" },
  };
}

/** Small JSON documents with a per-isolate memory cache. */
const memo = new Map();
async function cachedJson(env, key, fallbackUrl, ttlMs = 300_000) {
  const hit = memo.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  let value = null;
  try {
    const obj = env.REGISTRY ? await env.REGISTRY.get(key) : null;
    if (obj) value = await obj.json();
  } catch {}
  if (!value && fallbackUrl) {
    try {
      const r = await fetch(fallbackUrl, { headers: { "user-agent": UA, accept: "application/json" }, cf: { cacheTtl: 300, cacheEverything: true } });
      if (r.ok) value = await r.json();
    } catch {}
  }
  memo.set(key, { value, until: Date.now() + (value ? ttlMs : 15_000) });
  return value;
}

/** Package metadata straight from Homebrew's API (cached at the edge). */
async function homebrew(kind, name) {
  const url = `${HOMEBREW_API}/${kind}/${encodeURIComponent(name)}.json`;
  const r = await fetch(url, { headers: { "user-agent": UA }, cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!r.ok) return null;
  return r.json();
}

async function stats(env) {
  const index = await cachedJson(env, "index.json", `${GH}/pour-registry${SFX}/releases/latest/download/index.json`);
  const release = await cachedJson(env, "releases/latest.json", `${RAW}/pour${SFX}/main/dist/latest.json`, 600_000);
  const [apps, tools, desktop] = await Promise.all([appsIndex(env), toolsIndex(env), desktopIndex(env)]);
  return {
    formulae: index?.formulae ?? 8658,
    casks: index?.casks ?? 7783,
    synced_at: index?.synced_at ?? null,
    version: release?.version ?? null,
    apps: apps?.casks?.filter((c) => c.url)?.length ?? 11,
    appsAll: apps?.casks ?? [],
    tools: tools?.casks?.length ?? 0,
    desktop: desktop?.casks?.length ?? 0,
    desktopInstallers: (desktop?.casks || []).reduce((n, c) => n + (c.pour?.installers?.length || 0), 0),
    toolInstallers: (tools?.casks || []).reduce((n, c) => n + (c.pour?.installers?.length || 0), 0),
    toolsAll: tools?.casks ?? [],
    index,
    release,
  };
}

function theme(request) {
  // Match the main site: follow the visitor's local daylight when nothing is pinned.
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)theme=(light|dark)/);
  if (m) return m[1];
  const tz = request.cf?.timezone;
  try {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz || "UTC" }).format(new Date()));
    return hour >= 7 && hour < 19 ? "light" : "dark";
  } catch {
    return "light";
  }
}

// Pour's machine endpoints and its own static files are always answered here.
const POUR_ONLY = /^\/pour\/((un)?install(\.sh)?|releases\/.*|dl\/.*|registry\/.*|(apps|tools|desktop)\/index\.json|api\/.*|sitemap\.xml|robots\.txt|[\w.-]+\.(css|js|svg|png|webp|ico|json|txt))$/;

export default {
  // Web pages: the main ipconfig.co.network site answers first (service
  // binding SITE → the "ipconfig" Worker). Pour's own pages are only the
  // fallback: when the site has no such page (404), is failing (5xx), or
  // answers with its own stop-gap redirect to the GitHub repository.
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isPage = (request.method === "GET" || request.method === "HEAD") && !POUR_ONLY.test(url.pathname);
    if (isPage && env.SITE) {
      try {
        const r = await env.SITE.fetch(request.clone());
        const loc = r.headers.get("location") || "";
        const stopGap = r.status >= 300 && r.status < 400 && /^https:\/\/(github\.com|raw\.githubusercontent\.com)\/JKS-sys\/pour/i.test(loc);
        if (r.status !== 404 && r.status < 500 && !stopGap) {
          const out = new Response(r.body, r);
          out.headers.set("x-served-by", "ipconfig");
          return out;
        }
      } catch {}
    }
    const res = await pourFetch(request, env, ctx);
    if (isPage) {
      const out = new Response(res.body, res);
      out.headers.set("x-served-by", "pour-fallback");
      return out;
    }
    return res;
  },
};

async function pourFetch(request, env, ctx) {
  {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/pour" || path === "/") {
      const s = await stats(env);
      return html(home({ theme: theme(request), stats: s, env, shell: await siteShell(env) }));
    }
    if (!path.startsWith("/pour/")) return notFoundResponse(request, env);
    const rest = path.slice("/pour/".length);

    // ---- machine endpoints
    if (rest === "uninstall" || rest === "uninstall.sh") {
      return (await fromR2(env, "releases/uninstall.sh", request, "text/plain; charset=utf-8", 600)) || Response.redirect(`${RAW}/pour${SFX}/main/uninstall.sh`, 302);
    }
    if (rest === "install" || rest === "install.sh") {
      return (await fromR2(env, "releases/install.sh", request, "text/plain; charset=utf-8", 600)) || Response.redirect(`${RAW}/pour${SFX}/main/install.sh`, 302);
    }
    if (rest === "releases/latest.json") {
      const r = await fromR2(env, "releases/latest.json", request, "application/json; charset=utf-8", 300);
      if (r) return r;
      const gh = await fetch("https://api.github.com/repos/JKS-sys/pour-13-Oct-2026/releases/latest", { headers: { "user-agent": UA, accept: "application/vnd.github+json" }, cf: { cacheTtl: 600 } });
      if (!gh.ok) return json({ error: "no release yet" }, 404, 60);
      const rel = await gh.json();
      const assets = {};
      for (const a of rel.assets || []) assets[a.name] = { url: a.browser_download_url, size: a.size };
      return json({ name: "pour", version: String(rel.tag_name || "").replace(/^v/, ""), notes: rel.body || "", pub_date: rel.published_at, assets });
    }
    if (rest.startsWith("dl/")) {
      // dl/<asset> is the newest release; dl/v1.2.3/<asset> a pinned one (what pinned installs and pour self-update use).
      const m = /^dl\/(?:(v[0-9][0-9A-Za-z.-]*)\/)?([A-Za-z0-9._-]+)$/.exec(rest);
      if (!m) return notFoundResponse(request, env);
      const [, ver, asset] = m;
      const key = ver ? `releases/${ver}/${asset}` : `releases/${asset}`;
      const gh = ver ? `${GH}/pour${SFX}/releases/download/${ver}/${asset}` : `${GH}/pour${SFX}/releases/latest/download/${asset}`;
      return (await fromR2(env, key, request, "application/octet-stream", ver ? 86400 : 600)) || Response.redirect(gh, 302);
    }
    if (rest.startsWith("registry/")) {
      const file = rest.slice(9).replace(/[^A-Za-z0-9._-]/g, "");
      const ct = file.endsWith(".gz") ? "application/gzip" : "application/json; charset=utf-8";
      return (await fromR2(env, file, request, ct, 300)) || Response.redirect(`${GH}/pour-registry${SFX}/releases/latest/download/${file}`, 302);
    }
    if (rest === "apps/index.json") {
      // pour-apps plus every app the dashboard has switched on, so a new app is
      // `pour install --cask <app>` the moment it registers (pour update picks it up).
      const idx = await appsIndex(env);
      if (!idx) return Response.redirect(`${RAW}/pour-apps${SFX}/main/index.json`, 302);
      return json(idx, 200, 300);
    }
    if (rest === "api/apps") {
      const idx = await appsIndex(env);
      return json({ ok: true, apps: (idx?.casks || []).map((c) => ({ token: c.token, name: c.name?.[0] || c.token, desc: c.desc, version: c.version, homepage: c.homepage, source: c.pour?.source || "pour-apps", install: `pour install --cask ${c.token}` })) }, 200, 120);
    }
    if (rest === "tools/index.json") {
      const idx = await toolsIndex(env);
      return json(idx, 200, 300);
    }
    if (rest === "desktop/index.json") {
      return json(await desktopIndex(env), 200, 300);
    }
    if (rest === "api/desktop") {
      const idx = await desktopIndex(env);
      return json({ ok: true, apps: (idx?.casks || []).map((c) => ({ token: c.token, name: c.name?.[0] || c.token, desc: c.desc, version: c.version, homepage: c.homepage, systems: (c.pour?.installers || []).map((i) => `${i.platform}:${i.kind}`), install: `pour install --cask ${c.token}` })) }, 200, 300);
    }
    if (rest === "api/tools") {
      const idx = await toolsIndex(env);
      return json({ ok: true, tools: (idx?.casks || []).map((c) => ({ token: c.token, desc: c.desc, version: c.version, homepage: c.homepage, systems: (c.pour?.installers || []).map((i) => i.platform), source: c.pour?.source || "pour-tools", install: `pour install ${c.token}` })) }, 200, 300);
    }
    if (rest === "api/registrations") {
      const regs = await registrations(env);
      return json({ ok: true, registrations: regs.map((r) => ({ kind: r.kind, token: r.token, name: r.name, desc: r.desc, version: r.version, homepage: r.homepage, systems: Object.keys(r.platforms || {}), registered_at: r.created_at, updated_at: r.updated_at, install: r.kind === "cli" ? `pour install ${r.token}` : `pour install --cask ${r.token}` })) }, 200, 60);
    }
    if ((rest === "api/register" || rest === "api/apps/register") && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization" } });
    }
    if ((rest === "api/register" || rest === "api/apps/register") && request.method === "POST") {
      // Registration is automatic: qualified → listed at once (see register.js). The old
      // dashboard-shaped body ({ app, name, line, version, download_url }) still works and is
      // also sent on to the dashboard, which keeps its own record of the app.
      let raw = await request.text();
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch {}
      const host = env.SITE_HOST || "ipconfig.co.network";
      if (rest === "api/apps/register" || (body.app && !body.token)) {
        body = { kind: "cask", token: body.app, name: body.name, desc: body.desc || body.line || (body.name ? `${body.name} — an app made at ${host}` : ""), homepage: body.homepage || `https://${host}/${body.app}`, version: body.version, feed: /latest\.json$/.test(body.download_url || "") ? body.download_url : `https://${host}/updates/${body.app}/latest.json`, key: body.key, from: body.platform };
        if (env.SITE) ctx?.waitUntil?.(env.SITE.fetch(new Request(`https://${host}/api/v1/apps/register`, { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": request.headers.get("cf-connecting-ip") || "" }, body: raw })).catch(() => null));
      }
      const req2 = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(body) });
      const out = await register(req2, env, { taken: (t, k, owner) => taken(env, t, k, owner), fetch: (u, o) => (u.startsWith(`https://${host}/`) && env.SITE ? env.SITE.fetch(new Request(u, o)) : fetch(u, o)) });
      if (out.status < 300) { appsMemo.until = 0; toolsMemo.until = 0; searchCache.until = 0; }
      return new Response(JSON.stringify(out.body), { status: out.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
    }
    if (rest === "api/stats") {
      const s = await stats(env);
      return json({ formulae: s.formulae, casks: s.casks, apps: s.apps, tools: s.tools, desktop: s.desktop, downloads_for_other_systems: s.toolInstallers + s.desktopInstallers, synced_at: s.synced_at, version: s.version, total: s.formulae + s.casks + s.tools });
    }
    if (rest === "api/search") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const kind = url.searchParams.get("kind");
      return json(await search(env, q, kind, 50), 200, 60);
    }
    if (rest === "sitemap.xml") {
      const s = await stats(env);
      const pages = ["", "/apps", "/docs", "/search", ...s.appsAll.map((c) => `/p/${c.token}`)];
      const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>https://${env.SITE_HOST}/pour${p}</loc></url>`).join("\n")}\n</urlset>\n`;
      return text(body, 200, "application/xml; charset=utf-8");
    }
    if (rest === "robots.txt") return text("User-agent: *\nAllow: /pour\nSitemap: https://ipconfig.co.network/pour/sitemap.xml\n");

    // ---- pages
    if (rest === "apps") {
      const s = await stats(env);
      return html(appsPage({ theme: theme(request), stats: s, env, shell: await siteShell(env) }));
    }
    if (rest === "docs") {
      const s = await stats(env);
      return html(docsPage({ theme: theme(request), stats: s, env, shell: await siteShell(env) }));
    }
    if (rest === "search") {
      const q = (url.searchParams.get("q") || "").trim();
      const s = await stats(env);
      const results = q ? await search(env, q.toLowerCase(), url.searchParams.get("kind"), 100) : { rows: [] };
      return html(searchPage({ theme: theme(request), stats: s, env, shell: await siteShell(env), q, results }));
    }
    if (rest.startsWith("p/")) {
      const name = decodeURIComponent(rest.slice(2)).replace(/[^A-Za-z0-9@+._-]/g, "");
      const s = await stats(env);
      const app = s.appsAll.find((c) => c.token === name);
      let formula = null, cask = null;
      if (!app) {
        [formula, cask] = await Promise.all([homebrew("formula", name), homebrew("cask", name)]);
      }
      if (!app && !formula && !cask) return notFoundResponse(request, env, name);
      return html(packagePage({ theme: theme(request), stats: s, env, shell: await siteShell(env), name, app, formula, cask }), 200, { "cache-control": "public, max-age=600, s-maxage=1800" });
    }

    // ---- static assets (public/pour/…)
    if (env.ASSETS) {
      const r = await env.ASSETS.fetch(request);
      if (r.status !== 404) {
        const h = new Headers(r.headers);
        h.set("cache-control", "public, max-age=86400, immutable");
        for (const [k, v] of Object.entries(SECURITY)) h.set(k, v);
        return new Response(r.body, { status: r.status, headers: h });
      }
    }
    return notFoundResponse(request, env);
  }
}

async function notFoundResponse(request, env, name) {
  const s = await stats(env);
  return html(notFound({ theme: theme(request), stats: s, env, shell: await siteShell(env), name }), 404);
}

/** Search the compact list the registry publishes (search.json). */
let searchCache = { until: 0, rows: null, meta: null };
async function loadSearch(env) {
  if (searchCache.rows && searchCache.until > Date.now()) return searchCache;
  let data = null;
  try {
    const obj = env.REGISTRY ? await env.REGISTRY.get("search.json") : null;
    if (obj) data = await obj.json();
  } catch {}
  if (!data) {
    try {
      const r = await fetch(`${GH}/pour-registry${SFX}/releases/latest/download/search.json`, { headers: { "user-agent": UA }, cf: { cacheTtl: 600, cacheEverything: true } });
      if (r.ok) data = await r.json();
    } catch {}
  }
  const apps = await appsIndex(env);
  const rows = (data?.rows || []).map((r) => ({ name: r[0], kind: r[1] === 0 ? "formula" : "cask", desc: r[2] || "", version: r[3] || "", homepage: r[4] || "", source: "homebrew" }));
  for (const c of apps?.casks || []) rows.push({ name: c.token, kind: "cask", desc: c.desc, version: c.version, homepage: c.homepage, source: "jks-sys/pour-apps" });
  const tools = await toolsIndex(env);
  const formulaNames = new Set(rows.filter((r) => r.kind === "formula").map((r) => r.name));
  // A tool named like a Homebrew formula is the same command (its own build where no bottle
  // exists), so it is not listed twice; the others are command-line tools: `pour install NAME`.
  for (const c of tools?.casks || []) if (!formulaNames.has(c.token)) rows.push({ name: c.token, kind: "formula", desc: c.desc, version: c.version, homepage: c.homepage, source: "jks-sys/pour-tools" });
  const result = { until: Date.now() + (rows.length ? 600_000 : 15_000), rows, meta: { formulae: data?.formulae, casks: data?.casks, generated_at: data?.generated_at } };
  searchCache = result;
  return result;
}

export async function search(env, q, kind, limit) {
  const { rows, meta } = await loadSearch(env);
  if (!q) return { q, total: rows.length, rows: [], meta };
  const words = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const r of rows) {
    if (kind && r.kind !== kind) continue;
    const name = r.name.toLowerCase(), desc = r.desc.toLowerCase();
    if (!words.every((w) => name.includes(w) || desc.includes(w))) continue;
    let score = 0;
    for (const w of words) {
      if (name === w) score += 1000;
      else if (name.startsWith(w)) score += 600 - (name.length - w.length);
      else if (name.includes(w)) score += 300;
      else score += 100;
    }
    if (words.length > 1 && (name.includes(q) ? (score += 800) : desc.includes(q) ? (score += 400) : 0)) {}
    if (r.source !== "homebrew") score += 50;
    scored.push([score, r]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
  return { q, total: scored.length, rows: scored.slice(0, limit).map((x) => x[1]), meta };
}
