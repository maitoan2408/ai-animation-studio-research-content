/** Local Q2 review HTTP boundary. No arbitrary paths, model HTML or shell code. */
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadCatalog, verifiedBytes} from './catalog.js';
import {ReviewError, fail, type Artifact} from './domain.js';
import {ReviewJournal} from './journal.js';

export function byteRange(header: string | undefined, size: number): {start: number; end: number} | null {
  if (header === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) fail('INVALID_RANGE', 416);
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) fail('INVALID_RANGE', 416);
  const start = first ?? Math.max(0, size - (last ?? 0));
  const end = first === null ? size - 1 : Math.min(last ?? size - 1, size - 1);
  if (start >= size || start > end || (first === null && last === 0)) fail('UNSATISFIABLE_RANGE', 416);
  return {start, end};
}
async function jsonBody(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type'] ?? '')) fail('JSON_REQUIRED', 415);
  if (Number(req.headers['content-length'] ?? 0) > 16_384) fail('BODY_TOO_LARGE', 413);
  let size = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk as Uint8Array); size += bytes.length;
    if (size > 16_384) fail('BODY_TOO_LARGE', 413);
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return fail('INVALID_JSON'); }
}
function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}
export interface ServerOptions {root: string; catalogFile: string; dataDir: string; port?: number; mode?: 'review' | 'test'}
export async function startReviewServer(options: ServerOptions) {
  const catalog = await loadCatalog(options.root, options.catalogFile);
  const mode = options.mode ?? 'review';
  const journal = await ReviewJournal.open(options.dataDir, catalog, mode);
  const token = randomBytes(32).toString('hex');
  let origin = '';
  const staticFiles = new Map([
    ['/', {file:'index.html',mime:'text/html; charset=utf-8'}],
    ['/app.js', {file:'app.js',mime:'text/javascript; charset=utf-8'}],
    ['/style.css', {file:'style.css',mime:'text/css; charset=utf-8'}],
  ]);
  const server = createServer((req, res) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    void (async () => {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') fail('ORIGIN_REJECTED', 403);
      const route = new URL(req.url ?? '/', origin).pathname;
      if (req.method === 'GET' && staticFiles.has(route)) {
        const resource = staticFiles.get(route)!;
        res.writeHead(200, {'content-type':resource.mime});
        res.end(await readFile(fileURLToPath(new URL(`./web/${resource.file}`, import.meta.url)))); return;
      }
      if (req.method === 'GET' && route === '/api/catalog') {
        json(res, 200, {catalog, csrfToken:token, mode, limits:'Reviewer identity and viewing/listening declarations are self-reported. Records do not close phase gates.'}); return;
      }
      if (req.method === 'GET' && (route === '/api/reviews' || route === '/api/export')) {
        if (route === '/api/export') res.setHeader('content-disposition', 'attachment; filename="q2-review.json"');
        json(res, 200, {schemaVersion:1, catalog, ...journal.snapshot(), phaseApproval:false}); return;
      }
      if (req.method === 'POST' && route === '/api/reviews') {
        if (req.headers['x-review-token'] !== token) fail('TOKEN_REQUIRED', 403);
        const input = await jsonBody(req);
        // Check the current bytes again before binding a new opinion to a hash.
        const id = input && typeof input === 'object' ? (input as Record<string, unknown>).artifactId : undefined;
        const artifact = catalog.artifacts.find(a => a.id === id) ?? fail('UNKNOWN_ARTIFACT', 404);
        await verifiedBytes(options.root, artifact.file, artifact.id);
        await verifiedBytes(options.root, artifact.masterFile, artifact.masterSha256);
        json(res, 201, await journal.append(input)); return;
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        const media = /^\/media\/([a-f0-9]{64})(\/master)?$/.exec(route);
        if (media || route === '/native') {
          const artifact: Artifact | undefined = media ? catalog.artifacts.find(a => a.id === media[1]) : undefined;
          if (media && !artifact) fail('UNKNOWN_ARTIFACT', 404);
          const master = Boolean(media?.[2]);
          const file = artifact ? (master ? artifact.masterFile : artifact.file) : catalog.native.file;
          const sha = artifact ? (master ? artifact.masterSha256 : artifact.id) : catalog.native.sha256;
          const bytes = await verifiedBytes(options.root, file, sha);
          res.setHeader('accept-ranges', 'bytes'); res.setHeader('etag', `"${sha}"`);
          let range: ReturnType<typeof byteRange>;
          try { range = byteRange(req.headers.range, bytes.length); }
          catch (error) { res.setHeader('content-range', `bytes */${bytes.length}`); throw error; }
          res.setHeader('content-type', artifact ? 'video/mp4' : 'application/zip');
          if (master || !artifact) res.setHeader('content-disposition', `attachment; filename="${artifact ? artifact.id + '-master.mp4' : 'native-r2.zip'}"`);
          if (range) {
            res.writeHead(206, {'content-range':`bytes ${range.start}-${range.end}/${bytes.length}`, 'content-length':range.end-range.start+1});
            res.end(req.method === 'HEAD' ? undefined : bytes.subarray(range.start, range.end+1));
          } else {
            res.writeHead(200, {'content-length':bytes.length}); res.end(req.method === 'HEAD' ? undefined : bytes);
          }
          return;
        }
      }
      fail('NOT_FOUND', 404);
    })().catch(error => {
      if (res.headersSent) { res.destroy(); return; }
      const known = error instanceof ReviewError;
      json(res, known ? error.status : 500, {error:known ? error.code : 'INTERNAL_ERROR'});
      if (!known) console.error('REVIEW_SERVER_FAILURE', error);
    });
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000;
  try {
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(options.port ?? 4311, '127.0.0.1', resolve); });
    const address = server.address(); if (!address || typeof address === 'string') fail('NO_LISTEN_ADDRESS', 500);
    origin = `http://127.0.0.1:${address.port}`;
  } catch (error) { await journal.close(); throw error; }
  return {origin, journal, catalog, async close() {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await journal.close();
  }};
}
