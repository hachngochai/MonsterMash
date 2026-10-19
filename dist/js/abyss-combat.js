/* Ancient Abyss combat owns only 101–150 actors and transient arena effects.
 * All tunable values are in abyss-config.js; clocks use active game seconds. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPS = 1e-8;
  const TYPES = new Set(['minotaurCalf','parasite','littleTurtle','abyssCrow','lanternSkeleton','clayGuard','ancientHand','tombSpirit',
    'minotaurLord','flowerDemon','mirrorTurtle','fossilRoc','thousandHands','playerShadow']);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const cfg = () => MM.AbyssConfig.combat;
  const fixed = () => MM.AbyssConfig.fixed;
  const kind = e => e?.archetype || e?.type;
  const alive = e => !!e && !e.dead && !e.retired && e.health > 0;
  const inAbyss = g => g.level?.id >= 101 && g.level.id <= 150;
  const random = g => clamp(g.random?.() ?? Math.random(), 0, 1 - Number.EPSILON);
  const frozen = e => (e.petrifiedTime || 0) > EPS;
  const touch = (a, b) => Math.abs(a.x-b.x) < (a.w+b.w)/2 && a.y > b.y-b.h && a.y-a.h < b.y;
  const distance = (a, b) => Math.max(0, Math.abs(a.x-b.x)-(a.w+b.w)/2);
  const hitPlayer = (g, z) => touch({...g.player,w:g.player.w*.75,h:g.player.h*.86},z);

  function owns(g, e) { return TYPES.has(kind(e)); }
  function reset(g) {
    // Temporary bodies are combat objects, never save data. Retire them without
    // death/reward accounting when leaving, restarting, or finishing an arena.
    for(const e of g.enemies || []) {
      if(e.flowerIllusion || e.emotionProjection || e.playerShadow) {e.dead=true;e.health=0;}
      if(kind(e)==='minotaurLord'){e.minotaurRage=false;e.minotaurRagePending=false;}
    }
    if(Array.isArray(g.enemies))g.enemies=g.enemies.filter(e=>!e.flowerIllusion&&!e.emotionProjection&&!e.playerShadow);
    g.abyssHazards = []; g.abyssShots = []; g.abyssCorpses = [];
    g.abyss = {level:g.level?.id,clock:0,gravity:1,darkness:false,maze:false,
      status:{hallucination:0,reverse:0},hallucinationTick:cfg().status.hallucinationTick,
      environmentClocks:{},emotionClock:0,awaitingVictory:false};
    if (g.player) { g.player.abyssReverse = 0; g.player.abyssHallucination = 0; }
    return g.abyss;
  }
  function state(g) { return !g.abyss || g.abyss.level !== g.level?.id ? reset(g) : g.abyss; }
  function warning(e, name, duration) {
    e.skillWarning = name ? {name,remaining:duration,total:duration} : null;
    e.tell = !!name;
  }
  function safeX(g, width = 50, awayFromPlayer = true) {
    const edge = cfg().arena.edge + width/2;
    for (let attempt=0; attempt<10; attempt++) {
      const x = edge+random(g)*(W-2*edge);
      if (awayFromPlayer && Math.abs(x-g.player.x) < cfg().arena.spawnSafety) continue;
      if ((g.abyssHazards || []).some(z => z.phase==='idle' && Math.abs(z.x-x)<(z.w+width)/2+25)) continue;
      return x;
    }
    return clamp(g.player.x < W/2 ? W-edge : edge,edge,W-edge);
  }
  function safeTeleport(g, target = null) {
    const edge=cfg().arena.edge+g.player.w/2;
    const candidates=[edge,W-edge,W*.25,W*.75,W*.5];
    const safe=x=>!(g.abyssHazards || []).some(z => ['active','falling'].includes(z.phase) && Math.abs(z.x-x)<z.w/2+g.player.w);
    const legal=candidates.filter(x => Math.abs(x-g.player.x)>=cfg().arena.teleportSafety && safe(x));
    const proposed=target===null?null:clamp(target,edge,W-edge);
    const x=proposed!==null&&safe(proposed)?proposed:(legal[Math.floor(random(g)*legal.length)] ?? clamp(g.player.x<W/2?W-edge:edge,edge,W-edge));
    return {x,y:gravityDirection(g)<0 ? ceilingY(g) : GROUND};
  }
  function init(g, e) {
    if (!owns(g,e)) return;
    state(g); e.baseW ||= e.w; e.baseH ||= e.h;
    e.abyssClock=0; e.abyssState='patrol'; e.abyssPhase=1; e.abyssTimer=0; e.abyssProgress=0;
    e.abyssHomeX=clamp(e.x,cfg().arena.edge+e.w/2,W-cfg().arena.edge-e.w/2);
    e.x=e.abyssHomeX; e.y=GROUND; e.abyssPatrolDir=e.dir || 1; e.abyssSkillIndex=0;
    e.abyssNext=cfg().regular.rest; e.frenzyTime=0; e.abyssGuarded=false;e.abyssCorpseQueued=false;
    if (kind(e)==='clayGuard') e.abyssState='statue';
    if (kind(e)==='parasite') {e.abyssNext=fixed().parasiteCastInterval;e.nextParasiteFrenzyAt=0;}
    if (kind(e)==='abyssCrow' || kind(e)==='tombSpirit') {
      e.airborne=true; e.y=cfg().arena.flightY; e.abyssState='air';
      e.abyssNext=kind(e)==='abyssCrow' ? fixed().crowInterval : cfg().regular.spiritCooldown;
    }
    if (kind(e)==='lanternSkeleton') e.abyssNext=fixed().lanternInterval;
    if (e.boss) {
      e.abyssState=kind(e)==='fossilRoc'?'air':'patrol';
      if (kind(e)==='minotaurLord') {
        e.abyssNext=cfg().minotaur.intervals[0];e.nextMinotaurRage=fixed().minotaurRageInterval;
        e.minotaurRage=false;e.minotaurRagePending=false;e.minotaurRageCount=0;
      }
      if (kind(e)==='flowerDemon') e.abyssNext=cfg().flower.intervals[0];
      if (kind(e)==='mirrorTurtle') {
        e.abyssNext=cfg().turtle.skillInterval; e.nextVanish=fixed().turtleVanishInterval;
        e.invisible=false; e.mirrorShield=false; e.revealTime=0;
      }
      if (kind(e)==='fossilRoc') {
        e.airborne=true; e.abyssForm='bird'; e.y=cfg().arena.flightY+e.h*.25;
        e.abyssNext=cfg().roc.skillInterval;
      }
      if (kind(e)==='thousandHands') {
        e.emotion=cfg().deity.initialEmotion; e.abyssEmotionIndex=cfg().deity.emotionOrder.indexOf(e.emotion);
        e.nextEmotion=fixed().emotionInterval; e.abyssNext=cfg().deity.skillInterval; e.mazeRefills=0;
        e.abyssEmotionStarted=false;
        if(e.phase==='active'){enterEmotion(g,e,e.emotion);e.abyssEmotionStarted=true;}
      }
    }
    return e;
  }
  function apply(g, spec) {
    if (g.screen!=='playing') return false;
    return g.applyCombatEffect?.({...spec,kind:spec.kind || 'abyss',exactDamage:spec.exactDamage}) ?? false;
  }
  function statusEffect(g, name, seconds) {
    const p=g.player;
    if (g.screen!=='playing' || p.rollTime>0 || p.invulnerable>0) return false;
    if (p.shieldTime>0 && p.shieldHits>0) { apply(g,{damage:0,kind:'abyss-debuff'}); return false; }
    const s=state(g); s.status[name]=Math.max(s.status[name] || 0,seconds);
    if(name==='hallucination') s.hallucinationTick=cfg().status.hallucinationTick;
    if(name==='reverse') g.clearInputs?.();
    g.floating?.(p.x,p.y-p.h-15,name==='reverse'?'ĐẢO ĐIỀU KHIỂN':'ẢO GIÁC','#d6a2ff');
    return true;
  }
  function updateStatus(g, dt) {
    if (!inAbyss(g) || g.screen!=='playing') return;
    const s=state(g), p=g.player;
    const oldReverse=s.status.reverse;
    s.status.reverse=Math.max(0,s.status.reverse-dt);
    if (oldReverse>EPS && s.status.reverse<=EPS) {s.status.reverse=0;g.clearInputs?.();}
    if (s.status.hallucination>EPS) {
      if (p.shieldTime>0 && p.shieldHits>0) {
        s.status.hallucination=0;g.floating?.(p.x,p.y-p.h-12,'ĐÃ GIẢI ẢO GIÁC','#a9e6cf');
      } else {
        const elapsed=Math.min(dt,s.status.hallucination);
        s.status.hallucination=Math.max(0,s.status.hallucination-elapsed); s.hallucinationTick-=elapsed;
        while(s.hallucinationTick<=EPS && g.screen==='playing') {
          s.hallucinationTick+=cfg().status.hallucinationTick;
          s.selfAttackTime=cfg().regular.active;
          apply(g,{damage:cfg().status.hallucinationDamage,forceHit:true,kind:'hallucination-self'});
        }
      }
    }
    if(s.status.hallucination<EPS)s.status.hallucination=0;
    s.selfAttackTime=Math.max(0,(s.selfAttackTime || 0)-dt);
    p.abyssReverse=s.status.reverse; p.abyssHallucination=s.status.hallucination;
  }
  function cleanse(g) {
    if(!inAbyss(g)||!g.abyss)return;
    const s=state(g),hadEffect=s.status.reverse>EPS || s.status.hallucination>EPS;
    s.status.reverse=s.status.hallucination=0;
    if(g.player)g.player.abyssReverse=g.player.abyssHallucination=0;
    if(hadEffect){g.clearInputs?.();g.floating?.(g.player.x,g.player.y-g.player.h-12,'KHIÊN · GIẢI HIỆU ỨNG','#b4e9dc');}
  }
  function gravityDirection(g) { return inAbyss(g) && g.abyss?.gravity<0 ? -1 : 1; }
  function ceilingY(g) { return (g.viewTop || 0)+(g.player?.h || 54)+cfg().arena.ceilingInset; }
  function inputDirection(g) { return inAbyss(g) && g.abyss?.status.reverse>EPS ? -1 : 1; }
  function invertAction(g, action) {
    if (inputDirection(g)>0) return action;
    return ({left:'right',right:'left',up:'down',down:'up',jump:'shield',shield:'jump',high:'ground',ground:'high'})[action] || action;
  }
  function addHazard(g, kindName, options={}) {
    state(g);
    if(g.abyssHazards.length>=cfg().limits.hazards) return null;
    const h={kind:kindName,x:safeX(g),y:GROUND,w:cfg().hazards.fallWidth,h:cfg().hazards.fallHeight,
      phase:'warning',timer:cfg().hazards.rockWarning,total:cfg().hazards.rockWarning,
      life:cfg().hazards.activeTime,damage:cfg().hazards.fallDamage,hitPlayer:false,...options};
    h.total=h.timer;g.abyssHazards.push(h);return h;
  }
  function shot(g, e, kindName, x, y, vx, vy, options={}) {
    if(g.abyssShots.length>=cfg().limits.shots)return null;
    const s={owner:e,kind:kindName,x,y,vx,vy,w:14,h:14,life:4,damage:1,traveled:0,range:Infinity,...options};
    g.abyssShots.push(s); return s;
  }
  function aimedShot(g,e,kindName,speed,options={}) {
    const x=e.x+e.dir*e.w*.4,y=e.y-e.h*.5;
    const a=Math.atan2(g.player.y-g.player.h*.5-y,g.player.x-x);
    return shot(g,e,kindName,x,y,Math.cos(a)*speed,Math.sin(a)*speed,options);
  }
  function stopOwned(g,e) {
    g.abyssHazards=(g.abyssHazards || []).filter(z=>z.owner!==e);
    g.abyssShots=(g.abyssShots || []).filter(z=>z.owner!==e);
  }
  function discard(g,e) {
    e.dead=true;e.health=0;stopOwned(g,e);g.enemies=g.enemies.filter(other=>other!==e);
  }
  function clearIllusions(g,owner) {
    for(const e of [...g.enemies])if(e.illusionOwner===owner || e.shadowOwner===owner || e.projectionOwner===owner)discard(g,e);
  }
  function summon(g,owner,type,count) {
    let room=Math.max(0,cfg().limits.summons-g.enemies.filter(e=>alive(e)&&e.abyssSummoner===owner).length);
    for(let i=0;i<Math.min(count,room);i++) {
      const e=g.spawn?.(type,g.player.x<W/2?1:-1);
      if(!e)continue;
      e.minion=true;e.abyssSummoner=owner;e.x=safeX(g,e.w,true);e.abyssHomeX=e.x;
      e.phase='warning';e.warning=cfg().regular.windup;
    }
    g.sound?.play('roar');
  }
  function illusion(g,owner,x) {
    const e={type:'flowerDemon',archetype:'flowerDemon',boss:false,minion:true,flowerIllusion:true,illusionOwner:owner,
      health:1,maxHealth:1,w:owner.w*.65,h:owner.h*.65,x,y:GROUND,dir:owner.dir || 1,
      phase:'active',age:0,hit:0,score:0,speed:0,abyssState:'illusion',abyssClock:0,
      illusionLife:cfg().flower.illusionLife,abyssNoKillCredit:true};
    g.enemies.push(e);return e;
  }
  function explodeIllusion(g,e) {
    const radius=cfg().status.cloneExplosionRadius;
    g.burst?.(e.x,e.y-e.h*.45,'#d270ef',20,'ring');
    if(Math.hypot(g.player.x-e.x,g.player.y-g.player.h*.5-(e.y-e.h*.5))<radius)
      apply(g,{damage:0,stun:cfg().status.cloneExplosionStun,kind:'flower-illusion'});
    discard(g,e);
  }
  function projection(g,owner,emotion,index) {
    const e={type:'thousandHands',archetype:'thousandHands',boss:false,minion:true,emotionProjection:true,projectionOwner:owner,
      emotion,health:1,maxHealth:1,petrifyImmune:true,w:cfg().deity.projectionW,h:cfg().deity.projectionH,
      x:cfg().deity.projectionX[index],y:GROUND,dir:1,phase:'active',age:0,hit:0,speed:0,score:0,
      abyssState:'projection',abyssPhase:2,abyssNoKillCredit:true};
    g.enemies.push(e); return e;
  }
  function enterMaze(g,e) {
    if(e.mazeRefills>=fixed().mazeRefills)return;
    stopOwned(g,e);clearIllusions(g,e);e.mazeRefills++;e.health=e.maxHealth;e.abyssPhase=2;
    e.abyssState='transition';e.abyssTimer=cfg().deity.transition;e.abyssGuarded=true;e.bulletUntargetable=true;
    e.nextEmotion=e.abyssClock+fixed().mazeEmotionInterval;e.nextProjectionSwap=e.abyssClock+cfg().deity.projectionSwapInterval;
    const s=state(g);s.maze=true;s.gravity=1;s.darkness=false;
    warning(e,'MÊ CUNG LUÂN HỒI · TÌM BẢN THỂ NỘ',cfg().deity.transition);
    for(let i=0;i<cfg().deity.emotionOrder.length;i++)projection(g,e,cfg().deity.emotionOrder[i],i);
    g.player.vy=0;g.player.grounded=false;g.sound?.play('roar');g.shake=8;
  }
  function becomeKnight(g,e) {
    stopOwned(g,e);e.abyssForm='knight';e.abyssPhase=2;e.abyssState='transition';e.abyssTimer=cfg().roc.transition;
    e.health=e.maxHealth=cfg().roc.knightHealth;e.w=cfg().roc.knightW;e.h=cfg().roc.knightH;e.speed=cfg().roc.knightSpeed;
    e.abyssStartY=e.y;e.abyssGuarded=true;e.intangible=true;e.airborne=false;
    e.abyssNext=e.abyssClock+cfg().roc.transition+cfg().roc.knightInterval;
    warning(e,'TRÙNG ĐIỆP · KỊ SĨ XƯƠNG ĐẦU CHIM',cfg().roc.transition);
    g.burst?.(e.x,e.y-e.h*.5,'#b976f3',25,'ring');g.sound?.play('roar');
    if(g.player)g.player.weaponMode='normal';
  }
  function hit(g,e,damage,attack={}) {
    if(!owns(g,e))return undefined;
    if(!alive(e) || e.abyssGuarded || e.intangible)return false;
    if(e.flowerIllusion){explodeIllusion(g,e);return false;}
    if(e.emotionProjection) {
      const owner=e.projectionOwner;
      if(!alive(owner)||owner.abyssGuarded||e.emotion!=='rage')return false;
      owner.health=Math.max(0,owner.health-damage);owner.hit=.12;
      if(owner.health<=0)g.killEnemy?.(owner);
      return true;
    }
    if(kind(e)==='thousandHands' && e.abyssPhase===2)return false;
    if(e.playerShadow) {
      if(e.shadowImmortal>0 || e.shadowRollTime>0)return false;
      if(e.shadowShieldTime>0 && e.shadowShieldHits>0) {e.shadowShieldHits--;g.burst?.(e.x,e.y-e.h*.5,'#d5a4dc',8,'ring');return false;}
      e.health=Math.max(0,e.health-damage);return true;
    }
    if(kind(e)==='mirrorTurtle') {
      const revealing=['bow','spear'].includes(attack.weaponId || attack.kind) || attack.area===true || attack.melee===true;
      if(e.invisible && revealing) {
        e.invisible=false;e.revealTime=cfg().status.reveal;e.invisibleTime=0;
        g.floating?.(e.x,e.y-e.h-15,'KHÚC XẠ BỊ PHÁ','#a8f4ff');
      }
      if(e.mirrorShield && !attack.melee && attack.reflected!==true && attack.reflection!==true) {
        const a=Math.atan2(g.player.y-g.player.h*.5-(e.y-e.h*.5),g.player.x-e.x);
        shot(g,e,'reflection',e.x,e.y-e.h*.5,Math.cos(a)*cfg().turtle.reflectionSpeed,Math.sin(a)*cfg().turtle.reflectionSpeed,
          {damage:damage*fixed().reflectionRatio,exactDamage:damage*fixed().reflectionRatio,
            reflected:true,sourceAttack:attack.kind || attack.weaponId || 'projectile',life:cfg().turtle.reflectionLife});
        g.burst?.(e.x,e.y-e.h*.5,'#c9f8ff',10,'ring');g.sound?.play('shield');
        return false;
      }
      e.health=Math.max(0,e.health-damage*fixed().turtleDamageRatio);return true;
    }
    e.health=Math.max(0,e.health-damage);
    if(kind(e)==='parasite' && e.health>0 && e.frenzyTime<=EPS && e.lastFrenzyAttack!==attack &&
      (e.abyssClock || 0)+EPS>=(e.nextParasiteFrenzyAt ?? 0)) {
      e.lastFrenzyAttack=attack;e.frenzyTime=fixed().parasiteFrenzy;e.abyssState='frenzy';
      e.nextParasiteFrenzyAt=(e.abyssClock || 0)+fixed().parasiteCastInterval;
      g.burst?.(e.x,e.y-e.h*.5,'#d76fff',8,'ring');
    }
    if(kind(e)==='clayGuard' && e.abyssState==='statue') {e.abyssState='awakening';e.abyssTimer=cfg().regular.guardWakeTime;}
    if(e.boss && kind(e)==='fossilRoc' && e.health<=0 && e.abyssForm!=='knight')becomeKnight(g,e);
    if(e.boss && kind(e)==='thousandHands' && e.abyssPhase===1 && e.health<=e.maxHealth*fixed().mazeThreshold)enterMaze(g,e);
    return true;
  }
  function onKill(g,e) {
    if(!owns(g,e))return;
    stopOwned(g,e);clearIllusions(g,e);e.skillWarning=null;e.tell=false;
    if(kind(e)==='minotaurLord'){e.minotaurRage=false;e.minotaurRagePending=false;}
    if(e.boss && kind(e)==='thousandHands') {
      const s=state(g);s.maze=false;s.darkness=false;s.gravity=1;s.status.hallucination=s.status.reverse=0;
      g.player.abyssHallucination=g.player.abyssReverse=0;g.player.vy=0;g.player.grounded=false;g.clearInputs?.();
    }
    if(e.boss) {
      for(const minion of [...g.enemies])if(minion.abyssSummoner===e)discard(g,minion);
      g.shake=Math.max(g.shake || 0,6);
      if((e.dead || e.health<=0) && !e.abyssCorpseQueued) {
        const s=state(g),type=kind(e),death=cfg().death;
        const duration=type==='minotaurLord'?death.minotaurDuration:type==='thousandHands'?death.deityDuration:death.duration;
        e.abyssCorpseQueued=true;
        g.abyssCorpses.push({type,archetype:type,x:e.x,y:e.y,w:e.w,h:e.h,dir:e.dir || 1,
          abyssForm:e.abyssForm,abyssPhase:e.abyssPhase,emotion:e.emotion,
          timer:duration,duration,progress:0,deathStyle:type==='minotaurLord'?'minotaur-fall':type==='thousandHands'?'deity-collapse':'crumble'});
        // The actor is already dead and counted normally. Only the result UI
        // waits for this non-combat animation; no last environmental hit can
        // turn the completed fight into a loss while its corpse is visible.
        const wasReversed=s.status.reverse>EPS;
        s.awaitingVictory=true;s.gravity=1;s.darkness=false;s.maze=false;
        s.status.hallucination=s.status.reverse=0;
        g.abyssHazards=[];g.abyssShots=[];
        if(g.player){g.player.abyssHallucination=g.player.abyssReverse=0;g.player.burnTime=0;}
        if(wasReversed)g.clearInputs?.();
      }
    }
  }
  function beforeKill(g,e) {
    if(!owns(g,e))return undefined;
    if(e.flowerIllusion || e.emotionProjection){discard(g,e);return false;}
    if(e.boss && kind(e)==='fossilRoc' && e.abyssForm!=='knight') {becomeKnight(g,e);return false;}
    if(e.boss && kind(e)==='thousandHands' && e.abyssPhase===1) {enterMaze(g,e);return false;}
    return true;
  }
  function begin(g,e,skill,seconds,name) {
    e.abyssState='tell';e.abyssSkill=skill;e.abyssTimer=seconds;e.abyssDuration=seconds;
    e.abyssTargetX=clamp(g.player.x,30,W-30);e.abyssTargetY=g.player.y;
    e.dir=Math.sign(g.player.x-e.x) || e.dir || 1;e.abyssAttackDir=e.dir;
    e.abyssProgress=0;warning(e,name,seconds);
  }
  function rest(e,seconds) {e.abyssState='rest';e.abyssTimer=seconds;e.abyssSkill=null;e.tell=false;e.skillWarning=null;e.abyssProgress=0;}
  function walk(g,e,dt,multiplier=1,stopDistance=0) {
    const d=g.player.x-e.x;
    const target=Math.abs(d)>stopDistance?(Math.sign(d)||1)*(e.speed||0)*multiplier:0;
    if(e.boss){
      const blend=1-Math.exp(-Math.max(0,dt)*7);
      e.abyssWalkVelocity=(e.abyssWalkVelocity||0)+(target-(e.abyssWalkVelocity||0))*blend;
      if(Math.abs(e.abyssWalkVelocity)>.15)e.dir=Math.sign(e.abyssWalkVelocity);
      e.x+=e.abyssWalkVelocity*dt;
      if(Math.abs(target)<.001&&Math.abs(e.abyssWalkVelocity)<.15)e.abyssWalkVelocity=0;
    }else if(target){e.dir=Math.sign(target);e.x+=target*dt;}
    e.x=clamp(e.x,cfg().arena.edge+e.w/2,W-cfg().arena.edge-e.w/2);
  }
  function attackArc(g,e,range,height,damage,extra={}) {
    const x=e.x+e.abyssAttackDir*(e.w/2+range/2);
    addHazard(g,'axe-arc',{owner:e,x,y:e.y,w:range,h:height,phase:'active',timer:cfg().regular.active,damage,...extra});
  }
  function falling(g,e,x,ice=false,up=false) {
    return addHazard(g,up?'reverse-spike':ice?'ice':'stalactite',{owner:e,x:clamp(x,35,W-35),
      y:up?GROUND:(g.viewTop || 0)+cfg().hazards.fallHeight,
      phase:'warning',timer:cfg().hazards.rockWarning,vy:up?-cfg().hazards.fallSpeed:cfg().hazards.fallSpeed,
      direction:up?-1:1,damage:cfg().hazards.fallDamage});
  }
  function castRegular(g,e) {
    const t=kind(e);
    if(t==='littleTurtle') {
      const range=fixed().turtleRangeSteps*cfg().arena.step;
      shot(g,e,'water',e.x+e.abyssAttackDir*e.w/2,e.y-e.h*.5,e.abyssAttackDir*cfg().regular.turtleWaterSpeed,0,
        {range,damage:e.damage || 1,knockup:cfg().regular.turtleKnockup});
      rest(e,cfg().regular.turtleCooldown);return;
    }
    if(t==='tombSpirit') {aimedShot(g,e,'spirit-bolt',cfg().regular.spiritSpeed);rest(e,cfg().regular.spiritCooldown);return;}
    attackArc(g,e,t==='ancientHand'?cfg().regular.handRange:cfg().regular.meleeRange,e.h,e.damage || 1,
      t==='ancientHand'?{stun:cfg().regular.handStun}:{});
    rest(e,t==='ancientHand'?cfg().regular.handRest:cfg().regular.rest);
  }
  function updateRegular(g,e,dt) {
    const t=kind(e),p=g.player;
    if(e.playerShadow){updateShadow(g,e,dt);return;}
    if(t==='parasite' && e.frenzyTime>EPS) {
      const elapsed=Math.min(dt,e.frenzyTime);e.frenzyTime=Math.max(0,e.frenzyTime-elapsed);
      e.health=Math.max(0,e.health-cfg().regular.parasiteSelfDamage*elapsed);
      e.x=clamp(e.x+Math.sin(e.abyssClock*35)*(e.speed || 1)*cfg().regular.parasiteSpeedMultiplier*dt,30,W-30);
      if(e.health<=EPS){e.health=0;g.killEnemy?.(e);return;}
      if(e.frenzyTime<=EPS){e.frenzyTime=0;rest(e,cfg().regular.rest);}
      return;
    }
    if(e.abyssState==='statue') {
      if(distance(p,e)<=cfg().regular.guardWakeRange){e.abyssState='awakening';e.abyssTimer=cfg().regular.guardWakeTime;warning(e,'LA TƯỢNG THỨC TỈNH',e.abyssTimer);}
      return;
    }
    if(e.abyssState==='awakening'){e.abyssTimer-=dt;if(e.abyssTimer<=EPS)rest(e,0);return;}
    if(t==='abyssCrow') {
      e.x+=e.abyssPatrolDir*e.speed*dt;
      if(e.x<e.w/2+30 || e.x>W-e.w/2-30){e.x=clamp(e.x,e.w/2+30,W-e.w/2-30);e.abyssPatrolDir*=-1;}
      e.dir=e.abyssPatrolDir;e.y=cfg().arena.flightY+Math.sin(e.abyssClock*cfg().arena.flightBob)*cfg().arena.flightAmplitude;
      if(e.abyssClock+EPS>=e.abyssNext) {
        const rock=falling(g,e,e.x);if(rock)rock.fallStartY=e.y;
        e.abyssNext+=fixed().crowInterval;e.abyssCasts=(e.abyssCasts || 0)+1;
        g.sound?.play('shot');
      }
      return;
    }
    if(t==='lanternSkeleton' && e.abyssClock+EPS>=e.abyssNext) {
      e.abyssNext+=fixed().lanternInterval;e.abyssCasts=(e.abyssCasts || 0)+1;
      if(random(g)<.5) {
        const destination=safeTeleport(g,e.x),oldX=p.x;
        p.x=destination.x;p.y=destination.y;p.vy=0;p.grounded=true;
        e.x=clamp(oldX,e.w/2+cfg().arena.edge,W-e.w/2-cfg().arena.edge);
        g.burst?.(p.x,p.y-p.h*.5,'#bc83e4',15,'ring');g.burst?.(e.x,e.y-e.h*.5,'#bc83e4',15,'ring');
      } else statusEffect(g,'reverse',cfg().status.reverse);
    }
    if(e.abyssState==='tell') {
      e.abyssTimer-=dt;e.abyssProgress=1-clamp(e.abyssTimer/e.abyssDuration,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.abyssTimer);
      if(e.abyssTimer<=EPS)castRegular(g,e);return;
    }
    if(e.abyssState==='rest') {e.abyssTimer-=dt;if(e.abyssTimer<=EPS)e.abyssState=t==='tombSpirit'?'air':'patrol';return;}
    if(t==='tombSpirit') {
      walk(g,e,dt,1,200);e.y=cfg().arena.flightY+Math.sin(e.abyssClock*cfg().arena.flightBob)*cfg().arena.flightAmplitude;
      if(e.abyssClock+EPS>=e.abyssNext) {begin(g,e,'energy',cfg().regular.windup,'LINH HỒN · ĐẠN CỔ');e.abyssNext=e.abyssClock+cfg().regular.spiritCooldown;}
      return;
    }
    e.y=GROUND;
    if(distance(p,e)>cfg().regular.detect) {
      e.x+=e.abyssPatrolDir*e.speed*.45*dt;
      if(Math.abs(e.x-e.abyssHomeX)>cfg().regular.patrolDistance || e.x<e.w/2+25 || e.x>W-e.w/2-25)e.abyssPatrolDir*=-1;
      e.x=clamp(e.x,e.w/2+25,W-e.w/2-25);e.dir=e.abyssPatrolDir;return;
    }
    const range=t==='littleTurtle'?fixed().turtleRangeSteps*cfg().arena.step:t==='ancientHand'?cfg().regular.handRange:cfg().regular.meleeRange;
    if(distance(p,e)<=range && Math.abs(p.y-e.y)<e.h+p.h*.3) {
      // Child parasites retain their close-range tell, but cannot attack on
      // arrival or repeat the old short rest/attack loop between ten-second casts.
      if(t==='parasite' && e.abyssClock+EPS<e.abyssNext)return;
      begin(g,e,'melee',t==='littleTurtle'?cfg().regular.turtleWindup:t==='ancientHand'?cfg().regular.handWindup:cfg().regular.windup,
        t==='littleTurtle'?'TIỂU QUY · PHUN NƯỚC':t==='ancientHand'?'BÀN TAY · ĐẬP ĐẤT':'CẬN CHIẾN · NÉ ĐÒN');
      if(t==='parasite')e.abyssNext=e.abyssClock+fixed().parasiteCastInterval;
    } else walk(g,e,dt);
  }

  function phaseByHealth(e, thresholds) {return e.health/e.maxHealth>thresholds[0]?1:e.health/e.maxHealth>thresholds[1]?2:3;}
  function castMinotaur(g,e) {
    const c=cfg().minotaur;
    if(e.abyssSkill==='axe')attackArc(g,e,c.axeRange,c.axeHeight,c.axeDamage);
    else if(e.abyssSkill==='charge' || e.abyssSkill==='rage-charge') {
      e.abyssState='charge';e.abyssTimer=e.minotaurRage?c.rageDuration:c.chargeDuration;e.abyssHitCharge=false;e.tell=false;e.skillWarning=null;return;
    } else if(e.abyssSkill==='stomp') {
      const gap=(W-100)/c.stompCount;
      for(let i=0;i<c.stompCount;i++)falling(g,e,50+gap*(i+.5));
      g.shake=6;
    } else summon(g,e,'minotaurCalf',c.summonCount);
    rest(e,c.rest);
  }
  function castFlower(g,e) {
    const c=cfg().flower;
    if(e.abyssSkill==='pollen') {
      for(let i=0;i<c.pollenCount;i++)addHazard(g,'pollen',{owner:e,x:clamp(e.abyssTargetX+(i-(c.pollenCount-1)/2)*150,60,W-60),
        w:cfg().hazards.pollenWidth,h:cfg().hazards.pollenHeight,phase:'active',timer:cfg().hazards.pollenLife,damage:0});
    } else if(e.abyssSkill==='illusions') {
      for(const clone of [...g.enemies])if(clone.illusionOwner===e)discard(g,clone);
      const slots=c.illusionSlots,closest=slots.reduce((a,b)=>Math.abs(a-e.x)<Math.abs(b-e.x)?a:b);
      e.x=closest;
      const positions=slots.filter(x=>x!==closest);
      for(let i=0;i<fixed().flowerIllusions;i++)illusion(g,e,positions[i] ?? safeX(g,100));
    } else if(e.abyssSkill==='roots') {
      const variant=e.abyssBoneAttack || 'roots';
      if(variant==='stomp')addHazard(g,'root',{owner:e,x:e.x,w:c.rootRange,h:c.stompHeight,phase:'active',timer:cfg().regular.active,damage:c.rootDamage,boneVariant:variant});
      else attackArc(g,e,variant==='flower'?c.flowerBiteWidth:c.rootRange,variant==='sweep'?c.sweepHeight:e.h,c.rootDamage,{kind:'root',boneVariant:variant});
    } else summon(g,e,'parasite',c.summonCount);
    rest(e,c.rest);
  }
  function castTurtle(g,e) {
    const c=cfg().turtle;
    if(e.abyssSkill==='mirror') {
      e.mirrorShield=true;e.mirrorTime=c.mirrorDuration;e.abyssState='mirror';e.abyssTimer=c.mirrorDuration;
      warning(e,'GƯƠNG PHẢN CHIẾU · DÙNG CẬN CHIẾN',c.mirrorDuration);return;
    }
    if(e.abyssSkill==='water') {
      const columns=fixed().waterColumns,gap=(W-120)/(columns-1);
      for(let i=0;i<columns;i++)addHazard(g,'water-column',{owner:e,x:60+i*gap,y:GROUND,w:c.waterWidth,h:c.waterHeight,
        phase:'warning',timer:c.waterWarning,damage:c.waterDamage,knockup:c.waterKnockup,knockdown:true});
    } else attackArc(g,e,c.swipeRange,e.h,c.swipeDamage);
    rest(e,cfg().flower.rest);
  }
  function castRoc(g,e) {
    const c=cfg().roc;
    if(e.abyssSkill==='sonic') {
      for(let i=0;i<c.sonicCount;i++)shot(g,e,'sonic',e.x,g.player.y,Math.sign(g.player.x-e.x)*c.sonicSpeed,0,
        {w:42,h:100,damage:0,reverse:cfg().status.reverse,delay:i*c.sonicStagger});
      g.sound?.play('roar');
    } else if(e.abyssSkill==='rift') {
      const destination=safeTeleport(g);g.player.x=destination.x;g.player.y=destination.y;g.player.vy=0;g.player.grounded=true;
      g.burst?.(destination.x,destination.y-g.player.h*.5,'#c690fa',20,'ring');
      addHazard(g,'rift-strike',{owner:e,x:destination.x,y:GROUND,w:c.strikeWidth,h:c.strikeHeight,
        phase:'warning',timer:c.strikeWarning,damage:c.strikeDamage});
    } else if(e.abyssSkill==='dash') {
      e.abyssState='charge';e.abyssTimer=c.dashTime;e.abyssHitCharge=false;e.tell=false;e.skillWarning=null;return;
    } else if(e.abyssSkill==='teleport') {
      const x=clamp(g.player.x+(g.player.x<W/2?1:-1)*cfg().arena.teleportSafety,e.w/2+25,W-e.w/2-25);
      g.burst?.(e.x,e.y-e.h*.5,'#b971ef',12,'ring');e.x=x;e.abyssAttackDir=Math.sign(g.player.x-e.x);
      addHazard(g,'scythe-arc',{owner:e,x:clamp(e.x+e.abyssAttackDir*c.scytheRange/2,40,W-40),w:c.scytheRange,h:e.h,
        phase:'warning',timer:cfg().status.teleportTell,damage:c.scytheDamage});
    } else if(e.abyssSkill==='combo') {
      e.abyssState='combo';e.comboRemaining=c.comboCount;e.comboTimer=0;e.tell=false;e.skillWarning=null;return;
    } else if(e.abyssSkill==='wave') {
      shot(g,e,'scythe-wave',e.x,e.y-e.h*.45,e.abyssAttackDir*c.waveSpeed,0,{w:28,h:90,damage:c.waveDamage});
    } else attackArc(g,e,c.scytheRange,e.h,c.scytheDamage,{kind:'scythe-arc'});
    rest(e,c.knightRest);
  }
  function enterEmotion(g,e,emotion) {
    const s=state(g);s.gravity=emotion==='joy'?-1:1;s.darkness=emotion==='hate';
    if(e.emotion!==emotion){
      e.emotionFrom=e.emotion||e.abyssEmotion||'joy';
      e.emotion=emotion;
      e.emotionChangedAt=e.abyssClock||0;
      e.emotionTurnDuration=1.4;
    }
    e.abyssNext=e.abyssClock+cfg().deity.skillInterval;
    g.player.vy=0;g.player.grounded=false;
    if(emotion!=='love')for(const shadow of [...g.enemies])if(shadow.shadowOwner===e)discard(g,shadow);
    if(emotion==='love')spawnShadow(g,e);
    g.sound?.play('roar');
  }
  function castDeity(g,e) {
    const c=cfg().deity;
    if(e.emotion==='joy') {
      for(let i=0;i<c.reverseSpikeCount;i++) {
        const z=falling(g,e,clamp(e.abyssTargetX+(i-(c.reverseSpikeCount-1)/2)*160,40,W-40),false,true);
        if(z){z.w=c.reverseSpikeWidth;z.h=c.reverseSpikeHeight;z.damage=c.reverseSpikeDamage;}
      }
    } else if(e.emotion==='rage') {
      const variant=e.abyssSkillIndex%3;
      addHazard(g,variant===1?'shockwave':'hand',{owner:e,x:e.abyssTargetX,y:GROUND,
        w:variant===1?c.shockwaveWidth:c.handWidth,h:variant===1?65:c.handHeight,
        phase:'warning',timer:c.warning,damage:variant===1?c.shockwaveDamage:c.handDamage});
    } else if(e.emotion==='love') {
      if(!g.enemies.some(other=>alive(other)&&other.shadowOwner===e))spawnShadow(g,e);
      addHazard(g,'hand',{owner:e,x:e.abyssTargetX,y:GROUND,w:c.handWidth,h:c.handHeight,phase:'warning',timer:c.warning,damage:c.handDamage});
    } else {
      const side=e.abyssSkillIndex%2?-1:1;
      e.x=clamp(g.player.x+side*cfg().arena.teleportSafety,e.w/2+25,W-e.w/2-25);
      addHazard(g,'hand',{owner:e,x:e.abyssTargetX,y:GROUND,w:c.handWidth,h:c.handHeight,
        phase:'warning',timer:c.warning,damage:c.handDamage,darkSignal:true});
      g.sound?.play('shot');
    }
    rest(e,cfg().flower.rest);
  }
  function updateBoss(g,e,dt) {
    const t=kind(e),c=cfg();
    if(t==='thousandHands' && !e.abyssEmotionStarted){enterEmotion(g,e,e.emotion);e.abyssEmotionStarted=true;}
    if(t==='minotaurLord') {
      e.abyssPhase=phaseByHealth(e,c.minotaur.thresholds);
      if(e.abyssClock+EPS>=e.nextMinotaurRage) {
        e.minotaurRagePending=true;
        // A busy attack owns its damage/recovery window. Remember one charge
        // for the next safe phase rather than interrupting it or stacking casts.
        do {e.nextMinotaurRage+=fixed().minotaurRageInterval;}while(e.abyssClock+EPS>=e.nextMinotaurRage);
      }
    }
    if(t==='flowerDemon')e.abyssPhase=phaseByHealth(e,c.flower.thresholds);
    if(t==='mirrorTurtle') {
      e.revealTime=Math.max(0,e.revealTime-dt);
      if(e.invisible) {e.invisibleTime=Math.max(0,e.invisibleTime-dt);if(e.invisibleTime<=EPS)e.invisible=false;}
      if(e.abyssClock+EPS>=e.nextVanish) {
        e.nextVanish+=fixed().turtleVanishInterval;e.invisible=true;e.invisibleTime=c.turtle.invisibleDuration;
        e.abyssVanishCount=(e.abyssVanishCount || 0)+1;
        // Invisibility is visual only: all physical hitboxes stay targetable.
      }
    }
    if(t==='thousandHands' && e.abyssState!=='transition') {
      if(e.abyssClock+EPS>=e.nextEmotion) {
        e.nextEmotion+=e.abyssPhase===2?fixed().mazeEmotionInterval:fixed().emotionInterval;
        e.abyssEmotionIndex=(e.abyssEmotionIndex+1)%c.deity.emotionOrder.length;
        stopOwned(g,e);rest(e,0);enterEmotion(g,e,c.deity.emotionOrder[e.abyssEmotionIndex]);
      }
      if(e.abyssPhase===2 && e.abyssClock+EPS>=e.nextProjectionSwap) {
        e.nextProjectionSwap+=c.deity.projectionSwapInterval;
        const projections=g.enemies.filter(other=>alive(other)&&other.projectionOwner===e);
        const positions=projections.map(other=>other.x);
        for(let i=0;i<projections.length;i++)projections[i].x=positions[(i+1)%positions.length];
        g.burst?.(e.x,e.y-e.h*.5,'#d6b6e8',12,'ring');
      }
    }
    if(e.abyssState==='transition') {
      e.abyssTimer-=dt;e.abyssProgress=1-clamp(e.abyssTimer/(t==='fossilRoc'?c.roc.transition:c.deity.transition),0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.abyssTimer);
      if(t==='fossilRoc')e.y=e.abyssStartY+(GROUND-e.abyssStartY)*e.abyssProgress;
      if(e.abyssTimer<=EPS) {
        e.abyssGuarded=false;e.intangible=false;rest(e,0);
        if(t==='fossilRoc') {e.y=GROUND;e.abyssState='knight';}
        if(t==='thousandHands')enterEmotion(g,e,e.emotion);
      }
      return;
    }
    if(e.abyssState==='charge') {
      const speed=t==='minotaurLord'?(e.minotaurRage?c.minotaur.rageSpeed:c.minotaur.chargeSpeed):c.roc.dashSpeed;
      e.x+=e.abyssAttackDir*speed*dt;e.abyssTimer-=dt;
      if(!e.abyssHitCharge && hitPlayer(g,e)) {
        e.abyssHitCharge=true;apply(g,{damage:t==='minotaurLord'?c.minotaur.chargeDamage:c.roc.scytheDamage,kind:'abyss-charge'});
      }
      const edge=c.arena.edge+e.w/2;
      if(e.x<=edge || e.x>=W-edge) {
        e.x=clamp(e.x,edge,W-edge);e.abyssState='stunned';e.abyssTimer=t==='minotaurLord'?c.minotaur.wallStun:c.roc.knightRest;
        warning(e,t==='minotaurLord'?'VA VÁCH · MINOTAUR CHOÁNG':'DỪNG ĐÀ LAO',e.abyssTimer);g.shake=5;
      } else if(e.abyssTimer<=EPS)rest(e,t==='minotaurLord'?c.minotaur.rest:c.roc.knightRest);
      return;
    }
    if(e.abyssState==='combo') {
      e.comboTimer-=dt;
      if(e.comboTimer<=EPS && e.comboRemaining>0) {
        e.comboRemaining--;e.comboTimer=c.roc.comboGap;e.abyssAttackDir=Math.sign(g.player.x-e.x) || e.dir;
        attackArc(g,e,c.roc.scytheRange,e.h,c.roc.scytheDamage,{kind:'scythe-arc'});
      }
      if(e.comboRemaining<=0 && e.comboTimer<=EPS)rest(e,c.roc.knightRest);
      return;
    }
    if(e.abyssState==='mirror') {
      e.abyssTimer-=dt;e.mirrorTime=Math.max(0,e.abyssTimer);
      if(e.skillWarning)e.skillWarning.remaining=e.mirrorTime;
      if(e.abyssTimer<=EPS){e.mirrorShield=false;rest(e,c.flower.rest);}return;
    }
    if(e.abyssState==='tell') {
      e.abyssTimer-=dt;e.abyssProgress=1-clamp(e.abyssTimer/e.abyssDuration,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.abyssTimer);
      if(e.abyssTimer<=EPS) {
        e.abyssCasts=(e.abyssCasts || 0)+1;
        if(t==='minotaurLord')castMinotaur(g,e);
        else if(t==='flowerDemon')castFlower(g,e);
        else if(t==='mirrorTurtle')castTurtle(g,e);
        else if(t==='fossilRoc')castRoc(g,e);
        else castDeity(g,e);
      }
      return;
    }
    if(e.abyssState==='rest' || e.abyssState==='stunned') {
      e.abyssTimer-=dt;
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.abyssTimer);
      if(e.abyssTimer<=EPS){e.abyssState=e.abyssForm==='knight'?'knight':e.airborne?'air':'patrol';warning(e,null,0);if(t==='minotaurLord')e.minotaurRage=false;}return;
    }
    if(t==='minotaurLord' && e.minotaurRagePending) {
      e.minotaurRagePending=false;e.minotaurRage=true;e.minotaurRageCount++;
      e.minotaurRageStartedAt=e.abyssClock;
      begin(g,e,'rage-charge',c.minotaur.rageWindup,'CUỒNG NỘ · NÉ CÚ HÚC');
      g.sound?.play('roar');return;
    }
    if(e.airborne) {
      e.y=c.arena.flightY+e.h*.25+Math.sin(e.abyssClock*c.arena.flightBob)*c.arena.flightAmplitude;
      walk(g,e,dt,.5,180);
    } else if(t==='thousandHands') {e.y=GROUND;walk(g,e,dt,.42,150+Math.sin(e.abyssClock*.75)*22);}
    else {e.y=GROUND;walk(g,e,dt,1,t==='mirrorTurtle'?135:110);}
    if(e.abyssClock+EPS<e.abyssNext)return;
    e.abyssSkillIndex++;
    if(t==='minotaurLord') {
      const choices=['axe','charge','stomp','summon'],skill=choices[(e.abyssSkillIndex-1)%choices.length];
      begin(g,e,skill,skill==='charge'?c.minotaur.chargeWarning:c.minotaur.windup,
        {axe:'RÌU CUỒNG NỘ',charge:'NGƯU MA XUNG KÍCH',stomp:'CHẤN ĐỘNG HANG ĐỘNG',summon:'TIẾNG GẦM THỐNG TRỊ'}[skill]);
      e.abyssNext=e.abyssClock+c.minotaur.intervals[e.abyssPhase-1];
    } else if(t==='flowerDemon') {
      const choices=['pollen','illusions','roots','summon'],skill=choices[(e.abyssSkillIndex-1)%choices.length];
      if(skill==='roots'){e.abyssBoneAttack=c.flower.boneVariants[(e.abyssBoneIndex || 0)%c.flower.boneVariants.length];e.abyssBoneIndex=(e.abyssBoneIndex || 0)+1;}
      begin(g,e,skill,c.flower.windup,{pollen:'BÀO TỬ MÊ MUỘI',illusions:'PHẢN CHIẾU TÂM LINH',roots:'CỐT HÀI CỬ ĐỘNG',summon:'TRIỆU HỒI Ổ KÝ SINH'}[skill]);
      e.abyssNext=e.abyssClock+c.flower.intervals[e.abyssPhase-1];
    } else if(t==='mirrorTurtle') {
      const choices=['mirror','water','swipe'],skill=choices[(e.abyssSkillIndex-1)%choices.length];
      begin(g,e,skill,skill==='mirror'?c.turtle.mirrorWindup:c.turtle.waterWarning,
        {mirror:'GƯƠNG PHẢN CHIẾU',water:'THỦY ĐỘN · NĂM CỘT SÓNG',swipe:'QUÉT MAI THẠCH ANH'}[skill]);
      e.abyssNext=e.abyssClock+c.turtle.skillInterval;
    } else if(t==='fossilRoc') {
      const choices=e.abyssForm==='knight'?['scythe','dash','teleport','combo','wave']:['sonic','rift'];
      const skill=choices[(e.abyssSkillIndex-1)%choices.length];
      begin(g,e,skill,c.roc.sonicWarning,{sonic:'TIẾNG HÉT VỌNG ÂM',rift:'ẢO ẢNH KHÔNG GIAN',scythe:'CỔ ĐIỂU · LƯỠI HÁI',dash:'KỊ SĨ · LAO NHANH',teleport:'LỖ HỔNG KHÔNG GIAN',combo:'LIÊN HOÀN LƯỠI HÁI',wave:'ĐƯỜNG CHÉM NĂNG LƯỢNG'}[skill]);
      e.abyssNext=e.abyssClock+(e.abyssForm==='knight'?c.roc.knightInterval:c.roc.skillInterval);
    } else {
      begin(g,e,e.emotion,c.deity.warning,{joy:'HỈ · TRỌNG LỰC ĐẢO CHIỀU',rage:'NỘ · THIÊN THỦ CHẤN ĐỘNG',love:'ÁI · PHẢN CHIẾU BẢN NGÃ',hate:'Ố · TUYỆT DIỆT ÁNH SÁNG'}[e.emotion]);
      e.abyssNext=e.abyssClock+c.deity.skillInterval;
    }
  }

  function spawnShadow(g,owner) {
    if(g.enemies.filter(e=>alive(e)&&e.shadowOwner===owner).length>=cfg().limits.shadows)return null;
    const p=g.player,profile=MM.WeaponManager?.profile?.(g,p.dir || 1) || {kind:'normal',equipped:'gun',damage:1,cost:1,cooldown:p.shotCooldown || cfg().deity.shadowCooldown,speed:cfg().deity.shadowBulletSpeed};
    const unlocks=[...(g.progression?.rewards || g.save?.progression?.rewards || [])];
    const copyProfile=q=>({kind:q.kind,equipped:q.equipped,damage:q.damage,cost:q.cost,cooldown:q.cooldown,speed:q.speed,
      range:q.range,count:q.count,spread:q.spread?[...q.spread]:null,melee:!!q.melee});
    const weapons=MM.WeaponManager?.available?.(g) || [profile.equipped || 'gun'],profiles={};
    for(const id of weapons) {
      // Read the existing weapon rules through a disposable context. The real
      // equipment/save never changes while copying the available inventory.
      const context=Object.create(g);context.progression={...g.progression,rewards:[...unlocks],equipped:id};
      context.save={...(g.save || {}),progression:context.progression};context.player={...p};
      if(id==='spear')context.enemies=[{phase:'active',health:1,x:p.x+(p.dir || 1)*cfg().arena.step*5,
        y:p.y,w:p.w,h:p.h}];
      const weaponProfile=MM.WeaponManager?.profile?.(context,p.dir || 1) || profile;
      profiles[id]=copyProfile(weaponProfile);
    }
    const snapshot={weapon:profile.equipped || 'gun',initialWeapon:profile.equipped || 'gun',weapons:[...weapons],profiles,
      health:p.health,maxHealth:p.maxHealth,ammo:p.ammo,maxAmmo:p.maxAmmo,shieldCount:g.shieldCount || 0,
      unlocks,profile:copyProfile(profile)};
    const e={type:'playerShadow',archetype:'playerShadow',boss:false,minion:true,playerShadow:true,shadowOwner:owner,shadowSnapshot:snapshot,
      health:p.health,maxHealth:p.maxHealth,ammo:p.ammo,w:p.w,h:p.h,x:safeX(g,p.w),y:GROUND,dir:Math.sign(p.x-owner.x) || 1,
      speed:cfg().deity.shadowSpeed,phase:'warning',warning:cfg().regular.windup,age:0,hit:0,score:0,
      abyssState:'patrol',abyssClock:0,shadowLife:cfg().status.shadowLife,shadowShotTimer:profile.cooldown || cfg().deity.shadowCooldown,
      shadowDarkTimer:cfg().deity.shadowDarkInterval,shadowDarkReady:!!g.skillState?.darkReady,
      shadowPetrifyTimer:MM.SkillManager?.config?.petrifyInterval || 8,shadowJumpTimer:cfg().deity.shadowHighJumpCooldown,
      shadowShieldTimer:cfg().deity.shadowShieldCooldown,shadowShields:snapshot.shieldCount,
      shadowShieldTime:p.shieldTime || 0,shadowShieldHits:p.shieldHits || 0,
      shadowImmortal:p.immortalTime || 0,shadowRollTime:0,shadowRollCooldown:0,shadowRollHit:false,vy:0};
    g.enemies.push(e);return e;
  }
  function shadowDamage(e,base) {
    if(e.shadowDarkReady){e.shadowDarkReady=false;return base*2;}
    return base;
  }
  function shadowAttack(g,e) {
    const c=cfg().deity,s=e.shadowSnapshot,weapon=s.weapon,profile=s.profiles[weapon] || s.profile;
    const gap=distance(e,g.player),melee=weapon==='spear'?gap<=cfg().arena.step:profile.melee;
    if(melee && gap>(profile.range || c.shadowMeleeRange))return;
    const cost=melee?0:profile.cost ?? 1;
    if(e.ammo<cost) {
      const fallback=s.weapons.find(id=>s.profiles[id]?.melee || id==='spear');
      if(fallback && fallback!==s.weapon){s.weapon=fallback;s.profile=s.profiles[fallback];e.shadowShotTimer=0;}
      return;
    }
    e.ammo-=cost;e.shadowShotTimer=profile.cooldown || c.shadowCooldown;
    e.abyssAttackDir=e.dir;e.abyssState='attack';e.abyssAttackTime=cfg().regular.active;
    if(melee) {
      if(Math.abs(g.player.y-e.y)<e.h+g.player.h*.3) {
        const damage=shadowDamage(e,weapon==='spear'?2:profile.damage || 1);
        apply(g,{damage,exactDamage:damage,kind:'shadow-melee'});
      }
      return;
    }
    const count=profile.count || 1,spread=profile.spread || [0],baseAngle=Math.atan2(g.player.y-g.player.h*.5-(e.y-e.h*.5),g.player.x-e.x);
    for(let i=0;i<count;i++) {
      const a=baseAngle+(spread[i] || 0)*Math.PI/180,damage=shadowDamage(e,profile.damage || 1);
      shot(g,e,'shadow-shot',e.x+e.dir*e.w*.5,e.y-e.h*.5,Math.cos(a)*(profile.speed || c.shadowBulletSpeed),Math.sin(a)*(profile.speed || c.shadowBulletSpeed),
        {damage,exactDamage:damage,range:profile.range || Infinity,weapon,shadow:true});
    }
  }
  function updateShadow(g,e,dt) {
    const c=cfg().deity,s=e.shadowSnapshot;
    e.shadowLife-=dt;
    if(!alive(e.shadowOwner)||e.shadowOwner.emotion!=='love'||e.shadowLife<=EPS){discard(g,e);return;}
    for(const key of ['shadowShotTimer','shadowShieldTimer','shadowShieldTime','shadowImmortal','shadowPetrifyTimer','shadowJumpTimer','shadowRollCooldown'])e[key]=Math.max(0,e[key]-dt);
    e.abyssAttackTime=Math.max(0,(e.abyssAttackTime || 0)-dt);
    if(e.abyssAttackTime<=EPS)e.abyssState='patrol';
    if(s.unlocks.includes(40)) {e.shadowDarkTimer-=dt;if(e.shadowDarkTimer<=EPS){e.shadowDarkReady=true;e.shadowDarkTimer+=c.shadowDarkInterval;}}
    if(s.unlocks.includes(20)&&e.shadowShields>=3&&e.health<e.maxHealth && e.shadowImmortal<=EPS) {
      e.shadowShields-=2;e.shadowImmortal=MM.SkillManager?.config?.immortalDuration || 12;
    } else if(e.shadowShieldTimer<=EPS && e.shadowShields>0) {
      e.shadowShields--;e.shadowShieldTime=c.shadowShieldDuration;e.shadowShieldHits=c.shadowShieldHits;e.shadowShieldTimer=c.shadowShieldCooldown;
    }
    if(s.unlocks.includes(100) && e.shadowPetrifyTimer<=EPS) {
      e.shadowPetrifyTimer=MM.SkillManager?.config?.petrifyInterval || 8;
      // A visible purple tell precedes the copied single-target control skill.
      addHazard(g,'shadow-petrify',{owner:e,x:g.player.x,y:g.player.y,w:70,h:g.player.h,
        phase:'warning',timer:cfg().regular.windup,damage:0,stun:MM.SkillManager?.config?.petrifyDuration || 2});
    }
    if(s.unlocks.includes(30)&&e.shadowJumpTimer<=EPS && g.player.y<GROUND-g.player.h && e.y>=GROUND-EPS) {
      e.vy=c.shadowHighJumpVelocity;e.shadowJumpTimer=c.shadowHighJumpCooldown;
    }
    e.dir=Math.sign(g.player.x-e.x) || e.dir;
    if(s.weapon==='axes' && s.unlocks.includes(100) && e.shadowRollCooldown<=EPS && distance(e,g.player)<c.shadowMeleeRange*2) {
      e.shadowRollTime=c.shadowRollDuration;e.shadowRollCooldown=c.shadowRollCooldown;e.shadowRollHit=false;e.shadowRollDir=e.dir;
    }
    if(e.shadowRollTime>EPS) {
      e.shadowRollTime=Math.max(0,e.shadowRollTime-dt);e.x+=e.shadowRollDir*c.shadowRollSpeed*dt;
      if(!e.shadowRollHit && hitPlayer(g,e)) {e.shadowRollHit=true;apply(g,{damage:c.shadowRollDamage,kind:'shadow-axes-roll'});}
    } else {
      const targetGap=s.profile.melee || s.weapon==='spear'&&e.ammo<(s.profile.cost || 1)?c.shadowMeleeRange*.4:170;
      walk(g,e,dt,1,targetGap);
      if(e.shadowShotTimer<=EPS)shadowAttack(g,e);
    }
    e.x=clamp(e.x,e.w/2+24,W-e.w/2-24);e.vy+=c.shadowGravity*dt;e.y+=e.vy*dt;
    if(e.y>=GROUND){e.y=GROUND;e.vy=0;}
  }
  function updateEnemy(g,e,dt) {
    if(!owns(g,e))return false;
    if(!alive(e)||g.screen!=='playing'||frozen(e)||g.abyss?.awaitingVictory)return true;
    if(e.flowerIllusion) {
      e.illusionLife-=dt;e.abyssClock+=dt;
      if(!alive(e.illusionOwner)||e.illusionLife<=EPS)discard(g,e);return true;
    }
    if(e.emotionProjection) {
      e.abyssClock+=dt;
      if(!alive(e.projectionOwner))discard(g,e);
      else e.y=GROUND-Math.max(0,Math.sin(e.abyssClock*cfg().deity.projectionBob)*cfg().deity.projectionFloat);
      return true;
    }
    if(!Number.isFinite(e.abyssClock))init(g,e);
    e.age=(e.age || 0)+dt;e.hit=Math.max(0,(e.hit || 0)-dt);
    if(e.phase==='warning') {e.warning-=dt;if(e.warning<=EPS){e.phase='active';e.warning=0;}return true;}
    if(e.phase!=='active')return true;
    e.abyssClock+=dt;e.combatTime=(e.combatTime || 0)+dt;
    if(e.boss)updateBoss(g,e,dt);else updateRegular(g,e,dt);
    return true;
  }
  function hazardTypes(g) {
    if(Array.isArray(g.level.hazardTypes))return g.level.hazardTypes;
    const id=g.level.id;
    if(id<=110)return [...(id>=104?['mushroom']:[]),...(id>=106?['stalactite']:[])];
    if(id<=120)return ['mushroom','stalactite',...(id>=116?['spore']:[])];
    if(id<=130)return [...(id>=124?['crystalSpirit']:[]),...(id>=126?['icicle']:[])];
    if(id<=140)return id>=134?['rollingStone']:[];
    return id>=143?['tombPulse']:[];
  }
  function environment(g,dt) {
    const s=state(g),h=cfg().hazards;
    for(const type of hazardTypes(g)) {
      const interval=({mushroom:h.mushroomInterval,stalactite:h.rockInterval,spore:h.mushroomInterval,crystalSpirit:h.spiritInterval,
        icicle:h.iceInterval,rollingStone:fixed().rollingRockInterval,tombPulse:h.tombInterval})[type];
      if(!interval)continue;
      s.environmentClocks[type]=(s.environmentClocks[type] || 0)+dt;
      if(s.environmentClocks[type]+EPS<interval)continue;
      s.environmentClocks[type]-=interval;
      if(type==='mushroom'||type==='crystalSpirit') {
        const spirit=type==='crystalSpirit';
        addHazard(g,spirit?'spirit':'mushroom',{x:safeX(g),w:spirit?h.spiritRadius:h.mushroomRadius,h:32,
          phase:'idle',timer:spirit?h.spiritLife:h.mushroomLife,life:spirit?h.spiritLife:h.mushroomLife,damage:h.blastDamage});
      } else if(type==='stalactite'||type==='icicle')falling(g,null,clamp(g.player.x,40,W-40),type==='icicle');
      else if(type==='spore')addHazard(g,'pollen',{x:safeX(g),w:h.pollenWidth,h:h.pollenHeight,phase:'active',timer:h.pollenLife,damage:0});
      else if(type==='rollingStone') {
        const side=random(g)<.5?-1:1;
        addHazard(g,'rolling-rock',{x:side<0?-h.rollingSize:W+h.rollingSize,w:h.rollingSize,h:h.rollingSize,
          phase:'warning',timer:h.rollingWarning,vx:-side*h.rollingSpeed,damage:h.rollingDamage,side});g.sound?.play('roar');
      } else addHazard(g,'clay-crack',{x:safeX(g,h.tombWidth),w:h.tombWidth,h:65,phase:'warning',timer:h.tombWarning,damage:h.tombDamage});
    }
  }
  function triggerHazard(z) {
    if(z.phase!=='idle')return false;
    z.phase='warning';z.timer=z.kind==='spirit'?cfg().hazards.spiritWarning:cfg().hazards.mushroomWarning;z.total=z.timer;return true;
  }
  function hitHazards(g,bullet,previousX=bullet.x,previousY=bullet.y) {
    if(!inAbyss(g))return false;
    for(const z of g.abyssHazards || []) {
      if(z.phase!=='idle'||!['mushroom','spirit'].includes(z.kind))continue;
      const minX=Math.min(previousX,bullet.x),maxX=Math.max(previousX,bullet.x),minY=Math.min(previousY,bullet.y),maxY=Math.max(previousY,bullet.y);
      if(maxX>=z.x-z.w/2 && minX<=z.x+z.w/2 && maxY>=z.y-z.h && minY<=z.y)return triggerHazard(z);
    }
    return false;
  }
  function meleeHazards(g,attack) {
    if(!inAbyss(g))return;
    const p=g.player;
    for(const z of g.abyssHazards || [])if(z.phase==='idle' && (z.x-p.x)*(attack.dir || p.dir)>=0 &&
      distance(p,z)<=(attack.range || 0) && p.y>z.y-z.h && p.y-p.h<z.y)triggerHazard(z);
  }
  function updateHazards(g,dt) {
    for(const z of g.abyssHazards) {
      if(z.owner && !alive(z.owner)){z.expired=true;continue;}
      if(z.owner && frozen(z.owner) && z.phase!=='falling')continue;
      if(z.phase==='idle') {
        z.timer-=dt;
        if(z.timer<=EPS){z.expired=true;continue;}
        const trigger=z.kind==='spirit'?cfg().hazards.spiritTrigger:cfg().hazards.mushroomTrigger;
        if(Math.hypot(g.player.x-z.x,g.player.y-z.y)<trigger)triggerHazard(z);
        continue;
      }
      z.timer-=dt;
      if(z.phase==='warning') {
        if(z.timer>EPS)continue;
        if(['stalactite','ice','reverse-spike'].includes(z.kind)) {
          z.phase='falling';z.timer=10;if(Number.isFinite(z.fallStartY))z.y=z.fallStartY;
        } else if(z.kind==='rolling-rock'){z.phase='rolling';z.timer=10;}
        else {
          z.phase='active';z.timer=cfg().hazards.activeTime;
          if(['mushroom','spirit'].includes(z.kind)) {
            const radius=z.kind==='spirit'?cfg().hazards.spiritRadius:cfg().hazards.mushroomRadius;
            z.w=z.h=radius*2;z.radius=radius;z.centerY=GROUND-16;z.y=z.centerY+radius;
            g.burst?.(z.x,z.y-15,z.kind==='spirit'?'#a2eff5':'#e06080',16,'ring');
          }
        }
      }
      if(z.phase==='falling') {
        z.vy+=cfg().hazards.fallGravity*(z.direction || 1)*dt;z.y+=z.vy*dt;
        if((z.direction || 1)>0 && z.y>=GROUND){z.y=GROUND;z.landed=true;}
        if(z.direction<0 && z.y-z.h<=(g.viewTop || 0)){z.y=(g.viewTop || 0)+z.h;z.landed=true;}
      } else if(z.phase==='rolling') {
        z.x+=z.vx*dt;if(z.x<-z.w*2 || z.x>W+z.w*2)z.expired=true;
      }
      if(z.phase==='active' && z.kind==='pollen') {
        if(!z.hitPlayer && hitPlayer(g,z)) {
          z.hitPlayer=statusEffect(g,'hallucination',cfg().status.hallucination);
        }
      } else if(!z.hitPlayer && !z.expired && (z.radius?
        Math.hypot(g.player.x-z.x,g.player.y-g.player.h*.5-z.centerY)<z.radius+g.player.w*.375:hitPlayer(g,z))) {
        z.hitPlayer=true;
        const applied=apply(g,{damage:z.damage,stun:z.stun || 0,knockup:z.knockup,kind:'abyss-'+z.kind});
        if(z.knockdown && applied)g.player.knockdownTime=Math.max(g.player.knockdownTime || 0,cfg().regular.handStun);
        if(['rolling-rock','ice','stalactite','reverse-spike'].includes(z.kind))z.expired=true;
      }
      if(z.landed)z.expired=true;
      if(z.timer<=EPS && z.phase==='active')z.expired=true;
      if(z.expired)g.burst?.(z.x,clamp(z.y,g.viewTop || 0,GROUND),'#b4b2bd',8);
    }
    g.abyssHazards=g.abyssHazards.filter(z=>!z.expired);
  }
  function updateShots(g,dt) {
    for(const s of g.abyssShots) {
      if(s.owner && !alive(s.owner)){s.life=0;continue;}
      if(s.delay>0){s.delay=Math.max(0,s.delay-dt);continue;}
      const dx=s.vx*dt,dy=s.vy*dt;s.x+=dx;s.y+=dy;s.life-=dt;s.traveled+=Math.hypot(dx,dy);
      if(s.traveled>s.range+EPS){s.life=0;continue;}
      if(hitPlayer(g,s)) {
        if(s.reverse) {
          if(statusEffect(g,'reverse',s.reverse))g.shake=Math.max(g.shake || 0,cfg().status.echoShake);
        } else apply(g,{damage:s.damage,exactDamage:s.exactDamage,knockup:s.knockup,stun:s.stun || 0,kind:s.kind});
        s.life=0;
      }
    }
    g.abyssShots=g.abyssShots.filter(s=>s.life>EPS && s.x>-100 && s.x<W+100 && s.y>-100 && s.y<GROUND+100);
  }
  function update(g,dt) {
    if(!inAbyss(g)||g.screen!=='playing')return;
    const s=state(g);s.clock+=dt;
    for(const corpse of g.abyssCorpses) {
      corpse.timer=Math.max(0,corpse.timer-dt);
      corpse.progress=clamp(1-corpse.timer/corpse.duration,0,1);
    }
    g.abyssCorpses=g.abyssCorpses.filter(corpse=>corpse.timer>EPS);
    if(s.awaitingVictory) {
      if(!g.abyssCorpses.length)s.awaitingVictory=false;
      return;
    }
    updateStatus(g,dt);environment(g,dt);updateHazards(g,dt);updateShots(g,dt);
  }
  MM.AbyssCombat={owns,init,setup:init,updateEnemy,update,updateStatus,cleanse,hit,beforeKill,onKill,cleanup:onKill,reset,
    gravityDirection,ceilingY,inputDirection,invertAction,hitHazards,meleeHazards,enterEmotion,
    addHazard,spawnShadow,safeTeleport,statusEffect};
})(typeof globalThis !== 'undefined' ? globalThis : this);
