import type { ProjectSpec } from './domain.js';

/** Stateless frame evaluation. No clock, random state, font or external asset. */
export function frameSvg(
  spec: ProjectSpec,
  frame: number,
  envelopes: Record<string, number[]> = {},
): string {
  const total = spec.scenes.reduce((n, s) => n + s.durationFrames, 0);
  let local = Math.max(0, Math.min(total - 1, Math.floor(frame))),
    scene = spec.scenes[0]!;
  for (const candidate of spec.scenes) {
    scene = candidate;
    if (local < candidate.durationFrames) break;
    local -= candidate.durationFrames;
  }
  local = Math.max(0, Math.min(local, scene.durationFrames - 1));
  const t = local / 24,
    progress = local / Math.max(1, scene.durationFrames - 1);
  const walk = scene.action === 'walk',
    pick = scene.action === 'pick-up',
    wave = scene.action === 'wave';
  const camera = scene.camera === 'pan' ? progress * 35 : 0;
  const x = walk ? -90 + progress * 190 : 0;
  const bob = walk ? Math.sin(t * 8) * 3 : Math.sin(t * 2) * 1.5;
  const reach = pick ? Math.min(1, progress * 3) : 0,
    lift = pick ? Math.min(1, Math.max(0, (progress - 0.4) * 2.5)) : 0;
  const handX = 285 + 55 * reach,
    handY = wave ? 132 + Math.sin(t * 7) * 16 : 199 - 70 * lift;
  const cupX = pick ? 340 : 390,
    cupY = pick && progress >= 0.4 ? 199 - 70 * lift + bob : 199;
  const stride = walk ? Math.sin(t * 8) * 16 : 0;
  const mouth = envelopes[scene.id]?.[local] ?? 0;
  const shadow = spec.style === 'shadow-box',
    multi = spec.style === 'multiplane';
  const stroke = '#3b3430',
    body = scene.color,
    sky = shadow ? '#263c50' : '#f3e8ca';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 640 360">
  <defs><filter id="paper-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="3" dy="5" stdDeviation="${shadow ? 5 : 2}" flood-opacity=".28"/></filter><clipPath id="stage"><rect x="${shadow ? 17 : 0}" y="${shadow ? 17 : 0}" width="${shadow ? 606 : 640}" height="${shadow ? 326 : 360}" rx="${shadow ? 90 : 0}"/></clipPath></defs>
  <rect width="640" height="360" fill="#302e32"/>
  <g clip-path="url(#stage)"><rect width="640" height="360" fill="${sky}"/>
  <circle cx="490" cy="82" r="31" fill="${shadow ? '#eadcb5' : '#e6b36b'}"/>
  <g transform="translate(${-camera * 0.2} 0)"><path d="M-80 250Q80 92 215 196Q400 72 740 220V360H-80Z" fill="${shadow ? '#4c6875' : '#bfcebc'}"/><path d="M-40 270Q200 155 400 220Q540 150 730 245V360H-40Z" fill="${shadow ? '#698681' : '#8fae9c'}"/></g>
  <g transform="translate(${-camera * 0.5} 0)" fill="${shadow ? '#9d9c7c' : '#cdb785'}" stroke="#697b69" stroke-width="3"><path d="M455 203v-47h75v47Z"/><path d="M444 156l48-33 48 33Z"/><rect x="487" y="177" width="14" height="26" fill="#63786c"/></g>
  <g transform="translate(${-camera} 0)"><path d="M-80 269Q250 246 740 264V380H-80Z" fill="${shadow ? '#b9a67e' : '#dbc7a1'}"/>
  <path d="M-30 310Q290 260 690 305" fill="none" stroke="#e9d9b6" stroke-width="24"/>
  <g transform="translate(${x} ${bob})"><ellipse cx="257" cy="289" rx="48" ry="8" fill="#86745c" opacity=".3"/>
  <g filter="url(#paper-shadow)" stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M242 225L${238 - stride} 280M265 225L${271 + stride} 280" fill="none" stroke-width="15"/>
  <path d="M231 167L270 167L282 237H222Z" fill="${body}"/>
  <path d="M232 178L217 ${213 - stride}" stroke="${body}" stroke-width="12"/>
  <circle cx="217" cy="${213 - stride}" r="6" fill="#f8e8ce"/>
  <circle cx="250" cy="133" r="31" fill="#f8e8ce"/>
  <path d="M222 123Q224 95 251 100Q281 101 280 124Q260 107 245 120Z" fill="#684a3a"/>
  <circle cx="261" cy="132" r="2.5" fill="${stroke}" stroke="none"/>
  <ellipse cx="266" cy="148" rx="5" ry="${1 + mouth * 6}" fill="${stroke}" stroke="none"/>
  <path d="M270 178L${(270 + handX) / 2} ${handY + 13}L${handX} ${handY}" fill="none" stroke="${body}" stroke-width="12"/>
  <circle cx="${handX}" cy="${handY}" r="7" fill="#f8e8ce"/>
  </g></g>
  ${pick ? `<g stroke="${stroke}" stroke-width="4"><path d="M325 223H391M334 225V284M381 225V284"/><path d="M${cupX} ${cupY}h21v23h-21Z" fill="#c27454" filter="url(#paper-shadow)"/><path d="M${cupX + 21} ${cupY + 4}q15 0 10 14h-10" fill="none"/></g>` : ''}
  <path d="M425 281l3-9 3 9m16 4 4-9 2 9m-280 18 2-10 4 10" stroke="#799078" stroke-width="3" fill="none"/>
  </g>
  <g transform="translate(${-camera * (multi ? 2.2 : 1.5)} 0)" fill="${shadow ? '#253b3a' : '#486e5a'}" filter="url(#paper-shadow)"><path d="M-40 360V150Q-5 78 32 150L57 360Z"/><path d="M602 360l14-173Q643 118 675 190V360Z"/></g></g>
  ${shadow ? '<rect x="8" y="8" width="624" height="344" rx="98" fill="none" stroke="#b7996c" stroke-width="16"/>' : ''}
  </svg>`;
}
