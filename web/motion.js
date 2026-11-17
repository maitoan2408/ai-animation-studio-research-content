const $ = (s) => document.querySelector(s);
const API = '/api/motion';
const actions = ['walk-stop', 'turn-head', 'wave', 'pick-place'];
const defaults = { 'walk-stop': 73, 'turn-head': 49, wave: 49, 'pick-place': 97 };
const cupSha = '3ef82e07b61e1c1f19d54dccf9ae22138773c27dadb46ebde7e7eb7c86b60eee';
let saved = null,
  dirty = false,
  checkingJob = '',
  draftBase = null,
  editVersion = 0,
  documentBusy = false;
function note(message, error = false) {
  const target = $('#motion-notice');
  target.textContent = message;
  target.classList.toggle('error', error);
}
function field(label, type, value) {
  const box = document.createElement('label');
  box.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  box.append(input);
  return { box, input };
}
function apply(project) {
  draftBase = structuredClone(project);
  editVersion++;
  $('#character-id').value = project.character.id;
  $('#character-model').value = project.character.model;
  $('#character-x').value = String(project.character.xStart);
  $('#character-floor').value = String(project.character.floor);
  const prop = project.prop ?? { x: 960, y: 631, scale: 0.7 };
  $('#cup-x').value = String(prop.x);
  $('#cup-y').value = String(prop.y);
  $('#cup-scale').value = String(prop.scale);
  $('#motion-clips').replaceChildren();
  project.clips.forEach((c) => clipRow(c.action, c.frames));
  dirty = false;
  updateDirty();
}
function clipRow(action = 'wave', frames = 49) {
  const row = document.createElement('div');
  row.className = 'scene m3-clip';
  const line = document.createElement('div');
  line.className = 'form-row';
  const actionLabel = document.createElement('label');
  actionLabel.textContent = 'Hành động';
  const select = document.createElement('select');
  select.dataset.kind = 'action';
  for (const name of actions) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.append(opt);
  }
  select.value = action;
  actionLabel.append(select);
  const frameLabel = document.createElement('label');
  frameLabel.textContent = 'Frames';
  const framesInput = document.createElement('input');
  framesInput.type = 'number';
  framesInput.dataset.kind = 'frames';
  framesInput.min = action === 'pick-place' ? '73' : action === 'walk-stop' ? '49' : '25';
  framesInput.max = action === 'walk-stop' ? '185' : '241';
  framesInput.step = action === 'walk-stop' ? '2' : '4';
  framesInput.value = String(frames);
  frameLabel.append(framesInput);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Xóa clip';
  remove.addEventListener('click', () => {
    row.remove();
    markDirty();
  });
  select.addEventListener('change', () => {
    framesInput.value = String(defaults[select.value]);
    framesInput.min =
      select.value === 'pick-place' ? '73' : select.value === 'walk-stop' ? '49' : '25';
    framesInput.max = select.value === 'walk-stop' ? '185' : '241';
    framesInput.step = select.value === 'walk-stop' ? '2' : '4';
    markDirty();
  });
  framesInput.addEventListener('input', markDirty);
  line.append(actionLabel, frameLabel, remove);
  row.append(line);
  $('#motion-clips').append(row);
}
function clips() {
  return [...document.querySelectorAll('.m3-clip')].map((row) => ({
    action: row.querySelector('[data-kind="action"]').value,
    frames: Number(row.querySelector('[data-kind="frames"]').value),
  }));
}
function collect() {
  if (!saved) throw Error('M3 project not loaded');
  const project = structuredClone(draftBase);
  const entries = clips();
  if (!entries.length) throw Error('Cần ít nhất một action clip.');
  project.character.id = $('#character-id').value.trim();
  project.character.model = $('#character-model').value;
  project.character.xStart = Number($('#character-x').value);
  project.character.floor = Number($('#character-floor').value);
  if (
    JSON.stringify(entries.map((x) => x.action)) !==
    JSON.stringify(draftBase.clips.map((x) => x.action))
  )
    project.character.capabilities = [...new Set(entries.map((x) => x.action))];
  project.clips = entries;
  if (
    entries.some((x) => x.action === 'pick-place') ||
    (project.prop && !draftBase.clips.some((x) => x.action === 'pick-place'))
  ) {
    project.prop = {
      id: project.prop?.id ?? 'cup-m3',
      asset: project.prop?.asset ?? 'props/cup',
      sha256: project.prop?.sha256 ?? cupSha,
      x: Number($('#cup-x').value),
      y: Number($('#cup-y').value),
      scale: Number($('#cup-scale').value),
    };
  } else if (draftBase.clips.some((x) => x.action === 'pick-place')) delete project.prop;
  return project;
}
function updateDirty() {
  $('#revision').textContent = saved
    ? (dirty ? 'Chưa lưu · ' : 'Đã lưu · ') + saved.revision.slice(0, 12)
    : 'Đang mở';
  $('#motion-render').disabled = dirty || !saved || documentBusy || checkingJob !== '';
  $('#motion-quality').disabled = documentBusy || checkingJob !== '';
  $('#motion-save').disabled = !saved || documentBusy;
  $('#motion-reload').disabled = documentBusy;
  $('#motion-import').disabled = !saved || documentBusy;
}
function markDirty() {
  editVersion++;
  dirty = true;
  updateDirty();
}
async function api(route, body) {
  const response = await fetch(
    API + route,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw Error(result.error?.code + ': ' + result.error?.message);
  return result;
}
async function perform(button, fn) {
  if (button) button.disabled = true;
  try {
    await fn();
  } catch (error) {
    note(String(error.message ?? error), true);
  } finally {
    if (button) button.disabled = false;
    updateDirty();
  }
}
async function documentOperation(fn) {
  if (documentBusy) throw Error('Đang xử lý project; hãy đợi thao tác hiện tại.');
  documentBusy = true;
  updateDirty();
  try {
    await fn();
  } finally {
    documentBusy = false;
    updateDirty();
  }
}
async function load() {
  await documentOperation(async () => {
    const version = editVersion;
    const next = await api('/project');
    saved = next;
    if (editVersion === version) apply(next.project);
    note(
      'Đã mở revision ' +
        next.revision.slice(0, 12) +
        ' · ' +
        next.frames +
        ' frames.' +
        (dirty ? ' Giữ lại chỉnh sửa mới chưa lưu.' : ''),
    );
  });
}
async function save() {
  await documentOperation(async () => {
    const version = editVersion;
    const document = await api('/project', {
      expectedRevision: saved.revision,
      project: collect(),
    });
    saved = document;
    if (editVersion === version) apply(document.project);
    note(
      'Đã lưu và xác minh: ' +
        document.frames +
        ' frames / 24fps.' +
        (dirty ? ' Giữ lại chỉnh sửa mới chưa lưu.' : ''),
    );
  });
}
async function checkJob(id) {
  checkingJob = id;
  updateDirty();
  try {
    const job = await api('/jobs/' + encodeURIComponent(id));
    $('#motion-status').textContent =
      job.status + ' · ' + job.frames + ' frames' + (job.error ? ' · ' + job.error : '');
    if (job.status === 'rendering') {
      setTimeout(() => checkJob(id), 1100);
      return;
    }
    checkingJob = '';
    updateDirty();
    if (job.status === 'succeeded') {
      const url = API + '/jobs/' + encodeURIComponent(id) + '/video';
      $('#motion-video').src = url;
      $('#motion-video').hidden = false;
      $('#motion-blank').hidden = true;
      $('#motion-download').href = url;
      $('#motion-download').hidden = false;
      $('#motion-status').textContent =
        (job.qualityMode === 'enhanced' ? 'M6 quality · ' : 'M3 baseline · ') +
        'MP4 1920×1080, 24fps; ' + job.frames + ' frames · SHA ' + job.videoSha256.slice(0, 16);
    } else note('M3 render chưa thành công: ' + (job.error || job.status), true);
  } catch (error) {
    checkingJob = '';
    updateDirty();
    note('Không đọc được trạng thái M3: ' + String(error.message ?? error), true);
  }
}
function exportJson() {
  const project = collect();
  const json = JSON.stringify(project, null, 2) + '\n';
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = project.character.id + '.m3.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener('DOMContentLoaded', () => {
  for (const selector of [
    '#character-id',
    '#character-model',
    '#character-x',
    '#character-floor',
    '#cup-x',
    '#cup-y',
    '#cup-scale',
  ])
    $(selector).addEventListener('input', markDirty);
  $('#add-clip').addEventListener('click', () => {
    clipRow('wave', 49);
    markDirty();
  });
  $('#motion-save').addEventListener('click', (e) => perform(e.currentTarget, save));
  $('#motion-reload').addEventListener('click', (e) => perform(e.currentTarget, load));
  $('#motion-export').addEventListener('click', (e) =>
    perform(e.currentTarget, async () => exportJson()),
  );
  $('#motion-import').addEventListener('change', (e) =>
    perform(null, async () => {
      const file = e.currentTarget.files?.[0];
      if (!file) return;
      if (file.size > 30000) throw Error('File project lớn hơn 30 KB.');
      await documentOperation(async () => {
        const version = editVersion;
        const project = JSON.parse(await file.text());
        const validated = await api('/validate', { project });
        if (version !== editVersion)
          throw Error('Có chỉnh sửa mới; hãy nhập lại file để tránh ghi đè.');
        apply(validated.project);
        markDirty();
        note('Đã nhập nháp đã xác minh; hãy lưu để xuất video.');
      });
    }),
  );
  $('#motion-render').addEventListener('click', (e) =>
    perform(e.currentTarget, async () => {
      if (dirty) throw Error('Hãy lưu revision trước khi render.');
      const job = await api('/jobs', { revision: saved.revision, quality: $('#motion-quality').value });
      note('Đã nhận render từ Studio, file sẽ chỉ công bố sau khi vượt qua QC.');
      $('#motion-video').hidden = true;
      $('#motion-blank').hidden = false;
      $('#motion-download').hidden = true;
      localStorage.setItem('m3-last-job-id', job.id);
      await checkJob(job.id);
    }),
  );
  perform(null, async () => {
    await load();
    const last = localStorage.getItem('m3-last-job-id');
    if (last) await checkJob(last);
  });
});
