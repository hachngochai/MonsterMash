# MASTER SUPER PROMPT — ĐẠI CHIẾN VŨ TRỤ
## BIG UPDATE VII: THE COSMIC EXPEDITION
### MAP 251–350 | 10 KHU VỰC | 50 QUÁI THƯỜNG | 10 BOSS | 10 PHẦN THƯỞNG

---

# PHẦN I — MỤC TIÊU VÀ NGUYÊN TẮC TRIỂN KHAI

Tiếp tục phát triển trò chơi 2D Side-Scrolling hiện tại, mở rộng hệ thống từ map 250 lên map 350.

Tên chương mới: **ĐẠI CHIẾN VŨ TRỤ — THE COSMIC EXPEDITION**.

Đây là bản cập nhật lớn gồm 100 màn chơi, trải dài qua 8 hành tinh trong Hệ Mặt Trời, Mặt Trăng, Mặt Trời và một khu vực Hố Đen Vũ Trụ.

Hãy coi đây là một bản mở rộng của source code hiện có, không phải dự án game độc lập.

## 1. Các yêu cầu bắt buộc

- Bảo toàn toàn bộ tính năng của map 1–250.
- Không viết lại hệ thống nhân vật, vũ khí, đạn, máu và khiên khi chưa cần thiết.
- Tiếp tục sử dụng phong cách đồ họa 2D Blocky/Cubic, có cấu trúc hình học góc cạnh, hạn chế chi tiết thừa.
- Mỗi hành tinh phải có bảng màu, điều kiện môi trường, quái vật và Boss riêng.
- Bổ sung các đoạn phim chuyển cảnh bằng UFO.
- Tích hợp Bộ đồ phi hành gia Makemake.
- Tạo hệ thống Tinh túy hành tinh với các kỹ năng độc lập.
- Không tự đặt sát thương, HP, thời gian hồi chiêu hoặc xác suất chưa được cung cấp.
- Giữ nguyên tất cả những giá trị sát thương rất lớn đã được chỉ định, không tự cân bằng lại thành giá trị nhỏ hơn.
- Các hành tinh khổng lồ không có bề mặt rắn phải sử dụng nền tảng chiến đấu giả tưởng phù hợp với hình ảnh thiên văn.
- Những kỹ năng có phạm vi toàn màn hình phải có hitbox, cảnh báo và điều kiện tác động rõ ràng.
- Không để vũ khí mới phá hỏng cơ chế riêng của các Boss cũ.

## 2. Phong cách đồ họa

Yêu cầu toàn bộ hệ thống:

- 2D side-view.
- Blocky/Cubic geometric style.
- Nhân vật và quái vật có ngoại hình dễ nhận biết.
- Các Boss có kích thước lớn hơn quái thường.
- Thiết kế mỗi sinh vật theo bảng màu hành tinh.
- Hiệu ứng hạt, sét, lửa, băng, lực hút và ánh sáng được tối ưu hiệu năng.
- Có chiều sâu hậu cảnh bằng parallax.
- Không tạo chuyển động giật, teleport sai vị trí hoặc hitbox vô hình.

---

# PHẦN II — CHUYỂN CẢNH MAP 250 → 251

## 1. Sự kiện sau khi tiêu diệt Makemake

Khi Makemake — Boss 250 bị tiêu diệt:

1. Hoàn tất hoạt ảnh Makemake gục ngã.
2. Các hiệu ứng núi lửa và đòn tấn công nguy hiểm chấm dứt.
3. Bầu trời trên Đảo Phục Sinh bắt đầu tối lại.
4. Một vòng sáng lạ xuất hiện giữa những đám mây.
5. Một chiếc UFO khổng lồ từ từ bay xuống.
6. UFO dừng ngay phía trên nhân vật.
7. Một chùm sáng hình nón phát ra từ đáy UFO.
8. Chùm sáng bao phủ nhân vật.
9. Người chơi bị kéo lên khỏi mặt đất.
10. Nhân vật bay lên theo chùm sáng và biến mất vào thân UFO.

## 2. Rời khỏi Đảo Phục Sinh

Khi người chơi được đưa vào UFO:

- Cửa khoang UFO đóng lại.
- Động cơ phát sáng.
- UFO tăng tốc.
- Bay khỏi bầu khí quyển Trái Đất.
- Trái Đất nhỏ dần phía sau.
- Các vì sao và hành tinh xuất hiện trong khung cảnh không gian.
- UFO bay cực nhanh để tạo hiệu ứng chuyển cảnh.

Không chuyển từ Đảo Phục Sinh sang Sao Thủy bằng một lần đổi background đột ngột.

## 3. Hoạt cảnh bên trong UFO

Người chơi xuất hiện trong khoang UFO.

Bối cảnh:
- Sàn kim loại tương lai.
- Cửa sổ lớn nhìn ra vũ trụ.
- Màn hình điều khiển phát sáng.
- Những đường đèn năng lượng xanh lam.
- Một khoang cung cấp trang bị.

Tại đây, người chơi có thể quan sát Bộ đồ phi hành gia Makemake đã nhận sau Boss 250.

Không tự thêm hệ thống nhiệm vụ phụ, NPC hoặc shop nếu chưa được thiết kế.

## 4. Chuyển tới Sao Thủy

1. Màn hình bên trong UFO hiển thị hình ảnh Sao Thủy.
2. UFO giảm tốc khi đến gần hành tinh.
3. Khung cảnh các hố thiên thạch hiện ra.
4. UFO hạ xuống vùng đá an toàn.
5. Cửa khoang mở.
6. Người chơi bước ra trong Bộ đồ phi hành gia.
7. Kích hoạt map 251.
8. HUD và các hệ thống chiến đấu xuất hiện trở lại.

Đánh dấu việc hoàn thành map 250 và mở khóa chương mới.

---

# PHẦN III — HỆ THỐNG UFO LIÊN HÀNH TINH

UFO là phương tiện chuyển tiếp giữa các khu vực từ map 251 đến 350.

Không biến UFO thành vũ khí hoặc nhân vật điều khiển độc lập khi chưa có yêu cầu.

## 1. Quy tắc chuyển hành tinh

Khi người chơi hoàn thành Boss cuối của một khu vực:

1. Hủy đạn địch và hitbox Boss còn tồn tại.
2. Hoàn tất hoạt ảnh Boss bị tiêu diệt.
3. Hiển thị phần thưởng hành tinh.
4. Cập nhật tiến trình mở khóa.
5. UFO xuất hiện từ phía trên hoặc từ rìa không gian.
6. Một chùm sáng kéo người chơi vào UFO.
7. Khởi động hoạt ảnh bay xuyên không gian.
8. Hiển thị hành tinh tiếp theo.
9. UFO hạ cánh hoặc triển khai điểm đặt chân giả tưởng.
10. Người chơi bước vào màn đầu tiên của khu vực mới.

## 2. Các điểm chuyển cảnh bắt buộc

| Hoàn thành | Chuyển đến | Map bắt đầu |
|---|---|---|
| Boss 250 Makemake | Sao Thủy | 251 |
| Boss 260 Hermes | Sao Kim | 261 |
| Boss 270 Aphrodite | Sao Hỏa | 271 |
| Boss 280 Ares | Sao Mộc | 281 |
| Boss 290 Zeus | Sao Thổ | 291 |
| Boss 300 Chronos | Sao Thiên Vương | 301 |
| Boss 310 Ouranos | Sao Hải Vương | 311 |
| Boss 320 Poseidon | Mặt Trăng | 321 |
| Boss 330 Selene | Mặt Trời | 331 |
| Boss 340 Helios | Hố Đen Vũ Trụ | 341 |

Sau Boss 350, chỉ kích hoạt hoàn thành chương và trao phần thưởng theo cấu hình; chưa tự tạo thêm điểm đến tiếp theo.

## 3. Chuyển cảnh không bị lặp sai

- Chỉ kích hoạt UFO một lần khi Boss thực sự bị tiêu diệt.
- Không kích hoạt lại khi tải màn.
- Không đưa người chơi vào UFO nếu Boss chưa hoàn thành điều kiện chiến thắng.
- Không chuyển map khi đoạn phim chưa hoàn tất.
- Cho phép cơ chế bỏ qua hoạt ảnh nếu hệ thống cutscene hiện tại hỗ trợ.
- Không làm mất HP, đạn hoặc kỹ năng do lỗi chuyển cảnh.
- Lưu đúng khu vực hiện tại và khu vực tiếp theo.

---

# PHẦN IV — BỘ ĐỒ PHI HÀNH GIA MAKEMAKE

## 1. Điều kiện mở khóa

Sau khi tiêu diệt Boss 250, người chơi nhận:

