/* Award each milestone only after the complete, final boss encounter dies. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const rewards = Object.freeze({
    10:{name:'Xương Phân Ba',weapons:['bones']},
    20:{name:'Khiên Bất Tử',skills:['immortal']},
    30:{name:'Nhảy Cao',skills:['highJump']},
    40:{name:'Hắc Hóa',skills:['darken']},
    50:{name:'Hút Máu',skills:['lifesteal']},
    60:{name:'Chùy Golem',weapons:['club']},
    70:{name:'Trăng Máu Của Sói',skills:['bloodMoon']},
    80:{name:'Chuyển Chế Độ Bắn',skills:['manualAim']},
    90:{name:'Cung Hắc Ám · Giáo Bạch Kim',weapons:['bow','spear']},
    100:{name:'Song Rìu · Hóa Đá',weapons:['axes'],skills:['petrify']},
    110:{name:'Mê Cung Minotaur đã khai phá',milestoneOnly:true},
    120:{name:'Búa Minotaur',weapons:['hammer']},
    130:{name:'Phát Quang Vũ Khí',skills:['weaponGlow']},
    140:{name:'Lưỡi Hái Cổ Điểu',weapons:['scythe']},
    150:{name:'Vực Sâu Cổ Đại đã khai phá',milestoneOnly:true},
    160:{name:'Hóa Ngư Nhân',skills:['merfolk']},
    170:{name:'Cầu Chớp',weapons:['lightningOrb']},
    180:{name:'Tam Tinh Hải Đăng',skills:['starfish']},
    190:{name:'Tự Do Đại Dương',skills:['freeSwim']},
    200:{name:'Tiểu Ngư Nhân Hộ Vệ',skills:['merfolkArmor']},
    210:{name:'Tiểu Moai Đồng Hành',skills:['moaiCompanion']},
    220:{name:'Kho Khiên · 5 Khiên',skills:['fiveShields']},
    230:{name:'Trứng Phục Sinh · Bảy Vũ Khí',weapons:['easterEgg']},
    240:{name:'Ảo Mộng · Sách Phép',weapons:['dreamBook']},
    ...(MM.CosmicBalance?{250:{name:'Bộ Đồ Phi Hành Gia Makemake',skills:['astronaut']},...Object.fromEntries(MM.CosmicConfig.authored.essences.map(e=>[e.unlock,{name:'Tinh Túy · '+e.name,skills:['essence-'+e.id]}]))}:{})
  });

  function onDefeated(game, enemy) {
    const level = game?.level?.id;
    if (!MM.SaveManager || !Object.prototype.hasOwnProperty.call(rewards,level)) return false;
    if (!enemy?.boss || !enemy.dead || enemy.retired || enemy.health > 0 || game.bossDefeated !== true) return false;
    if ((game.enemies || []).some(other => other?.boss && !other.dead && !other.retired && other.health > 0)) return false;
    const progression = MM.SaveManager.normalize(game.progression || game.save?.progression,game.save?.completed);
    if (progression.rewards.includes(level)) return false;
    if (!game.save || typeof game.save !== 'object') game.save = {};
    if (!game.progression || typeof game.progression !== 'object') game.progression = progression;
    game.progression.rewards = [...progression.rewards,level].sort((a,b) => a-b);
    MM.SaveManager.write(game);
    game.toast?.('ĐÃ MỞ KHÓA · '+rewards[level].name,4);
    return true;
  }

  MM.BossManager = {onDefeated,rewards};
})(typeof window !== 'undefined' ? window : globalThis);
