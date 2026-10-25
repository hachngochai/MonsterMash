/* Island actors own their tells, projectiles and bounded summons; old actors
 * never enter this controller. All clocks advance only in active simulation. */
(function(root){'use strict';const MM=root.MM=root.MM||{},W=960,F=438,EPS=1e-8;
 const cfg=()=>MM.IslandConfig,C=()=>cfg().boss,O=()=>cfg().ordinary;
 const clamp=(n,a=30,b=930)=>Math.max(a,Math.min(b,n)),kind=e=>e.archetype||e.type;
 const active=g=>g.level?.island===true,alive=e=>e&&!e.dead&&!e.retired&&e.health>0;
 const owns=e=>!!cfg()&&(Object.hasOwn(cfg().enemies,kind(e))||Object.hasOwn(cfg().bosses,kind(e)));
 const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&a.y>b.y-b.h&&a.y-a.h<b.y;
 function beam(e){const x1=e.x,y1=e.y-e.h*.7,dx=e.targetX-x1,dy=e.targetY-27-y1,length=Math.hypot(dx,dy)||1;return {x1,y1,x2:x1+dx/length*C().laserRange,y2:y1+dy/length*C().laserRange,r:12};}
 function touches(p,z){if(!z.beam)return overlap(p,z);const b=z.beam,dx=b.x2-b.x1,dy=b.y2-b.y1;let lo=0,hi=1;for(const [v,q]of[[-dx,b.x1-(p.x-p.w/2-b.r)],[dx,p.x+p.w/2+b.r-b.x1],[-dy,b.y1-(p.y-p.h-b.r)],[dy,p.y+b.r-b.y1]]){if(Math.abs(v)<EPS){if(q<0)return false;continue;}const t=q/v;if(v<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}return true;}
 function reset(g){g.island={clock:0,hazards:[],projectiles:[],seals:[],platforms:[],nextWall:10,fear:0,slow:0,vulnerable:0,vision:0};}
 function state(g){if(!g.island)reset(g);return g.island;}
 function setup(g,e){if(!active(g)||!owns(e))return false;const k=kind(e);e.islandClock=0;e.islandNext=e.boss?2:O().bunnyInterval;e.islandState=k==='awakeningMoai'?'sleep':k==='miniMoai'?'growing':'walk';
  e.islandTimer=k==='miniMoai'?O().wallWarning:0;e.islandCasts=0;e.islandCycle=0;e.x=e.boss?745:clamp(e.x,45,915);e.y=F;e.contactNext=0;
  if(e.boss)e.warning=Math.max(1,e.warning||0);if(k==='awakeningMoai'){e.stoneArmor=true;e.intangible=true;e.wallHits=0;}
  if(k==='birdman'){e.airborne=true;e.y=C().birdFlightY;}if(k==='manaSpirit'){e.airborne=true;e.y=F-55;}
  if(k==='makemake'){e.judgmentUses=0;state(g).platforms=C().sealXs.map(x=>({x,y:F,w:105,h:35}));}
  if(k==='miniMoai'){if(Math.abs(e.x-g.player.x)<(e.w+g.player.w)/2+30)e.x=clamp(g.player.x+(g.player.x<W/2?150:-150),70,890);if(e.minion)e.islandLife=O().wallLife;}return true;
 }
 function tell(g,e,skill,time=C().warning){e.islandState='tell';e.islandSkill=skill;e.islandTimer=e.islandDuration=time;e.islandProgress=0;e.targetX=clamp(g.player.x);e.targetY=g.player.y;e.dir=Math.sign(g.player.x-e.x)||e.dir||1;e.attackDir=e.dir;}
 function rest(e,time=C().recovery){e.islandState='rest';e.islandTimer=time;e.islandSkill=null;}
 function hazard(g,e,type,x,y,w,h,damage=1,extra={}){const s=state(g);if(s.hazards.length>=C().maxHazards)return null;const z={type,owner:e,x,y,w,h,damage,phase:'warning',timer:C().warning,life:C().active,hit:false,...extra};s.hazards.push(z);return z;}
 function apply(g,e,spec={}){if(g.screen!=='playing')return false;const s=state(g),damage=(spec.damage||0)+(spec.damage>0&&s.vulnerable>0?C().manaExtraDamage:0);
  return g.applyCombatEffect?.({owner:e,sourceBoss:!!e?.boss,ordinaryEnemy:!e?.boss,...spec,damage})===true;}
 function projectile(g,e,type,damage=1,extra={}){const s=state(g);if(s.projectiles.length>=C().maxProjectiles)return null;const y=e.y-e.h*.6,a=Math.atan2((g.player.y-g.player.h*.5)-y,g.player.x-e.x),v=O().projectileSpeed;
  const p={type,owner:e,x:e.x,y,w:18,h:18,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:4,damage,hit:new Set(),...extra};s.projectiles.push(p);return p;}
 function summon(g,e,type,count,cap){let made=0;for(let i=0;i<count;i++){if((g.enemies||[]).filter(a=>alive(a)&&a.minion&&kind(a)===type).length>=cap)break;
   const a=g.spawn(type,i%2?-1:1);a.minion=true;a.islandOwner=e;a.phase='active';a.x=clamp(e.x+(i%2?-1:1)*(90+i*22),60,900);a.y=F;a.islandLife=type==='giantBunny'?O().giantLife:30;made++;}return made;}
 function walk(g,e,dt,speed=e.speed||40,stop=65){const d=g.player.x-e.x,target=Math.abs(d)>stop?Math.sign(d)*speed:0;e.islandVX=(e.islandVX||0)+(target-(e.islandVX||0))*(1-Math.exp(-dt*9));e.x=clamp(e.x+e.islandVX*dt,e.w/2+24,W-e.w/2-24);if(Math.abs(e.islandVX)>1)e.dir=Math.sign(e.islandVX);}
 function weighted(g,weights){const total=weights.reduce((a,b)=>a+Math.max(0,b),0),r=clamp(Number(g.random?.()??Math.random()),0,.999999999)*total;let sum=0;return weights.findIndex(w=>(sum+=Math.max(0,w))>r)+1||1;}
 function dice(g,e,result=weighted(g,O().diceWeights)){e.diceResult=clamp(Math.trunc(result),1,6);e.diceGlow=1;const p=g.player;
  g.floating?.(e.x,e.y-e.h-20,'⚄ '+e.diceResult,'#a9e58d');
  if(e.diceResult===1){p.health=Math.min(p.maxHealth,p.health+1);g.floating?.(p.x,p.y-p.h,'+1 MÁU','#a9e58d');}
  if(e.diceResult===2)projectile(g,e,'bomb',1,{aoe:O().bombRadius,gravity:330,vy:-175});
  if(e.diceResult===3){e.hiddenTime=O().invisibility;e.islandState='invisible';e.assassinHit=false;}
  if(e.diceResult===4){p.ammo=Math.max(0,p.ammo*.5);g.updateAmmoUI?.();g.toast?.('PATRICK THU 50% ĐẠN');}
  if(e.diceResult===5)for(let i=0;i<5;i++){const a=(i-2)*.12;const q=projectile(g,e,'hostile-clover',O().cloverDamage);if(q){const vx=q.vx,vy=q.vy;q.vx=vx*Math.cos(a)-vy*Math.sin(a);q.vy=vx*Math.sin(a)+vy*Math.cos(a);q.friendlyFire=true;}}
  if(e.diceResult===6)summon(g,e,'giantBunny',1,O().giantCap);return e.diceResult;
 }
 function ordinaryCast(g,e){const k=kind(e),p=g.player;
  if(k==='easterEgg'){hazard(g,null,'egg-burst',e.x,e.y,2*O().eggRadius,2*O().eggRadius,O().eggDamage,{phase:'active',timer:.25,life:.25});g.killEnemy(e);return;}
  if(k==='ghostBunny'){const melee=MM.WeaponManager?.profile?.(g)?.melee===true;projectile(g,e,melee?'stone':'thrown-egg',1,{stun:melee?O().stoneStun:0,gravity:260,vy:-130});}
  if(k==='luckyPatrick'){dice(g,e);if(e.islandState==='invisible')return;}
  if(k==='leprechaun'){p.ammo=Math.max(0,p.ammo-3);g.toast?.('LEPRECHAUN · −3 ĐẠN');g.updateAmmoUI?.();}
  if(k==='drunkenWanderer')projectile(g,e,'bottle',O().bottleDamage,{gravity:360,vy:-190,aoe:O().bottleRadius});
  if(k==='giantBunny')hazard(g,e,'log',e.x+e.dir*O().giantRange*.5,F,O().giantRange,100,2,{phase:'active',timer:.25});
  rest(e);
 }
 function ordinary(g,e,dt){const k=kind(e),p=g.player,d=Math.abs(p.x-e.x);
  if(k==='miniMoai'){if(e.islandState==='growing'){e.islandTimer-=dt;if(e.islandTimer<=0)e.islandState='wall';}return;}
  if(e.islandState==='invisible'){e.hiddenTime=Math.max(0,e.hiddenTime-dt);walk(g,e,dt,e.speed*1.3,0);
   if(!e.assassinHit&&overlap(p,e)){e.assassinHit=true;apply(g,e,{stun:O().patrickStun,damage:0});}
   if(e.hiddenTime<=EPS)rest(e);return;}
  if(e.islandState==='jump'){e.islandTimer-=dt;const q=1-e.islandTimer/O().bunnyJumpTime;e.x=clamp(e.jumpFrom+(e.jumpTo-e.jumpFrom)*q,e.w/2,W-e.w/2);e.y=F-Math.sin(Math.PI*clamp(q,0,1))*O().bunnyJumpHeight;
   if(q>=1){e.y=F;e.dir=Math.sign(p.x-e.x)||-e.dir;rest(e,.3);}return;}
  if(e.islandState==='tell'){e.islandTimer-=dt;e.islandProgress=1-e.islandTimer/e.islandDuration;if(e.islandTimer<=0){ordinaryCast(g,e);e.islandNext=e.islandClock+({luckyPatrick:O().diceInterval,leprechaun:O().stealInterval,drunkenWanderer:O().bottleInterval,giantBunny:O().giantInterval}[k]||O().bunnyInterval);}return;}
  if(e.islandState==='rest'){e.islandTimer-=dt;if(e.islandTimer<=0)e.islandState='walk';return;}
  if(k==='easterEgg'){walk(g,e,dt,e.speed,60);if(d<O().eggRange)tell(g,e,'egg-burst',O().eggWarning);return;}
  if(k==='ghostBunny'&&d<95&&e.islandClock>=e.islandNext){e.islandState='jump';e.islandTimer=O().bunnyJumpTime;e.jumpFrom=e.x;e.jumpTo=clamp(p.x+Math.sign(p.x-e.x||1)*110);e.islandNext=e.islandClock+O().bunnyInterval;return;}
  walk(g,e,dt,e.speed,k==='drunkenWanderer'||k==='ghostBunny'?O().bunnyFar:k==='giantBunny'?O().giantRange-20:45);
  if(e.islandClock>=e.islandNext&&(k!=='leprechaun'||d<O().stealRange)&&(k!=='giantBunny'||d<O().giantRange))tell(g,e,k,.65);
  if(k==='mutantRat'&&d<45&&e.islandClock>=e.contactNext){apply(g,e,{damage:1});e.contactNext=e.islandClock+1.2;}
 }
 function startJudgment(g,e){const s=state(g);s.hazards=[];s.projectiles=[];e.judgmentUses++;e.islandState='judgment';e.islandTimer=C().judgmentCharge;e.islandDuration=C().judgmentCharge;
  s.seals=C().sealXs.map(x=>({x,y:F,w:62,h:20,activated:false}));s.protection=false;g.toast?.('PHÁN XÉT · KÍCH HOẠT 2 BỆ BẰNG E RỒI VÀO VÙNG SÁNG',6);}
 function interact(g){if(!active(g)||g.screen!=='playing'||g.weaponPicker?.open||g.player.stunTime>0||g.player.petrifyTime>0)return false;const s=state(g),boss=g.enemies.find(e=>alive(e)&&kind(e)==='makemake'&&e.islandState==='judgment');if(!boss)return false;
  const seal=s.seals.find(z=>!z.activated&&Math.abs(z.x-g.player.x)<=C().sealRange&&Math.abs(g.player.y-F)<70);if(!seal)return false;seal.activated=true;s.protection=s.seals.filter(z=>z.activated).length>=C().sealRequired;g.burst?.(seal.x,F-20,'#8ceddc',16,'ring');return true;}
 function protectedBySeals(g){const s=state(g);return s.protection&&s.seals.some(z=>z.activated&&Math.abs(g.player.x-z.x)<=C().sealZone&&g.player.y>F-125);}
 function bossCast(g,e){const k=kind(e),skill=e.islandSkill;
  if(skill==='charge'){e.islandState='charge';e.islandTimer=k==='awakeningMoai'?C().moaiChargeTime:C().alphaChargeTime;e.chargeHit=false;return;}
  if(skill==='stomp'){for(const dir of [-1,1])hazard(g,e,'quake',e.x,F,80,28,0,{phase:'active',timer:2,life:2,vx:dir*250,stun:C().stompStun});}
  if(skill==='laser')hazard(g,e,'eye-laser',e.x,e.y,C().laserRange,24,C().laserDamage,{phase:'active',timer:.5,beam:beam(e)});
  if(skill==='rats')summon(g,e,'mutantRat',C().ratCount,C().ratCap);
  if(skill==='burrow'){e.islandState='burrow';e.islandTimer=C().burrowTime;e.intangible=true;e.bulletUntargetable=true;return;}
  if(skill==='dive'){e.islandState='dive';e.islandTimer=C().birdDiveTime;e.diveFrom={x:e.x,y:e.y};e.diveHit=false;return;}
  if(skill==='fear'){const z=hazard(g,e,'scream',e.x, F,650,330,0,{phase:'active',timer:.3,fear:C().fearDuration});z.fearDir=Math.sign(g.player.x-e.x)||1;}
  if(skill==='cursed-egg'){e.eggCycle=(e.eggCycle||0)+1;projectile(g,e,e.eggCycle%2?'poison-egg':'cursed-bomb',e.eggCycle%2?0:2,{gravity:270,vy:-40,aoe:C().eggRadius,poison:e.eggCycle%2===1});}
  if(skill==='rune'){e.runeCycle=(e.runeCycle||0)+1;projectile(g,e,e.runeCycle%2?'fish-rune':'bird-rune',0,{status:e.runeCycle%2?'slow':'vulnerable'});}
  if(skill==='teleport'){g.burst?.(e.x,e.y-e.h*.5,'#84cce4',12,'ring');const candidates=[140,480,820].filter(x=>Math.abs(x-g.player.x)>=C().manaTeleportSafety);e.x=candidates[Math.floor(clamp(Number(g.random?.()||0),0,.999)*candidates.length)]||140;g.burst?.(e.x,e.y-e.h*.5,'#84cce4',12,'ring');}
  if(skill==='spirit-shield'){e.manaShield=C().manaShieldHits;e.manaShieldTime=C().manaShieldTime;}
  if(skill==='lava'){for(const x of [325,645])hazard(g,e,'lava',x,F,110,26,C().lavaDamage,{timer:C().lavaWarning,life:C().lavaLife,tick:C().lavaTick,nextTick:0});}
  if(skill==='boulders')for(const x of [230,480,730])hazard(g,e,'boulder',x,F,72,100,2,{timer:1.2,life:.4});
  if(skill==='earth-claws')for(const x of [e.targetX-110,e.targetX+110])hazard(g,e,'earth-claw',clamp(x),F,78,85,2,{timer:1.2,life:.35});
  if(skill==='wind')hazard(g,e,'wind',480,F,650,260,0,{timer:1.2,life:1,wind:180*(e.dir||1)});
  if(skill==='mana-wave')for(let i=0;i<3;i++)projectile(g,e,i%2?'fish-rune':'bird-rune',1,{vx:e.dir*220,vy:(i-1)*55,status:i%2?'slow':'vulnerable'});
  rest(e);
 }
 function boss(g,e,dt){const k=kind(e),s=state(g);
  if(e.stoneArmor===false&&e.weakTime>0){e.weakTime-=dt;if(e.weakTime<=0)e.stoneArmor=true;}
  if(e.manaShieldTime>0){e.manaShieldTime-=dt;if(e.manaShieldTime<=0)e.manaShield=0;}
  if(k==='makemake'&&e.health<=e.maxHealth*C().judgmentThreshold&&e.judgmentUses<C().judgmentUses&&e.islandState!=='judgment'){startJudgment(g,e);return;}
  if(e.islandState==='sleep'){if(Math.abs(g.player.x-e.x)<C().wakeRange){e.islandState='awakening';e.islandTimer=C().wakeTime;}return;}
  if(e.islandState==='awakening'){e.islandTimer-=dt;if(e.islandTimer<=0){e.intangible=false;rest(e,.5);}return;}
  if(e.islandState==='judgment'){e.islandTimer-=dt;e.islandProgress=1-e.islandTimer/e.islandDuration;if(e.islandTimer<=EPS){
    const safe=protectedBySeals(g);s.seals=[];s.protection=false;rest(e,1);
    if(!safe){g.player.health=0;g.finish(false);return;}
    g.burst?.(g.player.x,g.player.y-30,'#b6f8ed',30,'ring');if(e.pendingDeath){e.pendingDeath=false;g.dealEnemyDamage(e,99999,{kind:'judgment-end',magic:true});}
   }return;}
  if(e.islandState==='charge'){const speed=k==='awakeningMoai'?C().moaiChargeSpeed:C().alphaSpeed;e.x+=e.attackDir*speed*dt;e.islandTimer-=dt;
   if(!e.chargeHit&&overlap(e,g.player)){e.chargeHit=true;apply(g,e,{damage:2});}
   const edge=e.w/2+25;if(e.x<=edge||e.x>=W-edge){e.x=clamp(e.x,edge,W-edge);if(k==='awakeningMoai'){e.wallHits++;if(e.wallHits>=C().moaiWallHits){e.stoneArmor=false;e.weakTime=C().moaiWeakTime;e.wallHits=0;g.toast?.('GIÁP ĐÁ ĐÃ VỠ · TẤN CÔNG');}}rest(e,1);}
   else if(e.islandTimer<=0)rest(e);return;}
  if(e.islandState==='burrow'){e.islandTimer-=dt;if(e.islandTimer<=0){e.x=clamp(g.player.x-(g.player.dir||1)*145,e.w/2+25,W-e.w/2-25);e.islandState='emerge';e.islandTimer=C().emergeWarning;hazard(g,e,'emerge',e.x,F,e.w+35,100,2,{timer:C().emergeWarning,life:.3});}return;}
  if(e.islandState==='emerge'){e.islandTimer-=dt;if(e.islandTimer<=0){e.intangible=false;e.bulletUntargetable=false;rest(e);}return;}
  if(e.islandState==='dive'){e.islandTimer-=dt;const q=clamp(1-e.islandTimer/C().birdDiveTime,0,1);e.x=e.diveFrom.x+(e.targetX-e.diveFrom.x)*q;e.y=e.diveFrom.y+(F-e.diveFrom.y)*q;
   if(!e.diveHit&&overlap(e,g.player)){e.diveHit=true;apply(g,e,{damage:C().birdDiveDamage});}if(q>=1){e.airborne=false;rest(e,1);}return;}
  if(e.islandState==='tell'){e.islandTimer-=dt;e.islandProgress=1-e.islandTimer/e.islandDuration;if(e.islandTimer<=0){e.islandCasts++;bossCast(g,e);e.islandNext=e.islandClock+C().skillInterval;}return;}
  if(e.islandState==='rest'){e.islandTimer-=dt;if(e.islandTimer<=0)e.islandState='walk';return;}
  if(k==='birdman'){e.airborne=true;e.y+=(C().birdFlightY+Math.sin(e.islandClock*2)*12-e.y)*(1-Math.exp(-dt*4));walk(g,e,dt,e.speed*.5,200);}
  else if(k==='manaSpirit'){e.y=F-55+Math.sin(e.islandClock*1.8)*10;walk(g,e,dt,e.speed*.35,220);}
  else walk(g,e,dt,e.speed,180);
  if(e.islandClock>=e.islandNext){const choices={awakeningMoai:['stomp','laser','charge'],deforestedAlpha:['charge','rats','burrow'],birdman:['dive','fear','cursed-egg'],manaSpirit:['rune','teleport','spirit-shield'],makemake:['lava','boulders','earth-claws','wind','mana-wave']}[k];const skill=choices[e.islandCycle++%choices.length];tell(g,e,skill);}
 }
 function updateEnemy(g,e,dt){if(!active(g)||!owns(e))return false;if(!alive(e)||g.screen!=='playing')return true;if(MM.SkillManager?.frozen?.(e))return true;
  e.age=(e.age||0)+dt;e.hit=Math.max(0,(e.hit||0)-dt);e.islandClock=(e.islandClock||0)+dt;e.diceGlow=Math.max(0,(e.diceGlow||0)-dt);
  if(e.islandLife>0){e.islandLife-=dt;if(e.islandLife<=0){e.dead=true;e.health=0;return true;}}
  if(e.phase==='warning'){e.warning-=dt;if(e.warning<=0){e.phase='active';e.x=clamp(e.x,e.w/2+26,W-e.w/2-26);}return true;}
  if(e.boss)boss(g,e,dt);else ordinary(g,e,dt);return true;}
 function status(g,p){const s=state(g);if(p.status==='slow')s.slow=C().manaSlowTime;if(p.status==='vulnerable')s.vulnerable=C().manaVulnerableTime;}
 function acceptsStatus(g,spec){const p=g.player;return g.screen==='playing'&&!(p.rollTime>0)&&!(p.invulnerable>0&&!spec.forceHit)&&!(p.shieldTime>0&&p.shieldHits>0)&&!MM.ResurrectionRewards?.protectsHP(g,spec);}
 function update(g,dt){if(!active(g)||g.screen!=='playing')return;const s=state(g);s.clock+=dt;for(const id of ['fear','slow','vulnerable','vision'])s[id]=Math.max(0,s[id]-dt);
  if(g.level.types?.includes('miniMoai')&&s.clock>=s.nextWall){s.nextWall+=O().wallInterval;if(g.enemies.filter(e=>alive(e)&&kind(e)==='miniMoai'&&e.minion).length<O().wallCap){const e=g.spawn('miniMoai',1);e.minion=true;e.phase='active';e.x=clamp(g.player.x+(g.player.x<W/2?150:-150),70,890);e.islandLife=O().wallLife;}}
  for(const z of s.hazards){if(z.owner?.dead){z.expired=true;continue;}z.timer-=dt;if(z.phase==='warning'&&z.timer<=0){z.phase='active';z.timer=z.life;}
   if(z.phase==='active'){z.x+=(z.vx||0)*dt;const p=g.player;if(touches(p,z)&&(!z.hit||z.wind||z.tick&&s.clock>=z.nextTick)){
    if(z.wind){if(!z.hit){z.windAffects=acceptsStatus(g,z);apply(g,z.owner,z);z.hit=true;}if(z.windAffects)p.x=clamp(p.x+z.wind*dt);}else{const eligible=acceptsStatus(g,z);apply(g,z.owner,z);
     if(eligible){if(z.fear){s.fear=z.fear;s.fearDir=z.fearDir;s.vision=C().visionDuration;}if(z.status)status(g,z);}}
    if(!z.wind){z.hit=true;z.nextTick=s.clock+(z.tick||1);}}
    if(z.timer<=0)z.expired=true;}}
  for(const p of s.projectiles){p.life-=dt;if(p.owner?.dead){p.life=0;continue;}const ox=p.x,oy=p.y;p.vy+=(p.gravity||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
   const ownerEligible=p.ownerExited===true;if(p.friendlyFire&&!p.ownerExited&&p.owner&&!overlap(p,p.owner))p.ownerExited=true;
   const allies=[g.resurrection?.moai,g.resurrection?.clone].filter(a=>a?.health>0),targets=p.friendlyFire?[g.player,...allies,...g.enemies.filter(e=>alive(e)&&!e.boss&&(e!==p.owner||ownerEligible)&&e.phase==='active')]:[g.player,...allies];
   for(const target of targets){if(p.hit.has(target))continue;const loX=Math.min(ox,p.x)-p.w/2,hiX=Math.max(ox,p.x)+p.w/2,loY=Math.min(oy,p.y)-p.h,hiY=Math.max(oy,p.y);
    if(target.x+target.w/2<loX||target.x-target.w/2>hiX||target.y<loY||target.y-target.h>hiY)continue;
    p.hit.add(target);if(allies.includes(target)){if(!p.aoe)MM.ResurrectionRewards.damageCompanion(g,{...p,target});}else if(target!==g.player)g.dealEnemyDamage(target,p.damage,{kind:'patrick-clover',owner:p.owner});else if(!p.aoe){const eligible=acceptsStatus(g,p);apply(g,p.owner,p);if(eligible)status(g,p);}
    if(!p.friendlyFire){p.life=0;break;}}
   if(p.y>=F||p.life<=0){if(p.aoe){hazard(g,p.owner,p.poison?'poison':'explosion',clamp(p.x),F,p.aoe*2,p.aoe*2,p.poison?C().poisonDamage:p.damage,{phase:'warning',timer:.45,life:p.poison?C().poisonLife:.25,tick:p.poison?1:0,nextTick:0});p.aoe=0;}p.life=0;}}
  s.hazards=s.hazards.filter(z=>!z.expired);s.projectiles=s.projectiles.filter(p=>p.life>0&&p.x>-50&&p.x<W+50&&p.y>-150);g.enemies=g.enemies.filter(e=>!e.dead);
 }
 function hit(g,e,amount,attack={}){if(!owns(e))return undefined;if(!active(g)||e.intangible||e.islandState==='sleep'||e.islandState==='awakening'||e.pendingDeath&&e.islandState==='judgment')return false;
  const magic=attack.magic||['lightningOrb','fireball','meteor','blessing','resurrectionFire','judgment-end'].includes(attack.kind);
  if(kind(e)==='manaSpirit'&&e.manaShield>0&&!magic){e.manaShield--;return false;}
  const damage=amount*(kind(e)==='awakeningMoai'&&e.stoneArmor?C().moaiArmorMultiplier:1);
  if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);else e.health=Math.max(0,e.health-damage);
  if(kind(e)==='makemake'&&e.judgmentUses<C().judgmentUses&&e.health<=e.maxHealth*C().judgmentThreshold)startJudgment(g,e);return true;
 }
 function beforeKill(g,e){if(owns(e)&&kind(e)==='makemake'&&e.islandState==='judgment'){e.pendingDeath=true;e.health=1;return false;}return true;}
 function onKill(g,e){if(!owns(e))return;if(e.boss){for(const a of g.enemies)if(a.islandOwner===e){a.dead=true;a.health=0;}const s=state(g);s.hazards=[];s.projectiles=[];s.seals=[];s.fear=s.slow=s.vulnerable=s.vision=0;}}
 function playerModifiers(g){const s=g.island;return !active(g)||!s?{speed:1}:{speed:s.slow>0?C().manaSlow:1,forceMove:s.fear>0?s.fearDir:0,fearSpeed:C().fearSpeed};}
 MM.IslandCombat={active,owns,reset,setup,updateEnemy,update,hit,beforeKill,onKill,interact,protectedBySeals,playerModifiers,dice,startJudgment,beam,touches};
})(typeof window!=='undefined'?window:globalThis);
