/* Cosmic Expedition design registry. Authored values are exact. Missing combat
 * values remain null until the playtest configuration has been confirmed. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{};
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const definitions=[
    ['mercury','Sao Thủy','Vùng Đất Lưỡng Cực Nhiệt','#ef9c59','rock',
      ['mercurianPyroSlug','solarFlareSpecter','craterBurrower','livingCinnabar','moltenCoreDrone'],
      'hermes','Hermes · Flame-Core Colossus',['mercury-quake','blazing-meteor-rain'],
      'Một nửa đá chìm trong bóng lạnh, nửa còn lại rực dưới Mặt Trời. Những vệt kim loại nóng chảy dẫn tới lõi thiên thạch đang thức giấc.'],
    ['venus','Sao Kim','Địa Ngục Nhà Kính','#d4cf67','rock',
      ['venutianAcidStalker','sulfurGolem','greenhouseSpore','vesperSkimmer','corrosiveWisp'],
      'aphrodite','Aphrodite · Acid-Storm Queen',['acid-vortex','acid-rain'],
      'Mây axit cuộn trên đồng đá núi lửa. Hãy đọc vùng báo trước dưới lớp khí vàng và tránh những vũng ăn mòn.'],
    ['mars','Sao Hỏa','Đế Chế Sắt Đỏ','#d78165','rock',
      ['martianDustWorm','ironOxideBerserker','phobosDrone','dustDevilElemental','aresSpider'],
      'ares','Ares · Iron Warlord',['thermal-dust-storm','martian-ground-rift'],
      'Sa mạc sắt đỏ kéo dài dưới bóng Olympus Mons. Những cỗ máy cũ trỗi dậy giữa chiến tuyến phủ bụi.'],
    ['jupiter','Sao Mộc','Đại Dương Bão Khí','#9acb9a','energy-platform',
      ['jovianGasWhale','plasmaEel','vortexPhantom','jupiterSpore','atmosphericWisp'],
      'zeus','Zeus · Thunder-Giga Dreadnought',['green-thunder-columns','extreme-pressure-wave'],
      'Các bệ năng lượng giữ đôi chân trên biển mây. Phía xa, những dải khí và Vết Đỏ Lớn quay dưới ánh chớp.'],
    ['saturn','Sao Thổ','Vương Quốc Vành Đai','#ccb797','ring-platform',
      ['saturnianRingCrafter','frostCrystalGolem','titanMethaneLeech','ringAsteroidSentient','ringRiderDrone'],
      'chronos','Chronos · Ice-Titan',['defensive-ice-rings','rolling-ice-boulders'],
      'Băng và thiên thạch quay quanh những bệ nhân tạo. Quan sát mặt giáp pha lê trước khi nhả đạn.'],
    ['uranus','Sao Thiên Vương','Vương Quốc Băng Pha Lê','#b4e3ed','ice-platform',
      ['uranianFrostBender','methanePhantom','cyanFrostGuard','iceClusterMine','auroraJellyfish'],
      'ouranos','Ouranos · Frost Knight King',['eternal-ice-lance','silver-icicle-rain'],
      'Ánh Mặt Trời yếu dần giữa các vách pha lê. Cực quang hắt lên lưỡi thương của vị vua băng bạc.'],
    ['neptune','Sao Hải Vương','Tâm Bão Vực Thẳm','#9d9bea','energy-platform',
      ['neptunianAbyssalSiren','stormLeviathan','tritonIceDemon','darkSpotVoidling','sonicWindWraith'],
      'poseidon','Poseidon · Tempest Overlord',['gravitational-pull','gravitational-push'],
      'Gió cobalt kéo những xoáy tím qua bệ chiến đấu. Chừa khoảng trống để vượt nhịp hút rồi nhịp đẩy.'],
    ['moon','Mặt Trăng','Phán Xét Nguyệt Ảnh','#d6d7df','low-gravity-rock',
      ['lunarShadowStalker','regolithGolem','apolloMalfunctioningMech','crescentWisp','polarIceBeetle'],
      'selene','Selene · Lunar Judge',['judgment-crescent','frozen-stasis-zones'],
      'Trái Đất treo phía trên đồng regolith im lặng. Dấu tích thám hiểm dẫn tới những công trình nghiên cứu bỏ hoang.'],
    ['sun','Mặt Trời','Đế Chế Plasma','#ffb464','protected-plasma-platform',
      ['solarCoreElemental','prominenceDragon','sunspotShadowFiend','nuclearFusionParasite','photonPhoenix'],
      'helios','Helios · Solar Emperor',['nuclear-storm','supreme-solar-ray'],
      'Trường bảo vệ che bệ năng lượng giữa biển plasma. Những vòng từ trường dựng lên sau đôi cánh của hoàng đế lửa.'],
    ['blackHole','Hố Đen Vũ Trụ','Tận Cùng Không-Thời Gian','#b4a1df','protected-orbit-platform',
      ['singularityVoidEater','spaghettifiedConstruct','timeWarpSpecter','eventHorizonParasite','gravitationalAnomaly'],
      'singularitySovereign','Abyssal Singularity Sovereign',['void-pull','time-rend','extinction-shockwave'],
      'UFO dừng ngoài chân trời sự kiện. Vòng bồi tụ bẻ cong ánh sao quanh bệ an toàn cuối cùng của hành trình.']
  ];
  const enemyDesigns={
    mercurianPyroSlug:['Ốc Sên Nhiệt Kim','slug','molten-trail'],solarFlareSpecter:['Bóng Ma Bùng Nổ Mặt Trời','specter','blink-strike'],
    craterBurrower:['Bọ Hố Thiên Thạch','burrower','hot-rock'],livingCinnabar:['Chu Sa Sống','mineral','three-fragments'],moltenCoreDrone:['Drone Lõi Nóng Chảy','drone','thermal-beam'],
    venutianAcidStalker:['Thợ Săn Axit','quadruped','armor-corrosion'],sulfurGolem:['Golem Lưu Huỳnh','golem','harden'],greenhouseSpore:['Bào Tử Nhà Kính','spore','acid-cloud'],
    vesperSkimmer:['Chim Vesper','bird','air-dash'],corrosiveWisp:['Tinh Linh Ăn Mòn','wisp','corrosive-contact'],
    martianDustWorm:['Sâu Bụi Hỏa Tinh','worm','burrow-dust'],ironOxideBerserker:['Cuồng Binh Sắt Gỉ','knight','heat-saw'],phobosDrone:['Drone Phobos','drone','zigzag-burst'],
    dustDevilElemental:['Tinh Linh Lốc Bụi','vortex','dust-push'],aresSpider:['Nhện Ares','spider','dust-mine'],
    jovianGasWhale:['Cá Voi Khí Sao Mộc','whale','sonic-stun'],plasmaEel:['Lươn Plasma','eel','electric-area'],vortexPhantom:['Bóng Ma Xoáy Khí','vortex','spiral-chase'],
    jupiterSpore:['Bào Tử Sao Mộc','spore','charged-light'],atmosphericWisp:['Tinh Linh Khí Quyển','wisp','death-pull'],
    saturnianRingCrafter:['Thợ Vành Đai','knight','magnetic-ice'],frostCrystalGolem:['Golem Pha Lê Băng','golem','front-reflection'],titanMethaneLeech:['Đỉa Methane Titan','leech','ammo-drain'],
    ringAsteroidSentient:['Thiên Thạch Tỉnh Thức','mineral','asteroid-awaken'],ringRiderDrone:['Drone Cưỡi Vành Đai','drone','freeze-missile'],
    uranianFrostBender:['Kẻ Uốn Băng','knight','frost-afterimages'],methanePhantom:['Bóng Ma Methane','specter','cold-aura'],cyanFrostGuard:['Vệ Binh Băng Lam','knight','physical-shield'],
    iceClusterMine:['Mìn Băng Chùm','mineral','ice-shards'],auroraJellyfish:['Sứa Cực Quang','jellyfish','cold-electric-stream'],
    neptunianAbyssalSiren:['Siren Vực Thẳm','siren','sonic-gravity'],stormLeviathan:['Leviathan Bão','dragon','wind-burst'],tritonIceDemon:['Quỷ Băng Triton','knight','piercing-ice'],
    darkSpotVoidling:['Hư Linh Tâm Bão','wisp','bullet-growth'],sonicWindWraith:['Oan Hồn Gió Âm','specter','sonic-dash'],
    lunarShadowStalker:['Thợ Săn Bóng Trăng','quadruped','shadow-hide'],regolithGolem:['Golem Bụi Trăng','golem','moon-rock'],apolloMalfunctioningMech:['Cỗ Máy Apollo Hỏng','knight','explorer-burst'],
    crescentWisp:['Tinh Linh Trăng Khuyết','wisp','cold-ray'],polarIceBeetle:['Bọ Băng Cực','burrower','crater-ambush'],
    solarCoreElemental:['Tinh Linh Lõi Mặt Trời','phoenix','gamma-shot'],prominenceDragon:['Rồng Tai Lửa','dragon','flame-storm'],sunspotShadowFiend:['Quỷ Đốm Mặt Trời','specter','shadow-armor'],
    nuclearFusionParasite:['Ký Sinh Nhiệt Hạch','mineral','fusion-growth'],photonPhoenix:['Phượng Hoàng Photon','phoenix','photon-dash'],
    singularityVoidEater:['Kẻ Nuốt Hư Không','quadruped','time-slow-aura'],spaghettifiedConstruct:['Cấu Thể Kéo Dài','construct','long-limb'],timeWarpSpecter:['Bóng Ma Thời Gian','specter','reverse-bullets'],
    eventHorizonParasite:['Ký Sinh Chân Trời Sự Kiện','vortex','projectile-gravity'],gravitationalAnomaly:['Dị Thường Hấp Dẫn','wisp','chaos-orbs']
  };
  const essenceDefinitions=[
    {id:'mercury',name:'Dòng Nước Cao Áp',color:'#65c9f5',duration:5,ammoCost:20,rangeFraction:.5,damagePerSecond:99},
    {id:'venus',name:'Ngưng Đọng Không Gian',color:'#edce68',duration:5,cooldown:10},
    {id:'mars',name:'Ngọn Lửa Hủy Diệt',color:'#ef7055',duration:5,ammoCost:20,rangeFraction:.5,damagePerSecond:99},
    {id:'jupiter',name:'Dây Leo Đại Địa',color:'#95d886',duration:5,ammoCost:20,rangeFraction:.5,damagePerHit:99},
    {id:'saturn',name:'Tam Thạch Lăn',color:'#b99a75',projectileCount:3,damagePerHit:20,ammoCost:0},
    {id:'uranus',name:'Song Kị Sĩ Hộ Vệ',color:'#deebf1',summonCount:2,summonHealth:20,cooldown:10},
    {id:'neptune',name:'Thực Thể Hút Đẩy',color:'#b188e0',duration:15,stateInterval:2,pullDamage:2,pushDamage:999},
    {id:'moon',name:'Phán Quyết',color:'#d7e6ed',healthBonus:50,palmDamageBonus:5,freezeChance:.25},
    {id:'sun',name:'Tối Thượng',color:'#ffd27f',healthBonus:50,palmDamageBonus:5,burnDamagePerSecond:3,burnDuration:2},
    {id:'blackHole',name:'Lỗ Hổng Hư Không',color:'#ad8cdc',duration:8,cooldown:15,absorbedArmorFraction:.5,armorCap:100,damagePerSecond:50,finalTrueDamage:2000}
  ];
  const regions=definitions.map((r,i)=>({id:r[0],name:r[1],subtitle:r[2],color:r[3],terrain:r[4],enemies:r[5],boss:r[6],bossName:r[7],bossSkills:r[8],story:r[9],
    first:251+i*10,last:260+i*10,world:25+i,background:'assets/backgrounds/cosmic/'+r[0]+'.png',bossSprite:'assets/sprites/cosmic/'+r[6]+'.png'}));
  const enemies=Object.fromEntries(Object.entries(enemyDesigns).map(([id,d])=>[id,{id,name:d[0],shape:d[1],ability:d[2],region:regions.find(r=>r.enemies.includes(id)).id}]));
  const essences=essenceDefinitions.map((e,i)=>({...e,unlock:260+i*10}));
  const getRegion=level=>regions.find(r=>Number(level)>=r.first&&Number(level)<=r.last)||null;
  const enemyPool=(region,stage)=>region.enemies.slice(0,stage===1?1:stage<=3?2:stage===4?3:stage===5?4:5);
  const stages=regions.flatMap(region=>Array.from({length:10},(_,i)=>({id:region.first+i,world:region.world,region:region.id,stage:i+1,boss:i===9,
    bossArchetype:i===9?region.boss:null,bossName:i===9?region.bossName:null,types:enemyPool(region,i+1),ordinaryWarmup:true})));
  const crossings=Array.from({length:10},(_,i)=>({from:250+i*10,to:251+i*10,fromRegion:i?regions[i-1].id:'island',toRegion:regions[i].id,firstBoarding:i===0}));
  const authored=freeze({
    regions,enemies,essences,stages,crossings,
    fixed:{livingCinnabarChildren:3,sulfurGolemImmunity:2,frostGolemFrontReflection:.5,sovereignWaveHealthFraction:.9},
    suit:{unlock:250,name:'Bộ Đồ Phi Hành Gia Makemake',key:'KeyJ'},
    chapter:{name:'Đại Chiến Vũ Trụ',subtitle:'The Cosmic Expedition',first:251,last:350}
  });
  // A null entry documents a real design decision, not an implicit zero or a
  // fallback value. The game cannot consume this registry as playable balance.
  const pending=freeze({
    enemies:{health:null,damage:null,speed:null,attackCooldown:null,warning:null,range:null,projectileSpeed:null,statusDuration:null},
    bosses:{health:null,damage:null,speed:null,attackCooldown:null,warning:null,hazardLifetime:null,hazardCount:null},
    campaign:{quota:null,maxAlive:null,spawnInterval:null,ammoCapacity:null,initialAmmo:null,ammoPerCrate:null,ammoInterval:null,gravity:null},
    suit:{jetpackDuration:null,jetpackCooldown:null,jetpackCost:null,activation:null},
    essences:{controls:null,mercuryCooldown:null,marsCooldown:null,jupiterCooldown:null,vineHitInterval:null,saturnCooldown:null,
      knightDamage:null,knightLifetime:null,neptuneCooldown:null,neptuneStun:null,palmDamage:null,palmCooldown:null,palmAmmo:null,moonFreezeDuration:null,
      stanceHealthLifetime:null,blackHoleRadius:null,blackHoleArmorRounding:null},
    interactions:{venusBossRule:null,heliosShieldRule:null,sovereignCurrentOrMaximumHP:null}
  });
  MM.CosmicConfig={authored,pending,getRegion,enemyPool};
})(typeof window!=='undefined'?window:globalThis);
