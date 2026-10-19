# Combat Vực Sâu Cổ Đại — 101–150

`js/abyss-config.js` chứa các thông số cố định của đặc tả tại `fixed`, các chỉ số chơi thử tại `combat`, `enemies`, `bosses`, `weapons` và `campaign`. `balanceStatus: 'provisional-playtest'` phân biệt số liệu cân bằng tạm thời với giá trị người dùng quy định. HP, tốc độ, sát thương, bán kính, thời gian cảnh báo và các hồi chiêu chưa được xác định đều có thể chỉnh tại đây.

## Tích hợp với game hiện có

`js/abyss-combat.js` chỉ nhận các archetype mới. Quái và boss màn 1–100 tiếp tục đi qua các module combat cũ.

- `init(game, enemy)`: khởi tạo một actor mới sau khi factory tạo quái.
- `update(game, dt)`: gọi đúng một lần mỗi frame chơi, trước input và vật lý. Cập nhật trạng thái, bẫy và projectile.
- `updateEnemy(game, enemy, dt)`: thay nhánh AI chung cho các actor do `owns` nhận diện; tôn trọng portal và Hóa Đá.
- `hit(game, enemy, damage, attack)`: nhận sát thương từ điểm xử lý thống nhất của game. `undefined` là actor khác, `false` là chặn/tiêu thụ đòn, `true` là đã xử lý HP.
- `beforeKill` và `onKill`: bảo vệ các lần chuyển phase, dọn bẫy và phân thân trước khi thưởng được cấp qua BossManager hiện có.
- `reset`: hủy đối tượng tạm không cấp điểm/thưởng; trả trọng lực, ánh sáng và trạng thái điều khiển về bình thường.
- `gravityDirection`, `ceilingY`: cung cấp hướng gia tốc và mặt trần cho vật lý thật; không xoay camera để giả lập trọng lực.
- `inputDirection`, `invertAction`: đảo input tại runtime, không sửa cấu hình bàn phím đã lưu. `cleanse` dùng khi bật khiên để giải Ảo Giác/Đảo Điều Khiển.
- `hitHazards`, `meleeHazards`: projectile quét và vũ khí cận chiến có thể kích hoạt nấm/tinh linh; vẫn phải chờ hết cảnh báo mới phát nổ.

Đối tượng để renderer đọc: `game.abyssHazards`, `game.abyssShots`, `game.abyssCorpses`, `game.abyss`; actor dùng `abyssState`, `abyssPhase`, `abyssForm`, `abyssProgress`, `emotion`, `invisible`, `mirrorShield`, `frenzyTime`, `skillWarning`. `abyssCorpses` chỉ chứa bản chụp tạo hình và tiến độ hoạt ảnh chết, không phải actor có HP/va chạm. Sau khi boss thật chết, điểm/thưởng được tính đúng một lần; giao diện thắng chờ hết hoạt ảnh trước khi xuất hiện. Trong khoảng đó, bẫy và đòn mới bị dừng. Thời lượng tạm điều chỉnh tại `combat.death`.

## Các quy tắc đã giữ chính xác

