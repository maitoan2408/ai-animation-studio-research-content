/** Fail closed on malformed results and projected overlaps. This is not a 3D collision test. */
const record=(x:unknown):x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x);
export function validateAlphaGate(raw:unknown,expectedSourceSha256:string):void {
 if (!record(raw) || !/^[a-f0-9]{64}$/.test(expectedSourceSha256) || raw.status!=='OBSERVATION_ONLY' ||
   raw.frames!==192 || raw.alphaThreshold!==128 || raw.sourceSha256!==expectedSourceSha256 ||
   !record(raw.overlap) || !record(raw.maximumPixels)) throw Error('ALPHA_GATE_REPORT');
 for (const id of ['mai.torso','an.torso']) {
  const hits=raw.overlap[id], max=raw.maximumPixels[id];
  if (!Array.isArray(hits) || typeof max!=='number' || !Number.isSafeInteger(max) || max<0)
    throw Error('ALPHA_GATE_REPORT');
  if (hits.length) throw Error(`ALPHA_GATE_OVERLAP ${id}`);
  if (max!==0) throw Error('ALPHA_GATE_REPORT');
 }
}
