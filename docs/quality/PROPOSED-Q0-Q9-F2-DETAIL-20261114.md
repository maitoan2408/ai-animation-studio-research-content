# Kế hoạch chuẩn Paper Studio: Q0–Q9, đạt hồn, vật lý và chất liệu giấy

Cập nhật 14/11/2026 · Căn cứ: `docs/execution/NEXT-PLAN.md`, `production/brief/Q0-brief.md`, PR #7 `codex/v2-continuous` (head `0ac23f8`) · Thay các bản V2 và V3

Đây là kế hoạch duy nhất: giữ xương sống Q0–Q9 của repo, chèn phần nâng chất lượng (F0–F9) vào Q2 trước khi mở Q3, và gom mọi quy tắc cùng ngưỡng chất lượng vào một chỗ.

## Trạng thái mới nhất (sau commit `0ac23f8`, 14/11/2026)

Agent đã đọc kế hoạch này, lưu thành `PROPOSED-Q0-Q9-20261114.md`, đối chiếu trong `PLAN-REVIEW-20261114.md` và áp dụng có chọn lọc. 16 commit mới đưa F1 tới mức PASS kỹ thuật và F2 tới mức spike. Mình chạy lại độc lập: typecheck đạt, 69 test TypeScript đạt, 35 test Python đạt.

| Giai đoạn | Trạng thái | Ghi chú |
| --- | --- | --- |
| F0 | PASS\_TECHNICAL\_PROVISIONAL | Còn thiếu mẫu báo cáo, `lint_report`, đồng bộ `nextAction` |
| F1 | PASS\_TECHNICAL\_PROVISIONAL, có giới hạn | Drift chân đo cả world và screen; gate trước khi xuất native S05 (ground, ownership, alpha 2D); cut S06 → S05 khai báo tạm. Còn thiếu va chạm 3D, owner từ scene contract, duyệt ý đồ cut |
| F2 | IN\_PROGRESS | Spike torso Mai có độ dày giấy; frame 108 của S05 phẳng và có khối; pack draft 156 asset (3 miệng, 18 đầu biểu cảm); thử bóng receiver. Chưa có styleframe đủ gate, chưa có ánh sáng toàn cảnh |
| F3 | Chưa mở (đúng gate) | Chờ styleframe của F2 |

**Mình đã sửa trong kế hoạch này:**

1. Thứ tự thực của R2 là **S06 → S05**, không phải S05 → S06 như bản trước ghi nhầm (agent đã bắt đúng lỗi này).
2. Ngưỡng: hợp đồng F1 giữ 1 px (gate xuất native), Q0 giữ 2 px (gate chấp nhận). Cả hai giữ nguyên, không hạ ngưỡng nào; khi cả hai áp dụng thì ngưỡng chặt hơn quyết định.
3. Quy tắc 7 và 13 (Mục 2) đổi sang hướng tương thích: không gộp hay xóa state cũ, và chỉ giảm dung lượng evidence qua ADR có kiểm tra tương thích. Lý do: agent đã nêu rủi ro làm hỏng bằng chứng và công cụ hiện có, và mình đo thấy khoảng 90% evidence là `source.zip` snapshot từng attempt.

**Nhận xét của mình về hình ảnh** (chưa phải điểm chấm của bạn): ảnh S05 có viền dày, highlight cạnh và bóng nhẹ, nhưng toàn cảnh vẫn phẳng kiểu vector, nền chưa có ánh sáng hay chiều sâu, hai nhân vật vẫn đứng yên. Nó đúng hướng nhưng chưa tới đích Q0 («mép cắt bất quy tắc, texture tinh, bóng mềm cùng hướng»).

**Việc cần bạn làm ngay (HQ-02, khoảng 15 phút):** mở `production/artifacts/quality/v2-f2/s05-scene/flat.png` và `production/artifacts/quality/v2-f2/receiver-only/volume.png`, chấm 1–5 theo rubric ở Mục 8 và ghi vào `HUMAN-QUEUE.md`. Lưu ý: repo đang gắn HQ-04 (operator) vào F9, còn kế hoạch này gắn vào Q2-HANDOFF; nội dung không đổi.

## 1. Mục tiêu và chuẩn chất lượng

Mục tiêu: một studio nội bộ tạo hoạt hình paper-cut/multiplane từ kịch bản, có nguồn sửa được, kiểm thử, review và phục hồi. Pilot là **The Last Lantern**, 72 giây, 1728 frame, 1920×1080, 24 fps; bộ benchmark sáu shot 48 giây là bộ thử riêng, không thay pilot.

Chuẩn dưới đây lấy từ Q0 brief đã khóa (`lantern-brief-1`) và hợp đồng vật lý của PR #6. Mọi trục phải đạt cùng lúc, và bạn là người duyệt cuối.

| Trục | Chuẩn đạt | Nguồn |
| --- | --- | --- |
| Hồn (diễn xuất) | Mỗi shot ≥ 80/100 theo rubric (art 30%, acting 35%, layout 15%, continuity 10%, sửa 10%); art và acting mỗi nhóm ≥ 4/5; không lỗi chặn. Có anticipation 6–12 frame, chuyển trọng lượng, giảm tốc trước khi dừng, eye-line có mục tiêu | Q0 §2, §5 |
| Vật lý | Contact/foot marker ≤ 2 px ở 1080p, đo cả world và screen; chân trụ giữ world position; grip giữ cùng anchor, place trước release; mô phỏng lệch giải tích ≤ 2% (chu kỳ, rơi) và ≤ 10% (nảy); không xuyên vật; dữ liệu bake giống hệt (hash) | Q0 §5, `physics-contract.json` |
| Hình ảnh | Mảng giấy có mép cắt hơi bất quy tắc, texture tinh, bóng mềm cùng hướng; silhouette đọc được khi bỏ texture; không viền đen dày đồng đều, không bộ phận giống placeholder; không răng cưa ở 1080p; art ≥ 4/5 | Q0 §1 |
| Âm thanh | −16 LUFS ±1 LU, true peak ≤ −1 dBTP, 48 kHz; transport ≤ 1 frame; cue dễ nhận ±2 frame; người nghe thật duyệt phát âm và prosody | Q0 §4 |
| Kỹ thuật, ổn định | Đúng số frame, kích thước, fps; decode đầy đủ; màu, kênh, loudness; seek ngược/ngẫu nhiên giữ trạng thái; CI chạy trên đúng source SHA | Q0 §5 |
| Giao nhận | Có source native, hash phụ thuộc, lệnh dựng; operator khác thật mở và sửa một note; người dùng nghiệm thu pilot | Q0 §5, Q2-HANDOFF, Q8, Q9 |

Hai lưu ý về chuẩn. Một, «hoàn hảo» không đo được: «đạt chuẩn» nghĩa là mọi hàng trên cùng đạt và được bạn duyệt. Hai, hợp đồng F1 đặt ngưỡng trượt chân 1 px (gate xuất native), chặt hơn ngưỡng 2 px của Q0 (gate chấp nhận). Cả hai giữ nguyên với phạm vi riêng; khi cùng áp dụng thì ngưỡng chặt hơn quyết định. Không hạ ngưỡng nào sau khi thấy kết quả.

## 2. Quy tắc bắt buộc

Mười sáu quy tắc dưới đây áp dụng cho mọi giai đoạn. Quy tắc 1–6 là nền kế thừa từ `NEXT-PLAN.md`; 7–16 bổ sung để chạy liên tục mà vẫn giữ chất lượng.

1. **Không làm lại, không mất lịch sử.** Giữ Q0, Q1, R0–R3 và mọi evidence FAIL. Thay đổi là revision mới. Không render lại toàn bộ chỉ để có log mới; chỉ sửa đúng dependency bị ảnh hưởng.
2. **Ghi trước khi chạy.** Mỗi task ghi task ID, phase, SHA nguồn/artifact/input, kết quả mong đợi, phép đo và phạm vi ảnh hưởng. Chạy bằng `scripts/run-step.py`.
3. **FAIL thì giữ nguyên.** Giữ bằng chứng, xác định nguyên nhân, viết kế hoạch sửa (file và shot bị ảnh hưởng, regression), sửa, chạy lại phần liên quan.
4. **Đồng bộ trạng thái.** Cập nhật state, gate, issues, RESUME; commit và push; xác nhận remote SHA. CI phải chạy trên đúng source SHA; commit chỉ tổng kết phải ghi rõ không đổi runtime.
5. **Liêm chính.** Review của AI ghi `delegated-agent`, test tổng hợp ghi `automated-test`. Ghi `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN` đúng sự kiện. Exit 0, file tồn tại hay checkbox không chứng minh đã nghe, xem đủ, được bạn duyệt hay handoff độc lập.
6. **Không đổi ngưỡng sau khi thấy kết quả**, không tự điền accepted, không tạo reviewer giả. AI mới tự kiểm khả năng nghe và xem của chính nó, không sao chép kết luận «không nghe được» của phiên trước.
7. **Một nguồn trạng thái hiện hành.** Mục `v2` trong `docs/quality/state.json` giữ hàng đợi task (phụ thuộc, trạng thái, số lần thử, `nextAction`). Các trường cũ ở mức trên cùng và các file state khác giữ nguyên để tương thích, nhưng phải ghi `superseded` và trỏ về mục hiện hành; không để `nextAction` cũ mâu thuẫn. Không gộp, xóa hay đổi namespace state khi chưa kiểm tương thích với bằng chứng và công cụ đang dùng. `RESUME.md` sinh từ state.
8. **Chạy liên tục.** Làm tuần tự theo hàng đợi, không hỏi lại và không chờ xác nhận giữa các task. Cuối mỗi giai đoạn: báo cáo theo mẫu cố định (Mục 8), commit, push, rồi sang giai đoạn kế tiếp ngay.
9. **Gate chỉ người làm được** (art, nghe giọng, operator, nghiệm thu, LICENSE): chọn đường mặc định ngân sách 0, ghi `PROVISIONAL`, thêm vào `HUMAN-QUEUE.md`, đi tiếp. Tuyệt đối không tự đóng gate đó.
10. **Lỗi và chống dừng.** Tối đa 3 lần sửa mỗi vấn đề, mỗi lần một cách khác; vẫn lỗi thì `BLOCKED`, ghi giả thuyết nguyên nhân, chuyển task độc lập khác. Task dài hơn một phiên phải chia nhỏ trước khi làm; commit sau mỗi task đạt; ghi `RESUME.md` ít nhất mỗi 30 phút làm việc.
11. **Dừng cứng chỉ khi:** cần chi tiền hay dịch vụ trả phí (trần API/GPU/license trả phí hiện là 0), dùng media không rõ quyền, thao tác Git phá hủy (force-push, viết lại lịch sử, xóa branch), lộ secret, hành động ngoài repo. Không tự merge, không publish.
12. **Tra cứu, không bịa.** Thiếu thông tin thì tìm nguồn gốc trước (tài liệu chính thức, mã nguồn, LICENSE, bài báo), kiểm trên phiên bản đang dùng, cần ≥ 2 nguồn độc lập cho khẳng định không tầm thường. Ghi `docs/research/` với `VERIFIED`, `PARTIAL` hoặc `UNVERIFIED`; `UNVERIFIED` thì thiết kế thí nghiệm đo. Cấm bịa API, số liệu, license, trích dẫn, URL.
13. **Evidence gọn mà vẫn truy vết được.** Đo ở PR #7: khoảng 90% dung lượng evidence là `source.zip`, snapshot cả cây nguồn cho từng attempt (F2 có 114 zip, 67 MB, chỉ 90 bản khác nhau). Cải tiến cho phép: lưu snapshot theo hash nội dung (một bản cho nhiều attempt) và tham chiếu commit SHA khi cây làm việc sạch; chỉ đổi cơ chế sau khi có ADR và test tương thích với evidence và công cụ hiện có. Mục tiêu đề xuất: evidence mới mỗi giai đoạn ≤ 25 MB (đổi bằng ADR); media nặng ngoài Git thường kèm manifest và hash; không viết lại lịch sử.
14. **Ước lượng chỉ sau khi đo.** Không hứa số tuần hay giá mỗi phút khi chưa có mẫu đo thật, đơn giá và duration được duyệt.
15. **Tất định hai tầng.** Dữ liệu bake và pose giống hệt từng bit, có hash. Điểm ảnh dùng ngưỡng cảm nhận (SSIM, ΔE) đã hiệu chỉnh; không suy byte-identical giữa các GPU khi chưa đo. Khóa phiên bản (lockfile, Chromium, FFmpeg, Blender, model giọng kèm hash, cờ render).
16. **Critic phải có việc thật để bắt.** Ngoài lỗi chèn cố ý, cần ca có chân đổi stance và seam giữa hai shot thật. Mỗi lỗi đã gặp có test tái hiện trước khi sửa; test chập chờn được coi là lỗi.

