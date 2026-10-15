/** The Pour logo, animated: the bottle tips over the glass, the stream falls, the glass fills
 *  with a moving surface, bubbles rise and drops splash; then the bottle rights itself.
 *  The clip sits on a parent <g> (never on the moving liquid) so nothing spills outside the glass.
 *  /pour-logo.js plays the sounds in step with it (tap or hover the logo to pour again). */
let pourLogoN = 0;
export function pourLogoSvg(size = 112, cls = '') {
  const k = ++pourLogoN;
  const g = `plg${k}`, c = `plc${k}`, s = `pls${k}`;
  const glass = 'M17 57h32l-3.4 27.2a2.2 2.2 0 0 1-2.2 1.8H22.6a2.2 2.2 0 0 1-2.2-1.8z';
  return `<svg class="pour-logo${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-label="Pour — tap to pour" tabindex="0" data-pour-logo>
  <defs>
    <linearGradient id="${g}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--pl-a)"/><stop offset="1" style="stop-color:var(--pl-b)"/></linearGradient>
    <linearGradient id="${s}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:var(--pl-a);stop-opacity:.0"/><stop offset=".5" style="stop-color:#fff;stop-opacity:.55"/><stop offset="1" style="stop-color:var(--pl-a);stop-opacity:0"/></linearGradient>
    <clipPath id="${c}"><path d="${glass}"/></clipPath>
  </defs>
  <ellipse class="pl-shade" cx="33" cy="88.5" rx="17" ry="2.6"/>
  <g class="pl-bottle">
    <path d="M62 6h8v11l6 6v25a5 5 0 0 1-5 5H61a5 5 0 0 1-5-5V23l6-6z" fill="url(#${g})"/>
    <rect class="pl-label" x="58.5" y="30" width="15" height="11" rx="2"/>
    <path class="pl-label-line" d="M61 35.5h10"/>
    <rect class="pl-shine" x="59" y="24" width="3" height="24" rx="1.5" fill="url(#${s})"/>
    <rect class="pl-cap" x="61" y="2" width="10" height="5.5" rx="1.6"/>
  </g>
  <path class="pl-stream" d="M33 41V84"/>
  <g clip-path="url(#${c})">
    <g class="pl-liquid">
      <path class="pl-wave" d="M0 64q4-3 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0V100H0z" fill="url(#${g})"/>
      <path class="pl-foam" d="M0 64q4-3 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0 8 0"/>
    </g>
    <circle class="pl-bub b1" cx="25" cy="83" r="1.7"/><circle class="pl-bub b2" cx="31" cy="84" r="1.3"/><circle class="pl-bub b3" cx="38" cy="83" r="1.5"/><circle class="pl-bub b4" cx="43" cy="84" r="1.1"/>
  </g>
  <path class="pl-glass" d="${glass}" stroke="url(#${g})"/>
  <path class="pl-glint" d="M21 61l2.4 19"/>
  <g class="pl-drops"><circle class="d1" cx="30" cy="64" r="1.2"/><circle class="d2" cx="36" cy="64" r="1"/><circle class="d3" cx="33" cy="64" r=".9"/></g>
</svg>`;
}
