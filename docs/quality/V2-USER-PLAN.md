# Kế hoạch V2: chạy liên tục, tra cứu thật, chất lượng ổn định

Soạn ngày 14/11/2026 · Nền: PR #6 `codex/quality-motion-contracts` (head `ce4f912`) · Thay phần «việc tiếp theo» của bản 13/11

## 0. Mục đích và cách dùng

Tài liệu giao cho một AI làm việc tự chủ trong repo hiện có. So với bản trước, nó thêm ba thứ: (1) hợp đồng chạy liên tục không ngắt, (2) giao thức tra cứu không bịa, (3) danh sách điều kiện cụ thể để chất lượng cao và ổn định. Các giai đoạn F0–F9 nối tiếp trạng thái thật của repo (T01–T12 trong `docs/quality/NEXT-STEPS.md`). Mục 10 là prompt để dán.

Trung thực: không ai bảo đảm «hoàn hảo». Tài liệu đặt ngưỡng đo được; phần cảm nhận (hồn, hình, nghe) cần bạn chấm, agent không được tự chấm thay.

## 1. Hợp đồng tự chủ (không ngắt giữa chừng)

1. Chạy tuần tự theo `docs/quality/state.json`: lấy task `TODO` có phụ thuộc đã đạt. Không hỏi lại, không chờ xác nhận giữa các task và giữa các giai đoạn.
2. Cuối mỗi giai đoạn: viết báo cáo (mẫu ở Mục 8) vào `docs/reports/F<n>.md`, cập nhật state và `RESUME.md`, commit, push, rồi **bắt đầu ngay** giai đoạn kế tiếp. Báo cáo là tài liệu, không phải điểm dừng.
3. Vướng thông tin: dùng giao thức Mục 2. Vướng quyết định chỉ người làm được (chọn art, nghe giọng, quyền sử dụng): chọn đường mặc định rẻ và an toàn nhất (ngân sách 0), ghi nhãn `PROVISIONAL`, thêm vào `docs/quality/HUMAN-QUEUE.md`, rồi đi tiếp.
4. Lỗi: tối đa 3 lần sửa cho mỗi vấn đề, mỗi lần dùng một cách tiếp cận khác và ghi lại. Vẫn lỗi thì đánh dấu `BLOCKED`, ghi giả thuyết nguyên nhân, chuyển sang task độc lập kế tiếp. Chỉ kết thúc phiên khi không còn task độc lập nào.
5. Dừng cứng (kèm lý do rõ) chỉ khi: cần chi tiền hoặc dịch vụ trả phí; dùng media không rõ quyền; thao tác Git phá hủy (force-push, viết lại lịch sử, xóa branch); lộ secret; hành động ảnh hưởng ngoài repo.
6. Liêm chính: không tự duyệt nghệ thuật hay nghe; không đổi ngưỡng sau khi thấy kết quả; không xóa evidence FAIL; không báo PASS khi là `NOT_RUN`; review của agent ghi `delegated-agent`.
7. Chống mất ngữ cảnh: sau mỗi task ghi `state.json` và `RESUME.md` đủ để agent mới tiếp tục không cần hỏi. Phiên mới chạy «Resume prompt» ở Mục 10.
8. Hai vòng lặp: vòng nhanh (preview thấp, không hash) khi sáng tạo; vòng đầy đủ chỉ cho bản cuối của mỗi giai đoạn.

## 2. Giao thức tra cứu (không bịa)

Kích hoạt khi: thiếu API, phiên bản, license hay số liệu; chọn thư viện hoặc model; cần khẳng định về khả năng của công cụ; cần hằng số thực tế (ví dụ nhịp chớp mắt, nhịp thở).

