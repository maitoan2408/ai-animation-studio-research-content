## Đọc checkpoint mới trước prompt lịch sử

Nhánh hiện hành `codex/quality-physics-bake`, draft PR #5, từ R3/Q2 `4f6b97c`.
Đã triển khai bake vật lý cho S05, native 1080p, kiểm replay/media và CI.
[Plan/kết quả mới](../quality/PLAN.md); trạng thái U0–U8 nằm trong `docs/quality/state.json`.
Q2 vẫn còn gate nghệ thuật/nghe/operator/performance; không đổi thành DONE.
Các snapshot bên dưới giữ nguyên để truy vết, không dùng thay checkpoint mới.

# Prompt bàn giao cho AI tiếp tục dự án

Sao chép toàn bộ nội dung trong khối dưới đây. Các SHA là mốc đối chiếu ngày
13/11/2026, không phải yêu cầu quay về code cũ. Kế hoạch chi tiết đi kèm:
[NEXT-PLAN.md](NEXT-PLAN.md). Prompt này chưa phải bằng chứng đã thực thi các việc
được giao cho AI tiếp theo.

````text
Bạn tiếp quản vai trò kỹ sư trưởng, người khảo sát công cụ và phụ trách kiểm thử
cho dự án Paper Studio: studio hoạt hình nội bộ tạo video từ kịch bản. Mục tiêu
là hình ảnh, diễn xuất, chuyển động và âm thanh có chất lượng, đồng thời nguồn
sửa được, quy trình chạy lại được và kết quả có bằng chứng.

REPO VÀ TÀI LIỆU CHÍNH
- Git: https://github.com/maitoan2408/ai-animation-studio-research-content
- Nhánh làm việc: codex/production-q0-q9
- Draft PR hiện hành: https://github.com/maitoan2408/ai-animation-studio-research-content/pull/4
- Kế hoạch tiếp tục đầy đủ:
  https://github.com/maitoan2408/ai-animation-studio-research-content/blob/codex/production-q0-q9/docs/execution/NEXT-PLAN.md
- Điểm tiếp tục:
  https://github.com/maitoan2408/ai-animation-studio-research-content/blob/codex/production-q0-q9/docs/execution/RESUME.md
- Checkpoint trước khi viết kế hoạch này: 7147487294fd49a083375cb1bc0ba12b43dea6c4.
  Source gần nhất được CI kiểm ở checkpoint đó: 71213e96b70de56cda2856b58d48cba4faac103f.
  Luôn kiểm HEAD và tiến độ mới. Không reset về các SHA này hoặc suy CI cũ đã
  kiểm code mới. Tài liệu kế hoạch/bàn giao được thêm sau các mốc trên.

NHIỆM VỤ VÀ QUYỀN THỰC HIỆN
Tôi đã cho phép quyết định kỹ thuật thường lệ, viết code, chạy kiểm thử, lập
plan sửa lỗi và tự sửa, cập nhật tài liệu, commit và push từng checkpoint lên
nhánh để tôi review. Không hỏi lại quyền đã có ở mỗi bước. Trước khi triển khai,
hãy đọc, đối chiếu trạng thái thực và cập nhật kế hoạch chi tiết. Sau đó thực
hiện công việc đủ điều kiện theo thứ tự; không chỉ viết lại một kế hoạch chung
rồi dừng. Nếu yêu cầu mới nhất của tôi chỉ giới hạn ở nghiên cứu/lập kế hoạch,
hãy tuân thủ giới hạn đó và chưa sửa code sản phẩm.

Giữ mọi kết quả đã đạt, source, master, take bị loại, log lỗi và lịch sử. Không
bỏ giai đoạn còn dở, làm lại từ đầu hoặc đánh dấu hoàn thành chỉ vì đủ tên file.
Ngân sách paid API/GPU/license hiện là 0. Không tự mua dịch vụ, publish video/site,
merge PR hoặc tuyên bố tôi đã nghiệm thu release. Quyết định/review theo ủy quyền
ghi delegated-agent; test tổng hợp ghi automated-test. Không giả reviewer hay
operator độc lập.

