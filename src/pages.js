// HTML for the Pour pages. One layout, the same header as the rest of
// ipconfig.co.network, gold on warm neutrals, no pink.
// Copyright (c) 2026 Jagadeesh Kumar S. All rights reserved.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const n = (x) => Number(x || 0).toLocaleString("en-US");
const BY = "Jagadeesh Kumar S";

export function layout({ title, description, path, theme, body, stats, env, jsonld, noindex }) {
  const host = env?.SITE_HOST || "ipconfig.co.network";
  const canonical = `https://${host}/pour${path || ""}`;
  return `<!doctype html>
<html lang="en" data-theme="${theme}" data-server-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pour">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://${host}/pour/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#d9a441">
<link rel="icon" href="/pour/pour.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/pour/style.css">
<script type="application/ld+json">${JSON.stringify(jsonld || softwareJsonLd(stats, host))}</script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${env?.CF_ANALYTICS_TOKEN || ""}"}'></script>
</head>
<body class="pour-body">
<a class="skip" href="#main">Skip to content</a>
${header(path)}
<main id="main" class="pour-main">
${body}
</main>
${footer(stats)}
<script src="/pour/pour.js" defer></script>
</body>
</html>`;
}

function softwareJsonLd(stats, host) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pour",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows, FreeBSD, Haiku, iOS",
    description: "The Homebrew-compatible package manager that installs in milliseconds.",
    url: `https://${host}/pour`,
    softwareVersion: stats?.version || undefined,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: BY, url: `https://${host}/about` },
    downloadUrl: "https://github.com/JKS-sys/pour-13-Oct-2026/releases/latest",
  };
}

function header(path) {
  const on = (p) => (path === p ? ' aria-current="page"' : "");
  return `<header class="bar">
  <a class="mark" href="/">ipconfig.co.network</a>
  <nav class="tools pour-nav">
    <a href="/pour"${on("")}><strong>Pour</strong></a>
    <a href="/pour/search"${on("/search")}>Packages</a>
    <a href="/pour/apps"${on("/apps")}>Apps</a>
    <a href="/pour/docs"${on("/docs")}>Docs</a>
    <a href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">GitHub</a>
    <a href="/sponsor">Sponsor</a>
    <a href="/about">About</a>
  </nav>
  <div class="head-tools">
    <button class="sound-btn" type="button" data-sound-toggle data-compact aria-pressed="true" title="Sounds on — click to mute" aria-label="Sounds on — click to mute"><svg class="ui-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="wave w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="wave w2" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/></svg></button>
    <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Theme: automatic, light or dark" title="Cycles automatic → light → dark"><span class="theme-dot" aria-hidden="true"></span><span data-theme-label>auto</span></button>
  </div>
</header>`;
}

function footer(stats) {
  return `<footer class="pour-foot">
  <p><strong>Pour</strong>${stats?.version ? ` ${esc(stats.version)}` : ""} · By <a href="/about">${BY}</a> · a creator in Chennai · <a href="/sponsor">Sponsor the work</a></p>
  <p class="pour-foot-links"><a href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">pour</a> · <a href="https://github.com/JKS-sys/pour-registry-13-Oct-2026" target="_blank" rel="noopener">pour-registry</a> · <a href="https://github.com/JKS-sys/pour-apps-13-Oct-2026" target="_blank" rel="noopener">pour-apps</a> · <a href="https://github.com/JKS-sys/pour-site-13-Oct-2026" target="_blank" rel="noopener">pour-site</a> · <a href="https://github.com/JKS-sys/pour-action-13-Oct-2026" target="_blank" rel="noopener">pour-action</a> · <a href="https://github.com/JKS-sys/pour-bench-13-Oct-2026" target="_blank" rel="noopener">pour-bench</a></p>
  <p class="pour-foot-small">Pour installs the bottles Homebrew builds and publishes; it is not affiliated with Homebrew. Package names, descriptions and bottles belong to their projects. <a href="/terms">Terms</a> · <a href="/privacy-policy">Privacy</a> · <a href="/contact-us">Contact</a></p>
</footer>`;
}

