# Tầng Trung Hải Vực · Màn 171–180

Phần III nối tiếp bản 161–170, giữ cách bơi ngang, phím cấp oxy, hòm tiếp tế, vũ khí và khiên hiện có. Hướng dẫn riêng mở tại màn 171. Sau phần IV/V, Hải Vực Quên Lãng đã có trọn 50 màn 151–200; phần thưởng 180 là Tam Tinh Hải Đăng đúng theo đặc tả phần V, không phải chỉ số tự bổ sung ở phần III.

## Phân bố quái và Mega London

- Màn 171–173: Cá Mập Đầu Búa. Húc mỗi 2 giây, trúng mất 1 HP; không thêm choáng hoặc hút oxy.
- Màn 174–176: thêm Cá Đuối Điện, phóng điện mỗi 10 giây, trúng mất 1 HP và choáng 1 giây.
- Màn 177–179: thêm Cá Kiếm. Dấu báo đúng mép đi vào; một con lao một hướng trong cửa 5 giây rồi được thu hồi khi ra khỏi sân. Cá Kiếm dùng luồng chướng ngại riêng để không chặn chỉ tiêu hạ quái. Giữ điều khiển bơi ngang; có thể bắn hạ, bật khiên hoặc dùng Ngư Nhân để đối phó.
- Màn 180: Mega London, cá mập tiền sử có sẹo, hàm răng sứt và thân xanh đen. Tạo hình dựa trên bản vẽ người chơi cung cấp, cùng ngôn ngữ khối góc cạnh của các loài mới.

**Cắn Âm Thanh:** nhắm vị trí và há hàm báo trước, hồi 15 giây, cắn trúng gây 3 HP. **Sát Thủ Biển Khơi:** hồi 10 giây, lặn khuất đúng 3 giây, báo từ dưới rồi phục kích gây 3 HP; không để hitbox vô hình khi ẩn. **Âm Vang Xung Kích:** gầm 3 giây trong nửa sân, không gây HP trực tiếp; trúng gây choáng và Hoảng Loạn 3 giây, mỗi giây mất 10% oxy hiện có. Khiên dùng cơ chế chặn hiện tại.

**Hung Thần Trỗi Dậy:** HP về 0 chỉ kích hoạt một lần. Boss bất khả xâm phạm trong đúng 5 giây, nước và mắt đỏ lên, giữ những chiêu chiến đấu đã có nhưng không tự hồi máu, tạo sát thương mới hoặc xuyên khiên. Sau cửa này boss mới gục và màn mới có thể hoàn tất. Hiệu ứng và đối tượng tấn công được dọn khi kết thúc hoặc rời màn.

## Hai phần thưởng bổ sung cho boss cũ

**Hóa Ngư Nhân — boss 160:** mở vĩnh viễn sau khi hạ đủ hai bản thể Quái Ngư Song Trảo. R hoặc nút Ngư Nhân dùng một lần mỗi lượt vào màn; thử lại có lượt mới. Chỉ hoạt động dưới nước, kéo dài 10 giây. Đuôi cá thay chân, oxy không hao, không bị ngạt và miễn cả mọi đòn hút oxy của boss theo lựa chọn người chơi. Không tự làm đầy oxy. Miễn sát thương HP từ quái thường, vẫn chịu khống chế và sát thương HP từ boss. Hết biến hình trở lại quy tắc oxy và hình người bình thường.

**Cầu Chớp — boss 170:** mở vĩnh viễn sau khi hạ boss thật Sứa Ma Khổng Lồ. Có trong danh sách đổi nhanh và bảng chọn F trên PC, cùng bảng cảm ứng. Giữ bắn để nối tối đa 5 mục tiêu hợp lệ khác nhau. Được đánh boss theo lựa chọn người chơi, tuân thủ miễn nhiễm, phản đòn và phòng thủ. Đạn tiêu đúng HP thực trừ, bao gồm 0,5 đạn cho 0,5 HP; không tính sát thương thừa, mục tiêu bất tử hoặc đòn bị chặn. Không gây sát thương vượt khả năng chi trả; ngừng khi hết đạn hoặc nhả bắn. Hắc Hóa chỉ cường hóa một đơn vị tấn công, các vũ khí khác không được thêm quyền Lăn Chém.

Tiến trình 160/170 đã hoàn thành trong save cũ tự nhận quyền mở khóa tương ứng. Chỉ mở bản đồ, chọn màn hoặc có mốc tiếp tục không chứng minh đã hạ boss. Link `?test=all` mở toàn bộ quyền trong bộ nhớ để chơi thử, không ghi đè save thật.

## Cấu hình chính thức và tạm cân bằng

`js/predator-sea-config.js` có cờ `provisional:true`. Những con số chính thức nêu trên giữ nguyên. Các giá trị chưa được chốt như kích thước, HP, tốc độ, thời gian báo, tầm, thời gian phục hồi, hồi tiếng gầm và thời gian choáng của tiếng gầm được tách riêng để điều chỉnh sau khi chơi thử. Ở Cân bằng, Mega London tạm có 160 HP; tiếng gầm tạm hồi 12 giây và choáng 1 giây. Tỷ lệ Hoảng Loạn lấy trên oxy hiện tại, theo cùng quy tắc của tầng trước. Tham số Cầu Chớp nằm cùng cấu hình vũ khí, không được coi là chỉ số chính thức.

Các bài kiểm tra chiến dịch đối chiếu toàn bộ dữ liệu màn, vùng và quái 1–170 với bản 4.2.0, kiểm tra phân bố mới, mốc X/O, hướng dẫn, điều kiện cấp thưởng và migration save. Phần V bổ sung quyền ánh sáng tại 180 và bơi tự do tại 190; không tạo thưởng 200. Các bài kiểm tra chiến đấu riêng kiểm tra nhịp chiêu, hitbox, oxy, chi phí đạn thực và dọn trạng thái. Prompt tạo tài nguyên được lưu tại `docs/predator-sea-art-prompts.md`.
