# M2 — kết quả thẩm định và bàn giao

Trạng thái: **READY_FOR_USER_REVIEW** (kỹ thuật PASS; chủ dự án chưa duyệt hình/tiếng). Bản cuối đã sửa tương thích CLI và vượt qua CI đầy đủ. M3 chưa bắt đầu.
Người thực hiện kiểm tra: `delegated-agent`. Không giả là một chuyên gia độc lập hoặc chủ dự án đã xem/nghe và duyệt.

## Lỗi tìm thấy và sửa

1. Harness so sánh chuỗi SHA-256 với Buffer video thay vì hai hash. Node tạo thông báo diff khổng lồ, vượt 8 GiB và bị OOM kill. Đã tái hiện trên source `84598ab`, giữ nguyên log FAIL và số liệu bộ nhớ. Video đã qua QC trước lỗi này; nhận định trước đó rằng lỗi nằm trong final decode chưa đủ căn cứ và đã được sửa. Bằng chứng: [root cause](evidence/m2-oom-root-cause.json).
2. `doctor` thiếu `rsvg-convert`: thêm lỗi có hướng dẫn cài `librsvg2-bin`, kiểm phiên bản trong fingerprint, cập nhật CI/tài liệu. Sau khi cài công cụ, server có thể thử lại mà không giữ promise lỗi cũ.
3. Preview không vẽ khẩu hình theo audio envelope như final: dùng cùng WAV đã kiểm hash và dữ liệu âm lượng; audio bị sửa ngoài ứng dụng bị từ chối trước khi trả ảnh.
4. Hủy worker render có thể để encoder con chạy tiếp: nhóm tiến trình riêng được dừng cùng nhau; kiểm tra hủy và chạy lại không còn tiến trình con sống.
5. Harness UI chờ nhiều hơn một lựa chọn trong khi chỉ có một video hợp lệ: kiểm đúng artifact ID, metadata và phát thử video trong Studio.

6. Bước ghi provenance mới chạy được local nhưng CI container có Git checkout khác UID. Đã tái hiện exit 129 bằng `GIT_TEST_ASSUME_DIFFERENT_OWNER`; dùng `git -c safe.directory=<đúng repo>` cho từng lệnh, kiểm provenance trước render, không đổi cấu hình global. Lần CI 43735567658 qua các gate media/UI/reopen rồi lỗi tại bước này; vẫn giữ trạng thái FAIL.

7. Audit CLI phim dài tái hiện `JSON.parse` thất bại do `[M2 ...]` trên stdout. Chuyển diagnostics của renderer sang stderr; ca real compiled CLI xuất 384 frame được thêm vào CI để giữ nguyên hợp đồng JSON.

## Đối chiếu kế hoạch

| Yêu cầu | Bằng chứng đã đạt |
|---|---|
| Phim mới 20–30 giây, ≥3 cảnh, native 1920×1080/24fps | Phim `Ngày mới trên giấy`, 3 cảnh × 8 giây; 576 frame; ffprobe và decode toàn bộ |
| Từ script ngoài, chỉnh qua Studio, không viết logic riêng từng cảnh | `examples/m2-new-story.txt`; tạo dự án, đổi tiêu đề/màu cảnh 2 qua browser; ảnh trước/sau |
| Voice local có dữ liệu thật, đúng cảnh | WAV được hash; AAC 48 kHz; waveform cuối đối chiếu nguồn tại độ trễ 0 từng cảnh |
| Lưu revision, export/import/reopen | Phiên bản cũ bất biến; gói dự án giữ nội dung/audio; tiến trình OS mới mở lại đúng revision và artifact hash |
| Preview và final nhất quán | So SVG từ HTTP và pixel native ở đầu/cuối từng cảnh, frame lời thoại mạnh nhất; ngưỡng cố định trước đo |
| Kiểm tra âm tính | Action ngoài phạm vi, schema/path/hash/revision/audio overflow; video sai revision và audio lệch 250 ms phải bị chặn |
| Giữ logic và kiểm thử cũ | Cả CI ứng dụng lẫn workbench; integration/UI/recovery; M1 legacy/IR parity và Three render |
| Bàn giao dùng được | MP4, ảnh Studio desktop/mobile, contact sheet, gói dự án và manifest SHA; video thực sự load/seek/play trong browser |

**Tất cả tiêu chí kỹ thuật trong bảng đã PASS.** Source cuối được tái kiểm ngày 16/11/2026: `bc351255374a7aac499e056daf8ed194167bb74a`. [CI ứng dụng và M2 product](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952273) cùng [CI workbench](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952293) đều SUCCESS, gồm unit/negative tests, types/build, integration/UI/recovery, regression JSON CLI dài, M1 parity và standalone Git-only.

