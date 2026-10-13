'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fixture(level, rate = 1, random = .5) {
  const context = vm.createContext({});
  for (const file of ['campaign.js', 'bosses.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const {Campaign, BossCombat} = context.MM;
  const game = {
    level:Campaign.getLevel(level), screen:'playing', enemies:[], enemyShots:[], bossHazards:[], bossEggs:[],
    regularSpawned:17, totalKills:0, levelKills:0, shieldCount:0, ammoCrates:[], events:[],
    player:{x:480, y:438, w:38, h:54, vx:180, health:5, invulnerable:0, shieldTime:0, shieldHits:0, stunTime:0, stunGrace:0},
    random:() => random,
    getPressure:() => ({attackRate:rate, projectileRate:1 + (rate - 1) * .4, warningFloor:.9}),
    burst() {}, floating(x, y, text) { this.events.push(text); }, sound:{play() {}}, updateUI() {},
    clearInputs() { this.cleared = (this.cleared || 0) + 1; this.player.vx = 0; },
    hurt(attacker) { this.events.push(attacker); if (!this.player.invulnerable) { this.player.health--; this.player.invulnerable = 1.35; } },
    drainTarget(enemy) { this.drains = (this.drains || 0) + 1; if (this.player.shieldTime > 0 && this.player.shieldHits > 0) this.player.shieldHits--; else { this.player.health--; enemy.health = Math.min(enemy.healthCeiling || enemy.maxHealth, enemy.health + 1); } },
    spawn(type, side) {
      const enemy = Campaign.createEnemy(type, this.level, 'normal', side, this.random);
      Object.assign(enemy, {x:side === -1 ? 24 : 936, abilityState:'ground', abilityTimer:4, baseW:enemy.w, baseH:enemy.h});
      this.enemies.push(enemy);
      BossCombat.setup(this, enemy);
      return enemy;
    }
  };
  const boss = game.spawn('boss', -1);
  Object.assign(boss, {phase:'active', x:170, speed:0});
  return {game, boss, skills:BossCombat};
}

function advance(skills, game, seconds) {
  while (seconds > 1e-9) {
    const dt = Math.min(1 / 60, seconds);
    skills.update(game, dt);
    seconds -= dt;
  }
}

test('the green zombie hardens after every ten damaging bullets, with a full two-second immunity window', () => {
  const {game, boss, skills} = fixture(20, 2);
  boss.health = boss.maxHealth = 100;
  for (let hit = 0; hit < 10; hit++) { assert.equal(skills.hit(game, boss), true); boss.health--; }
  assert.equal(boss.health, 90, 'the tenth bullet still damages the boss');
  assert.equal(boss.armorHits, 0);
  assert.equal(boss.hardenedTime, 2);
  for (let hit = 0; hit < 25; hit++) assert.equal(skills.hit(game, boss), false);
  assert.equal(boss.health, 90);
  assert.equal(boss.armorHits, 0, 'blocked bullets do not count toward the next hardening');
  advance(skills, game, 1.999);
  assert.equal(skills.hit(game, boss), false, 'pressure does not shorten immunity');
  advance(skills, game, .001);
  assert.equal(skills.hit(game, boss), true);
  assert.equal(boss.armorHits, 1);
  for (let hit = 0; hit < 9; hit++) assert.equal(skills.hit(game, boss), true);
  assert.equal(boss.hardenedTime, 2);
});

test('ordinary enemies and other bosses do not acquire the zombie immunity counter', () => {
  for (const level of [10, 30, 40, 50]) {
    const {game, boss, skills} = fixture(level);
    assert.equal(skills.hit(game, boss), true);
    assert.equal(boss.bulletArmor, undefined);
    assert.equal(boss.armorHits, undefined);
    const regular = game.spawn('zombie', -1);
    assert.equal(regular.skillTimers, undefined);
    assert.equal(skills.hit(game, regular), true);
  }
});

test('webs stun for exactly two seconds without damaging health or extending an existing stun', () => {
  const {game, skills} = fixture(30);
  const health = game.player.health;
  assert.equal(skills.webHit(game, {kind:'web'}), true);
  assert.equal(game.player.health, health);
  assert.equal(game.player.stunTime, 2);
  assert.equal(game.player.vx, 0);
  assert.equal(game.cleared, 1);
  game.player.stunTime = .3;
  assert.equal(skills.webHit(game, {kind:'web'}), false);
  assert.equal(game.player.stunTime, .3);
  game.player.stunTime = 0; game.player.stunGrace = .5;
  assert.equal(skills.webHit(game, {kind:'web'}), false);
  assert.equal(game.player.stunTime, 0);
});

test('shield blocks consume one shield hit and prevent web stun; invulnerability ignores webs', () => {
  const {game, skills} = fixture(30);
  game.player.shieldTime = 5; game.player.shieldHits = 1;
  const health = game.player.health;
  assert.equal(skills.webHit(game, {kind:'web'}), true);
  assert.equal(game.player.shieldHits, 0);
  assert.equal(game.player.shieldTime, 0);
  assert.equal(game.player.stunTime, 0);
  assert.equal(game.player.health, health);
  game.player.invulnerable = .1;
  assert.equal(skills.webHit(game, {kind:'web'}), false);
  assert.equal(game.player.stunTime, 0);
});

test('spider webs receive a real warning, lock their target, and obey the shared projectile cap', () => {
  const {game, boss, skills} = fixture(30, 2);
  boss.skillTimers.web = .001;
  skills.update(game, 1 / 60);
  const pending = boss.pendingSkill;
  assert.ok(pending);
  assert.equal(pending.total, 1.2);
  assert.equal(boss.skillWarning.name, 'NHẢ TƠ');
  game.player.x = 800;
  advance(skills, game, 1.19);
  assert.equal(game.enemyShots.length, 0);
  advance(skills, game, .01);
  assert.equal(game.enemyShots.length, 1);
  const shot = game.enemyShots[0];
  assert.equal(shot.kind, 'web');
  assert.equal(shot.owner, boss);
  const lockedAngle = Math.atan2(pending.targetY - shot.y, pending.targetX - shot.x);
  assert.ok(Math.abs(Math.atan2(shot.vy, shot.vx) - lockedAngle) < 1e-9);
  game.enemyShots = Array.from({length:12}, () => ({life:1}));
  boss.skillTimers.web = .001;
  skills.update(game, .01);
  advance(skills, game, 1.2);
  assert.equal(game.enemyShots.length, 12);
});

test('eggs are thrown every five real seconds and only hatch five seconds after landing', () => {
  const {game, boss, skills} = fixture(30, 2);
  boss.skillTimers.web = 1000;
  advance(skills, game, 4.99);
  assert.equal(game.bossEggs.length, 0);
  advance(skills, game, .01);
  assert.equal(game.bossEggs.length, 1);
  const egg = game.bossEggs[0];
  assert.equal(egg.landed, false);
  assert.equal(egg.hatchTime, 5);
  const travel = (438 - egg.y) / egg.vy;
  advance(skills, game, travel);
  assert.equal(egg.landed, true);
  assert.equal(egg.y, 438);
  assert.equal(egg.x, 360);
  assert.ok(Math.abs(egg.hatchTime - 5) < 1e-8);
  advance(skills, game, 4.99);
  assert.equal(game.enemies.filter(enemy => enemy.minion).length, 0);
  assert.equal(game.bossEggs.length, 2, 'a second egg arrives five seconds after the first');
  advance(skills, game, .01);
  const brood = game.enemies.filter(enemy => enemy.minion);
  assert.equal(brood.length, 5);
  assert.equal(game.bossEggs.includes(egg), false);
  assert.ok(brood.every(enemy => enemy.phase === 'active' && enemy.health === 1 && enemy.w === 23 && enemy.h === 18));
  assert.ok(brood.every(enemy => enemy.abilityTimer === Infinity));
  assert.equal(game.regularSpawned, 17);
  assert.equal(game.totalKills, 0);
  assert.equal(game.ammoCrates.length, 0);
});

test('two swept bullet hits break an egg before hatching and cannot create spiderlings or ammo', () => {
  const {game, boss, skills} = fixture(30);
  boss.skillTimers.web = 1000; boss.skillTimers.egg = 0;
  skills.update(game, .01);
  const egg = game.bossEggs[0];
  egg.x = 500; egg.y = 438; egg.landed = true; egg.hatchTime = .05;
  const bullet = {x:560, y:411, dir:1};
  assert.equal(skills.hitEgg(game, bullet, 430), true);
  assert.equal(egg.health, 1);
  assert.equal(skills.hitEgg(game, {x:560, y:320}, 430), false);
  assert.equal(skills.hitEgg(game, bullet, 430), true);
  assert.equal(game.bossEggs.length, 0);
  advance(skills, game, .2);
  assert.equal(game.enemies.filter(enemy => enemy.minion).length, 0);
  assert.equal(game.ammoCrates.length, 0);
  assert.equal(game.totalKills, 0);
});

test('spiderling reservations keep the total at fifteen while every intact egg hatches a full brood', () => {
  const {game, boss, skills} = fixture(30);
  boss.skillTimers.web = 1000;
  advance(skills, game, 35);
  assert.equal(game.enemies.filter(enemy => enemy.minion).length, 15);
  assert.equal(game.bossEggs.length, 0);
  assert.ok(boss.skillTimers.egg > 0 && boss.skillTimers.egg <= .25);
  for (const minion of game.enemies.filter(enemy => enemy.minion).slice(0, 5)) minion.dead = true;
  advance(skills, game, .3);
  assert.equal(game.bossEggs.length, 1, 'five free slots allow another complete brood');
  advance(skills, game, 6);
  assert.equal(game.enemies.filter(enemy => enemy.minion && !enemy.dead).length, 15);
  assert.equal(game.bossEggs.length, 0);
});

test('skeleton floor pillars keep their announced positions and can be cleared with a jump', () => {
  const {game, boss, skills} = fixture(10, 2);
  boss.skillTimers.bones = 0;
  skills.update(game, .01);
  const positions = Array.from(game.bossHazards, hazard => hazard.x);
  assert.equal(game.bossHazards.length, 3);
  assert.ok(game.bossHazards.every(hazard => hazard.phase === 'warning' && hazard.timer === 1.2));
  game.player.x = 800;
  advance(skills, game, 1.19);
  assert.ok(game.bossHazards.every(hazard => hazard.phase === 'warning'));
  assert.deepEqual(Array.from(game.bossHazards, hazard => hazard.x), positions);
  game.player.x = 480; game.player.y = 350;
  advance(skills, game, .01);
  assert.ok(game.bossHazards.every(hazard => hazard.phase === 'active'));
  assert.equal(game.player.health, 5, 'jumped above the 58px floor attack');
  game.player.y = 438;
  advance(skills, game, .01);
  assert.equal(game.player.health, 4);
  advance(skills, game, .65);
  assert.equal(game.bossHazards.length, 0);
});

test('white ghost vanishes every five seconds, locks a randomly selected attack side, and strikes once', () => {
  for (const [random, side] of [[0, 'top'], [.5, 'left'], [.999, 'right']]) {
    const {game, boss, skills} = fixture(40, 2, random);
    advance(skills, game, 4.99);
    assert.equal(boss.phantomState, undefined);
    advance(skills, game, .01);
    assert.equal(boss.phantomState, 'invisible');
    assert.equal(boss.intangible, true);
    assert.equal(skills.hit(game, boss), false);
    advance(skills, game, 1.5);
    assert.equal(boss.phantomState, 'windup');
    assert.equal(boss.intangible, false);
    assert.equal(boss.attackSide, side);
    assert.equal(boss.phantomTimer, 1.2);
    const targetX = boss.landX;
    game.player.x = 650;
    advance(skills, game, 1.19);
    assert.equal(boss.phantomState, 'windup');
    assert.equal(boss.landX, targetX);
    game.player.x = targetX;
    advance(skills, game, .01);
    assert.equal(boss.phantomState, 'strike');
    advance(skills, game, .56);
    assert.equal(boss.phantomState, null);
    assert.equal(game.events.filter(event => event.phantomStrike).length, 1);
    advance(skills, game, 1.75);
    assert.equal(boss.phantomState, 'invisible', 'the next vanish starts at ten active seconds');
  }
});

test('Dracula announces one guaranteed target drain per bat transformation with a real warning', () => {
  const {game, boss, skills} = fixture(50, 2);
  boss.isBat = true;
  skills.update(game, .01);
  assert.equal(boss.drainWarning.total, 1.2);
  assert.equal(boss.skillWarning.name, 'HÚT MÁU · DÙNG KHIÊN');
  advance(skills, game, 1.19);
  assert.equal(game.drains, undefined);
  advance(skills, game, .01);
  assert.equal(game.drains, 1);
  assert.equal(game.player.health, 4);
  assert.equal(boss.drainFlash, .35);
  advance(skills, game, 4);
  assert.equal(game.drains, 1, 'remaining in bat form does not repeatedly drain');
  boss.isBat = false; skills.update(game, .01);
  boss.isBat = true; skills.update(game, .01);
  advance(skills, game, 1.2);
  assert.equal(game.drains, 2);
  assert.equal(game.bossHazards.length, 0);
  assert.equal(game.enemyShots.length, 0);
});

test('Dracula splits only once at half health, reserves a healing ceiling, and staggers the clone', () => {
  const {game, boss, skills} = fixture(50);
  boss.health = boss.maxHealth / 2 + 1;
  skills.update(game, .01);
  assert.equal(game.enemies.length, 1);
  boss.health--;
  skills.update(game, .01);
  assert.equal(game.enemies.length, 2);
  const clone = game.enemies.find(enemy => enemy !== boss);
  assert.equal(boss.splitTriggered, true);
  assert.equal(boss.healthCeiling, Math.floor(boss.maxHealth / 2));
  assert.equal(clone.draculaClone, true);
  assert.equal(clone.health, Math.ceil(boss.maxHealth / 2));
  assert.equal(clone.healthCeiling, clone.health);
  assert.equal(clone.phase, 'warning');
  assert.ok(clone.warning >= 1.2);
  assert.equal(clone.abilityTimer, 6);
  clone.phase = 'active'; clone.health = 1;
  advance(skills, game, 3);
  assert.equal(game.enemies.length, 2, 'neither the original nor clone splits again');
  assert.equal(game.regularSpawned, 17);
});

test('pause and portal phases freeze defensive and special-attack timers', () => {
  for (const level of [20, 30, 40, 50]) {
    const {game, boss, skills} = fixture(level);
    boss.hardenedTime = 2; boss.isBat = true;
    const before = JSON.stringify(boss);
    boss.phase = 'warning';
    const portal = JSON.stringify(boss);
    advance(skills, game, 2);
    assert.equal(JSON.stringify(boss), portal);
    boss.phase = 'active';
    game.screen = 'paused';
    const paused = JSON.stringify(boss);
    advance(skills, game, 4);
    assert.equal(JSON.stringify(boss), paused);
    assert.ok(before);
  }
});

test('boss death cleanup removes only its own pending attacks, eggs, and effects', () => {
  const {game, boss, skills} = fixture(50);
  const other = game.spawn('boss', 1);
  game.enemyShots = [{owner:boss}, {owner:other}, {type:'bone'}];
  game.bossHazards = [{owner:boss}, {owner:other}];
  game.bossEggs = [{owner:boss}, {owner:other}];
  boss.pendingSkill = {kind:'web'}; boss.drainWarning = {remaining:1};
  skills.cleanup(game, boss);
  assert.equal(game.enemyShots.length, 2);
  assert.equal(game.enemyShots[0].owner, other);
  assert.equal(game.bossHazards.length, 1);
  assert.equal(game.bossEggs.length, 1);
  assert.equal(game.bossHazards[0].owner, other);
  assert.equal(boss.pendingSkill, null);
  assert.equal(boss.drainWarning, null);
});

test('unbroken eggs cannot hatch after their owner dies', () => {
  const {game, boss, skills} = fixture(30);
  boss.skillTimers.egg = 0; boss.skillTimers.web = 1000;
  skills.update(game, .01);
  const egg = game.bossEggs[0];
  egg.landed = true; egg.hatchTime = .01;
  boss.dead = true;
  skills.update(game, .05);
  assert.equal(game.bossEggs.length, 0);
  assert.equal(game.enemies.filter(enemy => enemy.minion).length, 0);
});

function realGame(level) {
  const context = vm.createContext({});
  for (const file of ['campaign.js', 'bosses.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, storage:{getItem() { return null; }, setItem() {}}, random:() => .5});
  game.start(level);
  game.spawnTimer = game.ammoTimer = 10000;
  game.player.invulnerable = 10000;
  game.settings.effects = false;
  return {game, skills:context.MM.BossCombat};
}

function advanceGame(game, seconds) {
  while (seconds > 1e-9) { const dt = Math.min(1 / 60, seconds); game.update(dt); seconds -= dt; }
}

test('real bullet collision spends bullets against zombie armor without damaging or advancing its counter', () => {
  const {game} = realGame(20);
  const boss = game.spawn('boss', 1);
  Object.assign(boss, {phase:'active', x:700, y:438, speed:0, abilityTimer:10000, health:50, maxHealth:50});
  function bullet() {
    game.bullets.push({x:boss.x - boss.w / 2 - 4, y:411, dir:1, life:1});
    game.update(.01);
    assert.equal(game.bullets.length, 0);
  }
  for (let hit = 0; hit < 10; hit++) bullet();
  assert.equal(boss.health, 40);
  assert.equal(boss.hardenedTime, 2);
  bullet();
  assert.equal(boss.health, 40);
  assert.equal(boss.armorHits, 0);
  advanceGame(game, 1.98);
  bullet();
  assert.equal(boss.health, 39, 'damage resumes after two active seconds');
  assert.equal(boss.armorHits, 1);
});

test('real web collision pauses movement, shooting, and jumping for two seconds and freezes on pause', () => {
  const {game} = realGame(30);
  game.player.invulnerable = 0;
  game.enemyShots.push({kind:'web', x:game.player.x, y:game.player.y - 27, w:30, h:24, vx:0, vy:0, life:1});
  game.update(.01);
  assert.equal(game.player.stunTime, 2);
  assert.equal(game.player.health, game.player.maxHealth);
  assert.equal(game.enemyShots.length, 0);
  const x = game.player.x, ammo = game.player.ammo;
  game.keys.add('ArrowRight'); game.keys.add('KeyD'); game.jump();
  assert.equal(game.player.jumpBuffer, 0);
  assert.equal(game.shoot(1), false);
  advanceGame(game, .8);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  const remaining = game.player.stunTime;
  game.togglePause(); advanceGame(game, 3);
  assert.equal(game.player.stunTime, remaining);
  game.togglePause(); game.keys.add('ArrowRight'); game.keys.add('KeyD');
  advanceGame(game, 1.19);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  advanceGame(game, .02);
  assert.ok(game.player.x > x);
  assert.equal(game.player.ammo, ammo - 1);
  assert.ok(game.player.stunGrace > 0);
});

test('real white ghost strike knocks down, removes one HP and one stored shield, and respects hit invulnerability', () => {
  const {game} = realGame(40);
  game.player.invulnerable = 0; game.shieldCount = 2;
  game.player.shieldTime = 5; game.player.shieldHits = 3;
  game.hurt({x:game.player.x - 50, phantomStrike:true});
  assert.equal(game.player.health, game.player.maxHealth - 1);
  assert.equal(game.shieldCount, 1);
  assert.equal(game.player.shieldTime, 0);
  assert.equal(game.player.shieldHits, 0);
  assert.equal(game.player.knockdownTime, .75);
  assert.equal(game.player.stunTime, .75);
  game.hurt({x:game.player.x, phantomStrike:true});
  assert.equal(game.player.health, game.player.maxHealth - 1);
  assert.equal(game.shieldCount, 1);
  advanceGame(game, .8);
  assert.equal(game.player.knockdownTime, 0);
  assert.equal(game.player.stunTime, 0);
  game.player.invulnerable = 0; game.shieldCount = 0;
  game.hurt({x:game.player.x - 50, phantomStrike:true});
  assert.equal(game.shieldCount, 0, 'shield inventory never goes negative');
});

test('real Dracula target drain ignores distance and invulnerability; only an active shield blocks and prevents healing', () => {
  const {game} = realGame(50);
  const boss = game.spawn('boss', -1);
  boss.health = boss.maxHealth - 3;
  game.shieldCount = 2;
  const health = game.player.health, bossHealth = boss.health;
  game.drainTarget(boss);
  assert.equal(game.player.health, health - 1);
  assert.equal(boss.health, bossHealth + 1);
  assert.equal(game.shieldCount, 2, 'an unactivated stored shield does not protect');
  assert.equal(game.activateShield(), true);
  const shieldedHealth = game.player.health, healedHealth = boss.health;
  game.drainTarget(boss);
  assert.equal(game.player.health, shieldedHealth);
  assert.equal(boss.health, healedHealth);
  assert.equal(game.player.shieldHits, 2);
  boss.healthCeiling = boss.health;
  game.player.shieldTime = 0;
  game.drainTarget(boss);
  assert.equal(boss.health, healedHealth, 'healing respects the split-phase ceiling');
});

test('real Dracula splitting requires defeating both forms to complete level fifty', () => {
  const {game} = realGame(50);
  game.levelKills = game.regularSpawned = game.level.target;
  game.bossSpawned = true;
  const boss = game.spawn('boss', -1);
  Object.assign(boss, {phase:'active', health:boss.maxHealth / 2, speed:0, abilityTimer:10000});
  game.update(.01);
  const clone = game.enemies.find(enemy => enemy.draculaClone);
  assert.ok(clone);
  assert.equal(game.enemies.length, 2);
  game.killEnemy(boss);
  assert.equal(game.screen, 'playing');
  assert.equal(game.bossDefeated, false);
  assert.equal(game.enemies.length, 1);
  game.killEnemy(clone);
  assert.equal(game.screen, 'won');
  assert.equal(game.bossDefeated, true);
  assert.ok(game.save.completed.includes(50));
});

test('the Dracula clone enters at its announced mirrored portal instead of teleporting to the arena edge', () => {
  const {game} = realGame(50);
  const boss = game.spawn('boss', -1);
  Object.assign(boss, {phase:'active', x:300, health:boss.maxHealth / 2, speed:0, abilityTimer:10000});
  game.update(.01);
  const clone = game.enemies.find(enemy => enemy.draculaClone);
  assert.ok(clone);
  const portalX = clone.x;
  assert.equal(portalX, 660);
  assert.equal(clone.phase, 'warning');
  advanceGame(game, clone.warning + .02);
  assert.equal(clone.phase, 'active');
  assert.ok(Math.abs(clone.x - portalX) < 3, 'only normal movement after activation may move the clone');
});

test('a swept bullet hits the nearest egg or enemy, so eggs cannot absorb shots through closer enemies', () => {
  for (const eggCloser of [false, true]) {
    const {game} = realGame(30);
    const boss = game.spawn('boss', 1);
    Object.assign(boss, {phase:'active', x:850, speed:0, abilityTimer:10000});
    boss.skillTimers.web = boss.skillTimers.egg = 10000;
    const enemy = game.spawn('skeleton', 1);
    Object.assign(enemy, {phase:'active', x:eggCloser ? 620 : 600, speed:0, abilityTimer:10000, health:3, maxHealth:3});
    const egg = {owner:boss, x:eggCloser ? 600 : 620, y:438, w:28, h:32, health:2, maxHealth:2,
      landed:true, hatchTime:5, age:0, hit:0};
    game.bossEggs.push(egg);
    game.bullets.push({x:580, y:411, dir:1, life:1});
    game.update(.05);
    assert.equal(game.bullets.length, 0);
    assert.equal(egg.health, eggCloser ? 1 : 2);
    assert.equal(enemy.health, eggCloser ? 3 : 2);
  }
});
