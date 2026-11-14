# Lỗi và đường sửa nâng cấp

- U-005 CLOSED_SCOPED: geometry input SHA không chứa gravity/solver/source/lock;
  cùng input đổi gravity cho bake khác nhưng consumer nhận bake cũ. Thêm execution
  receipt riêng, giữ data/golden cũ; negative gravity/source/lock/receipt và legacy
  replay tests PASS. Không gọi SHA receipt là chữ ký chống người sửa file ác ý.
- U-006 CLOSED: metadata secondary `lantern` không trỏ instance `lamp`; strict
  Performance validator phát hiện trước render. Chỉ sửa metadata, motion cũ giữ.
- U-007 CLOSED: end-to-end diagnostic helper dùng path texture relative sai khi
  chạy từ repo root. Fail giữ nguyên; dùng absolute path và child error logging,
  fresh texture/export/Chromium/hash workflow PASS.

- U-001 CLOSED_SCOPED: strict0drop penetration ban đầu fail mặc dù engineering
  tolerance pass. Rapier thêm contact skin2mm, đo lại raw samples0penetration;
  period/fall/bounce không nới ngưỡng. Planck vẫn fail strict0, không chọn làm
  hero engine. Baseline/contact-envelope reports được giữ riêng.
- U-002 CLOSED: critic chọn suffix /boot nên lấy cả decorative shadow, thiếu
  soleanchor. Sửa phân biệt shadow/ với boot vật lý; không bỏ boot nào. Retest
  192frames và injected detached-joint negative PASS.
- U-003 OPEN_ACCEPTANCE: image/motion aesthetics, actual voice listening,
  reference licenses/final art và independent operator chưa có kết quả.
- U-004 OPEN_SCOPE: hero chỉ mô phỏng lantern joint; chưa có character collision
  volumes/cloth/hair, mocap cleanup,8viseme alignment, final foley/music,
  general director/repair orchestration hoặc pilot72s. PLAN ghi thứ tự tiếp tục.

Npm metadata call đầu dùng cache mặc định không ghi được ngoài workspace;
đổi sang /tmp/studio-npm-cache, không đổi môi trường hệ thống hoặc nới quyền.
