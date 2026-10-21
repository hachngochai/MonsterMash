/* Hải Vực Quên Lãng, first playable release 151–160.
 * All unprescribed balance remains explicitly provisional for playtesting.
 * User-approved trial choices: 30s air, 50% refill, 2 reserves/crate and at start,
 * 1HP/s after 5s suffocation, 120HP boss + independent 60HP twin, defeat both.
 */
(function(root){
  'use strict';const MM=root.MM=root.MM||{};
  MM.UnderwaterConfig={
    provisional:true,range:{first:151,last:160,plannedLast:200},
    arena:{width:960,height:540,centerY:292,itemY:270,minY:105,maxY:400,edge:28},
    swim:{speed:245,acceleration:1200,drag:5,bob:5,bobRate:1.9,verticalSpring:9,verticalDamping:5.5,rollSpeed:650},
    oxygen:{capacity:30,drainPerSecond:1,refill:15,initialReserve:2,reservePerCrate:2,maxReserve:12,
      repeatOnHold:false,refillCooldown:.35,warningRatio:.25,suffocationGrace:5,suffocationDamage:1,suffocationTick:1},
    loot:{oxygenInterval:12,oxygenLimit:2,oxygenLife:20,sinkSpeed:65,bob:5,bobRate:1.4,oxygenReservePerCrate:2},
    particles:{limit:64,movingInterval:.12,idleInterval:.65,suffocatingInterval:1.2,riseSpeed:38,life:3.5},
    campaign:{targets:[10,12,14,12,14,16,14,16,18,20],intervals:[2.6,2.5,2.4,2.6,2.5,2.4,2.6,2.5,2.4,2.6],
      caps:[3,3,3,3,3,4,3,4,4,3],healthMultiplier:1,speedMultiplier:1,initialAmmo:20,ammoCapacity:70,
      ammoPerCrate:24,ammoInterval:5.8,abilityInterval:6,abilityWarning:1.1,enemyPressureCap:1,bossPressureCap:1,
      pressureWarmup:99999,pressureRampSeconds:99999,bossWarmup:99999,bossRampSeconds:99999},
    enemies:{
      piranha:{w:58,h:43,speed:56,health:3,score:230,damage:1,ability:'water-dash'},
      pufferfish:{w:48,h:48,speed:29,health:4,score:260,damage:1,ability:'inflate'},
      seahorse:{w:46,h:76,speed:36,health:4,score:280,damage:1,ability:'water-pressure'},
      twinClawFish:{w:166,h:134,speed:62,health:120,score:3800,damage:1,ability:'triple-claw'}},
    piranha:{detectRange:420,dashCooldown:4.5,warning:.7,dashSpeed:360,dashTime:.65,recovery:1.1,damage:1},
    pufferfish:{warningRange:170,releaseRange:220,inflateScale:1.75,inflateRate:3.5,damage:1,knockback:95,contactImmunity:.8},
    seahorse:{range:480,preferredDistance:310,projectileSpeed:320,projectileDamage:1,cooldown:5,warning:.8,projectileLife:2},
    boss:{health:120,clawInterval:6,clawWarning:.85,dashSpeed:460,dashDuration:1.1,clawRange:155,clawHeight:155,
      clawCount:3,clawGap:.55,clawDamage:1,shieldDrain:1,clawShieldRule:'active-blocks-otherwise-reserve',
      silenceDuration:3,silenceNormal:15,silenceTwin:10,silenceWarning:.9,
      splitThreshold:.5,splitDuration:1.5,twinHealthRatio:.5,twinHealthMode:'independent',victoryRule:'defeat-both',
      vortexCooldown:9,vortexWarning:1,vortexTravel:.6,vortexLife:3.5,vortexRadius:170,vortexCore:30,
      vortexPull:430,vortexDamage:2,vortexOxygenFraction:.5,vortexOffset:115,maxVortices:2}
  };
})(typeof window!=='undefined'?window:globalThis);
