/* KingKong banana throws, aerial vine duel and the last five seconds of rage. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPSILON = 1e-8;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const isKong = e => (e?.archetype || e?.type) === 'kong';
  const alive = e => e && !e.dead && e.health > 0;
  const pressure = (game, enemy) => game.getPressure?.(enemy) || {attackRate:1, moveRate:1, warningFloor:.9};
  const contact = (p, s) => Math.abs(p.x-s.x)<(p.w*.75+s.w)/2 && p.y>s.y-s.h && p.y-p.h*.86<s.y;

  function state(e, name, seconds=0, label=null) {
    e.kongState=name; e.kongTimer=seconds; e.kongStateTotal=seconds; e.kongProgress=0;
    e.tell=name==='banana-windup'||name==='scream-windup'; e.charging=e.tell||name==='final-rage';
    e.kongWarning=label?{name:label,remaining:seconds,total:seconds}:null;
    e.skillWarning=e.kongWarning;
  }
  function setup(game,e) {
    if(!isKong(e))return;
    game.kongZones=game.kongZones||[]; game.bananaPeels=game.bananaPeels||[];
    e.kongActiveTime=0; e.kongCooldown=e.boss?2.5:1.6; e.vinePhase=false; e.vineTriggered=false;
    e.kongFinalTriggered=false; e.kongRageTime=0; e.highAimShots=0; e.kongZone=null;
    e.y=GROUND; state(e,'approach');
  }
  function clearZones(game,e) {
    game.kongZones=(game.kongZones||[]).filter(z=>z.owner!==e); e.kongZone=null;
  }
  function cleanup(game,e) {
    if(!isKong(e))return;
    clearZones(game,e);
    game.enemyShots=(game.enemyShots||[]).filter(s=>s.owner!==e);
    game.bananaPeels=(game.bananaPeels||[]).filter(s=>s.owner!==e);
    e.kongWarning=null; e.skillWarning=null; e.intangible=false; e.tell=false; e.charging=false;
    if(game.player&&!game.enemies.some(other=>other!==e&&alive(other)&&isKong(other)&&other.vinePhase))game.player.weaponMode='normal';
  }
  function bananaWarning(game,e) {
    e.dir=Math.sign(game.player.x-e.x)||e.dir;
    e.bananaTargetX=e.kongTargetX=game.player.x;
    const seconds=Math.max(pressure(game,e).warningFloor,e.boss?1.2:1.05/pressure(game,e).attackRate);
    state(e,'banana-windup',seconds,e.boss?'CHUỐI KHỔNG LỒ · NỔ 5 MẢNH':'TIỂU KINGKONG · NÉM CHUỐI');
  }
  function throwBanana(game,e) {
    const x=e.x+e.dir*e.w*.35, y=e.y-e.h*.65;
    const flight=clamp(.75+Math.abs(e.bananaTargetX-x)/900,.8,1.3), gravity=e.boss?500:620;
    if(game.enemyShots.filter(s=>s.kind==='banana'&&s.life>0).length<20){
      const size=e.boss?46:18;
      game.enemyShots.push({kind:'banana',owner:e,x,y,w:size,h:size*.75,life:3,
        vx:(e.bananaTargetX-x)/flight,vy:(GROUND-18-y-gravity*flight*flight/2)/flight,
        gravity,giant:!!e.boss,fragment:false,damage:1,rotation:0});
    }
    e.kongCooldown=e.boss?3.8:4; state(e,'banana-throw',.32);
  }
  function peel(game,shot) {
    const peels=game.bananaPeels=game.bananaPeels||[];
    if(peels.length>=20)peels.shift();
    peels.push({owner:shot.owner,x:clamp(shot.x,24,W-24),y:GROUND,w:30,h:10,life:4,maxLife:4});
  }
  function slip(game,source,damage=0) {
    const p=game.player;
    if(game.screen!=='playing')return false;
    if(p.shieldTime>0&&p.shieldHits>0){
      game.hurt({x:source.x,kind:'banana-block',damage:1,forceHit:true});
      return false;
    }
    if(damage>0)game.hurt({x:source.x,owner:source.owner,kind:'banana',damage});
    if(game.screen!=='playing')return true;
    if(p.stunTime<=0&&p.stunGrace<=0){
      p.stunTime=.5; p.knockdownTime=.5; p.vx=0; p.jumpBuffer=0;
      game.clearInputs?.(); game.floating?.(p.x,p.y-p.h-12,'TRƯỢT CHUỐI · 0,5 GIÂY','#f2d56e');
    }
    return true;
  }
  function explode(game,shot) {
    if(shot.exploded)return;
    shot.exploded=true; shot.life=0;
    game.burst?.(shot.x,shot.y,'#ffd36b',20,'ring'); game.sound?.play('banana');
    // Every giant banana releases five pieces, even if an older volley is retiring.
    const old=game.enemyShots.filter(s=>s.kind==='banana'&&s.life>0);
    for(let i=0;i<Math.max(0,old.length+5-24);i++)old[i].life=0;
    for(const vx of [-180,-90,0,90,180])game.enemyShots.push({kind:'banana',owner:shot.owner,
      x:shot.x,y:Math.min(shot.y,GROUND-10),vx,vy:-300+Math.abs(vx)*.45,
      gravity:800,w:16,h:12,life:2,fragment:true,giant:false,damage:1,rotation:0});
  }
  function updateShot(game,shot,dt) {
    if(shot.life<=0)return;
    shot.vy+=(shot.gravity||620)*dt; shot.x+=shot.vx*dt; shot.y+=shot.vy*dt;
    shot.rotation=(shot.rotation||0)+dt*(shot.vx<0?-7:7); shot.life-=dt;
    if(contact(game.player,shot)){
      slip(game,shot,shot.damage||1);
      if(shot.giant)explode(game,shot);else{shot.life=0;peel(game,shot);}
    }else if(shot.y>=GROUND){
      shot.y=GROUND;
      if(shot.giant)explode(game,shot);else{shot.life=0;peel(game,shot);}
    }
  }
  function beginVine(game,e) {
    clearZones(game,e); game.enemyShots=game.enemyShots.filter(s=>s.owner!==e);
    game.bananaPeels=game.bananaPeels.filter(s=>s.owner!==e);
    e.vineTriggered=e.vinePhase=true; e.health=e.maxHealth; e.intangible=true;
    e.vineAnchorX=clamp(e.x,220,W-220); e.vineAnchorY=Math.max((game.viewTop||0)+24,40); e.vineLength=225; e.vineTime=0;
    e.vineStartX=e.x; e.vineStartY=e.y; e.highAimShots=0;
    state(e,'vine-rise',1.4,'KINGKONG ĐU DÂY · HỒI ĐẦY MÁU');
    game.player.weaponMode='highAim'; game.player.shotTimer=0;
    game.floating?.(e.x,e.y-e.h-12,'ĐU DÂY · BẮN TẦM CAO','#d2e5a1'); game.updateUI?.();
  }
  function beginFinal(game,e) {
    clearZones(game,e); game.enemyShots=game.enemyShots.filter(s=>s.owner!==e);
    game.bananaPeels=game.bananaPeels.filter(s=>s.owner!==e);
    e.kongFinalTriggered=true; e.health=1; e.intangible=false;
    e.kongRageElapsed=0; e.kongRageTime=5; e.kongRageProgress=0; e.nextFinalHitAt=1.1;
    e.finalStartX=e.x; e.finalStartY=e.y; e.finalTargetX=game.player.x;
    state(e,'final-rage',5,'CUỒNG NỘ 5 GIÂY · BẬT KHIÊN NGAY');
    e.kongZone={owner:e,kind:'rage',x:W/2,y:GROUND,w:W,h:GROUND,phase:'warning',timer:1.1,total:1.1};
    game.kongZones.push(e.kongZone); game.player.weaponMode='normal';
    game.sound?.play('roar'); game.updateUI?.();
  }
  function hit(game,e,damage=1,attack={}) {
    if(!isKong(e))return null;
    if(game.screen!=='playing'||!alive(e)||e.intangible||e.kongFinalTriggered)return false;
    if(!e.kongState)setup(game,e);
    if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);
    else e.health=Math.max(0,e.health-Math.max(1,Math.trunc(damage)||1));
    if(e.boss&&!e.vineTriggered&&e.health<=e.maxHealth/2)beginVine(game,e);
    else if(e.boss&&e.vinePhase&&e.health<=0)beginFinal(game,e);
    return true;
  }
  function recordShot(game,e) {
    if(!e?.vinePhase||e.kongFinalTriggered||!alive(e))return;
    e.highAimShots++;
    if(e.highAimShots%5===0){
      if(game.shieldCount<3){game.shieldCount++;game.floating?.(game.player.x,game.player.y-game.player.h-15,'5 PHÁT TẦM CAO · +1 KHIÊN','#a7e6c0');game.sound?.play('shield');}
      game.updateUI?.();
    }
  }
  function screamWarning(game,e) {
    clearZones(game,e);
    const seconds=Math.max(game.activeDifficulty==='story'?2.2:1.75,2/pressure(game,e).attackRate);
    const x=game.player.x<W/2?W/4:W*3/4;
    e.kongTargetX=x; e.kongZone={owner:e,kind:'scream',x,y:GROUND,w:W/2,h:GROUND,
      phase:'warning',timer:seconds,total:seconds,hitPlayer:false};
    game.kongZones.push(e.kongZone); state(e,'scream-windup',seconds,'TIẾNG HÉT · RỜI NỬA VÙNG ĐỎ');
  }
  function finalRage(game,e,dt) {
    e.kongRageElapsed+=dt; e.kongRageTime=Math.max(0,5-e.kongRageElapsed);
    e.kongRageProgress=clamp(e.kongRageElapsed/5,0,1); e.kongTimer=e.kongRageTime;
    if(e.kongWarning)e.kongWarning.remaining=e.kongRageTime;
    if(e.kongRageElapsed+EPSILON>=5){e.health=0;game.killEnemy(e);return;}
    if(e.kongRageElapsed<1.1){
      const t=e.kongRageElapsed/1.1;
      e.x=e.finalStartX+(e.finalTargetX-e.finalStartX)*t;
      e.y=e.finalStartY+(GROUND-e.finalStartY)*t*t;
    }else{
      e.y=GROUND; e.dir=Math.sign(game.player.x-e.x)||e.dir;
      e.x=clamp(game.player.x-e.dir*(e.w/2+22),e.w/2,W-e.w/2);
      e.kongProgress=((e.kongRageElapsed-1.1)%.55)/.55;
      while(e.kongRageElapsed+EPSILON>=e.nextFinalHitAt&&game.screen==='playing'){
        e.nextFinalHitAt+=.55; e.kongZone.phase='impact'; e.kongZone.timer=.2;
        game.burst?.(game.player.x,GROUND-6,'#e9a968',18,'ring');
        if(!game.settings?.reducedMotion)game.shake=Math.max(game.shake||0,7);
        // The final stand checks shield duration, not the ordinary three-hit budget.
        if(game.player.shieldTime>EPSILON){game.burst?.(game.player.x,game.player.y-28,'#91e3d1',8,'ring');}
        else game.hurt({x:e.x,owner:e,kind:'kong-final-rage',damage:3,forceHit:true});
      }
    }
    e.skillWarning=e.kongWarning;
  }
  function updateEntity(game,e,dt) {
    if(!e.kongState)setup(game,e); e.kongActiveTime+=dt;
    if(e.kongState==='final-rage'){finalRage(game,e,dt);return;}
    if(e.vinePhase&&e.kongState!=='vine-rise'){
      e.vineTime+=dt; e.x=e.vineAnchorX+Math.sin(e.vineTime*1.5)*160;
      e.y=310+Math.cos(e.vineTime*1.5)*28; e.dir=Math.sign(game.player.x-e.x)||e.dir;
    }
    const current=e.kongState;
    if(current==='approach'||current==='vine-swing'){
      e.kongCooldown-=dt*pressure(game,e).attackRate;
      if(!e.vinePhase){
        e.y=GROUND; const distance=game.player.x-e.x, standOff=e.w/2+110;
        e.dir=Math.sign(distance)||e.dir;
        if(Math.abs(distance)>standOff)e.x=clamp(e.x+e.dir*Math.min(Math.abs(distance)-standOff,e.speed*pressure(game,e).moveRate*dt),e.w/2,W-e.w/2);
        if(e.kongCooldown<=EPSILON)bananaWarning(game,e);
      }else if(e.kongCooldown<=EPSILON)screamWarning(game,e);
    }else{
      e.kongTimer=Math.max(0,e.kongTimer-dt); e.kongProgress=e.kongStateTotal?clamp(1-e.kongTimer/e.kongStateTotal,0,1):0;
      if(e.kongWarning)e.kongWarning.remaining=e.kongTimer;
      if(e.kongZone)e.kongZone.timer=e.kongTimer;
      if(current==='vine-rise'){
        e.x=e.vineStartX+(e.vineAnchorX-e.vineStartX)*e.kongProgress;
        e.y=e.vineStartY+(338-e.vineStartY)*e.kongProgress-Math.sin(Math.PI*e.kongProgress)*80;
      }
      if(e.kongTimer<=EPSILON){
        if(current==='banana-windup')throwBanana(game,e);
        else if(current==='banana-throw')state(e,'approach');
        else if(current==='vine-rise'){e.intangible=false;e.kongCooldown=2.5;state(e,'vine-swing');}
        else if(current==='scream-windup'){
          const z=e.kongZone; state(e,'scream',.35,'TIẾNG HÉT KINGKONG');
          z.phase='impact';z.timer=.35;game.sound?.play('roar');
        }else if(current==='scream'){clearZones(game,e);e.kongCooldown=4;state(e,'vine-swing');}
      }
    }
    if(e.kongZone?.phase==='impact'&&!e.kongZone.hitPlayer&&contact(game.player,e.kongZone)){
      e.kongZone.hitPlayer=true; game.hurt({x:e.x,owner:e,kind:'kong-scream',damage:2,stun:.25});
    }
    e.skillWarning=e.kongWarning;
  }
  function update(game,dt) {
    if(game.screen!=='playing')return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
    game.kongZones=(game.kongZones||[]).filter(z=>alive(z.owner));
    for(const p of game.bananaPeels||[]){
      p.life-=dt;
      if(game.player.grounded&&contact(game.player,p)){
        slip(game,p);p.life=0;
      }
    }
    game.bananaPeels=(game.bananaPeels||[]).filter(p=>p.life>0&&alive(p.owner));
    for(const e of [...game.enemies]){
      if(alive(e)&&isKong(e)&&e.phase==='active'&&!(e.petrifiedTime>1e-8))updateEntity(game,e,dt);
      if(game.screen!=='playing')break;
    }
  }
  MM.KongCombat={setup,cleanup,update,hit,updateShot,recordShot};
})(typeof window!=='undefined'?window:globalThis);
