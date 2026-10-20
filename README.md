# Monster Mash — The Midnight Hunt

Rebuild 09 (v4.0.3) của Monster Mash của KIO: 150 màn, 3 cốt truyện, Canvas 2D và bản đồ Three.js đóng gói trong repo. Không cần CDN hoặc cài package. Tiến độ màn, kỹ năng, vũ khí, kỷ lục và cài đặt lưu vĩnh viễn bằng localStorage trên trình duyệt hiện tại.

Bản đồ gồm **Miền Nhật Thực** (1–50), **Lời Nguyền Cổ Thú** (51–100) và **Vực Sâu Cổ Đại** (101–150). Vuốt ngang hoặc dùng mũi tên/tab để chuyển I → II → III. Mỗi vùng giữ bố cục dấu X riêng, có 45 chấm màn thường và 5 X/O boss. Đường tiếp nối 50 → 51 → 60 và 100 → 101 → 110 kết nối hành trình. Camera 3D cố định, chỉ nghiêng nhẹ theo chuột.

V3 mở khóa phần thưởng boss 10–100; chương III thêm **Búa Minotaur** sau boss 120, **Phát Quang Vũ Khí** sau boss 130 và **Lưỡi Hái Cổ Điểu** sau boss 140. Chỉ hạ đúng dạng cuối mới nhận thưởng, không cấp trùng. Mở lại trang giữ tiến độ. Mốc 110 và 150 chỉ đánh dấu đã khám phá, không thêm vũ khí/kỹ năng. Xem [cấu hình, kiểm thử và giới hạn chương III](docs/ancient-abyss.md).

Bản 3.0.2 dùng ảnh PNG trong suốt tách từ mẫu nhân vật do tác giả cung cấp: rồng, Người Sư tử, Medusa, Goatman và Chimera. Năm hệ rồng có bảng màu riêng: lửa đỏ, băng xanh lam, gió xanh ngọc, đất nâu và chớp tím vàng. Rồng ngàn tuổi mang vương miện, giữ màu đen trắng cùng vòng Âm Dương. Game tải sẵn sprite từ `assets/sprites/` rồi vẽ lên Canvas; tạo hình bằng code vẫn làm dự phòng nếu ảnh chưa tải được. Chimera được phóng lớn thành 300 × 210 pixel, còn ba bản thể thu về 76 × 108 pixel để cân đối hơn với người chơi. Kỹ năng và cơ chế chiến đấu giữ nguyên.

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

