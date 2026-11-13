import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, rm, readdir, symlink, copyFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {get} from 'node:http';
import {parseCatalog, parseReview, scoreTotal, type Catalog, type ReviewInput} from '../src/review/domain.js';
import {ReviewJournal} from '../src/review/journal.js';
import {verifiedBytes} from '../src/review/catalog.js';
import {byteRange, startReviewServer} from '../src/review/server.js';

const root = fileURLToPath(new URL('../artifacts/Q2/', import.meta.url));
const catalog = parseCatalog(JSON.parse(await readFile(path.join(root, 'web-review/catalog.json'), 'utf8')));
const artifact = catalog.artifacts[0]!;
function note(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {requestId:randomUUID(),expectedHead:null,artifactId:artifact.id,masterSha256:artifact.masterSha256,
    revision:artifact.revision,shotId:'S01',frame:72,reviewer:{name:'Contract test',kind:'automated-test'},
    decision:'note',note:'Test data; not an artistic approval.',scores:null,
    observed:{normalSpeed:false,slowSpeed:false,listened:false},blockingIssue:false,...overrides};
}

test('catalog and review boundaries reject wrong frame, artifact, mode and incomplete rubric', () => {
  assert.equal(parseReview(note(), catalog, 'test').frame, 72);
  for (const invalid of [note({frame:192}),note({frame:-1}),note({frame:1.5}),note({artifactId:'a'.repeat(64)}),
    note({masterSha256:'a'.repeat(64)}),note({revision:'R9'}),note({note:''}),note({requestId:'bad'}),
    {...note(),extra:'unrecognized'},note({observed:{normalSpeed:true,slowSpeed:true,listened:'yes' as unknown as boolean}})]) {
    assert.throws(() => parseReview(invalid, catalog, 'test'));
  }
  assert.throws(() => parseReview(note(), catalog, 'review'), /REVIEW_MODE_MISMATCH/);
  const accepted = note({decision:'accepted',scores:{art:4,acting:4,layout:4,continuity:4,editability:4},observed:{normalSpeed:true,slowSpeed:true,listened:true}});
  assert.equal(scoreTotal(accepted.scores!),80);
  assert.throws(() => parseReview(accepted, catalog, 'test'), /COLOR_GATE_PENDING/);
  const passedCatalog: Catalog = structuredClone(catalog); passedCatalog.artifacts[0]!.colorStatus = 'pass';
  assert.equal(parseReview(accepted, passedCatalog, 'test').decision,'accepted');
  for (const invalid of [
    {...accepted,observed:{normalSpeed:true,slowSpeed:true,listened:false}},
    {...accepted,observed:{normalSpeed:true,slowSpeed:false,listened:true}},
    {...accepted,blockingIssue:true}, {...accepted,scores:{...accepted.scores,acting:3}},
    {...accepted,scores:{art:4,acting:4,layout:1,continuity:1,editability:1}},
  ]) assert.throws(() => parseReview(invalid, passedCatalog, 'test'));
  const broken = structuredClone(catalog); broken.artifacts[0]!.shots[1]!.startFrame += 1;
  assert.throws(() => parseCatalog(broken), /NONCONTIGUOUS_TIMELINE/);
});

test('journal retries idempotently, serializes conflicting writers, reopens and detects tampering', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'review-journal-'));
  let journal: ReviewJournal | undefined;
  try {
    journal = await ReviewJournal.open(directory,catalog,'test');
    await assert.rejects(ReviewJournal.open(directory,catalog,'test'), /WRITER_LOCKED/);
    const input = note(); const first = await journal.append(input);
    assert.equal((await journal.append(input)).hash,first.hash);
    await assert.rejects(journal.append({...input,note:'Changed idempotent payload'}), /IDEMPOTENCY_CONFLICT/);
    const outcomes = await Promise.allSettled([
      journal.append(note({expectedHead:first.hash})),journal.append(note({expectedHead:first.hash})),
    ]);
    assert.equal(outcomes.filter(o => o.status === 'fulfilled').length,1);
    assert.equal(outcomes.filter(o => o.status === 'rejected').length,1);
    const expected = journal.snapshot(); await journal.close(); journal = undefined;
    await writeFile(path.join(directory,'interrupted-write.tmp'),'partial data retained');
    journal = await ReviewJournal.open(directory,catalog,'test');
    assert.deepEqual(journal.snapshot(),expected);
    const exported = journal.snapshot(); exported.records[0]!.request.note = 'attempt mutation';
    assert.equal(journal.snapshot().records[0]!.request.note,input.note);
    await journal.close(); journal = undefined;
    const file = (await readdir(directory)).find(f => f.startsWith('00000001-'))!;
    const record = JSON.parse(await readFile(path.join(directory,file),'utf8')) as {request:ReviewInput};
    record.request.note = 'tampered'; await writeFile(path.join(directory,file),JSON.stringify(record));
    await assert.rejects(ReviewJournal.open(directory,catalog,'test'), /JOURNAL_CORRUPT/);
    assert.ok((await readdir(directory)).includes('interrupted-write.tmp'));
  } finally { if (journal) await journal.close(); await rm(directory,{recursive:true,force:true}); }
});

