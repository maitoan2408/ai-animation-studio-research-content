# Kiểm chứng toolchain vòng 2 và cách tái lập

Ngày thực hiện: **11/11/2026** (giờ Việt Nam; timestamp thô trong log dùng UTC). Phạm vi: chạy chương trình/harness đã có, CLI và cấu hình trong thư mục nghiên cứu. Không viết adapter/harness mới, sửa code sản phẩm, nâng dependency ứng dụng hoặc chạy dịch vụ trả phí.

Đọc cùng [báo cáo và phản biện](../../reports/Nghien_cuu_toolchain_va_ke_hoach_mo_rong.md), [kế hoạch Q/F và test chưa chạy](../toolchain-future-plan.md), [nguồn/version](toolchain-reading-and-sources.md). Dữ liệu tổng hợp: [results.json](toolchain-evidence/results.json).

## 1. Baseline, input và môi trường

- App: `b79ec76497b7cb57f753f596cb60969aae3383d2`; research: `8e58ffc3133102279f6a3f59b66a38f22d14def0`. Nhánh vòng này: `codex/toolchain-research-plan`.
- [Input manifest](toolchain-evidence/inputs.json): SHA-256 của scripts/fixtures/lockfile và demo dùng để đối chiếu. Script trong `validation/` được sao chép nguyên trạng ra `/tmp/studio-toolchain-r2/`; không ghi kết quả mới lên evidence cũ.
- [Environment manifest](toolchain-evidence/environment.json): Debian 13, Node 24.22.1, npm 11.9.0, Chromium 156.0.8078.79, Python 3.12.14, FFmpeg 7.1.5-0+deb13u1. Giới hạn cgroup: 2 CPU, 8 GiB; browser dùng software rendering. Không có đo peak RAM/VRAM cho vòng này.
- HyperFrames baseline 0.9.30 dùng dependencies hiện có của `validation/`; bản 0.9.33 cài riêng. [Package](toolchain-evidence/hf033/package.json) và [lock](toolchain-evidence/hf033/package-lock.json) cuối cùng được lưu, không phải lock của ứng dụng.
- [FFmpeg build](toolchain-evidence/baseline/runtime-ffmpeg.log) có GPL/libx264/libzimg. Không suy kết quả sang mọi build FFmpeg/GPU/browser.
- Mỗi `*-command.json` lưu **argv, cwd, UTC start, elapsed, returncode, log** từ recorder có sẵn `validation/scripts/record.py`. Đường `/tmp/…` là vị trí lúc đo, không phải dependency bắt buộc của sản phẩm.

**Giới hạn tái lập dependency:** ba lần thử HF 0.9.33 đầu tiên chạy trước khi cài thêm CLI. Việc cài CLI thay graph bắc cầu; chưa giữ lock của graph đầu tiên. Log lần đầu vẫn nằm trong `hf033/`. Sau đó đã chạy lại cả seek/strict/best-effort bằng graph cuối đã khóa, lưu riêng `hf033-locked/`. Study render và Three harness dùng graph cuối. Không dùng lock cuối để giả vờ tái lập chính xác graph đầu.

## 2. Tổng kết kết quả thực tế

PASS luôn đi kèm phạm vi. Ví dụ, một negative control phải trả lỗi để PASS; best-effort tạo clip thiếu ảnh đúng hành vi API nhưng **không được phép giao clip đó**.

