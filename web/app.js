const $ = (selector) => document.querySelector(selector);
let current = null;
let dirty = false;
let selectedArtifact = '';
let pendingJobId = '';
let draftGeneration = 0;
let projectLoadGeneration = 0;
function markDirty() {
  draftGeneration++;
  dirty = true;
  $('#discard-edits').hidden = false;
}

async function api(url, data) {
  const response = await fetch(
    '/api' + url,
    data === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result;
}
function notice(message, error = false) {
  $('#notice').textContent = message;
  $('#notice').classList.toggle('error', error);
}
async function action(button, fn) {
  const previous = button?.disabled;
  if (button) button.disabled = true;
  try {
    await fn();
  } catch (error) {
    notice(error.message, true);
  } finally {
    if (button) button.disabled = previous;
  }
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function requireSaved() {
  if (dirty) throw new Error('Bạn có thay đổi chưa lưu. Lưu phiên bản mới trước khi tiếp tục.');
}
async function listProjects() {
  const projects = await api('/projects');
  $('#project-list').replaceChildren(
    ...projects.map((project) => {
      const button = element('button', project.title);
      button.dataset.project = project.id;
      button.classList.toggle('selected', current?.project.id === project.id);
      button.onclick = () =>
        action(button, async () => {
          requireSaved();
          await loadProject(project.id);
        });
      return button;
    }),
  );
}
async function loadProject(id, preserveGeneration, submittedSpec, expectedLoadGeneration) {
  if (expectedLoadGeneration !== undefined && expectedLoadGeneration !== projectLoadGeneration)
    return;
  const loadGeneration = ++projectLoadGeneration;
  const loaded = await api(`/projects/${id}`);
  if (loadGeneration !== projectLoadGeneration) return;
  if (preserveGeneration !== undefined && current?.project.id !== id) return;
  const draft =
    preserveGeneration !== undefined && draftGeneration !== preserveGeneration
      ? collectSpec()
      : null;
  const detachedScenes = draft
    ? new Set(
        Array.from(
          document.querySelectorAll('[data-scene][data-detach="yes"]'),
          (p) => p.dataset.scene,
        ),
      )
    : new Set();
  current = loaded;
  dirty = false;
  $('#discard-edits').hidden = true;
  $('#create-panel').hidden = true;
  $('#workspace').hidden = false;
  $('#heading').textContent = current.project.title;
  $('#revision-badge').textContent =
    `Phiên bản ${current.project.revisionIds.length} · ${current.revision.id.slice(-8)}`;
  $('#project-style').value = current.revision.spec.style;
  $('#export-link').href = `/api/projects/${id}/export`;
  const frames = current.revision.spec.scenes.reduce((n, s) => n + s.durationFrames, 0);
  $('#total-time').textContent =
    `${current.revision.spec.scenes.length} cảnh · ${(frames / 24).toFixed(1)} giây`;
  $('#scrubber').max = frames - 1;
  $('#scrubber').value = 0;
  updatePreview();
  buildScenes();
  if (draft) {
    if (draft.style !== submittedSpec.style) $('#project-style').value = draft.style;
    for (const scene of draft.scenes) {
      const panel = document.querySelector(`[data-scene="${scene.id}"]`);
      const previous = submittedSpec.scenes.find((s) => s.id === scene.id);
      if (!panel || !previous) continue;
      for (const key of ['title', 'narration', 'action', 'camera', 'color'])
        if (scene[key] !== previous[key]) panel.querySelector(`[name="${key}"]`).value = scene[key];
      if (scene.durationFrames !== previous.durationFrames)
        panel.querySelector('[name="seconds"]').value = scene.durationFrames / 24;
      if (detachedScenes.has(scene.id)) panel.querySelector('.audio-line button')?.click();
    }
    markDirty();
  }
  renderStatus();
  await listProjects();
}
function field(labelText, name, value, type = 'text', options) {
  const label = element('label', labelText);
  const input = document.createElement(
    options ? 'select' : type === 'textarea' ? 'textarea' : 'input',
  );
  input.name = name;
  if (options)
    for (const item of options) {
      const option = element('option', item);
      option.value = item;
      input.append(option);
    }
  else if (type === 'textarea') {
    input.rows = 3;
    input.maxLength = 1200;
  } else {
    input.type = type;
    if (name === 'seconds') {
      input.min = 1;
      input.max = 120;
      input.step = 1 / 24;
    }
  }
  input.value = value;
  input.oninput = () => {
    markDirty();
  };
  label.append(input);
  return label;
}
function buildScenes() {
  $('#scenes').replaceChildren(
    ...current.revision.spec.scenes.map((scene) => {
      const panel = element('section', undefined, 'scene');
      panel.dataset.scene = scene.id;
      panel.append(
        element('h3', scene.id.toUpperCase()),
        field('Tên cảnh', 'title', scene.title),
        field('Lời dẫn', 'narration', scene.narration, 'textarea'),
      );
      const row = element('div', undefined, 'form-row');
      row.append(
        field('Hành động', 'action', scene.action, 'text', [
          'idle',
          'wave',
          'walk',
          'pick-up',
          'talk',
        ]),
        field('Camera', 'camera', scene.camera, 'text', ['static', 'pan']),
        field('Giây', 'seconds', scene.durationFrames / 24, 'number'),
      );
      panel.append(row, field('Màu trang phục', 'color', scene.color, 'color'));
      const audio = element('div', undefined, 'audio-line');
      audio.append(
        element(
          'span',
          scene.audio
            ? `Audio ${scene.audio.assetId.slice(0, 8)} · ${scene.audio.textHash ? 'giọng nháp' : 'WAV'}`
            : 'Chưa có audio',
        ),
      );
      const upload = element('label', 'Thay WAV', 'file-button');
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = '.wav,audio/wav';
      file.onchange = () =>
        action(null, async () => {
          requireSaved();
          if (!file.files[0]) return;
          const projectId = current.project.id,
            generation = draftGeneration,
            loadGeneration = projectLoadGeneration,
            submittedSpec = collectSpec();
          notice('Đang chuẩn hóa audio…');
          await api(`/projects/${projectId}/audio`, {
            expectedRevision: current.revision.id,
            sceneId: scene.id,
            base64: await fileBase64(file.files[0]),
          });
          await loadProject(projectId, generation, submittedSpec, loadGeneration);
          notice('Đã gắn WAV và cập nhật thời lượng cảnh.');
        });
      upload.append(file);
      audio.append(upload);
      if (scene.audio) {
        const detach = element('button', 'Bỏ audio');
        detach.type = 'button';
        detach.onclick = () => {
          panel.dataset.detach = 'yes';
          markDirty();
          audio.replaceChildren(element('span', 'Sẽ bỏ audio khi lưu phiên bản.'));
        };
        audio.append(detach);
      }
      panel.append(audio);
      return panel;
    }),
  );
}
function collectSpec() {
  const spec = structuredClone(current.revision.spec);
  spec.style = $('#project-style').value;
  for (const scene of spec.scenes) {
    const panel = document.querySelector(`[data-scene="${scene.id}"]`);
    for (const key of ['title', 'narration', 'action', 'camera', 'color'])
      scene[key] = panel.querySelector(`[name="${key}"]`).value;
    scene.durationFrames = Math.round(Number(panel.querySelector('[name="seconds"]').value) * 24);
    if (panel.dataset.detach === 'yes') delete scene.audio;
  }
  return spec;
}
function updatePreview() {
  if (current)
    $('#story-preview').src =
      `/api/projects/${current.project.id}/preview?frame=${$('#scrubber').value}&revision=${current.revision.id}`;
}
function showArtifact() {
  selectedArtifact = $('#artifact-select').value;
  const artifact = current.artifacts.find((a) => a.id === selectedArtifact);
  $('#video').hidden = !artifact;
  $('#download-video').hidden = !artifact;
  $('#review-submit').disabled = !artifact;
  if (!artifact) {
    $('#video').removeAttribute('src');
    $('#qc-info').textContent = '';
    $('#review-context').textContent = 'Render trước khi duyệt.';
    return;
  }
  const src = `/api/artifacts/${artifact.id}/video`;
  if ($('#video').getAttribute('src') !== src) $('#video').src = src;
  $('#download-video').href = src;
  $('#download-video').download = `${current.project.title}-${artifact.profile}.mp4`;
  const q = artifact.qc;
  $('#qc-info').textContent =
    `QC đạt: ${q.frames} frames · ${q.width} × ${q.height} · 24 fps · ${q.hasAudio ? '48 kHz audio' : 'không audio'} · SHA ${artifact.sha256.slice(0, 12)}`;
  $('#review-context').textContent =
    `Đánh giá video ${artifact.id.slice(-8)}, revision ${artifact.revisionId.slice(-8)}${artifact.revisionId === current.revision.id ? ' (hiện tại)' : ' (phiên bản cũ)'}; ghi chú gắn với frame đang xem.`;
}
function renderStatus() {
  $('#jobs').replaceChildren(
    ...current.jobs.slice(0, 8).map((job) => {
      const row = element('div', undefined, 'job');
      row.dataset.jobStatus = job.status;
      row.append(
        element(
          'strong',
          `${job.profile} · ${job.status}${job.cacheHit ? ' · cache' : ''} · revision ${job.revisionId.slice(-8)}`,
        ),
      );
      row.append(element('div', job.stage));
      if (['queued', 'running'].includes(job.status)) {
        const bar = document.createElement('progress');
        bar.max = 1;
        bar.value = job.progress;
        row.append(bar);
        const cancel = element('button', 'Hủy');
        cancel.onclick = () =>
          action(cancel, async () => {
            await api(`/jobs/${job.id}/cancel`, {});
          });
        row.append(cancel);
      } else if (['failed', 'interrupted', 'cancelled'].includes(job.status)) {
        const retry = element('button', 'Thử lại');
        retry.onclick = () =>
          action(retry, async () => {
            await api(`/jobs/${job.id}/retry`, {});
          });
        row.append(retry);
      }
      return row;
    }),
  );
  const artifacts = [...current.artifacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const select = $('#artifact-select');
  let previous = selectedArtifact;
  const newlyRendered = artifacts.find((artifact) => artifact.jobId === pendingJobId);
  if (newlyRendered) {
    previous = newlyRendered.id;
    pendingJobId = '';
  }
  select.replaceChildren();
  if (!artifacts.length) select.append(element('option', 'Chưa có video'));
  for (const artifact of artifacts) {
    const option = element(
      'option',
      `${artifact.profile} · ${artifact.revisionId.slice(-8)}${artifact.revisionId === current.revision.id ? ' · hiện tại' : ' · cũ'} · ${artifact.id.slice(-6)}`,
    );
    option.value = artifact.id;
    select.append(option);
  }
  if (artifacts.some((a) => a.id === previous)) select.value = previous;
  showArtifact();
  $('#reviews').replaceChildren(
    ...current.reviews
      .slice()
      .reverse()
      .map((review) => {
        const row = element('div', undefined, 'review-record');
        row.append(
          element(
            'strong',
            `${review.reviewer} · ${review.decision === 'approved' ? 'Đã duyệt' : 'Cần chỉnh sửa'}`,
          ),
          element('p', review.notes),
          element(
            'small',
            `Revision ${review.revisionId.slice(-8)} · frame ${review.frame ?? '—'} · ${new Date(review.createdAt).toLocaleString('vi-VN')}`,
          ),
        );
        return row;
      }),
  );
}
function fileBase64(file) {
  if (file.size > 24000000) throw new Error('File vượt quá 24 MB.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}
$('#create-form').onsubmit = (event) => {
  event.preventDefault();
  action(event.submitter, async () => {
    const fields = Object.fromEntries(new FormData(event.target));
    const project = await api('/projects', fields);
    selectedArtifact = '';
    await loadProject(project.id);
    notice('Đã tạo phân cảnh nháp. Kiểm tra nội dung và hành động trước khi render.');
  });
};
$('#new-project').onclick = () =>
  action(null, async () => {
    requireSaved();
    projectLoadGeneration++;
    current = null;
    selectedArtifact = '';
    $('#workspace').hidden = true;
    $('#create-panel').hidden = false;
    $('#heading').textContent = 'Bắt đầu một câu chuyện';
    notice('');
    await listProjects();
  });
$('#project-style').onchange = () => {
  markDirty();
};
$('#discard-edits').onclick = (event) =>
  action(event.target, async () => {
    await loadProject(current.project.id);
    notice('Đã bỏ thay đổi chưa lưu và tải revision mới nhất.');
  });
$('#scrubber').oninput = updatePreview;
$('#artifact-select').onchange = showArtifact;
$('#save-scenes').onclick = (event) =>
  action(event.target, async () => {
    const projectId = current.project.id,
      generation = draftGeneration,
      loadGeneration = projectLoadGeneration,
      submittedSpec = collectSpec();
    await api(`/projects/${projectId}/revisions`, {
      expectedRevision: current.revision.id,
      spec: submittedSpec,
    });
    await loadProject(projectId, generation, submittedSpec, loadGeneration);
    notice('Đã lưu phiên bản mới. Đánh giá của video cũ được giữ đúng phiên bản cũ.');
  });
$('#reload').onclick = (event) =>
  action(event.target, async () => {
    requireSaved();
    await loadProject(current.project.id);
    notice('Đã tải phiên bản mới nhất.');
  });
$('#generate-voice').onclick = (event) =>
  action(event.target, async () => {
    requireSaved();
    const projectId = current.project.id,
      generation = draftGeneration,
      loadGeneration = projectLoadGeneration,
      submittedSpec = collectSpec();
    notice('Đang tạo giọng nháp và căn thời lượng…');
    await api(`/projects/${projectId}/voice`, { expectedRevision: current.revision.id });
    await loadProject(projectId, generation, submittedSpec, loadGeneration);
    notice('Giọng nháp đã sẵn sàng. Nghe và duyệt timing trong video render.');
  });
$('#render').onclick = (event) =>
  action(event.target, async () => {
    requireSaved();
    const job = await api(`/projects/${current.project.id}/jobs`, {
      revisionId: current.revision.id,
      profile: $('#profile').value,
    });
    pendingJobId = job.id;
    selectedArtifact = '';
    current = await api(`/projects/${current.project.id}`);
    renderStatus();
    notice('Đã đưa video vào hàng đợi.');
  });
$('#review-form').onsubmit = (event) => {
  event.preventDefault();
  action(event.submitter, async () => {
    const artifact = current.artifacts.find((a) => a.id === selectedArtifact);
    if (!artifact) throw new Error('Chọn video đã QC.');
    await api(`/artifacts/${artifact.id}/reviews`, {
      ...Object.fromEntries(new FormData(event.target)),
      frame: Math.min(artifact.qc.frames - 1, Math.floor($('#video').currentTime * 24)),
    });
    current = await api(`/projects/${current.project.id}`);
    renderStatus();
    notice('Đã ghi nhận đánh giá đúng video và revision.');
  });
};
$('#import-file').onchange = (event) =>
  action(null, async () => {
    requireSaved();
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 40000000) throw new Error('Gói vượt quá 40 MB.');
    const project = await api('/import', JSON.parse(await file.text()));
    selectedArtifact = '';
    await loadProject(project.id);
    notice('Đã kiểm hash và nhập gói dự án.');
  });
$('#doctor').onclick = (event) =>
  action(event.target, async () => {
    const result = await api('/doctor');
    notice(`${result.node} · ${result.chromium} · ${result.ffmpeg} · ${result.backend}`);
  });
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
setInterval(async () => {
  if (!current) return;
  const id = current.project.id;
  try {
    const latest = await api(`/projects/${id}`);
    if (current?.project.id !== id) return;
    // Keep unsaved scene inputs and the revision used for optimistic concurrency.
    current.jobs = latest.jobs;
    current.artifacts = latest.artifacts;
    current.reviews = latest.reviews;
    renderStatus();
  } catch (error) {
    notice(error.message, true);
  }
}, 1500);
await action(null, listProjects);