**BỘ ĐỒ PHI HÀNH GIA MAKEMAKE**

Đây là trang bị nền tảng cho toàn bộ chương vũ trụ.

## 2. Ngoại hình

- Bộ giáp phi hành gia hình khối.
- Mũ bảo hộ với kính phản quang.
- Hệ thống phản lực phía sau.
- Giáp thân và giáp chân dạng module.
- Các đường năng lượng phát sáng.
- Màu sắc thống nhất với thiết kế nhân vật hiện tại.

Không làm mất đặc trưng ngoại hình của nhân vật chính.

## 3. Khả năng thích ứng trọng lực

Bộ đồ cho phép người chơi tồn tại và chiến đấu trong các điều kiện trọng lực khác nhau.

Có thể áp dụng cấu hình chuyển động riêng theo khu vực:
- Hành tinh đá.
- Môi trường nền tảng bay.
- Vành đai không gian.
- Môi trường gần Mặt Trời.
- Không gian chịu ảnh hưởng trọng lực Hố Đen.

Không tự làm trọng lực bằng 0 trên tất cả hành tinh.

## 4. Kỹ năng phản lực — PHÍM J

Khi nhấn J:
- Hệ thống phản lực sau lưng kích hoạt.
- Xuất hiện luồng năng lượng đẩy.
- Nhân vật chuyển sang trạng thái lơ lửng.
- Hệ thống giữ nhân vật quanh độ cao giữa khu vực gameplay.
- Người chơi tiếp tục có thể chiến đấu bằng các vũ khí đã sở hữu.

Kỹ năng phải hoạt động ổn định trong môi trường không gian.

**Chưa được xác định:**
- Thời gian phản lực tối đa.
- Có tiêu hao năng lượng hay không.
- Thời gian hồi chiêu.
- Nhấn một lần để bật/tắt hay giữ phím để duy trì.

Đưa các thông số này vào cấu hình thay vì tự chốt.

## 5. Xung đột điều khiển

Giữ nguyên:
- Phím F: Chuyển vũ khí.
- Phím R: Hóa Ngư Nhân, với điều kiện kích hoạt phù hợp.
- Phím J: Phản lực phi hành gia.
- Các phím tấn công hiện có.
- Cơ chế khiên.
- Cơ chế đặc biệt chỉ thuộc dạng Song Rìu.

Không để phím J làm mất điều khiển vũ khí hoặc khóa nhân vật tại giữa màn hình một cách tuyệt đối.

---

# PHẦN V — HỆ THỐNG TINH TÚY HÀNH TINH

Mỗi Boss từ map 260 đến 350 cung cấp một phần thưởng mới.

## 1. Giao diện phần thưởng

Các Tinh túy được quản lý trong hệ thống mở khóa của người chơi.

Mỗi Tinh túy có:
- Tên riêng.
- Biểu tượng riêng.
- Màu sắc riêng.
- Điều kiện mở khóa.
- Mô tả kỹ năng.
- Thời gian tác dụng nếu có.
- Hồi chiêu nếu có.
- Chi phí đạn nếu có.

Không tự thay thế cơ chế chuyển vũ khí bằng F đang tồn tại.

Nếu các Tinh túy cần phím kích hoạt mới, hãy tích hợp với hệ thống phím và HUD hiện có. Không tự quyết định tất cả Tinh túy sử dụng cùng một phím.

## 2. Danh sách phần thưởng

| Boss | Tinh túy | Màu |
|---|---|---|
| 260 | Tinh túy Sao Thủy | Lam |
| 270 | Tinh túy Sao Kim | Vàng |
| 280 | Tinh túy Sao Hỏa | Đỏ |
| 290 | Tinh túy Sao Mộc | Lục |
| 300 | Tinh túy Sao Thổ | Nâu |
| 310 | Tinh túy Sao Thiên Vương | Bạc |
| 320 | Tinh túy Sao Hải Vương | Tím |
| 330 | Tinh túy Mặt Trăng | Ánh trăng |
| 340 | Tinh túy Mặt Trời | Ánh mặt trời |
| 350 | Tinh túy Hố Đen Vũ Trụ | Đen tím |

## 3. Nguyên tắc sát thương

- Giữ nguyên sát thương theo thông số chính thức.
- Các kỹ năng 99 damage/giây không được tự hạ xuống 9 hoặc 10 damage.
- Sát thương 999 phải được tính là 999.
- Sát thương chuẩn 2000 không được tự chuyển thành sát thương vật lý thông thường.
- Sát thương theo giây phải hoạt động độc lập với FPS.
- Không trừ đạn nhiều lần ngoài chi phí được quy định.
- Không gây sát thương vượt quá điều kiện hợp lệ do hitbox chạy trùng.
- Không tự bỏ qua cơ chế bất tử theo pha, giải đố hoặc phong ấn của Boss khi chưa có quy tắc.

---

# PHẦN VI — KHU VỰC SAO THỦY
## MAP 251–260: MERCURY — VÙNG ĐẤT LƯỠNG CỰC NHIỆT

### 1. Bối cảnh môi trường

Sao Thủy là hành tinh đá nhỏ, đầy những hố thiên thạch và vết nứt cổ đại.

**Thiết kế:**
- Nền đất xám đen.
- Những hố va chạm khổng lồ.
- Các vách đá bị thiên thạch bào mòn.
- Mặt Trời xuất hiện lớn trên bầu trời.
- Những vùng đá dưới ánh nắng chói chang.
- Những khu vực tối lạnh nằm trong bóng các vách đá hoặc miệng hố.
- Có thể tạo tương phản nóng/lạnh bằng bố cục hai phía của sân đấu.

Các dòng chất lỏng bạc phát sáng được xem là vật chất kim loại giả tưởng do quái vật tạo ra, không mô tả thành sông thủy ngân tự nhiên trên Sao Thủy.

### 2. QUÁI THƯỜNG

**QUÁI 1 — MERCURIAN PYRO-SLUG**

Sinh vật sên ngoài hành tinh.

Ngoại hình:
- Thân mềm dạng khối.
- Vỏ phủ kim loại lỏng.
- Các đường sáng bạc.
- Mắt và xúc tu nhỏ.

Cơ chế:
- Bò qua mặt đất.
- Để lại vệt kim loại độc.
- Người chơi bước lên vệt sẽ bị làm chậm.
- Đồng thời chịu sát thương duy trì theo cấu hình.

Không cho vệt độc tồn tại vĩnh viễn ngoài thời gian được thiết lập.

**QUÁI 2 — SOLAR FLARE SPECTER**

U linh năng lượng bức xạ.

- Cơ thể gần như trong suốt.
- Phát sáng vàng cam.
- Có khả năng biến mất.
- Xuất hiện bất ngờ gần người chơi.
- Tấn công theo hành vi được cấu hình.

Không tự tạo sát thương bức xạ kéo dài chưa được quy định.

**QUÁI 3 — CRATER BURROWER**

Bọ hố thiên thạch.

- Ngoại hình giáp đá.
- Ẩn trong các miệng hố.
- Phát hiện người chơi.
- Phóng những mảnh đá nóng về mục tiêu.

Mỗi viên đá phải có hitbox và quỹ đạo hợp lệ.

**QUÁI 4 — LIVING CINNABAR**

Quái quặng thần sa sống.

- Cơ thể hình khối đỏ sẫm.
- Bề mặt giống khoáng vật.
- Khi HP về 0, vỡ thành đúng 3 mảnh quái nhỏ hơn.
- Mỗi mảnh có thể hoạt động theo AI riêng.

Không cho quái con tiếp tục sinh ra vô hạn nếu chưa có cấu hình.

**QUÁI 5 — MOLTEN CORE DRONE**

Drone cổ đại bị tha hóa.

- Thân cơ khí góc cạnh.
- Bay trên không.
- Lõi năng lượng nóng sáng.
- Phóng laser nhiệt cắt ngang màn hình.

Laser phải có cảnh báo và không gây sát thương nhiều lần ngoài ý muốn.

### 3. BOSS 260 — HERMES FLAME-CORE COLOSSUS

**Ngoại hình:**
- Khổng lồ hợp thành từ đá thiên thạch.
- Có các dòng kim loại lỏng chạy qua cơ thể.
- Lõi năng lượng nóng phát sáng.
- Hai tay cực lớn.

**SKILL 1 — CHẤN ĐỘNG THỦY NGÂN**

Boss đập tay xuống đất.

- Một sóng xung kích dạng kim loại lỏng lan qua toàn bộ đấu trường.
- Người chơi phải xử lý bằng cơ chế né hoặc phòng thủ hợp lệ.
- Không tự đặt mức sát thương.