- 150 màn có tên, mục tiêu và cấu hình riêng, chia thành 10 chương: nghĩa địa, rừng tơ, thành phố ma, lâu đài trăng máu, cổng nhật thực, **Thung lũng nguyền rủa**, **Thung lũng trăng máu**, **Rừng nguyên sinh**, **Thiên không ngũ hành** và **Tàn tích thần thoại**. Các chương 6–8 dùng cùng nền rừng gai với ánh sáng le lói; chương 9 có vách núi trên mây, chương 10 có tàn tích cổ.
- Boss ở màn 10, 20, 30, 40, 50, 60, 70, 80, 90, 100; xuất hiện sau khi hạ đủ địch thường. Hạ boss mới qua màn; riêng KingKong cần sống qua cơn cuồng nộ cuối, Rồng ngàn tuổi phải bị hạ cả dạng Kị sĩ và Chimera phải bị hạ cả ba bản thể.
- Màn 10: bộ xương gọi cột xương có dấu báo trước. Màn 20: cứ mỗi **15 giây giao chiến**, thây ma xanh bật khiên **miễn đạn 1 giây và hồi 1 máu**, không vượt máu tối đa. Khiên dùng đồng hồ giao chiến, không phụ thuộc số phát đạn trúng; tạm dừng cũng dừng đếm giờ. HUD báo thời gian còn lại tới lần bật khiên tiếp theo. **Tsunami** mỗi 10 giây gọi đúng 20 thây ma xanh con chạy nhanh nối đuôi, cả đàn từ trái sang phải hoặc phải sang trái. Bắn hạ, nhảy qua hoặc bật khiên để tránh; con chạy hết sân rời trận. **Phàm ăn** có dấu báo trước rồi truy đuổi người chơi trong 1 giây, chạy trên đất hoặc nhảy từ trên cao, hồi 5 máu trong giới hạn máu tối đa và gây 2 sát thương khi đánh trúng; hồi chiêu 8 giây. Giữ nguyên hai kỹ năng tấn công này và tuần tra trên bệ đá của boss màn 20.
- Màn 30: nhện nhả tơ gây choáng 2 giây và phóng trứng mỗi 5 giây. Trứng nở sau **3 giây kể từ khi chạm đất**; bắn **2 phát** trước khi hết đếm ngược để phá và ngăn 5 nhện con xuất hiện. Nhện con quá nhỏ, đạn xuyên qua và không thể bị tiêu diệt; chạm người chơi gây **1 máu và choáng 1,5 giây**, khiên đang bật chặn cả sát thương lẫn choáng. Chúng không cho điểm, tiến độ khiên hoặc vật phẩm. Tối đa 2 trứng, dành sẵn chỗ cho đàn nhện con để không vượt 15 con; đàn nhện con rời sân khi boss bị hạ. Nhện thường và các quái triệu hồi khác giữ cơ chế riêng.
- Màn 40: ma trắng tàng hình mỗi 5 giây, không nhận đạn; sau 1,5 giây sẽ báo hướng và tập kích ngẫu nhiên từ trên, trái hoặc phải. Trúng đòn bị đánh ngã, mất 1 máu và 1 khiên tích (không xuống dưới 0). Màn 50: Dracula báo trước mỗi lần hút máu khi hóa dơi; đòn này không thể né bằng khoảng cách hoặc bất tử sau va chạm, chỉ khiên đang bật mới chặn. Đòn trúng hồi 1 máu cho boss. Ở nửa máu, boss phân thân một lần; phải hạ cả hai mới thắng. Bản sao có 17 máu ở Cân bằng, các đợt tấn công được lệch nhịp.
- Quái thường màn 30–40 chỉ gồm xương, thây ma, zombie xanh và nhện; giữ boss nhện màn 30 và ma trắng màn 40. Màn 51–60 chỉ có xương, Golem và nhện, trong rừng gai leo nguyên sinh với những tia sáng le lói.
- Golem cầm gậy gỗ gai, báo trước vùng quật rồi đánh 1 máu. Golem thường và mini còn lấy đà ném một viên đá khi ở xa; Golem chúa ném ba viên theo hình quạt. Đá bay thẳng tới vị trí đã báo, không đuổi theo người chơi; mỗi viên gây 1 máu và chặn được bằng khiên đang bật. Nhịp ném tăng theo áp lực thời gian, dấu báo vẫn giữ thời gian phản ứng. Golem chúa màn 60 hóa điên đúng 5 giây mỗi 10 giây giao chiến: giáng xuống gây nứt đất, mất 1 máu và choáng 1 giây khi không có khiên, rồi lao tới và đập 3 nhát. Mỗi nhát đập mất 3 máu và có thể né bằng nhảy, rời vùng báo hoặc khiên đang bật. Ba nhát riêng biệt vẫn tính khi người chơi đang bất tử sau đòn trước. Tạm dừng đóng băng đồng hồ; các kỹ năng vẫn có dấu báo khi tắt hiệu ứng.
- Màn 61–70 chỉ có xương, Golem mini bằng kích thước bộ xương và người sói. Người sói báo trước điểm đáp rồi nhảy lên vồ xuống; đòn vồ thường gây 1 máu. Nền thung lũng được tái sử dụng.
- Lang Vương màn 70 có 50 máu ở Cân bằng. Lần đầu chạm nửa máu sẽ chuyển Trăng Máu, hồi đầy máu và tăng cả chiều rộng/cao gấp đôi. Miễn sát thương trong 1,2 giây biến đổi, rồi có thể bị hạ; không hồi lại ở lần chạm nửa máu tiếp theo. Màn hình nhuộm đỏ và trăng đỏ mọc ở góc phải. Sau mỗi 1,5 giây giao chiến ở pha Trăng Máu, boss bắt đầu một lượt kéo dài 1,5 giây: khóa vị trí người chơi, nhảy tới rồi cào 2 nhát, mỗi nhát 2 máu; từng nhát chặn được bằng khiên đang bật.
- Lang Vương hú bầy đàn 4 giây, miễn sát thương đạn trong lúc hú và gọi đúng 5 sói con chạy vào tấn công. Hết tiếng hú, boss nghỉ 6 giây ở dạng thường hoặc 4 giây trong Trăng Máu rồi mới hú lại, để người chơi có khoảng bắn hạ boss. Tiếng hú và đòn nhảy cào hoạt động đồng thời. Sói con nhỏ 26×36, 1 máu ở mọi độ khó, di chuyển chậm hơn bản trước và chỉ chạy một hướng cố định, không quay đầu truy đuổi. Bắn hạ vẫn tích khiên nhưng không tính vào số quái cần hạ của màn. Sói con thường chạy hết sân sẽ nhường chỗ cho đợt mới, không tự cộng điểm hoặc tiến độ màn.
- Trong Trăng Máu, súng tự đổi thành súng ngắm: mỗi phát tốn 5 đạn, gây 5 sát thương, hồi chiêu **0,5 giây**. Bắn được khi còn ít nhất 5 viên và đã hết hồi chiêu; dưới 5 viên cần nhặt thùng tiếp tế. Không tiêu hao đạn trong thời gian boss đang biến đổi. Nhấn nhanh hai lần cùng hướng di chuyển trong 0,28 giây để lộn: hai lần ← / → trên PC, hai lần cùng nút đi hoặc hai lần vuốt ngang cùng hướng trên mobile. Lộn kéo dài 0,32 giây, chạy nhanh ra khỏi vùng cào và chặn sát thương trong lúc lộn; hồi chiêu 0,9 giây. Chỉ dùng được khi đang đánh Lang Vương ở Trăng Máu. Đạn và khiên vẫn hữu hạn.
- Màn 71–80 tiếp tục thuộc rừng nguyên sinh, chỉ có tiểu KingKong, Golem cỡ lớn thường, nhện và sói con. Tiểu KingKong có ngoại hình riêng, lấy đà ném chuối từ xa; đường báo giúp né trước khi chuối tới. Hai màn 71 và 75 giảm nhịp để làm quen và hồi phục.
- KingKong màn 80 có 72 máu ở Cân bằng. Dạng mặt đất ném chuối nổ thành 5 vỏ trơn: chạm gây ngã và choáng 0,5 giây; chỉ khiên đang bật mới bảo vệ. Khi chạm nửa máu, boss chuyển pha một lần, hồi đầy máu rồi bám dây leo. Tiếng gầm đánh vào nửa sân đã báo; chạy sang nửa còn lại để né. Súng tự ngẩng lên bắn boss trên cao, dùng 1 viên gây 2 sát thương. Cứ bắn thành công 5 phát sẽ nhận 1 khiên tích, tối đa 3; không cần cả 5 viên đều trúng boss.
- Khi KingKong ở pha dây leo hết máu, boss vẫn sống và nổi điên đúng 5 giây: lao xuống gây chấn động rồi tấn công liên tục, mỗi đòn không có khiên mất 3 máu dù còn bất tử sau đòn trước. Khiên đang bật bảo vệ trong toàn thời gian hiệu lực của nó, không trừ số lần chặn riêng trong cơn cuồng nộ. Người chơi sống qua 5 giây mới hạ được KingKong và mở màn 81.
- Màn 81–83 có rồng lửa, rồng gió cùng Golem, tiểu KingKong và người sói thường. Màn 84–86 thêm rồng băng và rồng đất, bỏ Golem; màn 87–90 thêm rồng chớp, bỏ người sói. Rồng có cánh, bay cao ngoài tầm bắn ngang. Súng tự ngẩng lên khi có mục tiêu trên trời, mỗi viên dùng 1 đạn gây 2 sát thương; quái mặt đất ở gần phía đang bắn vẫn được ưu tiên bằng súng thường để tránh bị áp sát.
- Năm rồng dùng những đòn có dấu báo riêng: **lửa** mỗi 4 giây gây thiêu đốt 2 giây, mất 1 máu/giây; **băng** mỗi 4 giây thả đúng 4 khối, mỗi khối gây 1 máu; **gió** mỗi 4 giây hất tung và choáng 2 giây, không gây sát thương; **đất** mỗi 4 giây mở 3 ô đất phun dung nham gây 1 máu rồi biến mất; **chớp** mỗi 4 giây giáng sét dưới vị trí đang bay, gây 1 máu và choáng 2 giây. Ngôi sao xoay quanh đầu báo choáng; hiệu ứng lửa báo thiêu đốt. Khiên đang bật chặn các trạng thái này, bật khiên cũng dập lửa đang cháy.
- **Rồng ngàn tuổi màn 90** có 100 máu ở Cân bằng, thân hình đen trắng khổng lồ và vòng Âm Dương xoay phía sau. Mỗi 3 giây chọn ngẫu nhiên một trong năm kỹ năng nguyên tố. Lần đầu chạm nửa máu dùng **Âm Dương luân hồi**, báo trước vùng laze đen trắng phủ 2/3 sân: rời vùng báo để tránh; trúng mất 3 máu, nếu bật khiên vẫn mất 1 máu. Khi hết máu dạng rồng, boss đáp xuống thành **Kị sĩ rồng** bằng kích thước người chơi, cầm thánh thương, giữ vòng Âm Dương và hồi đầy máu. Kị sĩ bắn 5 sóng âm mỗi 6 giây, liên kích thương mỗi 3 giây. Cứ **10 phát đạn bắn trúng Kị sĩ** nhận 1 khiên tích, tối đa 3; hạ Kị sĩ mới kết thúc màn.
- Màn 91–100 gồm **Người sư tử** bằng người chơi, phóng giáo từ xa và đâm khi gần; **Medusa** tóc rắn, chạm hoặc sau mỗi 5 giây dùng ánh nhìn hóa đá người chơi 1,5 giây; **Goatman** cao gấp 1,5 lần người chơi, giơ rìu bổ xuống khi áp sát. Hóa đá khóa di chuyển, nhảy và bắn; khiên đang bật chặn, kích hoạt khiên hóa giải trạng thái đang có.
- **Chimera màn 100** có 120 máu ở Cân bằng, đi bốn chân, đầu sư tử, sừng dê, cánh và đuôi rắn. Dạng mặt đất mỗi 4 giây chọn ngẫu nhiên laze né được hoặc nhảy cắn gây 2 máu. Hàm trên/dưới và răng nanh mở khi lao tới, khép đúng thời điểm trúng đòn. Khi chạm nửa máu sẽ hồi đầy và bay lên một lần. Dạng bay mỗi 4 giây chọn ngẫu nhiên gầm lửa kèm hất tung trong 1/3 sân hoặc sà xuống khóa mục tiêu rồi trở lại trời. Né vùng gầm lửa; chỉ khiên đang bật chặn được cú sà. Người chơi tự chuyển súng tầm cao khi boss bay.
- Khi Chimera dạng bay còn 10 máu hoặc ít hơn, boss phân hóa thành ba bản thể có vương miện, mỗi bản thể cao/rộng gấp 2 lần người chơi (76 × 108 pixel): **Sư tử vương 30 máu** dùng giáo và thêm nhảy cào; **Medusa Queen 20 máu** giữ hóa đá và gọi Medusa mỗi 10 giây; **Goatman huy hoàng 40 máu** giữ bổ rìu và bật lá chắn miễn đạn 2 giây mỗi 8 giây. Cứ **10 máu thực sự gây lên Chimera hoặc các bản thể** nhận 1 khiên tích, tối đa 3; phần tiến độ được giữ khi chuyển pha và dùng chung giữa các bản thể. Hạ đủ cả ba mới thắng; đạn lúc boss bất tử không cộng tiến độ.
- Sinh lực 7 / 5 / 4 ở chế độ Thư giãn / Cân bằng / Thử thách. Đạn có giới hạn, mỗi phát tiêu hao 1 viên; nhịp bắn 0,17 giây. Nhặt thùng **AMMO** rơi từ trên xuống để tiếp tế, kể cả lúc đánh boss. Khi hết đạn, súng hạ xuống và bộ đếm đạn chuyển màu cảnh báo.
- Mỗi 10 địch hạ được nhận 1 khiên, tích tối đa 3. Tiến độ cộng dồn qua màn. Khiên kéo dài 5 giây và chặn tối đa 3 lần va chạm; không chồng nhiều khiên cùng lúc.
- Sau khi trúng đòn có 1,35 giây bất tử. Qua màn hồi 1 máu, màn hồi phục hồi 2. Mỗi 7 địch rơi vật phẩm máu nếu đang thiếu máu.
- Địch có cổng báo trước, giới hạn số lượng đồng thời và khoảng nghỉ sau mỗi nhóm. Giữ lại kỹ năng riêng từ source gốc: zombie di chuyển trên bệ lơ lửng rồi nhảy xuống; nhện đu trên sợi tơ, nhấp nhô rồi thả xuống; ma bay theo sóng sin rồi bổ nhào; ma cà rồng hóa dơi, bay lên, tuần tra, lao xuống và trở lại hình người. Boss giữ kỹ năng theo loài. Dấu báo vàng chỉ vị trí đáp trước khi địch tấn công.
- Nhịp tấn công tăng dần theo thời gian thực trong từng màn, bằng đường cong mượt có giới hạn. Quái bắt đầu tăng sau 12 giây (16 giây ở màn hồi phục); boss có đồng hồ riêng, tăng sau 4 giây giao chiến. Ở chế độ Cân bằng, nhịp quái đạt tối đa ×1,50–1,725 và boss ×1,70–1,925 tùy vùng. Di chuyển, bay, bổ nhào và đạn xương tăng nhẹ hơn nhịp hồi kỹ năng. Dấu báo vẫn có ít nhất 0,9 giây thực để phản ứng (Thư giãn 1,1; Thử thách 0,75). Tạm dừng cũng dừng quá trình tăng tốc; màn mới bắt đầu lại nhịp đầu.
- Mở hoặc tải lại trang giữ các màn đã hoàn thành, phần thưởng, trang bị và bộ đếm Hút Máu. Khi trình duyệt từ chối lưu trữ, game vẫn chạy trong phiên hiện tại. Dữ liệu không gửi ra ngoài.

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
| Rừng nguyên sinh | 10 | 46 | 19 | 4,4 giây |
| Thiên không ngũ hành | 11 | 50 | 30 | 4,3 giây |
| Tàn tích thần thoại | 12 | 54 | 36 | 4,3 giây |

