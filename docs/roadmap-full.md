# Đối chiếu đủ 12 giai đoạn của Word

Nguồn: chương 20, P0–P11 trong Word gốc. M0–M6 ở plan.md là các mốc bàn giao **prototype phần mềm**, không thay thế hoặc xóa các giai đoạn production bên dưới. Theo yêu cầu của người dùng, ứng dụng được viết và kiểm trước lần duyệt; các quyết định nghệ thuật/production vẫn mở. Không chuyển trạng thái PARTIAL thành DONE chỉ vì đã có demo.

Vai trò là trách nhiệm, chưa giả định đã tuyển đủ người. Không ấn định tuần/ngân sách khi chưa có năng lực đội và art rubric được duyệt. Mỗi vòng: chọn item → khóa input/tiêu chí → làm → test → giữ log → sửa → test lại → review → cập nhật trạng thái.

## Bảng trạng thái

| Word | Đã có | Còn lại | Trạng thái |
| --- | --- | --- | --- |
| P0 Brief/reference | Hướng studio nội bộ; ba phong cách trong Word; profile thử 1080p/24fps | Người dùng duyệt frame mục tiêu, mức chất lượng, loại pilot cụ thể | NEEDS_REVIEW |
| P1 Environment/license | Lockfile, doctor, clean install, notices, CI config | Kiểm license theo mô hình triển khai thực; khóa image/runtime máy vận hành | PARTIAL |
| P2 Asset/fixture | SVG rig/nền/cốc, voice, fixture chung hai renderer | Art pack thật, anchors/pose sheet/mouth shapes được duyệt | PARTIAL |
| P3 Renderer decision | Hai backend đã chạy; lỗi missing asset tái hiện; ADR tạm | Corpus production/cost sửa, tải nặng, goldens art, quyết định cuối | PARTIAL |
| P4 Scene IR/compiler | Schema 1.0 strict, capability table, compiler, tests | Curves/instances/anchors khi có nhu cầu đã chứng minh; migration khi thêm version | DONE trong phạm vi v0.1 |
| P5 Asset/rig registry | Audio content hash, immutable revisions, package | Hình/rig ingest, source/rights, approved asset versions, dependency index | PARTIAL |
| P6 Actions/acting | Năm action đơn giản, pure frame evaluator | Place/release, contact solver, foot lock, reaction, retarget/pose replacement | PARTIAL |
| P7 Voice/alignment/mix | VI/EN draft, WAV, transcript hash, padding/envelope, encode sync test | Corpus speech, alignment/visemes, cue editor, stems/LUFS, duyệt phát âm | PARTIAL |
| P8 Agent/skills | Skill contracts, API tools, offline planner | Provider LLM, eval 20 đúng/20 lỗi, usage/traces, bounded patch execution | PARTIAL — chưa tích hợp LLM |
| P9 Jobs/QC/recovery | Một worker, attempts/cancel/retry/reopen/cache/hash/QC | SIGKILL fault matrix, full backup restore, retention/quota, per-shot cache | PARTIAL |
| P10 Pilot | Demo kỹ thuật 13 giây/3 scene và source package | Pilot 60–90 giây, hai vòng sửa, review art, giờ làm/chi phí/phút accepted | PARTIAL — chờ duyệt demo |
| P11 Productize | UI/CLI/docs/CI và branch review | Roles, service target, backup policy, upgrade gates, pilot production accepted | PARTIAL |

## P0 — chốt brief và tiêu chí hình ảnh

**Input:** Word, demo v0.1, phản hồi của người dùng. **Chủ trì:** người dùng/producer; artist và kỹ sư giải thích trade-off.

1. Duyệt hoặc sửa ba frame đại diện cho paper-cut, multiplane, shadow-box; ghi điều nào là bắt buộc, điều nào chỉ là tham khảo.
2. Chọn clip pilot đầu 60–90 giây và nơi phát hành; chốt aspect/fps/output/audio; profile hiện tại là giả định kỹ thuật.
3. Chấm rubric: đọc rõ action, silhouette/contact, depth/occlusion, continuity, giọng/ngôn ngữ, kể chuyện. Ghi người có quyền duyệt.
4. **Bàn giao:** brief có revision, reference có nguồn/quyền, rubric và danh sách ngoài phạm vi.
5. **Gate:** người dùng duyệt brief/art target. Nếu chưa đạt, sửa storyboard/frame, không khóa lịch/cost production.

## P1 — môi trường và giấy phép

**Phụ thuộc:** P0 mô hình sử dụng. **Chủ trì:** kỹ sư nền tảng.

