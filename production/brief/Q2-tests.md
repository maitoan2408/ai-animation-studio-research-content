# Q2 expected results — khóa trước chạy

Q1 art/rig kỹ thuật sẵn sàng; nghe duyệt voice EX-011 còn mở. Q2 preflight/blocking
dùng fixture cố định, không tự đóng gate voice hoặc phê duyệt motion bằng unit tests.

1. Required texture: fetch thành công, SHA đúng, decode đúng dimensions, shader
   sẵn sàng. 404/hash sai/corrupt PNG/timeout đều phải reject; không expose `__hf`
   trước ready. Slow asset 400 ms phải được chờ. Không dùng public counter không
   tồn tại của native Three LoadingManager r187.
2. Seek: frames 0/23/24/47/48/71/72/95/96/119/120/last, xuôi/ngược/trộn và browser
   mới. State JSON và PNG SHA giống trong cùng software renderer; không ngoại suy GPU.
3. Mỗi frame S01–S06: finite transforms, IK không stretch, asset tồn tại. Contact
   S03 60–179, S05 Mai 0–107/An 72–191: actual hand/prop anchors world ≤2 px;
   screen ≤2 px sau camera. Place support trước release. Chân trụ không trượt >2 px.
4. Camera trong overscan; viewer không thấy mép layer. S06 không để tay che mặt.
5. A dùng Three + HyperFrames capture protocol. B native planes/keyframes `.blend`,
   cùng art/poses/audio; không dùng sequence video A làm bằng chứng authoring B.
6. Blocking trước polish: preview 640×360, finals 1920×1080/24. Proxy không chứng
   minh final art. Không frame interpolation/upscale. Hai vòng sửa theo shots.json.
7. Log cả failures và các cấu hình thử. Chỉ đo 3 cold +5 warm sau khi art/motion
   đạt; không suy production throughput từ environment smoke.