| ID | Câu hỏi và expected | Actual | Kết luận |
| --- | --- | --- | --- |
| E01 | App hiện tại qua format/typecheck/tests đã có | `npm run verify`: 16 tests, 0 fail, 8,586 s | PASS nền phần mềm; không phải art approval |
| E02 | HF 0.9.30 seek theo nhiều thứ tự/reload có cùng ảnh | 48 capture, 36 so sánh lại, 0 mismatch | PASS trên fixture SVG/GSAP |
| E03 | HF 0.9.33 giữ kết quả E02 | Graph cuối: 48 capture, 36 so sánh lại, 0 mismatch | PASS trên fixture; graph đầu cũng pass, log riêng |
| E04 | Strict chặn ảnh bắt buộc bị thiếu | Cả 0.9.30/0.9.33 exit 1, `media_load_failed`, không có MP4 cuối | PASS negative test |
| E05 | Best-effort có thể xuất khi thiếu ảnh, phải báo warning | Cả hai bản exit 0, `completed_with_warnings`, MP4 tồn tại | PASS phát hiện hành vi; delivery không đạt |
| E06 | Study hợp lệ trên HF 0.9.33 đủ frame, profile, audio, decode | 240 frame/10 s/640×360/24 fps, AAC stereo 48 kHz, BT.709; decode exit 0 | PASS technical fixture |
| E07 | Demo Three chính thức qua harness seek/reload và frame integrity | Mọi bước exit 0; raster 30 frame, path 8 frame; hash seek/reload đúng | PASS tiêu chí harness ở 320×180; chưa thử art studio |
| E08 | QTRLE/ARGB giữ bán trong suốt qua decode | 24 frame; alpha mean 127, std 0 | PASS alpha phẳng; chưa kiểm mép/composite |
| E09 | H.264 yuv420p không bảo toàn alpha | `alphaextract` báo planes không tồn tại, exit 234 | PASS negative control |
| E10a | Lệnh encode đầu khai đầy đủ tags BT.709 | Encode exit 0 nhưng ffprobe thiếu transfer/primaries | **FAIL** yêu cầu metadata; giữ file lỗi |
| E10b | Convert rõ sRGB/full → BT.709/limited rồi kiểm lại | File mới có primaries/transfer/matrix BT.709, range tv | PASS metadata fixture; chưa chứng minh color accuracy |
| E11 | Đo thông số demo cũ và loudness mà không sửa file | 312 frame/13 s/1080p; AAC **stereo** 48 kHz; −17,84 LUFS, −1,55 dBTP, LRA 3,50 | PASS thu số đo; chưa có gate loudness production |
| E12 | Chuẩn bị Manim CE 0.22.1 trong venv | Cài thất bại do `pangocairo`/`manimpango`; chưa render | **BLOCKED** môi trường; render NOT_RUN |

E02/E03 có thêm quan sát sau chạy: 12 hash của pass đầu 0.9.30 và graph cuối 0.9.33 trùng **12/12**. Đây là đối chiếu bổ sung, không phải benchmark ưu thế thống kê hoặc ngưỡng mới để làm pass.

## 3. Chi tiết và evidence

### E01 — nền ứng dụng

Lệnh: `npm run verify`, cwd repo. [Command](toolchain-evidence/baseline/app-verify-command.json), [log](toolchain-evidence/baseline/app-verify.log).

Giữ nguyên test assertions: formatting, TypeScript ứng dụng/web, 16 unit/HTTP/workflow tests. Renderer giả ở một số test chỉ kiểm state machine. Không chạy lại integration/UI toàn bộ trong vòng này: ứng dụng không đổi; suite đó ghi artifacts vào đường evidence cũ. Kết quả **13 integration và 9 UI checks** là snapshot trước được giữ, không cộng vào số test vừa chạy. Đường render thực được kiểm riêng bằng harness dưới đây.

### E02–E05 — HyperFrames seek và missing asset

Input: `validation/fixtures/hyperframes-study` và `hyperframes-missing`, sinh bởi `scripts/prepare-fixtures.py` từ `fixtures/scene.js`, templates và GSAP đã khóa; hash trong input manifest. Study 640×360, 24 fps, 240 frame; missing 320×180, 24 fps, 12 frame. Seek dùng 12 chỉ số `[0,23,24,47,48,71,72,95,96,119,120,239]`: xuôi, ngược, thứ tự trộn cố định, rồi browser session mới. 12 frame đầu tạo baseline; 36 frame sau so PNG SHA-256 với baseline. Không gọi 48 capture này là 48 mẫu độc lập.

Commands có sẵn, chạy trong từng research root:

```bash
python scripts/record.py seek node scripts/seek-hyperframes.mjs
python scripts/record.py missing-strict node scripts/render-hyperframes.mjs missing 1 strict
python scripts/record.py missing-best node scripts/render-hyperframes.mjs missing 1 best-effort
```

Chạy từng lệnh riêng; strict exit 1 là kết quả dự kiến, không bỏ qua phần kiểm warning/artifact. Evidence:

