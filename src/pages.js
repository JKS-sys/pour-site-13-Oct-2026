import { pourLogoSvg } from "./pour-logo.js";
// HTML for the Pour pages. One layout, the same header as the rest of
// ipconfig.co.network, gold on warm neutrals, no pink.
// Copyright (c) 2026 Jagadeesh Kumar S. All rights reserved.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const n = (x) => Number(x || 0).toLocaleString("en-US");
const BY = "Jagadeesh Kumar S";

export function layout({ title, description, path, theme, body, stats, env, jsonld, noindex, shell }) {
  const host = env?.SITE_HOST || "ipconfig.co.network";
  // The live site's own header, footer, stylesheet and scripts (fetched by the
  // Worker and cached) so every Pour page looks exactly like the rest of the
  // site, even after the site changes. The built-in shell is the fallback.
  const live = shell && shell.header && shell.footer ? shell : null;
  const canonical = `https://${host}/pour${path || ""}`;
  return `<!doctype html>
<html lang="en" data-theme="${theme}" data-server-theme="${theme}" data-apps="Peek:gold Voxo:violet Nib:orange Keel:blue Swep:teal Grab:red Dial:cyan Mend:lime Twig:green Cine:sky Veil:indigo Pour:amber">
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
<link rel="preload" href="/fonts/baskerville-400.woff2" as="font" type="font/woff2" crossorigin>
${live ? live.head : '<link rel="stylesheet" href="/styles.css">'}
<link rel="stylesheet" href="/pour/style.css">
<script>document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(jsonld || softwareJsonLd(stats, host))}</script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${env?.CF_ANALYTICS_TOKEN || ""}"}'></script>
</head>
<body class="pour-body"${live ? "" : ' data-shell="fallback"'}>
<a class="skip" href="#main">Skip to content</a>
${live ? live.header : header(path)}
<main id="main" class="pour-main">
<div class="pour-wrap">
${body}
</div>
</main>
${live ? live.footer : footer(stats)}
${live ? live.scripts : ""}
<script src="/pour/pour-logo.js" defer></script>
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
    <a class="nav-signin" href="/account/login" title="Sign in — or sign up free with just your email">Sign in</a>
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

const HUES = ["gold", "teal", "blue", "violet", "orange", "cyan", "lime", "sky"];
let hueAt = 0;
function copyBlock(cmd, id) {
  const hue = HUES[hueAt++ % HUES.length];
  return `<div class="prompt pour-prompt-box hue-${hue}" id="${id}"><code>${esc(cmd)}</code><button class="copy" type="button" data-copy="${esc(cmd)}" aria-label="Copy to clipboard">copy</button></div>`;
}
/** A section heading the way every page on the site draws it: a coloured rule with the words on it. */
const rule = (text) => `<h2 class="rule"><span>${esc(text)}</span></h2>`;
/** The page banner, left-aligned like the rest of the site, with the pouring bottle beside it. */
function hero({ eyebrow, title, tag, sub = "", extra = "", logo = 112 }) {
  return `<section class="hero pour-hero">
  <div class="pour-hero-text">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    ${tag ? `<p class="lede hero-lede pour-tag">${tag}</p>` : ""}
    ${sub ? `<p class="pour-sub">${sub}</p>` : ""}
    ${extra}
  </div>
  <div class="pour-hero-art" aria-hidden="true">${logoSvg(logo)}</div>
</section>`;
}

/** The animated Pour logo (pour-logo.js plays its sounds in step). */
export function logoSvg(size = 96) { return pourLogoSvg(size); }

export function home({ theme, stats, env , shell }) {
  const total = (stats.formulae || 0) + (stats.casks || 0);
  const body = `
${hero({ eyebrow: "Pour · the package manager", title: "Pour", tag: "The Homebrew-compatible package manager that installs in milliseconds.",
  sub: `Every one of Homebrew's <strong>${n(stats.formulae)}</strong> formulae and <strong>${n(stats.casks)}</strong> casks, poured into <code>/opt/pour</code> by a 3&nbsp;MB Rust binary. No Ruby, no waiting. macOS, Linux, WSL and ChromeOS pour bottles; Windows, FreeBSD, Haiku and iOS run the same <code>pour</code> for search, info and <a href="/pour/apps">${BY.split(" ")[0]}'s apps</a>.`,
  extra: `<div class="pour-platforms" aria-label="Runs on"><span class="hue-blue">macOS</span><span class="hue-teal">Linux</span><span class="hue-violet">WSL</span><span class="hue-lime">ChromeOS</span><span class="hue-sky">Windows</span><span class="hue-orange">FreeBSD</span><span class="hue-cyan">Haiku</span><span class="hue-gold">iOS</span></div>`, logo: 132 })}

<section class="sheet pour-sheet" id="install">
  ${rule('Install Pour')}
  ${copyBlock(INSTALL, "install-cmd")}
  <p>Paste that in Terminal (macOS), a Linux shell, WSL or the ChromeOS Linux container. The script says what it will do, verifies the download against the release feed, creates <code>/opt/pour</code> (your password, once) and fetches the index. <a href="/pour/docs#install">Other ways to install</a> — a plain download for every system, or <code>cargo install</code>. Every app made here then installs with <code>pour install &lt;app&gt;</code>.</p>
  <div class="pour-term" id="demo" data-demo="install">
    <div class="pour-term-bar"><span></span><span></span><span></span><em>Terminal</em></div>
    <pre class="pour-term-body" aria-live="polite"></pre>
  </div>
</section>

<section class="sheet pour-sheet">
  ${rule('What does Pour do?')}
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
  ${rule('Why it is fast')}
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
  ${rule(`${n(total)} packages, kept in sync`)}
  <p>The <a href="https://github.com/JKS-sys/pour-registry-13-Oct-2026" target="_blank" rel="noopener">Pour registry</a> re-indexes Homebrew's formulae and casks every four hours and logs what it registered and de-registered${stats.synced_at ? ` — last sync <time datetime="${esc(stats.synced_at)}">${esc(stats.synced_at.replace("T", " ").replace("Z", " UTC"))}</time>` : ""}. <code>pour update</code> fetches the new index in one request.</p>
  <form class="pour-search" action="/pour/search" method="get" role="search">
    <input type="search" name="q" placeholder="Search ${n(total)} formulae and casks…" aria-label="Search packages" autocomplete="off">
    <button type="submit">Search</button>
  </form>
  ${copyBlock("pour search music", "c3")}
  ${copyBlock("pour info python", "c4")}
</section>

<section class="sheet pour-sheet" id="apps">
  ${rule("Jagadeesh's apps, one command away")}
  <p>Pour ships with a second registry, <a href="https://github.com/JKS-sys/pour-apps-13-Oct-2026" target="_blank" rel="noopener">pour-apps</a>: the desktop apps made here — Peek, Voxo, Nib, Keel, Swep, Grab, Dial, Mend, Twig, Cine, Veil — on macOS, Windows, Linux and FreeBSD, always at the version their release feed says.</p>
  <div class="pour-apps-row">
    ${(stats.appsAll || []).filter((c) => c.url).map((c) => `<a class="pour-app" href="/pour/p/${esc(c.token)}"><strong>${esc(c.name?.[0] || c.token)}</strong><span>${esc(c.desc)}</span><code>pour install ${esc(c.token)}</code></a>`).join("")}
  </div>
  <p><a href="/pour/apps">All apps and how each one installs →</a></p>
</section>

<section class="sheet pour-sheet">
  ${rule('Brewfiles work')}
  <p>Pour reads the <code>Brewfile</code> you already have: <code>brew "ffmpeg"</code>, <code>cask "firefox"</code> and <code>tap</code> lines install the same way.</p>
  ${copyBlock("pour bundle", "c5")}
  <p>Moving over? <code>pour migrate</code> installs everything Homebrew has on the machine and leaves Homebrew untouched; both can live side by side because Pour never writes to <code>/opt/homebrew</code>.</p>
</section>

<section class="sheet pour-sheet" id="everywhere">
  ${rule('One pour, every system')}
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
  ${rule('Keep the pour going')}
  <p>Pour is made by one creator. If it saves you time, <a href="/sponsor">sponsor the work</a> — it pays for the hosting that keeps the index fresh every four hours.</p>
  <p><a class="pour-btn" href="https://razorpay.me/@NSBJKS" target="_blank" rel="noopener">Sponsor via Razorpay</a> <a class="pour-btn pour-btn-ghost" href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">Star on GitHub</a></p>
</section>`;
  return layout({ shell, title: "Pour — the Homebrew-compatible package manager that installs in milliseconds", description: `Pour installs every Homebrew formula and cask from a 3 MB Rust binary: ${n(total)} packages, parallel downloads, a content-addressed store, warm installs in milliseconds. macOS, Linux, WSL, ChromeOS, Windows, FreeBSD, Haiku, iOS. By ${BY}.`, path: "", theme, body, stats, env });
}

export function appsPage({ theme, stats, env , shell }) {
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
  const body = `${hero({ eyebrow: "Pour · apps", title: "The apps", tag: `${BY}'s desktop apps, registered for Pour. Every install reads the app's live release feed, so you always get the newest build.`, logo: 84 })}
<section class="sheet pour-sheet"><div class="pour-cards">${rows}</div>
${rule('How it works on each system')}
<ul class="pour-list">
<li><strong>macOS</strong> — the <code>.app</code> is placed in <code>/Applications</code>; the Gatekeeper quarantine mark is cleared because these apps are signed with the creator's own identity, not notarised with Apple. <code>pour uninstall --zap &lt;app&gt;</code> removes preferences and caches too.</li>
<li><strong>Linux and ChromeOS</strong> — a <code>.deb</code> through apt/dpkg where available, else the AppImage goes into <code>/opt/pour/Caskroom</code> with a launcher in <code>/opt/pour/bin</code>.</li>
<li><strong>Windows</strong> — the signed installer runs silently; <code>pour</code> itself keeps the receipt.</li>
<li><strong>FreeBSD</strong> — the apps that ship a FreeBSD build are unpacked into the Caskroom.</li>
</ul>
${copyBlock("pour tap list", "tap")}
<p>pour-apps is a normal Pour registry (a JSON file). Anyone can publish their own: <code>pour tap add you/apps https://…/index.json</code>.</p></section>`;
  return layout({ shell, title: "Apps — Pour", description: `Install ${BY}'s apps — Peek, Voxo, Nib, Keel, Swep, Grab, Dial, Mend, Twig, Cine, Veil — with one Pour command on macOS, Windows, Linux and FreeBSD.`, path: "/apps", theme, body, stats, env });
}

