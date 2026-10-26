# Đảo Phục Sinh · tạo hình theo bản vẽ người dùng

Đợt sửa này chỉ thay hình ảnh ở màn 201–250 và bối cảnh đoạn chuyển vào đảo. Tạo hình nhân vật chính, màn 1–200, kỹ năng, HP, sát thương, điều kiện phần thưởng và Phán Xét được giữ nguyên.

## Hai bản vẽ tham chiếu

Người dùng cung cấp hai bảng thiết kế:

- Sáu quái thường: Trứng Phục Sinh vỡ vỏ phát sáng, Thỏ Ma mang giỏ trứng, Patrick với xúc xắc và cỏ, Leprechaun râu đỏ mang túi vàng, Gã Say Rượu cầm chai, Moai Nhỏ bằng đá.
- Năm boss: Tộc Trưởng Hóa Đá với mắt sáng và chi tiết vỏ sò, Chúa Tể Vùng Đất Chết bốn chân, Người Chim Tối Cao có cánh lông/xương, Mana với các phiến khắc bay quanh lõi, Makemake với mặt nạ mắt tròn và thân dung nham.

Các đặc điểm nhận diện, tỷ lệ chính, chất liệu đá nhiều mặt, bảng màu và ánh sáng của hai bảng là cơ sở cho bộ ảnh trong game. Các trang ảnh dùng alpha thật để tách nhân vật, không vẽ cả nền hình chữ nhật vào sân chơi.

## Bộ tài nguyên

| Đường dẫn | Vai trò |
| --- | --- |
| `assets/sprites/island/easter-egg.png` | Trứng Phục Sinh |
| `assets/sprites/island/ghost-bunny.png` | Thỏ Ma; dùng lại cho thỏ triệu hồi |
| `assets/sprites/island/patrick.png` | Patrick Mũ Cỏ |
| `assets/sprites/island/leprechaun.png` | Leprechaun râu đỏ |
| `assets/sprites/island/drunken-wanderer.png` | Gã Say Rượu |
| `assets/sprites/island/mini-moai.png` | Moai Nhỏ; đồng minh R và dạng vũ khí Moai |
| `assets/sprites/island/awakening-moai.png` | Boss 210 |
| `assets/sprites/island/deforested-alpha.png` | Boss 220; dùng lại cho chuột triệu hồi |
| `assets/sprites/island/birdman.png` | Boss 230 |
| `assets/sprites/island/mana-spirit.png` | Boss 240 |
| `assets/sprites/island/makemake.png` | Boss 250 |
| `assets/sprites/island/golden-fish.png` | Tiểu Ngư: cá nhỏ màu vàng, không phải người cá |
| `assets/backgrounds/island/quarry.png` | Mỏ đá, tượng Moai chưa hoàn thiện, cỏ vàng và bờ đảo |
| `assets/backgrounds/island/dead-palms.png` | Rừng cọ đã chết, nền núi lửa và các gốc cây mục |
| `assets/backgrounds/island/bird-cliffs.png` | Vách đá Người Chim, nhà đá và đại dương phía xa |
| `assets/backgrounds/island/mana-sanctuary.png` | Thánh địa đá/gỗ khắc, ánh Mana xanh và không khí ban đêm |
| `assets/backgrounds/island/volcano.png` | Miệng núi lửa, mặt đá tối và ánh dung nham |

Nền không chứa nhân vật được vẽ sẵn hoặc chữ. Đường chân trong game nằm ở y438 của khung 960×540; nền và hình người được căn theo đường này, còn cảnh báo kỹ năng tiếp tục được game vẽ riêng.

## Nạp và chuyển động

`js/island-art.js` nạp, giải mã và giữ lại mỗi ảnh một lần, dùng tài nguyên cục bộ trong repo và bản `dist/`, không phụ thuộc CDN. `island-renderer.js` sử dụng lớp ảnh khi đã sẵn sàng; nếu tải hoặc giải mã thất bại, hình Canvas dự phòng vẫn giữ trận đấu hoạt động.

Hướng nhìn, điểm đặt chân, nhịp đi, lấy đà và thu đòn dùng trạng thái thật của quái. Nhịp bước chạy theo quãng đường thật, chân nâng/đặt luân phiên và vai/đầu cân bằng ngược chiều. Chuột dùng bốn điểm chân, Người Chim xoay cánh theo khớp, Mana giữ lõi mặt nạ cứng và chuyển động các phiến khắc ở ngoài. Chuyển động trên bề mặt ảnh giữ liên kết giữa thân và chi, tránh lộ đường cắt hình chữ nhật hoặc tách thành các mảnh rời. Tùy chọn Giảm chuyển động giữ hình nguyên vẹn và tắt dao động phụ.

`js/island-fx.js` vẽ luồng gió, sóng âm, khe địa chấn, đá rơi, vụn đất, độc, laze, đạn trứng và phù văn với ba nhịp báo trước–tác động–tan dần. Không tô hình chữ nhật lên toàn bộ hitbox. Những nét gió và mảnh đá chỉ là hình ảnh, không tạo sát thương mới. Tiểu Ngư vàng bơi phía trên đầu, chuyển động đuôi/vây, giữ chu kỳ giáp 10s/3s đã có.

Nền và mô hình được đóng gói cùng bản chính, phòng thử và rạp chuyển cảnh. Phần alpha, vùng ảnh của từng nhân vật, vị trí đường chân và số lượt nạp được kiểm tra riêng trước khi xuất bản.

## Nguồn và prompt

Bộ ảnh được xử lý bằng **built-in `image_gen`**, giữ alpha gốc; không dùng công cụ khác sửa pixel. Mỗi model là một ảnh riêng để tai, cánh, tay và mảnh đá không dính sang ô bên cạnh. Hai thử nghiệm atlas ban đầu được bỏ, không đóng gói. Nền có đường chân đo riêng theo từng ảnh, không giả định mọi ảnh đều đặt sàn ở cùng tỷ lệ.

Prompt và nguồn đầu ra cuối nằm trong [island-art-prompts.json](island-art-prompts.json). Các ảnh được sao chép vào thư mục `assets/` trước khi nạp vào game. Không có đường dẫn tới thư mục tạo ảnh bên ngoài dự án trong mã chạy.
