# Production workbench — thực hiện Q0–Q9

Đây là đường thực hiện từ nghiên cứu commit `6862c9e`. Trước Q3, prototype nằm
riêng trong thư mục này. Ứng dụng v0.1 được giữ để regression; không thay renderer
trước khi có kết quả sáu shot.

## Bắt đầu hoặc tiếp tục

1. Đọc [RESUME](../docs/execution/RESUME.md), [state](../docs/execution/state.json),
   [issue ledger](../docs/execution/issues.md) và gate của phase hiện tại.
2. `git status --short --branch`; không ghi đè thay đổi của người khác.
3. Mỗi bước chạy qua `python scripts/run-step.py Q0 step-name -- <command>` từ repo root.
4. Đọc `production/evidence/Q*/<run-id>/result.json` và stdout. Không có result
   nghĩa là chưa biết kết quả; chạy attempt mới, không ghi PASS cho attempt cũ.
5. Khi fail: tạo issue ghi nguyên nhân giả thuyết, plan sửa nhỏ nhất, expected và
   ca regression; sửa; chạy lại thành attempt mới. Không thay ngưỡng sau kết quả.
6. Mỗi checkpoint cập nhật state/RESUME/plan/CHANGELOG, commit và push branch.

Từ run `20261111T234752Z`, recorder lưu thêm `source.zip` với đúng source/lock/art
bytes và SHA; có thể phục hồi code chưa commit tại lần fail. Các run cũ chỉ có
hash/base commit và không được backfill bằng source mới rồi gọi là snapshot cũ.

## Bố trí source và dữ liệu

- `brief/`: mục tiêu, rubric, kịch bản, references, shot beats đã khóa Q0.
- `assets/`: native SVG/PNG/WAV và metadata/version/rights; source phải sửa được.
- `src/`: prototype evaluator, authoring và backend; mỗi module có contract rõ.
- `tests/`: assertions theo contract; case lỗi và phép đo độc lập với renderer.
- `evidence/`: immutable run manifests/logs và review; stdout thô được giữ.
- `artifacts/`: ảnh/clip nhỏ chọn lọc để review, gắn source/version/hash.
- `out/`, `node_modules/`, `.cache/`: generated, gitignored; tạo lại bằng lệnh.

Không lấy status PASS của lệnh làm duyệt mỹ thuật. Các review do AI thực hiện theo
ủy quyền được ghi `delegated-agent`, không gán danh tính người dùng hoặc người
review độc lập. Snapshot nghiên cứu trước giữ nguyên.