## 3. Bản đồ giai đoạn

Bộ xương là Q0–Q9 của repo, nối với P0–P11 của Word gốc. F0–F9 là các giai đoạn nâng chất lượng chèn vào Q2; chúng thay các nhãn U0–U8 và T01–T12 cũ.

| Word | Q | Nội dung | Trạng thái 14/11 | Nâng chất lượng (F) |
| --- | --- | --- | --- | --- |
| P0 | Q0 | Brief, reference, rubric, output | DONE\_DELEGATED (`lantern-brief-1`) | không |
| P2, P7 | Q1 | Art pack, styleframe, giọng nói | Art phát triển đã có; chưa nghe voice | F2, F6 |
| P0–P3 | Q2 | Sáu shot, hai vòng sửa, review, handoff, performance | IN\_PROGRESS | F0–F7, F9 |
| P3 | Q3 | ADR backend và phạm vi | NOT\_STARTED | F7 cấp dữ liệu |
| P4, P5 | Q4 | Contracts, registry, migration | NOT\_STARTED | không |
| P6, P7 | Q5 | Acting, voice, cue, stems trong sản phẩm | NOT\_STARTED | F3–F6 là nền |
| P8 | Q6 | Workflow sửa, trợ lý hữu hạn | NOT\_STARTED | F8 thuộc về đây |
| P9 | Q7 | QC, serving/cache, recovery | NOT\_STARTED | không |
| P10 | Q8 | Pilot 72 giây, hai vòng sửa | NOT\_STARTED | không |
| P11 | Q9 | Release nội bộ | NOT\_STARTED | không |
| — | F01–F11 | Nhánh có điều kiện | NOT\_STARTED / CONDITIONAL | không |

F0 là nền ổn định (xong kỹ thuật). F1 là nối shot và critic độc lập. F2 là art và chất liệu (F2a spike thị giác, F2b diorama đủ cảnh). F3 là lõi chuyển động và lớp sống. F4 là vật lý mở rộng. F5 là diễn xuất từ tham chiếu. F6 là âm thanh. F7 là so sánh A/B backend. F8 là Director. F9 là hero và đóng Q2.

Hai chỗ bản V2 và V3 lệch kế hoạch gốc đã được sửa ở đây: pilot 72 giây thuộc Q8, không thuộc F9 (F9 chỉ đóng Q2); Director và trợ lý thuộc Q6, sau khi có contracts Q4, không chạy trước.

## 4. Q0 và Q1: giữ và đóng nốt

**Q0 (giữ nguyên).** Brief `lantern-brief-1`, pilot, rubric, profile đầu ra và nhánh free/local đã khóa. Đổi brief chỉ bằng revision riêng, nêu rõ ảnh hưởng tới A/B. Đích hình ảnh của Q0 (mảng giấy mép bất quy tắc, texture tinh, bóng mềm cùng hướng) chính là chuẩn «không giống vẽ bằng code» của bạn.

**Q1-ART (đóng bằng F2).** Q1 chỉ đóng khi có art pack và styleframe thực được review. Pack hiện tại (64 SVG gốc và 117 asset polish) là art phát triển, chưa phải art được duyệt. F2 dựng nó thành diorama giấy có độ dày, ánh sáng, bóng (Mục 5). Điều kiện đóng: styleframe 1080p được bạn chấm ≥ 4/5 (HQ-02).

**Q1-VOICE (đóng nốt phần nghe).** Phụ thuộc audio thật của R0/R1/R2 và một người hoặc công cụ thực sự nghe được. Nghe WAV gốc và bản chuẩn hóa, so với transcript; kiểm phát âm, prosody, ngắt câu, âm cuối; ưu tiên câu dài của R1/S01. Tách số đo (LUFS, true peak, lag) khỏi nhận xét nghe; không suy giọng tự nhiên từ RMS, tương quan PCM hay STT đúng chữ. Đổi voice hoặc cue thì làm revision mới, hash transcript và audio, kiểm mọi shot phụ thuộc, không cắt hay tăng tốc âm thầm.

Chưa ai nghe được thì ghi `BLOCKED`, chuẩn bị WAV, transcript, timecode và phiếu nhận xét, rồi làm việc độc lập khác; không đóng gate nghe bằng test kỹ thuật. Đạt khi: reviewer thật đã nghe và ghi lý do từng câu, −16 LUFS ±1 LU, TP ≤ −1 dBTP, transport ≤ 1 frame, cue ±2 frame.

## 5. Q2: nâng chất lượng và đóng gate

Q2 là nơi chất lượng hình và chuyển động được quyết định, nên toàn bộ phần nâng cấp F0–F9 nằm ở đây. Hình ảnh đứng trước chuyển động vì đổi art thì rig và bóng đổi theo, mọi thứ sau sẽ phải làm lại. Thứ tự chạy:

| Thứ tự | Task | Trạng thái (sau `0ac23f8`) |
| --- | --- | --- |
| 1 | Q2-RESUME + F0: nền ổn định | PASS\_TECHNICAL\_PROVISIONAL; còn mẫu báo cáo, lint, đồng bộ nextAction |
| 2 | F2a: spike thị giác | PARTIAL: spike torso và frame 108 có khối; còn bóng theo layer, ánh sáng toàn cảnh, styleframe |
| 3 | F1: nối shot và critic độc lập | PASS\_TECHNICAL\_PROVISIONAL, có giới hạn |
| 4 | F2b: diorama đủ S05, style bible | Một phần: 3 miệng và 18 đầu biểu cảm draft; chưa đủ 8 viseme và 6 biểu cảm được duyệt |
| 5 | F3: lõi chuyển động và lớp sống | Chưa mở (chờ styleframe) |
| 6 | F4: vật lý mở rộng | Chưa |
| 7 | Q2-REFERENCE + F5: tham chiếu và diễn xuất | Chưa (BLOCKED nếu thiếu clip) |
| 8 | Q1-VOICE + F6: voice, viseme, foley | Chưa (chờ người nghe) |
| 9 | F7: so sánh A/B cùng BakeFile | Chưa |
| 10 | Q2-REVIEW + F9: hero S05 và sáu shot | Chưa |
| 11 | Q2-REPAIR | Chưa |
| 12 | Q2-HANDOFF | Chưa (cần operator khác) |
| 13 | Q2-PERF | Chưa |

**F2a: spike thị giác (ngay sau F0, tối đa một phiên).** Chọn một asset có hash (Mai, hoặc đèn kèm nền). Parse SVG bằng `ShapePath.toShapes()`, không dùng `createShapes` (đã deprecated từ r185; đọc mã Three 0.187 đang cài để xác minh). Đùn độ dày giấy, thêm vật liệu giấy, một đèn định hướng, bóng đổ mềm, contact shadow. Kiểm path, fill, stroke, mask, alpha và pivot bằng fixture, so với bản phẳng. Kiểm kê hiện có cho thấy 116/117 asset dùng filter, 58 có stroke, 51 có ảnh nhúng, 28 có opacity, nên hiệu ứng nào không biểu diễn được phải ghi capability gap hoặc giữ texture plate có độ dày, không bỏ âm thầm. Texture giấy chỉ dùng nguồn đã xác minh license hoặc tự tạo bằng thủ tục. Đầu ra: styleframe 1080p cùng pose và ánh sáng với bản phẳng, kèm ảnh cận cạnh giấy, đưa vào HQ-02. Qua khi styleframe tồn tại, không răng cưa hay viền vỡ, rig còn dùng được; lặp tối đa 3 lần bằng cách khác rồi ghi `PARTIAL`.

**Tiến độ F2a (sau `0ac23f8`).** Đã có: spike torso Mai bằng `ShapePath.toShapes()` và `ExtrudeGeometry` dày 3 đơn vị, mặt trước raster từ SVG trong Chromium để giữ hình vẽ và filter, texture cạnh sinh bằng thủ tục, pivot lấy từ manifest; render frame 0, 108, 191 của S05 ở dạng phẳng và có khối (31 sprite nhân vật và đạo cụ được đùn, nền và bóng cũ còn là plate phẳng); kiểm toán học pivot cho 22 asset và contour cho 79 asset foreground. Lần render bị che sprite (attempt 1) được giữ cùng evidence sửa.