1. Chạy doctor/clean checkout trên máy vận hành, lưu Node/browser/FFmpeg/OS/RAM/CPU; chạy cùng tests.
2. Giữ package-lock và BOM; lưu license texts/source URL/hash. eSpeak GPL-3.0, GSAP standard license cần được đọc đúng mô hình phân phối.
3. Khóa container digest hoặc OS package snapshot khi xác định máy; rehearsal upgrade trên data copy.
4. **Bàn giao:** environment manifest, dependency/rights matrix, scripts cài, evidence clean run.
5. **Gate:** người khác làm theo README và chạy được; license không có blocker chưa xử lý cho mô hình dùng đã chọn. Không biến package metadata thành tư vấn pháp lý cuối cùng.

## P2 — asset pack và fixture chuẩn

**Phụ thuộc:** P0/P1. **Chủ trì:** technical artist/animator.

1. Tách head/body/arms/legs, các mouth shapes và expressions; khai báo pivot/anchor/scale/color space/view.
2. Làm cốc có grip marker, nền ≥3 lớp và overscan; render pose trung tính/cực trị trên nền sáng/tối.
3. So cùng pack/evaluator trên hai backend; giữ fixture procedural hiện tại làm regression.
4. **Bàn giao:** asset hashes/source rights, rig spec, pose/contact sheet và golden frames.
5. **Gate:** người duyệt chấp nhận style, không lộ alpha/pivot lỗi. Nếu chưa đạt, sửa asset trước khi suy ra renderer yếu.

## P3 — quyết định renderer cuối

**Phụ thuộc:** P1/P2 đạt art gate. **Chủ trì:** renderer engineer + người duyệt.

1. Ba shot 10–15 giây: contact/pick/place; pan/occlusion/shadow; speech/expression. Cùng asset/profile.
2. Chạy 3 cold + 5 warm; công bố từng mẫu, median/range; chưa tuyên bố SLA p95 từ 8 mẫu.
3. Tăng từng trục layer/character/texture/blur/worker; ghi RAM/elapsed/failure; dừng khi sai hình hoặc vượt ngân sách.
4. Sửa một asset và câu thoại, đo phút làm/sửa/duyệt và phạm vi rerender.
5. **Bàn giao:** raw measurements, goldens, issue log, ADR chọn renderer hoặc chưa quyết định. **Gate:** yêu cầu bắt buộc đạt và công sức bổ sung được thấy rõ.

## P4 — Scene IR, validator/compiler

**Đã đạt v0.1:** dữ liệu scene → output; ID/action/duration/asset/text hash được kiểm. Code là contract thực; capabilities công khai giới hạn.

1. Khi pilot cần thêm feature, bổ sung từng capability với fixture và lỗi rõ, không thêm graph tổng quát trước nhu cầu.
2. Định nghĩa world/local/screen coordinates, transform order và frame intervals trước anchors/curves.
3. Version schema mới phải có migration test hoặc từ chối rõ; input cũ vẫn replay được bằng checkout cũ.
4. **Gate mở rộng:** input sai bị chặn đúng trường, golden scenes giữ đúng; compiler không bỏ effect âm thầm.

## P5 — registry/rig có phiên bản

**Phụ thuộc:** P2/P4. **Chủ trì:** artist + data engineer.

1. Image/rig ingest kiểm decode, dimensions, alpha, hash, provenance/license, preview sheet.
2. Tạo immutable AssetRevision và review độc lập; tách draft/approved; shot tham chiếu version cụ thể.
3. Dependency index chỉ ra scene nào stale khi đổi asset; thay đổi không ghi đè accepted revision.
4. **Bàn giao:** registry API/UI, QA sheet, rollback/export tests.
5. **Gate:** thay asset ảnh hưởng đúng dependencies, restore bản cũ được, không có path/asset ẩn ngoài manifest.

## P6 — thư viện hành động

**Phụ thuộc:** P4/P5. **Chủ trì:** animator/technical artist.

1. Tách action thành phase: anticipate/reach/grip/lift/hold/place/release; khai báo contact markers.
2. Ground foot lock cho walk, giới hạn góc, pose replacement khi hình không đủ; camera điều khiển riêng.
3. Kiểm contact marker ≤2 px ở 1080p cho fixture đã khóa; seek đảo/ngẫu nhiên/browser mới; kiểm foot slide bằng marker và mắt người.
4. **Bàn giao:** action contracts, parameters, cực trị, QA films và accepted goldens.
5. **Gate:** action đọc được và không lỗi contact; drawing thủ công có revision là phương án hợp lệ nếu rig không biểu diễn được.

## P7 — speech, lip-sync, mix

**Phụ thuộc:** P4/P5/P6. **Chủ trì:** sound/editor + animator.

