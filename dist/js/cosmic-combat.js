/* Cosmic actors share bounded motion/hazard primitives. Each authored creature
 * keeps its own attack identity; this controller never owns older biomes. */
(function(root){'use strict';
 const MM=root.MM=root.MM||{},D=()=>MM.CosmicConfig.authored,C=()=>MM.CosmicBalance,W=960,F=438,EPS=1e-8;
 const clamp=(x,a=24,b=936)=>Math.max(a,Math.min(b,x)),kind=e=>e.archetype||e.type,alive=e=>e&&!e.dead&&e.health>0;
 const active=g=>!!g.level?.cosmic,owns=e=>!!C()&&(Object.hasOwn(C().enemies,kind(e))||Object.hasOwn(C().bosses,kind(e)));
 const touch=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&a.y>b.y-b.h&&a.y-a.h<b.y;
 function reset(g){g.cosmic={clock:0,hazards:[],projectiles:[],slow:0,corrosion:0,vision:0,force:0,timeSlow:0};}
 function state(g){if(!g.cosmic)reset(g);return g.cosmic;}
 function setup(g,e){
  if(!active(g)||!owns(e))return false;const design=D().enemies[kind(e)],shape=design?.shape;
  e.cosmicState='walk';e.cosmicNext=C().ordinary.cooldown;e.cosmicClock=0;e.cosmicCycle=0;e.contactNext=0;e.cosmicVX=0;
  e.airborne=['specter','wisp','drone','spore','vortex','eel','whale','jellyfish','bird','phoenix','dragon','siren'].includes(shape)||['aphrodite','zeus','poseidon','selene','helios','singularitySovereign'].includes(kind(e));
  e.baseFlightY=e.airborne?Math.max(e.h+45,e.boss?F-30:310):F;e.y=e.baseFlightY;
  if(e.boss){e.x=clamp(740,e.w/2+35,W-e.w/2-35);e.cosmicNext=2;}
  e.ccImmune=kind(e)==='singularityVoidEater';return true;
 }
 function hazard(g,e,type,x,y,w,h,extra={}){
  const s=state(g);if(s.hazards.length>=C().limits.hazards)return null;
  const z={owner:e,type,x,y,w,h,damage:e?.boss?2:1,warning:e?.boss?C().boss.warning:C().ordinary.warning,life:.65,elapsed:0,hit:false,...extra};
  z.initialWarning=z.warning;s.hazards.push(z);return z;
 }
 function projectile(g,e,type,extra={}){
  const s=state(g);if(s.projectiles.length>=C().limits.projectiles)return null;
  const y=e.y-e.h*.6,a=Math.atan2(g.player.y-g.player.h*.5-y,g.player.x-e.x),speed=C().ordinary.projectileSpeed;
  const q={owner:e,type,x:e.x,y,w:18,h:18,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage:1,life:5,...extra};s.projectiles.push(q);return q;
 }
 function apply(g,e,spec={}){return g.applyCombatEffect?.({owner:e,sourceBoss:!!e?.boss,ordinaryEnemy:!e?.boss,...spec})===true;}
 function tell(g,e,skill){e.cosmicState='tell';e.cosmicSkill=skill;e.cosmicTimer=e.cosmicDuration=e.boss?C().boss.warning:C().ordinary.warning;e.targetX=clamp(g.player.x,70,890);e.targetY=g.player.y;e.dir=Math.sign(g.player.x-e.x)||e.dir;}
 function move(g,e,dt,speed=e.speed,stop=100){
  const distance=g.player.x-e.x,target=Math.abs(distance)>stop?Math.sign(distance)*speed:0;
  e.cosmicVX+=(target-e.cosmicVX)*(1-Math.exp(-dt*8));e.x=clamp(e.x+e.cosmicVX*dt,e.w/2+18,W-e.w/2-18);
  if(Math.abs(e.cosmicVX)>1)e.dir=Math.sign(e.cosmicVX);
 }
 function reverse(g,e){for(const b of g.bullets||[]){if(b.cosmicReversed||Math.abs(b.x-e.x)>250)continue;
   b.cosmicReversed=true;projectile(g,{...e,x:b.x,y:b.y+10,h:20},'reversed',{x:b.x,y:b.y,vx:-(b.vx??b.dir*(b.speed||780)),vy:-(b.vy||0),damage:1,life:2});b.life=0;
  }}
 function ordinaryCast(g,e){
  const O=C().ordinary,k=kind(e),s=state(g),p=g.player,x=e.targetX;
  switch(k){
   case 'mercurianPyroSlug':hazard(g,e,'molten-trail',e.x,F,120,20,{life:O.trailLifetime,tick:O.trailTick,slow:O.trailSlow});break;
   case 'solarFlareSpecter':e.x=clamp(x+(x<480?80:-80),70,890);hazard(g,e,'flare',e.x,e.y,105,100);break;
   case 'craterBurrower':case 'regolithGolem':projectile(g,e,'hot-rock',{vy:-180,gravity:340});break;
   case 'livingCinnabar':hazard(g,e,'mineral-spike',e.x,F,120,65);break;
   case 'moltenCoreDrone':hazard(g,e,'thermal-beam',480,e.y-e.h*.5,W,18,{damage:1});break;
   case 'venutianAcidStalker':case 'corrosiveWisp':projectile(g,e,'acid',{corrosion:true});break;
   case 'sulfurGolem':e.ward=2;break;
   case 'greenhouseSpore':hazard(g,e,'acid-cloud',e.x,e.y,O.sporeRadius*2,130,{life:3,vision:O.visionTime});break;
   case 'vesperSkimmer':case 'photonPhoenix':case 'sonicWindWraith':e.cosmicState='dash';e.startX=e.x;e.cosmicTimer=e.cosmicDuration=.7;e.dashTarget=x;return;
   case 'martianDustWorm':case 'polarIceBeetle':e.cosmicState='burrow';e.cosmicTimer=e.cosmicDuration=1;e.startX=e.x;e.bulletUntargetable=true;hazard(g,e,'emerge',x,F,100,60,{warning:1});return;
   case 'ironOxideBerserker':hazard(g,e,'saw',e.x+e.dir*75,F,140,95);break;
   case 'phobosDrone':case 'apolloMalfunctioningMech':for(let i=-1;i<=1;i++)projectile(g,e,'bullet',{vy:i*65});break;
   case 'dustDevilElemental':hazard(g,e,'dust-vortex',x,F,120,210,{force:Math.sign(x-e.x)*160,damage:0,life:2});break;
   case 'aresSpider':hazard(g,e,'dust-mine',e.x,F,85,35,{life:O.mineLifetime,vision:O.visionTime});break;
   case 'jovianGasWhale':hazard(g,e,'sonic',x,p.y,150,180,{damage:0,stun:O.stun});break;
   case 'plasmaEel':hazard(g,e,'electric',e.x,e.y,210,140,{stun:O.stun});break;
   case 'vortexPhantom':hazard(g,e,'spiral',x,F,130,180,{life:2});break;
   case 'jupiterSpore':projectile(g,e,'charged-light',{w:28,h:28});break;
   case 'atmosphericWisp':projectile(g,e,'gas');break;
   case 'saturnianRingCrafter':case 'tritonIceDemon':projectile(g,e,'ice',{freeze:O.freezeTime});break;
   case 'frostCrystalGolem':hazard(g,e,'ice-fist',e.x+e.dir*70,F,130,95);break;
   case 'titanMethaneLeech':if(Math.abs(p.x-e.x)<O.range){const taken=Math.min(p.ammo,O.leechAmmo);p.ammo-=taken;e.health=Math.min(e.maxHealth,e.health+taken*O.leechHeal);}break;
   case 'ringAsteroidSentient':e.awake=true;hazard(g,e,'asteroid-slam',e.x,F,160,55);break;
   case 'ringRiderDrone':projectile(g,e,'freeze-missile',{freeze:O.missileStun});break;
   case 'uranianFrostBender':e.afterimage=1.5;projectile(g,e,'ice');break;
   case 'methanePhantom':hazard(g,e,'cold',e.x,e.y,210,130,{damage:0,slow:O.iceSlow,life:2});break;
   case 'cyanFrostGuard':e.ward=1.5;hazard(g,e,'ice-lance',e.x+e.dir*90,F,190,60);break;
   case 'iceClusterMine':for(let i=0;i<6;i++){const a=i*Math.PI/3;projectile(g,e,'ice-shard',{vx:Math.cos(a)*200,vy:Math.sin(a)*200});}break;
   case 'auroraJellyfish':hazard(g,e,'aurora',e.x,F,90,F-e.y+e.h*.5,{stun:1});break;
   case 'neptunianAbyssalSiren':hazard(g,e,'sonic-gravity',x,F,200,250,{force:(e.cosmicCycle%2?1:-1)*170,damage:0,life:2});break;
   case 'stormLeviathan':case 'prominenceDragon':for(let i=-1;i<=1;i++)projectile(g,e,'plasma',{vy:i*90});break;
   case 'darkSpotVoidling':hazard(g,e,'bullet-gravity',e.x,e.y,220,180,{damage:0,life:2,bulletPull:true});break;
   case 'lunarShadowStalker':e.hiddenTime=1.5;e.bulletUntargetable=true;break;
   case 'crescentWisp':hazard(g,e,'cold-ray',x,F,65,260,{freeze:1});break;
   case 'solarCoreElemental':projectile(g,e,'gamma',{w:26,h:16});break;
   case 'sunspotShadowFiend':hazard(g,e,'shadow',e.x,F,150,110);break;
   case 'nuclearFusionParasite':hazard(g,e,'fusion',e.x,e.y,150,150);break;
   case 'singularityVoidEater':hazard(g,e,'time-slow',e.x,e.y,240,220,{damage:0,slow:.5,life:3});break;
   case 'spaghettifiedConstruct':hazard(g,e,'long-limb',(e.x+x)/2,F,Math.abs(e.x-x)+40,55);break;
   case 'timeWarpSpecter':reverse(g,e);break;
   case 'eventHorizonParasite':hazard(g,e,'bullet-gravity',e.x,e.y,260,220,{damage:0,bulletPull:true,life:3});break;
   case 'gravitationalAnomaly':for(let i=0;i<4;i++){const a=i*Math.PI/2;projectile(g,e,'chaos',{vx:Math.cos(a)*180,vy:Math.sin(a)*180});}break;
  }
 }
 function bossCast(g,e){
  const B=C().boss,skill=e.cosmicSkill,x=e.targetX;
  const rain=(type,count)=>{for(let i=0;i<count;i++){let xx=95+i*(770/(count-1));if(Math.abs(xx-x)<60)xx=x;hazard(g,e,type,xx,F,55,F-50,{warning:B.warning+i*.14,life:.45});}};
  switch(skill){
   case 'mercury-quake':case 'martian-ground-rift':hazard(g,e,'ground-wave',480,F,W,B.quakeHeight,{warning:.25,life:.6});g.shake=8;break;
   case 'blazing-meteor-rain':rain('meteor',B.meteorCount);break;
   case 'acid-vortex':hazard(g,e,'acid-vortex',clamp(e.x),F,125,240,{life:3,vx:e.dir*100,tick:1});break;
   case 'acid-rain':for(let i=0;i<4;i++)hazard(g,e,'acid-rain',120+i*240,F,100,250,{life:B.puddleLife,tick:1});break;
   case 'thermal-dust-storm':for(const xx of [220,740])hazard(g,e,'fire-twister',xx,F,110,230,{life:3,vx:xx<480?65:-65,tick:1});break;
   case 'green-thunder-columns':rain('green-lightning',4);break;
   case 'extreme-pressure-wave':hazard(g,e,'pressure',480,F,W,60,{life:.45,force:e.dir*200});break;
   case 'defensive-ice-rings':e.ward=3;break;
   case 'rolling-ice-boulders':for(let i=0;i<3;i++)hazard(g,e,'ice-boulder',e.x-e.dir*i*65,F,70,70,{vx:e.dir*210,life:4,warning:.3+i*.2});break;
   case 'eternal-ice-lance':hazard(g,e,'ice-path',(e.x+x)/2,F,Math.abs(e.x-x)+70,45,{freeze:B.freezeTime,life:2});break;
   case 'silver-icicle-rain':rain('silver-ice',B.iceCount);break;
   case 'gravitational-pull':hazard(g,e,'gravity-pull',e.x,F,650,360,{damage:0,force:0,pull:true,life:B.fieldLife,tick:1});break;
   case 'gravitational-push':hazard(g,e,'gravity-push',e.x,F,650,360,{force:e.dir*B.pushSpeed,life:.7});break;
   case 'judgment-crescent':for(const dy of [0,-85,-170])projectile(g,e,'crescent',{y:F-30+dy,w:40,h:50,damage:2,vx:e.dir*290,vy:0});break;
   case 'frozen-stasis-zones':for(const xx of [150,480,810])hazard(g,e,'freeze-zone',xx,F,125,120,{freeze:B.freezeTime,life:2,damage:0});break;
   case 'nuclear-storm':for(let i=0;i<5;i++)hazard(g,e,'nuclear-heat',100+i*185,F,85,95,{life:2,tick:1});break;
   case 'supreme-solar-ray':hazard(g,e,'solar-ray',x,F,B.rayWidth,370,{ignoreShield:true,warning:1.2,life:.7});break;
   case 'void-pull':hazard(g,e,'void-field',e.x,F,650,400,{pull:true,bulletPull:true,life:3,tick:1});break;
   case 'time-rend':reverse(g,e);break;
   case 'extinction-shockwave':hazard(g,e,'extinction',480,F,W,420,{warning:B.extinctionWarning,life:.4,extinction:true});break;
  }
 }
 function updateEnemy(g,e,dt){
  if(!active(g)||!owns(e))return false;if(!e.cosmicState)setup(g,e);
  e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.contactNext=Math.max(0,e.contactNext-dt);e.ward=Math.max(0,(e.ward||0)-dt);
  if(e.phase==='warning'){e.warning-=dt;if(e.warning<=0)e.phase='active';return true;}
  if(MM.SkillManager?.frozen(e)||e.cosmicFrozen>0){e.cosmicFrozen=Math.max(0,(e.cosmicFrozen||0)-dt);return true;}
  e.cosmicClock+=dt;e.hiddenTime=Math.max(0,(e.hiddenTime||0)-dt);if(e.hiddenTime===0&&e.cosmicState!=='burrow')e.bulletUntargetable=false;
  const k=kind(e),p=g.player;
  if(e.cosmicState==='tell'){
   e.cosmicTimer-=dt;e.castProgress=1-Math.max(0,e.cosmicTimer)/e.cosmicDuration;
   if(e.cosmicTimer<=EPS){e.castProgress=0;e.strikeProgress=1;e.cosmicState='rest';e.cosmicTimer=C().boss.recovery;e.boss?bossCast(g,e):ordinaryCast(g,e);e.cosmicCycle++;}return true;
  }
  e.strikeProgress=Math.max(0,(e.strikeProgress||0)-dt*3);
  if(e.cosmicState==='dash'||e.cosmicState==='burrow'){
   e.cosmicTimer=Math.max(0,e.cosmicTimer-dt);const u=1-e.cosmicTimer/e.cosmicDuration;const end=e.dashTarget??e.targetX;
   e.x=e.startX+(end-e.startX)*(u*u*(3-2*u));
   if(e.cosmicTimer<=EPS){e.bulletUntargetable=false;e.cosmicState='rest';e.cosmicTimer=.6;}else return true;
  }
  if(e.cosmicState==='rest'){e.cosmicTimer-=dt;if(e.cosmicTimer<=EPS){e.cosmicState='walk';e.cosmicNext=e.boss?C().boss.cooldown:C().ordinary.cooldown;}return true;}
  if(k!=='ringAsteroidSentient'||e.awake)move(g,e,dt,e.speed,e.boss?240:100);
  if(e.airborne)e.y=e.baseFlightY+Math.sin(e.cosmicClock*1.9)*7;
  e.cosmicNext-=dt;
  if(e.cosmicNext<=EPS){const r=D().regions.find(r=>r.boss===k);tell(g,e,e.boss?r.bossSkills[e.cosmicCycle%r.bossSkills.length]:e.ability);}
  if(e.contactNext<=0&&!e.bulletUntargetable){
   const knight=MM.CosmicRewards?.damageKnight(g,{x:e.x,y:e.y,w:e.w,h:e.h,damage:e.damage||1});
   if(knight||touch(p,e)){e.contactNext=1.5;if(touch(p,e))apply(g,e,{damage:e.damage||1});}
  }
  return true;
 }
 function update(g,dt){
  if(!active(g)||g.screen!=='playing')return;const s=state(g),p=g.player;s.clock+=dt;s.slow=Math.max(0,s.slow-dt);s.corrosion=Math.max(0,s.corrosion-dt);s.vision=Math.max(0,s.vision-dt);s.force=0;
  for(const z of s.hazards){
   if(z.owner?.dead){z.life=0;continue;}if(z.warning>0){z.warning=Math.max(0,z.warning-dt);continue;}
   z.elapsed+=dt;z.life-=dt;z.x+=finite(z.vx)*dt;
   if(!z.extinction)MM.CosmicRewards?.damageKnight(g,z);
   if(z.bulletPull)for(const b of g.bullets||[]){const dx=z.x-b.x,dy=z.y-z.h*.5-b.y;if(Math.hypot(dx,dy)<z.w/2){b.vx=(b.vx??b.dir*(b.speed||780))+Math.sign(dx)*120*dt;b.vy=(b.vy||0)+Math.sign(dy)*100*dt;}}
   if(!touch(p,z))continue;
   if(z.extinction){if(!z.hit){z.hit=true;const safe=C().boss.coverXs.some(x=>Math.abs(p.x-x)<=C().boss.coverWidth/2);if(!safe){p.health=Math.max(0,p.health*.1);g.updateUI?.();}}continue;}
   if(z.pull)s.force=Math.sign(z.x-p.x)*C().boss.pullSpeed;else if(z.force)s.force=z.force;
   if(z.slow)s.slow=Math.max(s.slow,.15);
   if(z.tick){z.nextHit=(z.nextHit??0)-dt;if(z.nextHit>0)continue;z.nextHit=z.tick;}else if(z.hit)continue;
   z.hit=true;const hit=apply(g,z.owner,{damage:z.damage,stun:z.stun,petrify:z.freeze,ignoreShield:z.ignoreShield,forceHit:false});
   if(hit&&z.vision)s.vision=z.vision;
  }
  for(const q of s.projectiles){if(q.owner?.dead){q.life=0;continue;}q.life-=dt;q.vy+=finite(q.gravity)*dt;const oldX=q.x,oldY=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;
   const swept={x:(oldX+q.x)/2,y:Math.max(oldY,q.y)+q.h/2,w:Math.abs(q.x-oldX)+q.w,h:Math.abs(q.y-oldY)+q.h};
   if(MM.CosmicRewards?.damageKnight(g,{...swept,damage:q.damage})){q.life=0;continue;}
   if(touch(p,swept)){const hit=apply(g,q.owner,{damage:q.damage,petrify:q.freeze});if(hit&&q.corrosion)s.corrosion=C().ordinary.corrosionTime;q.life=0;}
  }
  s.hazards=s.hazards.filter(z=>z.life>0&&z.x>-200&&z.x<W+200);s.projectiles=s.projectiles.filter(q=>q.life>0&&q.x>-50&&q.x<W+50&&q.y>-100&&q.y<600);
 }
 function hit(g,e,amount,attack){
  if(!active(g)||!owns(e))return;
  if(e.ward>0)return false;
  const k=kind(e);
  if(k==='frostCrystalGolem'&&!attack.magic&&attack.kind!=='melee'&&Math.sign((attack.vx??attack.dir)||0)===-e.dir){projectile(g,e,'reflected',{damage:amount*.5});return false;}
  if(['darkSpotVoidling','nuclearFusionParasite'].includes(k)){
   const growth=Math.min(C().ordinary.maxGrowth,(e.cosmicGrowth||1)+C().ordinary.voidGrowth);e.cosmicGrowth=growth;e.w=e.baseW*growth;e.h=e.baseH*growth;
   if(k==='darkSpotVoidling'&&!attack.magic)return false;
  }
  const multiplier=attack.trueDamage?1:k==='sunspotShadowFiend'?C().ordinary.shadowDamageMultiplier:state(g).corrosion>0?C().ordinary.corrosionDamageMultiplier:1;
  if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,amount*multiplier,attack);else e.health-=amount*multiplier;return true;
 }
 function onKill(g,e){
  if(!active(g)||!owns(e))return;const s=state(g);s.hazards=s.hazards.filter(z=>z.owner!==e);s.projectiles=s.projectiles.filter(z=>z.owner!==e);
  if(kind(e)==='livingCinnabar'&&!e.cinnabarChild){for(let i=0;i<3;i++){const child=g.spawn('livingCinnabar',i%2?1:-1);child.minion=true;child.cinnabarChild=true;child.phase='active';child.x=clamp(e.x+(i-1)*40);child.w*=.5;child.h*=.5;child.health=child.maxHealth=1;}}
  if(kind(e)==='atmosphericWisp')hazard(g,null,'death-pull',e.x,e.y,180,140,{damage:0,pull:true,life:1,warning:.4});
 }
 function modifiers(g){if(!active(g))return {speed:1,gravity:1};const s=state(g),band=Math.floor((g.level.id-251)/10);return {speed:s.slow>0?.6:1,gravity:C().suit.gravity[band],force:s.force};}
 function finite(n){return Number.isFinite(n)?n:0;}
 MM.CosmicCombat={active,owns,reset,setup,updateEnemy,update,hit,onKill,hazard,projectile,modifiers,touch,reverse};
})(typeof window!=='undefined'?window:globalThis);