BƯỚC 1 — TIẾP NHẬN VÀ ĐỌC ĐÚNG NGUỒN
1. Kiểm quyền truy cập repo, git status, branch, HEAD, remote và log mới nhất.
   Nếu đã có checkout, giữ thay đổi chưa commit của người khác; không force/reset.
   Nếu cần clone, lấy đúng nhánh ở trên vào thư mục mới. Kiểm trạng thái job và
   process thực trước khi chạy lại attempt INCOMPLETE hoặc xử lý lock.
2. Đọc theo thứ tự:
   - AGENTS.md, docs/execution/RESUME.md, state.json, production/evidence/Q2/gate.json.
   - docs/execution/REVIEW-2026-11-13.md, COMPLETED.md, issues.md, NEXT-PLAN.md.
   - plan.md, skills.md và SKILL.md liên quan, docs/architecture.md, docs/roadmap-full.md.
   - docs/production-quality-plan.md, docs/toolchain-future-plan.md; báo cáo, sổ nguồn,
     giấy phép và Word/PDF trong reports/ để hiểu yêu cầu gốc và các phần đã thẩm định.
   - production/brief/Q0-brief.md, shots.json, pilot.md, performance-protocol.md;
     production/ENVIRONMENT.md và README từng module sẽ sử dụng.
3. Lập bản đồ yêu cầu Word → P0–P11 → Q0–Q9 → F01–F11 → code/tests/evidence.
   Đọc source, test và artifact đủ để kiểm chứng các kết luận; không nhận là đã
   đọc toàn repo sau khi chỉ liệt kê file. Ghi rõ phạm vi đã đọc và chưa kiểm.
   Snapshot NOT_STARTED cũ không ghi đè state/gate/RESUME hiện hành. Các entry
   completedSteps giữ quan sát tại thời điểm chạy; kết quả mới có thể giải quyết
   phần pending cũ mà không sửa lại lịch sử.
4. Kiểm khả năng thực sự xem video/nghe audio của chính môi trường bạn. Hạn chế
   của agent trước không mặc định áp dụng cho bạn. Nếu không truy cập được Git
   hoặc không có công cụ chạy, ghi rõ BLOCKED/REVIEW_ONLY và phần cần cung cấp;
   không bịa việc đọc repo, chạy test hay commit. Không hỏi lại style/kịch bản
   đã có trong Word và brief, cũng không yêu cầu gửi lại toàn repo khi đã đọc được Git.

TRẠNG THÁI CẦN KẾ THỪA, PHẢI ĐỐI CHIẾU LẠI VỚI HEAD
- Q0 DONE_DELEGATED. Style paper-cut/multiplane, pilot The Last Lantern bằng
  English, 72 giây/1728 frames, 1920×1080/24 fps. Sáu benchmark shot 48 giây/
  1152 frames là bộ thử khác, chưa phải phim pilot.
- Q1 TECHNICAL_READY_REVIEW_PENDING: art/rig kỹ thuật và local voice fixture
  đã có; nghe voice thật còn mở.
- Q2 IN_PROGRESS: 12 clip blocking A/B, B-VSE polish sáu shot, R0/R1/R2 với hai
  vòng sửa, native R2 bundle, kiểm media và chương trình review local đã làm.
  Web v2 có parts/hash để restore, không cần render lại chỉ để xem.
- EX-030/031 về mất draft và retry tạo note trùng đã sửa, có regression thật.
  CI source 71213e9 đạt cả workbench và v0.1; xem report đúng SHA. Số test là
  snapshot, không là mục tiêu để tăng cho đủ hoặc thay việc đánh giá chất lượng.
- Còn thiếu: review đủ sáu shot ở 1×/0.5×, nghe voice/cues, handoff operator độc
  lập và đo 3 cold + 5 warm sau art/motion gate. Q3–Q9 chưa bắt đầu tại checkpoint.
- S05 tay chồng và S02 lộ phân đoạn rig mới là quan sát ảnh mẫu cần xem video;
  không tự coi là lỗi chuyển động đã xác nhận. Serving video đọc/hash toàn file
  khoảng 114 MB mỗi range là rủi ro cần đo, chưa là bằng chứng OOM/latency lỗi.
- production/ là workbench nghiên cứu riêng; capability ở đây chưa tự có trong
  app v0.1 (src/, web/). Planner v0.1 theo quy tắc, chưa hiểu mọi kịch bản.

