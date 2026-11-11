// A deliberately small paper-cut study. No font, network asset or random clock.
// Shared SVG/evaluator isolates renderer differences from art/implementation differences.
globalThis.studySvg = function studySvg(frame) {
  const f = Math.max(0, Math.min(239, frame));
  const camera = f * 0.12;
  const reach = Math.min(1, Math.max(0, (f - 24) / 48));
  const lift = Math.min(1, Math.max(0, (f - 72) / 48));
  const handX = 260 + 70 * reach;
  const handY = 190 - 50 * lift;
  const cupX = f < 72 ? 330 : handX;
  const cupY = f < 72 ? 190 : handY;
  const mouthOpen = f >= 24 && f < 48 || f >= 72 && f < 96;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="3" dy="5" stdDeviation="3" flood-opacity=".25"/></filter>
  <clipPath id="stage"><rect width="640" height="360" rx="12"/></clipPath></defs>
  <g clip-path="url(#stage)"><rect width="640" height="360" fill="#eee8d5"/>
  <g transform="translate(${-camera * .25} 0)"><path d="M-80 230 Q80 90 220 200 Q420 65 760 220 L760 360H-80Z" fill="#b4c4bd"/></g>
  <g transform="translate(${-camera} 0)"><rect x="-80" y="270" width="820" height="90" fill="#cfb48c"/>
  <ellipse cx="228" cy="284" rx="55" ry="9" fill="#998671"/>
  <g filter="url(#shadow)" stroke="#453b36" stroke-width="4" stroke-linejoin="round">
  <path d="M210 224L207 280M240 224L252 280" stroke-width="17"/>
  <path d="M203 163L245 163L256 231L194 231Z" fill="#648b98"/>
  <circle cx="224" cy="127" r="33" fill="#fff9e9"/>
  <circle cx="235" cy="121" r="3" fill="#453b36" stroke="none"/>
  <ellipse cx="240" cy="140" rx="6" ry="${mouthOpen ? 7 : 1}" fill="#453b36" stroke="none"/>
  <path d="M244 175L${(244 + handX) / 2} ${handY + 14}L${handX} ${handY}" fill="none" stroke="#648b98" stroke-width="14"/>
  <circle cx="${handX}" cy="${handY}" r="8" fill="#fff9e9"/>
  <path d="M${cupX} ${cupY}h22v23h-22z" fill="#c27252"/>
  <path d="M${cupX + 22} ${cupY + 5}q17 0 10 13h-10" fill="none"/>
  </g><rect x="310" y="214" width="80" height="9" fill="#453b36"/>
  <path d="M320 223V283M380 223V283" stroke="#453b36" stroke-width="7"/></g>
  <g transform="translate(${-camera * 1.6} 0)"><path d="M-35 360V180Q30 80 50 185L65 360Z" fill="#54796b" filter="url(#shadow)"/></g>
  </g></svg>`;
};
