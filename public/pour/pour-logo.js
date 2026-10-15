/* pour-logo.js — the sounds of the animated Pour logo, in step with its 4.2 s CSS cycle.
   Same file on ipconfig.co.network (/pour-logo.js) and the Pour site (/pour/pour-logo.js).
   Browsers only allow sound after a click or key, so: tapping, clicking or pressing Enter on a
   logo pours again with sound; the first click or key anywhere on the page pours the logo in
   view once with sound; hovering pours again (at most once a cycle). Mute is the site's own
   'ipc-sound' switch. Nothing here can throw into the page. */
(function () {
  'use strict';
  var T = 4.2, KEY = 'ipc-sound', ctx = null, master = null;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function muted() { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } }
  function ac() {
    if (muted()) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f0, f1, at, dur, vol) {
    var c = ac(); if (!c) return; var t = c.currentTime + at;
    var o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  var noiseBuf = null;
  function noise(at, dur, vol, fLo, fHi, q) {
    var c = ac(); if (!c) return; var t = c.currentTime + at;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(fLo, t); f.frequency.exponentialRampToValueAtTime(fHi, t + dur);
    env(g, t, 0.02, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  /* the sound track of one cycle (seconds from the start of the cycle) */
  var SFX = {
    lift: function (at) { noise(at, 0.32, 0.05, 500, 1600, 0.8); osc('sine', 330, 520, at, 0.22, 0.03); },          // the bottle swings up
    clink: function (at) { osc('triangle', 2350, 2300, at, 0.35, 0.05); osc('sine', 3520, 3480, at + 0.005, 0.25, 0.025); }, // the first drop hits the glass
    stream: function (at, dur) { noise(at, dur, 0.035, 900, 520, 0.7); },                                             // the pour itself
    glug: function (at, k) { var f = 150 + k * 24; osc('sine', f * 1.7, f, at, 0.13, 0.06); noise(at, 0.08, 0.02, 380 + k * 40, 220, 2.5); }, // gulps, rising as it fills
    bubble: function (at, k) { osc('sine', 700 + k * 160, 1400 + k * 200, at, 0.07, 0.03); },                         // bubbles reach the top
    full: function (at) { [784, 988, 1175].forEach(function (f, i) { osc('triangle', f, f, at + i * 0.07, 0.3, 0.04); }); }, // the glass is full
    down: function (at) { osc('sine', 180, 95, at, 0.12, 0.07); noise(at, 0.05, 0.03, 1200, 600, 1); },                // the bottle stands back down
  };
  function track() {
    if (!ac()) return;
    SFX.lift(0.42);
    SFX.stream(1.18, 1.65);
    SFX.clink(1.24);
    for (var i = 0; i < 6; i++) SFX.glug(1.4 + i * 0.26, i);
    SFX.bubble(2.15, 0); SFX.bubble(2.5, 1); SFX.bubble(2.85, 2);
    SFX.full(2.95);
    SFX.down(3.55);
  }
  /* restart a logo's animation from the beginning, then play the track with it */
  var last = new WeakMap();
  function pour(svg, withSound) {
    if (!svg) return;
    var now = Date.now(); if (now - (last.get(svg) || 0) < T * 900) return; last.set(svg, now);
    if (!still) { svg.classList.add('pl-reset'); void svg.getBoundingClientRect(); svg.classList.remove('pl-reset'); }
    if (withSound) track();
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; }
  function wire(svg) {
    if (svg.__pl) return; svg.__pl = 1;
    svg.addEventListener('click', function (e) { e.stopPropagation(); last.set(svg, 0); pour(svg, true); });
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); last.set(svg, 0); pour(svg, true); } });
    if (window.matchMedia && matchMedia('(hover: hover)').matches) svg.addEventListener('pointerenter', function () { pour(svg, true); });
  }
  function all() { return Array.prototype.slice.call(document.querySelectorAll('[data-pour-logo]')); }
  function init() {
    all().forEach(wire);
    // pause logos that are off screen (saves the CPU on long pages)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.style.animationPlayState = ''; e.target.classList.toggle('pl-off', !e.isIntersecting); }); });
      all().forEach(function (s) { io.observe(s); });
    }
    var first = function (e) {
      document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true);
      if (e.target && e.target.closest && e.target.closest('[data-pour-logo]')) return;
      var s = all().filter(inView)[0]; if (s) { last.set(s, 0); pour(s, true); }
    };
    document.addEventListener('pointerdown', first, true); document.addEventListener('keydown', first, true);
  }
  window.PourLogo = { pour: function (el, sound) { pour(el || all().filter(inView)[0], sound !== false); }, sounds: SFX, track: track, cycle: T };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