const INSTALL = "curl -fsSL https://ipconfig.co.network/pour/install | sh";

function copyBlock(cmd, id) {
  return `<div class="pour-cmd" id="${id}"><pre><code><span class="pour-prompt">$</span> ${esc(cmd)}</code></pre><button class="pour-copy" type="button" data-copy="${esc(cmd)}" aria-label="Copy to clipboard">Copy</button></div>`;
}

export function logoSvg(size = 96) {
  return `<svg class="pour-logo" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true">
  <defs><linearGradient id="pg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8bd66"/><stop offset="1" stop-color="#b07d1e"/></linearGradient></defs>
  <g class="pour-bottle"><path d="M58 8h12v10l6 6v22a6 6 0 0 1-6 6H58a6 6 0 0 1-6-6V24l6-6z" fill="url(#pg)"/><rect x="60" y="4" width="8" height="6" rx="1.5" fill="#8a5a00"/></g>
  <path class="pour-stream" d="M57 46c-6 6-14 10-22 18" stroke="url(#pg)" stroke-width="4" stroke-linecap="round" fill="none"/>
  <g class="pour-glass"><path d="M16 56h34l-4 30H20z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><clipPath id="gc"><path d="M16 56h34l-4 30H20z"/></clipPath><rect class="pour-liquid" x="12" y="62" width="44" height="30" fill="url(#pg)" clip-path="url(#gc)"/></g>
</svg>`;
}

