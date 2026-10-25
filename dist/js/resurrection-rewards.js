/* Permanent unlocks, temporary combat effects. Never serialize an ally,
 * projectile, transformed body or cooldown into the player's saved inventory. */
(function(root){'use strict';const MM=root.MM=root.MM||{},W=960,F=438,EPS=1e-8;
 const C=()=>MM.IslandConfig.rewards,clamp=(n,a=26,b=934)=>Math.max(a,Math.min(b,n));
 const enabled=(g,id)=>g.level?.id!==70&&MM.SaveManager?.unlocked(g,id)===true;
 const alive=e=>e&&!e.dead&&!e.retired&&e.health>0&&e.phase==='active'&&!e.intangible&&!e.bulletUntargetable;
 const FORM_NAMES={glove:'Găng Tay Phước Lành',eggGun:'Súng Bắn Trứng',clover:'Cỏ Ba Lá',fire:'Ngọn Lửa Phục Sinh',staff:'Gậy Tộc Trưởng',moai:'Đá Moai',light:'Ánh Sáng Phục Sinh'};
 const FORMS=Object.keys(FORM_NAMES);
 function reset(g){if(g.player){g.player.w=38;g.player.h=54;}g.resurrection={clock:0,armorNext:C().armorInterval,armorRemaining:0,moai:null,moaiCooldown:0,clone:null,cloneCooldown:0,form:null,formRemaining:0,projectiles:[],zones:[],dash:null,auraNext:1};}
 function state(g){if(!g.resurrection)reset(g);return g.resurrection;}
 function currentForm(g){const s=g.resurrection;return enabled(g,230)&&g.progression?.equipped==='easterEgg'&&s?.formRemaining>EPS?s.form:null;}
 function protectsHP(g,spec={}){if(spec.judgment)return false;const s=g.resurrection,f=currentForm(g);return g.screen==='playing'&&((enabled(g,200)&&s?.armorRemaining>EPS)||f==='moai'||f==='light');}
 function shieldCap(g){return enabled(g,220)?C().shieldCap:3;}
 function choose(g,values,weights){let r=clamp(Number(g.random?.()??Math.random()),0,.999999999)*weights.reduce((a,b)=>a+b,0);for(let i=0;i<values.length;i++){r-=weights[i];if(r<0)return values[i];}return values[0];}
 function profile(g,dir){const id=g.progression?.equipped;if(id==='dreamBook')return {kind:'dreamBook',equipped:id,name:'Ảo Mộng',cost:0,cooldown:C().cloneCooldown,damage:0};
  if(id!=='easterEgg')return null;const form=currentForm(g),base={kind:form||'easterEgg',equipped:id,name:FORM_NAMES[form]||'Trứng Phục Sinh',cost:0,damage:0,cooldown:.35};
  return Object.assign(base,{glove:{damage:C().gloveDamage,cooldown:C().gloveCooldown,range:C().gloveRange},eggGun:{damage:C().eggDamage,cooldown:C().eggCooldown},clover:{damage:C().cloverDamage,cooldown:C().cloverCooldown},fire:{damage:C().fireballDamage,cooldown:C().fireballCooldown},staff:{damage:C().meteorDamage,cooldown:C().staffCooldown},moai:{damage:C().moaiMelee,cooldown:C().moaiAttackCooldown,melee:true,range:110}}[form]||{});}
 function ready(g){const p=g.player;return g.screen==='playing'&&!g.weaponPicker?.open&&p.shotTimer<=.001&&p.stunTime<=0&&p.petrifyTime<=0&&p.rollTime<=0&&!(g.rollSlash?.time>0)&&(!MM.UnderwaterMode||MM.UnderwaterMode.canAttack(g));}
 function activate(g){if(g.level?.id<201||g.level?.id>250||!enabled(g,210)||g.screen!=='playing'||g.weaponPicker?.open||g.player.stunTime>0||g.player.petrifyTime>0)return false;const s=state(g);if(s.moai||s.moaiCooldown>EPS)return false;
  s.moai={type:'friendlyMoai',x:clamp(g.player.x+(g.player.dir||1)*75),y:F,w:42,h:62,health:C().moaiHealth,maxHealth:C().moaiHealth,attackNext:0,hurtNext:0,dir:g.player.dir||1};s.moaiCooldown=C().moaiCooldown;g.burst?.(s.moai.x,F-30,'#c6bd91',18,'ring');return true;}
 function hit(g,e,damage,attack){return g.dealEnemyDamage?.(e,damage,attack)===true;}
 function shot(g,type,dir,damage,extra={}){const s=state(g);if(s.projectiles.length>=48)return;const p=g.player,q={type,x:p.x+dir*(p.w/2+8),y:p.y-p.h*.5,w:18,h:18,vx:dir*620,vy:0,damage,dir,life:1.7,hit:new Set(),...extra};
  if(type!=='moaiCrack'&&(g.aimMode==='high'||!MM.MapManager?.manualAim(g))){const target=(g.enemies||[]).filter(e=>alive(e)&&e.airborne&&(e.x-p.x)*dir>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(target){const angle=Math.atan2(target.y-target.h*.5-q.y,Math.abs(target.x-q.x)),vx=q.vx,vy=q.vy;q.vx=vx*Math.cos(angle)-dir*vy*Math.sin(angle);q.vy=Math.abs(vx)*Math.sin(angle)+vy*Math.cos(angle);}}
  s.projectiles.push(q);}
 function fire(g,direction){const id=g.progression?.equipped;if(!['easterEgg','dreamBook'].includes(id))return false;if(!ready(g)||!enabled(g,id==='easterEgg'?230:240))return false;const s=state(g),p=g.player,dir=direction<0?-1:1;
  if(id==='dreamBook'){if(s.cloneCooldown>EPS)return false;const options=(MM.WeaponManager?.available(g)||['gun']).filter(x=>!['easterEgg','dreamBook'].includes(x));const weapon=options[Math.floor(clamp(Number(g.random?.()||0),0,.999999)*options.length)]||'gun';
   s.clone={type:'dreamClone',x:clamp(p.x-dir*65),y:p.y,w:38,h:54,dir,health:C().cloneHealth,maxHealth:C().cloneHealth,life:C().cloneLife,weapon,attackNext:0,hurtNext:0};s.cloneCooldown=C().cloneCooldown;p.shotTimer=.35;g.burst?.(s.clone.x,s.clone.y-25,'#a7d7ff',20,'ring');return true;}
  if(!currentForm(g)){s.form=choose(g,FORMS,C().formWeights);s.formRemaining=C().formDuration;s.auraNext=s.clock+1;g.toast?.('PHỤC SINH · '+FORM_NAMES[s.form]+' · 20s');}
  const f=currentForm(g),weapon=profile(g,dir);p.dir=dir;p.shotTimer=p.shotCooldown=weapon.cooldown;p.weaponMode=f;
  let boosted=false;const damage=base=>{if(boosted)return base;boosted=true;return MM.SkillManager?.consumeDamage?.(g,base)??base;};
  if(f==='glove')shot(g,'blessing',dir,damage(C().gloveDamage),{vx:dir*840,life:C().gloveRange/840,w:42,h:36,magic:true});
  if(f==='eggGun')shot(g,'eggShot',dir,damage(C().eggDamage),{radius:C().eggRadius,w:25,h:31,vy:-70,gravity:160});
  if(f==='clover')for(let i=0;i<C().cloverCount;i++){const a=(i-2)*.12;shot(g,'cloverShot',dir,damage(C().cloverDamage),{vx:Math.cos(a)*dir*650,vy:Math.sin(a)*650,w:17,h:17});}
  if(f==='fire')shot(g,'fireball',dir,damage(C().fireballDamage),{w:38,h:38,magic:true});
  if(f==='staff'&&s.zones.length<4)s.zones.push({type:'meteorRain',x:clamp(p.x+dir*C().meteorRange*.5,240,720),w:C().meteorRange,life:C().meteorDuration,next:0,firstDamage:damage(C().meteorDamage)});
  if(f==='moai'){for(const e of g.enemies||[])if(alive(e)&&Math.abs(e.x-p.x)<110+e.w/2&&(e.x-p.x)*dir>=-20&&e.y>p.y-p.h&&e.y-e.h<p.y)hit(g,e,damage(C().moaiMelee),{kind:'moaiPunch',melee:true,dir});
   shot(g,'moaiCrack',dir,damage(C().moaiCrack),{y:F,w:35,h:42,vx:dir*700,life:.8,pierce:true,stun:C().moaiStun});}
  g.sound?.play('shot');return true;
 }
 function directionTap(g,dir){if(currentForm(g)!=='light'||g.screen!=='playing'||g.weaponPicker?.open)return false;const s=state(g),p=g.player;if(s.dash||p.stunTime>0||p.petrifyTime>0)return true;
  s.dash={from:p.x,to:dir<0?26:934,dir:dir<0?-1:1,time:0,duration:C().lightDashTime,hit:new Set()};p.dir=s.dash.dir;p.vx=0;return true;}
 function damageCompanion(g,spec={}){const s=g.resurrection;if(!s||!(spec.damage>0))return;for(const a of [s.moai,s.clone]){if(!a||s.clock<a.hurtNext||spec.target&&spec.target!==a)continue;
   if(Math.abs(a.x-spec.x)<(a.w+(spec.w||40))*.5&&a.y>(spec.y||F)-(spec.h||70)&&a.y-a.h<(spec.y||F)){a.health-=spec.damage;a.hurtNext=s.clock+1;}}}
 function updateAlly(g,a,dt){if(a.health<=0||Number.isFinite(a.life)&&a.life<=0)return;const s=state(g),target=(g.enemies||[]).filter(alive).sort((x,y)=>Math.abs(x.x-a.x)-Math.abs(y.x-a.x))[0];a.life=Number.isFinite(a.life)?a.life-dt:a.life;if(a.life<=0)return;
  if(target){a.dir=Math.sign(target.x-a.x)||a.dir;let cloneProfile=null;if(a.type==='dreamClone'){const context=Object.create(g);context.player={...g.player,x:a.x,y:a.y,dir:a.dir,shotTimer:0};context.progression={...g.progression,equipped:a.weapon};cloneProfile=MM.WeaponManager.profile(context,a.dir);}const range=a.type==='friendlyMoai'?80:cloneProfile?.melee?Math.max(25,(cloneProfile.range||70)*.7):280,d=target.x-a.x;if(Math.abs(d)>range)a.x=clamp(a.x+Math.sign(d)*100*dt);
   if(a.type==='dreamClone')a.y=g.player.y;
   if(s.clock>=a.attackNext&&Math.abs(d)<(a.type==='friendlyMoai'?100:700)){a.attackNext=s.clock+(a.type==='friendlyMoai'?C().moaiInterval:C().cloneInterval);
    if(a.type==='friendlyMoai'){if(target.y>a.y-a.h&&target.y-target.h<a.y)hit(g,target,C().moaiDamage,{kind:'ally-moai',melee:true,dir:a.dir});}
    else{const pr=cloneProfile,damage=pr.damage||1;a.attackNext=s.clock+Math.max(C().cloneInterval,pr.cooldown||0);
     if(pr.melee){if(Math.abs(d)<(pr.range||100)+target.w/2&&target.y>a.y-a.h&&target.y-target.h<a.y)hit(g,target,damage,{kind:pr.kind,melee:true,dir:a.dir,companion:true});}
     else{const x=a.x,y=a.y-a.h*.5,angle=Math.atan2(target.y-target.h*.5-y,target.x-x);for(let i=0;i<(pr.count||1)&&s.projectiles.length<48;i++){const theta=angle+(pr.spread?.[i]||0)*Math.PI/180;s.projectiles.push({type:'cloneShot',x,y,w:12,h:12,vx:Math.cos(theta)*650,vy:Math.sin(theta)*650,damage,dir:a.dir,life:1.5,hit:new Set(),magic:a.weapon==='lightningOrb'});}}}}
  }else{const d=g.player.x-65-a.x;if(Math.abs(d)>35)a.x=clamp(a.x+Math.sign(d)*80*dt);}
  for(const e of g.enemies||[])if(alive(e)&&!e.intangible&&Math.abs(e.x-a.x)<(e.w+a.w)*.5&&Math.abs(e.y-a.y)<e.h+a.h)damageCompanion(g,{x:e.x,y:e.y,w:e.w,h:e.h,damage:e.damage||0});
  for(const z of g.island?.hazards||[])if(z.phase==='active'&&MM.IslandCombat?.touches(a,z))damageCompanion(g,{...z,x:a.x,y:a.y,w:a.w,h:a.h,target:a});
  for(const q of g.enemyShots||[])if(q.life>0&&Math.abs(q.x-a.x)<a.w*.5+12&&q.y>a.y-a.h&&q.y<a.y){damageCompanion(g,{...q,damage:q.damage||1});q.life=0;}
 }
 function update(g,dt){if(g.screen!=='playing')return;const s=state(g),p=g.player;s.clock+=dt;s.armorRemaining=Math.max(0,s.armorRemaining-dt);s.moaiCooldown=Math.max(0,s.moaiCooldown-dt);s.cloneCooldown=Math.max(0,s.cloneCooldown-dt);
  if(enabled(g,200)&&s.clock+EPS>=s.armorNext){s.armorRemaining=C().armorDuration;do{s.armorNext+=C().armorInterval;}while(s.armorNext<=s.clock);}
  s.formRemaining=Math.max(0,s.formRemaining-dt);if(s.formRemaining<=EPS){s.form=null;s.dash=null;}
  const f=currentForm(g);p.w=f==='moai'?70:38;p.h=f==='moai'?105:54;
  if(f==='fire'&&s.clock+EPS>=s.auraNext){s.auraNext=s.clock+1;for(const e of g.enemies||[])if(alive(e)&&Math.hypot(e.x-p.x,(e.y-e.h*.5)-(p.y-p.h*.5))<=C().fireAuraRange)hit(g,e,C().fireAuraDamage,{kind:'resurrectionFire',magic:true});}
  if(s.dash){const d=s.dash,old=p.x;d.time+=dt;p.x=d.from+(d.to-d.from)*Math.min(1,d.time/d.duration);p.dir=d.dir;p.vx=0;
   for(const e of g.enemies||[])if(alive(e)&&!d.hit.has(e)&&e.x+e.w/2>=Math.min(old,p.x)&&e.x-e.w/2<=Math.max(old,p.x)){d.hit.add(e);hit(g,e,e.boss?C().lightBossDamage:C().lightRegularDamage,{kind:'resurrectionDash',dir:d.dir,magic:true});}
   if(d.time>=d.duration)s.dash=null;}
  for(const a of [s.moai,s.clone])if(a)updateAlly(g,a,dt);if(s.moai?.health<=0)s.moai=null;if(s.clone&&(s.clone.health<=0||s.clone.life<=0))s.clone=null;
  for(const z of s.zones){z.life-=dt;z.next-=dt;while(z.next<=0&&z.life>0){z.next+=C().meteorInterval;const x=clamp(z.x+(Number(g.random?.()??.5)-.5)*z.w),damage=z.firstDamage??C().meteorDamage;z.firstDamage=null;
    if(s.projectiles.length<48)s.projectiles.push({type:'meteor',x,y:10,w:38,h:48,vx:0,vy:420,damage,dir:1,magic:true,radius:55,life:2,hit:new Set()});}}
  for(const q of s.projectiles){q.life-=dt;const ox=q.x,oy=q.y;q.vy+=(q.gravity||0)*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;
   const candidates=(g.enemies||[]).filter(e=>alive(e)&&!q.hit.has(e)&&e.x+e.w/2>=Math.min(ox,q.x)-q.w/2&&e.x-e.w/2<=Math.max(ox,q.x)+q.w/2&&e.y>=Math.min(oy,q.y)-q.h&&e.y-e.h<=Math.max(oy,q.y));
   if(candidates.length||q.y>=F){if(q.radius){const target=candidates.sort((a,b)=>Math.abs(a.x-ox)-Math.abs(b.x-ox))[0];if(target){q.x=target.x;q.y=target.y-target.h*.5;}for(const e of g.enemies||[])if(alive(e)&&Math.hypot(e.x-q.x,(e.y-e.h*.5)-q.y)<q.radius){q.hit.add(e);hit(g,e,q.damage,{...q,kind:q.type,magic:q.magic});}g.burst?.(q.x,q.y,'#f3c37e',18,'ring');q.life=0;}
    else for(const e of candidates){q.hit.add(e);if(hit(g,e,q.damage,{...q,kind:q.type,magic:q.magic})&&q.stun&&!e.boss)e.petrifiedTime=Math.max(e.petrifiedTime||0,q.stun);if(!q.pierce){q.life=0;break;}}}
  }
  s.projectiles=s.projectiles.filter(q=>q.life>0&&q.x>-60&&q.x<W+60&&q.y<560);s.zones=s.zones.filter(z=>z.life>0);
 }
 const movementMultiplier=g=>currentForm(g)==='moai'?C().moaiMove:currentForm(g)==='light'?C().lightMove:1;
 MM.ResurrectionRewards={reset,update,activate,protectsHP,shieldCap,profile,fire,directionTap,movementMultiplier,currentForm,damageCompanion,names:FORM_NAMES,forms:FORMS};
})(typeof window!=='undefined'?window:globalThis);
