# F3 — số đo độ mượt, chưa khóa ngưỡng

[Nghiên cứu về độ nhạy của thước đo smoothness](https://pmc.ncbi.nlm.nih.gov/articles/PMC3470860/) cho thấy jerk có đơn vị phụ thuộc biên độ và thời lượng, còn thước đo jerk không thứ nguyên có thể so hình dạng chuyển động sau chuẩn hóa. [Tổng quan phân tích smoothness](https://pmc.ncbi.nlm.nih.gov/articles/PMC4674971/) nhấn mạnh lựa chọn chỉ số phụ thuộc cấu trúc tín hiệu và điều kiện đo.

Suy luận áp dụng: giá trị jerk cực đại của head trong diagnostic F3 là mô tả một trace 24 fps, không thể tự chuyển thành điểm diễn xuất hay ngưỡng chung cho mọi shot. Trước khi đặt gate cần chọn đoạn chuyển động, đơn vị, xử lý điểm dừng/biên và cách lấy mẫu; chuẩn hóa và kiểm fixture có hình dạng/biên độ/thời lượng khác nhau, sau đó hiệu chỉnh theo reference và review. Chưa có corpus/gate khóa trước nên hiện không đặt ngưỡng số hoặc chấm PASS.
