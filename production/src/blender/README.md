# Candidate B — native Blender authoring

`export_frames.ts` xuất pose/camera/art chung cho A/B, không dùng PNG/video của A.
`build_shot.py` tạo native planes, materials alpha, camera và F-curves trong Eevee.
`vse_probe.py` là thử tối ưu có giới hạn: native image strips/F-curves trong VSE.
Cả hai giữ source metadata; VSE chỉ có orthographic + authored multiplane, không
nhận hỗ trợ ánh sáng vật lý, camera 3D tự do hoặc bone rig.

## Lệnh từ repo root

```bash
production/node_modules/.bin/tsx production/src/blender/export_frames.ts
env BLENDER_USER_CONFIG=/tmp/studio-blender-config MESA_SHADER_CACHE_DIR=/tmp/studio-mesa-cache blender --background --factory-startup --python-exit-code 1 --python production/src/blender/build_shot.py -- S05 1920 8 72,191
env BLENDER_USER_CONFIG=/tmp/studio-blender-config blender --background --factory-startup --python-exit-code 1 --python production/src/blender/vse_probe.py -- S05 1920 all
```

Arguments: shot ID, native width, Eevee samples (chỉ planes), frame list zero-based
hoặc `all`. `BENCHMARK_INPUT_DIR` chọn snapshot JSON đã khóa để batch không bị đổi
input khi authoring round tiếp theo. Unique take chứa request, inputs (VSE), native
`.blend`, PNGs, progress, result. Với `all`, VSE xuất MP4, kiểm frame/profile/full
decode; chưa coi result technical là art/voice approval.

Blender mặc định exit 0 dù Python exception: **bắt buộc `--python-exit-code 1`**.
`check_failure.py` cố ý raise và assert exit 1. Q2 first VSE attempt có process
PASS nhưng semantic FAIL (EX-016), được giữ để audit.

## Các khác biệt đã kiểm

- Eevee 8 samples S05 1080: hai frame 6.90/5.26 s, không phải throughput estimate.
- VSE trước sửa lật cả offset của nhân vật, visual FAIL. VSE flip ở output frame,
  cần bù offset và rotation để thành mirror local (EX-017).
- `compare_frames.py` so hai frame với Eevee theo threshold khóa; không biến pixel
  similarity thành chứng nhận diễn xuất. Các take sửa lỗi và ảnh trước/sau giữ riêng.
- Hold trùng nguyên state có thể hardlink PNG trong **cùng take**, cache key là
  canonical frame JSON. Không phải cross-shot/persistent cache production Q7.
- Native curves hiện là sampled pose curves. Artist có thể sửa keyframes nhưng
  sửa action semantic ưu tiên JSON/source rồi regenerate. Chưa có Blender rig UI.

Khi handoff: texture PNG phải đi cùng native file hoặc được tái tạo bằng manifest
và source SVG. Reopen/portable packaging vẫn là test riêng ở Q2/Q7/Q8.
