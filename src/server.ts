import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Studio } from './application.js';
import { StudioError, errorInfo, hash, type Project, type Artifact } from './domain.js';
import { doctor } from './process.js';
import { frameSvg } from './rig.js';
import { toAnimationIR, toLegacyProjectSpec } from './animation-ir.js';
import { mixAudio } from './audio.js';
import { MotionService } from './motion-service.js';
import { DirectorService } from './director.js';

const revisionRequest = z.object({ expectedRevision: z.string(), spec: z.unknown() }).strict();
const voiceRequest = z.object({ expectedRevision: z.string() }).strict();
const uploadRequest = z
  .object({ expectedRevision: z.string(), sceneId: z.string(), base64: z.string().max(32_000_000) })
  .strict();
const renderRequest = z
  .object({ revisionId: z.string(), profile: z.enum(['preview', 'final']) })
  .strict();
const reviewRequest = z
  .object({
    reviewer: z.string(),
    decision: z.enum(['approved', 'changes_requested']),
    notes: z.string(),
    frame: z.number().optional(),
  })
  .strict();
const createRequest = z
  .object({
    script: z.string(),
    title: z.string().min(1).max(100),
    style: z.enum(['paper-cut', 'multiplane', 'shadow-box']),
    language: z.enum(['vi', 'en']),
  })
  .strict();
function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new StudioError('INVALID_REQUEST', parsed.error.message);
  return parsed.data;
}
async function body(request: http.IncomingMessage): Promise<unknown> {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw new StudioError('CONTENT_TYPE', 'Cần application/json.', 415);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 40_000_000) throw new StudioError('BODY_TOO_LARGE', 'Request vượt quá 40 MB.', 413);
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new StudioError('INVALID_JSON', 'JSON không hợp lệ.');
  }
}