1. Tìm nguồn gốc trước: tài liệu chính thức, README cùng mã nguồn và issue/release, file LICENSE, bài báo gốc. Blog và trang SEO chỉ để dẫn đường, không làm nguồn duy nhất.
2. Kiểm trên phiên bản thật đang dùng: `npm view`, đọc mã trong `node_modules`, chạy thử một đoạn nhỏ.
3. Khẳng định không tầm thường cần ≥ 2 nguồn độc lập, hoặc 1 nguồn gốc cộng 1 phép thử.
4. Ghi `docs/research/<chủ đề>.md`: câu hỏi, ngày, URL, điều đã xác minh, điều chỉ suy ra, độ tin cậy (`VERIFIED`, `PARTIAL`, `UNVERIFIED`), quyết định. Tóm tắt bằng lời mình, không chép dài.
5. Còn `UNVERIFIED`: biến thành giả thuyết kiểm được, thiết kế thí nghiệm nhỏ với tiêu chí khóa trước, dùng kết quả đo thay cho trí nhớ.
6. Cấm: bịa tên API, hàm, số benchmark, trích dẫn, license, URL; suy license từ tên dự án; chép số từ bài viết rồi trình bày như tự đo.
7. Mỗi câu hỏi có ngân sách tra cứu hợp lý (khoảng 8–15 truy vấn hoặc nguồn). Hết ngân sách mà chưa rõ thì ghi `UNVERIFIED`, chọn phương án an toàn nhất và đi tiếp.

## 3. Điều kiện để chất lượng cao và ổn định

1. **Art có chất liệu thật.** Art phẳng sẽ luôn «trông như vẽ bằng code». Dựng diorama giấy nhiều lớp: tách lớp từ art, đùn thành mesh có độ dày, vật liệu giấy (sợi, normal map), ánh sáng định hướng, bóng đổ mềm. Hai backend dùng chung dữ liệu để so sánh (Three trong pipeline hiện có; Blender cho cảnh nhấn).
2. **Lớp «sống» luôn chạy.** Thở, chớp mắt, dịch trọng tâm, đầu và mắt nhìn theo ý đồ, micro-motion. Hiện nhân vật gần như đứng yên ngoài tay và đèn; đây là thiếu sót lớn nhất về hồn và rẻ nhất để sửa.
3. **Diễn xuất có dữ liệu thật.** Tham chiếu hợp pháp (clip bạn cung cấp, hoặc bộ mocap đã xác minh quyền), retarget, làm sạch, cường điệu. Thiếu tham chiếu: agent làm pose-to-pose theo nguyên tắc hoạt hình ở mức `PROVISIONAL`.
4. **Vật lý phủ mọi thứ cần phản ứng.** Đèn đã có. Mở rộng: tóc, áo, đạo cụ, tiếp đất thật, vùng va chạm nhân vật.
5. **Critic đo thật và độc lập.** Neo mặt đất độc lập (sửa R2), volume va chạm (sửa R4), ca lỗi cố ý để chứng minh critic bắt được lỗi.
6. **Tất định phân tầng.** Dữ liệu (bake, pose) giống hệt từng bit và có hash. Điểm ảnh dùng ngưỡng cảm nhận (SSIM, ΔE) vì GPU hay render phần mềm khác nhau có thể lệch nhẹ. Ngưỡng phải tra cứu và hiệu chỉnh bằng thực nghiệm.
7. **Khóa toàn bộ phiên bản.** Lockfile, Chromium, FFmpeg, Blender, model giọng và alignment (kèm hash weights), cờ render; ghi toolchain receipt.
8. **Hợp đồng nối shot.** Trạng thái cuối shot (tư thế, vận tốc, quyền sở hữu đạo cụ) phải khớp đầu shot sau (R1).
9. **Mọi lỗi thành test.** Lỗi đã gặp phải có test tái hiện trước khi sửa; test chập chờn (flaky) được coi là lỗi.
10. **Giới hạn vòng sửa, evidence nhẹ.** ≤ 3 vòng mỗi vấn đề; evidence là ảnh và JSON nhỏ; media nặng ngoài Git thường, không viết lại lịch sử.
11. **Cổng người ngắn, có checklist.** Mỗi mục ≤ 15 phút xem hoặc nghe, có thang điểm; điểm < 4 tự sinh việc sửa ở lượt chạy sau.
12. **Ghi quyết định (ADR) và research log**, để agent sau không lặp lại tranh luận.