**Còn lại để đóng F2a** (đi thẳng vào hướng đích Q0 §1): (1) bóng theo từng layer và contact shadow thật, thay cho một receiver chung có nguy cơ double shadow; (2) ánh sáng định hướng toàn cảnh, gồm cả nền (hiện là plate phẳng); (3) mép giấy cắt hơi bất quy tắc và texture sợi trên mặt giấy (mặt trước hiện vẫn là raster vector phẳng); (4) chiều sâu theo lớp để các bộ phận chồng nhau đổ bóng lên nhau; (5) styleframe 1080p đủ gate kèm ảnh cận cạnh giấy, đưa vào HQ-02. Mỗi mục có tiêu chí qua riêng trong báo cáo; lặp tối đa 3 lần bằng cách khác nhau rồi ghi `PARTIAL`.

**F1: đóng tối thiểu (xong ở mức kỹ thuật, còn giới hạn).** Đã có: drift chân đo theo world và screen (xử lý được zoom), kiểm S02 với hai chân xen kẽ, gate trước khi xuất native S05 (ground, ownership, alpha 2D ngưỡng 128), cut S06 → S05 khai báo tạm. Thứ tự thực của R2 là **S06 → S05** (benchmark độc lập bị đổi thứ tự), nên seam chỉ kiểm theo thứ tự thực và chỉ coi là cut hay continuation theo contract. Còn thiếu: owner lấy từ scene contract (hiện là fixture tạm), proxy va chạm thực hoặc 3D (hiện chỉ alpha 2D và bounds), quyết định ý đồ seam, đổi tên metric cũ hoàn toàn. F1 qua không có nghĩa mở được F3; F3 vẫn chờ styleframe của F2.

**F2b: art và chất liệu đủ cảnh.** Style bible (palette, độ dày giấy, ánh sáng, tỉ lệ), 8 viseme, 6 biểu cảm, diorama đủ cảnh S05. So ba hướng nguồn art: A artist vector (cần người, `BLOCKED` nếu chưa có), B ảnh từ model chạy cục bộ (chỉ khi license và quyền rõ), C dựng diorama trong Three hoặc Blender (agent tự làm được, chạy trước). Cổng: bạn chấm styleframe ≥ 4/5; Q1-ART đóng tại đây.

**F3: lõi chuyển động và lớp sống.** MotionClip tham số hóa; lớp sống tất định theo seed (thở, chớp mắt, dịch trọng tâm, đầu và mắt theo mục tiêu); sáu hành động nền (đi, nhấc, đặt, quay đầu, chào, ngã nhẹ) với anticipation 6–12 frame, overshoot, follow-through, arcs, hold, on-twos; chân trụ giữ world, torso chuyển trọng lượng, không dùng bob sin thay bước chân. Tra cứu: nhịp chớp mắt và nhịp thở. Cổng: chỉ số hỗ trợ (ease, overshoot, anticipation, hold, jerk) đạt, và bạn chấm timing, trọng lượng ≥ 4.

**F4: vật lý mở rộng.** Chuỗi xương tóc, áo, dây (so joint của Rapier2D với Verlet tự viết, tiêu chí khóa trước); vùng va chạm nhân vật; ràng buộc tay–đạo cụ; tiếp đất thật; sự kiện va chạm tách `measured` và `authored`. Cổng: test giải tích, ổn định khi chạy dài, hash bake khớp trên 2 runner, critic F1 xác nhận không xuyên vật.

**Q2-REFERENCE + F5: tham chiếu và diễn xuất.** Chọn video tham chiếu có URL, timestamp, provenance cho bước/dừng, trọng lượng khi cầm và đặt, handoff, reaction, camera/depth; chỉ để học, không lấy asset của tác giả. Mô tả điều cần đạt và lỗi chặn ở từng beat; không dùng blocking nội bộ làm chuẩn duy nhất. Pipeline: clip hợp pháp → pose estimation có confidence → retarget 2D → làm sạch → cường điệu và phong cách → MotionClip. Không có clip thì agent làm pose `PROVISIONAL` và đưa vào HQ-03. Tra cứu (chưa xác minh): MediaPipe, RTMPose, bộ mocap mở, SyncRig, về license và chất lượng. Cổng: sai số khớp, drift chân, timing so với clip gốc; bạn chấm hồn ≥ 4.

**Q1-VOICE + F6: âm thanh.** Giữ Kokoro làm giọng nháp `PROVISIONAL`; forced alignment → 8 viseme → cue sửa tay được; foley sinh từ sự kiện vật lý ±1 frame; nhạc và ambience chỉ từ nguồn có quyền hoặc tự tổng hợp; mix −16 LUFS ±1 LU, TP ≤ −1 dBTP. Tra cứu: Montreal Forced Aligner, Rhubarb, aligner dựa trên Whisper (license, hỗ trợ ngôn ngữ, độ chính xác đo thật; pilot là English). Cổng: cue ±2 frame, transport ≤ 1 frame, người nghe duyệt.

**F7: so sánh A/B công bằng.** Cùng BakeFile cho A (Three + HyperFrames) và B (Blender) trên cùng cảnh: chất lượng trước (hình, chuyển động), rồi khả năng sửa, công vận hành, tài nguyên, license, tái lập. B đã polish hai vòng còn A mới có blocking, nên phải bổ sung cho A cùng phạm vi trước khi kết luận; không đánh FAIL nhánh chưa thử. Preview và final so bằng SSIM/ΔE. Kết quả là dữ liệu cho Q3, chưa phải ADR.

**Q2-REVIEW + F9: hero và sáu shot.** Làm hero S05 tích hợp F2–F6, rồi xem đủ sáu shot ở 1× và 0,5×, sau đó cả sequence. Mỗi record ghi: artifact/master SHA, revision, shot, frame, mức lỗi, lý do, hành động sửa, người review, những gì thực đã xem hoặc nghe. Mapping R2: S01 16–24 s, S02 8–16 s, S03 24–34 s, S04 0–8 s, S05 40–48 s, S06 34–40 s. Review của AI là `delegated-agent`, chưa phải bạn duyệt.

**Q2-REPAIR.** Sửa theo note đã xác nhận, khóa before/after, lập tập shot/asset/cue bị ảnh hưởng trước, tạo revision mới, giữ R0–R2. Render native các take đổi, ghép sequence từ selection có hash, kiểm lại frame, timing, contact, audio, màu. Fail thì quay về nguồn art/rig/timing gây lỗi, không nới ngưỡng.

**Q2-HANDOFF.** Một operator khác thật mở native source, sửa một note cụ thể, save và mở lại, render phần ảnh hưởng, đo thời gian, ghi mọi trợ giúp. Native hiện là Blender VSE image strips và F-curves, không nhận là rig UI hay 3D tự do. Cùng AI chạy process mới không đạt gate độc lập.

**Q2-PERF.** Mỗi candidate hợp lệ: 3 cold + 5 warm, chạy riêng từng mẫu; đo load, convert, capture, encode, QC, peak RSS cả process tree, disk, lỗi và retry; giữ 8 mẫu thô, median và range; không suy SLA hay p95 từ 8 mẫu. Chỉ làm sau khi art và motion đã pass.

**Cổng thoát Q2 (điều kiện mở Q3).** Sáu shot đều ≥ 80/100, art và acting ≥ 4/5, không blocker, do reviewer thật xem đủ ở 1× và 0,5×; hero S05 đạt; Q1-ART và Q1-VOICE đã đóng; operator khác đã mở và sửa source; có bộ 3 cold + 5 warm; CI xanh trên đúng source SHA. Chưa đủ thì giữ Q2, không mở Q3.

## 6. Q3 đến Q9

Mỗi phase chỉ mở khi phase trước đạt gate. Mọi gate chất lượng ở Mục 1 vẫn áp dụng cho từng phase.

### Q3. ADR backend và phạm vi

**Việc chính:** so A (Three + HyperFrames) với B (Blender) bằng dữ liệu F7, ưu tiên chất lượng rồi tới khả năng sửa, công vận hành, tài nguyên, license, tái lập. Viết ADR có chọn, loại, giới hạn, fallback; FFmpeg giữ vai media, mix, QC. Khóa capability/error matrix, phạm vi Q4–Q9, đường replay v0.1, môi trường vận hành, ngân sách. Đưa chuyện serving khoảng 114 MB mỗi request vào thiết kế Q6/Q7. Chỉ khảo sát thêm công cụ khi giải một blocker cụ thể, kèm pin version, license và benchmark cùng brief.

**Cổng:** mỗi claim «supported» truy được tới evidence, không che gate thiếu bằng ADR. Chưa đủ dữ liệu thì giữ Q3 chưa hoàn tất.

### Q4. Contracts, registry, migration

**Việc chính:** chốt schema, version, ID, frame interval, thứ tự và đơn vị transform, camera, anchor/contact, màu và alpha, capability refusal. Ingest image, rig, native asset có source, rights, hash, revision bất biến, draft/approved, kiểm decode/bounds/anchor trước publish. Dependency graph chỉ ra shot stale; approval không tự truyền sang asset mới. Migration, export, import, replay có fixture v0.1.

**Cổng:** test dương và âm (thiếu file, hash sai, vòng phụ thuộc, đường dẫn không an toàn, anchor sai, ngoài range, không hỗ trợ); round-trip đúng dependency và version; source sửa lại được. **Fail:** sửa Q4 hoặc thu hẹp ADR Q3 có lý do, giữ schema cũ chạy được.

### Q5. Acting, voice, cue, stems trong sản phẩm

**Việc chính:** đưa các phase anticipate, reach, grip, lift, hold, place, release, foot lock, owner switch, gaze, reaction, settle, pose replacement vào contracts sản phẩm. Corpus 20–30 câu English (chậm, nhanh, silence, cảm thán, âm cuối) có hash, cue sửa tay được, review phát âm thật. Tách dialogue, music, ambience, SFX, mix có channel/gain/profile. Dựng lại sáu shot bằng pipeline sản phẩm và chuẩn bị action còn thiếu của pilot (sửa đèn, trạng thái dark/lit, mang đèn đi).

**Cổng:** contact ≤ 2 px ở 1080p trong interval đã khóa, không stretch che rig lỗi; transport ≤ 1 frame; cue theo ngưỡng; hình và voice được review đủ. **Fail:** quay về Q1 drawing/rig hoặc blocking/cue Q5, không thêm effect để che.

### Q6. Workflow sửa và trợ lý hữu hạn (Director = F8)