test('range and filesystem boundaries reject traversal, symlink escape and changed bytes', async () => {
  assert.deepEqual(byteRange('bytes=2-4',10),{start:2,end:4});
  assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9});
  assert.deepEqual(byteRange('bytes=8-99',10),{start:8,end:9});
  assert.equal(byteRange(undefined,10),null);
  for (const value of ['bytes=10-','bytes=-0','bytes=5-2','bytes=1-2,4-5','items=1-3','bytes=9007199254740993-']) assert.throws(() => byteRange(value,10));
  const directory = await mkdtemp(path.join(tmpdir(),'review-files-'));
  try {
    await assert.rejects(verifiedBytes(directory,'not-restored.mp4',artifact.id), /MEDIA_MISSING_RESTORE_REQUIRED/);
    await assert.rejects(verifiedBytes(root,'../plan.md',artifact.id), /UNSAFE_MEDIA_PATH/);
    await symlink(path.join(root,artifact.file),path.join(directory,'escape.mp4'));
    await assert.rejects(verifiedBytes(directory,'escape.mp4',artifact.id), /MEDIA_PATH_ESCAPES_ROOT/);
    await writeFile(path.join(directory,'changed.mp4'),'altered');
    await assert.rejects(verifiedBytes(directory,'changed.mp4',artifact.id), /MEDIA_HASH_MISMATCH/);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('real HTTP media, origin/token, persistence, stale head and changed-file rejection', async () => {
  const directory = await mkdtemp(path.join(tmpdir(),'review-http-'));
  const localCatalog = structuredClone(catalog); localCatalog.artifacts = [structuredClone(artifact)];
  const a = localCatalog.artifacts[0]!;
  await copyFile(path.join(root,a.file),path.join(directory,'review.mp4')); a.file = 'review.mp4';
  await copyFile(path.join(root,a.masterFile),path.join(directory,'master.mp4')); a.masterFile = 'master.mp4';
  await copyFile(path.join(root,localCatalog.native.file),path.join(directory,'native.zip')); localCatalog.native.file = 'native.zip';
  await writeFile(path.join(directory,'catalog.json'),JSON.stringify(localCatalog));
  const app = await startReviewServer({root:directory,catalogFile:path.join(directory,'catalog.json'),dataDir:path.join(directory,'journal'),port:0,mode:'test'});
  try {
    const metadata = await (await fetch(app.origin+'/api/catalog')).json() as {csrfToken:string};
    const headers = {'content-type':'application/json','x-review-token':metadata.csrfToken};
    const send = (body:unknown, supplied:Record<string,string> = headers) => fetch(app.origin+'/api/reviews',{method:'POST',headers:supplied,body:JSON.stringify(body)});
    assert.equal((await send(note(),{'content-type':'application/json'})).status,403);
    assert.equal((await send(note(),{...headers,origin:'https://attacker.invalid'})).status,403);
    // Fetch normalizes Host in this Node runtime. Use the raw HTTP client so
    // the adversarial Host actually reaches the boundary being tested.
    const hostileHostStatus = await new Promise<number | undefined>((resolve,reject) => {
      get(app.origin+'/api/catalog',{headers:{host:'attacker.invalid'}},response => {
        response.resume(); resolve(response.statusCode);
      }).on('error',reject);
    });
    assert.equal(hostileHostStatus,403);
    assert.equal((await send(note({frame:192}))).status,400);
    const input = note(); const response = await send(input); assert.equal(response.status,201);
    const first = await response.json() as {hash:string};
    assert.equal((await send(input)).status,201);
    assert.equal((await send(note())).status,409);
    assert.equal((await send(note({expectedHead:first.hash}))).status,201);
    const exported = await (await fetch(app.origin+'/api/export')).json() as {records:unknown[];phaseApproval:boolean};
    assert.equal(exported.records.length,2); assert.equal(exported.phaseApproval,false);
    const range = await fetch(`${app.origin}/media/${a.id}`,{headers:{range:'bytes=10-29'}});
    assert.equal(range.status,206); assert.equal((await range.arrayBuffer()).byteLength,20);
    assert.match(range.headers.get('content-range')!,/^bytes 10-29\//);
    const suffix = await fetch(`${app.origin}/media/${a.id}`,{headers:{range:'bytes=-8'}});
    assert.equal(suffix.status,206); assert.equal((await suffix.arrayBuffer()).byteLength,8);
    assert.equal((await fetch(`${app.origin}/media/${a.id}`,{headers:{range:'bytes=9-1'}})).status,416);
    assert.equal((await fetch(`${app.origin}/not-a-route`)).status,404);
    await writeFile(path.join(directory,'review.mp4'),'changed after startup');
    assert.equal((await fetch(`${app.origin}/media/${a.id}`)).status,409);
    assert.equal((await send(note())).status,409);
  } finally { await app.close(); await rm(directory,{recursive:true,force:true}); }
});
