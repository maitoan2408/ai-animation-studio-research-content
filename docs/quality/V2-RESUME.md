# V2 current checkpoint — F1 và F2 IN_PROGRESS

Kế hoạch gốc: `V2-USER-PLAN.md`; hàng đợi: `state.json` mục `v2`; quyết định người: `HUMAN-QUEUE.md`. Branch `codex/v2-continuous`; PR #7. F0 technical PASS trên CI source ae508cb; art/voice/license và threshold raster vẫn PROVISIONAL (`docs/reports/F0.md`).

F1 có boundary validator và contact critic với negative tests, kiểm 4 chân S05 qua 192 frame và kiểm nối tổng hợp. Xem `docs/reports/F1.md`, `production/artifacts/quality/v2-f1/report.json` và evidence U2/U7. Không gọi F1 hoàn thành: cần nối 2 shot thực, trích owner/body/prop từ scene, đổi tên metric preservation và tích hợp gate. F2 độc lập từ F0: đã inventory 117 SVG, 116 có filter và 51 có ảnh nhúng; xem `docs/reports/F2.md`. Tiếp tục pipeline mesh bảo toàn hiệu ứng, material/render và nghiên cứu texture. F3 chờ F1/F2. Không tự duyệt mỹ thuật hoặc thay golden để che lỗi.

Đã giữ checkpoint trước và log trong Git; F0: save/voice/upload/detach/navigation race được kiểm Chromium, comparator dữ liệu và raster có test, ngưỡng production chưa hiệu chuẩn. F1: TypeScript 42, Python 23, root verify PASS; failure injection được giữ.

## Tiếp tục 14/11 — đối chiếu đề xuất Q0–Q9

Giữ kế hoạch lõi và state, chọn lọc đề xuất tại `PLAN-REVIEW-20261114.md`. Critic F1 đã sửa để kiểm world và projected drift độc lập; zoom out không che trượt chân, có test đổi stance tổng hợp. Giữ ngưỡng fixture 1 px. F1/F2 vẫn IN_PROGRESS, real seam/collision proxy và F2 render chưa xong.
