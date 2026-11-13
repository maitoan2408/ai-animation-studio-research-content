# Q0 — mục tiêu đã khóa cho vòng thử đầu

Revision: **lantern-brief-1**. Quyết định bởi `delegated-agent` theo ủy quyền toàn
quyền của người dùng ở vòng thực hiện hiện hành. Đây là quyết định sản xuất để
tiếp tục công việc; chưa có tuyên bố người dùng đã xem/duyệt phim cuối.

## 1. Đích nghệ thuật

**Paper-cut kể chuyện, chiều sâu multiplane có kiểm soát**, kế thừa Word §2/3/11.
Pilot: **The Last Lantern / Chiếc đèn cuối cùng**, 72 giây, hai nhân vật Mai và An
trong sân xưởng đèn vào chạng vạng. Tình huống nhỏ, dễ đọc qua hành động và tiếp xúc.
Shadow-box và phong cách thứ hai giữ trong F01, chưa nhận là production supported.

- Mảng giấy có mép cắt hơi bất quy tắc, texture tinh, bóng mềm cùng hướng. Silhouette
  đọc được khi bỏ texture; tránh viền đen dày đồng đều và bộ phận giống hình placeholder.
- Palette: trời xanh slate `#294957`, mint xa `#7eaaa3`, kem giấy `#f5dfb3`, vàng áo
  `#d5a34b`, cam đất `#bc6351`, teal gần `#224f50`. Màu nhấn là ánh đèn, diện tích nhỏ.
- Mai: áo khoác vàng, khăn cam đất, tóc bob sẫm, tỷ lệ đầu lớn vừa phải; An: áo teal,
  tóc bạc, dáng hơi thấp/rộng hơn. Mỗi nhân vật có front/3/4/profile, expression,
  hand/mouth variants, source riêng và anchors. Không biến đổi tỷ lệ để che lỗi rig.
- Nền có bầu trời, kiến trúc xa, tường/cửa xưởng, mặt sân, cây tiền cảnh. Overscan ít
  nhất 15% theo hướng camera. Chỗ nhân vật bước/cầm đồ giữ mặt phẳng địa hình rõ.
- Camera ưu tiên orthographic; push/pan nhẹ, tối đa khoảng 10% khung ở shot thử.
  Chỉ dùng perspective khi S04 chứng minh có lợi. Không quay tự do sau lưng art phẳng.

## 2. Chuyển động và các lỗi chặn

- Key pose có intent, nhìn trước khi với tay; anticipation 6–12 frames tùy beat.
- Đi có pha trụ/swing, giảm tốc trước dừng; chân trụ giữ world position. Bóng chân
  bám sàn, torso có chuyển trọng lượng; không dùng cả thân bob sin để thay bước chân.
- Grip giữ tay/prop cùng anchor; place đặt prop lên support trước release. Chuyền
  vật có giai đoạn cả hai tay tiếp xúc và owner switch liên tục, không nhảy vị trí.
- Expression đi trước thoại/phản ứng, eye-line có mục tiêu; miệng là một kênh độc lập.
  Dùng cues sửa được, không tự coi volume envelope là âm vị chính xác.
- Cadence: body poses có thể giữ on-twos; camera và contact dùng frame time chính xác.
  Không frame interpolation hoặc upscale để đổi đánh giá native output.
- Pose khó cần drawing/view replacement nếu rig không giữ hình. Sửa art/rig khi hở
  khớp, không dùng blur che lỗi. Hold có chủ ý không bị detector frozen gọi là lỗi.

## 3. References có phạm vi sử dụng

