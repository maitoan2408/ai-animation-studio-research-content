# The Last Lantern — bộ review Q2 v2

Ba video48s/1.152frame tại1080p24fps được xuất từ PNG native, sửa đường màu của
bản xem trình duyệt. Master BT709, nội dung/chuyển động, native project và AAC
normalized giữ nguyên. Bản mới không kế thừa approval của bất kỳ bản cũ nào.

## Mở và sử dụng

Từ repo root:

```bash
npm --prefix production ci
python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2
npm --prefix production run review -- check
npm --prefix production run review -- serve
```

Mở URL được in ra (mặc định http://127.0.0.1:4311). Chọn R0/R1/R2, xem1×/0.5×,
dừng/chọn frame, ghi notes/rubric theo shot. Journal tại production/out/review-data;
export và recovery theo [runbook](../../../src/review/README.md). Media/nhận xét
được gắn SHA/master SHA/revision/shot/frame; test không tạo human approval.

MP4 sau restore nằm trong R*/review.mp4. Mỗi file≈114MB; Git lưu parts≤32MiB và
bundle.json. Restore kiểm từng phần và toàn bộ SHA, không encode lại. Không mở
từng part bằng player hoặc commit MP4 đã ghép. Node24, FFprobe và Chromium theo
ENVIRONMENT; chỉ xem/ghi chú không cần Blender hay tải lại voice models.

| Bản | Video SHA-256 | Mẫu màu thực (MAE / P95) |
| --- | --- | --- |
| R0 |0c578593e9376aa9295c0022a5e1c4a352861e74293b716081cce7a28fb8921f|0.504 /1, frame72/S01|
| R1 |9e87348bdd1f34d2a5853ed3228b7e7110fe83ba55c0b6d7f5852aa9d87de02b|0.657 /2, frame456/S03|
| R2 |263aa0d7a7b486098c4d246a84169629a71bd2fae1cc9c835e7f2a001eddc4d1|0.662 /2, frame1032/S05|

Chart20ô: max1 trong ngưỡng3/inset2 đã khóa trước chạy; cả canvas/compositor.
Mọi bản:1.152decodedYUV frame khớp source-convertedYUV, AAC exact, đúng timing,
profile và full decode. CRF0 giữ YUV sau4:2:0 conversion, không phải losslessRGB.
[Reports/giới hạn màu](../media-contract-v2/README.md); [bằng chứng UI](../review-workbench-v2/report.json).

R2 single idle playback48.042s/0dropped. R0/R1 chạy cùng encoder48s media mất
57.124/56.909s và rơi5/19frames; không dùng làm performance benchmark. Bản HQ dùng
software decoder trên môi trường đã đo; không cam kết mọi thiết bị phát realtime.

## Trạng thái chất lượng

Kỹ thuật có giới hạn ở player tham chiếu đã qua. **Chưa duyệt toàn bộ mỹ thuật,
chuyển động, nghe voice hoặc bàn giao độc lập.** Chưa chạy3cold+5warm sau art gate;
Q3–Q9 chưa bắt đầu. Gate hiện hành ở production/evidence/Q2/gate.json.

[Master normalized/native ZIP](../review-final/README.md) và [bản v1 bị từ chối
cho color gate](../web-review/README.md) vẫn nguyên. Native ZIP R2 đã verify70file
hashes/6replay frames/edit note bởi cùng agent, không giả operator khác.
