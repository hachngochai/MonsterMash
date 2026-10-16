# Khung ngang trên điện thoại — v3.1.1

`MobileView.sync()` đọc chiều rộng, chiều cao và độ lệch của VisualViewport, rồi đặt `html[data-landscape="rotated"]` khi vùng hiển thị đang dọc trên thiết bị cảm ứng hoặc cửa sổ điện thoại hẹp. Khung ngang hoạt động ngay từ màn chờ và không phụ thuộc việc fullscreen hoặc khóa hướng thành công. Khi máy chuyển sang ngang thật, trở lại bố cục ngang tự nhiên.

CSS xoay `.app` 90° với chiều rộng/chiều cao hoán đổi. Hộp thoại `showModal()` ở top layer có phép xoay riêng để bản đồ, cẩm nang và cài đặt vẫn vừa màn. Safe area cũng được ánh xạ theo hướng xoay. Trang không có thanh cuộn tràn; danh sách trong hộp thoại cuộn nội bộ.

`Game.inputPoint()` đổi tọa độ vật lý về pixel CSS trước xoay: `u = clientY - rect.top`, `v = rect.right - clientX`. `Game.point()` tiếp tục tính vùng ảnh contain/cover và object-position để nhận đúng hai nửa sân. Tất cả thao tác vuốt dùng cùng hệ u/v nên trái/phải/lên/xuống giữ đúng ý nghĩa. Nút cảm ứng dùng hit testing của trình duyệt. Khi hình học thay đổi, giải phóng input đang giữ để tránh tự di chuyển.

Theo [tài liệu VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), viewport nhìn thấy có kích thước và offset riêng, cần theo dõi sự kiện resize/scroll. Khóa hướng vẫn là tối ưu tùy chọn; [tài liệu WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) mô tả API orientation và fullscreen của Safari. Khung CSS không cần các API đó chấp nhận.

Kiểm thử mô phỏng Safari thiếu/từ chối API, VisualViewport, chuyển hướng, tọa độ tap/vuốt, hai ngón, nút và contain/cover ở `tests/mobile-rotation.test.cjs`. Kiểm tra hình ảnh bằng cửa sổ trình duyệt dọc và ngang; đây không thay thế phép thử phần cứng iPhone thực tế.

Thay đổi boss cùng phiên bản: Song Trảo Trăng Máu kéo dài 1,5 giây/lượt, bắt đầu lượt mỗi 1,5 giây, giữ 2 sát thương/nhát; mọi rồng thường dùng chiêu mỗi 4 giây; rồng ngàn tuổi dùng nguyên tố mỗi 3 giây; Chimera mỗi 4 giây chọn ngẫu nhiên chiêu hợp lệ theo pha, giữ nguyên ba phân thân. Thời gian báo đòn, sát thương, máu và điều kiện mở thưởng không đổi.