## 4. Chuẩn đo

Giữ nguyên `docs/quality/standard.md` và `production/brief/quality/physics-contract.json` (chu kỳ và rơi ≤ 2%, nảy ≤ 10%, contact và chân ≤ 1 px, strict penetration báo riêng, rubric mỗi mục ≥ 4 và mean ≥ 4,2, −16 LUFS, TP ≤ −1 dBTP).

Thêm chỉ số hỗ trợ cho «hồn» (không thay người chấm): có ease-in/out ở chuyển động chính; có overshoot khi dừng; có anticipation (chuyển động ngược ngắn trước hành động); có hold; nhịp chớp mắt và thở nằm trong khoảng đã tra cứu; không có đoạn nội suy tuyến tính dài ở chuyển động chính; jerk trong ngưỡng, trừ va đập có chủ ý. Ngưỡng cụ thể phải tra cứu và khóa trước thử nghiệm.

## 5. Hiện trạng xuất phát

- **Đã có:** bake Rapier tất định cho đèn S05; Performance Script chặt; critic và công cụ chẩn đoán; 31 test TypeScript và 20 test Python; CI hai runner.
- **Chưa có:** art có chất liệu (hiện là vector phẳng dùng để phát triển), chuyển động thân và đầu, vật lý nhân vật, sáu clip nền, retarget, voice/viseme/foley, Director, so sánh backend, pilot, operator độc lập.
- **Nợ cần xử lý:** R1–R4 (nối shot, foot-drift chỉ so baseline, guard chỉ nhận script mẫu, thiếu collision), nợ app v0.1 (T11, T12), repo nặng (`.git` khoảng 458 MB, `production/artifacts` khoảng 644 MB), chưa có LICENSE.

## 6. Tổng quan lộ trình (theo thứ tự chạy)

| GĐ | Mục tiêu | Ứng với | Phụ thuộc |
| --- | --- | --- | --- |
| F0 | Nền ổn định: resume, hàng đợi người, tất định phân tầng, license, draft recovery | U0, T11 | không |
| F1 | Nối shot và critic độc lập | T01, T02 | F0 |
| F2 | Art và chất liệu (diorama giấy) | T06, U1 | F0 |
| F3 | Lõi chuyển động, lớp sống, 6 hành động nền | T03, U2 | F1, F2 |
| F4 | Vật lý mở rộng (tóc, áo, va chạm, tiếp đất) | T05, U3 | F3 |
| F5 | Diễn xuất từ tham chiếu | U4 | F3 |
| F6 | Âm thanh, viseme, foley | T07, U5 | F3 |
| F7 | Render, ánh sáng, so sánh backend | U6 | F2, F4 |
| F8 | Director và vòng sửa | T04, U7 | F3, F4 |
| F9 | Hero, 6 shot, pilot 72 giây, tái lập | T08–T10, T12, U8 | tất cả |

Art (F2) đứng trước chuyển động (F3) vì art đổi rig và bóng thì mọi thứ sau phải làm lại.

## 7. Chi tiết từng giai đoạn

Mỗi giai đoạn gồm: **Làm**, **Tra cứu**, **Kiểm và cổng**. Cuối giai đoạn: viết báo cáo rồi sang ngay giai đoạn sau.

### F0. Nền ổn định

**Làm:** tạo `RESUME.md`, `HUMAN-QUEUE.md`, `docs/research/`, `docs/reports/`; chuyển danh sách task thành hàng đợi máy đọc được trong `state.json` (id, phụ thuộc, trạng thái, số lần thử). Định nghĩa hai tầng tất định (dữ liệu bit-exact, điểm ảnh theo ngưỡng cảm nhận) và thêm test. Sửa T11: mất bản nháp khi lưu, gõ tiếp khi save/voice/upload, đổi project (mỗi ca có test tái hiện trước khi sửa). Rà license phụ thuộc (eSpeak NG GPL-3.0, GSAP, Rapier, Planck, HyperFrames) vào `docs/research/licenses.md`. LICENSE: soạn đề xuất, đưa vào HUMAN-QUEUE, không tự cấp. Quy tắc kích thước: media mới ra ngoài Git thường, không viết lại lịch sử.