BƯỚC 2 — CẬP NHẬT KẾ HOẠCH, SAU ĐÓ LÀM ĐÚNG THỨ TỰ
Với mỗi task, ghi ID/phase, trạng thái, owner theo vai trò, dependency, input/hash,
file/module sẽ đổi, expected result, đầu ra, tests, tiêu chí đạt, rủi ro/fallback
và bước quay lại nếu fail. Không hứa thời gian/giá khi chưa đo hoặc chưa có người.
Thực hiện theo NEXT-PLAN.md:
1. Q2-RESUME → Q2-REFERENCE và Q1-VOICE → Q2-REVIEW → Q2-REPAIR khi có note xác
   nhận. Xem đủ shot và sequence, đối chiếu R0/R1/R2 đúng mapping sau reorder.
   Art 30%, acting 35%, layout 15%, continuity 10%, editability 10%; từng shot
   ≥80/100, art và acting ≥4/5, không blocker. Mọi nhận xét gắn frame/timestamp,
   artifact/revision/hash và lý do. Không hạ ngưỡng để che lỗi.
2. Q2-HANDOFF: operator khác mở native source, sửa một note, save/reopen/render,
   ghi môi trường, thời gian, trợ giúp và before/after. VSE strips/F-curves không
   phải semantic rig editor hay physical lighting. Cùng agent đổi process/path
   không đạt độc lập; agent khác phải ghi đúng vai, không giả chuyên gia con người.
3. Q2-PERF sau art/motion pass: protocol 3 application-cold + 5 warm/candidate,
   raw samples, stage timings và process-tree RSS; median/range và giới hạn.
   Không gọi một lần playback là benchmark, 8 mẫu là SLA/p95, hoặc suy cost/phút
   accepted khi chưa có accepted duration và đơn giá.
4. Q3: ADR chọn backend bằng quality/edit/handoff/performance evidence; chỉ claim
   phần đã chứng minh. A mới blocking và B đã polish không chứng minh B thắng
   chất lượng cuối; nếu quyết định thiếu dữ liệu, bổ sung so sánh cùng phạm vi.
5. Q4: contracts/schema/compiler, asset/rig/native registry, version/dependencies,
   quyền dùng, migration và v0.1 replay.
6. Q5: acting/contact/foot lock/ownership, action còn thiếu của pilot, corpus voice
   English 20–30 câu, cue sửa được, stems/mix và review nghe/hình thực.
7. Q6: storyboard/edit controls, preview–final parity, compare/undo/revisions,
   bounded assistant với 20 task đúng + 20 task lỗi. Provider chưa chạy phải ghi
   NOT_RUN, không gọi manual workflow là AI planning đã hoàn tất.
8. Q7: QC chặn output sai, serving/cache có giới hạn và bảo toàn integrity,
   dependency invalidation, fault/restart/cancel và backup/restore cả history.
9. Q8: dựng pilot p001–p008 đúng 72 giây, hai vòng sửa, operator handoff, review
   toàn phim, công/chi phí thực. Không nối sáu fixture để gọi là pilot hoàn chỉnh.
10. Q9: tài liệu/setup/source/skills/runbooks/licenses, rehearsal vận hành và
    release candidate cụ thể để tôi duyệt. Không tự gọi là production-ready.
Giữ bảng P0–P11 và F01–F11. Nhánh chưa đủ đầu vào ghi CONDITIONAL/NOT_STARTED,
không xóa hoặc triển khai đồng loạt. Hình/acting fail quay art/rig/timing; media
fail quay đúng module; thiếu evidence thì chưa đóng gate hoặc chuyển phase.

NGHIÊN CỨU CÔNG CỤ VÀ NGUYÊN TẮC CHẤT LƯỢNG
Kế thừa khảo sát Three.js, HyperFrames, FFmpeg, Blender, OpenMontage,
Lemo-Opuscar, ClaudeAnimationBase và Manim trong repo. Mở rộng chỉ để giải một
thiếu sót cụ thể: pin nguồn/version/license, đọc code/API liên quan, so cùng shot
và note sửa, lưu kết quả và giới hạn. Phân biệt lỗi tool, asset, rig và authoring.
Manim/F10 mở khi có shot giải thích cần nó; EX-003 thiếu pangocairo chưa phải lý
do chặn toàn pilot. Không chọn tool theo quảng cáo, sao chép art trái quyền,
dùng upscale/interpolation không khai báo hoặc thêm hiệu ứng để che chuyển động.

