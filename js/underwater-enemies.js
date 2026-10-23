/* Shallow-water wildlife. Owns only the three aquatic ordinary enemies. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const types=new Set(['piranha','pufferfish','seahorse']);
  const config=()=>MM.UnderwaterConfig;
  const kind=e=>e?.archetype||e?.type;
  const owns=(first,second)=>types.has(kind(second||first));
  const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
  const active=g=>MM.UnderwaterMode?.active?.(g)??(g.level?.underwater===true||g.level?.id>=151&&g.level?.id<=160);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&a.y>b.y-b.h&&a.y-a.h<b.y;
  const frozen=e=>e.petrifiedTime>0||MM.SkillManager?.frozen?.(e);
  function bound(e){const a=config().arena;e.x=clamp(e.x,a.edge+e.w/2,a.width-a.edge-e.w/2);e.y=clamp(e.y,Math.max(a.minY,e.h+12),a.maxY);}
  function warn(e,name,duration){e.tell=true;e.skillWarning={name,remaining:duration,total:duration};}
  function unTell(e){e.tell=false;e.skillWarning=null;}
  function setup(g,e){
    if(!owns(e))return false;
    e.waterInitialized=true;e.waterState='patrol';e.waterClock=0;e.waterTimer=0;e.waterProgress=0;
    e.waterBaseW=e.baseW||e.w;e.waterBaseH=e.baseH||e.h;e.waterBaseY=config().arena.centerY;
    e.y=e.waterBaseY;e.vx=e.vy=0;e.airborne=true;e.inflation=0;e.waterInflating=false;e.waterContactCooldown=0;
    e.waterNextAttack=kind(e)==='piranha'?config().piranha.dashCooldown:config().seahorse.cooldown;
    return true;
  }
  function steer(e,tx,ty,speed,dt){
    const dx=tx-e.x,dy=ty-e.y,length=Math.max(1,Math.hypot(dx,dy));
    const blend=1-Math.exp(-config().swim.drag*dt);
    e.vx+=(dx/length*speed-e.vx)*blend;e.vy+=(dy/length*speed-e.vy)*blend;
    e.x+=e.vx*dt;e.y+=e.vy*dt;
    if(Math.abs(e.vx)>1)e.dir=e.vx<0?-1:1;
    bound(e);
  }
  function contact(g,e,damage,knockback=0){
    const p=g.player;if(e.waterContactCooldown>EPS||!overlaps({...p,w:p.w*.8,h:p.h*.9},e))return false;
    const before=p.health;
    g.applyCombatEffect?.({kind:'water-contact',damage,x:e.x,y:e.y,owner:e,sourceBoss:e.boss===true});
    if(p.health<before){
      if(knockback)p.vx=(Math.sign(p.x-e.x)||-(e.dir||1))*knockback;
      g.burst?.(p.x,p.y-p.h*.5,'#86e6ed',8,'ring');
    }
    if(kind(e)==='pufferfish')e.waterContactCooldown=config().pufferfish.contactImmunity;
    return p.health<before;
  }
  function piranha(g,e,dt){
    const c=config().piranha,p=g.player;
    if(e.waterState==='windup'){
      e.waterTimer-=dt;e.waterProgress=clamp(1-e.waterTimer/c.warning,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.waterTimer);
      if(e.waterTimer<=EPS){
        const dx=e.waterTargetX-e.x,dy=e.waterTargetY-e.y,length=Math.max(1,Math.hypot(dx,dy));
        e.waterState='dash';e.waterTimer=c.dashTime;e.vx=dx/length*c.dashSpeed;e.vy=dy/length*c.dashSpeed;
        e.dir=Math.sign(e.vx)||e.dir;unTell(e);
      }
    }else if(e.waterState==='dash'){
      const elapsed=Math.min(dt,Math.max(0,e.waterTimer));e.waterTimer-=dt;e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;bound(e);
      e.waterProgress=clamp(1-e.waterTimer/c.dashTime,0,1);
      if(e.waterTimer<=EPS){e.waterState='recover';e.waterTimer=c.recovery;e.waterNextAttack=e.waterClock+c.dashCooldown;}
    }else if(e.waterState==='recover'){
      e.waterTimer-=dt;steer(e,e.x+(e.dir||1)*e.w,e.waterBaseY,e.speed||config().enemies.piranha.speed,dt);
      if(e.waterTimer<=EPS)e.waterState='patrol';
    }else{
      const detected=Math.hypot(p.x-e.x,p.y-e.y)<=c.detectRange;
      if(detected&&e.waterClock+EPS>=e.waterNextAttack){
        e.waterState='windup';e.waterTimer=c.warning;e.waterTargetX=p.x;e.waterTargetY=p.y;e.waterProgress=0;
        e.dir=Math.sign(p.x-e.x)||e.dir;warn(e,'CÁ PIRANHA · LAO TỚI',c.warning);
      }else{
        e.waterState=detected?'chase':'patrol';
        const a=config().arena,target=detected?p.x:e.dir<0?a.edge+e.w/2:a.width-a.edge-e.w/2;
        steer(e,target,detected?p.y:e.waterBaseY+Math.sin(e.waterClock)*config().swim.bob,e.speed||config().enemies.piranha.speed,dt);
        if(!detected&&(e.x<=a.edge+e.w/2+1||e.x>=a.width-a.edge-e.w/2-1))e.dir*=-1;
      }
    }
    contact(g,e,c.damage);
  }
  function pufferfish(g,e,dt){
    const c=config().pufferfish,p=g.player,distance=Math.hypot(p.x-e.x,p.y-p.h*.5-(e.y-e.h*.5));
    if(distance<=c.warningRange)e.waterInflating=true;
    else if(distance>=c.releaseRange)e.waterInflating=false;
    const center=e.y-e.h*.5,target=e.waterInflating?1:0;
    e.inflation+=(target-e.inflation)*(1-Math.exp(-c.inflateRate*dt));
    if(Math.abs(e.inflation-target)<1e-5)e.inflation=target;
    const scale=1+(c.inflateScale-1)*e.inflation;
    e.w=e.waterBaseW*scale;e.h=e.waterBaseH*scale;e.y=center+e.h*.5;
    e.waterState=e.waterInflating?'inflating':'patrol';e.waterProgress=e.inflation;
    e.tell=e.waterInflating&&e.inflation<.9;
    if(e.tell)e.skillWarning={name:'CÁ NÓC · PHỒNG GAI',remaining:(1-e.inflation)/c.inflateRate,total:1/c.inflateRate};else e.skillWarning=null;
    const a=config().arena;e.vx=(e.dir||1)*(e.speed||config().enemies.pufferfish.speed);
    e.x+=e.vx*dt;e.y+=Math.cos(e.waterClock*config().swim.bobRate)*config().swim.bob*dt;
    if(e.x<=a.edge+e.w/2||e.x>=a.width-a.edge-e.w/2)e.dir*=-1;bound(e);
    if(e.inflation>EPS)contact(g,e,c.damage,c.knockback);
  }
  function firePressure(g,e){
    const c=config().seahorse,x=e.x+(e.dir||1)*e.w*.45,y=e.y-e.h*.55;
    const angle=Math.atan2(e.waterTargetY-y,e.waterTargetX-x);
    (g.waterShots||=[]).push({kind:'water-pressure',owner:e,x,y,previousX:x,previousY:y,
      vx:Math.cos(angle)*c.projectileSpeed,vy:Math.sin(angle)*c.projectileSpeed,w:20,h:10,
      life:c.projectileLife,range:c.range,travelled:0,damage:c.projectileDamage});
    g.burst?.(x,y,'#a8f4ff',5,'ring');g.sound?.play('shot');
  }
  function seahorse(g,e,dt){
    const c=config().seahorse,p=g.player;
    if(e.waterState==='windup'){
      e.waterTimer-=dt;e.waterProgress=clamp(1-e.waterTimer/c.warning,0,1);
      if(e.skillWarning)e.skillWarning.remaining=Math.max(0,e.waterTimer);
      if(e.waterTimer<=EPS){firePressure(g,e);e.waterState='patrol';e.waterNextAttack=e.waterClock+c.cooldown;unTell(e);}
      return;
    }
    const dx=p.x-e.x,dy=p.y-p.h*.5-(e.y-e.h*.5),distance=Math.hypot(dx,dy);
    e.dir=Math.sign(dx)||e.dir;
    if(distance<=c.range&&e.waterClock+EPS>=e.waterNextAttack){
      e.waterState='windup';e.waterTimer=c.warning;e.waterProgress=0;e.waterTargetX=p.x;e.waterTargetY=p.y-p.h*.5;
      e.vx=e.vy=0;warn(e,'CÁ NGỰA · NÉ TIA ÁP SUẤT',c.warning);
    }else{
      const direction=distance<c.preferredDistance?-1:1;
      steer(e,e.x+Math.sign(dx||1)*direction*e.w,e.waterBaseY,e.speed||config().enemies.seahorse.speed,dt);
    }
  }
  function updateEnemy(g,e,dt){
    if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;
    if(!e.waterInitialized)setup(g,e);if(frozen(e))return true;
    e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
    if(e.phase==='warning'){
      e.warning=Math.max(0,(e.warning||0)-dt);e.y=e.waterBaseY;
      if(e.warning<=EPS){e.phase='active';bound(e);}return true;
    }
    if(e.phase!=='active')return true;
    e.waterClock+=dt;e.waterContactCooldown=Math.max(0,e.waterContactCooldown-dt);
    if(kind(e)==='piranha')piranha(g,e,dt);
    else if(kind(e)==='pufferfish')pufferfish(g,e,dt);
    else seahorse(g,e,dt);
    return true;
  }
  function segmentHit(x0,y0,x1,y1,p){
    let near=0,far=1;
    for(const [start,delta,low,high] of [[x0,x1-x0,p.x-p.w*.45,p.x+p.w*.45],[y0,y1-y0,p.y-p.h,p.y]]){
      if(Math.abs(delta)<EPS){if(start<low||start>high)return false;continue;}
      const a=(low-start)/delta,b=(high-start)/delta;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
      if(near>far)return false;
    }return true;
  }
  function update(g,dt){
    if(!active(g)||g.screen!=='playing')return;
    for(const s of g.waterShots||[]){
      if(s.kind!=='water-pressure'||s.life<=0)continue;
      const distance=Math.hypot(s.vx,s.vy)*dt,left=Math.max(0,s.range-s.travelled);
      const elapsed=distance>left?dt*left/Math.max(distance,EPS):dt;
      s.previousX=s.x;s.previousY=s.y;s.x+=s.vx*elapsed;s.y+=s.vy*elapsed;s.travelled+=Math.min(distance,left);s.life-=dt;
      if(segmentHit(s.previousX,s.previousY,s.x,s.y,g.player)){
        g.applyCombatEffect?.({kind:'water-pressure',damage:s.damage,owner:s.owner,sourceBoss:s.owner?.boss===true});s.life=0;
        g.burst?.(s.x,s.y,'#b0f5ff',10,'ring');
      }else if(s.travelled+EPS>=s.range||s.x<0||s.x>config().arena.width||s.y<0||s.y>config().arena.height){
        s.life=0;g.burst?.(s.x,s.y,'#8cdbe8',4);
      }
    }
    g.waterShots=(g.waterShots||[]).filter(s=>s.life>0);
  }
  function hit(g,e){return owns(e)?undefined:undefined;}
  MM.UnderwaterEnemies={owns,setup,updateEnemy,update,hit};
})(typeof window!=='undefined'?window:globalThis);
