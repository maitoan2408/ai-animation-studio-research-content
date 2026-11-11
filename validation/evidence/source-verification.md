# Nguồn đối chiếu trong lần thẩm định 10/11/2026

Các ghi chú này mô tả nội dung đã đối chiếu ở thời điểm kiểm tra. Chúng không thay thế bản chụp lịch sử ngày 09/11 được báo cáo gốc nhắc đến. Toàn bộ danh mục 48 URL của tài liệu gốc nằm ở `report-sources.json`; không phải tất cả đã được kiểm chứng lại.

| ID | Nguồn chính thức | Nội dung dùng trong thẩm định |
| --- | --- | --- |
| H01 | https://github.com/heygen-com/hyperframes | Dự án HeyGen HyperFrames, HTML-to-video; đối chiếu thêm engine requirement từ package npm 0.9.30 |
| H03 | https://hyperframes.heygen.com/concepts/compositions | Root composition, clip timing/class, thời gian và đường dẫn composition |
| H05 | https://hyperframes.heygen.com/packages/producer | createRenderJob/executeRenderJob, render formats, validation frame count, orchestration bên ngoài |
| H06 | https://hyperframes.heygen.com/concepts/frame-adapters | Nhãn experimental v0, seekFrame và các trách nhiệm của host |
| R01 | https://www.remotion.dev/docs/cli/create-video | Flags scaffold; tài liệu có chi tiết về Git khác hành vi package 4.0.542 trong thử này: package cho phép --yes trong repo. Không kết luận lệnh sẽ lỗi chỉ từ đoạn docs đó |
| R03 | https://www.remotion.dev/docs/flickering | Animation phải dựa frame; tránh state phụ thuộc thứ tự render |
| R07 | https://www.remotion.dev/docs/license/pricing | Free/Company và các mức Automators/Creators/Enterprise đã nêu trong báo cáo vẫn xuất hiện |
| R08 | https://www.remotion.dev/docs/terms-4-0 | Điều khoản cho v4; tách khỏi v5 |
| R09 | https://www.remotion.dev/docs/terms | V5 tiếp tục được gắn “Upcoming document” tại thời điểm đọc |
| R10 | https://www.remotion.dev/docs/gsap | Package chính thức, timeline được điều khiển theo frame, yêu cầu đồng bộ phiên bản |
| R11 | node_modules/remotion/LICENSE.md ở 4.0.542 | License riêng; eligibility free, có trường hợp đánh giá phi thương mại. Bản sao lưu tại `remotion-4.0.542-LICENSE.md` |
| R12 mới | https://www.remotion.dev/docs/img | Img chờ ảnh; nếu tải lỗi sau retry thì cancelRender, trừ khi tác giả tự xử lý error; đã xác nhận bằng negative test |
| G01 | https://gsap.com/community/standard-license/ | Điều kiện permitted/prohibited uses cho một số visual animation builders; chưa đưa kết luận license cho sản phẩm tương lai |
| S01 | https://raw.githubusercontent.com/DanielSWolf/rhubarb-lip-sync/master/README.adoc | PocketSphinx cho tiếng Anh; phonetic cho ngôn ngữ khác và có giới hạn độ chính xác; không phải benchmark tiếng Việt |
| S02 | https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/workflows/alignment.html | Quy trình alignment với model/dictionary/corpus; chưa chạy corpus thực |
| S05 | https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps | Response có characters, character_start/end_times_seconds; không cung cấp viseme trực tiếp qua các trường này |
| O01 | https://opentimelineio.readthedocs.io/en/v0.18.0/ | Editorial data, tracks/clips/timing và tham chiếu media bên ngoài |
| O02 | https://docs.langchain.com/oss/python/langgraph/persistence | Checkpointer và store; không thay hệ thống lưu artifact |
| O03 | https://docs.temporal.io/activity-definition | Activity phải được thiết kế idempotent vì có thể retry; side effect ngoài cần xử lý riêng |

Bằng chứng runtime được ưu tiên hơn suy đoán từ tài liệu: gói npm cụ thể, lockfile, type declarations đã cài, command logs, video decode và PNG hash. Những khác biệt môi trường proxy/cache được ghi là giới hạn bootstrap, không gán cho chất lượng renderer.
