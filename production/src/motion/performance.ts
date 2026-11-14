/** Data-only authoring boundary. Schema validity does not imply acting quality
 * or that a renderer implements the requested clip. */
export type PerformanceScript = {
  schemaVersion: 1;
  shot: string;
  intent: string;
  primaryClip: string;
  fps: 24;
  frames: number;
  actors: string[];
  props: string[];
  beats: {
    start: number;
    end: number;
    intent: string;
    actors: string[];
    emotion: string;
    emphasis: number;
    gazeTarget: string;
  }[];
  contacts: { actor: string; control: string; target: string; start: number; end: number }[];
  secondary: string[];
  releaseFrame: number;
  artStatus: 'development-asset-not-final-approved';
};
export type PerformanceCapabilities = {
  clips: readonly string[];
  intents: readonly string[];
  actors: Readonly<Record<string, readonly string[]>>;
  props: Readonly<Record<string, readonly string[]>>;
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, names: string[]) =>
  Object.keys(v).sort().join(',') === names.sort().join(',');
const id = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(v);
const list = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 32 && v.every(id) && new Set(v).size === v.length;
function freeze(v: unknown): void {
  if (v && typeof v === 'object') {
    for (const x of Object.values(v)) freeze(x);
    Object.freeze(v);
  }
}
export function parsePerformance(
  raw: unknown,
  capabilities: PerformanceCapabilities,
): PerformanceScript {
  const v: unknown = structuredClone(raw);
  if (
    !obj(v) ||
    !exact(v, [
      'schemaVersion',
      'shot',
      'intent',
      'primaryClip',
      'fps',
      'frames',
      'actors',
      'props',
      'beats',
      'contacts',
      'secondary',
      'releaseFrame',
      'artStatus',
    ]) ||
    v.schemaVersion !== 1 ||
    !id(v.shot) ||
    !id(v.intent) ||
    !id(v.primaryClip) ||
    v.fps !== 24 ||
    !Number.isInteger(v.frames) ||
    (v.frames as number) < 1 ||
    (v.frames as number) > 5760 ||
    !list(v.actors) ||
    !v.actors.length ||
    !list(v.props) ||
    !list(v.secondary) ||
    !Array.isArray(v.beats) ||
    !v.beats.length ||
    v.beats.length > 128 ||
    !Array.isArray(v.contacts) ||
    v.contacts.length > 128 ||
    !Number.isInteger(v.releaseFrame) ||
    (v.releaseFrame as number) < 0 ||
    (v.releaseFrame as number) >= (v.frames as number) ||
    v.artStatus !== 'development-asset-not-final-approved'
  )
    throw Error('PERFORMANCE_SCHEMA');
  if (!capabilities.clips.includes(v.primaryClip)) throw Error('PERFORMANCE_UNSUPPORTED_CLIP');
  const actors = v.actors,
    props = v.props;
  if (
    actors.some((a) => !Object.hasOwn(capabilities.actors, a)) ||
    props.some((p) => !Object.hasOwn(capabilities.props, p)) ||
    v.secondary.some((p) => !props.includes(p)) ||
    actors.some((a) => props.includes(a))
  )
    throw Error('PERFORMANCE_TARGET');
  let end = 0;
  for (const b of v.beats) {
    if (
      !obj(b) ||
      !exact(b, ['start', 'end', 'intent', 'actors', 'emotion', 'emphasis', 'gazeTarget']) ||
      !Number.isInteger(b.start) ||
      !Number.isInteger(b.end) ||
      b.start !== end ||
      (b.end as number) <= (b.start as number) ||
      (b.end as number) > (v.frames as number) ||
      !id(b.intent) ||
      !capabilities.intents.includes(b.intent) ||
      !list(b.actors) ||
      !b.actors.length ||
      b.actors.some((a) => !actors.includes(a)) ||
      !id(b.emotion) ||
      typeof b.emphasis !== 'number' ||
      !Number.isFinite(b.emphasis) ||
      b.emphasis < 0 ||
      b.emphasis > 1 ||
      !id(b.gazeTarget) ||
      ![...v.actors, ...v.props].includes(b.gazeTarget)
    )
      throw Error('PERFORMANCE_BEAT');
    end = b.end as number;
  }
  if (end !== v.frames) throw Error('PERFORMANCE_COVERAGE');
  const contacts: PerformanceScript['contacts'] = [];
  for (const c of v.contacts) {
    if (
      !obj(c) ||
      !exact(c, ['actor', 'control', 'target', 'start', 'end']) ||
      !id(c.actor) ||
      !id(c.control) ||
      !id(c.target) ||
      !v.actors.includes(c.actor) ||
      !capabilities.actors[c.actor]?.includes(c.control) ||
      !Number.isInteger(c.start) ||
      !Number.isInteger(c.end) ||
      (c.start as number) < 0 ||
      (c.end as number) <= (c.start as number) ||
      (c.end as number) > (v.frames as number)
    )
      throw Error('PERFORMANCE_CONTACT');
    const [prop, anchor, extra] = c.target.split('.');
    if (
      extra ||
      !prop ||
      !anchor ||
      !v.props.includes(prop) ||
      !capabilities.props[prop]?.includes(anchor)
    )
      throw Error('PERFORMANCE_CONTACT_TARGET');
    if (
      contacts.some(
        (x) =>
          x.actor === c.actor &&
          x.control === c.control &&
          x.start < (c.end as number) &&
          (c.start as number) < x.end,
      )
    )
      throw Error('PERFORMANCE_CONTACT_CONFLICT');
    contacts.push(c as unknown as PerformanceScript['contacts'][number]);
  }
  freeze(v);
  return v as unknown as PerformanceScript;
}
