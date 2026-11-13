/** CLI defaults are resolved from the module, independent of working directory. */
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {loadCatalog} from './catalog.js';
import {ReviewJournal} from './journal.js';
import {startReviewServer} from './server.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const {values, positionals} = parseArgs({allowPositionals:true, options:{
  root:{type:'string'},catalog:{type:'string'},data:{type:'string'},port:{type:'string'},
}});
const artifactRoot = path.resolve(values.root ?? path.join(root, 'artifacts/Q2'));
const catalogFile = path.resolve(values.catalog ?? path.join(artifactRoot, 'web-review-v2/catalog.json'));
const dataDir = path.resolve(values.data ?? path.join(root, 'out/review-data'));
const command = positionals[0] ?? 'serve';
try {
  if (positionals.length > 1) throw Error('Usage: review [serve|check|export] [--root DIR --catalog FILE --data DIR --port NUMBER]');
  if (command === 'serve') {
    const port = Number(values.port ?? 4311);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('INVALID_PORT');
    const app = await startReviewServer({root:artifactRoot,catalogFile,dataDir,port});
    console.log(JSON.stringify({status:'READY',url:app.origin,dataDir,mode:'review',phaseApproval:false}));
    let closing = false;
    const stop = async () => { if (closing) return; closing = true; await app.close(); };
    process.once('SIGINT', () => { void stop(); }); process.once('SIGTERM', () => { void stop(); });
  } else if (command === 'check' || command === 'export') {
    const catalog = await loadCatalog(artifactRoot, catalogFile);
    if (command === 'check') console.log(JSON.stringify({status:'PASS_CATALOG_HASH_AND_PROFILE',artifacts:catalog.artifacts.map(a => ({id:a.id,revision:a.revision,colorStatus:a.colorStatus})),phaseApproval:false}));
    else {
      const journal = await ReviewJournal.open(dataDir, catalog, 'review');
      try { console.log(JSON.stringify({schemaVersion:1,catalog,...journal.snapshot(),phaseApproval:false}, null, 2)); }
      finally { await journal.close(); }
    }
  } else throw Error('UNKNOWN_COMMAND: serve, check or export');
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
