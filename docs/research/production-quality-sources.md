# Sổ nguồn nghiên cứu chất lượng production

Ngày truy cập: **11/11/2026**. [Phân tích](../../reports/Nghien_cuu_chat_luong_production.md) · [Kế hoạch](../production-quality-plan.md) · [Manifest file và commit](production-quality-evidence.json).

## Cách đọc bằng chứng

- **SOURCE_REVIEW:** đã lấy source ở commit cố định và đọc các phần liên quan. Không phải audit toàn repo hoặc kết quả chạy phần mềm.
- **DOC_REVIEW:** đã đọc trang tài liệu chính thức; tính năng/giới hạn do nhà cung cấp công bố, chưa đo tại studio.
- **SEARCH_ONLY:** chỉ có trích đoạn tìm kiếm từ nguồn chính thức; mở trang trực tiếp không thành công. Không dùng để xác nhận compatibility hoặc lựa chọn production cuối.
- **STILL_ONLY:** đã xem ảnh tĩnh. Không suy ra motion, frame pacing hoặc khả năng tái tạo video từ ảnh.
- Tất cả thử nghiệm runtime/model/DCC mới: **NOT_RUN**. Không có bảng xếp hạng chất lượng thực đo trong đợt này.

Nguồn ngoài được đọc như dữ liệu nghiên cứu; không chạy setup/agent instructions trong repo. Không copy source, demo hay voice bên thứ ba vào sản phẩm ở vòng này. Poster đã xem nằm trong `/tmp` của phiên nghiên cứu, không phải asset bàn giao của studio.

## S01 — OpenMontage

