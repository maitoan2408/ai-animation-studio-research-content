# Thẩm định kỹ thuật báo cáo Studio hoạt hình AI

Ngày kiểm tra: 10/11/2026. Mục tiêu đã xác nhận: **kiểm thử tính khả thi trước, sau đó xây studio nội bộ tạo video từ kịch bản**. Phạm vi hình ảnh lấy từ báo cáo: 2D/2.5D, paper-cut, layered shadow-box và multiplane.

Tài liệu gốc: `Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.docx`, SHA-256 `629014426d9ff2333266e83d2925206c9b9b1c0c66b0ca2b07145f310df77dcd`. Số trang dưới đây theo bản PDF 59 trang đi kèm. Đây là bản thẩm định bổ sung; tài liệu gốc được giữ nguyên để đối chiếu.

## 1. Kết luận để ra quyết định

Báo cáo có nền tảng kỹ thuật hợp lý. Hai framework, mô hình thời gian, sự khác nhau giữa asset/rig/renderer, và các giới hạn của AI được mô tả thận trọng. Trong phạm vi đối chiếu lần này, chưa phát hiện nhận định nền tảng nào buộc phải bỏ toàn bộ hướng nghiên cứu.

Tuy nhiên, báo cáo **chưa phải đặc tả triển khai có thể thực hiện nguyên trạng**. Các phần cần bổ sung nhất là cơ chế chặn output thiếu asset, môi trường cài đặt tái lập, bộ dữ liệu hình/âm thanh đại diện, ngưỡng QC cụ thể và mô hình dữ liệu cho revision/job/artifact. Một số thiếu sót đã được báo cáo tự thừa nhận; chúng là công việc phải hoàn thành, không nên gọi thành “sai kiến thức”.

Đã chạy thực tế ví dụ của hai backend và một cảnh dùng chung. Kết quả đủ để tiếp tục thử nghiệm ở cấp cảnh; chưa đủ để chọn renderer cuối cùng, xác nhận chất lượng hoạt hình kể chuyện, tính chi phí/phút hoặc hứa tự động hóa toàn bộ studio.

## 2. Những điểm phải bổ sung hoặc sửa cách triển khai