**Tra cứu:** cờ Chromium cho render phần mềm ổn định; ngưỡng SSIM/ΔE để coi hai frame là tương đương; điều khoản GSAP.

**Kiểm và cổng:** test và CI xanh; một agent mới đọc `RESUME.md` chạy được task kế tiếp mà không cần hỏi.

### F1. Nối shot và critic độc lập (T01, T02)

**Làm:** `ShotBoundaryState` (transform, quyền sở hữu/gắn kết, pose, vận tốc, timebase, art/rig/recipe/revision) và validator cạnh nối kèm báo cáo seam. Critic mới: neo mặt đất độc lập, khoảng stance, drift theo world và theo chiếu camera, khe hở/xuyên nền, chồng lấn đạo cụ–thân. Giữ metric cũ nhưng đổi tên thành preservation metric.

**Tra cứu:** cách đo foot-slide chuẩn trong hoạt hình/mocap; cách chọn ngưỡng ground contact.

**Kiểm và cổng:** ca lỗi chèn cố ý đều bị bắt (trượt 2 px, chân nổi, xuyên nền, đèn xuyên torso, đèn nhảy −16,96° về 0° không chủ ý); ca hợp lệ (camera pan, cut có chủ ý) không bị báo nhầm; golden cũ bất biến.

### F2. Art và chất liệu (T06, U1)

**Làm:** (1) style bible: palette, độ dày giấy, ánh sáng, tỉ lệ, 8 viseme và 6 biểu cảm. (2) Pipeline lớp → mesh: lấy 117 asset hiện có, đùn độ dày, vật liệu giấy (sợi, normal map), ánh sáng định hướng, bóng đổ mềm, contact shadow, DOF nhẹ, trong Three (pipeline hiện có). (3) Ba hướng so sánh: A artist vector (cần người, `BLOCKED` nếu chưa có), B ảnh từ model chạy cục bộ (chỉ khi license và quyền rõ, không dịch vụ trả phí), C dựng diorama trong Three/Blender (agent tự làm được, chạy trước). (4) Xuất so cạnh asset phẳng cũ cùng pose, cùng ánh sáng; styleframe 1080p; model sheet; pose cực trị.

**Tra cứu:** nguồn texture giấy miễn phí và điều khoản từng nguồn; cách đùn lớp và bóng đổ trong Three 0.187 (giới hạn, chi phí); tiêu chí nhìn của hoạt hình giấy cắt (độ dày, bóng, lớp).

**Kiểm và cổng:** không răng cưa và viền vỡ ở 1080p; rig vẫn dùng cùng bộ xương; styleframe vào HUMAN-QUEUE để chấm hình ≥ 4. Trong lúc chờ: `PROVISIONAL`, đi tiếp.

### F3. Lõi chuyển động và lớp sống (T03, U2)

**Làm:** evaluator MotionClip có tham số (đơn vị, marker, ràng buộc đầu/cuối, retime, gaze, cường độ); chỉ gỡ guard digest cho tham số nào đã có test. Lớp sống tất định theo seed: thở, chớp mắt, dịch trọng tâm, đầu và mắt theo mục tiêu, tay không tĩnh. Sáu hành động nền: đi, nhấc, đặt, quay đầu, chào, ngã nhẹ, mỗi cái có hợp đồng và test (ràng buộc đầu/cuối, contact, seek ngẫu nhiên tái lập). Áp dụng anticipation, overshoot, follow-through, arcs, hold, on-twos.

**Tra cứu:** nhịp chớp mắt và nhịp thở khi đứng (nguồn y sinh hoặc giáo trình hoạt hình); 12 nguyên tắc hoạt hình áp vào con rối giấy.

