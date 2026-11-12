# Môi trường benchmark Q1

Ngày kiểm: 2026-11-12 (Asia/Saigon). Chỉ chứng minh khả năng chạy, chưa chọn backend.

| Thành phần | Phiên bản / quyền | Nguồn và phạm vi |
| --- | --- | --- |
| Three | 0.187.0 / MIT | npm lock; real PNG alpha, WebGL2 smoke |
| HyperFrames engine/producer | 0.9.33 / Apache-2.0 upstream | npm package không khai trường license; sổ nguồn nghiên cứu giữ license root; readiness thật kiểm Q2 |
| GSAP | 3.15.0 / Standard no-charge license | https://gsap.com/standard-license ; không coi là MIT |
| Blender | 4.3.2 / GPL-3.0-or-later | binary môi trường; native .blend + Eevee smoke |
| Chromium | 156.0.8078.79 / Chromium notices | software rendering, không đại diện GPU máy vận hành |
| FFmpeg | 7.1.5 / theo build config | dùng binary có sẵn; không phân phối lại binary trong repo |
| Kokoro wrapper | 0.6.1 / MIT | https://github.com/thewh1teagle/kokoro-onnx ; source pin `3596b26764286a7de9d90c363e988d50578918e5` |
| Kokoro 82M weights | v1.0 / Apache-2.0 | https://huggingface.co/hexgrad/Kokoro-82M ; local CPU FP32 |
| Voice bank | voices-v1.0.bin | đi cùng model release; af_heart là giọng tổng hợp, không gán cho người thật |
| eSpeak NG / phonemizer | GPL-3.0 / GPL-3.0-or-later | runtime phụ thuộc của voice; lưu ý nghĩa vụ nếu phân phối runtime |
| Art | lantern-art-1 / original project artwork | SVG paths do dự án tạo, không lấy art/voice từ repo tham khảo |

Không có font hoặc reference image bên ngoài trong pack. Dependency license đầy đủ
giữ trong các package đã khóa; không diễn giải MIT của wrapper thành license của
toàn bộ audio stack. Voice model/data rights chỉ dựa trên model card của nhà phát
hành, không phải xác minh nguồn dữ liệu huấn luyện độc lập.

## Tái tạo từ repo root

```bash
npm ci --prefix production
uv --cache-dir /tmp/studio-production-uv-cache venv production/.venv
uv --cache-dir /tmp/studio-production-uv-cache pip install --python production/.venv/bin/python -r production/requirements-voice.lock
python production/src/art/build_assets.py
production/node_modules/.bin/tsx production/src/art/preview.ts
python production/src/audio/fetch_models.py
production/.venv/bin/python production/src/audio/prepare_voice.py
production/node_modules/.bin/tsx production/src/art/check_three.ts
env BLENDER_USER_CONFIG=/tmp/studio-blender-config blender --background --factory-startup --python-exit-code 1 --python production/src/blender/environment.py
```

Chạy từng lệnh qua `scripts/run-step.py` để có log bất biến. Model tải khoảng 354 MB,
SHA khóa trong fetch_models.py; không gửi văn bản đến dịch vụ voice. `production/out`
và `.cache` có thể tái tạo, không phải bản nguồn. Hardware/memory benchmark nằm Q2.

Blender bắt buộc `--python-exit-code 1`: mặc định có thể exit 0 dù script Python
throw (EX-016). Kiểm cả result manifest + PNG/native project, không suy từ process.

## Các giới hạn đang mở

- Voice fixture 1.688625 giây, PCM được kiểm finite/length/timing; tool audio của
  phiên này không hỗ trợ nghe đầu vào. **Chưa nghe duyệt prosody/phát âm**; không
  tự đổi speed chỉ vì số đo WPM. Giữ gate nghe ở Q1/Q5 để người dùng nghe artifact.
- Timings là dự đoán của model, không phải forced alignment độc lập.
- Eevee smoke 320×320 mất 35.864 s/render, chưa là benchmark sáu shot/1080p.
- Không có người tái tạo/reviewer độc lập; kiểm sạch do cùng agent không thay vai đó.

## Bổ sung Q2 review — 13/11/2026

- Node24.22.1/npm11.9, FFmpeg7.1.5, Chromium156.0.8078.79 là môi trường đã đo.
- Python QC khóa NumPy2.3.5/Pillow13.0.0 trong requirements-qc.lock; cài vào venv
  riêng khi cần. review_bundle.py chỉ cần Python standard library.
- `npm ci --prefix production`; restore ba bundle theo README review, rồi
  `npm --prefix production run review -- serve`. Không cần voice model/Blender
  chỉ để xem, ghi chú và tải source. Native regeneration dùng các module riêng.
- CI `.github/workflows/production.yml` cài runtime, chạy contracts, restore,
  frozen chart và UI; browser thực trên runner được ghi trong report. Phiên bản
  apt trên CI không được tự nhận là trùng môi trường tham chiếu ở trên.
