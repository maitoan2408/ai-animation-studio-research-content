# V2 checkpoint — F1 technical provisional, F2 IN_PROGRESS

F1: native S05 frame stream publish now gates declared ground, ownership and projected alpha overlap with source and texture hashes. Real S02 stance and S06→S05 declared cut tested. Scope is limited: 2D alpha ≥128, no 3D collision or artistic approval; those remain open. See `docs/reports/F1.md` and F1 evidence.

F2: one torso 1080p mesh spike only; still needs rig/pivot validation, preservation of SVG effects and full S05 diorama/styleframe. See `docs/reports/F2.md`. F3 depends on F1 and F2 and remains unopened until F2 technical gate. Human art, voice, license and independent handoff remain open. Core plan and previous history unchanged.

F2 torso spike giờ dùng pivot manifest; test hình học và anchors so với rig có rotation/scale âm PASS; ảnh 1080p có tại `production/artifacts/quality/v2-f2/spike/pivot-comparison.png`. Mới một asset, chưa chứng minh rig toàn cảnh hay styleframe.

F2: 22 part contour alpha threshold 128 roundtrip nhị phân và triangulation diện tích PASS; frame S05 108 có 71 sprite, 31 đùn, so flat/volume 1080p tại `production/artifacts/quality/v2-f2/s05-scene`. Cả hai có yaw minh họa từng phần có thể lệch rig, chưa có bóng mới, chỉ một frame; F2 vẫn mở. Xem F2 report trước khi tiếp tục.

F2 tiếp theo: bản frame 108 bỏ per-part yaw, giữ face transform 2D, oblique shear trên body và directional VSM shadow receiver chung. So có/không shadow có thay đổi; chưa xác minh shadow theo layer hay contact sàn, chỉ một frame và chưa duyệt art. Artifacts `production/artifacts/quality/v2-f2/s05-oblique`, xem F2 report. F2 vẫn IN_PROGRESS.

F2 face anchor/contour coverage kiểm S05 tất cả 192 frame; ảnh thử 0, 108, 191 ở 1080p. Chưa kiểm animation, bóng đúng layer hoặc chất lượng art. F2 vẫn mở.

F2 coverage: 117 raster phát triển hash/decode PASS (51 R3 giữ nguyên + 66 mới), 58 foreground contour binary/triangulation PASS. 59 background/shadow/effect chưa mesh; 7 mouth state và 4 nhãn mood chưa đủ 8 viseme/6 biểu cảm. Giữ F2 mở; xem F2 report.

F2: thêm pack draft độc lập 3 mouth (8 nhãn ngoài rest) và 18 đầu sad/surprised/angry cho 2 nhân vật × 3 góc; giữ pack cũ. Preview tại `production/artifacts/quality/v2-f2/draft-sheets/`, chưa ghép rig hay kiểm phoneme/voice, chưa duyệt art; F2 vẫn mở.

F2 overlay riêng 138 asset được build từ 117 cũ + 21 draft, test rig 288 tổ hợp anchor và bake cũ từ chối art hash khác. Chưa có shadow mới của draft, bake/renderer overlay và review art/voice. F2 vẫn mở.
