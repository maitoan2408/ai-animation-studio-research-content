/** Actual local Chromium workflow. Uses an isolated test journal; never records
 * an artistic approval or a human/independent operator in production data. */
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {startReviewServer} from '../src/review/server.ts';

const production = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(production,'out/review-ui',randomUUID()); await mkdir(out,{recursive:true});
const options = {root:path.join(production,'artifacts/Q2'),catalogFile:process.argv[2] ? path.resolve(process.argv[2]) : path.join(production,'artifacts/Q2/web-review-v2/catalog.json'),dataDir:path.join(out,'journal'),port:0,mode:'test'};
let app = await startReviewServer(options);
const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,protocolTimeout:25_000,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks = [], errors = [];
let page;
const checked = name => { checks.push(name); console.log('PASS',name); };
const ready = p => p.waitForFunction("document.querySelector('#position').dataset.frame === '0' && !document.querySelector('#save').disabled",{timeout:15_000});
async function seek(p,frame) {
  await p.bringToFront();
  await p.$eval('#frame',(element,value) => { element.value=String(value); element.dispatchEvent(new Event('input',{bubbles:true})); },frame);
  await p.waitForFunction("document.querySelector('#position').dataset.frame === '"+frame+"' && !document.querySelector('#save').disabled",{timeout:15_000});
}
async function save(p,note) {
  await p.bringToFront();
  await p.$eval('#note',(element,value) => { element.value=value; },note);
  await p.click('#save');
  await p.waitForFunction("document.querySelector('#note').value === '' && !document.querySelector('#save').disabled");
}
try {
  page = await browser.newPage(); page.on('pageerror',error => errors.push(error.message));
  await page.setViewport({width:1440,height:1080,deviceScaleFactor:1});
  await page.goto(app.origin); await ready(page);
  checked('Initial frame0 presented; annotation enabled only after pause/settle');
  assert.equal(await page.$eval('#decision option[value="accepted"]',element => element.disabled),app.catalog.artifacts[0].colorStatus !== 'pass');
  checked('Acceptance availability follows exact catalog color status');
  await seek(page,72); assert.match(await page.$eval('#position',element => element.textContent),/S01/);
  await page.click('#next'); await page.waitForFunction("document.querySelector('#position').dataset.frame === '73' && !document.querySelector('#save').disabled");
  await page.click('#previous'); await page.waitForFunction("document.querySelector('#position').dataset.frame === '72' && !document.querySelector('#save').disabled");
  checked('Range seek and individual forward/back steps use presented frame72');
  const hostile = '<img src=x onerror="window.injected=true"> This is plain review text.';
  await save(page,hostile);
  assert.equal(await page.$eval('#notes',element => element.querySelectorAll('img').length),0);
  assert.ok((await page.$eval('#notes',element => element.textContent)).includes(hostile));
  checked('Persisted annotation renders markup as text');
  await page.reload(); await ready(page);
  assert.match(await page.$eval('#count',element => element.textContent),/^1 /);
  checked('Reload preserves saved review');
  await page.select('#revision',app.catalog.artifacts[2].id); await ready(page);
  assert.match(await page.$eval('#count',element => element.textContent),/^0 /);
  await seek(page,400); assert.match(await page.$eval('#position',element => element.textContent),/R2 · S01/);
  checked('R2 reordered timeline maps frame400 to S01, with no inherited R0 notes');
  for (const rate of ['1','0.5']) {
    await page.select('#rate',rate);
    await page.evaluate("document.querySelector('video').muted=true;document.querySelector('video').play()");
    await page.waitForFunction("document.querySelector('video').currentTime > 17.8");
    assert.equal(await page.$eval('#save',element => element.disabled),true);
    await page.evaluate("document.querySelector('video').pause()"); await seek(page,400);
    checked(`Actual muted playback at${rate}x; recording disabled during playback`);
  }
  await save(page,'R2 reordered shot: automated UI persistence check.');
  checked('Saved second annotation on R2');
  const other = await browser.newPage(); other.on('pageerror',error => errors.push(error.message));
  await other.goto(app.origin); await ready(other);
  await save(page,'First window adds another record.');
  await other.bringToFront();
  await other.$eval('#note',element => { element.value='Second window retains its draft after conflict.'; });
  await other.click('#save');
  await other.waitForFunction("document.querySelector('#status').textContent.includes('cửa sổ khác')");
  assert.equal(await other.$eval('#note',element => element.value),'Second window retains its draft after conflict.');
  await other.click('#refresh'); await other.waitForFunction("document.querySelector('#status').textContent.includes('Đã nạp 3')");
  await other.click('#save'); await other.waitForFunction("document.querySelector('#note').value === ''");
  checked('Two-window stale revision rejects, retains text, reloads and saves safely');
  await other.close();
  await page.bringToFront();
  let exported = await (await fetch(app.origin+'/api/export')).json();
  assert.equal(exported.records.length,4); assert.equal(exported.phaseApproval,false);
  assert.ok(exported.records.every(r => r.request.reviewer.kind==='automated-test' && r.request.decision==='note'));
  assert.equal(exported.records[0].request.frame,72); assert.equal(exported.records[1].request.frame,400);
  await writeFile(path.join(out,'test-journal-export.json'),JSON.stringify(exported,null,2)+'\n');
  checked('Export retains exact artifact/frame bindings and test-only authorship');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  assert.equal(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  checked('390px mobile layout fits without horizontal overflow');
  await page.close(); await app.close(); app = await startReviewServer(options);
  page = await browser.newPage(); await page.goto(app.origin); await ready(page);
  assert.match(await page.$eval('#count',element => element.textContent),/^2 /);
  checked('Server restart verifies hash chain and restores prior notes');
  const r3 = app.catalog.artifacts.find(a => a.revision === 'R3');
  if (r3) {
    await page.select('#revision',r3.id); await ready(page);
    assert.match(await page.$eval('#count',e => e.textContent),/^0 /);
    await seek(page,1032); assert.match(await page.$eval('#position',e => e.textContent),/R3 · S05/);
    await save(page,'R3 S05 local72: synthetic binding check, not creative approval.');
    exported = await (await fetch(app.origin+'/api/export')).json();
    const record=exported.records.at(-1).request;
    assert.equal(record.artifactId,r3.id); assert.equal(record.masterSha256,r3.masterSha256);
    assert.equal(record.shotId,'S05'); assert.equal(record.frame,1032);
    await page.select('#revision',app.catalog.artifacts[2].id); await ready(page);
    assert.ok(!(await page.$eval('#notes',e=>e.textContent)).includes('R3 S05 local72'));
    const native=await fetch(app.origin+'/native');
    assert.equal(native.status,200);
    assert.match(native.headers.get('content-disposition'),/native-source.zip/);
    checked('R3 S05 frame1032 binds its own artifact/master without inheriting or leaking R2 notes');
    await writeFile(path.join(out,'test-journal-export.json'),JSON.stringify(exported,null,2)+'\n');
  }
  assert.deepEqual(errors,[]);
  const report = {status:'PASS',checks,browser:await browser.version(),errors,mode:'automated-test',journalHead:exported.head,records:exported.records.length,limits:['Functional UI verification; muted playback, no listening or artistic approval','Same agent; not independent operator handoff']};
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output:out,...report}));
} catch(error) {
  if(page && !page.isClosed()) await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
  const report={status:'FAIL',checks,errors,error:String(error),stack:error.stack};
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify({output:out,...report})); process.exitCode=1;
} finally { await browser.close(); await app.close(); }
