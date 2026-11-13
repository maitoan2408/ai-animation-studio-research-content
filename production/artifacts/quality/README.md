# Quality upgrade — evidence index

Baseline R3 vẫn ở `../Q2/web-review-v3`. Candidate U3-S05-secondary-v1 không
thay R3 mặc định và không kế thừa bất kỳ approval nào.

- [So hình R3/U3 ở frame120/168](hero/comparison.jpg).
- [Input vật lý](hero/input.json), [bake192frame](hero/bake.json),
  [PerformanceIR](hero/performance.json), [critic](hero/critic.json).
- [Engine baseline](physics/baseline-report.json), [sửa collision envelope](physics/contact-envelope-report.json), [reference hash](physics/reference-report.json).
- [Native192frames1080p](hero/native-render.json), [web decode192YUV exact](hero/web-qc.json),
  [41file/6native replay](hero/native-replay.json), [player1×](hero/player-normal.json),
  [player0.5×](hero/player-slow.json), [color120](hero/color-normal.json), [color168](hero/color-slow.json).
- [Giữ nguyên1152frame R3](legacy-r3-report.json), [integrity audit](integrity-report.json).

Media mới không đưa vào regularGit; raw reports ghi vị trí local và SHA.
Tái tạo theo [physics](../../src/physics/README.md) và [motion/render](../../src/motion/README.md).
Chạy `npm --prefix production run quality:hero -- --native-input`, dùng output
path trong lệnh Blender. Tiếp theo tạo timeline JSON một shot192frames rồi gọi
`production/src/media/native_review.py` với SHA master thực. Native package qua
`production/src/blender/package_native.py`; mọi lệnh thực đã lưu ở evidence/U6.

Hai lượt player đã chạy hết8s ở1×/0.5×,0dropped; đây là muted functional playback,
không chấm cảm nhận chuyển động hoặc nghe. S05 candidate giữ AACsilent như
baseline, chưa có sound design. Color samples MAE0.663/0.664,P95=2; chưa khẳng
định mọi màn hình/player. Full-frame physics/contact math không thay art review.

Native `.blend` chứa keys, không chạy Rapier lúc seek. Các điểm COM/anchor và
mass proxy được khai báo; không nói đây là phép đo vật thật. Đèn nghiêng sau
khi người cho thả và giảm dao động; khi nhân rộng sang shot khác phải nối end
state của đèn hoặc có hành động đặt lại, không snap về upright ở điểm cắt.
