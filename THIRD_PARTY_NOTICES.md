# Dependencies và nguồn asset

Đây là danh mục kỹ thuật phục vụ studio nội bộ; không tự cấp license mới cho repository. package.json đặt private. Không commit mã/binary node_modules; cài từ lockfile.

| Thành phần | Bản khóa | License/nguồn đã đọc | Vai trò |
| --- | --- | --- | --- |
| HyperFrames producer/engine | 0.9.30 | LICENSE trong npm package: Apache-2.0 | Render/compiler/browser |
| GSAP | 3.15.0 | Standard “No Charge” license; https://gsap.com/standard-license/ | Timeline |
| eSpeak NG Emscripten | 0.3.5 | Package metadata GPL-3.0 và COPYING; https://github.com/echogarden-project/espeak-ng-emscripten | Voice nháp local |
| Zod | 4.6.7 | MIT trong package | Schema validation |
| Puppeteer-core | 24.37.2 | Apache-2.0 trong package | Test browser |
| TypeScript/tsx/Prettier | Theo package-lock | License tương ứng trong package/BOM | Build/dev |
| Chromium/FFmpeg | Theo doctor | Theo build của OS, không đóng gói trong repo | Browser và encode/decode |

eSpeak có nghĩa vụ GPL khi phân phối phần mềm liên quan; trước khi đóng gói sản phẩm ngoài nội bộ cần rà mô hình phân phối/linking và cung cấp source/notices theo license áp dụng. GSAP không được mặc định thành MIT. Thay provider voice là phương án kiến trúc nếu mô hình phân phối không phù hợp. Remotion chỉ có trong harness nghiên cứu; xem license discussion trong báo cáo thẩm định, không coi license của ứng dụng này là license Remotion.

Hình demo SVG, rig, cốc và nền được viết bằng code trong src/rig.ts cho nhiệm vụ này; không tải asset thương mại bên ngoài. Voice demo là eSpeak từ text ví dụ do dự án tạo. Font UI dùng system fonts; video SVG không phụ thuộc font. Asset người dùng upload cần được ghi nguồn/quyền khi triển khai registry P5.

`artifacts/dependency-bom.json` liệt kê dependencies production được npm ghi nhận; metadata license có thể thiếu, không thay việc đọc LICENSE. `validation/evidence/` giữ nguồn thẩm định đã thu thập.
