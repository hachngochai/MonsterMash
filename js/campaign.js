(function (root) {
  'use strict';

  // Campaign data is separate from combat so future worlds can be added here.
  const worlds = [
    { id: 0, name: 'Nghĩa địa sương mù', subtitle: 'Làm quen với bóng tối', color: '#67e2b0', enemy: 'skeleton' },
    { id: 1, name: 'Rừng tơ độc', subtitle: 'Giữ khoảng cách, chọn thời điểm', color: '#acd96a', enemy: 'spider' },
    { id: 2, name: 'Thành phố lãng quên', subtitle: 'Nhìn xuyên những làn sương', color: '#83c9ff', enemy: 'ghost' },
    { id: 3, name: 'Lâu đài trăng máu', subtitle: 'Nhanh tay trước cú lao tới', color: '#d5a0ff', enemy: 'vampire' },
    { id: 4, name: 'Cổng nhật thực', subtitle: 'Trận chiến cho bình minh', color: '#ffb46c', enemy: 'vampire' },
    { id: 5, name: 'Thung lũng nguyền rủa', subtitle: 'Ánh sáng giữa rừng gai', color: '#becd80', enemy: 'golem' },
    { id: 6, name: 'Thung lũng trăng máu', subtitle: 'Tiếng hú dưới tán gai', color: '#d6ac91', enemy: 'werewolf', scenery: 5 },
    { id: 7, name: 'Rừng nguyên sinh', subtitle: 'Vua rừng thức giấc', color: '#e9c96e', enemy: 'miniKingKong', scenery: 5 },
    { id: 8, name: 'Thiên không ngũ hành', subtitle: 'Dưới cánh rồng ngàn tuổi', color: '#9cdbec', enemy: 'fireDragon', scenery: 8 },
    { id: 9, name: 'Tàn tích thần thoại', subtitle: 'Ba bản thể của Chimera', color: '#e2c58e', enemy: 'lionMan', scenery: 9 },
    { id: 10, name: 'Mê Cung Minotaur', subtitle: 'Mang ánh đuốc qua cửa đá', color: '#ed795e', enemy: 'minotaurCalf', scenery: 10 },
    { id: 11, name: 'Hang Ký Sinh Cổ Đại', subtitle: 'Phân biệt thực và ảo', color: '#d68cf5', enemy: 'parasite', scenery: 11 },
    { id: 12, name: 'Hồ Nước Ngầm và Hang Thạch Anh', subtitle: 'Ánh sáng sau chiếc mai gương', color: '#86e6f8', enemy: 'littleTurtle', scenery: 12 },
    { id: 13, name: 'Vách Đá Vọng Âm và Sân Nghi Lễ', subtitle: 'Lần theo tiếng vọng của cổ điểu', color: '#bd96ec', enemy: 'abyssCrow', scenery: 13 },
    { id: 14, name: 'Lăng Mộ Luân Hồi', subtitle: 'Một đầu xoay, bốn cõi lòng', color: '#e0bb73', enemy: 'clayGuard', scenery: 14 }
  ];

  const enemyTypes = {
    skeleton: { w: 38, h: 68, speed: 46, health: 1, score: 80, damage: 1, ability: null },
    zombie: { w: 48, h: 76, speed: 33, health: 2, score: 120, damage: 1, ability: 'ledge-drop' },
    greenZombie: { w: 48, h: 76, speed: 38, health: 3, score: 160, damage: 1, ability: 'ledge-drop', archetype: 'zombie', variant: 'green' },
    spider: { w: 58, h: 34, speed: 63, health: 1, score: 100, damage: 1, ability: 'silk-drop' },
    ghost: { w: 44, h: 64, speed: 44, health: 2, score: 150, damage: 1, ability: 'sine-drop' },
    vampire: { w: 46, h: 78, speed: 55, health: 3, score: 190, damage: 1, ability: 'bat-morph' },
    golem: { w: 74, h: 108, speed: 34, health: 4, score: 240, damage: 1, ability: 'club-swing', abilities: ['club-swing','rock-throw'] },
    miniGolem: { w: 38, h: 68, speed: 44, health: 2, score: 170, damage: 1, ability: 'club-swing', abilities: ['club-swing','rock-throw'], archetype: 'golem', variant: 'mini' },
    werewolf: { w: 48, h: 72, speed: 58, health: 3, score: 210, damage: 1, ability: 'pounce' },
    wolfPup: { w: 26, h: 36, speed: 76, health: 1, score: 35, damage: 1, ability: null, archetype: 'werewolf', variant: 'pup' },
    miniKingKong: { w: 56, h: 62, speed: 48, health: 3, score: 220, damage: 1, ability: 'banana-throw', archetype: 'kong', variant: 'mini' },
    kong: { w: 126, h: 138, speed: 38, health: 72, score: 880, damage: 1, ability: 'banana-throw' },
    fireDragon: {w:92,h:76,speed:54,health:4,score:300,damage:1,ability:'fire-breath',archetype:'dragon',variant:'fire'},
    iceDragon: {w:92,h:76,speed:50,health:4,score:310,damage:1,ability:'ice-fall',archetype:'dragon',variant:'ice'},
    windDragon: {w:92,h:76,speed:62,health:4,score:300,damage:0,ability:'wind-lift',archetype:'dragon',variant:'wind'},
    earthDragon: {w:96,h:80,speed:45,health:5,score:330,damage:1,ability:'lava-tiles',archetype:'dragon',variant:'earth'},
    lightningDragon: {w:92,h:76,speed:60,health:4,score:340,damage:1,ability:'lightning-strike',archetype:'dragon',variant:'lightning'},
    dragon: {w:252,h:190,speed:34,health:100,score:2800,damage:1,ability:'five-elements'},
    lionMan: {w:38,h:54,speed:55,health:3,score:260,damage:1,ability:'spear',archetype:'lion'},
    medusa: {w:38,h:54,speed:38,health:3,score:280,damage:0,ability:'petrify'},
    goatman: {w:57,h:81,speed:40,health:5,score:320,damage:1,ability:'axe'},
    chimera: {w:300,h:210,speed:48,health:120,score:3200,damage:2,ability:'chimera-hunt'}
  };
  // The new expedition reads its provisional balance from one editable module.
  // Original levels and their enemy records remain unchanged.
  const abyssConfig = root.MM && root.MM.AbyssConfig;
  if (!abyssConfig) throw new Error('Load js/abyss-config.js before js/campaign.js.');
  Object.assign(enemyTypes, abyssConfig.enemies, abyssConfig.bosses);

  const chapters = [
    {
      names: ['Ánh đèn đầu tiên', 'Hai phía màn đêm', 'Bước chân chậm', 'Qua bia mộ', 'Nhịp thở an toàn', 'Lời gọi dưới đất', 'Đèn lồng cuối phố', 'Vòng vây đầu tiên', 'Trước cổng đá', 'Kẻ gác nghĩa địa'],
      stories: [
        'Thắp đèn lên. Hãy học cách di chuyển và bắn trước khi đi sâu vào nghĩa địa.',
        'Địch có thể xuất hiện từ cả hai phía. Dấu báo ở mép màn hình cho bạn thời gian chuẩn bị.',
        'Thây ma đi chậm nhưng chịu được nhiều phát bắn hơn. Giữ khoảng trống trước mặt.',
        'Một cú nhảy đúng lúc giúp bạn vượt qua đám đông và lấy lại vị trí.',
        'Đêm tạm yên. Tập giữ khoảng cách và dùng khiên khi cần.',
        'Những ngôi mộ bắt đầu chuyển động. Đừng đứng quá lâu ở một mép sân.',
        'Theo ánh đèn lồng, từng nhóm nhỏ đang tìm đến bạn.',
        'Bộ xương và thây ma phối hợp. Chọn mục tiêu gần bạn nhất.',
        'Sau cổng đá là kẻ giữ chìa khóa vào khu rừng.',
        'Hạ kẻ gác nghĩa địa để mở con đường qua rừng. Khiên giúp bạn chịu được một sai lầm.'
      ],
      targets: [10, 12, 13, 14, 12, 15, 16, 17, 18, 20],
      intervals: [2.4, 2.3, 2.22, 2.15, 2.3, 2.06, 2.0, 1.94, 1.88, 1.94],
      caps: [3, 3, 3, 4, 3, 4, 4, 4, 4, 4],
      pools: [
        ['skeleton'], ['skeleton'], ['skeleton', 'zombie'], ['skeleton', 'zombie'],
        ['skeleton', 'zombie'], ['skeleton', 'zombie'], ['skeleton', 'zombie'],
        ['skeleton', 'zombie'], ['skeleton', 'zombie'], ['skeleton', 'zombie']
      ]
    },
    {
      names: ['Dưới tán cây', 'Tơ vương lối nhỏ', 'Tiếng chân trên lá', 'Lối rẽ xanh', 'Khoảng sáng trong rừng', 'Mạng nhện bạc', 'Vượt gốc cổ thụ', 'Nhịp chân dồn dập', 'Hang tơ cuối cùng', 'Thây ma xanh'],
      stories: [
        'Rời nghĩa địa và lấy lại nhịp thở. Con đường đầu rừng vẫn còn khá yên.',
        'Nhện bò sát đất và chạy nhanh. Hãy bắn sớm khi nhìn thấy dấu báo.',
        'Đám nhện len giữa những bước chân chậm của thây ma.',
        'Đường rừng hẹp dần. Nhảy qua nhóm đông rồi quay lại bắn.',
        'Một khoảng sáng cho bạn luyện né tránh và nạp thêm khiên.',
        'Tơ bạc giăng khắp nơi. Giữ nhịp di chuyển đều để tránh bị kẹp.',
        'Địch kéo tới từng nhóm. Đừng dùng hết khoảng trống trong một bước.',
        'Nhện đi nhanh hơn bộ xương. Quan sát loại địch trước khi đổi hướng.',
        'Một tiếng động lớn vọng từ hang tơ. Chuẩn bị khiên cho trận tiếp theo.',
        'Thây ma xanh tuần tra trên bệ đá rồi thả xuống. Mỗi 15 giây giao chiến, boss bật khiên miễn đạn 1 giây và hồi 1 máu, không vượt máu tối đa. Tsunami mỗi 10 giây gọi 20 thây ma xanh con chạy nối đuôi cùng một hướng: bắn hạ, nhảy qua hoặc bật khiên. Phàm ăn báo trước rồi truy đuổi 1 giây, chạy trên đất hoặc nhảy từ trên cao, hồi 5 máu trong giới hạn máu tối đa và gây 2 sát thương khi đánh trúng; hồi chiêu 8 giây.'
      ],
      targets: [16, 18, 19, 20, 18, 21, 22, 23, 24, 25],
      intervals: [2.08, 1.82, 1.78, 1.73, 1.91, 1.67, 1.62, 1.57, 1.53, 1.6],
      caps: [3, 4, 4, 4, 4, 4, 4, 5, 5, 4],
      pools: [
        ['skeleton', 'zombie'], ['skeleton', 'spider'], ['skeleton', 'zombie', 'spider'],
        ['skeleton', 'spider'], ['skeleton', 'zombie'], ['skeleton', 'zombie', 'spider'],
        ['zombie', 'spider'], ['skeleton', 'spider'], ['skeleton', 'zombie', 'spider'],
        ['skeleton', 'spider']
      ]
    },
    {
      names: ['Phố vắng', 'Bóng trong cửa sổ', 'Chuyến tàu im lặng', 'Đèn đường chập chờn', 'Quảng trường yên tĩnh', 'Sương tràn mặt phố', 'Tiếng chuông xa', 'Ngã tư bóng ma', 'Dưới tháp chuông', 'Nhện chúa'],
      stories: [
        'Đèn đường cũ vẫn sáng. Hãy lấy lại nhịp trước khi khám phá thành phố.',
        'Bóng ma trôi qua màn sương. Nhìn vào dấu báo để giữ thế chủ động.',
        'Các cư dân của màn đêm đã tìm được đường đến sân ga.',
        'Bóng ma và nhện tạo thành hai nhịp tiến khác nhau. Bắn vào mối nguy gần nhất.',
        'Quảng trường cho bạn một đợt nhẹ để phục hồi sự tập trung.',
        'Sương phủ kín phố, nhưng ánh đạn vẫn giúp bạn tìm ra mục tiêu.',
        'Theo tiếng chuông, từng nhóm nhỏ tiến vào từ hai phía.',
        'Hãy giữ lối thoát giữa những nhóm địch. Khiên sẽ cứu bạn lúc bị kẹp.',
        'Tháp chuông đã ở trước mắt. Bạn gần đến nguồn gốc màn sương.',
        'Nhện chúa phun tơ làm choáng 2 giây và đẻ trứng mỗi 5 giây. Bắn 2 phát phá trứng trong 3 giây sau khi chạm đất; nếu nở, 5 nhện con không thể bị bắn hạ. Chạm chúng mất 1 máu và choáng 1,5 giây; bật khiên để bảo vệ.'
      ],
      targets: [21, 23, 24, 25, 22, 26, 27, 28, 29, 30],
      intervals: [1.79, 1.52, 1.48, 1.44, 1.63, 1.4, 1.36, 1.33, 1.3, 1.38],
      caps: [4, 4, 5, 5, 4, 5, 5, 5, 6, 5],
      pools: [
        ['skeleton', 'zombie', 'spider'], ['skeleton', 'ghost'], ['skeleton', 'zombie', 'ghost'],
        ['skeleton', 'spider', 'ghost'], ['skeleton', 'zombie'], ['zombie', 'spider', 'ghost'],
        ['skeleton', 'ghost'], ['skeleton', 'spider', 'ghost'], ['zombie', 'spider', 'ghost'],
        ['skeleton', 'zombie', 'spider', 'greenZombie']
      ]
    },
    {
      names: ['Sân lâu đài', 'Khách dưới trăng', 'Hành lang đỏ', 'Ban công đêm', 'Vườn hồng tĩnh lặng', 'Tiệc của bóng tối', 'Lưỡi gió lạnh', 'Trăng lên đỉnh tháp', 'Trước ngai đá', 'Bóng ma trắng'],
      stories: [
        'Sân lâu đài rộng mở. Một nhịp nhẹ giúp bạn sẵn sàng cho kẻ địch mới.',
        'Thây ma xanh chịu nhiều đạn hơn và tiến nhanh hơn. Chừa khoảng trống để né.',
        'Thây ma và bộ xương lấp đầy hành lang đỏ. Bình tĩnh chọn mục tiêu.',
        'Nhện bò xen giữa hai loại thây ma. Nhảy để thoát khỏi nhóm sát mặt đất.',
        'Vườn hồng im lặng hơn. Luyện dùng khiên trước khi vào tháp.',
        'Những vị khách cuối cùng đang đến. Giữ đạn liên tục khi đổi vị trí.',
        'Theo dõi thây ma trên bệ đá và nhện đu tơ. Dấu báo cho bạn thời gian tránh điểm đáp.',
        'Trăng máu lên cao, đám đông tiến nhanh hơn. Tận dụng cả hai phía sân.',
        'Ngai đá ở phía trước. Tích một khiên và giữ đường lui.',
        'Bóng ma trắng lượn trong lâu đài, biến mất mỗi 5 giây rồi đánh từ trên, trái hoặc phải. Trúng đòn khiến bạn ngã, mất 1 máu và 1 khiên; quan sát dấu báo để né.'
      ],
      targets: [25, 27, 28, 29, 26, 30, 31, 32, 33, 34],
      intervals: [1.58, 1.31, 1.28, 1.25, 1.44, 1.21, 1.18, 1.15, 1.12, 1.22],
      caps: [4, 5, 5, 5, 4, 5, 6, 6, 6, 5],
      pools: [
        ['skeleton', 'zombie', 'spider'], ['skeleton', 'greenZombie'], ['skeleton', 'zombie', 'greenZombie'],
        ['spider', 'zombie', 'greenZombie'], ['skeleton', 'zombie'],
        ['skeleton', 'zombie', 'spider', 'greenZombie'], ['skeleton', 'spider', 'greenZombie'],
        ['zombie', 'spider', 'greenZombie'], ['skeleton', 'zombie', 'spider', 'greenZombie'],
        ['skeleton', 'zombie', 'spider', 'greenZombie']
      ]
    },
    {
      names: ['Bờ vực bình minh', 'Năm bóng tối', 'Tro của đêm dài', 'Cầu qua hư không', 'Đốm lửa hy vọng', 'Vòng xoáy nhật thực', 'Giữ ngọn đèn', 'Đêm cuối cùng', 'Một bước tới bình minh', 'Dracula'],
      stories: [
        'Sau trận chiến lâu đài, hãy lấy lại nhịp. Cánh cổng cuối cùng đang chờ.',
        'Các loài quái vật đã tụ lại. Những gì bạn học được đều có ích ở đây.',
        'Địch đến theo nhiều tốc độ. Ưu tiên khoảng trống và những mục tiêu gần.',
        'Giữ thăng bằng giữa nhảy, bắn và khiên. Bạn đang tiến đến cánh cổng.',
        'Một đốm lửa chỉ đường. Đây là khoảng nghỉ cuối trước trận quyết định.',
        'Nhật thực kéo đám đông vào sân. Mỗi mười địch lại mang đến một khiên.',
        'Giữ ngọn đèn sáng bằng những bước di chuyển đều và các phát bắn chính xác.',
        'Đêm dồn sức cho đợt cuối. Dùng khiên trước khi bị bao vây.',
        'Bình minh chỉ còn một bước. Chuẩn bị cho kẻ giữ cổng nhật thực.',
        'Dracula hóa dơi, hút máu dù ở xa và lao xuống từ bóng tối. Khiên đang bật chặn hút máu. Khi còn nửa máu, hắn tạo một bản sao: phải hạ cả hai để đưa bình minh trở lại.'
      ],
      targets: [29, 32, 33, 34, 30, 35, 36, 37, 37, 38],
      intervals: [1.36, 1.14, 1.11, 1.08, 1.27, 1.05, 1.02, 1.0, 0.98, 1.08],
      caps: [5, 5, 6, 6, 5, 6, 6, 7, 7, 6],
      pools: [
        ['skeleton', 'spider', 'ghost'], ['skeleton', 'zombie', 'spider', 'ghost', 'vampire'],
        ['skeleton', 'zombie', 'vampire'], ['spider', 'ghost', 'vampire'],
        ['skeleton', 'zombie', 'ghost'], ['skeleton', 'zombie', 'spider', 'ghost', 'vampire'],
        ['skeleton', 'spider', 'vampire'], ['skeleton', 'zombie', 'spider', 'ghost', 'vampire'],
        ['skeleton', 'zombie', 'spider', 'ghost', 'vampire'], ['skeleton', 'ghost', 'vampire']
      ]
    },
    {
      names: ['Lối vào rừng gai', 'Bước chân đá', 'Gậy gai dưới tán cây', 'Rễ cổ thức giấc', 'Vệt sáng le lói', 'Hẻm gai im lặng', 'Dấu nứt trên đất', 'Thung lũng thức tỉnh', 'Dưới bóng người khổng lồ', 'Golem chúa'],
      stories: [
        'Qua cổng nhật thực là khu rừng nguyên sinh đầy dây gai. Theo vệt sáng nhỏ và lấy lại nhịp di chuyển.',
        'Golem mang gậy gỗ gai tiến vào giữa bộ xương. Nó nâng gậy trước khi quật: lùi ra hoặc nhảy qua đòn đánh.',
        'Nhện luồn dưới những bước chân đá. Canh dấu báo của gậy gai và giữ một lối thoát.',
        'Rễ cổ quấn quanh các phiến đá sống. Đừng để bộ xương ép bạn vào tầm quật của golem.',
        'Một vệt sáng xuyên qua rừng gai. Đợt địch nhẹ hơn cho bạn nhặt đạn và chuẩn bị khiên.',
        'Trong hẻm rừng, golem và nhện tiến theo hai nhịp khác nhau. Ưu tiên kẻ đang áp sát.',
        'Những vết nứt báo hiệu sức mạnh dưới lòng đất. Giữ khoảng trống trước mỗi cây gậy đang nâng lên.',
        'Cả thung lũng rung chuyển. Di chuyển giữa các nhóm xương, nhện và golem để tránh bị kẹp.',
        'Bóng một người khổng lồ che ánh sáng cuối rừng. Nhặt thùng đạn và tích khiên trước khi đối mặt.',
        'Golem chúa hóa điên mỗi 10 giây trong 5 giây: giáng đòn làm nứt đất và gây choáng, rồi lao tới đập 3 nhát. Mỗi nhát mất 3 máu nếu không bật khiên; né vùng báo động hoặc nhảy đúng lúc.'
      ],
      targets: [30, 33, 34, 35, 31, 36, 37, 38, 40, 42],
      intervals: [1.3, 1.12, 1.09, 1.06, 1.24, 1.03, 1.0, 0.98, 0.96, 1.06],
      caps: [5, 5, 6, 6, 5, 6, 6, 7, 7, 6],
      pools: [
        ['skeleton', 'golem'], ['skeleton', 'golem'], ['skeleton', 'golem', 'spider'],
        ['skeleton', 'golem', 'spider'], ['skeleton', 'spider'], ['skeleton', 'golem', 'spider'],
        ['golem', 'spider'], ['skeleton', 'golem', 'spider'], ['skeleton', 'golem', 'spider'],
        ['skeleton', 'golem', 'spider']
      ]
    },
    {
      names: ['Vết chân trong rừng', 'Tiếng hú trên sườn dốc', 'Móng vuốt trong sương', 'Lối mòn trăng đỏ', 'Ánh lửa giữa khe đá', 'Rừng gai dậy sóng', 'Săn đuổi dưới trăng', 'Vòng vây bầy sói', 'Trước đỉnh trăng máu', 'Lang Vương'],
      stories: [
        'Rừng gai vẫn bao quanh thung lũng. Golem nhỏ đi giữa bộ xương: canh cây gậy đang nâng lên để tìm lối thoát.',
        'Người sói xuất hiện theo tiếng hú. Nó lấy đà trước khi lao vồ; rời dấu báo và bắn khi nó hạ chân.',
        'Móng vuốt len giữa những chiếc gậy gai. Giữ khoảng cách với người sói rồi hạ nhóm xương gần nhất.',
        'Trăng đỏ soi lối mòn cũ. Một cú nhảy đúng lúc giúp bạn tránh gậy và cú vồ trong cùng một nhịp.',
        'Ánh lửa le lói giữa khe đá cho bạn một đợt nhẹ. Nhặt đạn, lấy lại máu và giữ khiên cho cuộc săn tiếp theo.',
        'Rừng gai rung lên theo bước bầy sói. Đổi hướng sau mỗi đợt vồ để giữ đường lui.',
        'Người sói bám sát hai phía. Đọc dấu báo, né cú vồ và canh phát bắn khi đường đạn thoáng.',
        'Bộ xương, golem nhỏ và người sói tạo thành vòng vây. Ưu tiên kẻ sắp ra đòn rồi thoát khỏi mép sân.',
        'Tiếng hú của Lang Vương vọng qua tán cây. Nhặt thùng đạn và tích khiên trước khi tiến lên đỉnh trăng máu.',
        'Lang Vương hú 4 giây, miễn đạn và gọi 5 sói con chạy vào. Hết hú nghỉ 6 giây ở dạng thường, 4 giây khi Trăng Máu. Ở nửa máu nó lớn gấp đôi và hồi đầy máu một lần; sau mỗi 1,5 giây nhảy tới cào 2 nhát, mỗi nhát 2 máu nếu không bật khiên. Súng ngắm mở trong pha này: 5 viên/phát, 5 sát thương, hồi 0,5 giây. Trong Trăng Máu, nhấn hai lần liên tiếp cùng phím hoặc nút di chuyển, hoặc vuốt hai lần cùng hướng để lộn xoay né cào.'
      ],
      targets: [34, 36, 37, 38, 35, 39, 40, 42, 44, 46],
      intervals: [1.22, 1.1, 1.07, 1.04, 1.2, 1.01, 0.99, 0.97, 0.93, 1.03],
      caps: [5, 5, 6, 6, 5, 6, 6, 7, 7, 6],
      pools: [
        ['skeleton', 'miniGolem'], ['skeleton', 'werewolf'], ['skeleton', 'miniGolem', 'werewolf'],
        ['miniGolem', 'werewolf'], ['skeleton', 'miniGolem'], ['skeleton', 'miniGolem', 'werewolf'],
        ['skeleton', 'werewolf'], ['skeleton', 'miniGolem', 'werewolf'], ['miniGolem', 'werewolf'],
        ['skeleton', 'miniGolem', 'werewolf']
      ]
    },
    {
      names: ['Dưới vòm rừng cổ', 'Chuối bay qua tán lá', 'Bước chân dưới dây leo', 'Vòng vây bên rễ cây', 'Nắng lọt qua tán rừng', 'Gậy gai và chuối chín', 'Bầy sói dưới vòm xanh', 'Tiếng gầm sau thác', 'Trước ngai vua rừng', 'KingKong'],
      stories: [
        'Rừng nguyên sinh vẫn phủ kín thung lũng. Tiểu KingKong xuất hiện cùng nhện: quan sát đường chuối ném và giữ một khoảng trống để né.',
        'Tiểu KingKong ném chuối từ xa. Rời vị trí đã báo, nhảy qua vỏ chuối và đừng đứng yên dưới tán cây.',
        'Golem cầm gậy gai tiến giữa những dây leo cổ. Né đá bay trước khi quay lại hạ tiểu KingKong.',
        'Sói con chạy nhanh dưới rễ cây. Bắn sớm để tránh bị ép vào vùng quật gậy hoặc đường chuối.',
        'Một vệt nắng xuyên qua tán rừng. Đợt nhẹ cho bạn nhặt đạn và giữ khiên trước khi đi sâu hơn.',
        'Chuối bay qua đầu những chiếc gậy gai. Chọn mục tiêu gần nhất rồi đổi vị trí sau mỗi lần ném.',
        'Nhện và sói con bám sát mặt đất, Golem cùng tiểu KingKong tấn công từ xa. Dùng nhảy và khiên để mở đường thoát.',
        'Tiếng gầm của vua rừng vang qua thác. Giữ khoảng trống giữa những đợt chuối và đừng để bầy sói vây hai phía.',
        'Dây leo rung lên trước ngai vua rừng. Nhặt thùng đạn và tích khiên: trận cuối có cả mặt đất lẫn tán cây.',
        'KingKong ném chuối nổ thành 5 vỏ trơn, gây ngã và choáng 0,5 giây nếu không bật khiên. Ở nửa máu, nó bám dây leo, hồi đầy máu một lần và gầm vào nửa sân: rời vùng báo để né. Súng ngẩng lên, mỗi viên gây 2 sát thương; bắn 5 phát nhận 1 khiên. Hết máu boss nổi điên 5 giây, lao xuống giáng đất và đánh liên tục 3 máu mỗi đòn. Bật khiên để sống qua cơn cuồng nộ rồi giành chiến thắng.'
      ],
      targets: [36, 39, 40, 41, 37, 42, 43, 44, 45, 46],
      intervals: [1.18, 1.06, 1.03, 1.0, 1.16, 0.98, 0.96, 0.94, 0.92, 1.02],
      caps: [5, 5, 6, 6, 5, 6, 6, 7, 7, 6],
      pools: [
        ['miniKingKong', 'spider'], ['miniKingKong', 'spider'], ['miniKingKong', 'golem', 'spider'],
        ['miniKingKong', 'golem', 'wolfPup'], ['miniKingKong', 'spider'], ['miniKingKong', 'golem', 'spider'],
        ['miniKingKong', 'golem', 'spider', 'wolfPup'], ['miniKingKong', 'golem', 'spider', 'wolfPup'],
        ['miniKingKong', 'golem', 'spider', 'wolfPup'], ['miniKingKong', 'golem', 'spider', 'wolfPup']
      ]
    },
    {
      names:['Cánh đỏ trên đỉnh núi','Gió ngược tầng mây','Ngọn lửa giữa trời','Sương băng thức giấc','Khe núi yên gió','Dung nham dưới chân','Tiếng sấm đầu tiên','Năm cánh rồng','Trước vòng âm dương','Rồng ngàn tuổi'],
      stories:[
        'Rồng lửa và rồng gió bay cao bên trên Golem, KingKong và người sói. Súng tự ngắm lên khi chọn mục tiêu trên trời; giữ lối thoát dưới đất.',
        'Rồng gió báo vùng hất tung trước khi thổi. Nó không gây sát thương nhưng làm choáng 2 giây; chạy khỏi vùng báo hoặc bật khiên.',
        'Hơi thở rồng lửa gây thiêu đốt 2 giây, mỗi giây 1 máu. Khiên đang bật chặn lửa và dập hiệu ứng cháy.',
        'Rồng băng và rồng đất xuất hiện, Golem rời cuộc săn. Né bốn khối băng rơi và ba ô dung nham đã đánh dấu.',
        'Đợt nhẹ giữa núi cho bạn nhặt đạn và tích khiên. Rời từng vùng báo trước khi quay lại bắn lên trời.',
        'Dung nham phun rồi các ô đất biến mất. Đừng đứng giữa những dấu báo cùng lúc; ưu tiên rồng đang chuẩn bị ra đòn.',
        'Rồng chớp xuất hiện và người sói rời sân. Sét đánh bên dưới cánh rồng, mất 1 máu và choáng 2 giây nếu trúng.',
        'Năm nguyên tố phủ kín bầu trời. Theo dõi đường bay và lấy lại vị trí sau mỗi loạt kỹ năng.',
        'Vòng âm dương xoay sau bóng rồng khổng lồ. Nhặt đạn, giữ khiên và chuẩn bị chuyển từ bầu trời xuống mặt đất.',
        'Rồng ngàn tuổi dùng ngẫu nhiên một nguyên tố mỗi 5 giây. Ở nửa máu, Âm Dương luân hồi quét 2/3 sân: trúng mất 3 máu, có khiên vẫn mất 1. Hết máu rồng hóa kị sĩ, hồi đầy máu, phóng 5 sóng mỗi 6 giây và đâm thương mỗi 3 giây. Mỗi 10 phát trúng kị sĩ nhận 1 khiên; hạ kị sĩ mới chiến thắng.'
      ],
      targets:[34,37,38,39,35,40,41,42,43,44],intervals:[1.32,1.2,1.18,1.16,1.32,1.14,1.12,1.1,1.08,1.2],caps:[4,4,4,5,4,5,5,5,5,5],
      pools:Array.from({length:10},(_,i)=>i<3?['fireDragon','windDragon','golem','miniKingKong','werewolf']:i<6?['fireDragon','windDragon','iceDragon','earthDragon','miniKingKong','werewolf']:['fireDragon','windDragon','iceDragon','earthDragon','lightningDragon','miniKingKong'])
    },
    {
      names:['Bậc thềm thần thoại','Giáo sư tử','Mái tóc rắn','Bóng rìu trên đá','Đài phun im lặng','Lời nguyền hóa đá','Sừng dê sau cổng','Ba bóng cổ thần','Dưới cánh Chimera','Chimera'],
      stories:[
        'Người sư tử, Medusa và Goatman canh tàn tích. Né giáo từ xa, giữ khoảng cách với rìu và tích khiên trước ánh mắt hóa đá.',
        'Sư tử đổi từ ném giáo sang chọc khi bạn đến gần. Đọc hướng lấy đà rồi di chuyển qua khoảng trống.',
        'Medusa hóa đá khi chạm hoặc sau mỗi 5 giây. Khiên đang bật chặn và hóa giải hóa đá; đừng để nhiều Medusa khép vòng.',
        'Goatman nâng rìu rồi bổ xuống. Nhảy hoặc rời vùng báo trước khi phản công.',
        'Một nhịp nghỉ giữa các cột đổ. Nhặt đạn, giữ khiên và chuẩn bị cho ba kiểu tấn công khác nhau.',
        'Giáo bay qua lời nguyền. Hạ Medusa sớm hoặc giữ khiên để giải hóa đá khi cần.',
        'Những chiếc rìu chiếm khoảng trống giữa sân. Đổi hướng sau mỗi đòn bổ và tránh bị ép vào mép tàn tích.',
        'Ba tộc quái cùng tiến lên. Mỗi loại giữ một nhịp đánh riêng; ưu tiên vùng báo sát bạn nhất.',
        'Cánh Chimera che lấp cổng đền. Nhặt hòm đạn và chuẩn bị cho cuộc săn trên đất lẫn trên trời.',
        'Chimera dùng laze mỗi 5 giây và nhảy cắn 2 máu mỗi 3 giây. Ở nửa máu nó bay lên, hồi đầy máu, thét lửa mỗi 4 giây và lao săn mục tiêu mỗi 6 giây. Còn 10 máu dạng bay, nó tách thành Sư tử vương 30 máu, Medusa Queen 20 máu và Goatman huy hoàng 40 máu. Mỗi 10 máu thực sự gây ra tích 1 khiên; hạ đủ ba bản thể để kết thúc chiến dịch.'
      ],
      targets:[36,39,40,41,37,42,43,44,45,46],intervals:[1.28,1.16,1.14,1.12,1.28,1.1,1.08,1.06,1.04,1.16],caps:[4,4,5,5,4,5,5,6,6,5],
      pools:Array.from({length:10},()=>['lionMan','medusa','goatman'])
    }
  ];

  const bossNames = ['Kẻ gác nghĩa địa', 'Thây ma xanh', 'Nhện chúa', 'Bóng ma trắng', 'Dracula', 'Golem chúa', 'Lang Vương', 'KingKong', 'Rồng ngàn tuổi', 'Chimera'];
  // Boss identities follow their milestones independently of the world scenery.
  const bossArchetypes = ['skeleton', 'zombie', 'spider', 'ghost', 'vampire', 'golem', 'werewolf', 'kong','dragon','chimera'];
  const bossAbilities = [['bone-volley'], ['ledge-drop'], ['silk-drop'], ['sine-drop'], ['bat-morph', 'shadow-drop'], ['club-swing','rock-throw'], ['pounce'], ['banana-throw'],['five-elements'],['chimera-hunt']];
  const bossSkills = [['bone-pillars'], ['timed-ward', 'tsunami', 'glutton'], ['web-stun', 'egg-hatch'], ['vanish-strike'], ['bat-drain', 'blood-clone'], ['rage-ground-slam', 'triple-smash'], ['blood-moon', 'double-claw', 'pack-howl'], ['banana-burst', 'vine-transform', 'half-arena-scream', 'final-rage'],['five-elements','yin-yang-reincarnation','dragon-knight'],['laser','giant-bite','aerial-hunt','three-forms']];
  const levels = [];
  chapters.forEach(function (chapter, world) {
    chapter.names.forEach(function (name, stage) {
      const recovery = stage === 4 || (world > 0 && stage === 0);
      const config = {
        id: levels.length + 1,
        world: world,
        name: name,
        target: chapter.targets[stage],
        spawnInterval: chapter.intervals[stage],
        maxAlive: chapter.caps[stage],
        types: chapter.pools[stage].slice(),
        speedMultiplier: Number((1 + world * 0.04 + stage * 0.006 - (recovery ? 0.035 : 0)).toFixed(3)),
        healthMultiplier: Number((1 + world * 0.07).toFixed(2)),
        // Supply keeps arriving independently of kills, including during bosses.
        // Starting rounds stay scarce; collecting a crate restores several shots.
        initialAmmo: 3 + world,
        ammoCapacity: 18 + world * 4,
        ammoPerCrate: world === 9 ? 36 : world === 8 ? 30 : 5 + world * 2,
        ammoInterval: Number((Math.max(4.3, 5.8 - world * 0.2 - (recovery ? 0.3 : 0))).toFixed(1)),
        // Keep original overhead skills, introducing one before mixing the others.
        abilitySpawnEvery: chapter.pools[stage].some(type => enemyTypes[type].ability) ? (recovery || stage < 3 ? 4 : 3) : 0,
        abilityInterval: Number((Math.max(world > 5 ? 6.6 : 6.5, 9 - world * 0.5) + (recovery ? 1 : 0)).toFixed(1)),
        abilityWarning: recovery ? 1.7 : 1.5,
        // Ramp duration starts after warmup. Difficulty scales only the added
        // pressure, preserving the starting attack cadence and movement speed.
        enemyPressureCap: Number((1.5 + Math.min(world, 6) * 0.0375).toFixed(4)),
        bossPressureCap: Number((1.7 + Math.min(world, 6) * 0.0375).toFixed(4)),
        pressureRampSeconds: 100 - Math.min(world, 6) * 3.75,
        bossRampSeconds: 75 - Math.min(world, 6) * 2.5,
        pressureWarmup: recovery ? 16 : 12,
        bossWarmup: 4,
        boss: stage === 9,
        bossArchetype: stage === 9 ? bossArchetypes[world] : null,
        bossHealth: stage === 9 ? (world === 5 ? 54 : world === 6 ? 50 : world === 7 ? 72 : world === 8 ? 100 : world === 9 ? 120 : 18 + world * 4) : 0,
        bossAbilities: stage === 9 ? bossAbilities[world].slice() : [],
        bossSkills: stage === 9 ? bossSkills[world].slice() : [],
        story: chapter.stories[stage],
        recovery: recovery
      };
      if (config.boss) config.bossName = bossNames[world];
      if (config.id === 1) config.tutorial = 'PC: ←/→ để di chuyển, W/↑ để nhảy; A/J bắn trái, D/L bắn phải. Điện thoại: vuốt ngang để chạy, vuốt lên để nhảy, chạm trái/phải để bắn. Đạn có hạn: di chuyển để nhặt thùng đạn rơi xuống.';
      if (config.id === 2) config.tutorial = 'Hạ mỗi 10 địch nhận một khiên. Nhấn Space trên PC hoặc vuốt xuống trên điện thoại để kích hoạt.';
      if (config.id === 3) config.tutorial = 'Thây ma có thể đi trên bệ đá rồi rơi xuống. Quan sát dấu báo dưới bệ để tránh điểm đáp.';
      if (config.id === 12) config.tutorial = 'Nhện đu trên tơ, nhấp nhô rồi thả xuống. Né điểm đáp; nhặt thùng đạn trước khi bắn tiếp.';
      if (config.id === 20) config.tutorial = 'Tsunami gọi 20 thây ma xanh con mỗi 10 giây, chạy nối đuôi từ một phía: bắn, nhảy hoặc bật khiên. Phàm ăn báo trước rồi truy đuổi 1 giây, hồi 5 máu tối đa và gây 2 sát thương khi trúng; hồi chiêu 8 giây. Mỗi 15 giây giao chiến, boss bật khiên miễn đạn 1 giây và hồi 1 máu, không vượt máu tối đa.';
      if (config.id === 22) config.tutorial = 'Bóng ma bay theo đường lượn sóng rồi hạ xuống. Giữ khoảng trống, chờ chúng vào tầm bắn.';
      if (config.id === 30) config.tutorial = 'Bắn 2 phát phá trứng trước khi nở sau 3 giây chạm đất. Mỗi trứng nở 5 nhện con không thể bắn hạ: chạm mất 1 máu và choáng 1,5 giây. Khiên đang bật chặn cả hai; tơ của nhện chúa vẫn gây choáng 2 giây.';
      if (config.id === 32) config.tutorial = 'Thây ma xanh có nhiều máu hơn thây ma thường. Nhặt thùng đạn và giữ khoảng cách với bệ đá.';
      if (config.id === 42) config.tutorial = 'Ma cà rồng có thể hóa dơi, bay lên rồi đáp lại. Canh lúc chúng hạ thấp để tiết kiệm đạn.';
      if (config.id === 51) config.tutorial = 'Golem nâng gậy trước khi quật và lấy đà ném đá khi ở xa. Né đường báo vàng hoặc bật khiên; đá không đổi hướng sau khi ném.';
      if (config.id === 61) config.tutorial = 'Golem nhỏ chịu nhiều đạn hơn bộ xương, quật gậy khi gần và ném đá khi xa. Né dấu báo hoặc bật khiên trước khi áp sát.';
      if (config.id === 62) config.tutorial = 'Người sói lấy đà rồi nhảy lên vồ xuống. Rời vùng báo trước, nhảy qua cú vồ và canh bắn khi nó dừng lại.';
      if (config.id === 70) config.tutorial = 'Lang Vương hú 4 giây, miễn đạn và gọi 5 sói con; hết hú nghỉ 6 giây thường / 4 giây Trăng Máu. Pha Trăng Máu hồi đầy máu một lần và cào kép mỗi 1,5 giây. Súng ngắm cần 5 viên/phát, gây 5 sát thương, hồi 0,5 giây. Trong Trăng Máu, nhấn hai lần liên tiếp cùng phím hoặc nút di chuyển, hoặc vuốt hai lần cùng hướng để lộn xoay né cào.';
      if (config.id === 71) config.tutorial = 'Tiểu KingKong lấy đà rồi ném chuối. Né đường báo và nhảy qua vỏ chuối để giữ nhịp di chuyển; khiên đang bật chặn được đòn đánh.';
      if (config.id === 74) config.tutorial = 'Sói con chạy chậm hơn và chỉ đi theo một hướng, không quay lại truy đuổi. Nhảy qua hoặc lùi khỏi đường chạy; giữ khoảng trống trước Golem và tiểu KingKong.';
      if (config.id === 80) config.tutorial = 'KingKong bám dây ở nửa máu: rời nửa sân báo đỏ, bắn hướng lên gây 2 sát thương/viên và nhận 1 khiên mỗi 5 phát. Khi máu boss về 0, bật khiên để sống qua 5 giây cuồng nộ; không có khiên mỗi đòn mất 3 máu.';
      if (config.id === 81) config.tutorial = 'Rồng bay cao: súng tự ngắm lên, mỗi viên gây 2 sát thương. Nếu có quái mặt đất ở gần phía bắn, súng giữ tầm thấp. Né vùng lửa và gió báo trước; khiên chặn thiêu đốt và hất tung.';
      if (config.id === 84) config.tutorial = 'Rồng băng gọi bốn khối băng rơi; rồng đất đánh dấu ba ô dung nham. Rời ô báo trước khi đòn đánh xuất hiện.';
      if (config.id === 87) config.tutorial = 'Rồng chớp đánh sét ngay bên dưới nó: trúng đòn mất 1 máu và choáng 2 giây. Di chuyển khỏi đường sét hoặc bật khiên.';
      if (config.id === 90) config.tutorial = 'Âm Dương luân hồi phủ 2/3 sân: trúng mất 3 máu, có khiên vẫn mất 1 máu. Rồng hết máu hóa kị sĩ và hồi đầy máu; bắn trúng kị sĩ mỗi 10 phát nhận 1 khiên. Hạ kị sĩ mới thắng.';
      if (config.id === 91) config.tutorial = 'Sư tử ném giáo từ xa và chọc khi gần; Goatman giơ rìu trước khi bổ. Medusa hóa đá 1,5 giây khi chạm hoặc nhìn trúng: bật khiên để ngăn hoặc giải hóa đá.';
      if (config.id === 100) config.tutorial = 'Chimera hồi đầy máu và bay khi còn nửa máu. Né Hỏa phong phủ 1/3 sân; bật khiên trước cú lao khóa mục tiêu. Dạng bay còn 10 máu sẽ phân hóa ba vương thú: hạ cả ba mới thắng. Mỗi 10 máu boss mất nhận 1 khiên, tối đa 3.';
      levels.push(config);
    });
  });

  const abyssChapters = [
    {
      boss: 'minotaurLord', bossName: 'Minotaur Chúa',
      skills: ['rage-axe', 'bull-charge', 'cave-quake', 'dominion-roar'],
      names: ['Ngọn đuốc dưới lòng đất', 'Sừng trong bóng tối', 'Dấu chân truy đuổi', 'Nấm đỏ thức giấc', 'Qua vườn nấm độc', 'Bụi đá trên đầu', 'Mưa nhũ đá', 'Ngã rẽ dưới cầu đá', 'Cửa mê cung cuối cùng', 'Minotaur Chúa'],
      stories: ['Đuốc soi một nửa miền tối. Ánh sáng đi cùng bạn; khi dùng vũ khí cận chiến, hai ngọn lửa xoay quanh để giữ đường nhìn.', 'Minotaur Con tuần tra giữa các cột đá. Nó báo đòn trước khi vung tay: giữ khoảng trống để né.', 'Minotaur nhìn thấy ánh đuốc và chạy tới. Dẫn nó qua khoảng sân rộng rồi phản công trong nhịp nghỉ.', 'Nấm độc phồng lên khi bạn đến gần hoặc bắn trúng. Rời vòng báo trước khi nó nổ.', 'Dấu sừng và những cụm nấm đỏ cùng che lối đi. Đừng lùi vào vùng nổ khi né Minotaur.', 'Bụi đá rơi là lời báo trước. Di chuyển khỏi đường thẳng của nhũ đá đang nứt.', 'Nhiều nhũ đá rơi theo đợt. Giữ một khoảng sân trống và quan sát nền trước khi đổi hướng.', 'Nấm, nhũ đá và Minotaur phối hợp ở ngã rẽ. Dùng đường trống giữa các dấu báo để vượt qua.', 'Cửa cuối đã hiện sau các cột đá. Nhặt thùng đạn và chuẩn bị khiên trước tiếng gầm.', 'Minotaur Chúa vung rìu, lao khóa hướng, giậm nhũ đá và gọi đàn con. Khi nó lao vào tường, tận dụng khoảng choáng để phản công.'],
      pools: Array.from({length:10},()=>['minotaurCalf']),
      hazards: stage => stage >= 5 ? ['mushroom','stalactite'] : stage >= 3 ? ['mushroom'] : []
    },
    {
      boss: 'flowerDemon', bossName: 'Mộc Tâm Hoa Quỷ',
      skills: ['bewildering-spores', 'spirit-mirrors', 'animated-remains', 'parasite-nest'],
      names: ['Rễ đen trên xương trắng', 'Dấu móng trong hang hoa', 'Ký sinh thức tỉnh', 'Một giây hóa điên', 'Xương và gai rễ', 'Sương bào tử', 'Hoa mọc trên hóa thạch', 'Những bộ xương chuyển động', 'Trước trái tim hoa', 'Mộc Tâm Hoa Quỷ'],
      stories: ['Rễ đen bám lên những bộ xương tiền sử. Minotaur vẫn còn ở đây, cùng nấm độc và đá rơi từ tầng trên.', 'Những dấu móng chạy qua sương tím. Giữ đuốc sáng và tránh các cụm nấm đỏ.', 'Ký Sinh Trùng Cổ Đại bò ra từ lõi hoa. Một đòn hợp lệ có thể khiến nó tự tấn công.', 'Ký sinh hóa điên đúng một giây sau khi bị đánh, tự gây tổn thương. Chọn vị trí để giữ đường né.', 'Minotaur che chắn cho đàn ký sinh. Đừng để hai nhịp truy đuổi ép bạn vào nấm.', 'Bào tử tụ trên nền đá. Tránh phấn hoa tím; khiên giúp giải những trạng thái bất lợi.', 'Hoa mọc dày hơn trên xương cổ. Nhìn dấu báo thay vì đứng lại trong vùng phấn.', 'Các đợt quái hỗn hợp len giữa rễ cây. Chờ lúc chúng ra đòn rồi đổi phía để phản công.', 'Một bộ xương khổng lồ chuyển động sâu trong hang. Chuẩn bị đạn, khiên và nhìn kỹ lõi hoa thật.', 'Mộc Tâm Hoa Quỷ rải bào tử ảo giác, tạo ba phân thân giả và kéo bộ xương tấn công. Đánh phân thân gây nổ choáng; chỉ boss thật trực tiếp đánh bạn. Hạ nó để nhận Búa Minotaur.'],
      pools: Array.from({length:10},(_,i)=>i<2?['minotaurCalf']:i<4?['parasite']:['minotaurCalf','parasite']),
      hazards: stage => stage >= 5 ? ['mushroom','stalactite','spore'] : ['mushroom','stalactite']
    },
    {
      boss: 'mirrorTurtle', bossName: 'Xích Kính Quái Sùng',
      skills: ['refractive-invisibility', 'mirror-shield', 'five-water-columns', 'super-hard'],
      names: ['Mặt hồ không có trời', 'Tiểu Quy bên bờ đá', 'Qua thềm nước lạnh', 'Tinh linh pha lê', 'Gợn sóng nguy hiểm', 'Mưa băng trong hang', 'Dưới trần thạch anh', 'Băng và dòng nước', 'Mặt gương dưới hồ', 'Xích Kính Quái Sùng'],
      stories: ['Rời sương ký sinh để tới hồ ngầm. Ánh thạch anh phản lên mặt nước; nền đá ẩm mở ra những đường chiến đấu mới.', 'Tiểu Quy phun nước về một hướng trong tầm bốn bước chân. Lùi khỏi tầm hoặc nhảy qua đường nước.', 'Những thềm đá chia mặt hồ. Theo dấu chuẩn bị phun nước để đổi vị trí an toàn.', 'Tinh linh pha lê nhấp nháy khi bạn đến gần rồi phát nổ. Rời vòng cyan trước khi lõi vỡ.', 'Tiểu Quy và tinh linh chia nhau bờ đá. Chừa chỗ lùi khi né đợt phun nước.', 'Băng rơi từ trần thay nhũ đá cũ. Rời vệt cảnh báo trước khi mảnh băng chạm đất.', 'Các đợt băng rơi nhanh hơn nhưng luôn có đường né. Nhìn nền và giữ nhịp di chuyển.', 'Tinh linh nổ giữa những đường phun nước. Đừng nhảy vào cột băng đang được đánh dấu.', 'Gợn nước cho thấy một chiếc mai gương đang tiến tới. Cung Hắc và Giáo Bạch có thể giúp định vị.', 'Xích Kính Quái Sùng tàng hình mỗi 15 giây và chỉ nhận nửa sát thương. Mai gương phản toàn bộ sát thương projectile; cận chiến không bị phản. Né đúng năm cột thủy độn, hạ boss để mở phát quang vũ khí.'],
      pools: Array.from({length:10},()=>['littleTurtle']),
      hazards: stage => stage >= 5 ? ['crystalSpirit','icicle'] : stage >= 3 ? ['crystalSpirit'] : []
    },
    {
      boss: 'fossilRoc', bossName: 'Hóa Thạch Sí Vũ',
      skills: ['echo-scream', 'spatial-illusion', 'fossil-knight'],
      names: ['Bậc đá bên vực sâu', 'Cánh quạ tím', 'Đá rơi từ bóng cánh', 'Tiếng lăn hai phía', 'Quạ qua cầu xích', 'Đèn lồng của người đã khuất', 'Đổi chỗ trong sương', 'Phương hướng đảo ngược', 'Sân nghi lễ vọng âm', 'Hóa Thạch Sí Vũ'],
      stories: ['Tiếng nước lùi lại sau những vách đá cao. Dây xích và hóa thạch cổ điểu dẫn tới sân nghi lễ.', 'Ô Thước bay tuần tra trên cao. Nó thả đá theo chu kỳ năm giây; quan sát bóng dưới nền.', 'Đá rơi từ cánh quạ theo trọng lực. Di chuyển sau dấu báo và canh bắn vào mục tiêu trên cao.', 'Một tảng đá lăn qua nền mỗi mười giây, từ một trong hai phía. Nhảy qua hoặc dùng địa hình để né.', 'Quạ trên cao và đá lăn dưới đất chia đường né. Giữ vị trí trước khi chọn thời điểm nhảy.', 'Xương Cầm Đèn Lồng xuất hiện với lửa linh hồn tím. Mỗi sáu giây nó dùng một kỹ năng.', 'Đèn lồng có thể đổi vị trí với bạn. Quan sát vòng tím rồi tìm lại khoảng sân an toàn.', 'Hướng di chuyển có thể bị đảo tạm thời. Biểu tượng debuff báo lúc điều khiển trở lại bình thường.', 'Vách đá mở ra đôi cánh hóa thạch. Nhặt đạn và chuẩn bị cho một trận chiến có hai thanh máu.', 'Hóa Thạch Sí Vũ hét sóng âm, đảo hướng và dịch chuyển bạn tới vị trí hợp lệ. Hết máu dạng chim, nó hóa Kị Sĩ Xương Đầu Chim cầm lưỡi hái. Hạ cả dạng thứ hai để nhận Lưỡi Hái Cổ Điểu.'],
      pools: Array.from({length:10},(_,i)=>i<5?['abyssCrow']:['abyssCrow','lanternSkeleton']),
      hazards: stage => stage >= 3 ? ['rollingStone'] : []
    },
    {
      boss: 'thousandHands', bossName: 'Thiên Thủ Cổ Thần',
      skills: ['joy-gravity', 'wrath-hands', 'love-clones', 'hate-darkness', 'reincarnation-maze'],
      names: ['Cửa Lăng Mộ Luân Hồi', 'Vệ binh đất sét', 'Những bước chân nghi lễ', 'Ngón đá thức giấc', 'Bàn tay giữa hàng cột', 'Linh hồn dưới phù điêu', 'Hành lang chôn cất', 'Bánh xe và bẫy cổ', 'Trước tượng thiên thủ', 'Thiên Thủ Cổ Thần'],
      stories: ['Ánh vàng mờ trôi qua hàng cột đất sét. Tượng cổ và quan tài đá giữ im lặng dưới lăng mộ.', 'Vệ Binh Đất Sét Nhỏ thức tỉnh khi bạn đến gần. Nó nâng tay báo trước đòn cận chiến.', 'Những vệ binh canh nền đá cổ. Đợi nhịp nghỉ sau đòn để vượt qua hàng cột.', 'Bàn Tay Cổ Đại di chuyển bằng các ngón. Rời dấu báo trước khi nó đập hoặc tóm.', 'Bàn tay và vệ binh chia lối hành lang. Chừa khoảng trống để né cả đòn trên cao lẫn dưới đất.', 'Linh Hồn Mộ Cổ trôi qua phù điêu. Tránh các đốm năng lượng và canh bắn trên cao.', 'Ba loại kẻ canh mộ cùng thức giấc. Đừng để năng lượng linh hồn ép bạn vào tầm bàn tay.', 'Vòng nghi lễ và bánh xe đá bắt đầu chuyển động. Theo dấu sáng trên nền để tránh nhịp bẫy cổ.', 'Một đầu tượng khẽ xoay giữa hàng chục cánh tay. Ánh sáng vũ khí sẽ giúp bạn trong bóng tối sắp tới.', 'Thiên Thủ Cổ Thần đổi Hỉ–Nộ–Ái–Ố mỗi 20 giây. Ở nửa máu, boss hồi đầy đúng một lần và mở Mê Cung Luân Hồi; chỉ hình chiếu Nộ nhận sát thương thật. Chu kỳ đổi mặt còn 15 giây. Hạ HP thật của pha hai để kết thúc.'],
      pools: Array.from({length:10},(_,i)=>i<3?['clayGuard']:i<5?['clayGuard','ancientHand']:['clayGuard','ancientHand','tombSpirit']),
      hazards: stage => stage >= 7 ? ['tombPulse'] : []
    }
  ];
  const abyssBalance = abyssConfig.campaign;
  if (!abyssBalance) throw new Error('AbyssConfig.campaign balance is required.');
  abyssChapters.forEach((chapter, region) => chapter.names.forEach((name, stage) => {
    const world = region + 10, boss = stage === 9, recovery = stage === 0 || stage === 4;
    const config = Object.assign({}, abyssBalance, {
      id: 101 + region * 10 + stage, world, name, abyss: true,
      target: [12,14,16,14,18,16,18,20,22,24][stage] + region * 2,
      spawnInterval: [2.1,2,1.95,2.05,2.12,1.9,1.85,1.8,1.75,1.95][stage],
      maxAlive: [3,3,4,3,3,4,4,5,5,4][stage],
      types: chapter.pools[stage].slice(), hazardTypes: chapter.hazards(stage),
      layout: ['arrival','columns','pursuit','crossing','sanctuary','ledge','cascade','junction','threshold','arena'][stage],
      abilitySpawnEvery: 0, boss, bossArchetype: boss ? chapter.boss : null,
      bossHealth: boss ? abyssConfig.bosses[chapter.boss].health : 0,
      bossAbilities: boss ? chapter.skills.slice() : [], bossSkills: boss ? chapter.skills.slice() : [],
      story: chapter.stories[stage], tutorial: chapter.stories[stage], recovery
    });
    if (boss) config.bossName = chapter.bossName;
    levels.push(config);
  }));

  const difficultySettings = {
    story: { health: 7, spawnMultiplier: 1.2, speedMultiplier: 0.86, enemyHealthMultiplier: 0.9, warningTime: 1.35, damageMultiplier: 1, ammoMultiplier: 1.35, pressureMultiplier: 0.75 },
    normal: { health: 5, spawnMultiplier: 1, speedMultiplier: 1, enemyHealthMultiplier: 1, warningTime: 1.1, damageMultiplier: 1, ammoMultiplier: 1, pressureMultiplier: 1 },
    hard: { health: 4, spawnMultiplier: 0.9, speedMultiplier: 1.13, enemyHealthMultiplier: 1.2, warningTime: 0.85, damageMultiplier: 1, ammoMultiplier: 0.85, pressureMultiplier: 1.1 }
  };

  function getLevel(id) {
    const number = Number(id);
    const safeId = Number.isNaN(number) ? 1 : Math.max(1, Math.min(levels.length, Math.trunc(number)));
    return levels[safeId - 1];
  }

  function tuning(difficulty) {
    // Return a copy so a run cannot accidentally change another difficulty.
    const known = Object.prototype.hasOwnProperty.call(difficultySettings, difficulty);
    return Object.assign({}, known ? difficultySettings[difficulty] : difficultySettings.normal);
  }

  function createEnemy(type, level, difficulty, side, rng) {
    const config = typeof level === 'object' && level && levels.includes(level) ? level : getLevel(level && level.id || level);
    const settings = tuning(difficulty);
    const boss = type === 'boss';
    const enemyType = boss ? (config.bossArchetype || bossArchetypes[config.world]) : (Object.prototype.hasOwnProperty.call(enemyTypes, type) ? type : 'skeleton');
    const stats = enemyTypes[enemyType];
    const archetype = stats.archetype || enemyType;
    const rawRandom = typeof rng === 'function' ? Number(rng()) : Math.random();
    const random = Number.isFinite(rawRandom) ? Math.max(0, Math.min(1, rawRandom)) : 0.5;
    const health = enemyType === 'wolfPup' ? 1 : Math.max(1, Math.round((boss ? config.bossHealth || 18 + config.world * 4 : stats.health * config.healthMultiplier) * settings.enemyHealthMultiplier));
    return {
      x: side === -1 ? -50 : 1010,
      y: 438,
      w: config.abyss ? stats.w : boss ? (archetype === 'golem' ? 156 : archetype === 'werewolf' ? 80 : archetype === 'kong' ? 126 : archetype === 'dragon' ? 252 : archetype === 'chimera' ? 300 : Math.max(96, stats.w * 1.85)) : stats.w,
      h: config.abyss ? stats.h : boss ? (archetype === 'golem' ? 172 : archetype === 'werewolf' ? 108 : archetype === 'kong' ? 138 : archetype === 'dragon' ? 190 : archetype === 'chimera' ? 210 : Math.max(94, stats.h * 1.5)) : stats.h,
      dir: side === -1 ? 1 : -1,
      type: boss ? 'boss' : enemyType,
      archetype: archetype,
      variant: boss && archetype === 'dragon' ? 'yinYang' : stats.variant || null,
      ability: stats.ability,
      abilities: boss ? config.bossAbilities.slice() : (stats.abilities ? stats.abilities.slice() : stats.ability ? [stats.ability] : []),
      bossSkills: boss ? config.bossSkills.slice() : [],
      abilityCooldown: config.abilityInterval,
      abilityWarning: config.abilityWarning,
      health: health,
      maxHealth: health,
      speed: stats.speed * config.speedMultiplier * settings.speedMultiplier * (0.95 + random * 0.1) * (boss ? 0.74 : 1),
      score: boss ? 750 + config.world * 250 : stats.score,
      damage: config.abyss ? stats.damage : 1,
      phase: 'warning',
      warning: settings.warningTime + (boss ? 0.45 : 0),
      age: 0,
      hit: 0,
      boss: boss
    };
  }

  root.MM = root.MM || {};
  root.MM.Campaign = { worlds: worlds, levels: levels, enemyTypes: enemyTypes, getLevel: getLevel, tuning: tuning, createEnemy: createEnemy };
})(typeof window !== 'undefined' ? window : globalThis);
