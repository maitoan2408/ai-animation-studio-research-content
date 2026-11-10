# Hướng dẫn dùng studio

## Script và chỉnh cảnh

Mỗi đoạn cách bằng dòng trống là một scene. Chỉ dẫn tùy chọn ở đầu đoạn:

```text
[title=Chiếc cốc; action=pick-up; camera=pan; seconds=5; color=#527e88]
Tôi nhấc chiếc cốc lên, và chậm lại một chút.
```

Không có chỉ dẫn, planner chọn action theo từ khóa và ước lượng thời lượng theo số từ. Đây là đề xuất để sửa, chưa là phân tích ngữ nghĩa bằng LLM. Script ≤12.000 ký tự, narration mỗi scene ≤1.200 ký tự.

Action: idle, wave, walk, pick-up, talk. Camera: static, pan. Chỉ dẫn không hỗ trợ bị từ chối. Chỉnh các trường rồi **Lưu phiên bản mới**; version/video cũ vẫn tồn tại. Có sửa chưa lưu thì voice/render báo cần lưu trước.

Nếu tab khác sửa trước, API trả REVISION_CONFLICT. Giữ patch muốn áp dụng, mở lại trang và áp dụng trên revision mới. Không force-overwrite. UI chưa có thêm/xóa/sắp xếp scene sau create; có thể tạo project mới từ script đã sửa hoặc dùng API revision gửi spec đầy đủ.

## Audio

Tạo giọng nháp sinh VI/EN bằng eSpeak, tạo revision mới. Nút này **thay audio của các scene có narration**, kể cả WAV đang gắn; revision trước giữ audio cũ. Voice dùng kiểm timing; người dùng cần nghe duyệt chất lượng.

Thay WAV nhận RIFF WAV ≤24 MB, chuẩn hóa mono PCM 48 kHz, mỗi audio ≤120 giây. Scene tự dài thêm nếu cần; project vẫn ≤240 giây. Không cắt thoại cho vừa scene.

Voice tự sinh gắn hash narration. Đổi text phải bỏ audio, lưu rồi tạo lại voice; validator chặn text mới/voice cũ. WAV upload không được coi là có transcript đã xác thực.

## Render và review

Preview 640×360, final 1920×1080; 24 fps, H.264 MP4. Job giữ revision lúc submit; sửa project không đổi job đang chạy. Hủy queued/running; chỉ failed/cancelled/interrupted được retry.

Chọn video đã QC; video cũ ghi rõ revision cũ. Review gắn artifact hash, revision và frame đang xem, đánh số từ 0. Approval không chuyển sang revision mới.

QC kiểm metadata, full decode và hash, chưa chấm kể chuyện, contact, diễn xuất, phát âm hoặc loudness master. Người duyệt nghe/xem hết video, cả cut giữa scene.

## Export/import

Export chứa current spec và audio bytes/hash. Import tạo project mới, không mang review/artifacts cũ. Gói không chứa đường dẫn tuyệt đối, credential hay dependency cache. Muốn giữ toàn bộ lịch sử cần backup data directory.
