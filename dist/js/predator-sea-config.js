/* Predator sea171–180. Official damage/cadence values are preserved below;
 * all sizes, movement, warning windows and trial balance remain provisional. */
(function(root){'use strict';const MM=root.MM=root.MM||{};
 MM.PredatorSeaConfig={provisional:true,range:{first:171,last:180},
  campaign:{targets:[12,14,16,12,14,16,14,16,18,20],intervals:[2.6,2.5,2.4,2.6,2.5,2.4,2.6,2.5,2.4,2.6],caps:[3,3,4,3,3,4,3,4,4,3],
   healthMultiplier:1,speedMultiplier:1,initialAmmo:22,ammoCapacity:80,ammoPerCrate:28,ammoInterval:5.8,abilityInterval:6,abilityWarning:1.1,
   enemyPressureCap:1,bossPressureCap:1,pressureWarmup:99999,pressureRampSeconds:99999,bossWarmup:99999,bossRampSeconds:99999},
  enemies:{hammerhead:{w:100,h:60,speed:55,health:5,score:340,damage:1,ability:'hammer-ram'},
   electricRay:{w:110,h:58,speed:44,health:5,score:360,damage:1,ability:'ray-discharge'},
   swordfish:{w:138,h:44,speed:850,health:3,score:320,damage:1,ability:'sword-pass'},
   megaLondon:{w:330,h:162,speed:62,health:160,score:5000,damage:3,ability:'sonic-bite'}},
  hammerhead:{ramCooldown:2,ramDamage:1,detectRange:550,warning:.35,dashSpeed:340,dashTime:.55,recovery:.35,headWidth:48,headHeight:54},
  electricRay:{cooldown:10,damage:1,stun:1,range:420,warning:.8,projectileSpeed:420,projectileLife:1.3,projectileWidth:18,preferredDistance:300},
  swordfish:{attackWindow:5,damage:1,speed:850,warning:.9,spawnInterval:8,spawnCap:1,lanes:[240,292,355],tipWidth:58,tipHeight:16},
  // Five simultaneous targets and exact HP-to-ammo payment are official;
  // range, tick speed and base damage remain adjustable playtest balance.
  rewards:{lightningOrb:{range:360,tickInterval:.35,damage:1,maxTargets:5,bosses:true}},
  boss:{health:160,biteCooldown:15,biteDamage:3,biteWarning:.9,biteSpeed:620,biteDuration:1.05,biteRecovery:.45,mouthWidth:102,mouthHeight:74,
   diveCooldown:10,diveDownDuration:.45,hiddenDuration:3,emergenceWarning:.8,emergeSpeed:700,emergeDuration:.85,
   roarCooldown:12,roarWarning:1,roarDuration:3,roarRange:480,roarHeight:300,roarStun:1,
   panicDuration:3,panicTick:1,panicTicks:3,panicOxygenFraction:.1,oxygenBasis:'current',
   rageDuration:5,shieldBlocksPanic:true}
 };
})(typeof window!=='undefined'?window:globalThis);