[**Tải video và gói dự án M2**](https://github.com/maitoan2408/ai-animation-studio-research-content/actions/runs/43737952273/artifacts/14170989211) (artifact bản cuối `paper-studio-m2-145`, hạn lưu CI 29/11/2026). Mở `m2-edited-film-final-1080p.mp4` để xem. Nhập `m2-edited-project.studio.json` qua “Nhập gói dự án” để chỉnh tiếp; gói portable giữ revision cuối và audio, không xuất toàn bộ lịch sử revision nguồn.

[Manifest gắn đúng source SHA và synthetic merge SHA](evidence/m2-ci-a6399e2/manifest.json), [pixel/audio parity](evidence/m2-ci-a6399e2/preview-final-parity.json), [reopen ở tiến trình mới](evidence/m2-ci-a6399e2/reopen-proof.json), [ảnh Studio desktop](evidence/m2-ci-a6399e2/studio-rendered-film-desktop.png), [mobile](evidence/m2-ci-a6399e2/studio-rendered-film-mobile.png), [contact sheet](evidence/m2-ci-a6399e2/m2-contact-sheet.png).

- Video: **24 giây, 3 cảnh, 576 frame, 1920×1080, 24fps, AAC 48 kHz**; 1.213.827 bytes. SHA-256 `cc3177c7c71393fb54778f12c05023e102ff229cd6111a161cbf3ff61b8ed109`.
- Đã tải và kiểm đủ **23 SHA artifact**. Video CI giống từng byte với bản local đã full-decode/kiểm browser; sai số timestamp tối đa của cả 576 frame là **0,000000334 giây**.
- 9 frame native ở hai phía điểm cắt và đỉnh thoại: MAE lớn nhất **1,606/255**, tile xấu nhất **2,033/255**, nằm trong ngưỡng khóa trước đo. Tương quan waveform tại độ trễ 0 từng cảnh **≥0,99983**.
- Kiểm âm tính độc lập qua đầu ra thực phát hiện video sai revision và voice lệch **250 ms**; [report](evidence/m2-negative-media-report.json). Đây là kiểm tra của cùng agent, không phải người nghe/animator độc lập.
- Đã quan sát ảnh desktop/mobile, contact sheet và 24 mốc cách nhau một giây từ movie: đủ ba hành động wave/walk/pick-up, thay màu cảnh 2 thể hiện đúng, không cảnh đen/trống hoặc nhân vật mất khỏi khung tại các mốc quan sát. Browser đã thực sự load/seek/play video; không chỉ kiểm file tồn tại. Không chấm điểm diễn xuất hoặc tuyên bố đã nghe bằng tai.

Vòng cuối **đã hoàn tất**: sửa stdout CLI dài, bổ sung regression `tests/cli-long.ts`; hai workflow trên commit cuối đều SUCCESS. Đã tải artifact mới nhất: 23/23 SHA đối chiếu manifest khớp, video trùng SHA `cc3177c7...`, ffprobe xác nhận 576/576 frame 24fps 1920×1080 và AAC 48kHz, ffmpeg full decode không lỗi. `userAcceptance=NOT_REVIEWED`; người dùng duyệt video và nghe lời thoại trước khi chuyển M3.

## Phạm vi chất lượng

M2 hoàn thiện luồng sản phẩm và tính đúng của dữ liệu/video trong phạm vi renderer và action sẵn có. Không mở rộng sang bộ chuyển động M3, vật lý M4 hoặc đánh bóng nghệ thuật M6. Voice eSpeak tiếng Việt là giọng nháp để duyệt timing, chưa phải giọng tự nhiên chất lượng cao. Kiểm PCM không thay việc người dùng nghe duyệt.

Kiểm ảnh/pixel/âm thanh do chương trình và review bởi cùng agent không được gắn nhãn duyệt nghệ thuật độc lập. `ACCEPTED` chỉ do chủ dự án quyết định; không auto-merge.

## Audit bổ sung 16/11/2026 — hình ảnh và hạn chế

Đã xem contact sheet thực và 12 frame rải đều khắp 24 giây: đủ wave, walk, pick-up và cảnh 2 có màu đã chỉnh; không gặp shot đen hoặc mất nhân vật. Tuy vậy, biểu cảm và chuyển động còn sơ cấp: vẫy tay lặp lại, dáng đi cứng, thao tác nâng cốc cơ học với tay kéo dài. Đây là rủi ro thẩm mỹ đã ghi nhận cho M3/M6, **không** tự nhận video có chất lượng phim cuối. Giọng eSpeak là bản nháp timing; bài kiểm tra số xác nhận nguồn PCM và audio khớp, nhưng không thay thế người dùng trực tiếp nghe đánh giá. M2 chưa được owner nghiệm thu.

Tình trạng sau audit: `technicalStatus=PASSED`, `evidenceStatus=READY_FOR_USER_REVIEW`, `userAcceptance=NOT_REVIEWED`. Những lần CI FAIL trước đây và nguyên nhân/sửa lỗi được giữ nguyên ở lịch sử và báo cáo nguồn.
