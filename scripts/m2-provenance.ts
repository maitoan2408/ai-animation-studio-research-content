import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { hash } from '../src/domain.js';

/** Checkout ownership differs from the process UID inside GitHub containers.
 * Trust only this explicitly selected repository, never all repositories and
 * never modify the user's global Git configuration. Run before expensive work.
 */
export function m2Provenance(root = process.cwd()) {
  const git = (...args: string[]) => {
    const result = spawnSync('git', ['-c', 'safe.directory=' + path.resolve(root), ...args], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 24 * 1024 * 1024,
    });
    if (result.status !== 0 || result.error)
      throw Error('M2_SOURCE_PROVENANCE: ' + String(result.error || result.stderr).slice(0, 2000));
    return result.stdout;
  };
  const checkoutCommit = git('rev-parse', 'HEAD').trim();
  const sourceCommit = process.env.SOURCE_HEAD_SHA || checkoutCommit;
  if (!/^[0-9a-f]{40}$/.test(checkoutCommit) || !/^[0-9a-f]{40}$/.test(sourceCommit))
    throw Error('M2_SOURCE_SHA_INVALID');
  return {
    sourceCommit,
    checkoutCommit,
    trackedDiffSha256: hash(
      git(
        'diff',
        'HEAD',
        '--',
        'src',
        'scripts',
        'web',
        'tests',
        'examples',
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'tsconfig.m2.json',
      ),
    ),
  };
}
