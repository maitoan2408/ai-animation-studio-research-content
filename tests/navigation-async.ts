import assert from 'node:assert/strict';
import puppeteer, { type HTTPRequest } from 'puppeteer-core';
import { mkdtemp, rm } from 'node:fs/promises';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
const dir = await mkdtemp('/tmp/v2-nav-');
const app = await Studio.open(dir);
const a = await app.create('Hello', 'First');
const b = await app.create('World', 'Second');
const server = await serve(app, 0);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.waitForSelector(`[data-project="${a.id}"]`);
  await page.click(`[data-project="${a.id}"]`);
  await page.waitForSelector('[data-scene="s001"] [name="title"]');
  const waitSelected = async (id: string) =>
    page.waitForFunction(
      (value) => !!document.querySelector(`[data-project="${value}"].selected`),
      {},
      id,
    );
  await waitSelected(a.id);
  let unblock: (() => Promise<void>) | undefined;
  let resolveCapture: (() => void) | undefined;
  let holdSecond = true;
  let holdVoice = false;
  let unblockVoice: (() => Promise<void>) | undefined;
  let resolveVoice: (() => void) | undefined;
  const captured = new Promise<void>((r) => {
    resolveCapture = r;
  });
  await page.setRequestInterception(true);
  page.on('request', (r: HTTPRequest) => {
    if (r.method() === 'GET' && r.url().endsWith('/projects/' + b.id) && holdSecond) {
      holdSecond = false;
      unblock = async () => {
        await r.continue();
      };
      resolveCapture?.();
    } else if (r.method() === 'POST' && r.url().endsWith('/voice') && holdVoice) {
      holdVoice = false;
      unblockVoice = async () => {
        await r.continue();
      };
      resolveVoice?.();
    } else void r.continue();
  });
  await page.click(`[data-project="${b.id}"]`);
  await captured;
  const reloaded = page.waitForResponse((response) => response.url().endsWith('/projects/' + a.id));
  await page.click(`[data-project="${a.id}"]`);
  await reloaded;
  await new Promise((r) => setTimeout(r, 100));
  await page.waitForFunction(() => document.querySelector('#heading')?.textContent === 'First');
  await page.$eval('[data-scene="s001"] [name="title"]', (e) => {
    (e as HTMLInputElement).value = 'New draft';
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const staleResponse = page.waitForResponse((response) =>
    response.url().endsWith('/projects/' + b.id),
  );
  await unblock!();
  await staleResponse;
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(
    await page.$eval('#heading', (e) => e.textContent),
    'First',
    'stale project load must not replace current project',
  );
  assert.equal(
    await page.$eval('[data-scene="s001"] [name="title"]', (e) => (e as HTMLInputElement).value),
    'New draft',
  );
  await page.click('#discard-edits');
  await page.waitForFunction(() =>
    document.querySelector('#notice')?.textContent?.includes('bỏ thay đổi'),
  );
  const voiceHeld = new Promise<void>((r) => {
    resolveVoice = r;
  });
  holdVoice = true;
  await page.click('#generate-voice');
  await voiceHeld;
  await page.click(`[data-project="${b.id}"]`);
  await page.waitForFunction(() => document.querySelector('#heading')?.textContent === 'Second');
  await waitSelected(b.id);
  await page.click(`[data-project="${a.id}"]`);
  await page.waitForFunction(() => document.querySelector('#heading')?.textContent === 'First');
  await waitSelected(a.id);
  await page.$eval('[data-scene="s001"] [name="title"]', (e) => {
    (e as HTMLInputElement).value = 'Return draft';
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await unblockVoice!();
  await page.waitForFunction(() =>
    document.querySelector('#notice')?.textContent?.includes('Giọng nháp đã sẵn sàng'),
  );
  assert.equal(
    await page.$eval('[data-scene="s001"] [name="title"]', (e) => (e as HTMLInputElement).value),
    'Return draft',
  );
  console.log('PASS stale navigation keeps project and draft');
} finally {
  await browser.close();
  await server.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