export function home({ theme, stats, env }) {
  const total = (stats.formulae || 0) + (stats.casks || 0);
  const body = `
<section class="pour-hero">
  ${logoSvg(120)}
  <h1>Pour</h1>
  <p class="pour-tag">The Homebrew-compatible package manager that installs in milliseconds.</p>
  <p class="pour-sub">Every one of Homebrew's <strong>${n(stats.formulae)}</strong> formulae and <strong>${n(stats.casks)}</strong> casks, poured into <code>/opt/pour</code> by a 3&nbsp;MB Rust binary. No Ruby, no waiting. macOS, Linux, WSL and ChromeOS pour bottles; Windows, FreeBSD, Haiku and iOS run the same <code>pour</code> for search, info and <a href="/pour/apps">${BY.split(" ")[0]}'s apps</a>.</p>
  <div class="pour-platforms" aria-label="Runs on">
    <span>macOS</span><span>Linux</span><span>WSL</span><span>ChromeOS</span><span>Windows</span><span>FreeBSD</span><span>Haiku</span><span>iOS</span>
  </div>
</section>

<section class="sheet pour-sheet" id="install">
  <h2>🍶 Install Pour</h2>
  ${copyBlock(INSTALL, "install-cmd")}
  <p>Paste that in Terminal (macOS), a Linux shell, WSL or the ChromeOS Linux container. The script says what it will do, verifies the download against the release feed, creates <code>/opt/pour</code> (your password, once) and fetches the index. <a href="/pour/docs#install">Other ways to install</a>, including Homebrew itself: <code>brew install jks-sys/tap/pour</code>.</p>
  <div class="pour-term" id="demo" data-demo="install">
    <div class="pour-term-bar"><span></span><span></span><span></span><em>Terminal</em></div>
    <pre class="pour-term-body" aria-live="polite"></pre>
  </div>
</section>

<section class="sheet pour-sheet">
  <h2>🔧 What does Pour do?</h2>
  <p>Pour installs the command-line tools, libraries and applications you need — the same ones Homebrew does, from the same bottles — and keeps all of them in one place.</p>
  <p>Pour never writes outside its <strong>prefix</strong>. Each package lands in its own <strong>keg</strong> inside the <strong>Cellar</strong>, and its files are linked into the prefix: <code>/opt/pour</code> on every system where the path fits (it is shorter than Homebrew's on purpose — every path rewritten inside a bottle shrinks, so binaries are patched in place and in parallel).</p>
  ${copyBlock("pour install ffmpeg wget", "c1")}
  <pre class="pour-out"><code>==> Dependencies: libunistring 1.4.2, libidn2 2.3.8, libpsl 0.23.3, ca-certificates 2026-09-25 …
==> Installing: ffmpeg 9.0.2_1, wget 1.25.0_2
==> Downloading 58 bottles
==> Pouring 58 bottles
==> Installing 58 packages
  🍶 ffmpeg 9.0.2_1 poured 9 ms
✓ 58 packages in 6.60 s · 128.0 MB downloaded</code></pre>
  ${copyBlock("pour install --cask firefox", "c2")}
  <p>Casks are macOS applications: Pour downloads the disk image, places <code>Firefox.app</code> in <code>/Applications</code> and remembers how to remove it, caches and preferences included (<code>pour uninstall --zap firefox</code>).</p>
</section>

<section class="sheet pour-sheet">
  <h2>⚡ Why it is fast</h2>
  <div class="pour-grid">
    <article><h3>One binary, no interpreter</h3><p>Pour is a 3&nbsp;MB Rust program. <code>pour info jq</code> maps a binary index and answers in under 10&nbsp;ms, process start included; Homebrew boots Ruby, loads the API and answers in 0.6–0.8&nbsp;s.</p></article>
    <article><h3>Parallel downloads</h3><p>Every bottle an install needs is fetched at once from Homebrew's registry, verified with SHA-256 while it streams.</p></article>
    <article><h3>Relocation in process</h3><p>Mach-O load commands, ELF interpreters and rpaths and every text file are rewritten by Pour itself, in parallel — no <code>install_name_tool</code> process per file — then re-signed once.</p></article>
    <article><h3>A store you never pay for twice</h3><p>A bottle is unpacked and relocated once. Installing it again is an APFS clone on macOS, a symlink on Linux: a warm <code>pour install jq</code> takes about 6&nbsp;ms, <code>wget</code> with its dependencies about 300&nbsp;ms (Homebrew: 5&nbsp;s and 46&nbsp;s on the same machine).</p></article>
    <article><h3>Post-install that does not wait</h3><p>Post-install steps run on their own threads, each after the steps of its dependencies, so one slow package never holds up the rest.</p></article>
    <article><h3>Honest numbers</h3><p>Cold installs are bound by your connection. <a href="https://github.com/JKS-sys/pour-bench-13-Oct-2026" target="_blank" rel="noopener">pour-bench</a> measures Pour against Homebrew on your own machine and prints both.</p></article>
  </div>
</section>

<section class="sheet pour-sheet" id="packages">
  <h2>📦 ${n(total)} packages, kept in sync</h2>
  <p>The <a href="https://github.com/JKS-sys/pour-registry-13-Oct-2026" target="_blank" rel="noopener">Pour registry</a> re-indexes Homebrew's formulae and casks every four hours and logs what it registered and de-registered${stats.synced_at ? ` — last sync <time datetime="${esc(stats.synced_at)}">${esc(stats.synced_at.replace("T", " ").replace("Z", " UTC"))}</time>` : ""}. <code>pour update</code> fetches the new index in one request.</p>
  <form class="pour-search" action="/pour/search" method="get" role="search">
    <input type="search" name="q" placeholder="Search ${n(total)} formulae and casks…" aria-label="Search packages" autocomplete="off">
    <button type="submit">Search</button>
  </form>
  ${copyBlock("pour search music", "c3")}
  ${copyBlock("pour info python", "c4")}
</section>

<section class="sheet pour-sheet" id="apps">
  <h2>🎛 ${BY.split(" ")[0]}'s apps, one command away</h2>
  <p>Pour ships with a second registry, <a href="https://github.com/JKS-sys/pour-apps-13-Oct-2026" target="_blank" rel="noopener">pour-apps</a>: the desktop apps made here — Peek, Voxo, Nib, Keel, Swep, Grab, Dial, Mend, Twig, Cine, Veil — on macOS, Windows, Linux and FreeBSD, always at the version their release feed says.</p>
  <div class="pour-apps-row">
    ${(stats.appsAll || []).filter((c) => c.url).map((c) => `<a class="pour-app" href="/pour/p/${esc(c.token)}"><strong>${esc(c.name?.[0] || c.token)}</strong><span>${esc(c.desc)}</span><code>pour install ${esc(c.token)}</code></a>`).join("")}
  </div>
  <p><a href="/pour/apps">All apps and how each one installs →</a></p>
</section>

<section class="sheet pour-sheet">
  <h2>📋 Brewfiles work</h2>
  <p>Pour reads the <code>Brewfile</code> you already have: <code>brew "ffmpeg"</code>, <code>cask "firefox"</code> and <code>tap</code> lines install the same way.</p>
  ${copyBlock("pour bundle", "c5")}
  <p>Moving over? <code>pour migrate</code> installs everything Homebrew has on the machine and leaves Homebrew untouched; both can live side by side because Pour never writes to <code>/opt/homebrew</code>.</p>
</section>

<section class="sheet pour-sheet" id="everywhere">
  <h2>🌍 One pour, every system</h2>
  <table class="pour-table">
    <thead><tr><th>System</th><th>Bottles (formulae)</th><th>Casks / apps</th><th>Get it</th></tr></thead>
    <tbody>
      <tr><td>macOS 11+ (Apple Silicon, Intel)</td><td>Yes</td><td>All Homebrew casks + the apps</td><td><code>curl … | sh</code></td></tr>
      <tr><td>Linux x86_64, arm64 · WSL · ChromeOS</td><td>Yes (Linux bottles)</td><td>The apps (.deb, AppImage)</td><td><code>curl … | sh</code></td></tr>
      <tr><td>Windows 10/11</td><td>Through WSL</td><td>The apps (installers)</td><td><a href="/pour/dl/pour-windows-x86_64.exe">pour-windows-x86_64.exe</a></td></tr>
      <tr><td>FreeBSD 14</td><td>No bottles exist — search and info work</td><td>The apps that ship a FreeBSD build</td><td><a href="/pour/dl/pour-freebsd-x86_64">pour-freebsd-x86_64</a></td></tr>
      <tr><td>Haiku</td><td>No bottles exist — search and info work</td><td>—</td><td><code>cargo install --git https://github.com/JKS-sys/pour-13-Oct-2026 pour</code></td></tr>
      <tr><td>iOS (iSH)</td><td>No bottles exist — search and info work</td><td>—</td><td><code>curl … | sh</code> inside iSH</td></tr>
    </tbody>
  </table>
  <p class="pour-note">Homebrew publishes bottles for macOS and Linux only; Pour says so instead of pretending. On the other systems the same binary gives you the registry, the apps, and a path to WSL.</p>
</section>

<section class="sheet pour-sheet pour-sponsor">
  <h2>💛 Keep the pour going</h2>
  <p>Pour is made by one creator. If it saves you time, <a href="/sponsor">sponsor the work</a> — it pays for the hosting that keeps the index fresh every four hours.</p>
  <p><a class="pour-btn" href="https://razorpay.me/@NSBJKS" target="_blank" rel="noopener">Sponsor via Razorpay</a> <a class="pour-btn pour-btn-ghost" href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">Star on GitHub</a></p>
</section>`;
  return layout({ title: "Pour — the Homebrew-compatible package manager that installs in milliseconds", description: `Pour installs every Homebrew formula and cask from a 3 MB Rust binary: ${n(total)} packages, parallel downloads, a content-addressed store, warm installs in milliseconds. macOS, Linux, WSL, ChromeOS, Windows, FreeBSD, Haiku, iOS. By ${BY}.`, path: "", theme, body, stats, env });
}

