# Nâng chất lượng Paper Studio — kế hoạch thực thi

13/11/2026. Nguồn yêu cầu: [tài liệu người dùng](USER-PLAN.md). Namespace U0–U8
ứng với P0–P8 trong tài liệu mới; không thay P0–P11 Word hoặc Q0–Q9 hiện hành.
Baseline `4f6b97c`: R3 review48s kỹ thuật; Q2 còn art/listening/operator/performance.
Nhánh `codex/quality-physics-bake`, ngân sách dịch vụ0, không merge/rewrite history.

Yêu cầu trực tiếp mới nhất cho phép nghiên cứu và thực thi tự chủ. Câu STOP/P0
trong prompt đính kèm được xem là quy trình đề xuất, không là lệnh dừng mới của
người dùng. Agent quyết định kỹ thuật dưới tên delegated-agent; không tự tạo
approval của người xem/nghe, tài sản không rõ quyền hoặc operator độc lập.

## Điều chỉnh có căn cứ trước khi code

1. dt cố định là cần nhưng không đủ cho determinism. Khóa engine/package/lock,
   thứ tự khởi tạo và input số. So hash hai lần tại máy này và CI; chưa gọi là
   chứng minh mọi OS/CPU. Rapier0.21 có các flavor khác nhau; dùng chính xác
   `@dimforge/rapier2d-deterministic-compat`, không mặc định mọi bản WASM giống nhau.
2. Chu kỳ2π√(L/g) chỉ là xấp xỉ góc nhỏ. Spike khóa L≈1m, góc≈2.87°, g9.81,
   bob radius0.005m, dt1/240, không damping. Damping là ca riêng, không lấy
   con lắc có lực cản so với chu kỳ lớn góc rồi kết luận solver sai.
3. “Xuyên0frame” phải giữ dưới dạng raw strict metric. Solver số có contact
   slop. Định thêm engineering tolerance≤0.005m (=1px tại200px/m) trước thử,
   báo cả raw penetration lẫn tolerance. Nếu strict0 fail thì ghi FAIL đúng,
   không đổi thành pass nhờ tolerance. Hero không dùng va chạm fake/clamp ảnh.
4. Foot lock≤1px của chuẩn mới phải kiểm world và projected camera; tiêu chí
   ≤2px cũ vẫn giữ cho baseline. Mọi ngưỡng mới nằm trong brief/quality trước test.
5. Không dùng hash/perfect contact làm điểm “có hồn”. Nghệ thuật vẫn cần full
   motion/rubric. Code không quyết định chất lượng nét vẽ; art gốc hiện tại là
   development asset cho spike, chưa được gọi final art theo tài liệu mới.
6. Preview có thể bỏ full raster QC, nhưng vẫn giữ input/revision/hash và nhãn
   preview. Output final phải qua decode/profile/frame/audio. Không bỏ provenance.
7. Kho hiện tại lớn hơn con số456MB trong tài liệu: working tree tracked≈772MB,
   .git≈694MiB tại baseline. Không rewrite history; các media mới gitignore,
   Git chứa source/recipe/evidence nhỏ. LFS/release migration là việc tách riêng,
   cần lưu tương thích các recipe và CI cũ trước khi xóa bất cứ artifact nào.
8. Chưa xác minh được repository/license của tên SyncRig qua tìm kiếm chính
   xác. Không suy Apache2 từ tên. MediaPipe là pose estimator, không suy cảm xúc,
   trọng lượng hay rig correspondence; vẫn cần reference hợp pháp và cleanup.

## Thứ tự, đầu ra và đường sửa

