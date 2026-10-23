/* Bottom wildlife, independent pearls, bounded ink and telegraphed vents. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.FinalSeaConfig,a=()=>MM.UnderwaterConfig.arena;
 const kind=e=>e?.archetype||e?.type,owns=(first,second)=>['seaCrab','pearlClam','anglerFish','giantSquid','seaTurtle'].includes(kind(second||first));
 const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id>=191&&g.level.id<=200;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const center=p=>({x:p.x,y:p.y-p.h*.5});
 const overlap=(p,z)=>Math.abs(p.x-z.x)<(p.w+z.w)*.5&&p.y>z.y-z.h*.5&&p.y-p.h<z.y+z.h*.5;
 function state(g){return g.finalSea&&g.finalSea.level===g.level?.id?g.finalSea:reset(g);}
 function reset(g){g.finalSea={level:g.level?.id,clock:0,vents:[],inkClouds:[],boosted:false,ambientSpawned:false,turtleTimer:cfg().turtle.spawnInterval,bugTimer:cfg().glowBug.spawnInterval};return g.finalSea;}
 function warn(e,label,time){e.tell=true;e.skillWarning={name:label,remaining:time,total:time};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function bounds(e){e.x=clamp(e.x,a().edge+e.w*.5,a().width-a().edge-e.w*.5);e.y=clamp(e.y,Math.max(a().minY,e.h+12),a().maxY);}
 function move(e,tx,ty,speed,dt){const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,speed*dt);e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=dx/d*step;e.y+=dy/d*step;bounds(e);if(Math.abs(dx)>1)e.dir=Math.sign(dx);}
 function setup(g,e){
  if(!owns(e))return false;state(g);e.finalInitialized=true;e.finalClock=e.finalTimer=e.finalProgress=0;e.finalState='patrol';e.finalNextAttack=0;e.finalHit=false;e.finalCasts=0;e.vx=e.vy=0;e.airborne=true;
  e.y=kind(e)==='seaCrab'||kind(e)==='pearlClam'?cfg().clam.floorY:a().centerY;bounds(e);
  if(kind(e)==='pearlClam'){e.finalSeaHazard=true;e.indestructible=e.bulletUntargetable=e.petrifyImmune=e.noLoot=true;e.phase='active';e.warning=0;e.pearlAvailable=true;e.pearlElapsed=0;e.clamOpen=true;e.clamCloseCount=e.pearlCollections=0;e.y=cfg().clam.floorY;}
  if(kind(e)==='seaTurtle'){e.finalSeaHazard=true;e.minion=true;e.noLoot=true;e.finalDirection=e.dir<0?-1:1;e.x=e.finalDirection>0?-e.w*.5:a().width+e.w*.5;e.y=cfg().turtle.lanes[Math.floor((g.random?.()??.5)*cfg().turtle.lanes.length)%cfg().turtle.lanes.length];}
  return true;
 }
 function contact(g,e,damage,stun=0,environment=false){
  const p=g.player;if(g.screen!=='playing'||p.rollTime>0||p.invulnerable>EPS)return false;
  g.applyCombatEffect?.({kind:environment?'hydrothermal-vent':'bottom-'+kind(e),damage,stun,...(!environment?{owner:e,sourceBoss:false}:{environment:true})});return true;
 }
 function boxAtMouth(e,c){return {x:e.x+(e.dir||1)*e.w*.43,y:e.y-e.h*.5,w:c.mouthWidth,h:c.mouthHeight};}
 function begin(e,name,c,label){e.finalState=name+'-warning';e.finalTimer=c.warning;e.finalProgress=0;e.finalHit=false;e.finalCasts++;warn(e,label,c.warning);}
 function advanceWarning(e,c,dt,name){e.finalTimer=Math.max(0,e.finalTimer-dt);e.finalProgress=1-e.finalTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.finalTimer;if(e.finalTimer<=EPS){e.finalState=name;e.finalTimer=c.active||c.dashTime;clear(e);} }
 function crab(g,e,dt){
  const c=cfg().crab,p=g.player,pc=center(p);e.y=cfg().clam.floorY;
  if(e.finalState==='claw-warning'){advanceWarning(e,c,dt,'claw');return;}
  if(e.finalState==='claw'){
   const claws=[-1,1].map(dir=>({x:e.x+dir*e.w*.5,y:e.y-e.h*.65,w:c.clawWidth,h:c.clawHeight}));
   if(!e.finalHit&&claws.some(z=>overlap(p,z)))e.finalHit=contact(g,e,c.damage);
   e.finalTimer=Math.max(0,e.finalTimer-dt);e.finalProgress=1-e.finalTimer/c.active;
   if(e.finalTimer<=EPS){e.finalState='recover';e.finalTimer=c.recover;}return;
  }
  if(e.finalState==='recover'){e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS)e.finalState='patrol';return;}
  if(Math.hypot(pc.x-e.x,pc.y-(e.y-e.h*.5))<c.range&&e.finalClock+EPS>=e.finalNextAttack){begin(e,'claw',c,'CUA BIỂN · SONG CÀNG');e.finalNextAttack=e.finalClock+c.cooldown;}
  else {e.vx=(e.dir||1)*(e.speed||cfg().enemies.seaCrab.speed);e.x+=e.vx*dt;const edge=a().edge+e.w*.5;if(e.x<edge||e.x>a().width-edge)e.dir*=-1;e.x=clamp(e.x,edge,a().width-edge);}
 }
 function clam(g,e,dt){
  const c=cfg().clam,p=g.player,pearl={x:e.x,y:e.y-e.h*.55};
  if(e.pearlAvailable){
   if(Math.hypot(p.x-pearl.x,p.y-p.h*.5-pearl.y)<=c.pearlRadius+p.w*.45){
    e.pearlAvailable=false;e.pearlElapsed=0;e.pearlCollections++;e.clamOpen=true;
    const s=g.underwater;s.oxygen=Math.min(s.maxOxygen||MM.UnderwaterConfig.oxygen.capacity,s.oxygen+c.oxygen);MM.UnderwaterMode?.oxygenChanged(g);
    g.floating?.(pearl.x,pearl.y,'+'+c.oxygen+' OXY','#9ff9fa');g.sound?.play('ammo');warn(e,'VỎ TRAI ĐÓNG SAU 2 GIÂY',c.closeDelay);g.updateUI?.();
   }return;
  }
  e.pearlElapsed+=dt;
  if(e.clamOpen&&e.pearlElapsed+EPS>=c.closeDelay){
   e.clamOpen=false;e.clamCloseCount++;clear(e);
   // No invented crushing damage or imprisonment: resolve the overlap by
   // pushing the player above the shell into a valid free-swim position.
   if(overlap(p,{x:e.x,y:e.y-e.h*.5,w:e.w,h:e.h})){p.y=clamp(e.y-e.h-8,p.h+18,a().maxY);p.vy=Math.min(0,p.vy||0);p.swimAnchorY=p.y;}
  }else if(e.skillWarning)e.skillWarning.remaining=Math.max(0,c.closeDelay-e.pearlElapsed);
  if(e.pearlElapsed+EPS>=c.regrowDelay){e.pearlAvailable=true;e.clamOpen=true;e.pearlElapsed=0;clear(e);}
 }
 function angler(g,e,dt){
  const c=cfg().angler,p=g.player,pc=center(p);
  if(e.finalState==='bite-warning'){advanceWarning(e,c,dt,'bite');e.lureRetract=e.finalProgress;return;}
  if(e.finalState==='bite'){
   const from=boxAtMouth(e,c);e.vx=Math.cos(e.finalAngle)*c.dashSpeed;e.vy=Math.sin(e.finalAngle)*c.dashSpeed;e.x+=e.vx*dt;e.y+=e.vy*dt;bounds(e);
   const to=boxAtMouth(e,c);if(!e.finalHit&&(MM.PredatorSeaEnemies?.sweptBox?.(p,from.x,from.y,to.x,to.y,c.mouthWidth,c.mouthHeight)||overlap(p,to)))e.finalHit=contact(g,e,c.damage);
   e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS){e.finalState='recover';e.finalTimer=c.recover;}return;
  }
  if(e.finalState==='recover'){e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS){e.finalState='patrol';e.lureRetract=0;}return;}
  const mouth=boxAtMouth(e,c),lureX=mouth.x+(e.dir||1)*45,lureY=mouth.y-35;
  if(Math.hypot(pc.x-lureX,pc.y-lureY)<c.detectRange&&e.finalClock+EPS>=e.finalNextAttack){e.dir=Math.sign(pc.x-e.x)||e.dir;e.finalAngle=Math.atan2(pc.y-(e.y-e.h*.5),pc.x-e.x);begin(e,'bite',c,'CÁ CẦN CÂU · MỒI NHỬ THU VỀ');e.finalNextAttack=e.finalClock+c.cooldown;}
  else{e.vx=(e.dir||1)*(e.speed||cfg().enemies.anglerFish.speed)*.35;e.x+=e.vx*dt;bounds(e);if(e.x<=a().edge+e.w*.5+1||e.x>=a().width-a().edge-e.w*.5-1)e.dir*=-1;}
 }
 function squid(g,e,dt){
  const c=cfg().squid,p=g.player,pc=center(p);
  if(e.finalState==='flee'){
   move(e,e.finalFleeX,e.finalFleeY,c.fleeSpeed,dt);e.finalTimer=Math.max(0,e.finalTimer-dt);e.finalProgress=1-e.finalTimer/c.fleeDuration;
   if(e.finalTimer<=EPS){e.finalState='patrol';e.finalNextAttack=e.finalClock+c.cooldown;}return;
  }
  if(e.finalState==='tentacle-warning'){advanceWarning(e,c,dt,'tentacle');return;}
  if(e.finalState==='tentacle'){
   const z={x:e.finalTargetX,y:e.finalTargetY,w:c.tentacleWidth,h:c.tentacleHeight};
   if(!e.finalHit&&overlap(p,z))e.finalHit=contact(g,e,1);
   e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS){e.finalState='recover';e.finalTimer=c.recover;}return;
  }
  if(e.finalState==='recover'){e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS)e.finalState='patrol';return;}
  if(Math.hypot(pc.x-e.x,pc.y-(e.y-e.h*.5))<c.range&&e.finalClock+EPS>=e.finalNextAttack){e.finalTargetX=pc.x;e.finalTargetY=pc.y;begin(e,'tentacle',c,'MỰC ỐNG · NÉ XÚC TU');e.finalNextAttack=e.finalClock+c.cooldown;}
  else move(e,p.x,p.y-p.h*.5+e.h*.5,e.speed||cfg().enemies.giantSquid.speed,dt);
 }
 function turtle(g,e,dt){
  const c=cfg().turtle,p=g.player;e.dir=e.finalDirection;
  if(e.finalState==='bite-warning'){advanceWarning(e,c,dt,'bite');return;}
  if(e.finalState==='bite'){
   if(!e.finalHit&&overlap(p,boxAtMouth(e,c)))e.finalHit=contact(g,e,c.damage);
   e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS){e.finalState='recover';e.finalTimer=c.recover;}return;
  }
  if(e.finalState==='recover'){e.finalTimer=Math.max(0,e.finalTimer-dt);if(e.finalTimer<=EPS)e.finalState='patrol';}
  else if(Math.hypot(p.x-boxAtMouth(e,c).x,p.y-p.h*.5-boxAtMouth(e,c).y)<c.range&&e.finalClock+EPS>=e.finalNextAttack){begin(e,'bite',c,'RÙA BIỂN · RỜI XA MIỆNG');e.finalNextAttack=e.finalClock+c.cooldown;return;}
  e.vx=e.finalDirection*(e.speed||cfg().enemies.seaTurtle.speed);e.x+=e.vx*dt;
  if(e.finalDirection>0?e.x-e.w*.5>a().width:e.x+e.w*.5<0){e.dead=e.retired=true;e.noLoot=true;clear(e);}
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.finalInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';if(kind(e)!=='seaTurtle')bounds(e);}return true;}
  if(e.phase!=='active'||kind(e)!=='pearlClam'&&kind(e)!=='seaTurtle'&&MM.SkillManager?.frozen?.(e))return true;
  e.finalClock+=dt;({seaCrab:crab,pearlClam:clam,anglerFish:angler,giantSquid:squid,seaTurtle:turtle})[kind(e)](g,e,dt);return true;
 }
 function hit(g,e,damage,attack={}){
  if(!owns(e))return undefined;if(kind(e)==='pearlClam')return false;
  if(kind(e)!=='giantSquid')return undefined;
  const before=e.health;if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);else e.health=Math.max(0,e.health-damage);
  if(e.health>0&&before>e.health&&e.finalState!=='flee'){
   const s=state(g),c=cfg().squid;s.inkClouds.push({x:e.x,y:e.y-e.h*.5,radius:c.inkRadius,life:c.inkLife,total:c.inkLife,owner:e});
   if(s.inkClouds.length>c.inkLimit)s.inkClouds.splice(0,s.inkClouds.length-c.inkLimit);
   e.finalState='flee';e.finalTimer=c.fleeDuration;e.finalProgress=0;e.finalFleeX=clamp(e.x+(e.x<480?1:-1)*260,a().edge+e.w*.5,a().width-a().edge-e.w*.5);
   e.finalFleeY=clamp(e.y+(e.y<290?90:-90),e.h+18,a().maxY);clear(e);g.burst?.(e.x,e.y-e.h*.5,'#192733',12,'ring');
  }return true;
 }
 function beforeKill(g,e){return kind(e)!=='pearlClam';}
 function makeVents(g){const s=state(g),c=cfg().vents;s.vents=c.positions.map((x,i)=>({kind:'hydrothermal-vent',x,y:c.floorY,w:c.width,h:c.height,phase:'idle',timer:c.interval*(i+1)/c.positions.length,total:0,hit:false,damage:c.damage,stun:1}));}
 function updateVents(g,dt){
  const s=state(g),c=cfg().vents;
  for(const z of s.vents){
   z.timer=Math.max(0,z.timer-dt);
   if(z.phase==='idle'&&z.timer<=EPS){
    const max=s.boosted?c.boostedMaxActive:c.maxActive;
    if(s.vents.filter(v=>v!==z&&v.phase!=='idle').length>=max){z.timer=.5;continue;}
    z.phase='warning';z.timer=z.total=c.warning;z.hit=false;z.damage=s.boosted?c.boostedDamage:c.damage;
   }else if(z.phase==='warning'&&z.timer<=EPS){z.phase='active';z.timer=z.total=c.active;}
   else if(z.phase==='active'){
    const box={x:z.x,y:z.y-z.h*.5,w:z.w,h:z.h};
    if(!z.hit&&overlap(g.player,box))z.hit=contact(g,null,z.damage,1,true);
    if(z.timer<=EPS){z.phase='idle';z.timer=s.boosted?c.boostedInterval:c.interval;}
   }
  }
 }
 function update(g,dt){
  if(!active(g)||g.screen!=='playing')return;const s=state(g);s.clock+=dt;
  if(!s.ambientSpawned){s.ambientSpawned=true;makeVents(g);for(const x of cfg().clam.spawnX){const e=g.spawn?.('pearlClam');if(e){if(!e.finalInitialized)setup(g,e);e.x=x;}}}
  s.inkClouds.forEach(cloud=>cloud.life-=dt);s.inkClouds=s.inkClouds.filter(cloud=>cloud.life>0);updateVents(g,dt);
  if(g.level.id>=197){s.turtleTimer-=dt;if(s.turtleTimer<=EPS){if((g.enemies||[]).filter(e=>kind(e)==='seaTurtle'&&alive(e)).length<cfg().turtle.spawnCap)g.spawn?.('seaTurtle');s.turtleTimer=cfg().turtle.spawnInterval;}}
  if(g.level.id>=194){s.bugTimer-=dt;if(s.bugTimer<=EPS){if((g.enemies||[]).filter(e=>kind(e)==='glowBug'&&alive(e)).length<cfg().glowBug.spawnCap){const e=g.spawn?.('glowBug');if(e){e.minion=true;e.finalExtraBug=true;}}s.bugTimer=cfg().glowBug.spawnInterval;}}
 }
 function boostVents(g){const s=state(g);if(s.boosted)return false;s.boosted=true;for(const z of s.vents){z.damage=cfg().vents.boostedDamage;if(z.phase==='idle')z.timer=Math.min(z.timer,cfg().vents.boostedInterval);}return true;}
 function stop(g){if(g.finalSea){g.finalSea.vents=[];g.finalSea.inkClouds=[];g.finalSea.boosted=false;}for(const e of g.enemies||[])if(owns(e)){clear(e);if(e.finalSeaHazard)e.dead=e.retired=true;}}
 MM.FinalSeaEnemies={owns,active,state,reset,stop,setup,updateEnemy,update,hit,beforeKill,boostVents,updateVents,overlap};
})(typeof window!=='undefined'?window:globalThis);
