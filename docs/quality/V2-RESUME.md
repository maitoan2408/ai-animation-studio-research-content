# V2 checkpoint — F1 technical provisional, F2 IN_PROGRESS

F1: native S05 frame stream publish now gates declared ground, ownership and projected alpha overlap with source and texture hashes. Real S02 stance and S06→S05 declared cut tested. Scope is limited: 2D alpha ≥128, no 3D collision or artistic approval; those remain open. See `docs/reports/F1.md` and F1 evidence.

F2: one torso 1080p mesh spike only; still needs rig/pivot validation, preservation of SVG effects and full S05 diorama/styleframe. See `docs/reports/F2.md`. F3 depends on F1 and F2 and remains unopened until F2 technical gate. Human art, voice, license and independent handoff remain open. Core plan and previous history unchanged.

F2 torso spike giờ dùng pivot manifest; test hình học và anchors so với rig có rotation/scale âm PASS; ảnh 1080p có tại `production/artifacts/quality/v2-f2/spike/pivot-comparison.png`. Mới một asset, chưa chứng minh rig toàn cảnh hay styleframe.

F2: 22 part contour alpha threshold 128 roundtrip nhị phân và triangulation diện tích PASS; frame S05 108 có 71 sprite, 31 đùn, so flat/volume 1080p tại `production/artifacts/quality/v2-f2/s05-scene`. Cả hai có yaw minh họa từng phần có thể lệch rig, chưa có bóng mới, chỉ một frame; F2 vẫn mở. Xem F2 report trước khi tiếp tục.

F2 tiếp theo: bản frame 108 bỏ per-part yaw, giữ face transform 2D, oblique shear trên body và directional VSM shadow receiver chung. So có/không shadow có thay đổi; chưa xác minh shadow theo layer hay contact sàn, chỉ một frame và chưa duyệt art. Artifacts `production/artifacts/quality/v2-f2/s05-oblique`, xem F2 report. F2 vẫn IN_PROGRESS.
