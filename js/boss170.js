/* Bóng Ma Điện Quang: independent electrical skills and one illusion pair. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const cfg=()=>MM.MiddleSeaConfig.boss,arena=()=>MM.UnderwaterConfig.arena;
  const owns=(first,second)=>(second||first)?.archetype==='phantomJellyfish';
  const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
  const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id===170;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function encounter(g){
    if(!g.middleSeaEncounter||g.middleSeaEncounter.level!==g.level?.id)g.middleSeaEncounter={level:g.level?.id,
      original:null,clone:null,illusionTriggered:false,clock:0,nextSwap:Infinity,swapState:'idle',timer:0};
    return g.middleSeaEncounter;
  }
  function bound(e){const a=arena();e.x=clamp(e.x,a.edge+e.w/2,a.width-a.edge-e.w/2);e.y=clamp(e.y,Math.max(a.minY,e.h+10),a.maxY);}
  function setup(g,e){
    if(!owns(e))return false;const c=cfg(),battle=encounter(g);
    e.middleInitialized=true;e.middleClock=0;e.middleState='patrol';e.middleTimer=e.middleProgress=0;
    e.middleNextShock=c.shockCooldown;e.middleNextSummon=c.summonCooldown;e.middleNextLaser=c.laserCooldown;
    e.middleShockState='idle';e.middleShockTimer=0;e.middleSummonTimer=0;e.middleLaserZone=null;
    e.middleShockCasts=e.middleSummonCasts=e.middleLaserCasts=0;e.middleIllusionPhase=battle.illusionTriggered;
    e.middleSwapProgress=0;e.middleSwapWarning=false;e.vx=e.vy=0;e.airborne=true;e.y=arena().centerY;
    if(!battle.original)battle.original=e;return true;
  }
  function warning(e,name,total){e.tell=true;e.skillWarning={name,remaining:Math.max(0,total),total};}
  function clearWarning(e){e.tell=false;e.skillWarning=null;}
  function cancelAttacks(e){
    if(e.middleShockZone)e.middleShockZone.expired=true;
    if(e.middleLaserZone)e.middleLaserZone.expired=true;
    e.middleShockState='idle';e.middleShockTimer=0;e.middleShockZone=e.middleLaserZone=null;
  }
  function createIllusion(g,e,hp){
    const b=encounter(g),c=cfg();if(b.illusionTriggered||e.middleSeaTwin)return false;
    b.illusionTriggered=true;e.middleIllusionPhase=true;cancelAttacks(e);
    let copy=g.spawn?.('boss',e.x<arena().width/2?1:-1);
    if(!copy){copy={...e,boss:true,dead:false,retired:false,phase:'active'};setup(g,copy);(g.enemies||=[]).push(copy);}
    if(!copy.middleInitialized)setup(g,copy);
    copy.middleSeaTwin=true;copy.middleOriginal=e;copy.middleIllusionPhase=true;
    copy.health=copy.maxHealth=Math.max(1,hp);copy.phase='active';copy.warning=0;
    copy.x=arena().width-e.x;copy.y=e.y;bound(copy);copy.dir=-e.dir;
    if(Math.abs(copy.x-e.x)<e.w){copy.x=e.x<arena().width/2?arena().width-arena().edge-copy.w/2:arena().edge+copy.w/2;}
    b.clone=copy;b.nextSwap=b.clock+c.swapCooldown;g.bossDefeated=false;
    e.middleIllusionTimer=copy.middleIllusionTimer=c.illusionWarning;
    g.toast?.('ẢO GIÁC · Hai bóng ma hoán đổi vị trí');g.burst?.(e.x,e.y-e.h*.5,'#c2a6ff',24,'ring');g.sound?.play('shield');return true;
  }
  function hit(g,e,damage,attack={}){
    if(!owns(e))return undefined;const c=cfg(),battle=encounter(g),before=e.health,amount=Math.max(0,Number.isFinite(damage)?damage:0);
    if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,amount,attack);
    else e.health=Math.max(0,before-amount);
    const after=e.health,threshold=Math.max(1,e.maxHealth*c.illusionThreshold);
    if(!e.middleSeaTwin&&!battle.illusionTriggered&&before>threshold&&after<=threshold){
      // Resolve the crossing at 25%, then keep all residual damage on the
      // original. Even a lethal crossing creates a positive-HP copy, no heal.
      e.health=threshold;createIllusion(g,e,threshold);e.health=after;
    }else{
      if(!e.middleSeaTwin&&!battle.illusionTriggered&&e.health>0&&e.health<=threshold)createIllusion(g,e,e.health);
    }
    return true;
  }
  function beforeKill(g,e){
    if(!owns(e))return true;
    if(!e.middleSeaTwin&&!encounter(g).illusionTriggered&&e.health<=e.maxHealth*cfg().illusionThreshold)createIllusion(g,e,Math.max(1,e.maxHealth*cfg().illusionThreshold));
    return true;
  }
  function moveToward(e,tx,ty,speed,dt){
    const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,speed*dt);
    const blend=1-Math.exp(-MM.UnderwaterConfig.swim.drag*dt);
    e.vx+=(dx/d*speed-e.vx)*blend;e.vy+=(dy/d*speed-e.vy)*blend;
    e.x+=dx/d*step;e.y+=dy/d*step;if(Math.abs(dx)>1)e.dir=Math.sign(dx);bound(e);
  }
  function startShock(g,e){const c=cfg();e.middleShockState='approach';e.middleShockTimer=c.shockApproachTime;e.middleNextShock=e.middleClock+c.shockCooldown;e.middleShockCasts++;}
  function updateShock(g,e,dt){
    const c=cfg(),p=g.player;
    if(e.middleShockState==='approach'){
      e.middleShockTimer-=dt;
      const targetY=p.y-p.h*.5+e.h*.5;
      moveToward(e,p.x,targetY,c.shockApproachSpeed,dt);
      if(Math.hypot(p.x-e.x,targetY-e.y)<=c.shockRange*.45||e.middleShockTimer<=EPS){
        e.middleShockState='warning';e.middleShockTimer=c.shockWarning;
        const z={kind:'middle-shock',owner:e,phase:'warning',x:e.x,y:e.y-e.h*.5+c.shockHeight*.5,
          w:c.shockRange,h:c.shockHeight,timer:c.shockWarning,total:c.shockWarning,hit:false};
        e.middleShockZone=z;(g.waterZones||=[]).push(z);
      }
    }else if(e.middleShockState==='warning'){
      const z=e.middleShockZone;e.middleShockTimer=Math.max(0,e.middleShockTimer-dt);
      if(z){z.timer=e.middleShockTimer;z.x=e.x;z.y=e.y-e.h*.5+c.shockHeight*.5;}
      if(e.middleShockTimer<=EPS){
        e.middleShockState='active';e.middleShockTimer=c.shockLife;
        if(z){z.phase='active';z.timer=z.total=c.shockLife;}g.sound?.play('shot');
      }
    }else if(e.middleShockState==='active'){
      // The zone owns its live duration, including frames spent casting a
      // different skill. An attack animation cannot extend its damage window.
      e.middleShockTimer=e.middleShockZone?.timer||0;
      if(!e.middleShockZone||e.middleShockZone.expired){e.middleShockState='idle';e.middleShockTimer=0;e.middleShockZone=null;}
    }
  }
  function summon(g,e){
    const c=cfg(),a=arena(),count=c.summonCount,span=a.width-2*c.summonEdge;
    for(let i=0;i<count;i++){
      const fish=g.spawn?.('electricJellyfish',(i%2)?1:-1);if(!fish)continue;
      if(!fish.middleInitialized)MM.MiddleSeaEnemies?.setup(g,fish);
      fish.summonedJelly=true;fish.summonOwner=e;fish.phase='active';fish.warning=0;
      fish.x=c.summonEdge+(i+.5)*span/count;fish.y=a.height+fish.h;fish.middleContactUsed=false;
    }
    e.middleSummonCasts++;g.burst?.(e.x,e.y-e.h*.5,'#c7b3ff',18,'ring');g.sound?.play('shield');
  }
  function startLaser(g,e){
    const c=cfg(),p=g.player,x=e.x+(e.dir||1)*e.w*.25,y=e.y-e.h*.72;
    const zone={kind:'middle-plasma',owner:e,phase:'warning',x,y,angle:Math.atan2(p.y-p.h*.5-y,p.x-x),
      targetX:p.x,targetY:p.y-p.h*.5,range:c.laserRange,width:c.laserWidth,timer:c.laserWarning,total:c.laserWarning,hit:false};
    e.middleLaserZone=zone;(g.waterZones||=[]).push(zone);e.middleNextLaser=e.middleClock+c.laserCooldown;e.middleLaserCasts++;
  }
  function canCloneAttack(e){return !e.middleSeaTwin||cfg().cloneAttackMode==='all';}
  function updatePose(e){
    const c=cfg();
    if(e.middleIllusionTimer>EPS){e.middleState='illusion';e.middleTimer=e.middleIllusionTimer;e.middleProgress=1-e.middleTimer/c.illusionWarning;warning(e,'ẢO GIÁC',e.middleTimer);}
    else if(e.middleSummonTimer>EPS){e.middleState='summon-warning';e.middleTimer=e.middleSummonTimer;e.middleProgress=1-e.middleTimer/c.summonWarning;warning(e,'TẬP TÍNH BẦY ĐÀN · NÉ NĂM SỨA ĐIỆN',e.middleTimer);}
    else if(e.middleLaserZone&&!e.middleLaserZone.expired){const z=e.middleLaserZone;e.middleState=z.phase==='active'?'laser':'laser-warning';e.middleTimer=z.timer;e.middleProgress=1-z.timer/z.total;if(z.phase==='warning')warning(e,'LAZE PLASMA · NÉ ĐƯỜNG NGẮM',z.timer);else clearWarning(e);}
    else if(e.middleShockState!=='idle'){e.middleState={approach:'shock-approach',warning:'shock-warning',active:'shock'}[e.middleShockState];e.middleTimer=e.middleShockTimer;e.middleProgress=e.middleShockState==='warning'?1-e.middleTimer/c.shockWarning:0;if(e.middleShockState==='warning')warning(e,'TÊ TÁI · NÉ XÚC TU ĐIỆN',e.middleTimer);else clearWarning(e);}
    else{e.middleState='patrol';e.middleTimer=e.middleProgress=0;clearWarning(e);}
  }
  function updateEnemy(g,e,dt){
    if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.middleInitialized)setup(g,e);
    e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
    if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';bound(e);}return true;}
    if(e.phase!=='active'||e.petrifiedTime>0||MM.SkillManager?.frozen?.(e))return true;
    const b=encounter(g);e.middleClock+=dt;
    if(!e.middleSeaTwin&&!b.illusionTriggered&&e.health<=e.maxHealth*cfg().illusionThreshold)createIllusion(g,e,e.health);
    if(b.swapState!=='idle')return true;
    e.middleIllusionTimer=Math.max(0,(e.middleIllusionTimer||0)-dt);
    if(canCloneAttack(e)){
      const c=cfg();
      if(e.middleSummonTimer>EPS){e.middleSummonTimer=Math.max(0,e.middleSummonTimer-dt);if(e.middleSummonTimer<=EPS){e.middleSummonTimer=0;summon(g,e);}}
      else if(e.middleClock+EPS>=e.middleNextSummon){e.middleSummonTimer=c.summonWarning;e.middleNextSummon=e.middleClock+c.summonCooldown;cancelAttacks(e);}
      const ready=e.middleSummonTimer<=EPS&&e.middleIllusionTimer<=EPS;
      if(ready&&e.middleShockState==='idle'&&e.middleClock+EPS>=e.middleNextShock)startShock(g,e);
      const firing=e.middleLaserZone&&!e.middleLaserZone.expired;
      if(ready&&!firing&&e.middleClock+EPS>=e.middleNextLaser)startLaser(g,e);
      if(ready&&(!firing||e.middleShockState==='warning'||e.middleShockState==='active'))updateShock(g,e,dt);
    }
    const stationary=e.middleSummonTimer>EPS||e.middleIllusionTimer>EPS||(e.middleLaserZone&&!e.middleLaserZone.expired)||e.middleShockState!=='idle';
    if(!stationary){
      const a=arena(),center=e.middleSeaTwin?a.width*.25:a.width*.75;
      moveToward(e,center+Math.sin(e.middleClock*.37)*a.width*.12,a.centerY+Math.sin(e.middleClock*.8)*18,e.speed||MM.MiddleSeaConfig.enemies.phantomJellyfish.speed,dt);
      e.dir=Math.sign(g.player.x-e.x)||e.dir;
    }else if(e.middleShockState!=='approach')e.vx=e.vy=0;
    updatePose(e);return true;
  }
  function laserTouches(p,z){
    // Exact capsule/rectangle distance, including round beam endpoints.
    // A rectangle expanded in both axes would falsely hit its corner squares.
    const x1=z.x+Math.cos(z.angle)*z.range,y1=z.y+Math.sin(z.angle)*z.range,r=z.width*.5;
    const left=p.x-p.w*.5,right=p.x+p.w*.5,top=p.y-p.h,bottom=p.y;
    let near=0,far=1;
    for(const [start,delta,low,high] of [[z.x,x1-z.x,left,right],[z.y,y1-z.y,top,bottom]]){
      if(Math.abs(delta)<EPS){if(start<low||start>high){near=2;break;}continue;}
      const a=(low-start)/delta,b=(high-start)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
    }
    if(near<=far)return true;
    const dx=x1-z.x,dy=y1-z.y,lengthSquared=dx*dx+dy*dy;
    for(const [x,y] of [[left,top],[right,top],[left,bottom],[right,bottom]]){
      const t=lengthSquared>EPS?clamp(((x-z.x)*dx+(y-z.y)*dy)/lengthSquared,0,1):0;
      if((x-z.x-dx*t)**2+(y-z.y-dy*t)**2<=r*r+EPS)return true;
    }
    for(const [x,y] of [[z.x,z.y],[x1,y1]])if((x-clamp(x,left,right))**2+(y-clamp(y,top,bottom))**2<=r*r+EPS)return true;
    return false;
  }
  function shockTouches(p,z){return Math.abs(p.x-z.x)<(p.w+z.w)*.5&&p.y>z.y-z.h&&p.y-p.h<z.y;}
  function updateZones(g,dt){
    const c=cfg(),p=g.player;
    for(const z of g.waterZones||[]){
      if(!['middle-plasma','middle-shock'].includes(z.kind)||z.expired)continue;
      if(!alive(z.owner)){z.expired=true;continue;}
      if(z.kind==='middle-shock'){
        if(z.owner.middleSummonTimer>EPS||z.owner.middleIllusionTimer>EPS||g.middleSeaEncounter?.swapState!=='idle'){
          z.expired=true;continue;
        }
        if(z.phase==='active'){
          z.timer=Math.max(0,z.timer-dt);
          if(z.timer<=EPS){z.expired=true;continue;}
        }
        if(z.phase==='active'&&!z.hit&&shockTouches(p,z))z.hit=MM.MiddleSeaEnemies.applyElectric(g,{kind:'middle-shock',damage:c.shockDamage,stun:c.shockStun,stunLimit:c.shockStun,oxygenFraction:c.shockOxygenFraction,owner:z.owner,sourceBoss:true});
        continue;
      }
      z.timer=Math.max(0,z.timer-dt);
      if(z.phase==='warning'){
        z.x=z.owner.x+(z.owner.dir||1)*z.owner.w*.25;z.y=z.owner.y-z.owner.h*.72;
        z.angle=Math.atan2(z.targetY-z.y,z.targetX-z.x);
        if(z.timer<=EPS){z.phase='active';z.timer=z.total=c.laserLife;g.sound?.play('shot');}continue;
      }
      if(!z.hit&&laserTouches(p,z)&&p.rollTime<=0&&p.invulnerable<=EPS){
        z.hit=true;g.applyCombatEffect?.({kind:'middle-plasma',damage:c.laserDamage,owner:z.owner,sourceBoss:true});g.burst?.(p.x,p.y-p.h*.5,'#bdaaff',12,'ring');
      }
      if(z.timer<=EPS){z.expired=true;if(z.owner.middleLaserZone===z)z.owner.middleLaserZone=null;}
    }
    g.waterZones=(g.waterZones||[]).filter(z=>!z.expired);
  }
  function updateSwap(g,dt){
    const b=g.middleSeaEncounter,c=cfg();if(!b?.illusionTriggered||!alive(b.original)||!alive(b.clone))return;
    b.clock+=dt;const pair=[b.original,b.clone];
    if(b.swapState==='idle'){
      if(b.clock+EPS<b.nextSwap)return;b.swapState='warning';b.timer=c.swapWarning;
      for(const e of pair){cancelAttacks(e);e.middleSwapWarning=true;e.middleState='swap-warning';warning(e,'ẢO GIÁC · HOÁN ĐỔI',c.swapWarning);}return;
    }
    b.timer=Math.max(0,b.timer-dt);
    if(b.swapState==='warning'){
      for(const e of pair){e.middleState='swap-warning';e.middleTimer=b.timer;if(e.skillWarning)e.skillWarning.remaining=b.timer;}
      if(b.timer<=EPS){b.swapState='swapping';b.timer=c.swapDuration;
        for(let i=0;i<2;i++){const e=pair[i],other=pair[1-i];e.middleSwapFromX=e.x;e.middleSwapFromY=e.y;e.middleSwapToX=other.x;e.middleSwapToY=other.y;e.middleSwapProgress=0;e.middleSwapWarning=false;clearWarning(e);}
      }return;
    }
    const progress=clamp(1-b.timer/c.swapDuration,0,1),ease=progress*progress*(3-2*progress);
    for(let i=0;i<2;i++){const e=pair[i];e.middleState='swapping';e.middleSwapProgress=progress;
      e.x=e.middleSwapFromX+(e.middleSwapToX-e.middleSwapFromX)*ease;e.y=e.middleSwapFromY+(e.middleSwapToY-e.middleSwapFromY)*ease+Math.sin(progress*Math.PI)*c.swapArc*(i?1:-1);bound(e);}
    if(b.timer<=EPS){b.swapState='idle';b.nextSwap=b.clock+c.swapCooldown;for(const e of pair){e.middleState='patrol';e.middleSwapProgress=0;clearWarning(e);}}
  }
  function update(g,dt){if(!active(g)||g.screen!=='playing')return;updateZones(g,dt);if(g.screen==='playing')updateSwap(g,dt);}
  function retireSummons(g,owner){for(const e of g.enemies||[])if(e.summonedJelly&&(!owner||e.summonOwner===owner)){e.dead=true;e.retired=true;e.noLoot=true;}}
  function onKill(g,e){
    if(!owns(e))return;for(const z of g.waterZones||[])if(z.owner===e)z.expired=true;retireSummons(g,e);
    const b=encounter(g);
    if(!e.middleSeaTwin&&cfg().victoryRule==='original-only'){
      if(b.clone){b.clone.health=0;b.clone.dead=true;b.clone.retired=true;}reset(g);
    }else if(!(g.enemies||[]).some(other=>owns(other)&&other!==e&&alive(other)))reset(g);
    else if(e.middleSeaTwin){b.clone=null;b.swapState='idle';if(b.original){b.original.middleSwapWarning=false;clearWarning(b.original);}}
  }
  function reset(g){
    g.waterZones=(g.waterZones||[]).filter(z=>!['middle-plasma','middle-shock'].includes(z.kind));retireSummons(g);
    for(const e of g.enemies||[])if(owns(e)){
      clearWarning(e);cancelAttacks(e);e.middleSwapWarning=false;
      e.middleSummonTimer=e.middleIllusionTimer=e.middleSwapProgress=e.middleTimer=e.middleProgress=0;
      e.middleState='patrol';e.vx=e.vy=0;
    }
    g.middleSeaEncounter=null;
  }
  MM.Boss170={owns,setup,updateEnemy,update,hit,beforeKill,onKill,reset,laserTouches,createIllusion};
})(typeof window!=='undefined'?window:globalThis);
