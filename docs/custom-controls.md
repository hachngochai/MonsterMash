# Tùy chỉnh điều khiển — v3.2.1

Trong Cài đặt, chọn một thao tác rồi nhấn phím để gán. Hỗ trợ đi hai phía, nhảy, bắn hai phía, khiên, đổi/giữ chọn vũ khí, hai tầm bắn và tạm dừng. Có bộ phím Mũi tên + A/D và WASD + J/L. Nếu phím đã được dùng, hai thao tác hoán đổi phím để không xung đột. Esc hủy thao tác ghi phím; ngoài phần ghi phím, Esc vẫn tạm dừng hoặc đóng menu như cũ. Enter luôn xác nhận bảng vũ khí. Không gán tổ hợp Ctrl/Alt/Meta hoặc các phím chức năng trình duyệt.

`js/key-bindings.js` chuẩn hóa dữ liệu và dịch mã phím vật lý sang hành động trước InputManager và Game. Vì vậy nhấn đúp hướng, nhảy cao, khiên bất tử và giữ chọn vũ khí dùng nguyên bộ xử lý hiện có. Chỉ Song Rìu có Lăn Chém; các vũ khí khác và quy tắc màn 70 giữ nguyên. Phím mũi tên vẫn điều hướng bảng vũ khí; các phím di chuyển tùy chỉnh cũng có thể điều hướng bảng.

Lưu trong `settings.keyBindings`, giữ khi mở lại link/chuyến đi mới. Thay phím xóa input đang giữ; nhả phím vẫn được xử lý kể cả khi có phím Ctrl/Alt đi kèm để tránh kẹt di chuyển. Hướng dẫn nhanh, tầm bắn, mô tả canvas và tooltip khiên cập nhật theo cấu hình. Cấu hình lỗi từ save cũ được đưa về bộ phím hợp lệ, không trùng nhau.

Điện thoại giữ ba chế độ Vuốt + nút, Chỉ vuốt và Chỉ nút trong Cài đặt. Khi dùng bàn phím ngoài, áp dụng cùng bộ phím tùy chỉnh.

Trong trận, CSS và các sự kiện selectstart/dragstart/contextmenu/copy ngăn chọn chữ, kéo ảnh, menu nhấn giữ và sao chép ngoài ý muốn. Không đặt lớp bắt sự kiện lên trên nút cảm ứng. Các menu khi tạm dừng và trường nhập liệu giữ hành vi trình duyệt thông thường. Website không thể chặn chụp màn hình từ hệ điều hành.