**Việc chính:** storyboard, animatic, điều khiển pose/camera/cue/duration/reorder, undo, revision, rollback. Preview và final dùng cùng evaluator, kiểm parity các frame được review (đóng EX-004). Compare/review đúng artifact và frame, hiển thị stale dependency, giữ regression EX-030/031. Trợ lý Director dùng công cụ hẹp theo allowlist, có `expectedRevision`, patch có phạm vi, capability refusal, trace và usage; không phát code frame; tối đa 3 vòng sửa mỗi shot. Corpus 20 task đúng và 20 task lỗi, đánh giá cả nội dung thực. Chưa có ngân sách hoặc credential của provider thì phần đó ghi `NOT_RUN` và tiếp tục workflow thủ công.

**Cổng:** sửa thoại, asset, pose, camera, reorder, rollback không mất phần không liên quan; conflict, cancel, unsupported, injection và browser recovery PASS; review nội dung thật. **Fail:** quay Q4, Q5 hoặc UX đúng nguyên nhân.

### Q7. QC production, serving/cache, recovery

**Việc chính:** đưa contracts màu, alpha, audio, frame, decode của Q2 vào QC production (EX-002 chỉ đóng khi đường publish chặn được negatives thật). Thiết kế serving/cache có giới hạn cho video lớn: server hiện đọc và hash khoảng 114 MB trước mỗi range request, nên đo seek, range, memory rồi chọn snapshot, stream hoặc cache; giữ SHA, test changed-after-start và corrupted content. Cache shot và stem có fingerprint đầy đủ (đóng EX-005). Fault matrix cho load, capture, encode, QC, publish: cancel, duplicate, restart, SIGKILL, corrupt cache, lỗi I/O, đầy disk trong sandbox; không publish partial. Backup và restore toàn history sang data directory mới; đo RPO, RTO trước khi cam kết.

**Cổng:** positives, negatives và fault recovery đúng; history và source nguyên vẹn; không silent fallback hay cache stale. **Fail:** quay Q4–Q7, không mở Q8.

### Q8. Pilot 72 giây và hai vòng sửa

**Việc chính:** làm p001–p008 của pilot (storyboard, animatic, blocking, animation, composite, mix, review); không nối sáu fixture rồi gọi là pilot. Đèn tối từ p001 đến p005, sáng từ p006; giữ continuity danh tính và đạo cụ. Hai vòng sửa có before/after, phạm vi, giờ thực, take bị loại, ảnh hưởng downstream của mọi thay đổi timing. Operator khác mở package, sửa note, render. Review cả phim, kèm corpus kịch bản ngoài benchmark. Tổng hợp công theo vai, compute, license, storage, retry; chỉ tính giá mỗi phút accepted khi mẫu số và đơn giá có căn cứ.

**Cổng:** bạn hoặc producer nghiệm thu, không blocker, source sửa lại được. **Fail:** art, acting, continuity quay Q1, Q5, Q6; media và vận hành quay Q7; giữ bản trước.

### Q9. Release nội bộ và tiếp quản

**Việc chính:** hoàn thiện README, setup, capabilities và phần không hỗ trợ, ADR, architecture, schema, API, `AGENTS.md`, `plan.md`, `skills.md`, runbook (lỗi, recovery, backup, upgrade), license/BOM, sample project, changelog; không ghi feature chưa có. Một operator khác chạy create → edit → render → review → export → restore → sửa lại trên môi trường vận hành; kiểm quyền truy cập, retention, quota, upgrade và rollback. Báo open issues theo severity, số đo capacity và cost, phần còn thủ công hoặc `NOT_RUN`.

**Cổng:** bạn duyệt release nội bộ; quy trình tiếp quản có evidence thật. Không tự merge, publish hay gọi dịch vụ trả phí. Thiếu gate thì giữ candidate có giám sát và quay Q7 hoặc Q8 đúng nguyên nhân.

## 7. Nhánh có điều kiện và việc khi bị chặn

Nhãn **F01–F11** (viết hai chữ số) là các nhánh tương lai trong `docs/toolchain-future-plan.md`, khác với F0–F9 (một chữ số) là các giai đoạn nâng chất lượng ở Mục 5. Trong báo cáo luôn viết F01, không viết F1, để tránh nhầm. Chỉ mở một nhánh khi có điều kiện của nó; mục chưa mở ghi `NOT_STARTED` hoặc `CONDITIONAL`, không xóa, không đổi thành DONE. Trần chi phí API, GPU, license trả phí hiện là 0.

| Nhánh | Điều kiện mở |
| --- | --- |
| F01 Styles | Style đầu của Q8 đã accepted và có brief mới |
| F02 Characters/rig | Có nhân vật hoặc góc mới, và Q4 đã có versioning |
| F03 Acting nâng cao | Action cơ bản đạt, note hoặc pilot cần thêm |
| F04 Multi-actor | S05 đạt và kịch bản cần |
| F05 Video dài | Pilot accepted, có brief dài, capacity đã đo |
| F06 Ngôn ngữ/voice | Có nhu cầu và quyền sử dụng cụ thể |
| F07 Editor/handoff | Note thực cần controls hoặc NLE |
| F08 Scale/recovery | Có bottleneck thực đo |
| F09 Reuse/cost | Có ít nhất 2 project thật |
| F10 Manim | Pilot có shot sơ đồ hoặc bản đồ cần; sửa EX-003 khi mở |
| F11 Generative assist | Bottleneck rõ, quyền dùng và ngân sách cụ thể |

Khi bị chặn, vẫn có việc hữu ích nhưng không được vượt gate:

| Thiếu | Việc vẫn làm | Chưa được nhận là xong |
| --- | --- | --- |
| Không nghe hoặc xem được video đầy đủ | Chuẩn bị file, cue, timecode, reference register, checklist, gói nhận xét; kiểm nguồn và hash | Duyệt nghe hoặc chuyển động đầy đủ; điểm art suy từ ảnh hay PCM |
| Chưa có operator độc lập | Hoàn thiện native package, deps/rights, hướng dẫn, bài tập sửa note; ghi mọi lần replay cùng agent | Handoff độc lập chỉ vì đổi process hay thư mục |
| Chưa qua art gate | Sửa đúng shot, viết spec đo, inventory runtime | Gọi bộ 3 cold + 5 warm là của candidate accepted, hoặc chọn backend cuối |
| Chưa có provider hay ngân sách | Corpus, schema, eval offline, công cụ thủ công | Provider hay LLM đã PASS, hoặc chi phí bằng 0 cho phần chưa chạy |
| Không có quyền push | Hoàn tất commit và evidence local, ghi lỗi quyền cụ thể | «Đã lên Git» khi remote SHA chưa khớp |

Mỗi blocker ghi: thiếu gì, ai hoặc vai nào cung cấp, artifact đã sẵn sàng, điều kiện để tiếp tục. Không lặp vòng cài và test baseline đã PASS để thay cho việc bị chặn.

## 8. Hàng đợi người duyệt và mẫu báo cáo

Agent không dừng chờ bạn, nhưng những việc dưới đây chỉ bạn làm được. Mỗi mục khoảng 15 phút. Bạn ghi điểm vào `HUMAN-QUEUE.md` hoặc nhắn trong chat; lượt chạy sau của agent đọc điểm và biến điểm dưới 4 thành task sửa. Chấm theo rubric Q0: art 30%, acting 35%, layout 15%, continuity 10%, sửa 10%, kèm timestamp và lý do.

| ID | Giai đoạn | Việc của bạn | Mặc định agent đã dùng | Hệ quả nếu điểm < 4 hoặc chưa có |
| --- | --- | --- | --- | --- |
| HQ-01 | F0 | Chọn LICENSE sau khi đọc đề xuất | Chưa cấp LICENSE | Có thể phải cập nhật thông báo phân phối |
| HQ-02 | F2 | Chấm styleframe 1080p (1–5) và duyệt nguồn art | Art phát triển, `PROVISIONAL` | Sinh task sửa art; Q1-ART chưa đóng |
| HQ-03 | F5, F6 | Xem clip ở 1× và 0,5× (có và không tiếng), nghe voice và foley; cung cấp clip tham chiếu | Pose và giọng nháp, chưa nghe, `NOT_RUN` | Sinh task sửa; gate nghe giữ mở |
| HQ-04 | Q2-HANDOFF | Chỉ định operator khác, clone sạch, sửa note, ghi hash và thời gian | Chưa có operator, `NOT_RUN` | Q2 không đóng |
| HQ-05 (mới) | Q8, Q9 | Nghiệm thu pilot và duyệt release nội bộ | Không có | Chỉ còn là candidate, không phải bản phát hành |

**Mẫu báo cáo cố định** (`docs/reports/F<n>.md` hoặc `Q<n>.md`, ≤ 1 trang, tiếng Việt, đúng thứ tự):

1. Trạng thái: một dòng, một trong `PASS`, `PASS_PROVISIONAL`, `PARTIAL`, `FAIL`, `BLOCKED`, `NOT_RUN`. Tiêu đề không được mâu thuẫn với trạng thái cuối.
2. Việc đã làm: danh sách commit.
3. Số đo: bảng lấy từ `metrics.json` do máy sinh (test, ngưỡng, kết quả), không gõ tay.
4. Hình và clip: đường dẫn, ảnh so cạnh.
5. Tra cứu: link tới `docs/research/` và các mục còn `UNVERIFIED`.
6. Quyết định (ADR) và đường `PROVISIONAL` đã chọn.
7. Lỗi, vướng mắc, cách xử lý, số lần thử.
8. Việc cần người (ID trong `HUMAN-QUEUE.md`).
9. Rủi ro và nợ.
10. Giai đoạn kế tiếp, đã bắt đầu.

`lint_report` kiểm: đủ 10 mục đúng thứ tự; có dấu cách giữa chữ và số (`Python 25`, không phải `Python25`); trạng thái cuối khớp tiêu đề; mọi con số đều có trong `metrics.json`. Số CI từ xa ghi kèm runId; không tự xác minh được thì ghi `NOT_RUN`.

**Checkpoint tiếp quản.** Mỗi checkpoint đủ để một agent mới tiếp tục: task và phase, source HEAD, hash đầu vào và đầu ra, kết quả mong đợi và quan sát, lệnh và runtime, lần thất bại và cách sửa, vai reviewer, giới hạn, đường dẫn artifact, next action và phụ thuộc, commit local và remote, CI SHA. Không có result thì ghi `INCOMPLETE`; kiểm process thật trước khi chạy lại; không xóa lock của writer đang sống.

## 9. Rủi ro và điểm cần bạn xác nhận

