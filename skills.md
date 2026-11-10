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