**Kiểm và cổng:** chỉ số hỗ trợ ở Mục 4 đạt; contact sheet, onion-skin, biểu đồ; đổi tham số thì pose và timing thực đổi; biến thể không hỗ trợ vẫn bị từ chối; HUMAN-QUEUE chấm timing và trọng lượng.

### F4. Vật lý mở rộng (T05, U3)

**Làm:** chuỗi xương tóc, áo, dây; so sánh joint của Rapier2D với Verlet tự viết tất định (tiêu chí khóa trước: không nổ, ổn định khi chạy dài, độ giãn ≤ ngưỡng, hash lặp). Vùng va chạm nhân vật (capsule đơn giản). Ràng buộc tay–đạo cụ, tiếp đất thật. Sự kiện va chạm (frame, cường độ) phân biệt `measured` và `authored`.

**Tra cứu:** cấu hình joint và chuỗi trong Rapier 0.21 (đọc tài liệu và mã nguồn gói `deterministic-compat`); giới hạn tất định giữa các nền tảng.

**Kiểm và cổng:** test giải tích, ổn định, chạy dài; critic F1 xác nhận không xuyên; golden hash khớp trên 2 runner. Nếu hero không cần: `DEFERRED` có lý do.

### F5. Diễn xuất từ tham chiếu (U4)

**Làm:** chỉ dùng clip hợp pháp (bạn cung cấp hoặc bộ dữ liệu đã xác minh quyền). Pipeline: pose estimation có confidence, retarget 2D, làm sạch (lọc nhiễu, giữ đỉnh, khóa chân), cường điệu và tạo phong cách, ra MotionClip. Không có clip: agent tự làm pose ở mức `PROVISIONAL` và đưa vào HUMAN-QUEUE đề nghị bạn quay hoặc cung cấp clip.

**Tra cứu (chưa xác minh, không được giả định):** MediaPipe, RTMPose và các bộ ước lượng tư thế khác; bộ mocap mở (ví dụ CMU); SyncRig (xác minh repo và license trước); điều khoản dùng thương mại của từng cái.

**Kiểm và cổng:** 3 hành động so với clip gốc về sai số khớp, drift chân, timing; HUMAN-QUEUE chấm hồn ≥ 4.

### F6. Âm thanh và lip-sync (T07, U5)

**Làm:** giữ Kokoro làm giọng `PROVISIONAL`, tra cứu lựa chọn khác, dùng giọng thu thật nếu bạn cung cấp. Forced alignment, ánh xạ 8 viseme, sửa cue lệch bằng tay. Foley từ sự kiện (tách `measured` và `authored`). Nhạc và ambience chỉ từ nguồn có quyền hoặc tự tổng hợp. Mix −16 LUFS, TP ≤ −1 dBTP.

**Tra cứu:** Montreal Forced Aligner, Rhubarb Lip Sync, aligner dựa trên Whisper: license, hỗ trợ tiếng Việt, độ chính xác đo thật trên corpus tự dựng.

**Kiểm và cổng:** lệch lip-sync ≤ 2 frame trên corpus khóa trước; foley ±1 frame; số đo loudness; HUMAN-QUEUE nghe duyệt. Hero im lặng không đóng gate này.

### F7. Render, ánh sáng, backend (U6)

**Làm:** cùng một BakeFile cho Three (HyperFrames) và Blender; render S05 candidate bằng cả hai; camera có easing, parallax, DOF; màu BT.709; so điểm ảnh preview với final bằng SSIM/ΔE; đo 3 cold + 5 warm (compile, load, capture, encode, QC, bộ nhớ, retry) cùng phần cứng và độ song song. Viết ADR backend riêng (ADR chọn Rapier không phải ADR backend).

**Tra cứu:** cách chạy Blender headless ổn định trong CI; khác biệt render phần mềm của Chromium giữa các máy.

**Kiểm và cổng:** parity trong ngưỡng đã tra cứu và khóa; phát 1× và 0,5× không rớt frame; HUMAN-QUEUE chấm hình và chuyển động ≥ 4.

### F8. Director và vòng sửa (T04, U7)

