# Kế hoạch nâng cấp Paper Studio: hoạt hình có hồn, vật lý đúng

Soạn ngày 13/11/2026 · Nền: repo `maitoan2408/ai-animation-studio-research-content`, nhánh `codex/production-q0-q9` (PR #4)

## 0. Cách dùng tài liệu

Tài liệu gồm: mục tiêu và tiêu chí đo được (1), hiện trạng (2), nguyên tắc (3), kiến trúc đích (4), lộ trình 9 giai đoạn có cổng đạt/không đạt (5), quy tắc cho AI (6), việc của bạn (7), rubric chấm (8), rủi ro (9), prompt giao việc (10). Dán Mục 10 vào AI làm việc (Codex, Claude Code…) kèm link repo.

Lưu ý trung thực: «hoàn hảo» không đo được, nên kế hoạch dùng ngưỡng chấp nhận cụ thể và bạn là người duyệt cuối. Phần diễn xuất (hồn) khó nhất; để đạt mức cao, gần như chắc chắn cần dữ liệu từ người (clip diễn, pose do animator làm) chứ AI không tự bịa ra được.

## 1. Mục tiêu và định nghĩa chất lượng

Một repo duy nhất đi từ kịch bản đến phim hoạt hình 2D/2.5D mà người xem thấy: (a) nhân vật có diễn xuất, cảm xúc đọc được; (b) mọi vật có trọng lượng, quán tính, va chạm đúng; (c) hình ảnh có chất liệu và ánh sáng, không giống hình khối vẽ bằng code.

Ngưỡng khởi điểm bên dưới được hiệu chỉnh ở P0 bằng clip tham chiếu, sau đó khóa. Chỉ đổi ngưỡng bằng quyết định có ghi lý do, không đổi sau khi thấy kết quả để che lỗi.

| Trục | Cách đo | Ngưỡng đạt |
| --- | --- | --- |
| Hồn | Rubric người chấm (Mục 8), xem mù so với clip tham chiếu, ở 1× và 0,5×, có và không có tiếng | Mọi tiêu chí ≥ 4, trung bình ≥ 4,2 |
| Vật lý (máy đo) | Test tự động: chu kỳ con lắc lệch ≤ 2% so với công thức; thời gian rơi tự do ≤ 2%; xuyên vật = 0 frame; trượt chân ≤ 1 px ở 1080p khi tiếp đất; file bake giống hệt (hash) qua 2 lần chạy và 2 máy | Tất cả đạt |
| Vật lý (cảm nhận) | Rubric người chấm | ≥ 4 |
| Hình ảnh | Rubric người chấm, so cạnh tham chiếu, ảnh tĩnh và chuyển động | ≥ 4, không răng cưa/viền vỡ ở 1080p |
| Âm thanh | −16 LUFS, true peak ≤ −1 dBTP; tiếng động khớp sự kiện chạm ±1 frame; lip-sync lệch ≤ 2 frame; người nghe duyệt | Đạt |
| Kỹ thuật | Đúng số frame, kích thước, fps, decode đầy đủ, audio, hash | Đạt |

## 2. Hiện trạng (rút từ repo)

- **Đã tốt:** pipeline render tất định, QC, review có ghi chú theo frame, CI, tái lập; 210 attempt có bằng chứng.
- **Chưa tốt (nguyên nhân «trông như AI vẽ»):** art là SVG viết bằng code (64 SVG gốc, một rig); chuyển động là pose tính bằng code, không có dữ liệu diễn xuất; không có tầng vật lý; miệng theo năng lượng âm thanh, chưa có viseme; planner theo quy tắc; tiêu chí PASS thiên về kỹ thuật, chưa ai nghe voice hay duyệt chuyển động.
- **Trạng thái:** Q0 xong, Q1 mới đạt kỹ thuật, Q2 đang dở, Q3–Q9 chưa bắt đầu, chưa chọn backend.
- **Nợ repo:** 4 branch xếp chồng (PR #1–#4); `.git` khoảng 456 MB vì mp4, zip, log, json nằm trong Git; chưa có LICENSE; eSpeak NG là GPL-3.0, GSAP có license riêng.

## 3. Nguyên tắc thiết kế

1. **Tách vai:** diễn xuất chính do dữ liệu tham chiếu hoặc pose library quyết định; vật lý lo va chạm và chuyển động phụ (đèn đung đưa, tóc, vải, vật rơi).
2. **AI viết ý đồ, không viết từng frame:** đầu ra của AI là Performance Script có schema.
3. **Tất định và bake:** vật lý chạy ở timestep cố định, ghi ra file; renderer chỉ đọc, là hàm thuần của dữ liệu.
4. **Không dùng hình khối vẽ bằng code làm art cuối.** Code chỉ dùng để lắp ráp, ánh sáng, chuyển động.
5. **Đo được thì máy đo, cảm nhận thì người chấm.** AI không tự duyệt nghệ thuật.
6. **Hai vòng lặp:** vòng nhanh (preview thấp, không hash) để sáng tạo; vòng nặng (QC đầy đủ) chỉ cho bản cuối.
7. **Giữ baseline cũ**, không xóa kết quả cũ.

## 4. Kiến trúc đích

```
Kịch bản → Director agent → Performance Script (IR)
  → Motion: pose/clip library + IK + spring + nguyên tắc hoạt hình
  → Physics: Planck/Rapier2D tất định (hoặc Blender cho cảnh nhấn) → BAKE
  → Audio: giọng + căn thời gian + viseme + foley từ sự kiện va chạm
  → Render: HyperFrames + Three (lắp ráp, bóng, parallax) | Blender (cảnh nhấn)
  → Critic (số đo + contact sheet + onion-skin + biểu đồ) → người duyệt
```

Bố cục repo gợi ý: `packages/ir` (schema), `motion`, `physics`, `art`, `audio`, `render`, `critic`, `director`; `apps/studio` (web, review); `projects/the-last-lantern`; `references/`, `benchmarks/`, `docs/`. Code cũ giữ nguyên để làm baseline.

**Hợp đồng dữ liệu (đặt ở `packages/ir`, có validator):**

- **Performance IR:** danh sách beat gồm nhân vật, hành động, cảm xúc, frame bắt đầu/kết thúc, mức nhấn, ràng buộc (chạm vật nào, nhìn đâu).
- **MotionClip:** đường cong xương theo frame, mốc tiếp xúc, metadata (cảm xúc, năng lượng, thời lượng).
- **BakeFile:** fps, dt, biến đổi từng vật theo frame, sự kiện (chạm, va đập) kèm frame và cường độ, tên và phiên bản engine, sha256.

## 5. Lộ trình

### P0. Chốt chuẩn và dọn nền

- **Việc:** đọc theo thứ tự `AGENTS.md`, `docs/execution/RESUME.md`, `state.json`, `NEXT-PLAN.md`, `issues.md`, `production/README.md`. Tạo branch làm việc từ `codex/production-q0-q9`. Chuyển file nặng (mp4, zip, bin, log) sang Git LFS hoặc release assets, giữ manifest và hash trong Git. Rà license, đề xuất LICENSE. Thu thập 3–5 clip tham chiếu (người dùng cung cấp hoặc tự quay) cho ba mặt: diễn xuất, vật lý, hình ảnh; viết `docs/quality/standard.md` với ngưỡng.
- **Đầu ra:** chuẩn chất lượng, thư mục `references/` có manifest, kế hoạch dọn repo.
- **Cổng:** bạn duyệt chuẩn và danh sách tham chiếu.

### P1. Art và asset (sửa gốc rễ «trông như AI vẽ»)

- **Việc:** viết style bible (palette, độ dày viền giấy, quy tắc ánh sáng, tỉ lệ nhân vật, bộ biểu cảm tối thiểu 8 hình miệng viseme và 6 biểu cảm mắt/mày). Spike 3 nguồn asset cho 1 nhân vật và 1 nền: (A) minh họa vector do người vẽ hoặc thuê; (B) ảnh từ model ảnh, tách lớp thành PNG alpha; (C) mô hình giấy dựng trong Blender (giấy có độ dày, bevel) rồi xuất lớp. Ghi chi phí, thời gian, mức kiểm soát, bản quyền, khả năng rig. Thêm chất liệu: sợi giấy, độ dày cạnh, normal map, bóng tiếp đất mềm, ánh sáng một hướng, độ sâu trường ảnh nhẹ.
- **Cổng:** bạn chấm hình ≥ 4 ở 1080p so cạnh tham chiếu và chọn một nguồn.
- **Nếu fail:** đổi nguồn asset, không vá bằng code.

### P2. Rig và lõi chuyển động

- **Việc:** skeleton phân cấp; IK hai xương cho tay và chân; khóa chân; gắn tay vào đạo cụ; xương phụ dùng spring-damper cho tóc, áo, tai. Thư viện nguyên tắc: easing có overshoot, anticipation, follow-through, arcs, squash/stretch, holds, animate on twos. Tham số tính cách (nặng/nhẹ, năng lượng, độ giật) để cùng hành động nhưng nhân vật khác nhau cử động khác nhau.
- **Test:** IK đạt mục tiêu và không lật khớp; spring không bùng nổ; kết quả tất định.
- **Cổng:** 6 clip nền (đi, nhấc, đặt, quay đầu, chào, ngã nhẹ) đạt số đo, và bạn chấm trọng lượng/timing ≥ 4.

### P3. Tầng vật lý và bake

- **Việc:** spike chọn engine: Planck.js (thuật toán Box2D, tất định nếu timestep cố định) và Rapier2D bản `-deterministic` (bản thường chỉ tất định trên cùng máy); thêm Blender (rigid body, cloth, hair) cho cảnh nhấn. Tiêu chí: tất định, khớp công thức, dễ bake, license, tốc độ. Mô phỏng ở dt cố định (ví dụ 1/240 s) rồi bake xuống 24 fps; ghi seed và phiên bản engine. Đạo cụ: đèn (con lắc có giảm chấn), vải/tóc (chuỗi xương + lò xo hoặc verlet), vật rơi/nảy. Cầu nối nhân vật–vật lý: tay điều khiển điểm bám (kinematic), đạo cụ phản ứng (dynamic). Xuất sự kiện chạm/va đập kèm frame và cường độ, dùng cho âm thanh và rung camera.
- **Test:** con lắc, rơi tự do, nảy theo hệ số đàn hồi, chạy dài không trôi, hash bake lặp lại.
- **Cổng:** mọi số đo vật lý đạt; bạn chấm cảm nhận vật lý ≥ 4.

### P4. Pipeline diễn xuất

- **Việc:** quay clip diễn cho từng hành động; trích pose (MediaPipe hoặc công cụ như SyncRig, Apache-2.0; đây là spike, chưa có tiền lệ đã kiểm cho con rối giấy 2D); retarget lên skeleton 2D; làm sạch (lọc nhiễu, giữ đỉnh), cường điệu, tạo phong cách (on twos, rung giấy). Nếu retarget kém: animator người làm pose chính, AI chỉ retime. Pose library có metadata. Viết schema và validator cho Performance Script.
- **Cổng:** 3 hành động diễn so với clip tham chiếu, bạn chấm «hồn» ≥ 4.

### P5. Âm thanh, lip-sync, foley

- **Việc:** giọng thu thật hoặc TTS đã được người nghe duyệt (hiện dùng Kokoro); forced alignment lấy mốc âm vị rồi ánh xạ sang viseme; foley sinh từ sự kiện vật lý (bước chân, đặt đèn, rung giấy) khớp ±1 frame; nhạc nền có nguồn và license; mix −16 LUFS, TP ≤ −1 dBTP.
- **Lưu ý:** AI có thể không nghe được; khi đó chỉ đo (tương quan envelope, độ lệch timing) và ghi `NOT_RUN` phần nghe.
- **Cổng:** lip-sync lệch ≤ 2 frame theo số đo; bạn nghe duyệt.

### P6. Camera, ánh sáng, ghép, render

- **Việc:** adapter HyperFrames + Three (camera orthographic, multiplane, bóng mềm, grain, DOF). Adapter Blender cho cảnh nhấn, đọc cùng BakeFile và ra cùng profile. So sánh A/B trên cùng cảnh về chất lượng, thời gian, ổn định; quyết định bằng ADR. Giữ pipeline màu BT.709.
- **Cổng:** bạn chấm hình ≥ 4 trên chuyển động (không chỉ ảnh tĩnh); đo tốc độ render (3 cold + 5 warm).

### P7. Điều phối AI và Critic

- **Việc:** Director agent chia cảnh, viết Performance Script, chọn clip, gọi công cụ hẹp có schema. Critic tạo báo cáo số đo (vận tốc, gia tốc, jerk, trượt chân, xuyên vật, số lần overshoot, lệch beat), contact sheet, onion-skin, motion trail, biểu đồ đường cong, rồi so với ngưỡng. Tối đa 3 vòng sửa mỗi shot rồi dừng và báo bạn; ghi lý do từng lần sửa.
- **Cổng:** từ một kịch bản AI chưa thấy, Director tạo shot đạt số đo trong ≤ 3 vòng; bạn chấm ≥ 4 ở ít nhất 2/3 số shot.

### P8. Cảnh mẫu → 6 shot → pilot

- **Việc:** làm S05 (chuyền đèn) đạt chất lượng «hero» đủ mọi tầng trước; sau đó 6 shot (48 giây), rồi pilot 72 giây «The Last Lantern» và 2 vòng sửa. Một operator độc lập clone sạch và tái lập.
- **Cổng:** bạn duyệt pilot; tái lập sạch thành công; checklist phát hành.

## 6. Quy tắc làm việc cho AI

- Đọc `RESUME` và `state.json` trước; không ghi đè thay đổi của người khác; commit nhỏ, push branch, **không tự merge, không force-push**.
- Ghi rõ `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`. Exit code 0 hoặc file tồn tại không có nghĩa là đạt. Không đổi ngưỡng sau khi thấy kết quả.
- Review nghệ thuật của AI ghi nhãn `delegated-agent`; không giả là người dùng đã xem hoặc nghe.
- Kiểm khả năng xem/nghe của môi trường mình; phần không nghe được ghi `NOT_RUN`.
- Dùng vòng nhanh khi sáng tạo, vòng nặng cho bản cuối. Không đưa file nặng vào Git thường.
- Không dùng dịch vụ trả phí hoặc gửi dữ liệu ra ngoài khi chưa được duyệt.
- Không khảo sát thêm công cụ ngoài danh sách nếu không ghi lý do trong ADR. Ghi nguồn và license mọi thành phần mới.
- Cuối mỗi giai đoạn nộp báo cáo: đã làm gì, số đo, ảnh/clip, phần chưa đạt, cần bạn làm gì.

## 7. Việc của bạn (cổng người)

- Cung cấp hoặc chọn clip tham chiếu; chọn nguồn asset và ngân sách.
- Quay hoặc thuê người diễn; thuê/nhờ animator làm pose chính nếu P4 retarget không đạt.
- Chấm rubric (Mục 8) ở các cổng P0–P8, và nghe voice/foley.
- Duyệt ADR, chọn LICENSE, quyết định merge hoặc dọn lịch sử Git.

## 8. Rubric chấm (1–5 điểm)

| Trục | Tiêu chí | 5 điểm khi… |
| --- | --- | --- |
| Hồn | Ý đồ và cảm xúc | Tắt tiếng vẫn hiểu nhân vật đang làm gì và cảm thấy gì |
| Hồn | Timing và spacing | Nhịp có nhấn, nhanh–chậm có chủ đích, không đều như nội suy tuyến tính |
| Hồn | Anticipation, follow-through, overshoot | Nhất quán và đúng mức |
| Hồn | Trọng lượng | Cảm nhận rõ vật nặng hay nhẹ theo từng đạo cụ |
| Hồn | Thiện cảm | Muốn xem tiếp nhân vật |
| Vật lý | Tiếp xúc | Tay chạm đúng, không xuyên, không lơ lửng |
| Vật lý | Quán tính và chuyển động phụ | Đung đưa, rung, tắt dần hợp lý |
| Hình ảnh | Chất liệu | Thấy độ dày, sợi, cạnh giấy; không phẳng như khối màu |
| Hình ảnh | Ánh sáng và bóng | Bóng mềm, nhất quán, tạo chiều sâu |
| Hình ảnh | Độ sạch ở 1080p | Không răng cưa, viền vỡ, banding |
| Hình ảnh | Nhất quán style | Mọi shot cùng một thế giới |

## 9. Rủi ro và phương án

- **Asset đẹp nhưng khó rig:** chọn nguồn theo khả năng rig ở cổng P1.
- **Retarget mocap lên con rối giấy chưa có tiền lệ đã kiểm:** làm spike nhỏ; dự phòng là animator người.
- **Vật lý lệch giữa các máy:** dùng bản deterministic và test hash trên CI.
- **AI critic chấm nhầm:** dùng số đo máy cộng người duyệt.
- **Tốn chi phí và thời gian:** vòng nhanh, giới hạn 3 vòng sửa mỗi shot.
- **Bản quyền asset và model:** ghi nguồn, rà license, không dùng nội dung không rõ quyền.
- **«Hoàn hảo» không có điểm dừng:** dừng theo ngưỡng chấp nhận đã khóa ở P0.

## 10. Prompt giao việc

### 10.1. Prompt chính (dán cho AI)

```
Bạn là kỹ sư trưởng kiêm giám đốc kỹ thuật hoạt hình, tiếp quản dự án Paper Studio.

Repo: https://github.com/maitoan2408/ai-animation-studio-research-content
Làm việc trên nhánh mới tạo từ `codex/production-q0-q9` (PR #4). Giữ nguyên baseline cũ.

MỤC TIÊU
Biến repo này thành một hệ thống duy nhất tạo phim hoạt hình 2D/2.5D từ kịch bản, trong đó: (1) nhân vật có diễn xuất và cảm xúc đọc được, (2) vật thể có trọng lượng, quán tính, va chạm đúng vật lý, (3) hình ảnh có chất liệu và ánh sáng, KHÔNG phải hình khối vẽ bằng code. Điều phối bằng AI nhưng AI chỉ viết ý đồ (Performance Script), không viết từng frame.

VÌ SAO PHẢI ĐỔI
Bản hiện tại có pipeline kỹ thuật tốt nhưng art là SVG viết bằng code, chuyển động tính bằng code, không có tầng vật lý, miệng theo năng lượng âm thanh, và các cổng PASS chỉ đo kỹ thuật. Kết quả trông như AI vẽ.

ĐỌC TRƯỚC (theo thứ tự)
AGENTS.md, docs/execution/RESUME.md, docs/execution/state.json, docs/execution/NEXT-PLAN.md, docs/execution/issues.md, production/README.md, rồi tài liệu kế hoạch này (Mục 1–9).

KIẾN TRÚC ĐÍCH
Kịch bản → Director → Performance Script (schema + validator) → Motion (pose/clip + IK + spring + nguyên tắc hoạt hình) → Physics (Planck/Rapier2D bản tất định, hoặc Blender cho cảnh nhấn) → BAKE (dt cố định, sự kiện chạm, sha256) → Audio (viseme từ forced alignment, foley từ sự kiện vật lý) → Render (HyperFrames+Three, và Blender) → Critic (số đo, contact sheet, onion-skin, biểu đồ) → người duyệt.

QUY TẮC BẮT BUỘC
- Không dùng hình khối vẽ bằng code làm art cuối. Asset phải đến từ nguồn chất lượng cao đã được người duyệt.
- Vật lý chạy ở timestep cố định và bake; renderer chỉ đọc dữ liệu bake.
- Ghi PASS/FAIL/BLOCKED/NOT_RUN. Không đổi ngưỡng sau khi thấy kết quả. Exit 0 không phải là đạt.
- Review nghệ thuật của bạn ghi nhãn delegated-agent. Không giả là người dùng đã xem hoặc nghe. Hãy tự kiểm xem môi trường của bạn có nghe được audio không; nếu không, ghi NOT_RUN.
- Commit nhỏ, push branch, không tự merge, không force-push, không viết lại lịch sử Git khi chưa được duyệt.
- Không dùng dịch vụ trả phí hoặc gửi dữ liệu ra ngoài khi chưa được duyệt. Ngân sách API: [ĐIỀN].
- Dùng vòng lặp nhanh (preview thấp) khi sáng tạo; QC nặng chỉ cho bản cuối. Không đưa file nặng vào Git thường.
- Không khảo sát thêm công cụ ngoài kế hoạch nếu không ghi lý do trong ADR. Ghi nguồn và license mọi thành phần.

BẮT ĐẦU
Thực hiện P0 theo kế hoạch: đọc repo, đề xuất dọn nền, soạn docs/quality/standard.md (ngưỡng đo được cho Hồn, Vật lý, Hình ảnh, Âm thanh, Kỹ thuật) và danh sách clip tham chiếu cần tôi cung cấp. DỪNG ở cổng P0 và chờ tôi duyệt trước khi sang P1.

MỖI GIAI ĐOẠN KẾT THÚC BẰNG BÁO CÁO
Đã làm gì; số đo (PASS/FAIL); ảnh hoặc clip kèm đường dẫn; phần chưa đạt và nguyên nhân giả thuyết; việc cần tôi làm; đề xuất bước tiếp theo.

ĐỊNH NGHĨA HOÀN THÀNH
Cổng của giai đoạn đạt, tôi đã chấm rubric, bằng chứng nằm trong repo, và repo có thể clone sạch để tái lập.
```

### 10.2. Prompt phụ cho các giai đoạn then chốt

**P1, art và asset:**

```
Thực hiện P1. Viết style bible, rồi spike 3 nguồn asset (vector do người vẽ, ảnh model tách lớp PNG alpha, mô hình giấy dựng trong Blender) cho 1 nhân vật và 1 nền. Với mỗi nguồn ghi chi phí, thời gian, mức kiểm soát, bản quyền, khả năng rig. Thêm chất liệu giấy, độ dày cạnh, bóng mềm, ánh sáng một hướng. Xuất ảnh 1080p so cạnh với tham chiếu và dừng để tôi chấm. Không dựng art bằng hình khối code, không vá chất lượng bằng code.
```

**P3, vật lý và bake:**

```
Thực hiện P3. Spike Planck.js và Rapier2D bản -deterministic (và Blender cho cảnh nhấn). Viết test với đáp án giải tích: chu kỳ con lắc, thời gian rơi tự do, độ nảy theo hệ số đàn hồi, trôi sau chạy dài, hash bake lặp lại ở 2 lần chạy. Chạy ở dt cố định rồi bake ra BakeFile (có sự kiện chạm, sha256, phiên bản engine). Dựng cảnh đèn đung đưa khi tay chuyền đèn, kèm tóc/vải dạng chuỗi xương lò xo. Báo cáo số đo và ghi ADR chọn engine.
```

**P7, Director và Critic:**

```
Thực hiện P7. Xây Director agent với công cụ hẹp có schema (chọn clip, đặt timing, tham số, nhấn). Xây Critic xuất báo cáo số đo (vận tốc, gia tốc, jerk, trượt chân, xuyên vật, số overshoot, lệch beat), contact sheet, onion-skin, motion trail, biểu đồ đường cong. Giới hạn 3 vòng sửa mỗi shot rồi dừng và báo tôi, ghi lý do từng lần sửa. Không tự duyệt nghệ thuật.
```
