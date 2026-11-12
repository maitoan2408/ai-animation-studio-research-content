/** Only explicitly catalogued, hash-verified local files can be served. */
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {type Catalog, fail, hash, parseCatalog} from './domain.js';

const exec = promisify(execFile);
export async function verifiedBytes(root: string, relative: string, sha: string): Promise<Buffer> {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).some(p => p === '..' || p === '') || relative.includes('\0')) fail('UNSAFE_MEDIA_PATH');
  const base = await realpath(root);
  let file: string;
  try { file = await realpath(path.resolve(base, relative)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') fail('MEDIA_MISSING_RESTORE_REQUIRED', 409);
    throw error;
  }
  if (!file.startsWith(base + path.sep)) fail('MEDIA_PATH_ESCAPES_ROOT');
  const metadata = await stat(file);
  if (!metadata.isFile() || metadata.size > 200 * 1024 * 1024) fail('MEDIA_SIZE_LIMIT');
  const bytes = await readFile(file);
  if (hash(bytes) !== sha) fail('MEDIA_HASH_MISMATCH', 409);
  return bytes;
}
export async function loadCatalog(root: string, catalogFile: string): Promise<Catalog> {
  const catalog = parseCatalog(JSON.parse(await readFile(catalogFile, 'utf8')));
  for (const artifact of catalog.artifacts) {
    await verifiedBytes(root, artifact.file, artifact.id);
    await verifiedBytes(root, artifact.masterFile, artifact.masterSha256);
    const {stdout} = await exec('ffprobe', ['-v','error','-show_streams','-of','json',path.resolve(root, artifact.file)], {timeout: 30_000, maxBuffer: 1024 * 1024});
    const streams = (JSON.parse(stdout) as {streams: Record<string, unknown>[]}).streams;
    const video = streams.find(s => s.codec_type === 'video');
    const audio = streams.find(s => s.codec_type === 'audio');
    if (streams.length !== 2 || !video || !audio) fail('STREAM_LAYOUT');
    const full = artifact.profile === 'web-review-srgb-full-2';
    const fields = {codec_name:'h264',pix_fmt:full?'yuvj420p':'yuv420p',width:1920,height:1080,
      avg_frame_rate:'24/1',r_frame_rate:'24/1',nb_frames:String(artifact.frames),
      color_transfer:'iec61966-2-1',color_primaries:'bt709',color_space:'bt709',color_range:full?'pc':'tv',start_time:'0.000000'};
    if (Object.entries(fields).some(([k,v]) => video[k] !== v) || audio.codec_name !== 'aac' || audio.channels !== 2 || audio.sample_rate !== '48000' || audio.start_time !== '0.000000') fail('MEDIA_PROFILE_MISMATCH');
    for (const stream of [video, audio]) if (Math.abs(Number(stream.duration) - artifact.frames / 24) > 1 / 48000 || !Number.isFinite(Number(stream.duration))) fail('MEDIA_DURATION_MISMATCH');
  }
  await verifiedBytes(root, catalog.native.file, catalog.native.sha256);
  return catalog;
}
