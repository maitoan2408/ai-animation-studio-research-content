/** Produce one isolated candidate and a backend-independent frame stream.
 * Optional --native-input uses existing verified texture metadata for Blender.
 * Outputs are never overwritten; a failed attempt remains inspectable.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { heroInput, heroFrame, performanceIR, r3 } from './hero.js';
import { bakeHero } from '../physics/hero.js';
import { critic } from './critic.js';
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
  await writeFile(path.join(out, 'input.json'), JSON.stringify(input, null, 2) + '\n');
  const bake = await bakeHero(input),
    again = await bakeHero(input);
  if (bake.sha256 !== again.sha256) throw Error('BAKE_NONDETERMINISTIC');
  const golden = JSON.parse(
    await readFile(path.join(root, 'brief/quality/physics-golden.json'), 'utf8'),
  );
  if (bake.sha256 !== golden.heroBakeSha256) throw Error('BAKE_REFERENCE_MISMATCH');
  await writeFile(path.join(out, 'bake.json'), JSON.stringify(bake, null, 2) + '\n');
  await writeFile(
    path.join(out, 'performance.json'),
    JSON.stringify(performanceIR, null, 2) + '\n',
  );
  const report = {
    ...critic(pack, input, bake),
    bakeSha256: bake.sha256,
    inputSha256: bake.data.inputSha256,
    sameRunHash: true,
  };
  await writeFile(path.join(out, 'critic.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.status !== 'PASS_GEOMETRY') throw Error('HERO_CRITIC_FAILED');
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
