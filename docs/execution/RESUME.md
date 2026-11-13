# Điểm tiếp tục hiện hành — 13/11/2026 (Asia/Saigon)

Nhánh `codex/production-q0-q9`; draft PR4. Người dùng đã ủy quyền code, kiểm thử,
sửa lỗi, chọn hướng triển khai và push từng bước. Không hỏi lại quyền thường lệ.
Không giả người dùng đã xem/nghe hoặc có operator độc lập. Ngân sách dịch vụ trả phí0.
Nguồn trạng thái máy đọc: [state.json](state.json); [gate Q2](../../production/evidence/Q2/gate.json).

## Review bổ sung — 13/11/2026

[Bản review đầy đủ](REVIEW-2026-11-13.md) đối chiếu code, evidence, bốn mẫu hình
và các phase. Phát hiện và sửa EX-030 mất draft khi response cũ về, EX-031 retry
sau mất response/refresh tạo note trùng. Before FAIL giữ nguyên; sau sửa3ca
recovery mới,13ca UI cũ,19tests/typecheck production và root verify16 PASS.
[Bằng chứng](../../production/artifacts/Q2/review-followup-20261113/README.md).
Hai workflow CI trên source71213e9 đã SUCCESS, gồm3ca recovery và standalone
Git-only. [CI evidence](../../production/artifacts/Q2/review-followup-20261113/ci-workflows.json).
Audit210completed attempts/162source ZIP PASS integrity. Các commit chốt sau
source71213e9 chỉ bổ sung tài liệu/evidence; không thay runtime code.

## Đã hoàn thành và phải giữ

- Q0 DONE_DELEGATED: brief The Last Lantern, paper-cut/multiplane, pilot72s và
  benchmark sáu shot48s, rubric/source references. App v0.1 vẫn nguyên source.
- Q1 technical ready:64 SVG gốc, rig/contact và local voice fixture. Polish thêm
  thành117 assets riêng; giữ các phiên bản bị từ chối. Nghe voice chưa duyệt.
- Q2.1 readiness/seek:6 ca load,48 captures/36 comparisons. Media v2 đã đạt hợp
  đồng kỹ thuật có giới hạn ở Chromium tham chiếu, không suy mọi màn hình/player.
- Q2.2–4:12 blocking clip A/B native1080p; B polish sáu shot; sửa S02 hết excess
  crouch; R1 chỉS01/S03, R2 chỉS04/S05+reorder. Ba sequence1152frames, âm lượng
  −16.02LUFS/TP≤−1.93, AAC lag0. Master BT709 giữ nguyên.
- Native R2 ZIP SHA c592c64af73f1f11792a92de2893d287b211babd7648d129944777e72c55639a:
  70file hashes,6replay frames exact và native camera note sửa/reopen được.
  Đây là cùng agent, không là independent handoff.
- V1 web chart FAIL giữ nguyên. V2 lấy PNG native→sRGB full-rangeYUV420→CRF0:
  chart max1 dưới ngưỡng3/inset2; ba bản đều1152decodedYUV exact, AAC/master/source
  không đổi. MAE mẫu ảnh thật R0/R1/R2=0.504/0.657/0.662, P95=1/2/2. R2 khi máy
  không encode đồng thời:48.042s,0dropped. R0/R1 đo cùng encoder rơi5/19frames;
  không dùng làm benchmark công bằng hoặc cam kết máy khác.
- Công cụ review local đã chạy: CLI, HTTP/UI, seek/step, notes theo SHA/revision/
  shot/frame, journal bất biến, conflict/idempotency/export/restart.19 workbench
  tests,16Python tests,13 browser checks trên media v2 PASS. Test authors=automated-test.
- Root v0.1 verify16, build, integration13, UI9 PASS trong thư mục tách biệt;
  deliverable cũ hash-identical. CI workbench mới có contracts, restore, chart và UI.
- Clean Git-only reproduction commit065a02c PASS: checkout ngoài cây repo,
  cache/npm install mới, restore3video, typecheck,19tests và13browser checks.
  EX-028 lock layout đã sửa mà không đổi dependency tarball. Xem
  [report](../../production/artifacts/Q2/fresh-review-20261113/README.md) và
  [QA runbook](../../production/src/qa/README.md). Đây vẫn là cùng máy/agent.

