/* Final ocean191–200. Explicit mechanics are fixed; unprescribed balance is
 * provisional. The fossil/summon rules were approved for this playtest. */
(function(root){'use strict';const MM=root.MM=root.MM||{};
 MM.FinalSeaConfig={provisional:true,range:{first:191,last:200},oxygenDrainMultiplier:2,
  campaign:{targets:[12,14,16,12,14,16,14,16,18,20],intervals:[2.8,2.7,2.6,2.8,2.7,2.6,2.7,2.6,2.5,2.8],caps:[3,3,3,3,3,4,3,4,4,3],
   healthMultiplier:1,speedMultiplier:1,initialAmmo:26,ammoCapacity:90,ammoPerCrate:30,ammoInterval:5.8,abilityInterval:6,abilityWarning:1.1,
   enemyPressureCap:1,bossPressureCap:1,pressureWarmup:99999,pressureRampSeconds:99999,bossWarmup:99999,bossRampSeconds:99999},
  enemies:{seaCrab:{w:84,h:58,speed:42,health:6,score:390,damage:1,ability:'twin-claws'},
   pearlClam:{w:100,h:65,speed:0,health:1,score:0,damage:0,ability:'pearl-oxygen'},
   anglerFish:{w:110,h:80,speed:30,health:6,score:430,damage:1,ability:'lure-bite'},
   giantSquid:{w:118,h:148,speed:42,health:9,score:520,damage:1,ability:'tentacle-ink'},
   seaTurtle:{w:148,h:82,speed:42,health:12,score:0,damage:1,ability:'passing-bite'},
   kraken:{w:390,h:360,speed:26,health:220,score:8500,damage:1,ability:'ocean-master'}},
  crab:{cooldown:3,damage:1,range:125,warning:.7,active:.3,recover:.5,clawWidth:48,clawHeight:55},
  clam:{oxygen:10,closeDelay:2,regrowDelay:10,pearlRadius:23,spawnX:[255,710],floorY:425},
  angler:{damage:1,cooldown:4,detectRange:155,warning:.75,dashTime:.45,dashSpeed:250,recover:.65,mouthWidth:62,mouthHeight:62},
  squid:{damage:1,cooldown:4,range:180,warning:.8,active:.35,recover:.6,tentacleWidth:95,tentacleHeight:75,
   fleeDuration:1.2,fleeSpeed:230,inkLife:2.5,inkLimit:3,inkRadius:80},
  turtle:{damage:1,cooldown:4,range:105,warning:.75,active:.3,recover:.6,mouthWidth:50,mouthHeight:48,spawnInterval:14,spawnCap:1,lanes:[225,300,365]},
  glowBug:{spawnInterval:6,spawnCap:3},
  vents:{positions:[155,480,805],floorY:438,width:60,height:330,warning:1.1,active:1,interval:8,boostedInterval:5,
   damage:1,boostedDamage:2,stun:1,maxActive:1,boostedMaxActive:2,boostPersists:true},
  boss:{health:220,suctionCooldown:10,suctionDamage:1,suctionStun:1,suctionOxygenFraction:.5,suctionWarning:1,suctionLife:.4,suctionRange:480,suctionWidth:92,suctionHeight:108,
   shipCooldown:15,shipDamage:1,shipRange:320,shipWarning:1.2,shipSpeed:340,shipWidth:88,shipHeight:46,
   darkCooldown:20,darkWarning:.85,darkDuration:10,echoThreshold:.5,echoTransition:1.1,
   fossilThreshold:.25,fossilDuration:5,fossilHealRatio:.25,fossilInvulnerable:false,fossilUses:1,
   summonRatio:.25,summonRule:'basic-bite-only',victoryRule:'defeat-all-three',summonWarning:1.2,
   legacyBiteCooldown:4,legacyBiteDamage:2,legacyBiteWarning:.8,legacyBiteSpeed:230,legacyBiteDuration:.65,legacyBiteWidth:88,legacyBiteHeight:68}
 };
})(typeof window!=='undefined'?window:globalThis);