**SKILL 2 — MƯA THIÊN THẠCH RỰC LỬA**

- Boss triệu hồi nhiều thiên thạch.
- Những điểm rơi được cảnh báo.
- Thiên thạch rơi xuống khu vực người chơi.
- Tạo hiệu ứng va đập và cháy sáng.

Số thiên thạch, hồi chiêu và sát thương chưa được xác định.

### 4. PHẦN THƯỞNG — TINH TÚY SAO THỦY

**Biểu tượng:** Viên đá hình thoi màu lam.

**Kỹ năng:** Dòng Nước Cao Áp.

- Tấn công bằng dòng nước áp suất lớn.
- Phạm vi tối đa: 1/2 map.
- Thời gian duy trì: 5 giây.
- Sát thương: 99 damage mỗi giây.
- Chi phí: 20 viên đạn cho một lượt sử dụng.

**Lưu ý:**
- Chi phí 20 đạn tính theo một lượt, không phải 20 đạn mỗi giây.
- Tổng thời lượng hiệu lực là 5 giây.
- Không tự kéo dài kỹ năng khi người chơi tiếp tục giữ nút tấn công.
- Hồi chiêu chưa được quy định.

---

# PHẦN VII — KHU VỰC SAO KIM
## MAP 261–270: VENUS — ĐỊA NGỤC NHÀ KÍNH

### 1. Chuyển cảnh

Sau khi đánh bại Hermes:
- UFO xuất hiện.
- Hút người chơi bằng chùm sáng.
- Bay rời Sao Thủy.
- Tiến vào bầu khí quyển dày của Sao Kim.
- Hạ xuống nền đá núi lửa.
- Kích hoạt map 261.

### 2. Bối cảnh

- Bầu trời vàng cam.
- Không khí mờ đục.
- Mây axit sulfuric dày ở các lớp khí quyển phía trên.
- Núi lửa và đồng bằng đá.
- Những cột khói nhiệt.
- Các cấu trúc lưu huỳnh phát sáng.
- Sét và vệt sáng axit giả tưởng xuất hiện ở hậu cảnh.

Tạo cảm giác ngột ngạt và áp suất lớn nhưng không giảm hiệu năng bằng hiệu ứng blur quá mạnh.

### 3. QUÁI THƯỜNG

**QUÁI 1 — VENUTIAN ACID-STALKER**

- Alien bốn chân cao.
- Thân giáp lưu huỳnh.
- Phóng tia axit.
- Axit ăn mòn giáp và làm giảm sát thương của người chơi.

Mức giảm giáp và sát thương chưa được xác định.

**QUÁI 2 — SULFUR GOLEM**

- Golem đá lưu huỳnh.
- Di chuyển nặng nề.
- Có khả năng hóa cứng.
- Chặn toàn bộ đạn trong 2 giây khi trạng thái hóa cứng hợp lệ.

Không tự mở rộng 2 giây thành bất tử vĩnh viễn.

**QUÁI 3 — GREENHOUSE SPORE**

- Bào tử trôi nổi.
- Khi kích hoạt sẽ tự phát nổ.
- Tạo đám mây axit.
- Đám mây che khuất tầm nhìn.

Không tự đặt mức sát thương hoặc thời gian tồn tại.

**QUÁI 4 — VESPER SKIMMER**

- Sinh vật cơ khí sinh học dạng chim.
- Bay nhanh.
- Lao lướt về phía người chơi.
- Tấn công bằng chuyển động tốc độ cao.

**QUÁI 5 — CORROSIVE WISP**

- Thực thể năng lượng axit.
- Lơ lửng trong không khí.
- Tự tìm tới người chơi.
- Gây tác động ăn mòn khi tiếp xúc hợp lệ.

### 4. BOSS 270 — APHRODITE ACID-STORM QUEEN

Ngoại hình:
- Nữ hoàng nửa sinh học, nửa năng lượng nhiệt.
- Cơ thể được bao quanh bởi bão axit vàng.
- Có những cánh tay hoặc cấu trúc năng lượng phục vụ tấn công.

**SKILL 1 — VÒI BÃO AXIT**

- Boss tạo vòi xoáy axit.
- Vòi bão di chuyển dọc khu vực chiến đấu.
- Người chơi phải né vùng xoáy.

**SKILL 2 — MƯA AXIT**

- Các giọt axit rơi từ phía trên.
- Có vùng cảnh báo.
- Tạo những khu vực nguy hiểm khi chạm đất.

Không tự đặt sát thương hoặc hồi chiêu.

### 5. PHẦN THƯỞNG — TINH TÚY SAO KIM

**Biểu tượng:** Viên đá hình thoi màu vàng.

**Kỹ năng:** Ngưng Đọng Không Gian.

- Thời gian duy trì: 5 giây.
- Hồi chiêu: 10 giây.

Trong trạng thái này:
- Người chơi có thể lướt xuyên qua quái để tiêu diệt chúng ngay lập tức.
- Hoặc chuyển sang một dạng vũ khí khác để tung đòn có sức sát thương đủ kết liễu quái chỉ bằng một đòn.

**Yêu cầu:**
- Phải nhận biết chính xác trạng thái đang sử dụng vũ khí nào.
- Không làm hỏng chuyển vũ khí bằng F.
- Không tự áp dụng kết liễu tức thời lên Boss đang ở pha bất khả xâm phạm hoặc có cơ chế giải đố.
- Quy tắc sát thương kết liễu đối với Boss chưa được chốt.
- Không tự cộng thêm 5 giây cho từng lần chuyển vũ khí.

---

# PHẦN VIII — KHU VỰC SAO HỎA
## MAP 271–280: MARS — ĐẾ CHẾ SẮT ĐỎ

### 1. Chuyển cảnh

Sau Boss 270, UFO đưa người chơi từ Sao Kim sang Sao Hỏa và hạ cánh tại map 271.

### 2. Bối cảnh

- Sa mạc đỏ.
- Đá và bụi chứa oxit sắt.
- Bầu trời mờ do bụi.
- Các cồn cát.
- Hố thiên thạch cổ.
- Olympus Mons xuất hiện ở xa.
- Những tàn tích kim loại gỉ sét thuộc nền văn minh giả tưởng.
- Các trận bão bụi đỏ.

### 3. QUÁI THƯỜNG

**QUÁI 1 — MARTIAN DUST-WORM**

- Sâu cát đỏ khổng lồ.
- Giáp bọc oxit sắt.
- Chui từ lòng đất lên.
- Phun bão cát làm mờ tầm nhìn.
- Có thể lặn xuống cát để di chuyển.

**QUÁI 2 — IRON-OXIDE BERSERKER**

- Robot gỉ sét.
- Thân cơ khí nặng.
- Cầm lưỡi cưa nhiệt đỏ.
- Tiếp cận người chơi và tấn công cận chiến.

**QUÁI 3 — PHOBOS DRONE**

- Drone trinh sát.
- Bay trên không.
- Di chuyển theo đường ziczac.
- Xả đạn liên tục về phía người chơi.

**QUÁI 4 — DUST DEVIL ELEMENTAL**

- Linh hồn bão bụi.
- Thân hình cấu tạo từ lốc xoáy đỏ.
- Đẩy văng người chơi khi tiến quá gần.

**QUÁI 5 — ARES SPIDER**

- Nhện cát tám chân.
- Bò trên mặt đất.
- Đặt mìn bụi đỏ.
- Mìn tạo vùng nguy hiểm sau khi kích hoạt.

Không tự thêm hiệu ứng nhiễm độc hoặc kéo máu nếu chưa được quy định.

### 4. BOSS 280 — ARES IRON WARLORD

Ngoại hình:
- Bạo chúa cơ khí gỉ sét khổng lồ.
- Mang giáp sắt đỏ.
- Cầm đại đao năng lượng nhiệt.

**SKILL 1 — BÃO CÁT NHIỆT**

- Triệu hồi các vòng xoáy bụi đỏ.
- Vòng xoáy chứa năng lượng lửa.
- Di chuyển trên sân đấu và gây nguy hiểm khi trúng.

**SKILL 2 — CHẤN ĐỘNG HỎA TINH**

- Boss nhảy lên.
- Dậm mạnh xuống đất.
- Tạo vết nứt lan qua sàn đấu.
- Gây tác động địa chấn trên toàn màn hình.

### 5. PHẦN THƯỞNG — TINH TÚY SAO HỎA

**Biểu tượng:** Viên đá hình thoi màu đỏ.

**Kỹ năng:** Ngọn Lửa Hủy Diệt.

