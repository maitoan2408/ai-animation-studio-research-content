# Nhật ký kiểm chứng ứng dụng

Kết quả nghiên cứu gốc nằm trong `validation/evidence/` và `reports/Tham_dinh_ky_thuat.md`. Nhật ký này dành cho chương trình mới. PASS kỹ thuật không thay cho duyệt hình ảnh và giọng nói của người dùng.

## M1 — schema, planner, revision store

- `npm run verify`: PASS, TypeScript strict và 7 tests.
- Đã kiểm: parsing script, thời lượng/action sai, quá số cảnh, narration/voice hash, scene ID trùng, unknown fields, hai cập nhật đồng thời chỉ một thành công, revision cũ không đổi, path traversal, asset bị sửa bytes, job running sau restart chuyển interrupted.
- Máy kiểm: Node 24.22.1, Linux; file JSON trong temporary data directory.
- Giới hạn tại mốc này: chưa nghiệm thu renderer/UI. Các lệnh sản phẩm sẽ được nối ở M2–M4.
