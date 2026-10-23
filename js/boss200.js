/* Kraken and its finite final encounter. Legacy summons use their original
 * species/art, but their own limited bite rules rather than old map scripts. */
(function(root){'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
 const cfg=()=>MM.FinalSeaConfig.boss,a=()=>MM.UnderwaterConfig.arena;
 const owns=(first,second)=>{const e=second||first;return !!e&&(e.archetype==='kraken'||e.finalSeaSummon===true);};
 const alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
 const active=g=>MM.UnderwaterMode?.active(g)&&g.level.id===200;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function battle(g){return g.krakenEncounter||(g.krakenEncounter={original:null,summons:[],fossilTriggered:false,fossilRemaining:0,fossilHeal:0,summoned:false,echoTriggered:false,clock:0});}
 function warning(e,label,time){e.tell=true;e.skillWarning={name:label,remaining:time,total:time};}
 function clear(e){e.tell=false;e.skillWarning=null;}
 function bounds(e){e.x=clamp(e.x,a().edge+e.w*.5,a().width-a().edge-e.w*.5);e.y=clamp(e.y,Math.max(e.h+14,a().minY),a().maxY);}
 function cancelAttacks(g,e){g.waterZones=(g.waterZones||[]).filter(z=>z.owner!==e||!String(z.kind).startsWith('kraken-'));g.waterShots=(g.waterShots||[]).filter(s=>s.owner!==e||s.kind!=='kraken-ship');e.krakenTentacle=null;}
 function setup(g,e){
  if(!owns(e))return false;e.krakenInitialized=true;e.airborne=true;e.vx=e.vy=0;e.krakenClock=e.krakenTimer=e.krakenProgress=0;e.krakenState='patrol';e.krakenHit=false;e.krakenDying=false;
  e.krakenNextSuction=cfg().suctionCooldown;e.krakenNextShip=cfg().shipCooldown;e.krakenNextDark=cfg().darkCooldown;
  e.krakenSuctionCasts=e.krakenShipCasts=e.krakenDarkCasts=0;e.krakenEcho=false;e.krakenStone=false;e.krakenEchoCasts=e.krakenFossilCasts=0;
  if(e.finalSeaSummon){e.krakenNextBite=cfg().legacyBiteCooldown;return true;}
  const b=battle(g);if(!b.original)b.original=e;e.y=a().maxY;bounds(e);return true;
 }
 function echo(g,e){
  const b=battle(g);if(b.echoTriggered)return false;b.echoTriggered=true;e.krakenEcho=true;e.krakenEchoCasts++;
  MM.FinalSeaEnemies?.boostVents(g);g.shake=Math.max(g.shake||0,5);
  cancelAttacks(g,e);e.krakenState='echo';e.krakenTimer=cfg().echoTransition;e.krakenProgress=0;warning(e,'VỌNG ÂM BIỂN KHƠI · MIỆNG PHUN THỨC TỈNH',cfg().echoTransition);g.sound?.play('roar');return true;
 }
 function fossil(g,e){
  const b=battle(g);if(b.fossilTriggered)return false;b.fossilTriggered=true;b.fossilRemaining=cfg().fossilDuration;b.fossilHeal=0;e.krakenFossilCasts++;
  cancelAttacks(g,e);e.krakenStone=true;e.krakenState='fossil';e.krakenTimer=cfg().fossilDuration;e.krakenProgress=0;e.krakenDying=e.health<=0;
  warning(e,'HÓA THẠCH · HỒI PHỤC VÀ TRIỆU HỒI HUNG THẦN',cfg().fossilDuration);g.sound?.play('shield');return true;
 }
 function hit(g,e,damage,attack={}){
  if(!owns(e))return undefined;if(!alive(e)||e.intangible||e.krakenStone&&cfg().fossilInvulnerable)return false;
  if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);else e.health=Math.max(0,e.health-Math.max(0,Number.isFinite(damage)?damage:0));
  if(e.finalSeaSummon)return true;
  const b=battle(g);
  if(!b.echoTriggered&&e.health<=e.maxHealth*cfg().echoThreshold+EPS)echo(g,e);
  if(!b.fossilTriggered&&e.health<=e.maxHealth*cfg().fossilThreshold+EPS)fossil(g,e);
  if(e.health<=0&&b.fossilRemaining>EPS)e.krakenDying=true;
  return true;
 }
 function beforeKill(g,e){
  if(!owns(e))return true;if(e.finalSeaSummon)return true;const b=battle(g);
  if(!b.fossilTriggered&&e.health<=e.maxHealth*cfg().fossilThreshold)fossil(g,e);
  if(b.fossilRemaining>EPS){e.krakenDying=true;return false;}
  return true;
 }
 function summonLegacy(g,e,type,index){
  const spec=type==='megaLondon'?MM.PredatorSeaConfig.enemies.megaLondon:MM.DeepSeaConfig.enemies.leviathan;
  const originalMax=type==='megaLondon'?MM.PredatorSeaConfig.boss.health:MM.DeepSeaConfig.boss.health;
  // Build the original actor data without calling map180/190 setup. Those
  // encounter controllers must never own a final-map summoned body.
  let child=MM.Campaign?.createEnemy(type,g.level,g.activeDifficulty,index?1:-1,g.random);
  if(!child)child={...spec,type,archetype:type,age:0,hit:0};
  Object.assign(child,{archetype:type,finalSeaSummon:true,krakenOwner:e,boss:true,minion:false,phase:'warning',warning:cfg().summonWarning,
   health:originalMax*cfg().summonRatio,maxHealth:originalMax*cfg().summonRatio,w:spec.w,h:spec.h,baseW:spec.w,baseH:spec.h,
   x:index?740:220,y:index?285:385,dir:index?-1:1,score:0,abilityState:'ground'});
  setup(g,child);bounds(child);(g.enemies||=[]).push(child);battle(g).summons.push(child);return child;
 }
 function summon(g,e){const b=battle(g);if(b.summoned)return false;b.summoned=true;summonLegacy(g,e,'megaLondon',0);summonLegacy(g,e,'leviathan',1);g.bossDefeated=false;g.toast?.('TAM ĐẠI HUNG THẦN · HẠ CẢ BA ĐỂ KẾT THÚC');g.sound?.play('roar');return true;}
 function center(p){return {x:p.x,y:p.y-p.h*.5};}
 function contact(g,e,damage,stun=0,oxygenFraction=0){
  const p=g.player;if(g.screen!=='playing'||p.rollTime>0||p.invulnerable>EPS)return false;
  const blocked=p.shieldTime>0&&p.shieldHits>0;
  g.applyCombatEffect?.({kind:'kraken-contact',damage,stun,owner:e,sourceBoss:true});
  if(!blocked&&oxygenFraction>0&&g.underwater&&!MM.MerfolkTransformation?.protectsOxygen(g)){
   g.underwater.oxygen=Math.max(0,g.underwater.oxygen*(1-oxygenFraction));MM.UnderwaterMode?.oxygenChanged(g);g.updateUI?.();
  }return true;
 }
 function startSuction(g,e){
  const c=cfg(),pc=center(g.player),origin={x:e.x,y:e.y-e.h*.45},dx=pc.x-origin.x,dy=pc.y-origin.y,d=Math.max(1,Math.hypot(dx,dy)),scale=Math.min(1,c.suctionRange/d);
  const z={kind:'kraken-tentacle',owner:e,phase:'warning',originX:origin.x,originY:origin.y,x:origin.x+dx*scale,y:origin.y+dy*scale,w:c.suctionWidth,h:c.suctionHeight,
   timer:c.suctionWarning,total:c.suctionWarning,hit:false,expired:false};
  (g.waterZones||=[]).push(z);e.krakenTentacle=z;e.krakenState='suction-warning';e.krakenTimer=c.suctionWarning;e.krakenProgress=0;
  e.krakenNextSuction=e.krakenClock+c.suctionCooldown;e.krakenSuctionCasts++;warning(e,'VÒI GIÁC HÚT · RỜI VÒNG XÚC TU',c.suctionWarning);
 }
 function startShip(g,e){const c=cfg(),pc=center(g.player);e.krakenState='ship-warning';e.krakenTimer=c.shipWarning;e.krakenProgress=0;e.krakenTargetX=pc.x;e.krakenTargetY=pc.y;e.krakenNextShip=e.krakenClock+c.shipCooldown;e.krakenShipCasts++;warning(e,'NÉM XÁC TÀU · TRÁNH QUỸ ĐẠO',c.shipWarning);}
 function ship(g,e){
  const c=cfg(),dir=Math.sign(e.krakenTargetX-e.x)||e.dir||1,x=e.x+dir*e.w*.25,y=e.y-e.h*.35,angle=Math.atan2(e.krakenTargetY-y,e.krakenTargetX-x);
  (g.waterShots||=[]).push({kind:'kraken-ship',owner:e,x,y,vx:Math.cos(angle)*c.shipSpeed,vy:Math.sin(angle)*c.shipSpeed,w:c.shipWidth,h:c.shipHeight,range:c.shipRange,travelled:0,life:c.shipRange/c.shipSpeed,rotation:0,damage:1});
  g.sound?.play('shot');
 }
 function startDark(g,e){e.krakenState='dark-warning';e.krakenTimer=cfg().darkWarning;e.krakenProgress=0;e.krakenNextDark=e.krakenClock+cfg().darkCooldown;e.krakenDarkCasts++;warning(e,'BÓNG ĐEN · SAO BIỂN TẠM TẮT',cfg().darkWarning);}
 function move(e,tx,ty,speed,dt){const dx=tx-e.x,dy=ty-e.y,d=Math.max(1,Math.hypot(dx,dy)),step=Math.min(d,speed*dt);e.vx=dx/d*speed;e.vy=dy/d*speed;e.x+=dx/d*step;e.y+=dy/d*step;bounds(e);if(Math.abs(dx)>2)e.dir=Math.sign(dx);}
 function legacy(g,e,dt){
  const c=cfg(),p=g.player,pc=center(p);
  if(e.krakenState==='bite-warning'){
   e.krakenTimer=Math.max(0,e.krakenTimer-dt);e.krakenProgress=1-e.krakenTimer/c.legacyBiteWarning;if(e.skillWarning)e.skillWarning.remaining=e.krakenTimer;
   if(e.krakenTimer<=EPS){e.krakenState='bite';e.krakenTimer=c.legacyBiteDuration;clear(e);}return;
  }
  if(e.krakenState==='bite'){
   const x=e.x+e.dir*e.w*.4,y=e.y-e.h*.5,elapsed=Math.min(dt,e.krakenTimer);e.x+=Math.cos(e.krakenAngle)*c.legacyBiteSpeed*elapsed;e.y+=Math.sin(e.krakenAngle)*c.legacyBiteSpeed*elapsed;bounds(e);
   const tx=e.x+e.dir*e.w*.4,ty=e.y-e.h*.5;
   if(!e.krakenHit&&MM.PredatorSeaEnemies?.sweptBox?.(p,x,y,tx,ty,c.legacyBiteWidth,c.legacyBiteHeight))e.krakenHit=contact(g,e,c.legacyBiteDamage);
   e.krakenTimer=Math.max(0,e.krakenTimer-dt);e.krakenProgress=1-e.krakenTimer/c.legacyBiteDuration;if(e.krakenTimer<=EPS)e.krakenState='patrol';return;
  }
  if(e.krakenClock+EPS>=e.krakenNextBite){e.krakenState='bite-warning';e.krakenTimer=c.legacyBiteWarning;e.krakenProgress=0;e.krakenNextBite=e.krakenClock+c.legacyBiteCooldown;e.krakenHit=false;
   e.krakenAngle=Math.atan2(pc.y-(e.y-e.h*.5),pc.x-e.x);e.dir=Math.sign(pc.x-e.x)||e.dir;warning(e,'HUNG THẦN TRIỆU HỒI · NÉ CÚ CẮN',c.legacyBiteWarning);
  }else move(e,p.x,p.y-p.h*.5+e.h*.5,e.speed||45,dt);
 }
 function updateState(g,e,dt){
  const c=cfg();
  if(e.krakenState==='fossil')return;
  if(e.krakenState==='echo'){
   e.krakenTimer=Math.max(0,e.krakenTimer-dt);e.krakenProgress=1-e.krakenTimer/c.echoTransition;if(e.skillWarning)e.skillWarning.remaining=e.krakenTimer;if(e.krakenTimer<=EPS){e.krakenState='patrol';clear(e);}return;
  }
  if(['suction-warning','suction','ship-warning','dark-warning'].includes(e.krakenState)){
   const old=e.krakenState,total=old==='suction-warning'?c.suctionWarning:old==='suction'?c.suctionLife:old==='ship-warning'?c.shipWarning:c.darkWarning;
   e.krakenTimer=Math.max(0,e.krakenTimer-dt);e.krakenProgress=1-e.krakenTimer/total;if(e.skillWarning)e.skillWarning.remaining=e.krakenTimer;
   if(e.krakenTentacle){e.krakenTentacle.timer=e.krakenTimer;e.krakenTentacle.progress=e.krakenProgress;}
   if(e.krakenTimer<=EPS){
    if(old==='suction-warning'){e.krakenState='suction';e.krakenTimer=c.suctionLife;const z=e.krakenTentacle;if(z){z.phase='active';z.timer=z.total=c.suctionLife;}clear(e);}
    else{if(old==='ship-warning')ship(g,e);if(old==='dark-warning')g.krakenDarkTime=c.darkDuration;if(e.krakenTentacle){e.krakenTentacle.expired=true;e.krakenTentacle=null;}e.krakenState='patrol';clear(e);}
   }return;
  }
  if(e.krakenClock+EPS>=e.krakenNextSuction)startSuction(g,e);
  else if(e.krakenClock+EPS>=e.krakenNextShip)startShip(g,e);
  else if(e.krakenClock+EPS>=e.krakenNextDark)startDark(g,e);
  else{move(e,480+Math.sin(e.krakenClock*.22)*155,a().maxY-8+Math.sin(e.krakenClock*.55)*6,e.speed||MM.FinalSeaConfig.enemies.kraken.speed,dt);e.dir=Math.sign(g.player.x-e.x)||e.dir;}
 }
 function updateEnemy(g,e,dt){
  if(!owns(e))return false;if(!active(g)||g.screen!=='playing'||!alive(e))return true;if(!e.krakenInitialized)setup(g,e);
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);
  if(e.phase==='warning'){e.warning=Math.max(0,(e.warning||0)-dt);if(e.warning<=EPS){e.phase='active';bounds(e);}return true;}
  if(e.phase!=='active'||MM.SkillManager?.frozen?.(e))return true;e.krakenClock+=dt;
  if(e.finalSeaSummon)legacy(g,e,dt);else updateState(g,e,dt);return true;
 }
 function update(g,dt){
  if(!active(g)||g.screen!=='playing')return;const b=battle(g),e=b.original;b.clock+=dt;
  g.krakenDarkTime=Math.max(0,(g.krakenDarkTime||0)-dt);if(g.krakenDarkTime<EPS)g.krakenDarkTime=0;
  if(b.fossilRemaining>EPS&&e){
   const elapsed=Math.min(dt,b.fossilRemaining);b.fossilRemaining=Math.max(0,b.fossilRemaining-elapsed);if(b.fossilRemaining<EPS)b.fossilRemaining=0;
   if(!e.krakenDying&&alive(e)){const heal=e.maxHealth*cfg().fossilHealRatio*elapsed/cfg().fossilDuration,applied=Math.min(heal,e.maxHealth-e.health);e.health+=applied;b.fossilHeal+=applied;}
   e.krakenTimer=b.fossilRemaining;e.krakenProgress=1-b.fossilRemaining/cfg().fossilDuration;if(e.skillWarning)e.skillWarning.remaining=b.fossilRemaining;
   if(b.fossilRemaining<=EPS){e.krakenStone=false;e.krakenState='patrol';clear(e);summon(g,e);if(e.krakenDying||e.health<=0)g.killEnemy?.(e);}
  }
  for(const z of g.waterZones||[]){
   if(z.kind!=='kraken-tentacle'||z.expired)continue;if(!alive(z.owner)){z.expired=true;continue;}
   if(z.phase==='active'&&!z.hit&&MM.FinalSeaEnemies.overlap(g.player,z))z.hit=contact(g,z.owner,cfg().suctionDamage,cfg().suctionStun,cfg().suctionOxygenFraction);
  }
  g.waterZones=(g.waterZones||[]).filter(z=>!z.expired);
  for(const s of g.waterShots||[]){
   if(s.kind!=='kraken-ship'||s.life<=0)continue;const speed=Math.hypot(s.vx,s.vy),step=Math.min(speed*dt,Math.max(0,s.range-s.travelled)),elapsed=step/Math.max(1,speed),x=s.x,y=s.y;
   s.x+=s.vx*elapsed;s.y+=s.vy*elapsed;s.travelled+=step;s.life-=dt;s.rotation=(s.rotation||0)+dt*1.6;
   if(MM.PredatorSeaEnemies?.sweptBox?.(g.player,x,y,s.x,s.y,s.w,s.h)&&contact(g,s.owner,1)){s.life=0;g.burst?.(s.x,s.y,'#9ab8c5',15,'ring');}
   if(s.travelled+EPS>=s.range||s.x+s.w*.5<0||s.x-s.w*.5>a().width||s.y+s.h*.5<0||s.y-s.h*.5>a().height)s.life=0;
  }
  g.waterShots=(g.waterShots||[]).filter(s=>s.life>0);
 }
 function onKill(g,e){
  if(!owns(e))return;cancelAttacks(g,e);clear(e);
  // A dying original may leave the two summoned actors alive. Their finite
  // basic attacks continue; ordinary Game boss accounting waits for all three.
  if(!e.finalSeaSummon)g.krakenDarkTime=0;
 }
 function reset(g){
  g.krakenDarkTime=0;g.krakenEncounter=null;g.waterZones=(g.waterZones||[]).filter(z=>!String(z.kind).startsWith('kraken-'));g.waterShots=(g.waterShots||[]).filter(s=>s.kind!=='kraken-ship');
  for(const e of g.enemies||[])if(owns(e)){clear(e);e.krakenStone=false;e.krakenDying=false;e.krakenTimer=e.krakenProgress=0;if(e.finalSeaSummon)e.dead=e.retired=true;}
 }
 MM.Boss200={owns,active,setup,updateEnemy,update,hit,beforeKill,onKill,reset,battle,echo,fossil,summon,contact};
})(typeof window!=='undefined'?window:globalThis);
