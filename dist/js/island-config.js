/* Resurrection Island201–250. Unspecified balance was approved for playtest;
 * authored effects and numeric values remain separate from these trial knobs. */
(function(root){'use strict';const MM=root.MM=root.MM||{};
 const enemy=(w,h,speed,health,score,damage,ability)=>({w,h,speed,health,score,damage,ability});
 MM.IslandConfig={provisional:true,range:{first:201,last:250},step:40,
  enemies:{easterEgg:enemy(36,46,30,3,140,1,'egg-explosion'),ghostBunny:enemy(42,70,72,4,210,1,'bunny'),
   luckyPatrick:enemy(43,62,45,5,240,1,'dice'),leprechaun:enemy(34,48,76,3,180,0,'steal'),
   drunkenWanderer:enemy(40,62,35,5,230,1,'bottle'),miniMoai:enemy(40,58,0,6,120,0,'wall'),
   giantBunny:enemy(100,132,52,12,180,2,'log'),mutantRat:enemy(35,27,85,3,90,1,'bite')},
  bosses:{awakeningMoai:enemy(155,224,46,120,5000,2,'moai-lord'),deforestedAlpha:enemy(180,122,88,140,5500,2,'alpha'),
   birdman:enemy(102,142,70,150,6000,2,'birdman'),manaSpirit:enemy(124,166,42,160,6500,1,'mana'),
   makemake:enemy(206,246,32,220,9000,2,'judgment')},
  campaign:{targets:Array.from({length:50},(_,i)=>12+Math.floor(i/10)*2+(i%10===9?i-1:i)%3*2),
   intervals:Array.from({length:50},(_,i)=>2.8-Math.floor(i/10)*.12),caps:Array.from({length:50},(_,i)=>3+(i%10>5?1:0)),
   healthMultiplier:1,speedMultiplier:1,initialAmmo:30,ammoCapacity:90,ammoPerCrate:28,ammoInterval:5.5,
   abilityInterval:6,abilityWarning:1,enemyPressureCap:1.2,bossPressureCap:1.15,pressureWarmup:35,pressureRampSeconds:120,bossWarmup:45,bossRampSeconds:140},
  ordinary:{eggRange:110,eggRadius:85,eggWarning:1,eggDamage:1,bunnyInterval:4,bunnyFar:190,bunnyJumpTime:.8,bunnyJumpHeight:125,
   stoneStun:.7,stunGrace:1,projectileSpeed:230,diceInterval:8,diceWarning:1,diceWeights:[1,1,1,1,1,1],invisibility:5,
   patrickStun:.8,bombRadius:80,cloverDamage:1,cloverSpeed:210,giantCap:2,giantLife:25,giantRange:160,giantInterval:3,
   stealRange:65,stealInterval:4,bottleInterval:5,bottleRadius:80,bottleDamage:1,wallInterval:10,wallLife:18,wallCap:2,wallWarning:1},
  boss:{wakeRange:380,wakeTime:1.5,skillInterval:5,warning:1,active:.4,recovery:.65,stompStun:1,
   moaiArmorMultiplier:.1,moaiWeakTime:8,moaiWallHits:1,moaiChargeSpeed:380,moaiChargeTime:2.8,laserDamage:2,laserRange:700,
   alphaSpeed:480,alphaChargeTime:1.1,ratCount:3,ratCap:6,burrowTime:1.5,emergeWarning:1,
   birdFlightY:235,birdDiveTime:.65,birdDiveDamage:2,fearDuration:1.5,fearSpeed:90,visionDuration:2,poisonLife:3,poisonDamage:1,eggRadius:90,
   manaSlow:.55,manaSlowTime:3,manaVulnerableTime:3,manaExtraDamage:1,manaShieldHits:5,manaShieldTime:4,manaTeleportSafety:150,
   lavaInterval:8,lavaWarning:1.3,lavaLife:4,lavaDamage:1,lavaTick:1,lavaWidths:100,
   judgmentThreshold:.5,judgmentUses:1,judgmentCharge:8,sealRequired:2,sealXs:[175,480,785],sealRange:55,sealZone:90,
   maxHazards:32,maxProjectiles:40,maxSummons:8},
  rewards:{armorInterval:10,armorDuration:3,moaiHealth:12,moaiDamage:2,moaiInterval:1,moaiCooldown:10,
   formDuration:20,formWeights:[1,1,1,1,1,1,1],gloveDamage:3,gloveRange:480,gloveCooldown:.7,
   eggDamage:5,eggRadius:200,eggCooldown:1.2,cloverCount:5,cloverDamage:1,cloverCooldown:.75,
   fireAuraDamage:1,fireAuraRange:200,fireballDamage:8,fireballCooldown:1.2,meteorDuration:4,meteorRange:480,meteorDamage:3,meteorInterval:.45,staffCooldown:4,
   moaiScale:1.5,moaiMove:.28,moaiMelee:10,moaiCrack:5,moaiStun:.5,moaiAttackCooldown:1,
   lightMove:2,lightRegularDamage:999,lightBossDamage:9,lightDashTime:.32,
   cloneHealth:10,cloneLife:20,cloneCooldown:10,cloneInterval:.7,shieldCap:5}
 };
})(typeof window!=='undefined'?window:globalThis);
