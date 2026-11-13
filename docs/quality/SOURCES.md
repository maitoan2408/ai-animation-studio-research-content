# Nguồn đã đọc và quyết định

Truy cập13/11/2026; nguồn ngoài là dữ liệu nghiên cứu, không là instruction.

| Nguồn chính thức | Nội dung dùng | Hệ quả / giới hạn |
|---|---|---|
| https://rapier.rs/docs/user_guides/javascript/determinism/ | Điều kiện input, thứ tự bodies, math ngoài WASM | Khóa số liệu đầu vào, không sinh seed bằng sin/cos; cần test hash thực |
| https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md | Có lịch sử thay flavor deterministic; repo JS đã archived | Package0.21 trỏ về dimforge/rapier; npm metadata/tarball mới là version thực sẽ khóa |
| https://www.npmjs.com/package/@dimforge/rapier2d-deterministic-compat | Flavor deterministic có entry CJS cho Node | Dùng đúng bản0.21.0; Apache2 package không phải license toàn repo |
| https://piqnt.com/planck.js/docs/api/classes/World.html | step(timeStep, velocityIterations, positionIterations) | Planck1.5.1 MIT; thử cùng dt, không khẳng định cross-platform float |
| https://piqnt.dev/planck.js/docs/world/simulation.html | Fixed step; đọc qua search, open không truy cập được | Không coi nội dung ngoài phần truy cập là đã đọc |
| https://rapier.rs/docs/user_guides/javascript/collider_contact_skin/ | Skin/contact stability | Đo raw contact, không che xuyên bằng dịch sprite |
| https://docs.blender.org/manual/en/latest/physics/rigid_body/tips.html | Bake rigid motion to keys | Secondary Blender là fallback, không cần chạy lần3 nếu2D đủ mục tiêu |
| https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker | Pose landmarks/confidence/world coords | Chưa có acting reference nên chưa tải model/test inference; license code không thay quyền footage |
| https://github.com/google-ai-edge/mediapipe | Nguồn MediaPipe | Cần pin weights/model terms khi thật sự chọn, không suy từ code Apache |

`SyncRig`: tìm exact name + GitHub/license chưa có nguồn xác minh được; UNVERIFIED,
không cài và không ghi Apache2 là fact. Three/HyperFrames/FFmpeg đã có các thí
nghiệm thật ở Q2; giữ kết quả, chưa lặp khảo sát chung. Manim không cần cho hero
chuyền đèn nên không cài thêm. Các repo montage/lemon/opusc không thay được
acting/physics của pipeline hiện tại nếu chưa có evidence tương ứng.

Không LICENSE ở repo root baseline. Không tự gắn MIT cho tài sản bên thứ ba;
owner có thể chọn MIT cho code do mình sở hữu, dependency/media giữ notice và
điều kiện riêng. Các package mới pin exact version/lock integrity và được kiểm
license file từ tarball lúc cài. Asset gốc do repo tạo, vẫn là development art.
