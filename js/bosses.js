/* Campaign boss skills. Timed warnings and defensive windows use real game seconds. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPSILON = 1e-8;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const contact = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y > b.y - b.h && a.y - a.h < b.y;
  const alive = enemy => enemy && !enemy.dead && enemy.health > 0;
  const pressure = (game, enemy) => game.getPressure?.(enemy) || {attackRate:1, projectileRate:1, warningFloor:.9};
  const warnTime = (game, enemy, seconds) => Math.max(pressure(game, enemy).warningFloor || .9, seconds);
  const burst = (game, x, y, color, count, type) => game.burst?.(x, y, color, count, type);

  function setup(game, enemy) {
    if (!enemy.boss) return;
    enemy.skillLevel = game.level.id;
    enemy.skillWarning = null;
    enemy.pendingSkill = null;
    enemy.skillTimers = {bones:5.5, web:3.6, egg:5, phantom:5};
    enemy.drainLastBat = false;
    enemy.drainWarning = null;
    enemy.drainFlash = 0;
    if (enemy.skillLevel === 20) {
      enemy.bulletArmor = true;
      enemy.armorHits = 0;
      enemy.hardenedTime = 0;
    }
  }

  function cleanup(game, enemy) {
    const keep = object => object.owner !== enemy;
    game.bossHazards = (game.bossHazards || []).filter(keep);
    game.bossEggs = (game.bossEggs || []).filter(keep);
    game.enemyShots = (game.enemyShots || []).filter(keep);
    enemy.skillWarning = null;
    enemy.pendingSkill = null;
    enemy.drainWarning = null;
    enemy.drainFlash = 0;
    enemy.intangible = false;
    enemy.phantomState = null;
  }

  function hit(game, enemy) {
    if (enemy.intangible) return false;
    if (!enemy.bulletArmor) return true;
    if (enemy.hardenedTime > EPSILON) {
      burst(game, enemy.x, enemy.y - enemy.h * .55, '#b3f5ad', 3);
      return false;
    }
    enemy.armorHits = (enemy.armorHits || 0) + 1;
    if (enemy.armorHits === 10) {
      enemy.armorHits = 0;
      enemy.hardenedTime = 2;
      burst(game, enemy.x, enemy.y - enemy.h * .5, '#b3f5ad', 18, 'ring');
      game.floating?.(enemy.x, enemy.y - enemy.h - 15, 'CƯỜNG HÓA · 2 GIÂY', '#b3f5ad');
    }
    // The tenth successful bullet still deals damage; subsequent bullets are blocked.
    return true;
  }

  function webHit(game, shot) {
    const player = game.player;
    if (game.screen !== 'playing' || player.invulnerable > 0) return false;
    if (player.shieldTime > 0 && player.shieldHits > 0) {
      player.shieldHits--;
      player.invulnerable = .45;
      if (!player.shieldHits) player.shieldTime = 0;
      burst(game, player.x, player.y - 28, '#91e3d1', 10, 'ring');
      game.sound?.play('shield');
      game.updateUI?.();
      return true;
    }
    if (player.stunTime > 0 || player.stunGrace > 0) return false;
    player.stunTime = 2;
    player.vx = 0;
    game.clearInputs?.();
    burst(game, player.x, player.y - 25, '#e4e2c1', 12, 'ring');
    game.floating?.(player.x, player.y - player.h - 12, 'DÍNH TƠ · 2 GIÂY', '#e4e2c1');
    return true;
  }

  function hitEgg(game, bullet, previousX, maxDistance = Infinity) {
    const eggs = (game.bossEggs || []).filter(egg => egg.health > 0 &&
      bullet.y >= egg.y - egg.h - 3 && bullet.y <= egg.y + 3 &&
      Math.max(previousX, bullet.x) >= egg.x - egg.w / 2 &&
      Math.min(previousX, bullet.x) <= egg.x + egg.w / 2)
      .sort((a, b) => Math.abs(a.x - previousX) - Math.abs(b.x - previousX));
    if (!eggs.length || Math.abs(eggs[0].x - previousX) > maxDistance) return false;
    const egg = eggs[0];
    egg.health--;
    egg.hit = .15;
    burst(game, egg.x, bullet.y, '#ddd7a9', egg.health ? 5 : 12);
    if (egg.health <= 0) game.bossEggs = game.bossEggs.filter(item => item !== egg);
    return true;
  }

  function floorAttack(game, enemy, kind) {
    if ((game.bossHazards || []).some(hazard => hazard.owner === enemy)) return;
    const x = clamp(game.player.x, 70, W - 70);
    const warning = warnTime(game, enemy, kind === 'bones' ? 1.2 : 1.4);
    const positions = kind === 'bones' ? [-132, 0, 132].map(offset => clamp(x + offset, 50, W - 50))
      : [x, clamp(x + (x < W / 2 ? 220 : -220), 70, W - 70)];
    for (const lane of positions) game.bossHazards.push({
      owner:enemy, kind, x:lane, y:GROUND, w:kind === 'bones' ? 38 : 64,
      h:kind === 'bones' ? 58 : 180, phase:'warning', timer:warning, warning,
      totalActive:kind === 'bones' ? .65 : .7, life:warning + (kind === 'bones' ? .65 : .7), pulse:0
    });
  }

  function prepareProjectile(game, enemy, kind) {
    if (enemy.pendingSkill) return;
    const total = warnTime(game, enemy, kind === 'web' ? 1.2 : 1.15);
    enemy.pendingSkill = {kind, remaining:total, total, targetX:game.player.x, targetY:game.player.y - game.player.h / 2};
  }

  function releaseProjectile(game, enemy, pending) {
    const x = enemy.x, y = enemy.y - enemy.h * .5;
    const angle = Math.atan2(pending.targetY - y, pending.targetX - x);
    const web = pending.kind === 'web';
    const speed = (web ? 200 : pending.kind === 'blood' ? 205 : 190) * pressure(game, enemy).projectileRate;
    for (const spread of web ? [0] : [-.22, 0, .22]) {
      if (game.enemyShots.length >= 12) break;
      game.enemyShots.push({owner:enemy, kind:pending.kind, x, y, vx:Math.cos(angle + spread) * speed,
        vy:Math.sin(angle + spread) * speed, w:web ? 30 : 17, h:web ? 24 : 17, life:web ? 5.3 : 4.8});
    }
    burst(game, x, y, web ? '#e4e2c1' : pending.kind === 'blood' ? '#e98994' : '#a9cce9', 8);
  }

  function layEgg(game, enemy) {
    const eggs = game.bossEggs.filter(egg => egg.health > 0);
    const spiderlings = game.enemies.filter(item => item.minion && alive(item)).length;
    // Reserve a complete brood for each egg, so every unbroken egg hatches five.
    if (eggs.length >= 2 || spiderlings + eggs.length * 5 + 5 > 15) return false;
    const targetX = clamp(game.player.x + (game.player.x < W / 2 ? 120 : -120), 55, W - 55);
    const y = Math.min(GROUND - 10, enemy.y - enemy.h * .45);
    const flightTime = Math.max(.15, (GROUND - y) / 180);
    game.bossEggs.push({owner:enemy, x:enemy.x, y, w:28, h:32, vx:(targetX - enemy.x) / flightTime,
      vy:180, targetX, landed:false, health:2, maxHealth:2, hatchTime:5, age:0, hit:0});
    burst(game, enemy.x, y, '#d9dda8', 6);
    return true;
  }

  function hatch(game, egg) {
    for (const offset of [-44, -22, 0, 22, 44]) {
      const minion = game.spawn('spider', offset < 0 ? -1 : 1);
      Object.assign(minion, {x:clamp(egg.x + offset, 26, W - 26), y:GROUND, w:23, h:18, baseW:23, baseH:18,
        health:1, maxHealth:1, score:50, minion:true, phase:'active', warning:0, abilityState:'ground',
        abilityTimer:Infinity, ambush:false, dropping:false, tell:false, charging:false, isBat:false});
      minion.speed *= .8;
    }
    burst(game, egg.x, GROUND - 10, '#d9dda8', 16);
    egg.health = 0;
  }

  function updateEggs(game, dt) {
    for (const egg of game.bossEggs) {
      if (!alive(egg.owner) || egg.health <= 0) continue;
      egg.age += dt;
      egg.hit = Math.max(0, (egg.hit || 0) - dt);
      if (!egg.landed) {
        const untilLanding = Math.max(0, (GROUND - egg.y) / egg.vy);
        const flight = Math.min(dt, untilLanding);
        egg.x += egg.vx * flight;
        egg.y += egg.vy * flight;
        if (untilLanding <= dt + EPSILON) {
          egg.x = egg.targetX; egg.y = GROUND; egg.landed = true; egg.vx = 0;
          egg.hatchTime -= Math.max(0, dt - untilLanding);
          burst(game, egg.x, GROUND, '#d9dda8', 5);
        }
      } else egg.hatchTime -= dt;
      if (egg.landed && egg.hatchTime <= EPSILON) hatch(game, egg);
    }
    game.bossEggs = game.bossEggs.filter(egg => alive(egg.owner) && egg.health > 0);
  }

  function updateHazards(game, dt) {
    for (const hazard of game.bossHazards) {
      if (!alive(hazard.owner)) continue;
      hazard.timer -= dt; hazard.life -= dt; hazard.pulse += dt;
      if (hazard.phase === 'warning' && hazard.timer <= EPSILON) {
        hazard.phase = 'active';
        hazard.timer += hazard.totalActive;
        burst(game, hazard.x, GROUND - 10, hazard.kind === 'bones' ? '#dfd5b0' : '#c3a7ee', 10);
      }
      if (hazard.phase === 'active' && hazard.timer > 0 && contact({...game.player, w:game.player.w * .75, h:game.player.h * .86}, hazard)) {
        // hurt may move its attacker after a shield block; the locked lane stays fixed.
        game.hurt({x:hazard.x, kind:hazard.kind});
        if (game.screen !== 'playing') break;
      }
    }
    game.bossHazards = game.bossHazards.filter(hazard => alive(hazard.owner) && hazard.timer > EPSILON);
  }

  function beginPhantom(game, enemy) {
    enemy.phantomState = 'invisible'; enemy.intangible = true;
    enemy.tell = false; enemy.charging = false;
    enemy.phantomTimer = 1.5;
    enemy.phantomTotal = 1.5;
    enemy.phantomHit = false;
    burst(game, enemy.x, enemy.y - enemy.h / 2, '#c8e5e6', 14, 'ring');
  }

  function revealPhantom(game, enemy) {
    const choices = ['top', 'left', 'right'];
    enemy.attackSide = choices[clamp(Math.floor(game.random() * 3), 0, 2)];
    enemy.landX = clamp(game.player.x, 55, W - 55);
    enemy.phantomTarget = {x:enemy.landX, y:GROUND};
    const top = Math.min(GROUND - 100, Math.max(GROUND - 225, (game.viewTop || 0) + enemy.h + 20));
    enemy.phantomStart = enemy.attackSide === 'top' ? {x:enemy.landX, y:top}
      : {x:enemy.attackSide === 'left' ? enemy.w / 2 + 16 : W - enemy.w / 2 - 16, y:GROUND};
    enemy.phantomEnd = enemy.attackSide === 'top' ? {x:enemy.landX, y:GROUND}
      : {x:clamp(enemy.landX + (enemy.attackSide === 'left' ? 125 : -125), 26, W - 26), y:GROUND};
    enemy.x = enemy.phantomStart.x; enemy.y = enemy.phantomStart.y;
    enemy.intangible = false; enemy.phantomState = 'windup';
    enemy.phantomTimer = warnTime(game, enemy, 1.2); enemy.phantomTotal = enemy.phantomTimer;
    burst(game, enemy.x, enemy.y - enemy.h / 2, '#c8e5e6', 14, 'ring');
  }

  function updatePhantom(game, enemy, dt) {
    if (!enemy.phantomState) return;
    enemy.phantomTimer -= dt;
    if (enemy.phantomState === 'invisible' && enemy.phantomTimer <= EPSILON) {
      revealPhantom(game, enemy);
    } else if (enemy.phantomState === 'windup' && enemy.phantomTimer <= EPSILON) {
      enemy.phantomState = 'strike'; enemy.phantomTimer = .55; enemy.phantomTotal = .55;
    } else if (enemy.phantomState === 'strike') {
      const amount = clamp(1 - enemy.phantomTimer / .55, 0, 1);
      enemy.x = enemy.phantomStart.x + (enemy.phantomEnd.x - enemy.phantomStart.x) * amount;
      enemy.y = enemy.phantomStart.y + (enemy.phantomEnd.y - enemy.phantomStart.y) * amount;
      if (!enemy.phantomHit && contact({...game.player, w:game.player.w * .75, h:game.player.h * .86}, {...enemy, w:enemy.w * .7, h:enemy.h * .85})) {
        enemy.phantomHit = true;
        game.hurt({x:enemy.x, phantomStrike:true});
      }
      if (enemy.phantomTimer <= EPSILON) {
        enemy.phantomState = null; enemy.intangible = false; enemy.y = GROUND;
        enemy.abilityState = 'ground'; enemy.tell = false; enemy.charging = false;
        enemy.dropping = false; enemy.platform = null;
        enemy.abilityTimer = 4.5;
      }
    }
  }

  function setWarning(game, enemy) {
    if (enemy.drainWarning) {
      enemy.skillWarning = {name:'HÚT MÁU · DÙNG KHIÊN', remaining:Math.max(0, enemy.drainWarning.remaining), total:enemy.drainWarning.total};
    } else if (enemy.phantomState === 'invisible') {
      enemy.skillWarning = {name:'ẨN MÌNH', remaining:Math.max(0, enemy.phantomTimer), total:enemy.phantomTotal};
    } else if (enemy.phantomState === 'windup') {
      const side = {top:'TRÊN', left:'TRÁI', right:'PHẢI'}[enemy.attackSide];
      enemy.skillWarning = {name:'TẬP KÍCH TỪ ' + side, remaining:Math.max(0, enemy.phantomTimer), total:enemy.phantomTotal};
    } else if (enemy.pendingSkill) {
      const pending = enemy.pendingSkill;
      enemy.skillWarning = {name:pending.kind === 'web' ? 'NHẢ TƠ' : pending.kind === 'blood' ? 'HUYẾT CẦU' : 'HỒN MA', remaining:Math.max(0, pending.remaining), total:pending.total};
    } else {
      const hazard = game.bossHazards.find(item => item.owner === enemy && item.phase === 'warning');
      enemy.skillWarning = hazard ? {name:hazard.kind === 'bones' ? 'CỘT XƯƠNG' : 'NHẬT THỰC', remaining:Math.max(0, hazard.timer), total:hazard.warning} : null;
    }
  }

  function updateDracula(game, enemy, dt) {
    enemy.drainFlash = Math.max(0, (enemy.drainFlash || 0) - dt);
    if (enemy.drainWarning) {
      enemy.drainWarning.remaining -= dt;
      if (enemy.drainWarning.remaining <= EPSILON) {
        game.drainTarget(enemy);
        enemy.drainWarning = null; enemy.drainFlash = .35;
      }
    }
    if (enemy.isBat && !enemy.drainLastBat && game.screen === 'playing') {
      const total = warnTime(game, enemy, 1.2);
      enemy.drainWarning = {remaining:total, total};
    }
    enemy.drainLastBat = enemy.isBat === true;
    if (!enemy.splitTriggered && enemy.health <= enemy.maxHealth / 2 && game.screen === 'playing') {
      enemy.splitTriggered = true;
      enemy.healthCeiling = Math.floor(enemy.maxHealth / 2);
      const clone = game.spawn('boss', enemy.x < W / 2 ? 1 : -1);
      Object.assign(clone, {draculaClone:true, splitTriggered:true, health:Math.ceil(enemy.maxHealth / 2),
        maxHealth:Math.ceil(enemy.maxHealth / 2), healthCeiling:Math.ceil(enemy.maxHealth / 2),
        x:clamp(W - enemy.x, 60, W - 60), y:GROUND, phase:'warning', warning:Math.max(1.2, clone.warning), ambush:true,
        abilityState:'ground', abilityTimer:6, isBat:false, lastSkill:'shadow'});
      burst(game, enemy.x, enemy.y - enemy.h / 2, '#c1a6e5', 22, 'ring');
      burst(game, clone.x, clone.y - clone.h / 2, '#c1a6e5', 22, 'ring');
      game.floating?.(enemy.x, enemy.y - enemy.h - 15, 'DRACULA PHÂN THÂN', '#d8bee9');
    }
  }

  function update(game, dt) {
    if (game.screen !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    game.bossHazards = game.bossHazards || []; game.bossEggs = game.bossEggs || [];
    game.enemyShots = game.enemyShots || [];
    game.enemyShots = game.enemyShots.filter(shot => !shot.owner || alive(shot.owner));
    updateHazards(game, dt);
    if (game.screen !== 'playing') return;
    updateEggs(game, dt);
    for (const enemy of game.enemies.slice()) {
      if (!enemy.boss || !alive(enemy)) continue;
      if (!enemy.skillTimers) setup(game, enemy);
      if (enemy.phase !== 'active') continue;
      enemy.hardenedTime = Math.max(0, (enemy.hardenedTime || 0) - dt);
      if (enemy.pendingSkill) {
        enemy.pendingSkill.remaining -= dt;
        if (enemy.pendingSkill.remaining <= EPSILON) {
          releaseProjectile(game, enemy, enemy.pendingSkill); enemy.pendingSkill = null;
        }
      }
      const clocks = enemy.skillTimers, rate = pressure(game, enemy).attackRate;
      switch (enemy.skillLevel) {
        case 10:
          clocks.bones -= dt * rate;
          if (clocks.bones <= EPSILON) { floorAttack(game, enemy, 'bones'); clocks.bones = 7; }
          break;
        case 30:
          clocks.web -= dt * rate; clocks.egg -= dt;
          if (clocks.web <= EPSILON && !enemy.pendingSkill) { prepareProjectile(game, enemy, 'web'); clocks.web = 6.5; }
          if (clocks.egg <= EPSILON) clocks.egg = layEgg(game, enemy) ? 5 : .25;
          break;
        case 40:
          clocks.phantom -= dt;
          updatePhantom(game, enemy, dt);
          if (clocks.phantom <= EPSILON && !enemy.phantomState) { beginPhantom(game, enemy); clocks.phantom += 5; }
          break;
        case 50:
          updateDracula(game, enemy, dt);
          break;
      }
      setWarning(game, enemy);
      if (game.screen !== 'playing') break;
    }
    game.bossHazards = game.bossHazards.filter(hazard => alive(hazard.owner));
    game.bossEggs = game.bossEggs.filter(egg => alive(egg.owner) && egg.health > 0);
  }

  MM.BossCombat = {setup, update, hit, hitEgg, webHit, cleanup};
})(typeof window !== 'undefined' ? window : globalThis);
