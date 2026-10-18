/* pour-logo.js — the sound of the animated Pour logo, in step with its 4.2 s CSS cycle, on every pour.
   Same file on ipconfig.co.network (/pour-logo.js) and the Pour site (/pour/pour-logo.js).

   Browsers refuse sound until the visitor clicks, taps or presses a key once, so:
     · before that, a small "🔊 Hear it pour" button sits under the logo (and any click or key on the
       page counts);
     · after that, every cycle the bottle tips is heard: lift, the stream (filtered noise whose pitch
       rises as the glass fills, like a real glass), gulps, bubbles, the full chord, the bottle set
       down — scheduled from the animation's own start/iteration events, so sound and picture agree;
     · only the logo on screen plays, nothing plays in a background tab, and the site's mute switch
       ('ipc-sound') and reduced motion are respected. Tap, Enter or hover pours again at once.
   Nothing here can throw into the page. */
(function () {
  'use strict';
  var T = 4.2, KEY = 'ipc-sound', ctx = null, master = null, unlocked = false, noiseBuf = null;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function muted() { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } }
  function ac() {
    if (muted()) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f0, f1, at, dur, vol) {
    var c = ac(); if (!c) return; var t = c.currentTime + Math.max(0, at);
    var o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseSrc(c) {
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
  }
  function noise(at, dur, vol, fLo, fHi, q) {
    var c = ac(); if (!c) return; var t = c.currentTime + Math.max(0, at);
    var s = noiseSrc(c), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(fLo, t); f.frequency.exponentialRampToValueAtTime(fHi, t + dur);
    env(g, t, 0.02, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  /* the pour itself: a stream of noise through a resonance that climbs as the glass fills (the
     shorter the air column, the higher it rings), with a slow wobble so it gurgles */
  function stream(at, dur) {
    var c = ac(); if (!c) return; var t = c.currentTime + Math.max(0, at);
    var s = noiseSrc(c), hp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 180;
    bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(1500, t + dur);
    lfo.frequency.value = 7; lg.gain.value = 60; lfo.connect(lg); lg.connect(bp.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.12);
    g.gain.setValueAtTime(0.09, t + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  var SFX = {
    lift: function (at) { noise(at, 0.32, 0.04, 500, 1600, 0.8); osc('sine', 330, 520, at, 0.22, 0.025); },
    clink: function (at) { osc('triangle', 2350, 2300, at, 0.35, 0.045); osc('sine', 3520, 3480, at + 0.005, 0.25, 0.02); },
    stream: function (at, dur) { stream(at, dur); },
    glug: function (at, k) { var f = 150 + k * 26; osc('sine', f * 1.7, f, at, 0.12, 0.05); noise(at, 0.07, 0.018, 380 + k * 45, 220, 2.5); },
    bubble: function (at, k) { osc('sine', 700 + k * 170, 1400 + k * 220, at, 0.06, 0.025); },
    full: function (at) { [784, 988, 1175].forEach(function (f, i) { osc('triangle', f, f, at + i * 0.07, 0.3, 0.035); }); },
    down: function (at) { osc('sine', 180, 95, at, 0.12, 0.06); noise(at, 0.05, 0.025, 1200, 600, 1); },
  };
  /* one cycle, `off` seconds after it began (0 = right now is the start) */
  function track(off) {
    off = off || 0;
    if (!ac()) return;
    var at = function (x) { return x - off; };
    if (at(0.42) > -0.05) SFX.lift(at(0.42));
    if (at(1.18) > -0.2) SFX.stream(Math.max(0, at(1.18)), 1.65 - Math.max(0, -at(1.18)));
    if (at(1.24) > 0) SFX.clink(at(1.24));
    for (var i = 0; i < 6; i++) if (at(1.4 + i * 0.26) > 0) SFX.glug(at(1.4 + i * 0.26), i);
    [2.15, 2.5, 2.85].forEach(function (x, k) { if (at(x) > 0) SFX.bubble(at(x), k); });
    if (at(2.95) > 0) SFX.full(at(2.95));
    if (at(3.55) > 0) SFX.down(at(3.55));
  }
  function all() { return Array.prototype.slice.call(document.querySelectorAll('[data-pour-logo]')); }
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; }
  function speaker() { return all().filter(inView)[0] || null; } // only one logo speaks
  /* restart a logo's animation from its first frame (sound follows through the animationstart event) */
  var last = new WeakMap();
  function pour(svg) {
    if (!svg) return;
    var now = Date.now(); if (now - (last.get(svg) || 0) < 600) return; last.set(svg, now);
    if (still) { if (unlocked) track(0); return; }
    svg.classList.add('pl-reset'); void svg.getBoundingClientRect(); svg.classList.remove('pl-reset');
  }
  function onCycle(svg) {
    if (!unlocked || document.hidden || muted() || svg !== speaker()) return;
    track(0);
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true; ac();
    document.documentElement.classList.add('pl-sound-on');
    var s = speaker(); if (s) pour(s); // start a fresh cycle so the first pour is heard from the top
  }
  function wire(svg) {
    if (svg.__pl) return; svg.__pl = 1;
    var bottle = svg.querySelector('.pl-bottle');
    if (bottle) {
      bottle.addEventListener('animationstart', function () { onCycle(svg); });
      bottle.addEventListener('animationiteration', function () { onCycle(svg); });
    }
    svg.addEventListener('click', function (e) { e.stopPropagation(); unlock(); pour(svg); });
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unlock(); pour(svg); } });
    if (window.matchMedia && matchMedia('(hover: hover)').matches) svg.addEventListener('pointerenter', function () { if (unlocked) pour(svg); });
    // the "Hear it pour" button, until sound is allowed
    if (!muted() && svg.parentNode && !svg.parentNode.querySelector('.pl-hear')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pl-hear'; b.innerHTML = '<span aria-hidden="true">🔊</span> Hear it pour';
      b.addEventListener('click', function (e) { e.stopPropagation(); unlock(); pour(svg); });
      svg.parentNode.appendChild(b);
    }
  }
  function init() {
    all().forEach(wire);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('pl-off', !e.isIntersecting); }); });
      all().forEach(function (s) { io.observe(s); });
    }
    var first = function () { document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true); document.removeEventListener('touchstart', first, true); unlock(); };
    document.addEventListener('pointerdown', first, true); document.addEventListener('keydown', first, true); document.addEventListener('touchstart', first, { capture: true, passive: true });
    // the reduced-motion logo does not animate; after the first tap it still pours with sound on a timer
    if (still) setInterval(function () { var s = speaker(); if (unlocked && s && !document.hidden) track(0); }, T * 1000 * 2);
  }
  window.PourLogo = { pour: function (el) { unlock(); pour(el || speaker()); }, sounds: SFX, track: track, cycle: T, unlocked: function () { return unlocked; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
