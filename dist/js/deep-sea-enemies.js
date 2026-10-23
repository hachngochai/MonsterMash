/* Deep-water wildlife. One attack owns one contact window and one damage event. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.DeepSeaConfig,a=()=>MM.UnderwaterConfig.arena,kind=e=>e?.archetype||e?.type;
 const owns=(first,second)=>['gulper','ghostShark','glowBug','leviathanChild'].includes(kind(second||first));
 const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id>=181&&g.level.id<=200;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const distance=(p,e)=>Math.hypot(p.x-e.x,p.y-p.h*.5-(e.y-e.h*.5));
 function warn(e,name,total){e.tell=true;e.skillWarning={name,total,remaining:total};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function setup(g,e){
  if(!owns(e))return false;e.deepInitialized=true;e.deepClock=0;e.deepState='patrol';e.deepTimer=e.deepProgress=0;
  e.deepHit=false;e.deepCasts=0;e.deepDetected=false;e.vx=e.vy=0;e.airborne=true;e.y=a().centerY;
  e.deepNextAttack=kind(e)==='gulper'?cfg().gulper.cooldown:kind(e)==='leviathanChild'?cfg().boss.childBiteCooldown:cfg().ghostShark.biteCooldown;
  if(kind(e)==='leviathanChild')e.minion=true;return true;
 }
 function bound(e){e.x=clamp(e.x,a().edge+e.w/2,a().width-a().edge-e.w/2);e.y=clamp(e.y,Math.max(a().minY,e.h+12),a().maxY);}
 function move(e,tx,ty,speed,dt){const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),blend=1-Math.exp(-5*dt);
  e.vx+=(dx/d*speed-e.vx)*blend;e.vy+=(dy/d*speed-e.vy)*blend;e.x+=e.vx*dt;e.y+=e.vy*dt;bound(e);if(Math.abs(e.vx)>1)e.dir=Math.sign(e.vx);}
 function mouth(e,c){return {x:e.x+(e.dir||1)*e.w*.41,y:e.y-e.h*.5,w:c.mouthWidth,h:c.mouthHeight};}
 function touches(p,b){return Math.abs(p.x-b.x)<(p.w+b.w)*.5&&p.y>b.y-b.h*.5&&p.y-p.h<b.y+b.h*.5;}
 function effect(g,e,damage){const p=g.player;if(p.rollTime>0||p.invulnerable>EPS||g.screen!=='playing')return false;
  g.applyCombatEffect?.({kind:'deep-bite',damage,owner:e,sourceBoss:!!(e.boss||e.summonOwner?.boss)});return true;}
 function pull(g,e,range,speed,dt){const p=g.player,b=mouth(e,cfg().gulper),dx=b.x-p.x,dy=b.y-(p.y-p.h*.5),d=Math.hypot(dx,dy);
  if(d>range||p.rollTime>0||p.shieldTime>0&&p.shieldHits>0)return false;
  const step=Math.min(speed*dt,Math.max(0,d-10));if(d>EPS){p.x=clamp(p.x+dx/d*step,28,a().width-28);p.y=clamp(p.y+dy/d*step,a().minY,a().maxY);}
  return true;}
 function gulper(g,e,dt){const c=cfg().gulper,p=g.player,range=c.rangeSteps*cfg().step;
  e.dir=Math.sign(p.x-e.x)||e.dir;
  if(e.deepState==='suction-warning'){
   e.deepTimer=Math.max(0,e.deepTimer-dt);e.deepProgress=1-e.deepTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.deepTimer;
   if(e.deepTimer<=EPS){e.deepState='suction';e.deepTimer=c.duration;clear(e);}return;
  }
  if(e.deepState==='suction'){
   e.deepTimer=Math.max(0,e.deepTimer-dt);e.deepProgress=1-e.deepTimer/c.duration;
   if(distance(p,e)<=range){pull(g,e,range,c.pullSpeed,dt);if(!e.deepHit&&touches(p,mouth(e,c)))e.deepHit=effect(g,e,c.damage);}
   if(e.deepTimer<=EPS){e.deepState='patrol';clear(e);}return;
  }
  if(distance(p,e)<=range&&e.deepClock+EPS>=e.deepNextAttack){e.deepState='suction-warning';e.deepTimer=c.warning;e.deepNextAttack=e.deepClock+c.cooldown;e.deepHit=false;e.deepCasts++;e.vx=e.vy=0;warn(e,'GULPER · RỜI KHỎI DÒNG HÚT',c.warning);}
  else{const side=Math.sign(p.x-e.x)||1;move(e,p.x-side*range*.65,a().centerY,e.speed||cfg().enemies.gulper.speed,dt);}
 }
 function shark(g,e,dt){const c=cfg().ghostShark,p=g.player,child=kind(e)==='leviathanChild',d=distance(p,e);
  const cd=child?cfg().boss.childBiteCooldown:c.biteCooldown,damage=child?(e.damage||cfg().boss.basicDamage):c.damage;
  if(e.deepState==='bite-warning'){
   e.deepTimer=Math.max(0,e.deepTimer-dt);e.deepProgress=1-e.deepTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.deepTimer;
   if(e.deepTimer<=EPS){const dx=e.deepTargetX-e.x,dy=e.deepTargetY-e.y,mag=Math.max(1,Math.hypot(dx,dy));e.vx=dx/mag*c.biteSpeed;e.vy=dy/mag*c.biteSpeed;e.deepState='bite';e.deepTimer=c.biteDuration;clear(e);}return;
  }
  if(e.deepState==='bite'){
   const from=mouth(e,c),elapsed=Math.min(dt,e.deepTimer);e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;bound(e);e.deepTimer=Math.max(0,e.deepTimer-dt);
   const to=mouth(e,c),hit=MM.PredatorSeaEnemies?.sweptBox?MM.PredatorSeaEnemies.sweptBox(p,from.x,from.y,to.x,to.y,to.w,to.h):touches(p,to);
   if(!e.deepHit&&hit)e.deepHit=effect(g,e,damage);if(e.deepTimer<=EPS)e.deepState='patrol';return;
  }
  e.deepDetected=child||d<=cfg().step*(e.deepDetected?c.loseSteps:c.detectSteps);
  if(e.deepDetected&&d<e.w*.7+p.w&&e.deepClock+EPS>=e.deepNextAttack){e.deepState='bite-warning';e.deepTimer=c.warning;e.deepNextAttack=e.deepClock+cd;e.deepCasts++;e.deepHit=false;
   e.deepTargetX=p.x;e.deepTargetY=p.y-p.h*.5+e.h*.5;e.dir=Math.sign(p.x-e.x)||e.dir;e.vx=e.vy=0;warn(e,child?'LEVIATHAN CON · NÉ HÀM CẮN':'CÁ MẬP MA · NÉ HÀM CẮN',c.warning);
  }else{
   const tx=e.deepDetected?p.x:e.dir<0?a().edge+e.w/2:a().width-a().edge-e.w/2;
   move(e,tx,e.deepDetected?p.y-p.h*.5+e.h*.5:a().centerY+Math.sin(e.deepClock)*8,e.speed||cfg().enemies.ghostShark.speed,dt);
   if(!e.deepDetected&&(e.x<=a().edge+e.w/2+1||e.x>=a().width-a().edge-e.w/2-1))e.dir*=-1;
  }
 }
 function bug(g,e,dt){const c=cfg().glowBug,p=g.player;
  if(e.deepState==='explode-warning'){
   e.deepTimer=Math.max(0,e.deepTimer-dt);e.deepProgress=1-e.deepTimer/c.warning;if(e.skillWarning)e.skillWarning.remaining=e.deepTimer;
   if(e.deepTimer<=EPS&&!e.deepExploded){e.deepExploded=true;e.deepHit=true;clear(e);
    if(distance(p,e)<=c.radius+p.w*.5)effect(g,e,c.damage);g.burst?.(e.x,e.y-e.h*.5,'#c2ffe2',18,'ring');
    e.health=0;e.deepSelfDestruct=true;g.killEnemy?.(e);if(!e.dead){e.dead=true;e.retired=true;}
   }return;
  }
  if(distance(p,e)<=c.triggerRange){e.deepState='explode-warning';e.deepTimer=c.warning;e.deepCasts++;e.vx=e.vy=0;warn(e,'BỌ PHÁT SÁNG · TRÁNH VÙNG NỔ',c.warning);}
  else move(e,p.x,p.y-p.h*.5+e.h*.5,e.speed||cfg().enemies.glowBug.speed,dt);
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;if(!e.deepInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';bound(e);}return true;}
  if(e.phase!=='active'||e.petrifiedTime>0||MM.SkillManager?.frozen?.(e))return true;
  e.deepClock+=dt;if(kind(e)==='gulper')gulper(g,e,dt);else if(kind(e)==='glowBug')bug(g,e,dt);else shark(g,e,dt);return true;
 }
 function update(g){if(!active(g)||g.screen!=='playing')return;g.enemies=(g.enemies||[]).filter(e=>!owns(e)||!e.retired);}
 function hit(g,e){if(!owns(e))return undefined;return kind(e)==='glowBug'&&cfg().glowBug.killable===false?false:undefined;}
 function reset(g){for(const e of g.enemies||[])if(owns(e)){clear(e);e.deepTimer=e.deepProgress=0;e.deepState='patrol';}}
 MM.DeepSeaEnemies={owns,setup,updateEnemy,update,hit,reset,mouth,touches,pull};
})(typeof window!=='undefined'?window:globalThis);