| ID | Vị trí trong báo cáo | Phát hiện và mức độ | Bằng chứng, cách xử lý |
| --- | --- | --- | --- |
| F01 | §6.2–6.3, §18; tr.12–14, 37 | **Ưu tiên cao — thiếu cấu hình chặn lỗi cụ thể của HyperFrames.** Lệnh render đơn giản trong báo cáo dùng hành vi mặc định `best-effort`. | Cố ý thiếu ảnh: Producer vẫn tạo MP4, `status=complete`, `outcome=completed_with_warnings`, cảnh báo `media_load_failed`. `strictness:'strict'` trả lỗi và không tạo file cuối. CLI giao hàng cần `--strict --no-best-effort`; service cần strictness, kiểm warnings/outcome và QC riêng. |
| F02 | §7.3, §9.3, §18; tr.15–16, 20, 37 | **Ưu tiên cao — thiếu quy tắc primitive và readiness trong Remotion.** Đợi asset là yêu cầu đúng nhưng chưa thành contract tác giả/compiler. | Cùng ảnh không tồn tại: `<img>` thường vẫn render thành công; `<Img>` của Remotion hủy render với lỗi tải ảnh. Dùng `Img`, cơ chế chờ font/data phù hợp và preflight manifest. Không cho phép compiler sinh asset-loading tùy ý. |
| F03 | §6.2, §7.2, P1; tr.12, 15, 40 | **Ưu tiên vừa — lệnh khởi tạo chưa đủ cho môi trường cloud có proxy và thư mục home không ghi được.** | Remotion scaffold ban đầu lỗi DNS; thêm `NODE_USE_ENV_PROXY=1` chạy tiếp nhưng npm lỗi cache, CLI vẫn trả 0. Thêm cache có quyền ghi thì khởi tạo và cài dependencies thành công. Cần kiểm entry/package thực có và render smoke test, không chỉ exit code của scaffold. Đây là giới hạn môi trường/lệnh bootstrap, không chứng minh framework không dùng được. |
| F04 | §19, P2/P3/P4/P6/P7; tr.38–43 | **Ưu tiên cao — vòng thử đầu quá rộng nếu làm đầy đủ B01–B09 cho cả hai backend.** | B01–B08 cần rig, diễn xuất, audio và action library trong khi những phần này mới xây ở P4–P7. Hợp lý hơn là chia thử công cụ nhỏ, rồi thử asset/style đại diện; dùng chung evaluator và shot spec để tránh làm hai bộ công cụ sản xuất hoàn chỉnh. Đây là đánh giá trình tự và công sức, không phải kết quả benchmark. |
| F05 | §18–19; tr.37–39 | **Ưu tiên cao — tiêu chí chưa định lượng nên chưa thể tự động kết luận đạt.** | Cảnh 240 frame xuất đúng frame count; Remotion có audio stream dài 10,005 giây dù video 10 giây. Không nên dùng phép bằng tuyệt đối cho duration audio đã encode. Cần tách frame count, mốc sync, padding codec, alpha và review nghệ thuật; ngưỡng đề xuất nằm trong kế hoạch. |
| F06 | §16 và Hình 8; tr.32–34 | **Ưu tiên vừa — cần cụ thể hóa các thực thể trạng thái trước khi thêm agent.** | Tài liệu đã nói phải tách job/attempt/revision, nhưng sơ đồ tổng hợp dễ bị triển khai thành một cột status. Một revision có thể có nhiều render profile và nhiều attempt. Cần ShotRevision → RenderJob → Attempt → Artifact, rồi Review tham chiếu revision + artifact hash. Chưa có service trong repo để kiểm recovery/transaction. |
| F07 | §1.2, danh mục nguồn; tr.5, 55–59 | **Ưu tiên vừa — thiếu hồ sơ nguồn trong repo để kiểm toán lại bản nghiên cứu.** | Repo ban đầu chỉ có README, SHA256SUMS và hai báo cáo. Các bản chụp nguồn được văn bản nói đã lưu không có trong checkout này. Không thể xác nhận nội dung lịch sử của từng trang ngày 09/11 chỉ từ URL hiện tại. Lần kiểm tra này lưu source register, lockfile, phiên bản và bằng chứng thực thi mới. |
| F08 | Phụ lục B.1; tr.51 | **Ưu tiên vừa — ví dụ render được nhưng cần chỉnh để làm template biên tập.** | `hyperframes lint/check` báo `studio_missing_editable_id` và `nested_structure_needs_subcomposition`, dù check vẫn pass. Đã tạo biến thể để phần tử `paper` có ID ổn định và tự là clip, bỏ wrapper lồng không cần thiết; check lại có 0 lỗi, 0 cảnh báo lint/runtime, 0 lỗi layout trên 9 mẫu. |

Các cách gọi “HyperFrames miễn phí nghĩa là không có chi phí”, “Remotion là MIT”, “timestamp ký tự là viseme” và “một prompt tự dựng phim hoàn chỉnh” **không phải lỗi của báo cáo này**: báo cáo đã bác bỏ hoặc đặt giới hạn cho các cách hiểu đó.

## 3. Môi trường và dữ liệu kiểm thử thực tế

- Node 24.22.1; npm 11.9.0; Chromium 156.0.8078.79; FFmpeg 7.1.5.
- HyperFrames/Producer/Engine 0.9.30; Remotion và các package `@remotion/*` trực tiếp 4.0.542; GSAP 3.15.0; React 19.2.0.
- Linux x86-64; CPU quota 2 core tương đương, dù hệ thống hiển thị 3 logical CPU; giới hạn cgroup 8 GiB. Chromium dùng software rendering trong các thử nghiệm này.
- Hai ví dụ phụ lục: 1920×1080, 24 fps, 120 frame. Với HyperFrames, bổ sung HTML shell và GSAP local như tiền điều kiện được báo cáo nêu; fps được truyền rõ khi gọi Producer.
- Cảnh dùng chung: 640×360, 24 fps, 240 frame, một nhân vật cắt lớp, động tác với/nhấc cốc, đổi hình miệng theo marker, ba lớp parallax, clip window, mask và một bóng SVG.
- Hai backend dùng chung hàm sinh SVG; HyperFrames điều khiển qua timeline GSAP, Remotion đọc frame. Điều này giảm khác biệt do tác giả, nhưng **không đo độ tiện của hai quy trình tác giả native**.
- Audio là WAV PCM 48 kHz có tín hiệu tại giây 1 và giây 3. Đây là dữ liệu đo sync, không phải giọng nói hay bài đánh giá khẩu hình.