export function appsPage({ theme, stats, env }) {
  const apps = stats.appsAll || [];
  const rows = apps.map((c) => {
    const others = (c.pour?.installers || []).map((i) => i.platform).join(", ");
    const released = !!c.url;
    return `<article class="pour-card${released ? "" : " pour-card-soon"}">
      <h3><a href="/pour/p/${esc(c.token)}">${esc(c.name?.[0] || c.token)}</a> <small>${released ? esc(c.version) : "coming soon"}</small></h3>
      <p>${esc(c.desc)}</p>
      ${released ? copyBlock(`pour install ${c.token}`, `app-${c.token}`) : `<p class="pour-note">Not released yet — watch <a href="${esc(c.homepage)}">${esc(c.homepage.replace("https://", ""))}</a>.</p>`}
      <p class="pour-small">macOS (Apple Silicon${c.variations && Object.keys(c.variations).length ? ", Intel" : ""})${others ? ` · ${esc(others)}` : ""} · <a href="${esc(c.homepage)}">product page</a>${c.pour?.releases ? ` · <a href="${esc(c.pour.releases)}" target="_blank" rel="noopener">releases</a>` : ""}</p>
    </article>`;
  }).join("");
  const body = `<section class="pour-hero pour-hero-small">${logoSvg(72)}<h1>The apps</h1><p class="pour-tag">${BY}'s desktop apps, registered for Pour. Every install reads the app's live release feed, so you always get the newest build.</p></section>
<section class="sheet pour-sheet"><div class="pour-cards">${rows}</div>
<h2>How it works on each system</h2>
<ul class="pour-list">
<li><strong>macOS</strong> — the <code>.app</code> is placed in <code>/Applications</code>; the Gatekeeper quarantine mark is cleared because these apps are signed with the creator's own identity, not notarised with Apple. <code>pour uninstall --zap &lt;app&gt;</code> removes preferences and caches too.</li>
<li><strong>Linux and ChromeOS</strong> — a <code>.deb</code> through apt/dpkg where available, else the AppImage goes into <code>/opt/pour/Caskroom</code> with a launcher in <code>/opt/pour/bin</code>.</li>
<li><strong>Windows</strong> — the signed installer runs silently; <code>pour</code> itself keeps the receipt.</li>
<li><strong>FreeBSD</strong> — the apps that ship a FreeBSD build are unpacked into the Caskroom.</li>
</ul>
${copyBlock("pour tap list", "tap")}
<p>pour-apps is a normal Pour registry (a JSON file). Anyone can publish their own: <code>pour tap add you/apps https://…/index.json</code>.</p></section>`;
  return layout({ title: "Apps — Pour", description: `Install ${BY}'s apps — Peek, Voxo, Nib, Keel, Swep, Grab, Dial, Mend, Twig, Cine, Veil — with one Pour command on macOS, Windows, Linux and FreeBSD.`, path: "/apps", theme, body, stats, env });
}

