/* Werewolf pounces and Lang Vương's one-time blood moon transformation. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPSILON = 1e-8, BLOOD_INTERVAL = 3;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const isWolf = enemy => (enemy?.archetype || enemy?.type) === 'werewolf';
  const alive = enemy => enemy && !enemy.dead && enemy.health > 0;
  const pressure = (game, enemy) => game.getPressure?.(enemy) || {attackRate:1, moveRate:1, warningFloor:.9};
  const warning = (game, enemy, base) => Math.max(pressure(game, enemy).warningFloor || .9, base / (pressure(game, enemy).attackRate || 1));
  const overlaps = (player, zone) => Math.abs(player.x - zone.x) < (player.w * .75 + zone.w) / 2 && player.y > zone.y - zone.h && player.y - player.h * .86 < zone.y;

  function state(enemy, name, seconds = 0, label = null) {
    enemy.wolfState = name; enemy.wolfTimer = seconds; enemy.wolfStateTotal = seconds;
    enemy.wolfProgress = 0;
    enemy.tell = ['windup', 'blood-windup', 'claw-windup'].includes(name);
    enemy.charging = enemy.tell || name === 'leap' || name === 'blood-leap';
    enemy.wolfWarning = label ? {name:label, remaining:seconds, total:seconds} : null;
    enemy.skillWarning = enemy.wolfWarning;
  }

  function clearZones(game, enemy) {
    game.wolfZones = (game.wolfZones || []).filter(zone => zone.owner !== enemy);
    enemy.wolfZone = null;
  }

  function setup(game, enemy) {
    if (!isWolf(enemy)) return;
    game.wolfZones = game.wolfZones || [];
    enemy.baseW = enemy.baseW || enemy.w; enemy.baseH = enemy.baseH || enemy.h;
    enemy.wolfActiveTime = 0; enemy.wolfCooldown = enemy.boss ? 3 : 1.8;
    enemy.bloodActiveTime = 0; enemy.nextBloodAt = BLOOD_INTERVAL;
    enemy.bloodMoon = false; enemy.bloodPhaseTriggered = false; enemy.transformTime = 0;
    enemy.clawIndex = 0; enemy.intangible = false; enemy.wolfZone = null;
    enemy.y = GROUND; state(enemy, 'approach');
  }

  function cleanup(game, enemy) {
    if (!isWolf(enemy)) return;
    clearZones(game, enemy);
    enemy.intangible = false; enemy.tell = false; enemy.charging = false;
    enemy.skillWarning = null; enemy.wolfWarning = null; enemy.transformTime = 0;
    if (game.player && !game.enemies.some(other => other !== enemy && alive(other) && isWolf(other) && other.bloodMoon)) {
      game.player.weaponMode = 'normal';
    }
  }

  function zone(game, enemy, kind, seconds, damage, clawIndex = 0) {
    clearZones(game, enemy);
    const attackZone = {owner:enemy, kind, x:enemy.wolfTargetX, y:GROUND,
      w:kind === 'claw' ? 210 : enemy.boss ? 164 : 118,
      h:kind === 'claw' ? 64 : enemy.boss ? 60 : 52,
      phase:'warning', timer:seconds, total:seconds, damage, clawIndex, hitPlayer:false};
    game.wolfZones.push(attackZone); enemy.wolfZone = attackZone;
    return attackZone;
  }

  function beginPounce(game, enemy, blood = false) {
    enemy.wolfTargetX = clamp(game.player.x, 40, W - 40);
    const distance = enemy.wolfTargetX - enemy.x;
    if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
    enemy.clawIndex = blood ? 1 : 0;
    const seconds = warning(game, enemy, blood ? 1.2 : enemy.boss ? 1.1 : .9);
    zone(game, enemy, blood ? 'claw' : 'pounce', seconds, blood ? 2 : 1, enemy.clawIndex);
    state(enemy, blood ? 'blood-windup' : 'windup', seconds, blood ? 'TRĂNG MÁU · SONG TRẢO · 2 × 2 MÁU' : 'NGƯỜI SÓI · NHẢY VỒ');
  }

  function beginLeap(enemy, blood) {
    enemy.wolfStartX = enemy.x;
    const margin = Math.max(26, enemy.w / 2);
    enemy.wolfEndX = clamp(enemy.wolfTargetX - enemy.dir * (enemy.w / 2 + (blood ? 28 : 14)), margin, W - margin);
    enemy.wolfLeapHeight = blood ? 180 : enemy.boss ? 150 : 130;
    state(enemy, blood ? 'blood-leap' : 'leap', blood ? .65 : .62);
  }

  function impact(game, enemy, kind) {
    state(enemy, kind === 'claw' ? 'claw' : 'pounce', .18);
    if (enemy.wolfZone) {
      enemy.wolfZone.phase = 'impact'; enemy.wolfZone.timer = .18; enemy.wolfZone.hitPlayer = false;
      game.burst?.(enemy.wolfZone.x, GROUND - 10, enemy.bloodMoon ? '#ff8e92' : '#d4c6b4', 12);
    }
  }

  function transform(game, enemy) {
    clearZones(game, enemy);
    enemy.bloodPhaseTriggered = true; enemy.bloodMoon = true;
    enemy.health = enemy.maxHealth;
    enemy.w = enemy.baseW * 2; enemy.h = enemy.baseH * 2;
    enemy.x = clamp(enemy.x, enemy.w / 2, W - enemy.w / 2); enemy.y = GROUND;
    enemy.intangible = true; enemy.transformTime = 1.2; enemy.clawIndex = 0;
    enemy.bloodActiveTime = 0; enemy.nextBloodAt = BLOOD_INTERVAL;
    state(enemy, 'transform', 1.2, 'TRĂNG MÁU · LANG VƯƠNG HỒI ĐẦY MÁU');
    if (game.player) { game.player.weaponMode = 'sniper'; game.player.shotTimer = 0; }
    game.burst?.(enemy.x, enemy.y - enemy.h / 2, '#e56878', 28, 'ring');
    game.floating?.(enemy.x, enemy.y - enemy.h - 12, 'TRĂNG MÁU · SÚNG NGẮM', '#ff9ba6');
    game.updateUI?.();
  }

  // null lets the ordinary bullet path handle other enemies. A handled hit applies
  // its own damage so no bullet can kill the king before the phase transition.
  function hit(game, enemy, damage = 1) {
    if (!isWolf(enemy)) return null;
    if (game.screen !== 'playing' || !alive(enemy) || enemy.intangible || enemy.wolfState === 'transform') return false;
    if (!enemy.wolfState) setup(game, enemy);
    const amount = Number.isFinite(damage) ? Math.max(1, Math.trunc(damage)) : 1;
    enemy.health = Math.max(0, enemy.health - amount);
    if (enemy.boss && !enemy.bloodPhaseTriggered && enemy.health <= enemy.maxHealth / 2) transform(game, enemy);
    return true;
  }

  function updateEntity(game, enemy, dt) {
    if (!enemy.wolfState) setup(game, enemy);
    enemy.wolfActiveTime += dt;
    if (enemy.wolfState !== 'transform' && enemy.bloodMoon) {
      enemy.bloodActiveTime += dt;
      if (enemy.bloodActiveTime + EPSILON >= enemy.nextBloodAt) {
        enemy.nextBloodAt += BLOOD_INTERVAL; beginPounce(game, enemy, true);
        return;
      }
    }
    const current = enemy.wolfState;
    if (current === 'approach') {
      enemy.y = GROUND;
      const rates = pressure(game, enemy), distance = game.player.x - enemy.x;
      if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
      const standOff = enemy.w / 2 + (enemy.bloodMoon ? 105 : 38);
      if (Math.abs(distance) > standOff) {
        const step = Math.min(Math.abs(distance) - standOff, enemy.speed * (rates.moveRate || 1) * dt);
        const margin = Math.max(26, enemy.w / 2);
        enemy.x = clamp(enemy.x + Math.sign(distance) * step, margin, W - margin);
      }
      if (!enemy.bloodMoon) {
        enemy.wolfCooldown = Math.max(0, enemy.wolfCooldown - dt * (rates.attackRate || 1));
        if (enemy.wolfCooldown <= EPSILON && Math.abs(game.player.x - enemy.x) <= (enemy.boss ? 310 : 230)) beginPounce(game, enemy);
      }
    } else {
      enemy.wolfTimer = Math.max(0, enemy.wolfTimer - dt);
      enemy.wolfProgress = enemy.wolfStateTotal ? clamp(1 - enemy.wolfTimer / enemy.wolfStateTotal, 0, 1) : 0;
      if (enemy.wolfZone) enemy.wolfZone.timer = enemy.wolfTimer;
      if (enemy.wolfWarning) enemy.wolfWarning.remaining = enemy.wolfTimer;
      if (current === 'transform') enemy.transformTime = enemy.wolfTimer;
      if (current === 'leap' || current === 'blood-leap') {
        enemy.x = enemy.wolfStartX + (enemy.wolfEndX - enemy.wolfStartX) * enemy.wolfProgress;
        enemy.y = GROUND - Math.sin(Math.PI * enemy.wolfProgress) * enemy.wolfLeapHeight;
      }
      if (enemy.wolfTimer <= EPSILON) {
        if (current === 'transform') {
          enemy.transformTime = 0; enemy.intangible = false; enemy.bloodActiveTime = 0;
          state(enemy, 'approach');
        } else if (current === 'windup') beginLeap(enemy, false);
        else if (current === 'blood-windup') beginLeap(enemy, true);
        else if (current === 'leap') { enemy.y = GROUND; impact(game, enemy, 'pounce'); }
        else if (current === 'blood-leap') {
          enemy.y = GROUND; zone(game, enemy, 'claw', .2, 2, 1);
          state(enemy, 'claw-windup', .2, 'SONG TRẢO · 1/2 · 2 MÁU');
        } else if (current === 'claw-windup') impact(game, enemy, 'claw');
        else if (current === 'claw' && enemy.clawIndex < 2) {
          enemy.clawIndex = 2;
          // Both claws keep the target announced before the leap, so a player
          // can escape the complete combo instead of being tracked mid-attack.
          // Fit both strikes inside the three-second cycle, including at 20 FPS,
          // so the next leap never cancels the second claw's impact.
          zone(game, enemy, 'claw', .45, 2, 2);
          state(enemy, 'claw-windup', .45, 'SONG TRẢO · 2/2 · 2 MÁU');
        } else if (current === 'pounce' || current === 'claw') {
          clearZones(game, enemy); state(enemy, 'recover', .65); enemy.wolfCooldown = enemy.boss ? 4.2 : 3.3;
        } else if (current === 'recover') state(enemy, 'approach');
      }
    }
    enemy.skillWarning = enemy.wolfWarning;
    const attackZone = enemy.wolfZone;
    if (attackZone?.phase === 'impact' && !attackZone.hitPlayer && overlaps(game.player, attackZone)) {
      attackZone.hitPlayer = true;
      game.hurt({x:enemy.x, owner:enemy, kind:'wolf-' + attackZone.kind,
        damage:attackZone.damage, forceHit:attackZone.kind === 'claw', clawIndex:attackZone.clawIndex});
    }
  }

  function update(game, dt) {
    if (game.screen !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    game.wolfZones = (game.wolfZones || []).filter(attackZone => alive(attackZone.owner));
    for (const enemy of game.enemies) {
      if (!alive(enemy) || !isWolf(enemy) || enemy.phase !== 'active') continue;
      updateEntity(game, enemy, dt);
      if (game.screen !== 'playing') break;
    }
  }

  MM.WolfCombat = {setup, update, cleanup, hit};
})(typeof window !== 'undefined' ? window : globalThis);