- Phạm vi: 1/2 map.
- Sát thương: 99 damage/giây.
- Chi phí: 20 đạn/lượt.
- Thời gian duy trì: 5 giây.

Không thay đổi những thông số này.

---

# PHẦN IX — KHU VỰC SAO MỘC
## MAP 281–290: JUPITER — ĐẠI DƯƠNG BÃO KHÍ

### 1. Chuyển cảnh

UFO đưa người chơi tới Sao Mộc.

Vì Sao Mộc không có bề mặt rắn, UFO triển khai các nền tảng năng lượng nổi trong tầng mây để người chơi chiến đấu.

### 2. Bối cảnh

- Những dải mây nâu, cam, trắng và đỏ.
- Các tầng khí quyển chuyển động khác tốc độ.
- Vết Đỏ Lớn xuất hiện ở hậu cảnh phía dưới hoặc phía xa.
- Mây cuộn thành những vòng xoáy khổng lồ.
- Sét phát sáng giữa các đám mây.
- Sàn đấu là những nền tảng bay giả tưởng.

Các tia điện hydro lỏng màu lục là hiệu ứng khoa học viễn tưởng, không mô tả thành đặc điểm quan sát trực tiếp đã được xác nhận.

### 3. QUÁI THƯỜNG

**QUÁI 1 — JOVIAN GAS-WHALE**

- Cá voi khí quyển khổng lồ.
- Bơi lơ lửng giữa các tầng mây.
- Có các vùng phát sáng sinh học.
- Phóng sóng âm gây choáng.

**QUÁI 2 — PLASMA EEL**

- Lươn plasma hình tia điện.
- Thân uốn lượn.
- Phóng điện diện rộng.

**QUÁI 3 — VORTEX PHANTOM**

- Quái vật có thân hình lốc xoáy xanh.
- Xung quanh là những mảnh đá bay.
- Tiếp cận mục tiêu bằng chuyển động xoáy.

**QUÁI 4 — JUPITER SPORE**

- Bào tử sống trong các tầng mây.
- Cơ thể phát sáng.
- Có những phần tích điện.
- Hành vi tấn công theo cấu hình, không tự thêm sát thương.

**QUÁI 5 — ATMOSPHERIC WISP**

- Linh hồn khí áp.
- Trôi trong không khí.
- Khi bị phá vỡ, tạo lực hút nhẹ ảnh hưởng đến chuyển động người chơi.

### 4. BOSS 290 — ZEUS THUNDER-GIGA DREADNOUGHT

Ngoại hình:
- Thực thể dạng sứa điện khổng lồ.
- Cơ thể lớn như một ngọn núi.
- Tích tụ điện từ các cơn bão.
- Nhiều xúc tu hoặc các cấu trúc điện.

**SKILL 1 — THIÊN LÔI LỤC SẮC**

- Triệu hồi các cột sét xanh lục.
- Sét đánh từ phía trên màn hình.
- Các vùng nguy hiểm có cảnh báo.

**SKILL 2 — SÓNG ÁP SUẤT CỰC ĐẠI**

- Boss quạt mạnh phần đuôi.
- Tạo một luồng áp suất lớn.
- Sóng áp suất lan về phía người chơi.

### 5. PHẦN THƯỞNG — TINH TÚY SAO MỘC

**Biểu tượng:** Viên đá hình thoi màu lục.

**Kỹ năng:** Dây Leo Đại Địa.

- Triệu hồi những dây leo đâm lên từ nền tảng chiến đấu.
- Phạm vi: 1/2 map.
- Sát thương: 99 damage mỗi lần trúng.
- Chi phí: 20 đạn/lượt.
- Duy trì: 5 giây.

Không nhầm 99 damage mỗi lần trúng thành 99 damage/giây.

Trong môi trường không có đất, các dây leo là cấu trúc năng lượng giả tưởng trồi lên từ bệ chiến đấu.

---

# PHẦN X — KHU VỰC SAO THỔ
## MAP 291–300: SATURN — VƯƠNG QUỐC VÀNH ĐAI

### 1. Chuyển cảnh

UFO đưa người chơi tới hệ vành đai Sao Thổ.

Sân đấu được tạo từ những khối băng đá lớn và nền tảng nhân tạo, không coi toàn bộ vành đai là một bề mặt đặc.

### 2. Bối cảnh

- Sao Thổ vàng nhạt khổng lồ ở hậu cảnh.
- Những dải vành đai băng trải dài.
- Các khối băng phản chiếu ánh sáng.
- Đá vụn di chuyển với vận tốc khác nhau.
- Không gian có chiều sâu và các mảnh thiên thạch trôi nổi.

### 3. QUÁI THƯỜNG

**QUÁI 1 — SATURNIAN RING-CRAFTER**

- Alien kết tinh từ băng và kim loại.
- Có thể điều khiển các tảng băng bằng lực từ giả tưởng.
- Ném băng về phía người chơi.

**QUÁI 2 — FROST CRYSTAL GOLEM**

- Golem đá băng lớn.
- Có lớp giáp pha lê.
- Phản xạ 50% sát thương đạn bắn từ phía trước.

Không áp dụng phản xạ tương tự với những đòn từ phía sau nếu chưa được yêu cầu.

**QUÁI 3 — TITAN METHANE LEECH**

- Sinh vật dạng đỉa.
- Mang đặc trưng vật chất methane từ Titan.
- Hút đạn của người chơi.
- Chuyển lượng đạn hấp thụ thành phục hồi HP.

Tỷ lệ chuyển đổi chưa được xác định.

**QUÁI 4 — RING ASTEROID SENTIENT**

- Tảng đá sống.
- Ẩn mình giữa các vật thể vành đai.
- Giả làm chướng ngại vật.
- Bất ngờ thức tỉnh khi có điều kiện.

**QUÁI 5 — RING-RIDER DRONE**

- Drone trượt trên quỹ đạo vành đai.
- Bay với tốc độ cao.
- Phóng tên lửa đóng băng.

### 4. BOSS 300 — CHRONOS ICE-TITAN

Ngoại hình:
- Khổng lồ được tạo từ rất nhiều tảng băng đá.
- Các mảnh băng xoay quanh lõi năng lượng màu nâu.
- Tay chân hình thành từ những khối băng liên kết.

**SKILL 1 — VÀNH ĐAI PHÒNG NGỰ**

- Các mảnh băng xoay quanh Boss.
- Chặn đạn theo va chạm hợp lệ.
- Tạo một lớp phòng thủ chuyển động.

**SKILL 2 — THẠCH BĂNG LĂN**

- Boss phóng các khối đá băng lớn.
- Đá lăn dọc theo đường đi trong sân đấu.
- Gây sát thương khi trúng.

### 5. PHẦN THƯỞNG — TINH TÚY SAO THỔ

**Biểu tượng:** Viên đá hình thoi màu nâu.

**Kỹ năng:** Tam Thạch Lăn.

- Triệu hồi đúng 3 viên đá.
- Các viên đá lăn liên tiếp theo hướng tấn công.
- Mỗi viên gây 20 damage khi trúng.
- Không tiêu hao đạn.

Không tự thêm chi phí tài nguyên khác.

Hồi chiêu chưa được quy định.

---

# PHẦN XI — KHU VỰC SAO THIÊN VƯƠNG
## MAP 301–310: URANUS — VƯƠNG QUỐC BĂNG PHA LÊ

### 1. Chuyển cảnh

Sau Boss 300, UFO đưa người chơi tới Sao Thiên Vương.

Tại khu vực này, UFO tạo những nền tảng băng năng lượng lơ lửng trong khí quyển.

### 2. Bối cảnh

- Màu xanh cyan nhạt.
- Những dải mây lạnh.
- Ánh sáng Mặt Trời rất yếu.
- Nhiều khối pha lê xanh và bạc.
- Các cấu trúc băng methane và ammonia giả tưởng.
- Bố cục hậu cảnh nghiêng gợi liên tưởng đến trục tự quay lệch khoảng 98° của Sao Thiên Vương.

Không bắt buộc xoay vật lý điều khiển người chơi 98°.

### 3. QUÁI THƯỜNG

**QUÁI 1 — URANIAN FROST-BENDER**

- Alien pha lê trong suốt.
- Có khả năng lướt rất nhanh.
- Di chuyển trên các dòng năng lượng lạnh.
- Tạo những ảo ảnh đóng băng để đánh lừa người chơi.

**QUÁI 2 — METHANE PHANTOM**

- Bóng ma methane lạnh.
- Phát ra luồng khí lạnh.
- Khi tiến gần làm giảm tốc độ di chuyển của nhân vật.

**QUÁI 3 — CYAN FROST GUARD**

- Kị sĩ băng.
- Mang khiên tuyết dày.
- Sử dụng khiên để chặn đạn.

