# Kiến trúc vòng đầu

`domain` định nghĩa schema, timebase và lỗi. `planner` chuyển kịch bản thành draft. `store` giữ asset/revision/job/artifact/review. `render` sinh HTML từ dữ liệu đã validate, gọi HyperFrames và QC. `server` cung cấp HTTP; `web` là client; `cli` dùng lại application service.

Không có phụ thuộc ngược từ domain vào HTTP/browser. Dữ liệu người dùng được escape khi sinh HTML; không nhận code tùy ý. Asset là bytes local có hash. Browser executable, FFmpeg và voice engine được kiểm bởi doctor.

Một Project có nhiều Revision bất biến. Một RenderJob chỉ vào một revision/profile, có nhiều attempt; chỉ một worker chạy. Artifact chỉ được công bố sau QC. Review chỉ đúng cho artifact/revision cụ thể; sửa project tạo revision mới và không kế thừa approval.

Cache vòng đầu ở cấp toàn project: key gồm nội dung render, asset hashes, profile, phiên bản compiler/backend. Cache hit phải kiểm file/hash. Cache theo shot là bước tiếp theo sau pilot; chưa hứa locality tối ưu khi sửa thoại.

Khi khởi động lại, job từng running được đánh dấu interrupted, không coi file tạm là output. Retry tạo attempt mới. Cancel truyền AbortSignal xuống renderer. Export/import dùng JSON và asset bytes đã hash; không giải nén đường dẫn do người dùng cung cấp.
