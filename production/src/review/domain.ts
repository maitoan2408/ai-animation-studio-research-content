/** Q2 review contracts. A recorded opinion never changes a phase gate. */
import {createHash} from 'node:crypto';

export class ReviewError extends Error {
  constructor(readonly code: string, readonly status = 400, detail = code) {
    super(detail);
  }
}
export function fail(code: string, status = 400): never { throw new ReviewError(code, status); }
export const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('EXPECTED_OBJECT');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail('UNKNOWN_FIELD');
}
export function text(value: unknown, max = 4000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail('INVALID_TEXT');
  return value as string;
}
export function integer(value: unknown, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) fail('INVALID_INTEGER');
  return value as number;
}
export function digest(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail('INVALID_SHA256');
  return value as string;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') fail('INVALID_BOOLEAN');
  return value as boolean;
}
export interface Shot {id: string; startFrame: number; endFrame: number; hasSpeech: boolean}
export interface Artifact {
  id: string; revision: string; file: string; masterFile: string; masterSha256: string;
  profile: 'web-review-srgb-1' | 'web-review-srgb-full-2'; colorStatus: 'pending' | 'pass';
  fps: 24; frames: number; width: 1920; height: 1080;
  loudnessLUFS: number; truePeakDbTP: number; shots: Shot[];
}
export interface Catalog {schemaVersion: 1; title: string; artifacts: Artifact[]; native: {file: string; sha256: string}}
export function parseCatalog(value: unknown): Catalog {
  const input = object(value);
  keys(input, ['schemaVersion', 'title', 'artifacts', 'native']);
  if (input.schemaVersion !== 1 || !Array.isArray(input.artifacts) || !input.artifacts.length || input.artifacts.length > 20) fail('INVALID_CATALOG');
  const artifacts = input.artifacts.map(raw => {
    const a = object(raw);
    keys(a, ['id','revision','file','masterFile','masterSha256','profile','colorStatus','fps','frames','width','height','loudnessLUFS','truePeakDbTP','shots']);
    if (a.fps !== 24 || a.width !== 1920 || a.height !== 1080 || !['web-review-srgb-1','web-review-srgb-full-2'].includes(String(a.profile))) fail('INVALID_PROFILE');
    if (!['pending','pass'].includes(String(a.colorStatus))) fail('INVALID_COLOR_STATUS');
    const frames = integer(a.frames, 1, 24 * 600);
    if (!Array.isArray(a.shots) || !a.shots.length || a.shots.length > 100) fail('INVALID_TIMELINE');
    let cursor = 0;
    const shots = a.shots.map(rawShot => {
      const s = object(rawShot); keys(s, ['id','startFrame','endFrame','hasSpeech']);
      const shot = {id: text(s.id, 40), startFrame: integer(s.startFrame, 0, frames - 1),
        endFrame: integer(s.endFrame, 1, frames), hasSpeech: boolean(s.hasSpeech)};
      if (shot.startFrame !== cursor || shot.endFrame <= cursor) fail('NONCONTIGUOUS_TIMELINE');
      cursor = shot.endFrame; return shot;
    });
    if (cursor !== frames || new Set(shots.map(s => s.id)).size !== shots.length) fail('INVALID_TIMELINE');
    for (const field of ['loudnessLUFS','truePeakDbTP']) if (typeof a[field] !== 'number' || !Number.isFinite(a[field])) fail('INVALID_AUDIO_METRIC');
    return {...a, id: digest(a.id), revision: text(a.revision, 50), file: text(a.file, 300),
      masterFile: text(a.masterFile, 300), masterSha256: digest(a.masterSha256), frames, shots} as Artifact;
  });
  if (new Set(artifacts.map(a => a.id)).size !== artifacts.length || new Set(artifacts.map(a => a.revision)).size !== artifacts.length) fail('DUPLICATE_ARTIFACT');
  const native = object(input.native); keys(native, ['file','sha256']);
  return {schemaVersion: 1, title: text(input.title, 200), artifacts,
    native: {file: text(native.file, 300), sha256: digest(native.sha256)}};
}
export const weights = {art: 30, acting: 35, layout: 15, continuity: 10, editability: 10} as const;
export type Scores = Record<keyof typeof weights, number>;
export interface ReviewInput {
  requestId: string; expectedHead: string | null; artifactId: string; masterSha256: string;
  revision: string; shotId: string; frame: number;
  reviewer: {name: string; kind: 'human' | 'delegated-agent' | 'automated-test'};
  decision: 'note' | 'needs-changes' | 'accepted'; note: string; scores: Scores | null;
  observed: {normalSpeed: boolean; slowSpeed: boolean; listened: boolean}; blockingIssue: boolean;
}
export function scoreTotal(scores: Scores): number {
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + scores[key as keyof Scores] * weight / 5, 0);
}
export function parseReview(value: unknown, catalog: Catalog, mode: 'review' | 'test'): ReviewInput {
  const r = object(value);
  keys(r, ['requestId','expectedHead','artifactId','masterSha256','revision','shotId','frame','reviewer','decision','note','scores','observed','blockingIssue']);
  if (typeof r.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(r.requestId)) fail('INVALID_REQUEST_ID');
  const artifactId = digest(r.artifactId);
  const a = catalog.artifacts.find(item => item.id === artifactId) ?? fail('UNKNOWN_ARTIFACT', 404);
  if (r.masterSha256 !== a.masterSha256 || r.revision !== a.revision) fail('ARTIFACT_BINDING_MISMATCH', 409);
  const frame = integer(r.frame, 0, a.frames - 1);
  const shot = a.shots.find(s => s.id === r.shotId) ?? fail('UNKNOWN_SHOT');
  if (frame < shot.startFrame || frame >= shot.endFrame) fail('FRAME_SHOT_MISMATCH');
  const reviewer = object(r.reviewer); keys(reviewer, ['name','kind']);
  if (!['human','delegated-agent','automated-test'].includes(String(reviewer.kind))) fail('INVALID_REVIEWER');
  if ((mode === 'test') !== (reviewer.kind === 'automated-test')) fail('REVIEW_MODE_MISMATCH');
  if (!['note','needs-changes','accepted'].includes(String(r.decision))) fail('INVALID_DECISION');
  const observed = object(r.observed); keys(observed, ['normalSpeed','slowSpeed','listened']);
  const observations = {normalSpeed: boolean(observed.normalSpeed), slowSpeed: boolean(observed.slowSpeed), listened: boolean(observed.listened)};
  const blockingIssue = boolean(r.blockingIssue);
  let scores: Scores | null = null;
  if (r.scores !== null) {
    const supplied = object(r.scores); keys(supplied, Object.keys(weights));
    scores = Object.fromEntries(Object.keys(weights).map(k => [k, integer(supplied[k], 1, 5)])) as Scores;
  }
  if (r.decision === 'accepted') {
    if (a.colorStatus !== 'pass') fail('COLOR_GATE_PENDING', 409);
    if (!scores || scoreTotal(scores) < 80 || scores.art < 4 || scores.acting < 4 || blockingIssue) fail('RUBRIC_NOT_MET');
    if (!observations.normalSpeed || !observations.slowSpeed || (shot.hasSpeech && !observations.listened)) fail('OBSERVATIONS_REQUIRED');
  }
  return {requestId: r.requestId, expectedHead: r.expectedHead === null ? null : digest(r.expectedHead),
    artifactId, masterSha256: a.masterSha256, revision: a.revision, shotId: shot.id, frame,
    reviewer: {name: text(reviewer.name, 120), kind: reviewer.kind as ReviewInput['reviewer']['kind']},
    decision: r.decision as ReviewInput['decision'], note: text(r.note), scores, observed: observations, blockingIssue};
}