**QUÁI 4 — ICE-CLUSTER MINE**

- Mìn băng bay lơ lửng.
- Khi kích hoạt, phát nổ thành nhiều mảnh băng.
- Các mảnh băng có hitbox riêng nếu được cấu hình.

**QUÁI 5 — AURORA JELLYFISH**

- Sứa cực quang.
- Cơ thể xanh phát sáng.
- Thả những luồng điện cực lạnh từ phía dưới.

### 4. BOSS 310 — OURANOS FROST KNIGHT KING

Ngoại hình:
- Vua kị sĩ băng.
- Giáp pha lê bạc.
- Mũ giáp góc cạnh.
- Cầm trường thương băng dài.

**SKILL 1 — BĂNG THƯƠNG VĨNH CỬU**

- Boss đâm trường thương.
- Tạo đường băng trên sàn đấu.
- Người chơi trúng đòn bị đóng băng hoặc dính chặt theo cấu hình.

**SKILL 2 — MƯA BĂNG BẠC**

- Các mũi băng xuất hiện phía trên.
- Rơi dọc khu vực gameplay.
- Gây sát thương khi trúng.

### 5. PHẦN THƯỞNG — TINH TÚY SAO THIÊN VƯƠNG

**Biểu tượng:** Viên đá hình thoi màu bạc.

**Kỹ năng:** Song Kị Sĩ Hộ Vệ.

- Triệu hồi chính xác 2 kị sĩ.
- Mỗi kị sĩ có 20 HP.
- Hai kị sĩ bảo vệ người chơi.
- Hồi chiêu kỹ năng: 10 giây.

Cần kiểm soát số kị sĩ tồn tại. Không tự tạo một đội quân tăng vô hạn sau nhiều lần nhấn nếu chưa có quy tắc.

Sát thương và thời gian tồn tại của kị sĩ chưa được xác định.

---

# PHẦN XII — KHU VỰC SAO HẢI VƯƠNG
## MAP 311–320: NEPTUNE — TÂM BÃO VỰC THẲM

### 1. Chuyển cảnh

UFO rời Sao Thiên Vương và đưa người chơi tới Sao Hải Vương.

Các nền tảng chiến đấu được tạo bằng trường năng lượng trong tầng khí quyển.

### 2. Bối cảnh

- Xanh cobalt.
- Các dải mây trắng mỏng.
- Gió mạnh.
- Những vòng xoáy tối.
- Hiệu ứng một cơn bão lớn lấy cảm hứng từ Great Dark Spot.
- Các nền tảng bị gió tác động nhẹ.

Không mặc định Great Dark Spot là một cơn bão cố định tồn tại vĩnh viễn; hình ảnh này là cảm hứng nghệ thuật từ những xoáy bão từng được quan sát.

### 3. QUÁI THƯỜNG

**QUÁI 1 — NEPTUNIAN ABYSSAL SIREN**

- Siren ngoài hành tinh.
- Có đuôi năng lượng tím.
- Phát sóng âm.
- Có khả năng hút hoặc đẩy người chơi.

**QUÁI 2 — STORM LEVIATHAN**

- Rồng biển phong bão.
- Cơ thể dài.
- Bay giữa các luồng khí.
- Tấn công bằng chuyển động uốn lượn và bão.

**QUÁI 3 — TRITON ICE-DEMON**

- Quỷ băng từ Triton.
- Cơ thể màu xanh tím.
- Bắn đạn băng tím xuyên thấu theo cấu hình va chạm.

**QUÁI 4 — DARK-SPOT VOIDLING**

- Thực thể hư không.
- Có khả năng hấp thụ đạn.
- Khi hấp thụ, tăng kích thước.

Không tự đặt hệ số tăng trưởng hoặc giới hạn kích thước.

**QUÁI 5 — SONIC WIND WRAITH**

- Bóng ma cuồng phong.
- Thân hình tạo từ các dòng khí xoáy.
- Di chuyển nhanh theo chuyển động gió.

### 4. BOSS 320 — POSEIDON TEMPEST OVERLORD

Ngoại hình:
- Thủy quái khổng lồ.
- Cầm đinh ba năng lượng tím.
- Điều khiển các trường lực hút và đẩy giả tưởng.

**SKILL 1 — TRỌNG TRƯỜNG HÚT**

- Boss tạo vùng hút lớn.
- Người chơi bị kéo về phía tâm.
- Các vật thể chịu tác động của lực hút theo cấu hình.

**SKILL 2 — TRỌNG TRƯỜNG ĐẨY**

- Sau hoặc xen kẽ trạng thái hút, Boss phát ra lực đẩy mạnh.
- Người chơi bị hất văng.
- Áp dụng sát thương chí mạng theo cấu hình.

Không tự đặt giá trị sát thương của Boss vì tài liệu chưa quy định con số.

### 5. PHẦN THƯỞNG — TINH TÚY SAO HẢI VƯƠNG

**Biểu tượng:** Viên đá hình thoi màu tím.

**Kỹ năng:** Thực Thể Hút Đẩy.

- Thời gian tác dụng: 15 giây.
- Chuyển trạng thái mỗi 2 giây.

**TRẠNG THÁI HÚT:**
- Tác động lên kẻ địch trong toàn màn hình.
- Hút mục tiêu về phía người chơi.
- Gây 2 damage.
- Gây choáng.

**TRẠNG THÁI ĐẨY:**
- Đẩy mạnh kẻ địch ra xa.
- Gây 999 damage.

Phải quản lý bộ đếm 15 giây và các lần chuyển trạng thái độc lập.

Không tiếp tục gây sát thương sau khi kỹ năng đã hết thời gian tác dụng.

Thời gian choáng và hồi chiêu tổng thể chưa được xác định.

---

# PHẦN XIII — KHU VỰC MẶT TRĂNG
## MAP 321–330: MOON — PHÁN XÉT NGUYỆT ẢNH

### 1. Chuyển cảnh

Sau Boss 320, UFO đưa người chơi tới Mặt Trăng của Trái Đất.

UFO đáp xuống một vùng địa hình đá an toàn tại map 321.

### 2. Bối cảnh

- Mặt đất xám.
- Bụi regolith.
- Những hố va chạm.
- Các vách đá khô.
- Bầu trời gần như đen.
- Trái Đất xuất hiện ở xa, tùy vị trí quan sát.
- Có những dấu tích thám hiểm Apollo.
- Các công trình nghiên cứu bị bỏ hoang là yếu tố giả tưởng của cốt truyện game.

### 3. QUÁI THƯỜNG

**QUÁI 1 — LUNAR SHADOW-STALKER**

- Alien đen tuyền.
- Đôi mắt bạc.
- Viền cơ thể hình trăng khuyết.
- Có khả năng ẩn vào bóng tối để né đạn.

**QUÁI 2 — REGOLITH GOLEM**

- Golem bụi đá.
- Có thể gom các mảnh đá lại thành cơ thể.
- Ném đá trong điều kiện trọng lực thấp.

**QUÁI 3 — APOLLO MALFUNCTIONING MECH**

- Robot thám hiểm bị lỗi do yếu tố viễn tưởng.
- Thân cơ khí cũ.
- Xả đạn liên tục.

**QUÁI 4 — CRESCENT WISP**

- Linh hồn trăng khuyết.
- Bay trong không trung.
- Chiếu tia băng giá.

**QUÁI 5 — POLAR ICE BEETLE**

- Bọ băng.
- Ẩn dưới các vùng hố lạnh ở cực Mặt Trăng.
- Trồi lên để tấn công theo cấu hình.

### 4. BOSS 330 — SELENE LUNAR JUDGE

Ngoại hình:
- Nữ thần cơ khí.
- Đôi cánh năng lượng bạc.
- Cầm đại đao lưỡi liềm phát sáng.

**SKILL 1 — TRĂNG KHUYẾT PHÁN QUYẾT**

- Boss chém ra những sóng năng lượng hình lưỡi liềm.
- Sóng di chuyển qua sân đấu.
- Gây sát thương khi va chạm.

**SKILL 2 — BĂNG GIÁ NGƯNG ĐỌNG**

- Boss triệu hồi những vùng băng.
- Có thể khiến người chơi đóng băng hoặc chịu hiệu ứng lạnh theo cấu hình.

### 5. PHẦN THƯỞNG — TINH TÚY MẶT TRĂNG

**Biểu tượng:** Viên đá Mặt Trăng.

**Trạng thái:** PHÁN QUYẾT.

