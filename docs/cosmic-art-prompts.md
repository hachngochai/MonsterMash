# Tạo hình Thiên Hà — nguồn và mô tả tái tạo

Bộ 251–350 tạo bằng **built-in imagegen** dựa trên bốn collage quái/boss vũ trụ của người dùng và [đặc tả](cosmic-expedition-spec.md). Không dùng ảnh website/CDN. Đầu ra đã chép vào repo, tải bằng đường dẫn tương đối.

Các mô tả sau là bản tóm tắt mục tiêu để tái tạo, không phải bản chép nguyên văn từng prompt công cụ. Ràng buộc chung: hoạt hình giả khối đá đa giác có chi tiết cạnh/mặt, nét viền rõ, ánh sáng theo hành tinh, hợp thợ săn gốc; nhìn ngang/ba phần tư dùng cho 2D; không chữ/UI/HP/khung ảnh; không cắt chân, cánh hoặc vũ khí. Boss dùng PNG alpha riêng. Atlas alpha có hai cột, ba hàng, đúng năm loài, ô cuối trống. Nền rộng không nhân vật, chừa vùng di chuyển tiền cảnh. Chiêu thật vẽ bằng Canvas, không dán cố định trong ảnh.

Mỗi hàng tương ứng ba file: `assets/backgrounds/cosmic/<vùng>.png`, `assets/sprites/cosmic/<vùng>-enemies.png`, `assets/sprites/cosmic/<boss>.png`.

| Vùng | Nền | Atlas năm quái | Boss / file |
| --- | --- | --- | --- |
| `mercury` | Đá nóng/lạnh, hố thiên thạch, kim loại chảy, Mặt Trời gần. | Ốc Sên Nhiệt Kim; Bóng Ma Bùng Nổ Mặt Trời; Bọ Hố Thiên Thạch; Chu Sa Sống; Drone Lõi Nóng Chảy. | `hermes`: khổng lồ giáp đá vỡ, lõi lửa, tay nặng. |
| `venus` | Đá núi lửa, khí vàng xanh, mây axit. | Thợ Săn Axit; Golem Lưu Huỳnh; Bào Tử Nhà Kính; Chim Vesper; Tinh Linh Ăn Mòn. | `aphrodite`: nữ hoàng bão axit, giáp vàng xanh, đá quý tím, nhiều tay/cánh. |
| `mars` | Sa mạc sắt đỏ, bụi, khe nứt và máy móc cũ. | Sâu Bụi Hỏa Tinh; Cuồng Binh Sắt Gỉ; Drone Phobos; Tinh Linh Lốc Bụi; Nhện Ares. | `ares`: chiến thần giáp sắt đỏ đen, vũ khí nhiệt dài, lõi lửa. |
| `jupiter` | Bệ năng lượng trên biển khí, mây nhiều tầng, bão lớn. | Cá Voi Khí Sao Mộc; Lươn Plasma; Bóng Ma Xoáy Khí; Bào Tử Sao Mộc; Tinh Linh Khí Quyển. | `zeus`: pháo đài sấm nổi, tua/tay giáp đá, lõi điện xanh. |
| `saturn` | Bệ giữa băng/thiên thạch và vành đai có phối cảnh. | Thợ Vành Đai; Golem Pha Lê Băng; Đỉa Methane Titan; Thiên Thạch Tỉnh Thức; Drone Cưỡi Vành Đai. | `chronos`: titan băng đá, lõi vàng, vòng quỹ đạo và đá nổi. |
| `uranus` | Pha lê bạc lam, băng và cực quang yếu. | Kẻ Uốn Băng; Bóng Ma Methane; Vệ Binh Băng Lam; Mìn Băng Chùm; Sứa Cực Quang. | `ouranos`: vua kị sĩ băng, vương miện gai, thương và áo choàng. |
| `neptune` | Bệ trong bão cobalt/tím, xoáy khí sâu. | Siren Vực Thẳm; Leviathan Bão; Quỷ Băng Triton; Hư Linh Tâm Bão; Oan Hồn Gió Âm. | `poseidon`: chúa bão tóc/râu sáng, vương miện, đinh ba, giáp tím lam. |
| `moon` | Regolith, hố va chạm, di tích nghiên cứu, Trái Đất phía xa. | Thợ Săn Bóng Trăng; Golem Bụi Trăng; Cỗ Máy Apollo Hỏng; Tinh Linh Trăng Khuyết; Bọ Băng Cực. | `selene`: nữ thần giáp sáng, trăng lưỡi liềm, cánh tinh thể vàng trắng. |
| `sun` | Bệ plasma bảo vệ giữa biển lửa và vòng từ trường. | Tinh Linh Lõi Mặt Trời; Rồng Tai Lửa; Quỷ Đốm Mặt Trời; Ký Sinh Nhiệt Hạch; Phượng Hoàng Photon. | `helios`: hoàng đế lửa, cánh phượng, vương miện và lõi năng lượng. |
| `blackHole` | Bệ ngoài chân trời sự kiện, vòng bồi tụ tím/cam, sao uốn. | Kẻ Nuốt Hư Không; Cấu Thể Kéo Dài; Bóng Ma Thời Gian; Ký Sinh Chân Trời Sự Kiện; Dị Thường Hấp Dẫn. | `singularitySovereign`: lõi hố đen, giáp đá vỡ, tay/tua quỹ đạo liên tục. |

Tổng: **10 nền + 10 atlas + 10 boss = 30 PNG**. Sprite có alpha thật; nền kín khung. `js/cosmic-art.js` có `sheetFrames` riêng theo khoảng trống thực của từng loài, tránh chia đều máy móc gây cắt mép.

`CosmicScenery` ghép ánh sáng, mây và tiền cảnh theo vùng. `CosmicArt` biến dạng một bề mặt liên tục theo bước đi/ra chiêu, không xoay những mảnh chữ nhật rời. Biểu tượng thiên thể trên map được vẽ bằng code trong `cosmic-planets.js`, tách khỏi ảnh chiến đấu. Hình không chứa hitbox/sát thương; sửa ánh sáng hoặc VFX không tự đổi chỉ số.

Xem mười bộ tại [phòng tạo hình](../tests/cosmic-art-preview.html). Cần xem cả đứng/đi/ra chiêu để kiểm tra chân, cánh, sừng và vũ khí khi bề mặt biến dạng.
