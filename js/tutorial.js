/* One briefing per ten-stage region; combat waits until the player is ready. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{}, pending=new WeakMap();
  const guides=[
    {start:1,title:'Làm chủ cuộc săn',boss:'Xương Phân Ba · Màn 10',learn:[
      'Đi và nhảy để giữ khoảng cách; giữ nút bắn về phía địch. Trên điện thoại có thể dùng nút hoặc vuốt.',
      'Đạn có giới hạn: nhặt hòm AMMO rơi từ trên cao. Hạ đủ 10 địch nhận 1 khiên; bật khiên trước khi trúng đòn.'
    ],fight:['Né hoặc nhảy qua cột xương. Nhìn dấu báo trước khi boss phóng loạt xương.'],reward:'Hạ boss 10 mở Xương Phân Ba: mỗi lượt ném 3 xương, mỗi xương gây 1 sát thương và tốn 1 đạn. Dùng nút đổi vũ khí để chuyển giữa súng và xương.'},
    {start:11,title:'Canh nhịp khiên xanh',boss:'Thây ma xanh · Màn 20',learn:[
      'Zombie có thể đứng trên bệ rồi thả xuống. Rời vùng báo vàng trước khi chúng đáp đất.'
    ],fight:[
      'Mỗi 15 giây boss miễn đạn trong 1 giây và hồi 1 máu, không vượt máu tối đa. Chờ hết khiên rồi bắn.',
      'Tsunami mỗi 10 giây gọi 20 thây ma con chạy nối đuôi theo một hướng. Bắn, nhảy hoặc bật khiên để vượt qua.',
      'Phàm ăn báo trước rồi truy đuổi trong 1 giây: chạy trên đất hoặc nhảy từ trên cao, hồi tối đa 5 máu và gây 2 sát thương khi trúng. Chiêu lặp lại mỗi 8 giây.'
    ],reward:'Hạ boss 20 mở Khiên Bất Tử: cần ít nhất 3 khiên tích, nhấn đúp nút khiên để tiêu hao 2 khiên và bất tử 12 giây. Không kích hoạt chồng hiệu ứng.'},
    {start:21,title:'Phá trứng trước khi nở',boss:'Nhện chúa · Màn 30',learn:[
      'Nhện đu tơ rồi rơi xuống. Quan sát vị trí rơi; đừng đứng lâu dưới chúng.'
    ],fight:[
      'Tơ nhện làm choáng 2 giây. Giữ khoảng trống để né đường tơ.',
      'Boss phóng trứng mỗi 5 giây. Trứng nở sau 3 giây chạm đất; bắn 2 phát để phá trước khi nở.',
      'Một trứng nở 5 nhện mini không thể bắn hạ. Chạm mất 1 máu và choáng 1,5 giây; bật khiên chặn cả sát thương lẫn choáng.'
    ],reward:'Hạ boss 30 mở Nhảy Cao. Nhấn đúp nút nhảy để bật cao; nhấn một lần vẫn nhảy bình thường. Mobile cũng nhấn đúp nút nhảy.'},
    {start:31,title:'Theo dấu kẻ tàng hình',boss:'Ma trắng · Màn 40',learn:[
      'Quái thường trong chặng này gồm thây ma, nhện, zombie xanh và xương. Nhìn cổng sáng để biết hướng địch mới xuất hiện.'
    ],fight:[
      'Ma trắng tàng hình mỗi 5 giây; lúc đó không thể bắn trúng.',
      'Khi hiện lại, boss tập kích từ trên, trái hoặc phải theo dấu báo. Rời vùng đánh hoặc bật khiên.',
      'Trúng đòn tập kích gây ngã, mất 1 máu và 1 khiên đang tích.'
    ],reward:'Hạ boss 40 mở Hắc Hóa: mỗi 5 giây chuẩn bị một đòn gây gấp đôi sát thương. Chỉ một viên trong loạt được cường hóa, không cộng dồn nhiều đòn.'},
    {start:41,title:'Giữ khiên cho màn đêm',boss:'Dracula · Màn 50',learn:[
      'Ma cà rồng hóa dơi, bay lên rồi lao xuống. Canh dấu báo và giữ một khiên cho lúc nguy cấp.'
    ],fight:[
      'Khi Dracula hóa dơi, hút máu sẽ bám trúng mục tiêu. Bật khiên để chặn; di chuyển đơn thuần không tránh được hút máu.',
      'Ở nửa máu, Dracula phân thành hai bản thể. Phải hạ cả hai mới kết thúc cốt truyện I.'
    ],reward:'Hạ boss 50 mở Hút Máu: mỗi 10 kẻ địch hạ được hồi 1 HP, không vượt máu tối đa. Bộ đếm trở về 0 sau mỗi lần kích hoạt.'},
    {start:51,title:'Bước vào Thung lũng nguyền rủa',boss:'Golem chúa · Màn 60',learn:[
      'Chặng này có xương, Golem và nhện. Golem giơ gậy gai rồi quật vào vùng báo vàng: nhảy hoặc lùi ra ngoài.',
      'Ở xa, Golem ném đá theo đường báo. Né đường đá hoặc bật khiên; Golem chúa ném ba viên theo hình quạt.'
    ],fight:[
      'Mỗi 10 giây Golem chúa hóa điên trong 5 giây. Né vết nứt đất gây choáng.',
      'Boss lao tới rồi đập đất 3 nhát. Mỗi nhát gây 3 sát thương nếu không bật khiên; giữ khoảng cách và đừng đứng trong vùng đập.'
    ],reward:'Hạ boss 60 mở Chùy Golem cận chiến. Nhấn nhanh nút vũ khí để đổi; giữ để mở bảng chọn. PC dùng mũi tên và Enter; điện thoại chọn bằng cảm ứng.'},
    {start:61,title:'Sẵn sàng dưới Trăng Máu',boss:'Lang Vương · Màn 70',learn:[
      'Người sói khóa điểm đáp trước khi nhảy vồ: rời vùng báo hoặc bật khiên. Sói con chạy một hướng, không quay lại truy đuổi.',
      'Riêng màn 70 tạm khóa vũ khí và kỹ năng thưởng; giữ súng gốc cùng khiên thường. Ra khỏi màn, trang bị và kỹ năng được khôi phục.'
    ],fight:[
      'Ở nửa máu, Lang Vương hóa lớn gấp đôi và hồi đầy máu. Hú 4 giây sẽ miễn đạn và gọi 5 sói con; sau tiếng hú nghỉ 6 giây dạng thường / 4 giây Trăng Máu.',
      'Trong Trăng Máu, mỗi 1,5 giây bắt đầu một lượt nhảy cào kéo dài 1,5 giây gồm 2 nhát; mỗi nhát gây 2 sát thương nếu không bật khiên.',
      'Súng ngắm tốn 5 đạn/phát, gây 5 sát thương; giữ để bắn liên tục mỗi 0,17 giây, cần ít nhất 5 đạn.',
      'Nhấn đúp cùng hướng để lộn khỏi vùng cào. Mobile có nút LƯỚT trái/phải, nhấn đúp nút đi hoặc vuốt hai lần cùng hướng. Lướt hồi 0,9 giây, chặn sát thương 0,32 giây và không gây sát thương.'
    ],reward:'Lướt và súng ngắm Trăng Máu là cơ chế riêng của màn 70; phần thưởng đã mở trước đó vẫn được giữ trong dữ liệu người chơi.'},
    {start:71,title:'Né chuối và nghe tiếng gầm',boss:'KingKong · Màn 80',learn:[
      'Rừng có Tiểu KingKong, Golem, nhện và sói con. Né chuối ném từ xa và tránh vỏ chuối trên đất.'
    ],fight:[
      'Chuối khổng lồ nổ thành 5 vỏ trơn, gây ngã và choáng 0,5 giây nếu không bật khiên.',
      'Ở nửa máu, boss hồi đầy một lần rồi bám dây leo, gầm vào nửa sân. Di chuyển sang nửa còn lại để né.',
      'Khi boss đu dây, súng tự ngẩng lên; mỗi viên gây 2 sát thương. Mỗi 5 phát bắn nhận 1 khiên, tối đa 3.',
      'Hết máu chưa thắng ngay: KingKong nổi điên 5 giây, lao xuống và đánh liên tục 3 sát thương/đòn. Khiên đang bật bảo vệ trong thời gian hiệu lực; sống qua cơn cuồng nộ mới chiến thắng.'
    ],reward:'Hạ boss 80 mở đổi chế độ bắn cao / mặt đất. Dùng hai phím ngắm đã cài đặt hoặc nút tầm cao / mặt đất trên điện thoại; không tự đổi vũ khí.'},
    {start:81,title:'Chiến đấu với rồng trên cao',boss:'Rồng ngàn tuổi · Màn 90',learn:[
      'Rồng ra chiêu mỗi 4 giây: lửa gây cháy 2 giây, mất 1 máu/giây; băng thả 4 khối, mỗi khối mất 1 máu.',
      'Gió hất tung và choáng 2 giây nhưng không gây sát thương. Đất tạo 3 ô dung nham, mỗi ô gây 1 máu rồi biến mất. Sét dưới rồng gây 1 máu và choáng 2 giây.',
      'Dùng chế độ bắn cao khi đánh rồng. Nếu chưa mở đổi tầm bắn, súng sẽ tự ngẩng khi cần; quái mặt đất gần phía bắn vẫn được ưu tiên.'
    ],fight:[
      'Rồng ngàn tuổi dùng ngẫu nhiên một kỹ năng nguyên tố mỗi 3 giây. Ở nửa máu, Âm Dương Luân Hồi phủ 2/3 sân: trúng mất 3 máu, có khiên vẫn mất 1 máu.',
      'Hết thanh máu đầu, boss đáp đất thành Kỵ Sĩ Rồng và hồi đầy. Né 5 sóng âm mỗi 6 giây cùng liên kích thương mỗi 3 giây.',
      'Mỗi 10 phát bắn trúng Kỵ Sĩ nhận 1 khiên tích. Hạ dạng Kỵ Sĩ mới kết thúc trận.'
    ],reward:'Hạ boss 90 mở Cung Hắc Ám và Giáo Bạch Kim. Cung bắn 5 mũi tên / 5 đạn; giáo đâm khi sát mục tiêu, ném khi ở xa. Hắc Hóa chỉ cường hóa một đơn vị tấn công.'},
    {start:91,title:'Ba bản thể của cổ thú',boss:'Chimera · Màn 100',learn:[
      'Sư tử ném giáo khi xa, đâm khi gần. Medusa chạm hoặc nhìn sau mỗi 5 giây sẽ hóa đá 1,5 giây; khiên chặn hoặc hóa giải. Goatman giơ rìu rồi bổ khi đến gần.'
    ],fight:[
      'Dạng đất mỗi 4 giây ngẫu nhiên bắn laze hoặc nhảy cắn gây 2 máu. Né đường laze và vùng cắn.',
      'Ở nửa máu, boss hồi đầy rồi bay lên. Mỗi 4 giây ngẫu nhiên dùng hỏa phong phủ 1/3 sân hoặc sà khóa mục tiêu. Rời vùng hỏa phong, bật khiên đỡ cú sà; súng tự chuyển tầm cao.',
      'Còn 10 máu, Chimera tách thành Sư tử vương 30 máu, Medusa Queen 20 máu, Goatman huy hoàng 40 máu. Sư tử thêm nhảy cào; Queen gọi Medusa mỗi 10 giây; Goatman miễn đạn 2 giây mỗi 8 giây.',
      'Cứ 10 máu thực sự gây lên boss hoặc phân thân nhận 1 khiên, tối đa 3. Hạ đủ ba bản thể mới thắng.'
    ],reward:'Hạ boss 100 mở Song Rìu và Hóa Đá. Chỉ trang bị Song Rìu mới Lăn Chém khi nhấn đúp hướng, gây 2 sát thương/mục tiêu/lượt. Hóa Đá chọn một quái thường hoặc quái triệu hồi mỗi 8 giây, khóa 2 giây; không tác dụng lên boss.'},
    {start:101,title:'Ánh đuốc trong mê cung',boss:'Minotaur Chúa · Màn 110',learn:[
      'Theo ánh đuốc qua hang tối. Tránh nấm độc đang phồng và dấu báo đá rơi; rời vùng tròn trước khi nấm nổ.',
      'Minotaur con dùng rìu cận chiến. Giữ khoảng cách, bắn khi nó vừa kết thúc đòn.'
    ],fight:[
      'Quan sát vùng bổ rìu, đường lao và dấu đá rơi. Né ngang khỏi đường húc; boss đâm vào vách sẽ bị choáng.',
      'Cuồng Nộ mỗi 10 giây: mắt đỏ mạnh hơn, boss lao nhanh hơn. Hướng lao khóa từ lúc báo chiêu; đừng đứng trong đường báo và giữ khiên dự phòng.'
    ],reward:'Hạ boss 110 mở tiếp hành trình vào hang ký sinh. Mốc này không cấp thêm vũ khí hoặc kỹ năng.'},
    {start:111,title:'Phân biệt thật và ảo',boss:'Mộc Tâm Hoa Quỷ · Màn 120',learn:[
      'Ký Sinh Trùng con ra chiêu mỗi 10 giây. Khi bị kích hoạt, chúng hóa điên đúng 1 giây; giữ khoảng trống để né.',
      'Né phấn hoa và rễ đen. Bật khiên để hóa giải ảo giác trước khi bị mất máu thêm.'
    ],fight:[
      'Boss có bản thật và 3 ảo ảnh. Đánh nhầm ảo ảnh sẽ gây nổ choáng; quan sát và chọn bản thật.',
      'Cốt hài lần lượt giậm chân, quật rễ, quét xương và cắn bằng hoa. Rời vùng báo trước khi đòn chạm đất.'
    ],reward:'Hạ boss 120 mở Búa Minotaur: vũ khí cận chiến không tốn đạn, gây 4 sát thương với tầm rộng hơn. Chuyển vũ khí qua bảng chọn; búa không có Lăn Chém Song Rìu.'},
    {start:121,title:'Đừng bắn vào gương',boss:'Xích Kính Quái Sùng · Màn 130',learn:[
      'Tiểu Quy tạo đợt nước từ xa. Né đường nước và giữ khoảng trống để không bị hất vào đòn kế tiếp.',
      'Trên hồ ngầm vẫn có đá và tinh thể rơi. Đọc dấu báo trên đất thay vì chỉ nhìn boss.'
    ],fight:[
      'Rùa tàng hình mỗi 15 giây nhưng vẫn có thể bị đánh. Dùng cung, giáo hoặc đòn cận chiến/diện rộng để ép lộ diện.',
      'Boss chỉ nhận một nửa sát thương hợp lệ. Khi dựng gương, đạn bị phản lại đúng sát thương gốc: ngừng bắn hoặc đổi sang cận chiến.',
      'Thủy Độn tạo 5 cột nước có khe né. Rời dấu báo để tránh mất máu và bị hất tung.'
    ],reward:'Hạ boss 130 mở Phát Quang Vũ Khí, thêm vùng sáng quanh vũ khí trong bóng tối.'},
    {start:131,title:'Lắng nghe vách đá vọng âm',boss:'Hóa Thạch Sí Vũ · Màn 140',learn:[
      'Ô Thước thả đá mỗi 5 giây. Xương Đèn Lồng dùng hoán đổi hoặc đảo điều khiển mỗi 6 giây; đá lăn xuất hiện theo nhịp 10 giây.',
      'Nếu điều khiển bị đảo, bình tĩnh đọc hướng mới; bật khiên để hóa giải. Tránh đứng sát mép khi đá lăn tới.'
    ],fight:[
      'Né sóng âm và vùng bổ của Phượng điểu hóa thạch. Sóng âm có thể đảo hướng điều khiển.',
      'Hết thanh máu đầu, boss thành Kỵ Sĩ đầu chim với thanh máu mới. Né lưỡi hái, cú lao, liên kích và sóng tầm xa.',
      'Sau dịch chuyển có dấu báo mới trước đòn đánh. Di chuyển theo dấu báo thay vì bắn vào vị trí cũ.'
    ],reward:'Hạ dạng Kỵ Sĩ mở Lưỡi Hái Cổ Điểu: chém rộng và phóng sóng xung kích tầm xa, không tốn đạn. G hoặc nút Hoán đổi để đổi chỗ với quái thường gần nhất, hồi 6 giây; boss miễn nhiễm. Chỉ khi dạng cuối bị hạ mới nhận thưởng.'},
    {start:141,title:'Bốn gương mặt dưới lăng mộ',boss:'Thiên Thủ Cổ Thần · Màn 150',learn:[
      'Tránh bàn tay cổ đại, vệ binh đất sét và bẫy lăng mộ. Giữ khiên cho những lần bị vây hoặc đổi trọng lực.',
      'Trong bóng tối dạng Ố ở pha đầu, vũ khí soi vùng tròn ba bước quanh nhân vật; HUD và nút điều khiển vẫn nhìn được.'
    ],fight:[
      'Boss đổi một gương mặt đang hoạt động mỗi 20 giây: Hỉ đảo trọng lực, Nộ gây chấn động, Ái tạo bản sao người chơi, Ố che tối và tập kích.',
      'Bản sao Ái có vũ khí và kỹ năng đã mở tương ứng. Né đòn của nó như né người chơi khác; đừng quên giữ đạn và khiên.',
      'Ở nửa máu, boss hồi đầy đúng một lần và mở Mê Cung Luân Hồi. Cảm xúc đổi mỗi 15 giây; chỉ hình chiếu Nộ chuyển sát thương vào thanh máu thật.',
      'Quan sát gương mặt và hiệu ứng màu, tìm đúng hình chiếu Nộ. Hạ thanh máu chung để kết thúc cốt truyện III.'
    ],reward:'Mốc 150 hoàn thành Vực Sâu Cổ Đại. Tiến độ và những phần thưởng đã mở được lưu trên thiết bị; mốc này không cấp thêm vũ khí hoặc kỹ năng.'},
    {start:151,title:'Hơi thở đầu tiên dưới biển',boss:'Quái Ngư Song Trảo · Màn 160',learn:[
      'Trong Tầng Biển Nông, nhân vật bơi lơ lửng thay vì nhảy. Đi trái/phải để né đòn; phím ↑ hoặc nút OXY dùng 1 bình dự trữ để hồi 50% oxy. Giữ phím không dùng liên tiếp nhiều bình.',
      'Oxy đầy duy trì 30 giây. Bắt đầu có 2 bình dự trữ; mỗi hòm OXY cho thêm 2 bình. Hết oxy sẽ khóa vũ khí ngay; sau 5 giây ngạt, bạn mất 1 HP mỗi giây. Hãy nhặt hòm và cấp oxy sớm.',
      'Màn 151–153 có cá piranha lao tới theo hướng đã báo. Từ 154 thêm cá nóc phồng gai khi bạn đến gần; từ 157 thêm cá ngựa bắn cầu nước từ xa. Hòm tiếp tế trôi giữa nước, không nằm trên mặt đất.'
    ],fight:[
      'Liên Trảo báo trước rồi lao tới cào 3 nhát. Mỗi nhát trúng mất 1 HP và 1 khiên dự trữ nếu có; bật khiên để chặn HP và dùng 1 lượt đỡ. Bất Tử vẫn bảo vệ HP.',
      'Ở nửa máu, boss tạo một bản sao có thanh máu riêng 60 HP. Boss gốc có 120 HP; phải hạ cả hai mới thắng, bản sao không nhân đôi tiếp.',
      'Câm Lặng khóa sát thương vũ khí trong 3 giây; bạn vẫn bơi và cấp oxy được. Chiêu lặp lại mỗi 15 giây ở dạng thường và 10 giây khi Song Sinh. Rời vùng hút của lốc nước: chỉ khi chạm lõi mới mất 2 HP và một nửa oxy hiện có.'
    ],reward:'Hạ đủ hai bản thể boss 160 mở Hóa Ngư Nhân: R hoặc nút Ngư Nhân biến hình trong 10 giây, một lần mỗi lượt vào màn; thử lại có lượt mới. Chỉ dùng dưới nước. Khi biến hình không hao oxy, không ngạt và miễn mọi đòn hút oxy của boss; không tự hồi đầy oxy. Miễn HP quái thường nhưng vẫn chịu khống chế và sát thương boss. Quyền mở khóa được lưu vĩnh viễn.'},
    {start:161,title:'Ánh điện trong tầng nước thẳm',boss:'Sứa Ma Khổng Lồ · Màn 170',learn:[
      'Giữ nguyên cách bơi, oxy và tiếp tế của Tầng Biển Nông. ↑ hoặc nút OXY dùng bình dự trữ để cấp oxy, không nhảy. Oxy vẫn giảm khi bạn bị choáng; hết oxy vẫn khóa vũ khí và bắt đầu đếm ngạt 5 giây.',
      'Màn 161–163 có cá ngựa giữ nguyên đạn nước cao áp và cá mập con liên tục bơi tới cắn. Né vùng miệng khi hàm mở; cá mập không có chiêu lao xuyên màn hình hoặc gây choáng.',
      'Màn 164–166 kết hợp cá mập với Sứa Điện từ đáy bơi thẳng lên. Từ 167 có đủ ba loài. Sứa không thể bị tiêu diệt: chạm thân hoặc xúc tu gây choáng 2 giây, không mất HP hay oxy trực tiếp. Hãy né và chờ chúng bơi khỏi sân.'
    ],fight:[
      'Tê Tái mỗi 10 giây: boss đến gần, xúc tu sáng rồi đâm. Trúng vùng đánh mới bị choáng 3 giây, mất 1 HP và một nửa oxy. Rời vùng xúc tu trước khi chạm.',
      'Tập Tính Bầy Đàn mỗi 15 giây gọi đúng 5 sứa bất tử từ dưới lên. Mỗi con chạm gây choáng 2 giây và mất một phần ba oxy, không trừ HP trực tiếp.',
      'Laze Plasma mỗi 8 giây: mắt boss sáng trước khi bắn chùm xanh tím dài nửa sân. Trúng mất 2 HP, không bị choáng hoặc trừ oxy trực tiếp. Né khỏi đường báo trước khi laze phát ra.',
      'Còn 25% HP, boss tạo đúng một ảo ảnh giống hệt, có thanh máu riêng bằng boss lúc triệu hồi và không ra chiêu. Hai thực thể báo sáng 0,8 giây rồi đổi vị trí mỗi 6 giây; chỉ cần hạ boss thật để thắng.',
      'Các chiêu trừ phần trăm đều tính theo oxy hiện có. Khiên đang bật chặn sát thương, choáng và hao oxy của đòn trúng, đổi lại mất 1 lượt đỡ. Bạn vẫn có thể cấp oxy trong lúc choáng.'
    ],reward:'Hạ boss thật màn 170 mở Cầu Chớp trong danh sách F. Giữ bắn để nối tối đa 5 mục tiêu hợp lệ trong tầm; mỗi HP thực mất tiêu đúng 1 đạn, kể cả đạn lẻ. Không tính sát thương thừa hoặc tốn đạn khi địch miễn nhiễm. Cầu đánh được boss nhưng không xuyên phòng thủ; Hắc Hóa chỉ cường hóa một tia. Chỉ Song Rìu giữ quyền Lăn Chém.'},
    {start:171,title:'Giữa vùng săn mồi cổ đại',boss:'Mega London · Màn 180',learn:[
      'Giữ nguyên cách bơi và oxy. Cá Mập Đầu Búa hạ đầu báo trước cú húc mỗi 2 giây; trúng mất 1 HP, không choáng hoặc trừ oxy. Từ màn 174 có Cá Đuối Điện: mỗi 10 giây báo điện rồi gây 1 HP và choáng 1 giây nếu trúng.',
      'Từ màn 177, một Cá Kiếm lao ngang sau dấu báo ở mép sân. Mỗi đợt 5 giây chỉ có một con, đi đúng một hướng rồi rời sân. Bắn hạ, bật khiên hoặc dùng Ngư Nhân để xử lý; chỉ khi cầm Song Rìu mới có Lăn Chém. Nhân vật vẫn bơi ngang theo điều khiển cũ.',
      'Hóa Ngư Nhân dùng một lần mỗi lượt vào màn và kéo dài 10 giây: dừng hao oxy, ngăn ngạt cùng mọi đòn hút oxy của boss; chỉ miễn HP quái thường, vẫn chịu choáng và HP boss. Cầu Chớp nối tối đa 5 mục tiêu; đạn tiêu đúng HP thực mất, không trừ khi miễn nhiễm.'
    ],fight:[
      'Cắn Âm Thanh mỗi 15 giây khóa vị trí, há hàm rồi lao tới. Mũi hàm trúng gây 3 HP; khiên đang bật chặn theo cơ chế hiện có.',
      'Sát Thủ Biển Khơi mỗi 10 giây: boss lặn khuất đúng 3 giây rồi cắn từ dưới lên, gây 3 HP khi trúng. Quan sát dấu nước báo phía dưới; lúc ẩn không có hitbox vô hình.',
      'Âm Vang Xung Kích gầm 3 giây trong nửa sân. Trúng gây choáng và Hoảng Loạn 3 giây, mỗi giây trừ 10% oxy hiện có, không gây HP trực tiếp. Rời vùng báo hoặc dùng khiên; Ngư Nhân chặn phần hao oxy.',
      'HP về 0 chưa thắng ngay: Hung Thần Trỗi Dậy làm boss bất khả xâm phạm đúng 5 giây, không hồi máu. Ngừng tốn đạn vào boss miễn nhiễm, dùng khiên và sống qua cơn cuồng nộ. Không tự tăng thời gian hoặc hồi khiên.'
    ],reward:'Vượt qua năm giây cuồng nộ và hạ Mega London mở Tam Tinh Hải Đăng: ba sao biển nhỏ theo người chơi, cùng soi một vùng 8 bước dưới nước, không cộng thành 24 bước. Chúng không gây sát thương hoặc choáng. Quyền mở khóa được lưu vĩnh viễn; tiến độ 180 đã hoàn thành nhận tự động.'},
    {start:181,title:'Hơi thở giữa miền vô quang',boss:'Leviathan Chúa · Màn 190',learn:[
      'Oxy tại màn 181–190 hao bằng 1,5 lần tầng nông, dung lượng bình và hệ thống tiếp tế giữ nguyên. ↑ vẫn cấp oxy. Ngư Nhân dừng hao oxy 10 giây, không miễn đòn boss hoặc tự hóa giải trạng thái nuốt.',
      'Màn 181–183 có Gulper hút mỗi 5 giây trong 4 bước, gây 1 HP khi chạm vùng miệng. Từ 184 thêm Cá Mập Ma phát hiện bạn trong 6 bước. Hai loài dùng cùng đơn vị bước; rời đường hàm và dòng hút đã báo.',
      'Từ 187 thêm Bọ Phát Sáng. Lõi sáng nhấp nháy trước một vụ nổ, mỗi con chỉ nổ một lần. Giữ khoảng nước quanh người và ba sao biển, thu hòm oxy trước khi cạn.'
    ],fight:[
      'Táp cơ bản mỗi 10 giây, độc lập với năm kỹ năng. Âm Vang Bầy Đàn hồi 20 giây: siêu âm và rung trong 3 giây rồi gọi đúng 2 Leviathan Con, mỗi con có một phần tư HP tối đa boss theo cấu hình thử.',
      'Lãnh Chúa Biển Khơi hồi 15 giây: tiếng gầm gây choáng không trừ HP riêng, rồi boss lao cắn; trúng hàm mất 1 HP. Hố Đen hút trong nửa sân, khi vào miệng sẽ bị nuốt 5 giây, khóa vũ khí rồi nhả gây 3 HP. Bật khiên hợp lệ trước khi nuốt để chặn cả chuỗi.',
      'Cạn HP lần đầu: Điên Loạn hồi đúng 25% HP tối đa một lần, gọi đúng hai đợt con trong 5 giây rồi tiếp tục chiến đấu. Không có chiến thắng ở lần cạn máu này.',
      'Cạn HP lần hai: Hơi Thở Cuối Cùng kéo dài 5 giây. Quan sát dấu báo và bật khiên đúng lúc để chặn đòn nuốt kết liễu. Ngư Nhân và miễn HP không thay cho khiên. Chỉ sau khi thử thách được giải quyết mới thắng.'
    ],reward:'Hạ Leviathan sau Hơi Thở Cuối Cùng mở Tự Do Đại Dương: bơi lên/xuống và chéo trong không gian 2D dưới biển. Phím cấp oxy vẫn riêng. PC dùng phím bơi dọc trong Cài đặt; điện thoại có điều khiển lên/xuống. Quyền mở khóa lưu vĩnh viễn, tương thích với Ngư Nhân và các vũ khí cũ.'},
    {start:191,title:'Ba ngọn sao tại đáy biển',boss:'Kraken · Màn 200',learn:[
      'Oxy màn 191–200 hao gấp 2 lần tầng nông, thay hệ số 1,5 của tầng trước; không cộng thành x3. Bơi dọc chỉ mở sau Leviathan; phím ↑ tiếp tục cấp oxy. Bơi lên/xuống bằng phím đã đặt trong Cài đặt hoặc nút cảm ứng.',
      '191–193 có Cua Biển và Trai Ngọc. Chạm ngọc để nhận oxy, rời vỏ trước lúc đóng sau 2 giây. Ngọc tái tạo 10 giây tính từ lúc lấy, không phải sau lúc đóng. Từ 194 thêm Cá Cần Câu thu đèn rồi cắn, cùng Bọ Phát Sáng xuất hiện thường hơn.',
      'Từ 197 có Mực Ống quật xúc tu 1 HP và phun mực bơi trốn sau khi bị đánh; mực này không tắt sao biển. Rùa bơi ngang chỉ cắn khi bạn quá gần miệng. Quan sát miệng phun: cột nước gây 1 HP và choáng 1 giây, mỗi đợt chỉ trúng một lần.'
    ],fight:[
      'Vòi Giác Hút hồi 10 giây: vùng xúc tu trúng gây 1 HP, choáng và hao oxy theo cấu hình thử. Ném Xác Tàu hồi 15 giây, tầm một phần ba sân; chỉ va chạm thật mới gây 1 HP, không thêm sát thương mảnh vỡ.',
      'Bóng Đen tắt ánh sáng Tam Tinh trong đúng 10 giây; sao biển vẫn tồn tại và theo bạn. Hết mực, vùng sáng 8 bước trở lại. HUD và cảnh báo nguy hiểm vẫn nhìn được.',
      'Tại 50% HP, Vọng Âm Biển Khơi kích hoạt một lần: miệng phun hoạt động thường hơn và tăng từ 1 lên 2 HP, choáng vẫn 1 giây. Tiếng gầm không gây thêm HP hoặc tăng hệ số oxy.',
      'Hóa Thạch giữ Kraken trong đá 5 giây và hồi 25% HP tối đa, không vượt trần; kết thúc gọi Mega London và Leviathan theo quy tắc triệu hồi của trận này. Hai hung thần không cấp lại thưởng hoặc mở màn thắng riêng. Những chỉ số chưa chốt được đánh dấu là cấu hình chơi thử.'
    ],reward:'Hoàn thành điều kiện trận Kraken để xem hành trình nổi lên mặt biển và trở về đất liền. Tiến độ màn 200 cùng toàn bộ phần thưởng được lưu; oxy, nuốt, choáng và hiệu ứng boss được dọn. Không tự thêm phần thưởng boss 200.'}
  ].map((g,index)=>({...g,index:index+1,end:g.start+9,learn:g.start>=101&&g.start<=141?['Trong màn 101–150, hạ mỗi 5 quái thường hoặc bắn trúng boss đủ 10 viên nhận 1 khiên, giữ tối đa 3. Hai bộ đếm riêng biệt. Đạn hụt, bị chặn/phản lại và đòn cận chiến không tính vào mốc bắn boss. Bắn đúng hình chiếu Nộ trong mê cung vẫn được tính.',...g.learn]:g.learn}));
  const forLevel=id=>guides.find(g=>id>=g.start&&id<=g.end)||guides[0];
  const normalizeSeen=value=>Array.isArray(value)?[...new Set(value.filter(id=>guides.some(g=>g.start===id)))].sort((a,b)=>a-b):[];
  function element(tag,text,className){const e=root.document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
  function content(guide){
    const fragment=root.document.createDocumentFragment();
    for(const [title,items] of [['Trong chặng này',guide.learn],[guide.boss,guide.fight],['Sau khi hạ boss',[guide.reward]]]){
      const section=element('section',null,'guide-topic');section.append(element('h4',title));
      const list=element('ul');for(const item of items)list.append(element('li',item));section.append(list);fragment.append(section);
    }
    return fragment;
  }
  function focusHelp(g){
    const current=forLevel(g.level.id);
    for(const node of g.ui?.['boss-guide-sections']?.querySelectorAll('details')||[])node.open=Number(node.dataset.guideStart)===current.start;
  }
  function complete(g){
    const state=pending.get(g);if(!state)return false;pending.delete(g);
    if(g.screen!=='briefing'||g.level.id!==state.level)return false;
    g.save.guidesSeen=normalizeSeen([...(g.save.guidesSeen||[]),state.start]);g.persist();
    g.screen='playing';g.lastTime=0;g.clearInputs();g.updateUI();g.mobileView?.enter();g.canvas?.focus({preventScroll:true});return true;
  }
  function onStart(g,options={}){
    pending.delete(g);
    const guide=forLevel(g.level.id),dialog=g.ui?.['tutorial-dialog'];
    if(g.headless||!dialog||options.retry||g.level.id!==guide.start||normalizeSeen(g.save.guidesSeen).includes(guide.start))return false;
    focusHelp(g);pending.set(g,{start:guide.start,level:g.level.id});
    g.ui['tutorial-kicker'].textContent=`CHẶNG ${String(guide.index).padStart(2,'0')} / ${guides.length} · MÀN ${guide.start}–${guide.end}`;
    g.ui['tutorial-title'].textContent=guide.title;
    g.ui['tutorial-content'].replaceChildren(content(guide));
    const keys=MM.KeyBindings,bindings=keys?.normalize(g.settings.keyBindings);
    const underwater=guide.start>=151;
    g.ui['tutorial-controls'].textContent=bindings?`PC: ${keys.label(bindings.left)} / ${keys.label(bindings.right)} di chuyển · ${keys.label(bindings.jump)} ${underwater?'cấp oxy':'nhảy'} · ${keys.label(bindings.shootLeft)} / ${keys.label(bindings.shootRight)} bắn · ${keys.label(bindings.shield)} khiên. Mobile: ${underwater?'nút OXY hoặc vuốt lên để cấp oxy; dùng nút hoặc vuốt ngang để bơi.':'dùng nút hoặc vuốt.'}`:underwater?'PC: ↑ cấp oxy. Mobile: nút OXY hoặc vuốt lên để cấp oxy; dùng nút hoặc vuốt ngang để bơi. Các phím PC có thể đổi trong Cài đặt.':'Dùng nút hoặc vuốt trên điện thoại; các phím PC có thể đổi trong Cài đặt.';
    if(underwater&&MM.SaveManager?.unlocked(g,190))g.ui['tutorial-controls'].textContent=`Bơi ngang: ${bindings?keys.label(bindings.left)+' / '+keys.label(bindings.right):'← / →'}. Bơi dọc: ${bindings?keys.label(bindings.aimHigh)+' / '+keys.label(bindings.aimGround):'W / S'}. ${bindings?keys.label(bindings.jump):'↑'} cấp oxy; ${bindings?keys.label(bindings.shield):'Space'} khiên. Mobile: vuốt ngang/dọc giữ hướng hoặc nút bơi; nút OXY và KHIÊN hoạt động riêng.`;
    g.ui['tutorial-begin'].textContent='Sẵn sàng · Bắt đầu màn '+g.level.id+' →';
    g.screen='briefing';g.clearInputs();g.updateUI();dialog.showModal();dialog.scrollTop=0;return true;
  }
  function bind(g){
    const container=g.ui?.['boss-guide-sections'];if(!container)return;
    for(const guide of guides){
      const details=element('details',null,'boss-guide-chapter');details.dataset.guideStart=guide.start;
      const summary=element('summary');summary.append(element('span',`${guide.start}–${guide.end}`),element('strong',guide.title),element('small',guide.boss));details.append(summary,content(guide));
      details.addEventListener('toggle',()=>{if(details.open)for(const other of container.querySelectorAll('details'))if(other!==details)other.open=false;});container.append(details);
    }
    focusHelp(g);
    g.ui['tutorial-begin']?.addEventListener('click',()=>g.ui['tutorial-dialog'].close());
    g.ui['tutorial-dialog']?.addEventListener('close',()=>{if(!g.ui['tutorial-dialog'].open)complete(g);});
  }
  MM.Tutorial={guides,forLevel,normalizeSeen,onStart,complete,focusHelp,bind,cancel:g=>pending.delete(g)};
})(typeof window!=='undefined'?window:globalThis);