Khi trang bị hoặc cầm Tinh túy:
- Phía sau nhân vật xuất hiện Mặt Trăng lưỡi liềm.
- Nhân vật nhận thêm 50 HP theo quy tắc trạng thái.
- Mỗi chưởng lực được cộng thêm 5 sát thương.
- Nút bắn chuyển thành Chưởng Lực Mặt Trăng.

**CHƯỞNG LỰC MẶT TRĂNG:**
- Phóng ra năng lượng trăng.
- Khi trúng quái, tạo vụ nổ nhỏ.
- Có 25% tỷ lệ đóng băng.

**Lưu ý:**
- 25% là xác suất đóng băng trên một lần tác động hợp lệ, không phải đóng băng chắc chắn.
- Thời gian đóng băng chưa được xác định.
- Quy tắc cộng và gỡ 50 HP phải rõ ràng để tránh cộng dồn vô hạn khi chuyển vũ khí.
- Thời gian duy trì trạng thái Phán Quyết chưa được chỉ định.

---

# PHẦN XIV — KHU VỰC MẶT TRỜI
## MAP 331–340: SUN — ĐẾ CHẾ PLASMA

### 1. Chuyển cảnh

Sau Boss 330, UFO đưa người chơi tiến gần Mặt Trời.

Vì Mặt Trời không có bề mặt rắn, không thực hiện hoạt ảnh đáp xuống như hành tinh đá.

Thay vào đó:
- UFO kích hoạt trường bảo vệ nhiệt giả tưởng.
- Triển khai một sân đấu năng lượng.
- Người chơi được đưa vào khu vực chiến đấu lơ lửng phía trên lớp plasma.

### 2. Bối cảnh

- Biển plasma đỏ, cam và vàng.
- Các quầng lửa khổng lồ.
- Những vòng từ trường phát sáng.
- Vết đen Mặt Trời hiện lên trên nền plasma.
- Các cột năng lượng phun trào.
- Ánh sáng mạnh nhưng không được che HUD.

### 3. QUÁI THƯỜNG

**QUÁI 1 — SOLAR CORE ELEMENTAL**

- Alien năng lượng dạng phượng hoàng.
- Cơ thể plasma nóng.
- Phóng luồng năng lượng gamma giả tưởng.
- Đòn đánh có đường đi rõ.

**QUÁI 2 — PROMINENCE DRAGON**

- Rồng quầng lửa.
- Thân dài.
- Bay trong biển plasma.
- Phun bão lửa.

**QUÁI 3 — SUNSPOT SHADOW-FIEND**

- Quỷ bóng tối từ vùng vết đen.
- Cơ thể đen đỏ.
- Có khả năng giảm sát thương nhận vào.

**QUÁI 4 — NUCLEAR FUSION PARASITE**

- Ký sinh trùng plasma.
- Khi bị bắn, kích thước tăng lên theo cơ chế riêng.

Không tự khiến quái bất tử nếu chưa có điều kiện tăng trưởng.

**QUÁI 5 — PHOTON PHOENIX**

- Phượng hoàng ánh sáng.
- Lao nhanh về phía người chơi.
- Thực hiện đòn cảm tử khi tiếp xúc hợp lệ.

### 4. BOSS 340 — HELIOS SOLAR EMPEROR

Ngoại hình:
- Phượng hoàng Plasma khổng lồ.
- Mang dáng vẻ hoàng đế.
- Lửa bao quanh cơ thể.
- Sải cánh rất lớn.

**SKILL 1 — BÃO HẠT NHÂN**

- Boss phát ra bão năng lượng.
- Vùng nóng bao phủ sân đấu.
- Gây nguy hiểm trên diện rộng.

**SKILL 2 — TIA NẮNG TỐI THƯỢNG**

- Boss tụ năng lượng.
- Phóng những chùm tia cực mạnh.
- Đòn có đặc tính không thể chặn theo thiết kế gốc.
- Phải xác định rõ cơ chế tránh đòn tương ứng.

Không tự làm tia xuyên qua mọi trạng thái miễn nhiễm hoặc cơ chế đặc biệt của trò chơi nếu chưa được thiết lập.

### 5. PHẦN THƯỞNG — TINH TÚY MẶT TRỜI

**Biểu tượng:** Viên đá Mặt Trời.

**Trạng thái:** TỐI THƯỢNG.

Khi cầm Tinh túy:
- Phía sau người chơi xuất hiện Mặt Trời rực lửa.
- Người chơi nhận thêm 50 HP theo quy tắc trạng thái.
- Mỗi chưởng lực được cộng thêm 5 sát thương.
- Nút bắn chuyển thành Chưởng Lực Mặt Trời.

**CHƯỞNG LỰC MẶT TRỜI:**
- Phóng năng lượng mặt trời.
- Tạo vụ nổ nhỏ khi trúng quái.
- Áp dụng trạng thái Thiêu Đốt.

**THIÊU ĐỐT:**
- Sát thương: 3 damage/giây.
- Thời gian: 2 giây.

Không tự kéo dài thời gian Thiêu Đốt hoặc cộng dồn vô hạn khi chưa có quy tắc.

Nếu người chơi chuyển giữa Tinh túy Mặt Trăng và Mặt Trời, không để hai trạng thái +50 HP cộng dồn sai.

---

# PHẦN XV — KHU VỰC HỐ ĐEN VŨ TRỤ
## MAP 341–350: BLACK HOLE — TẬN CÙNG KHÔNG-THỜI GIAN

### 1. Chuyển cảnh

Sau Boss 340, UFO rời vùng Mặt Trời và tiến vào khu vực không gian có Hố Đen.

Hoạt ảnh:
1. Không gian tối dần.
2. Các ngôi sao bắt đầu bị bẻ cong hình ảnh.
3. Một đĩa sáng xoay quanh vùng tối xuất hiện.
4. UFO tiến gần vùng trường hấp dẫn mạnh.
5. Trường bảo vệ kích hoạt.
6. Một đấu trường năng lượng được triển khai bên ngoài chân trời sự kiện.
7. Người chơi bước vào map 341.

Không mô tả nhân vật vượt qua chân trời sự kiện rồi tự bay trở lại bằng vật lý thông thường.

### 2. Bối cảnh

- Trung tâm là bóng tối của Hố Đen.
- Đĩa bồi tụ phát sáng.
- Các tia sáng bị uốn cong.
- Những mảnh thiên thạch lơ lửng.
- Các vật thể giả tưởng bị biến dạng bởi lực thủy triều.
- Màu chủ đạo tím, đen và trắng xanh.

### 3. QUÁI THƯỜNG

**QUÁI 1 — SINGULARITY VOID-EATER**

- Alien dị hình.
- Cơ thể làm bẻ cong ánh sáng.
- Có giáp Hư Không.
- Kháng mọi hiệu ứng khống chế theo thiết kế.
- Khi đến gần làm chậm thời gian chuyển động của người chơi.

Không nhầm kháng khống chế với miễn toàn bộ sát thương.

**QUÁI 2 — SPAGHETTI-FIED CONSTRUCT**

- Sinh vật có cơ thể bị kéo dài.
- Các chi mảnh và cực dài.
- Có khả năng tấn công từ khoảng cách xa.

**QUÁI 3 — TIME-WARP SPECTER**

- Bóng ma biến dạng thời gian.
- Tác động lên đạn của người chơi.
- Có thể khiến đạn đang bay bị tua ngược quỹ đạo.

Đạn phải được quản lý bằng vị trí và vận tốc hợp lệ, không nhân đôi đạn vô hạn.

**QUÁI 4 — EVENT HORIZON PARASITE**

- Ký sinh chân trời sự kiện.
- Tạo một hố đen nhỏ.
- Hố đen hút đạn của người chơi.

Không áp dụng hút HP nếu chưa được quy định.

**QUÁI 5 — GRAVITATIONAL ANOMALY**

- Khối cầu dị thường trọng lực.
- Phát sáng tím trắng.
- Phóng năng lượng hỗn mang.
- Có thể ảnh hưởng vật thể trong phạm vi theo cấu hình.

### 4. FINAL BOSS 350 — ABYSSAL SINGULARITY SOVEREIGN

**Danh hiệu:** Chúa Tể Hố Đen Vũ Trụ.

**Ngoại hình:**
- Thực thể dị hình siêu khổng lồ.
- Cơ thể có hình khối méo mó.
- Được bao phủ bởi ánh sáng đĩa bồi tụ.
- Hai mắt giống các điểm kỳ dị.
- Những vòng năng lượng xoay xung quanh.
- Màu tím hư không và đen tuyền.

Boss phải tạo cảm giác quyền lực và nguy hiểm hơn tất cả những sinh vật ở chín khu vực trước.

### SKILL 1 — HÚT HƯ KHÔNG

