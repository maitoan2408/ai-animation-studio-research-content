import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { doctor } from '../src/process.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'studio-ui-'));
await mkdir('artifacts', { recursive: true });
const app = await Studio.open(root),
  server = await serve(app, 0),
  runtime = await doctor();
const browser = await puppeteer.launch({
  executablePath: runtime.browser,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const checks: string[] = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(server.url);
  await page.waitForSelector('#create-form');
  const input = async (selector: string, text: string) => {
    await page.$eval(
      selector,
      (node, value) => {
        (node as HTMLInputElement).value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      },
      text,
    );
  };
  await input('[name="title"]', 'Bàn dựng kiểm thử');
  await input('[name="script"]', await readFile('examples/smoke.txt', 'utf8'));
  await page.click('#create-form button[type=submit]');
  await page.waitForSelector('#workspace:not([hidden])');
  assert.equal(await page.$$eval('.scene', (nodes) => nodes.length), 2);
  checks.push('create script -> two editable scenes');
  await input('[data-scene="s001"] [name="title"]', 'Unsaved draft');
  await page.click('#discard-edits');
  await page.waitForFunction(() =>
    document.querySelector('#notice')?.textContent?.includes('bỏ thay đổi'),
  );
  assert.equal(
    await page.$eval(
      '[data-scene="s001"] [name="title"]',
      (node) => (node as HTMLInputElement).value,
    ),
    'Chào',
  );
  assert.ok(
    await page.$eval('input[type=color]', (node) => node.getBoundingClientRect().height >= 32),
  );
  await input('[data-scene="s001"] [name="title"]', 'Lời chào đã chỉnh');
  await page.click('#save-scenes');
  await page.waitForFunction(() =>
    document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 2'),
  );
  checks.push('discard unsaved edit, then save a new immutable revision');
  await page.click('#generate-voice');
  await page.waitForFunction(
    () => document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 3'),
    { timeout: 60000 },
  );
  checks.push('local voice -> audio bindings and updated revision');
  const projects = await app.store.list<{ id: string }>('projects'),
    projectId = projects[0]!.id;
  const voiced = await app.store.current(projectId),
    audioId = voiced.revision.spec.scenes[0]!.audio!.assetId;
  const upload = await page.$('[data-scene="s001"] input[type=file]');
  assert.ok(upload);
  await upload.uploadFile(app.store.assetFile(audioId));
  await page.waitForFunction(
    () => document.querySelector('#revision-badge')?.textContent?.includes('Phiên bản 4'),
    { timeout: 60000 },
  );
  checks.push('WAV upload normalizes and creates another revision');
  await page.click('#render');
  await page.waitForSelector('[data-job-status=succeeded]', { timeout: 180000 });
  await page.waitForFunction(
    () => {
      const v = document.querySelector('video');
      return v instanceof HTMLVideoElement && !v.hidden && v.readyState >= 2;
    },
    { timeout: 15000 },
  );
  assert.ok(await page.$eval('video', (v) => v.duration >= 4));
  checks.push('real render -> browser video metadata and QC');
  await input('[name="reviewer"]', 'Automated UI test');
  await input('[name="notes"]', 'Test endpoint only; not human artistic approval.');
  await page.select('[name="decision"]', 'approved');
  await page.click('#review-submit');
  await page.waitForFunction(() =>
    document.querySelector('#reviews')?.textContent?.includes('Automated UI test'),
  );
  const reviewed = await app.snapshot(projectId);
  assert.equal(reviewed.reviews.length, 1);
  assert.equal(reviewed.reviews[0]!.revisionId, reviewed.revision.id);
  checks.push('review binds the selected artifact and revision');
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({ path: 'artifacts/ui-desktop.png', fullPage: true });
  const exported = await page.$eval('#export-link', async (node) => {
    const response = await fetch((node as HTMLAnchorElement).href);
    return response.json();
  });
  const packagePath = path.join(root, 'export.studio.json');
  await writeFile(packagePath, JSON.stringify(exported));
  const importer = await page.$('input#import-file');
  assert.ok(importer);
  await importer.uploadFile(packagePath);
  await page.waitForFunction(() =>
    document.querySelector('#notice')?.textContent?.includes('nhập gói'),
  );
  const all = await app.store.list<{ id: string }>('projects');
  assert.equal(all.length, 2);
  const imported = all.find((x) => x.id !== projectId)!;
  const importedState = await app.snapshot(imported.id);
  assert.deepEqual(importedState.revision.spec, reviewed.revision.spec);
  assert.equal(importedState.reviews.length, 0);
  checks.push('UI export -> import preserves media/spec without inherited approval');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
  );
  await page.screenshot({ path: 'artifacts/ui-mobile.png', fullPage: true });
  checks.push('390px viewport has no horizontal overflow');
  assert.deepEqual(errors, []);
  checks.push('no uncaught browser JavaScript errors');
  await writeFile(
    'artifacts/ui-results.json',
    JSON.stringify(
      {
        status: 'PASS',
        checks,
        runtime,
        dataRoot: root,
        reviewer: 'Automated UI test (test data only)',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
} catch (error) {
  await writeFile(
    'artifacts/ui-failure.json',
    JSON.stringify({ error: String(error), checks, dataRoot: root }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
  await server.close();
  await app.close();
}
