/** Replay provenance, independent of any live physics engine. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export type HeroPhysics = Readonly<{
  algorithm: 's05-revolute-v1';
  engine: 'rapier-0.21.0-deterministic-compat';
  gravity: number;
  hz: 240;
  solverIterations: 12;
  packageLockSha256: string;
  implementationSha256: string;
}>;
const contract = JSON.parse(
  readFileSync(new URL('../../brief/quality/physics-contract.json', import.meta.url), 'utf8'),
) as { gravity: number };
export const heroPhysics: HeroPhysics = Object.freeze({
  algorithm: 's05-revolute-v1',
  engine: 'rapier-0.21.0-deterministic-compat',
  gravity: contract.gravity,
  hz: 240,
  solverIterations: 12,
  packageLockSha256: createHash('sha256')
    .update(readFileSync(new URL('../../package-lock.json', import.meta.url)))
    .digest('hex'),
  implementationSha256: createHash('sha256')
    .update(
      JSON.stringify(
        ['hero.ts', 'engines.ts', 'bake.ts', 'recipe.ts'].map((name) => ({
          name,
          source: readFileSync(new URL(name, import.meta.url), 'utf8'),
        })),
      ),
    )
    .digest('hex'),
});
export function validatePhysics(v: unknown): asserts v is HeroPhysics {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('PHYSICS_RECIPE');
  const p = v as Record<string, unknown>;
  if (
    Object.keys(p).sort().join(',') !==
      'algorithm,engine,gravity,hz,implementationSha256,packageLockSha256,solverIterations' ||
    p.algorithm !== 's05-revolute-v1' ||
    p.engine !== 'rapier-0.21.0-deterministic-compat' ||
    typeof p.gravity !== 'number' ||
    !Number.isFinite(p.gravity) ||
    p.gravity <= 0 ||
    p.gravity > 100 ||
    p.hz !== 240 ||
    p.solverIterations !== 12 ||
    typeof p.packageLockSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(p.packageLockSha256) ||
    typeof p.implementationSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(p.implementationSha256)
  )
    throw Error('PHYSICS_RECIPE');
}
