import { StudioError, type ProjectSpec, type Profile, type QC } from './domain.js';
import { Store } from './store.js';

export type RenderProgress = (progress: number, stage: string) => Promise<void>;
/** A renderer turns one validated revision into a QC-verified MP4 inside `dir`.
 * The job queue, attempts, cache and artifact publication do not depend on
 * which backend implements it. */
export type RenderFunction = (
  store: Store,
  spec: ProjectSpec,
  profile: Profile,
  dir: string,
  signal: AbortSignal,
  progress: RenderProgress,
) => Promise<{ file: string; qc: QC }>;

/** The old fixed-scene SVG renderer was removed. Until the production film
 * renderer is connected (roadmap G4), render jobs fail closed with an explicit
 * code instead of producing a scene that ignores the project. */
export const rendererNotConfigured: RenderFunction = async () => {
  throw new StudioError(
    'RENDERER_NOT_CONFIGURED',
    'No film renderer is connected to the Studio yet (roadmap G4).',
    503,
  );
};
