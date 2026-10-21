'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh(level = 1) {
  const context = vm.createContext({});
  for (const file of ['abyss-config','underwater-config','campaign', 'bosses', 'golem', 'wolves', 'kong', 'dragons', 'mythic', 'game']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, `../js/${file}.js`), 'utf8'), context, {filename:file});
  }
  const MM = context.MM;
  const game = new MM.Game({headless:true, random:() => .5, storage:{getItem() {return null;}, setItem() {}}});
  game.settings.effects = false;
  game.start(level);
  game.spawnTimer = game.ammoTimer = 10000;
  game.player.health = game.player.maxHealth = 30;
  game.player.invulnerable = 0;
  return {MM, game};
}

function tick(game, seconds, step = 1 / 60) {
  while (seconds > 1e-9) {
    const dt = Math.min(step, seconds);
    game.update(dt);
    seconds -= dt;
  }
}

function until(game, predicate, limit = 5) {
  let elapsed = 0;
  while (!predicate() && elapsed < limit) {
    game.update(1 / 60);
    elapsed += 1 / 60;
  }
  assert.ok(predicate(), `condition was not reached in ${limit} seconds`);
}

const key = (code, extra = {}) => ({code, repeat:false, preventDefault() {}, ...extra});
const pointer = (pointerId, clientX, clientY) => ({pointerId, clientX, clientY, pointerType:'touch', button:0, preventDefault() {}});
const button = action => ({dataset:{control:action}, classList:{add() {}, remove() {}}});

function tapKey(game, code) {
  game.keyDown(key(code));
  game.keyUp(key(code));
}

function bloodMoon() {
  const fixture = fresh(70), {game, MM} = fixture;
  const wolf = game.spawn('boss', -1);
  Object.assign(wolf, {phase:'active', x:280, speed:0, nextHowlAt:Infinity});
  wolf.health = wolf.maxHealth / 2 + 1;
  MM.WolfCombat.hit(game, wolf, 1);
  tick(game, 1.2);
  wolf.nextHowlAt = Infinity;
  assert.equal(wolf.bloodMoon, true);
  assert.equal(wolf.wolfState, 'approach');
  game.player.invulnerable = 0;
  return {...fixture, wolf};
}

function dragonAttack(variant) {
  const fixture = fresh(81), {game} = fixture;
  const dragon = game.spawn(`${variant}Dragon`, 1);
  Object.assign(dragon, {phase:'active', x:650, speed:0, nextDragonSkillAt:0});
  game.update(1 / 60);
  if (variant === 'lightning') game.player.x = game.dragonZones[0].x;
  return {...fixture, dragon};
}

test('a released same-direction keyboard double tap rolls only during the active Blood Moon', () => {
  const {game, wolf} = bloodMoon();
  tapKey(game, 'ArrowRight');
  tick(game, .12);
  assert.equal(game.player.rollTime, 0);
  tapKey(game, 'ArrowRight');
  assert.ok(game.player.rollTime > .3);
  assert.equal(game.player.rollDir, 1);
  assert.equal(game.player.shieldTime, 0, 'rolling does not spend or create shields');

  for (const state of ['normal', 'transform', 'dead']) {
    const f = bloodMoon();
    if (state === 'normal') f.wolf.bloodMoon = false;
    if (state === 'transform') {
      f.MM.WolfCombat.setup(f.game, f.wolf);
      f.wolf.health = f.wolf.maxHealth / 2 + 1;
      f.MM.WolfCombat.hit(f.game, f.wolf, 1);
    }
    if (state === 'dead') f.wolf.dead = true;
    tapKey(f.game, 'ArrowLeft');
    tick(f.game, .1);
    tapKey(f.game, 'ArrowLeft');
    assert.equal(f.game.player.rollTime, 0, state);
  }
  assert.equal(wolf.health, wolf.maxHealth);
});

test('held keys, repeated key events, opposite directions and late taps cannot roll', () => {
  for (const variant of ['held', 'repeat', 'opposite', 'late']) {
    const {game} = bloodMoon();
    if (variant === 'held' || variant === 'repeat') {
      game.keyDown(key('ArrowRight'));
      tick(game, .1);
      game.keyDown(key('ArrowRight', {repeat:variant === 'repeat'}));
    } else {
      tapKey(game, 'ArrowRight');
      tick(game, variant === 'late' ? .31 : .1);
      tapKey(game, variant === 'opposite' ? 'ArrowLeft' : 'ArrowRight');
    }
    assert.equal(game.player.rollTime, 0, variant);
  }
});

