# Tầng Trung Đầu Tiên · 161–170

Phần II dùng nguyên vật lý bơi, oxy30s, bình hồi15s, hòm và hệ vũ khí151–160. Các tham số mới nằm ở `js/middle-sea-config.js`, có cờ `provisional:true`. Mẫu tạo hình là ảnh người dùng cung cấp; prompt tách nền nằm trong `middle-sea-art-prompts.md`.

## Những lựa chọn đã chốt

- Boss170 có140HP ở Cân bằng, bản sao có HP riêng bằng boss lúc chạm ngưỡng25%. Chỉ boss thật dùng ba chiêu chiến đấu; hạ boss thật là thắng. Bản sao bị dọn cùng trận, không tạo thêm bản sao và không hồi máu.
- Mọi tỷ lệ oxy dùng lượng hiện tại. Khiên đang bật chặn HP, choáng và hao oxy của một đòn điện, tiêu1lượt đỡ. Có thể cấp oxy trong lúc choáng. Oxy lặn vẫn giảm.
- Cá Mập Con4HP, cắn1HP, hồi2,5s, báo0,5s. Laser480px, rộng18px, báo0,9s, tồn tại0,6s. Chống choáng điện lặp1s sau khi kết thúc choáng.
- Hoán đổi hai con mỗi6s sau lần trước, báo0,8s, chuyển động0,65s. Hai tạo hình và màu giống nhau; chỉ có một HUD boss để không lộ thật/giả qua độ dài thanh máu.

Các giá trị chưa chính thức vẫn được giữ trong cấu hình để điều chỉnh khi chơi thử.

## Phân bố và cơ chế

161–163: Cá Ngựa + Cá Mập Con. 164–166: Cá Mập Con + chướng ngại Sứa Điện. 167–170: cả ba. Cá Ngựa giữ nguyên HP, kích thước, tốc độ, đạn1HP, tầm480px và hồi5s.

Sứa Điện xuất hiện từ dưới lên, bất tử, không tính quota hoặc chiếm chỗ quái phải hạ. Mỗi con chỉ gây một lần choáng2s, không HP/oxy trực tiếp. Sứa qua mép trên được thu hồi, không có chết hoặc loot. Không chọn sứa cho Hóa Đá hay hoán đổi Lưỡi Hái. Giới hạn3sứa thường; chu kỳ sinh5,5s là cấu hình tạm.

Boss170 có ba đồng hồ độc lập: **Tê Tái10s** tiếp cận, báo rồi kiểm tra vùng xúc tu; trúng mất1HP, choáng3s và nửa oxy. **Tập Tính Bầy Đàn15s** báo1s rồi tạo chính xác5sứa từ dưới; mỗi con chạm một lần gây choáng2s, trừ1/3oxy hiện tại, không HP. **Laze Plasma8s** khóa đường ngắm đã báo, kiểm tra cùng hướng/độ rộng/tầm với hình vẽ, gây2HP một lần mỗi lần bắn, không choáng/oxy.

Ảo Giác tạo đúng một bản sao tại25%. Khi một đòn vượt ngưỡng, hệ thống xử lý điểm25% để tạo bản sao rồi giữ toàn bộ sát thương còn lại trên boss thật, không hồi hoặc chặn sát thương. Nếu boss thật chết ngay, trận kết thúc và dọn bản sao theo lựa chọn người dùng.

Timer, sứa triệu hồi, vùng điện và laser được dọn khi thắng, thua, thử lại hoặc rời màn. Sứa bất tử không chặn việc hoàn thành màn. Bản cập nhật này chưa tạo màn171–200 hoặc phần thưởng chưa được đặc tả ở PhầnII.

## Kiểm chứng

`tests/middle-sea.test.cjs` dùng vòng chạy Game thật trong VM để kiểm tra bơi/oxy, Cá Ngựa, miệng cá mập, sứa bất tử, ngăn choáng lặp, khiên, ba nhịp chiêu, hitbox laser, hai thực thể hoán đổi, điều kiện thắng và cleanup. `middle-sea-campaign.test.cjs` kiểm tra bản đồ, hướng dẫn161 và migration160→161.

Phòng thử: `tests/middle-sea-preview.html`. Có nút chạy/dừng, thửẢoGiác, vũ khí và điều khiển cảm ứng. Không ghi tiến trình thật. Bản chính và test công khai dùng cùng logic chiến đấu.
