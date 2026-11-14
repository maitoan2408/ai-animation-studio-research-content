import assert from 'node:assert/strict';
import puppeteer, { type HTTPRequest } from 'puppeteer-core';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { Studio } from '../src/application.js';
import { serve } from '../src/server.js';
import { wav } from '../src/audio.js';
const dir = await mkdtemp('/tmp/v2-draft-');
const app = await Studio.open(dir);
const first = await app.create(
  '[seconds=2] This is a much longer sentence repeated several times, this is a much longer sentence repeated several times, this is a much longer sentence repeated several times.',
  'First',
  'paper-cut',
  'en',
);
const second = await app.create('World', 'Second', 'paper-cut', 'en');
const server = await serve(app, 0);
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.waitForSelector(`[data-project="${first.id}"]`);
  await page.click(`[data-project="${first.id}"]`);
  await page.waitForSelector('[data-scene="s001"] [name="title"]');
  const title = '[data-scene="s001"] [name="title"]';
  const edit = async (value: string) =>
    page.$eval(
      title,
      (e, v) => {
        (e as HTMLInputElement).value = v;
        e.dispatchEvent(new Event('input', { bubbles: true }));
      },
      value,
    );
  const waitNotice = async (text: string) =>
    page.waitForFunction(
      (t) => document.querySelector('#notice')?.textContent?.includes(t),
      {},
      text,
    );
  let match = '';
  let unblock: (() => Promise<void>) | undefined;
  let captured: (() => void) | undefined;
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    if (req.method() === 'POST' && req.url().endsWith(match) && match) {
      match = '';
      unblock = async () => {
        await req.continue();
      };
      captured?.();
    } else void req.continue();
  });
  const hold = (suffix: string) => {
    match = suffix;
    return new Promise<void>((r) => {
      captured = r;
    });
  };
  let pending = hold('/voice');
  await page.click('#generate-voice');
  await pending;
  await edit('Voice draft');
  await unblock!();
  await waitNotice('Giọng nháp đã sẵn sàng');
  assert.equal(await page.$eval(title, (e) => (e as HTMLInputElement).value), 'Voice draft');
  assert.equal(
    Number(
      await page.$eval(
        '[data-scene="s001"] [name="seconds"]',
        (e) => (e as HTMLInputElement).value,
      ),
    ) * 24,
    (await app.store.current(first.id)).revision.spec.scenes[0]!.durationFrames,
    'voice-generated duration must survive unrelated draft edits',
  );
  assert.equal(await page.$eval('#discard-edits', (e) => (e as HTMLElement).hidden), false);
  await page.click('#save-scenes');
  await waitNotice('Đã lưu phiên bản mới');
  const file = path.join(dir, 'fixture.wav');
  await writeFile(file, wav(Buffer.alloc(9600)));
  pending = hold('/audio');
  const upload = await page.$('[data-scene="s001"] input[type=file]');
  assert.ok(upload);
  await upload.uploadFile(file);
  await pending;
  await edit('Upload draft');
  await page.click('[data-scene="s001"] .audio-line button');
  await unblock!();
  await waitNotice('Đã gắn WAV');
  assert.equal(await page.$eval(title, (e) => (e as HTMLInputElement).value), 'Upload draft');
  assert.match(
    await page.$eval('[data-scene="s001"] .audio-line', (e) => e.textContent ?? ''),
    /Sẽ bỏ audio/,
    'explicit detach must remain visible',
  );
  await page.click('#save-scenes');
  await waitNotice('Đã lưu phiên bản mới');
  assert.equal(
    (await app.store.current(first.id)).revision.spec.scenes[0]!.audio,
    undefined,
    'explicit detach must be applied on save',
  );
  pending = hold('/voice');
  await page.click('#generate-voice');
  await pending;
  await page.click(`[data-project="${second.id}"]`);
  await page.waitForFunction(() => document.querySelector('#heading')?.textContent === 'Second');
  await edit('Second draft');
  await unblock!();
  await waitNotice('Giọng nháp đã sẵn sàng');
  assert.equal(await page.$eval('#heading', (e) => e.textContent), 'Second');
  assert.equal(await page.$eval(title, (e) => (e as HTMLInputElement).value), 'Second draft');
  console.log(
    JSON.stringify({
      status: 'PASS',
      checks: ['voice draft', 'upload draft', 'switch project while voice pending'],
    }),
  );
} finally {
  await browser.close();
  await server.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