test('mobile movement buttons and two separate horizontal swipes also trigger directional rolls', () => {
  for (const control of ['buttons', 'gestures']) {
    const {game} = bloodMoon();
    game.settings.controls = control;
    for (let id = 1; id <= 2; id++) {
      if (control === 'buttons') {
        const left = button('left');
        game.padDown(pointer(id, 100, 400), left);
        game.padUp(pointer(id, 100, 400), left);
      } else {
        game.pointerDown(pointer(id, 200, 300));
        game.pointerMove(pointer(id, 150, 301));
        game.pointerUp(pointer(id, 150, 301));
      }
      if (id === 1) tick(game, .12);
    }
    assert.ok(game.player.rollTime > 0, control);
    assert.equal(game.player.rollDir, -1, control);
    assert.equal(game.bullets.length, 0, 'movement gestures must not fire on release');
  }
});

test('a roll escapes both real locked claw strikes without requiring a shield', () => {
  for (const roll of [false, true]) {
    const {game, wolf} = bloodMoon();
    until(game, () => wolf.bloodCombo !== null);
    const targetX = wolf.wolfTargetX, health = game.player.health;
    tick(game, .35);
    if (roll) {
      tapKey(game, 'ArrowRight');
      tick(game, .08);
      tapKey(game, 'ArrowRight');
      tick(game, .34);
      assert.ok(game.player.x - targetX > 220, 'the roll actually clears the 210px claw zone');
    }
    until(game, () => wolf.bloodCombo.firstDone && wolf.bloodCombo.secondDone);
    assert.equal(game.player.health, health - (roll ? 0 : 4));
    assert.equal(game.shieldCount, 0);
  }
});

test('the rolling animation blocks forced claw hits and statuses; its cooldown prevents immediate reuse', () => {
  const {game} = bloodMoon(), p = game.player;
  assert.equal(game.tryRoll(-1), true);
  const health = p.health;
  game.hurt({x:p.x + 30, damage:2, forceHit:true, kind:'wolf-claw'});
  assert.equal(game.applyCombatEffect({damage:1, stun:2, burn:2, petrify:1.5, forceHit:true}), false);
  assert.equal(p.health, health);
  assert.equal(p.stunTime + p.petrifyTime + p.burnTime, 0);
  assert.equal(game.shoot(1), false);
  game.jump();
  assert.equal(p.jumpBuffer, 0);
  tick(game, .34);
  assert.equal(p.rollTime, 0);
  assert.equal(game.tryRoll(1), false);
  tick(game, .57);
  assert.equal(game.tryRoll(1), true);
});

test('rolls stay inside the arena and disabled player states cannot begin a roll', () => {
  for (const [x, dir, edge] of [[30, -1, 26], [930, 1, 934]]) {
    const {game} = bloodMoon();
    game.player.x = x;
    assert.equal(game.tryRoll(dir), true);
    tick(game, .4);
    assert.equal(game.player.x, edge);
  }
  for (const state of ['stunTime', 'petrifyTime']) {
    const {game} = bloodMoon();
    game.player[state] = 1;
    assert.equal(game.tryRoll(1), false, state);
  }
});

test('pause freezes a roll and clears tap history before resuming; retry resets its timers', () => {
  const {game} = bloodMoon();
  tapKey(game, 'ArrowLeft');
  game.togglePause();
  tick(game, .2);
  game.togglePause();
  tapKey(game, 'ArrowLeft');
  assert.equal(game.player.rollTime, 0, 'the tap before pause must not combine with a tap after resume');
  tick(game, .05);
  tapKey(game, 'ArrowLeft');
  assert.ok(game.player.rollTime > 0);
  const x = game.player.x, remaining = game.player.rollTime, cooldown = game.player.rollCooldown;
  game.togglePause();
  tick(game, 2);
  assert.equal(game.player.x, x);
  assert.equal(game.player.rollTime, remaining);
  assert.equal(game.player.rollCooldown, cooldown);
  game.togglePause();
  tick(game, .1);
  assert.ok(game.player.x < x);
  game.start(70, {retry:true});
  assert.equal(game.player.rollTime, 0);
  assert.equal(game.player.rollCooldown, 0);
  assert.equal(game.moveTapDir, 0);
});

