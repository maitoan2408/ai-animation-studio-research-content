# Hợp đồng Skills của Studio

Skills là các nhiệm vụ có input/output và điều kiện kiểm tra. Chúng dùng cùng API/domain với giao diện và CLI; hướng dẫn prose không được tự ghi nhận một test đã pass.

| Skill | Input | Output | Điểm chặn |
| --- | --- | --- | --- |
| script-to-scenes | Kịch bản, style, profile | Phân cảnh nháp + cảnh báo suy luận | Schema, action/camera hỗ trợ, giới hạn số cảnh |
| revise-scene | Project ID, expected revision, patch trong phạm vi | Revision mới | Conflict, schema, audio/narration khớp |
| prepare-audio | Revision, lời dẫn hoặc WAV | Asset hash + duration + binding | Decode, giới hạn kích thước/độ dài, không cắt voice âm thầm |
| render-review | Revision đã validate, profile | Job/attempt và artifact đã QC | Strict asset-ready, cancel, decode QC |
| review-artifact | Artifact/revision, reviewer, decision, notes | Review record bất biến | Hash và revision khớp; không duyệt file chưa QC |
| export-project | Project/revision | Gói JSON kèm asset và hashes | Không secret/path máy, kiểm hash khi import |

Chi tiết mỗi skill trong `skills/*/SKILL.md`. Agent chỉ đề xuất bản nháp; người dùng giữ quyền duyệt chất lượng. Mọi call có phí cần provider được cấu hình rõ và usage được theo dõi.

## Workflow nghiên cứu production đang thực hiện

Các mục sau thuộc `production/`, chưa phải capability của API/UI v0.1:

| Nhiệm vụ | Input → output | Gate và tái tạo |
| --- | --- | --- |
| benchmark-six-shots | Brief/packs/cues khóa → native A/B media và source | Readiness/contact/seek/decode + review; `production/src/render/README.md`, `src/blender/README.md` |
| benchmark-edit-rounds | R0 + notes R1/R2 → selective takes, before/after SHA và sequence | Không đổi clip ngoài scope; `production/src/editorial/README.md` |
| benchmark-audio-qc | Verified PCM timeline → delivery gain, loudness/TP và sync reports | Nghe duyệt riêng; `production/src/audio/README.md` |
| benchmark-review-workbench | Catalog media/hash → note theo shot/frame, journal và export | `production/src/review/README.md`; input/range/hash/conflict/restart + actual browser checks; không tự đóng gate |
| benchmark-media-contract | Native PNG/alpha/master → profile/color/packet checks và web derivative riêng | `production/src/media/README.md`; giữ failures/ngưỡng; v1 FAIL, v2 chart max1 PASS, ba bản1152YUV/AAC exact; không là full art approval |
| resume-production | Git/state/evidence → đúng bước chưa xong, giữ attempts cũ | `docs/execution/RESUME.md`, `production/evidence/Q2/gate.json` |

Ủy quyền hiện hành cho phép agent triển khai và quyết định thường lệ. Mọi review
phải ghi đúng `delegated-agent`; không giả người dùng hoặc operator độc lập.
