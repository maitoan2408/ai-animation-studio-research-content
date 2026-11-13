/** Reproducible engine comparison. Raw samples stay out of Git; reports are small. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate, versions, solverProfiles, contract, type Engine } from './engines.js';
import { measure } from './measure.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'out/physics-spike', randomUUID());
await mkdir(out, { recursive: true });
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const results = [];
for (const engine of ['planck', 'rapier'] as Engine[]) {
  const started = performance.now();
  const p = await simulate(engine, 'pendulum'),
    d = await simulate(engine, 'drop'),
    damped = await simulate(engine, 'pendulum', 0.35);
  const raw = { p, d, damped },
    again = {
      p: await simulate(engine, 'pendulum'),
      d: await simulate(engine, 'drop'),
      damped: await simulate(engine, 'pendulum', 0.35),
    };
  const sameRunHash = hash(raw) === hash(again);
  const result = {
    engine,
    version: versions[engine],
    solver: solverProfiles[engine],
    ...measure(p, d, damped),
    sameRunHash,
    bakeSha256: hash(raw),
    elapsedMs: performance.now() - started,
  };
  results.push(result);
  await writeFile(path.join(out, engine + '-raw.json'), JSON.stringify(raw));
}
const lock = await readFile(path.join(root, 'package-lock.json'));
const golden = JSON.parse(
  await readFile(path.join(root, 'brief/quality/physics-golden.json'), 'utf8'),
);
const selected = results.find((r) => r.engine === 'rapier')!;
const referenceHashMatches = selected.bakeSha256 === golden.rapierFixtureSha256;
const report = {
  status:
    results.every((r) => r.engineeringPass && r.sameRunHash) &&
    selected.metrics.strictZeroPenetration &&
    referenceHashMatches
      ? 'PASS_ENGINEERING'
      : 'FAIL',
  referenceHashMatches,
  results,
  contract,
  lockSha256: createHash('sha256').update(lock).digest('hex'),
  host: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
  },
  limits: [
    'Strict zero penetration is separately reported and is not relaxed by the engineering tolerance.',
    'Two runs on this host do not alone establish cross-platform determinism or independent operator acceptance.',
    'No creative approval, broad scene benchmark, or production engine selection.',
  ],
};
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: out, ...report }));
if (report.status === 'FAIL') process.exitCode = 1;