| Nguồn | Mốc/phần xem | Học/giới hạn |
| --- | --- | --- |
| Word gốc §10–12, PDF 21–25 | Action phases, camera/depth/draw order | Yêu cầu thiết kế; không phải feature đã có |
| Demo hiện tại `artifacts/morning-final.mp4` | 0–4 s wave; 4–9 s pickup; 9–13 s walk | Baseline cần vượt: hình cơ bản, walk chưa foot-lock; không chọn làm chuẩn art |
| Lemo-Opuscar, source đã pin S02 | Paper material/planes/IK trong sổ nguồn | Học kỹ thuật paper; không lấy voice/demo art, không đồng nhất shadow-puppet với shadow-box |
| ClaudeAnimationBase, source đã pin S03 | Anticipation/arcs/hold/on-twos | Học grammar chuyển động; không import nhân vật/asset của tác giả |
| Art gốc của pilot ở Q1 | Wide, close-up, contact styleframes | Trở thành goldens hình sau review, không thay bằng ảnh marketing |
| Blocking Q2 của S01–S06 | Các beat frame khóa trong `shots.json` | Reference motion có timestamp cho vòng polish và edits; phải xem video |

Nguồn/source URLs và license của S02/S03 nằm trong
[sổ nguồn](../../docs/research/production-quality-sources.md). Vòng này tự tạo art
editable từ brief, không đưa hình/voice của tác giả khác vào sản phẩm. Chưa có
reviewer animator độc lập; review hiện tại phải ghi giới hạn này.

## 4. Output, âm thanh và quyền dùng

- Final: **1920×1080, 24/1 fps, SDR BT.709 limited, H.264 yuv420p + AAC stereo 48 kHz**.
- Intermediate: PNG RGBA straight, input sRGB được khai rõ; source SVG/native DCC
  giữ riêng. Alpha phải round-trip trên nền trắng/đen; MP4 không chứa alpha.
- Preview: 640×360 cùng evaluator/curves/assets/cues, không đổi timing hoặc diễn xuất.
- Benchmark giữ 48 giây/candidate, không tính thành pilot. Pilot 72 giây/1728 frames.
- Ngôn ngữ pilot: English, narration và câu thoại ngắn. Chọn local voice có license
  rõ và nghe kiểm. eSpeak chỉ là bản nháp; nếu không có voice tốt hơn thì ghi hạn chế
  và giữ gate âm thanh mở, không gọi giọng nháp là production voice.
- Loudness delivery đề xuất khóa vòng này: −16 LUFS integrated ±1 LU, true peak
  ≤−1 dBTP, stereo 48 kHz; transport sync ≤1 frame; cue dễ nhận ±2 frames.
- Không gọi API/GPU trả phí. Công AI elapsed được ghi riêng, không giả làm giờ của
  illustrator/animator con người hoặc tính ROI khi chưa có đơn giá/duration accepted.

## 5. Rubric và quyết định gate

Giữ rubric đã đề xuất: art 30%, acting 35%, layout 15%, continuity 10%, sửa 10%.
Mỗi shot cần ≥80/100, art/acting mỗi nhóm ≥4/5, không lỗi chặn. Bảng điểm phải có
timestamp và lý do, không chỉ một số tự gán. Review AI theo ủy quyền là đánh giá
tạm thời có thể bị người dùng yêu cầu sửa; không là chứng nhận độc lập của animator.

Hard gates đo được:

1. Contact/foot markers ≤2 px tại 1080p trong interval đã khai; đo cả world và screen
   qua camera. Image/video vẫn phải kiểm bàn chân/bàn tay thực khớp markers.
2. Seek ngược/trộn/process mới giữ state và ảnh trong cùng môi trường. Không suy
   byte-identical giữa GPU khi chưa đo. Texture load thiếu/corrupt/timeout chặn publish.
3. Đúng frame count/dimensions/fps, full decode, color/channel/loudness và audio length.
4. Hai vòng sửa có before/after/diff và phạm vi ảnh hưởng; phần không liên quan giữ
   hash/input/review. Kéo dài shot phải ghi dịch timeline downstream.
5. Có source native, dependency hashes/rights, lệnh dựng, lỗi và kết quả kiểm lại.

## 6. Các quyết định đã thực hiện và các gate giữ mở

Đã quyết định brief, style đầu, A/B shortlist, rubric, output và nhánh free/local.
Q1 đóng bằng art pack/styleframe thực; Q2 đóng bằng sáu shot và hai vòng sửa;
Q3 mới chọn backend. Không đánh dấu các gate này từ việc viết xong brief.
