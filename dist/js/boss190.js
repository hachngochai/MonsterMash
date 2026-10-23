/* Leviathan: two distinct zero-HP transitions and a finite shield challenge. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.DeepSeaConfig.boss,a=()=>MM.UnderwaterConfig.arena;
 const owns=(first,second)=>{const e=second||first;return e?.archetype==='leviathan'&&!e.finalSeaSummon;};
 const alive=e=>e&&!e.dead&&!e.retired&&(e.health>0||e.deepEnraged||e.deepFinal&&!e.deepFinalComplete);
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id===190;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function warn(e,name,total){e.tell=true;e.skillWarning={name,total,remaining:Math.max(0,total)};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function bounds(e){e.x=clamp(e.x,a().edge+e.w/2,a().width-a().edge-e.w/2);e.y=clamp(e.y,Math.max(a().minY,e.h+12),a().maxY);}
 function mouth(e){return {x:e.x+(e.dir||1)*e.w*.42,y:e.y-e.h*.5,w:cfg().mouthWidth,h:cfg().mouthHeight};}
 function move(e,tx,ty,speed,dt){const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,speed*dt);
  e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=dx/d*step;e.y+=dy/d*step;if(Math.abs(dx)>1)e.dir=Math.sign(dx);bounds(e);}
 function release(g,e,damage=false){
  const p=g.player;if(p.swallowedBy!==e)return;
  p.swallowedTime=0;p.swallowedBy=null;p.x=clamp(e.x+(e.dir||1)*(e.w*.5+p.w+24),28,a().width-28);p.y=clamp(a().centerY,a().minY,a().maxY);p.swimAnchorY=p.y;p.vx=p.vy=0;
  if(damage)g.applyCombatEffect?.({kind:'leviathan-release',damage:cfg().releaseDamage,owner:e,sourceBoss:true,forceHit:true});
  MM.UnderwaterMode?.bubbleBurst(g,p.x,p.y-p.h*.5);g.updateUI?.();
 }
 function stopCast(g,e){release(g,e,false);e.deepBossState='patrol';e.deepBossTimer=e.deepBossProgress=0;e.deepSwarmTimer=0;e.deepHoleBlocked=false;clear(e);}
 function setup(g,e){
  if(!owns(e))return false;const c=cfg();e.deepBossInitialized=true;e.deepBossClock=0;e.deepBossState='patrol';e.deepBossTimer=e.deepBossProgress=0;
  e.deepNextBite=c.basicCooldown;e.deepNextSwarm=c.swarmCooldown;e.deepNextLord=c.lordCooldown;e.deepNextHole=c.blackHoleCooldown;
  e.deepBiteCasts=e.deepSwarmCasts=e.deepLordCasts=e.deepHoleCasts=0;e.deepBossHit=false;e.deepSwarmTimer=0;
  e.deepRebirthUsed=false;e.deepEnraged=false;e.deepRebirthTime=0;e.deepRebirthWaves=0;e.deepFinal=false;e.deepFinalTime=0;e.deepFinalComplete=false;e.deepFinalResolved=false;
  e.vx=e.vy=0;e.airborne=true;e.y=a().centerY;return true;
 }
 function children(g,e){return (g.enemies||[]).filter(x=>x.archetype==='leviathanChild'&&x.summonOwner===e&&!x.dead&&!x.retired);}
 function spawnChildren(g,e,count,fast=false){
  const c=cfg(),old=children(g,e),excess=Math.max(0,old.length+count-c.childCap);
  for(let i=0;i<excess;i++){old[i].retired=old[i].dead=true;old[i].noLoot=true;}
  g.enemies=(g.enemies||[]).filter(x=>!x.retired);
  const max=c.childHealthBasis==='current'?Math.max(1,e.health):e.maxHealth;
  for(let i=0;i<count;i++){const child=g.spawn?.('leviathanChild',i%2===0?-1:1);if(!child)continue;
   Object.assign(child,{summonOwner:e,minion:true,health:max*c.childHealthFraction,maxHealth:max*c.childHealthFraction,phase:'warning',warning:.6,
    x:i%2===0?80:a().width-80,y:a().centerY+(i-(count-1)*.5)*28,deepNextAttack:.6,
    ...(fast?{speed:c.rebirthChildSpeed}:{} )});
  }
 }
 function beginRebirth(g,e){
  if(e.deepRebirthUsed||e.deepFinal)return false;const c=cfg();stopCast(g,e);e.deepRebirthUsed=true;e.health=e.maxHealth*c.rebirthHealthFraction;
  e.deepEnraged=true;e.deepRebirthTime=c.rebirthDuration;e.deepRebirthWaves=0;e.deepPendingFinal=false;e.deepBossState='rebirth';g.bossDefeated=false;
  warn(e,'ĐIÊN LOẠN · HAI ĐỢT LEVIATHAN CON',c.rebirthDuration);g.burst?.(e.x,e.y-e.h*.5,'#e46380',25,'ring');g.sound?.play('shield');return true;
 }
 function beginFinal(g,e){
  if(e.deepFinal||e.deepFinalComplete)return false;const c=cfg();stopCast(g,e);e.health=0;e.deepFinal=true;e.deepFinalTime=c.finalDuration;e.deepFinalResolved=false;e.deepFinalBlocked=false;
  e.deepEnraged=false;e.indestructible=true;e.deepBossState='final-warning';g.bossDefeated=false;
  warn(e,'HƠI THỞ CUỐI CÙNG · BẬT KHIÊN ĐỂ SỐNG SÓT',c.finalContactAt);g.burst?.(e.x,e.y-e.h*.5,'#c86cbd',28,'ring');g.sound?.play('shield');return true;
 }
 function zeroHP(g,e){if(!e.deepRebirthUsed)return beginRebirth(g,e);if(e.deepEnraged){e.deepPendingFinal=true;return false;}return beginFinal(g,e);}
 function hit(g,e,damage,attack={}){
  if(!owns(e))return undefined;if(e.deepFinal||e.deepFinalComplete)return false;
  if(MM.DamageReceipt?.subtract)MM.DamageReceipt.subtract(e,damage,attack);else e.health=Math.max(0,e.health-Math.max(0,Number.isFinite(damage)?damage:0));
  if(e.health<=EPS)zeroHP(g,e);return true;
 }
 function beforeKill(g,e){if(!owns(e)||e.deepFinalComplete)return true;if(e.health<=EPS){zeroHP(g,e);return false;}return true;}
 function biteContact(g,e,from,to,damage){const p=g.player;if(e.deepBossHit||p.rollTime>0||p.invulnerable>EPS||p.swallowedTime>0)return false;
  const touch=MM.PredatorSeaEnemies?.sweptBox?MM.PredatorSeaEnemies.sweptBox(p,from.x,from.y,to.x,to.y,to.w,to.h):MM.DeepSeaEnemies.touches(p,to);
  if(!touch)return false;e.deepBossHit=true;g.applyCombatEffect?.({kind:'leviathan-bite',damage,owner:e,sourceBoss:true});g.burst?.(to.x,to.y,'#afe9ed',14,'ring');return true;}
 function startBite(g,e,lord=false){const c=cfg();e.deepBossState=lord?'lord-warning':'bite-warning';e.deepBossTimer=lord?c.lordWarning:c.biteWarning;e.deepBossProgress=0;e.deepBossHit=false;
  e.deepBossTargetX=g.player.x;e.deepBossTargetY=g.player.y-g.player.h*.5+e.h*.5;e.dir=Math.sign(g.player.x-e.x)||e.dir;e.vx=e.vy=0;
  if(lord){e.deepLordCasts++;e.deepNextLord=e.deepBossClock+c.lordCooldown;}else{e.deepBiteCasts++;e.deepNextBite=e.deepBossClock+c.basicCooldown;}
  warn(e,lord?'LÃNH CHÚA BIỂN KHƠI · KHIÊN CHẶN TIẾNG GẦM':'CÚ TÁP CỔ ĐẠI · NÉ HÀM RĂNG',e.deepBossTimer);
 }
 function startSwarm(g,e){const c=cfg();e.deepBossState='swarm';e.deepBossTimer=c.swarmDuration;e.deepSwarmTimer=c.swarmDuration;e.deepSwarmCasts++;
  e.deepNextSwarm=e.deepBossClock+c.swarmCooldown;e.vx=e.vy=0;warn(e,'ÂM VANG BẦY ĐÀN · HAI LEVIATHAN CON',c.swarmDuration);}
 function startHole(g,e){const c=cfg();e.deepBossState='hole-warning';e.deepBossTimer=c.blackHoleWarning;e.deepBossProgress=0;e.deepHoleBlocked=false;e.deepBossHit=false;
  e.deepNextHole=e.deepBossClock+c.blackHoleCooldown;e.deepHoleCasts++;e.dir=Math.sign(g.player.x-e.x)||e.dir;e.vx=e.vy=0;warn(e,'HỐ ĐEN · BẬT KHIÊN TRƯỚC KHI BỊ NUỐT',c.blackHoleWarning);}
 function consumeShield(g){const p=g.player;if(!(p.shieldTime>EPS&&p.shieldHits>0))return false;p.shieldHits--;if(!p.shieldHits)p.shieldTime=0;
  p.invulnerable=Math.max(p.invulnerable,.45);g.burst?.(p.x,p.y-p.h*.5,'#a3efd9',12,'ring');g.sound?.play('shield');g.updateUI?.();return true;}
 function updateHole(g,e,dt){const c=cfg(),p=g.player,b=mouth(e);e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);e.deepBossProgress=1-e.deepBossTimer/c.blackHoleDuration;
  const dx=b.x-p.x,dy=b.y-(p.y-p.h*.5),d=Math.hypot(dx,dy);
  if(!e.deepHoleBlocked&&d<=c.blackHoleRange){
   if(consumeShield(g))e.deepHoleBlocked=true;
   else if(p.rollTime<=0){const step=Math.min(c.blackHolePullSpeed*dt,Math.max(0,d-12));if(d>EPS){p.x=clamp(p.x+dx/d*step,28,a().width-28);p.y=clamp(p.y+dy/d*step,a().minY,a().maxY);}
    if(Math.hypot(b.x-p.x,b.y-(p.y-p.h*.5))<p.w*.5+32&&!e.deepBossHit){e.deepBossHit=true;e.deepBossState='swallow';e.deepBossTimer=c.swallowDuration;p.swallowedTime=c.swallowDuration;p.swallowedBy=e;p.vx=p.vy=0;g.clearInputs?.();warn(e,'NUỐT CHỬNG · CẤP OXY VÀ CHUẨN BỊ KHIÊN',c.swallowDuration);return;}
   }
  }
  if(e.deepBossTimer<=EPS){e.deepBossState='patrol';clear(e);}
 }
 function updateState(g,e,dt){const c=cfg();
  if(e.deepBossState==='bite-warning'||e.deepBossState==='lord-warning'){
   const lord=e.deepBossState==='lord-warning',total=lord?c.lordWarning:c.biteWarning;e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);e.deepBossProgress=1-e.deepBossTimer/total;if(e.skillWarning)e.skillWarning.remaining=e.deepBossTimer;
   if(e.deepBossTimer<=EPS){
    if(lord){const b=mouth(e);if(Math.hypot(g.player.x-b.x,g.player.y-g.player.h*.5-b.y)<=c.lordRange)g.applyCombatEffect?.({kind:'leviathan-roar',damage:0,stun:c.lordStun,owner:e,sourceBoss:true});
     e.deepBossTargetX=g.player.x;e.deepBossTargetY=g.player.y-g.player.h*.5+e.h*.5;}
    e.deepBossAngle=Math.atan2(e.deepBossTargetY-e.y,e.deepBossTargetX-e.x);e.deepBossLord=lord;e.deepBossState='bite';e.deepBossTimer=c.biteDuration;clear(e);
   }
  }else if(e.deepBossState==='bite'){
   const from=mouth(e),elapsed=Math.min(dt,e.deepBossTimer),speed=e.deepBossLord?c.lordSpeed:c.biteSpeed;e.vx=Math.cos(e.deepBossAngle)*speed;e.vy=Math.sin(e.deepBossAngle)*speed;e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;bounds(e);
   biteContact(g,e,from,mouth(e),e.deepBossLord?c.lordDamage:c.basicDamage);e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);e.deepBossProgress=1-e.deepBossTimer/c.biteDuration;
   if(e.deepBossTimer<=EPS){e.deepBossState='recover';e.deepBossTimer=c.biteRecovery;}
  }else if(e.deepBossState==='recover'){
   e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);if(e.deepBossTimer<=EPS)e.deepBossState='patrol';
  }else if(e.deepBossState==='swarm'){
   e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);e.deepSwarmTimer=e.deepBossTimer;e.deepBossProgress=1-e.deepBossTimer/c.swarmDuration;if(e.skillWarning)e.skillWarning.remaining=e.deepBossTimer;
   g.shake=Math.max(g.shake||0,2.5);
   if(e.deepBossTimer<=EPS){spawnChildren(g,e,c.swarmCount);e.deepBossState='patrol';e.deepSwarmTimer=0;clear(e);}
  }else if(e.deepBossState==='hole-warning'){
   e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);e.deepBossProgress=1-e.deepBossTimer/c.blackHoleWarning;if(e.skillWarning)e.skillWarning.remaining=e.deepBossTimer;
   if(e.deepBossTimer<=EPS){e.deepBossState='hole-pull';e.deepBossTimer=c.blackHoleDuration;clear(e);}
  }else if(e.deepBossState==='hole-pull')updateHole(g,e,dt);
  else if(e.deepBossState==='swallow'){
   e.deepBossTimer=Math.max(0,e.deepBossTimer-dt);g.player.swallowedTime=e.deepBossTimer;const b=mouth(e);g.player.x=b.x;g.player.y=b.y+g.player.h*.5;
   if(e.skillWarning)e.skillWarning.remaining=e.deepBossTimer;
   if(e.deepBossTimer<=EPS){release(g,e,true);e.deepBossState='patrol';clear(e);}
  }else{
   if(e.deepBossClock+EPS>=e.deepNextHole)startHole(g,e);
   else if(e.deepBossClock+EPS>=e.deepNextSwarm)startSwarm(g,e);
   else if(e.deepBossClock+EPS>=e.deepNextLord)startBite(g,e,true);
   else if(e.deepBossClock+EPS>=e.deepNextBite)startBite(g,e,false);
   else{move(e,a().width*.5+Math.sin(e.deepBossClock*.3)*a().width*.25,a().centerY+Math.sin(e.deepBossClock*.65)*12,e.speed||MM.DeepSeaConfig.enemies.leviathan.speed,dt);e.dir=Math.sign(g.player.x-e.x)||e.dir;}
  }
 }
 function updateRebirth(g,e,dt){const c=cfg();e.deepRebirthTime=Math.max(0,e.deepRebirthTime-dt);const elapsed=c.rebirthDuration-e.deepRebirthTime;
  while(e.deepRebirthWaves<c.rebirthWaves&&elapsed+EPS>=c.rebirthWaveTimes[e.deepRebirthWaves]){spawnChildren(g,e,c.rebirthWaveCount,true);e.deepRebirthWaves++;}
  e.deepBossProgress=elapsed/c.rebirthDuration;if(e.skillWarning)e.skillWarning.remaining=e.deepRebirthTime;
  if(e.deepRebirthTime<=EPS){e.deepEnraged=false;e.deepBossState='patrol';clear(e);if(e.health<=EPS||e.deepPendingFinal)beginFinal(g,e);}
 }
 function updateFinal(g,e,dt){const c=cfg();e.deepFinalTime=Math.max(0,e.deepFinalTime-dt);const elapsed=c.finalDuration-e.deepFinalTime;e.deepBossProgress=elapsed/c.finalDuration;
  if(e.skillWarning)e.skillWarning.remaining=Math.max(0,c.finalContactAt-elapsed);
  if(elapsed>=c.finalWarning&&!e.deepFinalResolved){e.deepBossState='final-charge';move(e,g.player.x,g.player.y-g.player.h*.5+e.h*.5,c.finalSpeed,dt);}
  if(!e.deepFinalResolved&&elapsed+EPS>=c.finalContactAt){e.deepFinalResolved=true;e.deepFinalBlocked=consumeShield(g);e.deepBossState=e.deepFinalBlocked?'final-blocked':'final-drag';
   if(!e.deepFinalBlocked){g.player.swallowedBy=e;g.player.swallowedTime=e.deepFinalTime;g.clearInputs?.();}clear(e);}
  if(!e.deepFinalBlocked&&e.deepFinalResolved){g.player.swallowedTime=e.deepFinalTime;g.player.x=mouth(e).x;g.player.y=Math.min(a().maxY,e.y+elapsed*8);}
  if(e.deepFinalTime<=EPS){release(g,e,false);e.deepFinal=false;e.indestructible=false;
   if(e.deepFinalBlocked){e.deepFinalComplete=true;e.deepBossState='defeated';g.killEnemy?.(e);}else g.finish?.(false);
  }
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.deepBossInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';bounds(e);}return true;}
  if(e.phase!=='active')return true;e.deepBossClock+=dt;
  if(e.deepFinal)updateFinal(g,e,dt);else if(e.deepEnraged)updateRebirth(g,e,dt);else updateState(g,e,dt);return true;
 }
 function update(){}
 function reset(g){
  for(const e of g.enemies||[])if(owns(e)){release(g,e,false);clear(e);e.deepSwarmTimer=0;e.deepEnraged=false;e.deepRebirthTime=0;e.deepFinal=false;e.deepFinalTime=0;e.indestructible=false;e.deepBossTimer=e.deepBossProgress=0;}
  for(const child of g.enemies||[])if(child.archetype==='leviathanChild'&&owns(child.summonOwner)){child.dead=child.retired=true;child.noLoot=true;}
  g.enemies=(g.enemies||[]).filter(e=>!e.retired);if(g.player){g.player.swallowedTime=0;g.player.swallowedBy=null;}
 }
 function onKill(g,e){if(owns(e))reset(g);}
 MM.Boss190={owns,setup,updateEnemy,update,hit,beforeKill,onKill,reset,alive,beginRebirth,beginFinal,spawnChildren,mouth,release};
})(typeof window!=='undefined'?window:globalThis);