export function searchPage({ theme, stats, env, q, results }) {
  const total = (stats.formulae || 0) + (stats.casks || 0);
  const rows = (results.rows || []).map((r) => `<li class="pour-result"><a href="/pour/p/${esc(r.name)}"><strong>${esc(r.name)}</strong></a> <span class="pour-kind pour-kind-${r.kind}">${r.kind}</span>${r.source !== "homebrew" ? ` <span class="pour-kind pour-kind-app">app</span>` : ""} <small>${esc(r.version)}</small><p>${esc(r.desc)}</p></li>`).join("");
  const body = `<section class="pour-hero pour-hero-small">${logoSvg(72)}<h1>Packages</h1><p class="pour-tag">${n(total)} formulae and casks, the same names Homebrew uses.</p>
<form class="pour-search" action="/pour/search" method="get" role="search"><input type="search" name="q" value="${esc(q)}" placeholder="Search ${n(total)} packages…" aria-label="Search packages" autofocus autocomplete="off"><button type="submit">Search</button></form></section>
<section class="sheet pour-sheet">${q ? `<p class="pour-note">${n(results.total)} result${results.total === 1 ? "" : "s"} for “${esc(q)}”${results.total > (results.rows || []).length ? ` — showing the first ${results.rows.length}` : ""}.</p><ul class="pour-results">${rows || "<li>No package has that name or description. Try fewer words.</li>"}</ul>` : `<p>Type a name or a few words from a description. Results are ranked the way <code>pour search</code> ranks them.</p>${copyBlock("pour search image viewer", "s1")}`}</section>`;
  return layout({ title: q ? `“${q}” — Pour packages` : "Packages — Pour", description: `Search ${n(total)} Homebrew formulae and casks and ${BY}'s apps, all installable with Pour.`, path: "/search", theme, body, stats, env, noindex: !!q });
}