Thư giãn nhân lượng đạn khởi đầu và tiếp tế với 1,35; Thử thách nhân với 0,85, làm tròn thành số viên nguyên. Sức chứa giữ nguyên. Màn hồi phục giảm khoảng tiếp tế 0,3 giây, tối thiểu 4,3 giây; khi boss xuất hiện có thêm một thùng. Đạn còn lại được mang sang màn kế tiếp, cộng thêm lượng đầu màn và giới hạn theo sức chứa. Thùng tiếp tế rơi theo nhịp; không tự nạp đạn khi bắn hết.

Thùng rơi với tốc độ 180 pixel/giây rồi nằm trên đất 8 giây ở chế độ Cân bằng (Thư giãn 10; Thử thách 6), tối đa 3 thùng đồng thời. Có thể nhảy nhặt khi thùng còn đang rơi. Tăng nhịp tấn công không làm giảm lượng tiếp tế hoặc tăng máu địch.

Hiệu ứng nguyên tố dùng luồng lửa từ miệng rồng, băng có hơi lạnh và mảnh vỡ, xoáy gió cuốn bụi lá, khe dung nham phân nhánh, sét phân nhánh và plasma Âm Dương. Vùng báo đòn vẫn rõ khi tắt hiệu ứng. Trong bản xem, nút **Chạy hiệu ứng** cho xem chuyển động; chỉ các cảnh đang nhìn thấy được vẽ lại.