test('an actual fire-dragon breath burns for exactly one HP at one and two seconds', () => {
  for (const step of [1 / 20, 1 / 60]) {
    const {game} = dragonAttack('fire');
    const health = game.player.health;
    until(game, () => game.player.burnTime > 0);
    assert.equal(game.player.health, health, 'the first burn tick is delayed by one second');
    const x = game.player.x;
    tick(game, .99, step);
    assert.equal(game.player.health, health);
    tick(game, .01, step);
    assert.equal(game.player.health, health - 1);
    assert.equal(game.player.x, x, 'damage over time does not push the player sideways');
    assert.equal(game.player.y, 438, 'damage over time does not make the player bounce');
    assert.equal(game.player.grounded, true);
    tick(game, .99, step);
    assert.equal(game.player.health, health - 1);
    tick(game, .01, step);
    assert.equal(game.player.health, health - 2);
    assert.equal(game.player.x, x);
    assert.equal(game.player.y, 438);
    tick(game, .6, step);
    assert.equal(game.player.health, health - 2, 'the expired burn must not keep ticking');
    assert.equal(game.player.burnTime, 0);
  }
});

test('renewing a burn cannot postpone its next tick or cause immediate stacked damage', () => {
  const {game} = fresh(), health = game.player.health;
  game.applyCombatEffect({damage:0, burn:2, forceHit:true});
  tick(game, .75);
  game.applyCombatEffect({damage:0, burn:2, forceHit:true});
  assert.equal(game.player.health, health);
  tick(game, .25);
  assert.equal(game.player.health, health - 1, 'renewal keeps the existing next-tick deadline');
  tick(game, 1);
  assert.equal(game.player.health, health - 2);
  tick(game, .8);
  assert.equal(game.player.health, health - 2);
});

test('stored shields allow burns, but activating one extinguishes them and active shields block new burns', () => {
  const {game} = fresh(), health = game.player.health;
  game.shieldCount = 2;
  assert.equal(game.applyCombatEffect({damage:0, burn:2}), true);
  tick(game, .5);
  game.keyDown(key('Space'));
  assert.equal(game.player.burnTime, 0);
  assert.equal(game.shieldCount, 1);
  tick(game, 2);
  assert.equal(game.player.health, health);
  game.player.invulnerable = 0;
  const shieldHits = game.player.shieldHits;
  assert.equal(game.applyCombatEffect({damage:0, burn:2}), false);
  assert.equal(game.player.burnTime, 0);
  assert.equal(game.player.shieldHits, shieldHits - 1);
});

test('real wind has no HP damage while lightning removes one HP; both give two-second star stun', () => {
  for (const variant of ['wind', 'lightning']) {
    const {game} = dragonAttack(variant), health = game.player.health;
    until(game, () => game.player.stunTime > 0);
    assert.equal(game.player.health, health - (variant === 'lightning' ? 1 : 0));
    assert.equal(game.player.stunTime, 2);
    assert.equal(game.player.stunStyle, 'stars');
    if (variant === 'wind') {
      assert.equal(game.player.grounded, false);
      assert.ok(game.player.vy < -500);
    }
    const x = game.player.x;
    game.keyDown(key('ArrowRight'));
    game.keyDown(key('KeyD'));
    game.keyDown(key('ArrowUp'));
    tick(game, 1.99);
    assert.equal(game.player.x, x);
    assert.equal(game.bullets.length, 0);
    assert.ok(game.player.stunTime > 0);
    tick(game, .01);
    assert.equal(game.player.stunTime, 0);
    assert.ok(game.player.stunGrace > .5);
  }
});

test('an active shield blocks wind and lightning damage, stun and knockup together', () => {
  for (const variant of ['wind', 'lightning']) {
    const {game} = dragonAttack(variant), p = game.player, health = p.health;
    game.shieldCount = 1;
    game.activateShield();
    until(game, () => p.shieldHits === 2);
    assert.equal(p.health, health);
    assert.equal(p.stunTime, 0);
    assert.equal(p.grounded, true);
    assert.equal(p.y, 438);
  }
});

