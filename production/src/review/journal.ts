/** Single-writer append-only journal; immutable record files are the index.
 * Acknowledgement follows file fsync, atomic rename and directory fsync.
 * Hashes detect alteration, not malicious re-signing or suffix deletion. Backups
 * must keep an external exported head. This is not a multi-user database.
 */
import {mkdir, open, readdir, readFile, rename, unlink, type FileHandle} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {canonical, fail, hash, type Catalog, type ReviewInput, parseReview} from './domain.js';

export interface ReviewRecord {sequence: number; previous: string | null; createdAt: string; request: ReviewInput; hash: string}
export class ReviewJournal {
  private records: ReviewRecord[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;
  private lock!: FileHandle;
  private constructor(readonly directory: string, readonly catalog: Catalog, readonly mode: 'review' | 'test') {}
  static async open(directory: string, catalog: Catalog, mode: 'review' | 'test'): Promise<ReviewJournal> {
    await mkdir(directory, {recursive: true});
    const journal = new ReviewJournal(directory, catalog, mode);
    try { journal.lock = await open(path.join(directory, '.writer.lock'), 'wx', 0o600); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('WRITER_LOCKED', 409); throw error; }
    try {
      await journal.lock.writeFile(JSON.stringify({pid: process.pid, mode, startedAt: new Date().toISOString()}) + '\n');
      await journal.lock.sync();
      const names = (await readdir(directory)).filter(name => name !== '.writer.lock' && !name.endsWith('.tmp')).sort();
      const requests = new Set<string>();
      for (const name of names) {
        if (!/^\d{8}-[a-f0-9]{64}\.json$/.test(name)) fail('UNEXPECTED_JOURNAL_FILE', 409);
        const raw = JSON.parse(await readFile(path.join(directory, name), 'utf8')) as ReviewRecord;
        const {hash: stored, ...payload} = raw;
        const request = parseReview(raw.request, catalog, mode);
        if (Object.keys(raw).sort().join(',') !== 'createdAt,hash,previous,request,sequence' ||
            !Number.isFinite(Date.parse(raw.createdAt)) || canonical(request) !== canonical(raw.request) ||
            raw.sequence !== journal.records.length + 1 || raw.previous !== journal.head ||
            request.expectedHead !== raw.previous || requests.has(request.requestId) ||
            stored !== hash(canonical(payload)) || name !== journal.filename(raw.sequence, stored)) fail('JOURNAL_CORRUPT', 409);
        requests.add(request.requestId); journal.records.push(raw);
      }
      return journal;
    } catch (error) { await journal.close(); throw error; }
  }
  get head(): string | null { return this.records.at(-1)?.hash ?? null; }
  snapshot(): {head: string | null; records: ReviewRecord[]; mode: string} {
    return structuredClone({head: this.head, records: this.records, mode: this.mode});
  }
  private filename(sequence: number, sha: string): string { return `${String(sequence).padStart(8, '0')}-${sha}.json`; }
  append(input: unknown): Promise<ReviewRecord> {
    // Capture caller data now; the queued mutation never reads a mutable reference.
    const request = parseReview(structuredClone(input), this.catalog, this.mode);
    const run = this.queue.then(async () => {
      if (this.closed) fail('JOURNAL_CLOSED', 409);
      const duplicate = this.records.find(r => r.request.requestId === request.requestId);
      if (duplicate) {
        if (canonical(duplicate.request) !== canonical(request)) fail('IDEMPOTENCY_CONFLICT', 409);
        return structuredClone(duplicate);
      }
      if (request.expectedHead !== this.head) fail('STALE_HEAD', 409);
      const payload = {sequence: this.records.length + 1, previous: this.head, createdAt: new Date().toISOString(), request};
      const record = {...payload, hash: hash(canonical(payload))};
      const temp = path.join(this.directory, `${randomUUID()}.tmp`);
      const file = await open(temp, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(record, null, 2) + '\n'); await file.sync(); }
      finally { await file.close(); }
      try {
        await rename(temp, path.join(this.directory, this.filename(record.sequence, record.hash)));
        const parent = await open(this.directory, 'r');
        try { await parent.sync(); } finally { await parent.close(); }
        this.records.push(record);
      } catch (error) {
        // After an uncertain persistence boundary, reject further writes. Reopen
        // and validate the disk chain before a caller retries this request ID.
        this.closed = true; throw error;
      }
      return structuredClone(record);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
  async close(): Promise<void> {
    await this.queue; this.closed = true;
    await this.lock.close();
    await unlink(path.join(this.directory, '.writer.lock'));
  }
}