- Minotaur Chúa có thêm Cuồng Nộ mỗi 10 giây chiến đấu, độc lập chuỗi bốn kỹ năng cũ. Nếu đang ra đòn hoặc hồi phục, một lượt Cuồng Nộ được xếp chờ và ưu tiên khi trở lại trạng thái an toàn; không chồng hai cú lao. Hướng húc khóa từ lúc báo đòn. Tốc độ lao thử nghiệm 680 thay cho 500, vẫn 2 sát thương, bị khiên chặn và bị choáng khi đâm vách. Renderer đọc `minotaurRage` để tăng ánh đỏ ở mắt trong báo đòn, lao và hồi phục. Nhịp cố định nằm tại `fixed.minotaurRageInterval`; các chỉ số thử nghiệm nằm tại `combat.minotaur.rageSpeed/rageWindup/rageDuration`.
- Ký sinh Hóa Điên đúng 1 giây. Đòn trúng trong thời gian đó không kéo dài hoặc tạo vòng lặp; tự gây sát thương không đi lại vào nhánh kích hoạt Hóa Điên.
- Hoa Quỷ tạo đúng 3 ảo ảnh bên cạnh bản thật. Chúng không dùng AI tấn công; đánh trúng gây nổ choáng rồi bị hủy, không tính là một boss bị tiêu diệt. Cốt Hài luân phiên giậm chân, quật rễ, quét xương và tấn công bằng hoa với vùng va chạm tương ứng.
- Rùa tàng hình mỗi 15 giây nhưng vẫn có hitbox thật. Cung, giáo và đòn diện rộng/cận chiến ép lộ diện. Mỗi hit hợp lệ chỉ giảm còn 50% đúng một lần, giữ HP lẻ. Gương phản lại 100% sát thương bằng projectile có nguồn riêng, không phản đệ quy. Thủy Độn tạo đúng 5 cột nước có khoảng né và hất tung thật.
- Ô Thước thả đá theo nhịp 5 giây; Xương Đèn Lồng chọn đúng một kỹ năng mỗi 6 giây; đá lăn xuất hiện theo nhịp 10 giây. Các nhịp bắt buộc không nhân với hệ số áp lực.
- Sí Vũ hết thanh máu đầu chuyển Kị Sĩ và có thanh HP mới. Chỉ thanh thứ hai về 0 mới kết thúc trận và cấp Lưỡi Hái.
- Thiên Thủ có một đầu/HP boss, đổi cảm xúc mỗi 20 giây ở phase đầu và 15 giây trong Mê Cung. Mốc 50% kích hoạt Mê Cung và hồi đầy đúng một lần. Bốn hình chiếu không phải bốn boss: chỉ hình chiếu Nộ chuyển sát thương vào HP thật dù đầu chính đang kích hoạt cảm xúc khác.
- Hỉ dùng vật lý đảo gia tốc/nhảy/va chạm trần. Ố chỉ che vùng chiến đấu; HUD và nút điều khiển nằm ngoài lớp ánh sáng của renderer.
- Ái sao chép HP, đạn, trang bị, kho vũ khí và danh sách kỹ năng sang dữ liệu độc lập. AI có cooldown, đạn hữu hạn, khiên, Hắc Hóa, Nhảy Cao và các kỹ năng phù hợp đã mở; chỉ bản sao đang dùng Song Rìu mới có Lăn Chém. Khi hết đạn có thể chuyển sang vũ khí cận chiến sẵn có. Bản sao không giữ tham chiếu save, không tạo bản sao khác, hết thời gian hoặc hết trạng thái Ái thì bị hủy.
- Cấp Búa tại 120, phát quang tại 130, Lưỡi Hái tại 140 qua các manager hiện có. Mốc 110 và 150 chỉ xác nhận khám phá, không tạo vũ khí/kỹ năng mới.

## Kiểm thử

`node --test tests/abyss-combat.test.cjs` kiểm tra 39 tình huống AI, thời gian, va chạm, sát thương, cleanup và tích hợp Game thật. Có kiểm thử gia tốc ngược, nhảy từ trần, phản 5 HP giữ nguyên, thưởng đúng sau phase cuối, bản sao không đổi vũ khí/save của người chơi, các dạng đánh Cốt Hài, hoạt ảnh chết không tạo actor/điểm/thưởng trùng và Cuồng Nộ theo nhịp 10 giây không chồng đòn.

Game hiện tại là chơi đơn. Hoán Đổi dùng vị trí hợp lệ trong sân; Ái tạo một bản sao cho người chơi hiện có. Không tuyên bố có multiplayer mới. Các thông số tạm cần tiếp tục thử trên điện thoại thật để cân bằng nhịp né, độ dài trận và lượng đạn rơi; đặc biệt Rùa có nội tại nhận nửa sát thương và các boss nhiều phase.
