/** Produce one isolated candidate and a backend-independent frame stream.
 * Optional --native-input uses existing verified texture metadata for Blender.
 * Outputs are never overwritten; a failed attempt remains inspectable.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { heroInput, heroFrame, performanceIR, validateHeroPerformance, r3 } from './hero.js';
import { bakeHero } from '../physics/hero.js';
import { digest } from '../physics/bake.js';
import { critic } from './critic.js';
import { inspectHeroGround } from '../continuity/hero-ground.js';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(root, 'out/quality-hero', randomUUID());
await mkdir(out, { recursive: true });
try {
  const { values } = parseArgs({
    options: { 'native-input': { type: 'boolean' }, textures: { type: 'string' } },
  });
  if (values.textures && !values['native-input']) throw Error('TEXTURES_REQUIRE_NATIVE_INPUT');
  const pack = JSON.parse(
    await readFile(path.join(root, 'assets/lantern-polish-1/manifest.json'), 'utf8'),
  );
  const input = heroInput(pack);
  const performance = validateHeroPerformance(performanceIR);
  await writeFile(path.join(out, 'input.json'), JSON.stringify(input, null, 2) + '\n');
  const bake = await bakeHero(input),
    again = await bakeHero(input);
  if (bake.sha256 !== again.sha256) throw Error('BAKE_NONDETERMINISTIC');
  const golden = JSON.parse(
    await readFile(path.join(root, 'brief/quality/physics-golden.json'), 'utf8'),
  );
  if (bake.sha256 !== golden.heroBakeSha256) throw Error('BAKE_REFERENCE_MISMATCH');
  await writeFile(path.join(out, 'bake.json'), JSON.stringify(bake, null, 2) + '\n');
  await writeFile(path.join(out, 'performance.json'), JSON.stringify(performance, null, 2) + '\n');
  const report = {
    ...critic(pack, input, bake),
    bakeSha256: bake.sha256,
    inputSha256: bake.data.inputSha256,
    executionSha256: bake.binding!.executionSha256,
    performanceSha256: digest(performance),
    sameRunHash: true,
  };
  await writeFile(path.join(out, 'critic.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.status !== 'PASS_GEOMETRY') throw Error('HERO_CRITIC_FAILED');
  const groundBytes = await readFile(path.join(root, 'brief/quality/ground-fixture.json'));
  const ground = { ...inspectHeroGround(pack, JSON.parse(groundBytes.toString()), f => heroFrame(pack, input, bake, f)),
    fixtureSha256: createHash('sha256').update(groundBytes).digest('hex'), bakeSha256: bake.sha256 };
  await writeFile(path.join(out, 'ground-critic.json'), JSON.stringify(ground, null, 2) + '\n');
  if (ground.status !== 'PASS') throw Error('HERO_GROUND_CRITIC_FAILED');
  if (values['native-input']) {
    const textures = JSON.parse(
      await readFile(
        values.textures
          ? path.resolve(values.textures)
          : path.join(root, 'out/art-q2-polish/textures.json'),
        'utf8',
      ),
    );
    const frames = Array.from({ length: 192 }, (_, f) => heroFrame(pack, input, bake, f));
    await writeFile(
      path.join(out, 'S05.json'),
      JSON.stringify({
        shot: 'S05',
        fps: 24,
        pack,
        textures,
        edit: { ...r3, qualityCandidate: 'U3-secondary-v1', bakeSha256: bake.sha256 },
        frames,
      }),
    );
  }
  console.log(JSON.stringify({ output: out, ...report }));
} catch (error) {
  await writeFile(
    path.join(out, 'failure.json'),
    JSON.stringify({ status: 'FAIL', error: String(error) }, null, 2) + '\n',
  );
  console.error(JSON.stringify({ output: out, error: String(error) }));
  process.exitCode = 1;
}