## 4. Kết quả thực nghiệm

| Thử nghiệm | Kết quả quan sát | Giới hạn kết luận |
| --- | --- | --- |
| Phụ lục B.1 HyperFrames | Render được 120 frame, 1920×1080, 24 fps | Đã bổ sung dependency/shell được đoạn ví dụ yêu cầu; chưa phải rig hoàn chỉnh |
| Phụ lục B.2 Remotion | Render được 120 frame, 1920×1080, 24 fps | Code component hợp lệ ở bản đã khóa |
| Lint/check phụ lục B.1 | Bản gốc có 2 lint warnings; bản editable đã chỉnh đạt 0 lint warnings và check pass | Biến thể nằm trong fixture tạo bởi prepare-fixtures.py; không sửa đè báo cáo gốc |
| Cảnh paper-cut/parallax có audio | Cả hai tạo MP4 H.264/AAC, 240 frame, 640×360, 24 fps | Một fixture đơn giản ở độ phân giải thấp |
| Seek HyperFrames | 48 lần chụp: 12 baseline + 36 đối chiếu tuần tự đảo, xáo trộn cố định và browser mới; hash PNG không đổi | Dùng cùng capture session cho các lượt đầu; không kiểm mọi frame/effect |
| Seek Remotion | 48 lần chụp; 36 đối chiếu với baseline đều khớp hash PNG | `renderStill` tạo page mới mỗi lần; dùng cùng browser rồi browser mới. Chưa phải thử scrub trên Player giữ nguyên page |
| Một worker so với hai worker | Mỗi backend: toàn bộ 240 frame sau decode giống nhau pixel-for-pixel | Cùng máy, cùng phiên bản; chưa kiểm nhiều máy/GPU khác nhau |
| Clip từ frame 24 đến trước 72 | Đúng tại các mốc 23/24, 71/72 và các mốc mẫu khác | Kiểm khoảng [start, end) của fixture |
| Audio sync sau encode | Onset đo lệch khoảng 0,042 ms với HyperFrames, 0,063 ms với Remotion | Phụ thuộc ngưỡng biên độ 0,08; tín hiệu tổng hợp, không phải đo perception/lip-sync |
| QC metadata và frame/marker/sync | 22 phép kiểm đạt | Chi tiết trong `media-qc.json`; không phải 22 test nghệ thuật |
| Thiếu ảnh — HyperFrames best-effort | Exit 0, xuất MP4 thiếu ảnh, có warning | Tái hiện được rủi ro giao output chỉ dựa vào exit code |
| Thiếu ảnh — HyperFrames strict | Exit 1; `RenderQualityError`; không có file cuối | Cấu hình chặn hoạt động cho lỗi đã tiêm |
| Thiếu ảnh — Remotion `<img>` | Exit 0, có MP4 | Thẻ HTML thường không bảo đảm asset-ready |
| Thiếu ảnh — Remotion `<Img>` | Exit 1; lỗi tải ảnh; không có file cuối | Primitive được kiểm tra chặn được lỗi này |

Hai ảnh PNG của hai backend không giống tuyệt đối với nhau: sai lệch kênh trung bình cao nhất trong 12 cặp mẫu khoảng 0,111/255; một số pixel cạnh có sai lệch lớn hơn. Không đặt ngưỡng cross-backend trước lần đo nên không gắn nhãn pass cho “pixel parity giữa hai framework”. Kết quả ổn định theo thứ tự render và số worker được đánh giá riêng, đã đạt ở phạm vi trên.

### Thời gian quan sát, chưa dùng để xếp hạng production

| Backend | Worker | Thời gian pipeline quan sát | Số lượt đo cấu hình |
| --- | --- | --- | --- |
| HyperFrames | 1 | 13,21 giây | 1 |
| HyperFrames | 2 | 9,04 giây | 1 |
| Remotion | 1 | 30,56 giây | 1 |
| Remotion | 2 | 42,29 giây | 1 |

