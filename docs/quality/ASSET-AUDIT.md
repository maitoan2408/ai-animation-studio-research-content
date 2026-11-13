# U1 — art và reference

Baseline117SVG gồm64source giữ nguyên và53derived polish; source/path/SHA/pivot
được kiểm bởi suite art. Ba viewfront/quarter/profile; bốn moodneutral/worried/
happy/blink; mouthrest/M/A/E/O/F/smile. Đây chưa phải8viseme ngôn ngữ được align
và6expression diễn xuất mới. Không đếm mirrored view hoặc shadow thành art mới.

| Hướng | Giá trị cho phim này | Quyết định hiện tại |
|---|---|---|
| Vector do artist vẽ + rig | Silhouette, tay, biểu cảm kiểm soát tốt; cần artist và vòng pose review | Hướng final ưu tiên; chưa có delivery/source artist |
| Model tạo ảnh rồi cutout | Có thể có texture/lighting đẹp nhanh; consistency và phân lớp/alpha cần cleanup | Chưa gọi API/model có phí; chưa có nguồn/điều kiện sử dụng được chọn |
| Blender layered paper | Bóng/độ dày giấy, ánh sáng cùng scene, native editable | Hướng renderer có sẵn; VSE hiện tại không có đèn3D/cloth, không quảng bá như Eevee |

Spike hiện tại dùng development art cũ để tách tác động vật lý. S05frame120
đã kiểm hình render thực: đèn nghiêng theo quai tay người nhận, tay người cho
đang rút và shadow bám theo sprite. Đây là nhận xét mẫu ảnh, không full-motion
rubric hoặc bằng chứng asset đã đạt final art.

Reference cần chuẩn bị cho U4: một người offer/receive vật có trọng lượng, một
clip walk/stop, một reaction, một pickup/place, một reach/recover. Có văn bản
quyền sử dụng/consent, ghi camera/fps/độ dài, không lấy clip search làm dataset
mặc định. Từ đó mới đo confidence/occlusion và retarget cleanup; không cài
pose model để chạy một fixture không đại diện nhằm đánh dấu phase DONE.

Các bước U1 chưa đóng: sourcefinal được chọn, styleframe/pose extremes, đủ
viseme/expression, review1×/0.5× theo rubric. Không tự điền điểm4.2.
