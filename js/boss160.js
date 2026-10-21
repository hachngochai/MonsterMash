/* Quái Ngư Song Trảo. Encounter state is runtime-only, scoped to water maps. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const cfg=()=>MM.UnderwaterConfig.boss,arena=()=>MM.UnderwaterConfig.arena;
  const kind=e=>e?.archetype||e?.type;
  const owns=(first,second)=>kind(second||first)==='twinClawFish';
  const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const active=g=>MM.UnderwaterMode?.active?.(g)??(g.level?.underwater===true||g.level?.id>=151&&g.level?.id<=160);
  function encounter(g){
    if(!g.waterBossEncounter||g.waterBossEncounter.level!==g.level?.id)g.waterBossEncounter={level:g.level?.id,original:null,twin:null,splitTriggered:false,twinPhase:false};
    return g.waterBossEncounter;
  }
  function bound(e){const a=arena();e.x=clamp(e.x,a.edge+e.w/2,a.width-a.edge-e.w/2);e.y=clamp(e.y,Math.max(a.minY,e.h+15),a.maxY);}
  function setup(g,e){
    if(!owns(e))return false;const c=cfg(),battle=encounter(g);
    e.waterInitialized=true;e.waterClock=0;e.waterState='patrol';e.waterTimer=0;e.waterProgress=0;
    e.waterNextClaw=c.clawInterval;e.waterNextSilence=battle.twinPhase?c.silenceTwin:c.silenceNormal;
    e.waterNextVortex=c.vortexCooldown;e.waterSilenceTimer=0;e.waterSilenceCasts=0;e.waterVortexCasts=0;
    e.waterClawIndex=0;e.waterClawHits=0;e.waterClawCombos=0;e.waterSplitTriggered=false;
    e.waterBaseY=arena().centerY;e.y=e.waterBaseY;e.vx=e.vy=0;e.airborne=true;e.waterPhase=battle.twinPhase?2:1;
    if(!battle.original)battle.original=e;
    return true;
  }
  function warning(e,name,seconds){e.tell=true;e.skillWarning={name,remaining:Math.max(0,seconds),total:seconds};}
  function clearWarning(e){e.tell=false;e.skillWarning=null;}
  function changePhase(g,e){
    const battle=encounter(g),c=cfg();
    if(battle.splitTriggered||e.waterTwin)return false;
    battle.splitTriggered=true;battle.twinPhase=true;e.waterSplitTriggered=true;e.waterPhase=2;
    e.waterState='split';e.waterTimer=c.splitDuration;e.waterProgress=0;
    e.waterNextClaw=e.waterClock+c.clawInterval;
    e.waterNextSilence=Math.min(e.waterNextSilence,e.waterClock+c.silenceTwin);
    warning(e,'SONG SINH MA QUÁI',c.splitDuration);
    const side=g.player.x<arena().width/2?1:-1;
    let twin=g.spawn?.('boss',side);
    if(!twin){twin={...e,boss:true,type:'boss',archetype:'twinClawFish',dead:false,retired:false,phase:'warning'};setup(g,twin);(g.enemies||=[]).push(twin);}
    if(!twin.waterInitialized)setup(g,twin);
    twin.waterTwin=true;twin.waterOriginal=e;twin.waterSplitTriggered=true;twin.waterPhase=2;
    const max=Math.max(1,e.maxHealth||c.health);
    twin.health=twin.maxHealth=Math.max(1,Math.round(max*c.twinHealthRatio));
    twin.x=clamp(e.x+(e.x<arena().width/2?1:-1)*(e.w+twin.w)*.6,arena().edge+twin.w/2,arena().width-arena().edge-twin.w/2);
    twin.y=e.y;twin.phase='warning';twin.warning=c.splitDuration;twin.waterState='forming';
    twin.waterNextSilence=c.silenceTwin;twin.waterNextClaw=c.clawInterval;twin.waterNextVortex=c.vortexCooldown;
    battle.twin=twin;
    g.bossDefeated=false;g.burst?.(e.x,e.y-e.h*.5,'#8cf4f0',22,'ring');
    g.toast?.('SONG SINH MA QUÁI · Hạ cả hai bản thể');g.sound?.play('shield');g.updateUI?.();return true;
  }
  function hit(g,e,damage){
    if(!owns(e))return undefined;
    const battle=encounter(g),c=cfg();
    const target=c.twinHealthMode==='shared'&&e.waterTwin&&alive(battle.original)?battle.original:e;
    target.health=Math.max(0,target.health-Math.max(0,Number.isFinite(damage)?damage:0));
    if(target!==e)e.health=target.health;
    if(!battle.splitTriggered&&!target.waterTwin&&target.health<=target.maxHealth*c.splitThreshold)changePhase(g,target);
    return true;
  }
  function beforeKill(g,e){
    if(!owns(e))return true;
    if(!encounter(g).splitTriggered&&!e.waterTwin&&e.health<=e.maxHealth*cfg().splitThreshold)changePhase(g,e);
    return true;
  }
  function dashToward(e,tx,ty,speed,dt){
    const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),amount=Math.min(d,speed*dt);
    e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=dx/d*amount;e.y+=dy/d*amount;e.dir=Math.sign(dx)||e.dir;bound(e);
  }
  function clawHit(g,e,zone){
    const c=cfg(),p=g.player;
    const centerY=p.y-p.h*.5;
    if(p.rollTime>0||Math.abs(p.x-zone.x)>(zone.w+p.w*.8)/2||Math.abs(centerY-zone.y)>(zone.h+p.h*.8)/2)return false;
    const before=p.health,immortal=p.immortalTime>0;
    // Each accepted claw is a distinct authored strike. The ordinary 1.35s
    // damage grace cannot erase the second and third .55s combo events.
    if(p.shieldTime>0&&p.shieldHits>0){
      p.shieldHits=Math.max(0,p.shieldHits-c.shieldDrain);if(!p.shieldHits)p.shieldTime=0;
      g.burst?.(p.x,centerY,'#9ef5de',10,'ring');g.sound?.play('shield');
    }else{
      g.shieldCount=Math.max(0,(g.shieldCount||0)-c.shieldDrain);
      p.health=Math.max(0,p.health-(immortal?0:c.clawDamage));
      if(!immortal){g.flash=.12;g.shake=Math.max(g.shake||0,4);g.sound?.play('hit');g.burst?.(p.x,centerY,'#b0eff7',10,'ring');}
    }
    p.invulnerable=Math.max(p.invulnerable||0,c.clawGap*.45);
    e.waterClawHits++;
    if(p.health<before)g.floating?.(p.x,p.y-p.h-12,'−'+c.clawDamage+' MÁU · LIÊN TRẢO','#c0edf8');
    g.updateUI?.();if(p.health<=0)g.finish?.(false);return true;
  }
  function strike(g,e){
    const c=cfg(),dir=Math.sign(g.player.x-e.x)||e.dir||1;e.dir=dir;e.waterAttackDir=dir;
    const z={kind:'water-claw',owner:e,phase:'active',dir,x:e.x+dir*(e.w*.25+c.clawRange*.25),y:e.y-e.h*.5,
      w:c.clawRange,h:c.clawHeight,timer:c.clawGap*.65,total:c.clawGap*.65,index:e.waterClawIndex,hit:false};
    z.hit=clawHit(g,e,z);(g.waterZones||=[]).push(z);g.sound?.play('shot');
    e.waterClawIndex++;e.waterClawTimer=c.clawGap;e.waterProgress=e.waterClawIndex/c.clawCount;
  }
  function updateClaws(g,e,dt){
    const c=cfg(),p=g.player;
    if(e.waterState==='claw-windup'){
      e.waterTimer-=dt;e.waterProgress=clamp(1-e.waterTimer/c.clawWarning,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.waterTimer);
      if(e.waterTimer<=EPS){e.waterState='claw-dash';e.waterTimer=c.dashDuration;clearWarning(e);}
    }else if(e.waterState==='claw-dash'){
      e.waterTimer-=dt;
      const dx=p.x-e.x,dy=p.y-e.y;
      if(Math.hypot(dx,dy)<=c.clawRange||e.waterTimer<=EPS){
        e.waterState='claw-combo';e.waterClawIndex=0;e.waterClawTimer=0;e.vx=e.vy=0;e.waterClawCombos++;
      }else dashToward(e,p.x,p.y,c.dashSpeed,dt);
    }else if(e.waterState==='claw-combo'){
      e.waterClawTimer-=dt;
      if(e.waterClawIndex<c.clawCount&&e.waterClawTimer<=EPS)strike(g,e);
      if(e.waterClawIndex>=c.clawCount&&e.waterClawTimer<=EPS){e.waterState='patrol';e.waterNextClaw=e.waterClock+c.clawInterval;clearWarning(e);}
    }else if(e.waterState==='split'){
      e.waterTimer-=dt;e.waterProgress=clamp(1-e.waterTimer/c.splitDuration,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.waterTimer);
      if(e.waterTimer<=EPS){e.waterState='patrol';clearWarning(e);}
    }else{
      const gap=Math.hypot(p.x-e.x,p.y-e.y),speed=e.speed||MM.UnderwaterConfig.enemies.twinClawFish.speed;
      if(e.waterClock+EPS>=e.waterNextClaw){
        e.waterState='claw-windup';e.waterTimer=c.clawWarning;e.waterTargetX=p.x;e.waterTargetY=p.y;e.waterProgress=0;
        e.dir=Math.sign(p.x-e.x)||e.dir;warning(e,'LIÊN TRẢO · NÉ BA NHÁT CÀO',c.clawWarning);
      }else if(gap>c.clawRange*.9)dashToward(e,p.x,p.y,speed,dt);
      else{e.vx=e.vy=0;e.y+=Math.cos(e.waterClock*MM.UnderwaterConfig.swim.bobRate)*MM.UnderwaterConfig.swim.bob*dt;bound(e);}
    }
  }
  function silence(g,e,dt){
    const c=cfg();
    if(e.waterSilenceTimer>0){
      e.waterSilenceTimer=Math.max(0,e.waterSilenceTimer-dt);
      if(e.waterSilenceTimer<=EPS){
        e.waterSilenceTimer=0;
        const state=g.underwater||(g.underwater={active:true});
        state.silenceTime=Math.max(state.silenceTime||0,c.silenceDuration);state.silenceOwner=e;
        e.waterSilenceCasts++;e.waterNextSilence=e.waterClock+(encounter(g).twinPhase?c.silenceTwin:c.silenceNormal);
        g.toast?.('CÂM LẶNG · '+c.silenceDuration+' giây · Vẫn có thể cấp oxy');
        g.burst?.(g.player.x,g.player.y-g.player.h*.5,'#b39bdc',14,'ring');g.updateUI?.();
      }
    }else if(e.waterClock+EPS>=e.waterNextSilence-c.silenceWarning){e.waterSilenceTimer=Math.max(EPS,e.waterNextSilence-e.waterClock);}
    if(e.waterSilenceTimer>0&&!['claw-windup','split'].includes(e.waterState))warning(e,'CÂM LẶNG · CHUẨN BỊ BƠI NÉ',e.waterSilenceTimer);
    else if(e.waterState==='patrol')clearWarning(e);
  }
  function summonVortex(g,e){
    const c=cfg(),a=arena(),p=g.player,zones=g.waterZones||=[];
    if(zones.filter(z=>z.kind==='water-vortex'&&!z.expired).length>=c.maxVortices)return false;
    const side=(g.random?.()??Math.random())<.5?-1:1;
    const x=clamp(p.x+side*c.vortexOffset,a.edge+c.vortexCore,a.width-a.edge-c.vortexCore);
    const y=clamp(p.y-p.h*.5,a.minY,a.maxY-p.h*.5);
    zones.push({kind:'water-vortex',owner:e,phase:'warning',x,y,targetX:x,targetY:y,originX:e.x,originY:e.y-e.h*.5,
      radius:c.vortexRadius,coreRadius:c.vortexCore,w:c.vortexRadius*2,h:c.vortexRadius*2,
      timer:c.vortexWarning,total:c.vortexWarning,hit:false,expired:false});
    e.waterVortexCasts++;e.waterNextVortex=e.waterClock+c.vortexCooldown;g.sound?.play('shield');return true;
  }
  function updateEnemy(g,e,dt){
    if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;
    if(!e.waterInitialized)setup(g,e);
    e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
    if(e.phase==='warning'){
      e.warning=Math.max(0,(e.warning||0)-dt);
      if(e.warning<=EPS){e.phase='active';e.waterState='patrol';bound(e);}return true;
    }
    if(e.phase!=='active'||e.petrifiedTime>0||MM.SkillManager?.frozen?.(e))return true;
    e.waterClock+=dt;
    if(!encounter(g).splitTriggered&&!e.waterTwin&&e.health<=e.maxHealth*cfg().splitThreshold)changePhase(g,e);
    updateClaws(g,e,dt);if(g.screen!=='playing')return true;
    silence(g,e,dt);
    if(e.waterState!=='split'&&e.waterClock+EPS>=e.waterNextVortex)summonVortex(g,e);
    return true;
  }
  function update(g,dt){
    if(!active(g)||g.screen!=='playing')return;const c=cfg(),p=g.player;
    for(const z of g.waterZones||[]){
      if(!['water-vortex','water-claw'].includes(z.kind)||z.expired)continue;
      if(!alive(z.owner)){z.expired=true;continue;}
      z.timer-=dt;
      if(z.kind==='water-claw'){if(z.timer<=EPS)z.expired=true;continue;}
      if(z.phase==='warning'){
        if(z.timer<=EPS){z.phase='travel';z.timer=z.total=c.vortexTravel;z.x=z.originX;z.y=z.originY;}continue;
      }
      if(z.phase==='travel'){
        const progress=clamp(1-z.timer/c.vortexTravel,0,1),ease=progress*progress*(3-2*progress);
        z.x=z.originX+(z.targetX-z.originX)*ease;z.y=z.originY+(z.targetY-z.originY)*ease;
        if(z.timer<=EPS){z.phase='active';z.timer=z.total=c.vortexLife;z.x=z.targetX;z.y=z.targetY;}continue;
      }
      if(z.timer<=EPS){z.expired=true;continue;}
      const dx=z.x-p.x,dy=z.y-(p.y-p.h*.5),distance=Math.hypot(dx,dy);
      if(distance<z.radius&&distance>EPS){
        const power=c.vortexPull*(1-distance/z.radius)*dt;
        p.vx=(p.vx||0)+dx/distance*power;p.vy=(p.vy||0)+dy/distance*power;
      }
      if(!z.hit&&distance<=z.coreRadius){
        z.hit=true;z.expired=true;
        if(g.underwater){g.underwater.oxygen=Math.max(0,g.underwater.oxygen*(1-c.vortexOxygenFraction));MM.UnderwaterMode?.oxygenChanged?.(g);}
        g.applyCombatEffect?.({kind:'water-vortex',damage:c.vortexDamage,forceHit:true});
        g.burst?.(z.x,z.y,'#b0faff',24,'ring');g.updateUI?.();
      }
    }
    g.waterZones=(g.waterZones||[]).filter(z=>!z.expired);
  }
  function onKill(g,e){
    if(!owns(e))return;
    for(const z of g.waterZones||[])if(z.owner===e)z.expired=true;
    g.waterZones=(g.waterZones||[]).filter(z=>!z.expired);
    if(g.underwater?.silenceOwner===e){g.underwater.silenceOwner=null;g.underwater.silenceTime=0;}
    const battle=encounter(g),actors=(g.enemies||[]).filter(other=>owns(other)&&other!==e&&alive(other));
    if(cfg().victoryRule==='original-only'&&!e.waterTwin){
      for(const actor of actors){actor.dead=true;actor.health=0;actor.retired=true;}
    }
    if(!actors.length||cfg().victoryRule==='original-only')reset(g);
    else battle.original=battle.original||e;
  }
  function reset(g){
    g.waterZones=(g.waterZones||[]).filter(z=>!owns(z.owner));
    if(g.underwater){g.underwater.silenceTime=0;g.underwater.silenceOwner=null;}
    for(const e of g.enemies||[])if(owns(e)){e.skillWarning=null;e.tell=false;e.waterSilenceTimer=0;}
    g.waterBossEncounter=null;
  }
  MM.Boss160={owns,setup,updateEnemy,update,hit,beforeKill,onKill,reset,clawHit,summonVortex};
})(typeof window!=='undefined'?window:globalThis);
