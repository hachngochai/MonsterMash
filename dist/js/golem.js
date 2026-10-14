/* Golem club combat and the final chapter's five-second rage sequence. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPSILON = 1e-8;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const isGolem = enemy => (enemy.archetype || enemy.type) === 'golem';
  const alive = enemy => enemy && !enemy.dead && enemy.health > 0;
  const overlaps = (player, zone) => Math.abs(player.x - zone.x) < (player.w * .75 + zone.w) / 2 && player.y > zone.y - zone.h && player.y - player.h * .86 < zone.y;
  const pressure = (game, enemy) => game.getPressure?.(enemy) || {attackRate:1, moveRate:1, warningFloor:.9};
  const warning = (game, enemy, base) => Math.max(pressure(game, enemy).warningFloor || .9, base);

  function setup(game, enemy) {
    if (!isGolem(enemy)) return;
    game.golemZones = game.golemZones || []; game.groundCracks = game.groundCracks || [];
    enemy.golemState = 'approach'; enemy.golemTimer = 0;
    enemy.golemCooldown = enemy.boss ? 2.5 : 1.8;
    enemy.golemActiveTime = 0; enemy.nextRageAt = 10;
    enemy.rageTime = 0; enemy.rageEndsAt = 0; enemy.golemRaging = false;
    enemy.swingProgress = 0; enemy.comboIndex = 0;
    enemy.skillWarning = null; enemy.golemWarning = null; enemy.golemZone = null;
    enemy.y = GROUND;
  }

  function clearZones(game, enemy) {
    game.golemZones = (game.golemZones || []).filter(zone => zone.owner !== enemy);
    enemy.golemZone = null;
  }

  function cleanup(game, enemy) {
    if (!isGolem(enemy)) return;
    clearZones(game, enemy);
    game.groundCracks = (game.groundCracks || []).filter(crack => crack.owner !== enemy);
    enemy.skillWarning = null; enemy.golemWarning = null; enemy.rageTime = 0; enemy.swingProgress = 0; enemy.golemRaging = false;
    enemy.tell = false; enemy.charging = false;
  }

  function state(enemy, name, seconds = 0, label = null) {
    enemy.golemState = name; enemy.golemTimer = seconds; enemy.golemStateTotal = seconds;
    enemy.swingProgress = 0;
    enemy.tell = name === 'windup' || name === 'rage-windup' || name === 'combo-windup';
    enemy.charging = enemy.tell || name === 'charge';
    enemy.golemWarning = label ? {name:label, remaining:seconds, total:seconds} : null;
    enemy.skillWarning = enemy.golemWarning;
  }

  function zone(game, enemy, kind, x, w, h, seconds, damage, stun = 0, comboIndex = 0) {
    clearZones(game, enemy);
    const result = {owner:enemy, kind, x:clamp(x, 30, W - 30), y:GROUND, w, h,
      phase:'warning', timer:seconds, total:seconds, damage, stun, comboIndex, hitPlayer:false};
    game.golemZones.push(result); enemy.golemZone = result;
    return result;
  }

  function crack(game, enemy, attackZone) {
    if (game.groundCracks.length >= 30) game.groundCracks.shift();
    game.groundCracks.push({owner:enemy, x:attackZone.x, y:GROUND, w:attackZone.w,
      life:attackZone.kind === 'shock' ? 3.2 : 2.2, maxLife:attackZone.kind === 'shock' ? 3.2 : 2.2});
    game.burst?.(attackZone.x, GROUND - 5, enemy.rageTime > 0 ? '#f2b173' : '#c1a07b', 18);
    if (game.settings?.reducedMotion !== true) game.shake = Math.max(game.shake || 0, attackZone.kind === 'shock' ? 5 : 3);
  }

  function clubWarning(game, enemy) {
    const distance = game.player.x - enemy.x;
    if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
    const seconds = warning(game, enemy, enemy.boss ? 1.05 : .9);
    const x = enemy.x + enemy.dir * (enemy.w / 2 + (enemy.boss ? 58 : 44));
    zone(game, enemy, 'club', x, enemy.boss ? 175 : 145, 54, seconds, 1);
    state(enemy, 'windup', seconds, 'CHÙY GỖ GAI');
  }

  function impact(game, enemy, nextState, duration) {
    const attackZone = enemy.golemZone;
    state(enemy, nextState, duration);
    if (attackZone) {
      attackZone.phase = 'impact'; attackZone.timer = duration; attackZone.hitPlayer = false;
      if (attackZone.kind !== 'club') crack(game, enemy, attackZone);
      else game.burst?.(attackZone.x, GROUND - 18, '#c1a07b', 8);
    }
  }

  function beginRage(game, enemy) {
    enemy.rageTime = 5; enemy.rageEndsAt = enemy.golemActiveTime + 5;
    enemy.golemRaging = true;
    enemy.comboIndex = 0;
    const seconds = warning(game, enemy, 1.2);
    zone(game, enemy, 'shock', enemy.x, 360, 38, seconds, 1, 1);
    state(enemy, 'rage-windup', seconds, 'CUỒNG NỘ · CHẤN ĐỘNG');
    game.burst?.(enemy.x, enemy.y - enemy.h / 2, '#efb068', 20, 'ring');
  }

  function beginCharge(game, enemy) {
    clearZones(game, enemy);
    enemy.chargeStartX = enemy.x;
    enemy.chargeTargetX = clamp(game.player.x, 55, W - 55);
    const distance = enemy.chargeTargetX - enemy.x;
    if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
    enemy.chargeEndX = clamp(enemy.chargeTargetX - enemy.dir * (enemy.w / 2 + 45), 45, W - 45);
    state(enemy, 'charge', .38);
  }

  function comboWarning(game, enemy, first) {
    enemy.comboIndex = first ? 1 : enemy.comboIndex + 1;
    // The entire repeated, fixed-position combo is announced before its first hit.
    // Later gaps retain that target, giving players a single clear escape direction.
    const seconds = first ? warning(game, enemy, .9) : .52;
    zone(game, enemy, 'slam', enemy.chargeTargetX, 210, 60, seconds, 3, 0, enemy.comboIndex);
    state(enemy, 'combo-windup', seconds, `TAM LIÊN ĐẬP · ${enemy.comboIndex}/3 · 3 MÁU`);
  }

  function updateEntity(game, enemy, dt) {
    if (!enemy.golemState) setup(game, enemy);
    enemy.golemActiveTime += dt;
    enemy.y = GROUND;
    if (enemy.boss && enemy.golemActiveTime + EPSILON >= enemy.nextRageAt) {
      enemy.nextRageAt += 10;
      beginRage(game, enemy);
      return;
    }
    enemy.rageTime = Math.max(0, enemy.rageEndsAt - enemy.golemActiveTime);
    if (enemy.rageTime <= EPSILON) enemy.rageTime = 0;
    if (enemy.golemRaging && enemy.rageTime <= EPSILON) {
      enemy.golemRaging = false;
      clearZones(game, enemy); state(enemy, 'approach'); enemy.golemCooldown = 2.3;
    }
    const current = enemy.golemState;
    if (current === 'approach') {
      const movement = pressure(game, enemy);
      const distance = game.player.x - enemy.x;
      if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
      const standOff = enemy.w / 2 + (enemy.boss ? 78 : 65);
      if (Math.abs(distance) > standOff) {
        const step = Math.min(Math.abs(distance) - standOff, enemy.speed * (movement.moveRate || 1) * dt);
        enemy.x = clamp(enemy.x + Math.sign(distance) * step, 26, W - 26);
      }
      enemy.golemCooldown = Math.max(0, enemy.golemCooldown - dt * (movement.attackRate || 1));
      if (enemy.golemCooldown <= EPSILON && Math.abs(game.player.x - enemy.x) <= standOff + 35) clubWarning(game, enemy);
    } else if (current === 'recover' && enemy.rageTime > 0) {
      // The final rage strike has landed; the remaining rage time is a safe recovery.
    } else {
      enemy.golemTimer = Math.max(0, enemy.golemTimer - dt);
      if (enemy.golemZone) enemy.golemZone.timer = enemy.golemTimer;
      if (enemy.golemWarning) enemy.golemWarning.remaining = enemy.golemTimer;
      if (current === 'swing' || current === 'combo-swing' || current === 'shock') enemy.swingProgress = clamp(1 - enemy.golemTimer / enemy.golemStateTotal, 0, 1);
      if (current === 'charge') {
        const amount = clamp(1 - enemy.golemTimer / enemy.golemStateTotal, 0, 1);
        enemy.x = enemy.chargeStartX + (enemy.chargeEndX - enemy.chargeStartX) * amount;
      }
      if (enemy.golemTimer <= EPSILON) {
        if (current === 'windup') impact(game, enemy, 'swing', .2);
        else if (current === 'swing') { clearZones(game, enemy); state(enemy, 'recover', .4); enemy.golemCooldown = enemy.boss ? 3 : 2.7; }
        else if (current === 'recover') { state(enemy, 'approach'); enemy.golemCooldown = Math.max(enemy.golemCooldown, 0); }
        else if (current === 'rage-windup') impact(game, enemy, 'shock', .16);
        else if (current === 'shock') beginCharge(game, enemy);
        else if (current === 'charge') comboWarning(game, enemy, true);
        else if (current === 'combo-windup') impact(game, enemy, 'combo-swing', .18);
        else if (current === 'combo-swing') {
          if (enemy.comboIndex < 3) comboWarning(game, enemy, false);
          else { clearZones(game, enemy); state(enemy, 'recover', .3); enemy.golemCooldown = 2.3; }
        }
      }
    }
    enemy.skillWarning = enemy.golemWarning;
    const attackZone = enemy.golemZone;
    if (attackZone?.phase === 'impact' && !attackZone.hitPlayer && overlaps(game.player, attackZone)) {
      attackZone.hitPlayer = true;
      game.hurt({x:enemy.x, owner:enemy, kind:'golem-' + attackZone.kind,
        damage:attackZone.damage, stun:attackZone.stun, forceHit:attackZone.kind === 'slam', comboIndex:attackZone.comboIndex});
    }
  }

  function update(game, dt) {
    if (game.screen !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    game.golemZones = game.golemZones || []; game.groundCracks = game.groundCracks || [];
    for (const crack of game.groundCracks) crack.life -= dt;
    game.groundCracks = game.groundCracks.filter(crack => crack.life > 0 && alive(crack.owner));
    game.golemZones = game.golemZones.filter(zone => alive(zone.owner));
    for (const enemy of game.enemies) {
      if (!alive(enemy) || !isGolem(enemy) || enemy.phase !== 'active') continue;
      updateEntity(game, enemy, dt);
      if (game.screen !== 'playing') break;
    }
  }

  MM.GolemCombat = {setup, update, cleanup};
})(typeof window !== 'undefined' ? window : globalThis);
