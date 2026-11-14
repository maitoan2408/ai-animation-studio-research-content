import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { mkdtemp } from 'node:fs/promises';
const app = await Studio.open(await mkdtemp('/tmp/audit-ui-'));
const p = await app.create('[action=wave; seconds=2]\nHello.', 'Audit');
const server = await serve(app, 0);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.waitForSelector(`[data-project="${p.id}"]`);
  await page.click(`[data-project="${p.id}"]`);
  await page.waitForSelector('[data-scene="s001"] [name="title"]');
  const setTitle = async (value: string) =>
    page.$eval(
      '[data-scene="s001"] [name="title"]',
      (e, v) => {
        (e as HTMLInputElement).value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value,
    );
  await page.setRequestInterception(true);
  let release: any;
  const held = new Promise<void>((resolve) => {
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/revisions')) {
        release = () => req.continue();
        resolve();
      } else void req.continue();
    });
  });
  await setTitle('A submitted');
  await page.click('#save-scenes');
  await held;
  await setTitle('B typed while saving');
  await release();
  await page.waitForFunction(() =>
    document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 2'),
  );
  const result = {
    case: 'edit during save',
    expectedDraft: 'B typed while saving',
    actualDraft: await page.$eval(
      '[data-scene="s001"] [name="title"]',
      (e) => (e as HTMLInputElement).value,
    ),
    discardHidden: await page.$eval('#discard-edits', (e) => (e as HTMLElement).hidden),
    savedTitle: (await app.store.current(p.id)).revision.spec.scenes[0]!.title,
  };
  console.log(result);
  assert.equal(
    result.actualDraft,
    result.expectedDraft,
    'save response must not discard newer input',
  );
} finally {
  await browser.close();
  await server.close();
  await app.close();
}
