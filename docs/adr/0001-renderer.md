# ADR 0001 — HyperFrames cho prototype nội bộ

Trạng thái: chấp nhận cho MVP kỹ thuật; xem lại sau P3/P10 nghệ thuật.

Harness đã thử HyperFrames 0.9.30 và Remotion 4.0.542 với cùng evaluator/asset. Cả hai dùng được khi cấu hình đúng. HyperFrames best-effort/Remotion native img có trường hợp thiếu ảnh vẫn exit 0; ứng dụng chọn strict và preflight hash.

Người dùng yêu cầu code chương trình để duyệt sau. Prototype procedural/action hữu hạn cho phép hoàn thiện workflow trước; P0/P2 chưa duyệt art nên đây chưa là quyết định production cuối.

## Quyết định

- HyperFrames strict, một worker, GSAP local, SVG evaluator thuần frame.
- RenderFunction tách application khỏi backend capture; CLI/UI dùng chung service.
- Giữ Remotion trong harness; chưa duy trì hai backend sản phẩm.
- Audio normalize/mix local; decode/QC trước publish.
- Planner offline/voice nháp cho phép tái tạo không cần credential.

## Hệ quả

UI sửa typed SceneSpec rồi compiler sinh HTML; không cho model patch DOM/code tùy ý. Rig hiện giới hạn góc/action. Cache cấp project khiến sửa một câu phải render lại; tối ưu sau đo pilot.

Xem lại ADR khi cảnh art mục tiêu không đáp ứng, công sức sửa vượt ngân sách đo, hoặc representation thiếu capability bắt buộc. Không chọn renderer chỉ từ một mẫu tốc độ. Bằng chứng gốc: reports/Tham_dinh_ky_thuat.md và validation/evidence/.
