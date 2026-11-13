/** Read-only product audit: real Chromium + isolated synthetic review journal.
 * Reproduces response-order cases omitted by the original UI suite and checks
 * a known commit followed by a failed refresh. It changes no application code,
 * media, or real review records.
 * Exit1 with FAIL_CONFIRMED means a desired user-visible invariant failed.
 * HARNESS_ERROR is separate and must not be treated as a product finding.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {startReviewServer} from '../review/server.ts';

const production = fileURLToPath(new URL('../../', import.meta.url));
const out = path.join(production, 'out/review-audit', randomUUID());
await mkdir(out, {recursive:true});
const options = {root:path.join(production,'artifacts/Q2'),
  catalogFile:path.join(production,'artifacts/Q2/web-review-v2/catalog.json'),
  dataDir:path.join(out,'journal'),port:0,mode:'test'};
const app = await startReviewServer(options);
const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,
  protocolTimeout:25_000,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage();
const findings = [], observations = [], browserErrors = [];
page.on('pageerror', error => browserErrors.push(error.message));
const ready = () => page.waitForFunction("document.querySelector('#position').dataset.frame === '0' && !document.querySelector('#save').disabled",{timeout:15_000});
const writeNote = value => page.$eval('#note', (element, value) => {
  if (element.disabled || element.readOnly) throw Error('NOTE_EDITOR_NOT_EDITABLE');
  element.value=value; element.dispatchEvent(new Event('input',{bubbles:true}));
}, value);
const exported = async () => (await fetch(app.origin+'/api/export')).json();
let interception = null;
let failNextRefresh = false;
await page.setRequestInterception(true);
page.on('request', request => {
  if (request.method() === 'GET' && request.url() === app.origin+'/api/reviews' && failNextRefresh) {
    failNextRefresh = false;
    void request.abort('failed').catch(error => browserErrors.push(String(error)));
  } else if (request.method() === 'POST' && request.url() === app.origin+'/api/reviews' && interception) {
    const action = interception; interception = null; action(request);
  } else void request.continue().catch(error => browserErrors.push(String(error)));
});
function nextPost() {
  let timer;
  return new Promise((resolve,reject) => {
    timer=setTimeout(() => { interception=null; reject(Error('AUDIT_POST_TIMEOUT')); },15_000);
    interception = request => { clearTimeout(timer); resolve(request); };
  });
}
let heldRequest;
try {
  await page.setViewport({width:1440,height:1080,deviceScaleFactor:1});
  await page.goto(app.origin); await ready();

  // Keep the original POST pending while the user moves to a new revision and
  // types a new draft. Only delivery timing is controlled; app.js is untouched.
  await writeNote('Audit original R0 note; synthetic, not artistic approval.');
  const waiting = nextPost(); await page.click('#save'); heldRequest = await waiting;
  const originalRequest = JSON.parse(heldRequest.postData());
  await page.select('#revision', app.catalog.artifacts[2].id);
  await page.waitForFunction("document.querySelector('#position').dataset.frame === '0'",{timeout:15_000});
  const newDraft = 'New R2 draft typed while the previous R0 save is pending.';
  await writeNote(newDraft);
  const duringSave = await page.$eval('#note', element => element.value);
  await heldRequest.continue(); heldRequest=null;
  await page.waitForFunction("document.querySelector('#status').textContent.includes('Đã lưu') && !document.querySelector('#save').disabled",{timeout:15_000});
  const afterSave = await page.$eval('#note', element => element.value);
  const firstExport = await exported();
  const draftResult = {case:'pending-save-new-revision-draft',expected:newDraft,
    actual:afterSave,duringSave,originalRevision:originalRequest.revision,
    selectedRevision:'R2',savedRecords:firstExport.records.length,
    originalSavedOn:firstExport.records[0]?.request.revision};
  observations.push(draftResult);
  if (afterSave !== newDraft) findings.push({id:'EX-030',severity:'P2',
    title:'An old save response clears a new editable draft',...draftResult});
  await page.screenshot({path:path.join(out,'draft-after-save.png'),fullPage:true});

  // Simulate a committed POST whose response is lost, then the visible recovery
  // action "reload journal" before retry. Do not mutate the server journal.
  await page.reload(); await ready();
  const uncertainNote = 'Audit lost-response note: a retry must not duplicate this record.';
  await writeNote(uncertainNote);
  const lostWaiting=nextPost(); await page.click('#save'); heldRequest=await lostWaiting;
  const lostRequest=JSON.parse(heldRequest.postData());
  const requestHeaders=heldRequest.headers();
  const delivered=await fetch(app.origin+'/api/reviews',{method:'POST',
    headers:{'content-type':'application/json','x-review-token':requestHeaders['x-review-token'],origin:app.origin},
    body:heldRequest.postData()});
  if(delivered.status!==201) throw Error('AUDIT_FORWARD_NOT_COMMITTED:'+delivered.status);
  const committed=await delivered.json();
  await heldRequest.abort('failed'); heldRequest=null;
  await page.waitForFunction("!document.querySelector('#save').disabled",{timeout:15_000});
  const retainedAfterError=await page.$eval('#note',element=>element.value);
  const countBefore=(await exported()).records.length;
  await page.click('#refresh');
  await page.waitForFunction(count=>document.querySelector('#status').textContent.includes('Đã nạp '+count+' '),{timeout:15_000},countBefore);
  await page.click('#save');
  await page.waitForFunction("document.querySelector('#note').value === '' && !document.querySelector('#save').disabled",{timeout:15_000});
  let finalExport=await exported();
  const duplicates=finalExport.records.filter(record=>record.request.note===uncertainNote);
  const retryResult={case:'lost-response-refresh-retry',expectedMatchingRecords:1,
    actualMatchingRecords:duplicates.length,retainedAfterError,
    initialRequestId:lostRequest.requestId,initialCommittedHash:committed.hash,
    matchingRequestIds:duplicates.map(record=>record.request.requestId)};
  observations.push(retryResult);
  if(duplicates.length!==1) findings.push({id:'EX-031',severity:'P2',
    title:'Refreshing after an uncertain save changes the retry identity',...retryResult});
  await page.screenshot({path:path.join(out,'duplicate-after-retry.png'),fullPage:true});

  // Once POST has acknowledged a commit, failure of the following GET must not
  // tell the user that saving failed or silently encourage another POST.
  const acknowledgedNote='Audit known commit with a failed subsequent journal refresh.';
  await writeNote(acknowledgedNote); failNextRefresh=true;
  await page.click('#save');
  await page.waitForFunction("!document.querySelector('#save').disabled",{timeout:15_000});
  const acknowledgedStatus=await page.$eval('#status',element=>element.textContent);
  const acknowledgedDraft=await page.$eval('#note',element=>element.value);
  finalExport=await exported();
  const acknowledgedCount=finalExport.records.filter(record=>record.request.note===acknowledgedNote).length;
  const acknowledgementResult={case:'committed-save-refresh-failure',
    expectedMatchingRecords:1,actualMatchingRecords:acknowledgedCount,
    statusConfirmsSave:acknowledgedStatus.includes('Đã lưu'),
    statusRequestsRefresh:acknowledgedStatus.includes('Chưa nạp'),
    acknowledgedStatus,draftCleared:acknowledgedDraft===''};
  observations.push(acknowledgementResult);
  if(acknowledgedCount!==1 || !acknowledgementResult.statusConfirmsSave ||
    !acknowledgementResult.statusRequestsRefresh || !acknowledgementResult.draftCleared) {
    findings.push({id:'SAVE_ACKNOWLEDGEMENT_LOST',severity:'P2',...acknowledgementResult});
  }
  await writeFile(path.join(out,'test-journal-export.json'),JSON.stringify(finalExport,null,2)+'\n');
  const report={status:findings.length?'FAIL_CONFIRMED':'PASS',findings,observations,
    browser:await browser.version(),browserErrors,mode:'automated-test',output:out,
    limits:['Controlled request timing with real Chromium and HTTP; not a throughput benchmark',
      'No production journal/media changes and no artistic or listening approval']};
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report)); if(findings.length)process.exitCode=1;
} catch(error) {
  const report={status:'HARNESS_ERROR',error:String(error),stack:error.stack,observations,output:out};
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify(report));process.exitCode=2;
} finally {
  if(heldRequest) await heldRequest.abort().catch(()=>{});
  await browser.close(); await app.close();
}
