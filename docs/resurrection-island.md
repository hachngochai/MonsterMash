# Đảo Phục Sinh · màn 201–250

Đợt mở rộng 4.4.0 giữ nguyên dữ liệu màn 1–200, tạo hình người giữ đèn và các boss cũ. Năm miền đất mới được vẽ trực tiếp bằng Canvas: Mỏ Đá Cổ Đại, Khu Rừng Đã Chết, Vách Đá Người Chim, Thánh Địa Mana và Miệng Núi Lửa Thần Thánh. Đảo có trang bản đồ Three.js riêng, 45 dấu màn thường, năm dấu X/O và đường nối từ Kraken 200 qua bờ đảo 201 tới boss 210.

Đây là thế giới chiến đấu giả tưởng lấy cảm hứng từ Rapa Nui. Các biểu tượng trên gỗ và đá là hình vẽ hư cấu, không phải bản dịch Rongorongo hoặc tái dựng nghi lễ lịch sử.

## Cách thử

- `tests/island-preview.html`: chọn một trong năm miền và năm boss; đổi đủ vũ khí, gọi Tiểu Moai, thử bảy dạng Trứng Phục Sinh. Mặc định giữ HP để quan sát chiêu. Bỏ chọn tùy chọn này để thử sát thương và Phán Xét thật. Phòng thử không ghi tiến độ.
- `?test=all`: mở đủ 250 màn và toàn bộ phần thưởng, tách khỏi tiến độ bản chính.
- `tests/chapter-preview.html#island`: đoạn rời bờ vào đảo; `#islandVictory`: đoạn kết Makemake.
- Bản chính chỉ cấp thưởng sau khi boss tương ứng bị hạ. Tiến độ và phần thưởng lưu vĩnh viễn trên trình duyệt hiện tại, không cấp trùng khi đánh lại. Save đã hoàn thành boss 200 được bổ sung Tiểu Ngư Nhân khi tải lại.

PC giữ cách chơi cũ: ←/→ đi, ↑ nhảy, A/D bắn, Space khiên, F đổi nhanh/giữ chọn vũ khí, W/S chọn tầm bắn. R dùng Ngư Nhân ở 151–200 và gọi Tiểu Moai ở 201–250. E kích hoạt phong ấn. Phím có thể đổi trong Cài đặt. Điện thoại dùng nút hoặc vuốt; kỹ năng và phong ấn có nút cảm ứng riêng.

## Boss và phần thưởng

| Màn | Boss | Cách chiến đấu | Phần thưởng |
| --- | --- | --- | --- |
| 210 | Tộc Trưởng Hóa Đá | Đến gần để đánh thức; nhảy qua địa chấn, né đường laze; dụ lao vào vách để phá giáp trong 8 giây | Tiểu Moai đồng hành |
| 220 | Chúa Tể Vùng Đất Chết | Né lao; xử lý chuột triệu hồi; đọc dấu đất trước lúc phục kích | Giới hạn khiên 5 |
| 230 | Người Chim Tối Cao | Né điểm bổ nhào; tiếng thét chỉ gây Fear/tầm nhìn; phân biệt trứng độc và bom | Trứng Phục Sinh |
| 240 | Phù Thủy Mana | Phù văn cá làm chậm, chim làm yếu giáp; dịch chuyển hợp lệ; phép/điện vượt khiên vật lý | Sách Ảo Mộng |
| 250 | Makemake | Né vùng dung nham, đá và vuốt; ở 50% HP kích hoạt hai bệ khác nhau bằng E trong 8 giây, rồi đứng trong vùng sáng | Đoạn kết, không thêm kỹ năng |

Phán Xét chỉ dùng một lần. Khiên cá nhân, giáp Ngư Nhân và các dạng miễn sát thương không thay thế hai phong ấn. Gây đủ sát thương trong lúc tụ lực vẫn phải hoàn thành thử thách. Boss đào đất không có hitbox tấn công vô hình. Triệu hồi và đòn đang tồn tại được dọn khi kết thúc hoặc thử lại.

## Các chỉ số chơi thử đã được duyệt

Các giá trị dưới đây được tách trong `js/island-config.js`, đánh dấu `provisional:true`. Giá trị người dùng đã quy định được giữ riêng cùng cấu hình, không tự tăng theo số lần chơi.