| Giai đoạn | Công việc/đầu ra | Kiểm và xử lý lỗi | Điều kiện còn thiếu |
|---|---|---|---|
| U0 (P0) | Audit baseline/license/source, chuẩn chất lượng, plan, nhánh riêng, khóa phép đo | Đối chiếu file/code/evidence; dependency metadata và nguồn chính thức | Repo chưa có LICENSE: đề xuất MIT cho code do chủ repo sở hữu, chưa tự cấp phép toàn repo/deps/media |
| U1 (P1) | Inventory117assets,3hướng art (artist vector / cutout model / Blender layered); style brief/manifest quyền sử dụng | So cùng pose/silhouette/light;8viseme/6expression; không gọi old SVG final | Chưa có artist/model được chọn, reference clip được cấp quyền và người duyệt style |
| U2 (P2) | Giữ rig2bone/footlock đã có; MotionClip/PerformanceIR có cue/contact; tách secondary bake khỏi main acting | Validate trước render; unreachable/contact/seek tests; giữ R0–R3 không đổi | Bộ6clip diễn xuất mới cần art/reference U1/U4 |
| U3 (P3) | So Planck/Rapier thực, fixed240Hz→24fps BakeFile; pendulum/drop/bounce/damping/longrun; event timeline; hero lamp | analytic≤2%, raw penetration, frozen tolerance, same-run hash; cross-runner hash; lỗi giữ attempt rồi sửa | Cross-platform rộng hơn runner hiện có chưa chứng minh; Blender secondary chỉ khi engine2D không đáp ứng |
| U4 (P4) | Reference→landmarks có confidence→retarget→keyposes cleanup/style, không chạy model vô ích | Occlusion/foot drift/contact/timing; lưu quyền sử dụng reference | Input acting footage hợp pháp chưa có; không tải clip người khác rồi tái sử dụng |
| U5 (P5) | Giữ voice fixture; event foIey định nghĩa frame/intensity từ bake; phoneme/viseme mapping mới sau voice chọn | ±1frame event;±2frame lip với alignment được kiểm;−16LUFS,TP≤−1; nghe riêng | Voice nghe duyệt/music/foley final và license chưa có |
| U6 (P6) | Cùng BakeFile dùng renderer hiện hữu; S05 candidate riêng, frame parity và native output | Không simulation khi seek/render; preview/final exact data;3cold+5warm sau art gate | Chưa chọn backend production/Q3 từ spike |
| U7 (P7) | Critic có provenance, velocity/acceleration/jerk/contact/penetration, evidence frame; director giới hạn schema | Reject malformed/out-of-range; không sửa vô hạn; tối đa3attempt/repair proposal mới | Không agent tự chấm thẩm mỹ/hạ ngưỡng; chưa bật planner tự do |
| U8 (P8) | S05hero→6shots48s→pilot72s/2edits→operator khác | Mỗi bước gate riêng, chỉ nhân rộng sau hero được xem/nghe; giữ take cũ | U1/U4/U5 approvals và operator; không biến benchmark48s thành pilot72s |

U1 được audit trước U2/U3. Hạ tầng U2/U3 có thể thử với development asset đã có
trong khi art/reference chưa có; điều này không đánh dấu U1 hoàn tất. Không
bỏ qua U4/U5/U6/U7/U8: state ghi rõ phần đã triển khai, phần phụ thuộc còn mở.
Không di chuyển toàn repo sang monorepo chỉ để trông giống sơ đồ trong kế hoạch.

## Chuẩn nhận

- Technical: giữ hợp đồng native1080p24/master BT709/web sRGB; baked motion
  immutable/validated; tất cả contact/stance frame được kiểm, seek tùy thứ tự.
- Perceptual: rubric mỗi mục≥4 và mean≥4.2, reviewer/timestamp/artifact thật;
  nhìn1×/0.5×, nghe audio thực. Đây là mục tiêu, chưa là kết quả agent đã đo.
- Reproducibility: `scripts/run-step.py U<n> name -- command`, attempt riêng,
  request/source snapshot trước chạy, không sửa log FAIL; commit/push checkpoint.
- Release: không production cho tới U8 và Q2/Q3–Q9 gates liên quan đóng bằng
  evidence đúng phạm vi. Handoff same-agent không đổi thành independent.
