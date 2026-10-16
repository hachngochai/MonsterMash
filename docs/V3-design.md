# V3: phần thưởng boss 10–100

## Phân tích source trước khi triển khai

Game gốc giữ mô phỏng, input, sát thương và lưu dữ liệu trong `js/game.js`. Các nhóm boss có bộ xử lý riêng trong `bosses.js`, `golem.js`, `wolves.js`, `kong.js`, `dragons.js`, `mythic.js`; tạo hình ở `renderer.js`, DOM ở `index.html` và `style.css`.

Các điểm cần sửa: chuẩn hóa save lúc khởi tạo; cấp thưởng sau `killEnemy` xác nhận toàn bộ boss đã chết; điều phối phím/chạm trước input cũ; đưa mọi vũ khí qua cùng cổng sát thương; cập nhật kỹ năng trong thời gian giao chiến; chặn AI và đòn đang chuẩn bị của mục tiêu hóa đá; thêm HUD và bảng chọn. Dracula cần phân thân ngay khi nhận sát thương vượt ngưỡng để một loạt đạn không bỏ qua pha này.

Save cũ chỉ chuyển các màn boss đã hoàn thành thành phần thưởng; chọn màn cao hoặc resume cao không chứng minh đã hạ boss. Khi đã có sổ thưởng V3, trạng thái completed không tự cấp thêm thưởng.

## Các thông số chưa xác định và bộ đã được người dùng chấp thuận

| Hạng mục | Thông số đã chốt |
| --- | --- |
| Xương Phân Ba | 3 xương × 1 sát thương, tốc độ 780px/s, góc −12/0/+12°, tầm 700px, hồi .65s; cần và tiêu hao 3 đạn mỗi lượt |
| Khiên Bất Tử | Nhấn đúp trong .28s, ban đầu có ít nhất 3 khiên, tổng tiêu hao 2; tồn tại 12s, không chồng; không thêm hồi chiêu ngoài chi phí khiên |
| Khiên thường khi nhấn đơn | Bật ngay như cũ; nhấn thứ hai hợp lệ chuyển sang Bất Tử, chi phí lần đầu đã được tính trong tổng 2 khiên |
| Miễn sát thương | Chặn mất HP chiến đấu, kể cả hút máu, thiêu đốt và đòn xuyên khiên; khống chế vẫn có thể xảy ra. Game hiện không có bẫy môi trường gây HP độc lập |
| Nhảy Cao | Nhấn đúp ↑ hoặc nút nhảy trong .28s; đỉnh cao bằng 1.8 lần cú nhảy thường; tăng lực cho chính cú nhảy hiện tại, giữ trọng lực và biên sàn |
| Hắc Hóa | Mỗi 5s giao chiến chuẩn bị một đơn vị sát thương ×2; giữ tới khi dùng, không tích nhiều lần; loạt đạn chỉ một viên. Cận chiến/Lăn Chém chỉ mục tiêu hợp lệ đầu tiên được cường hóa |
| Hút Máu | 10 kẻ địch chết riêng biệt hồi 1 HP, không quá tối đa, đặt về 0; giữ bộ đếm qua màn và tải lại. Tính boss và quái triệu hồi có thể tiêu diệt; không tính quái rút lui/nhện bất tử |
| Chùy Golem | Cận chiến 3 sát thương, tầm 95px từ mép va chạm, hồi .75s, không tốn đạn |
| F | Nhấn ngắn đổi nhanh từ boss 10; giữ .35s mở bảng chọn từ boss 60. Mũi tên chọn, Enter xác nhận; chạm/giữ nút vũ khí dùng cùng bộ xử lý |
| Màn 70 | Toàn màn tạm khóa vũ khí thưởng và hiệu ứng kỹ năng; giữ súng gốc/khiên thường. Trăng Máu cấp sẵn súng ngắm 5 đạn/5 sát thương/.5s và lướt không sát thương ngay lần đánh đầu. Rời màn giữ nguyên trang bị/phần thưởng đã lưu |
| W / S sau boss 80 | Tầm cao 35° / mặt đất, không đổi trang bị; chỉ tác động đường bắn của vũ khí tầm xa. Trước mở khóa vẫn giữ tự ngắm boss trên cao để trận đầu hoàn thành được |
| Cung Hắc Ám | 5 tên × 1 sát thương, tốc độ 900px/s, góc −12/−6/0/+6/+12°, tầm 700px, hồi .9s; cần và tiêu hao 5 đạn |
| Giáo Bạch Kim | 1 bước = 40px tính khoảng cách mép; trong 1 bước đâm 2 sát thương không tốn đạn; ngoài khoảng đó ném 3 sát thương/tốn 1 đạn; tốc độ 900px/s, tầm 700px, hồi .8s |
| Song Rìu thường | Cận chiến 2 sát thương, tầm 80px, hồi .55s, không tốn đạn |
| Lăn Chém | Chỉ trang bị Song Rìu, nhấn đúp cùng hướng trong .28s; .32s, tốc độ 850px/s, hồi .9s; 2 sát thương cơ bản mỗi mục tiêu một lần; không xếp hàng hoặc kích hoạt lướt thường cùng lúc |
| Hóa Đá | Mỗi 8s chọn ngẫu nhiên quái thường/quái triệu hồi hợp lệ còn sống, đóng băng di chuyển và tấn công 2s; không tác dụng boss. Đạn đã phóng tiếp tục bay |

Boss 100 vẫn là Chimera và ba vương thú đã có; tên Chiến Binh Song Rìu mô tả phần thưởng, không thay trận boss.

## Vị trí code

Sáu module yêu cầu: `js/save-manager.js`, `boss-manager.js`, `map-manager.js`, `skill-manager.js`, `weapon-manager.js`, `input-manager.js`. `progression-ui.js` nối DOM với các module. Tất cả được nạp trước `game.js` bằng script defer trong `index.html`.

`Game.dealEnemyDamage()` là cổng dùng chung cho súng, xương, cung, giáo, chùy và Song Rìu, giữ miễn đạn/chuyển pha của từng boss. `player.rollTime` chỉ dành cho lướt màn 70; `game.rollSlash` có tập mục tiêu riêng, luôn kiểm tra Song Rìu. Hai trạng thái không dùng chung quyền gây sát thương.

`SaveManager` giữ `save.progression = {version, rewards, equipped, lifeKills}` trong khóa localStorage cũ `monster-mash-v2`. Phần thưởng vĩnh viễn trên trình duyệt/thiết bị này, không có máy chủ tài khoản. Không thưởng lại khi đánh lại boss.

## Kiểm thử

Chạy `node --test tests/*.test.cjs` và `node scripts/build.mjs`. Các bộ kiểm thử V3 gồm `progression-save`, `progression-input`, `weapons`, `skills`, `v3-integration`; kiểm tra cả 14 tình huống bắt buộc, cổng sát thương thật của game, phân thân, tải lại và các hệ thống cũ.
