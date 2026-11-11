# Nhật ký đọc và sổ nguồn — nghiên cứu toolchain vòng 2

Ngày truy cập/đối chiếu: **11/11/2026**. Baseline nghiên cứu `8e58ffc3133102279f6a3f59b66a38f22d14def0`; app `b79ec76497b7cb57f753f596cb60969aae3383d2`. [Manifest máy đọc được](toolchain-source-manifest.json) giữ full commit/file URLs. [Báo cáo](../../reports/Nghien_cuu_toolchain_va_ke_hoach_mo_rong.md) phân biệt fact với proposal.

## 1. Phạm vi đọc trong repo

“Đã đọc” dưới đây chỉ nói đến file/phần đã nêu, không có nghĩa audit mọi dependency, binary hoặc mọi tình huống chạy. Hồ sơ vòng trước được giữ và đối chiếu với code; không coi nhãn DONE trong plan là bằng chứng độc lập.

| Nhóm | File/phần đã đọc hoặc đối chiếu | Độ sâu và giới hạn |
| --- | --- | --- |
| A: quy tắc/trạng thái | README, AGENTS, agent.md, skills.md, plan.md, CHANGELOG | Đọc quy tắc, scope/thứ tự, mốc và constraints. Sáu `skills/*/SKILL.md` đã đọc input/output/error/gate; vòng này không thực thi production skills |
| B: Word/PDF gốc | `Bao_cao_Studio_hoat_hinh_AI_HyperFrames_Remotion.docx` và PDF | 580 paragraphs, 26 bảng, 10 inline figures; nội dung đã đọc trong chuỗi thẩm định, lần này đối chiếu lại tất cả bảng/sơ đồ và nội dung camera/asset/timebase/production. Xem PDF trang 23,24,36,40; không tuyên bố render/view đủ 59 trang |
| B: thẩm định/kế hoạch | `Tham_dinh_ky_thuat.md`, `Ke_hoach_trien_khai.md` | Đọc findings/evidence, G/P, ngưỡng, điều còn thiếu. Kế hoạch cũ là snapshot trước app; đối chiếu từng claim với implementation hiện tại |
| B: Word bàn giao | `Tham_dinh_va_ke_hoach_Studio_AI.docx`, `Ban_giao_Studio_noi_bo_v0.1.docx` | Trích cấu trúc/headings, đối chiếu Markdown nguồn và trạng thái; không kiểm layout Word trên Office ở vòng này |
| C: research production | `Nghien_cuu_chat_luong_production.md`, `production-quality-plan.md`, `production-quality-sources.md`, evidence JSON, verification/log | Đọc/đối chiếu shortlist, source claims, Q0–Q9, rubric, sáu shot, source hashes và NOT_RUN. Không chuyển bằng chứng SOURCE thành RUN |
| C: Word research | `Nghien_cuu_va_ke_hoach_chat_luong_production.docx` | Snapshot của Markdown: 320 paragraphs/9 bảng; kiểm nội dung/structure liên quan, chưa pagination trên Office |
| D: kiến trúc/kế hoạch | roadmap-full, architecture, capabilities, verification, ADR 0001, toàn bộ docs/phases | Đọc đường phụ thuộc/trạng thái; phân biệt M0–M6 prototype với P/Q production |
| D: vận hành/API/quyền | reproduction, runbook, api, THIRD_PARTY_NOTICES; development/review-checklist/user-guide liên quan | Đọc contracts, installed/runtime assumptions, cache/version/review/restore limits; không audit pháp lý mọi dependency transitive |
| E: app source | `src/domain.ts`, planner, rig, audio, render, application, process, store, server, cli | Đọc đường xuyên suốt từ input đến export/review và các helper liên quan. `espeak.d.ts` là khai báo types, không audit engine voice bên ngoài |
| E: UI | `web/app.js`, cấu trúc/index và CSS liên quan các kiểm cũ | Đọc data flow, dirty state/conflict, chọn artifact, review frame, import/export. Không chạy lại UI hay đánh giá accessibility toàn diện vì không đổi UI |
| E: tests | domain/audio/http/workflow và toàn bộ integration.ts/ui.ts | Đọc assertions và fixtures; biết fakeRenderer chỉ kiểm state. Verify chạy mới 16 PASS. Integration/UI giữ evidence cũ, không chạy lại/ghi đè video |
| E: build/deps/CI | package.json/lockfile, tsconfig/build commands, workflow CI | Xác định exact direct versions, format/typecheck/tests, container/action pins và runtime cài ngoài npm. Không đọc từng dòng transitive source |
| E: harness | validation README, prepare-fixtures, record, seek/render HF và Remotion, run-suite, QC/comparison/summarize liên quan hồ sơ cũ | Chạy bản sao scripts/fixtures nguyên byte; không thay tests/harness. Các script không dùng ở vòng này kế thừa phạm vi review trước, không được tính thành test mới |
| E: inputs/evidence | examples/morning/smoke, artifacts JSON/hash, original/failure/CI/clean logs và validation evidence được dẫn | Xem metadata/assertions và kết quả liên quan; không tuyên bố xem/nghe đầy đủ mọi video/PNG cũ. Kiểm hashes toàn bộ tập có manifest |

