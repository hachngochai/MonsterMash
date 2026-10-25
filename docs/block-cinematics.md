# Chuyển cảnh hoạt hình phân khối · v4.3.5

Chỉ thay bối cảnh trong phim chuyển chương; nhân vật vẫn dùng `Renderer.drawHunter` gốc. Boss, tạo hình chiến đấu, nền màn chơi 1–200 và bản sửa chuyển động Kỵ sĩ ở v4.3.4 giữ nguyên.

## Bộ nền được áp dụng

Các nền này được tạo bằng **built-in image_gen** trong lượt thiết kế trước và được tái sử dụng trực tiếp, không chỉnh sửa pixel hoặc tạo lại bằng công cụ khác. Đây là các ảnh nền hoàn chỉnh, không có nhân vật hoặc chữ; ánh đuốc, bóng chân, sương, nước và chữ được game vẽ riêng.

| Tệp trong `assets/backgrounds/transitions/` | Cảnh | Kết quả imagegen nguồn |
| --- | --- | --- |
| `forest-passage.png` | 50 → 51: rừng cổ thụ, tán lá theo mảng, đá có mặt sáng/tối, đường đất dẫn vào cửa rễ | `exec-17fdb8e3-3148-4800-81c7-005b5a9d8c11.png` |
| `cave-passage.png` | 100 → 101: hang đá, cột đổ, nhũ đá và thạch anh tím | `exec-02b19f39-09e8-49f7-a8be-13b54de6a61e.png` |
| `whirlpool-passage.png` | 150 → 151: mỏm đá, di tích chìm và xoáy nước | `exec-f31d7954-48ab-4819-a99e-e03c64c16a72.png` |
| `submerged-passage.png` | Dưới xoáy nước và đầu đoạn kết 200: đáy biển, san hô và di tích | `exec-4dba8400-4df2-41f9-95c7-07b3dcdfbe40.png` |
| `shore-return.png` | Cuối đoạn kết 200: biển xanh và bãi cát lúc bình minh | `exec-b03fdb31-813c-48c1-8b16-c5bc0174b6a2.png` |

## Định hướng hình ảnh

Hoạt hình 2D với đường viền tối, hình khối rõ và nhiều chi tiết trong mỗi mảng: vết nứt đá, mặt nghiêng, rêu, dây leo, trụ đá và đường nước. Màu xanh lam/chàm, xanh rừng và ánh bình minh tiết chế, hợp với người giữ đèn nguyên bản. Không dùng hình khối vuông đơn giản thay cho chi tiết và không chèn nhân vật sẵn vào ảnh nền.

Các mô tả trên ghi lại ý đồ của bộ nền được chọn, không phải bản chép nguyên văn các prompt cũ. [Prompt lịch sử của bộ nền v4.3.2](transition-art-prompts.md) chỉ áp dụng cho bản cũ.

## Căn chuyển động và bảo toàn gameplay

Mỏm đá có mặt đi ở y239 trong khung 960×540. Điểm đáp, tâm dòng xoáy, nước bắn và mép nước che người đều dùng chung mốc x675/y365 để không lệch nhau. Đường nhảy và chuyển sang bơi liên tục; đường chân trong hang vẫn ở y430.

Phần dưới biển nạp `submerged-passage.png` của phim, thay vì lấy lại nền biển gameplay. Nếu ảnh lỗi, phim vẫn vẽ nền khối dự phòng riêng. Đoạn vào/ra phim giữ hòa cảnh từ khung hình thật, 5 giây ở mốc 50/100/150 và 11 giây ở kết 200, giảm chuyển động 1,2 giây, bỏ qua, đóng băng chiến đấu/oxy và lưu tiến độ như trước.

Kiểm chứng: kiểm tra ảnh cục bộ đầy đủ, đúng bộ nền ở cả rạp xem và game, fallback, chỉ một nhân vật gốc mỗi khung hình, liên tục quỹ đạo và không thay dữ liệu gameplay. Duyệt trực tiếp tại `tests/chapter-preview.html?v=4.3.5`.