test('Medusa petrifies through ordinary hit invulnerability, locking controls for 1.5 seconds', () => {
  const {game} = fresh(91), p = game.player;
  const medusa = game.spawn('medusa', -1);
  Object.assign(medusa, {phase:'active', x:100, speed:0, nextAttackAt:0});
  p.invulnerable = 5;
  until(game, () => p.petrifyTime > 0);
  assert.equal(p.petrifyTime, 1.5);
  assert.equal(p.stunTime, 0, 'petrification is independent of web/star stun');
  const health = p.health, x = p.x;
  game.keyDown(key('ArrowRight'));
  game.keyDown(key('KeyD'));
  game.keyDown(key('ArrowUp'));
  tick(game, 1.49);
  assert.equal(p.x, x);
  assert.equal(p.y, 438);
  assert.equal(p.jumpBuffer, 0);
  assert.equal(game.bullets.length, 0);
  assert.equal(p.health, health);
  tick(game, .01);
  assert.equal(p.petrifyTime, 0);
  assert.ok(p.petrifyGrace > .5);
});

test('shield activation immediately cures petrification; a stored shield alone cannot prevent it', () => {
  const {game} = fresh(91), p = game.player;
  game.shieldCount = 2;
  assert.equal(game.applyCombatEffect({damage:0, petrify:1.5, forceHit:true}), true);
  assert.equal(p.petrifyTime, 1.5);
  game.keyDown(key('Space'));
  assert.equal(p.petrifyTime, 0);
  assert.equal(game.shieldCount, 1);
  assert.ok(p.petrifyGrace > 0);
  p.invulnerable = 0;
  assert.equal(game.applyCombatEffect({damage:0, petrify:1.5, forceHit:true}), false);
  assert.equal(p.petrifyTime, 0);
  assert.equal(p.shieldHits, 2);
  game.keyDown(key('ArrowRight'));
  game.keyDown(key('ArrowUp'));
  tick(game, .05);
  assert.ok(p.vy < 0);
  assert.ok(game.shoot(1));
});

test('burn, stun and petrification deadlines freeze during pause and reset on a fresh stage', () => {
  const {game} = fresh(91), p = game.player;
  game.applyCombatEffect({damage:0, burn:2, stun:2, petrify:1.5, forceHit:true});
  tick(game, .25);
  const snapshot = {health:p.health, burn:p.burnTime, tick:p.burnTick, stun:p.stunTime, stone:p.petrifyTime};
  game.togglePause();
  tick(game, 5);
  assert.deepEqual({health:p.health, burn:p.burnTime, tick:p.burnTick, stun:p.stunTime, stone:p.petrifyTime}, snapshot);
  game.togglePause();
  tick(game, .25);
  assert.ok(p.burnTime < snapshot.burn);
  assert.ok(p.stunTime < snapshot.stun);
  assert.ok(p.petrifyTime < snapshot.stone);
  game.start(91, {retry:true});
  assert.equal(game.player.burnTime + game.player.stunTime + game.player.petrifyTime, 0);
});

test('the real Yin-Yang laser deals three HP without a shield and one HP through a freshly activated shield', () => {
  for (const shield of [false, true]) {
    const {game, MM} = fresh(90), p = game.player;
    const dragon = game.spawn('boss', -1);
    Object.assign(dragon, {phase:'active', x:150, speed:0});
    MM.DragonCombat.hit(game, dragon, dragon.maxHealth / 2);
    assert.equal(dragon.dragonState, 'laser-windup');
    tick(game, 2.58);
    const health = p.health;
    if (shield) {game.shieldCount = 1; game.activateShield();}
    tick(game, .06);
    assert.equal(p.health, health - (shield ? 1 : 3));
    assert.equal(p.shieldHits, shield ? 2 : 0);
  }
});

