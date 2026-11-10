# Work breakdown của bản bàn giao

Mỗi mốc chỉ đóng khi có evidence. Đầu việc production P0–P11 nằm ở ../roadmap-full.md và không bị bỏ qua.

| Mốc | Work items theo thứ tự | Artifact/code | Gate |
| --- | --- | --- | --- |
| M0 | Đọc Word → claim matrix → harness → hai renderer/negative cases → findings | reports/, validation/ | Checksum gốc; unsupported không đổi thành PASS |
| M1 | D01 schema → D02 parser → D03 SHA store → D04 revisions → D05 conflict/restart tests | domain/planner/store, domain.test.ts | Input sai bị chặn; revision cũ không đổi |
| M2 | R01 evaluator → R02 styles/actions → R03 voice/WAV → R04 mixer → R05 strict compiler → R06 QC | rig/audio/render/process, integration | Frame/audio/hash sai không published |
| M3 | J01 lock/queue → J02 abort/retry → J03 restart → J04 cache → J05 review → J06 packages | application/store, workflow tests | Fake chỉ kiểm state; real cancel/cache ở integration |
| M4 | U01 API → U02 script/scenes → U03 voice/jobs → U04 playback/review → U05 packages → U06 CLI → U07 browser/mobile | server/cli/web, HTTP/UI tests | Luồng thật chạy, mobile overflow đã sửa/retest |
| M5 | V01 clean checkout → V02 verify/build → V03 integration/UI → V04 hashes → V05 docs/skills/CI/Word | artifacts/runs, docs, skills, workflow | PASS theo command thực; CI remote ghi riêng |
| M6 | H01 commit → H02 push → H03 draft PR/attach → H04 remote HEAD/checks → H05 giao review | Branch/PR, plan/changelog | Không merge; người dùng duyệt; giữ backlog production |

## Quy tắc thực thi

1. Đọc input/gate từng phase; ghi giả định vào ADR.
2. Code đường xuyên suốt, thêm negative tests cho bất biến quan trọng.
3. FAIL: giữ log/input → sửa → chạy lại ca lỗi/regression; không xóa evidence cũ.
4. Sửa docs thuần túy chỉ cần kiểm liên kết/hash; không render lại nếu compiler/input không đổi.
5. Cập nhật plan/verification/changelog, commit/push mốc; review gắn artifact/revision.

Sau duyệt, chuyển phản hồi thành issue có phase P0–P11, expected/actual, artifact/frame/gate. Chưa chốt đội/hardware production nên chưa gán lịch ngày; dùng measured effort P3/P10, không biến 12 phase thành 12 tuần.
