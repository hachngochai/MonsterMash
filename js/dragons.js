/* Sky dragons, the Yin-Yang rebirth, and the holy-spear dragon knight. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPS = 1e-8;
  const ELEMENTS = ['fire', 'ice', 'wind', 'earth', 'lightning'];
  // Cast cadence uses active combat time, independently of pressure scaling.
  const skillInterval = e => e.boss ? 3 : 4;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const isDragon = e => (e?.archetype || e?.type) === 'dragon';
  const alive = e => e && !e.dead && e.health > 0;
  const touch = (p, z) => Math.abs(p.x - z.x) < (p.w * .75 + z.w) / 2 && p.y > z.y - z.h && p.y - p.h * .86 < z.y;

  function warning(e, name, remaining, total = remaining) {
    e.dragonWarning = name ? {name, remaining, total} : null;
    e.skillWarning = e.dragonWarning;
  }
  function setup(game, e) {
    if (!isDragon(e)) return;
    game.dragonZones = game.dragonZones || []; game.dragonShots = game.dragonShots || [];
    e.baseW = e.baseW || e.w; e.baseH = e.baseH || e.h;
    e.dragonForm = 'dragon'; e.dragonState = 'air'; e.airborne = true;
    e.dragonClock = 0; e.wingTime = 0; e.dragonGuarded = false;
    e.yinYangTriggered = false; e.knightTriggered = false; e.knightHits = 0;
    e.nextDragonSkillAt = skillInterval(e);
    e.dragonPatrolDir = e.dir || 1; e.dragonHomeY = e.boss ? 288 : 244;
    e.x = clamp(e.x, e.w / 2 + 16, W - e.w / 2 - 16); e.y = e.dragonHomeY;
    e.dragonWarning = null; e.skillWarning = null;
  }
  function clearOwned(game, e) {
    game.dragonZones = (game.dragonZones || []).filter(z => z.owner !== e);
    game.dragonShots = (game.dragonShots || []).filter(z => z.owner !== e);
  }
  function cleanup(game, e) {
    if (!isDragon(e)) return;
    clearOwned(game, e); e.skillWarning = e.dragonWarning = null;
    e.intangible = e.dragonGuarded = e.airborne = false; e.knightCombo = null;
    if (game.player && !(game.enemies || []).some(other => other !== e && alive(other) && other.airborne)) game.player.weaponMode = 'normal';
  }
  function addZone(game, e, kind, x, w, seconds, spec, options = {}) {
    // A repeated attack retires its oldest tell before adding a new one.
    if (game.dragonZones.length >= 48) game.dragonZones.shift();
    const z = {owner:e, kind, x:clamp(x, w / 2, W - w / 2), y:GROUND, w, h:GROUND,
      phase:'warning', timer:seconds, total:seconds, impactTime:.3, hitPlayer:false, spec, ...options};
    game.dragonZones.push(z); return z;
  }
  function castElement(game, e, element) {
    const x = clamp(game.player.x, 32, W - 32), owner = e;
    const tell = Math.max(.95, game.getPressure?.(e)?.warningFloor || .9);
    if (element === 'fire') {
      addZone(game, e, 'fire', x, e.boss ? 168 : 132, tell, {owner, kind:'dragon-fire', damage:0, burn:2}, {impactTime:.5});
      warning(e, 'RỒNG LỬA · NÉ LUỒNG LỬA', tell);
    } else if (element === 'ice') {
      // Four distinct cubes fall through the air, rather than appearing at the feet.
      for (const offset of [-144, -48, 48, 144]) addZone(game, e, 'ice', x + offset, 52, tell,
        {owner, kind:'dragon-ice', damage:1}, {h:52, fallDuration:.75, fallStartY:Math.max(25, (game.viewTop || 0) + 20), impactTime:.15});
      warning(e, 'RỒNG BĂNG · BỐN KHỐI BĂNG', tell);
    } else if (element === 'wind') {
      addZone(game, e, 'wind', x, 300, Math.max(1.15, tell),
        {owner, kind:'dragon-wind', damage:0, stun:2, knockup:-620}, {impactTime:.25});
      warning(e, 'RỒNG GIÓ · RỜI VÙNG GIÓ', Math.max(1.15, tell));
    } else if (element === 'earth') {
      for (const offset of [-112, 0, 112]) addZone(game, e, 'earth', x + offset, 88, Math.max(1.1, tell),
        {owner, kind:'dragon-earth', damage:1}, {h:100, impactTime:.32});
      warning(e, 'RỒNG ĐẤT · BA MẠCH DUNG NHAM', Math.max(1.1, tell));
    } else {
      // The bolt marks the dragon's current flight position, never a homing target.
      addZone(game, e, 'lightning', e.x, 100, tell, {owner, kind:'dragon-lightning', damage:1, stun:2}, {impactTime:.25});
      warning(e, 'RỒNG CHỚP · SÉT DƯỚI CÁNH', tell);
    }
    e.lastDragonSkill = element; e.dragonSkillCount = (e.dragonSkillCount || 0) + 1;
  }
  function beginReincarnation(game, e) {
    clearOwned(game, e); e.yinYangTriggered = true; e.dragonGuarded = true;
    e.health = Math.max(1, e.health); e.dragonState = 'laser-windup';
    const x = game.player.x < W / 2 ? W / 3 : W * 2 / 3;
    // The target is locked for 2.6 seconds: even the far edge has a reachable exit.
    e.yinYangZone = addZone(game, e, 'yin-yang', x, W * 2 / 3, 2.6,
      {owner:e, kind:'yin-yang-reincarnation', damage:3, pierceShield:1, forceHit:true}, {impactTime:.55});
    warning(e, 'ÂM DƯƠNG LUÂN HỒI · RỜI VÙNG SÁNG', 2.6);
    game.sound?.play('roar'); game.burst?.(e.x, e.y - e.h / 2, '#eee8dc', 20, 'ring');
  }
  function becomeKnight(game, e) {
    clearOwned(game, e); e.knightTriggered = true; e.dragonForm = 'knight';
    e.dragonState = 'knight-rise'; e.dragonGuarded = true; e.intangible = true;
    e.health = e.maxHealth; e.w = 38; e.h = 54;
    e.knightStartX = e.x; e.knightStartY = e.y; e.knightLandX = clamp(e.x, 45, W - 45);
    e.dragonTimer = 1.2; e.dragonProgress = 0; e.knightClock = 0; e.knightHits = 0;
    e.nextSpearAt = 3; e.nextSonicAt = 6; e.knightCombo = null;
    warning(e, 'KỊ SĨ RỒNG · THÁNH THƯƠNG THỨC TỈNH', 1.2);
    game.burst?.(e.x, e.y - e.h / 2, '#f5e7bd', 26, 'ring');
    if (game.player) { game.player.weaponMode = 'normal'; game.player.shotTimer = 0; }
    game.updateUI?.();
  }
  function rewardKnightHit(game, e) {
    e.knightHits++;
    const earned = e.knightHits % 10 === 0 ? 1 : 0;
    if (earned && game.shieldCount < (MM.ResurrectionRewards?.shieldCap(game)||3)) {
      game.shieldCount = Math.min(MM.ResurrectionRewards?.shieldCap(game)||3, game.shieldCount + earned);
      game.floating?.(game.player.x, game.player.y - game.player.h - 15, '+1 KHIÊN · THÁNH THƯƠNG', '#b7e7d4');
      game.sound?.play('shield'); game.updateUI?.();
    }
  }
  function hit(game, e, damage = 1, attack = {}) {
    if (!isDragon(e)) return null;
    if (game.screen !== 'playing' || !alive(e) || e.intangible || e.dragonGuarded) return false;
    if (!e.dragonState) setup(game, e);
    const amount = Number.isFinite(damage) ? Math.max(1, Math.trunc(damage)) : 1;
    if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(e,damage,attack);
    else e.health = Math.max(0, e.health - amount);
    if (e.boss && e.dragonForm === 'dragon') {
      if (!e.yinYangTriggered && e.health <= e.maxHealth / 2) beginReincarnation(game, e);
      else if (e.health <= 0) becomeKnight(game, e);
    } else if (e.boss && e.dragonForm === 'knight' && !attack.melee) rewardKnightHit(game, e);
    return true;
  }
  function apply(game, source) {
    const spec = {x:source.x, ...source.spec};
    if (typeof game.applyCombatEffect === 'function') return game.applyCombatEffect(spec);
    // A small compatibility path also keeps the module usable in previews.
    const p = game.player, shielded = p.shieldTime > 0 && p.shieldHits > 0;
    if (shielded) {
      game.hurt?.({...spec, damage:Math.max(1, spec.damage || 0)});
      if (spec.pierceShield) { p.health = Math.max(0, p.health - spec.pierceShield); game.updateUI?.(); }
      return !!spec.pierceShield;
    }
    if (spec.damage > 0) game.hurt?.(spec);
    if (spec.stun) p.stunTime = Math.max(p.stunTime || 0, spec.stun);
    if (spec.burn) { p.burnTime = spec.burn; p.burnTimer = 1; }
    if (spec.knockup) { p.vy = spec.knockup; p.grounded = false; }
    return true;
  }
  function updateZones(game, dt) {
    for (const z of game.dragonZones) {
      if (!alive(z.owner)) { z.timer = 0; continue; }
      // Released ice keeps falling; a frozen caster cannot advance a pending
      // cast or continue a beam, gust, or ground eruption.
      if ((z.owner.petrifiedTime || 0) > EPS && !(z.kind === 'ice' && z.phase === 'falling')) continue;
      z.timer -= dt;
      if (z.phase === 'warning' && z.timer <= EPS) {
        if (z.kind === 'ice') {
          z.phase = 'falling'; z.timer += z.fallDuration; z.total = z.fallDuration; z.y = z.fallStartY;
        } else {
          z.phase = 'impact'; z.timer += z.impactTime; z.total = z.impactTime;
          game.burst?.(z.x, GROUND - 8, z.kind === 'earth' ? '#ff9864' : z.kind === 'lightning' ? '#e6dbff' : '#e9eadb', 10, 'ring');
          if (z.kind === 'yin-yang') z.owner.dragonState = 'laser';
        }
      }
      if (z.phase === 'falling') {
        z.y = z.fallStartY + (GROUND - z.fallStartY) * clamp(1 - z.timer / z.fallDuration, 0, 1);
        if (z.timer <= EPS) { z.phase = 'impact'; z.y = GROUND; z.timer += z.impactTime; z.total = z.impactTime; }
      }
      if ((z.phase === 'impact' || z.phase === 'falling') && !z.hitPlayer && touch(game.player, z)) {
        z.hitPlayer = true; apply(game, z);
      }
      if (game.screen !== 'playing') break;
    }
    for (const z of game.dragonZones) if (z.kind === 'yin-yang' && z.phase === 'impact' && z.timer <= EPS) {
      const e = z.owner; e.dragonGuarded = false; e.dragonState = 'air'; e.yinYangZone = null; warning(e, null);
      e.nextDragonSkillAt = e.dragonClock + skillInterval(e);
    }
    game.dragonZones = game.dragonZones.filter(z => z.timer > EPS && alive(z.owner));
  }
  function beginSpear(game, e, at) {
    const targetX = clamp(game.player.x, 36, W - 36), dir = Math.sign(targetX - e.x) || e.dir || 1;
    e.dir = dir;
    e.knightCombo = {at, elapsed:0, targetX, startX:e.x, endX:clamp(targetX - dir * 46, 32, W - 32), firstAt:.9, hitIndex:0};
    e.spearZone = addZone(game, e, 'spear', targetX, 158, .9,
      {owner:e, kind:'dragon-spear', damage:1, forceHit:true}, {h:74, combo:true});
    warning(e, 'THÁNH THƯƠNG · LIÊN KÍCH', .9);
  }
  function sonic(game, e) {
    const originY = e.y - e.h * .62, targetY = game.player.y - game.player.h * .55;
    const angle = Math.atan2(targetY - originY, game.player.x - e.x);
    const speed = 300;
    const older = game.dragonShots.filter(s => s.owner === e);
    for (const shot of older.slice(0, Math.max(0, older.length + 5 - 20))) shot.life = 0;
    for (const offset of [-.16, -.08, 0, .08, .16]) game.dragonShots.push({owner:e, kind:'sonic', x:e.x, y:originY,
      w:26, h:18, vx:Math.cos(angle + offset) * speed, vy:Math.sin(angle + offset) * speed,
      life:4, spec:{owner:e, kind:'dragon-sonic', damage:1}, hitPlayer:false});
    e.sonicVolleys = (e.sonicVolleys || 0) + 1; game.sound?.play('roar');
  }
  function updateKnight(game, e, dt) {
    if (e.dragonState === 'knight-rise') {
      e.dragonTimer = Math.max(0, e.dragonTimer - dt); e.dragonProgress = 1 - e.dragonTimer / 1.2;
      e.x = e.knightStartX + (e.knightLandX - e.knightStartX) * e.dragonProgress;
      e.y = e.knightStartY + (GROUND - e.knightStartY) * e.dragonProgress * e.dragonProgress;
      if (e.dragonWarning) e.dragonWarning.remaining = e.dragonTimer;
      if (e.dragonTimer <= EPS) {
        e.dragonState = 'knight'; e.dragonGuarded = e.intangible = e.airborne = false; e.y = GROUND; warning(e, null);
      }
      return;
    }
    e.knightClock += dt;
    if (e.knightClock + EPS >= e.nextSpearAt) { const at = e.nextSpearAt; e.nextSpearAt += 3; beginSpear(game, e, at); }
    if (e.knightClock + EPS >= e.nextSonicAt) { e.nextSonicAt += 6; sonic(game, e); }
    const c = e.knightCombo;
    if (!c) {
      const d = game.player.x - e.x; e.dir = Math.sign(d) || e.dir;
      if (Math.abs(d) > 150) e.x = clamp(e.x + e.dir * Math.min(Math.abs(d) - 150, 66 * dt), 32, W - 32);
      return;
    }
    c.elapsed = e.knightClock - c.at; e.spearProgress = clamp((c.elapsed - .55) / .35, 0, 1);
    if (c.elapsed >= .55) e.x = c.startX + (c.endX - c.startX) * e.spearProgress;
    const z = e.spearZone;
    if (e.dragonWarning) e.dragonWarning.remaining = Math.max(0, .9 - c.elapsed);
    // Three individually announced thrusts stay on the original aim point.
    const index = c.elapsed >= 1.34 - EPS ? 3 : c.elapsed >= 1.12 - EPS ? 2 : c.elapsed >= .9 - EPS ? 1 : 0;
    if (index > c.hitIndex) {
      c.hitIndex = index; z.phase = 'impact'; z.hitPlayer = false; z.timer = .13; z.total = .13;
      if (touch(game.player, z)) { z.hitPlayer = true; apply(game, z); }
      game.burst?.(z.x, GROUND - 30, '#eee4c4', 8);
    }
    if (c.elapsed >= 1.5 - EPS) {
      game.dragonZones = game.dragonZones.filter(area => area !== z); e.spearZone = null; e.knightCombo = null; warning(e, null);
    }
  }
  function updateAir(game, e, dt) {
    e.dragonClock += dt; e.wingTime += dt;
    const margin = Math.max(60, e.w / 2 + 18);
    if (!e.dragonGuarded) {
      const speed = Number.isFinite(e.speed) ? Math.max(0, e.speed) : e.boss ? 34 : 50;
      e.x += e.dragonPatrolDir * speed * dt;
      if (e.x <= margin || e.x >= W - margin) { e.x = clamp(e.x, margin, W - margin); e.dragonPatrolDir *= -1; }
      e.dir = Math.sign(game.player.x - e.x) || e.dir;
      e.y = Math.max((game.viewTop || 0) + e.h + 20, e.dragonHomeY + Math.sin(e.wingTime * 1.8) * 24);
    }
    if (e.dragonWarning) {
      e.dragonWarning.remaining = Math.max(0, e.dragonWarning.remaining - dt);
      if (e.dragonWarning.remaining <= EPS && !e.dragonGuarded) warning(e, null);
    }
    if (!e.dragonGuarded && e.dragonClock + EPS >= e.nextDragonSkillAt) {
      e.nextDragonSkillAt += skillInterval(e);
      const element = e.boss ? ELEMENTS[Math.min(4, Math.floor((game.random?.() ?? Math.random()) * 5))] : e.variant;
      castElement(game, e, ELEMENTS.includes(element) ? element : 'fire');
    }
  }
  function updateShots(game, dt) {
    for (const s of game.dragonShots) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life > 0 && !s.hitPlayer && touch(game.player, s)) { s.hitPlayer = true; apply(game, s); s.life = 0; }
      if (game.screen !== 'playing') break;
    }
    game.dragonShots = game.dragonShots.filter(s => s.life > 0 && alive(s.owner) && s.x > -40 && s.x < W + 40 && s.y > -40 && s.y < 570);
  }
  function update(game, dt) {
    if (game.screen !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    game.dragonZones = game.dragonZones || []; game.dragonShots = game.dragonShots || [];
    for (const e of [...game.enemies]) {
      if (!alive(e) || !isDragon(e) || e.phase !== 'active' || (e.petrifiedTime || 0) > EPS) continue;
      if (!e.dragonState) setup(game, e);
      if (e.dragonForm === 'knight') updateKnight(game, e, dt); else updateAir(game, e, dt);
      if (game.screen !== 'playing') return;
    }
    // Combo zones have their own absolute timeline; they must not expire as generic tells.
    const combos = game.dragonZones.filter(z => z.combo);
    game.dragonZones = game.dragonZones.filter(z => !z.combo);
    updateZones(game, dt);
    game.dragonZones.push(...combos.filter(z => alive(z.owner) && z.owner.knightCombo));
    updateShots(game, dt);
  }
  MM.DragonCombat = {setup, update, hit, cleanup};
})(typeof window !== 'undefined' ? window : globalThis);
