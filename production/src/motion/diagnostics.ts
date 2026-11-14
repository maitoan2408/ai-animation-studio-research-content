/** Visual U7 evidence for an existing, validated hero. Never publishes a film. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { heroFrame, validateHeroPerformance } from './hero.js';
import { validateHeroInput, type HeroInput } from '../physics/hero.js';
import { validateBake, digest } from '../physics/bake.js';
import { heroPhysics } from '../physics/recipe.js';
import { critic } from './critic.js';
import { curveSvg } from './diagnostic-svg.js';
import type { ArtPack, SceneFrame } from '../scene/types.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--hero')
  throw Error('USAGE: quality:diagnostics -- --hero <quality:hero output>');
const source = path.resolve(args[1]!);
const out = path.join(root, 'out/quality-diagnostics', randomUUID());
await mkdir(out, { recursive: true });
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
try {
  const pack = JSON.parse(
    await readFile(path.join(root, 'assets/lantern-polish-1/manifest.json'), 'utf8'),
  ) as ArtPack;
  const input = JSON.parse(await readFile(path.join(source, 'input.json'), 'utf8')) as HeroInput;
  validateHeroInput(input);
  const bake = validateBake(JSON.parse(await readFile(path.join(source, 'bake.json'), 'utf8')));
  const performance = validateHeroPerformance(
    JSON.parse(await readFile(path.join(source, 'performance.json'), 'utf8')),
  );
  const report = critic(pack, input, bake);
  if (report.status !== 'PASS_GEOMETRY') throw Error('DIAGNOSTIC_GEOMETRY_FAILED');
  const frames = [0, 24, 60, 72, 107, 108, 120, 144, 168, 191];
  const scenes = frames.map((f) => heroFrame(pack, input, bake, f));
  const files = new Map<string, string>();
  for (const id of new Set(scenes.flatMap((s) => s.sprites.map((x) => x.asset)))) {
    const asset = pack.assets.find((a) => a.id === id)!;
    const base = path.resolve(root, 'assets/lantern-polish-1');
    const file = path.resolve(base, asset.file);
    if (!file.startsWith(base + path.sep)) throw Error('DIAGNOSTIC_ASSET_PATH');
    const bytes = await readFile(file);
    if (sha(bytes) !== asset.sha256) throw Error('DIAGNOSTIC_ASSET_HASH');
    files.set(id, 'data:image/svg+xml;base64,' + bytes.toString('base64'));
  }
  const sprites = (scene: SceneFrame, ghost = false) =>
    [...scene.sprites]
      .filter((s) => !ghost || ['lamp', 'mai.right-hand', 'an.right-hand'].includes(s.id))
      .sort((a, b) => a.z - b.z)
      .map((s) => {
        const a = pack.assets.find((a) => a.id === s.asset)!;
        return `<g transform="translate(${s.x} ${s.y}) rotate(${s.rotation}) scale(${s.scaleX} ${s.scaleY})"><image href="${files.get(s.asset)}" x="${-a.pivot[0]}" y="${-a.pivot[1]}" width="${a.width}" height="${a.height}" opacity="${s.opacity}"/></g>`;
      })
      .join('');
  const camera = scenes[6]!.camera;
  const transform = (c: SceneFrame['camera']) =>
    `translate(960 540) scale(${c.zoom}) translate(${-c.x} ${-c.y})`;
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2420" viewBox="0 0 1600 2420"><rect width="100%" height="100%" fill="#faf8f0"/><text x="24" y="30" font-family="sans-serif" font-size="20">S05 development art · diagnostic preview · no art approval / no native color parity</text>${scenes.map((s, i) => `<svg x="${(i % 2) * 800}" y="${50 + Math.floor(i / 2) * 470}" width="800" height="450" viewBox="0 0 1920 1080"><g transform="${transform(s.camera)}">${sprites(s)}</g><rect width="600" height="65" fill="#faf8f0"/><text x="20" y="45" font-size="36" font-family="sans-serif">Frame ${frames[i]}</text></svg>`).join('')}</svg>`;
  const ghosts = [100, 108, 116, 124].map((f) => heroFrame(pack, input, bake, f));
  const onion = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="#faf8f0"/><g transform="${transform(camera)}">${ghosts.map((s, i) => `<g opacity="${0.2 + i * 0.18}">${sprites(s, true)}</g>`).join('')}<polyline points="${report.samples.map((s) => `${s.x},${s.y}`).join(' ')}" fill="none" stroke="#be573e" stroke-width="3"/></g><text x="24" y="40" font-family="sans-serif" font-size="24">Ghosts 100/108/116/124 · lantern pivot trail (stage space, fixed camera)</text></svg>`;
  await writeFile(path.join(out, 'contact-sheet.svg'), sheet);
  await writeFile(path.join(out, 'onion-trail.svg'), onion);
  const charts = [
    [
      'rotation',
      'Rotation',
      'degrees',
      report.samples.map((s) => ({ frame: s.frame, value: s.rotationDegrees })),
      undefined,
    ],
    [
      'contact',
      'Joint contact',
      'projected px',
      report.samples.map((s) => ({ frame: s.frame, value: s.anchorPixels })),
      1,
    ],
    [
      'foot',
      'Foot drift versus authored baseline',
      'projected px',
      report.samples.map((s) => ({ frame: s.frame, value: s.footPixels })),
      1,
    ],
  ] as const;
  for (const [name, title, unit, values, limit] of charts)
    await writeFile(path.join(out, `${name}.svg`), curveSvg(title, unit, values, limit));
  let points = report.samples.map((s) => ({ frame: s.frame, x: s.x, y: s.y }));
  for (const [name, unit] of [
    ['velocity', 'stage px/s'],
    ['acceleration', 'stage px/s²'],
    ['jerk', 'stage px/s³'],
  ]) {
    points = points
      .slice(1)
      .map((p, i) => ({
        frame: p.frame,
        x: (p.x - points[i]!.x) * 24,
        y: (p.y - points[i]!.y) * 24,
      }));
    await writeFile(
      path.join(out, `${name}.svg`),
      curveSvg(
        name!,
        unit!,
        points.map((p) => ({ frame: p.frame, value: Math.hypot(p.x, p.y) })),
      ),
    );
  }
  const browser = await puppeteer.launch({
    executablePath: process.env.STUDIO_BROWSER ?? '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 2420, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0">${sheet}</body>`);
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.querySelectorAll('image')).map((e) => {
          const img = new Image();
          img.src = e.getAttribute('href')!;
          return img.decode();
        }),
      );
    });
    await page.screenshot({ path: path.join(out, 'contact-sheet.jpg'), type: 'jpeg', quality: 85 });
  } finally {
    await browser.close();
  }
  await writeFile(path.join(out, 'measurements.json'), JSON.stringify(report, null, 2) + '\n');
  const names = [
    'contact-sheet.svg',
    'contact-sheet.jpg',
    'onion-trail.svg',
    'rotation.svg',
    'contact.svg',
    'foot.svg',
    'velocity.svg',
    'acceleration.svg',
    'jerk.svg',
    'measurements.json',
  ];
  const outputs: Record<string, string> = {};
  for (const n of names) outputs[n] = sha(await readFile(path.join(out, n)));
  const manifest = {
    status: 'PASS_DIAGNOSTICS',
    source,
    bakeSha256: bake.sha256,
    executionSha256: bake.binding!.executionSha256,
    physics: heroPhysics,
    performanceSha256: digest(performance),
    frames: 192,
    outputs,
    limits: [
      'Development art; SVG diagnostic preview, not native/color parity',
      'Derivative metrics descriptive, not aesthetic scores',
      'No listening or independent operator approval',
    ],
  };
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, ...manifest }));
} catch (error) {
  await writeFile(
    path.join(out, 'failure.json'),
    JSON.stringify({ status: 'FAIL', error: String(error) }, null, 2),
  );
  throw error;
}
