// Browser-only JS; all untrusted text is rendered through textContent.
const $ = id => document.getElementById(id);
const video = $('video');
let catalog, artifact, token, mode, head = null, records = [];
let frame = -1, seeking = true, busy = false, callback = null, seekTimer;
let pendingSubmission = null;
const scoreKeys = ['art','acting','layout','continuity','editability'];
const message = text => { $('status').textContent = text; };
const currentShot = () => artifact?.shots.find(s => frame >= s.startFrame && frame < s.endFrame);
function enableSaving() { $('save').disabled = busy || seeking || video.seeking || !video.paused || !currentShot(); }
function settleFrame() {
  const expected = Math.min(artifact.frames-1, Math.floor(video.currentTime * artifact.fps + .001));
  if (frame === expected && !video.seeking) { seeking = false; clearTimeout(seekTimer); }
  enableSaving();
}
function resetObservation() { for (const id of ['normal','slow','listened','blocking']) $(id).checked = false; }
function displayFrame(mediaTime) {
  const previousShot = currentShot()?.id;
  frame = Math.min(artifact.frames - 1, Math.max(0, Math.round(mediaTime * artifact.fps)));
  if (previousShot !== currentShot()?.id) resetObservation();
  $('frame').value = String(frame);
  $('position').textContent = `${artifact.revision} · ${currentShot()?.id ?? '—'} · frame ${frame} (shot: ${frame - (currentShot()?.startFrame ?? 0)})`;
  $('time').textContent = `${(frame / artifact.fps).toFixed(3)} s / ${(artifact.frames / artifact.fps).toFixed(3)} s`;
  $('position').dataset.frame = String(frame);
}
function observeFrames(selectedId) {
  callback = video.requestVideoFrameCallback((_now, meta) => {
    if (artifact.id !== selectedId) return;
    displayFrame(meta.mediaTime);
    settleFrame(); observeFrames(selectedId);
  });
}
function seekTo(target) {
  target = Math.max(0, Math.min(artifact.frames - 1, Math.round(target)));
  video.pause();
  if (frame === target && !seeking && !video.seeking) { enableSaving(); return; }
  seeking = true; enableSaving();
  clearTimeout(seekTimer);
  seekTimer = setTimeout(() => { message('Chưa xác nhận frame được trình bày. Hãy chọn lại frame hoặc tải lại trang.'); }, 10_000);
  video.currentTime = (target + .1) / artifact.fps;
}
function renderNotes() {
  const notes = records.filter(r => r.request.artifactId === artifact.id);
  $('count').textContent = `${notes.length} ghi chú`;
  $('notes').replaceChildren();
  if (!notes.length) { const p = document.createElement('p'); p.className = 'subtle'; p.textContent = 'Chưa có nhận xét cho đúng file video này.'; $('notes').append(p); }
  for (const record of [...notes].reverse()) {
    const r = record.request, item = document.createElement('article'); item.className = 'note-item';
    const jump = document.createElement('button'); jump.type = 'button'; jump.textContent = `${r.shotId} · frame ${r.frame}`; jump.onclick = () => seekTo(r.frame);
    const author = document.createElement('small'); author.textContent = `${r.reviewer.name} · ${r.reviewer.kind} · ${r.decision}`;
    const note = document.createElement('p'); note.textContent = r.note;
    const detail = document.createElement('small'); detail.textContent = `${record.createdAt} · bản ghi ${record.sequence} · ${record.hash.slice(0,12)}`;
    item.append(jump, author, note, detail); $('notes').append(item);
  }
}
async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw Error(data.error ?? `HTTP_${response.status}`);
  return data;
}
async function refresh() {
  const snapshot = await fetchJson('/api/reviews'); head = snapshot.head; records = snapshot.records;
  renderNotes(); message(`Đã nạp ${records.length} bản ghi; nhận xét gắn đúng hash video.`);
}
function selectArtifact() {
  video.pause(); if (callback !== null) video.cancelVideoFrameCallback(callback);
  clearTimeout(seekTimer); artifact = catalog.artifacts.find(a => a.id === $('revision').value);
  frame = -1; seeking = true; resetObservation();
  for (const key of scoreKeys) $(`score-${key}`).value = '';
  $('decision').value = 'note'; $('note').value = ''; pendingSubmission = null;
  $('frame').max = String(artifact.frames-1); $('frame').value = '0';
  $('position').textContent = 'Đang chờ frame được trình bày…'; delete $('position').dataset.frame;
  $('master').href = `/media/${artifact.id}/master`;
  $('identity').textContent = `Video SHA-256: ${artifact.id} · Master: ${artifact.masterSha256}`;
  $('color-status').textContent = artifact.colorStatus === 'pass'
    ? 'Màu đã qua phép thử của môi trường tham chiếu. Vẫn cần xem chuyển động và nghe thoại.'
    : 'Màu trên player đang được kiểm tra. Có thể ghi chú; chưa thể ghi nhận shot đạt rubric.';
  document.querySelector('#decision option[value="accepted"]').disabled = artifact.colorStatus !== 'pass';
  observeFrames(artifact.id); video.src = `/media/${artifact.id}`; video.load();
  video.playbackRate = Number($('rate').value); renderNotes(); enableSaving();
}
$('revision').addEventListener('change', selectArtifact);
$('rate').addEventListener('change', () => { video.playbackRate = Number($('rate').value); });
$('frame').addEventListener('input', () => seekTo(Number($('frame').value)));
$('previous').onclick = () => seekTo(frame-1); $('next').onclick = () => seekTo(frame+1);
video.addEventListener('seeking', () => { seeking = true; enableSaving(); });
// Chromium may present the target frame before firing seeked. Both events must
// use the same last-presented-frame proof; seeked alone is never sufficient.
video.addEventListener('seeked', settleFrame);
video.addEventListener('play', enableSaving); video.addEventListener('pause', enableSaving);
video.addEventListener('error', () => { seeking = true; enableSaving(); message('VIDEO_DECODE_ERROR: Không thể xem bản video này.'); });
$('refresh').onclick = () => { void refresh().catch(error => message(error.message)); };
$('review-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || seeking || !video.paused || !currentShot()) return;
  busy = true; enableSaving();
  try {
    const values = scoreKeys.map(key => $(`score-${key}`).value);
    const scores = values.every(value => !value) ? null : Object.fromEntries(scoreKeys.map((key,index) => [key, Number(values[index])]));
    if (scores && values.some(value => !value)) throw Error('Vui lòng điền đủ 5 mục điểm hoặc để trống tất cả.');
    const request = {expectedHead:head, artifactId:artifact.id, masterSha256:artifact.masterSha256,
      revision:artifact.revision, shotId:currentShot().id, frame,
      reviewer:{name:$('reviewer').value,kind:mode === 'test' ? 'automated-test' : $('reviewer-kind').value},
      decision:$('decision').value, note:$('note').value, scores,
      observed:{normalSpeed:$('normal').checked,slowSpeed:$('slow').checked,listened:$('listened').checked}, blockingIssue:$('blocking').checked};
    const signature = JSON.stringify(request);
    // Preserve the request ID after a lost response; same input is safe to retry.
    if (!pendingSubmission || pendingSubmission.signature !== signature) pendingSubmission = {signature, requestId:crypto.randomUUID()};
    await fetchJson('/api/reviews', {method:'POST',headers:{'content-type':'application/json','x-review-token':token},body:JSON.stringify({...request,requestId:pendingSubmission.requestId})});
    pendingSubmission = null; $('note').value = '';
    await refresh(); message('Đã lưu ghi chú bất biến. Có thể tải nhật ký để tiếp tục ở phiên làm việc khác.');
  } catch (error) {
    message(error.message === 'STALE_HEAD' ? 'Nhật ký có thay đổi từ cửa sổ khác. Nạp lại nhật ký, kiểm tra rồi lưu lại; nội dung nhập vẫn được giữ.' : error.message);
  } finally { busy = false; enableSaving(); }
});
try {
  if (!('requestVideoFrameCallback' in video)) throw Error('PLAYER_UNSUPPORTED: Cần trình duyệt có requestVideoFrameCallback.');
  const data = await fetchJson('/api/catalog'); catalog = data.catalog; token = data.csrfToken; mode = data.mode;
  $('project').textContent = `${catalog.title}${mode === 'test' ? ' · DỮ LIỆU KIỂM THỬ' : ''}`;
  for (const a of catalog.artifacts) { const option = document.createElement('option'); option.value = a.id; option.textContent = a.revision; $('revision').append(option); }
  if (mode === 'test') {
    const option = document.createElement('option'); option.value = 'automated-test'; option.textContent = 'Kiểm thử tự động';
    $('reviewer-kind').append(option); $('reviewer-kind').value = 'automated-test';
    $('reviewer-kind').disabled = true; $('reviewer').value = 'Automated browser test';
  }
  selectArtifact(); await refresh();
} catch (error) { message(`Không thể khởi động: ${error.message}`); }
