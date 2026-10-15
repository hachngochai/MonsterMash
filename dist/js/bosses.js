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
      enemy.hardenedTime = 0;
      enemy.zombieClock = 0;
      enemy.nextWardAt = 15;
      enemy.wardHealFlash = 0;
      enemy.nextTsunamiAt = 10;
      enemy.nextGluttonAt = 8;
      enemy.tsunamiSerial = 0;
      enemy.tsunamiWaves = [];
      enemy.tsunamiWarning = null;
      enemy.gluttonState = null;
      enemy.gluttonHealFlash = 0;
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
    if (enemy.skillLevel === 30) {
      for (const child of game.enemies) if (child.spiderling && child.ownerBoss === enemy) {
        child.dead = true; child.health = 0;
      }
      game.enemies = game.enemies.filter(child => !child.spiderling || child.ownerBoss !== enemy);
    }
    if (enemy.skillLevel === 20) {
      for (const child of game.enemies) if (child.tsunamiChild && child.ownerBoss === enemy) {
        child.dead = true; child.health = 0;
      }
      game.enemies = game.enemies.filter(child => !child.tsunamiChild || child.ownerBoss !== enemy);
      enemy.tsunamiWarning = null; enemy.tsunamiWaves = [];
      enemy.gluttonState = null; enemy.gluttonTarget = null; enemy.gluttonHealFlash = 0;
      enemy.hardenedTime = 0; enemy.wardHealFlash = 0;
      enemy.tell = false; enemy.charging = false;
    }
  }

  function hit(game, enemy) {
    if (enemy.intangible || enemy.spiderling) return false;
    if (!enemy.bulletArmor) return true;
    if (enemy.hardenedTime > EPSILON) {
      burst(game, enemy.x, enemy.y - enemy.h * .55, '#b3f5ad', 3);
      return false;
    }
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
    player.stunStyle = 'web';
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
    const spiderlings = game.enemies.filter(item => item.spiderling && alive(item)).length;
    // Reserve a complete brood for each egg, so every unbroken egg hatches five.
    if (eggs.length >= 2 || spiderlings + eggs.length * 5 + 5 > 15) return false;
    const targetX = clamp(game.player.x + (game.player.x < W / 2 ? 120 : -120), 55, W - 55);
    const y = Math.min(GROUND - 10, enemy.y - enemy.h * .45);
    const flightTime = Math.max(.15, (GROUND - y) / 180);
    game.bossEggs.push({owner:enemy, x:enemy.x, y, w:28, h:32, vx:(targetX - enemy.x) / flightTime,
      vy:180, targetX, landed:false, health:2, maxHealth:2, hatchTime:3, age:0, hit:0});
    burst(game, enemy.x, y, '#d9dda8', 6);
    return true;
  }

  function hatch(game, egg) {
    for (const offset of [-44, -22, 0, 22, 44]) {
      const minion = game.spawn('spider', offset < 0 ? -1 : 1);
      Object.assign(minion, {x:clamp(egg.x + offset, 26, W - 26), y:GROUND, w:23, h:18, baseW:23, baseH:18,
        health:1, maxHealth:1, score:0, minion:true, spiderling:true, bulletUntargetable:true, ownerBoss:egg.owner,
        damage:1, stun:1.5, phase:'active', warning:0, abilityState:'ground',
        abilityTimer:Infinity, ambush:false, dropping:false, tell:false, charging:false, isBat:false});
      minion.speed *= .8;
    }
    burst(game, egg.x, GROUND - 10, '#d9dda8', 16);
    egg.health = 0;
  }

  function spiderlingHit(game, enemy) {
    const p = game.player;
    if (!enemy.spiderling || enemy.phase !== 'active' || !alive(enemy) || !alive(enemy.ownerBoss) || game.screen !== 'playing') return false;
    // Preserve one full stun and a short recovery, instead of extending it every
    // frame when several invulnerable spiderlings overlap the player.
    if (p.invulnerable > 0 || p.stunTime > 0 || p.stunGrace > 0) return false;
    const shielded = p.shieldTime > 0 && p.shieldHits > 0, health = p.health;
    game.hurt({x:enemy.x, owner:enemy, kind:'spiderling', damage:1, stun:1.5});
    if (!shielded && p.health < health) game.floating?.(p.x, p.y - p.h - 12, 'NHỆN CON · CHOÁNG 1,5 GIÂY', '#ead6a3');
    return true;
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

  function beginTsunami(game, enemy) {
    const direction = enemy.tsunamiWarning?.direction || (game.random() < .5 ? 1 : -1);
    const wave = {id:++enemy.tsunamiSerial, direction, shieldBlocked:false, damageTaken:false};
    // Retire only old summons, without awarding kills, score, or healing drops.
    const previous = game.enemies.filter(child => child.tsunamiChild && child.ownerBoss === enemy && alive(child));
    for (const child of previous.slice(0, Math.max(0, previous.length + 20 - 40))) {
      child.dead = true; child.health = 0;
    }
    game.enemies = game.enemies.filter(child => !child.dead);
    enemy.tsunamiWaves.push(wave);
    for (let index = 0; index < 20; index++) {
      const child = game.spawn('greenZombie', direction === 1 ? -1 : 1);
      Object.assign(child, {x:direction === 1 ? -18 : W + 18, y:GROUND, w:24, h:38, baseW:24, baseH:38,
        health:1, maxHealth:1, score:35, damage:1, speed:460, minion:true, tsunamiChild:true,
        ownerBoss:enemy, tsunamiDirection:direction, tsunamiWaveId:wave.id, tsunamiWave:wave,
        tsunamiDelay:index * .12, phase:index ? 'warning' : 'active', warning:index * .12,
        abilityState:'ground', abilityTimer:Infinity, ambush:true, dropping:false, tell:false, charging:false,
        platform:null, dir:direction, attackResolved:false});
    }
    enemy.tsunamiWarning = null;
    burst(game, direction === 1 ? 8 : W - 8, GROUND - 22, '#8edf78', 22, 'ring');
    game.floating?.(enemy.x, enemy.y - enemy.h - 14, 'TSUNAMI · 20 THÂY MA CON', '#b3f5ad');
  }

  function updateTsunamiChildren(game, dt) {
    for (const child of game.enemies) {
      if (!child.tsunamiChild || !alive(child)) continue;
      if (!alive(child.ownerBoss)) { child.dead = true; child.health = 0; continue; }
      let travel = dt;
      if (child.tsunamiDelay > EPSILON) {
        const delay = Math.min(child.tsunamiDelay, dt);
        child.tsunamiDelay -= delay; child.warning = child.tsunamiDelay;
        travel -= delay;
        if (child.tsunamiDelay > EPSILON) continue;
      }
      child.phase = 'active'; child.dir = child.tsunamiDirection;
      child.x += child.tsunamiDirection * child.speed * travel;
      child.y = GROUND;
      if (!child.attackResolved && contact({...game.player, w:game.player.w * .75, h:game.player.h * .86}, child)) {
        const wave = child.tsunamiWave;
        if (wave.shieldBlocked) child.attackResolved = true;
        else if (game.player.shieldTime > 0 && game.player.shieldHits > 0) {
          // One shield hit absorbs this entire ordered wave, rather than its
          // twenty bodies consuming all three hits before the train passes.
          wave.shieldBlocked = true; child.attackResolved = true;
          game.hurt({x:child.x, damage:1, forceHit:true, tsunamiStrike:true});
          game.floating?.(game.player.x, game.player.y - game.player.h - 14, 'KHIÊN CHẶN TSUNAMI', '#91e3d1');
        } else if (!(game.player.invulnerable > 0)) {
          child.attackResolved = true;
          const health = game.player.health;
          game.hurt({x:child.x, damage:1, tsunamiStrike:true});
          if (game.player.health < health) wave.damageTaken = true;
        }
        if (game.screen !== 'playing') break;
      }
      if (child.x < -40 || child.x > W + 40) { child.dead = true; child.health = 0; }
    }
    game.enemies = game.enemies.filter(child => !child.tsunamiChild || alive(child));
    for (const enemy of game.enemies) if (enemy.boss && enemy.skillLevel === 20 && enemy.tsunamiWaves) {
      enemy.tsunamiWaves = enemy.tsunamiWaves.filter(wave => game.enemies.some(child => child.tsunamiChild && child.ownerBoss === enemy && child.tsunamiWaveId === wave.id));
    }
  }

  function beginGluttonWarning(game, enemy) {
    enemy.gluttonState = 'warning'; enemy.gluttonTotal = warnTime(game, enemy, 1);
    enemy.gluttonTimer = Math.max(0, enemy.nextGluttonAt - enemy.zombieClock);
    enemy.gluttonTarget = {x:game.player.x, y:game.player.y};
    enemy.gluttonJump = enemy.y < GROUND - 40 || game.player.y < GROUND - 40;
    enemy.tell = true; enemy.charging = true;
  }

  function beginGluttonChase(game, enemy) {
    enemy.gluttonState = 'chase'; enemy.gluttonTimer = enemy.gluttonTotal = 1;
    enemy.gluttonStart = {x:enemy.x, y:enemy.y};
    enemy.gluttonJump = enemy.y < GROUND - 40 || game.player.y < GROUND - 40;
    enemy.gluttonHit = false; enemy.gluttonElapsed = 0;
    enemy.platform = null; enemy.dropping = false; enemy.tell = false; enemy.charging = true;
    const healed = Math.min(5, Math.max(0, enemy.maxHealth - enemy.health));
    enemy.health += healed; enemy.gluttonHealFlash = .5;
    if (healed > 0) game.floating?.(enemy.x, enemy.y - enemy.h - 14, `PHÀM ĂN · +${healed} MÁU`, '#b3f5ad');
    burst(game, enemy.x, enemy.y - enemy.h * .5, '#b3f5ad', 14, 'ring');
  }

  function updateGlutton(game, enemy, dt) {
    if (!enemy.gluttonState) return;
    if (enemy.gluttonState === 'warning') {
      enemy.gluttonTimer = Math.max(0, enemy.nextGluttonAt - enemy.zombieClock);
      if (enemy.gluttonTimer > EPSILON) return;
      beginGluttonChase(game, enemy);
      // The one-second pursuit starts now; the warning frame is not consumed.
      return;
    }
    const travel = Math.min(dt, enemy.gluttonTimer);
    enemy.gluttonElapsed = Math.min(1, enemy.gluttonElapsed + travel);
    enemy.gluttonTimer = Math.max(0, 1 - enemy.gluttonElapsed);
    const player = game.player;
    enemy.gluttonTarget = {x:player.x, y:player.y};
    const distance = player.x - enemy.x;
    if (Math.abs(distance) > 2) enemy.dir = Math.sign(distance);
    enemy.x = clamp(enemy.x + Math.sign(distance) * Math.min(Math.abs(distance), 400 * travel), enemy.w / 2, W - enemy.w / 2);
    enemy.y = enemy.gluttonJump ? enemy.gluttonStart.y + (GROUND - enemy.gluttonStart.y) * enemy.gluttonElapsed - Math.sin(Math.PI * enemy.gluttonElapsed) * 100 : GROUND;
    if (!enemy.gluttonHit && contact({...player, w:player.w * .75, h:player.h * .86}, {...enemy, w:enemy.w * .8, h:enemy.h * .86})) {
      enemy.gluttonHit = true;
      game.hurt({x:enemy.x, damage:2, gluttonStrike:true});
    }
    if (enemy.gluttonTimer <= EPSILON) {
      enemy.gluttonState = null; enemy.gluttonTarget = null;
      enemy.y = GROUND; enemy.abilityState = 'ground'; enemy.abilityTimer = 4.5;
      enemy.platform = null; enemy.tell = false; enemy.charging = false; enemy.dropping = false;
      enemy.nextGluttonAt += 8;
    }
  }

  function updateGreenZombie(game, enemy, dt) {
    enemy.zombieClock += dt;
    enemy.gluttonHealFlash = Math.max(0, (enemy.gluttonHealFlash || 0) - dt);
    enemy.wardHealFlash = Math.max(0, (enemy.wardHealFlash || 0) - dt);
    if (enemy.zombieClock + EPSILON >= enemy.nextWardAt) {
      enemy.nextWardAt += 15;
      enemy.hardenedTime = 1; enemy.wardHealFlash = .5;
      const healed = Math.min(1, Math.max(0, enemy.maxHealth - enemy.health));
      enemy.health += healed;
      burst(game, enemy.x, enemy.y - enemy.h * .5, '#b3f5ad', 18, 'ring');
      game.floating?.(enemy.x, enemy.y - enemy.h - 15, `KHIÊN 1 GIÂY${healed ? ` · +${healed} MÁU` : ''}`, '#b3f5ad');
    }
    const untilWave = enemy.nextTsunamiAt - enemy.zombieClock;
    if (untilWave <= EPSILON) {
      beginTsunami(game, enemy); enemy.nextTsunamiAt += 10;
    } else if (untilWave <= warnTime(game, enemy, .9)) {
      if (!enemy.tsunamiWarning) enemy.tsunamiDirection = game.random() < .5 ? 1 : -1;
      enemy.tsunamiWarning = {name:'TSUNAMI · 20 THÂY MA CON', remaining:untilWave, total:warnTime(game, enemy, .9), direction:enemy.tsunamiDirection};
    }
    if (!enemy.gluttonState && enemy.nextGluttonAt - enemy.zombieClock <= warnTime(game, enemy, 1)) beginGluttonWarning(game, enemy);
    updateGlutton(game, enemy, dt);
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
    if (enemy.gluttonState) {
      enemy.skillWarning = {name:enemy.gluttonState === 'warning' ? 'PHÀM ĂN · +5 MÁU / 2 SÁT THƯƠNG' : 'PHÀM ĂN · TRUY ĐUỔI', remaining:Math.max(0, enemy.gluttonTimer), total:enemy.gluttonTotal};
    } else if (enemy.tsunamiWarning) {
      enemy.skillWarning = enemy.tsunamiWarning;
    } else if (enemy.drainWarning) {
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
    updateTsunamiChildren(game, dt);
    if (game.screen !== 'playing') return;
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
        case 20:
          updateGreenZombie(game, enemy, dt);
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

  MM.BossCombat = {setup, update, hit, hitEgg, webHit, spiderlingHit, cleanup};
})(typeof window !== 'undefined' ? window : globalThis);
