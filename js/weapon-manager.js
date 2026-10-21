/* V3 equipment: weapon identity is independent from temporary aiming modes. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const ORDER = ['gun', 'bones', 'club', 'bow', 'spear', 'axes', 'hammer', 'scythe'];
  const UNLOCK = {gun:0, bones:10, club:60, bow:90, spear:90, axes:100,hammer:120,scythe:140};
  const NAMES = {gun:'Súng', bones:'Xương Phân Ba', club:'Chùy Golem', bow:'Cung Hắc Ám', spear:'Giáo Bạch Kim', axes:'Song Rìu',hammer:'Búa Minotaur',scythe:'Lưỡi Hái Cổ Điểu'};
  const RAD = Math.PI / 180;
  const suppressed = g => MM.MapManager?.suppressed ? MM.MapManager.suppressed(g) : g.level?.id === 70;
  const enabled = g => MM.MapManager?.skillsEnabled ? MM.MapManager.skillsEnabled(g) : !suppressed(g);
  const unlocked = (g, level) => !level || !!MM.SaveManager?.unlocked?.(g, level);
  const manualAim = g => MM.MapManager?.manualAim ? !!MM.MapManager.manualAim(g) : enabled(g) && unlocked(g, 80);
  const progression = g => g.progression || g.save?.progression || {};
  const persist = g => { if (MM.SaveManager?.write) MM.SaveManager.write(g); else g.persist?.(); };
  const alive = e => !e.dead && !e.retired && e.health > 0 && e.phase === 'active' && !e.intangible && !e.bulletUntargetable;
  const amplify = (g, damage) => enabled(g) && MM.SkillManager?.consumeDamage ? MM.SkillManager.consumeDamage(g, damage) : damage;
  const edgeGap = (p, e) => Math.max(0, Math.abs(e.x - p.x) - (p.w + e.w) / 2);
  const meleeTargets = (g, dir, range) => (g.enemies || []).filter(e => alive(e)
    && (e.x - g.player.x) * dir >= -(g.player.w + e.w) / 4
    && edgeGap(g.player, e) <= range
    && g.player.y > e.y - e.h && g.player.y - g.player.h < e.y)
    .sort((a, b) => edgeGap(g.player, a) - edgeGap(g.player, b));

  const WeaponManager = {
    order:ORDER, names:NAMES,
    init(g) {
      const data = progression(g);
      if (!ORDER.includes(data.equipped)) data.equipped = 'gun';
      g.aimMode = g.aimMode === 'high' ? 'high' : 'ground';
      g.rollSlash = null;
      g.rollSlashCooldown = 0;
      g.weaponAttack = null;
      g.scytheSwapCooldown = 0;
    },
    available(g) { return suppressed(g) ? ['gun'] : ORDER.filter(id => unlocked(g, UNLOCK[id])); },
    current(g) {
      const id = progression(g).equipped;
      return !suppressed(g) && ORDER.includes(id) && unlocked(g, UNLOCK[id]) ? id : 'gun';
    },
    select(g, id) {
      if (suppressed(g) || !this.available(g).includes(id)) return false;
      if (g.rollSlash?.time > 0) return false;
      progression(g).equipped = id;
      g.player.weaponMode = id === 'gun' ? 'normal' : id;
      g.weaponAttack = null;
      persist(g);
      g.updateAmmoUI?.(); g.updateUI?.();
      return true;
    },
    cycle(g) {
      const options = this.available(g);
      if (options.length < 2) return false;
      const index = options.indexOf(this.current(g));
      return this.select(g, options[(index + 1) % options.length]);
    },
    setAim(g, mode) {
      if (!manualAim(g) || !['high', 'ground'].includes(mode)) return false;
      g.aimMode = mode; g.updateAmmoUI?.(); g.updateUI?.();
      return true;
    },
    profile(g, dir = g.player.dir || 1) {
      const id = this.current(g), p = g.player;
      if (id === 'gun') {
        // The first encounter with aerial bosses retains its existing automatic aim.
        if (!manualAim(g)||MM.AbyssCombat?.gravityDirection(g)<0) return {...g.getWeaponProfile(dir), equipped:id, name:NAMES[id]};
        return {kind:g.aimMode === 'high' ? 'highAim' : 'normal', equipped:id, name:NAMES[id],
          cost:1, damage:1, cooldown:.17, speed:780, locked:false, manual:true, target:null};
      }
      if (id === 'bones') return {kind:id, equipped:id, name:NAMES[id], count:3, cost:3, damage:1, cooldown:.65, speed:780, range:700, spread:[-12, 0, 12]};
      if (id === 'bow') return {kind:id, equipped:id, name:NAMES[id], count:5, cost:5, damage:1, cooldown:.9, speed:900, range:700, spread:[-12, -6, 0, 6, 12]};
      if (id === 'club') return {kind:id, equipped:id, name:NAMES[id], cost:0, damage:3, cooldown:.75, range:95, melee:true};
      if (id === 'axes') return {kind:id, equipped:id, name:NAMES[id], cost:0, damage:2, cooldown:.55, range:80, melee:true};
      if(id==='hammer'||id==='scythe')return {kind:id,equipped:id,name:NAMES[id],cost:0,melee:true,...MM.AbyssConfig.weapons[id]};
      const target = meleeTargets(g, dir, Infinity)[0];
      const stab = !!target && edgeGap(p, target) <= 40;
      return {kind:id, equipped:id, name:NAMES[id], cost:stab ? 0 : 1, damage:stab ? 2 : 3,
        cooldown:.8, range:stab ? 40 : 700, speed:900, melee:stab, target, form:stab ? 'stab' : 'throw'};
    },
    fire(g, direction) {
      const p = g.player, dir = direction < 0 ? -1 : 1;
      if (g.screen !== 'playing' || g.weaponPicker?.open || p.shotTimer > .001 || p.stunTime > 0
        || p.petrifyTime > 0 || p.rollTime > 0 || g.rollSlash?.time > 0) return false;
      if(MM.UnderwaterMode&&!MM.UnderwaterMode.canAttack(g))return false;
      const weapon = this.profile(g, dir);
      if (weapon.locked) return false;
      if (p.ammo < weapon.cost) {
        if (!(p.dryCooldown > 0)) {
          g.toast?.(`${weapon.name} cần ${weapon.cost} đạn · nhặt hòm AMMO`);
          g.sound?.play('empty'); p.dryCooldown = 1.2;
        }
        return false;
      }
      p.dir = dir; p.weaponMode = weapon.kind;
      p.ammo -= weapon.cost; p.shotTimer = p.shotCooldown = weapon.cooldown;
      if (weapon.melee) {
        const targets = meleeTargets(g, dir, weapon.range);
        const selected = weapon.kind === 'spear' ? targets.slice(0, 1) : targets;
        let first = true;
        const hit = new Set();
        for (const e of selected) {
          const damage = first ? amplify(g, weapon.damage) : weapon.damage;
          first = false;
          g.dealEnemyDamage?.(e, damage, {kind:weapon.kind, weaponId:weapon.equipped, dir, melee:true, form:weapon.form || 'swing'});
          hit.add(e);
        }
        if (weapon.kind === 'scythe') {
          // The near slash and travelling crescent are one attack: no double hit
          // on a nearby enemy and only one unit can consume the Darken charge.
          const x=p.x+dir*(p.w/2+10),y=p.y-p.h*.5;
          g.bullets.push({kind:'scytheWave',weaponId:'scythe',x,y,previousX:x,previousY:y,dir,
            vx:dir*weapon.waveSpeed,vy:0,speed:weapon.waveSpeed,life:weapon.waveRange/weapon.waveSpeed,
            damage:first?amplify(g,weapon.damage):weapon.damage,baseDamage:weapon.damage,hit,radiusX:8,radiusY:28});
          g.burst?.(x,y,'#c49aff',8,'spark');
        }
        g.weaponAttack = {kind:weapon.kind, dir, time:.24, duration:.24, range:weapon.range, form:weapon.form || 'swing'};
        MM.AbyssCombat?.meleeHazards(g,g.weaponAttack);
        p.aimAngle = null;
        g.sound?.play('shot'); g.updateAmmoUI?.();
        return true;
      }
      const x = p.x + dir * (p.w / 2 + 10), y = p.y - 27;
      let angle = dir > 0 ? 0 : Math.PI;
      if (weapon.kind === 'highAim' && !weapon.manual && weapon.target) {
        angle = Math.atan2(weapon.target.y - weapon.target.h * .55 - y, weapon.target.x - x);
        p.dir = Math.sign(Math.cos(angle)) || dir;
        if (weapon.target.archetype === 'kong') MM.KongCombat?.recordShot(g, weapon.target);
      } else if (manualAim(g) && g.aimMode === 'high') {
        const gravity=MM.AbyssCombat?.gravityDirection(g)||1;
        angle = dir > 0 ? -35 * RAD*gravity : Math.PI + 35 * RAD*gravity;
        // Manual aim keeps KingKong's existing one-shield-per-five-shots rule.
        const kong=(g.enemies||[]).find(e=>e.boss&&e.archetype==='kong'&&e.vinePhase&&!e.dead&&e.health>0);
        if(kong)MM.KongCombat?.recordShot(g,kong);
      }
      const spread = weapon.spread || [0];
      for (let index = 0; index < spread.length; index++) {
        const shotAngle = angle + spread[index] * RAD;
        const damage = index === 0 ? amplify(g, weapon.damage) : weapon.damage;
        const bullet = {x, y, previousX:x, previousY:y, dir, kind:weapon.kind, weaponId:weapon.equipped,
          damage, baseDamage:weapon.damage, speed:weapon.speed, angle:shotAngle,
          life:weapon.range ? weapon.range / weapon.speed : 1.5};
        // Horizontal shots retain the old swept collision/egg-breaking route.
        bullet.vx = Math.cos(shotAngle) * weapon.speed;
        bullet.vy = Math.abs(Math.sin(shotAngle)) < 1e-8 ? 0 : Math.sin(shotAngle) * weapon.speed;
        g.bullets.push(bullet);
      }
      p.aimAngle = Math.abs(Math.sin(angle)) < 1e-8 ? null : angle*(MM.AbyssCombat?.gravityDirection(g)||1);
      if (weapon.kind === 'spear') g.weaponAttack = {kind:'spear', dir, time:.24, duration:.24, range:700, form:'throw'};
      g.burst?.(x, y, '#ffdc93', weapon.kind === 'sniper' ? 9 : 4, 'spark');
      g.sound?.play(weapon.kind === 'sniper' ? 'sniper' : 'shot'); g.updateAmmoUI?.();
      return true;
    },
    swapTarget(g) {
      const p=g.player;
      return (g.enemies||[]).filter(e=>!e.dead&&!e.retired&&e.health>0&&e.phase==='active'&&!e.boss&&!e.emotionProjection&&!e.projectionOwner
        &&!e.flowerIllusion&&!e.abyssClone&&!e.playerShadow&&!e.indestructible)
        .sort((a,b)=>Math.hypot(a.x-p.x,a.y-a.h*.5-(p.y-p.h*.5))
          -Math.hypot(b.x-p.x,b.y-b.h*.5-(p.y-p.h*.5)))[0]||null;
    },
    tryScytheSwap(g) {
      const p=g.player;
      if(g.screen!=='playing'||g.weaponPicker?.open||!enabled(g)||this.current(g)!=='scythe'
        ||g.scytheSwapCooldown>1e-8||p.stunTime>0||p.petrifyTime>0||p.rollTime>0||g.rollSlash?.time>0)return false;
      const e=this.swapTarget(g);
      if(!e){g.toast?.('Không có quái thường để hoán đổi · Boss miễn nhiễm');return false;}
      const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
      const old={x:p.x,y:p.y},dest={x:e.x,y:e.y};
      p.x=clamp(dest.x,p.w/2+8,960-p.w/2-8);
      p.y=clamp(dest.y,p.h+18,438);
      e.x=clamp(old.x,e.w/2+8,960-e.w/2-8);e.y=clamp(old.y,e.h+18,438);
      p.vx=p.vy=e.vx=e.vy=0;p.jumpBuffer=p.coyote=0;p.grounded=false;
      // Keep anchored enemies at their new horizontal position as their own
      // movement resumes; never alter health, rewards or the target's skill state.
      if(e.platform)e.platform.x=e.x;
      if(Number.isFinite(e.landX))e.landX=e.x;
      if(Number.isFinite(e.abyssHomeX))e.abyssHomeX=e.x;
      g.scytheSwapCooldown=MM.AbyssConfig.weapons.scythe.swapCooldown;
      g.burst?.(p.x,p.y-p.h*.5,'#c49aff',18,'ring');
      g.burst?.(e.x,e.y-e.h*.5,'#c49aff',18,'ring');
      g.floating?.(p.x,p.y-p.h-12,'HOÁN ĐỔI','#d9baff');
      g.sound?.play('shield');g.updateUI?.();return true;
    },
    tryRollSlash(g, direction) {
      const p = g.player, dir = direction < 0 ? -1 : 1;
      if (g.screen !== 'playing' || g.weaponPicker?.open || !enabled(g) || this.current(g) !== 'axes'
        || g.rollSlash?.time > 0 || (g.rollSlashCooldown || 0) > 1e-8 || p.rollTime > 0
        || p.stunTime > 0 || p.petrifyTime > 0) return false;
      if(MM.UnderwaterMode&&!MM.UnderwaterMode.canAttack(g))return false;
      g.rollSlash = {time:.32, duration:.32, dir, hit:new Set(), lastX:p.x, lastY:p.y, empoweredUsed:false};
      g.rollSlashCooldown = .9;
      p.dir = dir; p.vx = dir * 850; p.jumpBuffer = 0;
      g.burst?.(p.x, p.y - 22, '#dec4fc', 12);
      return true;
    },
    update(g, dt) {
      if (g.screen !== 'playing' || g.weaponPicker?.open) return;
      g.scytheSwapCooldown=Math.max(0,(g.scytheSwapCooldown||0)-dt);
      g.rollSlashCooldown = Math.max(0, (g.rollSlashCooldown || 0) - dt);
      if (g.weaponAttack) {
        g.weaponAttack.time = Math.max(0, g.weaponAttack.time - dt);
        if (!g.weaponAttack.time) g.weaponAttack = null;
      }
      const action = g.rollSlash;
      if (!action || action.time <= 0) return;
      // Switching weapons never grants a lingering damaging roll to the new weapon.
      if (!enabled(g) || this.current(g) !== 'axes') { g.rollSlash = null; return; }
      const p = g.player, low = Math.min(action.lastX, p.x) - p.w / 2 - 15;
      const high = Math.max(action.lastX, p.x) + p.w / 2 + 15;
      for (const e of g.enemies || []) {
        if (!alive(e) || action.hit.has(e) || e.x + e.w / 2 < low || e.x - e.w / 2 > high
          || p.y <= e.y - e.h || p.y - p.h >= e.y) continue;
        action.hit.add(e);
        const damage = action.empoweredUsed ? 2 : amplify(g, 2);
        action.empoweredUsed = true;
        g.dealEnemyDamage?.(e, damage, {kind:'rollSlash', weaponId:'axes', dir:action.dir, melee:true, rollSlash:true});
      }
      action.lastX = p.x; action.lastY = p.y;
      action.time = Math.max(0, action.time - dt);
      if (action.time < 1e-8) g.rollSlash = null;
    }
  };
  MM.WeaponManager = WeaponManager;
})(typeof window !== 'undefined' ? window : globalThis);