**Làm:** công cụ hẹp theo allowlist (chọn clip, đặt timing, tham số, nhấn); không phát code frame. Kế hoạch có giới hạn, patch phạm vi, SHA trước/sau, lỗi có cấu trúc, lý do dừng. Tối đa 3 vòng sửa mỗi shot, dừng khi không cải thiện. Khóa trước số mẫu và định nghĩa đạt, rồi chạy kịch bản chưa từng thấy và ca thiếu capability.

**Kiểm và cổng:** đạt số đo trong ≤ 3 vòng; không tự đánh dấu accepted; đạt số đo không đồng nghĩa đạt nghệ thuật.

### F9. Hero, sáu shot, pilot, tái lập (T08–T10, T12, U8)

**Làm:** hero S05 tích hợp mọi giai đoạn trước, xuất revision mới. Agent không dừng chờ duyệt: tiếp tục sáu shot (48 giây) dưới nhãn `PROVISIONAL`, sẵn sàng sửa nếu HUMAN-QUEUE trả điểm < 4. Sau đó pilot 72 giây với hai vòng sửa, giữ take cũ; đóng nợ app T12 (audio sát 120 s/240 s, preview envelope, cache fingerprint, QC production). Chuẩn bị gói để operator độc lập clone sạch và tái lập.

**Kiểm và cổng:** QC decode/profile/frame/audio; số đo hiệu năng; operator độc lập là việc của người, ghi vào HUMAN-QUEUE.

## 8. Hàng đợi người duyệt và mẫu báo cáo

**HUMAN-QUEUE.md**, mỗi mục gồm: ID, giai đoạn, việc cần làm (xem clip ở 1× và 0,5×, tắt rồi bật tiếng, nghe file Y), thang chấm 1–5, thời gian ước tính ≤ 15 phút, đường dẫn, lựa chọn mặc định agent đã dùng, hệ quả nếu điểm < 4. Bạn ghi điểm vào file hoặc nhắn trong chat; lượt chạy sau của agent đọc điểm và tạo task sửa.

**Mẫu báo cáo mỗi giai đoạn** (`docs/reports/F<n>.md`): 1. Kết quả (PASS, FAIL, PARTIAL, NOT\_RUN); 2. Việc đã làm và commit; 3. Số đo (bảng); 4. Hình và clip (đường dẫn); 5. Tra cứu mới và các mục còn `UNVERIFIED`; 6. Quyết định (ADR) và đường `PROVISIONAL` đã chọn; 7. Lỗi, vướng mắc, cách xử lý; 8. Việc cần người (HUMAN-QUEUE); 9. Rủi ro; 10. Giai đoạn kế tiếp, đã bắt đầu.

## 9. Rủi ro

- **Art chất liệu chưa đạt khi không có artist.** Dự phòng: bạn thuê hoặc vẽ asset, hoặc duyệt ngân sách cho dịch vụ sau.
- **Thiếu clip tham chiếu hoặc retarget kém.** Dự phòng: animator người làm pose chính.
- **Điểm ảnh khác nhau giữa các máy.** Dự phòng: ngưỡng cảm nhận cho ảnh, bit-exact cho dữ liệu.
- **Mất ngữ cảnh khi chạy dài.** Dự phòng: `state.json`, `RESUME.md`, Resume prompt.
- **Làm `PROVISIONAL` quá xa rồi bị chấm thấp.** Nếu qua 2 giai đoạn mà HUMAN-QUEUE chưa có điểm, agent vẫn tiếp tục nhưng ghi nhãn «rủi ro làm lại» trong báo cáo.
- **Evidence phình to.** Giới hạn: ảnh và JSON nhỏ trong Git, media nặng ngoài Git.
- **Kỳ vọng «hoàn hảo».** Dừng theo ngưỡng đã khóa; phần diễn xuất đỉnh cao nhiều khả năng cần người.

## 10. Prompt giao việc

### 10.1. Prompt chính (dán cho AI)