| Bản/graph | Seek | Strict | Best-effort |
| --- | --- | --- | --- |
| 0.9.30 | [command](toolchain-evidence/baseline/hf030-seek-command.json), [48 records](toolchain-evidence/baseline/hyperframes-seek.json) | [command](toolchain-evidence/baseline/hf030-missing-strict-command.json), [log](toolchain-evidence/baseline/hf030-missing-strict.log), [job](toolchain-evidence/baseline/hyperframes-missing-w1-strict-metrics.json) | [command](toolchain-evidence/baseline/hf030-missing-best-command.json), [log](toolchain-evidence/baseline/hf030-missing-best.log), [job](toolchain-evidence/baseline/hyperframes-missing-w1-best-effort-metrics.json) |
| 0.9.33 trước CLI | [command](toolchain-evidence/hf033/hf033-seek-command.json), [48 records](toolchain-evidence/hf033/hyperframes-seek.json) | [command](toolchain-evidence/hf033/hf033-missing-strict-command.json), [job](toolchain-evidence/hf033/hyperframes-missing-w1-strict-metrics.json) | [command](toolchain-evidence/hf033/hf033-missing-best-command.json), [job](toolchain-evidence/hf033/hyperframes-missing-w1-best-effort-metrics.json) |
| 0.9.33 graph đã khóa cuối | [command](toolchain-evidence/hf033-locked/hf033-locked-seek-command.json), [48 records](toolchain-evidence/hf033-locked/hyperframes-seek.json) | [command](toolchain-evidence/hf033-locked/hf033-locked-missing-strict-command.json), [job](toolchain-evidence/hf033-locked/hyperframes-missing-w1-strict-metrics.json) | [command](toolchain-evidence/hf033-locked/hf033-locked-missing-best-command.json), [job](toolchain-evidence/hf033-locked/hyperframes-missing-w1-best-effort-metrics.json) |

Seek elapsed: 5,834 s / 4,435 s / 5,171 s theo thứ tự bảng. Đây là một lượt mỗi graph, không kết luận version nào nhanh hơn. Tests chỉ bao phủ fixture này, không bao phủ physics, WebGL texture, shader compilation, font remote, tất cả WAV hoặc render khác máy.

### E06 — clip study hợp lệ HF 0.9.33

Lệnh có sẵn `node scripts/render-hyperframes.mjs study 1 strict`; [command](toolchain-evidence/hf033/hf033-study-strict-command.json), [metrics](toolchain-evidence/hf033/hyperframes-study-w1-strict-metrics.json), [probe](toolchain-evidence/hf033/hf033-study-probe.log), [decode command](toolchain-evidence/hf033/hf033-study-decode-command.json), [video](toolchain-evidence/hf033/study.mp4).

Expected: strict không warning, đúng frame count/profile/audio và decode. Actual: `completed`, warnings `[]`; 240 frame/10 s, 640×360, 24/1, H.264 yuv420p, BT.709 cả ba tags/range tv; AAC stereo 48 kHz/10 s; decode với `-v error -xerror` exit 0. Elapsed 26,717 s **có chồng thời gian với bước check của Three**, không dùng làm speed comparison hoặc capacity estimate. Chưa kiểm perceptual lip-sync/acting bằng clip hình học này.

### E07 — harness Three chính thức, giữ nguyên source

