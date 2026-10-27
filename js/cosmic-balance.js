/* User-approved provisional playtest config, 27 Oct 2026. Authored essence
 * damage and durations remain exact in cosmic-config.js. */
(function(root){'use strict';
 const MM=root.MM=root.MM||{},D=MM.CosmicConfig.authored;
 const health=[5,6,6,7,7,8,8,9,10,12],bossHealth=[500,600,700,800,900,1000,1100,1200,1300,1800];
 const sizes={slug:[70,40],specter:[46,76],burrower:[63,45],mineral:[50,60],drone:[54,54],quadruped:[76,65],golem:[78,108],spore:[54,68],bird:[74,54],wisp:[42,60],worm:[92,48],knight:[48,78],vortex:[56,96],spider:[68,42],whale:[112,72],eel:[100,54],leech:[70,34],jellyfish:[68,92],siren:[52,84],dragon:[112,80],phoenix:[90,80],construct:[48,128]};
 const bossSizes=[[300,255],[280,260],[230,285],[330,255],[330,280],[270,285],[330,280],[300,280],[370,290],[430,300]],enemies={},bosses={};
 D.regions.forEach((r,band)=>{
  r.enemies.forEach((id,i)=>{const d=D.enemies[id],size=sizes[d.shape];enemies[id]={w:size[0],h:size[1],health:Math.min(12,health[band]+(i===1?1:0)),speed:45+(i%3)*13,score:350+band*25,damage:1,ability:d.ability,cosmic:true};});
  bosses[r.boss]={w:bossSizes[band][0],h:bossSizes[band][1],health:bossHealth[band],speed:35,score:10000+band*1000,damage:2,ability:r.bossSkills[0],cosmic:true};
 });
 const campaign={healthMultiplier:1,speedMultiplier:1,initialAmmo:50,ammoCapacity:120,ammoPerCrate:35,ammoInterval:5,abilityInterval:6,abilityWarning:1,abilitySpawnEvery:0,enemyPressureCap:1,bossPressureCap:1,pressureWarmup:0,pressureRampSeconds:1,bossWarmup:0,bossRampSeconds:1};
 const levels=D.stages.map(s=>{const band=Math.floor((s.id-251)/10),r=D.regions[band];return {...campaign,...s,cosmic:true,underwater:false,target:16+band+Math.min(s.stage-1,8),maxAlive:4+(band>=4?1:0),spawnInterval:2.5-band*.08,types:s.types.slice(),hazardTypes:[],name:s.boss?r.bossName:r.name+' · '+s.stage,bossHealth:s.boss?bossHealth[band]:0,bossAbilities:s.boss?r.bossSkills.slice():[],bossSkills:s.boss?r.bossSkills.slice():[],layout:'cosmic',recovery:s.stage===5,story:r.story,tutorial:r.story,balanceStatus:'provisional-playtest'};});
 MM.CosmicBalance={provisional:true,approved:true,enemies,bosses,campaign,levels,
  ordinary:{cooldown:6,warning:1,recovery:.6,range:200,projectileSpeed:240,statusDuration:1.5,trailLifetime:3,trailTick:1,trailDamage:1,trailSlow:.6,corrosionTime:3,corrosionDamageMultiplier:.6,visionTime:2,sporeRadius:100,mineLifetime:5,stun:1,iceSlow:.5,missileStun:1,leechAmmo:2,leechHeal:1,voidGrowth:.12,maxGrowth:1.5,shadowDamageMultiplier:.5,freezeTime:1.2,summonCap:8},
  boss:{cooldown:6,warning:1.1,active:.7,recovery:.8,meteorCount:5,meteorRadius:38,quakeHeight:32,puddleLife:3,iceCount:4,pullSpeed:135,pushSpeed:240,fieldLife:3,fieldTick:1,rayWidth:54,freezeTime:1.5,coverXs:[175,785],coverWidth:120,extinctionWarning:2.5,maxHazards:24,maxProjectiles:48},
  suit:{duration:6,cooldown:10,cost:0,hoverY:275,verticalSpeed:220,gravity:[.8,.95,.65,.9,.75,.85,.9,.42,.8,.7]},
  rewards:{beamCooldown:12,vineHitInterval:1,stoneCooldown:3,stoneSpeed:330,knightDamage:4,knightLife:20,knightAttackInterval:1,neptuneCooldown:20,neptuneStun:.5,palmBaseDamage:1,palmCooldown:.5,palmAmmo:1,palmRadius:55,moonFreezeDuration:1,blackHoleRadius:330,blackHolePullSpeed:160,virtualArmorPerBullet:.5,stanceHealthBonus:50},
  limits:{hazards:24,projectiles:48,summons:8},interactions:{venusInstantKillBoss:false,heliosBypassesOrdinaryShield:true,extinctionUsesCurrentHP:true}
 };
})(typeof window!=='undefined'?window:globalThis);