Ở checkpoint trước review bổ sung, CI workbench/v0.1 trên source headd82da6e đã SUCCESS, gồm
standalone Git-only; xem [job/step evidence](../../production/artifacts/Q2/ci-standalone-repaired-20261113.json).
Sau đó cb4e084 chỉ tổng kết; đợt review bổ sung hiện tại có sửa UI như mục trên.
CI được bổ sung ca standalone Git-only để bắt đúng lỗi EX-028 trong các lần sau;
kết quả của workflow mở rộng được ghi riêng, không suy từ CI trước thay đổi.
Lần mở rộng đầu run43328442441 FAIL tại ownership Git (EX-029), các bước trước
đó PASS. Fix chỉ trust đúng ROOT ở từng lệnh đã PASS local full-flow với giả lập
khác owner (ac207c43) và actual CI43329136529; EX-029 CLOSED.
[Report standalone từ runner CI](../../production/artifacts/Q2/fresh-review-20261113/ci-standalone-report.json).

## Mở chương trình đã làm

Từ repo root (Node24, FFprobe/FFmpeg và Chromium theo ENVIRONMENT):

```bash
npm --prefix production ci
python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
npm --prefix production run review -- check
npm --prefix production run review -- serve
```

Mở URL loopback được in ra. [Runbook/API/storage](../../production/src/review/README.md),
[media/metrics](../../production/artifacts/Q2/web-review-v2/README.md),
[ảnh UI và kết quả test](../../production/artifacts/Q2/review-workbench-v2/report.json).
Các MP4 lớn được ghép từ parts≤32MiB có SHA; file ghép được gitignore. Không render
lại native shots để mở review. Đọc result.json trước khi chạy lại job cũ.

## Phần tiếp theo — đúng thứ tự, chưa được đánh dấu hoàn thành

1. Q1/Q2: nghe voice thật và review chuyển động đầy đủ1×/0.5× từng shot, ghi
   timestamp/rubric/lý do đúng reviewer. UI hỗ trợ lưu nhưng không tự duyệt.
   Tool của agent chưa hỗ trợ nghe; câu hỏi voice cũ chưa có phản hồi, không gửi
   lặp hoặc suy PCM/loudness thành đã nghe. Nếu art/acting fail, quay Q1 sửa đúng
   shot/asset, tạo revision mới, giữ các take/review cũ.
2. Q2.4: operator khác mở native bundle và sửa một note; ghi thời gian/lỗi và
   hash trước/sau. Same-agent process mới hoặc test UI không đóng điều kiện này.
3. Q2.5: sau art/motion pass, chạy3cold+5warm theo performance-protocol.md. Không
   lấy tổng elapsed của jobs song song làm CPU-hours, chi phí/phút accepted hoặc SLA.
4. Q3: ADR backend dựa trên đủ evidence, capability/error matrix, giới hạn và ngân
   sách Q4–Q9. Q3 hiện NOT_STARTED, không chọn từ một test xanh.
5. Q4 contracts/registry → Q5 motions/cues/voice/stems → Q6 editing/review/preview
   parity → Q7 QC/cache/recovery → Q8 pilot72s → Q9 release/operator acceptance.
   Tất cả vẫn NOT_STARTED; chương trình nghiên cứu Q2 không thay các phase này.

[Toàn bộ kế hoạch](../toolchain-future-plan.md); [issues](issues.md). EX-002 production
QC, EX-004 preview parity, EX-005 cache/recovery, EX-011 listening và EX-013 fair
performance còn mở. Manim/EX-003 chỉ mở khi pilot có shot giải thích tương ứng.

## Phục hồi khi gián đoạn

Request/source ZIP được ghi trước process; không có result=INCOMPLETE, không tự
coi PASS. Kiểm process thật trước rerun; attempt mới luôn có thư mục mới. Các
bằng chứng fail không chỉnh hoặc xóa. Journal có .writer.lock: chỉ chuyển lock
ra ngoài sau khi xác nhận process chủ đã dừng, theo runbook; không lấy lock live.
Mỗi checkpoint cập nhật state/plan/docs/log, commit và push; không tự merge PR.
Lịch sử các checkpoint được giữ tại [RESUME cũ](history/RESUME-through-2026-11-12.md)
và [tổng kết cũ](history/COMPLETED-through-2026-11-12.md); văn bản này thay next steps cũ.