- **Art chưa đạt khi không có artist hay dịch vụ.** Dự phòng: bạn thuê hoặc vẽ asset, hoặc duyệt ngân sách cho dịch vụ.
- **Thiếu clip tham chiếu hoặc retarget kém.** Dự phòng: animator người làm pose chính.
- **Điểm ảnh khác nhau giữa các máy.** Dự phòng: ngưỡng cảm nhận cho ảnh, bit-exact cho dữ liệu.
- **Hết phiên giữa chừng.** Dự phòng: task nhỏ, commit sau mỗi task đạt, `RESUME.md` theo chu kỳ, Resume prompt.
- **Làm `PROVISIONAL` quá xa rồi bị chấm thấp.** Nếu qua 2 giai đoạn mà HUMAN-QUEUE chưa có điểm, agent vẫn tiếp tục nhưng ghi nhãn «rủi ro làm lại» trong báo cáo. Nên chấm sớm HQ-02 và HQ-03.
- **Ngân sách evidence làm mất khả năng truy vết.** Dự phòng: manifest và hash trong Git, giữ log FAIL; đổi cơ chế audit cần ADR.
- **Server review đọc và hash toàn video khoảng 114 MB trước mỗi range request.** Rủi ro có căn cứ trong code nhưng chưa đo thành lỗi; đo ở Q6/Q7.
- **Số CI từ xa chưa tự xác minh được.** Dự phòng: ghi runId, không xác minh được thì `NOT_RUN`.
- **Kỳ vọng «hoàn hảo».** Dừng theo ngưỡng đã khóa; phần diễn xuất đỉnh cao nhiều khả năng cần người.

* **Hình ảnh vẫn gần như phẳng dù có spike.** Dự phòng: làm đủ năm mục còn lại của F2a, tối đa 3 lần mỗi mục; nếu bạn vẫn chấm dưới 4 thì cần artist (hướng A) hoặc duyệt ngân sách.
* **Evidence phình theo từng attempt.** F2 và F1 thêm khoảng 111 MB evidence trong PR #7, phần lớn là `source.zip`. Dự phòng: ADR lưu snapshot theo hash, có kiểm tra tương thích trước khi đổi.
* **Agent áp dụng kế hoạch có chọn lọc.** Đây là hành vi hợp lý khi có rủi ro tương thích, nhưng cần ghi lý do không áp dụng (đã có trong `PLAN-REVIEW-20261114.md`). Kế hoạch này đã đổi quy tắc 7 và 13 để khớp.

**Cần bạn xác nhận trước khi chạy:**

1. Cho agent chạy tự chủ theo quy tắc 8–11 (Mục 2), hay giữ một điểm dừng ở cuối mỗi phase?
2. Giữ trần 0 cho dịch vụ trả phí, hay cho phép thuê artist hoặc dùng dịch vụ cho art (ảnh hưởng hướng A và B ở F2b)?
3. Ai là reviewer nghe English (HQ-03) và operator khác (HQ-04)?
4. LICENSE (HQ-01): đồng ý với đề xuất MIT của agent, hay chọn khác?
5. Chấp nhận ngân sách evidence 25 MB mỗi giai đoạn, hay đặt con số khác?

## 10. Prompt giao việc

### 10.1. Prompt chính (dán cho AI)

```
Bạn là kỹ sư trưởng kiêm giám đốc kỹ thuật hoạt hình, tiếp quản dự án Paper Studio.
Repo: https://github.com/maitoan2408/ai-animation-studio-research-content
Làm tiếp trên nhánh `codex/v2-continuous` (PR #7, head 0ac23f8); có thể tạo nhánh con. Giữ baseline cũ, không xóa evidence FAIL.

MỤC TIÊU
Studio nội bộ tạo hoạt hình paper-cut/multiplane từ kịch bản. Pilot The Last Lantern (72 giây, 1728 frame, 1920x1080, 24 fps). Chất lượng phải đạt: có hồn (diễn xuất đọc được, có trọng lượng), vật lý đúng, hình ảnh có chất liệu giấy, độ dày, ánh sáng và bóng mềm (không phải hình khối phẳng vẽ bằng code), âm thanh đạt chuẩn, ổn định và tái lập được. AI điều phối bằng Performance Script, không viết từng frame.

CHUẨN CHẤT LƯỢNG (Mục 1 của «Kế hoạch chuẩn», lấy từ production/brief/Q0-brief.md)
Mỗi shot >= 80/100 theo rubric art 30%, acting 35%, layout 15%, continuity 10%, sửa 10%; art và acting mỗi nhóm >= 4/5; không lỗi chặn. Contact và foot marker: gate xuất 1 px của F1, gate chấp nhận 2 px của Q0 ở 1080p; khi cùng áp dụng thì ngưỡng chặt hơn quyết định. Mô phỏng lệch giải tích <= 2% (chu kỳ, rơi), <= 10% (nảy); không xuyên vật. -16 LUFS +-1 LU, TP <= -1 dBTP, transport <= 1 frame, cue +-2 frame. Đúng frame, kích thước, fps; decode đầy đủ; CI trên đúng source SHA.

ĐỌC TRƯỚC (theo thứ tự)
AGENTS.md; docs/quality/state.json (mục v2); docs/execution/NEXT-PLAN.md; production/brief/Q0-brief.md và pilot.md; docs/quality/HUMAN-QUEUE.md và PLAN-REVIEW-20261114.md; docs/reports/F0.md, F1.md, F2.md; docs/research/*.md; «Kế hoạch chuẩn Paper Studio» (mọi mục, đặc biệt «Trạng thái mới nhất»).

TRẠNG THÁI XUẤT PHÁT
F0 và F1: PASS_TECHNICAL_PROVISIONAL. F2: IN_PROGRESS (spike torso Mai, frame 108 của S05 phẳng và có khối, pack draft 156 asset). F3 chưa mở.

VIỆC ĐẦU TIÊN (mỗi việc xong thì commit và push; không gộp hay xóa state cũ)
1. Đồng bộ trạng thái: cập nhật các trường cũ ở mức trên cùng của state.json (nextAction, baseline...) để không mâu thuẫn với mục v2, ghi superseded và trỏ về mục hiện hành. Sinh RESUME.md từ state.
2. Thêm mẫu báo cáo cố định (Mục 8), metrics.json do máy sinh và lint_report cho báo cáo từ nay; sửa lỗi số liệu và dấu cách trong báo cáo F0 đến F2 (ví dụ số test Python cũ).
3. Viết ADR giảm dung lượng evidence: snapshot nguồn theo hash nội dung hoặc tham chiếu commit SHA khi cây sạch; chỉ áp dụng sau khi test tương thích với evidence và công cụ hiện có. Mục tiêu <= 25 MB mới mỗi giai đoạn.

THỨ TỰ CHẠY
Tiếp F2: hoàn tất F2a (bóng theo layer và contact shadow, ánh sáng toàn cảnh gồm nền, mép giấy bất quy tắc và texture sợi, chiều sâu theo lớp, styleframe 1080p đủ gate) -> F2b (đủ 8 viseme, 6 biểu cảm, diorama đủ cảnh) -> đóng các mục còn thiếu của F1 khi cần -> F3 (chỉ mở khi có styleframe của F2) -> F4 -> Q2-REFERENCE + F5 -> Q1-VOICE + F6 -> F7 -> Q2-REVIEW + F9 -> Q2-REPAIR -> Q2-HANDOFF -> Q2-PERF. Chỉ mở Q3 khi đạt cổng thoát Q2; sau đó Q3 -> ... -> Q9 theo Mục 6. Pilot 72 giây thuộc Q8, Director thuộc Q6. Thứ tự thực của R2 là S06 -> S05.

QUY TẮC BẮT BUỘC (chi tiết ở Mục 2, 16 quy tắc)
- Chạy liên tục, không hỏi lại. Cuối mỗi giai đoạn viết báo cáo theo mẫu cố định, cập nhật state và RESUME.md, commit, push, rồi sang giai đoạn kế tiếp ngay.
- Gate chỉ người làm được (art, nghe giọng, operator, nghiệm thu, LICENSE): chọn đường mặc định ngân sách 0, ghi PROVISIONAL, thêm vào docs/quality/HUMAN-QUEUE.md, đi tiếp. Không tự đóng gate đó, không tạo reviewer giả.
- Vướng thông tin: tra cứu nguồn gốc, kiểm trên phiên bản thật, ghi docs/research/ với VERIFIED, PARTIAL hoặc UNVERIFIED. Không bịa API, số liệu, license, trích dẫn, URL. UNVERIFIED thì thiết kế thí nghiệm đo.
- Lỗi: tối đa 3 lần sửa mỗi vấn đề, mỗi lần một cách khác; vẫn lỗi thì BLOCKED rồi chuyển task độc lập. Mỗi lỗi có test tái hiện trước khi sửa. Task dài hơn một phiên phải chia nhỏ; ghi RESUME.md ít nhất mỗi 30 phút.
- Liêm chính: không đổi ngưỡng sau khi thấy kết quả; không báo PASS khi NOT_RUN; số liệu trong báo cáo lấy từ lần chạy thật; review của bạn ghi delegated-agent.
- Được áp dụng kế hoạch có chọn lọc khi có rủi ro tương thích, nhưng phải ghi lý do không áp dụng.
- Dừng cứng chỉ khi: cần chi tiền hoặc dịch vụ trả phí, media không rõ quyền, thao tác Git phá hủy, lộ secret, hành động ngoài repo. Không tự merge, không publish.
- Không render lại toàn bộ chỉ để có log mới; giữ R0-R2 và evidence FAIL; mọi thay đổi là revision mới.

KẾT THÚC
Khi hết task độc lập, viết docs/reports/FINAL.md: kết quả theo từng trục chất lượng, những gì còn mở, danh sách HUMAN-QUEUE đang chờ.
```

### 10.2. Resume prompt (khi phiên mới tiếp quản)

```
Tiếp tục dự án Paper Studio theo «Kế hoạch chuẩn». Đọc docs/quality/state.json, RESUME.md, HUMAN-QUEUE.md và báo cáo gần nhất trong docs/reports/. Nếu HUMAN-QUEUE có điểm của người chấm, biến điểm dưới 4 thành task sửa. Tự kiểm khả năng nghe và xem của chính bạn, không sao chép kết luận của phiên trước. Rồi chạy task kế tiếp theo thứ tự ở Mục 5 và Mục 6, đúng 16 quy tắc ở Mục 2 và mẫu báo cáo cố định. Không hỏi lại, không bịa, không tự duyệt nghệ thuật.
```

### 10.3. Prompt tiếp tục F2 (hình ảnh)