- Repo: https://github.com/OpenMontageInc/OpenMontage
- Snapshot: `fecb9a1e3cc23ef84de30b272059457a427f16f8` (09/11/2026). SOURCE_REVIEW.
- [Character tools](https://github.com/OpenMontageInc/OpenMontage/blob/fecb9a1e3cc23ef84de30b272059457a427f16f8/tools/character/character_animation.py): `SvgRigBuilder`, `PoseLibraryBuilder`, `CharacterRigRenderer`, `CharacterAnimationReviewer`. Căn cứ đánh giá rig/pose mẫu và giới hạn của `motion_detected`.
- [Pipeline](https://github.com/OpenMontageInc/OpenMontage/blob/fecb9a1e3cc23ef84de30b272059457a427f16f8/pipeline_defs/character-animation.yaml): công đoạn/artifact/gate được khai báo. Chưa chạy các gate.
- [License](https://github.com/OpenMontageInc/OpenMontage/blob/fecb9a1e3cc23ef84de30b272059457a427f16f8/LICENSE): AGPL-3.0 ở root. Hai skill character đã đọc khai MIT riêng; cần kiểm phạm vi từng file khi tái sử dụng. Không tự kết luận AGPL bị cấm cho nội bộ, cũng không coi gọi service riêng đương nhiên giải quyết mọi nghĩa vụ.
- README dùng để nhận diện workflow/demo/backend; số pipeline, chi phí demo và chất lượng là công bố của tác giả, chưa tái đo.

## S02 — Lemo-Opuscar

- Repo/gallery: https://github.com/lemomo-ai/lemo-opuscar · https://lemomo-ai.github.io/lemo-opuscar/
- Snapshot: `9eb7739a0fca4c6990fe966cb8b87b1930f7193a` (10/11/2026). SOURCE_REVIEW; hai poster STILL_ONLY.
- [Paper-popup actors](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/styles/paper-popup/demo/actors.js): Canvas textures, front/back planes, alpha depth material, quantized pose refresh.
- [Puppet rig/IK](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/styles/shadow-puppet/demo/houyi.js): solver hai đoạn và transform nhân vật cụ thể.
- [Core contract](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/core/README.md), [page loader](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/core/render/page.mjs): readiness/render(t), tool review; một số request ảnh/font/fetch thiếu chỉ cảnh báo.
- [License root](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/LICENSE), [README phần Licence](https://github.com/lemomo-ai/lemo-opuscar/blob/9eb7739a0fca4c6990fe966cb8b87b1930f7193a/README.md#licence): code/docs MIT; demo/still CC BY 4.0; sáu narration track bị loại khỏi CC BY; assets giữ license riêng. Không lấy voice mẫu làm voice production mặc định.

## S03 — ClaudeAnimationBase

- Repo: https://github.com/JohnHeibel/ClaudeAnimationBase
- Snapshot: `0ac8bf2b31942376cb6b8c4074715595d512acd2` (24/09/2026). SOURCE_REVIEW.
- [core.js](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/src/core.js): `jump`, `take`, `stroll`, `onTwos`, springs và camera.
- [clawd.js](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/src/clawd.js), [guide](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/ANIMATION_GUIDE.md): nhân vật/expressions và quy trình review frame.
- [LICENSE](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/LICENSE): MIT cho phần mềm; dependency/nhân vật/asset có phạm vi quyền riêng cần kiểm nếu dùng.

## S04 — Montage AI (mfahsold), tách khỏi OpenMontage

- Repo: https://github.com/mfahsold/montage-ai
- Snapshot: `2e9dc03bfd0c320cf30f2762791bcccfd1d12b06` (09/03/2026). Đã đọc README và license, chưa audit engine dựng.
- [README](https://github.com/mfahsold/montage-ai/blob/2e9dc03bfd0c320cf30f2762791bcccfd1d12b06/README.md): rough cut từ footage, beat/edit/audio và timeline interchange.
- [LICENSE](https://github.com/mfahsold/montage-ai/blob/2e9dc03bfd0c320cf30f2762791bcccfd1d12b06/LICENSE): PolyForm Noncommercial 1.0.0. Việc dùng “nội bộ” không tự chứng minh là noncommercial. Tạm loại khỏi đường tích hợp thương mại nếu chưa có quyền khác.

## S05 — Blender / Grease Pencil / 2.5D

- Source chính thức: https://github.com/blender/blender
- Snapshot đọc source: `ca56249b6affcc1b79dcde5a7a7feaf6dd630e32` (10/11/2026). SOURCE_REVIEW giới hạn ở hai file; đây là main, không phải release được chọn cho studio.
- [Armature modifier](https://github.com/blender/blender/blob/ca56249b6affcc1b79dcde5a7a7feaf6dd630e32/source/blender/modifiers/intern/MOD_grease_pencil_armature.cc): deform Grease Pencil theo armature; header GPL-2.0-or-later.
- [CLI](https://github.com/blender/blender/blob/ca56249b6affcc1b79dcde5a7a7feaf6dd630e32/source/creator/creator_args.cc): background, Python và exit code cho exception.
- Manual [Armature 4.5](https://docs.blender.org/manual/en/4.5/grease_pencil/modifiers/deform/armature.html), [CLI 5.0](https://docs.blender.org/manual/en/5.0/advanced/command_line/arguments.html): có trích đoạn tìm kiếm, mở trực tiếp trả lỗi fetch 402 trong công cụ nghiên cứu. Không diễn giải mã 402 này thành giá/giấy phép của Blender.
- [Sprite Fright style guide](https://studio.blender.org/blog/sprite-fright-style-guide/): SEARCH_ONLY; ví dụ công bố về pha on twos/ones. Không dùng làm bằng chứng đã xem phim hoặc thử phong cách đó.
- Cần khóa release, addon, render engine, color config và asset licenses ở Q1; GPL của phần mềm không tự là license của mọi asset/phim.

## S06 — Spine Professional / Pixi

- [Official Pixi runtimes](https://us.esotericsoftware.com/spine-pixi): DOC_REVIEW; version editor/runtime phải khớp major/minor, có giới hạn theo renderer.
- [Physics constraints](https://en.esotericsoftware.com/spine-physics-constraints): DOC_REVIEW; physics không có trong Essential, deterministic editor khác runtime, cần quản lý reset/step khi seek.
- [CLI](https://en.esotericsoftware.com/spine-command-line-interface): DOC_REVIEW; export ảnh/video cần windowing/OpenGL.
- [Runtime license](https://esotericsoftware.com/spine-runtimes-license): DOC_REVIEW; dẫn sang Editor License section 2 và điều kiện khác. Source available không đồng nghĩa MIT; cần khớp license đội/phân phối trước tích hợp. Chưa mua license hoặc thử export.

## S07 — Moho Pro

- [Features chính thức](https://moho.lostmarble.com/en-jp/pages/features): DOC_REVIEW.
- Dùng làm căn cứ về Smart Bones, Vitruvian Bones, FK/IK, layer import, multiplane camera và scripting. Nhà cung cấp liệt kê macOS/Windows và license thương mại; chưa thử export, round-trip hoặc Linux automation.
- Không dùng lời quảng cáo “rig trong vài phút” để ước tính công làm rig của studio. Giá/edition phải kiểm tại thời điểm mua; vòng này không mua.

## S08 — Toon Boom Harmony

- [Deformation documentation](https://docs.toonboom.com/help/harmony-25/premium/getting-started/deformation.html), [IK](https://docs.toonboom.com/help/harmony-20/premium/cut-out-animation/about-inverse-kinematic.html): nguồn chính thức được tìm thấy; trang deformation mở trực tiếp lỗi 404. **SEARCH_ONLY**, chưa đọc/kiểm toàn bộ tài liệu version hiện hành.
- Chỉ giữ trong shortlist authoring khi đội đã sử dụng; chưa kết luận headless/export/runtime compatibility hay chi phí edition.

## S09 — OpenToonz

- [Trang chính thức](https://opentoonz.github.io/e/): DOC_REVIEW; source New BSD, dùng thương mại/noncommercial theo trang giới thiệu; cần kiểm license installer/plugins cụ thể khi cài.
- Căn cứ vai trò paint/Xsheet/composite và raster/vector; không suy ra tự động làm mọi animation từ kịch bản. Manual cutout mở không thành công; chưa thử plastic/rig/export.

## S10 — Qwen-Image-Layered

- Repo: https://github.com/QwenLM/Qwen-Image-Layered
- Snapshot: `54c4fe47e76d745775e03fc66ee38457280ed9ea` (31/12/2025). SOURCE_REVIEW.
- [README](https://github.com/QwenLM/Qwen-Image-Layered/blob/54c4fe47e76d745775e03fc66ee38457280ed9ea/README.md): image-to-multiple-RGBA; tác giả nêu text-to-layer generation hạn chế.
- [app.py](https://github.com/QwenLM/Qwen-Image-Layered/blob/54c4fe47e76d745775e03fc66ee38457280ed9ea/src/app.py): tạo pixel layers trong PSD.
- [LICENSE](https://github.com/QwenLM/Qwen-Image-Layered/blob/54c4fe47e76d745775e03fc66ee38457280ed9ea/LICENSE): Apache-2.0. Cần kiểm checkpoint/dependencies/ảnh nguồn thực tế; không áp dụng license này cho mọi Qwen model. Chưa inference/đo tính toàn vẹn vùng khuất.

## S11 — ComfyUI

- Repo: https://github.com/Comfy-Org/ComfyUI
- Snapshot: `4d64a8bc072b81c9b47321789b4d83fb7348ae2a` (11/11/2026). Đã đọc README và LICENSE; chưa audit executor/custom nodes.
- [README](https://github.com/Comfy-Org/ComfyUI/blob/4d64a8bc072b81c9b47321789b4d83fb7348ae2a/README.md): graph workflow, API, queue/cache/offload là khả năng công bố.
- [LICENSE](https://github.com/Comfy-Org/ComfyUI/blob/4d64a8bc072b81c9b47321789b4d83fb7348ae2a/LICENSE): GPL-3.0; node/model có license riêng. Workflow JSON + seed chưa đủ tái tạo nếu không pin nodes/checkpoints/device và lưu output đã duyệt. Không suy ra mọi model chạy tốt trên VRAM thấp từ quảng cáo offload.

## S12 — Wan2.2 / Wan-Animate

- Snapshot: `1ea34ff48f87168174e12956e200b1d908b1c5ff` (21/09/2026).
- [README](https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/README.md): đọc các mục TI2V/14B/Animate; 24 GB gắn lệnh 5B, 80 GB gắn các lệnh 14B được liệt kê, không phải benchmark của ta.
- [LICENSE](https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/LICENSE.txt): Apache-2.0; README công bố models theo Apache-2.0. Kiểm riêng checkpoint, preprocessor và reference media khi thực hiện.
- Chưa đo identity/contact/motion hoặc peak VRAM; không đánh giá đẹp hơn backend deterministic từ README.

## S13 — LTX

- Snapshot: `4f521619ae0029e8fbb64d555030c2b121a33b4f` (04/11/2026).
- [README](https://github.com/Lightricks/LTX-2/blob/4f521619ae0029e8fbb64d555030c2b121a33b4f/README.md): snapshot đề cập LTX-2.5/2.3, distilled/DFR/control/retake; đây là tính năng và chất lượng do nhà cung cấp mô tả. Chưa thử pipelines.
- [Code license](https://github.com/Lightricks/LTX-2/blob/4f521619ae0029e8fbb64d555030c2b121a33b4f/LICENSE): Apache-2.0. [Model 2.x license](https://github.com/Lightricks/LTX-2/blob/4f521619ae0029e8fbb64d555030c2b121a33b4f/LICENSE-2_x): Community License, có điều kiện doanh thu từ 10 triệu USD và điều kiện sử dụng khác. Chưa xác định doanh nghiệp thuộc trường hợp nào.
- LTX-2.3 dùng license khác theo README; text encoder/LoRA/upscaler cũng cần manifest riêng. Không ghi chung “LTX hoàn toàn Apache” hoặc mua máy theo cấu hình của một pipeline khác.

## S14 — Rhubarb Lip Sync

- Snapshot: `9b9573cd21b253c9ba58739bbd1aa0b50b991bff` (03/04/2025).
- [README.adoc](https://github.com/DanielSWolf/rhubarb-lip-sync/blob/9b9573cd21b253c9ba58739bbd1aa0b50b991bff/README.adoc): PocketSphinx cho English; phonetic cho ngôn ngữ khác với độ chính xác có giới hạn; transcript có thể hỗ trợ.
- [LICENSE.md](https://github.com/DanielSWolf/rhubarb-lip-sync/blob/9b9573cd21b253c9ba58739bbd1aa0b50b991bff/LICENSE.md): MIT và notices dependencies. Chưa có thử tiếng Việt; cue chỉ là đầu vào cho animator/viseme mapping.

## S15 — OpenTimelineIO

- [Tài liệu chính thức](https://opentimelineio.readthedocs.io/en/latest/index.html): DOC_REVIEW.
- Căn cứ về editorial interchange và media references ngoài timeline. Chưa audit adapter/version/license cho một NLE cụ thể; phải thử round-trip trước cam kết bàn giao giữ mọi effect.

## S16 — VBench

- Snapshot: `fd18b3d055cb0fc6f066ca90fe2c3c8cbb698490`.
- [README](https://github.com/Vchitect/VBench/blob/fd18b3d055cb0fc6f066ca90fe2c3c8cbb698490/README.md): chiều đo và các hạn chế custom input.
- [motion_smoothness.py](https://github.com/Vchitect/VBench/blob/fd18b3d055cb0fc6f066ca90fe2c3c8cbb698490/vbench/motion_smoothness.py): đọc cơ chế lấy frame xen kẽ, nội suy và so sai khác. Cảnh báo độ phù hợp với on-twos là suy luận kỹ thuật, chưa phải benchmark đối chiếu của studio.
- Chưa chạy hoặc audit license toàn bộ pretrained evaluators/dependencies; chỉ tham khảo phương pháp, không tích hợp tại vòng này.

## S17 — Google video API

- [Trang đã mở, redirect từ Gemini API docs](https://aistudio.google.com/docs/video): DOC_REVIEW ngày 11/11/2026.
- Trang thông báo Veo 3.1 Preview trong Gemini API dừng 22/10/2026 và chỉ đường model/endpoint khác. Chỉ áp dụng thông báo cho endpoint được nêu; không suy ra mọi Veo trên mọi nền tảng đã dừng.
- Tính năng reference/edit/audio là công bố dịch vụ; chưa gọi API, chưa đo chất lượng, giá/terms/region phải chốt khi Q2 chạy nhánh paid.

## S18 — Runway / các model API

- [Model catalog](https://docs.dev.runwayml.com/guides/models/), [API reference](https://docs.dev.runwayml.com/api/), [input requirements](https://docs.dev.runwayml.com/assets/inputs/).
- Đã mở catalog; API/input được tìm kiếm để xác định nhóm tính năng, không xác nhận mọi tổ hợp tham số cho mọi model. Không coi mọi giới hạn reference/frame giống nhau giữa Gen-4.5, Kling, Veo và các model khác.
- Là ứng viên đối chứng có phí. Cần pin model ID/API/version/parameters, lưu output và usage; chưa có gọi API hoặc chất lượng thực đo.

## Giới hạn và cập nhật nghiên cứu

Không có số sao, xếp hạng marketing hoặc giá một clip demo được dùng làm tiêu chí chất lượng production. Repo có source không đồng nghĩa được phép dùng thương mại không điều kiện. Giấy phép ở trên là dữ liệu đã đọc phục vụ chọn phương án, chưa phải kết luận cho mọi mô hình triển khai/phân phối.

Khi Q1/Q2 bắt đầu, kiểm lại branch/release/model/terms và ghi snapshot mới. Giữ nguyên manifest đợt này để biết kết luận đã dựa vào nguồn nào. Nếu người dùng xác nhận “Montage” hoặc “lemon opusc” là repo khác, thêm source và đánh giá chênh lệch; không xóa kết quả đã khảo sát.