export async function serve(app: Studio, port = 4310) {
  const motion = new MotionService(app.store.root);
  const director = new DirectorService(app);
  await motion.init();
  const staticFiles = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/motion', ['motion.html', 'text/html; charset=utf-8']],
    ['/director', ['director.html', 'text/html; charset=utf-8']],
    ['/director.js', ['director.js', 'text/javascript; charset=utf-8']],
    ['/motion.js', ['motion.js', 'text/javascript; charset=utf-8']],
    ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ]);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    const json = (value: unknown, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    try {
      const address = server.address(),
        actualPort = typeof address === 'object' ? address?.port : port;
      const allowedHosts = [`127.0.0.1:${actualPort}`, `localhost:${actualPort}`];
      if (!allowedHosts.includes(req.headers.host ?? ''))
        throw new StudioError('INVALID_HOST', 'Studio chỉ nhận host localhost.', 403);
      if (
        req.headers.origin &&
        !allowedHosts.map((h) => 'http://' + h).includes(req.headers.origin)
      )
        throw new StudioError('INVALID_ORIGIN', 'Origin không được phép.', 403);
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${actualPort}`),
        parts = url.pathname.split('/').filter(Boolean),
        method = req.method;
      const staticFile = staticFiles.get(url.pathname);
      if (method === 'GET' && staticFile) {
        res.writeHead(200, { 'Content-Type': staticFile[1]! });
        res.end(await readFile(fileURLToPath(new URL('../web/' + staticFile[0], import.meta.url))));
        return;
      }
      if (parts[0] !== 'api') throw new StudioError('NOT_FOUND', 'Không tìm thấy endpoint.', 404);
      if (method === 'GET' && parts.length === 2 && parts[1] === 'health') {
        json({ ok: !app.workerError, workerError: app.workerError }, app.workerError ? 503 : 200);
        return;
      }
      if (method === 'GET' && parts.length === 2 && parts[1] === 'doctor') {
        json(await doctor());
        return;
      }
      // M5 Director uses only the real root Studio executor with explicit approval.
      // It never runs user-supplied code or silently overwrites human revisions.
      if (parts[1] === 'director' && parts.length === 3 && method === 'POST') {
        if (parts[2] === 'plan') {
          json(director.plan(await body(req)));
          return;
        }
        if (parts[2] === 'run') {
          const input = validate(
            z.object({ plan: z.unknown(), approved: z.literal(true) }).strict(),
            await body(req),
          );
          json(await director.run(input.plan, input.approved), 201);
          return;
        }
      }
      // M3 Character Motion: separate versioned project, same localhost Studio.
      // Unknown keys, foreign origins and stale revisions fail before native render.
      if (parts[1] === 'motion') {
        if (parts.length === 3 && parts[2] === 'validate' && method === 'POST') {
          const input = validate(z.object({ project: z.unknown() }).strict(), await body(req));
          json(await motion.validate(input.project));
          return;
        }
        if (parts.length === 3 && parts[2] === 'project') {
          if (method === 'GET') {
            json(await motion.get());
            return;
          }
          if (method === 'POST') {
            const input = validate(
              z
                .object({
                  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
                  project: z.unknown(),
                })
                .strict(),
              await body(req),
            );
            json(await motion.save(input.expectedRevision, input.project), 201);
            return;
          }
        }
        if (parts.length === 3 && parts[2] === 'jobs' && method === 'POST') {
          const input = validate(
            z.object({ revision: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
            await body(req),
          );
          json(await motion.render(input.revision), 202);
          return;
        }
        if (parts.length === 4 && parts[2] === 'jobs' && method === 'GET') {
          json(await motion.job(parts[3]!));
          return;
        }
        if (parts.length === 5 && parts[2] === 'jobs' && parts[4] === 'video' && method === 'GET') {
          const bytes = await motion.video(parts[3]!);
          const range = req.headers.range;
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          if (range) {
            const match = /^bytes=(\d+)-(\d*)$/.exec(range);
            const start = Number(match?.[1]),
              end = match?.[2] ? Number(match[2]) : bytes.length - 1;
            if (!match || start > end || start >= bytes.length || end >= bytes.length) {
              res.writeHead(416, { 'Content-Range': 'bytes */' + bytes.length });
              res.end();
              return;
            }
            res.writeHead(206, {
              'Content-Range': 'bytes ' + start + '-' + end + '/' + bytes.length,
              'Content-Length': end - start + 1,
            });
            res.end(bytes.subarray(start, end + 1));
          } else {
            res.writeHead(200, { 'Content-Length': bytes.length });
            res.end(bytes);
          }
          return;
        }
      }
      if (parts[1] === 'projects' && parts.length === 2) {
        if (method === 'GET') {
          json(
            (await app.store.list<Project>('projects')).sort((a, b) =>
              b.updatedAt.localeCompare(a.updatedAt),
            ),
          );
          return;
        }
        if (method === 'POST') {
          const input = validate(createRequest, await body(req));
          json(await app.create(input.script, input.title, input.style, input.language), 201);
          return;
        }
      }
      if (parts[1] === 'import' && parts.length === 2 && method === 'POST') {
        json(await app.import(await body(req)), 201);
        return;
      }
      const id = parts[2];
      if (id && parts[1] === 'projects') {
        if (parts.length === 3 && method === 'GET') {
          json(await app.snapshot(id));
          return;
        }
        if (parts.length === 4 && parts[3] === 'revisions' && method === 'POST') {
          const input = validate(revisionRequest, await body(req));
          json(await app.store.revise(id, input.expectedRevision, input.spec), 201);
          return;
        }
        if (parts.length === 4 && parts[3] === 'voice' && method === 'POST') {
          const input = validate(voiceRequest, await body(req));
          json(await app.voice(id, input.expectedRevision), 201);
          return;
        }
        if (parts.length === 4 && parts[3] === 'audio' && method === 'POST') {
          const input = validate(uploadRequest, await body(req));
          json(
            await app.upload(
              id,
              input.expectedRevision,
              input.sceneId,
              Buffer.from(input.base64, 'base64'),
            ),
            201,
          );
          return;
        }
        if (parts.length === 4 && parts[3] === 'jobs' && method === 'POST') {
          const input = validate(renderRequest, await body(req));
          json(await app.enqueue(id, input.revisionId, input.profile), 202);
          return;
        }
        if (parts.length === 4 && parts[3] === 'export' && method === 'GET') {
          res.setHeader('Content-Disposition', `attachment; filename="${id}.studio.json"`);
          json(await app.export(id, url.searchParams.get('revision') ?? undefined));
          return;
        }
        if (parts.length === 4 && parts[3] === 'preview' && method === 'GET') {
          const current = await app.store.current(id);
          const requested = url.searchParams.get('revision');
          const revision = requested
            ? await app.store.get<typeof current.revision>('revisions', requested)
            : current.revision;
          if (revision.projectId !== id)
            throw new StudioError('REVISION_MISMATCH', 'Revision không thuộc project.');
          const frame = Number(url.searchParams.get('frame') ?? 0);
          if (!Number.isFinite(frame) || frame < 0)
            throw new StudioError('INVALID_FRAME', 'Frame không hợp lệ.');
          const sceneSpec = toLegacyProjectSpec(toAnimationIR(revision.spec));
          const { envelopes } = await mixAudio(app.store, sceneSpec);
          res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
          res.end(frameSvg(sceneSpec, frame, envelopes));
          return;
        }
      }
      if (id && parts[1] === 'jobs') {
        if (parts.length === 3 && method === 'GET') {
          json(await app.store.get('jobs', id));
          return;
        }
        if (parts.length === 4 && method === 'POST' && ['cancel', 'retry'].includes(parts[3]!)) {
          validate(z.object({}).strict(), await body(req));
          json(
            parts[3] === 'retry' ? await app.retry(id) : ((await app.cancel(id)) ?? { ok: true }),
          );
          return;
        }
      }
      if (id && parts[1] === 'artifacts') {
        if (parts.length === 4 && parts[3] === 'reviews' && method === 'POST') {
          json(await app.store.review(id, validate(reviewRequest, await body(req))), 201);
          return;
        }
        if (parts.length === 4 && parts[3] === 'video' && method === 'GET') {
          const artifact = await app.store.get<Artifact>('artifacts', id),
            bytes = await readFile(app.store.artifactFile(id));
          if (hash(bytes) !== artifact.sha256)
            throw new StudioError('ARTIFACT_HASH_MISMATCH', 'Video không còn khớp bản đã QC.');
          const range = req.headers.range;
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          if (range) {
            const match = /^bytes=(\d+)-(\d*)$/.exec(range);
            const start = Number(match?.[1]),
              end = match?.[2] ? Number(match[2]) : bytes.length - 1;
            if (!match || start > end || start >= bytes.length || end >= bytes.length) {
              res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` });
              res.end();
              return;
            }
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
              'Content-Length': end - start + 1,
            });
            res.end(bytes.subarray(start, end + 1));
          } else {
            res.writeHead(200, { 'Content-Length': bytes.length });
            res.end(bytes);
          }
          return;
        }
      }
      throw new StudioError('NOT_FOUND', 'Không tìm thấy endpoint.', 404);
    } catch (error) {
      if (!res.headersSent)
        json({ error: errorInfo(error) }, error instanceof StudioError ? error.status : 500);
      else res.destroy();
    }
  });
  server.requestTimeout = 120_000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address() as { port: number };
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await motion.close();
      return new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
