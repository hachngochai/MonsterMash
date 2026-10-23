/* Monster Mash rebuild: simulation, input and UI. No external runtime required. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const Campaign = MM.Campaign;
  const W = 960, H = 540, GROUND = 438, SAVE_KEY = 'monster-mash-v2';
  const interactionElement = node => node?.nodeType===3 ? node.parentElement : node;
  const editableInteraction = node => !!(node?.isContentEditable || node?.closest?.('input,textarea,select,option,[contenteditable]:not([contenteditable="false"])'));
  const protectedInteraction = node => !!node?.closest?.('.app,dialog');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y > b.y - b.h && a.y - a.h < b.y;
  // Return the first point of a swept bullet against a rectangle, including diagonal shots.
  function bulletEntry(x0,y0,x1,y1,e,rx=3,ry=3) {
    let near=0,far=1;
    for(const [start,delta,low,high] of [[x0,x1-x0,e.x-e.w/2-rx,e.x+e.w/2+rx],[y0,y1-y0,e.y-e.h-ry,e.y+ry]]){
      if(Math.abs(delta)<1e-9){if(start<low||start>high)return null;continue;}
      const a=(low-start)/delta,b=(high-start)/delta;
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
      if(near>far)return null;
    }
    return near;
  }
  function readSave(storage) {
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(SAVE_KEY) || '{}') || {}; } catch { /* Private browsing can deny storage. */ }
    const valid = value => Number.isFinite(value) && value >= 0;
    const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(id => Number.isInteger(id) && id >= 1 && id <= Campaign.levels.length))] : [];
    const previousSize=Number.isInteger(raw.campaignSize)&&raw.campaignSize>0?raw.campaignSize:50;
    const resume=valid(raw.resume)?Campaign.getLevel(raw.resume).id:1;
    const newChapter=Campaign.levels.length>previousSize&&resume===previousSize&&completed.includes(previousSize);
    return {
      version: 2, campaignSize:Campaign.levels.length, completed, progression:raw.progression,
      guidesSeen:MM.Tutorial?.normalizeSeen(raw.guidesSeen)||[],
      resume: newChapter?previousSize+1:resume,
      best: valid(raw.best) ? Math.floor(raw.best) : 0,
      settings: { difficulty: ['story','normal','hard'].includes(settings.difficulty) ? settings.difficulty : 'normal', controls: ['both','gestures','buttons'].includes(settings.controls) ? settings.controls : 'both', sound: settings.sound === true, effects: settings.effects !== false, reducedMotion: settings.reducedMotion === true, keyBindings:MM.KeyBindings?.normalize(settings.keyBindings)||settings.keyBindings }
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
      const notes = { shot:[230,65,.07,.035], sniper:[150,35,.14,.055], hit:[100,35,.13,.045], kill:[560,180,.1,.035], shield:[320,940,.32,.05], win:[440,880,.45,.06], health:[660,990,.16,.04], ammo:[420,760,.15,.04], empty:[90,65,.04,.02], howl:[180,90,4,.045], roar:[90,40,.55,.065], banana:[320,75,.2,.045] };
      const [start,end,length,volume] = notes[kind] || notes.shot;
      const ctx = this.context, t = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = ['shot','sniper','hit'].includes(kind) ? 'triangle' : 'sine';
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
      // A page entry is a fresh expedition. Settings and the personal best remain.
      if(options.newRun===true){this.save.completed=[];this.save.resume=1;this.save.guidesSeen=[];this.save.progression={version:1,rewards:[],equipped:'gun',lifeKills:0};}
      this.progression = MM.SaveManager?.normalize(this.save.progression,this.save.completed);
      // An explicit shared playtest link works on Pages too. Its temporary
      // inventory never enters the normal save; localhost stays test by default.
      const localHost=['localhost','127.0.0.1','[::1]'].includes(root.location?.hostname);
      const testFlag=typeof root.URLSearchParams==='function' ? new root.URLSearchParams(root.location?.search||'').get('test') : null;
      const testOverride=options.testMode===true || testFlag==='all' || (!this.headless && localHost && testFlag!=='off');
      this.testMode=testOverride;
      if(testOverride&&this.progression){
        this.progression.rewards=[...(MM.SaveManager?.milestones||[])];
        this.progression.equipped='gun';
        this.progression.lifeKills=0;
      }
      if(this.progression)this.save.progression=this.progression;
      this.settings = this.save.settings;
      if (!this.headless && root.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.settings.reducedMotion = true;
      this.level = Campaign.getLevel(this.save.resume);
      this.screen = 'home'; this.time = 0; this.levelTime = 0; this.lastTime = 0;
      this.enemies = []; this.bullets = []; this.particles = []; this.floats = []; this.pickups = [];
      this.ammoCrates = []; this.enemyShots = []; this.ammoTimer = 2.4;
      this.bossHazards = []; this.bossEggs = []; this.golemZones = []; this.groundCracks = []; this.wolfZones = [];
      this.kongZones=[];this.bananaPeels=[];
      this.dragonZones=[];this.dragonShots=[];this.mythicZones=[];this.mythicShots=[];
      this.keys = new Set(); this.pointers = new Map(); this.padInputs = new Map();
      this.score = 0; this.totalKills = 0; this.levelKills = 0; this.shieldCount = 0; this.abyssShieldKills = 0;
      this.abyssBossHits=0;this.abyssBossProjectiles=new WeakSet();
      this.regularSpawned = 0; this.spawnTimer = 1; this.bossSpawned = false; this.bossDefeated = false;
      this.shake = 0; this.flash = 0; this.toastTime = 0; this.bannerTime = 0;
      this.tuning = Campaign.tuning(this.settings.difficulty); this.player = this.makePlayer();
      this.sound = new Sound(this); this.checkpoint = null; this.resultAction = null;
      MM.WeaponManager?.init(this);MM.SkillManager?.init(this);MM.InputManager?.init(this);
      MM.UnderwaterMode?.reset(this);
      if(options.newRun===true)this.persist();
      if (!this.headless) {
        this.canvas = document.getElementById('canvas'); this.ctx = this.canvas.getContext('2d');
        this.ui = {}; document.querySelectorAll('[id]').forEach(node => this.ui[node.id] = node);
        this.mobileView = MM.MobileView ? new MM.MobileView(this, root) : null;
        this.bind(); this.buildMap(); this.syncSettings(); this.updateUI(); this.resize();
        if(this.testMode){
          const badge=document.createElement('div');badge.className='test-mode-badge';badge.textContent=`BẢN TEST · ${Campaign.levels.length} MÀN · ĐÃ MỞ KHÓA TOÀN BỘ`;badge.setAttribute('role','status');
          badge.title='Toàn bộ vũ khí và kỹ năng đã mở. Bản test không ghi đè tiến trình bản chính.';
          document.title='Monster Mash · Bản test công khai';
          document.querySelector('.app')?.append(badge);
        }
        this.frame = this.frame.bind(this);
        (MM.Typography?.ready || Promise.resolve()).then(() => {
          this.resize(); this.raf = root.requestAnimationFrame(this.frame);
        });
      }
    }
    makePlayer(health = this.tuning.health) {
      const ammo=Math.max(1,Math.round((this.level.initialAmmo||3)*(this.tuning.ammoMultiplier||1)));
      return {x:W/2,y:GROUND,w:38,h:54,dir:1,vx:0,vy:0,grounded:true,health,maxHealth:this.tuning.health,ammo,maxAmmo:this.level.ammoCapacity||18,shieldTime:0,shieldHits:0,invulnerable:1.5,shotTimer:0,shotCooldown:.17,weaponMode:'normal',dryCooldown:0,jumpBuffer:0,coyote:.1,stunTime:0,stunGrace:0,stunStyle:'web',knockdownTime:0,rollTime:0,rollCooldown:0,rollDuration:.32,rollProgress:0,rollDir:1,petrifyTime:0,petrifyGrace:0,burnTime:0,burnTick:1};
    }
    persist() { if(this.progression)this.save.progression=this.progression;if(this.testMode)return;try { this.storage?.setItem(SAVE_KEY,JSON.stringify(this.save)); } catch { /* Game remains playable without localStorage. */ } }
    start(id = this.save.resume, options = {}) {
      const crossing={50:'forest',100:'cave',150:'whirlpool'}[this.level.id];
      if(!options.skipCinematic&&options.carry&&this.screen==='won'&&id===this.level.id+1&&crossing&&this.canvas&&MM.ChapterTransition){
        MM.ChapterTransition.begin(this,crossing,()=>this.start(id,{...options,skipCinematic:true}));return;
      }
      this.cinematic=null;this.endingOnLand=false;if(this.ui?.['cinematic-skip'])this.ui['cinematic-skip'].hidden=true;
      MM.Tutorial?.cancel(this);
      MM.AbyssCombat?.reset(this);
      const {carry = false, retry = false} = options;
      const oldHealth = this.player.health, oldAmmo=this.player.ammo, wasAbyss=this.level.id>=101&&this.level.id<=150;
      const wasWater=MM.UnderwaterMode?.active(this),oldReserve=this.underwater?.reserve;
      MM.UnderwaterMode?.stop(this);
      if (retry && this.checkpoint) {
        this.score = this.checkpoint.score; this.totalKills = this.checkpoint.totalKills; this.shieldCount = this.checkpoint.shieldCount;
      } else if (!carry) { this.score = 0; this.totalKills = 0; this.shieldCount = 0; }
      this.level = Campaign.getLevel(id); this.activeDifficulty = this.settings.difficulty; this.tuning = Campaign.tuning(this.activeDifficulty);
      this.abyssBossHits=0;this.abyssBossProjectiles=new WeakSet();
      if(retry&&this.checkpoint)this.abyssShieldKills=this.checkpoint.abyssShieldKills||0;
      else if(!carry||!wasAbyss||this.level.id<101||this.level.id>150)this.abyssShieldKills=0;
      if(MM.Story)this.selectedStory=MM.Story.forLevel(this.level.id).id;
      this.player = this.makePlayer(carry ? clamp(oldHealth + (this.level.recovery ? 2 : 1),1,this.tuning.health) : this.tuning.health);
      MM.WeaponManager?.init(this);MM.SkillManager?.reset(this);MM.InputManager?.init(this);this.aimMode='ground';
      if(carry)this.player.ammo=Math.min(this.player.maxAmmo,oldAmmo+this.player.ammo);
      else if(retry&&this.checkpoint)this.player.ammo=clamp(this.checkpoint.ammo??this.player.ammo,0,this.player.maxAmmo);
      const waterReserve=retry&&this.checkpoint?this.checkpoint.oxygenReserve:carry&&wasWater?oldReserve:undefined;
      this.checkpoint = {score:this.score,totalKills:this.totalKills,shieldCount:this.shieldCount,ammo:this.player.ammo,abyssShieldKills:this.abyssShieldKills,oxygenReserve:waterReserve??MM.UnderwaterConfig?.oxygen.initialReserve};
      this.enemies = []; this.bullets = []; this.particles = []; this.floats = []; this.pickups = [];
      this.ammoCrates=[];this.enemyShots=[];this.ammoTimer=2.4;
      this.bossHazards=[];this.bossEggs=[];this.golemZones=[];this.groundCracks=[];this.wolfZones=[];
      this.kongZones=[];this.bananaPeels=[];
      this.dragonZones=[];this.dragonShots=[];this.mythicZones=[];this.mythicShots=[];
      this.levelKills = 0; this.regularSpawned = 0; this.spawnTimer = 2.2; this.levelTime = 0; this.restTimer = 0;
      this.bossSpawned = false; this.bossDefeated = false; this.shake = 0; this.flash = 0;
      this.screen = 'playing'; this.clearInputs(); this.sound.unlock();
      MM.AbyssCombat?.reset(this);this.lastGravityDirection=1;
      MM.UnderwaterMode?.reset(this,{reserve:waterReserve});
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
      MM.Tutorial?.onStart(this,options);
    }
    goHome() {
      this.cinematic=null;this.endingOnLand=false;if(this.ui?.['cinematic-skip'])this.ui['cinematic-skip'].hidden=true;
      MM.UnderwaterMode?.stop(this);
      MM.Tutorial?.cancel(this);
      MM.AbyssCombat?.reset(this);
      MM.InputManager?.close(this,false);
      this.save.best = Math.max(this.save.best,this.score); this.persist();
      this.screen = 'home'; this.clearInputs(); this.enemies = []; this.bullets = []; this.particles = []; this.pickups = []; this.floats = [];
      this.ammoCrates=[];this.enemyShots=[];
      this.bossHazards=[];this.bossEggs=[];this.golemZones=[];this.groundCracks=[];this.wolfZones=[];
      this.kongZones=[];this.bananaPeels=[];
      this.dragonZones=[];this.dragonShots=[];this.mythicZones=[];this.mythicShots=[];
      this.level=Campaign.getLevel(this.save.resume);this.tuning=Campaign.tuning(this.settings.difficulty);this.player=this.makePlayer();
      this.levelKills=0;this.totalKills=0;this.abyssShieldKills=0;this.shieldCount=0;this.score=0;this.bossSpawned=false;this.bossDefeated=false;
      this.abyssBossHits=0;this.abyssBossProjectiles=new WeakSet();
      if (!this.headless) { this.mobileView?.leave(); this.ui['home-overlay'].hidden = false; this.ui['result-overlay'].hidden = true; this.ui['stage-banner'].hidden = true; this.ui['toast'].hidden = true; }
      this.updateUI();
    }
    clearInputs() {
      this.fireIntent=0;this.swimVertical=0;MM.LightningOrbWeapon?.stop(this);
      this.keys.clear(); this.pointers.clear(); this.padInputs.clear();
      this.player.vx = 0; this.player.jumpBuffer = 0;
      this.moveTapDir=0;this.moveTapTime=-Infinity;
      MM.InputManager?.reset(this);
      if(this.skillState){this.skillState.shieldTapAt=-Infinity;this.skillState.jumpTapAt=-Infinity;}
      if(!this.headless)document.querySelectorAll('[data-control].held').forEach(button=>button.classList.remove('held'));
    }
    keyDown(event) {
      if(this.cinematic){if(['Escape','Enter','Space'].includes(event.code)){event.preventDefault?.();if(!event.repeat)MM.ChapterTransition?.skip(this);}return;}
      if(MM.KeyBindings?.capture(this,event))return;
      if(MM.KeyBindings){event=MM.KeyBindings.translate(this,event);if(!event)return;}
      const code = event.code;
      if(MM.InputManager?.keyDown(this,event))return;
      if (event.target && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(event.target.tagName)) return;
      if (!this.headless && document.querySelector('dialog[open]')) return;
      if (['Escape','KeyP'].includes(code)) { event.preventDefault?.(); if (!event.repeat) this.togglePause(); return; }
      if (this.screen !== 'playing') return;
      if(code==='KeyR'){event.preventDefault?.();if(!event.repeat)MM.MerfolkTransformation?.activate(this);return;}
      if (['ArrowLeft','ArrowRight','ArrowUp','KeyW','KeyA','KeyD','KeyJ','KeyL','Space'].includes(code)) event.preventDefault?.();
      if(!event.repeat&&!this.keys.has(code)&&['ArrowLeft','ArrowRight'].includes(code))this.moveTap(code==='ArrowLeft'?-1:1,{source:'keyboard',timeStamp:event.timeStamp});
      this.keys.add(code); this.sound.unlock();
      if (!event.repeat && (code==='ArrowUp'||code==='KeyW'&&!MM.UnderwaterMode?.freeSwim(this))) this.verticalAction('up');
      if (!event.repeat && code==='ArrowDown' && MM.AbyssCombat?.inputDirection(this)<0) this.verticalAction('down');
      if (!event.repeat && code === 'Space') this.shieldAction();
      if (!event.repeat && ['KeyA','KeyJ','KeyD','KeyL'].includes(code)) this.shoot(['KeyA','KeyJ'].includes(code) ? -1 : 1);
    }
    keyUp(event) { if(MM.KeyBindings){event=MM.KeyBindings.translate(this,event,true);if(!event)return;}if(MM.InputManager?.keyUp(this,event))return;this.keys.delete(event.code); }
    inputPoint(event) {
      const rect = this.canvas?.getBoundingClientRect() || {left:0,top:0,width:W,height:H};
      if(this.mobileRotation)return {x:event.clientY-rect.top,y:(rect.right??rect.left+rect.width)-event.clientX};
      return {x:event.clientX-rect.left,y:event.clientY-rect.top};
    }
    point(event) {
      const rect = this.canvas?.getBoundingClientRect() || {left:0,top:0,width:W,height:H};
      const point=this.inputPoint(event),width=this.mobileRotation?rect.height:rect.width,height=this.mobileRotation?rect.width:rect.height;
      const style=this.canvas?root.getComputedStyle?.(this.canvas):null,fit=style?.objectFit||'fill';
      if(!['cover','contain'].includes(fit))return {x:point.x*W/width,y:point.y*H/height};
      const scale=fit==='contain'?Math.min(width/W,height/H):Math.max(width/W,height/H);
      const position=(style?.objectPosition||'50% 50%').split(/\s+/);
      const offset=(value,space)=>{
        if(['left','top'].includes(value))return 0;
        if(['right','bottom'].includes(value))return space;
        if(value==='center')return space*.5;
        return value?.endsWith('%')?space*parseFloat(value)/100:value?.endsWith('px')?parseFloat(value):space*.5;
      };
      return {x:(point.x-offset(position[0],width-W*scale))/scale,y:(point.y-offset(position[1],height-H*scale))/scale};
    }
    pointerDown(event) {
      if(this.weaponPicker?.open)return;
      if (this.screen !== 'playing' || event.button > 0) return;
      if (event.pointerType !== 'mouse' && this.settings.controls === 'buttons') return;
      event.preventDefault?.(); this.sound.unlock();
      this.canvas?.focus({preventScroll:true});
      try { this.canvas?.setPointerCapture(event.pointerId); } catch { /* Synthetic test pointers have no capture. */ }
      const p = this.point(event);
      const pixel=this.inputPoint(event);
      this.pointers.set(event.pointerId,{startX:pixel.x,startY:pixel.y,x:pixel.x,y:pixel.y,worldX:p.x,age:0,mode:'pending',move:0,shot:false,mouse:event.pointerType==='mouse'});
      if (event.pointerType === 'mouse') { this.shoot(p.x<W/2 ? -1 : 1); this.pointers.get(event.pointerId).shot = true; }
    }
    pointerMove(event) {
      const pointer = this.pointers.get(event.pointerId); if (!pointer) return;
      event.preventDefault?.();const pixel=this.inputPoint(event);pointer.x=pixel.x;pointer.y=pixel.y;
      const dx = pointer.x-pointer.startX, dy = pointer.y-pointer.startY;
      // Pixel thresholds work on both narrow mobile screens and large desktops.
      if (pointer.mode === 'pending' && Math.max(Math.abs(dx),Math.abs(dy)) >= 22) {
        if (Math.abs(dx) > Math.abs(dy)*1.15) { pointer.mode = 'move'; pointer.move = Math.sign(dx); this.moveTap(pointer.move,{source:pointer.mouse?'mouse':'touch',timeStamp:event.timeStamp}); }
        else if (Math.abs(dy) > Math.abs(dx)*1.15) {
          if(MM.UnderwaterMode?.freeSwim(this)){pointer.mode='swim';pointer.vertical=Math.sign(dy);}
          else{pointer.mode = 'vertical'; this.verticalAction(dy<0?'up':'down');}
        }
      } else if (pointer.mode === 'move') { pointer.move = Math.abs(dx) > 12 ? Math.sign(dx) : 0; }
      else if(pointer.mode==='swim')pointer.vertical=Math.abs(dy)>12?Math.sign(dy):0;
    }
    pointerUp(event, cancelled = false) {
      const pointer = this.pointers.get(event.pointerId); if (!pointer) return;
      if (!cancelled && this.screen === 'playing' && pointer.mode === 'pending' && !pointer.shot) this.shoot(pointer.worldX<W/2 ? -1 : 1);
      this.pointers.delete(event.pointerId);
      try { this.canvas?.releasePointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    }
    padDown(event, button) {
      event.preventDefault?.();
      if (this.screen !== 'playing'||this.weaponPicker?.open) return;
      this.sound.unlock();
      this.canvas?.focus({preventScroll:true});
      const action = button.dataset.control;
      if(action==='left'||action==='right')this.moveTap(action==='left'?-1:1,{source:'touch',timeStamp:event.timeStamp});
      if(action==='dash-left'||action==='dash-right')MM.InputManager?.requestDash(this,action==='dash-left'?-1:1);
      this.padInputs.set(event.pointerId, action);
      button.classList?.add('held');
      try { button.setPointerCapture(event.pointerId); } catch { /* Optional capture. */ }
      if (action === 'jump') this.verticalAction('up');
      if (action === 'shield') this.verticalAction('down');
      if (action === 'fire-left' || action === 'fire-right') this.shoot(action === 'fire-left' ? -1 : 1);
    }
    padUp(event, button) {
      event.preventDefault?.(); this.padInputs.delete(event.pointerId);
      if(![...this.padInputs.values()].includes(button.dataset.control))button.classList?.remove('held');
      try { button.releasePointerCapture(event.pointerId); } catch { /* Optional capture. */ }
    }
    jump() { if(MM.UnderwaterMode?.active(this))return MM.UnderwaterMode.supply(this);if (this.screen === 'playing' && this.player.stunTime <= 0 && this.player.petrifyTime <= 0 && this.player.rollTime <= 0) this.player.jumpBuffer = .14; }
    jumpAction(){if(MM.UnderwaterMode?.active(this))return MM.UnderwaterMode.supply(this);return MM.SkillManager?MM.SkillManager.jumpTap(this):this.jump();}
    shieldAction(){return MM.SkillManager?MM.SkillManager.shieldTap(this):this.activateShield();}
    verticalAction(action){
      const mapped=MM.AbyssCombat?.invertAction(this,action)||action;
      return mapped==='up'?this.jumpAction():this.shieldAction();
    }
    moveTap(dir, options) {
      dir*=MM.AbyssCombat?.inputDirection(this)||1;
      if(MM.InputManager)return MM.InputManager.directionTap(this,dir,options);
      if(this.moveTapDir===dir&&this.time-this.moveTapTime<=.28){this.tryRoll(dir);this.moveTapDir=0;this.moveTapTime=-Infinity;}
      else{this.moveTapDir=dir;this.moveTapTime=this.time;}
    }
    tryRoll(dir) {
      const p=this.player,blood=this.enemies.some(e=>e.boss&&e.archetype==='werewolf'&&e.bloodMoon&&!e.dead&&e.health>0&&e.wolfState!=='transform');
      if(this.screen!=='playing'||this.level.id!==70||!blood||this.rollSlash?.time>0||p.rollCooldown>1e-8||p.stunTime>0||p.petrifyTime>0||p.rollTime>0)return false;
      p.rollTime=p.rollDuration=.32;p.rollCooldown=.9;p.rollProgress=0;p.rollDir=dir<0?-1:1;p.dir=p.rollDir;p.vx=p.rollDir*850;p.jumpBuffer=0;
      this.burst(p.x,p.y-22,'#e5c39c',12);return true;
    }
    shieldProgress() {
      const abyss=this.level.id>=101&&this.level.id<=150,goal=abyss?5:10;
      return {abyss,goal,count:(abyss?this.abyssShieldKills||0:this.totalKills)%goal};
    }
    bossShieldRule(boss) {
      if(boss?.archetype==='kong'&&boss.vinePhase)return 'kong';
      if(boss?.archetype==='dragon'&&boss.dragonForm==='knight')return 'knight';
      if(boss?.encounter&&(boss.archetype==='chimera'||boss.chimeraForm))return 'chimera';
      return null;
    }
    bossShieldProgress() {
      const boss=this.enemies.find(e=>e.boss&&!e.dead&&!e.retired&&(e.health>0||e.predatorRage||e.deepFinal||e.deepRebirthTime>0||e.krakenStone));
      if(!boss)return null;
      const special=this.bossShieldRule(boss),goal=special==='kong'?5:10;
      const total=special==='kong'?boss.highAimShots||0:special==='knight'?boss.knightHits||0:special==='chimera'?boss.encounter.damage||0:this.abyssBossHits||0;
      return {count:total%goal,goal,special,unit:special==='chimera'?'máu':special==='kong'?'phát tầm cao':'phát trúng',full:this.shieldCount>=3};
    }
    recordBossHit(boss,attack={},special=this.bossShieldRule(boss),actualDamage=attack.damageReceipt?.damage) {
      // Keep the authored five-shot Kong and damage-based Chimera rewards,
      // and the knight's existing ten-hit reward, without granting twice.
      if(!boss?.boss||special||attack.melee||attack.rollSlash||attack.reflected||attack.reflection)return false;
      if(!['normal','highAim','sniper','gun','bones','bow','spear','scytheWave','lightningOrb'].includes(attack.kind||attack.weaponId)||this.abyssBossProjectiles.has(attack))return false;
      if(Number.isFinite(actualDamage)&&actualDamage<=0)return false;
      this.abyssBossProjectiles.add(attack);this.abyssBossHits++;
      if(this.abyssBossHits%10===0){
        if(this.shieldCount<3){this.shieldCount++;this.toast('✦ +1 khiên · 10 phát bắn trúng boss');this.sound.play('shield');this.floating(this.player.x,this.player.y-this.player.h-12,'+1 KHIÊN','#b7e7d4');}
        else this.toast('Kho khiên đã đầy · dùng Space hoặc vuốt xuống');
      }
      this.updateUI();return true;
    }
    // Preserve the old public hook/counter for previews and older integrations.
    recordAbyssBossHit(boss,attack) { return this.recordBossHit(boss,attack); }
    activateShield() {
      if (this.screen !== 'playing' || this.player.shieldTime > 0) return false;
      if (this.shieldCount <= 0) { const progress=this.shieldProgress();this.toast(`Còn ${progress.goal-progress.count} ${progress.abyss?'quái thường':'địch'} để có khiên`); return false; }
      this.shieldCount--; this.player.shieldTime = 5; this.player.shieldHits = 3;
      this.player.petrifyTime=0;this.player.petrifyGrace=.6;this.player.burnTime=0;this.player.burnTick=1;
      MM.AbyssCombat?.cleanse?.(this);
      this.player.invulnerable = Math.max(this.player.invulnerable,.25);
      this.burst(this.player.x,this.player.y-28,'#91e3d1',22,'ring'); this.sound.play('shield'); this.toast('Khiên bật · 5 giây / 3 lần chặn'); this.updateUI(); return true;
    }
    getWeaponProfile(dir=this.player.dir) {
      if(this.level.id>=101){
        const inverted=MM.AbyssCombat?.gravityDirection(this)<0;
        const targets=this.enemies.filter(e=>!e.dead&&e.health>0&&e.phase==='active'&&!e.intangible&&!e.bulletUntargetable&&(inverted||e.airborne));
        const target=targets.filter(e=>(e.x-this.player.x)*dir>=0).sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];
        if(target)return {kind:'highAim',cost:1,damage:1,cooldown:.17,speed:780,locked:false,target};
      }
      const aerialBoss=this.enemies.find(e=>e.boss&&e.archetype==='kong'&&e.vinePhase&&!e.kongFinalTriggered&&!e.dead&&e.health>0);
      if(aerialBoss)return {kind:'highAim',cost:1,damage:2,cooldown:.22,speed:1050,locked:aerialBoss.kongState==='vine-rise',target:aerialBoss};
      const bloodBoss=this.enemies.find(e=>e.boss&&e.archetype==='werewolf'&&e.bloodMoon&&!e.dead&&e.health>0);
      if(bloodBoss&&this.level.id===70)return {kind:'sniper',cost:5,damage:5,cooldown:.17,speed:1280,locked:bloodBoss.wolfState==='transform'};
      const air=this.enemies.filter(e=>!e.dead&&e.health>0&&e.phase==='active'&&((e.archetype==='dragon'&&e.dragonForm!=='knight')||(e.archetype==='chimera'&&e.mythicAir)));
      if(air.length){
        const side=air.filter(e=>(e.x-this.player.x)*dir>=0),pool=side.length?side:air;
        const target=pool.sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];
        const ground=this.enemies.filter(e=>!e.dead&&e.health>0&&e.phase==='active'&&!e.intangible&&e.archetype!=='dragon'&&!e.mythicAir&&(e.x-this.player.x)*dir>=0).sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];
        // A nearby ground enemy remains shootable in a mixed dragon wave.
        if(!ground||Math.abs(ground.x-this.player.x)>200||target.boss)return {kind:'highAim',cost:1,damage:2,cooldown:.22,speed:1050,locked:!!target.intangible,target};
      }
      return {kind:'normal',cost:1,damage:1,cooldown:.17,speed:780,locked:false};
    }
    shoot(dir) {
      if(MM.UnderwaterMode?.active(this)&&!MM.UnderwaterMode.canAttack(this))return false;
      if(MM.WeaponManager)return MM.WeaponManager.fire(this,dir);
      if (this.screen !== 'playing' || this.player.shotTimer > .001 || this.player.stunTime > 0 || this.player.petrifyTime > 0 || this.player.rollTime > 0) return false;
      const p = this.player,weapon=this.getWeaponProfile(dir); p.dir = dir;p.weaponMode=weapon.kind;
      if(weapon.locked)return false;
      if(p.ammo<weapon.cost){
        if(p.dryCooldown<=0){this.toast(weapon.kind==='sniper'?'Súng ngắm cần 5 đạn · nhặt hòm AMMO':'Hết đạn · di chuyển nhặt hòm AMMO');this.sound.play('empty');p.dryCooldown=1.2;}
        return false;
      }
      p.ammo-=weapon.cost;p.shotTimer=weapon.cooldown;p.shotCooldown=weapon.cooldown;this.updateAmmoUI();
      const x = p.x+dir*(p.w/2+10), y = p.y-27;
      const bullet={x,y,previousX:x,dir,life:1.5,kind:weapon.kind,damage:weapon.damage,speed:weapon.speed};
      if(weapon.kind==='highAim'){
        const target=weapon.target,angle=Math.atan2(target.y-target.h*.55-y,target.x-x);
        bullet.vx=Math.cos(angle)*weapon.speed;bullet.vy=Math.sin(angle)*weapon.speed;bullet.angle=angle;
        p.aimAngle=angle;p.dir=Math.sign(bullet.vx)||dir;if(target.archetype==='kong')MM.KongCombat?.recordShot(this,target);
      }else p.aimAngle=null;
      this.bullets.push(bullet); this.burst(x,y,'#ffdc93',weapon.kind==='sniper'?9:4,'spark'); this.sound.play(weapon.kind==='sniper'?'sniper':'shot'); return true;
    }
    dropAmmo(x = 90 + this.random() * (W - 180)) {
      if(this.screen!=='playing'||this.ammoCrates.length>=3)return null;
      const crate={x:clamp(x,50,W-50),y:-40,w:36,h:30,vy:180,landed:false,life:this.activeDifficulty==='story'?10:this.activeDifficulty==='hard'?6:8,amount:Math.max(1,Math.round((this.level.ammoPerCrate||5)*(this.tuning.ammoMultiplier||1))),rotation:0};
      this.ammoCrates.push(crate);return crate;
    }
    updateAmmo(dt) {
      if(this.screen!=='playing')return;
      if(MM.UnderwaterMode?.active(this))return MM.UnderwaterLoot.updateAmmo(this,dt);
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
      const p=this.player,weapon=MM.WeaponManager?.profile(this)||this.getWeaponProfile(),sniper=weapon.kind==='sniper',high=weapon.kind==='highAim';p.weaponMode=weapon.kind;
      this.ui['ammo-count'].textContent=`${String(p.ammo).padStart(2,'0')} / ${p.maxAmmo}`;
      this.ui['ammo-status'].classList.toggle('low',p.ammo>=weapon.cost&&p.ammo<=(sniper?10:3));
      this.ui['ammo-status'].classList.toggle('empty',p.ammo<weapon.cost);
      this.ui['ammo-status'].classList.toggle('sniper',sniper);
      this.ui['ammo-status'].setAttribute('aria-label',`${weapon.name||'Súng'}: ${weapon.cost} đạn / lượt. ${sniper?'Súng ngắm: 5 sát thương. ':high?`Bắn tầm cao.${weapon.target?.archetype==='kong'?' Mỗi 5 phát nhận 1 khiên.':''} `:''}Đạn ${p.ammo} / ${p.maxAmmo}. Nhặt hòm AMMO để tiếp tế.`);
      if(this.ui['ammo-mode'])this.ui['ammo-mode'].textContent=sniper?(weapon.locked?'NGẮM · CHỜ':p.shotTimer>0?`NGẮM ${p.shotTimer.toFixed(1)}s`:'NGẮM · 5 ĐẠN'):high?(weapon.locked?'TẦM CAO · CHỜ':weapon.target?.archetype==='kong'?`TẦM CAO · ${weapon.target.highAimShots%5}/5`:'TẦM CAO'):weapon.equipped&&weapon.equipped!=='gun'?weapon.name:'ĐẠN';
      this.ui['touch-controls']?.classList.toggle('empty',p.ammo<weapon.cost);
      document.querySelectorAll('.fire-control').forEach(button=>{button.querySelector('small').textContent=sniper?'NGẮM':high?'BẮN CAO':'BẮN';button.setAttribute('aria-label',`${sniper?'Bắn ngắm':high?'Bắn tầm cao':'Bắn'} ${button.dataset.control==='fire-left'?'trái':'phải'}`);});
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
      if(enemy.archetype==='golem')MM.GolemCombat?.setup(this,enemy);
      if(enemy.archetype==='werewolf')MM.WolfCombat?.setup(this,enemy);
      if(enemy.archetype==='kong')MM.KongCombat?.setup(this,enemy);
      if(enemy.archetype==='dragon')MM.DragonCombat?.setup(this,enemy);
      if(['lion','medusa','goatman','chimera'].includes(enemy.archetype))MM.MythicCombat?.setup(this,enemy);
      this.enemies.push(enemy);MM.AbyssCombat?.init(this,enemy);
      MM.UnderwaterEnemies?.setup(this,enemy);MM.Boss160?.setup(this,enemy);
      MM.MiddleSeaEnemies?.setup(this,enemy);MM.Boss170?.setup(this,enemy);
      MM.PredatorSeaEnemies?.setup(this,enemy);MM.Boss180?.setup(this,enemy);
      MM.DeepSeaEnemies?.setup(this,enemy);MM.Boss190?.setup(this,enemy);
      MM.FinalSeaEnemies?.setup(this,enemy);MM.Boss200?.setup(this,enemy);return enemy;
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
      if(MM.Boss200?.updateEnemy(this,e,dt)||MM.FinalSeaEnemies?.updateEnemy(this,e,dt)||MM.DeepSeaEnemies?.updateEnemy(this,e,dt)||MM.Boss190?.updateEnemy(this,e,dt))return;
      if(MM.PredatorSeaEnemies?.updateEnemy(this,e,dt)||MM.Boss180?.updateEnemy(this,e,dt))return;
      if(MM.SkillManager?.frozen(e))return;
      if(MM.UnderwaterEnemies?.updateEnemy(this,e,dt)||MM.Boss160?.updateEnemy(this,e,dt)||MM.MiddleSeaEnemies?.updateEnemy(this,e,dt)||MM.Boss170?.updateEnemy(this,e,dt))return;
      e.age+=dt;e.hit=Math.max(0,e.hit-dt);
      if(e.tsunamiChild)return; // The wave owns its staggered entry and one-way movement.
      if(e.phase==='warning'){
        e.warning-=dt;
        if(e.warning<=0){e.phase='active';if(!e.ambush)e.x=e.dir===1?24:W-24;}
        return;
      }
      const p=this.player,archetype=e.archetype||e.type,state=e.abilityState||'ground';
      e.combatTime=(e.combatTime||0)+dt;
      const pressure=e.pressure=this.getPressure(e);
      if(MM.AbyssCombat?.owns(this,e)){MM.AbyssCombat.updateEnemy(this,e,dt);return;}
      if(e.gluttonState)return;
      if(['golem','werewolf','kong','dragon','lion','medusa','goatman','chimera'].includes(archetype))return; // Announced weapon attacks own movement and collisions.
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
      if(overlaps({...p,w:p.w*.75,h:p.h*.86},{...e,w:e.w*.72,h:e.h*.88})){
        if(e.spiderling)MM.BossCombat?.spiderlingHit(this,e);else this.hurt(e);
      }
    }
    ambush(enemy, side, drop = false) {
      const distance = this.activeDifficulty === 'story' ? 230 : 190;
      let x = clamp(this.player.x + side * distance,110,W-110);
      if(Math.abs(x-this.player.x)<150)x=clamp(this.player.x-side*distance,110,W-110);
      enemy.x=x;enemy.ambush=true;enemy.drop=drop;enemy.warning=Math.max(enemy.warning,this.activeDifficulty==='hard'?1.35:1.7);
      return enemy;
    }
    killEnemy(enemy) {
      if (this.screen !== 'playing' || enemy.dead || enemy.spiderling) return;
      if(MM.Boss160?.beforeKill?.(this,enemy)===false||MM.Boss170?.beforeKill?.(this,enemy)===false||MM.MiddleSeaEnemies?.beforeKill?.(this,enemy)===false||MM.Boss180?.beforeKill?.(this,enemy)===false||MM.Boss190?.beforeKill?.(this,enemy)===false||MM.Boss200?.beforeKill?.(this,enemy)===false||MM.FinalSeaEnemies?.beforeKill?.(this,enemy)===false)return;
      if(MM.AbyssCombat?.beforeKill?.(this,enemy)===false)return;
      if(enemy.archetype==='kraken')this.endingBoss={...enemy,dead:false,health:1,phase:'active',krakenState:'defeated',krakenStone:false};
      enemy.dead = true; enemy.health = 0;MM.AbyssCombat?.onKill(this,enemy);MM.Boss160?.onKill(this,enemy);MM.Boss170?.onKill(this,enemy);MM.Boss180?.onKill(this,enemy);MM.Boss190?.onKill(this,enemy);MM.Boss200?.onKill(this,enemy);
      this.totalKills++; this.score += enemy.score || 100;
      if(enemy.archetype==='golem')MM.GolemCombat?.cleanup(this,enemy);
      if(enemy.archetype==='werewolf')MM.WolfCombat?.cleanup(this,enemy);
      if(enemy.archetype==='kong')MM.KongCombat?.cleanup(this,enemy);
      if(enemy.archetype==='dragon')MM.DragonCombat?.cleanup(this,enemy);
      if(['lion','medusa','goatman','chimera'].includes(enemy.archetype))MM.MythicCombat?.cleanup(this,enemy);
      if (enemy.boss) {
        this.bossDefeated = !this.enemies.some(other=>other!==enemy&&other.boss&&!other.dead&&(other.health>0||other.predatorRage||other.deepFinal||other.deepRebirthTime>0||other.krakenStone));
        MM.BossCombat?.cleanup(this,enemy);
      } else if(!enemy.minion&&!enemy.predatorSeaHazard&&!enemy.finalSeaHazard)this.levelKills++;
      MM.SkillManager?.onKill(this,enemy);MM.BossManager?.onDefeated(this,enemy);
      this.burst(enemy.x,enemy.y-enemy.h/2,enemy.boss?'#ffd391':'#bbc4a5',enemy.boss?36:14);
      this.floating(enemy.x,enemy.y-enemy.h-10,'+'+(enemy.score||100)); this.sound.play('kill');
      const shieldProgress=this.shieldProgress();
      const regularKill=!enemy.boss&&!enemy.playerShadow&&!enemy.flowerIllusion&&!enemy.emotionProjection&&!enemy.abyssClone;
      if(shieldProgress.abyss&&regularKill)this.abyssShieldKills++;
      // The Abyss has its own ordinary-enemy counter. Boss kills and phase
      // changes cannot complete a five-kill reward or double-award at ten.
      if (shieldProgress.abyss?regularKill&&this.abyssShieldKills%5===0:this.totalKills%10===0) {
        if (this.shieldCount < 3) { this.shieldCount++; this.toast('✦ +1 khiên · Space hoặc vuốt xuống'); this.sound.play('shield'); }
        else this.toast('Kho khiên đã đầy · dùng Space hoặc vuốt xuống');
      }
      // Deterministic assistance avoids unlucky stretches without healing.
      if (!enemy.boss && this.totalKills % 7 === 0 && this.player.health < this.player.maxHealth) this.pickups.push({x:clamp(enemy.x,40,W-40),y:GROUND-12,type:'health',life:14});
      this.enemies = this.enemies.filter(e=>!e.dead);
      this.save.best = Math.max(this.save.best,this.score); this.updateUI(); this.checkCompletion();
    }
    hurt(enemy) {
      const p = this.player; if ((p.invulnerable > 0 && !enemy.forceHit) || p.rollTime>0 || this.screen !== 'playing') return;
      const immortal=p.immortalTime>0;
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
        const damage=clamp(Number.isFinite(enemy.damage)?Math.trunc(enemy.damage):1,1,3);
        p.health = Math.max(0,p.health-(immortal?0:damage)); p.invulnerable = 1.35;
        if(enemy.stun>0){p.stunTime=Math.max(p.stunTime,Math.min(2,enemy.stun));p.stunStyle=enemy.kind==='web'?'web':'stars';this.clearInputs();}
        if(damage>1&&!immortal)this.floating(p.x,p.y-p.h-16,`−${damage} MÁU`,'#ffb391');
        const dir = Math.sign(p.x-enemy.x || 1); p.x = clamp(p.x+dir*42,28,W-28); p.vy = -160; p.grounded = false;
        this.shake = 6; this.flash = .12; this.burst(p.x,p.y-26,'#ff9a87',14); this.sound.play('hit');
        if (p.health === 0) this.finish(false);
      }
      this.updateUI();
    }
    applyCombatEffect(spec={}) {
      const p=this.player;
      if(this.screen!=='playing'||p.rollTime>0||(p.invulnerable>0&&!spec.forceHit))return false;
      const immortal=p.immortalTime>0;
      const rawDamage=Number.isFinite(spec.damage)?spec.damage:0;
      const damage=immortal||MM.MerfolkTransformation?.protectsHP(this,spec)?0:spec.exactDamage?Math.max(0,rawDamage):clamp(Math.trunc(rawDamage),0,3);
      if(p.shieldTime>0&&p.shieldHits>0){
        p.shieldHits--;if(p.shieldHits===0)p.shieldTime=0;p.invulnerable=.45;
        this.burst(p.x,p.y-28,'#91e3d1',10,'ring');this.sound.play('shield');
        const pierced=immortal?0:clamp(Number(spec.pierceShield)||0,0,3);
        if(pierced>0){p.health=Math.max(0,p.health-pierced);this.floating(p.x,p.y-p.h-15,`−${pierced} MÁU · KHIÊN GIẢM ĐÒN`,'#ffd9a2');if(p.health===0)this.finish(false);}
        this.updateUI();return pierced>0;
      }
      let applied=false;
      if(damage>0){p.health=Math.max(0,p.health-damage);p.invulnerable=1.35;this.flash=.12;this.sound.play('hit');applied=true;}
      if(spec.petrify>0&&p.petrifyTime<=0&&p.petrifyGrace<=0){p.petrifyTime=Math.min(1.5,spec.petrify);this.clearInputs();applied=true;}
      if(spec.stun>0&&p.stunTime<=0&&p.stunGrace<=0){p.stunTime=Math.min(clamp(spec.stunLimit||2,0,3),spec.stun);p.stunStyle='stars';this.clearInputs();applied=true;}
      if(spec.burn>0){if(p.burnTime<=0)p.burnTick=1;p.burnTime=Math.max(p.burnTime,Math.min(2,spec.burn));applied=true;}
      if(spec.knockup){p.vy=typeof spec.knockup==='number'?spec.knockup:-620;p.grounded=false;applied=true;}
      if(applied){this.burst(p.x,p.y-24,damage?'#f4ae83':'#b5d9e4',10);if(damage>1)this.floating(p.x,p.y-p.h-14,`−${damage} MÁU`,'#ffb391');}
      if(p.health===0)this.finish(false);
      if(applied)this.updateUI();return applied;
    }
    updatePlayerEffects(dt) {
      const p=this.player,wasPetrified=p.petrifyTime>0;
      p.petrifyTime=Math.max(0,p.petrifyTime-dt);p.petrifyGrace=Math.max(0,p.petrifyGrace-dt);
      if(p.petrifyTime<1e-8)p.petrifyTime=0;
      if(wasPetrified&&p.petrifyTime===0)p.petrifyGrace=.6;
      if(p.burnTime>0){
        const elapsed=Math.min(dt,p.burnTime);p.burnTime=Math.max(0,p.burnTime-elapsed);p.burnTick-=elapsed;
        while(p.burnTick<=1e-8&&this.screen==='playing'){p.burnTick+=1;this.applyCombatEffect({kind:'burn',damage:1,forceHit:true});}
        if(p.burnTime<1e-8)p.burnTime=0;
      }
      p.rollCooldown=Math.max(0,p.rollCooldown-dt);
      if(p.rollTime>0){p.rollTime=Math.max(0,p.rollTime-dt);if(p.rollTime<1e-8)p.rollTime=0;p.rollProgress=1-p.rollTime/p.rollDuration;}
    }
    drainTarget(owner) {
      if(this.screen!=='playing'||owner.dead||owner.health<=0)return;
      const p=this.player;
      if(p.immortalTime>0){this.burst(p.x,p.y-28,'#e4d18f',8,'ring');return;}
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
      if(this.abyssCorpses?.length)return;
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
          this.banner(this.level.bossName,this.level.underwater?'BOSS XUẤT HIỆN · BƠI NÉ, GIỮ OXY VÀ DÙNG KHIÊN':'BOSS XUẤT HIỆN · NHẢY VÀ DÙNG KHIÊN ĐỂ NÉ',3); this.sound.play('shield');
        }
      } else this.finish(true);
    }
    update(dt) {
      dt = clamp(Number.isFinite(dt) ? dt : 0,0,.05);
      if(this.cinematic){MM.ChapterTransition?.update(this,dt);return;}
      MM.InputManager?.update(this,dt);
      MM.ProgressionUI?.sync(this);
      MM.UnderwaterMode?.syncUI(this);
      if(this.weaponPicker?.open)return;
      if (this.screen !== 'playing') { if (this.screen === 'home') this.time += dt; return; }
      this.time += dt; this.levelTime += dt; this.restTimer = Math.max(0,(this.restTimer||0)-dt);
      const p = this.player; p.invulnerable = Math.max(0,p.invulnerable-dt); p.shieldTime = Math.max(0,p.shieldTime-dt); p.shotTimer = Math.max(0,p.shotTimer-dt);p.dryCooldown=Math.max(0,p.dryCooldown-dt);
      const wasStunned=p.stunTime>0;
      p.stunTime=Math.max(0,p.stunTime-dt);p.knockdownTime=Math.max(0,p.knockdownTime-dt);p.stunGrace=Math.max(0,p.stunGrace-dt);
      if(p.stunTime<1e-8)p.stunTime=0;if(p.knockdownTime<1e-8)p.knockdownTime=0;
      if(wasStunned&&p.stunTime===0){p.stunGrace=Math.max(.6,p.electricStunGrace||0);p.electricStunGrace=0;}
      this.updatePlayerEffects(dt);if(this.screen!=='playing')return;
      MM.UnderwaterMode?.update(this,dt);if(this.screen!=='playing')return;
      MM.SkillManager?.update(this,dt);
      MM.AbyssCombat?.update(this,dt);if(this.screen!=='playing')return;
      let move = (this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0);
      let vertical=(this.keys.has('KeyS')?1:0)-(this.keys.has('KeyW')?1:0);
      let fire = this.keys.has('KeyA')||this.keys.has('KeyJ') ? -1 : this.keys.has('KeyD')||this.keys.has('KeyL') ? 1 : 0;
      this.pointers.forEach(pointer => {
        pointer.age += dt;
        if (pointer.mode === 'move') move = pointer.move;
        else if(pointer.mode==='swim')vertical=pointer.vertical||0;
        else if (pointer.mode === 'pending' && (pointer.mouse || pointer.age > .28)) { fire = pointer.worldX<W/2 ? -1 : 1; pointer.shot = true; }
      });
      let padMove=0, movingWithPad=false;
      this.padInputs.forEach(action => {
        if(action==='left'||action==='right'){movingWithPad=true;padMove+=action==='left'?-1:1;}
        if(action==='swim-up'||action==='swim-down')vertical=action==='swim-up'?-1:1;
        if(action==='fire-left'||action==='fire-right')fire=action==='fire-left'?-1:1;
      });
      if(movingWithPad)move=clamp(padMove,-1,1);
      move*=MM.AbyssCombat?.inputDirection(this)||1;
      if(p.stunTime>0||p.petrifyTime>0||p.swallowedTime>0){move=0;vertical=0;fire=0;p.vx=0;p.jumpBuffer=0;}
      this.swimVertical=vertical;
      if(MM.UnderwaterMode?.active(this))MM.UnderwaterMode.swim(this,move,dt);
      else{
      const speed=285, acceleration=2100;
      const desired=move*speed; p.vx += clamp(desired-p.vx,-acceleration*dt,acceleration*dt); if (move) p.dir=move;
      if(p.rollTime>0){p.vx=p.rollDir*850;p.dir=p.rollDir;fire=0;}
      if(this.rollSlash?.time>0){p.vx=this.rollSlash.dir*850;p.dir=this.rollSlash.dir;fire=0;p.jumpBuffer=0;}
      p.x=clamp(p.x+p.vx*dt,26,W-26);
      p.coyote = p.grounded ? .1 : Math.max(0,p.coyote-dt);
      const gravity=MM.AbyssCombat?.gravityDirection(this)||1,ceiling=MM.AbyssCombat?.ceilingY(this)??p.h+18;
      if(this.lastGravityDirection!==gravity){this.lastGravityDirection=gravity;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.vy=0;}
      if (p.jumpBuffer > 0 && p.coyote > 0) { p.vy=(MM.SkillManager?.jumpVelocity(this,-610)??-610)*gravity; p.grounded=false; p.jumpBuffer=0; p.coyote=0; this.burst(p.x,gravity>0?GROUND:ceiling-p.h,'#9aad94',6); }
      p.jumpBuffer = Math.max(0,p.jumpBuffer-dt); p.vy += 1420*gravity*dt; p.y += p.vy*dt;
      if(gravity>0&&p.y>=GROUND){p.y=GROUND;p.vy=0;p.grounded=true;}
      else if(gravity<0&&p.y<=ceiling){p.y=ceiling;p.vy=0;p.grounded=true;}
      if(this.level.id>=101)p.y=clamp(p.y,ceiling,GROUND);
      }
      this.fireIntent=fire;
      if (fire) this.shoot(fire);
      MM.WeaponManager?.update(this,dt);
      this.updateAmmo(dt);
      this.spawnTimer -= dt;
      const alive = this.enemies.filter(e=>!e.boss&&!e.minion&&!e.middleSeaHazard&&!e.predatorSeaHazard&&!e.finalSeaHazard).length;
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
          const state={zombie:'ledge',spider:'hanging',ghost:'airborne',vampire:'bat'}[enemy.archetype];
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
      if(this.screen==='playing')MM.GolemCombat?.update(this,dt);
      if(this.screen==='playing')MM.WolfCombat?.update(this,dt);
      if(this.screen==='playing')MM.KongCombat?.update(this,dt);
      if(this.screen==='playing')MM.DragonCombat?.update(this,dt);
      if(this.screen==='playing')MM.MythicCombat?.update(this,dt);
      if(this.screen==='playing')MM.UnderwaterEnemies?.update(this,dt);
      if(this.screen==='playing')MM.Boss160?.update(this,dt);
      if(this.screen==='playing')MM.MiddleSeaEnemies?.update(this,dt);
      if(this.screen==='playing')MM.Boss170?.update(this,dt);
      if(this.screen==='playing')MM.PredatorSeaEnemies?.update(this,dt);
      if(this.screen==='playing')MM.Boss180?.update(this,dt);
      if(this.screen==='playing')MM.DeepSeaEnemies?.update(this,dt);
      if(this.screen==='playing')MM.Boss190?.update?.(this,dt);
      if(this.screen==='playing')MM.FinalSeaEnemies?.update(this,dt);
      if(this.screen==='playing')MM.Boss200?.update(this,dt);
      if(this.player.weaponMode!=='normal')this.updateAmmoUI();
      if(this.screen!=='playing')return;
      for(const shot of this.enemyShots){
        if(shot.kind==='banana'){MM.KongCombat?.updateShot(this,shot,dt);continue;}
        shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
        if(overlaps({...p,w:p.w*.75,h:p.h*.86},shot)){
          if(shot.kind==='rock')this.burst(shot.x,shot.y,'#c1a78a',10);
          if(shot.kind==='web')MM.BossCombat?.webHit(this,shot);else this.hurt(shot);
          shot.life=0;
        }else if(shot.kind==='rock'&&shot.y>=GROUND){shot.life=0;this.burst(shot.x,GROUND,'#c1a78a',10);}
      }
      this.enemyShots=this.enemyShots.filter(shot=>shot.life>0&&shot.x>-30&&shot.x<W+30&&shot.y>-30&&shot.y<H+30);
      if(this.screen!=='playing')return;
      const spent=new Set();
      for(const bullet of this.bullets) {
        if(this.screen!=='playing')break;
        const prev=bullet.x,prevY=bullet.y;bullet.previousX=prev;bullet.previousY=prevY;
        bullet.x+=(bullet.vx??bullet.dir*(bullet.speed||780))*dt;bullet.y+=(bullet.vy||0)*dt;bullet.life-=dt;
        if(MM.AbyssCombat?.hitHazards(this,bullet,prev,prevY)){spent.add(bullet);continue;}
        const candidates=this.enemies.filter(e=>!e.dead&&!e.intangible&&!e.bulletUntargetable&&e.phase==='active'&&!bullet.hit?.has(e)).map(e=>({e,t:bulletEntry(prev,prevY,bullet.x,bullet.y,e,bullet.radiusX??3,bullet.radiusY??3)})).filter(v=>v.t!==null).sort((a,b)=>a.t-b.t).map(v=>v.e);
        if(!bullet.vy&&MM.BossCombat?.hitEgg(this,bullet,prev,candidates.length?Math.abs(candidates[0].x-prev):Infinity)){spent.add(bullet);continue;}
        const e=candidates[0];
        if(e) {
          spent.add(bullet);
          this.dealEnemyDamage(e,bullet.damage,bullet);
        }
      }
      if(this.screen!=='playing')return;
      this.bullets=this.bullets.filter(b=>!spent.has(b)&&b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
      for(const pickup of this.pickups){if(MM.UnderwaterMode?.active(this))MM.UnderwaterLoot.updateHealthItem(this,pickup,dt);pickup.life-=dt;if(Math.abs(p.x-pickup.x)<p.w/2+16&&Math.abs(p.y-pickup.y)<70){p.health=Math.min(p.maxHealth,p.health+1);pickup.life=0;this.floating(p.x,p.y-p.h-12,'+1 MÁU','#afe4bc');this.sound.play('health');this.updateUI();}}
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
      MM.AbyssCombat?.reset(this);
      MM.UnderwaterMode?.stop(this);
      if(won&&this.level.id===200&&this.canvas&&MM.ChapterTransition){
        MM.ChapterTransition.begin(this,'ending',()=>{
          this.endingOnLand=true;this.player.swimming=false;this.player.merfolkTime=0;this.screen='won';
          if(!this.headless){this.showResult();this.buildMap();}this.updateUI();
        });return;
      }
      if(!this.headless){this.ui['stage-banner'].hidden=true;this.ui['toast'].hidden=true;this.showResult();this.buildMap();}
      this.updateUI();
    }
    // Every player weapon shares boss immunity, phase transitions and death accounting.
    dealEnemyDamage(e,amount,attack={}) {
      if(this.screen!=='playing'||!e||e.dead||e.health<=0||e.intangible||e.bulletUntargetable||e.phase!=='active')return false;
      if(MM.UnderwaterMode&&!MM.UnderwaterMode.canAttack(this))return false;
      const bossTarget=e.emotionProjection?e.projectionOwner:e.boss?e:null;
      const bossShieldRule=this.bossShieldRule(bossTarget),receiptBefore=attack.damageReceipt?.damage||0;
      const damage=Math.max(attack.damageReceipt?0:1,Number.isFinite(amount)?amount:1);
      if(attack.damageReceipt&&(damage<=0||Number.isFinite(attack.damageBudget)&&attack.damageBudget<=0))return false;
      if(MM.BossCombat?.hit(this,e)===false){this.burst(e.x,e.y-e.h*.5,'#a7edab',4);return false;}
      let handled=false;
      for(const combat of [MM.AbyssCombat,MM.WolfCombat,MM.KongCombat,MM.DragonCombat,MM.MythicCombat,MM.Boss160,MM.MiddleSeaEnemies,MM.Boss170,MM.Boss180,MM.DeepSeaEnemies,MM.Boss190,MM.FinalSeaEnemies,MM.Boss200]){
        const result=combat?.hit(this,e,damage,attack);
        if(result===false){this.burst(e.x,e.y-e.h*.55,'#d6c7ed',5);return false;}
        if(result===true)handled=true;
      }
      if(!handled){if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);else e.health-=damage;}
      MM.BossCombat?.afterDamage?.(this,e);
      // Accepted projectiles count once, including the hit that triggers a
      // form change and valid Rage-projection hits on the deity's shared HP.
      this.recordBossHit(bossTarget,attack,bossShieldRule,attack.damageReceipt?attack.damageReceipt.damage-receiptBefore:undefined);
      e.hit=.12;if(!e.vinePhase&&!e.airborne&&!e.mythicAir)e.x=clamp(e.x+(attack.dir||this.player.dir)*(e.boss?2:7),18,W-18);
      this.burst(e.x,Number.isFinite(attack.y)?attack.y:e.y-e.h*.5,'#ffdaa0',5);
      if(e.health<=0)this.killEnemy(e);
      return true;
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
      this.ui['result-description'].textContent=paused?'Hít thở một chút. Khi sẵn sàng, trở lại cuộc săn.':final?`Bạn đã vượt qua cả ${Campaign.levels.length} màn. Hành trình được lưu và tất cả vùng đất đang chờ bạn trở lại.`:won?(this.level.boss?'Boss đã bị hạ. ':'')+'Qua màn hồi máu, giữ khiên và đạn còn lại; nhận một lượng đạn khởi đầu cho màn mới.':'Bắn chính xác, nhặt hòm AMMO rơi và quan sát dấu báo kỹ năng. Nhảy hoặc dùng khiên khi bị vây.';
      this.ui['result-stats'].innerHTML=`<span><b>${String(this.score).padStart(5,'0')}</b>ĐIỂM SỐ</span><span><b>${this.levelKills}/${this.level.target}</b>ĐỊCH ĐÃ HẠ</span><span><b>${Math.floor(this.levelTime)}s</b>THỜI GIAN</span>`;
      this.ui['result-primary'].innerHTML=(paused?'Trở lại cuộc săn':final?'Săn lại từ đầu':won?'Màn tiếp theo':'Thử lại màn này')+' <span>→</span>';
      this.resultAction=paused?()=>this.togglePause():final?()=>this.start(1):won?()=>this.start(this.level.id+1,{carry:true}):()=>this.start(this.level.id,{retry:true});
      this.ui['result-overlay'].hidden=false;
      MM.StoryUI?.result(this);
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
      MM.UnderwaterMode?.syncUI(this);
      MM.ProgressionUI?.sync(this);
      // Combat still updates every frame. Rebuild the stable DOM HUD only
      // when its visible values change, rather than recreating heart SVGs
      // and atlas labels sixty times per second on phones.
      const hudPlayer=this.player,hudBossCharge=this.bossShieldProgress();
      const hudSignature=[this.screen,this.level.id,this.levelKills,this.bossSpawned,this.bossDefeated,
        hudPlayer.health,hudPlayer.maxHealth,hudPlayer.ammo,hudPlayer.maxAmmo,hudPlayer.weaponMode,
        Math.ceil((hudPlayer.shotTimer||0)*10),this.aimMode,this.shieldCount,this.shieldProgress().count,this.abyssBossHits%10,hudBossCharge?.count,hudBossCharge?.goal,hudBossCharge?.special,this.score,
        this.save.best,this.save.resume,this.save.completed.join(','),this.settings.controls,
        this.settings.effects,this.settings.reducedMotion,this.settings.sound,this.progression?.equipped,
        this.progression?.rewards?.join(','),this.weaponPicker?.open,this.selectedStory].join('|');
      if(this.hudSignature===hudSignature)return;
      this.hudSignature=hudSignature;
      const campaignLabels={'campaign-total':Campaign.levels.length,'hero-level-total':Campaign.levels.length,'hero-world-total':Campaign.worlds.length,'campaign-range':`001—${String(Campaign.levels.length).padStart(3,'0')}`,'campaign-title':`${Campaign.levels.length} đêm trong bóng tối.`};
      Object.entries(campaignLabels).forEach(([id,text])=>{if(this.ui[id])this.ui[id].textContent=text;});
      const home=this.screen==='home',p=this.player;document.body.className=home?'home':'playing';
      document.body.dataset.controls=this.settings.controls;
      this.ui['touch-controls'].hidden=this.screen!=='playing'||this.settings.controls==='gestures';
      this.ui['touch-guide'].textContent=this.settings.controls==='buttons'?'Giữ ← → để đi · ↑ NHẢY · ◇ KHIÊN · BẮN ← →':this.settings.controls==='gestures'?'↔ Vuốt & giữ để đi · ↑ Nhảy · ↓ Khiên · Chạm hai nửa để bắn':'↔ Vuốt hoặc giữ nút để đi · ↑ Nhảy · ↓ Khiên · Chạm / nút để bắn';
      this.mobileView?.sync();
      this.ui['level-number'].textContent=String(this.level.id).padStart(2,'0');this.ui['world-label'].textContent=`VÙNG ${String(this.level.world+1).padStart(2,'0')} / ${String(Campaign.worlds.length).padStart(2,'0')} · ${Campaign.worlds[this.level.world].name.toUpperCase()}`;this.ui['level-name'].textContent=this.level.name;
      this.ui['kill-count'].textContent=`${this.levelKills} / ${this.level.target}`;this.ui['kill-progress'].style.width=clamp(this.levelKills/this.level.target*100,0,100)+'%';this.ui['mission-label'].textContent=this.bossSpawned&&!this.bossDefeated?'HẠ BOSS ĐỂ QUA MÀN':'ĐỊCH ĐÃ HẠ';
      this.ui.health.innerHTML=Array.from({length:p.maxHealth},(_,i)=>`<span class="${i<p.health?'':'empty'}" aria-hidden="true"><svg viewBox="0 0 24 24" style="width:.85em;height:1em;fill:currentColor;stroke:none"><path d="M12 21C9 18 2 13 2 7A5 5 0 0 1 12 5A5 5 0 0 1 22 7C22 13 15 18 12 21Z"/></svg></span>`).join('');this.ui.health.setAttribute('aria-label',`Sinh lực ${p.health} / ${p.maxHealth}`);
      this.updateAmmoUI();
      const shieldCharge=this.shieldProgress(),shieldEnemy=shieldCharge.abyss?'quái thường':'địch';
      this.ui['shield-count'].textContent=this.shieldCount;this.ui['shield-button'].classList.toggle('ready',this.shieldCount>0);this.ui['charge-label'].textContent=this.shieldCount>0?`${this.shieldCount} khiên sẵn sàng · ${shieldCharge.count}/${shieldCharge.goal} ${shieldEnemy} tích khiên`:`${shieldCharge.count}/${shieldCharge.goal} ${shieldEnemy} · Hạ ${shieldCharge.goal} ${shieldEnemy} để nhận khiên`;
      if(hudBossCharge)this.ui['charge-label'].textContent+=` · Boss ${hudBossCharge.count}/${hudBossCharge.goal} ${hudBossCharge.unit} · ${hudBossCharge.full?'Kho khiên đầy (3/3)':'+1 khiên'}`;
      this.ui['pad-shield-count'].textContent=this.shieldCount;
      document.querySelector('[data-control="shield"]').classList.toggle('ready',this.shieldCount>0);
      this.ui['fullscreen-button'].disabled=!['home','playing'].includes(this.screen)&&!document.fullscreenElement;
      this.ui['score-label'].innerHTML=`${home?'KỶ LỤC':'ĐIỂM'} <b>${String(home?this.save.best:this.score).padStart(5,'0')}</b>`;this.ui['status-label'].textContent=home?'SẴN SÀNG CHO CUỘC SĂN':this.screen==='paused'?'CUỘC SĂN TẠM DỪNG':this.screen==='won'?'MÀN ĐÃ HOÀN THÀNH':this.screen==='lost'?'SẴN SÀNG THỬ LẠI':this.level.boss?'ĐÊM CỦA KẺ GIỮ CỔNG':'CUỘC SĂN ĐANG DIỄN RA';
      this.ui['start-label'].textContent=this.save.resume>1?'Tiếp tục · Màn '+this.save.resume:'Bắt đầu cuộc săn';this.ui['save-label'].textContent=this.save.completed.length?`${this.save.completed.length} / ${Campaign.levels.length} MÀN ĐÃ HOÀN THÀNH`:'CHƯA CÓ HÀNH TRÌNH';
      this.ui['pause-button'].disabled=home;this.ui['shield-button'].disabled=home;
      MM.StoryUI?.sync(this);
      MM.Atlas3D?.sync(this);
      MM.KeyBindings?.sync(this);
    }
    buildMap() {
      if(this.headless)return;const map=this.ui['level-map'];map.textContent='';
      const story=MM.StoryUI?.selected(this);
      Campaign.worlds.filter(world=>!story||(world.id>=Math.floor((story.start-1)/10)&&world.id<=Math.floor((story.end-1)/10))).forEach(world=>{const section=document.createElement('section');section.className='world-map';section.id='world-map-'+world.id;const title=document.createElement('h3');title.innerHTML=`<span>${String(world.id+1).padStart(2,'0')}</span> ${world.name} <small>${world.subtitle}</small>`;section.append(title);const grid=document.createElement('div');grid.className='level-grid';
        if(story){const lore=document.createElement('p');lore.className='world-lore';lore.textContent=story.arcs[world.id-Math.floor((story.start-1)/10)];section.append(lore);}
        Campaign.levels.filter(level=>level.world===world.id).forEach(level=>{const button=document.createElement('button');button.className='level-tile'+(level.boss?' boss':'')+(this.save.completed.includes(level.id)?' completed':'')+(this.save.resume===level.id?' current':'');button.textContent=String(level.id).padStart(2,'0');button.title=`Màn ${level.id}: ${level.name}${level.boss?' · Boss':''}`;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>this.start(level.id));grid.append(button);});section.append(grid);map.append(section);});
    }
    resize() {
      if(this.headless)return;const dpr=Math.min(root.devicePixelRatio||1,2);this.canvas.width=W*dpr;this.canvas.height=H*dpr;this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);
      // Keep sky warnings and airborne enemies visible at every viewport shape.
      this.canvas.style.objectFit='contain';this.canvas.style.objectPosition='50% 50%';
      this.viewTop=0;
      for(const enemy of this.enemies){
        if(enemy.homeY){enemy.homeY=Math.min(GROUND-45,Math.max(enemy.baseHomeY||enemy.homeY,this.viewTop+enemy.h+25));if(enemy.platform)enemy.platform.y=enemy.homeY;}
      }
    }
    frame(timestamp) {
      const dt=this.lastTime?clamp((timestamp-this.lastTime)/1000,0,.05):0;this.lastTime=timestamp;this.update(dt);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);MM.Renderer.draw(this.ctx,this);
      this.raf=root.requestAnimationFrame(this.frame);
    }
    clearNativeSelection() {
      const selection=root.getSelection?.();
      if(!selection||selection.isCollapsed)return false;
      const anchor=interactionElement(selection.anchorNode),focus=interactionElement(selection.focusNode);
      if(editableInteraction(anchor)||editableInteraction(focus))return false;
      if(!protectedInteraction(anchor)&&!protectedInteraction(focus))return false;
      selection.removeAllRanges();return true;
    }
    nativeInteraction(event) {
      const target=interactionElement(event.target);
      if(editableInteraction(target))return false;
      const selected=event.type==='copy'&&this.clearNativeSelection();
      if(!protectedInteraction(target)&&!selected)return false;
      event.preventDefault();return true;
    }
    bind() {
      for(const type of ['selectstart','dragstart','contextmenu','copy'])document.addEventListener(type,event=>this.nativeInteraction(event),true);
      document.addEventListener('selectionchange',()=>this.clearNativeSelection());this.clearNativeSelection();
      root.addEventListener('keydown',event=>this.keyDown(event));root.addEventListener('keyup',event=>this.keyUp(event));root.addEventListener('blur',()=>{if(this.screen==='playing')this.togglePause();else this.clearInputs();});
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.screen==='playing')this.togglePause();this.lastTime=0;});root.addEventListener('resize',()=>this.resize());
      this.canvas.addEventListener('pointerdown',event=>this.pointerDown(event));this.canvas.addEventListener('pointermove',event=>this.pointerMove(event));this.canvas.addEventListener('pointerup',event=>this.pointerUp(event));this.canvas.addEventListener('pointercancel',event=>this.pointerUp(event,true));this.canvas.addEventListener('lostpointercapture',event=>this.pointerUp(event,true));this.canvas.addEventListener('contextmenu',event=>event.preventDefault());
      this.ui['start-button'].addEventListener('click',()=>MM.StoryUI?MM.StoryUI.open(this):this.start());this.ui['pause-button'].addEventListener('click',()=>this.togglePause());this.ui['shield-button'].addEventListener('click',()=>{this.shieldAction();this.canvas.focus({preventScroll:true});});
      this.ui['result-primary'].addEventListener('click',()=>this.resultAction?.());this.ui['result-home'].addEventListener('click',()=>this.goHome());this.ui.brand.addEventListener('click',event=>{event.preventDefault();this.goHome();});
      ['open-levels','home-levels'].forEach(id=>this.ui[id].addEventListener('click',()=>{this.buildMap();this.openDialog('levels-dialog');}));this.ui['open-help'].addEventListener('click',()=>{MM.Tutorial?.focusHelp(this);this.openDialog('help-dialog');});this.ui['open-settings'].addEventListener('click',()=>this.openDialog('settings-dialog'));
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
      MM.ProgressionUI?.bind(this);
      MM.UnderwaterMode?.bind(this);
      this.ui['cinematic-skip']?.addEventListener('click',()=>MM.ChapterTransition?.skip(this));
      MM.StoryUI?.bind(this);
      MM.KeyBindings?.bind(this);
      MM.Tutorial?.bind(this);
      this.ui['open-install-help']?.addEventListener('click',()=>{this.ui['settings-dialog'].close();this.openDialog('ios-install-dialog');});
    }
  }
  MM.Game = Game; MM.readSave = readSave; MM.overlaps = overlaps;
  if(typeof document!=='undefined'&&document.getElementById('canvas'))MM.game=new Game();
})(typeof window!=='undefined'?window:globalThis);