```
Tiếp tục F2 theo «Kế hoạch chuẩn». Spike hiện có: torso Mai và frame 108 của S05 (phẳng và có khối). Còn thiếu: bóng chỉ là một receiver chung, nền là plate phẳng, mặt giấy vẫn là raster vector phẳng.

Làm theo thứ tự, mỗi mục có tiêu chí qua khóa trước và test riêng:
1. Bóng theo từng layer và contact shadow thật (không double shadow); so combined với receiver-only.
2. Ánh sáng định hướng toàn cảnh gồm cả nền, nhất quán một hướng.
3. Mép giấy cắt hơi bất quy tắc (nhiễu contour có seed, không làm hỏng pivot và rig) và texture sợi trên mặt giấy (bump hoặc normal map thủ tục, hoặc nguồn đã xác minh license).
4. Chiều sâu theo lớp để các bộ phận chồng nhau đổ bóng lên nhau.
5. Styleframe 1080p cùng pose và cùng ánh sáng với bản phẳng, kèm ảnh cận cạnh giấy, rồi thêm vào HUMAN-QUEUE (HQ-02).

Không tự duyệt nghệ thuật; mỗi vấn đề tối đa 3 lần thử bằng cách khác nhau; evidence nhỏ; không thay renderer hay art nguồn. Xong thì viết báo cáo theo mẫu cố định, commit, push và sang F2b ngay.
```

## 11. F2: kế hoạch hoàn tất chi tiết

**Mục tiêu duy nhất.** Biến cảnh S05 từ vector phẳng thành diorama giấy có độ dày, ánh sáng và bóng mềm đúng Q0 §1, để bạn chấm styleframe ≥ 4/5 (HQ-02) và đóng Q1-ART. Việc nào không làm hình đẹp hơn một cách nhìn thấy được thì không thuộc F2.

### 11.1 Định nghĩa «xong» (DoD)

F2 xong kỹ thuật (`PASS_PROVISIONAL`) khi đủ cả bảy mục. F2 đóng hẳn, và Q1-ART đóng, khi bạn chấm ≥ 4/5.

1. **Look preset v1:** một file cấu hình duy nhất chứa mọi tham số ánh sáng, bóng, vật liệu, độ dày, nhiễu mép và seed.
2. **Styleframe 1080p:** frame 0, 108, 191 của S05, cùng pose và cùng camera với bản phẳng, kèm 3 ảnh cận cạnh (mặt Mai, tay và đèn, chân và nền đất) và một ảnh so cạnh phẳng/final.
3. **Checklist Q0 §1** (Mục 11.8): mỗi dòng PASS hoặc FAIL kèm ảnh dẫn chứng.
4. **Không lỗi kỹ thuật nhìn thấy:** không răng cưa hay viền vỡ ở crop 1080p, không double shadow, không nhấp nháy trong chuỗi 192 frame, seek ngẫu nhiên giữ nguyên ảnh.
5. **Parity màu:** palette Q0 giữ trong dung sai đã khóa, ánh sáng không làm lệch màu.
6. **Rig và pivot vẫn dùng được:** các test hiện có (pivot, contour, ground, ownership, alpha gate) vẫn đạt; không đổi art nguồn, pack gốc, renderer sản phẩm.
7. **Báo cáo và state:** báo cáo theo mẫu cố định; HQ-02 có đường dẫn ảnh cần chấm.

### 11.2 Vì sao hình còn phẳng (chẩn đoán từ mã)

Đọc `production/src/art/paper-scene/browser.ts` ngày 14/11:

- Mặt trước mọi sprite dùng `MeshBasicMaterial`, loại vật liệu không nhận ánh sáng. Ánh sáng và bóng vì vậy không thể thay đổi màu mặt giấy; chỉ mặt bên của khối đùn dùng `MeshStandardMaterial`.
- Mọi mesh đặt `depthTest` và `depthWrite` bằng false, thứ tự vẽ theo `renderOrder` (kiểu painter). Không có chiều sâu thật nên bóng giữa các lớp không thể tính.
- Chỉ có một receiver bóng (`ShadowMaterial`, độ đục 0,23) đặt sau foreground; bóng của sprite cũ vẫn là ảnh phẳng.
- Mặt giấy không có texture sợi; mép lấy từ contour alpha 128, đều và thẳng, không có nhiễu cắt tay.
- Nền là plate phẳng, chưa có ánh sáng; đèn lồng (nguồn sáng của truyện) chưa chiếu sáng gì.
- Phần lớn công sức vừa qua là đo đạc (hash, contour, pivot, alpha) nên không tạo khác biệt nhìn thấy.

**Kết luận.** Nguyên nhân không phải thiếu độ chính xác mà là thiếu ba thứ: vật liệu nhận sáng, chiều sâu thật, và chất liệu bề mặt cùng mép giấy. Ba thứ đó là trọng tâm của F2.

### 11.3 Sáu đòn bẩy hình ảnh, theo thứ tự làm

Thứ tự và mức tác động là đánh giá của mình từ chẩn đoán trên; phải được xác nhận bằng ảnh trước/sau ở từng bước.

| Đòn bẩy | Thay đổi | Tác động nhìn thấy | Rủi ro và cách kiểm |
| --- | --- | --- | --- |
| L1 Mặt giấy nhận sáng | Đổi `MeshBasicMaterial` thành vật liệu nhận sáng, `map` làm albedo; ánh sáng định hướng cộng hemisphere; hiệu chỉnh để màu trung tính khớp bản phẳng | Cao | Lệch palette; đo ΔE vùng không bị bóng |
| L2 Chiều sâu thật | Mỗi lớp một z (nền xa, nhà và cây, đất, thân, tay và đạo cụ); bật `depthTest` và `depthWrite`; mặt dùng `alphaTest` để cắt theo alpha | Cao | Viền mờ bị cắt cứng; đảo thứ tự che; kiểm bằng ảnh sáng-tắt phải giống bản phẳng |
| L3 Bóng đúng lớp, contact shadow | Bóng từ shadow map đổ lên lớp sau theo hình silhouette; contact shadow mềm dưới chân và dưới đèn; bóng rộng và nhạt hơn khi xa | Cao | Light bleeding của VSM; double shadow với bóng authored |
| L4 Mép giấy bất quy tắc | Nhiễu contour có seed, biên độ nhỏ, giữ pivot; lõi giấy sáng hơn ở mặt bên; highlight ở mép nhận sáng | Trung bình đến cao | Nhiễu làm hở khớp rig; kiểm alpha overlap và pivot |
| L5 Bề mặt giấy | Texture sợi (bump hoặc normal thủ tục), biến thiên màu nhẹ theo lớp | Trung bình | Nhấp nháy khi chuyển động; texture gắn theo lớp, không ngẫu nhiên theo frame |
| L6 Đèn lồng và nền | Point light ấm tại đèn có suy giảm, rim light nhẹ lên mặt và tay gần đèn, ánh sáng lên nền, khí quyển nhẹ giữa các lớp | Trung bình đến cao (kể chuyện) | Chi phí render; phải điều khiển được bằng một tham số sáng/tối cho pilot |

L1, L2, L3 là nền tảng và phụ thuộc nhau; làm theo thứ tự. L4, L5, L6 làm sau, mỗi cái độc lập. **Đã xác minh trong mã Three 0.187 đã cài:** pass đổ bóng dùng `material.map` khi `alphaTest > 0` để cắt bóng theo alpha của texture (`WebGLShadowMap.js`, dòng 447–449 và 494–496). Nghĩa là sprite có texture và `alphaTest` đổ bóng đúng hình silhouette, miễn là có chiều sâu thật (L2). Cũng đã xác minh: VSM không hỗ trợ `PointLight` (cảnh báo ở dòng 222), nên đèn lồng dùng PCF hoặc không đổ bóng.

### 11.4 Quy tắc chống lạc ý

1. **Mỗi task mở bằng một câu «đổi gì nhìn thấy»** và kết bằng ảnh trước/sau xác nhận câu đó.
2. **Không làm việc chỉ đo đạc, kiểm kê hay thêm hash** nếu nó không đổi ảnh, trừ khi chặn trực tiếp một đòn bẩy (ghi rõ chặn gì).
3. **Mỗi lần chỉ đổi một biến**, so với cùng frame 108 và cùng camera; không đổi nhiều thứ rồi mới nhìn.
4. **Lặp nhanh ở 640×360 trên frame 108**; chỉ render 1080p cho ảnh nộp.
5. **Ngân sách:** tối đa 3 lần thử mỗi task, mỗi lần một cách khác; evidence ≤ 5 MB mỗi task (ảnh nén, JSON nhỏ).
6. **Không đụng** pack gốc, art nguồn, renderer sản phẩm, golden cũ; mọi thứ nằm trong `paper-scene` và preset mới.
7. **Khi cần chọn** (màu, độ dày, biên độ nhiễu): chọn mặc định theo Q0, ghi một dòng vào `F2-DECISIONS.md` (quyết gì, vì sao, giá trị), rồi đi tiếp; không hỏi lại.
8. **Cấm mở rộng sang F3 (chuyển động), F4 (vật lý), âm thanh**, hay kiểm kê và contour thêm cho 117 asset, trước khi có styleframe.
9. **Vướng thông tin thì tra cứu theo giao thức** (Mục 2), bắt đầu từ các câu hỏi đã liệt kê trong từng task; không suy đoán API.

### 11.5 Cổng «khác biệt nhìn thấy» và parity màu

- Mỗi đòn bẩy xuất ảnh trước/sau cùng frame, cùng crop (phóng 2×) và bản đồ nhiệt khác biệt.
- Đo ΔE00 trung bình trong vùng bị tác động (mặt giấy, mép, vùng bóng). **Khởi điểm: ≥ 2 để coi là nhìn thấy được.** Con số này lấy từ thông lệ ngành màu mà mình nhớ, chưa xác minh nguồn; agent phải tra cứu nguồn gốc và hiệu chỉnh trước khi khóa.
- Parity màu: vùng không bị ảnh hưởng (ví dụ bầu trời xa) lệch ΔE00 trung bình không quá ngưỡng khóa ở T1 (khởi điểm 3, cũng cần tra cứu).
- Số đo không thay mắt nhìn: một người (hoặc agent, ghi `delegated-agent`) đọc ảnh trước/sau và trả lời «có thấy khác không, ở đâu?».

### 11.6 Nhiệm vụ T0 đến T6

Mỗi task gồm: **Đổi gì nhìn thấy**, **Việc**, **Tra cứu**, **Qua khi**, **Fail thì**. Không có thời gian ước lượng vì chưa có mẫu đo (quy tắc 14); ngân sách là số lần thử.

#### T0. Khóa thước đo và baseline

**Đổi gì nhìn thấy:** chưa đổi ảnh; tạo thước để biết «đẹp hơn» nghĩa là gì.

