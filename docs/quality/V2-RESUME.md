# V2 current checkpoint — F1 và F2 IN_PROGRESS

Kế hoạch gốc: `V2-USER-PLAN.md`; hàng đợi: `state.json` mục `v2`; quyết định người: `HUMAN-QUEUE.md`. Branch `codex/v2-continuous`; PR #7. F0 technical PASS trên CI source ae508cb; art/voice/license và threshold raster vẫn PROVISIONAL (`docs/reports/F0.md`).

F1 có boundary validator và contact critic với negative tests, kiểm 4 chân S05 qua 192 frame và kiểm nối tổng hợp. Xem `docs/reports/F1.md`, `production/artifacts/quality/v2-f1/report.json` và evidence U2/U7. Không gọi F1 hoàn thành: cần nối 2 shot thực, trích owner/body/prop từ scene, đổi tên metric preservation và tích hợp gate. F2 độc lập từ F0: bắt đầu inventory ngữ nghĩa 117 SVG, pipeline mesh, material/render và nghiên cứu texture. F3 chờ F1/F2. Không tự duyệt mỹ thuật hoặc thay golden để che lỗi.

Đã giữ checkpoint trước và log trong Git; F0: save/voice/upload/detach/navigation race được kiểm Chromium, comparator dữ liệu và raster có test, ngưỡng production chưa hiệu chuẩn. F1: TypeScript 42, Python 23, root verify PASS; failure injection được giữ.