Quy trình:
1. Boss phát sáng tại vùng lõi.
2. Tạo trường lực hút lớn.
3. Hút toàn bộ đạn đang bay hợp lệ về trung tâm.
4. Kéo người chơi về phía vùng Hố Đen.
5. Khi mục tiêu ở trong vùng nguy hiểm, gây sát thương liên tục.

Yêu cầu:
- Sát thương theo thời gian phải độc lập FPS.
- Không dịch chuyển người chơi ngay lập tức vào tâm.
- Lực hút phải có giới hạn vận tốc.
- Giá trị sát thương/giây chưa được xác định.

### SKILL 2 — XÉ RÁCH THỜI GIAN

1. Boss tạo vùng bẻ cong không-thời gian.
2. Đạn của người chơi đi vào vùng này bị thay đổi quỹ đạo.
3. Đạn có thể bị bắn ngược trở lại.
4. Nếu đạn phản lại trúng nhân vật, áp dụng sát thương theo cấu hình.

Yêu cầu:
- Không tạo bản sao đạn vô hạn.
- Không cho đạn tự phản lại liên tục giữa nhiều vùng.
- Có hiệu ứng dễ nhận biết khi đạn đổi hướng.
- Không tự áp dụng hiệu ứng với mọi loại vũ khí nếu cơ chế đạn không tương thích.

### SKILL 3 — SÓNG XUNG KÍCH DIỆT VONG

Đây là kỹ năng diện rộng cực mạnh.

Quy trình:
1. Boss bắt đầu tụ lực.
2. Vùng không gian quanh Boss biến dạng.
3. Một số vị trí trú ẩn hoặc vật cản hợp lệ được xác định trên sân đấu.
4. Boss tạo sóng xung kích bao phủ khu vực.
5. Người chơi không kịp trú ẩn chịu sát thương cực lớn.

**Thông số chính thức:**
- Mất 90% lượng máu khi không ẩn nấp thành công.

Cần xác định lượng máu tham chiếu là HP hiện tại hay HP tối đa trong cấu hình; không tự trộn hai cách tính.

**Yêu cầu:**
- Có cảnh báo trước khi sóng xuất hiện.
- Vị trí trú ẩn phải quan sát được.
- Không để toàn bộ sân đấu không có chỗ trú.
- Không biến kỹ năng thành một đòn trúng chắc chắn không thể tránh.

### 5. PHẦN THƯỞNG BOSS 350 — TINH TÚY HỐ ĐEN

**Trạng thái thiết kế:** Phần thưởng đề xuất theo tài liệu, cần được quản lý như cấu hình có thể điều chỉnh.

**Tên vật phẩm:** Viên Đá Hư Không — Singularity Gem.

**Ngoại hình:**
- Viên đá hình thoi.
- Màu đen tuyền.
- Phát ra hào quang tím.

**Tên kỹ năng:** LỖ HỔNG HƯ KHÔNG — VOID EVENT HORIZON.

### Giai đoạn 1 — TRIỆU HỒI

Khi kích hoạt:
- Một Hố Đen thu nhỏ xuất hiện tại trung tâm màn hình.
- Thời gian tồn tại: 8 giây.
- Hồi chiêu: 15 giây.

### Giai đoạn 2 — HẤP THỤ ĐẠN

Trong 8 giây:
- Hố Đen hút đạn của kẻ địch trên màn hình.
- Những viên đạn bị hút được loại bỏ đúng cách.
- Hệ thống chuyển hóa 50% lượng đạn hấp thụ thành giáp ảo.
- Giáp ảo tối đa: 100.

Không làm giáp ảo vượt quá 100.

Quy tắc quy đổi khi số đạn bị hút là số lẻ phải được đặt trong cấu hình.

### Giai đoạn 3 — RÚT SÁT THƯƠNG

Hố Đen gây sát thương liên tục lên quái trong phạm vi hút.

**Sát thương: 50 damage/giây.**

Thời gian tối đa: 8 giây.

Không tính sát thương khi mục tiêu đã nằm ngoài phạm vi hiệu lực hợp lệ.

### Giai đoạn 4 — BÙNG NỔ KẾT THÚC

Sau 8 giây:

1. Hố Đen co vào tâm.
2. Phát sáng mạnh.
3. Năng lượng tích tụ phát nổ.
4. Toàn bộ kẻ địch hợp lệ đang xuất hiện trên màn hình chịu sát thương.

**Sát thương kết thúc: 2000 damage chuẩn.**

Yêu cầu:
- Chỉ phát nổ một lần.
- Không gây 2000 damage trên mỗi frame.
- Không tự trừ đạn nếu chưa quy định.
- Không cho phép nhiều Hố Đen cùng tồn tại ngoài giới hạn được thiết lập.
- Không bỏ qua cơ chế phòng thủ theo pha đặc biệt hoặc trạng thái bất khả xâm phạm cần được xử lý riêng.

---

# PHẦN XVI — PHÂN BỐ QUÁI CHO TOÀN BỘ 100 MÀN

Để việc tăng độ khó mượt mà, sử dụng quy tắc phân bố cho mỗi khu vực gồm 10 màn.

## 1. Cấu trúc 10 màn

Trong mỗi hành tinh hoặc khu vực:

- Màn đầu tiên: Chuyển cảnh đến hành tinh mới và giới thiệu Alien đặc trưng.
- Màn thứ hai và thứ ba: Kết hợp Alien đặc trưng với một quái thường khác.
- Màn thứ tư đến thứ sáu: Giới thiệu các quái còn lại.
- Màn thứ bảy đến thứ chín: Phối hợp tất cả năm loại quái, tăng độ khó bằng tổ hợp hành vi.
- Màn thứ mười: Boss của khu vực.

## 2. Danh sách màn cụ thể

| Khu vực | Giới thiệu | Phối hợp | Cao trào | Boss |
|---|---|---|---|---|
| Sao Thủy | 251–253 | 254–256 | 257–259 | 260 |
| Sao Kim | 261–263 | 264–266 | 267–269 | 270 |
| Sao Hỏa | 271–273 | 274–276 | 277–279 | 280 |
| Sao Mộc | 281–283 | 284–286 | 287–289 | 290 |
| Sao Thổ | 291–293 | 294–296 | 297–299 | 300 |
| Sao Thiên Vương | 301–303 | 304–306 | 307–309 | 310 |
| Sao Hải Vương | 311–313 | 314–316 | 317–319 | 320 |
| Mặt Trăng | 321–323 | 324–326 | 327–329 | 330 |
| Mặt Trời | 331–333 | 334–336 | 337–339 | 340 |
| Hố Đen | 341–343 | 344–346 | 347–349 | 350 |

## 3. Giới hạn

- Không tự tăng HP và sát thương theo cấp khi chưa có công thức cân bằng.
- Không nhân đôi số quái ngoài quy tắc spawn.
- Không gọi Boss trước vào khu vực sau nếu không được yêu cầu.
- Không biến mọi màn thành một trận hỗn chiến có đủ tất cả quái ngay từ đầu.

---

# PHẦN XVII — HỆ THỐNG KHẢ NĂNG ĐẶC BIỆT VÀ TƯƠNG TÁC

## 1. Vũ khí cũ

Giữ nguyên:
- Các vũ khí đã mở khóa ở những map trước.
- Hệ thống đạn.
- Chuyển dạng vũ khí bằng F.
- Song Rìu và đòn nhấn đúp hướng.
- Cầu Chớp với cơ chế tối đa 5 mục tiêu.
- Các kỹ năng và phần thưởng của Hải Vực Quên Lãng.

Không thay đổi cơ chế cũ chỉ để tích hợp Tinh túy mới.

## 2. Trạng thái và hiệu ứng

Tạo hoặc tái sử dụng hệ thống trạng thái:

- `Stunned`: Choáng.
- `Slowed`: Làm chậm.
- `Frozen`: Đóng băng.
- `Burning`: Thiêu Đốt.
- `Corroded`: Ăn mòn.
- `Invisible`: Tàng hình.
- `Hovering`: Lơ lửng.
- `GravityPull`: Hút.
- `GravityPush`: Đẩy.
- `TimeFrozen`: Ngưng đọng không gian.
- `DamageReflection`: Phản xạ sát thương.
- `VirtualShield`: Giáp ảo.
- `InvulnerablePhase`: Pha bất khả xâm phạm đặc biệt.

Các trạng thái phải hoạt động theo thời gian thực, không phụ thuộc FPS.

## 3. Quy tắc tương tác