export function searchPage({ theme, stats, env, q, results , shell }) {
  const total = (stats.formulae || 0) + (stats.casks || 0);
  const rows = (results.rows || []).map((r) => `<li class="pour-result"><a href="/pour/p/${esc(r.name)}"><strong>${esc(r.name)}</strong></a> <span class="pour-kind pour-kind-${r.kind}">${r.kind}</span>${r.source !== "homebrew" ? ` <span class="pour-kind pour-kind-app">app</span>` : ""} <small>${esc(r.version)}</small><p>${esc(r.desc)}</p></li>`).join("");
  const body = `${hero({ eyebrow: "Pour · packages", title: "Packages", tag: `${n(total)} formulae and casks, the same names Homebrew uses.`, extra: `<form class="pour-search" action="/pour/search" method="get" role="search"><input type="search" name="q" value="${esc(q)}" placeholder="Search ${n(total)} packages…" aria-label="Search packages" autofocus autocomplete="off"><button type="submit">Search</button></form>`, logo: 84 })}
<section class="sheet pour-sheet">${q ? `<p class="pour-note">${n(results.total)} result${results.total === 1 ? "" : "s"} for “${esc(q)}”${results.total > (results.rows || []).length ? ` — showing the first ${results.rows.length}` : ""}.</p><ul class="pour-results">${rows || "<li>No package has that name or description. Try fewer words.</li>"}</ul>` : `<p>Type a name or a few words from a description. Results are ranked the way <code>pour search</code> ranks them.</p>${copyBlock("pour search image viewer", "s1")}`}</section>`;
  return layout({ shell, title: q ? `“${q}” — Pour packages` : "Packages — Pour", description: `Search ${n(total)} Homebrew formulae and casks and ${BY}'s apps, all installable with Pour.`, path: "/search", theme, body, stats, env, noindex: !!q });
}

