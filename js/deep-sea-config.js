/* Deep sea 181–190. Unspecified combat balance remains provisional for playtest. */
(function(root){'use strict';const MM=root.MM=root.MM||{};
 MM.DeepSeaConfig={provisional:true,range:{first:181,last:190},oxygenMultiplier:1.5,step:50,
  campaign:{targets:[12,14,16,12,14,16,14,16,18,20],intervals:[2.6,2.5,2.4,2.6,2.5,2.4,2.6,2.5,2.4,2.6],caps:[3,3,4,3,3,4,3,4,4,3],
   healthMultiplier:1,speedMultiplier:1,initialAmmo:22,ammoCapacity:90,ammoPerCrate:30,ammoInterval:5.8,abilityInterval:6,abilityWarning:1.1,
   enemyPressureCap:1,bossPressureCap:1,pressureWarmup:99999,pressureRampSeconds:99999,bossWarmup:99999,bossRampSeconds:99999},
  enemies:{gulper:{w:136,h:62,speed:40,health:5,score:370,damage:1,ability:'gulper-suction'},
   ghostShark:{w:128,h:62,speed:65,health:6,score:390,damage:1,ability:'ghost-bite'},
   glowBug:{w:38,h:36,speed:58,health:1,score:260,damage:1,ability:'glow-explosion'},
   leviathan:{w:350,h:172,speed:48,health:180,score:6000,damage:2,ability:'ancient-bite'},
   leviathanChild:{w:132,h:66,speed:85,health:45,score:430,damage:2,ability:'child-bite'}},
  gulper:{cooldown:5,rangeSteps:4,damage:1,warning:.65,duration:1.4,pullSpeed:145,mouthWidth:48,mouthHeight:48},
  ghostShark:{detectSteps:6,loseSteps:7,biteCooldown:2.8,damage:1,warning:.55,biteDuration:.5,biteSpeed:240,mouthWidth:48,mouthHeight:48},
  glowBug:{damage:1,radius:65,triggerRange:110,warning:1,killable:true},
  boss:{health:180,basicCooldown:10,basicDamage:2,biteWarning:.85,biteSpeed:440,biteDuration:.8,biteRecovery:.35,mouthWidth:110,mouthHeight:86,
   swarmCooldown:20,swarmDuration:3,swarmCount:2,childHealthFraction:.25,childHealthBasis:'maximum',childCap:6,childBiteCooldown:3,
   lordCooldown:15,lordDamage:1,lordWarning:.9,lordStun:1,lordRange:480,lordSpeed:560,
   blackHoleCooldown:18,blackHoleWarning:1,blackHoleRange:480,blackHoleDuration:2.5,blackHolePullSpeed:210,swallowDuration:5,releaseDamage:3,
   rebirthHealthFraction:.25,rebirthDuration:5,rebirthWaves:2,rebirthWaveCount:2,rebirthWaveTimes:[0,2.5],rebirthChildSpeed:160,
   finalDuration:5,finalWarning:1.2,finalContactAt:3,finalSpeed:500,
   skills:['ancient-bite','echo-swarm','sea-lord','black-hole','first-rebirth','final-breath']}
 };
})(typeof window!=='undefined'?window:globalThis);