export function packagePage({ theme, stats, env, name, app, formula, cask }) {
  let body, title, description;
  if (app) {
    const released = !!app.url;
    const others = (app.pour?.installers || []).map((i) => `<li>${esc(i.platform)} — ${esc(i.kind)} <a href="${esc(i.url)}" rel="nofollow">download</a></li>`).join("");
    title = `${app.name?.[0] || app.token} — Pour`;
    description = `${app.desc}. Install with pour install ${app.token}.`;
    body = `<section class="pour-hero pour-hero-small"><h1>${esc(app.name?.[0] || app.token)} <small>${released ? esc(app.version) : "coming soon"}</small></h1><p class="pour-tag">${esc(app.desc)}</p><p><a href="${esc(app.homepage)}">${esc(app.homepage)}</a> · registry <code>jks-sys/pour-apps</code></p></section>
<section class="sheet pour-sheet">${released ? copyBlock(`pour install ${app.token}`, "p1") : `<p class="pour-note">${esc(app.caveats || "Not released yet.")}</p>`}
${released ? `<h2>Downloads Pour knows about</h2><ul class="pour-list"><li>macOS Apple Silicon — <a href="${esc(app.url)}" rel="nofollow">download</a></li>${app.variations?.sonoma ? `<li>macOS Intel — <a href="${esc(app.variations.sonoma.url)}" rel="nofollow">download</a></li>` : ""}${others}</ul><p class="pour-small">Pour checks <code>${esc(app.pour?.livecheck || "")}</code> before every install, so the version above may already be newer.</p>` : ""}
<h2>Remove it</h2>${copyBlock(`pour uninstall --zap ${app.token}`, "p2")}</section>`;
  } else {
    const f = formula, c = cask;
    const pkgName = f?.name || c?.token || name;
    const desc = f?.desc || c?.desc || "";
    title = `${pkgName} — Pour`;
    description = `${desc}. Install with pour install ${f ? "" : "--cask "}${pkgName}.`;
    const bottles = f?.bottle?.stable?.files ? Object.keys(f.bottle.stable.files) : [];
    const deps = f?.dependencies || [];
    body = `<section class="pour-hero pour-hero-small"><h1>${esc(pkgName)} <small>${esc(f?.versions?.stable || c?.version || "")}</small></h1><p class="pour-tag">${esc(desc)}</p><p>${f?.homepage || c?.homepage ? `<a href="${esc(f?.homepage || c?.homepage)}" target="_blank" rel="noopener">${esc(f?.homepage || c?.homepage)}</a>` : ""}${f?.license ? ` · ${esc(f.license)}` : ""}${f && c ? " · also a cask" : ""}</p></section>
<section class="sheet pour-sheet">
${f ? copyBlock(`pour install ${pkgName}`, "p1") : ""}${c ? copyBlock(`pour install --cask ${pkgName}`, "p1c") : ""}
${f ? `<h2>Formula</h2><ul class="pour-list">${deps.length ? `<li><strong>Depends on</strong> ${deps.map((d) => `<a href="/pour/p/${esc(d)}">${esc(d)}</a>`).join(", ")}</li>` : ""}${bottles.length ? `<li><strong>Bottles</strong> ${esc(bottles.join(", "))}</li>` : "<li>No bottle — Pour installs bottles only; Homebrew would build this from source.</li>"}${f.keg_only ? "<li>Keg-only: not linked into the prefix.</li>" : ""}${f.deprecated ? `<li class="pour-warn">Deprecated${f.deprecation_reason ? `: ${esc(f.deprecation_reason)}` : ""}</li>` : ""}${f.disabled ? `<li class="pour-warn">Disabled${f.disable_reason ? `: ${esc(f.disable_reason)}` : ""}</li>` : ""}${f.caveats ? `<li><strong>Caveats</strong><pre class="pour-out"><code>${esc(f.caveats)}</code></pre></li>` : ""}</ul>` : ""}
${c ? `<h2>Cask</h2><ul class="pour-list"><li><strong>Name</strong> ${esc((c.name || []).join(", "))}</li><li><strong>Version</strong> ${esc(c.version)}${c.auto_updates ? " (updates itself)" : ""}</li><li><strong>Installs</strong> ${esc(JSON.stringify((c.artifacts || []).flatMap((a) => Object.entries(a).filter(([k]) => ["app", "pkg", "binary", "suite"].includes(k)).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.filter((x) => typeof x === "string").join(", ") : v}`))))}</li>${c.depends_on?.macos ? `<li><strong>macOS</strong> ${esc(JSON.stringify(c.depends_on.macos))}</li>` : ""}${c.caveats ? `<li><strong>Caveats</strong><pre class="pour-out"><code>${esc(c.caveats)}</code></pre></li>` : ""}</ul>` : ""}
<p class="pour-small">Metadata from <a href="https://formulae.brew.sh/${f ? "formula" : "cask"}/${esc(pkgName)}" target="_blank" rel="noopener">formulae.brew.sh</a>; the bottle comes from Homebrew's build farm. Pour only downloads and places it.</p></section>`;
  }
  return layout({ title, description, path: `/p/${name}`, theme, body, stats, env });
}

export function docsPage({ theme, stats, env }) {
  const cmd = (c, d) => `<tr><td><code>${esc(c)}</code></td><td>${d}</td></tr>`;
  const body = `<section class="pour-hero pour-hero-small">${logoSvg(72)}<h1>Docs</h1><p class="pour-tag">Everything <code>pour</code> does, on one page.</p></section>
<section class="sheet pour-sheet" id="install"><h2>Install</h2>${copyBlock(INSTALL, "d1")}
<p>Or with Homebrew: ${copyBlock("brew install jks-sys/tap/pour", "d2")}</p>
<p>Or a plain download from <a href="https://github.com/JKS-sys/pour-13-Oct-2026/releases/latest" target="_blank" rel="noopener">GitHub Releases</a> (also mirrored at <code>/pour/dl/&lt;file&gt;</code> here): <code>pour-macos-arm64</code>, <code>pour-macos-x86_64</code>, <code>pour-linux-x86_64</code>, <code>pour-linux-arm64</code>, <code>pour-linux-i686</code> (iSH), <code>pour-windows-x86_64.exe</code>, <code>pour-windows-arm64.exe</code>, <code>pour-freebsd-x86_64</code>. Put it on your PATH, then <code>pour init</code>.</p>
<p>Haiku and anything else with Rust: <code>cargo install --git https://github.com/JKS-sys/pour-13-Oct-2026 pour</code>.</p>
<p>Verify a download: every release ships <code>SHA256SUMS</code> and the feed at <a href="/pour/releases/latest.json">/pour/releases/latest.json</a> carries each file's digest; <code>install.sh</code> checks it before installing. In CI: <code>uses: JKS-sys/pour-action-13-Oct-2026@v1</code>.</p></section>
<section class="sheet pour-sheet"><h2>Commands</h2><table class="pour-table pour-cmds"><tbody>
${cmd("pour install NAME…", "Pour formulae (and their dependencies) or casks. <code>--cask</code>, <code>--formula</code>, <code>--reinstall</code>, <code>--only-dependencies</code>, <code>--overwrite</code>, <code>-j N</code> parallel downloads, <code>--dry-run</code>.")}
${cmd("pour uninstall NAME…", "Remove; <code>--zap</code> also removes an app's preferences and caches; <code>--ignore-dependencies</code>.")}
${cmd("pour upgrade [NAME…]", "Upgrade what is outdated. <code>--greedy</code> includes apps that update themselves.")}
${cmd("pour update", "Fetch the newest index (one conditional request).")}
${cmd("pour search WORDS", "Names and descriptions, ranked; <code>--cask</code> / <code>--formula</code>.")}
${cmd("pour info NAME", "Everything about a package; <code>--json</code> for scripts.")}
${cmd("pour list / outdated / leaves / deps / uses", "What is installed and how it hangs together.")}
${cmd("pour link / unlink / pin / unpin", "Control the prefix symlinks and hold versions.")}
${cmd("pour bundle [install -f Brewfile | dump]", "Brewfiles, as Homebrew reads them.")}
${cmd("pour migrate", "Install everything Homebrew has on this machine.")}
${cmd("pour tap add NAME URL", "Add a registry (a JSON file in Homebrew's API shape, like pour-apps).")}
${cmd("pour doctor / cleanup / env", "Check the install, free unused store entries, show prefix and index age.")}
${cmd("pour init / shellenv / self-update / completions SHELL", "Set up the prefix, print the PATH line, update Pour itself, shell completions.")}
</tbody></table></section>
<section class="sheet pour-sheet"><h2>How Pour installs a formula</h2><ol class="pour-list">
<li><strong>Plan.</strong> The binary index resolves the name (aliases and old names included) and walks run-time dependencies for your system — Linux adds what <code>uses_from_macos</code> supplies on macOS.</li>
<li><strong>Fetch.</strong> Bottles come from <code>ghcr.io/homebrew/core</code>, all at once, verified by SHA-256 as they stream. The bottle manifest's <code>sh.brew.tab</code> tells Pour which files need relocation.</li>
<li><strong>Pour.</strong> Each bottle is unpacked into the store (<code>store/&lt;sha256&gt;</code>) and relocated there once: <code>@@HOMEBREW_PREFIX@@</code> placeholders and Homebrew's build prefix are rewritten in text files, Mach-O load commands (then re-signed) and ELF interpreters/rpaths. Pour's prefix is never longer than Homebrew's, so every rewrite fits in place.</li>
<li><strong>Place.</strong> The keg appears in the Cellar as an APFS clone (macOS) or a symlink to the store (Linux), is linked into the prefix the way Homebrew links, and gets a receipt (<code>.pour-receipt.json</code> plus a Homebrew-style <code>INSTALL_RECEIPT.json</code>).</li>
<li><strong>Finish.</strong> Homebrew's declarative post-install steps run natively, in parallel, after the steps of each package's dependencies.</li></ol>
<h2>Where things live</h2><pre class="pour-out"><code>/opt/pour/
  bin lib include share etc opt     links into kegs (like Homebrew)
  Cellar/&lt;name&gt;/&lt;version&gt;/         kegs
  Caskroom/&lt;token&gt;/&lt;version&gt;/      app receipts
  store/&lt;sha256&gt;/                  unpacked, relocated bottles (shared)
  cache/downloads/                 bottles and app downloads
  var/pour/index.pour              the index · var/pour/taps/ registries</code></pre>
<p>Environment: <code>POUR_PREFIX</code> (keep it 13 characters or fewer on macOS), <code>POUR_CACHE</code>, <code>POUR_INDEX_URL</code>, <code>POUR_CA_BUNDLE</code> / <code>SSL_CERT_FILE</code> for corporate proxies, <code>HTTPS_PROXY</code>.</p></section>
<section class="sheet pour-sheet"><h2>Pour and Homebrew</h2><p>Pour is a client for the Homebrew ecosystem: it installs the bottles Homebrew's build farm compiles, tests and publishes, and reads Homebrew's public JSON API to know about them. Pour does not build from source, and it does not change anything under <code>/opt/homebrew</code>. If a formula has no bottle for your system, Pour says so and points you to Homebrew.</p><p>Pour is made by ${BY} and is not affiliated with Homebrew. Source, under a source-available licence: <a href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">github.com/JKS-sys/pour-13-Oct-2026</a>.</p></section>`;
  return layout({ title: "Docs — Pour", description: "How to install Pour, every command, how a bottle is poured, and where files live.", path: "/docs", theme, body, stats, env });
}

export function notFound({ theme, stats, env, name }) {
  const body = `<section class="pour-hero pour-hero-small">${logoSvg(72)}<h1>Nothing poured here</h1><p class="pour-tag">${name ? `No formula, cask or app is called “${esc(name)}”.` : "That page does not exist."}</p><form class="pour-search" action="/pour/search" method="get" role="search"><input type="search" name="q" value="${esc(name || "")}" placeholder="Search packages…" aria-label="Search packages"><button type="submit">Search</button></form><p><a href="/pour">Back to Pour</a></p></section>`;
  return layout({ title: "Not found — Pour", description: "Page not found.", path: "/404", theme, body, stats, env, noindex: true });
}