```
Bạn là kỹ sư trưởng kiêm giám đốc kỹ thuật hoạt hình, tiếp quản dự án Paper Studio.
Repo: https://github.com/maitoan2408/ai-animation-studio-research-content
Làm trên nhánh mới tạo từ `codex/quality-motion-contracts` (PR #6). Giữ nguyên baseline cũ.

MỤC TIÊU
Phim hoạt hình 2D/2.5D có hồn (diễn xuất đọc được, có trọng lượng), vật lý đúng, hình ảnh có chất liệu giấy và ánh sáng (không phải hình khối vẽ bằng code), ổn định và tái lập được. AI điều phối bằng Performance Script, không viết từng frame.

ĐỌC TRƯỚC
AGENTS.md, docs/quality/state.json, RESUME.md (nếu có), docs/quality/REVIEW-2026-11-14.md, NEXT-STEPS.md, standard.md, ISSUES.md, và tài liệu «Kế hoạch V2» (Mục 1–9).

CÁCH LÀM VIỆC (BẮT BUỘC)
1. Chạy liên tục F0 → F9 theo state.json. Không hỏi lại, không chờ xác nhận. Cuối mỗi giai đoạn viết báo cáo docs/reports/F<n>.md (mẫu Mục 8), cập nhật state.json và RESUME.md, commit, push, rồi bắt đầu ngay giai đoạn kế tiếp.
2. Vướng thông tin: áp dụng giao thức tra cứu (Mục 2). Tìm nguồn gốc, kiểm trên phiên bản thật, ghi docs/research/. Không bịa API, số liệu, license, trích dẫn, URL. Chưa xác minh được thì ghi UNVERIFIED, thiết kế thí nghiệm đo, rồi đi tiếp bằng phương án an toàn.
3. Vướng quyết định chỉ người làm được (art, nghe giọng, quyền, LICENSE): chọn đường mặc định ngân sách 0, ghi PROVISIONAL, thêm vào docs/quality/HUMAN-QUEUE.md, đi tiếp. Không dừng chờ.
4. Lỗi: tối đa 3 lần sửa mỗi vấn đề, mỗi lần một cách khác. Vẫn lỗi thì BLOCKED, ghi nguyên nhân giả thuyết, chuyển task độc lập khác. Mỗi lỗi đã gặp phải có test tái hiện trước khi sửa.
5. Dừng cứng chỉ khi: cần chi tiền hoặc dịch vụ trả phí; dùng media không rõ quyền; thao tác Git phá hủy (force-push, viết lại lịch sử, xóa branch); lộ secret; hành động ngoài repo.
6. Liêm chính: không tự duyệt nghệ thuật hay nghe; không đổi ngưỡng sau khi thấy kết quả; không xóa evidence FAIL; không báo PASS khi NOT_RUN; review của bạn ghi delegated-agent.
7. Chất lượng: thực hiện đủ 12 điều kiện ở Mục 3; dữ liệu bit-exact, điểm ảnh theo ngưỡng cảm nhận đã hiệu chỉnh; khóa mọi phiên bản; media nặng ngoài Git thường; commit nhỏ, push branch, không tự merge.
8. Dùng vòng nhanh khi sáng tạo, vòng đầy đủ cho bản cuối mỗi giai đoạn.

KẾT THÚC
Khi hết task độc lập, viết báo cáo tổng hợp docs/reports/FINAL.md: kết quả theo từng trục chất lượng, những gì còn mở, danh sách HUMAN-QUEUE đang chờ.
```

### 10.2. Resume prompt (khi phiên mới tiếp quản)

```
Tiếp tục dự án Paper Studio. Đọc docs/quality/state.json, RESUME.md, HUMAN-QUEUE.md và báo cáo giai đoạn gần nhất trong docs/reports/. Đọc điểm người chấm mới (nếu có) trong HUMAN-QUEUE và biến điểm dưới 4 thành task sửa. Rồi chạy task TODO kế tiếp theo đúng hợp đồng tự chủ và giao thức tra cứu của Kế hoạch V2. Không hỏi lại, không bịa, không tự duyệt nghệ thuật.
```
