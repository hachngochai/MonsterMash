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
    { id: 6, name: 'Thung lũng trăng máu', subtitle: 'Tiếng hú dưới tán gai', color: '#d6ac91', enemy: 'werewolf', scenery: 5 }
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
    werewolf: { w: 48, h: 72, speed: 58, health: 3, score: 210, damage: 1, ability: 'pounce' }
  };

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
        'Thây ma xanh tuần tra trên bệ đá rồi thả xuống. Sau mỗi 10 phát bắn trúng, nó miễn nhiễm 2 giây: né đòn và chờ lớp bảo hộ tắt.'
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
        'Nhện chúa đu trên tơ và phun lưới làm choáng 2 giây. Mỗi 5 giây nó đẻ một trứng; trứng nở thành 5 nhện con. Giữ khoảng trống và canh điểm rơi.'
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
        'Khi còn nửa máu, Lang Vương hóa trăng máu một lần: lớn gấp đôi, hồi đầy máu và nhuộm đỏ khu rừng dưới mặt trăng góc phải. Mỗi 3 giây nó nhảy tới cào 2 nhát, mỗi nhát mất 2 máu nếu không bật khiên. Súng ngắm mở trong pha này: mỗi phát dùng 5 viên, gây 5 sát thương và hồi 1 giây.'
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
    }
  ];

  const bossNames = ['Kẻ gác nghĩa địa', 'Thây ma xanh', 'Nhện chúa', 'Bóng ma trắng', 'Dracula', 'Golem chúa', 'Lang Vương'];
  // Boss identities follow their milestones independently of the world scenery.
  const bossArchetypes = ['skeleton', 'zombie', 'spider', 'ghost', 'vampire', 'golem', 'werewolf'];
  const bossAbilities = [['bone-volley'], ['ledge-drop'], ['silk-drop'], ['sine-drop'], ['bat-morph', 'shadow-drop'], ['club-swing','rock-throw'], ['pounce']];
  const bossSkills = [['bone-pillars'], ['hit-immunity'], ['web-stun', 'egg-hatch'], ['vanish-strike'], ['bat-drain', 'blood-clone'], ['rage-ground-slam', 'triple-smash'], ['blood-moon', 'double-claw']];
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
        ammoPerCrate: 5 + world * 2,
        ammoInterval: Number((5.8 - world * 0.2 - (recovery ? 0.3 : 0)).toFixed(1)),
        // Keep original overhead skills, introducing one before mixing the others.
        abilitySpawnEvery: chapter.pools[stage].some(type => enemyTypes[type].ability) ? (recovery || stage < 3 ? 4 : 3) : 0,
        abilityInterval: Number((Math.max(world > 5 ? 6.6 : 6.5, 9 - world * 0.5) + (recovery ? 1 : 0)).toFixed(1)),
        abilityWarning: recovery ? 1.7 : 1.5,
        // Ramp duration starts after warmup. Difficulty scales only the added
        // pressure, preserving the starting attack cadence and movement speed.
        enemyPressureCap: Number((1.5 + world * 0.0375).toFixed(4)),
        bossPressureCap: Number((1.7 + world * 0.0375).toFixed(4)),
        pressureRampSeconds: 100 - world * 3.75,
        bossRampSeconds: 75 - world * 2.5,
        pressureWarmup: recovery ? 16 : 12,
        bossWarmup: 4,
        boss: stage === 9,
        bossArchetype: stage === 9 ? bossArchetypes[world] : null,
        bossHealth: stage === 9 ? (world === 5 ? 54 : world === 6 ? 50 : 18 + world * 4) : 0,
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
      if (config.id === 22) config.tutorial = 'Bóng ma bay theo đường lượn sóng rồi hạ xuống. Giữ khoảng trống, chờ chúng vào tầm bắn.';
      if (config.id === 32) config.tutorial = 'Thây ma xanh có nhiều máu hơn thây ma thường. Nhặt thùng đạn và giữ khoảng cách với bệ đá.';
      if (config.id === 42) config.tutorial = 'Ma cà rồng có thể hóa dơi, bay lên rồi đáp lại. Canh lúc chúng hạ thấp để tiết kiệm đạn.';
      if (config.id === 51) config.tutorial = 'Golem nâng gậy trước khi quật và lấy đà ném đá khi ở xa. Né đường báo vàng hoặc bật khiên; đá không đổi hướng sau khi ném.';
      if (config.id === 61) config.tutorial = 'Golem nhỏ chịu nhiều đạn hơn bộ xương, quật gậy khi gần và ném đá khi xa. Né dấu báo hoặc bật khiên trước khi áp sát.';
      if (config.id === 62) config.tutorial = 'Người sói lấy đà rồi nhảy lên vồ xuống. Rời vùng báo trước, nhảy qua cú vồ và canh bắn khi nó dừng lại.';
      if (config.id === 70) config.tutorial = 'Trăng máu mở súng ngắm tự động: cần ít nhất 5 viên, mỗi phát dùng 5 viên và gây 5 sát thương; hồi chiêu 1 giây. Lang Vương hồi đầy máu và lớn gấp đôi một lần khi còn nửa máu. Bật khiên hoặc né dấu báo của đòn cào kép mỗi 3 giây.';
      levels.push(config);
    });
  });

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
    const health = Math.max(1, Math.round((boss ? config.bossHealth || 18 + config.world * 4 : stats.health * config.healthMultiplier) * settings.enemyHealthMultiplier));
    return {
      x: side === -1 ? -50 : 1010,
      y: 438,
      w: boss ? (archetype === 'golem' ? 156 : archetype === 'werewolf' ? 80 : Math.max(96, stats.w * 1.85)) : stats.w,
      h: boss ? (archetype === 'golem' ? 172 : archetype === 'werewolf' ? 108 : Math.max(94, stats.h * 1.5)) : stats.h,
      dir: side === -1 ? 1 : -1,
      type: boss ? 'boss' : enemyType,
      archetype: archetype,
      variant: stats.variant || null,
      ability: stats.ability,
      abilities: boss ? config.bossAbilities.slice() : (stats.abilities ? stats.abilities.slice() : stats.ability ? [stats.ability] : []),
      bossSkills: boss ? config.bossSkills.slice() : [],
      abilityCooldown: config.abilityInterval,
      abilityWarning: config.abilityWarning,
      health: health,
      maxHealth: health,
      speed: stats.speed * config.speedMultiplier * settings.speedMultiplier * (0.95 + random * 0.1) * (boss ? 0.74 : 1),
      score: boss ? 750 + config.world * 250 : stats.score,
      damage: 1,
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
