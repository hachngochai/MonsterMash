/* Monster Mash rebuild: simulation, input and UI. No external runtime required. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const Campaign = MM.Campaign;
  const W = 960, H = 540, GROUND = 438, SAVE_KEY = 'monster-mash-v2';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y > b.y - b.h && a.y - a.h < b.y;
  function readSave(storage) {
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(SAVE_KEY) || '{}') || {}; } catch { /* Private browsing can deny storage. */ }
    const valid = value => Number.isFinite(value) && value >= 0;
    const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(id => Number.isInteger(id) && id >= 1 && id <= Campaign.levels.length))] : [];
    return {
      version: 2, completed,
      resume: valid(raw.resume) ? Campaign.getLevel(raw.resume).id : 1,
      best: valid(raw.best) ? Math.floor(raw.best) : 0,
      settings: { difficulty: ['story','normal','hard'].includes(settings.difficulty) ? settings.difficulty : 'normal', controls: ['both','gestures','buttons'].includes(settings.controls) ? settings.controls : 'both', sound: settings.sound === true, effects: settings.effects !== false, reducedMotion: settings.reducedMotion === true }
    };
  }
  class Sound {
    constructor(game) { this.game = game; this.context = null; }
    unlock() {
      if (!this.game.settings.sound) return;
      try { const Audio = root.AudioContext || root.webkitAudioContext; if (Audio && !this.context) this.context = new Audio(); this.context?.resume()?.catch(() => {}); } catch { /* Audio is optional. */ }
    }
    play(kind) {
      if (!this.game.settings.sound || !this.context || this.context.state !== 'running') return;
      const notes = { shot:[230,65,.07,.035], hit:[100,35,.13,.045], kill:[560,180,.1,.035], shield:[320,940,.32,.05], win:[440,880,.45,.06], health:[660,990,.16,.04], ammo:[420,760,.15,.04], empty:[90,65,.04,.02] };
      const [start,end,length,volume] = notes[kind] || notes.shot;
      const ctx = this.context, t = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = kind === 'shot' || kind === 'hit' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(start,t); osc.frequency.exponentialRampToValueAtTime(end,t+length);
      gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(.001,t+length);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+length);
    }
  }
  class Game {
    constructor(options = {}) {
      this.headless = options.headless === true;
      this.random = options.random || Math.random;
      try { this.storage = options.storage || root.localStorage; } catch { this.storage = null; }
      this.save = readSave(this.storage);
      this.settings = this.save.settings;
      if (!this.headless && root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.settings.reducedMotion = true;
      this.level = Campaign.getLevel(this.save.resume);
      this.screen = 'home'; this.time = 0; this.levelTime = 0; this.lastTime = 0;
      this.enemies = []; this.bullets = []; this.particles = []; this.floats = []; this.pickups = [];
      this.ammoCrates = []; this.enemyShots = []; this.ammoTimer = 2.4;
      this.bossHazards = []; this.bossEggs = [];
      this.keys = new Set(); this.pointers = new Map(); this.padInputs = new Map();
      this.score = 0; this.totalKills = 0; this.levelKills = 0; this.shieldCount = 0;
      this.regularSpawned = 0; this.spawnTimer = 1; this.bossSpawned = false; this.bossDefeated = false;
      this.shake = 0; this.flash = 0; this.toastTime = 0; this.bannerTime = 0;
      this.tuning = Campaign.tuning(this.settings.difficulty); this.player = this.makePlayer();
      this.sound = new Sound(this); this.checkpoint = null; this.resultAction = null;
      if (!this.headless) {
        this.canvas = document.getElementById('canvas'); this.ctx = this.canvas.getContext('2d');
        this.ui = {}; document.querySelectorAll('[id]').forEach(node => this.ui[node.id] = node);
        this.mobileView = MM.MobileView ? new MM.MobileView(this, root) : null;
        this.bind(); this.buildMap(); this.syncSettings(); this.updateUI(); this.resize();
        this.frame = this.frame.bind(this);
        (MM.Typography?.ready || Promise.resolve()).then(() => {
          this.resize(); this.raf = root.requestAnimationFrame(this.frame);
        });
      }
    }
    makePlayer(health = this.tuning.health) {
      const ammo=Math.max(1,Math.round((this.level.initialAmmo||3)*(this.tuning.ammoMultiplier||1)));
      return {x:W/2,y:GROUND,w:38,h:54,dir:1,vx:0,vy:0,grounded:true,health,maxHealth:this.tuning.health,ammo,maxAmmo:this.level.ammoCapacity||18,shieldTime:0,shieldHits:0,invulnerable:1.5,shotTimer:0,dryCooldown:0,jumpBuffer:0,coyote:.1,stunTime:0,stunGrace:0,knockdownTime:0};
    }
    persist() { try { this.storage?.setItem(SAVE_KEY,JSON.stringify(this.save)); } catch { /* Game remains playable without localStorage. */ } }
    start(id = this.save.resume, options = {}) {
      const {carry = false, retry = false} = options;
      const oldHealth = this.player.health, oldAmmo=this.player.ammo;
      if (retry && this.checkpoint) {
        this.score = this.checkpoint.score; this.totalKills = this.checkpoint.totalKills; this.shieldCount = this.checkpoint.shieldCount;
      } else if (!carry) { this.score = 0; this.totalKills = 0; this.shieldCount = 0; }
      this.level = Campaign.getLevel(id); this.activeDifficulty = this.settings.difficulty; this.tuning = Campaign.tuning(this.activeDifficulty);
      this.player = this.makePlayer(carry ? clamp(oldHealth + (this.level.recovery ? 2 : 1),1,this.tuning.health) : this.tuning.health);
      if(carry)this.player.ammo=Math.min(this.player.maxAmmo,oldAmmo+this.player.ammo);
      else if(retry&&this.checkpoint)this.player.ammo=clamp(this.checkpoint.ammo??this.player.ammo,0,this.player.maxAmmo);
      this.checkpoint = {score:this.score,totalKills:this.totalKills,shieldCount:this.shieldCount,ammo:this.player.ammo};
      this.enemies = []; this.bullets = []; this.particles = []; this.floats = []; this.pickups = [];
      this.ammoCrates=[];this.enemyShots=[];this.ammoTimer=2.4;
      this.bossHazards=[];this.bossEggs=[];
      this.levelKills = 0; this.regularSpawned = 0; this.spawnTimer = 2.2; this.levelTime = 0; this.restTimer = 0;
      this.bossSpawned = false; this.bossDefeated = false; this.shake = 0; this.flash = 0;
      this.screen = 'playing'; this.clearInputs(); this.sound.unlock();
      this.save.resume = this.level.id; this.persist();
      if (!this.headless) {
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
        this.ui['home-overlay'].hidden = true; this.ui['result-overlay'].hidden = true;
        this.ui['toast'].hidden = true; this.toastTime = 0;
        this.mobileView?.enter();
        this.banner(`MÀN ${String(this.level.id).padStart(2,'0')} · ${this.level.name}`, this.level.boss ? 'HẠ ĐỦ ĐỊCH ĐỂ GỌI BOSS' : `HẠ ${this.level.target} ĐỊCH · ${this.level.recovery ? 'MỘT NHỊP THỞ NHẸ' : 'GIỮ NGỌN ĐÈN SÁNG'}`, 3);
        this.canvas.focus({preventScroll:true});
      }
      this.updateUI();
    }
    goHome() {
      this.save.best = Math.max(this.save.best,this.score); this.persist();
      this.screen = 'home'; this.clearInputs(); this.enemies = []; this.bullets = []; this.particles = []; this.pickups = []; this.floats = [];
      this.ammoCrates=[];this.enemyShots=[];
      this.bossHazards=[];this.bossEggs=[];
      this.level=Campaign.getLevel(this.save.resume);this.tuning=Campaign.tuning(this.settings.difficulty);this.player=this.makePlayer();
      this.levelKills=0;this.totalKills=0;this.shieldCount=0;this.score=0;this.bossSpawned=false;this.bossDefeated=false;
      if (!this.headless) { this.mobileView?.leave(); this.ui['home-overlay'].hidden = false; this.ui['result-overlay'].hidden = true; this.ui['stage-banner'].hidden = true; this.ui['toast'].hidden = true; }
      this.updateUI();
    }
    clearInputs() {
      this.keys.clear(); this.pointers.clear(); this.padInputs.clear();
      this.player.vx = 0; this.player.jumpBuffer = 0;
      if(!this.headless)document.querySelectorAll('[data-control].held').forEach(button=>button.classList.remove('held'));
    }
    keyDown(event) {
      const code = event.code;
      if (event.target && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(event.target.tagName)) return;
      if (!this.headless && document.querySelector('dialog[open]')) return;
      if (['Escape','KeyP'].includes(code)) { event.preventDefault?.(); if (!event.repeat) this.togglePause(); return; }
      if (this.screen !== 'playing') return;
      if (['ArrowLeft','ArrowRight','ArrowUp','KeyW','KeyA','KeyD','KeyJ','KeyL','Space'].includes(code)) event.preventDefault?.();
      this.keys.add(code); this.sound.unlock();
      if (!event.repeat && ['ArrowUp','KeyW'].includes(code)) this.jump();
      if (!event.repeat && code === 'Space') this.activateShield();
      if (!event.repeat && ['KeyA','KeyJ','KeyD','KeyL'].includes(code)) this.shoot(['KeyA','KeyJ'].includes(code) ? -1 : 1);
    }
    keyUp(event) { this.keys.delete(event.code); }
    point(event) {
      const rect = this.canvas?.getBoundingClientRect() || {left:0,top:0,width:W,height:H};
      return {x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height};
    }
    pointerDown(event) {
      if (this.screen !== 'playing' || event.button > 0) return;
      if (event.pointerType !== 'mouse' && this.settings.controls === 'buttons') return;
      event.preventDefault?.(); this.sound.unlock();
      this.canvas?.focus({preventScroll:true});
      try { this.canvas?.setPointerCapture(event.pointerId); } catch { /* Synthetic test pointers have no capture. */ }
      const p = this.point(event);
      this.pointers.set(event.pointerId,{startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,worldX:p.x,age:0,mode:'pending',move:0,shot:false,mouse:event.pointerType==='mouse'});
      if (event.pointerType === 'mouse') { this.shoot(p.x<W/2 ? -1 : 1); this.pointers.get(event.pointerId).shot = true; }
    }
    pointerMove(event) {
      const pointer = this.pointers.get(event.pointerId); if (!pointer) return;
      event.preventDefault?.(); pointer.x = event.clientX; pointer.y = event.clientY;
      const dx = pointer.x-pointer.startX, dy = pointer.y-pointer.startY;
      // Pixel thresholds work on both narrow mobile screens and large desktops.
      if (pointer.mode === 'pending' && Math.max(Math.abs(dx),Math.abs(dy)) >= 22) {
        if (Math.abs(dx) > Math.abs(dy)*1.15) { pointer.mode = 'move'; pointer.move = Math.sign(dx); }
        else if (Math.abs(dy) > Math.abs(dx)*1.15) { pointer.mode = 'vertical'; if (dy < 0) this.jump(); else this.activateShield(); }
      } else if (pointer.mode === 'move') { pointer.move = Math.abs(dx) > 12 ? Math.sign(dx) : 0; }
    }
    pointerUp(event, cancelled = false) {
      const pointer = this.pointers.get(event.pointerId); if (!pointer) return;
      if (!cancelled && this.screen === 'playing' && pointer.mode === 'pending' && !pointer.shot) this.shoot(pointer.worldX<W/2 ? -1 : 1);
      this.pointers.delete(event.pointerId);
      try { this.canvas?.releasePointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    }
    padDown(event, button) {
      event.preventDefault?.();
      if (this.screen !== 'playing') return;
      this.sound.unlock();
      this.canvas?.focus({preventScroll:true});
      const action = button.dataset.control;
      this.padInputs.set(event.pointerId, action);
      button.classList?.add('held');
      try { button.setPointerCapture(event.pointerId); } catch { /* Optional capture. */ }
      if (action === 'jump') this.jump();
      if (action === 'shield') this.activateShield();
      if (action === 'fire-left' || action === 'fire-right') this.shoot(action === 'fire-left' ? -1 : 1);
    }
    padUp(event, button) {
      event.preventDefault?.(); this.padInputs.delete(event.pointerId);
      if(![...this.padInputs.values()].includes(button.dataset.control))button.classList?.remove('held');
      try { button.releasePointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    }
    jump() { if (this.screen === 'playing' && this.player.stunTime <= 0) this.player.jumpBuffer = .14; }
    activateShield() {
      if (this.screen !== 'playing' || this.player.shieldTime > 0) return false;
      if (this.shieldCount <= 0) { this.toast(`Còn ${10 - this.totalKills % 10} địch để có khiên`); return false; }
      this.shieldCount--; this.player.shieldTime = 5; this.player.shieldHits = 3;
      this.player.invulnerable = Math.max(this.player.invulnerable,.25);
      this.burst(this.player.x,this.player.y-28,'#91e3d1',22,'ring'); this.sound.play('shield'); this.toast('Khiên bật · 5 giây / 3 lần chặn'); this.updateUI(); return true;
    }
    shoot(dir) {
      if (this.screen !== 'playing' || this.player.shotTimer > .001 || this.player.stunTime > 0) return false;
      const p = this.player; p.dir = dir;
      if(p.ammo<=0){
        if(p.dryCooldown<=0){this.toast('Hết đạn · di chuyển nhặt hòm AMMO');this.sound.play('empty');p.dryCooldown=1.2;}
        return false;
      }
      p.ammo--;p.shotTimer = .17;this.updateAmmoUI();
      const x = p.x+dir*(p.w/2+10), y = p.y-27;
      this.bullets.push({x,y,previousX:x,dir,life:1.5}); this.burst(x,y,'#ffdc93',4,'spark'); this.sound.play('shot'); return true;
    }
    dropAmmo(x = 90 + this.random() * (W - 180)) {
      if(this.screen!=='playing'||this.ammoCrates.length>=3)return null;
      const crate={x:clamp(x,50,W-50),y:-40,w:36,h:30,vy:180,landed:false,life:this.activeDifficulty==='story'?10:this.activeDifficulty==='hard'?6:8,amount:Math.max(1,Math.round((this.level.ammoPerCrate||5)*(this.tuning.ammoMultiplier||1))),rotation:0};
      this.ammoCrates.push(crate);return crate;
    }
    updateAmmo(dt) {
      if(this.screen!=='playing')return;
      this.ammoTimer-=dt;
      if(this.ammoTimer<=0){
        if(this.dropAmmo())this.ammoTimer=this.level.ammoInterval||5.8;
        else this.ammoTimer=.5;
      }
      for(const crate of this.ammoCrates){
        if(!crate.landed){crate.y=Math.min(GROUND,crate.y+crate.vy*dt);crate.rotation=Math.sin(this.time*3+crate.x)*.12;if(crate.y===GROUND){crate.landed=true;crate.rotation=0;this.burst(crate.x,GROUND,'#c9b785',7);}}
        else crate.life-=dt;
        if(this.player.ammo<this.player.maxAmmo&&overlaps(this.player,crate)){
          const amount=Math.min(crate.amount,this.player.maxAmmo-this.player.ammo);
          this.player.ammo+=amount;crate.life=0;this.floating(crate.x,crate.y-40,`+${amount} ĐẠN`,'#e6d099');this.sound.play('ammo');this.updateAmmoUI();
        }
      }
      this.ammoCrates=this.ammoCrates.filter(crate=>crate.life>0);
    }
    updateAmmoUI() {
      if(this.headless||!this.ui['ammo-count'])return;
      const p=this.player;
      this.ui['ammo-count'].textContent=`${String(p.ammo).padStart(2,'0')} / ${p.maxAmmo}`;
      this.ui['ammo-status'].classList.toggle('low',p.ammo>0&&p.ammo<=3);
      this.ui['ammo-status'].classList.toggle('empty',p.ammo===0);
      this.ui['ammo-status'].setAttribute('aria-label',`Đạn ${p.ammo} / ${p.maxAmmo}. Nhặt hòm AMMO để tiếp tế.`);
      this.ui['touch-controls']?.classList.toggle('empty',p.ammo===0);
    }
    burst(x,y,color,count=12,type='spark') {
      if (!this.settings.effects) return;
      if (type === 'ring') this.particles.push({x,y,vx:0,vy:0,life:.5,maxLife:.5,color,size:14,type:'ring'});
      for (let i=0;i<count;i++) {
        if (this.particles.length >= 180) break;
        const angle = this.random()*Math.PI*2, speed=25+this.random()*140, life=.25+this.random()*.4;
        this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,life,maxLife:life,color,size:1+this.random()*3,type:'spark'});
      }
    }
    floating(x,y,text,color='#f2cf92') { if (this.floats.length < 30) this.floats.push({x,y,text,color,life:1}); }
    spawn(type, side = this.random()<.5 ? -1 : 1) {
      const enemy = Campaign.createEnemy(type,this.level,this.activeDifficulty,side,this.random);
      // Keep the portal inside the arena while the enemy is still harmless.
      enemy.x = side === -1 ? 24 : W - 24;
      enemy.baseW=enemy.w;enemy.baseH=enemy.h;enemy.abilityState='ground';enemy.abilityTimer=enemy.boss?4:enemy.abilityCooldown||8;enemy.combatTime=0;
      if(enemy.boss)MM.BossCombat?.setup(this,enemy);
      this.enemies.push(enemy); return enemy;
    }
    configureAbility(enemy, state) {
      if(state==='bat'){this.morphToBat(enemy);return enemy;}
      enemy.baseW=enemy.baseW||enemy.w;enemy.baseH=enemy.baseH||enemy.h;
      enemy.special=true;enemy.abilityState=state;enemy.ambush=true;
      enemy.abilityTimer=Math.max(3,enemy.boss?4.2:enemy.abilityCooldown||this.level.abilityInterval||8);
      let x=90+this.random()*(W-180);
      if(Math.abs(x-this.player.x)<150)x=clamp(this.player.x+(this.player.x<W/2?1:-1)*220,80,W-80);
      enemy.x=x;
      const height=state==='airborne'?235:state==='ledge'?165:150;
      enemy.baseHomeY=height;
      enemy.homeY=Math.min(GROUND-45,Math.max(height,(this.viewTop||0)+enemy.h+25));
      enemy.y=enemy.homeY;enemy.landX=enemy.x;enemy.tell=false;enemy.dropping=false;
      if(state==='ledge')enemy.platform={x:enemy.x,y:enemy.homeY,w:Math.max(128,enemy.w+55),dir:enemy.dir,offset:0,walkDir:1};
      if(state==='hanging'){enemy.drop=true;enemy.platform=null;}
      return enemy;
    }
    getPressure(enemy = null) {
      const boss=enemy?.boss===true,elapsed=boss?(enemy.combatTime||0):this.levelTime;
      const warmup=boss?(this.level.bossWarmup??4):(this.level.pressureWarmup??12);
      const duration=boss?(this.level.bossRampSeconds||75):(this.level.pressureRampSeconds||100);
      const cap=boss?(this.level.bossPressureCap||1.7):(this.level.enemyPressureCap||1.5);
      const t=clamp((elapsed-warmup)/duration,0,1),smooth=t*t*(3-2*t);
      const attackRate=1+(cap-1)*(this.tuning.pressureMultiplier||1)*smooth;
      const delta=attackRate-1;
      const floor=this.activeDifficulty==='story'?1.1:this.activeDifficulty==='hard'?.75:.9;
      const baseWarning=enemy?.abilityWarning||this.level.abilityWarning||1.5;
      return {attackRate,moveRate:1+.35*delta,flightRate:1+.25*delta,diveRate:1+.35*delta,projectileRate:1+.4*delta,warning:Math.max(floor,baseWarning/attackRate),warningFloor:floor};
    }
    morphToBat(enemy) {
      enemy.baseW=enemy.baseW||enemy.w;enemy.baseH=enemy.baseH||enemy.h;
      this.burst(enemy.x,enemy.y-enemy.h/2,'#c1a6e5',18,'ring');
      enemy.isBat=true;enemy.w=enemy.boss?54:28;enemy.h=enemy.boss?38:24;
      enemy.abilityState='rising';enemy.abilityTimer=enemy.boss?4:5;enemy.tell=false;enemy.charging=false;
      enemy.homeY=Math.min(GROUND-55,Math.max(225,(this.viewTop||0)+enemy.h+45));
      enemy.baseHomeY=225;
      enemy.platform=null;enemy.ambush=true;enemy.dropping=false;
      return enemy;
    }
    restoreForm(enemy) {
      if(enemy.isBat)this.burst(enemy.x,enemy.y-20,'#c1a6e5',18,'ring');
      enemy.isBat=false;enemy.w=enemy.baseW||enemy.w;enemy.h=enemy.baseH||enemy.h;
      enemy.y=GROUND;enemy.dropping=false;enemy.tell=false;enemy.charging=false;enemy.abilityState='ground';
      enemy.abilityTimer=enemy.boss?4.5:enemy.abilityCooldown||8;enemy.platform=null;
    }
    shadowDrop(enemy) {
      this.burst(enemy.x,enemy.y-enemy.h/2,'#aa8fc5',22,'ring');
      enemy.isBat=false;enemy.w=enemy.baseW;enemy.h=enemy.baseH;
      enemy.landX=clamp(this.player.x,70,W-70);enemy.x=enemy.landX;
      enemy.homeY=Math.min(GROUND-45,Math.max(180,(this.viewTop||0)+enemy.h+25));enemy.y=enemy.homeY;
      enemy.abilityState='shadow-windup';enemy.abilityTimer=this.getPressure(enemy).warning;enemy.lockedWarning=enemy.abilityTimer;enemy.tell=true;enemy.charging=true;
    }
    fireBoneVolley(enemy) {
      const x=enemy.x,y=enemy.y-enemy.h*.5;
      const angle=Math.atan2(this.player.y-26-y,this.player.x-x);
      const speed=220*this.getPressure(enemy).projectileRate;
      for(const spread of [-.17,0,.17])if(this.enemyShots.length<12)this.enemyShots.push({x,y,vx:Math.cos(angle+spread)*speed,vy:Math.sin(angle+spread)*speed,w:12,h:10,life:4,type:'bone'});
      this.burst(x,y,'#dfd5b0',10);enemy.abilityState='ground';enemy.tell=false;enemy.charging=false;enemy.abilityTimer=6;
    }
    updateEnemy(e,dt) {
      e.age+=dt;e.hit=Math.max(0,e.hit-dt);
      if(e.phase==='warning'){
        e.warning-=dt;
        if(e.warning<=0){e.phase='active';if(!e.ambush)e.x=e.dir===1?24:W-24;}
        return;
      }
      const p=this.player,archetype=e.archetype||e.type,state=e.abilityState||'ground';
      e.combatTime=(e.combatTime||0)+dt;
      const pressure=e.pressure=this.getPressure(e);
      if(e.phantomState)return; // The ghost's announced attack owns its position and collisions.
      e.flightPhase=(e.flightPhase||0)+dt*pressure.flightRate;
      // Patrol and cooldown clocks accelerate. The announced attack window uses real seconds.
      const realWarning=e.tell||state==='shadow-windup'||state==='volley-windup';
      e.abilityTimer=(e.abilityTimer??8)-dt*(realWarning?1:pressure.attackRate);
      if(['ledge','hanging','airborne'].includes(state)){
        if(!e.tell&&e.abilityTimer<=pressure.warning){e.tell=true;e.charging=true;e.abilityTimer=pressure.warning;e.lockedWarning=pressure.warning;}
        if(state==='ledge'){
          const ledge=e.platform;ledge.x+=ledge.dir*34*pressure.moveRate*dt;
          if(ledge.x<90||ledge.x>W-90){ledge.x=clamp(ledge.x,90,W-90);ledge.dir*=-1;}
          ledge.offset+=ledge.walkDir*e.speed*.65*pressure.moveRate*dt;
          const limit=Math.max(10,(ledge.w-e.w)/2-4);
          if(Math.abs(ledge.offset)>limit){ledge.offset=clamp(ledge.offset,-limit,limit);ledge.walkDir*=-1;}
          e.x=ledge.x+ledge.offset;e.y=ledge.y;e.dir=ledge.walkDir;
        }else if(state==='hanging')e.y=e.homeY+Math.sin(e.flightPhase*2.7)*24;
        else if(e.isBat===true||archetype==='ghost'){
          if(!e.tell){e.x+=e.dir*e.speed*(e.isBat?2.4:1.9)*pressure.flightRate*dt;if(e.x<60||e.x>W-60){e.x=clamp(e.x,60,W-60);e.dir*=-1;}}
          e.y=e.homeY+Math.sin(e.flightPhase*(e.isBat?10:3))*20;
        }
        e.landX=e.x;e.charging=e.tell;
        if(e.abilityTimer<=0){e.abilityState='diving';e.dropping=true;e.tell=false;e.charging=false;e.diveSpeed=archetype==='spider'||archetype==='zombie'?420:330;e.platform=null;}
      }else if(state==='rising'){
        e.x=clamp(e.x+e.dir*e.speed*1.7*pressure.flightRate*dt,50,W-50);e.y=Math.max(e.homeY,e.y-180*pressure.diveRate*dt);
        if(e.y<=e.homeY){e.abilityState='airborne';e.abilityTimer=e.boss?3.8:4.8;}
      }else if(state==='shadow-windup'){
        if(e.abilityTimer<=0){e.abilityState='diving';e.diveSpeed=420;e.dropping=true;e.tell=false;e.charging=false;}
      }else if(state==='diving'){
        e.y=Math.min(GROUND,e.y+(e.diveSpeed||330)*pressure.diveRate*dt);
        if(e.y>=GROUND){this.restoreForm(e);this.burst(e.x,GROUND,archetype==='spider'?'#c6d3a1':'#b9a1c5',12);}
      }else if(state==='volley-windup'){
        if(e.abilityTimer<=0)this.fireBoneVolley(e);
      }else{
        const distance=p.x-e.x;if(Math.abs(distance)>12)e.dir=Math.sign(distance);
        e.x=clamp(e.x+e.dir*e.speed*pressure.moveRate*dt,18,W-18);
        e.y=archetype==='ghost'?GROUND-Math.max(0,10+Math.sin(e.age*2.3)*20):GROUND;
        if(e.abilityTimer<=0){
          if(e.boss&&archetype==='skeleton'){e.abilityState='volley-windup';e.abilityTimer=Math.max(pressure.warningFloor,1.2/pressure.attackRate);e.lockedWarning=e.abilityTimer;e.charging=true;e.tell=true;e.landX=e.x;}
          else if(archetype==='vampire'){
            if(e.boss&&this.level.world===4&&e.lastSkill!=='shadow'){e.lastSkill='shadow';this.shadowDrop(e);}
            else{e.lastSkill='bat';this.morphToBat(e);}
          }else if(e.boss&&archetype==='spider')this.configureAbility(e,'hanging');
          else if(e.boss&&archetype==='zombie')this.configureAbility(e,'ledge');
          else if(e.boss&&archetype==='ghost')this.configureAbility(e,'airborne');
        }
      }
      if(overlaps({...p,w:p.w*.75,h:p.h*.86},{...e,w:e.w*.72,h:e.h*.88}))this.hurt(e);
    }
    ambush(enemy, side, drop = false) {
      const distance = this.activeDifficulty === 'story' ? 230 : 190;
      let x = clamp(this.player.x + side * distance,110,W-110);
      if(Math.abs(x-this.player.x)<150)x=clamp(this.player.x-side*distance,110,W-110);
      enemy.x=x;enemy.ambush=true;enemy.drop=drop;enemy.warning=Math.max(enemy.warning,this.activeDifficulty==='hard'?1.35:1.7);
      return enemy;
    }
    killEnemy(enemy) {
      if (this.screen !== 'playing' || enemy.dead) return; enemy.dead = true; enemy.health = 0;
      this.totalKills++; this.score += enemy.score || 100;
      if (enemy.boss) {
        this.bossDefeated = !this.enemies.some(other=>other!==enemy&&other.boss&&!other.dead&&other.health>0);
        MM.BossCombat?.cleanup(this,enemy);
      } else if(!enemy.minion)this.levelKills++;
      this.burst(enemy.x,enemy.y-enemy.h/2,enemy.boss?'#ffd391':'#bbc4a5',enemy.boss?36:14);
      this.floating(enemy.x,enemy.y-enemy.h-10,'+'+(enemy.score||100)); this.sound.play('kill');
      if (this.totalKills % 10 === 0) {
        if (this.shieldCount < 3) { this.shieldCount++; this.toast('✦ +1 khiên · Space hoặc vuốt xuống'); this.sound.play('shield'); }
        else this.toast('Kho khiên đã đầy · dùng Space hoặc vuốt xuống');
      }
      // Deterministic assistance avoids unlucky stretches without healing.
      if (!enemy.boss && this.totalKills % 7 === 0 && this.player.health < this.player.maxHealth) this.pickups.push({x:clamp(enemy.x,40,W-40),y:GROUND-12,type:'health',life:14});
      this.enemies = this.enemies.filter(e=>!e.dead);
      this.save.best = Math.max(this.save.best,this.score); this.updateUI(); this.checkCompletion();
    }
    hurt(enemy) {
      const p = this.player; if (p.invulnerable > 0 || this.screen !== 'playing') return;
      if(enemy.phantomStrike){
        this.shieldCount=Math.max(0,this.shieldCount-1);p.shieldTime=0;p.shieldHits=0;
        p.knockdownTime=.75;p.stunTime=Math.max(p.stunTime,.75);this.clearInputs();
        this.floating(p.x,p.y-p.h-16,'BỊ ĐÁNH NGÃ · −1 KHIÊN','#d5e8ec');
      }
      if (p.shieldTime > 0 && p.shieldHits > 0) {
        p.shieldHits--; p.invulnerable = .45; enemy.x += Math.sign(enemy.x-p.x || 1)*55;
        this.burst(p.x,p.y-28,'#91e3d1',10,'ring'); this.sound.play('shield');
        if (p.shieldHits === 0) p.shieldTime = 0;
      } else {
        p.health = Math.max(0,p.health-1); p.invulnerable = 1.35;
        const dir = Math.sign(p.x-enemy.x || 1); p.x = clamp(p.x+dir*42,28,W-28); p.vy = -160; p.grounded = false;
        this.shake = 6; this.flash = .12; this.burst(p.x,p.y-26,'#ff9a87',14); this.sound.play('hit');
        if (p.health === 0) this.finish(false);
      }
      this.updateUI();
    }
    drainTarget(owner) {
      if(this.screen!=='playing'||owner.dead||owner.health<=0)return;
      const p=this.player;
      if(p.shieldTime>0&&p.shieldHits>0){
        p.shieldHits--;if(p.shieldHits===0)p.shieldTime=0;
        this.burst(p.x,p.y-28,'#91e3d1',10,'ring');this.floating(p.x,p.y-p.h-12,'KHIÊN CHẶN HÚT MÁU','#91e3d1');this.sound.play('shield');
      }else{
        p.health=Math.max(0,p.health-1);p.invulnerable=Math.max(p.invulnerable,.65);
        owner.health=Math.min(owner.healthCeiling||owner.maxHealth,owner.health+1);
        this.flash=.2;this.floating(p.x,p.y-p.h-12,'−1 MÁU · DRACULA HÚT MÁU','#ff9da7');this.sound.play('hit');
        if(p.health===0)this.finish(false);
      }
      this.updateUI();
    }
    checkCompletion() {
      if (this.screen !== 'playing' || this.levelKills < this.level.target) return;
      if (this.level.boss && !this.bossDefeated) {
        if (!this.bossSpawned) {
          this.bossSpawned = true; this.restTimer = 1.2;
          const boss=this.spawn('boss',this.player.x<W/2 ? 1 : -1);
          if(boss.archetype==='zombie')this.configureAbility(boss,'ledge');
          if(boss.archetype==='spider')this.configureAbility(boss,'hanging');
          else if(boss.archetype==='ghost')this.configureAbility(boss,'airborne');
          else if(boss.archetype==='vampire')this.configureAbility(boss,'bat');
          // This is a physical falling box; entering a boss fight never refills the gun directly.
          this.dropAmmo(clamp(this.player.x+(this.player.x<W/2?180:-180),60,W-60));
          this.banner(this.level.bossName,'BOSS XUẤT HIỆN · NHẢY VÀ DÙNG KHIÊN ĐỂ NÉ',3); this.sound.play('shield');
        }
      } else this.finish(true);
    }
    update(dt) {
      dt = clamp(Number.isFinite(dt) ? dt : 0,0,.05);
      if (this.screen !== 'playing') { if (this.screen === 'home') this.time += dt; return; }
      this.time += dt; this.levelTime += dt; this.restTimer = Math.max(0,(this.restTimer||0)-dt);
      const p = this.player; p.invulnerable = Math.max(0,p.invulnerable-dt); p.shieldTime = Math.max(0,p.shieldTime-dt); p.shotTimer = Math.max(0,p.shotTimer-dt);p.dryCooldown=Math.max(0,p.dryCooldown-dt);
      const wasStunned=p.stunTime>0;
      p.stunTime=Math.max(0,p.stunTime-dt);p.knockdownTime=Math.max(0,p.knockdownTime-dt);p.stunGrace=Math.max(0,p.stunGrace-dt);
      if(wasStunned&&p.stunTime===0)p.stunGrace=.6;
      let move = (this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0);
      let fire = this.keys.has('KeyA')||this.keys.has('KeyJ') ? -1 : this.keys.has('KeyD')||this.keys.has('KeyL') ? 1 : 0;
      this.pointers.forEach(pointer => {
        pointer.age += dt;
        if (pointer.mode === 'move') move = pointer.move;
        else if (pointer.mode === 'pending' && (pointer.mouse || pointer.age > .28)) { fire = pointer.worldX<W/2 ? -1 : 1; pointer.shot = true; }
      });
      let padMove=0, movingWithPad=false;
      this.padInputs.forEach(action => {
        if(action==='left'||action==='right'){movingWithPad=true;padMove+=action==='left'?-1:1;}
        if(action==='fire-left'||action==='fire-right')fire=action==='fire-left'?-1:1;
      });
      if(movingWithPad)move=clamp(padMove,-1,1);
      if(p.stunTime>0){move=0;fire=0;p.vx=0;p.jumpBuffer=0;}
      const speed=285, acceleration=2100;
      const desired=move*speed; p.vx += clamp(desired-p.vx,-acceleration*dt,acceleration*dt); if (move) p.dir=move;
      p.x=clamp(p.x+p.vx*dt,26,W-26);
      p.coyote = p.grounded ? .1 : Math.max(0,p.coyote-dt);
      if (p.jumpBuffer > 0 && p.coyote > 0) { p.vy=-610; p.grounded=false; p.jumpBuffer=0; p.coyote=0; this.burst(p.x,GROUND,'#9aad94',6); }
      p.jumpBuffer = Math.max(0,p.jumpBuffer-dt); p.vy += 1420*dt; p.y += p.vy*dt;
      if (p.y>=GROUND) { p.y=GROUND; p.vy=0; p.grounded=true; }
      if (fire) this.shoot(fire);
      this.updateAmmo(dt);
      this.spawnTimer -= dt;
      const alive = this.enemies.filter(e=>!e.boss).length;
      if (this.spawnTimer<=0 && this.regularSpawned<this.level.target && alive<this.level.maxAlive && this.restTimer<=0) {
        const ordinal=this.regularSpawned+1;
        let type=this.level.types[Math.floor(this.random()*this.level.types.length)];
        const every=this.level.abilitySpawnEvery||0;
        const specialist=every>0&&ordinal%every===0;
        if(specialist){
          const skilled=this.level.types.filter(name=>Campaign.enemyTypes[name].ability);
          const primary=Campaign.worlds[this.level.world].enemy;
          if(skilled.length)type=skilled.includes(primary)?primary:skilled[Math.floor(ordinal/every)%skilled.length];
        }
        const side=this.random()<.5?-1:1, enemy=this.spawn(type,side);
        if(specialist){
          const state={zombie:'ledge',spider:'hanging',ghost:'airborne',vampire:'bat'}[type];
          if(state)this.configureAbility(enemy,state);
        }
        this.regularSpawned++;
        // A short breathing space after each group of six.
        this.spawnTimer=this.level.spawnInterval*this.tuning.spawnMultiplier;
        if(this.regularSpawned%6===0) this.spawnTimer+=.9;
      }
      for (const e of this.enemies) {
        if(this.screen!=='playing')break;
        this.updateEnemy(e,dt);
      }
      MM.BossCombat?.update(this,dt);
      if(this.screen!=='playing')return;
      for(const shot of this.enemyShots){
        shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
        if(overlaps({...p,w:p.w*.75,h:p.h*.86},shot)){if(shot.kind==='web')MM.BossCombat?.webHit(this,shot);else this.hurt(shot);shot.life=0;}
      }
      this.enemyShots=this.enemyShots.filter(shot=>shot.life>0&&shot.x>-30&&shot.x<W+30&&shot.y>-30&&shot.y<H+30);
      if(this.screen!=='playing')return;
      const spent=new Set();
      for(const bullet of this.bullets) {
        if(this.screen!=='playing')break;
        const prev=bullet.x; bullet.previousX=prev; bullet.x+=bullet.dir*780*dt; bullet.life-=dt;
        const candidates=this.enemies.filter(e=>!e.dead&&!e.intangible&&e.phase==='active'&&bullet.y>=e.y-e.h-3&&bullet.y<=e.y+3&&Math.max(prev,bullet.x)>=e.x-e.w/2&&Math.min(prev,bullet.x)<=e.x+e.w/2).sort((a,b)=>Math.abs(a.x-prev)-Math.abs(b.x-prev));
        if(MM.BossCombat?.hitEgg(this,bullet,prev,candidates.length?Math.abs(candidates[0].x-prev):Infinity)){spent.add(bullet);continue;}
        const e=candidates[0];
        if(e) {
          spent.add(bullet);
          if(MM.BossCombat?.hit(this,e)===false){this.burst(e.x,bullet.y,'#a7edab',4);continue;}
          e.health--; e.hit=.12; e.x=clamp(e.x+bullet.dir*(e.boss?2:7),18,W-18);
          this.burst(e.x,bullet.y,'#ffdaa0',5); if(e.health<=0)this.killEnemy(e);
        }
      }
      if(this.screen!=='playing')return;
      this.bullets=this.bullets.filter(b=>!spent.has(b)&&b.life>0&&b.x>-30&&b.x<W+30);
      for(const pickup of this.pickups){pickup.life-=dt;if(Math.abs(p.x-pickup.x)<p.w/2+16&&Math.abs(p.y-pickup.y)<70){p.health=Math.min(p.maxHealth,p.health+1);pickup.life=0;this.floating(p.x,p.y-p.h-12,'+1 MÁU','#afe4bc');this.sound.play('health');this.updateUI();}}
      this.pickups=this.pickups.filter(pickup=>pickup.life>0);
      this.particles.forEach(effect=>{effect.life-=dt;effect.x+=effect.vx*dt;effect.y+=effect.vy*dt;if(effect.type!=='ring')effect.vy+=180*dt;});this.particles=this.particles.filter(effect=>effect.life>0);
      this.floats.forEach(effect=>{effect.life-=dt;effect.y-=24*dt;});this.floats=this.floats.filter(effect=>effect.life>0);
      this.shake=Math.max(0,this.shake-30*dt);this.flash=Math.max(0,this.flash-dt);
      this.toastTime=Math.max(0,this.toastTime-dt);this.bannerTime=Math.max(0,this.bannerTime-dt);
      if(!this.headless){if(this.toastTime===0)this.ui['toast'].hidden=true;if(this.bannerTime===0)this.ui['stage-banner'].hidden=true;}
      this.checkCompletion();
    }
    finish(won) {
      if(this.screen!=='playing')return;
      this.screen=won?'won':'lost';this.clearInputs();this.save.best=Math.max(this.save.best,this.score);
      if(won){if(!this.save.completed.includes(this.level.id))this.save.completed.push(this.level.id);this.save.resume=this.level.id<Campaign.levels.length?this.level.id+1:this.level.id;this.sound.play('win');}
      this.persist();
      if(!this.headless){this.ui['stage-banner'].hidden=true;this.ui['toast'].hidden=true;this.showResult();this.buildMap();}
      this.updateUI();
    }
    togglePause() {
      if(this.screen==='playing'){this.screen='paused';this.clearInputs();if(!this.headless)this.showResult();}
      else if(this.screen==='paused'){this.screen='playing';this.clearInputs();this.lastTime=0;if(!this.headless){this.ui['result-overlay'].hidden=true;this.mobileView?.enter();this.canvas.focus({preventScroll:true});}}
      this.updateUI();
    }
    toast(message,time=2.5) { this.toastTime=time;if(!this.headless){this.ui['toast'].textContent=message;this.ui['toast'].hidden=false;} }
    banner(title,subtitle,time=3) {this.bannerTime=time;if(!this.headless){const node=this.ui['stage-banner'];node.textContent=title;const small=document.createElement('small');small.textContent=subtitle;node.append(small);node.hidden=false;}}
    showResult() {
      const final=this.screen==='won'&&this.level.id===Campaign.levels.length, paused=this.screen==='paused', won=this.screen==='won';
      this.ui['result-kicker'].textContent=paused?'NGHỈ MỘT NHỊP':won?'BÌNH MINH GẦN HƠN MỘT CHÚT':'THỢ SĂN LUÔN CÓ CƠ HỘI THỨ HAI';
      this.ui['result-emblem'].textContent=paused?'Ⅱ':final?'♛':won?'✦':'☾';
      this.ui['result-title'].textContent=paused?'Cuộc săn tạm dừng':final?'Bình minh trở lại.':won?'Màn '+this.level.id+' hoàn thành':'Đêm này chưa kết thúc.';
      this.ui['result-description'].textContent=paused?'Hít thở một chút. Khi sẵn sàng, trở lại cuộc săn.':final?'Bạn đã vượt qua cả 50 màn. Hành trình được lưu và tất cả vùng đất đang chờ bạn trở lại.':won?(this.level.boss?'Boss đã bị hạ. ':'')+'Qua màn hồi máu, giữ khiên và đạn còn lại; nhận một lượng đạn khởi đầu cho màn mới.':'Bắn chính xác, nhặt hòm AMMO rơi và quan sát dấu báo kỹ năng. Nhảy hoặc dùng khiên khi bị vây.';
      this.ui['result-stats'].innerHTML=`<span><b>${String(this.score).padStart(5,'0')}</b>ĐIỂM SỐ</span><span><b>${this.levelKills}/${this.level.target}</b>ĐỊCH ĐÃ HẠ</span><span><b>${Math.floor(this.levelTime)}s</b>THỜI GIAN</span>`;
      this.ui['result-primary'].innerHTML=(paused?'Trở lại cuộc săn':final?'Săn lại từ đầu':won?'Màn tiếp theo':'Thử lại màn này')+' <span>→</span>';
      this.resultAction=paused?()=>this.togglePause():final?()=>this.start(1):won?()=>this.start(this.level.id+1,{carry:true}):()=>this.start(this.level.id,{retry:true});
      this.ui['result-overlay'].hidden=false;
    }
    openDialog(id) {if(this.screen==='playing')this.togglePause();this.clearInputs();this.ui[id].showModal();}
    syncSettings() {
      if(this.headless)return;
      this.ui.difficulty.value=this.settings.difficulty;this.ui['sound-setting'].checked=this.settings.sound;this.ui['effects-setting'].checked=this.settings.effects;this.ui['motion-setting'].checked=this.settings.reducedMotion;
      this.ui['mobile-controls'].value=this.settings.controls;
      this.ui['sound-label'].textContent=this.settings.sound?'Âm thanh bật':'Âm thanh tắt';this.ui['sound-button'].setAttribute('aria-label',this.settings.sound?'Tắt âm thanh':'Bật âm thanh');this.ui['sound-button'].setAttribute('aria-pressed',String(this.settings.sound));this.ui['sound-waves'].setAttribute('d',this.settings.sound?'M17 8Q22 12 17 16':'M17 9L22 15M22 9L17 15');
    }
    updateUI() {
      if(this.headless)return;
      const home=this.screen==='home',p=this.player;document.body.className=home?'home':'playing';
      document.body.dataset.controls=this.settings.controls;
      this.ui['touch-controls'].hidden=this.screen!=='playing'||this.settings.controls==='gestures';
      this.ui['touch-guide'].textContent=this.settings.controls==='buttons'?'Giữ ← → để đi · ↑ NHẢY · ◇ KHIÊN · BẮN ← →':this.settings.controls==='gestures'?'↔ Vuốt & giữ để đi · ↑ Nhảy · ↓ Khiên · Chạm hai nửa để bắn':'↔ Vuốt hoặc giữ nút để đi · ↑ Nhảy · ↓ Khiên · Chạm / nút để bắn';
      this.mobileView?.sync();
      this.ui['level-number'].textContent=String(this.level.id).padStart(2,'0');this.ui['world-label'].textContent=`VÙNG ${String(this.level.world+1).padStart(2,'0')} / 05 · ${Campaign.worlds[this.level.world].name.toUpperCase()}`;this.ui['level-name'].textContent=this.level.name;
      this.ui['kill-count'].textContent=`${this.levelKills} / ${this.level.target}`;this.ui['kill-progress'].style.width=clamp(this.levelKills/this.level.target*100,0,100)+'%';this.ui['mission-label'].textContent=this.bossSpawned&&!this.bossDefeated?'HẠ BOSS ĐỂ QUA MÀN':'ĐỊCH ĐÃ HẠ';
      this.ui.health.innerHTML=Array.from({length:p.maxHealth},(_,i)=>`<span class="${i<p.health?'':'empty'}" aria-hidden="true"><svg viewBox="0 0 24 24" style="width:.85em;height:1em;fill:currentColor;stroke:none"><path d="M12 21C9 18 2 13 2 7A5 5 0 0 1 12 5A5 5 0 0 1 22 7C22 13 15 18 12 21Z"/></svg></span>`).join('');this.ui.health.setAttribute('aria-label',`Sinh lực ${p.health} / ${p.maxHealth}`);
      this.updateAmmoUI();
      this.ui['shield-count'].textContent=this.shieldCount;this.ui['shield-button'].classList.toggle('ready',this.shieldCount>0);this.ui['charge-label'].textContent=this.shieldCount>0?`${this.shieldCount} khiên sẵn sàng · ${this.totalKills%10}/10 địch tích khiên`:`${this.totalKills%10}/10 địch · Hạ 10 địch để nhận khiên`;
      this.ui['pad-shield-count'].textContent=this.shieldCount;
      document.querySelector('[data-control="shield"]').classList.toggle('ready',this.shieldCount>0);
      this.ui['fullscreen-button'].disabled=this.screen!=='playing'&&!document.fullscreenElement;
      this.ui['score-label'].innerHTML=`${home?'KỶ LỤC':'ĐIỂM'} <b>${String(home?this.save.best:this.score).padStart(5,'0')}</b>`;this.ui['status-label'].textContent=home?'SẴN SÀNG CHO CUỘC SĂN':this.screen==='paused'?'CUỘC SĂN TẠM DỪNG':this.screen==='won'?'MÀN ĐÃ HOÀN THÀNH':this.screen==='lost'?'SẴN SÀNG THỬ LẠI':this.level.boss?'ĐÊM CỦA KẺ GIỮ CỔNG':'CUỘC SĂN ĐANG DIỄN RA';
      this.ui['start-label'].textContent=this.save.resume>1?'Tiếp tục · Màn '+this.save.resume:'Bắt đầu cuộc săn';this.ui['save-label'].textContent=this.save.completed.length?`${this.save.completed.length} / 50 MÀN ĐÃ HOÀN THÀNH`:'CHƯA CÓ HÀNH TRÌNH';
      this.ui['pause-button'].disabled=home;this.ui['shield-button'].disabled=home;
    }
    buildMap() {
      if(this.headless)return;const map=this.ui['level-map'];map.textContent='';
      Campaign.worlds.forEach(world=>{const section=document.createElement('section');section.className='world-map';const title=document.createElement('h3');title.innerHTML=`<span>0${world.id+1}</span> ${world.name} <small>${world.subtitle}</small>`;section.append(title);const grid=document.createElement('div');grid.className='level-grid';
        Campaign.levels.filter(level=>level.world===world.id).forEach(level=>{const button=document.createElement('button');button.className='level-tile'+(level.boss?' boss':'')+(this.save.completed.includes(level.id)?' completed':'')+(this.save.resume===level.id?' current':'');button.textContent=String(level.id).padStart(2,'0');button.title=`Màn ${level.id}: ${level.name}${level.boss?' · Boss':''}`;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>this.start(level.id));grid.append(button);});section.append(grid);map.append(section);});
    }
    resize() {
      if(this.headless)return;const dpr=Math.min(root.devicePixelRatio||1,2);this.canvas.width=W*dpr;this.canvas.height=H*dpr;this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);
      const rect=this.canvas.getBoundingClientRect();
      this.viewTop=(document.fullscreenElement||root.innerHeight<550)&&root.innerWidth>root.innerHeight?Math.max(0,H-W*rect.height/Math.max(1,rect.width)):0;
      for(const enemy of this.enemies){
        if(enemy.homeY){enemy.homeY=Math.min(GROUND-45,Math.max(enemy.baseHomeY||enemy.homeY,this.viewTop+enemy.h+25));if(enemy.platform)enemy.platform.y=enemy.homeY;}
      }
    }
    frame(timestamp) {
      const dt=this.lastTime?clamp((timestamp-this.lastTime)/1000,0,.05):0;this.lastTime=timestamp;this.update(dt);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);MM.Renderer.draw(this.ctx,this);
      this.raf=root.requestAnimationFrame(this.frame);
    }
    bind() {
      root.addEventListener('keydown',event=>this.keyDown(event));root.addEventListener('keyup',event=>this.keyUp(event));root.addEventListener('blur',()=>{if(this.screen==='playing')this.togglePause();else this.clearInputs();});
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.screen==='playing')this.togglePause();this.lastTime=0;});root.addEventListener('resize',()=>this.resize());
      this.canvas.addEventListener('pointerdown',event=>this.pointerDown(event));this.canvas.addEventListener('pointermove',event=>this.pointerMove(event));this.canvas.addEventListener('pointerup',event=>this.pointerUp(event));this.canvas.addEventListener('pointercancel',event=>this.pointerUp(event,true));this.canvas.addEventListener('lostpointercapture',event=>this.pointerUp(event,true));this.canvas.addEventListener('contextmenu',event=>event.preventDefault());
      this.ui['start-button'].addEventListener('click',()=>this.start());this.ui['pause-button'].addEventListener('click',()=>this.togglePause());this.ui['shield-button'].addEventListener('click',()=>{this.activateShield();this.canvas.focus({preventScroll:true});});
      this.ui['result-primary'].addEventListener('click',()=>this.resultAction?.());this.ui['result-home'].addEventListener('click',()=>this.goHome());this.ui.brand.addEventListener('click',event=>{event.preventDefault();this.goHome();});
      ['open-levels','home-levels'].forEach(id=>this.ui[id].addEventListener('click',()=>{this.buildMap();this.openDialog('levels-dialog');}));this.ui['open-help'].addEventListener('click',()=>this.openDialog('help-dialog'));this.ui['open-settings'].addEventListener('click',()=>this.openDialog('settings-dialog'));
      document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));this.ui['help-done'].addEventListener('click',()=>this.ui['help-dialog'].close());
      document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{this.clearInputs();if(this.screen==='paused')this.showResult();}));
      this.ui.difficulty.addEventListener('change',event=>{this.settings.difficulty=event.target.value;this.persist();});
      this.ui['mobile-controls'].addEventListener('change',event=>{this.settings.controls=event.target.value;this.clearInputs();this.persist();this.updateUI();});
      const toggleSound=()=>{this.settings.sound=!this.settings.sound;this.sound.unlock();this.persist();this.syncSettings();};this.ui['sound-button'].addEventListener('click',()=>{toggleSound();if(this.screen==='playing')this.canvas.focus({preventScroll:true});});this.ui['sound-setting'].addEventListener('change',toggleSound);
      [['effects-setting','effects'],['motion-setting','reducedMotion']].forEach(([id,key])=>this.ui[id].addEventListener('change',event=>{this.settings[key]=event.target.checked;this.persist();}));
      document.querySelectorAll('[data-control]').forEach(button=>{
        button.addEventListener('pointerdown',event=>this.padDown(event,button));
        ['pointerup','pointercancel','lostpointercapture'].forEach(type=>button.addEventListener(type,event=>this.padUp(event,button)));
      });
      if(root.matchMedia?.('(pointer:coarse)').matches)this.ui['control-mode'].textContent='GESTURES & CẢM ỨNG';
    }
  }
  MM.Game = Game; MM.readSave = readSave; MM.overlaps = overlaps;
  if(typeof document!=='undefined'&&document.getElementById('canvas'))MM.game=new Game();
})(typeof window!=='undefined'?window:globalThis);
