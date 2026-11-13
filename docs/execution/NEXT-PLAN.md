# Kế hoạch tiếp tục từ Q2 đến release nội bộ

Ngày lập: 13/11/2026, Asia/Saigon. Đây là **kế hoạch chưa thực thi**, cập nhật sau
[review](REVIEW-2026-11-13.md), không phải bằng chứng hoàn thành phase mới.

- Repo: https://github.com/maitoan2408/ai-animation-studio-research-content
- Nhánh: `codex/production-q0-q9`; [draft PR4](https://github.com/maitoan2408/ai-animation-studio-research-content/pull/4).
- Checkpoint đối chiếu: `7147487294fd49a083375cb1bc0ba12b43dea6c4`.
  Source gần nhất được CI kiểm: `71213e96b70de56cda2856b58d48cba4faac103f`.
  Luôn đọc HEAD hiện tại; không reset về các mốc này nếu nhánh có tiến độ mới.
- Trạng thái có thẩm quyền: [state.json](state.json), [gate Q2](../../production/evidence/Q2/gate.json),
  [RESUME](RESUME.md), [issues](issues.md). Các bảng NOT_STARTED trong tài liệu
  nghiên cứu ngày 11/11 là snapshot lịch sử, không ghi đè trạng thái mới.
- [Prompt bàn giao](AI-HANDOFF-PROMPT.md) dùng kế hoạch này làm đầu việc thực hiện.

## 1. Đích đến và những kết quả phải giữ

Đích đến là studio nội bộ tạo hoạt hình từ kịch bản, có nguồn sửa được, kiểm thử,
review và phục hồi. Style đầu là paper-cut/multiplane. Pilot đã chọn là **The Last
Lantern**, English, 72 giây/1728 frames, 1920×1080/24 fps; đọc [pilot](../../production/brief/pilot.md).
Benchmark sáu shot 48 giây/1152 frames là bộ thử riêng, không thay pilot.
Tiêu chí gốc đã khóa ở [Q0 brief](../../production/brief/Q0-brief.md); dùng cùng
rubric và profile khi tiếp tục, thay đổi phải có revision và lý do.

| Đã có | Cách kế thừa |
| --- | --- |
| App v0.1 từ script đến review/export; pilot kỹ thuật 13 giây | Giữ baseline và replay; chỉ mở rộng có migration/regression khi đến phase tương ứng. Planner hiện theo quy tắc, chưa là AI hiểu kịch bản tổng quát. |
| Q0 DONE_DELEGATED; 64 SVG gốc và pack polish 117 assets riêng | Giữ brief, source/version/hash, các take bị loại; không thiết kế lại từ đầu. |
| 12 blocking clip A/B; sáu shot polish; R0/R1/R2 và hai vòng sửa | Dùng làm input review; sửa đúng dependency ảnh hưởng, không render lại toàn bộ để có log mới. |
| Media v2 đạt kiểm màu trên Chromium tham chiếu; AAC/timing/master được kiểm | Giữ master BT.709 và web derivative riêng. CRF0 bảo toàn YUV sau chuyển 4:2:0, không phải lossless RGB hay mọi player đều đúng màu. |
| Native R2 ZIP, 70 dependency hashes, 6 replay frames và edit/reopen | Tái sử dụng package; bằng chứng hiện là cùng agent, chưa là operator độc lập. |
| Workbench review, 19 tests, 16 Python tests, 13 browser checks + 3 recovery cases | Giữ regression EX-030/031 về mất draft và retry trùng; không làm lại các lỗi đã đóng. |
| CI và tái lập Git-only đã PASS; audit 210 attempts/162 source ZIP tại checkpoint | Dùng CI đúng source SHA. Counts là snapshot; không nhận kết quả cũ là vừa chạy mới. |

Không tạo lại kết quả đã đạt nếu không có thay đổi đầu vào, lỗi mới hoặc môi trường
mới cần chứng minh. Giữ mọi failure và lịch sử; thay đổi mới phải có revision mới.

## 2. Danh sách thiếu sót và thứ tự ưu tiên

| Mức | Thiếu/chưa hoàn tất | Phân loại | Đầu việc xử lý |
| --- | --- | --- | --- |
| Ưu tiên 1 | Chưa có review đủ sáu shot ở 1×/0.5×, rubric và timestamp | Gate chất lượng chưa có bằng chứng | Q2-REFERENCE, Q2-REVIEW |
| Ưu tiên 1 | Chưa nghe duyệt voice/prosody/cue; EX-011 | Gate cảm nhận còn mở | Q1-VOICE, sau đó corpus Q5 |
| Ưu tiên 1 | S05 tay chồng khó đọc; S02 lộ phân đoạn rig trong mẫu ảnh | Quan sát cần kiểm video, **chưa kết luận là lỗi chuyển động** | Q2-REVIEW; Q2-REPAIR nếu xác nhận |
| Ưu tiên 2 | Chưa có operator khác mở native source và sửa note | Gate handoff chưa chạy | Q2-HANDOFF |
| Ưu tiên 2 | Chưa đo 3 cold + 5 warm trên đầu vào đạt art/motion; EX-013 | Gate capacity chưa chạy | Q2-PERF |
| Ưu tiên 3 | Chưa chọn backend production bằng ADR/capability matrix | Q3 chưa bắt đầu | Q3-ADR |
| Ưu tiên 3 | Registry, acting/audio, editing/parity, QC/cache/recovery chưa tích hợp production | Q4–Q7 chưa bắt đầu; EX-002/004/005 | Q4–Q7 theo thứ tự |
| Ưu tiên 3 | Server review đọc/hash toàn video khoảng 114 MB trước từng range request | Rủi ro có căn cứ code, **chưa đo thành lỗi tải/OOM** | Thiết kế Q3; đo và sửa Q6/Q7 |
| Ưu tiên 4 | Chưa có pilot 72 giây accepted, số liệu công/chi phí và release rehearsal | Q8–Q9 chưa bắt đầu | Q8–Q9 |
| Có điều kiện | Manim thiếu pangocairo/EX-003 và các nhánh F01–F11 | Không là blocker của pilot hiện tại nếu không có nhu cầu tương ứng | Mục 8; không bỏ nhưng không mở đồng loạt |

EX-030/031 đã sửa, không đưa lại vào danh sách lỗi chưa sửa. Chỉ mở lại với một
ca tái hiện mới. Không coi tăng số tests là thay cho tiến bộ về hình/chuyển động.

## 3. Quy trình chung cho từng đầu việc

1. Ghi task ID, phase, source/artifact/input SHA, owner theo vai trò, expected
   result, phép đo và phạm vi ảnh hưởng **trước khi chạy**.
2. Làm một thay đổi có thể review; checkpoint đủ nhỏ để tiếp tục sau gián đoạn.
   Dùng `scripts/run-step.py`, attempt mới, log/result/source snapshot riêng.
3. Nếu FAIL: giữ nguyên bằng chứng → xác định nguyên nhân → viết plan sửa gồm
   affected files/shots và regression → sửa → chạy lại phần liên quan.
4. Cập nhật state/gate/issues/RESUME/plan/changelog khi có bằng chứng; commit và
   push nhánh; xác nhận remote SHA. Nếu push lỗi, giữ local commit và ghi chính
   xác lỗi truy cập, không báo đã đồng bộ.
5. Khi code đổi, kiểm CI trên đúng source commit. Commit chỉ tổng kết sau đó
   phải ghi rõ không thay runtime; không dùng CI của code cũ cho code mới.

Review AI ghi `delegated-agent`; synthetic tests ghi `automated-test`. Ghi PASS,
FAIL, BLOCKED hoặc NOT_RUN đúng sự kiện. Một checkbox, file tồn tại hoặc exit 0
không chứng minh đã nghe, xem đầy đủ, được người dùng duyệt hay handoff độc lập.

Các đường dẫn **đề xuất** bên dưới chưa tồn tại cho tới khi công việc được làm;
không tạo report PASS rỗng để lấp checklist. Thời gian chỉ được ước lượng sau
mẫu thực đo; hiện chưa đủ nhân sự/hardware/accepted duration để hứa số tuần hoặc
giá/phút. Vai trò không có nghĩa là đã có người đảm nhiệm.

## 4. Hoàn tất phần còn dở của Q1/Q2

### Q2-RESUME — tiếp nhận repo và mở đúng bộ review

**Phụ thuộc:** quyền đọc Git và môi trường chạy local. **Owner:** kỹ sư/AI thực hiện.

- Đọc AGENTS → RESUME/state/gate → review/COMPLETED/issues → kế hoạch này →
  các kế hoạch P/Q/F và module liên quan. Kiểm git status/HEAD/branch/remote;
  giữ thay đổi của người dùng và kiểm process thật trước khi chạy lại attempt.
- Kiểm runtime theo [ENVIRONMENT](../../production/ENVIRONMENT.md). Máy trước
  chỉ 2 CPU/8 GiB, software graphics; không mặc định máy mới có GPU giống nhau.
- Nếu dependency/media đã đúng thì dùng lại. Nếu checkout mới: `npm --prefix
  production ci`, restore media, kiểm catalog. Không render 1152 frames chỉ để mở video.

```bash
python scripts/run-step.py Q2 resume-restore -- python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
python scripts/run-step.py Q2 resume-catalog -- npm --prefix production run review -- check
npm --prefix production run review -- serve
```

**Đầu ra:** manifest tiếp nhận gồm HEAD/runtime/quyền/capabilities, đường dẫn
review và các gate còn thiếu. **Đạt khi:** ba bản mở đúng SHA/profile; biết rõ
khả năng thực sự xem video/nghe audio của môi trường mới. Không mặc định hạn chế
audio của phiên trước còn áp dụng cho mọi AI mới.

### Q2-REFERENCE — làm chuẩn chuyển động đủ cụ thể để chấm

**Phụ thuộc:** Q0 đã khóa, Q2-RESUME. **Owner:** người/AI review hình và animator.

- Giữ style/brief hiện tại; chọn video tham chiếu có URL, timestamp, provenance
  cho các nhu cầu thực: bước/dừng, trọng lượng khi cầm/đặt, handoff, face/reaction,
  camera/depth. Chỉ dùng làm tham chiếu; không lấy tài sản của tác giả vào phim.
- Mô tả điều cần đạt và lỗi chặn ở từng beat; so với blocking nội bộ nhưng không
  dùng chính blocking làm chuẩn duy nhất cho “production đẹp”.
- Khóa lại cách xem/player/màn hình và rubric đã có; không hạ ngưỡng sau khi xem.

**Đầu ra đề xuất:** `production/brief/motion-reference-register-v2.md`, review
checklist sáu shot. **Đạt khi:** mỗi tiêu chí review truy được tới beat/reference
và lý do; nếu cần đổi brief thì có revision riêng và ảnh hưởng A/B được chỉ rõ.

### Q1-VOICE — đóng phần nghe còn thiếu

**Phụ thuộc:** audio thực của R0/R1/R2; có người hoặc công cụ thực sự nghe được.
**Owner:** reviewer nghe English, animator kiểm cue, kỹ sư kiểm transport.

- Nghe WAV gốc và normalized delivery, so lời thật với transcript; kiểm phát âm,
  prosody, ngắt câu, âm cuối và cue dễ nhận. Ưu tiên câu dài R1/S01; không chỉ nghe
  một fixture ngắn rồi suy cho cả pilot.
- Tách số đo LUFS/true peak/lag khỏi nhận xét nghe. Không suy natural speech từ
  RMS, PCM correlation, STT đúng chữ hoặc file decode thành công.
- Nếu đổi voice/cue: revision mới, hash transcript/audio, kiểm overflow và mọi
  shot phụ thuộc; không cắt hay tăng tốc âm thầm để vừa slot.

**Đầu ra đề xuất:** review nghe theo artifact/timestamp trong
`production/artifacts/Q2/voice-review-<revision>/`; file xuất từ journal nếu dùng UI.
**Đạt khi:** reviewer thực đã nghe, có reason/issue cho từng câu; kỹ thuật giữ
target −16 LUFS ±1 LU, TP ≤−1 dBTP, transport ≤1 frame. Cue dễ nhận giữ ngưỡng
±2 frames theo Q0; không tự tuyên bố forced alignment chính xác.

**Nếu không nghe được:** ghi BLOCKED, chuẩn bị WAV/transcript/timecode/phiếu nhận
xét sẵn; không lặp hỏi nội dung đã có trong Word. Tiếp tục công việc độc lập có
thể làm trong Q2, nhưng không đóng gate nghe bằng test kỹ thuật.

### Q2-REVIEW — đánh giá đủ sáu shot, không chỉ ảnh mẫu

**Phụ thuộc:** Q2-REFERENCE; speech acceptance còn phụ thuộc Q1-VOICE.
**Owner:** reviewer hình/acting; mọi vai trò ghi đúng người/agent thực hiện.

Xem đủ mỗi shot ở 1× và 0.5×, sau đó xem cả sequence để kiểm nhịp/cut. Dùng bộ web
v2 đúng profile; đối chiếu R0/R1/R2 ở chỗ đã sửa. Mapping R2 bị reorder:

| Shot | Khoảng R2 | Cần đánh giá |
| --- | --- | --- |
| S01 | 16–24 s | Eye-line, đổi cảm xúc, câu thoại dài, mouth cue và hold |
| S02 | 8–16 s | Pha trụ/swing, chuyển trọng lượng, giảm tốc, quay, silhouette; mẫu rig lộ chưa tự là FAIL |
| S03 | 24–34 s | Reach/grip/lift/hold/place/release, tay/cốc đọc rõ, đặt lên support trước nhả |
| S04 | 0–8 s | Depth, occlusion, overscan, nhịp camera, shadow và màu trên player |
| S05 | 40–48 s | Hai tay có đọc riêng được trong beat local 72–107, owner switch, eye-line, reaction trễ 12 frames |
| S06 | 34–40 s | Anticipation, pose cực trị, tay tách mặt, recover/settle |

**Record bắt buộc:** artifact/master SHA, revision, shot, frame/local time, mức
độ lỗi, lý do, hành động sửa, người review và những gì thực đã xem/nghe. Rubric:
art 30%, acting 35%, layout 15%, continuity 10%, editability 10%; mỗi shot ≥80/100,
art và acting ≥4/5, không blocker. Chưa đủ quan sát thì note/needs-changes,
không tự điền accepted.

**Đầu ra đề xuất:** `production/artifacts/Q2/creative-review-<revision>/` có
journal export, bảng sáu shot và danh sách issue. **Đạt khi:** đủ evidence toàn
shot và sequence, reviewer có thể chỉ ra vì sao đạt; dữ liệu automated-test không
tham gia quyết định. Review delegated vẫn khác user/final release approval.

### Q2-REPAIR — sửa theo review, giữ phần đã đạt

**Phụ thuộc:** note được xác nhận ở Q2-REVIEW/Q1-VOICE. **Owner:** animator/kỹ sư.

- Chọn từng lỗi và khóa expected before/after. Với S05, thử staging/hand variant
  nếu silhouette thực khó đọc; với S02, chỉ sửa rig/pose khi video xác nhận lỗi,
  giữ ngôn ngữ paper-cut của brief.
- Lập tập shot/asset/cue bị ảnh hưởng trước sửa. Shared asset/rig đổi có thể ảnh
  hưởng nhiều shot; không hứa “chỉ một shot” nếu dependency không cho phép.
- Tạo R3 hoặc revision mới phù hợp; giữ R0/R1/R2, package gốc và source ZIP.
  Dùng [scene](../../production/src/scene/README.md), [art](../../production/src/art/README.md),
  [editorial](../../production/src/editorial/README.md), [media](../../production/src/media/README.md)
  và [Blender](../../production/src/blender/README.md) đã có.
- Render native các take cần đổi, ghép sequence từ selection có hash; kiểm đủ
  frame/timing/contact/audio/color theo thay đổi. Xuất derivative và catalog mới
  sau QC; không kế thừa approval sang artifact khác.

**Đầu ra:** sửa nhỏ + before/after + affected-set/diff + tests + review lại đúng
shot và continuity liên quan. **Đạt khi:** lỗi đã xác nhận hết, không phá phần
không liên quan; nếu fail, quay về nguồn art/rig/timing gây lỗi, không nới ngưỡng.
R1/R2 đã làm là evidence hợp lệ, không lặp hai vòng đó chỉ để tăng số lần sửa.

### Q2-HANDOFF — một operator khác thực sự mở và sửa source

**Phụ thuộc:** bundle của revision chọn, manifest và runbook. **Owner:** operator
khác với người/agent dựng; kỹ sư chuẩn bị gói và hỗ trợ có log.

- Kiểm package hiện có trước khi tạo mới. Native hiện là Blender VSE image
  strips/F-curves, không tự nhận semantic rig UI, physical lighting hoặc free 3D.
- Gói rõ texture, project, source frame JSON, voice/stems liên quan và link/hash;
  voice không mặc định được nhúng trong các strips. Không phụ thuộc cache/home
  path của máy dựng cũ.
- Operator ghi danh tính/vai trò/môi trường, tự giải nén/mở, sửa một note cụ thể,
  save/reopen, render phần bị ảnh hưởng, đo thời gian và báo mọi trợ giúp/lỗi.

**Đầu ra đề xuất:** `production/artifacts/Q2/operator-handoff-<attempt>/` có
before/after hashes, note, commands, media và log thực. **Đạt khi:** nguồn mở/sửa
được, đúng nội dung, hỗ trợ cần thiết công khai. Cùng AI chạy process mới không
đạt independent gate. AI mới tái tạo có thể ghi là “agent khác”; không tự đổi
định nghĩa gate thành “người độc lập” hoặc tạo reviewer giả để đóng.

### Q2-PERF — đo có điều kiện sau chất lượng

**Phụ thuộc:** các shot của candidate có art/motion pass; khóa scope/máy/runtime.
**Owner:** kỹ sư/QA. Tuân thủ [protocol](../../production/brief/performance-protocol.md).

- Mỗi candidate hợp lệ: 3 application-cold + 5 warm, chạy riêng từng sample;
  khai rõ app cache, warm render thực hay frame reuse, không xóa OS cache host chung.
- Đo load/conversion/capture/encode/QC, peak RSS cả process tree, disk/output size,
  lỗi/retry. GPU chỉ ghi nếu có thiết bị/công cụ đo thật. Giữ 8 raw samples,
  median/range; không suy SLA/p95 từ 8 mẫu hoặc CPU-hours từ elapsed job song song.
- Mọi sample phải qua decode/profile/integrity. Giữ lý do loại nhánh không đạt
  art; không ép polish cả hai vô hạn nếu một nhánh đáp ứng đủ gate.

**Đầu ra đề xuất:** `production/artifacts/Q2/performance-<revision>/` gồm raw
measurements, môi trường và summary. **Đạt khi:** đủ mẫu hợp lệ, so cùng brief,
giới hạn công bố. Chưa có duration được duyệt/đơn giá thì cost per accepted minute
là chưa xác định. Không dùng playback R2 một lần làm bộ đo này.

## 5. Q3–Q9: việc thực thi sau khi đủ điều kiện

### Q3 — ADR backend và phạm vi sản phẩm

**Vào khi:** Q2 có đủ quality/edit/handoff/performance evidence cần cho lựa chọn.
**Owner:** kỹ sư + reviewer nội dung/hình; quyết định thường lệ theo ủy quyền,
ghi `delegated-agent`, không tự giả user đã nghiệm thu phim.

1. So A Three/HyperFrames và B Blender theo chất lượng trước, rồi khả năng sửa,
   công vận hành, tài nguyên, license và tái lập; tách lỗi tool/asset/authoring.
   B đã polish/sửa hai vòng, A mới có blocking: chưa đủ để tuyên bố B thắng A về
   chất lượng cuối. Nếu dữ liệu chưa đủ quyết định, bổ sung cùng phạm vi cho A;
   không đánh FAIL một nhánh chưa thử hoặc che bất cân xứng mức đầu tư.
2. Viết ADR có chọn/loại/giới hạn/fallback; FFmpeg tiếp tục vai trò media/mix/QC.
   Không biến một repo tham khảo hoặc video quảng cáo thành bằng chứng backend.
3. Khóa capability/error matrix và phạm vi Q4–Q9, đường replay v0.1, môi trường
   vận hành và ngân sách. Đưa serving khoảng 114 MB/request vào thiết kế Q6/Q7.
4. Bổ sung khảo sát công cụ chỉ khi giải quyết blocker cụ thể, pin version/license
   và benchmark cùng brief. Nghiên cứu Three.js/HyperFrames/FFmpeg/Blender,
   OpenMontage/Lemo-Opuscar/ClaudeAnimationBase đã có trong reports; không khảo sát
   lại tất cả từ đầu. Manim thuộc F10 có điều kiện.

**Đầu ra đề xuất:** ADR mới trong `docs/adr/`, capability/error matrix, backlog
và estimate có giả định. **Đạt khi:** mỗi claim supported truy được tới evidence,
không che gate thiếu bằng một ADR. Chưa đủ dữ liệu thì giữ Q3 chưa hoàn tất.

### Q4 — contracts, registry và migration

**Phụ thuộc:** Q3 chọn scope/backend. **Owner:** kỹ sư dữ liệu/render, QA.

1. Chốt schema/version, IDs, frame intervals, transform order/units, view/camera,
   anchors/contact, color/alpha và capability refusal bằng shot đã kiểm.
2. Ingest image/rig/native assets: source/rights/hash/dependencies, immutable
   revisions, draft/approved; kiểm decode/bounds/anchor trước publish.
3. Dependency graph xác định shot stale; approval không tự truyền sang asset mới.
   Chỉ biểu diễn feature đã chứng minh; native source giữ các constraint IR chưa có.
4. Migration/export/import/replay có fixture v0.1, schema cũ được migrate đúng
   hoặc từ chối rõ kèm đường replay; không ghi đè history/accepted work.

**Đầu ra:** code registry/contracts/compiler, schema/API docs, fixtures/migration.
**Gate:** positive/negative tests cho missing/hash/cycle/unsafe path/invalid
anchor/range/unsupported; round-trip đúng dependency/version; source sửa lại được.
**Fail:** sửa Q4 hoặc thu hẹp ADR Q3 có lý do, giữ data/schema cũ chạy được.

### Q5 — acting, voice, cue và stems trong sản phẩm

**Phụ thuộc:** Q4 và motions/art đã đạt Q2. **Owner:** animator, sound, kỹ sư.

1. Đưa phases anticipate/reach/grip/lift/hold/place/release, foot lock, owner switch,
   gaze/reaction/settle và pose replacement vào contracts sản phẩm; kiểm world/screen.
2. Corpus 20–30 câu English đầu tiên có chậm/nhanh/silence/cảm thán/âm cuối;
   transcript/audio/cues có hash, sửa cue thủ công được, review phát âm/prosody thật.
3. Tách dialogue/music/ambience/SFX và mix có channel/gain/profile; không suy sparse
   benchmark loudness thành full pilot mix đạt. Ngôn ngữ khác mở F06 riêng.
4. Dựng lại sáu shot bằng pipeline sản phẩm trong scope Q3; chuẩn bị action còn
   thiếu của pilot như phối hợp sửa đèn, trạng thái dark/lit và mang đèn đi.

**Đầu ra:** action/cue library hữu hạn, cue editor/control cần thiết, stems, clips
và review. **Gate:** contact ≤2 px tại 1080p trong interval đã khóa, không stretch
che rig lỗi; transport ≤1 frame; cue nhận biết theo ngưỡng đã duyệt; hình/voice được
review đủ. **Fail:** Q1 drawing/rig hoặc blocking/cue Q5, không thêm effect để che.

### Q6 — workflow sửa và trợ lý theo nhiệm vụ hữu hạn

**Phụ thuộc:** Q4/Q5. **Owner:** kỹ sư UI/API, editor, QA.

1. Storyboard/animatic, controls pose/camera/cue/duration/reorder theo note thực;
   undo/revisions/rollback. Reuse workbench Q2 có chủ đích, không gọi prototype
   nghiên cứu là Q6 đã tích hợp xong.
2. Preview và final dùng cùng evaluator/cues; kiểm parity các frame được review,
   kể cả mouth/audio. Đóng EX-004 bằng evidence, không chỉ cùng tên scene.
3. Compare/review đúng artifact/frame, hiển thị stale dependency; giữ EX-030/031
   và các test conflict/uncertain-save/draft mới khi tích hợp.
4. Trợ lý: tool schema, expectedRevision, bounded patch, capability refusal,
   trace/usage; corpus 20 task đúng + 20 task lỗi, đánh giá cả nội dung thực.
   Provider chưa có ngân sách/credential thì phần đó NOT_RUN; tiếp tục manual
   workflow đã có, không tuyên bố P8/AI planning hoàn tất. Scope release phải ghi rõ.

**Đầu ra:** UI/API/skills contracts, eval corpus/traces, recordings thao tác.
**Gate:** sửa thoại/asset/pose/camera/reorder/rollback không mất phần không liên
quan; negative conflict/cancel/unsupported/injection và browser recovery PASS;
review nội dung thật. **Fail:** quay Q4/Q5/UX đúng nguyên nhân.

### Q7 — QC production, serving/cache và recovery

**Phụ thuộc:** Q3 backend, Q4 dependency graph, Q5 stems, Q6 edit workflow.
**Owner:** kỹ sư hệ thống/media, QA, operator.

1. Đưa contracts màu/alpha/audio/frame/decode từ Q2 vào production QC; EX-002
   chỉ đóng khi đường publish sản phẩm chặn negatives thật. Giữ master/preview/
   derivative profiles riêng, kiểm pixels thay vì chỉ tags; intentional hold/black có lý do.
2. Thiết kế bounded serving/cache cho video lớn: đo seek/range, memory và nhiều
   cửa sổ trên workload đã khóa; chọn verified snapshot/stream/cache phù hợp.
   Trước mỗi thay đổi giữ acceptance về integrity. Không bỏ SHA hoặc tin size/mtime
   đơn thuần để che chi phí; giữ test changed-after-start và corrupted content.
3. Shot/stem cache có fingerprint đầy đủ asset/rig/compiler/backend/color/profile/
   environment; explain invalidation; không render lại hình khi chỉ gain music đổi
   nếu contract cho phép. Đóng EX-005 bằng fault/restore evidence.
4. Fault matrix load/capture/encode/QC/publish: cancel/duplicate/restart/SIGKILL,
   corrupt cache, I/O error/disk-full trong sandbox giới hạn, context loss. Không
   publish partial; không làm đầy disk host hoặc phá journal thật để thử.
5. Backup/restore toàn history vào data directory mới; đối chiếu hashes và mở/sửa
   dự án. Đo RPO/RTO/retention/quota trước đưa cam kết; external journal head cần
   được giữ để phát hiện mất suffix, không tự nhận hash chain là chữ ký danh tính.

**Đầu ra:** production QC/cache/serving/recovery code, reports và runbook rehearsal.
**Gate:** positives/negatives và fault recovery đúng; history/source nguyên vẹn;
không silent fallback hoặc cache stale. **Fail:** quay nguyên nhân Q4–Q7; không mở Q8.

### Q8 — pilot 72 giây kể chuyện thật và hai vòng sửa

**Phụ thuộc:** Q5–Q7 đạt trong scope. **Owner:** producer/editor, animator/sound, QA.

1. Thực hiện p001–p008 của [pilot](../../production/brief/pilot.md): storyboard →
   animatic → blocking → animation → composite → mix → review. Không nối nguyên
   sáu fixture để nhận là pilot. Đèn dark ở p001–p005, sáng từ p006, hướng đi và
   identity/prop continuity phải đúng.
2. Làm hai vòng sửa đã định trong pilot, có before/after/scope/giờ thực và take bị
   loại. Mỗi thay đổi timing phải ghi ảnh hưởng downstream; không cắt voice âm thầm.
3. Operator khác mở package, sửa note và render; review toàn phim, không chỉ shot
   riêng. Có corpus kịch bản/tác vụ ngoài benchmark trong scope để không suy khả
   năng studio tổng quát từ một fixture được author sẵn.
4. Tổng hợp công theo vai, compute/license/storage/retry và duration được duyệt;
   chỉ tính giá/phút accepted khi mẫu số và đơn giá có căn cứ.

**Đầu ra:** phim/master/delivery, source/stems/history, review, timesheets/cost
và limits. **Gate:** phim được người dùng/producer nghiệm thu, không blocker,
source sửa lại được; công bố phần nào do delegated-agent review tạm thời.
**Fail:** art/acting/continuity quay Q1/Q5/Q6; media/vận hành quay Q7, giữ bản trước.

### Q9 — release nội bộ và khả năng tiếp quản

**Phụ thuộc:** Q8 accepted và scope vận hành rõ. **Owner:** operator/kỹ sư/QA, người dùng duyệt release.

1. Hoàn thiện README/setup, capabilities/unsupported, ADR/architecture/schema/API,
   AGENTS.md, plan.md, skills.md/SKILL.md, error/recovery/backup/upgrade runbooks,
   license/BOM, sample project và changelog. Không ghi feature chưa có vào docs.
2. Chạy một operator khác create → edit → render → review → export → restore →
   sửa lại, trên môi trường vận hành. Kiểm quyền truy cập, retention/quota và upgrade/rollback.
3. Báo open issues có severity/owner/ảnh hưởng, số đo capacity/cost, phạm vi còn
   manual hoặc provider NOT_RUN. Chuẩn bị release/tag để người dùng duyệt kết quả cụ thể.

**Gate:** người dùng duyệt release nội bộ; quy trình tiếp quản có evidence thật.
Không tự merge, publish video/site hoặc gọi dịch vụ trả phí. Nếu thiếu gate,
giữ candidate có giám sát và quay Q7/Q8 đúng nguyên nhân, không tuyên bố unattended production.

## 6. Nếu bị chặn, vẫn có việc hữu ích nhưng không vượt gate

| Thiếu | Việc vẫn được làm | Việc chưa được nhận là hoàn thành |
| --- | --- | --- |
| Không có khả năng nghe/xem video đầy đủ | Chuẩn bị file/cue/timecode, reference register, checklist và gói nhận xét; kiểm nguồn/hash | Listening/full-motion approval, art score suy từ ảnh/PCM |
| Chưa có operator độc lập | Hoàn thiện native package, deps/rights, guide và bài tập note cụ thể; ghi mọi lần replay cùng agent | Independent handoff chỉ vì đổi process/folder/runner |
| Chưa qua art gate | Sửa đúng shot, viết spec đo và inventory runtime | Chạy số đo rồi gọi là bộ 3 cold + 5 warm cho candidate accepted, hoặc chọn backend cuối |
| Chưa có provider/budget | Corpus/schema/eval offline, manual tools; kiểm năng lực local có sẵn | Provider integration/LLM completion đã PASS hoặc chi phí bằng 0 cho phần chưa chạy |
| Không có quyền push | Hoàn tất local commit/evidence và ghi lỗi quyền cụ thể | “Đã lên Git” nếu remote SHA chưa khớp |

Không lặp vòng cài/test baseline đã PASS như cách thay thế công việc bị chặn.
Mỗi blocker phải ghi: thiếu gì, ai/vai nào cung cấp, artifact đã sẵn sàng và
điều kiện tiếp tục. AI mới cần kiểm lại năng lực của chính nó, không chỉ sao
chép kết luận “không nghe được” của phiên trước.

## 7. Bộ kiểm tra và checkpoint khi code đổi

Chọn đúng phép kiểm theo thay đổi và [AGENTS](../../AGENTS.md); không chạy rộng
lặp lại khi không có thay đổi/lỗi/concern mới. Bọc lệnh bằng recorder, ví dụ:

```bash
python scripts/run-step.py Q2 typecheck -- npm --prefix production run typecheck
python scripts/run-step.py Q2 contracts -- npm --prefix production test
python scripts/run-step.py Q2 review-ui -- npm --prefix production run test:review-ui
python scripts/run-step.py Q2 review-recovery -- npm --prefix production run test:review-recovery
python scripts/run-step.py Q2 media-contracts -- python -m unittest discover -s production/tests -p 'test_*.py' -v
python scripts/run-step.py Q2 v01-verify -- npm run verify
python scripts/run-step.py Q2 v01-render-ui -- python production/src/qa/run_app_regression.py
```

Dùng phase đúng khi đến Q3–Q9, không gom mọi việc vào Q2. Cài Python QC theo
requirements/runtime hiện hành; recorder không tự cung cấp browser/FFmpeg/Blender.
Native thay đổi phải có render/decode thật. UI/API đổi phải có browser regression,
bao gồm stale head, lost response, draft mới và restart. Runtime/lock đổi cần
clean checkout; `check_fresh_review.py` chỉ kiểm source đã commit. Audit tạo
report tên mới, không ghi đè report cũ.

Một checkpoint đủ để tiếp quản gồm: task/phase, source HEAD, input/output hashes,
expected/observed, command/runtime, failed attempt và repair, reviewer role,
giới hạn, đường dẫn artifact, next action/dependency, local/remote commit và CI SHA.
Không có result thì INCOMPLETE; kiểm process thật trước rerun. Không xóa lock của
writer đang sống; phục hồi theo runbook, giữ interruption evidence.

## 8. Không bỏ P0–P11 và các nhánh tương lai

| Phạm vi Word | Đường hoàn tất trong kế hoạch này |
| --- | --- |
| P0 | Q0 đã khóa; Q2-REFERENCE/REVIEW, Q8 acceptance |
| P1 | Q2-RESUME, Q3 môi trường/license, Q7 restore và Q9 vận hành |
| P2 | Q1 art đã có; Q2-REPAIR nếu cần; Q4 registry |
| P3 | Q2 quality/edit/performance → Q3 ADR |
| P4 | Q4 schema/compiler/migration; giữ v0.1 replay |
| P5 | Q4 image/rig/native registry và dependency graph |
| P6 | Q2 acting review → Q5 action library trong sản phẩm |
| P7 | Q1-VOICE → Q5 corpus/cues/stems → Q7 QC |
| P8 | Q6 manual/agent workflows, eval đúng+sai; provider có trạng thái riêng |
| P9 | Q7 jobs/cache/fault/backup/restore; Q9 runbook |
| P10 | Q8 pilot 72 giây + hai vòng sửa + accepted cost |
| P11 | Q9 release/operator acceptance và tài liệu sử dụng |

[Chi tiết F01–F11](../toolchain-future-plan.md) giữ nguyên. Các nhánh chưa được
chứng minh hoàn tất chỉ vì workbench có một phần tương tự:

| Nhánh | Điều kiện mở và kết quả cần |
| --- | --- |
| F01 Styles | Style đầu Q8 accepted và brief mới; style bible/3 styleframes/stress shots, review riêng |
| F02 Characters/rig | Có nhân vật/góc mới và Q4 versioning; view/retarget/extremes/package tests |
| F03 Acting nâng cao | Action cơ bản đạt, note/pilot cần; action family, video/edits và review intent |
| F04 Multi-actor | S05 đạt, script cần; gaze/ownership/isolation/occlusion tests |
| F05 Video dài | Pilot accepted, brief dài và capacity đo được; continuity, chunk/edit/resume toàn phim |
| F06 Ngôn ngữ/voice | Nhu cầu/rights cụ thể; 20–30 câu/ngôn ngữ và người nghe đúng ngôn ngữ |
| F07 Editor/handoff | Note thực cần controls/NLE; source/edit/review/round-trip và effect-loss report |
| F08 Scale/recovery | Có bottleneck thực đo; concurrency/isolation/fault, không thêm cluster mặc định |
| F09 Reuse/cost | Ít nhất 2 project thật; lineage/rights/restore và cost có accepted denominator |
| F10 Manim | Pilot có shot sơ đồ/bản đồ cần; sửa EX-003 khi mở, so CE/SVG/Three trên cùng shot và hai note |
| F11 Generative assist | Bottleneck rõ, quyền dùng và ngân sách cụ thể; bounded candidates/takes, identity/contact/edit tests |

Trần paid API/GPU/license hiện tại vẫn 0. Kế hoạch này không phê duyệt mua dịch
vụ, nhân sự hoặc phần cứng. Chỉ mở nhánh khi có đầu vào và gate của nó; mục chưa
mở ghi NOT_STARTED/CONDITIONAL, không xóa và không đổi thành DONE.