**Việc:** (1) Viết `docs/quality/F2-DOD.md` một trang gồm DoD (11.1), checklist Q0 (11.8) và quy tắc chống lạc ý (11.4). (2) Khóa baseline: `s05-scene/flat.png` (frame 108) và `physical-scene/volume.png` hiện tại làm «điểm xuất phát»; chọn 3 vùng cắt chuẩn (mặt Mai, tay và đèn, chân và nền đất) cộng một vùng bầu trời để đo parity. (3) Viết một lệnh `compare_before_after` nhận hai ảnh và vùng, xuất ảnh cạnh nhau, bản đồ nhiệt và ΔE00 trung bình. (4) Tạo `F2-DECISIONS.md`.

**Tra cứu:** công thức ΔE00 và ngưỡng nhìn thấy được; thư viện ΔE00 sẵn có (ưu tiên đã nằm trong repo, nếu thêm thì kiểm license).

**Qua khi:** lệnh chạy được trên cặp (flat, volume hiện tại) và ra ảnh cùng số; DoD đủ một trang. **Fail thì:** chốt ngưỡng tạm, ghi `UNVERIFIED`, đi tiếp.

#### T0b. ADR giảm dung lượng evidence (nền, làm trước batch lớn)

**Đổi gì nhìn thấy:** không đổi ảnh; chặn evidence tiếp tục phình (PR #7 thêm khoảng 150 MB, phần lớn là `source.zip` từng attempt).

**Việc:** viết ADR một trang: lưu snapshot nguồn theo hash nội dung (một bản cho nhiều attempt) hoặc tham chiếu commit SHA khi cây làm việc sạch. Thử trên bản sao, không đổi evidence cũ. Kiểm tương thích với `scripts/run-step.py`, `check_fresh_review.py` và audit. Chỉ bật mặc định khi các test đó đạt.

**Tra cứu:** đọc mã `scripts/run-step.py` và đường audit hiện có.

**Qua khi:** attempt mới tốn dung lượng giảm rõ rệt (mục tiêu đề xuất ≥ 80%) và audit cũ vẫn đạt. **Fail thì:** ghi `PARTIAL`; từ đó chạy ít attempt hơn, giữ evidence ≤ 5 MB mỗi task.

#### T1. L1: mặt giấy nhận sáng, giữ palette

**Đổi gì nhìn thấy:** mặt thân, tay, đầu có sáng–tối theo hướng đèn thay vì màu phẳng.

**Việc:** trên frame 108 ở 640×360, thay `MeshBasicMaterial` của một asset (thân Mai) bằng vật liệu nhận sáng với `map` làm albedo. Ở ánh sáng trung tính, hiệu chỉnh (ambient, hemisphere, hệ số màu) cho tới khi vùng không bị bóng khớp bản phẳng trong dung sai ΔE đã khóa. Sau đó áp dụng cho toàn bộ foreground. Giữ `NoToneMapping` và `SRGBColorSpace`; kiểm không bị clip trắng hay đen. Hướng sáng chính giữ nhất quán một hướng (đang là `(-400, 500, 1000)`), ghi vào preset.

**Tra cứu:** cách vật liệu `MeshStandardMaterial` hoặc `MeshLambertMaterial` có texture tái tạo đúng albedo dưới ánh sáng trung tính trong Three 0.187 (đơn vị cường độ ánh sáng vật lý); chọn bằng thí nghiệm đo, không bằng trí nhớ.

**Qua khi:** ảnh trước/sau thấy shading theo hướng sáng rõ trên thân và cánh tay (vượt ngưỡng nhìn thấy); parity màu ở vùng trung tính; các test hiện có đạt. **Fail thì:** thử Lambert; nếu vẫn lệch, nhân một hằng số hiệu chỉnh màu cho mỗi vật liệu và ghi vào `F2-DECISIONS.md`.

#### T2. L2: chiều sâu thật và bóng cắt theo alpha

**Đổi gì nhìn thấy:** tay đổ bóng lên thân, đầu lên cổ, nhân vật lên nền, theo đúng hình silhouette.

**Việc:** gán z theo nhóm (nền xa, nhà và cây, đất, thân, tay và đạo cụ) bằng cách lấy thứ tự từ `renderOrder` hiện có, để giữ nguyên quan hệ che khuất. Bật `depthTest` và `depthWrite` cho mặt có `alphaTest` (khởi điểm 0,5). Bật `castShadow` và `receiveShadow`. Vì camera là orthographic nên đổi z không đổi kích thước; kiểm bằng ảnh với ánh sáng tắt phải giống bản phẳng trong dung sai.

**Tra cứu (đã xác minh một phần):** shadow pass dùng `map` và `alphaTest` (xem 11.3). Còn phải kiểm: viền alpha một phần bị cắt cứng ra sao (đo hiện có: sai số alpha trung bình 0,245/255); khoảng z phù hợp với `near`/`far` của shadow camera; tương tác `alphaTest` với `transparent`.

**Qua khi:** (1) ảnh ánh sáng tắt khớp bản phẳng; (2) bật sáng thì bóng tay lên thân, đầu lên cổ, nhân vật lên nền xuất hiện đúng hình; (3) không đảo thứ tự che khuất so với bản phẳng. **Fail thì:** phương án B: chia thành vài nhóm z và dùng `ShadowMaterial` receiver riêng cho từng nhóm; phương án C: bóng vẽ từ silhouette làm mờ (shadow card) đặt ở z khác.

#### T3. L3: bóng mềm đúng lớp và contact shadow

**Đổi gì nhìn thấy:** bóng mềm cùng một hướng, đậm và sắc khi gần, nhạt và rộng khi xa; chân và đèn «chạm» đất.

**Việc:** chọn chính sách bóng authored: với foreground đã đùn dùng bóng sinh từ ánh sáng (đã có chế độ `receiver-only` để so), giữ plate cho phần chưa đùn. Chỉnh VSM (`radius`, `blurSamples`, `bias`) để tránh light bleeding. Contact shadow: mặt phẳng đất nhận bóng cộng blob mềm tại chỗ tiếp xúc, lấy vị trí tiếp xúc từ hợp đồng ground của F1. Penumbra tăng theo khoảng cách: thử cách đơn giản nhất cho thấy khác biệt (ví dụ nhiều receiver theo nhóm lớp với độ mờ khác nhau).

**Tra cứu:** light bleeding của VSM và cách giảm trong Three; so PCF soft với VSM cho bóng mềm; tham chiếu paper-cut trong sổ nguồn Q0 (S02).

**Qua khi:** không double shadow (đếm bóng chồng trong crop chân), bóng chân bám sàn đúng chỗ tiếp xúc đã khai báo, penumbra tăng theo khoảng cách trong hai crop so sánh, trước/sau nhìn thấy. **Fail thì:** quay T2 chỉnh z; hoặc giữ bóng authored cho chân và dùng bóng sinh cho thân.

#### T4. L4: mép giấy bất quy tắc và mép dày

**Đổi gì nhìn thấy:** viền trông như mép giấy cắt tay chứ không phải đường vector đều.

**Việc:** nhiễu contour có seed theo asset, dịch theo pháp tuyến với biên độ nhỏ và tần số thấp (khởi điểm đề xuất 0,5–1,5 px ở stage 1080p, hiệu chỉnh bằng mắt, ghi preset). Không dịch quá ngưỡng ở vùng khớp (vai, khuỷu, cổ tay, đầu gối) và giữ pivot. Mặt bên dùng màu lõi giấy sáng hơn; thêm highlight ở mép nhận sáng. Alpha overlap gate của F1 phải vẫn đạt; cùng seed cho cùng contour.

**Tra cứu:** cách sinh nhiễu 1D theo chiều dài cung (simplex hoặc Perlin); chỉ thêm dependency khi cần, và kiểm license.

**Qua khi:** crop 2× cho thấy mép không đều, không lộ khe ở khớp rig, các test rig/alpha/pivot đạt, hai lần render cùng seed giống hệt. **Fail thì:** giảm biên độ; chỉ áp cho mép ngoài, không áp ở khớp.

#### T5. L5: bề mặt giấy

**Đổi gì nhìn thấy:** nhìn gần thấy sợi giấy; nhìn xa toàn khung không thấy nhiễu hạt.

**Việc:** texture sợi thủ tục có thể lặp (tileable) làm bump hoặc normal map, cộng biến thiên màu nhẹ theo lớp. Gắn theo lớp, không ngẫu nhiên theo frame. Biên độ nhỏ. Xuất crop 1:1 và 2×. Kiểm chuỗi 192 frame: vùng tĩnh không nhấp nháy.

**Tra cứu:** tạo normal map thủ tục từ noise; nếu dùng texture ngoài (ví dụ nguồn CC0) phải xác minh license từng nguồn.

**Qua khi:** crop gần thấy kết cấu, ở 1080p toàn khung không nhiễu hạt, chênh lệch giữa các frame ở vùng tĩnh bằng 0. **Fail thì:** giảm biên độ; bỏ ở vùng nhỏ như mặt và tay.

#### T6. L6: ánh sáng đèn lồng và chiều sâu nền

**Đổi gì nhìn thấy:** đèn lồng là nguồn sáng thật của cảnh: viền sáng ấm lên mặt và tay gần đèn; nền có chiều sâu.

**Việc:** point light ấm đặt tại đèn (vị trí lấy từ bake), suy giảm theo khoảng cách, màu theo palette Q0 (cam đất, kem); rim light nhẹ; ánh sáng lên tường nhà; lớp khí quyển nhẹ giữa các lớp nền; glow của đèn bằng sprite cộng sáng, không phá palette. Một tham số `lanternIntensity` điều khiển sáng/tối, để pilot p001–p005 (tối) và p006 (sáng) dùng chung được.

**Tra cứu:** VSM không hỗ trợ `PointLight` (đã xác minh): dùng PCF cho đèn lồng hoặc để đèn lồng không đổ bóng; chi phí render phần mềm của thêm một đèn.

**Qua khi:** trước/sau thấy ánh sáng ấm có hướng quanh đèn, palette giữ nguyên, không phá bóng ở T3, `lanternIntensity` bằng 0 cho ra cảnh tối. **Fail thì:** dùng glow sprite cộng rim bằng vật liệu thay cho point light thật.

### 11.7 Nhiệm vụ T7 đến T12

#### T7. F2b: miệng và biểu cảm trong cùng look

**Đổi gì nhìn thấy:** đầu, miệng, biểu cảm cùng vật liệu, ánh sáng, mép giấy với phần còn lại, không lạc tông.

**Việc:** áp preset hiện có cho 18 đầu draft và 8 hình miệng (M, A, E, O, F, U, L, teeth, cộng rest) của pack overlay 156 asset. Dựng lại 3 model sheet (base, draft, extreme) trong look mới, mỗi nhân vật một ảnh. Kiểm anchor miệng. Chưa animate lip-sync; ánh xạ phoneme thuộc F6.

**Qua khi:** model sheet nhất quán với styleframe; các test overlay hiện có đạt. **Fail thì:** sửa preset cho nhóm đầu trước, không sửa art nguồn.

#### T8. Gộp preset và xuất styleframe v1

**Đổi gì nhìn thấy:** có một ảnh để bạn chấm.

**Việc:** gộp mọi đòn bẩy đã qua cổng vào `f2-look-v1.json`. Render frame 0, 108, 191 ở 1080p cùng 3 crop cận cạnh và ảnh so cạnh phẳng/final; ghép thành một sheet tổng. Cập nhật `F2-STYLE-BIBLE.md` với tham số cuối (độ dày, góc sáng, biên độ nhiễu mép, cường độ đèn). Cập nhật HQ-02 với đường dẫn đúng.

**Qua khi:** DoD mục 1 đến 3. **Fail thì:** đòn bẩy nào chưa qua cổng thì loại khỏi preset, ghi rõ trong báo cáo.

#### T9. Ổn định chuyển động và tái lập

**Đổi gì nhìn thấy:** khi chạy 192 frame, look không nhấp nháy, bóng không nhảy.

**Việc:** render preview 640×360 đủ 192 frame và 1080p cho vài frame chọn. Kiểm: seek ngẫu nhiên khớp hash, vùng tĩnh không nhấp nháy, bóng không popping, hai lần chạy cùng seed giống hệt. Ghi thời gian render mỗi frame (chỉ ghi nhận, không cam kết).

**Qua khi:** DoD mục 4. **Fail thì:** sửa nguồn nhấp nháy (thường là texture hay nhiễu gắn theo frame) rồi chạy lại phần liên quan.

#### T10. Tự review có cấu trúc và gói chấm

**Đổi gì nhìn thấy:** bạn chấm được trong 15 phút.

**Việc:** agent điền checklist Q0 §1 (Mục 11.8) với ảnh dẫn chứng, ghi `delegated-agent`. Viết phiếu chấm một trang: danh sách ảnh cần xem, 5 câu hỏi (mép giấy, độ dày, bóng, ánh sáng, còn trông như vector phẳng không?), thang 1–5, chỗ ghi lý do. Cập nhật HQ-02. Sau đó agent tiếp tục F3 dưới nhãn `PROVISIONAL`, ghi rõ rủi ro làm lại; không đứng chờ.

**Qua khi:** gói chấm đầy đủ và HQ-02 cập nhật.

#### T11. Vòng sửa theo điểm của bạn (tối đa 2 vòng)

**Việc:** đọc điểm và ghi chú trong `HUMAN-QUEUE.md`, ánh xạ ghi chú sang đòn bẩy: «còn phẳng» sang L1/L2; «bóng giả» sang L3; «mép đều» sang L4; «thiếu chất liệu» sang L5; «tối, lạnh, thiếu ấm» sang L6. Chỉ chỉnh đòn bẩy bị nêu, render lại styleframe. Vòng 2 làm tương tự.

**Stop-loss:** nếu sau 2 vòng bạn vẫn chấm dưới 4, dừng tinh chỉnh bằng code; chuyển sang hướng A (artist vẽ lại asset) hoặc B (model ảnh chạy cục bộ có license rõ) theo quyết định của bạn; ghi `PARTIAL` hoặc `BLOCKED`, không tinh chỉnh vô hạn.

#### T12. Đóng F2

**Việc:** viết báo cáo gọn `docs/reports/F2-final.md` theo mẫu cố định (báo cáo `F2.md` hiện rất dài; giữ nguyên làm lịch sử và trỏ tới). Đồng bộ state (mục `v2`, đánh dấu trường cũ `superseded`). Cập nhật style bible. Chạy toàn bộ test. CI trên đúng source SHA (ghi runId hoặc `NOT_RUN`).

**Qua khi:** DoD mục 7; điểm của bạn ≥ 4 thì đóng Q1-ART, chưa thì `PASS_PROVISIONAL`.

### 11.8 Checklist Q0 §1 (đích hình ảnh)

Mỗi dòng PASS hoặc FAIL, kèm ảnh dẫn chứng.

1. Mảng giấy có mép cắt hơi bất quy tắc.
2. Texture tinh trên mặt giấy.
3. Bóng mềm, cùng một hướng sáng.
4. Silhouette đọc được khi bỏ texture.
5. Không viền đen dày đồng đều, không bộ phận nào giống placeholder.
6. Đúng palette Q0 (slate, mint, kem, vàng áo, cam đất, teal); màu nhấn là ánh đèn, diện tích nhỏ.
7. Nền có bầu trời, kiến trúc xa, tường và cửa xưởng, mặt sân, cây tiền cảnh; overscan ≥ 15%; mặt phẳng địa hình rõ; camera orthographic.

### 11.9 Việc của bạn

Hai lần, mỗi lần khoảng 15 phút, và không chặn agent:

1. **Sau T8:** xem sheet tổng và 3 crop, trả lời 5 câu trong phiếu chấm, ghi điểm 1–5 và lý do vào `HUMAN-QUEUE.md` (HQ-02).
2. **Sau vòng sửa 1 (nếu cần):** chấm lại như trên.

Nếu chạm stop-loss ở T11, bạn chọn hướng A (artist vẽ lại asset, cần người và có thể cần ngân sách) hoặc B (model ảnh chạy cục bộ, cần license và quyền rõ). Tùy chọn: gửi 1–2 ảnh tham chiếu phong cách giấy bạn thích trước T0 để agent có đích cụ thể.

### 11.10 Rủi ro và cách chặn

- **Ánh sáng làm lệch palette.** Hiệu chỉnh và đo ΔE ở T1 trước khi áp dụng rộng.
- **`alphaTest` cắt cứng viền mờ.** Đo hiện có cho sai số trung bình nhỏ (0,245/255); nếu viền thô thì hạ `alphaTest` hoặc dùng bóng dạng shadow card.
- **Render phần mềm chậm.** Lặp ở 640×360 trên một frame; 1080p chỉ cho ảnh nộp.
- **Nhiễu mép làm hở khớp rig.** Giới hạn biên độ và không áp ở khớp; giữ alpha overlap gate.
- **Đèn lồng phụ thuộc trạng thái của pilot.** Tham số hóa bằng `lanternIntensity`.
- **Agent lại sa vào đo đạc.** Quy tắc 2 và 8 ở 11.4; mỗi task phải có câu «đổi gì nhìn thấy».
- **Ngưỡng ΔE chưa có nguồn.** Phải tra cứu và hiệu chỉnh ở T0 trước khi khóa.
- **Vẫn dưới 4 sau 2 vòng sửa.** Stop-loss ở T11: chuyển sang hướng A hoặc B.

### 11.11 Prompt hoàn tất F2 (dán cho AI)

```
Hoàn tất F2 theo «Kế hoạch chuẩn», Mục 11. MỤC TIÊU DUY NHẤT: biến cảnh S05 từ vector phẳng thành diorama giấy có độ dày, ánh sáng và bóng mềm đúng Q0 §1, để người dùng chấm styleframe >= 4/5 (HQ-02). Việc nào không làm hình đẹp hơn một cách nhìn thấy được thì không làm.

BỐI CẢNH ĐÃ XÁC MINH TỪ MÃ
- Mặt sprite dùng MeshBasicMaterial (không nhận sáng); mọi mesh depthTest=false, thứ tự bằng renderOrder; chỉ một ShadowMaterial receiver; mép từ contour alpha 128; nền là plate; đèn lồng chưa chiếu sáng gì.
- Three 0.187: pass bóng dùng material.map và alphaTest > 0 để cắt bóng theo alpha (WebGLShadowMap.js dòng 447-449 và 494-496); VSM không hỗ trợ PointLight.

THỨ TỰ
T0 (thước đo, baseline) -> T0b (ADR evidence) -> T1 (mặt nhận sáng, giữ palette) -> T2 (chiều sâu thật, bóng cắt theo alpha) -> T3 (bóng mềm đúng lớp, contact shadow) -> T4 (mép giấy bất quy tắc) -> T5 (bề mặt giấy) -> T6 (ánh sáng đèn lồng, nền) -> T7 (miệng, biểu cảm cùng look) -> T8 (preset và styleframe v1) -> T9 (ổn định chuyển động) -> T10 (tự review, gói chấm) -> T11 (sửa theo điểm, tối đa 2 vòng) -> T12 (đóng F2). Chi tiết từng task ở Mục 11.6 và 11.7.

QUY TẮC CHỐNG LẠC Ý
1. Mỗi task mở bằng một câu «đổi gì nhìn thấy», kết bằng ảnh trước/sau xác nhận câu đó.
2. Không làm việc chỉ đo đạc, kiểm kê, thêm hash nếu nó không đổi ảnh, trừ khi chặn trực tiếp một đòn bẩy (ghi rõ chặn gì).
3. Mỗi lần chỉ đổi một biến, so cùng frame 108 và cùng camera.
4. Lặp nhanh ở 640x360 trên frame 108; chỉ render 1080p cho ảnh nộp.
5. Tối đa 3 lần thử mỗi task, mỗi lần một cách khác; evidence <= 5 MB mỗi task.
6. Không đụng pack gốc, art nguồn, renderer sản phẩm, golden cũ.
7. Khi cần chọn: chọn mặc định theo Q0, ghi một dòng vào docs/quality/F2-DECISIONS.md, đi tiếp, không hỏi lại.
8. Cấm mở rộng sang F3, F4, âm thanh, hay kiểm kê và contour thêm cho 117 asset trước khi có styleframe.
9. Vướng thông tin: tra cứu theo giao thức, ghi docs/research/ với VERIFIED, PARTIAL hoặc UNVERIFIED; không suy đoán API. Ngưỡng DeltaE00 phải được tra cứu và hiệu chỉnh ở T0 trước khi khóa.

CHUNG
Giữ các quy tắc ở Mục 2 (chạy liên tục, PROVISIONAL cho gate người, không tự duyệt nghệ thuật, dừng cứng chỉ khi cần chi tiền, media không rõ quyền, Git phá hủy, lộ secret, hành động ngoài repo). Báo cáo theo mẫu cố định, commit, push sau mỗi task đạt. Sau T10, tiếp tục F3 dưới nhãn PROVISIONAL, ghi rõ rủi ro làm lại; không đứng chờ.
```
