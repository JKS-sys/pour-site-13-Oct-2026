/* Pour pages: theme (same three-state control and storage key as the rest of
   the site), sounds (synthesised, same mute key), copy buttons, ripples and
   the typed terminal demo. No framework, ~5 KB. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var motionOK = function () { try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  // With the live site shell, the site's own app.js already runs the theme button, the sound button and the
  // copy buttons; doing it here as well flipped the theme twice per click and un-muted the mute. Only the
  // fallback page (site unreachable) needs them from this file.
  var SITE = !!document.querySelector('script[src^="/app.js"]');

  /* ---- theme: auto → light → dark, stored as 'theme' only when pinned ---- */
  (function theme() {
    var root = document.documentElement, button = $('theme-toggle');
    if (!button || SITE) return;
    var label = button.querySelector('[data-theme-label]');
    var stored = function () { try { var s = localStorage.getItem('theme'); return s === 'light' || s === 'dark' ? s : 'auto'; } catch (e) { return 'auto'; } };
    var apply = function (mode) {
      if (mode === 'auto') { root.dataset.theme = root.dataset.serverTheme || 'auto'; try { localStorage.removeItem('theme'); } catch (e) {} }
      else { root.dataset.theme = mode; try { localStorage.setItem('theme', mode); } catch (e) {} }
      if (label) label.textContent = mode;
      button.setAttribute('data-mode', mode);
      button.title = mode === 'auto' ? 'Theme follows your local daylight. Click for light.' : mode === 'light' ? 'Light theme pinned. Click for dark.' : 'Dark theme pinned. Click to go back to automatic.';
    };
    apply(stored());
    var ORDER = ['auto', 'light', 'dark'];
    button.addEventListener('click', function (e) {
      var next = ORDER[(ORDER.indexOf(stored()) + 1) % ORDER.length];
      sfx('flip');
      if (motionOK() && document.startViewTransition) {
        var x = e.clientX || innerWidth - 60, y = e.clientY || 24;
        var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var t = document.startViewTransition(function () { apply(next); });
        t.ready.then(function () {
          document.documentElement.animate({ clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 460, easing: 'cubic-bezier(.3,.8,.3,1)', pseudoElement: '::view-transition-new(root)' });
        }).catch(function () {});
      } else apply(next);
    });
  })();

  /* ---- sounds: a few oscillators, under half a second, off with one click ---- */
  var KEY = 'ipc-sound', on = true, ctx = null;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  function audio() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function tone(freq, at, len, gain, type) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + len + 0.02);
  }
  function sfx(name) {
    if (!on) return;
    switch (name) {
      case 'click': tone(880, 0, 0.05, 0.05, 'triangle'); break;
      case 'copy': tone(660, 0, 0.07, 0.06); tone(990, 0.06, 0.12, 0.05); break;
      case 'flip': tone(520, 0, 0.09, 0.05, 'triangle'); tone(780, 0.05, 0.1, 0.04, 'triangle'); break;
      case 'key': tone(1800 + Math.random() * 500, 0, 0.025, 0.02, 'square'); break;
      case 'pour': for (var i = 0; i < 6; i++) tone(240 + i * 35 + Math.random() * 40, i * 0.07, 0.12, 0.035, 'sine'); break;
      case 'done': tone(659, 0, 0.09, 0.06); tone(880, 0.08, 0.09, 0.06); tone(1319, 0.16, 0.2, 0.05); break;
    }
  }
  var SPK_ON = '<svg class="ui-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="wave w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="wave w2" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>';
  var SPK_OFF = '<svg class="ui-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var toggles = document.querySelectorAll('[data-sound-toggle]');
  function sync(btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    var t = on ? 'Sounds on — click to mute' : 'Sounds off — click to turn on';
    btn.setAttribute('title', t); btn.setAttribute('aria-label', t);
    if (btn.hasAttribute('data-compact')) btn.innerHTML = on ? SPK_ON : SPK_OFF; else btn.textContent = on ? 'Sound on' : 'Sound off';
  }
  if (SITE) { toggles = []; window.addEventListener('storage', function () { try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {} }); document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-sound-toggle]')) setTimeout(function () { try { on = localStorage.getItem(KEY) !== 'off'; } catch (er) {} }, 0); }, true); }
  Array.prototype.forEach.call(toggles, function (b) {
    sync(b);
    b.addEventListener('click', function () {
      on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
      Array.prototype.forEach.call(toggles, sync);
      if (on) sfx('done');
    });
  });

  /* ---- copy buttons: the site's app.js copies on the live shell; here only for the fallback page.
         Either way a few gold bubbles rise from the button and the bottle scene plays. ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.copy[data-copy], .pour-copy');
    if (!b) return;
    if (motionOK()) {
      var r = b.getBoundingClientRect(), cols = ['--c-gold', '--c-amber', '--c-teal', '--c-cyan', '--c-lime'];
      for (var k = 0; k < 7; k++) { var u = document.createElement('i'); u.className = 'pour-bubble'; u.style.cssText = 'left:' + (r.left + r.width / 2 + (Math.random() * 24 - 12)) + 'px;top:' + r.top + 'px;background:var(' + cols[k % cols.length] + ');--dx:' + (Math.random() * 50 - 25) + 'px;animation-delay:' + (k * 45) + 'ms'; document.body.appendChild(u); setTimeout(function (n) { return function () { n.remove(); }; }(u), 1300); }
      try { if (window.VFX) window.VFX.play('bottle', b, { quiet: true }); } catch (er) {}
    }
    var poured = false; try { if (window.PourLogo) { window.PourLogo.pour(null, true); poured = true; } } catch (er) {}
    if (SITE) { if (!poured) sfx('pour'); return; }
    var text = b.getAttribute('data-copy') || '';
    var label = b.textContent;
    var ok = function () { b.textContent = 'copied'; b.classList.add('done'); sfx('copy'); setTimeout(function () { b.textContent = label; b.classList.remove('done'); }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, ok);
    else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (err) {} ta.remove(); ok(); }
  });

  /* ---- ripples on buttons and cards ---- */
  window.addEventListener('pointerdown', function (e) {
    if (!motionOK() || e.button !== 0) return;
    var b = e.target.closest && e.target.closest('.pour-btn, .pour-search button, .pour-app, .pour-card, .pour-grid article');
    if (!b) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6, s = document.createElement('span');
    s.className = 'pour-ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden'; b.appendChild(s); setTimeout(function () { s.remove(); }, 520);
    sfx('click');
  }, { passive: true });

  Array.prototype.forEach.call(document.querySelectorAll('.pour-platforms span'), function (x, i) { x.style.setProperty('--n', i); });

  /* ---- typed terminal demo ---- */
  var demo = document.querySelector('[data-demo]');
  if (demo) {
    var body = demo.querySelector('.pour-term-body');
    var script = [
      { type: 'cmd', text: 'curl -fsSL https://ipconfig.co.network/pour/install | sh' },
      { type: 'out', html: '<span class="c-blue">==&gt;</span> Pour for macOS (arm64) → /opt/pour\n<span class="c-blue">==&gt;</span> checksum verified\n<span class="c-blue">==&gt;</span> installed pour 0.1.0\n<span class="c-green">✓</span> homebrew (core + cask): 8,658 formulae, 7,784 casks' },
      { type: 'cmd', text: 'pour install ffmpeg' },
      { type: 'out', html: '<span class="c-blue">==&gt;</span> Dependencies: aom 3.13.1, dav1d 1.5.3, lame 3.100, libvpx 1.16.0, opus 1.6, x264 r3222, x265 4.1 …\n<span class="c-blue">==&gt;</span> Installing: <b>ffmpeg</b> <span class="c-dim">9.0.2_1</span>\n<span class="c-blue">==&gt;</span> Downloading 56 bottles\n<span class="c-blue">==&gt;</span> Pouring 56 bottles\n<span class="c-blue">==&gt;</span> Installing 56 packages\n  <span class="c-gold">🍶</span> <b>ffmpeg</b> <span class="c-dim">9.0.2_1</span> <span class="c-green">poured</span> <span class="c-dim">9 ms</span>\n<span class="c-green">✓</span> 56 packages in 6.60 s · 128.0 MB downloaded', sound: 'pour' },
      { type: 'cmd', text: 'pour info jq' },
      { type: 'out', html: '<span class="c-blue">==&gt;</span> <b>jq</b><span class="c-dim">: stable 1.8.2</span>\nLightweight and flexible command-line JSON processor\n<span class="c-dim">answered in 2 ms</span>', sound: 'done' }
    ];
    var i = 0, running = false, started = false;
    function type(text, cb) {
      var el = document.createElement('span'); body.appendChild(el);
      var cur = document.createElement('span'); cur.className = 'pour-cursor'; body.appendChild(cur);
      var k = 0;
      (function step() {
        if (k < text.length) { el.textContent += text[k++]; if (k % 2 === 0) sfx('key'); setTimeout(step, motionOK() ? 28 + Math.random() * 40 : 0); }
        else { cur.remove(); body.appendChild(document.createTextNode('\n')); cb(); }
      })();
    }
    function run() {
      if (i >= script.length) { i = 0; body.innerHTML = ''; }
      var s = script[i++];
      if (s.type === 'cmd') { var p = document.createElement('span'); p.className = 'c-gold'; p.textContent = '$ '; body.appendChild(p); type(s.text, function () { setTimeout(run, 300); }); }
      else { var o = document.createElement('span'); o.innerHTML = s.html + '\n\n'; body.appendChild(o); if (s.sound) sfx(s.sound); setTimeout(run, 2600); }
      body.scrollTop = body.scrollHeight;
    }
    var start = function () { if (started) return; started = true; running = true; run(); };
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) start(); }); }).observe(demo); }
    else start();
  }
})();
