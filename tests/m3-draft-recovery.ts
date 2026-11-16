import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';

const dir = await mkdtemp('/tmp/m3-draft-audit-');
const app = await Studio.open(dir);
const server = await serve(app, 0);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const failures: string[] = [];
try {
  const page = await browser.newPage();
  await page.goto(server.url + '/motion');
  await page.waitForFunction(
    () => document.querySelector<HTMLInputElement>('#character-id')?.value === 'guest-01',
  );
  const edit = (value: string) =>
    page.$eval(
      '#character-id',
      (el, value) => {
        (el as HTMLInputElement).value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value,
    );
  const check = (name: string, actual: unknown, expected: unknown) => {
    try {
      assert.deepEqual(actual, expected);
      console.log('PASS ' + name);
    } catch {
      failures.push(name);
      console.error('FAIL ' + name + ': ' + JSON.stringify({ actual, expected }));
    }
  };
  // Hold a real save request; editing while it is pending must survive its response.
  let release!: () => Promise<void>;
  let captured!: () => void;
  const pending = new Promise<void>((resolve) => {
    captured = resolve;
  });
  let hold = true;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (hold && req.method() === 'POST' && req.url().endsWith('/motion/project')) {
      hold = false;
      release = () => req.continue();
      captured();
    } else void req.continue();
  });
  await edit('saved-first');
  await page.click('#motion-save');
  await pending;
  await edit('newer-draft');
  await release();
  await page.waitForFunction(() =>
    document.querySelector('#motion-notice')?.textContent?.includes('Đã lưu'),
  );
  check(
    'late save preserves newer draft',
    await page.$eval('#character-id', (el) => (el as HTMLInputElement).value),
    'newer-draft',
  );
  check(
    'late save leaves draft dirty',
    await page.$eval('#motion-render', (el) => (el as HTMLButtonElement).disabled),
    true,
  );
  await page.click('#motion-save');
  await page.waitForResponse(
    (r) => r.url().endsWith('/motion/project') && r.request().method() === 'POST',
  );
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>('#motion-render')?.disabled,
  );
  check(
    'next save uses updated revision',
    (await (await fetch(server.url + '/api/motion/project')).json()).project.character.id,
    'newer-draft',
  );

  const original = (await (await fetch(server.url + '/api/motion/project')).json()).project;
  const imported = structuredClone(original);
  imported.character.id = 'imported-actor';
  imported.prop.id = 'custom-cup';
  imported.clips = [{ action: 'wave', frames: 49 }];
  // Retain optional scenery prop and declared capabilities beyond the current clip.
  imported.prop.x = 970;
  const fixture = path.join(dir, 'import.json');
  await writeFile(fixture, JSON.stringify(imported));
  const input = await page.$('input#motion-import');
  assert.ok(input);
  await input.uploadFile(fixture);
  await page.waitForFunction(() =>
    document.querySelector('#motion-notice')?.textContent?.includes('Đã nhập'),
  );
  await page.$eval('#cup-x', (el) => {
    (el as HTMLInputElement).value = '975';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  imported.prop.x = 975;
  await page.click('#motion-save');
  await page.waitForResponse(
    (r) => r.url().endsWith('/motion/project') && r.request().method() === 'POST',
  );
  await page.waitForFunction(
    () => !document.querySelector<HTMLButtonElement>('#motion-render')?.disabled,
  );
  check(
    'import preserves full project identity',
    (await (await fetch(server.url + '/api/motion/project')).json()).project,
    imported,
  );

  const invalid = { ...imported, source: 'window.alert(1)' };
  invalid.character = { ...imported.character, id: 'invalid-import' };
  const invalidFile = path.join(dir, 'invalid.json');
  await writeFile(invalidFile, JSON.stringify(invalid));
  const rejected = page.waitForResponse((r) => r.url().endsWith('/motion/validate'));
  await input.uploadFile(invalidFile);
  assert.equal((await rejected).status(), 400);
  await page.waitForFunction(() =>
    document.querySelector('#motion-notice')?.textContent?.includes('M3_INVALID_PROJECT'),
  );
  check(
    'invalid import leaves current draft intact',
    await page.$eval('#character-id', (el) => (el as HTMLInputElement).value),
    'imported-actor',
  );
  assert.deepEqual(failures, [], 'M3 draft/import regressions');
} finally {
  await browser.close();
  await server.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