Nguồn: ví dụ `registry/examples/path-traced-3d/` của [HyperFrames commit e596be16…](https://github.com/heygen-com/hyperframes/tree/e596be16c901639ce6c18032e56924a9d8e1967d/registry/examples/path-traced-3d). Đã đọc `source/verify-render.mjs`, `assets/render.js`, `assets/scene.js` trước khi chạy. Harness tự tạo bản copy/config phục vụ thử nghiệm; không sửa upstream source hoặc viết harness mới.

[Input URLs/hashes](toolchain-evidence/three/inputs.json) pin cả bundle: Three **0.180.0**, pathtracer **0.0.24**, BVH **0.9.5**. Bundle SHA-256 `a247cb7f88eff8b1d423a2892e5ca27c7d03d83939fe0ca6fa9a11c7f9f21fc9`. Không phải Three r187 đang được đọc source.

Command: `node /tmp/studio-toolchain-r2/three-example/source/verify-render.mjs` qua recorder; biến môi trường ở environment manifest. [Exact command](toolchain-evidence/baseline/three-upstream-verify-command.json), [full log](toolchain-evidence/baseline/three-upstream-verify.log), [report JSON](toolchain-evidence/three/report.json), [upstream check report](toolchain-evidence/three/f1881ae9-726c-4a5a-b30f-fc7fcb107903.json).

Expected lấy nguyên từ harness: hash của seek `4s → 0s → 4s` giữ đúng; path reload cùng hash; đúng số frame export; pixel spread ≥4 để phát hiện blank, first/last difference ≥0,5 để phát hiện frozen, adjacent step ratio ≤3 để phát hiện bước nhảy lớn trong demo này. Các ngưỡng không thay sau khi chạy, và không phù hợp áp máy móc với shot có hold/black chủ ý.

Actual: toàn bộ 450,769 s, exit 0. Raster seek 4s `bc4c4f562a999d8b`; path seek/reload 4s `605dc67eb114157d` (hash rút gọn theo harness). Các export:

| Cấu hình | Frame thực | Pixel spread | First/last diff | Max adjacent ratio | Thời gian |
| --- | --- | --- | --- | --- | --- |
| Raster 320×180, 30 fps, 1 s; yêu cầu 1 worker | 30 | 31,7–33,6 | 9,83 | 1,05 | 6,5 s |
| Path 320×180, 10 fps, 0,8 s, 2 samples/pixel; yêu cầu 2 workers | 8 | 33,6–34,9 | 8,58 | 1,03 | 77,4 s |

Số workers trong report là **tham số yêu cầu**, không coi đó là số worker đồng thời đã đo. Hai cấu hình khác fps/duration/render method nên không phải A/B throughput. Không upscale hoặc interpolate các output này. Đã xem hai still ở 4s: raster có hình đầy đủ; path 2 samples/pixel còn nhiễu rõ. Chưa thực hiện đánh giá diễn xuất bằng xem liên tục toàn video; phép kiểm frame chỉ phát hiện một số lỗi kỹ thuật, không chấm chất lượng chuyển động.

Artifacts: [raster video](toolchain-evidence/three/raster.mp4), [path video](toolchain-evidence/three/path.mp4), [raster still](toolchain-evidence/three/raster-at-4s.png), [path still](toolchain-evidence/three/path-at-4s.png). Đây là render lại demo của dự án HyperFrames (Apache-2.0); vendor Three/pathtracer/BVH có license ở các URL trong input manifest. Không phải art pack hoặc tác phẩm nhân vật mới của studio.

Giới hạn: không chứng minh 1080p/24 fps, alpha cutout shadow, nhiều actor, two-round edits, native Three r187 readiness hoặc kết quả byte-identical giữa các GPU. Chi phí path tracing chưa được biện minh cho style này.

### E08–E10 — alpha và màu bằng FFmpeg CLI

Input tự tạo bằng filter CLI có sẵn: màu đỏ alpha 0,5; 64×64, 24 fps, 1 s. [Lệnh tạo](toolchain-evidence/baseline/ff-alpha-source-command.json). QTRLE/ARGB là fixture kiểm alpha; không chốt nó thành master production.

- **E08 expected:** alpha decode bằng mức 0,5 đã lượng tử hóa (127/255). [Command](toolchain-evidence/baseline/ff-alpha-roundtrip-command.json), [log](toolchain-evidence/baseline/ff-alpha-roundtrip.log): 24 frame gray mean 127, stdev 0. [MOV](toolchain-evidence/media/alpha-qtrle.mov). Chưa đo straight/premultiplied fringe, gradient hoặc compositing trên màu nền khác.
- **E09 expected:** H.264/yuv420p không chứa plane alpha. [Encode](toolchain-evidence/baseline/ff-h264-delivery-command.json), [negative command](toolchain-evidence/baseline/ff-no-alpha-negative-command.json), [log lỗi](toolchain-evidence/baseline/ff-no-alpha-negative.log). Exit 234 với `Requested planes not available` là PASS của negative control.
- **E10a expected:** output có matrix/primaries/transfer `bt709`, range `tv`. [File lần đầu](toolchain-evidence/media/opaque-h264.mp4), [probe command](toolchain-evidence/baseline/ff-color-initial-probe-command.json), [probe](toolchain-evidence/baseline/ff-color-initial-probe.log): có matrix/range, thiếu transfer/primaries. Giữ **FAIL**, dù encoder exit 0.
- **E10b:** tạo file khác sau đổi filter, giữ nguyên expected. [Command](toolchain-evidence/baseline/ff-color-explicit-command.json), [probe command](toolchain-evidence/baseline/ff-color-explicit-probe-command.json), [probe](toolchain-evidence/baseline/ff-color-explicit-probe.log), [MP4](toolchain-evidence/media/opaque-bt709.mp4). Đủ tags/range, 24 frame: PASS metadata.

Filter sửa cấu hình của E10b:

```text
format=gbrpf32le,zscale=matrixin=gbr:transferin=iec61966-2-1:primariesin=709:rangein=full:matrix=709:transfer=709:primaries=709:range=limited,format=yuv420p
```

Giả định input fixture là sRGB/full được khai tường minh. Đây không phải kết luận mọi ảnh/PNG/renderer đều dùng cùng input color space. Không có color chart/reference-decoder/perceptual pixel comparison trong vòng này; metadata đúng không đủ chứng minh màu đúng.

### E11 — kiểm demo cũ, phát hiện errata audio

Input `artifacts/morning-final.mp4`, SHA-256 `80b135bb23547da300c8fb218ac25d79514ebb39c3a1433457dae566ec142f18`. [Probe command](toolchain-evidence/baseline/ff-demo-probe-command.json), [probe log](toolchain-evidence/baseline/ff-demo-probe.log). Actual: 312 frame, 1920×1080/24 fps/13 s, H.264 yuv420p/range tv, BT.709 primaries/transfer/matrix; AAC **2 channels/stereo** 48 kHz/13 s.

Errata: `docs/verification.md` M2 ghi audio video demo mono; PCM mixer là mono, encoded video thực là stereo. Ghi đính chính ở đây, giữ tài liệu/artifact cũ để truy lịch sử. Q7 cần channel map và QC riêng.

[Loudness command](toolchain-evidence/baseline/ff-demo-loudness-command.json), [log](toolchain-evidence/baseline/ff-demo-loudness.log): `loudnorm=I=-16:TP=-1:LRA=11:print_format=json`, output null. Chỉ dùng **input_i −17,84; input_tp −1,55; input_lra 3,50** làm số đo. `output_*` là thống kê xử lý thử, không phải bản master mới được lưu. −16 LUFS trong lệnh là cấu hình phép đo/thử, chưa là profile giao hàng người dùng duyệt. Chưa thay voice/mix hoặc kết luận chất lượng nghe.

### E12 — Manim CE cài chưa đủ môi trường

Python venv riêng ở `/tmp/studio-toolchain-r2/manim-ce`; `uv pip install ... manim==0.22.1`. [Command](toolchain-evidence/baseline/manim-ce-install-command.json), [log](toolchain-evidence/baseline/manim-ce-install.log), [pkg-config check](toolchain-evidence/baseline/runtime-manim-prereq.log).

Expected: package/dependencies cài được để chạy example có sẵn. Actual: build `manimpango==0.7.1` báo `pangocairo >= 1.30.0` thiếu; pkg-config không tìm cairo/pangocairo. Install exit 1, 3,846 s. **BLOCKED_ENV**; không có frame/video Manim, không suy ra tool không phù hợp. Chưa cài system development packages ở vòng này; không có yêu cầu bị auto-review từ chối. ManimGL chưa cài/chạy.

Lần cài HF 0.9.33 đầu cũng exit 1 do cache npm mặc định không dùng được; [log fail](toolchain-evidence/baseline/hf033-install.log) được giữ. Chuyển `--cache` sang thư mục `/tmp` cho lần [retry](toolchain-evidence/baseline/hf033-install-retry-command.json) đã thành công; sau đó [cài CLI](toolchain-evidence/baseline/hf033-cli-install-command.json) và lặp lại ba tests trên graph khóa cuối. Đây là lỗi setup đã giải quyết, không phải regression renderer.

## 4. Các kiểm chứng chưa chạy

Mọi item dưới đây **NOT_RUN**; detail input/expected/output/fail route trong [test plan](../toolchain-future-plan.md). Không lấy thiếu dependency, artist hoặc harness làm kết luận tool không làm được.

| Item | Đầu vào còn thiếu/lý do | Evidence phải có trước quyết định |
| --- | --- | --- |
| T-THREE-01: cutout depth/shadow/alpha/contact | Art Q1 và harness scene mới cần duyệt | S03/S04, video theo thời gian, alpha/color/occlusion/contact và hai vòng sửa |
| T-THREE-02: native Three r187 readiness | Cần fixture slow/missing texture, error/timeout/ESM/global paths | Log readiness, capture timing, missing texture chặn; source risk được xác nhận hoặc bác bỏ |
| T-HF-01: WAV regression/upgrade | Fixture cũ không chứa đúng WAV offset/header xấu | Sample/frame accuracy, lỗi có kiểm soát, không warning bị nuốt |
| T-MEDIA-01: full media contract | Art/color chart/straight-premultiplied/golden player/harness | Color transform đúng, alpha edges/composite, sync/loudness profile approved |
| T-MANIM-01/02 | CE thiếu deps; GL chưa dựng env; shot thiết kế mới chưa duyệt | Example chạy trước, sau đó shot giải thích/cue/edit/render reproducibility |
| T-EDIT-01 và sáu shot A/B | Q0 art target, Q1 art/rig, quyền viết prototype và animator | 6 video cùng brief; xem thời gian thật; 2 vòng sửa; source/effort/rejected takes |
| T-OPS-01 | Chưa thay ứng dụng; máy/pipeline production chưa chốt | Fault/restore/cache/clean environment, RAM/VRAM, data integrity |
| Generative/model/license trả phí | Chưa có budget/rights/checkpoint/pilot duyệt | Input/output tất cả takes, chi phí và phút accepted; benchmark native/upscale công khai |

Không có human approval production, điểm art/acting, chi phí/phút accepted hoặc SLA được đo trong vòng này. Q0–Q9 giữ **NOT_STARTED**.

## 5. Tái lập mà không ghi đè bằng chứng cũ

### 5.1 Chuẩn bị

Lấy repo/commit của bản bàn giao; đọc AGENTS và kiểm hashes ở `reports/SHA256SUMS.toolchain`. Tạo **thư mục nghiên cứu mới** và sao `validation/scripts`, `validation/fixtures` nguyên trạng. Không chạy `run-suite.py` trực tiếp lên evidence gốc. Cần Node/Python/Chromium/FFmpeg như manifest và đường `/usr/bin/chromium` mà harness cũ dùng.

Ví dụ cho HF 0.9.33, chạy từ repo root; các biến là đường nghiên cứu, không đặt lại HOME:

```bash
TOOLCHAIN_REPO="$PWD"
TOOLCHAIN_RUN=$(mktemp -d /tmp/studio-toolchain-repro-XXXXXX)
cp -R validation/scripts validation/fixtures "$TOOLCHAIN_RUN/"
cp docs/research/toolchain-evidence/hf033/package.json "$TOOLCHAIN_RUN/"
cp docs/research/toolchain-evidence/hf033/package-lock.json "$TOOLCHAIN_RUN/"
mkdir -p "$TOOLCHAIN_RUN/evidence" "$TOOLCHAIN_RUN/out"
cd "$TOOLCHAIN_RUN"
npm ci --cache "$TOOLCHAIN_RUN/npm-cache"
python scripts/record.py prepare-fixtures python scripts/prepare-fixtures.py
```

Các thư mục `hyperframes-study`, `hyperframes-missing` và WAV là generated/gitignored; bước `prepare-fixtures.py` là bắt buộc ở checkout sạch. Đối chiếu hash sau khi sinh với input manifest. Sau đó chạy từng lệnh ở E02–E06, dùng tên record mới. Với 0.9.30, tạo một root mới khác và dùng `validation/package.json`/`package-lock.json`. Trong phiên đo hiện tại, root baseline liên kết node_modules đã có; khi tái lập sạch dùng `npm ci` theo lock. Fixtures chứa asset local; không đổi input giữa versions. Đối chiếu status/job/36 comparisons; đừng chỉ xem exit code của recorder.

Đã kiểm riêng bước chuẩn bị từ các file được Git quản lý: [command](toolchain-evidence/reproduction/prepare-fixtures-repro-command.json). Lần đối chiếu [inventory ban đầu](toolchain-evidence/reproduction/fixture-hashes.json) báo FAIL do liệt kê nhầm 8 file output/cache `.hyperframes` của check cũ như input. Giữ [inventory gốc](toolchain-evidence/reproduction/inputs-before-classification.json), sửa phân loại trong input manifest: **21/21 file fixture đầu vào thật khớp hash** ([kết quả](toolchain-evidence/reproduction/fixture-input-hashes-corrected.json)). Không đổi ngưỡng/bytes expected, không tính cache cũ là input bắt buộc. Bước này tái sử dụng node_modules HF033; không tuyên bố đã clean-install hoặc render lại toàn suite.

`npm run verify` chạy từ app root và dùng dependency app theo lock, không dùng package nghiên cứu. Cài sạch app theo [reproduction](../reproduction.md) khi chưa có dependencies.

### 5.2 Three upstream harness

Tải đúng 10 file từ URL cố định trong `three/inputs.json`, giữ relative paths dưới một root riêng `three-example`. Kiểm SHA-256 trước chạy. Đọc `source/verify-render.mjs` và source scene/render; không chạy chỉ dẫn tùy ý của repo upstream. Không rebuild bundle từ version mới.

Trỏ các biến sau tới root HF033 đã cài và Chromium hiện có, rồi dùng recorder gốc để chạy `node <three-example>/source/verify-render.mjs`:

```text
HYPERFRAMES_CLI=<hf033-root>/node_modules/hyperframes/bin/hyperframes.mjs
HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium
HF_CHROME=/usr/bin/chromium
HYPERFRAMES_CACHE_DIR=<research-root>/hf-cache
HYPERFRAMES_NO_TELEMETRY=1
PRODUCER_BROWSER_GPU_MODE=software
KEEP_VERIFY_OUTPUT=1
```

Harness lưu scratch path ở cuối log. Giữ report, check manifest, PNG/MP4 và cả output lỗi. Nếu browser/GPU/version khác, ghi lại môi trường; không tự hạ ngưỡng hoặc khẳng định PNG bytes phải giống máy cũ. Hash đầy đủ của artifacts bàn giao nằm trong checksum manifest mới.

### 5.3 FFmpeg và Manim

E08–E11: tái chạy **argv** trong `*-command.json` theo thứ tự source → alpha → H.264 → negative/probe → explicit color → probe. Tạo `out/media` ở research root mới; thay cwd/path gốc của demo bằng đường file có cùng hash. FFmpeg `-y` chỉ được dùng trong output root mới. Loudness output null không sửa demo.

E12: venv mới với Python 3.12.14, pin CE 0.22.1. Nếu muốn tiếp tục, trước tiên bổ sung cairo/pangocairo và build prerequisites đúng OS; ghi package versions, cài lại rồi chạy example `SquareToCircle` có sẵn ở commit đã pin. Đây là bước **chưa chạy** ở vòng này. Shot/harness mới vẫn cần phạm vi nghiên cứu tiếp được duyệt.

## 6. Tổng kết chặng đã hoàn thành và còn mở

| Chặng vòng nghiên cứu | Kết quả |
| --- | --- |
| Xác nhận snapshot, đọc và đối chiếu | Hoàn thành phạm vi công khai trong sổ đọc; Word/PDF/code/test/history đối chiếu được |
| Khảo sát source/version/license | Hoàn thành báo cáo và manifest; một số nguồn phụ chỉ DOC/SEARCH_ONLY, đã ghi giới hạn |
| Kiểm chứng bằng công cụ hiện có | Hoàn thành các E01–E11; E10a FAIL được lưu, E10b kiểm lại cấu hình; E12 bị thiếu môi trường |
| Kế hoạch triển khai/mở rộng | Có Q0–Q9, F01–F11, test plan/backlog/gates/fail routes; vẫn là kế hoạch chờ duyệt |
| Production implementation/approval | Chưa thực hiện trong vòng này; giữ nguyên trạng thái P/Q và kết quả v0.1 |

Không bỏ hoặc xóa thất bại để báo pass. Không gộp việc soạn xong kế hoạch với việc hoàn tất các giai đoạn trong kế hoạch.

### Kiểm tra gói bàn giao

Đã kiểm `sha256sum -c` cho `SHA256SUMS`, `reports/SHA256SUMS.delivery`, `reports/SHA256SUMS.validation`, `reports/SHA256SUMS.production-quality` và `artifacts/SHA256SUMS`: tất cả OK. `git diff` với app baseline trên `src/`, `web/`, `tests/`, package/lock/tsconfig, `.github/`, `validation/` và `artifacts/` rỗng. Liên kết file nội bộ và JSON mới đã kiểm hợp lệ. `git diff --cached --check` phát hiện trailing whitespace trong log FFmpeg nguyên bản (metadata `qt  ` và progress); giữ bytes log. Kiểm whitespace phần còn lại sau khi loại riêng `*.log` không báo lỗi. Manifest [SHA256SUMS.toolchain](../../reports/SHA256SUMS.toolchain) khóa tài liệu/evidence mới, không thay checksum cũ.
