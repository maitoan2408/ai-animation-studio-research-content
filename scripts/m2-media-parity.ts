/** Independent consumer checks of the served preview and decoded delivery.
 * Bounds are fixed before measuring: RGB MAE <=3 globally and <=6 in every
 * 240x270 tile; <=3% of pixels per tile may differ by >32 in any channel.
 * These allow raster antialiasing/H.264 loss, not creative approval.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { Browser } from 'puppeteer-core';
import type { ProjectSpec } from '../src/domain.js';
import { frameSvg } from '../src/rig.js';
import { mixAudio, pcmFromWav } from '../src/audio.js';
import type { Store } from '../src/store.js';

const decode = (args: string[]) => {
  const result = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-xerror', '-nostdin', '-threads', '1', '-filter_threads', '1', ...args],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  assert.equal(result.status, 0, String(result.stderr || result.error));
  return result.stdout;
};

export async function checkM2Media(
  browser: Browser,
  store: Store,
  spec: ProjectSpec,
  previewUrl: string,
  video: string,
  evidence: string,
) {
  const mix = await mixAudio(store, spec);
  assert.ok(mix.audio);
  const referencePcm = pcmFromWav(mix.audio);
  const decodedPcm = decode(['-i', video, '-vn', '-ar', '48000', '-ac', '1', '-f', 's16le', '-']);
  assert.ok(decodedPcm.length >= referencePcm.length, 'truncated decoded audio');
  const audioChecks = [];
  let start = 0;
  for (const scene of spec.scenes) {
    let dot = 0,
      left = 0,
      right = 0;
    const end = start + scene.durationFrames * 2000;
    for (let i = start; i < end; i++) {
      const a = referencePcm.readInt16LE(i * 2),
        b = decodedPcm.readInt16LE(i * 2);
      dot += a * b;
      left += a * a;
      right += b * b;
    }
    const correlation = dot / Math.sqrt(left * right);
    assert.ok(
      correlation > 0.98,
      scene.id + ': encoded voice differs or is shifted: ' + correlation,
    );
    audioChecks.push({ scene: scene.id, zeroLagCorrelation: correlation });
    start = end;
  }
  // Include both sides of each cut, a speaking frame and the final frame.
  const frames = new Set<number>();
  start = 0;
  for (const scene of spec.scenes) {
    frames.add(start);
    frames.add(start + scene.durationFrames - 1);
    const envelope = mix.envelopes[scene.id]!;
    frames.add(start + envelope.indexOf(Math.max(...envelope)));
    start += scene.durationFrames;
  }
  const page = await browser.newPage();
  const pictures = [];
  try {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    for (const frame of [...frames].sort((a, b) => a - b)) {
      const url = previewUrl + '&frame=' + frame;
      const response = await page.goto(url, { waitUntil: 'networkidle0' });
      assert.equal(response?.status(), 200);
      assert.equal(
        await response!.text(),
        frameSvg(spec, frame, mix.envelopes),
        'preview/source drift',
      );
      const png = path.join(evidence, 'preview-native-' + frame + '.png');
      await page.screenshot({ path: png });
      const reference = decode([
        '-i',
        png,
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        '-',
      ]);
      const actual = decode([
        '-i',
        video,
        '-vf',
        'select=eq(n\\,' + frame + ')',
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        '-',
      ]);
      assert.equal(reference.length, 1920 * 1080 * 3);
      assert.equal(actual.length, reference.length);
      let sum = 0;
      const tiles = Array.from({ length: 32 }, () => ({ error: 0, large: 0 }));
      for (let i = 0; i < actual.length; i += 3) {
        const pixel = i / 3,
          x = pixel % 1920,
          y = Math.floor(pixel / 1920);
        const tile = tiles[Math.floor(y / 270) * 8 + Math.floor(x / 240)]!;
        let large = false;
        for (let c = 0; c < 3; c++) {
          const error = Math.abs(actual[i + c]! - reference[i + c]!);
          sum += error;
          tile.error += error;
          large ||= error > 32;
        }
        if (large) tile.large++;
      }
      const mae = sum / actual.length;
      const maxTileMae = Math.max(...tiles.map((t) => t.error / (240 * 270 * 3)));
      const maxTileLargeFraction = Math.max(...tiles.map((t) => t.large / (240 * 270)));
      const result = { frame, mae, maxTileMae, maxTileLargeFraction };
      pictures.push(result);
      await writeFile(
        path.join(evidence, 'preview-final-parity.json'),
        JSON.stringify(
          {
            limits: { mae: 3, tileMae: 6, tileLargeFraction: 0.03, largeError: 32 },
            pictures,
            audioChecks,
          },
          null,
          2,
        ) + '\n',
      );
      assert.ok(
        mae <= 3 && maxTileMae <= 6 && maxTileLargeFraction <= 0.03,
        'Preview/final pixel mismatch: ' + JSON.stringify(result),
      );
    }
  } finally {
    await page.close();
  }
  return { pictures, audioChecks };
}
