# Hải Vực Quên Lãng · Tầng Biển Nông

Phát hành 4.1.0 triển khai đúng màn 151–160. Hải vực dự kiến 151–200; mốc 170–200 trên trang IV bị khóa và ghi sắp mở. Không có dữ liệu chiến đấu hoặc boss giả cho những màn chưa triển khai. Dữ liệu màn, vùng và quái 1–150 được kiểm tra bằng SHA-256 so với v4.0.6.

## Tích hợp

- `js/underwater-config.js`: tất cả thông số riêng của đợt chơi thử, `provisional: true`.
- `js/underwater.js`: nổi, gia tốc bơi, oxy, dự trữ, ngạt, HUD, hòm tiếp tế và pool bong bóng.
- `js/underwater-enemies.js`: ba AI riêng, chỉ sở hữu cá biển.
- `js/boss160.js`: encounter hai bản thể, Liên Trảo, Câm Lặng, cầu xoáy và dọn hiệu ứng theo chủ.
- `js/underwater-renderer.js`: ảnh nền riêng, thị sai nhẹ, tia nắng, vây và trảo trên bề mặt liên tục, vùng báo và lõi xoáy riêng.
- `js/game.js`: nhánh nước trong physics/enemy/loot, sát thương vũ khí chung, checkpoint và vòng đời.
- `js/weapon-manager.js`: chặn tạo đòn mới khi ngạt hoặc Câm Lặng. Điểm nhận sát thương chung cũng chặn đạn đang bay và Lăn Chém đã bắt đầu.
- `underwater.css`, `index.html`: oxy ngay dưới máu, nút cấp oxy PC/mobile. Phím nhảy tùy chỉnh và vuốt lên đều cấp oxy khi lặn. Bảng chọn vũ khí vẫn chặn thao tác chiến đấu.

Không thay đổi cơ chế mở khóa, tiêu hao đạn và độc quyền Song Rìu. Không cấp lướt cho vũ khí khác. Cốt truyện IV có hướng dẫn tự mở ở151; tài nguyên và kỹ năng đã sở hữu được giữ. Màn160 không có phần thưởng vũ khí mới vì chưa có đặc tả.

## Thông số đã được người dùng duyệt để chơi thử

| Hệ thống | Giá trị |
|---|---|
| Oxy đầy / tiêu hao | 30 giây / 1 giây mỗi giây đang chơi |
| Bình ban đầu / mỗi hòm | 2 / 2 |
| Cấp oxy | 1 bình hồi15 giây, tối đa30; nhấn một lần, không lặp khi giữ |
| Ngạt | Khóa sát thương ngay; đủ5 giây mất1HP, sau đó1HP/giây |
| Boss / bản sao ở Cân bằng | 120 / 60HP riêng biệt |
| Song Sinh | 1 bản sao tại≤50%HP, không tự nhân tiếp; hạ cả hai để thắng |
| Liên Trảo | 3 nhát, mỗi nhát1HP +1khiên dự trữ nếu có; khiên đang bật chặn HP và mất1lượt đỡ; Bất Tử chặn HP |
| Câm Lặng | 3giây, lặp15giây bình thường /10giây Song Sinh; không khóa bình oxy |
| Piranha / cá ngựa | 1HP mỗi lần trúng |

## Các giá trị tạm còn cần đánh giá qua chơi thử

| Nhóm | Cấu hình ban đầu |
|---|---|
| Bơi | tốc độ245px/s, gia tốc1200, lực cản5; cao độ đáy nhân vật292px, dao động5px |
| Hòm | cao độ270px, chìm65px/s; oxy mỗi12s, tối đa2 hòm, tồn tại20s sau khi nổi ổn định |
| Dự trữ | tối đa12bình; khoảng cách giữa lần cấp0,35s; cảnh báo dưới25% |
| Quái | piranha3HP, cá nóc/cá ngựa4HP; kích thước và tốc độ riêng trong config, không tăng HP theo màn |
| Piranha | phát hiện420px; báo0,7s, lao360px/s trong0,65s; nghỉ1,1s; hồi chiêu4,5s sau cú lao |
| Cá nóc | phồng ở170px, xẹp khi ra220px; phồng1,75lần; va chạm1HP, đẩy95px/s; khóa lặp va chạm0,8s |
| Cá ngựa | tối đa480px; báo0,8s, đạn320px/s; hồi5s sau phát bắn |
| Liên Trảo | hồi6s sau combo; báo0,85s, lao460px/s; ba nhát cách0,55s |
| Cầu xoáy | hồi9s; báo1s, bay0,6s, sống3,5s; hút170px, lõi30px, tối đa2cầu; lõi chỉ trúng1lần |
| Lõi xoáy | mất50%oxy hiện tại kể cả khi khiên đang bật; 2HP đi qua cơ chế bảo vệ chiến đấu hiện có |
| Đạn | đầu20, sức chứa70, mỗi hòm24, chu kỳ5,8s; giữ giới hạn3 hòm và thời gian tồn tại cũ theo độ khó |
| Bong bóng | tối đa64hạt, tái sử dụng qua pool; nhịp0,12s lúc bơi /0,65s nghỉ /1,2s ngạt |

Chuỗi mục tiêu thử:10/12/14/12/14/16/14/16/18/20; giới hạn3–4quái thường. 151–153 chỉ piranha;154–156 thêm cá nóc;157–160 thêm cá ngựa. Nhịp spawn2,4–2,6s. Chưa tăng tốc độ hoặc HP theo cấp dưới biển; giữ các preset độ khó chung của game.

Oxy đầy lại khi sang màn; bình dự trữ mang theo giữa hai màn biển. Thử lại phục hồi số bình tại checkpoint đầu màn, không tạo thêm bình sau mỗi lần retry. Tạm dừng, hướng dẫn và bảng chọn vũ khí đóng băng đồng hồ. Ngạt là sát thương môi trường, không bị chặn bởi khiên/Bất Tử; cấp oxy là cách ngắt. Nút cấp oxy vẫn hoạt động khi bị Câm Lặng. Rời nước, thua, thắng hoặc về trại dọn timers, hạt, hòm oxy, đạn nước và vùng xoáy.

## Kiểm chứng

`node --test tests/*.test.cjs` chạy bài hồi quy cũ cùng `underwater.test.cjs` và `underwater-presentation.test.cjs`: physics bơi, đơn/giữ phím, chặn vũ khí,5sngạt, bình hữu hạn, hòm nổi, baAI, hitbox cá nóc, tầm480px, ba lần trảo, khiên/Bất Tử, Song Sinh một lần kể cả đòn chí tử, hai thứ tự hạ boss, chu kỳ Câm Lặng, lực hút/lõi riêng, cleanup và pool. Presentation kiểm tra hash1–150, trạng thái HUD, script order, asset cục bộ và bề mặt chuyển động.

`tests/underwater-preview.html` là phòng thử công khai không ghi tiến độ. Nút Song Sinh thực sự gây sát thương qua cơ chế chuyển pha, không giả trạng thái thắng. Bản chính có thể chơi toàn bộ bằng `?test=all`; link thường tiếp tục save thật và tự mở151 nếu đã hoàn thành150 ở bản trước.
