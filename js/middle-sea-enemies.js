/* Middle-water swimmers and non-killable rising electrical hazards. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const cfg=()=>MM.MiddleSeaConfig,arena=()=>MM.UnderwaterConfig.arena;
  const kind=e=>e?.archetype||e?.type;
  const owns=(first,second)=>['babyShark','electricJellyfish'].includes(kind(second||first));
  const isJelly=e=>kind(e)==='electricJellyfish';
  const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
  const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id>=161&&g.level.id<=170;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const overlap=(p,z)=>Math.abs(p.x-z.x)<(p.w+z.w)*.5&&p.y>z.y-z.h&&p.y-p.h<z.y;
  function setup(g,e){
    if(!owns(e))return false;const a=arena();
    e.middleInitialized=true;e.middleClock=0;e.middleTimer=0;e.middleProgress=0;e.middleContactUsed=false;
    e.vx=e.vy=0;e.airborne=true;e.middlePulse=0;e.middleNextBite=cfg().shark.biteCooldown;
    if(isJelly(e)){
      e.middleSeaHazard=true;e.indestructible=true;e.bulletUntargetable=true;e.petrifyImmune=true;e.noLoot=true;
      e.middleState='rising';e.y=a.height+e.h;e.dir=1;
    }else{e.middleState='swim';e.y=a.centerY;}
    return true;
  }
  function warn(e,name,total){e.tell=true;e.skillWarning={name,remaining:total,total};}
  function clearWarning(e){e.tell=false;e.skillWarning=null;}
  function applyElectric(g,spec={}){
    const p=g.player;if(g.screen!=='playing'||p.rollTime>0||p.invulnerable>EPS)return false;
    const blocked=p.shieldTime>0&&p.shieldHits>0,before=p.stunTime;
    g.applyCombatEffect?.({kind:spec.kind||'middle-electric',damage:spec.damage||0,stun:spec.stun||0,
      stunLimit:spec.stunLimit||2,owner:spec.owner,sourceBoss:spec.sourceBoss});
    if(p.stunTime>before){p.electricStunGrace=Math.max(p.electricStunGrace||0,cfg().jellyfish.postStunGrace);p.stunStyle='electric';}
    if(spec.oxygenFraction>0&&(!blocked||!cfg().boss.shieldBlocksOxygen)&&g.underwater&&!MM.MerfolkTransformation?.protectsOxygen(g)){
      const basis=cfg().boss.oxygenBasis==='maximum'?g.underwater.maxOxygen:g.underwater.oxygen;
      g.underwater.oxygen=Math.max(0,g.underwater.oxygen-basis*spec.oxygenFraction);
      MM.UnderwaterMode?.oxygenChanged(g);
    }
    g.burst?.(p.x,p.y-p.h*.5,blocked?'#9ef5de':'#bfadff',12,'ring');g.updateUI?.();return true;
  }
  function steer(e,tx,ty,speed,dt){
    const dx=tx-e.x,dy=ty-e.y,length=Math.max(1,Math.hypot(dx,dy)),blend=1-Math.exp(-MM.UnderwaterConfig.swim.drag*dt);
    e.vx+=(dx/length*speed-e.vx)*blend;e.vy+=(dy/length*speed-e.vy)*blend;
    e.x+=e.vx*dt;e.y+=e.vy*dt;const a=arena();
    e.x=clamp(e.x,a.edge+e.w/2,a.width-a.edge-e.w/2);e.y=clamp(e.y,a.minY+e.h,a.maxY);
    if(Math.abs(e.vx)>1)e.dir=Math.sign(e.vx);
  }
  function shark(g,e,dt){
    const c=cfg().shark,p=g.player,a=arena(),dx=p.x-e.x,dy=p.y-p.h*.5-(e.y-e.h*.5);
    if(e.middleState==='bite-warning'){
      steer(e,p.x,p.y,e.speed||cfg().enemies.babyShark.speed,dt);
      e.middleTimer=Math.max(0,e.middleTimer-dt);e.middleProgress=1-e.middleTimer/c.biteWarning;
      if(e.skillWarning)e.skillWarning.remaining=e.middleTimer;
      if(e.middleTimer<=EPS){
        e.middleState='bite';e.middleTimer=c.biteLife;clearWarning(e);e.middleNextBite=e.middleClock+c.biteCooldown;
        const z={x:e.x+(e.dir||1)*(e.w*.35+c.biteRange*.2),y:e.y-e.h*.5+c.biteHeight*.5,w:c.biteRange,h:c.biteHeight};
        if(overlap(p,z)){g.applyCombatEffect?.({kind:'shark-bite',damage:c.biteDamage,owner:e,sourceBoss:false});g.burst?.(z.x,z.y-z.h*.5,'#b9ebee',8,'ring');}
      }
    }else{
      if(e.middleState==='bite'){e.middleTimer=Math.max(0,e.middleTimer-dt);if(e.middleTimer<=EPS)e.middleState='swim';}
      const detected=Math.hypot(dx,dy)<=c.detectRange;
      const tx=detected?p.x:e.dir<0?a.edge+e.w/2:a.width-a.edge-e.w/2;
      steer(e,tx,detected?p.y:a.centerY+Math.sin(e.middleClock)*MM.UnderwaterConfig.swim.bob,e.speed||cfg().enemies.babyShark.speed,dt);
      if(!detected&&(e.x<=a.edge+e.w/2+1||e.x>=a.width-a.edge-e.w/2-1))e.dir*=-1;
      if(e.middleState==='swim'&&Math.hypot(dx,dy)<=c.biteTriggerRange&&e.middleClock+EPS>=e.middleNextBite){
        e.middleState='bite-warning';e.middleTimer=c.biteWarning;e.middleProgress=0;e.dir=Math.sign(dx)||e.dir;
        warn(e,'CÁ MẬP CON · NÉ HÀM CẮN',c.biteWarning);
      }
    }
  }
  function jellyfish(g,e,dt){
    const c=cfg().jellyfish;e.vx=0;e.vy=-c.riseSpeed;e.y+=e.vy*dt;e.middlePulse=Math.sin(e.middleClock*c.pulseRate);
    if(!e.middleContactUsed&&overlap(g.player,e)){
      const accepted=applyElectric(g,{kind:'jelly-contact',owner:e.summonOwner||e,sourceBoss:!!e.summonedJelly,stun:e.summonedJelly?c.summonedStun:c.stun,
        oxygenFraction:e.summonedJelly?c.summonedOxygenFraction:0});
      if(accepted)e.middleContactUsed=true;
    }
    if(e.y<0){e.retired=true;e.dead=true;e.noLoot=true;e.skillWarning=null;}
  }
  function updateEnemy(g,e,dt){
    if(!owns(e))return false;if(!active(g)||!alive(e)||g.screen!=='playing')return true;
    if(!e.middleInitialized)setup(g,e);e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
    if(e.phase==='warning'){
      e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS)e.phase='active';return true;
    }
    if(e.phase!=='active')return true;
    // Electric hazards keep rising; petrification cannot turn an immortal
    // obstacle into a permanent wall. Other ordinary fish retain old skills.
    if(!isJelly(e)&&(e.petrifiedTime>0||MM.SkillManager?.frozen?.(e)))return true;
    e.middleClock+=dt;if(isJelly(e))jellyfish(g,e,dt);else shark(g,e,dt);return true;
  }
  function hit(g,e){return isJelly(e)?false:undefined;}
  function beforeKill(g,e){return !isJelly(e);}
  function update(g,dt){
    if(!active(g)||g.screen!=='playing'||!g.level.hazardTypes?.includes('electricJellyfish'))return;
    const s=g.underwater,c=cfg().jellyfish;s.middleHazardTimer-=dt;
    if(s.middleHazardTimer>EPS)return;
    const count=(g.enemies||[]).filter(e=>isJelly(e)&&alive(e)&&!e.summonedJelly).length;
    if(count>=c.spawnCap){s.middleHazardTimer=.5;return;}
    const e=g.spawn('electricJellyfish');e.x=70+(g.random?.()??Math.random())*(arena().width-140);s.middleHazardTimer=c.spawnInterval;
  }
  function reset(g){for(const e of g.enemies||[])if(isJelly(e)){e.retired=true;e.dead=true;e.noLoot=true;}}
  MM.MiddleSeaEnemies={owns,setup,updateEnemy,update,hit,beforeKill,reset,applyElectric,isJelly};
})(typeof window!=='undefined'?window:globalThis);
