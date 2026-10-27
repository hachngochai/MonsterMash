# Thiên Hà — cơ chế và cấu hình chơi thử

Bản 5.0.0 mở chiến dịch đến màn 350. Hai phần VI/VII được hợp nhất thành một chương **Thiên Hà**, 251–350. Nguồn: [đặc tả gốc](cosmic-expedition-spec.md). Năm chương cũ giữ bố cục bản đồ và tạo hình.

## Dữ liệu và module

| File | Trách nhiệm |
| --- | --- |
| js/cosmic-config.js | Danh mục bất biến: 100 mô tả màn, 50 quái, 10 boss, 10 Tinh túy, 10 chuyến UFO. authored chứa số quy định rõ; pending giữ lịch sử trường từng để trống, không dùng null làm số chiến đấu. |
| js/cosmic-balance.js | Cấu hình tạm đã được người thiết kế cho phép ngày 27/10/2026: HP, tốc độ, quota, nhịp sinh, trọng lực và thông số bổ sung. |
| js/campaign.js | Ghép 100 màn đã cấu hình vào 250 màn cũ; đăng ký riêng 50 quái và 10 boss. |
| js/cosmic-combat.js | AI, đạn/vùng nguy hiểm có báo trước, phản xạ, phân mảnh và đòn đặc biệt. |
| js/cosmic-rewards.js | Đồng hồ riêng của Tinh túy, đạn trả một lần khi kích hoạt, giáp ảo và phản lực. Sát thương đi qua cổng miễn nhiễm/chuyển pha đang có. |
| js/cosmic-art.js, cosmic-scenery.js, cosmic-renderer.js, cosmic-essence-fx.js | Tạo hình, nền, biến dạng bề mặt và hiệu ứng; phần vẽ không quyết định sát thương. |
| js/cosmic-planets.js, cosmic-ui.js, story.js | Bản đồ Thiên Hà, 10 mốc thiên thể, 90 chấm màn thường, bảng Tinh túy và nút cảm ứng. |
| js/ufo-transition.js | Phim UFO; game sở hữu thưởng, save, tài nguyên và thời điểm bắt đầu màn đích. |

## Các vùng và boss

| Màn | Vùng | Boss | HP Cân bằng, tạm test |
| --- | --- | --- | ---: |
| 251–260 | Sao Thủy | Hermes | 500 |
| 261–270 | Sao Kim | Aphrodite | 600 |
| 271–280 | Sao Hỏa | Ares | 700 |
| 281–290 | Sao Mộc | Zeus | 800 |
| 291–300 | Sao Thổ | Chronos | 900 |
| 301–310 | Sao Thiên Vương | Ouranos | 1000 |
| 311–320 | Sao Hải Vương | Poseidon | 1100 |
| 321–330 | Mặt Trăng | Selene | 1200 |
| 331–340 | Mặt Trời | Helios | 1300 |
| 341–350 | Hố Đen | Singularity Sovereign | 1800 |

Mỗi vùng có năm quái riêng. Màn thứ nhất có một loại; màn 2–3 có hai loại; màn 4/5 có ba/bốn loại; từ màn 6 đủ năm. Màn boss có dạo đầu cùng vùng; boss sinh đúng một lần khi đủ quota, chỉ thắng sau điều kiện tử trận cuối cùng.

Boss 10–200 giữ dạo đầu sẵn có. Boss 210/220/230/240/250 dùng quota, nhóm quái và giới hạn số lượng tương ứng của 209/219/229/239/249. Quái triệu hồi không được dùng để vượt quota thường.

## Điều khiển và tiến trình

Boss 250 mở vĩnh viễn Bộ Đồ Phi Hành Gia Makemake. J bật/tắt phản lực trên màn vũ trụ: tối đa 6 giây, hồi 10 giây, không tiêu đạn. J không đồng thời bắn trái ở đây. Bộ WASD dùng T cho phản lực để tránh trùng J bắn; có thể tùy chỉnh.

