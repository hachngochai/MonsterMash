# Monster Mash — The Midnight Hunt

Rebuild 05 của game Monster Mash của KIO. Native Canvas 2D, không cần Processing.js, CDN, thư viện hoặc cài package. Có thể mở `index.html` trực tiếp; nên dùng preview local để tiến trình lưu cùng một địa chỉ trình duyệt.

Chơi bản public: [Monster Mash trên GitHub Pages](https://hachngochai.github.io/MonsterMash/).

## Chạy và build

Yêu cầu Node.js 18 trở lên cho các lệnh phát triển; bản game chỉ cần trình duyệt hiện đại.

```powershell
node scripts/serve.mjs
```

Mở http://127.0.0.1:4174/. Có thể đổi cổng bằng biến môi trường `PORT`.

```powershell
node --test tests/*.test.cjs
node scripts/build.mjs
```

Build sao chép các file tĩnh vào `dist/`, có thể dùng trên GitHub Pages. Root và `dist/` đều chơi được. Không cần `npm install`.

GitHub Pages của repo xuất bản từ nhánh `master`, thư mục gốc `/`, và tự triển khai khi đẩy commit mới lên nhánh này. File `.nojekyll` giữ nội dung game dưới dạng file tĩnh. Khi cập nhật, chạy kiểm tra và build trước, rồi commit cả source và `dist/` để hai bản đồng bộ.

## Gameplay

- 70 màn có tên, mục tiêu và cấu hình riêng, chia thành 7 chương: nghĩa địa, rừng tơ, thành phố ma, lâu đài trăng máu, cổng nhật thực, **Thung lũng nguyền rủa** và **Thung lũng trăng máu** (tiếp tục dùng nền rừng gai).
- Boss ở màn 10, 20, 30, 40, 50, 60, 70; xuất hiện sau khi hạ đủ địch thường. Hạ boss mới qua màn.
- Màn 10: bộ xương gọi cột xương có dấu báo trước. Màn 20: thây ma xanh nhận đủ 10 phát trúng sẽ miễn đạn 2 giây; đạn bị chặn không tăng bộ đếm. Màn 30: nhện nhả tơ gây choáng 2 giây và phóng trứng mỗi 5 giây; phá bằng 2 phát, nếu để 5 giây sau khi chạm đất sẽ nở đúng 5 nhện con. Tối đa 2 trứng, dành sẵn chỗ cho đàn nhện con để không vượt 15 con.
- Màn 40: ma trắng tàng hình mỗi 5 giây, không nhận đạn; sau 1,5 giây sẽ báo hướng và tập kích ngẫu nhiên từ trên, trái hoặc phải. Trúng đòn bị đánh ngã, mất 1 máu và 1 khiên tích (không xuống dưới 0). Màn 50: Dracula báo trước mỗi lần hút máu khi hóa dơi; đòn này không thể né bằng khoảng cách hoặc bất tử sau va chạm, chỉ khiên đang bật mới chặn. Đòn trúng hồi 1 máu cho boss. Ở nửa máu, boss phân thân một lần; phải hạ cả hai mới thắng. Bản sao có 17 máu ở Cân bằng, các đợt tấn công được lệch nhịp.
- Quái thường màn 30–40 chỉ gồm xương, thây ma, zombie xanh và nhện; giữ boss nhện màn 30 và ma trắng màn 40. Màn 51–60 chỉ có xương, Golem và nhện, trong rừng gai leo nguyên sinh với những tia sáng le lói.
- Golem cầm gậy gỗ gai, báo trước vùng quật rồi đánh 1 máu. Golem thường và mini còn lấy đà ném một viên đá khi ở xa; Golem chúa ném ba viên theo hình quạt. Đá bay thẳng tới vị trí đã báo, không đuổi theo người chơi; mỗi viên gây 1 máu và chặn được bằng khiên đang bật. Nhịp ném tăng theo áp lực thời gian, dấu báo vẫn giữ thời gian phản ứng. Golem chúa màn 60 hóa điên đúng 5 giây mỗi 10 giây giao chiến: giáng xuống gây nứt đất, mất 1 máu và choáng 1 giây khi không có khiên, rồi lao tới và đập 3 nhát. Mỗi nhát đập mất 3 máu và có thể né bằng nhảy, rời vùng báo hoặc khiên đang bật. Ba nhát riêng biệt vẫn tính khi người chơi đang bất tử sau đòn trước. Tạm dừng đóng băng đồng hồ; các kỹ năng vẫn có dấu báo khi tắt hiệu ứng.
- Màn 61–70 chỉ có xương, Golem mini bằng kích thước bộ xương và người sói. Người sói báo trước điểm đáp rồi nhảy lên vồ xuống; đòn vồ thường gây 1 máu. Nền thung lũng được tái sử dụng.
- Lang Vương màn 70 có 50 máu ở Cân bằng. Lần đầu chạm nửa máu sẽ chuyển Trăng Máu, hồi đầy máu và tăng cả chiều rộng/cao gấp đôi. Miễn sát thương trong 1,2 giây biến đổi, rồi có thể bị hạ; không hồi lại ở lần chạm nửa máu tiếp theo. Màn hình nhuộm đỏ và trăng đỏ mọc ở góc phải. Sau mỗi 10 giây giao chiến ở pha Trăng Máu, boss khóa vị trí người chơi, nhảy tới rồi cào 2 nhát, mỗi nhát 2 máu; từng nhát chặn được bằng khiên đang bật.
- Trong Trăng Máu, súng tự đổi thành súng ngắm: mỗi phát tốn 5 đạn, gây 5 sát thương, hồi chiêu 1 giây. Bắn được khi còn ít nhất 5 viên và đã hết hồi chiêu; dưới 5 viên cần nhặt thùng tiếp tế. Không tiêu hao đạn trong thời gian boss đang biến đổi. Đạn và khiên vẫn hữu hạn.
- Sinh lực 7 / 5 / 4 ở chế độ Thư giãn / Cân bằng / Thử thách. Đạn có giới hạn, mỗi phát tiêu hao 1 viên; nhịp bắn 0,17 giây. Nhặt thùng **AMMO** rơi từ trên xuống để tiếp tế, kể cả lúc đánh boss. Khi hết đạn, súng hạ xuống và bộ đếm đạn chuyển màu cảnh báo.
- Mỗi 10 địch hạ được nhận 1 khiên, tích tối đa 3. Tiến độ cộng dồn qua màn. Khiên kéo dài 5 giây và chặn tối đa 3 lần va chạm; không chồng nhiều khiên cùng lúc.
- Sau khi trúng đòn có 1,35 giây bất tử. Qua màn hồi 1 máu, màn hồi phục hồi 2. Mỗi 7 địch rơi vật phẩm máu nếu đang thiếu máu.
- Địch có cổng báo trước, giới hạn số lượng đồng thời và khoảng nghỉ sau mỗi nhóm. Giữ lại kỹ năng riêng từ source gốc: zombie di chuyển trên bệ lơ lửng rồi nhảy xuống; nhện đu trên sợi tơ, nhấp nhô rồi thả xuống; ma bay theo sóng sin rồi bổ nhào; ma cà rồng hóa dơi, bay lên, tuần tra, lao xuống và trở lại hình người. Boss giữ kỹ năng theo loài. Dấu báo vàng chỉ vị trí đáp trước khi địch tấn công.
- Nhịp tấn công tăng dần theo thời gian thực trong từng màn, bằng đường cong mượt có giới hạn. Quái bắt đầu tăng sau 12 giây (16 giây ở màn hồi phục); boss có đồng hồ riêng, tăng sau 4 giây giao chiến. Ở chế độ Cân bằng, nhịp quái đạt tối đa ×1,50–1,725 và boss ×1,70–1,925 tùy vùng. Di chuyển, bay, bổ nhào và đạn xương tăng nhẹ hơn nhịp hồi kỹ năng. Dấu báo vẫn có ít nhất 0,9 giây thực để phản ứng (Thư giãn 1,1; Thử thách 0,75). Tạm dừng cũng dừng quá trình tăng tốc; màn mới bắt đầu lại nhịp đầu.
- Tiến trình, kỷ lục và thiết lập tự lưu trong localStorage. Save cũ đã hoàn thành chiến dịch 50 hoặc 60 màn tiếp tục ở màn 51 hoặc 61 tương ứng; giữ nguyên kỷ lục, các màn đã qua và thiết lập. Không gửi dữ liệu ra ngoài. Khi browser chặn lưu trữ, game vẫn chơi được trong phiên hiện tại.

Tiếp tế đạn ở chế độ Cân bằng:

| Vùng | Đạn đầu màn | Sức chứa | Mỗi thùng | Khoảng tiếp tế |
| --- | ---: | ---: | ---: | ---: |
| Nghĩa địa | 3 | 18 | 5 | 5,8 giây |
| Rừng tơ | 4 | 22 | 7 | 5,6 giây |
| Thành phố ma | 5 | 26 | 9 | 5,4 giây |
| Lâu đài trăng máu | 6 | 30 | 11 | 5,2 giây |
| Cổng nhật thực | 7 | 34 | 13 | 5,0 giây |
| Thung lũng nguyền rủa | 8 | 38 | 15 | 4,8 giây |
| Thung lũng trăng máu | 9 | 42 | 17 | 4,6 giây |

Thư giãn nhân lượng đạn khởi đầu và tiếp tế với 1,35; Thử thách nhân với 0,85, làm tròn thành số viên nguyên. Sức chứa giữ nguyên. Màn hồi phục giảm khoảng tiếp tế 0,3 giây; khi boss xuất hiện có thêm một thùng. Đạn còn lại được mang sang màn kế tiếp, cộng thêm lượng đầu màn và giới hạn theo sức chứa. Thùng tiếp tế rơi theo nhịp; không tự nạp đạn khi bắn hết.

Thùng rơi với tốc độ 180 pixel/giây rồi nằm trên đất 8 giây ở chế độ Cân bằng (Thư giãn 10; Thử thách 6), tối đa 3 thùng đồng thời. Có thể nhảy nhặt khi thùng còn đang rơi. Tăng nhịp tấn công không làm giảm lượng tiếp tế hoặc tăng máu địch.

## Điều khiển

| Thao tác | PC | Mobile |
| --- | --- | --- |
| Đi trái / phải | ← / → | Vuốt ngang rồi giữ; nhả ngón tay để dừng |
| Nhảy | ↑ hoặc W | Vuốt lên hoặc nút ↑ |
| Bắn trái | Giữ A hoặc J | Chạm / giữ nửa trái sân chơi |
| Bắn phải | Giữ D hoặc L | Chạm / giữ nửa phải sân chơi |
| Khiên | Space | Vuốt xuống hoặc nút ◇ |
| Tạm dừng | Esc / P hoặc nút Ⅱ | Nút Ⅱ |

Có thể dùng hai ngón: một ngón di chuyển và một ngón bắn. Nút di chuyển, nhảy, bắn hai phía và khiên nằm ngay trên sân chơi. Cài đặt có ba lựa chọn: **Vuốt + nút**, **Chỉ vuốt**, **Chỉ nút**; mặc định kết hợp cả hai. Giữ nút BẮN để bắn liên tục, nhả từng ngón độc lập. Game tự tạm dừng khi đổi tab, ẩn trang hoặc mở menu.

Ngay khi điện thoại mở game, trang thử khóa hướng ngang. Nếu trình duyệt cần một thao tác trước, lần chạm đầu ở màn chờ sẽ yêu cầu toàn màn hình rồi thử khóa ngang lại. Nút **Chơi ngang** cũng làm việc này mà không tự bắt đầu trận. Khi bắt đầu hoặc tiếp tục trên máy cảm ứng, game tái sử dụng yêu cầu đang chạy. Trình duyệt không hỗ trợ hoặc từ chối vẫn chơi được và có gợi ý xoay máy khi đang dọc. Thoát toàn màn hình tạm dừng trận đấu và giải phóng các ngón đang giữ; về trại sẽ bỏ khóa hướng và thoát chế độ do game mở. Việc xoay tự động phụ thuộc hỗ trợ của trình duyệt và hệ điều hành.

Khung game nằm trong kích thước cửa sổ hiện tại, tránh thanh cuộn ngang/dọc cả trang. Trên điện thoại, hướng dẫn ngoài sân chơi ẩn khi đang chơi; **Cách chơi** mở hộp thoại có vùng cuộn riêng. Khi còn màn hình dọc, toàn bộ hai mép sân vẫn nhìn thấy, nút cảm ứng nằm ở phần dưới; hộp kết quả cuộn nội bộ để các nút thử lại/tiếp tục luôn dùng được. Toàn màn hình có khoảng đệm cho vùng tai thỏ.

## Cấu trúc và cập nhật sau này

- `js/campaign.js`: dữ liệu màn, 7 chương, loại địch và hệ số độ khó. Thêm chương hoặc màn tại đây; `levels.length` điều khiển tiến trình và điều kiện màn cuối.
- `js/game.js`: mô phỏng theo giây, input, va chạm, kỹ năng riêng của từng loài, đạn và tiếp tế, khiên, save và giao diện.
- `js/typography.js` và `assets/fonts/`: font Noto Sans / Noto Serif có bộ ký tự tiếng Việt, tải từ file trong game trước khi vẽ Canvas. Font được phân phối theo SIL Open Font License; giấy phép nằm cùng thư mục.
- `js/mobile.js`: điều khiển toàn màn hình, hướng ngang và xử lý trình duyệt không hỗ trợ.
- `js/bosses.js`: kỹ năng boss, miễn đạn, tơ, trứng, tàng hình, hút máu và phân thân; đồng hồ đứng yên khi tạm dừng.
- `js/golem.js`: gậy gai, ném đá có dấu báo, hóa điên theo chu kỳ, nứt đất gây choáng và chuỗi ba nhát đập của Golem chúa.
- `js/wolves.js`: người sói nhảy vồ, Trăng Máu chuyển pha một lần và hai nhát cào của Lang Vương.
- `js/renderer.js`: nhân vật khối vuông lấy cảm hứng source gốc, 6 bối cảnh được cache cho 7 chương, bệ lơ lửng, tơ nhện, dơi biến hình, thùng đạn, sương, ánh sáng và hiệu ứng. Đồ họa vẽ bằng code, không cần tải ảnh.
- `style.css` và `index.html`: giao diện responsive, bản đồ 70 màn, hướng dẫn và cài đặt.
- `tests/`: kiểm tra chiến dịch, input, đa chạm, khiên, boss, save, pause và kết thúc trận.
- `tests/boss-preview.html`: bảng xem các trạng thái hiệu ứng và dấu tiếng Việt; mở qua server local để kiểm tra hình ảnh khi cập nhật.

Khi mở rộng thêm vùng, bổ sung palette và scenery tương ứng trong renderer, cập nhật số vùng/màn hiển thị ở UI, giữ key save nếu cấu trúc tương thích hoặc migrate save khi đổi schema.

## Kiểm chứng và giới hạn

Kiểm tra tự động bảo vệ cơ chế và tiến trình; cân bằng cuối cùng vẫn cần phản hồi từ người chơi thật trên thiết bị thật. Preview local phục vụ việc phát triển; bản public được cập nhật qua nhánh `master` và GitHub Pages.
