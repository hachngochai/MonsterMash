/* Ancient Abyss 101–150. Fixed specification values and provisional balance
 * live here so playtesting can tune them without changing combat logic. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  MM.AbyssConfig = {
    version:1, balanceStatus:'provisional-playtest',
    fixed:{parasiteFrenzy:1,parasiteCastInterval:10,flowerIllusions:3,turtleVanishInterval:15,reflectionRatio:1,
      waterColumns:5,turtleDamageRatio:.5,turtleRangeSteps:4,crowInterval:5,lanternInterval:6,
      rollingRockInterval:10,emotionInterval:20,mazeEmotionInterval:15,mazeThreshold:.5,mazeRefills:1,minotaurRageInterval:10},
    lighting:{torchViewportRatio:.5,orbitFlames:2,torchRadius:305,weaponRadius:95,darkWeaponRadius:24,deityDarkWeaponSteps:3,transitionSpeed:5},
    weapons:{hammer:{damage:4,cooldown:.95,range:105,cost:0,melee:true},scythe:{damage:3,cooldown:.7,range:125,cost:0,melee:true}},
    campaign:{initialAmmo:20,ammoCapacity:70,ammoPerCrate:40,ammoInterval:4.5,healthMultiplier:1,speedMultiplier:1,abilityInterval:5,abilityWarning:1.2,
      enemyPressureCap:1.7,bossPressureCap:1.85,pressureRampSeconds:90,bossRampSeconds:75,pressureWarmup:14,bossWarmup:4},
    enemies:{
      minotaurCalf:{name:'Minotaur Con',w:48,h:58,speed:83,health:5,damage:1,score:150,ability:'abyss'},
      parasite:{name:'Ký Sinh Trùng Cổ Đại',w:48,h:37,speed:92,health:4,damage:1,score:160,ability:'abyss'},
      littleTurtle:{name:'Tiểu Quy',w:43,h:51,speed:60,health:5,damage:1,score:170,ability:'abyss'},
      abyssCrow:{name:'Ô Thước',w:48,h:38,speed:76,health:4,damage:1,score:170,ability:'abyss'},
      lanternSkeleton:{name:'Xương Cầm Đèn Lồng',w:40,h:57,speed:58,health:5,damage:1,score:180,ability:'abyss'},
      clayGuard:{name:'Vệ Binh Đất Sét Nhỏ',w:42,h:58,speed:76,health:6,damage:1,score:190,ability:'abyss'},
      ancientHand:{name:'Bàn Tay Cổ Đại',w:78,h:66,speed:66,health:8,damage:2,score:230,ability:'abyss'},
      tombSpirit:{name:'Linh Hồn Mộ Cổ',w:34,h:39,speed:83,health:4,damage:1,score:200,ability:'abyss'}
    },
    bosses:{
      minotaurLord:{name:'Minotaur Chúa',w:158,h:180,speed:64,health:100,damage:2,score:3000,ability:'abyss'},
      flowerDemon:{name:'Mộc Tâm Hoa Quỷ',w:242,h:170,speed:42,health:120,damage:2,score:3500,ability:'abyss'},
      mirrorTurtle:{name:'Xích Kính Quái Sùng',w:220,h:145,speed:36,health:140,damage:2,score:4000,ability:'abyss'},
      fossilRoc:{name:'Hóa Thạch Sí Vũ',w:190,h:220,speed:58,health:110,damage:2,score:4500,ability:'abyss'},
      thousandHands:{name:'Thiên Thủ Cổ Thần',w:200,h:255,speed:30,health:160,damage:2,score:6000,ability:'abyss'}
    },
    combat:{
      limits:{hazards:42,shots:48,summons:4,flowerLife:9,shadows:1},
      death:{duration:1.2,minotaurDuration:1.4,deityDuration:1.8},
      arena:{edge:24,spawnSafety:145,ceilingInset:18,step:40,flightY:185,flightAmplitude:17,flightBob:2.3,teleportSafety:170},
      regular:{detect:420,patrolDistance:100,meleeRange:68,windup:.6,active:.2,rest:1.6,
        turtleWindup:.7,turtleCooldown:3.8,turtleWaterSpeed:260,turtleKnockup:-140,
        parasiteSelfDamage:1,parasiteSpeedMultiplier:1.7,spiritCooldown:3,spiritSpeed:220,
        handRange:105,handWindup:.8,handRest:2,handStun:.65,guardWakeRange:240,guardWakeTime:.7},
      status:{hallucination:4,hallucinationTick:1.5,hallucinationDamage:1,reverse:4,echoShake:8,shadowLife:12,
        cloneExplosionStun:1.2,cloneExplosionRadius:105,reveal:3,teleportTell:1.1},
      hazards:{mushroomInterval:8,mushroomRadius:70,mushroomTrigger:80,mushroomWarning:1,mushroomLife:16,
        spiritInterval:8,spiritRadius:75,spiritTrigger:85,spiritWarning:1.1,spiritLife:15,
        rockInterval:7,iceInterval:6.5,rockWarning:1.1,fallSpeed:340,fallGravity:650,fallWidth:32,fallHeight:52,
        fallDamage:1,blastDamage:1,pollenLife:7,pollenWidth:110,pollenHeight:24,activeTime:.25,
        rollingWarning:1.15,rollingSpeed:250,rollingSize:58,rollingDamage:1,
        tombInterval:7,tombWarning:1.1,tombWidth:90,tombDamage:1},
      minotaur:{thresholds:[.7,.35],intervals:[4.2,3.6,3],windup:.85,rest:1.15,axeRange:165,axeHeight:155,
        axeDamage:2,chargeWarning:1,chargeDuration:1.6,chargeSpeed:500,wallStun:1.5,chargeDamage:2,
        rageWindup:.85,rageDuration:1.4,rageSpeed:680,
        stompCount:4,stompWarning:1.25,summonCount:2},
      flower:{thresholds:[.7,.35],intervals:[4.5,4,3.5],windup:1,rest:1,rootRange:230,rootDamage:2,
        pollenCount:3,illusionWarning:.75,illusionLife:10,illusionSlots:[145,368,592,815],summonCount:2,
        boneVariants:['stomp','roots','sweep','flower'],stompHeight:80,sweepHeight:70,flowerBiteWidth:115},
      turtle:{invisibleDuration:5,skillInterval:5.2,mirrorDuration:2.6,mirrorWindup:.65,
        waterWarning:1.15,waterWidth:65,waterHeight:330,waterDamage:1,waterKnockup:-680,
        swipeRange:160,swipeDamage:2,reflectionSpeed:330,reflectionLife:4},
      roc:{skillInterval:4.5,sonicWarning:.9,sonicSpeed:240,sonicCount:3,sonicStagger:.16,
        strikeWidth:165,strikeHeight:330,strikeDamage:2,strikeWarning:1.25,transition:1.8,
        knightHealth:90,knightW:64,knightH:96,knightSpeed:130,knightInterval:2.7,
        scytheRange:155,scytheDamage:2,dashSpeed:450,dashTime:.6,comboCount:3,comboGap:.32,
        waveSpeed:300,waveDamage:1,knightRest:.65},
      deity:{initialEmotion:'joy',emotionOrder:['joy','rage','love','hate'],skillInterval:3.4,warning:1.15,
        transition:2,handWidth:105,handDamage:2,handHeight:320,shockwaveWidth:180,shockwaveDamage:1,
        reverseSpikeCount:3,reverseSpikeWidth:52,reverseSpikeHeight:330,reverseSpikeDamage:1,
        darknessTeleportInterval:3.4,projectionW:112,projectionH:178,projectionX:[135,360,585,810],
        projectionSwapInterval:7,projectionFloat:10,projectionBob:1.2,
        shadowSpeed:180,shadowCooldown:.65,shadowBulletSpeed:450,shadowMeleeRange:95,shadowShieldCooldown:8,
        shadowShieldDuration:1.5,shadowShieldHits:2,shadowDarkInterval:5,shadowHealKills:10,
        shadowBoneCooldown:.65,shadowClubCooldown:.75,shadowBowCooldown:.9,shadowSpearCooldown:.8,shadowAxesCooldown:.55,
        shadowRollCooldown:.9,shadowRollDuration:.32,shadowRollSpeed:650,shadowRollDamage:2,
        shadowHighJumpCooldown:3,shadowHighJumpVelocity:-740,shadowGravity:1420}
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