export function packagePage({ theme, stats, env, name, app, formula, cask , shell }) {
  let body, title, description;
  if (app) {
    const released = !!app.url;
    const others = (app.pour?.installers || []).map((i) => `<li>${esc(i.platform)} — ${esc(i.kind)} <a href="${esc(i.url)}" rel="nofollow">download</a></li>`).join("");
    title = `${app.name?.[0] || app.token} — Pour`;
    description = `${app.desc}. Install with pour install ${app.token}.`;
    body = `${hero({ eyebrow: "Pour · app", title: `${esc(app.name?.[0] || app.token)} <small>${released ? esc(app.version) : "coming soon"}</small>`, tag: esc(app.desc), extra: `<p><a href="${esc(app.homepage)}">${esc(app.homepage)}</a> · registry <code>jks-sys/pour-apps</code></p>`, logo: 84 })}
<section class="sheet pour-sheet">${released ? copyBlock(`pour install ${app.token}`, "p1") : `<p class="pour-note">${esc(app.caveats || "Not released yet.")}</p>`}
${released ? `${rule('Downloads Pour knows about')}<ul class="pour-list"><li>macOS Apple Silicon — <a href="${esc(app.url)}" rel="nofollow">download</a></li>${app.variations?.sonoma ? `<li>macOS Intel — <a href="${esc(app.variations.sonoma.url)}" rel="nofollow">download</a></li>` : ""}${others}</ul><p class="pour-small">Pour checks <code>${esc(app.pour?.livecheck || "")}</code> before every install, so the version above may already be newer.</p>` : ""}
${rule('Remove it')}${copyBlock(`pour uninstall --zap ${app.token}`, "p2")}</section>`;
  } else {
    const f = formula, c = cask;
    const pkgName = f?.name || c?.token || name;
    const desc = f?.desc || c?.desc || "";
    title = `${pkgName} — Pour`;
    description = `${desc}. Install with pour install ${f ? "" : "--cask "}${pkgName}.`;
    const bottles = f?.bottle?.stable?.files ? Object.keys(f.bottle.stable.files) : [];
    const deps = f?.dependencies || [];
    body = `${hero({ eyebrow: `Pour · ${f ? "formula" : "cask"}`, title: `${esc(pkgName)} <small>${esc(f?.versions?.stable || c?.version || "")}</small>`, tag: esc(desc), extra: `<p>${f?.homepage || c?.homepage ? `<a href="${esc(f?.homepage || c?.homepage)}" target="_blank" rel="noopener">${esc(f?.homepage || c?.homepage)}</a>` : ""}${f?.license ? ` · ${esc(f.license)}` : ""}${f && c ? " · also a cask" : ""}</p>`, logo: 84 })}
<section class="sheet pour-sheet">
${f ? copyBlock(`pour install ${pkgName}`, "p1") : ""}${c ? copyBlock(`pour install --cask ${pkgName}`, "p1c") : ""}
${f ? `${rule('Formula')}<ul class="pour-list">${deps.length ? `<li><strong>Depends on</strong> ${deps.map((d) => `<a href="/pour/p/${esc(d)}">${esc(d)}</a>`).join(", ")}</li>` : ""}${bottles.length ? `<li><strong>Bottles</strong> ${esc(bottles.join(", "))}</li>` : "<li>No bottle — Pour installs bottles only; Homebrew would build this from source.</li>"}${f.keg_only ? "<li>Keg-only: not linked into the prefix.</li>" : ""}${f.deprecated ? `<li class="pour-warn">Deprecated${f.deprecation_reason ? `: ${esc(f.deprecation_reason)}` : ""}</li>` : ""}${f.disabled ? `<li class="pour-warn">Disabled${f.disable_reason ? `: ${esc(f.disable_reason)}` : ""}</li>` : ""}${f.caveats ? `<li><strong>Caveats</strong><pre class="pour-out"><code>${esc(f.caveats)}</code></pre></li>` : ""}</ul>` : ""}
${c ? `${rule('Cask')}<ul class="pour-list"><li><strong>Name</strong> ${esc((c.name || []).join(", "))}</li><li><strong>Version</strong> ${esc(c.version)}${c.auto_updates ? " (updates itself)" : ""}</li><li><strong>Installs</strong> ${esc(JSON.stringify((c.artifacts || []).flatMap((a) => Object.entries(a).filter(([k]) => ["app", "pkg", "binary", "suite"].includes(k)).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.filter((x) => typeof x === "string").join(", ") : v}`))))}</li>${c.depends_on?.macos ? `<li><strong>macOS</strong> ${esc(JSON.stringify(c.depends_on.macos))}</li>` : ""}${c.caveats ? `<li><strong>Caveats</strong><pre class="pour-out"><code>${esc(c.caveats)}</code></pre></li>` : ""}</ul>` : ""}
</section>`;
  }
  return layout({ shell, title, description, path: `/p/${name}`, theme, body, stats, env });
}

export function docsPage({ theme, stats, env , shell }) {
  const cmd = (c, d) => `<tr><td><code>${esc(c)}</code></td><td>${d}</td></tr>`;
  const body = `${hero({ eyebrow: "Pour · docs", title: "Docs", tag: "Everything <code>pour</code> does, on one page.", logo: 84 })}
<section class="sheet pour-sheet" id="install">${rule('Install')}${copyBlock(INSTALL, "d1")}
<p>Or a plain download from <a href="https://github.com/JKS-sys/pour-13-Oct-2026/releases/latest" target="_blank" rel="noopener">GitHub Releases</a> (also mirrored at <code>/pour/dl/&lt;file&gt;</code> here): <code>pour-macos-arm64</code>, <code>pour-macos-x86_64</code>, <code>pour-linux-x86_64</code>, <code>pour-linux-arm64</code>, <code>pour-linux-i686</code> (iSH), <code>pour-windows-x86_64.exe</code>, <code>pour-windows-arm64.exe</code>, <code>pour-freebsd-x86_64</code>. Put it on your PATH, then <code>pour init</code>.</p>
<p>Haiku and anything else with Rust: <code>cargo install --git https://github.com/JKS-sys/pour-13-Oct-2026 pour</code>.</p>
<p>Verify a download: every release ships <code>SHA256SUMS</code> and the feed at <a href="/pour/releases/latest.json">/pour/releases/latest.json</a> carries each file's digest; <code>install.sh</code> checks it before installing. In CI: <code>uses: JKS-sys/pour-action-13-Oct-2026@v1</code>.</p></section>
<section class="sheet pour-sheet">${rule('Commands')}<table class="pour-table pour-cmds"><tbody>
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
<section class="sheet pour-sheet">${rule('How Pour installs a formula')}<ol class="pour-list">
<li><strong>Plan.</strong> The binary index resolves the name (aliases and old names included) and walks run-time dependencies for your system — Linux adds what <code>uses_from_macos</code> supplies on macOS.</li>
<li><strong>Fetch.</strong> Bottles come from <code>ghcr.io/homebrew/core</code>, all at once, verified by SHA-256 as they stream. The bottle manifest's <code>sh.brew.tab</code> tells Pour which files need relocation.</li>
<li><strong>Pour.</strong> Each bottle is unpacked into the store (<code>store/&lt;sha256&gt;</code>) and relocated there once: <code>@@HOMEBREW_PREFIX@@</code> placeholders and Homebrew's build prefix are rewritten in text files, Mach-O load commands (then re-signed) and ELF interpreters/rpaths. Pour's prefix is never longer than Homebrew's, so every rewrite fits in place.</li>
<li><strong>Place.</strong> The keg appears in the Cellar as an APFS clone (macOS) or a symlink to the store (Linux), is linked into the prefix the way Homebrew links, and gets a receipt (<code>.pour-receipt.json</code> plus a Homebrew-style <code>INSTALL_RECEIPT.json</code>).</li>
<li><strong>Finish.</strong> Homebrew's declarative post-install steps run natively, in parallel, after the steps of each package's dependencies.</li></ol>
${rule('Where things live')}<pre class="pour-out"><code>/opt/pour/
  bin lib include share etc opt     links into kegs (like Homebrew)
  Cellar/&lt;name&gt;/&lt;version&gt;/         kegs
  Caskroom/&lt;token&gt;/&lt;version&gt;/      app receipts
  store/&lt;sha256&gt;/                  unpacked, relocated bottles (shared)
  cache/downloads/                 bottles and app downloads
  var/pour/index.pour              the index · var/pour/taps/ registries</code></pre>
<p>Environment: <code>POUR_PREFIX</code> (keep it 13 characters or fewer on macOS), <code>POUR_CACHE</code>, <code>POUR_INDEX_URL</code>, <code>POUR_CA_BUNDLE</code> / <code>SSL_CERT_FILE</code> for corporate proxies, <code>HTTPS_PROXY</code>.</p></section>
<section class="sheet pour-sheet">${rule('Pour and Homebrew')}<p>Pour is Homebrew-compatible: it installs the same prebuilt bottles and reads the same public package index. Pour does not build from source, and it does not change anything under <code>/opt/homebrew</code>. If a formula has no bottle for your system, Pour says so and points you to Homebrew.</p><p>Pour is made by ${BY} and is not affiliated with Homebrew. Source, under a source-available licence: <a href="https://github.com/JKS-sys/pour-13-Oct-2026" target="_blank" rel="noopener">github.com/JKS-sys/pour-13-Oct-2026</a>.</p></section>`;
  return layout({ shell, title: "Docs — Pour", description: "How to install Pour, every command, how a bottle is poured, and where files live.", path: "/docs", theme, body, stats, env });
}

export function notFound({ theme, stats, env, name , shell }) {
  const body = hero({ eyebrow: "Pour · 404", title: "Nothing poured here", tag: name ? `No formula, cask or app is called “${esc(name)}”.` : "That page does not exist.", extra: `<form class="pour-search" action="/pour/search" method="get" role="search"><input type="search" name="q" value="${esc(name || "")}" placeholder="Search packages…" aria-label="Search packages"><button type="submit">Search</button></form><p><a href="/pour">Back to Pour</a></p>`, logo: 84 });
  return layout({ shell, title: "Not found — Pour", description: "Page not found.", path: "/404", theme, body, stats, env, noindex: true });
}