HyperFrames đo quanh `executeRenderJob`; Remotion đo từ bundle, mở browser, select composition đến hoàn tất render, không tính các ảnh chụp kiểm tra sau đó. Cache, preload và đường encode của hai thư viện khác nhau. Lần đầu/lần sau chưa được thiết kế thành tập cold/warm lặp. Không có p50/p95 hoặc peak RAM tổng cây process được đo độc lập. Các con số chỉ cho biết fixture chạy được và tăng worker không đương nhiên giảm thời gian. Chưa ngoại suy sang 1080p/4K, nhiều nhân vật hoặc phút phim được duyệt.

### Hai kiểm tra toán học

Phép tính RGBA thô trong §21.3 đúng: 1920×1080×4×600×24 = 119.439.360.000 byte. Ở 24 fps, audio 48 kHz có 2.000 sample/frame. Ở 30000/1001 fps, giá trị là 1601,6; làm tròn từng frame thành 1602 rồi cộng 18.000 frame gây lệch 150 ms. Cảnh báo của báo cáo về timebase là có cơ sở; phép tính này không thay thế render thử NTSC.

Hai ví dụ phụ lục không có cùng endpoint: ở frame 119/24 giây, tween 5 giây của HyperFrames đạt x=357; Remotion nội suy đến frame 119 đạt x=360. Báo cáo đã ghi rõ đây là hai minh họa riêng. Không đánh dấu thành lỗi bị che giấu; bộ so sánh mới dùng chung quy ước frame để tránh dùng nhầm chúng làm benchmark.

## 5. Đối chiếu những nhận định công nghệ ảnh hưởng quyết định

| Nhận định | Kết quả thẩm định | Nguồn/bằng chứng |
| --- | --- | --- |
| HyperFrames dùng HTML, clip timing, runtime seek | Phù hợp tài liệu hiện tại và ví dụ chạy được | H03; thử report/study/seek |
| Producer có createRenderJob/executeRenderJob, render/mix | API tồn tại trong gói 0.9.30 và đã sử dụng | H05; type declarations và metrics |
| FrameAdapter là experimental v0 | Vẫn được tài liệu gắn nhãn này | H06; chưa triển khai adapter PixiJS/Spine/Rive |
| Remotion frame/Sequence/props; cần tránh state tích lũy | Phù hợp tài liệu và test frame/clip/concurrency | R02/R03/R06; fixture đã chạy |
| Có @remotion/gsap | Đã xác nhận package 4.0.542 và tài liệu chính thức | R10; chưa benchmark hook này riêng |
| License Remotion riêng, v5 còn upcoming | Khớp trang hiện tại và LICENSE của package 4.0.542 | R08/R09/R11; bản license lưu trong evidence |
| Các mức giá Remotion được trích ở §21.2 | Các mức được báo cáo vẫn có trên trang pricing lần đọc này | R07; không phải báo giá hoặc tổng chi phí studio |
| GSAP có giới hạn một số visual builders | Văn bản license hiện tại có điều kiện đó | G01; không suy ra kết luận cho sản phẩm chưa xây |
| ElevenLabs character timestamps khác phoneme/viseme | Khớp schema response chính thức | S05; không gọi API tạo voice trong đợt này |
| MFA cần model/dictionary/corpus phù hợp | Phù hợp hướng dẫn alignment | S02; chưa có corpus thật để đánh giá ngôn ngữ |
| LangGraph persistence, Temporal idempotency | Phù hợp mục đích tài liệu | O02/O03; chưa thử service vận hành của studio |
| OTIO mang editorial data và tham chiếu media | Đúng; không thay rig/Scene IR | O01; chưa thử round-trip DCC |

Đây là đối chiếu các nguồn quyết định kiến trúc; không phải tuyên bố đã tải lại và xác minh độc lập toàn bộ 48 nguồn. Các mô tả công cụ bổ trợ ở chương 8 được xem như ứng viên; không đưa vào đường triển khai chính khi chưa có thử nghiệm. Link và ghi chú truy cập mới: `validation/evidence/source-verification.md`.

## 6. Mức phủ đối với toàn bộ báo cáo