## Điều khiển

Cài đặt có **Tùy chỉnh bàn phím** với bộ Mũi tên hoặc WASD và gán từng phím; lưu qua các chuyến đi mới. Xem [quy tắc phím và chống chọn chữ khi chơi](docs/custom-controls.md). Trên iPhone, dùng **Chia sẻ → Thêm vào Màn hình chính** rồi mở biểu tượng game để chơi không có thanh địa chỉ Safari; hướng dẫn cũng có ngay trong Cài đặt.

| Thao tác | PC | Mobile |
| --- | --- | --- |
| Đi trái / phải | ← / → | Vuốt ngang rồi giữ; nhả ngón tay để dừng |
| Nhảy / nhảy cao sau boss 30 | ↑; nhấn đúp ↑ để nhảy cao. W còn nhảy trước boss 80 | Vuốt lên hoặc nút ↑; nhấn đúp nút ↑ để nhảy cao |
| Bắn trái | Giữ A hoặc J | Chạm / giữ nửa trái sân chơi |
| Bắn phải | Giữ D hoặc L | Chạm / giữ nửa phải sân chơi |
| Khiên | Space | Vuốt xuống hoặc nút ◇ |
| Bất Tử sau boss 20 | Nhấn đúp Space, có ít nhất 3 khiên, tiêu hao 2, kéo dài 12s | Nhấn đúp nút ◇ hoặc vuốt xuống hai lần |
| Đổi vũ khí sau boss 10 / chọn sau boss 60 | Nhấn F / giữ F .35s; mũi tên chọn, Enter xác nhận | Nhấn / giữ nút vũ khí, chạm chọn và Trang bị |
| Chọn tầm bắn sau boss 80 | W: cao 35°, S: mặt đất; không đổi vũ khí | Nút Tầm cao / Mặt đất |
| Lăn Chém Song Rìu | Chỉ khi trang bị Song Rìu, nhấn đúp ← / → | Nhấn đúp nút đi hoặc vuốt ngang hai lần cùng hướng |
| Lộn trong Trăng Máu màn 70 | Nhấn nhanh hai lần cùng phím ← hoặc → | Chạm hai lần cùng nút đi, hoặc vuốt ngang hai lần cùng hướng |
| Tạm dừng | Esc / P hoặc nút Ⅱ | Nút Ⅱ |

