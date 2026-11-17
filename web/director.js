/** UI is a data-only display: content is textContent, never innerHTML/eval. */
const form = document.querySelector('#director-form');
const planButton = document.querySelector('#director-plan');
const runButton = document.querySelector('#director-run');
const notice = document.querySelector('#director-notice');
const graph = document.querySelector('#director-graph');
const phase = document.querySelector('#director-phase');
const sha = document.querySelector('#director-sha');
const notes = document.querySelector('#director-notes');
const scenes = document.querySelector('#director-scenes');
const result = document.querySelector('#director-result');
const receipt = document.querySelector('#director-receipt');
const video = document.querySelector('#director-video');
let approvedPlan = null;
let approvedInput = null;
let generation = 0;
let executing = false;
let busy = false;
const input = () => {
  const data = new FormData(form);
  return {
    title: String(data.get('title')),
    script: String(data.get('script')),
    style: String(data.get('style')),
    language: String(data.get('language')),
    profile: String(data.get('profile')),
    voice: data.get('voice') === 'true',
  };
};
const request = async (endpoint, payload) => {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error?.message || 'Director API error');
    error.code = data.error?.code || 'DIRECTOR_API_ERROR';
    throw error;
  }
  return data;
};
const report = (text, error = false) => {
  notice.textContent = text;
  notice.style.color = error ? '#a12828' : '';
};
const invalidate = () => {
  if (executing) return;
  generation++;
  approvedInput = null;
  approvedPlan = null;
  runButton.disabled = true;
  sha.textContent = '';
  graph.replaceChildren();
  notes.replaceChildren();
  scenes.replaceChildren();
  result.hidden = true;
  if (!busy) phase.textContent = 'M5 · Plan';
};
form.addEventListener('input', invalidate);
form.addEventListener('change', invalidate);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  invalidate();
  const requested = JSON.stringify(input());
  const currentGeneration = generation;
  busy = true;
  planButton.disabled = true;
  report('Đang kiểm tra khả năng và xây dựng task graph…');
  try {
    const plan = await request('/api/director/plan', JSON.parse(requested));
    if (currentGeneration !== generation || JSON.stringify(input()) !== requested) {
      phase.textContent = 'M5 · Plan';
      report('Kịch bản đã thay đổi trong lúc lập kế hoạch. Hãy lập kế hoạch mới.');
      return;
    }
    for (const item of plan.graph) {
      const li = document.createElement('li');
      li.dataset.step = item.id;
      li.textContent =
        item.id + ' · ' + item.skill + '  [needs: ' + (item.needs.join(', ') || 'none') + ']';
      graph.append(li);
    }
    for (const scene of plan.spec.scenes) {
      const li = document.createElement('li');
      li.dataset.scene = scene.id;
      li.textContent =
        scene.id +
        ' · ' +
        scene.title +
        ' · ' +
        scene.action +
        ' · camera=' +
        scene.camera +
        ' · ' +
        scene.durationFrames +
        ' frames';
      scenes.append(li);
    }
    const paragraph = document.createElement('p');
    paragraph.textContent = plan.notes.join(' ');
    notes.append(paragraph);
    sha.textContent = 'Plan SHA-256: ' + plan.planSha256;
    approvedPlan = plan;
    approvedInput = requested;
    runButton.disabled = false;
    phase.textContent = 'M5 · Ready';
    report('Task graph hợp lệ. Xem lại rồi nhấn Xác nhận để thực thi các kỹ năng.');
  } catch (error) {
    if (currentGeneration !== generation) return;
    phase.textContent = 'M5 · Rejected';
    report('FAIL-CLOSED ' + (error.code || 'DIRECTOR_ERROR') + ': ' + error.message, true);
  } finally {
    busy = false;
    planButton.disabled = false;
  }
});
runButton.addEventListener('click', async () => {
  if (busy || !approvedPlan) return;
  if (JSON.stringify(input()) !== approvedInput) {
    invalidate();
    report('Kịch bản đã thay đổi. Hãy lập kế hoạch mới.', true);
    return;
  }
  busy = true;
  executing = true;
  for (const item of form.querySelectorAll('input, textarea, select')) item.disabled = true;
  runButton.disabled = true;
  planButton.disabled = true;
  phase.textContent = 'M5 · Running';
  report('Đã phê duyệt graph; Studio đang tạo dự án, voice và render MP4 thực…');
  try {
    const done = await request('/api/director/run', {
      plan: approvedPlan,
      approved: true,
    });
    phase.textContent = 'M5 · Rendered';
    report('Đã hoàn tất kiểm tra artifact. Chưa phê duyệt nghệ thuật.');
    receipt.textContent =
      'Revision: ' +
      done.revisionId +
      ' · Video SHA-256: ' +
      done.artifactSha256 +
      ' · ' +
      done.qc.width +
      '×' +
      done.qc.height +
      ' / ' +
      done.qc.frames +
      ' frames';
    video.src = '/api/artifacts/' + encodeURIComponent(done.artifactId) + '/video';
    video.addEventListener(
      'loadedmetadata',
      () => {
        // Force actual first-frame decoding for a useful paused Studio preview.
        video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
      },
      { once: true },
    );
    video.load();
    result.hidden = false;
  } catch (error) {
    phase.textContent = 'M5 · Failed';
    report('FAILED ' + (error.code || 'DIRECTOR_ERROR') + ': ' + error.message, true);
    runButton.disabled = false;
  } finally {
    busy = false;
    executing = false;
    for (const item of form.querySelectorAll('input, textarea, select')) item.disabled = false;
    planButton.disabled = false;
  }
});