| Thành phần | Giá trị |
| --- | --- |
| Boss 210 / 220 / 230 / 240 / 250 | 120 / 140 / 150 / 160 / 220 HP tại Cân bằng |
| Quái thường | 3–6 HP; đòn thường 1, đòn mạnh báo trước 2 HP |
| Patrick | Sáu kết quả đồng xác suất; tàng hình đúng 5s; lấy nửa đạn cho phép số lẻ; cỏ đúng 5 vật bắn; tối đa 2 Thỏ Khổng Lồ |
| Moai phòng thủ | Mọc theo chu kỳ 10s khi thuộc danh sách vùng; tối đa 2 tượng phụ, tồn tại 18s; có HP riêng, không gây HP damage, không mọc đè người chơi |
| Chai của Gã Say | Bán kính 2 bước; 1 bước = 40 px |
| Khiên vật lý Mana | Tối đa 5 lần chặn hoặc 4s; không chặn phép/điện |
| Giáp Tiểu Ngư Nhân | Chặn HP chiến đấu 3s mỗi 10s đang chơi, không tốn khiên; vẫn tuân thủ quy tắc riêng màn 70 |
| Tiểu Moai R | 12 HP, 2 sát thương mỗi giây, tối đa 1, hồi gọi 10s; không tự hết hạn khi còn HP |
| Bản sao Ảo Mộng | 10 HP, tối đa 20s, hồi 10s, tối đa 1; vũ khí đã mở ngẫu nhiên, không chọn lại sách/trứng, không dùng đạn người chơi |

## Bảy dạng Trứng Phục Sinh

Chọn đều một trong bảy dạng khi dùng trứng, giữ 20 giây, không tốn đạn. Đổi vũ khí tạm ngưng quyền của dạng, đồng hồ vẫn chạy; không lưu dạng/cooldown vào save. Hắc Hóa chỉ tăng đúng một đơn vị tấn công, không nhân đôi cả loạt.

| Dạng | Sát thương và phạm vi | Nhịp chơi thử |
| --- | --- | --- |
| Găng Tay Phước Lành | Chưởng 3, tầm nửa sân | 0,7s |
| Súng Bắn Trứng | Nổ 5, bán kính 5 bước | 1,2s |
| Cỏ Ba Lá | 5 phi tiêu, mỗi chiếc 1 | 0,75s |
| Ngọn Lửa Phục Sinh | Hào quang 1/s trong 5 bước; cầu lửa 8 | Cầu lửa 1,2s |
| Gậy Tộc Trưởng | Mưa sao băng trong nửa sân, kéo dài 4s; mỗi thiên thạch 3 | Hồi 4s, rơi mỗi 0,45s |
| Đá Moai | Đấm gần 10; vết nứt 5 và choáng quái thường 0,5s; miễn HP chiến đấu, tốc độ 28% | 1s |
| Ánh Sáng Phục Sinh | Một lần nhấn hướng lướt cả sân; 999 lên quái thường, 9 lên boss, mỗi mục tiêu một lần/lượt; miễn HP chiến đấu | Lướt 0,32s, không chồng lượt |

Đòn xa vẫn chịu cơ chế giáp/miễn nhiễm của boss. Tầm cao có thể chọn bằng W/nút cảm ứng; cận chiến kiểm tra cả khoảng ngang và độ cao. Giới hạn khiên 5 áp dụng cho nhận khiên từ quái, mốc bắn boss, KingKong, Kỵ Sĩ Rồng và Chimera.

## Tổ chức mã

- `island-config.js`: chỉ số, nhóm quái và cấu hình phần thưởng.
- `island-combat.js`: trạng thái quái/boss, đường báo, vật bắn, debuff, giới hạn triệu hồi và phong ấn.
- `resurrection-rewards.js`: hộ vệ, đồng minh, bảy dạng vũ khí và vòng đời tạm thời.
- `island-renderer.js`: nền, mô hình và hiệu ứng Canvas; các tấm nền được cache.
- `story.js`, `atlas-terrain.js`, `atlas-3d.js`: trang đảo và tuyến khám phá.
- `tutorial.js`: thêm hướng dẫn độc lập tại 201, 211, 221, 231, 241.
- `chapter-transition.js`: nối cảnh 200 → 201 và kết thúc 250, đóng băng chiến đấu/oxy, cho phép bỏ qua/giảm chuyển động.

Các bài kiểm tra mới tập trung vào điều kiện mở thưởng, sát thương thật, giới hạn phạm vi, không chồng đòn, trạng thái bảo vệ, dọn đối tượng và tính liên tục của hành trình. So sánh dữ liệu toàn bộ 1–200 với fixture không nạp IslandConfig bảo vệ phần chiến dịch cũ.
