# R3 — bộ review 48 giây tái tạo từ Git

13/11/2026, delegated-agent. PASS kỹ thuật; Q2 chưa đóng gate nghệ thuật/nghe/handoff/performance.

R3 thay S05 bằng bản hai grip tách biệt, giữ 960 frame đầu (S04/S02/S01/S03/S06),
voice/cup R1 và order R2. Master mới khớp từng decoded frame của các đầu vào;
web mới khớp từng YUV frame đã chuyển màu; AAC giữ nguyên toàn sequence R2.
Không thêm MP4/ZIP lớn vào Git. `recipe.json` khóa SHA mọi đầu vào đã commit.

```bash
npm --prefix production ci
python production/src/media/rebuild_r3.py
npm --prefix production run review:r3 -- check
npm --prefix production run review:r3 -- serve
```

Output nằm ở `generated/` (gitignored). Lệnh restore các bundle cũ, tạo attempt
riêng, kiểm profile/hash/frame/audio rồi mới publish catalog. Output đã có phải
khớp report và recipe; sai hash thì dừng, không ghi đè. Muốn rebuild, di chuyển
thư mục generated cũ sang nơi lưu trữ khác trước. FFmpeg/ZIP khác phiên bản có
thể tạo bytes khác; catalog luôn bind SHA output thực, không chuyển review cũ.

Kiểm local: 21 TS tests,17 Python tests (5 editorial),typecheck,root verify16;
14 ca UI thực với R3/S05/frame1032 và native download đúng version; 3 ca save
recovery. Native overlay có70 file hashes,6 replay frames pixel-exact trong path
mới. Các JSON cạnh README chứa kết quả; immutable commands ở evidence/Q2.
CI có bước dựng R3 từ Git và kiểm UI, kết quả CI ghi sau khi workflow chạy.

Lần dựng web đầu FAIL vì concat filter dùng microsecond timebase gây avg fps
khác24/1. Sửa đặt CFR24 và MP4 timescale12288; vẫn bắt buộc kiểm toàn bộ1.152
frame không thêm/bớt, audio không đổi, duration đúng một audio sample. EX-033.

## Review còn phải thực hiện

Mở R3 trong UI; xem1× và0.5× mỗi shot, nghe S01 bằng thiết bị nghe thật. Timeline:
S04[0,192),S02[192,384),S01[384,576),S03[576,816),S06[816,960),S05[960,1152).
Chấm rubric và ghi frame cụ thể, không kế thừa approval R2. Người vận hành khác
mở native source R3, sửa một note, lưu hashes/thời gian/lỗi. Sau art gate mới đo
3cold+5warm theo protocol. Muted playback/PNG/tests không thay các bước này.

Full R3 muted playback đã chạy hết48s, rơi6frame khi v0.1 regression chạy đồng
thời. Giữ phép đo này trong player-report.json; không dùng làm benchmark công
bằng hoặc coi player test exit0 là đạt0dropped. Performance gate vẫn mở.
