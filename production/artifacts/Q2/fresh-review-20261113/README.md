# Tái lập workbench từ dữ liệu đã commit

Commit nguồn đã kiểm: `065a02ca0716652be10adb0572a2255defa39a2b`.
Attempt [fresh-review-repaired-lock-retest](../../../evidence/Q2/20261112T231454Z-fresh-review-repaired-lock-retest-1d3872f7/result.json)
PASS trong25.213s. [Report](report.json), [browser report](browser-report.json).

Helper lấy `git archive HEAD production`, giải nén vào thư mục `/tmp` riêng
ngoài cây repo, dùng npm cache mới. Không mang dependency đang cài, MP4 đã ghép
hay native renders chưa commit sang đó. Sáu lệnh sau đều exit0:

1. `npm --prefix production ci --no-audit --no-fund`
2. `python production/src/media/review_bundle.py restore production/artifacts/Q2/web-review-v2`
3. `npm --prefix production run typecheck`
4. `npm --prefix production test` —19 tests.
5. `npm --prefix production run review -- check` —ba SHA/profile đúng.
6. `npm --prefix production run test:review-ui` —13actual-browser checks.

Browser: Chromium156.0.8078.79. Bốn record trong
[test-journal-export.json](test-journal-export.json) dùng `automated-test`; không
record nào là duyệt phim. Đây là cùng host/runtime/agent, không phải chứng nhận
máy mới, người vận hành độc lập, nghe thoại hoặc chấm diễn xuất.

## EX-028 và kế hoạch sửa đã thực hiện

- Git-only checkout ban đầu FAIL: npm không tìm đủ dependency gián tiếp theo
  layout lock. Retest ngoài cây repo vẫn FAIL, loại giả thuyết chỉ do nằm dưới
  `production/out`.
- Tạo lock trong temp riêng. Guard đầu tiên giữ vị trí package quá chặt nên
  từ chối relocation; giữ failure và sửa guard so multiset package/version/
  URL/integrity. Cả12 package chuyển vị trí đều giữ nguyên tarball; direct pins
  không đổi. Không nâng dependency để che lỗi.
- Commit lock rồi chạy toàn bộ flow Git-only ở trên: PASS. CI full repo trước
  fix vẫn PASS; không diễn giải thành CI đã thất bại hoặc lỗi npm upstream.

Old lock SHA: `21c8c9e32d63d51d8476d65700d712dbbe212acc5e6340e826ded20cfa8d9b74`.
New lock SHA: `181bd0e539d9518881a54a3d9191edd92340d503926dc748e3a238b2b8e79ee1`.

Logs giữ tại `production/evidence/Q2` theo attempt:
`fresh-git-review-reproduction-52408802`,
`fresh-review-outside-parent-tree-2a367832`,
`repair-workbench-lock-isolated-710140e3`,
`repair-lock-preserve-tarball-identities-0d07092b`,
`fresh-review-repaired-lock-retest-1d3872f7`.
Tên đầy đủ có timestamp để không ghi đè lần thử cũ.

Chạy lại bằng [QA runbook](../../../src/qa/README.md). Không cần render lại1152
native frame chỉ để mở chương trình review. Không chạy repair_lock.py như một
bước cài đặt thường lệ; `npm ci` dùng lock đã sửa là đường cài đặt chuẩn.

## Container Git ownership — EX-029

CI mở rộng đầu FAIL ở Git trước npm do owner checkout khác UID. Scoped fix chỉ
trust ROOT cho hai lệnh Git read-only; không đổi global config. Negative956407db
tái hiện exit128. Full-flow ac207c43 trên commitabae639 với
`GIT_TEST_ASSUME_DIFFERENT_OWNER=1` PASS cả6lệnh,19tests và13browser checks trong
28.538s; [report](ownership-retest-report.json). Actual CI retest được lưu riêng.

Actual CI retest run43329136529 PASS, gồm đầy đủ standalone6lệnh.
[Report gốc từ stdout CI](ci-standalone-report.json) ghi GitHub test-merge HEAD;
source head liên quan là d82da6e. [Hai workflow và từng step](../ci-standalone-repaired-20261113.json) đều SUCCESS.
