/** M5 regression: delayed plan A must not authorize stale plan after the user edits to B. */
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { doctor } from '../src/process.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'm5-plan-race-'));
const studio = await Studio.open(root);
const server = await serve(studio, 0);
const runtime = await doctor();
const browser = await puppeteer.launch({
  executablePath: runtime.browser,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  let pending: import('puppeteer-core').HTTPRequest | undefined;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/director/plan') && !pending) {
      pending = request;
      return;
    }
    void request.continue();
  });
  await page.goto(server.url + '/director', { waitUntil: 'networkidle0' });
  await page.click('#director-plan');
  for (let i = 0; i < 100 && !pending; i++)
    await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(pending, 'The planning request must be held in-flight');
  await page.$eval('[name="script"]', (element) => {
    const input = element as HTMLTextAreaElement;
    input.value = '[title=Revised; action=walk; seconds=4]\nThis is the NEW script B.';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.$eval('#director-run', (e) => (e as HTMLButtonElement).disabled), true);
  await pending!.continue();
  await page.waitForFunction(
    () => !(document.querySelector('#director-plan') as HTMLButtonElement).disabled,
    { timeout: 20000 },
  );
  assert.equal(
    await page.$eval('#director-run', (e) => (e as HTMLButtonElement).disabled),
    true,
    'Stale plan A must never reactivate approval after a script change',
  );
  assert.equal(await page.$$eval('#director-graph li', (entries) => entries.length), 0);
  // Keep interception enabled while the asynchronous request callbacks drain.
  await page.click('#director-plan');
  await page.waitForFunction(
    () => (document.querySelector('#director-phase')?.textContent || '').includes('Ready'),
    { timeout: 20000 },
  );
  assert.match(await page.$eval('#director-scenes', (e) => e.textContent ?? ''), /Revised/);
  console.log('M5_ASYNC_PLAN_RACE_PASS');
} finally {
  await browser.close();
  await server.close();
  await studio.close();
  await rm(root, { recursive: true, force: true });
}
