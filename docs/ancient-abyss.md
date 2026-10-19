# Vực Sâu Cổ Đại — v4.0.0

Chương III thêm màn 101–150, giữ nguyên dữ liệu của 100 màn đầu. Hai đảo cũ giữ nguyên tọa độ và tuyến đường; mỗi cốt truyện có một trang camera riêng, vuốt ngang hoặc dùng tab/mũi tên. Đường ra/vào nối 50–51–60 và 100–101–110. Atlas SVG và Three.js dùng cùng viewport, hỗ trợ cả màn hình điện thoại được xoay bằng CSS.

## Các file triển khai

- `js/abyss-config.js`: số cố định và toàn bộ thông số cân bằng thử nghiệm.
- `js/abyss-combat.js`: 8 quái thường, 5 boss, chuyển dạng, bẫy, ảo giác, đảo điều khiển, trọng lực ngược, mê cung và phân thân. Chi tiết ở [abyss-combat.md](abyss-combat.md).
- `js/abyss-renderer.js`: 5 bối cảnh, sprite theo ảnh mẫu, đuốc, phát quang, cảnh báo và hiệu ứng.
- `assets/sprites/abyss/`: 6 PNG nền trong suốt gồm Minotaur, Hoa Quỷ, Rùa Kính, Cổ Điểu, kỵ sĩ và 4 cảm xúc trong một sheet.
- `assets/backgrounds/abyss/`: 5 ảnh nền chi tiết từ concept, đã bỏ nhân vật/chữ. Đo riêng mép nền từng ảnh để mặt sàn trùng y=438; lớp xa chuyển động nhẹ, mặt đất đứng yên. Có tàn lửa, bào tử, phản chiếu nước, bụi và sương phù hợp từng vùng.
- `js/campaign.js`, `js/story.js`, `js/atlas-3d.js`, `index.html`, `style.css`: 150 màn, cốt truyện III, bản đồ và thao tác vuốt.
- `js/game.js`, `js/skill-manager.js`, `js/weapon-manager.js`, `js/input-manager.js`, `js/key-bindings.js`: tích hợp vòng lặp combat, vật lý, vũ khí mới, điều khiển ngược và miễn chọn nhầm hình chiếu boss khi Hóa Đá.
- `js/save-manager.js`, `js/boss-manager.js`, `js/progression-ui.js`: lưu vĩnh viễn, phần thưởng đúng mốc, hiển thị hành trang.
- `scripts/build.mjs`: đóng gói đủ module và sprite vào `dist/`.
- `tests/abyss-preview.html`: phòng thử riêng, có nút chạy/dừng, chọn dạng boss và trang bị; không ghi tiến độ thật.

## Số cố định và cân bằng thử nghiệm

Các chu kỳ theo đặc tả giữ nguyên: Ký Sinh điên 1 giây; 3 ảo ảnh; Rùa biến mất mỗi 15 giây, phản đúng 100% sát thương gốc, chỉ nhận 50% sát thương hợp lệ, 5 cột nước, tầm Tiểu Quy 4 bước; Ô Thước 5 giây, đèn lồng 6 giây, đá lăn 10 giây; Thiên Thủ đổi cảm xúc 20/15 giây, vào mê cung ở 50% và hồi đầy đúng một lần. Giá trị này nằm tại `AbyssConfig.fixed`.

Chỉnh theo phản hồi mới: Minotaur 110 có Cuồng Nộ nhịp riêng 10 giây, tốc độ húc 680 thay vì 500, sát thương 2 và khiên/vách giữ nguyên. Nếu đang ra đòn thì xếp một lần Cuồng Nộ kế tiếp, không chồng chiêu. Ký Sinh Trùng con chờ 10 giây giữa các đòn và giữa hai lần kích hoạt điên khi bị bắn; mỗi lần điên vẫn kéo dài 1 giây. Boss Hoa Quỷ 120 giữ nhịp cũ.

HP, sát thương chưa được quy định, thời gian báo chiêu, thời lượng mất dấu, debuff, tốc độ, bán kính bẫy và chiêu của vũ khí mới nằm ở `AbyssConfig.combat`/`weapons`, đánh dấu `provisional-playtest`. Búa: 4 sát thương, 0,95 giây, tầm 105 px. Lưỡi hái: 3 sát thương, 0,7 giây, tầm 125 px. Cả hai chỉ đánh thường, không kế thừa Lăn Chém Song Rìu. Không thêm thưởng tại 110 hoặc 150.

## Lưu và chuyển phiên