Phím 1–9, 0 lần lượt kích hoạt Thủy, Kim, Hỏa, Mộc, Thổ, Thiên Vương, Hải Vương, Trăng, Mặt Trời, Hố Đen. Điện thoại có bảng nút riêng. F/R giữ chức năng cũ; khi ở dạng chưởng Trăng/Mặt Trời, F thoát dạng để dùng vũ khí.

Thưởng chỉ mở khi boss chết thật; không cấp từ chọn màn, sinh boss, mốc HP hoặc preview. Tiến độ qua SaveManager/BossManager. Link ?test=all mở nội dung trong phiên thử, không ghi đè save thật.

Có đúng mười chuyến UFO: 250→251, 260→261, …, 340→341. Chuyến đầu có lên UFO từ đảo và khoang nhận bộ đồ. Combat dừng trong phim; hết giờ/bỏ qua dùng một callback hoàn tất. Không có màn 351 sau boss cuối.

## Tinh túy: số chính thức giữ nguyên

| Boss mở | Tinh túy | Cơ chế |
| ---: | --- | --- |
| 260 | Dòng Nước Cao Áp | Nửa màn; 99 sát thương/giây trong 5 giây; trừ 20 đạn một lần. |
| 270 | Ngưng Đọng Không Gian | 5 giây, hồi 10 giây; kết liễu ngay quái thường bằng đòn/lướt hợp lệ, không kết liễu ngay boss. |
| 280 | Ngọn Lửa Hủy Diệt | Nửa màn; 99 sát thương/giây trong 5 giây; trừ 20 đạn một lần. |
| 290 | Dây Leo Đại Địa | Nửa màn; 99 sát thương mỗi lần trúng trong 5 giây; trừ 20 đạn một lần. |
| 300 | Tam Thạch Lăn | Ba đá riêng, mỗi đá 20 sát thương; không tiêu đạn. |
| 310 | Song Kị Sĩ Hộ Vệ | Hai kị sĩ, mỗi người 20 HP; hồi 10 giây. |
| 320 | Thực Thể Hút Đẩy | 15 giây, đổi hút/đẩy mỗi 2 giây; hút gây 2 sát thương và choáng, đẩy gây 999. |
| 330 | Phán Quyết | +50 HP, +5 sát thương/chưởng, 25% đóng băng khi trúng hợp lệ. |
| 340 | Tối Thượng | +50 HP, +5 sát thương/chưởng; thiêu đốt 3 sát thương/giây trong 2 giây. |
| 350 | Lỗ Hổng Hư Không | 8 giây, hồi 15 giây, không tiêu đạn; 50 sát thương/giây trong vùng; nổ chuẩn 2000 đúng một lần. Mỗi đạn hấp thụ cho 0,5 giáp ảo, tối đa 100. |

Trăng/Mặt Trời dùng chung một phần +50 HP, không cộng dồn hoặc hồi lại bằng đổi qua lại. Đổi sang vũ khí gỡ HP thưởng và chặn HP hiện tại trong giới hạn mới. Hắc Hóa chỉ tăng một đơn vị tấn công theo V3, không mặc định nhân cả vùng đánh.

Sát thương lớn vẫn chịu miễn nhiễm, chuyển pha, phong ấn và điều kiện thắng. Tia Helios xuyên khiên thường nhưng không xuyên Bất Tử. Sóng Diệt Vong boss 350 lấy 90% HP hiện tại ngoài nơi trú; khiên cá nhân không thay nơi trú.

## Cấu hình tạm được cho phép hoàn thiện

