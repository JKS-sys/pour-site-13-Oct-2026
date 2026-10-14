// Pour site Worker — https://ipconfig.co.network/pour
// Serves the install page, the package browser, downloads, the registry
// mirror and the live release feed. Data lives in the pour-registry R2
// bucket (filled by pour-registry/update.sh and pour/update.sh); GitHub is
// the fallback for everything, so the site keeps working with an empty bucket.
// Copyright (c) 2026 Jagadeesh Kumar S. All rights reserved.

import { home, appsPage, packagePage, searchPage, notFound, docsPage, layout } from "./pages.js";

const GH = "https://github.com/JKS-sys";
const RAW = "https://raw.githubusercontent.com/JKS-sys";
const HOMEBREW_API = "https://formulae.brew.sh/api";
const UA = "pour-site (+https://ipconfig.co.network/pour)";

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
    const r = await fetch(`https://${host}/about`, { headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", accept: "text/html" }, cf: { cacheTtl: 600 } });
    if (r.ok) {
      const html = await r.text();
      const h0 = html.indexOf('<header class="bar"'), h1 = html.indexOf("<main");
      const f0 = html.indexOf("<footer"), f1 = html.indexOf("</footer>");
      const head = (html.match(/<link rel="stylesheet"[^>]*>/g) || []).filter((t) => !t.includes("/pour/")).join("\n");
      const scripts = (html.match(/<script[^>]*src="\/[^"]+"[^>]*><\/script>/g) || []).filter((t) => !t.includes("/pour/")).join("\n");
      if (h0 > 0 && h1 > h0 && f0 > h1 && f1 > f0 && head) {
        // the shell came from /about: move the "current page" mark onto the Pour link
        const header = html.slice(h0, h1).replace(/ aria-current="page"/g, "").replace(/<a ([^>]*href="\/pour"[^>]*)>/, '<a $1 aria-current="page">');
        value = { head, header, footer: html.slice(f0, f1 + 9), scripts };
      }
    }
  } catch {}
  shellMemo = { until: Date.now() + (value ? 600_000 : 60_000), value };
  return value;
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
  const index = await cachedJson(env, "index.json", `${GH}/pour-registry/releases/latest/download/index.json`);
  const release = await cachedJson(env, "releases/latest.json", `${RAW}/pour/main/VERSION`.replace("VERSION", "dist/latest.json"), 600_000);
  const apps = await cachedJson(env, "apps/index.json", `${RAW}/pour-apps/main/index.json`);
  return {
    formulae: index?.formulae ?? 8658,
    casks: index?.casks ?? 7783,
    synced_at: index?.synced_at ?? null,
    version: release?.version ?? null,
    apps: apps?.casks?.filter((c) => c.url)?.length ?? 11,
    appsAll: apps?.casks ?? [],
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/pour" || path === "/") {
      const s = await stats(env);
      return html(home({ theme: theme(request), stats: s, env, shell: await siteShell(env) }));
    }
    if (!path.startsWith("/pour/")) return notFoundResponse(request, env);
    const rest = path.slice("/pour/".length);

    // ---- machine endpoints
    if (rest === "install" || rest === "install.sh") {
      return (await fromR2(env, "releases/install.sh", request, "text/plain; charset=utf-8", 600)) || Response.redirect(`${RAW}/pour/main/install.sh`, 302);
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
      // dl/<asset> is the newest release; dl/v1.2.3/<asset> a pinned one (what the Homebrew tap uses).
      const m = /^dl\/(?:(v[0-9][0-9A-Za-z.-]*)\/)?([A-Za-z0-9._-]+)$/.exec(rest);
      if (!m) return notFoundResponse(request, env);
      const [, ver, asset] = m;
      const key = ver ? `releases/${ver}/${asset}` : `releases/${asset}`;
      const gh = ver ? `${GH}/pour/releases/download/${ver}/${asset}` : `${GH}/pour/releases/latest/download/${asset}`;
      return (await fromR2(env, key, request, "application/octet-stream", ver ? 86400 : 600)) || Response.redirect(gh, 302);
    }
    if (rest.startsWith("registry/")) {
      const file = rest.slice(9).replace(/[^A-Za-z0-9._-]/g, "");
      const ct = file.endsWith(".gz") ? "application/gzip" : "application/json; charset=utf-8";
      return (await fromR2(env, file, request, ct, 300)) || Response.redirect(`${GH}/pour-registry/releases/latest/download/${file}`, 302);
    }
    if (rest === "apps/index.json") {
      return (await fromR2(env, "apps/index.json", request, "application/json; charset=utf-8", 300)) || Response.redirect(`${RAW}/pour-apps/main/index.json`, 302);
    }
    if (rest === "api/stats") {
      const s = await stats(env);
      return json({ formulae: s.formulae, casks: s.casks, apps: s.apps, synced_at: s.synced_at, version: s.version, total: s.formulae + s.casks });
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
  },
};

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
      const r = await fetch(`${GH}/pour-registry/releases/latest/download/search.json`, { headers: { "user-agent": UA }, cf: { cacheTtl: 600, cacheEverything: true } });
      if (r.ok) data = await r.json();
    } catch {}
  }
  const apps = await cachedJson(env, "apps/index.json", `${RAW}/pour-apps/main/index.json`);
  const rows = (data?.rows || []).map((r) => ({ name: r[0], kind: r[1] === 0 ? "formula" : "cask", desc: r[2] || "", version: r[3] || "", homepage: r[4] || "", source: "homebrew" }));
  for (const c of apps?.casks || []) rows.push({ name: c.token, kind: "cask", desc: c.desc, version: c.version, homepage: c.homepage, source: "jks-sys/pour-apps" });
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
