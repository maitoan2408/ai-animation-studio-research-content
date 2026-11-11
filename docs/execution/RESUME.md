# Điểm tiếp tục — production Q0–Q9

- Branch: `codex/production-q0-q9`; baseline `6862c9e`.
- Chỉ thị hiện hành của người dùng: thực hiện từng giai đoạn, kiểm thử từng bước,
  lập plan/sửa lỗi tự động, toàn quyền quyết định, đẩy Git và lưu log sau mỗi bước.
- Phạm vi đã được phép: chọn brief/art/backend, viết prototype/harness và code
  sản phẩm theo gates; không cần hỏi lại các quyết định triển khai thường lệ.
- Các quyết định nghệ thuật do agent thực hiện theo ủy quyền phải ghi đúng reviewer.
  Không tạo review dưới tên người dùng. Không tuyên bố có người độc lập đã xem phim.
- Giữ ngân sách dịch vụ trả phí bằng 0; dùng môi trường/công cụ local có sẵn.

## Trạng thái gần nhất

Q0 DONE_DELEGATED: brief/rubric/source references khóa, 16 app tests + brief gate PASS.
Q1 IN_PROGRESS: 60 SVG + styleframes draft-1 đã có, typecheck PASS.
Review phát hiện EX-006/007/008; giữ ảnh lỗi, chưa art approval. Q2–Q9 chưa bắt đầu.
Nguồn trạng thái máy đọc: [state.json](state.json). Các phase và điều kiện đầy đủ:
[kế hoạch](../toolchain-future-plan.md); snapshot này không bị sửa lại thành DONE.

## Lệnh tiếp theo

```bash
git status --short --branch
cat production/evidence/Q0/gate.json
cat production/brief/Q0-brief.md
```

Tiếp tục Q1: thêm contact invariant, sửa EX-006/007/008 và re-render draft-2.
Dependencies workbench đã khóa; textures là generated trong production/out/art-q1.
Sau styleframe gate, kiểm Blender/Three môi trường và audio trước Q2. Khi đã hoàn thành
một bước, thay mục này bằng bước thực tế tiếp theo, không chạy lại toàn bộ history.

## Quy tắc phục hồi

`request.json` được ghi trước process. Thiếu `result.json` = INCOMPLETE, không phải
PASS; giữ thư mục và tạo run mới. Không chạy lại vào artifacts/logs cũ. Nếu remote
đã có checkpoint mới, đọc delta trước khi tiếp tục. Tiến độ test tự động không đóng
gate hình/chuyển động nếu chưa có media và review tương ứng.