1. Chọn voice nguồn có quyền; tập ≥20–30 câu ngôn ngữ mục tiêu, có silence/nói nhanh/cảm thán/âm cuối.
2. Alignment gắn audio/transcript hashes; mapping phoneme/viseme có confidence; UI sửa cue thủ công.
3. Tách stems voice/music/SFX; chốt LUFS/peak output profile, có meter; không dùng auto gain để che clipping.
4. **Bàn giao:** cue schema/corpus, time offsets, failed cases, tỷ lệ phải sửa và review phát âm/cận cảnh.
5. **Gate:** sync marker ≤1 frame; padding encode ≤1 AAC frame khi profile yêu cầu; artist/người nghe duyệt. Correlation PCM hiện tại chỉ chứng minh timing pipeline, không chứng minh phát âm/lip-sync.

## P8 — agent và skills

**Phụ thuộc:** tool contracts P4–P7. **Chủ trì:** AI engineer + chuyên gia nội dung.

1. Chọn provider/model và ngân sách; credentials qua môi trường/secret store, không nằm trong package.
2. LLM đề xuất IR/patch hữu hạn qua tool schema; validator chạy trước state mutation; không thực thi code sinh tùy ý.
3. Tập 20 đề bài đúng +20 lỗi: action ngoài phạm vi, thiếu asset, prompt injection trong text, stale revision, lạm dụng chi phí; giữ trace/input/output/model/version/usage.
4. Đo completion đúng, tỷ lệ cần người sửa, content accuracy và giá mỗi tác vụ accepted; kiểm recovery khi provider timeout.
5. **Bàn giao:** adapter, eval/traces, tool permissions, budget controls. **Gate:** hoàn thành nhiệm vụ giới hạn thật; đúng JSON chưa đủ. Khi chưa đạt, tiếp tục công cụ có người biên tập.

## P9 — vận hành và recovery

**Phụ thuộc:** P4 + backend; nâng dần theo P5–P8. **Chủ trì:** platform/renderer.

1. Fault matrix: terminate lúc load/capture/encode/QC/publish; duplicate attempts; disk-full; corrupted asset/artifact; process restart.
2. Chứng minh không published partial, accepted artifact bất biến, subprocess được dọn; thêm heartbeat/timeout nếu cần worker tách process.
3. Backup toàn lịch sử, restore vào máy/data mới, verify hashes và rerender; đo RPO/RTO trước khi đặt cam kết.
4. Cache shot/stem sau khi có dependency index; đổi thoại/gain chỉ invalidate phần cần. Quota/retention theo mức disk thực.
5. **Bàn giao:** recovery report, runbook đã rehearsal, usage/disk metrics. **Gate:** ma trận pass, restore accepted history thành công. Hiện chỉ worker đơn và package round-trip đã được chứng minh.

## P10 — pilot nghệ thuật và chi phí

**Phụ thuộc:** P6–P9 đạt phạm vi pilot. **Chủ trì:** producer + người dùng.

1. Tạo pilot 60–90 giây, 6–9 shot theo brief đã duyệt, không thay bằng demo 13 giây.
2. Hai vòng sửa bắt buộc: thoại và asset/action. Ghi effort edit/render/review, API usage/compute/storage/license.
3. Chấm rubric toàn phim; liệt kê issue blocking/non-blocking; sửa đúng công đoạn và chạy lại regression liên quan.
4. **Bàn giao:** accepted film + source/history + báo cáo cost/accepted minute và throughput thực.
5. **Gate:** người dùng duyệt art và có số liệu chi phí. Chưa đủ dữ liệu thì giữ trạng thái pilot, không quảng bá năng suất sản xuất.

## P11 — hoàn thiện sản phẩm và mở rộng

**Phụ thuộc:** P10. **Chủ trì:** product/platform.

1. Timeline/review UX theo phản hồi thật; phân quyền, quota, secrets, backup/retention và upgrade regression.
2. Đặt service target từ số liệu, thêm nhiều worker khi bottleneck chứng minh cần; kiểm concurrency/isolation trước phát hành.
3. Style/rig/language mới phải có fixture và acceptance riêng. SaaS là quyết định sản phẩm khác, phải đánh giá license/tenant/billing riêng.
4. **Bàn giao:** internal release, support/runbook, capability matrix và release checklist.
5. **Gate:** service/cost/quality được xác nhận. Nếu chưa đạt, tiếp tục studio nội bộ trong phạm vi đã chứng minh.

## Thứ tự sau lần duyệt hiện tại

P0/art feedback → P2/P3 cảnh đại diện → P5/P6/P7 theo shot pilot → P8 nếu cần tự động hóa nội dung → hoàn tất P9 → P10 → P11. P4 mở rộng theo capability cần thật. Những item đã có evidence được giữ nguyên; chỉ chạy lại khi có thay đổi liên quan hoặc regression gate.