test('a high-angle dragon shot spends one ammo and deals two actual HP without granting KingKong shot rewards', () => {
  const {game} = fresh(81), p = game.player;
  const dragon = game.spawn('fireDragon', 1);
  Object.assign(dragon, {phase:'active', x:650, speed:0});
  const health = dragon.health, ammo = p.ammo;
  assert.equal(game.shoot(1), true);
  assert.equal(game.bullets[0].kind, 'highAim');
  assert.ok(game.bullets[0].vy < 0, 'the bullet travels upwards toward the dragon');
  assert.equal(p.ammo, ammo - 1);
  until(game, () => dragon.health < health);
  assert.equal(dragon.health, health - 2);
  assert.equal(dragon.highAimShots, undefined);
  assert.equal(game.shieldCount, 0);
});

test('airborne Chimera uses the same high-angle gun but shields depend on HP dealt instead of shots fired', () => {
  const {game, MM} = fresh(100), p = game.player;
  const chimera = game.spawn('boss', 1);
  Object.assign(chimera, {phase:'active', x:680, speed:0});
  MM.MythicCombat.hit(game, chimera, chimera.maxHealth / 2);
  tick(game, 1.2);
  assert.equal(chimera.mythicAir, true);
  const health = chimera.health, ammo = p.ammo, damage = chimera.encounter.totalDamage;
  game.shieldCount = 0;
  chimera.encounter.damage = 0;
  assert.equal(game.shoot(1), true);
  assert.equal(game.bullets[0].kind, 'highAim');
  assert.equal(p.ammo, ammo - 1);
  until(game, () => chimera.health < health);
  assert.equal(chimera.health, health - 2);
  assert.equal(chimera.encounter.totalDamage, damage + 2);
  assert.equal(chimera.encounter.damage, 2);
  assert.equal(chimera.highAimShots, undefined);
  assert.equal(game.shieldCount, 0);
});

test('nearby ground enemies remain shootable during mixed dragon waves and distant ground enemies allow high aim', () => {
  const {game} = fresh(81);
  const dragon = game.spawn('fireDragon', 1), golem = game.spawn('golem', 1);
  Object.assign(dragon, {phase:'active', x:740, speed:0});
  Object.assign(golem, {phase:'active', x:590, speed:0, golemCooldown:100});
  assert.equal(game.getWeaponProfile(1).kind, 'normal');
  const health = golem.health, ammo = game.player.ammo;
  game.shoot(1);
  assert.equal(game.bullets[0].vy, undefined);
  until(game, () => golem.health < health);
  assert.equal(golem.health, health - 1);
  assert.equal(game.player.ammo, ammo - 1);
  golem.x = 800;
  assert.equal(game.getWeaponProfile(1).kind, 'highAim');
  assert.equal(game.getWeaponProfile(1).target, dragon);
});

test('dragon knight landing restores the ordinary gun and its one-ammo one-HP hits', () => {
  const {game, MM} = fresh(90), dragon = game.spawn('boss', 1);
  Object.assign(dragon, {phase:'active', x:650, speed:0});
  game.player.x = 80;
  MM.DragonCombat.hit(game, dragon, dragon.maxHealth / 2);
  game.player.x = 920;
  tick(game, 3.2);
  MM.DragonCombat.hit(game, dragon, dragon.maxHealth);
  tick(game, 1.2);
  assert.equal(dragon.dragonForm, 'knight');
  assert.equal(dragon.dragonState, 'knight');
  game.player.x = 480;
  dragon.x = 650;
  assert.equal(game.getWeaponProfile(1).kind, 'normal');
  const health = dragon.health, ammo = game.player.ammo;
  assert.equal(game.shoot(1), true);
  until(game, () => dragon.health < health);
  assert.equal(dragon.health, health - 1);
  assert.equal(game.player.ammo, ammo - 1);
});

test('all new hazard and projectile arrays are cleared on retry, next stage and home', () => {
  for (const action of ['retry', 'next', 'home']) {
    const {game} = fresh(90);
    for (const name of ['dragonZones', 'dragonShots', 'mythicZones', 'mythicShots']) game[name].push({sentinel:true});
    if (action === 'home') game.goHome();
    else game.start(action === 'next' ? 91 : 90, action === 'retry' ? {retry:true} : {carry:true});
    for (const name of ['dragonZones', 'dragonShots', 'mythicZones', 'mythicShots']) assert.equal(game[name].length, 0, `${action}: ${name}`);
  }
});