Có thể dùng hai ngón: một ngón di chuyển và một ngón bắn. Nút di chuyển, nhảy, bắn hai phía và khiên nằm ngay trên sân chơi. Cài đặt có ba lựa chọn: **Vuốt + nút**, **Chỉ vuốt**, **Chỉ nút**; mặc định kết hợp cả hai. Giữ nút BẮN để bắn liên tục, nhả từng ngón độc lập. Game tự tạm dừng khi đổi tab, ẩn trang hoặc mở menu.

Ngay khi mở game trên điện thoại đang dựng dọc, toàn bộ khung chơi tự xoay ngang bằng CSS, kể cả Safari không hỗ trợ khóa hướng hoặc chưa bật toàn màn hình. Canvas, HUD, nút, bảng chọn và hộp thoại cùng dùng bố cục ngang; tọa độ chạm và vuốt được đổi theo khung. Khi xoay máy ngang thật, lớp xoay được bỏ tự động. VisualViewport giữ khung vừa vùng đang nhìn thấy khi thanh địa chỉ thay đổi. Nút **Toàn màn hình** và yêu cầu khóa ngang vẫn dùng khi trình duyệt hỗ trợ; việc chơi không cần đợi chúng. Đổi bố cục giải phóng các ngón đang giữ. Xem [chi tiết khung ngang](docs/mobile-landscape.md).