### Phần không đọc/không kiểm và lý do

- `node_modules`, compiler output/cache, Git object internals: không thuộc source sản phẩm cần audit từng file. Chỉ kiểm version/license/runtime được dùng.
- Toàn bộ upstream của các công cụ lớn: chỉ targeted source sections; hơn 11.000 paths HyperFrames không thể được gọi là đã audit vì tải tree.
- Binary model/GPU checkpoint/paid tool installer: không tải/chạy; không có phí/credential/trial license được dùng.
- Full Office pagination, mọi trang PDF, mọi take video trong history: chưa thực hiện. Với thử nghiệm chất lượng Q2 cần review video theo thời gian; vòng này không chấm acting từ ảnh tĩnh.
- Security/load/SIGKILL đầy đủ, cross-platform/GPU, dịch vụ AI/lip-sync VI: NOT_RUN; có gate kế hoạch riêng.

## 2. Nguồn mới và căn cứ nhận định

### R01 — Three.js

- Repo [mrdoob/three.js](https://github.com/mrdoob/three.js), release [r187](https://github.com/mrdoob/three.js/releases/tag/r187), commit `7e89746a687bb88271253698fa108b1dd59825d0`, phát hành 30/10/2026. SOURCE; runtime **r187 NOT_RUN**.
- [AnimationMixer.js](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/src/animation/AnimationMixer.js): đọc `update`/`setTime`, reset time và tác động timeScale. Không bảo đảm reset mọi simulation ngoài mixer.
- [LoadingManager.js](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/src/loaders/LoadingManager.js): constructor giữ `itemsLoaded/itemsTotal` trong closure, callback onStart/onProgress/onLoad. Căn cứ đối chiếu R02; chưa kiểm monkeypatch/bridge thực tế bằng fixture.
- [SkinnedMesh.js](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/src/objects/SkinnedMesh.js): skeleton, skin attributes, bind/applyBoneTransform; không có bằng chứng authoring/contact/acting tự động từ primitive này.
- [WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/src/renderers/WebGLRenderer.js): đọc các phần alpha/premultipliedAlpha, output color space, transparent sort/clear alpha/context. Không audit toàn bộ 113 KB renderer.
- [Color management](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/manual/pages/color-management.html): texture/input, Linear-sRGB working space, display output và OutputPass; chuyển sang Rec.709 video là phần phải kiểm riêng.
- [License](https://github.com/mrdoob/three.js/blob/7e89746a687bb88271253698fa108b1dd59825d0/LICENSE): MIT. Model/texture/fonts/third-party extensions không tự nhận license này.

### R02 — HyperFrames

- Repo [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes). App/npm baseline **0.9.30**, commit upstream `ad1a5eab29b1a0b9f19305690c5cefab84819cd4`; trial **0.9.33**, commit `e596be16c901639ce6c18032e56924a9d8e1967d`.
- [Release 0.9.33](https://github.com/heygen-com/hyperframes/releases/tag/v0.9.33), published `2026-11-11T07:00:23Z`: sửa clip WAV/header byte-rate và variable duration/loudness là release claims; chưa kích hoạt đúng ca mới trong harness studio.
- [Frame adapter contract](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/docs/concepts/frame-adapters.mdx): experimental v0; random seek, deterministic state, async completion thuộc trách nhiệm adapter/host. Không dùng câu “same frame” trong docs như chứng nhận mọi user scene.
- [Three runtime adapter](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/packages/core/src/runtime/adapters/three.ts): `getLoadingManager`, `discover`, `seek`, `getReadyPromise`; public counters + global THREE là shape mà adapter đọc.
- [Three adapter tests](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/packages/core/src/runtime/adapters/three.test.ts): kiểm forced time/event/clamp/revert; test discover là no-op. File này chưa chứng minh loading bằng native r187 manager. Không suy toàn repository không có test khác.
- [GSAP adapter](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/packages/core/src/runtime/adapters/gsap.ts): đọc phần rerender/same-time authored order; runtime có logic ngoài `timeline.seek()` đơn giản. Chỉ targeted review, không chứng nhận toàn timeline combinations.
- [Path tracing guide](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/docs/guides/path-tracing.mdx): AUTHOR_CLAIM cho M4 timings; chỉ ra seeded setup, frozen clocks, async shader/readiness. Các số M4 không được dùng làm estimate máy thử.
- [Example render.js](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/registry/examples/path-traced-3d/assets/render.js), [scene.js](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/registry/examples/path-traced-3d/assets/scene.js): đọc toàn bộ trước chạy. Setup explicit `buildReady`; `hf-seek`/waitUntil; seeded construction; pure `poseAt(t)`; path accumulation reset; dùng private compile promise, cần gate upgrade.
- [Harness upstream](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/registry/examples/path-traced-3d/source/verify-render.mjs): đọc toàn bộ, chạy nguyên bản, `KEEP_VERIFY_OUTPUT=1`. RUN kết quả ở [verification](toolchain-verification.md). Harness tự tạo bản nhỏ từ example; đây là hành vi sẵn có, không phải harness mới do vòng này viết.
- [Vendored versions/hash](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/registry/examples/path-traced-3d/assets/vendor/README.md): Three **0.180.0**, pathtracer **0.0.24**, BVH **0.9.5**, MIT từng library; bundle SHA `a247cb7f88eff8b1d423a2892e5ca27c7d03d83939fe0ca6fa9a11c7f9f21fc9` đã khớp file tải. Không nói r187 đã qua runtime test này.
- [License repo](https://github.com/heygen-com/hyperframes/blob/e596be16c901639ce6c18032e56924a9d8e1967d/LICENSE): Apache-2.0; package/assets/services có quyền riêng.

### R03 — FFmpeg

- Runtime **7.1.5-0+deb13u1**, Debian build; full configure trong [log](toolchain-evidence/baseline/runtime-ffmpeg.log). Source tag n7.1.5 trỏ commit `3a0867c2bfda4a4d4309ca1a8cbdc6175e67f587`; binary distro có packaging/build riêng, không coi git SHA là hash binary.
- [License theo tag](https://github.com/FFmpeg/FFmpeg/blob/3a0867c2bfda4a4d4309ca1a8cbdc6175e67f587/LICENSE.md): LGPL nền, optional GPL/nonfree/build libraries ảnh hưởng license. Build thử `--enable-gpl`, có libx264/libzimg; không mặc định redistributable theo LGPL thuần.
- Căn cứ RUN: `ffmpeg -h encoder=qtrle`, `-h filter=loudnorm`, `-h filter=zscale` đã kiểm CLI; phép encode/probe/alphaextract/showinfo/loudnorm có exact argv/log. Không dựa docs master cho flags của bản cài.
- [Trang download](https://ffmpeg.org/download.html) và [legal](https://ffmpeg.org/legal.html): fetch trực tiếp timeout; search tìm thấy nhánh mới hơn, chỉ SEARCH_ONLY. Báo cáo không tuyên bố version mới nhất/upgrade compatibility từ trích đoạn đó.
- Intermediate EXR/PNG/ProRes/FFV1 và OTIO handoff trong plan là **đề xuất cần round-trip**, không phải tất cả đã được thử bằng CLI vòng này.

### R04 — Manim Community

- Repo [ManimCommunity/manim](https://github.com/ManimCommunity/manim), [v0.22.1](https://github.com/ManimCommunity/manim/releases/tag/v0.22.1), commit `16ea443e2a5f1d79db0a721161411ce916d6e733`, release 27/10/2026.
- [pyproject](https://github.com/ManimCommunity/manim/blob/16ea443e2a5f1d79db0a721161411ce916d6e733/pyproject.toml): Python ≥3.11, av ≥15, manimpango ≥0.7/<1, pycairo; không lấy dependency từ tutorial CE cũ.
- [Scene](https://github.com/ManimCommunity/manim/blob/16ea443e2a5f1d79db0a721161411ce916d6e733/manim/scene/scene.py): renderer Cairo/OpenGL, random seed, render/play và update_mobjects(dt) sections. [SceneFileWriter](https://github.com/ManimCommunity/manim/blob/16ea443e2a5f1d79db0a721161411ce916d6e733/manim/scene/scene_file_writer.py): render/output/transparent/media assembly sections; chưa audit mọi codec.
- [Ví dụ basic.py](https://github.com/ManimCommunity/manim/blob/16ea443e2a5f1d79db0a721161411ce916d6e733/example_scenes/basic.py): đọc toàn file; SquareToCircle là smoke trial đề xuất không cần TeX. Chưa render bởi cài `manimpango` thất bại.
- [License](https://github.com/ManimCommunity/manim/blob/16ea443e2a5f1d79db0a721161411ce916d6e733/LICENSE): MIT; pyproject còn liệt kê LICENSE.community, phải giữ notices khi phân phối. Không áp license này cho font/asset/TeX distribution.
- [Website chính thức](https://www.manim.community/): DOC_REVIEW cho loại tác vụ toán/giải thích; examples là công bố tác giả, chưa là style benchmark studio.
- RUN chỉ **installation attempt**, log thiếu pangocairo. Render = NOT_RUN/BLOCKED_ENV; không ghi “Manim không chạy Linux” hoặc “không phù hợp hoạt hình” từ lỗi setup.

### R05 — ManimGL

- Repo [3b1b/manim](https://github.com/3b1b/manim), [v1.7.2](https://github.com/3b1b/manim/releases/tag/v1.7.2), commit `f427fc67df75513be0cd3f3329e327a9a19401c3`. Release 13/12/2024; master quan sát `fafa083a4fb274bba9cabde0b6e2f50ba6da0622` có cập nhật 2026. Chọn stable để đọc, không coi ngày release là bằng chứng ngừng phát triển.
- [Requirements](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/requirements.txt), [examples](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/example_scenes.py): đọc dependencies và các scene/updater/camera/tương tác liên quan, không tái chạy.
- [Scene](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/manimlib/scene/scene.py), [writer](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/manimlib/scene/scene_file_writer.py): update frame/mobjects và RGBA→FFmpeg pipe. Không chứng minh arbitrary random seek/alpha codec interoperability.
- [Installation docs](https://3b1b.github.io/manim/getting_started/installation.html): DOC_REVIEW cho FFmpeg/OpenGL/Pango và TeX tùy nhu cầu; trang sống không thay pinned requirements của tag.
- [License](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/LICENSE.md): MIT. Render và tích hợp studio NOT_RUN.

### R06 — PixiJS

[Ticker plugin 8.x](https://pixijs.com/8.x/guides/components/application/ticker-plugin), DOC_REVIEW: automatic loop, shared/custom ticker và start/stop. Suy luận cho studio: muốn frame-driven render phải điều khiển mọi ticker/updater; dừng ticker riêng chưa chứng minh dừng mọi shared/plugin state. Chưa chọn patch version hoặc chạy Pixi benchmark vòng này. License MIT từ hồ sơ Word/Pixi source trước, Spine plugin/runtime có điều kiện khác.

### R07 — Krita

[Animation manual 5.3.0](https://docs.krita.org/en/user_manual/animation.html), DOC_REVIEW: raster frame-by-frame, storyboard/onion skin, sequence export; tài liệu lưu ý RAM và dựng shot ngắn. Suy luận: thích hợp bổ sung drawings/smears/pose khó vào rig pipeline, không thay hệ editorial. Chưa cài/chạy/export style trial. Cần pin release, source rights và kiểm layer/source round-trip ở Q1.

## 3. Nguồn kế thừa và giới hạn

[S01–S18](production-quality-sources.md) và [manifest cũ](production-quality-evidence.json) tiếp tục là căn cứ OpenMontage/Lemo/ClaudeAnimationBase/Blender/Spine/Moho/Harmony/OpenToonz/Qwen/ComfyUI/Wan/LTX/Rhubarb/OTIO/VBench/API. Các commit/file được giữ nguyên. Vòng này đối chiếu nhận định với các bản ghi nguồn đó; không gắn “fresh runtime verified” cho chúng.

Các kết luận giấy phép giữ tách biệt: code/runtime/model weights/fonts/voice/demo/asset. OpenMontage root AGPL không đồng nghĩa tất cả file MIT; Montage AI PolyForm Noncommercial khác OpenMontage; LTX code Apache không đồng nghĩa weights Apache; GSAP/Remotion không đổi thành MIT; demo voice Lemo không tự được dùng lại.

## 4. Nhật ký quyết định nghiên cứu

1. Xác nhận Git snapshot/remote sạch; tạo branch nghiên cứu riêng.
2. Đối chiếu Word/plan/source/test; phát hiện sai mono/stereo trong docs, giữ video/history gốc.
3. Chạy harness HF trong bản sao. Cài 0.9.33 lần đầu lỗi cache home; retry cache ở /tmp thành công, giữ cả log. Không đổi lock app.
4. Chạy CLI FFmpeg alpha/color/loudness; giữ encode thiếu transfer/primaries và cấu hình explicit sau đó.
5. Cài Manim CE venv thất bại do pangocairo; chưa tạo scene mới hoặc cài system development packages. Đưa dependency setup và smoke trial vào backlog.
6. Tìm thấy upstream Three verify harness; đọc source rồi chạy nguyên bản với version/hash khóa, giữ scratch output. Ví dụ này dùng readiness explicit, khác test native manager còn thiếu.
7. Viết report/plan/verification + manifest có nguồn, tách RUN/SOURCE/DOC/PROPOSED. Không chạy model/API trả phí, không tự đóng Q0–Q9.
