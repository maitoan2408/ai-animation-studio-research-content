/** Static, inspectable engineering figures; values are not aesthetic scores. */
export type Trace = { frame: number; value: number };
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export function curveSvg(title: string, unit: string, values: Trace[], threshold?: number): string {
  if (
    !values.length ||
    values.some(
      (v, i) =>
        !Number.isInteger(v.frame) ||
        v.frame < 0 ||
        !Number.isFinite(v.value) ||
        (i && v.frame <= values[i - 1]!.frame),
    ) ||
    (threshold !== undefined && !Number.isFinite(threshold))
  )
    throw Error('INVALID_DIAGNOSTIC_TRACE');
  const low = Math.min(0, ...values.map((v) => v.value)),
    high = Math.max(1e-6, threshold ?? 0, ...values.map((v) => v.value));
  const x = (f: number) => 70 + (f / Math.max(1, values.at(-1)!.frame)) * 850;
  const y = (v: number) => 260 - ((v - low) / (high - low)) * 190;
  const label = (v: number) => (Math.abs(v) < 1e-8 ? '0' : v.toPrecision(4));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="320" viewBox="0 0 960 320"><rect width="960" height="320" fill="#faf8f0"/><g font-family="sans-serif" fill="#183b38"><text x="24" y="28" font-size="20">${escape(title)}</text><text x="24" y="50" font-size="13">${escape(unit)} · frames, 24 fps · engineering diagnostic</text><path d="M70 70V260H920" fill="none" stroke="#637b74"/><text x="8" y="77" font-size="12">${label(high)}</text><text x="8" y="260" font-size="12">${label(low)}</text>${[
    0, 48, 96, 144, 191,
  ]
    .filter((f) => f <= values.at(-1)!.frame)
    .map((f) => `<text x="${x(f)}" y="284" font-size="12">${f}</text>`)
    .join(
      '',
    )}${threshold === undefined ? '' : `<path d="M70 ${y(threshold)}H920" stroke="#be573e" stroke-dasharray="6 4"/><text x="730" y="${y(threshold) - 5}" font-size="12">limit ${label(threshold)} ${escape(unit)}</text>`}<polyline points="${values.map((v) => `${x(v.frame)},${y(v.value)}`).join(' ')}" fill="none" stroke="#247b77" stroke-width="2"/><text x="70" y="307" font-size="12">Sampled frame data; no artistic approval</text></g></svg>`;
}
