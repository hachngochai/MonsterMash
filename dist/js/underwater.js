/* Water physics, finite oxygen, pooled bubbles and suspended supply crates.
 * No normal-stage physics or inventory/save format lives in this module. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const cfg=()=>MM.UnderwaterConfig,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const active=g=>g.level?.underwater===true&&!g.endingOnLand;
  const freeSwim=g=>active(g)&&!!MM.SaveManager?.unlocked(g,190)&&!MM.MapManager?.suppressed(g);
  const touch=(p,b)=>Math.abs(p.x-b.x)<(p.w+b.w)/2&&p.y>b.y-b.h&&p.y-p.h<b.y;
  function reset(g,options={}){
    g.waterShots=[];g.waterZones=[];
    const enabled=active(g),c=cfg();
    g.underwater={active:enabled,clock:0,oxygen:c.oxygen.capacity,maxOxygen:c.oxygen.capacity,
      reserve:clamp(Number.isFinite(options.reserve)?options.reserve:c.oxygen.initialReserve,0,c.oxygen.maxReserve),
      suffocating:false,suffocationTime:0,damageClock:0,silenceTime:0,refillCooldown:0,
      bubbles:[],bubblePool:[],bubbleTimer:0,oxygenCrates:[],oxygenTimer:c.loot.oxygenInterval,middleHazardTimer:MM.MiddleSeaConfig?.jellyfish.spawnInterval||5.5,uiSignature:null};
    g.middleSeaEncounter=null;MM.MerfolkTransformation?.reset(g);MM.FinalSeaEnemies?.reset(g);
    const p=g.player;if(p){p.swimming=enabled;p.suffocating=false;p.swimPhase=0;p.swimTilt=0;p.swimAnchorY=c.arena.centerY;p.jumpBuffer=0;
      if(enabled){p.y=c.arena.centerY;p.vy=0;p.grounded=false;p.coyote=0;}}
    return g.underwater;
  }
  function stop(g){
    const s=g.underwater;if(s){s.suffocating=false;s.suffocationTime=s.damageClock=s.silenceTime=0;s.bubbles.length=0;s.bubblePool.length=0;s.oxygenCrates.length=0;s.uiSignature=null;}
    g.waterShots=[];g.waterZones=[];if(g.player)g.player.suffocating=false;
    MM.Boss160?.reset(g);
    MM.Boss170?.reset(g);MM.MiddleSeaEnemies?.reset(g);
    MM.Boss180?.reset(g);MM.PredatorSeaEnemies?.reset(g);MM.MerfolkTransformation?.stop(g);
    MM.Boss190?.reset(g);MM.DeepSeaEnemies?.reset(g);MM.Boss200?.reset(g);MM.FinalSeaEnemies?.stop(g);
    if(g.player)g.player.electricStunGrace=0;
  }
  function state(g){return g.underwater?.active===active(g)?g.underwater:reset(g);}
  function canAttack(g){return !(g.player?.swallowedTime>EPS)&&(!active(g)||(state(g).oxygen>EPS||!!MM.MerfolkTransformation?.active(g))&&state(g).silenceTime<=EPS);}
  function oxygenChanged(g){
    if(!active(g))return;
    const s=state(g);s.oxygen=clamp(s.oxygen,0,s.maxOxygen);s.suffocating=s.oxygen<=EPS&&!MM.MerfolkTransformation?.active(g);
    if(!s.suffocating){s.suffocationTime=0;s.damageClock=0;}
    if(g.player)g.player.suffocating=s.suffocating;
  }
  function bubble(g,x,y,burst=false){
    const s=state(g),c=cfg().particles;if(s.bubbles.length>=c.limit)return false;
    const b=s.bubblePool.pop()||{};const random=()=>g.random?.()??Math.random();
    Object.assign(b,{x,y,vx:(random()-.5)*(burst?65:13),vy:-c.riseSpeed*(burst?1.6:1),
      life:c.life,maxLife:c.life,size:(burst?3:1.5)+random()*2,phase:random()*6.28});s.bubbles.push(b);return true;
  }
  function bubbleBurst(g,x,y){for(let i=0;i<12;i++)bubble(g,x,y,true);}
  function supply(g){
    if(!active(g)||g.screen!=='playing'||g.weaponPicker?.open)return false;
    const s=state(g),o=cfg().oxygen;
    if(g.level.middleSea&&g.player.stunTime>0&&MM.MiddleSeaConfig?.boss.supplyWhileStunned===false)return false;
    if(s.refillCooldown>EPS)return false;
    if(s.oxygen>=s.maxOxygen-EPS){g.toast?.('Oxy đang đầy · giữ bình dự trữ cho lúc cần');return false;}
    if(s.reserve<1){g.toast?.('Hết bình oxy dự trữ · tìm hòm O₂ màu xanh');g.floating?.(g.player.x,g.player.y-g.player.h-10,'CẦN HÒM O₂','#ffbd91');return false;}
    s.reserve--;s.oxygen=Math.min(s.maxOxygen,s.oxygen+o.refill);s.refillCooldown=o.refillCooldown;
    oxygenChanged(g);bubbleBurst(g,g.player.x,g.player.y-g.player.h*.5);
    g.floating?.(g.player.x,g.player.y-g.player.h-12,'+OXY','#93f1f9');g.sound?.play('ammo');g.updateUI?.();return true;
  }
  function drown(g){
    const p=g.player;p.health=Math.max(0,p.health-cfg().oxygen.suffocationDamage);
    g.floating?.(p.x,p.y-p.h-14,'NGẠT NƯỚC','#ffac99');g.flash=.12;g.sound?.play('hit');
    if(!p.health)g.finish(false);g.updateUI?.();
  }
  function update(g,dt){
    if(!active(g)||g.screen!=='playing'||g.weaponPicker?.open)return;
    const s=state(g),c=cfg(),p=g.player;s.clock+=dt;
    s.refillCooldown=Math.max(0,s.refillCooldown-dt);s.silenceTime=Math.max(0,s.silenceTime-dt);
    const protectedTime=MM.MerfolkTransformation?.advance(g,dt)||0,airTime=Math.max(0,dt-protectedTime);
    const drain=c.oxygen.drainPerSecond*(g.level.oxygenDrainMultiplier||1);
    const before=s.oxygen;s.oxygen=Math.max(0,s.oxygen-drain*airTime);oxygenChanged(g);
    if(s.suffocating){
      const elapsed=before>EPS?Math.max(0,airTime-before/drain):airTime;
      const was=s.suffocationTime;s.suffocationTime+=elapsed;
      if(was<c.oxygen.suffocationGrace&&s.suffocationTime+EPS>=c.oxygen.suffocationGrace)drown(g);
      s.damageClock+=Math.max(0,s.suffocationTime-c.oxygen.suffocationGrace)-Math.max(0,was-c.oxygen.suffocationGrace);
      while(s.damageClock+EPS>=c.oxygen.suffocationTick&&g.screen==='playing'){s.damageClock-=c.oxygen.suffocationTick;drown(g);}
    }
    if(g.screen!=='playing')return;
    s.bubbleTimer-=dt;
    if(s.bubbleTimer<=EPS){bubble(g,p.x+p.dir*10,p.y-p.h*.7);s.bubbleTimer=s.suffocating?c.particles.suffocatingInterval:Math.abs(p.vx)>12?c.particles.movingInterval:c.particles.idleInterval;}
    for(let i=s.bubbles.length-1;i>=0;i--){const b=s.bubbles[i];b.life-=dt;b.x+=(b.vx+Math.sin(s.clock*2+b.phase)*5)*dt;b.y+=b.vy*dt;
      if(b.life<=0||b.y<0){s.bubbles[i]=s.bubbles[s.bubbles.length-1];s.bubbles.pop();s.bubblePool.push(b);}}
    updateOxygenLoot(g,dt);
  }
  function swim(g,move,dt){
    const p=g.player,s=state(g),c=cfg(),water=c.swim;
    if(p.swallowedTime>EPS){p.vx=p.vy=0;return;}
    const free=freeSwim(g),vertical=free?(g.swimVertical||0):0;
    const magnitude=Math.max(1,Math.hypot(move,vertical)),wanted=move/magnitude*water.speed;
    if(move)p.vx+=clamp(wanted-p.vx,-water.acceleration*dt,water.acceleration*dt);
    else p.vx*=Math.exp(-water.drag*dt);
    if(move)p.dir=move;
    if(g.rollSlash?.time>0){p.vx=g.rollSlash.dir*water.rollSpeed;p.dir=g.rollSlash.dir;}
    p.x=clamp(p.x+p.vx*dt,c.arena.edge,c.arena.width-c.arena.edge);
    if(free){
      if(vertical)p.vy+=clamp(vertical/magnitude*water.speed-p.vy,-water.acceleration*dt,water.acceleration*dt);
      else p.vy*=Math.exp(-water.drag*dt);
      p.y=clamp(p.y+p.vy*dt,p.h+18,c.arena.height-20);
    }else{
      const anchor=Number.isFinite(p.swimAnchorY)?p.swimAnchorY:c.arena.centerY;
      const desiredY=anchor+Math.sin(s.clock*water.bobRate)*water.bob;
      p.vy+=((desiredY-p.y)*water.verticalSpring-p.vy*water.verticalDamping)*dt;p.y=clamp(p.y+p.vy*dt,c.arena.minY,c.arena.maxY);
    }
    p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.swimming=true;p.swimPhase=s.clock*(Math.abs(p.vx)>12?9:2);
    const tilt=p.vx/water.speed*.16+(free?p.vy/water.speed*.32:0);p.swimTilt+=(tilt-p.swimTilt)*(1-Math.exp(-dt*8));
  }
  function floatItem(g,item,dt){
    if(!Number.isFinite(item.waterBaseY))item.waterBaseY=cfg().arena.itemY;
    if(!item.landed){
      item.y=Math.min(item.waterBaseY,item.y+cfg().loot.sinkSpeed*dt);
      if(item.y>=item.waterBaseY-EPS){item.landed=true;item.y=item.waterBaseY;}
    }else{item.life-=dt;item.y=item.waterBaseY+Math.sin(state(g).clock*cfg().loot.bobRate+(item.x||0)*.02)*cfg().loot.bob;}
    item.rotation=Math.sin(state(g).clock*.9+item.x)*.045;
  }
  function dropOxygen(g,x){
    const s=state(g),c=cfg();if(s.oxygenCrates.length>=c.loot.oxygenLimit)return null;
    const crate={x:clamp(x??(80+(g.random?.()??Math.random())*800),50,910),y:-35,w:34,h:32,life:c.loot.oxygenLife,landed:false,kind:'oxygen'};
    s.oxygenCrates.push(crate);return crate;
  }
  function updateOxygenLoot(g,dt){
    const s=state(g);s.oxygenTimer-=dt;
    if(s.oxygenTimer<=EPS)s.oxygenTimer=dropOxygen(g)?cfg().loot.oxygenInterval:.5;
    for(const box of s.oxygenCrates){floatItem(g,box,dt);if(s.reserve<cfg().oxygen.maxReserve&&touch(g.player,box)){
      s.reserve=Math.min(cfg().oxygen.maxReserve,s.reserve+cfg().oxygen.reservePerCrate);box.life=0;
      bubbleBurst(g,box.x,box.y-15);g.floating?.(box.x,box.y-35,`+${cfg().oxygen.reservePerCrate} BÌNH O₂`,'#91eef5');g.sound?.play('ammo');g.updateUI?.();}}
    s.oxygenCrates=s.oxygenCrates.filter(box=>box.life>0);
  }
  function updateAmmo(g,dt){
    g.ammoTimer-=dt;if(g.ammoTimer<=0)g.ammoTimer=g.dropAmmo()?g.level.ammoInterval||5.8:.5;
    for(const box of g.ammoCrates){floatItem(g,box,dt);if(g.player.ammo<g.player.maxAmmo&&touch(g.player,box)){
      const amount=Math.min(box.amount,g.player.maxAmmo-g.player.ammo);g.player.ammo+=amount;box.life=0;
      g.floating?.(box.x,box.y-40,`+${amount} ĐẠN`,'#e6d099');g.sound?.play('ammo');g.updateAmmoUI?.();}}
    g.ammoCrates=g.ammoCrates.filter(box=>box.life>0);
  }
  function updateHealthItem(g,item,dt){
    if(!item.waterInitialized){item.waterInitialized=true;item.waterBaseY=cfg().arena.itemY;item.y=cfg().arena.itemY;item.landed=true;}
    // The shared pickup loop owns expiry and healing. Only its position changes.
    const lifetime=item.life;floatItem(g,item,dt);item.life=lifetime;
  }
  function syncUI(g){
    if(g.headless||!root.document||!g.ui)return;
    const on=active(g),s=on?state(g):null,bar=g.ui['oxygen-hud'],button=g.ui['oxygen-button'];
    if(bar)bar.hidden=!on;if(button)button.hidden=!on;
    root.document.body?.classList?.toggle('underwater-playing',on&&g.screen!=='home');
    const jump=root.document.querySelector('.jump-control');
    if(jump){const caption=jump.querySelector('small');if(caption)caption.textContent=on?'OXY':'NHẢY';jump.setAttribute('aria-label',on?'Cấp oxy từ bình dự trữ':'Nhảy');}
    if(!on)return;
    if(button){button.disabled=g.screen!=='playing'||g.weaponPicker?.open||s.reserve<1||s.oxygen>=s.maxOxygen-EPS||s.refillCooldown>EPS;button.textContent='↑ Cấp O₂ · '+s.reserve+' bình';}
    const electricStun=g.player.stunStyle==='electric'&&g.player.stunTime>0?g.player.stunTime:0;
    const merfolk=MM.MerfolkTransformation?.active(g),panic=s.panicTime>EPS;
    const signature=[Math.ceil(s.oxygen*10),s.reserve,s.suffocating,Math.ceil(s.suffocationTime),Math.ceil(s.silenceTime),Math.ceil(electricStun),merfolk,Math.ceil(s.panicTime||0),g.screen].join('|');
    if(s.uiSignature===signature)return;s.uiSignature=signature;
    if(bar){bar.classList.toggle('oxygen-low',s.oxygen/s.maxOxygen<cfg().oxygen.warningRatio);bar.classList.toggle('suffocating',s.suffocating);bar.classList.toggle('oxygen-protected',!!merfolk);bar.classList.toggle('oxygen-panic',panic&&!merfolk);
      bar.setAttribute('aria-label',`Oxy ${Math.ceil(s.oxygen)} trên ${s.maxOxygen}. ${s.reserve} bình dự trữ.`);}
    const pips=g.ui['oxygen-pips'];if(pips){if(!pips.children.length)for(let i=0;i<10;i++){const pip=root.document.createElement('i');pip.setAttribute('aria-hidden','true');pips.append(pip);}
      [...pips.children].forEach((pip,i)=>pip.classList.toggle('filled',s.oxygen/s.maxOxygen*10>i));}
    if(g.ui['oxygen-label'])g.ui['oxygen-label'].textContent='O₂ '+Math.ceil(s.oxygen)+' / '+s.maxOxygen+' · '+s.reserve+' bình';
    if(g.ui['underwater-status'])g.ui['underwater-status'].textContent=[merfolk?'NGƯ NHÂN · MIỄN HAO OXY':'',panic&&!merfolk?'HOẢNG LOẠN '+Math.ceil(s.panicTime)+'s':'',s.suffocating?'NGẠT '+Math.max(0,Math.ceil(cfg().oxygen.suffocationGrace-s.suffocationTime))+'s':'',s.silenceTime>EPS?'CÂM LẶNG '+Math.ceil(s.silenceTime)+'s':'',electricStun?'⚡ CHOÁNG '+Math.ceil(electricStun)+'s':''].filter(Boolean).join(' · ');
  }
  function bind(g){g.ui?.['oxygen-button']?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();supply(g);g.canvas?.focus({preventScroll:true});});}
  MM.UnderwaterMode={active,freeSwim,reset,stop,state,update,swim,canAttack,supply,oxygenChanged,bubble,bubbleBurst,syncUI,bind};
  MM.OxygenSystem={supply,update,oxygenChanged,canAttack};
  MM.UnderwaterLoot={floatItem,dropOxygen,updateAmmo,updateHealthItem};
})(typeof window!=='undefined'?window:globalThis);