Khung game nằm trong kích thước cửa sổ hiện tại, tránh thanh cuộn ngang/dọc cả trang. Trên điện thoại, hướng dẫn ngoài sân chơi ẩn khi đang chơi; **Cách chơi** mở hộp thoại có vùng cuộn riêng. Ở chế độ khung ngang, toàn bộ hai mép sân vẫn nhìn thấy, nút cảm ứng nằm ở hai phía; hộp kết quả cuộn nội bộ để các nút thử lại/tiếp tục luôn dùng được. Toàn màn hình có khoảng đệm cho vùng tai thỏ.

## Cấu trúc và cập nhật sau này

- `js/campaign.js`: dữ liệu 150 màn, 15 chương, loại địch và hệ số độ khó. Thêm chương hoặc màn tại đây; `levels.length` điều khiển tiến trình và điều kiện màn cuối.
- `js/game.js`: mô phỏng theo giây, input, va chạm, kỹ năng riêng của từng loài, đạn và tiếp tế, khiên, save và giao diện.
- `js/typography.js` và `assets/fonts/`: font Noto Sans / Noto Serif có bộ ký tự tiếng Việt, tải từ file trong game trước khi vẽ Canvas. Font được phân phối theo SIL Open Font License; giấy phép nằm cùng thư mục.
- `js/mobile.js`: điều khiển toàn màn hình, hướng ngang và xử lý trình duyệt không hỗ trợ.
- `js/bosses.js`: kỹ năng boss, miễn đạn, Tsunami gọi đàn và Phàm ăn truy đuổi, tơ, trứng, tàng hình, hút máu và phân thân; đồng hồ đứng yên khi tạm dừng.
- `js/golem.js`: gậy gai, ném đá có dấu báo, hóa điên theo chu kỳ, nứt đất gây choáng và chuỗi ba nhát đập của Golem chúa.
- `js/wolves.js`: người sói nhảy vồ, sói con chạy cắn, Trăng Máu chuyển pha một lần, tiếng hú gọi bầy và hai nhát cào của Lang Vương.
- `js/kong.js`: tiểu KingKong ném chuối và ba pha boss KingKong: chuối nổ, bám dây gầm nửa sân, cuồng nộ cuối 5 giây.
- `js/dragons.js`: năm hệ rồng, vùng nguyên tố có dấu báo, Rồng ngàn tuổi và Kị sĩ rồng, Âm Dương luân hồi, thưởng khiên theo phát đạn trúng Kị sĩ.
- `js/mythic.js`: sư tử dùng giáo, Medusa hóa đá, Goatman bổ rìu; Chimera mặt đất, bay và phân hóa thành ba bản thể với tiến độ khiên dùng chung theo sát thương thực tế.
- `js/renderer.js`: nhân vật khối vuông lấy cảm hứng source gốc, 8 bối cảnh được cache cho 10 chương, bệ lơ lửng, tơ nhện, dơi biến hình, cánh rồng, vòng Âm Dương, hiệu ứng nguyên tố, hóa đá, lộn, thùng đạn, sương và ánh sáng. Rồng và quái thần thoại dùng PNG trong suốt từ `assets/sprites/`, được tải sẵn và vẽ lên Canvas; các hình vẽ bằng code làm dự phòng khi ảnh chưa sẵn sàng. Bối cảnh, các quái khác và hiệu ứng vẫn vẽ bằng code.
- `style.css` và `index.html`: giao diện responsive, bản đồ 150 màn, hướng dẫn và cài đặt.
- `tests/`: kiểm tra chiến dịch, input, đa chạm, khiên, boss, save, pause và kết thúc trận.
- `tests/boss-preview.html`: bảng xem các trạng thái hiệu ứng và dấu tiếng Việt; mở qua server local để kiểm tra hình ảnh khi cập nhật.