| Chương/phụ lục | Đánh giá và phần còn thiếu |
| --- | --- |
| 1–3: kết luận, phạm vi, loại hoạt hình | Hợp lý; giữ phạm vi 2D/2.5D trong Word. Phong cách kỹ thuật chưa tương đương một style bible và chất lượng hình đã duyệt. |
| 4–5: kiến trúc và sản xuất | Dùng được làm cấu trúc trách nhiệm. MVP nên một ứng dụng + một worker, người duyệt chốt hình và nhịp. |
| 6–7: hai framework | Đã chạy ví dụ và render có audio; bổ sung F01–F03. |
| 8: lựa chọn công cụ | Chưa đủ bằng chứng chọn renderer chính; công cụ bổ trợ cần được thêm theo một thiếu hụt cụ thể. |
| 9–11: asset, rig, camera | Đã thử nguyên lý cut-out, nhấc cốc, parallax, clipping và bóng đơn giản. Chưa đo asset tạo sinh, cực trị rig, walk/foot contact, đổi góc và shadow-box nhiều lớp. |
| 12: thời gian | Quy ước đúng; đã thử seek và concurrency, xác minh số học. Chưa render fractional fps, time stretch hay simulation bake. |
| 13: voice/lip-sync | Phân rã nhiệm vụ đúng; mới kiểm sync tín hiệu tổng hợp. Chưa xác nhận chất lượng tiếng nói, alignment hoặc diễn xuất miệng. |
| 14: Scene IR | Hướng hợp lý nhưng mẫu là thiết kế, thiếu validator/compiler có thể chạy. Cần contract nhỏ trong kế hoạch G2. |
| 15: agent/skills | Đúng hướng giới hạn quyền và kiểm đầu ra. Chưa có evaluation set, tool contracts hoặc agent tích hợp để đo. |
| 16: job/cache/recovery | Các nguyên tắc đúng; chưa có implementation để thử kill/restart/idempotency. Bổ sung F06. |
| 17–18: output và QC | MP4 đã decode/đếm frame/đo sync. Còn alpha, color profile, font, codec khác và QA hình/tiếng thực. |
| 19–20: benchmark và lộ trình | Giữ bộ B01–B12 làm backlog; chia tầng thử nghiệm để tránh đầu tư quá rộng trước khi biết khả thi. |
| 21–22: chi phí và license | Số học và mô tả license/pricing trọng yếu phù hợp. Chưa có cost per accepted minute hoặc eligibility của tổ chức cụ thể. |
| 23–25: rủi ro và quyết định | Phần lớn vẫn còn hiệu lực. Cập nhật bằng các rủi ro asset-ready đã tái hiện; chưa mở rộng tự chủ hoặc distributed render. |
| A–D: schema, code, bằng chứng, thuật ngữ | Code minh họa chạy được sau setup; IR không phải project có asset đầy đủ; source archive thiếu trong repo. |

Mười sơ đồ đã được xem xét cùng nội dung. Chúng phù hợp với ý đồ tổng thể, nhưng Hình 8 cần được chuyển thành các thực thể dữ liệu riêng như F06 trước khi viết workflow. Vấn đề alt text của sơ đồ ở lần rà định dạng trước vẫn là việc cải thiện khả năng tiếp cận, không phải trở ngại render của studio.

## 7. Những kết luận chưa được phép đưa ra

Chưa xác minh studio có thể tự sinh nhân vật nhất quán, tự tách đủ bộ phận bị che, tự rig, diễn xuất tốt, lip-sync tiếng Việt/tiếng khác chính xác, xử lý crowd hoặc shadow-box nặng ổn định, phục hồi sau crash, hoặc đạt giá thành/sản lượng cụ thể. Các khả năng này cần asset/corpus thật, implementation tương ứng và người duyệt. Không có API voice/image có phí nào được gọi trong đợt kiểm thử này.

Chưa có phim pilot hay quy trình hoàn chỉnh từ kịch bản đến phim. Kế hoạch thực hiện và tiêu chí để đóng từng khoảng trống nằm trong `Ke_hoach_trien_khai.md`. Source và hướng dẫn chạy lại nằm trong `validation/README.md`; số đo gốc và log nằm trong `validation/evidence/`.