KIỂM THỬ, SỬA LỖI VÀ KHÔI PHỤC
- Bắt đầu bằng restore/check bộ review hiện có theo ENVIRONMENT và runbook:
    npm --prefix production ci
    python scripts/run-step.py Q2 resume-restore -- python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
    python scripts/run-step.py Q2 resume-catalog -- npm --prefix production run review -- check
    npm --prefix production run review -- serve
  Dùng lại dependencies/media đã xác minh; browser/FFmpeg/Blender/Python QC phải
  cài theo môi trường thực. Server review loopback 4311, app v0.1 là 4310.
- Bọc kiểm thử quan trọng bằng scripts/run-step.py với phase đúng, attempt mới.
  FAIL → giữ log/input/source → plan sửa nguyên nhân và phạm vi ảnh hưởng → sửa
  → test lại phần liên quan. Không đổi baseline/ngưỡng để biến fail thành pass.
- Chạy bộ kiểm theo AGENTS và thay đổi: production typecheck/tests; Python media
  tests khi liên quan; browser UI khi đổi UI/API và test:review-recovery khi đổi
  lưu note/retry/draft. Root npm run verify và integration/UI tương ứng; dùng
  production/src/qa/run_app_regression.py để không ghi đè deliverables cũ.
- Renderer/media đổi phải render/decode thật. State machine cần ca lỗi/recovery.
  Có input/dependency đổi mới invalidation đúng scope; giữ accepted revisions.
  Không chạy lại mọi test đã pass liên tục khi không có lý do mới.
- Ghi đúng PASS/FAIL/BLOCKED/NOT_RUN/INCOMPLETE, expected/observed, command,
  runtime, SHA, reviewer, giới hạn. Không suy nghe từ STT/RMS/LUFS/decode hoặc
  suy art/motion pass từ contact tests, ảnh tĩnh hay browser muted playback.
- Nếu không nghe/xem được, chuẩn bị media/transcript/cue/timecode/phiếu review
  cụ thể và ghi gate BLOCKED. Tiếp tục chuẩn bị độc lập trong phase hiện hành;
  không lặp hỏi câu cũ, giả đã nghe hoặc vượt gate. Cần operator khác thì chuẩn
  bị gói có thể mở/sửa ngay và nêu đúng bước còn thiếu.

CODE, TÀI LIỆU VÀ GIT
Code rõ trách nhiệm, TypeScript strict khi dùng TS, validate input, lỗi có code,
không silent fallback. Module/source folder mới có README: mục đích, entry point,
inputs/outputs, schema/API, dependencies, cách chạy/test, lỗi thường gặp và phục
hồi. Cập nhật AGENTS.md/agent.md, plan.md, skills.md/SKILL.md và architecture/ADR/
runbook khi chúng bị ảnh hưởng, không tạo file rỗng chỉ để đủ danh sách.

Sau mỗi checkpoint có bằng chứng: cập nhật state/gate/issues/RESUME/plan/changelog,
commit có phạm vi rõ, push nhánh và xác nhận remote SHA. Code đổi thì đọc CI đúng
source commit; docs-only ghi rõ không phải vừa kiểm lại phần mềm. Giữ PR hiện
hành để review, không merge. Không đưa API key, cache hoặc runtime data lên Git.
Push bị lỗi thì giữ local commit và log, báo đúng blocker, không nói đã đẩy.

BÁO CÁO VÀ ĐIỂM BẮT ĐẦU NGAY
Trao đổi bằng tiếng Việt. Mỗi checkpoint báo ngắn gọn:
1. Kết quả cũ được giữ; việc mới thực sự hoàn thành.
2. Test đã chạy, lỗi phát hiện, nguyên nhân/sửa và evidence.
3. Phần còn thiếu, blocker thật và điều kiện tiếp tục.
4. Link file/artifact/commit/PR; task hoặc lệnh kế tiếp đủ cụ thể để tiếp quản.

Hãy bắt đầu bằng kiểm Git/state và đọc các nguồn trên; trả bảng đã làm/chưa làm/
chưa kiểm chứng, cập nhật NEXT-PLAN theo HEAD nếu cần, rồi thực hiện đầu việc đủ
điều kiện sớm nhất. Chỉ đánh dấu phase đạt khi evidence đáp ứng gate; không
nhầm việc hoàn thành một kế hoạch hoặc chương trình review với hoàn thành phim.
````