Khi mở rộng thêm vùng, bổ sung palette và scenery tương ứng trong renderer, cập nhật số vùng/màn hiển thị ở UI, giữ key save nếu cấu trúc tương thích hoặc migrate save khi đổi schema.

## Kiểm chứng và giới hạn

Kiểm tra tự động bảo vệ cơ chế và tiến trình; cân bằng cuối cùng vẫn cần phản hồi từ người chơi thật trên thiết bị thật. Preview local phục vụ việc phát triển; bản public được cập nhật qua nhánh `master` và GitHub Pages.

## Hướng dẫn theo chặng

Mục 05 trong Cách chơi gồm 15 chặng (1–10 đến 141–150). Lần đầu bắt đầu màn 1, 11, 21…141 sẽ mở hướng dẫn chặng đó, tạm dừng giao chiến đến khi đóng hướng dẫn hoặc nhấn Sẵn sàng. Các chặng đã đọc được lưu cùng tiến độ; thử lại không mở lặp. Có thể xem lại từng mục trong Cách chơi. Bản localhost mở toàn bộ phần thưởng để test, không ghi vào save thật; dùng `?test=off` để kiểm tra tiến trình bình thường.

## Tiếp tế khiên tại Vực Sâu Cổ Đại · v4.0.2

Màn 101–150 cấp 1 khiên sau mỗi 5 quái thường hạ được (kể cả quái thường do boss triệu hồi), tối đa 3 khiên. Boss, bản sao người chơi và ảo ảnh không cộng bộ đếm. Bộ đếm riêng tiếp tục khi qua các màn của chương III; thử lại khôi phục mốc đầu màn, chơi lại từ bản đồ bắt đầu bộ đếm mới. HUD và thông báo thiếu khiên hiển thị mốc 5. Các màn 1–100 vẫn dùng nhịp 10 địch cũ.

## Khiên khi bắn boss · v4.0.3

Trong màn 101–150, mỗi 10 viên đạn trúng boss và được chấp nhận gây sát thương cấp thêm 1 khiên, tối đa 3. Đếm số viên trúng, không đếm lượng sát thương: Hắc Hóa vẫn chỉ tính một viên; từng xương, mũi tên hoặc giáo ném được tính riêng. Đạn hụt, đạn bị chặn/phản lại, cận chiến, ảo ảnh và bản sao người chơi không tính. Hình chiếu Nộ truyền sát thương về boss 150 được tính; các hình chiếu khác không tính. Bộ đếm giữ qua chuyển dạng của cùng trận boss và bắt đầu lại khi vào/thử lại màn. HUD trên thanh boss hiển thị số viên còn tích. Cơ chế 5 quái thường và các cơ chế thưởng khiên của màn 1–100 giữ nguyên.
