# F0 — quyền và giấy phép thành phần

Kiểm tra 14/11/2026. Câu hỏi: các gói thực sự đang khóa có metadata và văn bản gì? Đã đối chiếu package.json/COPYING/LICENSE đã cài với `npm view <package>@<version> license repository.url` qua npm registry. Điều này xác minh metadata/bytes của gói, không tự kết luận nghĩa vụ pháp lý của sản phẩm hay quyền đối với tài sản.

| Thành phần | Bản cài và bằng chứng | Đánh giá |
|---|---|---|
| eSpeak Emscripten | `@echogarden/espeak-ng-emscripten` 0.3.5, metadata GPL-3.0, `COPYING`; [upstream](https://github.com/echogarden-project/espeak-ng-emscripten) | VERIFIED metadata/văn bản; PARTIAL về nghĩa vụ theo cách phân phối và linking. |
| GSAP | `gsap` 3.15.0, package và registry nêu Standard No Charge; [văn bản nhà cung cấp](https://gsap.com/standard-license/) | PARTIAL: chưa đọc lại trực tiếp văn bản mới và chưa xác định use case builder có thuộc hạn chế; không gọi là MIT. |
| Rapier deterministic | `@dimforge/rapier2d-deterministic-compat` 0.21.0, metadata Apache-2.0, file LICENSE; [upstream](https://github.com/dimforge/rapier) | VERIFIED gói được cài; không thay thế license dependency hoặc tài nguyên khác. |
| Planck | `planck` 1.5.1, metadata MIT và LICENSE.txt; [upstream](https://github.com/piqnt/planck.js) | VERIFIED gói được cài. |
| HyperFrames | `@hyperframes/producer` 0.9.30, LICENSE Apache-2.0; package metadata và registry thiếu trường license; [upstream](https://github.com/heygen-com/hyperframes) | PARTIAL: file gói xác nhận văn bản; chưa suy license toàn bộ dependency hoặc các phiên bản khác. |

Quyết định: giữ nguyên dependency và notices; không tự cấp phép cho repo, không thêm LICENSE trong F0. Trước phân phối cần đối chiếu full license/notice, use case cụ thể, asset và điều kiện các phiên bản khác; HQ-01 chờ chủ repo. Không có ngân sách dịch vụ. Việc kiểm trực tiếp GSAP và các điều kiện thương mại chưa xong được giữ PARTIAL, không gọi là legal approval.

Bổ sung tra cứu 14/11: [văn bản GSAP trực tiếp](https://gsap.com/community/standard-license/) phân biệt permitted/prohibited uses và có hạn chế đối với một số công cụ visual animation builder cạnh tranh Webflow. VERIFIED nội dung văn bản tại ngày đọc, cộng metadata package3.15.0 thực cài. Việc áp dụng chính xác cho sản phẩm tương lai vẫn PARTIAL, cần đối chiếu use case; không suy giấy phép repository từ license dependency.

## Đề xuất để chủ repo quyết định — PROVISIONAL

Có thể cân nhắc MIT cho **phần code tự sở hữu**, nếu toàn bộ đồng tác giả đồng ý và quyền phân phối phù hợp; không tự tạo LICENSE hay tuyên bố asset/audio/dependency được cấp MIT. Trước khi chọn, rà phạm vi quyền tác giả, ảnh/âm thanh, eSpeak GPL và điều khoản GSAP theo mô hình phân phối; ghi phần loại trừ và notices. Lựa chọn khác là giữ quyền hiện tại cho tới khi việc rà soát hoàn tất. HQ-01 giữ OPEN; người dùng duyệt kế hoạch không tự đồng nghĩa lựa chọn giấy phép cụ thể.
