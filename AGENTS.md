# Hướng dẫn làm việc trong repo

## Vòng thực hiện hiện hành

Người dùng đã ủy quyền thực hiện/ra quyết định từng phase và tự sửa lỗi. Đọc
`docs/execution/RESUME.md` và `state.json` trước khi tiếp tục. Review theo ủy quyền
phải ghi `delegated-agent`, không giả là người dùng hoặc chuyên gia độc lập đã duyệt.
Sau từng bước có evidence, cập nhật checkpoint và push nhánh; giữ toàn bộ kết quả cũ.

## Mục tiêu

Xây studio nội bộ tạo hoạt hình 2D/2.5D từ kịch bản. Sản phẩm phải chạy lại được, có bằng chứng kiểm thử và review gắn đúng revision/artifact. Đọc `plan.md`, `docs/architecture.md`, `skills.md` trước khi đổi workflow.

## Quy tắc triển khai

- TypeScript strict; tách domain, lưu trữ, planner, compiler/render và HTTP/UI. Hàm và dữ liệu có tên mô tả trách nhiệm.
- Validate dữ liệu tại biên vào và trước render. Không thực thi HTML/JS do người dùng hoặc model cung cấp.
- Asset lưu theo SHA-256; revision bất biến. Ghi JSON qua temporary file + rename. Cập nhật revision có kiểm tra bản gốc để tránh ghi đè đồng thời.
- Job có attempt riêng, AbortSignal, log và output tạm. Chỉ công bố artifact sau decode/QC. Không tự duyệt nghệ thuật.
- Không coi exit 0/file tồn tại là đã đạt. Kiểm frame count, dimensions, fps, audio và hash.
- Render dùng dependency đã khóa và asset local. Không đặt API key vào project/export/log/Git.
- Mọi lỗi phải có code/message hữu ích. Không bắt exception rồi báo thành công hoặc im lặng fallback làm sai nội dung.
- Mỗi mốc cập nhật plan, tài liệu sử dụng, kết quả thực đo và changelog; commit có phạm vi rõ. Đẩy branch để người dùng review, không tự merge.

## Kiểm tra bắt buộc

`npm run verify` cho typecheck và tests nhanh. `npm run test:integration` cho renderer/CLI/storage workflow trên Chromium + FFmpeg. `npm run test:ui` cho luồng trình duyệt khi đổi UI/API. Các test có phí hoặc cần credential riêng không được đánh dấu pass nếu chưa chạy.

Kiểm thử phải gồm input lỗi và recovery khi thay state machine, không chỉ happy path. Khi test thất bại, giữ log, sửa nguyên nhân và chạy lại phần liên quan. Không chỉnh ngưỡng để che sai khác chưa giải thích.

## Dữ liệu và tài liệu

- `data/` là runtime, không commit. `examples/` là input có thể tái tạo. `artifacts/` chỉ lưu bằng chứng chọn lọc, không cache/browser/binary.
- `reports/` giữ nghiên cứu và thẩm định gốc. `validation/` là harness nghiên cứu, tách khỏi ứng dụng.
- Ghi rõ PASS, FAIL, BLOCKED hoặc NOT_RUN. Fixture hình học không chứng minh chất lượng phim hoàn chỉnh.

## Kiểm workbench Q2 trước Q3

Prototype production nằm riêng, không coi capability của nó đã có trong app v0.1.
Chạy `npm --prefix production run typecheck`, `npm --prefix production test` và
`python -m unittest discover -s production/tests -p 'test_*.py' -v` khi thay phần
liên quan. Renderer/media thay đổi phải có real native render/decode và artifact.
Các lệnh đều bọc `scripts/run-step.py`; historical fail snapshots giữ nguyên.
Đọc `production/evidence/Q2/gate.json` và `production/artifacts/Q2/review-final`.
Không suy voice audition từ loudness, color approval từ tags, motion score từ
contact tests, hoặc independent handoff từ cùng agent chạy process mới.

## Công cụ review Q2 và tái lập media

`production/src/review/README.md` là hướng dẫn code/API/journal. Catalog mặc định
v2 có media chia32MiB parts; chạy review_bundle.py restore trước review/check/UI.
Không commit lại MP4 đã ghép hoặc sửa các phần/manifest để khớp video khác.
Mọi review cần đúng artifact SHA/master SHA/revision/shot/frame; test phải dùng
automated-test và thư mục dữ liệu riêng. Không coi checkbox xem/nghe là xác minh
danh tính hoặc bằng chứng người độc lập. CI workbench không đóng gate mỹ thuật.
Các helper kiểm v0.1 dùng run_app_regression.py để giữ hash deliverables cũ;
helper phải build CLI trong workspace tách biệt trước integration/UI tests.
