/* Mega London: mouth-only attacks, an exact hidden interval and finite rage. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.PredatorSeaConfig.boss,a=()=>MM.UnderwaterConfig.arena;
 const owns=(first,second)=>(second||first)?.archetype==='megaLondon'&&!(second||first)?.finalSeaSummon;
 const alive=e=>e&&!e.dead&&!e.retired&&(e.health>0||e.predatorRage&&!e.predatorFinalComplete);
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id===180;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function warning(e,name,total){e.tell=true;e.skillWarning={name,remaining:Math.max(0,total),total};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function bounds(e){e.x=clamp(e.x,a().edge+e.w/2,a().width-a().edge-e.w/2);e.y=clamp(e.y,Math.max(a().minY,e.h+12),a().maxY);}
 function hidden(e,on){e.predatorHidden=on;e.intangible=on;e.bulletUntargetable=on;}
 function setup(g,e){
  if(!owns(e))return false;const c=cfg();e.predatorInitialized=true;e.predatorClock=0;e.predatorState='patrol';e.predatorTimer=e.predatorProgress=0;
  e.predatorNextBite=c.biteCooldown;e.predatorNextDive=c.diveCooldown;e.predatorNextRoar=c.roarCooldown;
  e.predatorBiteCasts=e.predatorDiveCasts=e.predatorRoarCasts=0;e.predatorHit=false;e.predatorRage=false;e.predatorRageTime=0;e.predatorRageStarted=false;e.predatorFinalComplete=false;
  e.airborne=true;e.vx=e.vy=0;e.y=a().centerY;hidden(e,false);return true;
 }
 function startRage(g,e){
  if(e.predatorRageStarted||e.predatorFinalComplete)return false;
  e.health=0;e.predatorRageStarted=true;e.predatorRage=true;e.predatorRageTime=cfg().rageDuration;
  e.indestructible=true;g.bossDefeated=false;g.shake=Math.max(g.shake||0,5);
  g.toast?.('HUNG THẦN TRỖI DẬY · Sống sót '+cfg().rageDuration+' giây');g.burst?.(e.x,e.y-e.h*.5,'#df4559',28,'ring');g.sound?.play('shield');return true;
 }
 function hit(g,e,damage,attack={}){
  if(!owns(e))return undefined;if(e.predatorRage||e.predatorHidden||e.predatorFinalComplete)return false;
  if(MM.DamageReceipt?.subtract)MM.DamageReceipt.subtract(e,damage,attack);
  else e.health=Math.max(0,e.health-Math.max(0,Number.isFinite(damage)?damage:0));
  if(e.health<=0)startRage(g,e);return true;
 }
 function beforeKill(g,e){
  if(!owns(e)||e.predatorFinalComplete)return true;
  if(e.health<=0){startRage(g,e);return false;}return true;
 }
 function move(e,tx,ty,speed,dt){
  const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,speed*dt);
  e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=dx/d*step;e.y+=dy/d*step;if(Math.abs(dx)>1)e.dir=Math.sign(dx);bounds(e);
 }
 function lockTarget(g,e){const p=g.player;e.predatorTargetX=p.x;e.predatorTargetY=p.y-p.h*.5+e.h*.5;}
 function startBite(g,e){
  const c=cfg();e.predatorState='bite-warning';e.predatorTimer=c.biteWarning;e.predatorNextBite=e.predatorClock+c.biteCooldown;e.predatorBiteCasts++;e.predatorHit=false;
  lockTarget(g,e);e.dir=Math.sign(e.predatorTargetX-e.x)||e.dir;e.vx=e.vy=0;warning(e,'CẮN ÂM THANH · NÉ HÀM RĂNG',c.biteWarning);
 }
 function startDive(g,e){
  const c=cfg();e.predatorState='dive-down';e.predatorTimer=c.diveDownDuration;e.predatorNextDive=e.predatorClock+c.diveCooldown;e.predatorDiveCasts++;e.predatorHit=false;e.predatorDiveFromY=e.y;
  lockTarget(g,e);warning(e,'SÁT THỦ BIỂN KHƠI · QUAN SÁT BÊN DƯỚI',c.diveDownDuration);
 }
 function mouth(e,vertical=false){
  const c=cfg(),dx=vertical?0:Math.cos(e.predatorAttackAngle||0),dy=vertical?-1:Math.sin(e.predatorAttackAngle||0);
  return {x:e.x+dx*e.w*.43,y:e.y-e.h*.5+dy*e.h*.43,w:vertical?c.mouthHeight:c.mouthWidth,h:vertical?c.mouthWidth:c.mouthHeight};
 }
 function biteContact(g,e,from,to){
  if(e.predatorHit||e.predatorHidden)return false;const p=g.player;
  if(p.rollTime>0||p.invulnerable>EPS||!MM.PredatorSeaEnemies.sweptBox(p,from.x,from.y,to.x,to.y,to.w,to.h))return false;
  e.predatorHit=true;g.applyCombatEffect?.({kind:'mega-bite',damage:cfg().biteDamage,owner:e,sourceBoss:e.boss===true});
  g.burst?.(to.x,to.y,'#bce9ee',16,'ring');return true;
 }
 function startRoar(g,e){
  const c=cfg();e.predatorState='roar-warning';e.predatorTimer=c.roarWarning;e.predatorNextRoar=e.predatorClock+c.roarCooldown;e.predatorRoarCasts++;
  e.dir=Math.sign(g.player.x-e.x)||e.dir;e.vx=e.vy=0;
  const z={kind:'predator-roar',owner:e,sourceBoss:e.boss===true,phase:'warning',x:e.x+e.dir*e.w*.43,y:e.y-e.h*.5,dir:e.dir,range:c.roarRange,height:c.roarHeight,
   timer:c.roarWarning,total:c.roarWarning,frontRadius:0,hit:false};e.predatorRoarZone=z;(g.waterZones||=[]).push(z);warning(e,'ÂM VANG XUNG KÍCH · TRÁNH NỬA BẢN ĐỒ',c.roarWarning);
 }
 function startPanic(g,e){
  if(g.predatorPanic?.time>EPS)return;
  const c=cfg();g.predatorPanic={owner:e,time:c.panicDuration,tick:c.panicTick,ticksLeft:c.panicTicks};
  g.player.panicTime=c.panicDuration;if(g.underwater)g.underwater.panicTime=c.panicDuration;
 }
 function updatePanic(g,dt){
  const s=g.predatorPanic;if(!s)return;const c=cfg();s.time=Math.max(0,s.time-dt);s.tick-=dt;
  while(s.tick<=EPS&&s.ticksLeft>0){
   s.tick+=c.panicTick;s.ticksLeft--;
   if(!MM.MerfolkTransformation?.protectsOxygen(g)&&g.underwater){
    const basis=c.oxygenBasis==='maximum'?g.underwater.maxOxygen:g.underwater.oxygen;
    g.underwater.oxygen=Math.max(0,g.underwater.oxygen-basis*c.panicOxygenFraction);MM.UnderwaterMode?.oxygenChanged(g);g.updateUI?.();
   }
  }
  g.player.panicTime=s.time;if(g.underwater)g.underwater.panicTime=s.time;
  if(s.time<=EPS&&s.ticksLeft<=0){g.predatorPanic=null;g.player.panicTime=0;if(g.underwater)g.underwater.panicTime=0;}
 }
 function updateState(g,e,dt){
  const c=cfg();
  if(e.predatorState==='bite-warning'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.biteWarning;if(e.skillWarning)e.skillWarning.remaining=e.predatorTimer;
   if(e.predatorTimer<=EPS){const dx=e.predatorTargetX-e.x,dy=e.predatorTargetY-e.y;e.predatorAttackAngle=Math.atan2(dy,dx);e.predatorState='bite-dash';e.predatorTimer=c.biteDuration;clear(e);}
  }else if(e.predatorState==='bite-dash'){
   const from=mouth(e),elapsed=Math.min(dt,e.predatorTimer);e.vx=Math.cos(e.predatorAttackAngle)*c.biteSpeed;e.vy=Math.sin(e.predatorAttackAngle)*c.biteSpeed;e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;bounds(e);
   biteContact(g,e,from,mouth(e));e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.biteDuration;
   if(e.predatorTimer<=EPS){e.predatorState='bite-recover';e.predatorTimer=c.biteRecovery;}
  }else if(e.predatorState==='bite-recover'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);if(e.predatorTimer<=EPS){e.predatorState='patrol';clear(e);}
  }else if(e.predatorState==='dive-down'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.diveDownDuration;
   e.y=e.predatorDiveFromY+(a().height+e.h-e.predatorDiveFromY)*e.predatorProgress;e.vx=0;e.vy=c.emergeSpeed;
   if(e.skillWarning)e.skillWarning.remaining=e.predatorTimer;
   if(e.predatorTimer<=EPS){e.predatorState='dive-hidden';e.predatorTimer=c.hiddenDuration;e.predatorEmergenceLocked=false;hidden(e,true);e.vx=e.vy=0;clear(e);}
  }else if(e.predatorState==='dive-hidden'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.hiddenDuration;
   if(e.predatorTimer<=c.emergenceWarning+EPS){
    if(!e.predatorEmergenceLocked){lockTarget(g,e);e.predatorEmergenceLocked=true;}
    warning(e,'PHỤC KÍCH · RỜI KHỎI VÙNG BỌT NƯỚC',e.predatorTimer);
   }
   if(e.predatorTimer<=EPS){
    hidden(e,false);e.predatorState='emerge-bite';e.predatorTimer=c.emergeDuration;e.predatorAttackAngle=-Math.PI/2;e.predatorHit=false;
    e.x=clamp(e.predatorTargetX,a().edge+e.w/2,a().width-a().edge-e.w/2);e.y=a().height+e.h*.5;e.vx=0;e.vy=-c.emergeSpeed;clear(e);g.burst?.(e.x,a().maxY,'#c2f4f8',20,'ring');
   }
  }else if(e.predatorState==='emerge-bite'){
   const from=mouth(e,true),elapsed=Math.min(dt,e.predatorTimer);e.y-=c.emergeSpeed*elapsed;e.vy=-c.emergeSpeed;
   biteContact(g,e,from,mouth(e,true));e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.emergeDuration;
   if(e.predatorTimer<=EPS||e.y<=Math.max(a().minY,e.h+12)){bounds(e);e.predatorState='bite-recover';e.predatorTimer=c.biteRecovery;}
  }else if(e.predatorState==='roar-warning'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.roarWarning;if(e.skillWarning)e.skillWarning.remaining=e.predatorTimer;
   if(e.predatorTimer<=EPS){e.predatorState='roar';e.predatorTimer=c.roarDuration;const z=e.predatorRoarZone;if(z){z.phase='active';z.timer=z.total=c.roarDuration;}clear(e);g.sound?.play('shot');}
  }else if(e.predatorState==='roar'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.roarDuration;
   const z=e.predatorRoarZone;if(z){z.timer=e.predatorTimer;z.frontRadius=c.roarRange*e.predatorProgress;}
   if(e.predatorTimer<=EPS){if(z)z.expired=true;e.predatorRoarZone=null;e.predatorState='patrol';}
  }else{
   if(e.predatorClock+EPS>=e.predatorNextDive)startDive(g,e);
   else if(e.predatorClock+EPS>=e.predatorNextBite)startBite(g,e);
   else if(e.predatorClock+EPS>=e.predatorNextRoar)startRoar(g,e);
   else{
    const tx=a().width*.5+Math.sin(e.predatorClock*.35)*a().width*.27,ty=a().centerY+Math.sin(e.predatorClock*.8)*18;
    move(e,tx,ty,e.speed||MM.PredatorSeaConfig.enemies.megaLondon.speed,dt);e.dir=Math.sign(g.player.x-e.x)||e.dir;
   }
  }
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.predatorInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.predatorRage){
   e.predatorRageTime=Math.max(0,e.predatorRageTime-dt);
   if(e.predatorRageTime<=EPS){e.predatorRageTime=0;e.predatorRage=false;e.predatorFinalComplete=true;e.indestructible=false;hidden(e,false);g.killEnemy?.(e);return true;}
  }
  if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';bounds(e);}return true;}
  if(e.phase!=='active'||(!e.predatorRage&&(e.petrifiedTime>0||MM.SkillManager?.frozen?.(e))))return true;
  e.predatorClock+=dt;updateState(g,e,dt);return true;
 }
 function update(g,dt){
  if(!active(g)||g.screen!=='playing')return;updatePanic(g,dt);
  for(const z of g.waterZones||[]){
   if(z.kind!=='predator-roar'||z.expired)continue;
   if(!alive(z.owner)){z.expired=true;continue;}
   if(z.phase!=='active'||z.hit)continue;
   const p=g.player,dx=(p.x-z.x)*z.dir,dy=p.y-p.h*.5-z.y;
   if(dx>=-p.w/2&&dx<=Math.min(z.range,z.frontRadius)+p.w/2&&Math.abs(dy)<(z.height+p.h)*.5&&p.rollTime<=0&&p.invulnerable<=EPS){
    const blocked=p.shieldTime>0&&p.shieldHits>0;z.hit=true;
    g.applyCombatEffect?.({kind:'mega-roar',damage:0,stun:cfg().roarStun,owner:z.owner,sourceBoss:z.owner.boss===true});
    if(p.stunTime>0)p.stunStyle='electric';if(!blocked||!cfg().shieldBlocksPanic)startPanic(g,z.owner);g.updateUI?.();
   }
  }
  g.waterZones=(g.waterZones||[]).filter(z=>!z.expired);
 }
 function reset(g){
  g.waterZones=(g.waterZones||[]).filter(z=>z.kind!=='predator-roar');g.predatorPanic=null;
  if(g.player)g.player.panicTime=0;if(g.underwater)g.underwater.panicTime=0;
  for(const e of g.enemies||[])if(owns(e)){clear(e);hidden(e,false);e.predatorRoarZone=null;e.predatorRage=false;e.predatorRageTime=0;e.indestructible=false;e.predatorTimer=e.predatorProgress=0;}
 }
 function onKill(g,e){if(owns(e))reset(g);}
 MM.Boss180={owns,setup,updateEnemy,update,hit,beforeKill,onKill,reset,startRage,startPanic,alive};
})(typeof window!=='undefined'?window:globalThis);
