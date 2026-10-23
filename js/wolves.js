/* Werewolf pounces, running pups, and Lang Vương's blood moon and pack howl. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, GROUND = 438, EPSILON = 1e-8, BLOOD_INTERVAL = 1.5, BLOOD_CAST_DURATION = 1.5;
  const HOWL_DURATION = 4, PACK_SIZE = 5, PACK_LIMIT = 10;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const isWolf = enemy => (enemy?.archetype || enemy?.type) === 'werewolf';
  const isPup = enemy => enemy.wolfPup || enemy.variant === 'pup' || enemy.type === 'wolfPup';
  const alive = enemy => enemy && !enemy.dead && enemy.health > 0;
  const pressure = (game, enemy) => game.getPressure?.(enemy) || {attackRate:1, moveRate:1, warningFloor:.9};
  const warning = (game, enemy, base) => Math.max(pressure(game, enemy).warningFloor || .9, base / (pressure(game, enemy).attackRate || 1));
  const overlaps = (player, area) => Math.abs(player.x - area.x) < (player.w * .75 + area.w) / 2 && player.y > area.y - area.h && player.y - player.h * .86 < area.y;

  function state(enemy, name, seconds = 0, label = null) {
    enemy.wolfState = name; enemy.wolfTimer = seconds; enemy.wolfStateTotal = seconds;
    enemy.wolfProgress = 0;
    enemy.tell = ['windup', 'blood-windup', 'claw-windup'].includes(name);
    enemy.charging = enemy.tell || name === 'leap' || name === 'blood-leap';
    enemy.wolfWarning = label ? {name:label, remaining:seconds, total:seconds} : null;
    enemy.skillWarning = enemy.howling ? enemy.howlWarning : enemy.wolfWarning;
  }
  function clearZones(game, enemy) {
    game.wolfZones = (game.wolfZones || []).filter(area => area.owner !== enemy);
    enemy.wolfZone = null;
  }
  function setup(game, enemy) {
    if (!isWolf(enemy)) return;
    game.wolfZones = game.wolfZones || [];
    enemy.baseW = enemy.baseW || enemy.w; enemy.baseH = enemy.baseH || enemy.h;
    enemy.wolfPup = Boolean(isPup(enemy));
    if (enemy.wolfPup) enemy.pupRunDir = enemy.dir === -1 ? -1 : 1;
    enemy.wolfActiveTime = 0; enemy.wolfCooldown = enemy.boss ? 3 : 1.8;
    enemy.bloodActiveTime = 0; enemy.nextBloodAt = BLOOD_INTERVAL; enemy.bloodCombo = null;
    enemy.bloodMoon = false; enemy.bloodPhaseTriggered = false; enemy.transformTime = 0;
    enemy.howlClock = 0; enemy.nextHowlAt = enemy.boss ? 6 : Infinity;
    enemy.howling = false; enemy.howlTime = 0; enemy.howlProgress = 0; enemy.howlWarning = null;
    enemy.packSerial = 0; enemy.clawIndex = 0; enemy.intangible = false; enemy.wolfZone = null;
    if (enemy.wolfPup) enemy.health = enemy.maxHealth = 1;
    enemy.y = GROUND; state(enemy, enemy.wolfPup ? 'run' : 'approach');
  }
  // Retreating summons never call killEnemy: they award neither score nor quota.
  function retirePup(game, pup, escaped = false) {
    clearZones(game, pup); pup.dead = true; pup.health = 0;
    if (escaped && !pup.minion && !pup.ownerBoss && !pup.waveReservationReleased) {
      // A dodged runner leaves the quota open for a replacement; no kill rewards.
      pup.waveReservationReleased = true;
      game.regularSpawned = Math.max(game.levelKills || 0, (game.regularSpawned || 0) - 1);
      game.spawnTimer = Math.min(Number.isFinite(game.spawnTimer) ? game.spawnTimer : .8, .8);
    }
    game.burst?.(pup.x, GROUND - 10, '#a99d8d', 5);
  }
  function cleanup(game, enemy) {
    if (!isWolf(enemy)) return;
    clearZones(game, enemy);
    if (enemy.boss) {
      for (const pup of game.enemies) if (pup.ownerBoss === enemy) retirePup(game, pup);
      game.enemies = game.enemies.filter(other => other.ownerBoss !== enemy);
    }
    enemy.intangible = false; enemy.tell = false; enemy.charging = false;
    enemy.skillWarning = null; enemy.wolfWarning = null; enemy.transformTime = 0;
    enemy.howling = false; enemy.howlTime = 0; enemy.howlWarning = null; enemy.bloodCombo = null;
    if (game.player && !game.enemies.some(other => other !== enemy && alive(other) && isWolf(other) && other.bloodMoon)) game.player.weaponMode = 'normal';
  }
  function zone(game, enemy, kind, seconds, damage, clawIndex = 0) {
    clearZones(game, enemy);
    const area = {owner:enemy, kind, x:enemy.wolfTargetX, y:GROUND,
      w:kind === 'claw' ? 210 : enemy.boss ? 164 : 118,
      h:kind === 'claw' ? 64 : enemy.boss ? 60 : 52,
      phase:'warning', timer:seconds, total:seconds, damage, clawIndex, hitPlayer:false};
    game.wolfZones.push(area); enemy.wolfZone = area;
    return area;
  }
  function target(game, enemy) {
    enemy.wolfTargetX = clamp(game.player.x, 40, W - 40);
    const distance = enemy.wolfTargetX - enemy.x;
    if (Math.abs(distance) > 4) enemy.dir = Math.sign(distance);
  }
  function beginPounce(game, enemy) {
    target(game, enemy); enemy.clawIndex = 0;
    const seconds = warning(game, enemy, enemy.boss ? 1.1 : .9);
    zone(game, enemy, 'pounce', seconds, 1);
    state(enemy, 'windup', seconds, 'NGƯỜI SÓI · NHẢY VỒ');
  }
  function leapPath(enemy, blood) {
    enemy.wolfStartX = enemy.x;
    const margin = Math.max(26, enemy.w / 2);
    enemy.wolfEndX = clamp(enemy.wolfTargetX - enemy.dir * (enemy.w / 2 + (blood ? 28 : 14)), margin, W - margin);
    enemy.wolfLeapHeight = blood ? 180 : enemy.boss ? 150 : 130;
  }
  function beginLeap(enemy) { leapPath(enemy, false); state(enemy, 'leap', .62); }
  function beginBloodCombo(game, enemy, startAt) {
    target(game, enemy); leapPath(enemy, true);
    // Announce the full reaction floor, including flight. Absolute offsets keep
    // both impacts intact even when frames have uneven durations.
    const firstAt = clamp(pressure(game, enemy).warningFloor || .9, .75, 1.1);
    enemy.bloodCombo = {startAt, firstAt, secondAt:BLOOD_CAST_DURATION - .15,
      duration:BLOOD_CAST_DURATION, firstDone:false, secondDone:false};
    enemy.comboFirstImpactAt = firstAt; enemy.clawIndex = 1;
    const area = zone(game, enemy, 'claw', firstAt, 2, 1);
    area.castDuration = BLOOD_CAST_DURATION; area.castElapsed = 0; area.castProgress = 0;
    state(enemy, 'blood-windup', firstAt - .5, 'TRĂNG MÁU · SONG TRẢO · 2 × 2 MÁU');
  }
  function startHowl(game, enemy) {
    enemy.howling = true; enemy.howlStartAt = enemy.nextHowlAt;
    enemy.howlEndAt = enemy.howlStartAt + HOWL_DURATION;
    enemy.howlTime = Math.max(0, enemy.howlEndAt - enemy.howlClock);
    enemy.howlProgress = 1 - enemy.howlTime / HOWL_DURATION;
    enemy.howlWarning = {name:'TIẾNG HÚ BẦY ĐÀN · MIỄN ĐẠN · 5 SÓI CON', remaining:enemy.howlTime, total:HOWL_DURATION};
    const oldPack = game.enemies.filter(other => alive(other) && other.ownerBoss === enemy);
    for (const pup of oldPack.slice(0, Math.max(0, oldPack.length + PACK_SIZE - PACK_LIMIT))) retirePup(game, pup);
    game.enemies = game.enemies.filter(other => !other.dead);
    enemy.packSerial++;
    for (let index = 0; index < PACK_SIZE; index++) {
      const side = (index + enemy.packSerial) % 2 ? -1 : 1;
      const pup = game.spawn('wolfPup', side);
      Object.assign(pup, {minion:true, wolfPup:true, ownerBoss:enemy, packSerial:enemy.packSerial,
        warning:.45 + index * .13, summonLife:14, health:1, maxHealth:1});
    }
    game.sound?.play('howl');
    game.burst?.(enemy.x, enemy.y - enemy.h * .72, enemy.bloodMoon ? '#ff7b8c' : '#d7d1c5', 16, 'ring');
  }
  function updateHowl(game, enemy, dt) {
    if (!enemy.boss || enemy.wolfState === 'transform') return;
    enemy.howlClock += dt;
    if (enemy.howling) {
      enemy.howlTime = Math.max(0, enemy.howlEndAt - enemy.howlClock);
      enemy.howlProgress = 1 - enemy.howlTime / HOWL_DURATION;
      enemy.howlWarning.remaining = enemy.howlTime;
      if (enemy.howlTime <= EPSILON) {
        enemy.howling = false; enemy.howlTime = 0; enemy.howlWarning = null;
        // Cooldown starts after the four-second immune window ends.
        enemy.nextHowlAt = enemy.howlEndAt + (enemy.bloodMoon ? 4 : 6);
      }
    } else if (enemy.howlClock + EPSILON >= enemy.nextHowlAt) startHowl(game, enemy);
  }
  function transform(game, enemy) {
    clearZones(game, enemy);
    enemy.bloodPhaseTriggered = true; enemy.bloodMoon = true;
    enemy.health = enemy.maxHealth;
    enemy.w = enemy.baseW * 2; enemy.h = enemy.baseH * 2;
    enemy.x = clamp(enemy.x, enemy.w / 2, W - enemy.w / 2); enemy.y = GROUND;
    enemy.intangible = true; enemy.transformTime = 1.2; enemy.clawIndex = 0;
    enemy.bloodActiveTime = 0; enemy.nextBloodAt = BLOOD_INTERVAL; enemy.bloodCombo = null;
    enemy.howlClock = 0; enemy.nextHowlAt = 4; enemy.howling = false; enemy.howlTime = 0; enemy.howlWarning = null;
    state(enemy, 'transform', 1.2, 'TRĂNG MÁU · LANG VƯƠNG HỒI ĐẦY MÁU');
    if (game.player) { game.player.weaponMode = 'sniper'; game.player.shotTimer = 0; }
    game.burst?.(enemy.x, enemy.y - enemy.h / 2, '#e56878', 28, 'ring');
    game.floating?.(enemy.x, enemy.y - enemy.h - 12, 'TRĂNG MÁU · SÚNG NGẮM', '#ff9ba6');
    game.updateUI?.();
  }
  function hit(game, enemy, damage = 1, attack = {}) {
    if (!isWolf(enemy)) return null;
    if (game.screen !== 'playing' || !alive(enemy) || enemy.intangible || enemy.wolfState === 'transform' || enemy.howling) return false;
    if (!enemy.wolfState) setup(game, enemy);
    const amount = Number.isFinite(damage) ? Math.max(1, Math.trunc(damage)) : 1;
    if(attack.damageReceipt&&MM.DamageReceipt)MM.DamageReceipt.subtract(enemy,damage,attack);
    else enemy.health = Math.max(0, enemy.health - amount);
    if (enemy.boss && !enemy.bloodPhaseTriggered && enemy.health <= enemy.maxHealth / 2) transform(game, enemy);
    return true;
  }
  function applyImpact(game, enemy) {
    const area = enemy.wolfZone;
    if (area?.phase === 'impact' && !area.hitPlayer && overlaps(game.player, area)) {
      area.hitPlayer = true;
      game.hurt({x:enemy.x, owner:enemy, kind:'wolf-' + area.kind,
        damage:area.damage, forceHit:area.kind === 'claw', clawIndex:area.clawIndex});
    }
  }
  function updateBloodCombo(game, enemy) {
    const combo = enemy.bloodCombo;
    if (!combo) return;
    const elapsed = enemy.bloodActiveTime - combo.startAt;
    const windupEnd = combo.firstAt - .5, leapEnd = combo.firstAt - .1;
    let name, startAt, endAt, label = null;
    if (elapsed < windupEnd - EPSILON) { name = 'blood-windup'; startAt = 0; endAt = windupEnd; label = 'TRĂNG MÁU · SONG TRẢO · 2 × 2 MÁU'; }
    else if (elapsed < leapEnd - EPSILON) { name = 'blood-leap'; startAt = windupEnd; endAt = leapEnd; }
    else if (elapsed < combo.firstAt - EPSILON) { name = 'claw-windup'; startAt = leapEnd; endAt = combo.firstAt; label = 'SONG TRẢO · 1/2 · 2 MÁU'; }
    else if (elapsed < combo.firstAt + .1 - EPSILON) { name = 'claw'; startAt = combo.firstAt; endAt = combo.firstAt + .1; }
    else if (elapsed < combo.secondAt - EPSILON) { name = 'claw-windup'; startAt = combo.firstAt + .1; endAt = combo.secondAt; label = 'SONG TRẢO · 2/2 · 2 MÁU'; }
    else if (elapsed < combo.duration - EPSILON) { name = 'claw'; startAt = combo.secondAt; endAt = combo.duration; }
    else { clearZones(game, enemy); enemy.y = GROUND; state(enemy, 'recover', Math.max(0, BLOOD_INTERVAL - elapsed)); return; }
    const second = elapsed >= combo.firstAt + .1 - EPSILON;
    const index = second ? 2 : 1;
    if (enemy.wolfState !== name || enemy.clawIndex !== index) state(enemy, name, endAt - startAt, label);
    enemy.clawIndex = index; enemy.wolfTimer = Math.max(0, endAt - elapsed);
    enemy.wolfStateTotal = endAt - startAt; enemy.wolfProgress = clamp((elapsed - startAt) / (endAt - startAt), 0, 1);
    if (enemy.wolfWarning) enemy.wolfWarning.remaining = enemy.wolfTimer;
    if (name === 'blood-leap') {
      enemy.x = enemy.wolfStartX + (enemy.wolfEndX - enemy.wolfStartX) * enemy.wolfProgress;
      enemy.y = GROUND - Math.sin(Math.PI * enemy.wolfProgress) * enemy.wolfLeapHeight;
    } else if (elapsed >= leapEnd - EPSILON) { enemy.x = enemy.wolfEndX; enemy.y = GROUND; }
    const area = enemy.wolfZone;
    if (!area) return;
    // Cosmetic trails span the full cast; damage still occurs once per claw.
    area.castElapsed = clamp(elapsed, 0, combo.duration);
    area.castProgress = area.castElapsed / combo.duration;
    area.clawIndex = index;
    const striking = name === 'claw';
    if (striking && !(second ? combo.secondDone : combo.firstDone)) {
      if (second) combo.secondDone = true; else combo.firstDone = true;
      area.hitPlayer = false;
      game.burst?.(area.x, GROUND - 10, '#ff8e92', 12);
    }
    area.phase = striking ? 'impact' : 'warning';
    area.timer = Math.max(0, striking ? endAt - elapsed : (second ? combo.secondAt : combo.firstAt) - elapsed);
    if (second) area.total = combo.duration - combo.secondAt;
    applyImpact(game, enemy);
  }
  function updatePup(game, enemy, dt) {
    enemy.y = GROUND; enemy.wolfState = 'run';
    if (enemy.ownerBoss) {
      enemy.summonLife -= dt;
      if (!alive(enemy.ownerBoss) || enemy.summonLife <= 0) { retirePup(game, enemy); return; }
    }
    enemy.dir = enemy.pupRunDir;
    enemy.x += enemy.pupRunDir * enemy.speed * (pressure(game, enemy).moveRate || 1) * dt;
    if (enemy.x < -45 || enemy.x > W + 45) { retirePup(game, enemy, true); return; }
    if (overlaps(game.player, {x:enemy.x, y:GROUND, w:enemy.w * .72, h:enemy.h * .88})) game.hurt({x:enemy.x, owner:enemy, kind:'wolf-pup', damage:1});
  }
  function updateEntity(game, enemy, dt) {
    if (!enemy.wolfState) setup(game, enemy);
    enemy.wolfActiveTime += dt;
    if (isPup(enemy)) { updatePup(game, enemy, dt); return; }
    updateHowl(game, enemy, dt);
    if (enemy.wolfState !== 'transform' && enemy.bloodMoon) {
      enemy.bloodActiveTime += dt;
      if (enemy.bloodActiveTime + EPSILON >= enemy.nextBloodAt) {
        const startAt = enemy.nextBloodAt; enemy.nextBloodAt += BLOOD_INTERVAL;
        beginBloodCombo(game, enemy, startAt);
      }
      if (enemy.bloodCombo) {
        updateBloodCombo(game, enemy); enemy.skillWarning = enemy.howling ? enemy.howlWarning : enemy.wolfWarning; return;
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
      if (current === 'leap') {
        enemy.x = enemy.wolfStartX + (enemy.wolfEndX - enemy.wolfStartX) * enemy.wolfProgress;
        enemy.y = GROUND - Math.sin(Math.PI * enemy.wolfProgress) * enemy.wolfLeapHeight;
      }
      if (enemy.wolfTimer <= EPSILON) {
        if (current === 'transform') {
          enemy.transformTime = 0; enemy.intangible = false; enemy.bloodActiveTime = 0;
          state(enemy, 'approach');
        } else if (current === 'windup') beginLeap(enemy);
        else if (current === 'leap') {
          enemy.y = GROUND; state(enemy, 'pounce', .18);
          if (enemy.wolfZone) { enemy.wolfZone.phase = 'impact'; enemy.wolfZone.timer = .18; enemy.wolfZone.hitPlayer = false; }
          game.burst?.(enemy.wolfTargetX, GROUND - 10, '#d4c6b4', 12);
        } else if (current === 'pounce') {
          clearZones(game, enemy); state(enemy, 'recover', .65); enemy.wolfCooldown = enemy.boss ? 4.2 : 3.3;
        } else if (current === 'recover') state(enemy, 'approach');
      }
    }
    enemy.skillWarning = enemy.howling ? enemy.howlWarning : enemy.wolfWarning;
    applyImpact(game, enemy);
  }
  function update(game, dt) {
    if (game.screen !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
    game.wolfZones = (game.wolfZones || []).filter(area => alive(area.owner));
    // Summoning appends a pack; only entities present at frame start act now.
    for (const enemy of game.enemies.slice()) {
      if (!alive(enemy) || !isWolf(enemy) || enemy.phase !== 'active' || (enemy.petrifiedTime || 0) > 1e-8) continue;
      updateEntity(game, enemy, dt);
      if (game.screen !== 'playing') break;
    }
    game.enemies = game.enemies.filter(enemy => !enemy.dead);
  }
  MM.WolfCombat = {setup, update, cleanup, hit};
})(typeof window !== 'undefined' ? window : globalThis);
