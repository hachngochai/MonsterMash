/* Middle sea161–170. New balance is provisional; inherited air/swim/horse
 * values live exclusively in UnderwaterConfig and remain unchanged. */
(function(root){'use strict';const MM=root.MM=root.MM||{};
 MM.MiddleSeaConfig={provisional:true,range:{first:161,last:170},
  campaign:{targets:[12,14,16,12,14,16,14,16,18,20],intervals:[2.6,2.5,2.4,2.6,2.5,2.4,2.6,2.5,2.4,2.6],caps:[3,3,4,3,3,4,3,4,4,3],
   healthMultiplier:1,speedMultiplier:1,initialAmmo:20,ammoCapacity:70,ammoPerCrate:24,ammoInterval:5.8,abilityInterval:6,abilityWarning:1.1,
   enemyPressureCap:1,bossPressureCap:1,pressureWarmup:99999,pressureRampSeconds:99999,bossWarmup:99999,bossRampSeconds:99999},
  enemies:{babyShark:{w:78,h:44,speed:76,health:4,score:290,damage:1,ability:'shark-bite'},
   electricJellyfish:{w:42,h:82,speed:40,health:1,score:0,damage:0,ability:'electric-drift'},
   phantomJellyfish:{w:190,h:210,speed:52,health:140,score:4300,damage:0,ability:'electric-numb'}},
  shark:{detectRange:550,biteCooldown:2.5,biteWarning:.5,biteRange:65,biteHeight:60,biteDamage:1,turnRate:5,biteLife:.25,biteTriggerRange:110},
  jellyfish:{riseSpeed:46,stun:2,summonedStun:2,summonedOxygenFraction:1/3,postStunGrace:1,
   spawnInterval:5.5,spawnCap:3,summonCap:15,bob:12,lateralSpeed:10,pulseRate:3.6},
  boss:{health:140,shockCooldown:10,shockWarning:.8,shockApproachSpeed:180,shockApproachTime:1.4,shockRange:130,shockHeight:125,
   shockDamage:1,shockStun:3,shockOxygenFraction:.5,summonCooldown:15,summonWarning:1,summonCount:5,
   laserCooldown:8,laserWarning:.9,laserRange:480,laserWidth:18,laserLife:.6,laserDamage:2,
   illusionThreshold:.25,illusionWarning:1,swapCooldown:6,swapWarning:.8,swapDuration:.65,
   cloneAttackMode:'none',victoryRule:'original-only',oxygenBasis:'current',shieldBlocksOxygen:true,supplyWhileStunned:true,
   shockLife:.45,summonEdge:60,swapArc:32}
 };
})(typeof window!=='undefined'?window:globalThis);
