# Bản đồ cốt truyện — v3.2.0

## Hai miền đất

**Miền Nhật Thực, màn 1–50.** Người giữ ngọn đèn cuối cùng lần theo dấu vết dân làng mất tích, qua nghĩa địa, rừng tơ và lâu đài, đến Cổng Nhật Thực. Dracula đã đánh cắp bình minh; hạ hắn trả lại ánh sáng nhưng cũng đánh thức thứ cổ xưa bên dưới cánh cổng.

**Lời Nguyền Cổ Thú, màn 51–100.** Những đường gân mới xuất hiện trên bản đồ dẫn vào rừng nguyên sơ. Golem chúa, Lang Vương và KingKong canh đường tới Rồng ngàn tuổi. Vòng Âm Dương dẫn người giữ đèn đến ba mảnh lời thề của Chimera. Khe nứt khép lại, nhưng một ánh sáng ngoài chân trời để ngỏ hành trình tiếp theo.

Mỗi cốt truyện có hai đoạn mở đầu, năm chặng gắn với năm vùng hiện có và đoạn kết sau boss thứ 50. Màn 50 dẫn sang phần giới thiệu miền thứ hai, giữ phần thưởng và trạng thái chuyển màn bình thường. Màn 100 trở về bản đồ. Hai miền đều có thể chọn ngay, giữ khả năng luyện tập từng màn; chọn màn cao không tự cấp kỹ năng.

## Vòng đời chuyến đi

- Mỗi lần mở link, mở tab mới hoặc tải lại trang: các màn hoàn thành trở về rỗng, màn tiếp tục về 1, vũ khí về súng và toàn bộ phần thưởng boss/bộ đếm Hút Máu được reset.
- Chuyển màn, thử lại, tạm dừng, mở menu hoặc trở về bản đồ trong cùng trang: giữ phần thưởng đã kiếm được trong chuyến đi; điều kiện nhận thưởng boss và chống thưởng trùng không thay đổi.
- Kỷ lục và thiết lập âm thanh, độ khó, hiệu ứng, cách điều khiển được giữ. Khi lưu trữ bị chặn vẫn chơi được trong bộ nhớ.
- Reset chỉ xảy ra lúc khởi tạo trang; xoay điện thoại, phóng toàn màn hình hay đổi bố cục không reset game.

## Vị trí tích hợp

`js/story.js` chứa dữ liệu cốt truyện, bộ đếm tiến độ, giao diện lời dẫn và kết thúc. `index.html` chứa bản đồ SVG, hai nút miền đất và dialog cốt truyện; `style.css` bố trí chúng trong khung game, kể cả khung ngang ảo trên điện thoại. `js/game.js` khởi tạo chuyến đi mới và nối màn kết quả, bản đồ chọn màn, nút bắt đầu với StoryUI. Không thay đổi AI, sát thương, kỹ năng boss hay các chỉ số vũ khí.

`tests/story.test.cjs` kiểm tra phạm vi hai cốt truyện, reset save trước khi migrate, bảo toàn thiết lập/kỷ lục, giữ phần thưởng trong cùng chuyến đi, chọn miền hai không cấp thưởng, kết thúc đúng màn 50/100 và lưu trữ bị chặn.