| Nhóm | Chơi thử |
| --- | --- |
| Quái thường | HP nền 5–12 tùy vùng, tối đa 12; đòn thường 1 HP; chiêu 6 giây, báo trước 1 giây. |
| Boss | HP theo bảng; đòn mạnh 2 HP; chu kỳ mặc định 6 giây, báo 1,1 giây. Chiêu thiết kế riêng dùng quy tắc riêng. |
| Màn | 50 đạn đầu, sức chứa 120, mỗi hòm 35, nhịp hòm 5 giây; quota/nhịp sinh theo vùng; tối đa 4–5 quái. |
| Thủy/Hỏa/Mộc | Hồi 12 giây; dây leo trúng mỗi 1 giây, tối đa năm nhịp trong 5 giây. |
| Thổ | Hồi 3 giây; đá 330 px/giây, mỗi đá nhớ mục tiêu đã trúng riêng. |
| Kị sĩ | Đánh 4 sát thương/giây, tồn tại tối đa 20 giây; tối đa hai người, không gọi chồng đội còn sống. |
| Hải Vương | Hồi 20 giây; hút choáng 0,5 giây; dịch chuyển giới hạn sân, tôn trọng miễn khống chế. |
| Chưởng | Nền 1 cộng 5; hồi 0,5 giây; 1 đạn/chưởng; nổ lan bán kính 55 px; đóng băng 1 giây. |
| Hố Đen | Bán kính 330 px, kéo 160 px/giây; một hố tại một thời điểm. |
| Địch | Giới hạn vùng nguy hiểm/đạn 24/48; trạng thái và triệu hồi có giới hạn riêng trong config. |

Đây là cấu hình chơi thử; phản hồi trên thiết bị thật vẫn cần để cân bằng cuối. Các mốc 99/999/2000 và thời lượng quy định không bị giảm ngầm.

## Kiểm chứng và đóng gói

cosmic-design.test.cjs bảo vệ danh mục và số chính thức; boss-preludes.test.cjs kiểm tra hạ quái thật trước boss cũ; cosmic-integration.test.cjs kiểm tra 350 màn, 50 quái/10 boss ra chiêu hữu hạn, DPS theo nhiều bước thời gian, đạn, HP thưởng, giáp ảo, UFO và thưởng sau tử trận. cosmic-scenery.test.cjs kiểm tra nền mười vùng.

[Phòng tạo hình](../tests/cosmic-art-preview.html) hiển thị mỗi nền với năm quái và boss. Build đóng gói runtime, font, Three.js, 30 PNG vũ trụ và các phòng HTML vào dist/. Chỉ phát hành sau khi kiểm thử, build và xem trình duyệt. Kiểm thử tự động không thay việc đánh giá cảm giác chơi, hình ảnh và hiệu năng trên iPhone/Android thật.

### Rà model và Tinh túy trước phát hành

Ảnh tổng được tách theo lõi alpha và vùng gần đường viền thật, thay cách chia ô chữ nhật. Phần phát sáng nối giữa hai hình không gộp thân quái. Chi tiết rời được gắn về hình gần nhất. `cosmic-art-extraction.test.cjs` đọc đủ 10 PNG và xác nhận toàn bộ pixel alpha >6 được giữ nguyên RGBA, đúng một lần trên 50 model. Khung xem ảnh rộng tự co vừa cả chiều ngang để không cắt vây, thương hoặc đuôi.

`cosmic-essence.test.cjs`, `cosmic-essence-fx.test.cjs` và `cosmic-input-regressions.test.cjs` kiểm tra giáp ảo, kị sĩ nhận đòn, hút–đẩy, đóng băng/thiêu đốt, đổi dạng không hồi máu lặp, phím F và phân biệt đạn với sát thương liên tục. Đạn chưởng được tính vào quy tắc 10 phát trúng boss nhận một khiên; DPS không tự cộng lượt bắn.

Mỗi Tinh túy có mô tả chi phí, tác dụng, thời gian còn lại và hồi chiêu. [Phòng thử Tinh túy](../tests/cosmic-skills-preview.html) chạy bằng bộ xử lý chiến đấu thật; [phòng UFO](../tests/ufo-preview.html) có đủ 10 chặng và thước phim. Bộ kiểm thử đầy đủ trước đóng gói: 870/870 đạt.