- Khiên chỉ chặn những đòn hợp lệ theo hệ thống hiện có.
- Đạn phản xạ không được nhân bản vô hạn.
- Đạn bị hấp thụ phải được xóa hợp lệ.
- Sát thương diện rộng chỉ tác động một lần hoặc theo đúng chu kỳ.
- HP và giáp không được rơi xuống giá trị âm nếu hệ thống hiện có không cho phép.
- Những kỹ năng cộng HP phải có cơ chế gỡ hiệu ứng khi kết thúc.
- Không để ngưng đọng thời gian khóa toàn bộ trò chơi, bao gồm UI và bộ đếm không liên quan.
- Không để kỹ năng hút/đẩy kéo nhân vật hoặc quái ra ngoài ranh giới hợp lệ.
- Các kỹ năng có sát thương rất lớn vẫn phải tuân thủ điều kiện chiến thắng và pha đặc biệt của Boss.

---

# PHẦN XVIII — QUẢN LÝ SOURCE CODE VÀ MODULE

Ưu tiên mở rộng các module hiện có.

Các nhóm chức năng đề xuất:

## 1. Hệ thống chuyển cảnh

- `UFOTransitionController`
- `PlanetArrivalSequence`
- `PlanetDepartureSequence`
- `SpaceTravelCutscene`

## 2. Hệ thống môi trường

- `PlanetEnvironment`
- `PlanetGravityConfig`
- `PlanetHazards`
- `FloatingPlatformSystem`

## 3. Hệ thống nhân vật

- `MakemakeAstronautSuit`
- `JetpackController`
- `PlanetaryStatusEffects`

## 4. Hệ thống chiến đấu

- `CosmicEnemyController`
- `PlanetBossController`
- `ProjectileInteractionSystem`
- `ElementalDamageSystem`

## 5. Hệ thống phần thưởng

- `PlanetEssenceInventory`
- `EssenceAbilityController`
- `EssenceCooldownManager`
- `EssenceHUD`

## 6. Hệ thống lưu tiến trình

Cần lưu:
- Map cao nhất đã hoàn thành.
- Khu vực hành tinh hiện tại.
- Những Boss đã đánh bại.
- Bộ đồ Makemake đã mở khóa.
- Các Tinh túy đã thu thập.
- Các vũ khí và phần thưởng cũ.
- Trạng thái chuyển cảnh đã hoàn thành.

Không tạo bản sao hoặc thay thế dữ liệu save hiện có mà không có cơ chế tương thích.

---

# PHẦN XIX — KIỂM THỬ TOÀN BỘ BIG UPDATE

## A. Chuyển cảnh

1. Sau khi đánh bại Makemake, UFO xuất hiện.
2. UFO hút người chơi bằng chùm sáng.
3. Có hoạt ảnh UFO bay vào không gian.
4. Người chơi xuất hiện trong khoang UFO.
5. Map 251 bắt đầu bằng hoạt ảnh đến Sao Thủy.
6. Các màn 261, 271, 281, 291, 301, 311, 321, 331 và 341 có chuyển cảnh UFO chính xác.
7. Không kích hoạt UFO nhiều lần sau khi Boss chết.

## B. Bộ đồ phi hành gia

8. Người chơi nhận Bộ đồ Makemake sau Boss 250.
9. Nhấn J kích hoạt phản lực.
10. Nhân vật có thể lơ lửng quanh giữa màn hình.
11. Điều khiển bắn, khiên và chuyển vũ khí vẫn hoạt động.
12. Các hành tinh có trọng lực và môi trường phù hợp.

## C. Quái vật

13. Mỗi khu vực có đúng năm loại quái được chỉ định.
14. Những khả năng đặc biệt như tàng hình, phân mảnh, hấp thụ đạn, phản xạ sát thương và tua ngược đạn hoạt động đúng.
15. Không có vòng lặp triệu hồi vô hạn.
16. Không có sát thương liên tục sai theo frame.
17. Các quái xuất hiện theo tiến trình tăng độ khó của từng khu vực.

## D. Boss

18. Boss 260 có chấn động kim loại lỏng và mưa thiên thạch.
19. Boss 270 có vòi bão và mưa axit.
20. Boss 280 có bão cát nhiệt và chấn động đất.
21. Boss 290 có sét lục và sóng áp suất.
22. Boss 300 có vành đai băng phòng thủ và đá lăn.
23. Boss 310 có thương băng và mưa băng.
24. Boss 320 chuyển đổi lực hút/đẩy.
25. Boss 330 sử dụng sóng trăng khuyết và đóng băng.
26. Boss 340 sử dụng bão plasma và tia năng lượng tối thượng.
27. Boss 350 sử dụng hút đạn, đảo quỹ đạo đạn và sóng xung kích gây mất 90% HP theo cấu hình tham chiếu.

## E. Phần thưởng

28. Sao Thủy: 99 damage/giây, 5 giây, 20 đạn, 1/2 map.
29. Sao Kim: 5 giây ngưng đọng, 10 giây hồi chiêu.
30. Sao Hỏa: 99 damage/giây, 5 giây, 20 đạn, 1/2 map.
31. Sao Mộc: 99 damage mỗi lần trúng, 5 giây, 20 đạn, 1/2 map.
32. Sao Thổ: 3 viên đá, 20 damage mỗi viên, không tiêu hao đạn.
33. Sao Thiên Vương: 2 kị sĩ, 20 HP mỗi kị sĩ, hồi chiêu 10 giây.
34. Sao Hải Vương: 15 giây, đổi trạng thái sau mỗi 2 giây, hút gây 2 damage và choáng, đẩy gây 999 damage.
35. Mặt Trăng: +50 HP, +5 sát thương mỗi chưởng, 25% đóng băng.
36. Mặt Trời: +50 HP, +5 sát thương mỗi chưởng, Thiêu Đốt 3 damage/giây trong 2 giây.
37. Hố Đen: tồn tại 8 giây, hồi chiêu 15 giây, hấp thụ đạn đổi 50% thành giáp ảo tối đa 100, gây 50 damage/giây và nổ kết thúc 2000 damage chuẩn.

## F. Tương thích

38. Không làm hỏng cơ chế map 1–250.
39. Không làm mất vũ khí cũ.
40. Không thay đổi phím F, R hoặc J ngoài những chức năng được quy định.
41. Không để các buff +50 HP bị nhân vô hạn.
42. Không để đạn bị phản xạ gây vòng lặp.
43. Không làm mất trạng thái lưu tiến trình sau chuyển hành tinh.
44. Không có hitbox vô hình sau khi Boss chết.
45. Không có bộ đếm kỹ năng chạy ngầm sau khi đổi map.
46. Không gây giảm FPS nghiêm trọng khi nhiều hiệu ứng cùng xuất hiện.
47. Hoạt ảnh trên máy tính và mobile vẫn rõ ràng.
48. Người chơi có thể hoàn thành toàn bộ chuỗi map 251–350 theo tiến trình đã định.

---

# PHẦN XX — YÊU CẦU CUỐI CÙNG

Đây là một bản cập nhật lớn, cần triển khai dưới dạng các hệ thống độc lập nhưng liên kết chặt chẽ.

Không gộp toàn bộ code thành một khối gây khó bảo trì.

Ưu tiên thứ tự triển khai:

1. Hệ thống UFO và chuyển cảnh.
2. Bộ đồ phi hành gia Makemake.
3. Hệ thống môi trường từng hành tinh.
4. Hệ thống 50 loại quái thường.
5. Hệ thống 10 Boss.
6. Hệ thống 10 Tinh túy.
7. Tích hợp HUD, vũ khí, khiên và trạng thái.
8. Kiểm thử theo từng cụm 10 map.
9. Kiểm thử toàn bộ 100 map.
10. Kiểm tra tương thích với 250 map trước.

**NGUYÊN TẮC QUAN TRỌNG NHẤT:**

Mọi thông số đã được chỉ định phải giữ đúng tuyệt đối.

Mọi thông số chưa được chỉ định phải được quản lý bằng cấu hình, không tự chốt như một quyết định của người thiết kế.

Các yếu tố thiên văn thực tế là nền tảng cho hình ảnh và môi trường. Những Alien, nền tảng năng lượng, tinh thể, thần linh, UFO và kỹ năng vũ trụ là các yếu tố khoa học viễn tưởng thuộc thế giới game.

**KẾT QUẢ MONG MUỐN:**

Hoàn thiện chương ĐẠI CHIẾN VŨ TRỤ — MAP 251–350 với 100 màn chơi, 10 khu vực, 50 quái thường, 10 Boss, 10 phần thưởng, hệ thống UFO liên hành tinh, Bộ đồ phi hành gia Makemake và các cơ chế chiến đấu mới. Giữ nguyên tính đồng nhất của toàn bộ trò chơi từ map 1 đến map 350.