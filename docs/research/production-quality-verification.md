# Kiểm tra gói nghiên cứu production — 11/11/2026

## Phạm vi

Chỉ bổ sung nghiên cứu/kế hoạch và tài liệu bàn giao. Baseline ứng dụng: `b79ec76497b7cb57f753f596cb60969aae3383d2`. Branch nghiên cứu: `codex/production-quality-research`. Các thử nghiệm backend/model/DCC đề xuất vẫn **NOT_RUN**.

## Kết quả đã thực hiện

| Kiểm tra | Kết quả | Phạm vi bằng chứng |
| --- | --- | --- |
| `npm run verify` | PASS: format, hai cấu hình typecheck, 16 tests; 0 fail | Nền ứng dụng cũ; [log mới](production-quality-baseline-verify.log). Không chứng minh chất lượng art/motion production |
| `git diff --exit-code b79ec764 -- src web tests scripts skills validation artifacts package.json package-lock.json` | PASS | Không thay đổi code/dependencies/test evidence cũ |
| `sha256sum -c SHA256SUMS` | PASS | Word/PDF gốc giữ nguyên |
| `sha256sum -c artifacts/SHA256SUMS` | PASS | Các artifact bàn giao cũ giữ nguyên |
| Link Markdown nội bộ trong gói mới và các mục index đã sửa | PASS | Tất cả đích local tồn tại, gồm Word mới |
| Manifest nguồn JSON | PASS | 11 repo, commit SHA 40 ký tự hex; mọi file URL có commit khóa |
| DOCX ZIP/XML | PASS | ZIP không hỏng, 320 paragraphs cấp document, 9 bảng, 62 hyperlink ngoài; có Q0/Q9, P0/P11, S01/S06, NOT_RUN và tên nguồn chính |
| `git diff --check` | PASS | Không có lỗi whitespace trong diff đã kiểm |
| Pagination/hiển thị Word bằng office renderer | NOT_RUN | Mới kiểm cấu trúc/nội dung; không tuyên bố đã xem từng trang trong Word |
| Renderer integration/UI/model benchmarks mới | NOT_RUN | Vòng này không thay renderer/UI và người dùng yêu cầu nghiên cứu trước |

Kiểm manifest chỉ xác nhận hình thức và liên kết snapshot; không có nghĩa toàn repo đã được audit hoặc phần mềm đã chạy. Kết luận dựa vào các phần source đã đọc được mô tả trong [sổ nguồn](production-quality-sources.md).

## Tạo bản Word

Nguồn nội dung theo thứ tự:

1. `reports/Nghien_cuu_chat_luong_production.md`.
2. `docs/production-quality-plan.md`.
3. `docs/research/production-quality-sources.md`.

Công cụ đã dùng: Pandoc **3.1.11.1**, python-docx **1.2.0**. Bản Word là snapshot để đọc; Markdown là nguồn chỉnh sửa chính. Link local được chuyển sang đường dẫn GitHub trên branch nghiên cứu; sơ đồ Mermaid chuyển thành luồng diễn giải bằng chữ trong Word. Khổ A4, lề trái/phải 1,7 cm, trên/dưới 1,8 cm; Arial 10,5 pt thân bài, 9 pt bảng, header bảng lặp, có mục lục và số trang.

Lần tạo đầu lỗi tra tên style heading của reference DOCX; chưa tạo file bàn giao. Đã sửa thao tác chọn style bằng style ID, tạo lại thành công và kiểm ZIP/XML/link/nội dung như trên. Không ảnh hưởng tài liệu gốc.

Để tạo lại nội dung Word bằng Pandoc, có thể xuất ba Markdown theo thứ tự trên với `--from=gfm --to=docx --standalone --toc --toc-depth=2`; dùng reference DOCX theo thông số đã ghi để giữ bố cục tương tự. Đây không phải cam kết DOCX bit-identical vì metadata/serializer có thể khác. Hash snapshot bàn giao nằm ở `reports/SHA256SUMS.production-quality`.

## Chưa có bằng chứng để đổi trạng thái production

Q0–Q9 chưa thực hiện; chưa có art target được duyệt, A/B video, thử GPU/paid provider, corpus khẩu hình, quality scores hoặc accepted-minute cost mới. Kết quả PASS của kiểm tra tài liệu và nền ứng dụng không được đổi thành PASS các gate này.
