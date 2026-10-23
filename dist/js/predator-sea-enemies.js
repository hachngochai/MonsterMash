/* Predator sea wildlife and the bounded, killable swordfish pass hazard. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.PredatorSeaConfig,a=()=>MM.UnderwaterConfig.arena;
 const kind=e=>e?.archetype||e?.type,owns=(first,second)=>['hammerhead','electricRay','swordfish'].includes(kind(second||first));
 const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id>=171&&g.level.id<=180;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function warn(e,name,total){e.tell=true;e.skillWarning={name,remaining:total,total};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function setup(g,e){
  if(!owns(e))return false;e.predatorInitialized=true;e.predatorClock=0;e.predatorTimer=e.predatorProgress=0;
  e.predatorState='patrol';e.vx=e.vy=0;e.airborne=true;e.y=a().centerY;e.predatorHit=false;
  e.predatorNextAttack=kind(e)==='hammerhead'?cfg().hammerhead.ramCooldown:cfg().electricRay.cooldown;
  e.predatorCasts=0;
  if(kind(e)==='swordfish'){
   const c=cfg().swordfish;e.predatorSeaHazard=true;e.predatorDirection=e.dir<0?-1:1;
   e.predatorWarningX=e.predatorDirection>0?24:a().width-24;e.x=e.predatorDirection>0?-e.w/2:a().width+e.w/2;
   e.y=c.lanes[Math.min(c.lanes.length-1,Math.floor((g.random?.()??Math.random())*c.lanes.length))];
   e.phase='warning';e.warning=c.warning;e.predatorState='edge-warning';e.predatorTimer=c.warning;
   warn(e,'CÁ KIẾM · '+(e.predatorDirection>0?'LAO TỪ TRÁI':'LAO TỪ PHẢI'),c.warning);
  }return true;
 }
 function bound(e){e.x=clamp(e.x,a().edge+e.w/2,a().width-a().edge-e.w/2);e.y=clamp(e.y,a().minY+e.h,a().maxY);}
 function steer(e,tx,ty,speed,dt){
  const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),blend=1-Math.exp(-MM.UnderwaterConfig.swim.drag*dt);
  e.vx+=(dx/d*speed-e.vx)*blend;e.vy+=(dy/d*speed-e.vy)*blend;e.x+=e.vx*dt;e.y+=e.vy*dt;bound(e);if(Math.abs(e.vx)>1)e.dir=Math.sign(e.vx);
 }
 function sweptBox(p,x0,y0,x1,y1,w,h){
  let near=0,far=1;
  for(const [start,delta,lo,hi] of [[x0,x1-x0,p.x-(p.w+w)/2,p.x+(p.w+w)/2],[y0,y1-y0,p.y-p.h-h/2,p.y+h/2]]){
   if(Math.abs(delta)<EPS){if(start<lo||start>hi)return false;continue;}
   const u=(lo-start)/delta,v=(hi-start)/delta;near=Math.max(near,Math.min(u,v));far=Math.min(far,Math.max(u,v));if(near>far)return false;
  }return true;
 }
 function acceptedContact(g,e,damage,stun=0){
  const p=g.player;if(p.rollTime>0||p.invulnerable>EPS||g.screen!=='playing')return false;
  g.applyCombatEffect?.({kind:stun?'predator-electric':'predator-contact',damage,stun,owner:e,sourceBoss:e.boss===true});
  if(stun>0&&p.stunTime>0)p.stunStyle='electric';return true;
 }
 function head(e,c){return {x:e.x+(e.dir||1)*e.w*.4,y:e.y-e.h*.5,w:c.headWidth,h:c.headHeight};}
 function hammerhead(g,e,dt){
  const c=cfg().hammerhead,p=g.player;
  if(e.predatorState==='ram-warning'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.predatorTimer;
   if(e.predatorTimer<=EPS){const dx=e.predatorTargetX-e.x,dy=e.predatorTargetY-e.y,d=Math.max(1,Math.hypot(dx,dy));e.vx=dx/d*c.dashSpeed;e.vy=dy/d*c.dashSpeed;e.dir=Math.sign(dx)||e.dir;e.predatorState='ram';e.predatorTimer=c.dashTime;clear(e);}
  }else if(e.predatorState==='ram'){
   const from=head(e,c),elapsed=Math.min(dt,Math.max(0,e.predatorTimer));e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;bound(e);e.predatorTimer=Math.max(0,e.predatorTimer-dt);
   const to=head(e,c);if(!e.predatorHit&&sweptBox(p,from.x,from.y,to.x,to.y,to.w,to.h))e.predatorHit=acceptedContact(g,e,c.ramDamage);
   e.predatorProgress=1-e.predatorTimer/c.dashTime;
   if(e.predatorTimer<=EPS){e.predatorState='recover';e.predatorTimer=c.recovery;}
  }else{
   if(e.predatorState==='recover'){e.predatorTimer=Math.max(0,e.predatorTimer-dt);if(e.predatorTimer<=EPS)e.predatorState='patrol';}
   const detected=Math.hypot(p.x-e.x,p.y-e.y)<=c.detectRange;
   if(e.predatorState==='patrol'&&detected&&e.predatorClock+EPS>=e.predatorNextAttack){
    e.predatorState='ram-warning';e.predatorTimer=c.warning;e.predatorNextAttack=e.predatorClock+c.ramCooldown;e.predatorHit=false;e.predatorCasts++;
    e.predatorTargetX=p.x;e.predatorTargetY=p.y-p.h*.5+e.h*.5;e.dir=Math.sign(p.x-e.x)||e.dir;warn(e,'ĐẦU BÚA · NÉ CÚ HÚC',c.warning);
   }else{
    const target=detected?p.x:e.dir<0?a().edge+e.w/2:a().width-a().edge-e.w/2;
    steer(e,target,detected?p.y-p.h*.5+e.h*.5:a().centerY,e.speed||cfg().enemies.hammerhead.speed,dt);
    if(!detected&&(e.x<=a().edge+e.w/2+1||e.x>=a().width-a().edge-e.w/2-1))e.dir*=-1;
   }
  }
 }
 function ray(g,e,dt){
  const c=cfg().electricRay,p=g.player;
  if(e.predatorState==='electric-warning'){
   e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.predatorTimer;
   if(e.predatorTimer<=EPS){
    const x=e.x+(e.dir||1)*e.w*.35,y=e.y-e.h*.5,angle=Math.atan2(e.predatorTargetY-y,e.predatorTargetX-x);
    (g.waterShots||=[]).push({kind:'predator-electric',owner:e,sourceBoss:e.boss===true,x,y,vx:Math.cos(angle)*c.projectileSpeed,vy:Math.sin(angle)*c.projectileSpeed,
     w:c.projectileWidth,h:c.projectileWidth,range:c.range,travelled:0,life:c.projectileLife,damage:c.damage,stun:c.stun});
    e.predatorState='patrol';clear(e);g.sound?.play('shot');
   }return;
  }
  const dx=p.x-e.x,dy=p.y-p.h*.5-(e.y-e.h*.5),distance=Math.hypot(dx,dy);e.dir=Math.sign(dx)||e.dir;
  if(distance<=c.range&&e.predatorClock+EPS>=e.predatorNextAttack){
   e.predatorState='electric-warning';e.predatorTimer=c.warning;e.predatorNextAttack=e.predatorClock+c.cooldown;e.predatorCasts++;
   e.predatorTargetX=p.x;e.predatorTargetY=p.y-p.h*.5;e.vx=e.vy=0;warn(e,'CÁ ĐUỐI · NÉ LUỒNG ĐIỆN',c.warning);
  }else steer(e,e.x+(Math.sign(dx)||1)*(distance<c.preferredDistance?-1:1)*e.w,a().centerY+Math.sin(e.predatorClock)*MM.UnderwaterConfig.swim.bob,e.speed||cfg().enemies.electricRay.speed,dt);
 }
 function swordfish(g,e,dt){
  const c=cfg().swordfish,from=e.x+e.predatorDirection*e.w*.45,y=e.y-e.h*.5;
  e.dir=e.predatorDirection;e.vx=e.predatorDirection*c.speed;e.vy=0;e.x+=e.vx*dt;e.predatorTimer=Math.max(0,e.predatorTimer-dt);e.predatorProgress=1-e.predatorTimer/c.attackWindow;
  if(!e.predatorHit&&sweptBox(g.player,from,y,e.x+e.predatorDirection*e.w*.45,y,c.tipWidth,c.tipHeight))e.predatorHit=acceptedContact(g,e,c.damage);
  if(e.predatorTimer<=EPS||(e.predatorDirection>0?e.x-e.w/2>a().width:e.x+e.w/2<0)){e.retired=true;e.dead=true;e.noLoot=true;clear(e);}
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.predatorInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.phase==='warning'){
   e.warning=Math.max(0,(e.warning||0)-dt);if(kind(e)==='swordfish'){e.predatorTimer=e.warning;if(e.skillWarning)e.skillWarning.remaining=e.warning;}
   if(e.warning<=EPS){e.phase='active';if(kind(e)==='swordfish'){e.predatorState='pass';e.predatorTimer=cfg().swordfish.attackWindow;clear(e);}else bound(e);}return true;
  }
  if(e.phase!=='active')return true;
  // A passing hazard must always leave the arena, even if a passive skill
  // attempts to freeze it; ordinary fish retain normal petrification rules.
  if(kind(e)!=='swordfish'&&(e.petrifiedTime>0||MM.SkillManager?.frozen?.(e)))return true;
  e.predatorClock+=dt;if(kind(e)==='hammerhead')hammerhead(g,e,dt);else if(kind(e)==='electricRay')ray(g,e,dt);else swordfish(g,e,dt);return true;
 }
 function update(g,dt){
  if(!active(g)||g.screen!=='playing')return;
  for(const shot of g.waterShots||[]){
   if(shot.kind!=='predator-electric'||shot.life<=0)continue;
   const fromX=shot.x,fromY=shot.y,speed=Math.hypot(shot.vx,shot.vy),distance=Math.min(speed*dt,Math.max(0,shot.range-shot.travelled)),elapsed=distance/Math.max(1,speed);
   shot.x+=shot.vx*elapsed;shot.y+=shot.vy*elapsed;shot.travelled+=distance;shot.life-=dt;
   if(sweptBox(g.player,fromX,fromY,shot.x,shot.y,shot.w,shot.h)&&acceptedContact(g,shot.owner,shot.damage,shot.stun)){shot.life=0;g.burst?.(shot.x,shot.y,'#baadff',10,'ring');}
   if(shot.travelled+EPS>=shot.range||shot.x<0||shot.x>a().width||shot.y<0||shot.y>a().height)shot.life=0;
  }
  g.waterShots=(g.waterShots||[]).filter(shot=>shot.life>0);
  // Passing fish retire without calling killEnemy: discard their hitboxes now
  // rather than retaining an ever-growing list until another enemy is killed.
  g.enemies=(g.enemies||[]).filter(e=>kind(e)!=='swordfish'||(!e.dead&&!e.retired));
  if(!g.level.hazardTypes?.includes('swordfish'))return;
  const runtime=g.underwater,c=cfg().swordfish;runtime.predatorHazardTimer=(Number.isFinite(runtime.predatorHazardTimer)?runtime.predatorHazardTimer:c.spawnInterval)-dt;
  if(runtime.predatorHazardTimer>EPS)return;
  if((g.enemies||[]).filter(e=>kind(e)==='swordfish'&&alive(e)).length>=c.spawnCap){runtime.predatorHazardTimer=.5;return;}
  g.spawn?.('swordfish');runtime.predatorHazardTimer=c.spawnInterval;
 }
 function hit(){return undefined;}
 function beforeKill(){return true;}
 function reset(g){
  g.waterShots=(g.waterShots||[]).filter(s=>s.kind!=='predator-electric');
  for(const e of g.enemies||[])if(owns(e)){clear(e);if(kind(e)==='swordfish'){e.dead=true;e.retired=true;e.noLoot=true;}}
  g.enemies=(g.enemies||[]).filter(e=>kind(e)!=='swordfish');
  if(g.underwater)g.underwater.predatorHazardTimer=cfg().swordfish.spawnInterval;
 }
 MM.PredatorSeaEnemies={owns,setup,updateEnemy,update,hit,beforeKill,reset,sweptBox};
})(typeof window!=='undefined'?window:globalThis);