Theo lựa chọn mới của người chơi, trang chính không gọi `newRun:true`: bản đồ, kỹ năng, trang bị, Hút Máu, cài đặt và kỷ lục được giữ sau khi mở lại link. Save cũ hoàn thành màn cuối tiếp tục tới chương mới. Chỉ dữ liệu hoàn thành boss thật mới được dùng để chuyển đổi phần thưởng; chọn màn cao không mở khóa đồ. `newRun:true` chỉ còn dùng rõ ràng trong công cụ thử nghiệm.

## Model theo ảnh tham chiếu

Dùng skill imagegen ở chế độ built-in, thao tác background-extraction từ 5 ảnh người chơi cung cấp. Yêu cầu chung của prompt: tách đúng model, giữ hình dáng, tỷ lệ, giáp, màu và chi tiết mặt; nền alpha thật; bỏ cảnh, chữ và các ví dụ phụ; không chuyển thành icon phẳng. Cổ Điểu và kỵ sĩ được tách riêng; Cổ Thần giữ bốn khung cảm xúc. Renderer co giãn đồng nhất, không kéo méo hình. Ảnh được dẫn xuất bằng AI, không phải khẳng định giống từng pixel nguồn. Các PNG được giữ nguyên độ phân giải (~10,7 MB tổng); cần tiếp tục đo tốc độ tải trên iPhone thật.

## Kiểm tra và giới hạn

Chạy `npm test` và `npm run build`. Có kiểm thử đối chiếu hash dữ liệu 1–100, đường đi và camera 3 trang, gesture bị xoay, độc lập reward/save, phản sát thương phân số, chuyển dạng 140, một thanh HP 150, trọng lực thật và cơ chế phân thân. Renderer có test cả sprite đã tải và phương án dự phòng khi không giải mã được ảnh.

Preview trực tiếp kiểm tra I/II/III, 5 boss và các dạng, HUD, ảnh nền trong suốt, cảnh báo và nút điều khiển. Kiểm thử tự động không thay thế playtest độ khó, cảm giác vũ khí và Safari/iPhone vật lý. Game hiện là một người chơi; không tự thêm multiplayer. Thông số thử nghiệm còn cần phản hồi chơi thực tế. Bản này chuẩn bị local và `dist/`; chưa tự commit/push/deploy.

Hoạt ảnh sprite dùng pha thời gian ổn định, chuyển động chân/cánh/tay lấy từ chính ảnh, chuyển tư thế được làm mượt; không dùng vị trí truy đuổi làm pha hoạt ảnh. HUD chỉ dựng lại khi dữ liệu hiển thị thay đổi, tránh tạo lại SVG tim mỗi frame. Boss chết có hoạt ảnh ngã/tan vỡ và trận chờ hoạt ảnh kết thúc; không tạo thêm actor hoặc tính thưởng lần hai.

## Chỉnh khung hình và điều khiển theo phản hồi mới

Bản đồ I và II dùng camera rộng 600 thay vì 900, giữ tọa độ đảo, đường đi và dấu boss; bản đồ III giữ nguyên. Súng ngắm Trăng Máu màn 70 bắn giữ liên tục mỗi 0,17 giây, vẫn tiêu hao 5 đạn và gây 5 sát thương. Nhấn đúp nhận trong 0,36 giây trên PC / 0,42 giây trên cảm ứng và dùng thời gian sự kiện thật; phím giữ tự lặp không được tính thành lần nhấn mới. Lướt màn 70 có khoảng đệm 0,14 giây trước khi hồi xong, không xếp hàng khi đang lướt, không gây sát thương, không thay quyền Lăn Chém Song Rìu.

Hai nút LƯỚT trái/phải chỉ hiện trong Trăng Máu màn 70 trên giao diện mobile, có đồng hồ hồi chiêu và có cả trong chế độ chỉ vuốt. Giữ nút bắn tiếp tục bắn sau khi lượt lướt kết thúc. Màn khác và trang bị đã lưu giữ nguyên quy tắc.

Canvas chiến đấu luôn dùng `contain` căn giữa, hiển thị đủ 960×540; `viewTop` bằng 0. Không dùng `cover` cắt bầu trời ở khung rộng/thấp. Các khoảng trống theo tỷ lệ nằm ngoài sân chơi, giữ hình nhân vật không méo; tọa độ chạm tính cả khoảng trống và phép xoay iPhone. Thu gọn thanh giao diện lúc chơi để dành thêm chiều cao. Canvas Three.js của atlas giữ cách hiển thị riêng.

`tests/wolf-controls.html` là phòng thử khung hình màn 20 và điều khiển Trăng Máu màn 70, dùng game thật trong iframe, không ghi save. Chế độ Bất tử thử chỉ thuộc phòng thử, có thể tắt; không cấp kỹ năng vào dữ liệu người chơi.
