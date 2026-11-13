# Kiểm tra, tái lập và bảo toàn bằng chứng Q2

Các helper ở đây kiểm kỹ thuật, không thay việc nghe thoại, chấm diễn xuất hoặc
bàn giao cho operator độc lập. Chạy từ repo root. Mỗi lần thử dùng
`python scripts/run-step.py Q2 <tên-bước> -- <lệnh>` để lưu request trước khi chạy,
source ZIP, log, exit status và hash. Không sửa kết quả attempt cũ khi chạy lại.

| Helper | Mục đích và dữ liệu đầu ra | Điều kiện/giới hạn |
| --- | --- | --- |
| `check_fresh_review.py` | `git archive HEAD production` sang `/tmp/studio-q2-clean-*`, dùng npm cache mới; cài sạch, ghép ba video, typecheck, unit/API tests, catalog hash/profile và actual browser workflow. Report ở `production/out/fresh-review/<id>/report.json`; checkout và logs giữ lại khi fail. | Chỉ kiểm **đã commit**; không mang `node_modules`, MP4 đã ghép hoặc native renders chưa tracked vào checkout. Cần network/npm, Node, Chromium, FFprobe và Python. Cùng máy/cùng agent, không chứng nhận independent handoff. |
| `audit_review_workflow.mjs` | Chromium thật, POST đang chờ/mất response/GET lỗi; kiểm giữ draft mới, retry không trùng, thông báo đúng khi đã commit. `npm --prefix production run test:review-recovery`; report/ảnh/journal ở `production/out/review-audit/<id>`. | Dữ liệu automated-test riêng; chỉ kết luận lỗi sản phẩm khi có report FAIL_CONFIRMED. Exit code hoặc thiếu report riêng lẻ chưa đủ; HARNESS_ERROR giữ riêng. Không patch source UI hoặc journal, không là review nghệ thuật. |
| `repair_lock.py` | Chạy `npm install --package-lock-only --ignore-scripts` trong temp riêng, rồi kiểm direct pins và toàn bộ multiset `(package name, version, resolved URL, integrity)` trước khi chép lock về. | Là công cụ sửa có chủ đích, không phải bước startup. Chỉ cho phép đổi vị trí package trong lock; thay tarball sẽ fail. Sau đó phải xem Git diff, commit và chạy `check_fresh_review.py`. Không cài vào workbench đang dùng. |
| `run_app_regression.py` | Build CLI, integration và UI của v0.1 trong cwd riêng; hash deliverables cũ trước/sau; report ở `production/out/app-regression/<id>`. | Dùng source và dependency hiện tại qua symlink; đây là regression giữ artifact, không phải clean-install test. Fail bước trước thì không chạy bước sau. |
| `check_color_reference.py` | Chạy actual Chromium trên chart v2 đã commit, rồi đo pixel theo ngưỡng chart v1 đã khóa; output mới ở `production/out/player-check` và `chart-results`. | Không cập nhật golden hoặc nới ngưỡng. PASS là hợp đồng màu có giới hạn của player đang kiểm, không là mọi màn hình/player. |
| `audit_evidence.py <report-mới.json>` | Kiểm SHA log và từng source ZIP/entry của tất cả attempt; liệt kê attempt thiếu result và ghi report mới. | Không sửa các attempt INCOMPLETE. Chính audit đang chạy sẽ chưa có result trong lúc tự quét. Tổng elapsed có job song song, không dùng làm CPU-hours hoặc chi phí/phút. |
| `check_review_package.py` | Kiểm selected master/native hashes và link tại checkpoint review-final; tạo `review-final/checkpoint-checks.json` theo chế độ exclusive. | Helper checkpoint cũ chạy một lần: nếu report đã tồn tại thì không chạy đè. Không xóa report cũ để tạo cảm giác mới. Kiểm current catalog bằng CLI `review -- check`. |

## Kiểm lại từ Git mà không render lại

Đầu tiên commit source và lock cần kiểm. Sau đó chạy:

```bash
python scripts/run-step.py Q2 fresh-review -- python production/src/qa/check_fresh_review.py
```

Helper dừng tại lệnh lỗi, ghi `FAIL` và giữ thư mục để điều tra. Nếu process bị
kill/timeout trước khi ghi report, request/log của recorder vẫn cho biết attempt
chưa hoàn thành; không được suy file tồn tại là PASS. Chọn source fix nhỏ nhất,
giữ failure, tạo commit mới rồi chạy attempt mới. Không đưa npm cache, checkout
temp hoặc toàn bộ `production/out` vào Git; chỉ chọn report/ảnh cần bàn giao.

## Lỗi lock đã tái hiện và sửa

EX-028 tái hiện cả trong `production/out` lẫn checkout bên ngoài repo: `npm ci`
không tìm đủ 12 dependency gián tiếp ở vị trí lock cũ. Npm repair chuyển đúng
12 package sang subtree `puppeteer-core`; version, URL, integrity và direct pins
không đổi. Guard ban đầu từ chối việc chuyển vị trí, failure được giữ; guard
hiện tại so multiset tarball để cho phép đúng thay đổi này.

Commit `065a02ca0716652be10adb0572a2255defa39a2b` đạt cả sáu lệnh clean reproduction,
19 tests và 13 browser checks. Lock SHA:
`181bd0e539d9518881a54a3d9191edd92340d503926dc748e3a238b2b8e79ee1`.
[Bằng chứng chọn lọc](../../artifacts/Q2/fresh-review-20261113/README.md).
CI full repo trước fix vẫn PASS; không gán failure này thành lỗi CI hoặc khẳng
định npm upstream hỏng. Bằng chứng chỉ đủ kết luận sửa layout giúp trường hợp
standalone checkout đã tái hiện chạy được.

CI workbench chạy thêm `check_fresh_review.py` ngoài các ca kiểm full repo, dùng
Python venv qua PATH và upload report riêng. Cách này giữ ca hồi quy EX-028 trong
pipeline: việc `npm ci` ở full repo PASS không đủ chứng minh standalone PASS.

EX-029: lần CI standalone đầu dừng ở kiểm ownership của Git trước khi cài npm.
Helper hiện truyền `git -c safe.directory=<ROOT>` cho hai lệnh read-only
`rev-parse`/`archive`, trong đó ROOT được suy từ vị trí source đang chạy. Không
ghi global config hoặc tin cậy wildcard. Ca negative dùng
`GIT_TEST_ASSUME_DIFFERENT_OWNER=1` và safe.directory rỗng tái hiện exit128;
fixed full-flow phải chạy lại trong điều kiện khác owner, rồi kiểm CI thực.

Scoped fix được xác nhận: negative956407db exit128; full-flow ac207c43 PASS
trong điều kiện khác owner; GitHub workbench run43329136529 gồm standalone
step PASS. [Report CI](../../artifacts/Q2/fresh-review-20261113/ci-standalone-report.json).
# Preserve archived scene output when repairing a shot

`check_handoff_legacy.ts selection.json new-report.json` re-evaluates each of
the six archived native `inputs.json` files with the current scene code. It
compares the JSON-export representation against all1,152 saved frame objects;
it does not compare two evaluations of the same new implementation. JSON
normalizes negative zero, so the check uses that exact persisted representation.
The report is exclusive-created and includes input hashes. Run via the recorder.
This is source compatibility, not artistic approval or independent handoff.
