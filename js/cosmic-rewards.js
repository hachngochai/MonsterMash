/* Ten independent essence clocks. Costs are paid once per activation; every
 * damage event still passes through the existing boss/phase damage gates. */
(function(root){'use strict';
 const MM=root.MM=root.MM||{},W=960,F=438,EPS=1e-8;
 const C=()=>MM.CosmicBalance,R=()=>C().rewards,D=()=>MM.CosmicConfig.authored;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const unlocked=(g,id)=>g.level?.id!==70&&MM.SaveManager?.unlocked(g,id)===true;
 const eligible=e=>e&&!e.dead&&!e.retired&&e.health>0&&e.phase==='active'&&!e.intangible&&!e.bulletUntargetable;
 function state(g){if(!g.cosmicRewards||g.cosmicRewards.player!==g.player)reset(g);return g.cosmicRewards;}
 function reset(g){g.cosmicRewards={player:g.player,cooldowns:{},effects:[],projectiles:[],knights:[],flashes:[],burns:new Map(),stance:null,stanceGranted:false,bonusActive:false,virtualArmor:0,jetpack:0,jetCooldown:0};return g.cosmicRewards;}
 function profile(g){const s=state(g);if(!s.stance)return null;return {kind:'cosmicPalm',equipped:s.stance,name:s.stance==='moon'?'Chưởng Ánh Trăng':'Chưởng Mặt Trời',cost:R().palmAmmo,damage:R().palmBaseDamage+5,cooldown:R().palmCooldown,speed:650};}
 function describe(g,id){const spec=D().essences.find(e=>e.id===id),s=state(g);if(!spec)return null;
  const details={mercury:'99 sát thương/giây · nửa sân · 5s',venus:'5s · lướt/đánh hạ quái thường',mars:'99 sát thương/giây · nửa sân · 5s',jupiter:'99 sát thương/nhịp · 5 nhịp',saturn:'3 tảng đá · 20 sát thương/đá',uranus:'2 hộ vệ · 20 HP mỗi kị sĩ',neptune:'15s · hút 2 / đẩy 999 · đổi mỗi 2s',moon:'Chưởng +5 · 25% đóng băng · +50 HP',sun:'Chưởng +5 · thiêu đốt 3/giây · +50 HP',blackHole:'8s hút đạn · 50/giây · kết nổ 2000'};
  const effect=s.effects.find(e=>e.id===id),stance=s.stance===id,guard=id==='uranus'&&s.knights.length>0,cool=s.cooldowns[id]||0;
  const remaining=effect?.remaining||(guard?Math.max(...s.knights.map(a=>a.life)):0);
  const cost=['moon','sun'].includes(id)?R().palmAmmo+' đạn/chưởng':spec.ammoCost?spec.ammoCost+' đạn/lần':'Không tốn đạn';
  const cooldown=['moon','sun'].includes(id)?0:spec.cooldown??(id==='saturn'?R().stoneCooldown:id==='neptune'?R().neptuneCooldown:R().beamCooldown);
  const active=!!effect||stance||guard,status=stance?'Đang dùng · F để thoát':remaining>EPS?'Đang dùng '+remaining.toFixed(1)+'s':cool>EPS?'Hồi '+Math.ceil(cool)+'s':'Sẵn sàng';
  return {id,name:spec.name,detail:details[id],cost,cooldown,active,remaining,cool,status,ready:!active&&cool<=EPS,disabled:!!effect||guard||cool>EPS||g.player.ammo<(spec.ammoCost||0)};
 }
 function damage(g,e,amount,extra={}){if(!eligible(e)||amount<=0)return 0;const receipt={damage:0};g.dealEnemyDamage?.(e,amount,{kind:'cosmicEssence',projectile:false,magic:true,noKnockback:true,dir:g.player.dir,damageReceipt:receipt,...extra});return receipt.damage;}
 function leaveStance(g){const s=state(g);s.stance=null;if(s.bonusActive){g.player.maxHealth=Math.max(1,g.player.maxHealth-50);g.player.health=Math.min(g.player.health,g.player.maxHealth);s.bonusActive=false;}return true;}
 function activate(g,id){
  if(g.screen!=='playing'||g.weaponPicker?.open||g.player.stunTime>0||g.player.petrifyTime>0)return false;
  const spec=D().essences.find(e=>e.id===id);if(!spec||!unlocked(g,spec.unlock))return false;const s=state(g),p=g.player;
  if(s.cooldowns[id]>EPS||s.effects.some(e=>e.id===id))return false;
  if(p.ammo<(spec.ammoCost||0)){g.toast?.(spec.name+' cần '+spec.ammoCost+' đạn');return false;}
  p.ammo-=spec.ammoCost||0;
  if(id==='moon'||id==='sun'){
   if(s.stance===id)return true;s.stance=id;if(!s.bonusActive){p.maxHealth+=50;s.bonusActive=true;if(!s.stanceGranted){p.health+=50;s.stanceGranted=true;}}
  }else if(id==='saturn'){
   for(let i=0;i<3;i++)s.projectiles.push({id,kind:'stone',x:p.x-p.dir*i*34,y:F-20,w:38,h:40,vx:p.dir*R().stoneSpeed,vy:0,life:4,damage:20,hit:new Set()});
  }else if(id==='uranus'){
   if(s.knights.length>0)return false;
   MM.CosmicArt?.loadRegion('uranus');
   s.knights=Array.from({length:2},(_,i)=>({x:clamp(p.x+(i?65:-65),35,925),y:F,w:35,h:65,health:20,maxHealth:20,life:R().knightLife,next:0,dir:i?1:-1}));
  }else s.effects.push({id,remaining:spec.duration,age:0,dir:p.dir,x:id==='blackHole'?480:p.x,y:id==='blackHole'?270:p.y-30,next:0,state:0,hit:new Set()});
  if(id==='neptune')MM.CosmicArt?.loadRegion('neptune');
  s.cooldowns[id]=['moon','sun'].includes(id)?0:spec.cooldown??(id==='saturn'?R().stoneCooldown:id==='neptune'?R().neptuneCooldown:R().beamCooldown);
  p.weaponMode=s.stance?'cosmicPalm':p.weaponMode;
  g.toast?.('TINH TÚY · '+spec.name);g.updateAmmoUI?.();g.updateUI?.();return true;
 }
 function jetpack(g){
  if(!g.level?.cosmic||!unlocked(g,250)||g.screen!=='playing'||g.weaponPicker?.open)return false;const s=state(g);
  if(s.jetpack>0){s.jetpack=0;s.jetCooldown=C().suit.cooldown;return true;}
  if(s.jetCooldown>EPS)return false;s.jetpack=C().suit.duration;g.player.grounded=false;return true;
 }
 function flight(g,dt){const s=state(g);if(!g.level?.cosmic||s.jetpack<=0)return false;
  const p=g.player,target=Math.max(p.h+40,C().suit.hoverY),step=C().suit.verticalSpeed*dt;p.y+=clamp(target-p.y,-step,step);p.vy=0;p.grounded=false;return true;
 }
 function fire(g,dir){
  const s=state(g);if(!s.stance)return null;const p=g.player;
  if(g.screen!=='playing'||g.weaponPicker?.open||p.shotTimer>EPS||p.stunTime>0||p.petrifyTime>0||p.rollTime>0)return false;
  if(p.ammo<R().palmAmmo)return false;const base=R().palmBaseDamage+5;
  const enhanced=MM.SkillManager?.consumeDamage?.(g,base)??base;
  p.ammo-=R().palmAmmo;p.shotTimer=p.shotCooldown=R().palmCooldown;p.dir=dir;
  p.weaponMode='cosmicPalm';g.updateAmmoUI?.();
  const target=(g.enemies||[]).filter(eligible).filter(e=>(e.x-p.x)*dir>0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
  const y=p.y-p.h*.55,angle=g.aimMode==='high'&&target?Math.atan2(target.y-target.h*.5-y,target.x-p.x):dir<0?Math.PI:0;
  s.projectiles.push({id:s.stance,kind:'palm',x:p.x+dir*20,y,w:24,h:24,vx:Math.cos(angle)*650,vy:Math.sin(angle)*650,damage:enhanced,baseDamage:base,life:2,hit:new Set()});
  return true;
 }
 function hitOrdinary(g,e){const s=state(g);if(!s.effects.some(z=>z.id==='venus')||e.boss)return false;damage(g,e,e.health,{venus:true});return true;}
 function directionTap(g,dir){const s=state(g);if(!s.effects.some(z=>z.id==='venus')||g.player.rollTime>0||g.rollSlash?.time>0)return false;
  const from=g.player.x,to=clamp(from+dir*220,26,934);for(const e of [...g.enemies])if(eligible(e)&&!e.boss&&e.x>=Math.min(from,to)&&e.x<=Math.max(from,to))damage(g,e,e.health,{venus:true});
  g.player.x=to;return true;
 }
 function absorb(g,amount){const s=state(g),blocked=Math.min(Math.max(0,amount),s.virtualArmor);s.virtualArmor-=blocked;return Math.max(0,amount-blocked);}
 function stasis(g){return g.level?.id!==70&&state(g).effects.some(e=>e.id==='venus'&&e.remaining>0);}
 function update(g,dt){
  if(g.screen!=='playing'||g.weaponPicker?.open)return;const s=state(g),p=g.player;
  for(const key of Object.keys(s.cooldowns))s.cooldowns[key]=Math.max(0,s.cooldowns[key]-dt);
  for(const f of s.flashes)f.remaining=Math.max(0,f.remaining-dt);s.flashes=s.flashes.filter(f=>f.remaining>EPS);
  s.jetCooldown=Math.max(0,s.jetCooldown-dt);if(s.jetpack>0){s.jetpack=Math.max(0,s.jetpack-dt);if(s.jetpack<=EPS){s.jetpack=0;s.jetCooldown=C().suit.cooldown;}}
  for(const effect of s.effects){
   const spec=D().essences.find(e=>e.id===effect.id),elapsed=Math.min(dt,effect.remaining);effect.remaining=Math.max(0,effect.remaining-elapsed);effect.age+=elapsed;
   const candidates=[...(g.enemies||[])].filter(eligible);
   if(['mercury','mars','jupiter'].includes(effect.id)){
    const inRange=e=>(e.x-p.x)*effect.dir>=-e.w/2&&(e.x-p.x)*effect.dir<=W*.5+e.w/2&&Math.abs(e.y-e.h*.5-(p.y-p.h*.5))<90+e.h/2;
    effect.targets=candidates.filter(inRange);
    if(effect.id==='jupiter'){effect.next-=elapsed;while(effect.next<=EPS&&effect.remaining>EPS){for(const e of effect.targets)damage(g,e,99);effect.next+=R().vineHitInterval;}}
    else for(const e of effect.targets)damage(g,e,99*elapsed);
   }
   if(effect.id==='neptune'){
    const current=Math.floor((effect.age-EPS)/2),push=current%2===1;
    for(const e of candidates){if(!e.ccImmune){const v=(push?1:-1)*Math.sign(e.x-p.x)*180;e.x=clamp(e.x+v*elapsed,e.w/2+20,W-e.w/2-20);}if(effect.state!==current||!effect.hit.has(e)){
      damage(g,e,push?999:2);if(!push&&!e.ccImmune)e.cosmicFrozen=Math.max(e.cosmicFrozen||0,R().neptuneStun);effect.hit.add(e);
    }}if(effect.state!==current){effect.state=current;effect.hit=new Set(candidates);}
   }
   if(effect.id==='blackHole'){
    const inRange=e=>Math.hypot(e.x-480,e.y-e.h*.5-270)<=R().blackHoleRadius+Math.max(e.w,e.h)/2;
    for(const e of candidates.filter(inRange)){if(!e.ccImmune)e.x+=Math.sign(480-e.x)*Math.min(Math.abs(e.x-480),R().blackHolePullSpeed*elapsed);damage(g,e,50*elapsed);}
    const consume=list=>{for(const q of list||[]){if(q.life<=0||q.friendly||!Number.isFinite(q.x)||Math.hypot(q.x-480,q.y-270)>R().blackHoleRadius)continue;
      q.x+=Math.sign(480-q.x)*R().blackHolePullSpeed*elapsed;q.y+=Math.sign(270-q.y)*R().blackHolePullSpeed*elapsed;
      if(Math.hypot(q.x-480,q.y-270)<65){q.life=0;s.virtualArmor=Math.min(100,s.virtualArmor+.5);}
    }};
    consume(g.enemyShots);consume(g.cosmic?.projectiles);consume(g.island?.projectiles);
    if(effect.remaining<=EPS&&!effect.exploded){effect.exploded=true;s.flashes.push({x:480,y:270,remaining:1,duration:1});for(const e of [...g.enemies||[]].filter(eligible))if(e.x+e.w/2>=0&&e.x-e.w/2<=W)damage(g,e,2000,{trueDamage:true});g.shake=12;}
   }
  }
  s.effects=s.effects.filter(e=>e.remaining>EPS);
  for(const q of s.projectiles){q.life-=dt;const old=q.x;q.x+=q.vx*dt;q.y+=q.vy*dt;
   const targets=[...(g.enemies||[])].filter(eligible).filter(e=>!q.hit.has(e)&&e.x+e.w/2>=Math.min(old,q.x)-q.w/2&&e.x-e.w/2<=Math.max(old,q.x)+q.w/2&&q.y>=e.y-e.h&&q.y<=e.y);
   for(const e of targets){q.hit.add(e);const loss=damage(g,e,q.damage,{kind:q.kind==='palm'?'cosmicPalm':'cosmicStone',projectile:true,sourceProjectile:q});
    if(q.kind==='palm'){
     if(loss>0&&q.id==='moon'&&g.random()<.25&&!e.ccImmune)e.cosmicFrozen=Math.max(e.cosmicFrozen||0,R().moonFreezeDuration);
     if(loss>0&&q.id==='sun'&&!s.burns.has(e))s.burns.set(e,{time:2,tick:1});
     for(const other of [...g.enemies].filter(eligible))if(other!==e&&Math.hypot(other.x-e.x,(other.y-other.h/2)-(e.y-e.h/2))<=R().palmRadius)damage(g,other,q.baseDamage);
     q.life=0;break;
    }
   }
  }
  s.projectiles=s.projectiles.filter(q=>q.life>EPS&&q.x>-80&&q.x<W+80&&q.y>-50&&q.y<600);
  for(const [e,b] of s.burns){if(!eligible(e)){s.burns.delete(e);continue;}const elapsed=Math.min(b.time,dt);b.time-=elapsed;b.tick-=elapsed;while(b.tick<=EPS){damage(g,e,3);b.tick+=1;}if(b.time<=EPS)s.burns.delete(e);}
  for(const a of s.knights){a.life-=dt;a.next-=dt;const target=[...g.enemies].filter(eligible).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(!target)continue;
   const dx=target.x-a.x;a.dir=Math.sign(dx)||a.dir;a.x=clamp(a.x+clamp(dx,-130*dt,130*dt),25,935);
   if(Math.abs(dx)<90&&a.next<=EPS){damage(g,target,R().knightDamage);a.next=R().knightAttackInterval;}
  }
  s.knights=s.knights.filter(a=>a.health>0&&a.life>EPS);
 }
 function damageKnight(g,attack){const s=state(g),hits=attack.guardianHits||(attack.guardianHits=new Map()),now=g.cosmic?.clock||0;let hit=false;
  for(const a of s.knights){if(a.health<=0||!MM.CosmicCombat?.touch(a,attack))continue;const previous=hits.get(a);if(previous!==undefined&&(!attack.tick||now-previous<attack.tick-EPS))continue;
   hits.set(a,now);a.health=Math.max(0,a.health-Math.max(0,attack.damage??1));hit=true;
  }return hit;
 }
 function keyDown(g,event){if(g.screen!=='playing'||g.weaponPicker?.open)return false;const index=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'].indexOf(event.code);
  if(index>=0){event.preventDefault?.();if(!event.repeat)activate(g,D().essences[index].id);return true;}
  if(event.code==='KeyJ'&&g.level?.cosmic){event.preventDefault?.();if(!event.repeat)jetpack(g);return true;}return false;
 }
 MM.CosmicRewards={reset,state,profile,describe,activate,update,fire,jetpack,flight,leaveStance,damage,damageKnight,absorb,stasis,hitOrdinary,directionTap,keyDown};
})(typeof window!=='undefined'?window:globalThis);
