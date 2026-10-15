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

test('the green zombie wards every fifteen active seconds, heals two HP once, and blocks bullets for two seconds', () => {
  const {game, boss, skills} = fixture(20, 2);
  boss.nextTsunamiAt = boss.nextGluttonAt = Infinity;
  boss.health = boss.maxHealth = 100;
  for (let hit = 0; hit < 35; hit++) { assert.equal(skills.hit(game, boss), true); boss.health--; }
  assert.equal(boss.health, 65, 'bullet counts no longer trigger an early defensive window');
  assert.equal(boss.hardenedTime, 0);
  advance(skills, game, 14.99);
  assert.equal(skills.hit(game, boss), true);
  assert.equal(boss.health, 65, 'no healing before fifteen real seconds, even under pressure');
  advance(skills, game, .01);
  assert.equal(boss.health, 67);
  assert.equal(boss.hardenedTime, 2);
  for (let hit = 0; hit < 25; hit++) assert.equal(skills.hit(game, boss), false);
  assert.equal(boss.health, 67);
  advance(skills, game, 1.999);
  assert.equal(skills.hit(game, boss), false, 'pressure does not shorten immunity');
  assert.equal(boss.health, 67, 'the two-second defensive window does not heal every frame');
  advance(skills, game, .001);
  assert.equal(skills.hit(game, boss), true);
  boss.health--;
  advance(skills, game, 12.999);
  assert.equal(skills.hit(game, boss), true, 'the boss remains vulnerable for thirteen seconds after its shield');
  assert.equal(boss.health, 66);
  advance(skills, game, .001);
  assert.equal(boss.health, 68);
  assert.equal(boss.hardenedTime, 2);
  assert.equal(skills.hit(game, boss), false, 'the next shield begins at thirty active seconds');
});

test('periodic green-zombie healing respects max HP and defensive time freezes in portals or on pause', () => {
  const {game, boss, skills} = fixture(20, 20);
  boss.nextTsunamiAt = boss.nextGluttonAt = Infinity;
  boss.health = boss.maxHealth - 1;
  advance(skills, game, 14.9);
  boss.phase = 'warning';
  advance(skills, game, 20);
  assert.equal(boss.health, boss.maxHealth - 1);
  assert.equal(boss.hardenedTime, 0);
  boss.phase = 'active'; game.screen = 'paused';
  advance(skills, game, 20);
  assert.equal(boss.health, boss.maxHealth - 1);
  game.screen = 'playing'; advance(skills, game, .1);
  assert.equal(boss.health, boss.maxHealth, 'healing is capped at max health');
  assert.equal(boss.hardenedTime, 2);
  game.screen = 'paused'; advance(skills, game, 20);
  assert.equal(boss.hardenedTime, 2);
  game.screen = 'playing'; boss.phase = 'warning'; advance(skills, game, 20);
  assert.equal(boss.hardenedTime, 2);
  boss.phase = 'active'; advance(skills, game, 15);
  assert.equal(boss.health, boss.maxHealth, 'later shields cannot over-heal a full-health boss');
  assert.equal(boss.hardenedTime, 2);
});

test('ordinary enemies and other bosses do not acquire the green-zombie periodic ward', () => {
  for (const level of [10, 30, 40, 50]) {
    const {game, boss, skills} = fixture(level);
    assert.equal(skills.hit(game, boss), true);
    assert.equal(boss.bulletArmor, undefined);
    assert.equal(boss.armorHits, undefined);
    for (const type of ['zombie', 'greenZombie']) {
      const regular = game.spawn(type, -1);
      assert.equal(regular.skillTimers, undefined);
      for (let hit = 0; hit < 20; hit++) assert.equal(skills.hit(game, regular), true);
      assert.equal(regular.bulletArmor, undefined);
    }
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

test('eggs are thrown every five real seconds and hatch three seconds after landing', () => {
  const {game, boss, skills} = fixture(30, 2);
  boss.skillTimers.web = 1000;
  advance(skills, game, 4.99);
  assert.equal(game.bossEggs.length, 0);
  advance(skills, game, .01);
  assert.equal(game.bossEggs.length, 1);
  const egg = game.bossEggs[0];
  assert.equal(egg.landed, false);
  assert.equal(egg.hatchTime, 3);
  const travel = (438 - egg.y) / egg.vy;
  advance(skills, game, travel);
  assert.equal(egg.landed, true);
  assert.equal(egg.y, 438);
  assert.equal(egg.x, 360);
  assert.ok(Math.abs(egg.hatchTime - 3) < 1e-8);
  advance(skills, game, 2.99);
  assert.equal(game.enemies.filter(enemy => enemy.minion).length, 0);
  assert.equal(game.bossEggs.length, 1, 'hatching does not accelerate the five-second laying cadence');
  advance(skills, game, .01);
  const brood = game.enemies.filter(enemy => enemy.minion);
  assert.equal(brood.length, 5);
  assert.equal(game.bossEggs.includes(egg), false);
  assert.ok(brood.every(enemy => enemy.phase === 'active' && enemy.health === 1 && enemy.w === 23 && enemy.h === 18));
  assert.ok(brood.every(enemy => enemy.abilityTimer === Infinity));
  assert.ok(brood.every(enemy => enemy.spiderling && enemy.bulletUntargetable && enemy.ownerBoss === boss));
  advance(skills, game, 10 - 5 - travel - 3);
  assert.equal(game.bossEggs.length, 1, 'a second egg is still laid at ten active seconds');
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

test('the shared spiderling cap counts other broods but ignores unrelated summon types', () => {
  const {game, boss, skills} = fixture(30);
  boss.skillTimers.web = 1000; boss.skillTimers.egg = 0;
  for (let index = 0; index < 15; index++) {
    const child = game.spawn('spider', -1);
    Object.assign(child, {minion:true, spiderling:true, ownerBoss:{health:10}, phase:'active'});
  }
  for (let index = 0; index < 5; index++) {
    const child = game.spawn('zombie', -1);
    Object.assign(child, {minion:true, ownerBoss:boss, phase:'active'});
  }
  skills.update(game, .01);
  assert.equal(game.bossEggs.length, 0, 'other broods also reserve slots in the fifteen-spiderling limit');
  for (const child of game.enemies.filter(enemy => enemy.spiderling).slice(0, 5)) child.dead = true;
  advance(skills, game, .3);
  assert.equal(game.bossEggs.length, 1, 'the five unrelated zombie minions do not reserve spiderling slots');
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

function realBrood(game, skills, x = 720) {
  const boss = game.spawn('boss', 1);
  Object.assign(boss, {phase:'active', x:850, y:438, speed:0, abilityTimer:10000});
  boss.skillTimers.web = 10000; boss.skillTimers.egg = 0;
  skills.update(game, .01);
  boss.skillTimers.egg = 10000;
  const egg = game.bossEggs.find(item => item.owner === boss);
  Object.assign(egg, {x, targetX:x, y:438, landed:true, hatchTime:.01});
  skills.update(game, .01);
  const brood = game.enemies.filter(enemy => enemy.spiderling && enemy.ownerBoss === boss);
  assert.equal(brood.length, 5);
  for (const child of brood) child.speed = 0;
  return {boss, brood};
}

test('real bullets pass through tiny invincible spiderlings and still hit bosses, eggs, and ordinary spiders', () => {
  for (const target of ['boss', 'egg', 'spider']) {
    const {game, skills} = realGame(30);
    const {boss, brood} = realBrood(game, skills);
    brood.forEach(child => { child.x = 900; });
    brood[0].x = 580;
    let victim;
    if (target === 'boss') {
      boss.x = 620; victim = boss;
    } else if (target === 'egg') {
      victim = {owner:boss, x:600, targetX:600, y:438, w:28, h:32, health:2, maxHealth:2,
        landed:true, hatchTime:3, age:0, hit:0};
      game.bossEggs.push(victim);
    } else {
      victim = game.spawn('spider', 1);
      Object.assign(victim, {phase:'active', x:600, y:438, speed:0, abilityTimer:10000, health:3, maxHealth:3});
    }
    const before = victim.health;
    // A low shot actually crosses the 18px body; a normal chest-height shot
    // would miss a spiderling even without the explicit target exclusion.
    game.bullets.push({x:560, y:430, dir:1, life:1});
    game.update(.05);
    assert.equal(victim.health, before - 1, `${target} behind a spiderling receives the shot`);
    assert.equal(game.bullets.length, 0);
    assert.ok(brood.every(child => child.health === 1 && !child.dead));
    assert.equal(game.totalKills, 0);
  }
  const {game, skills} = realGame(30);
  const {brood} = realBrood(game, skills);
  brood.forEach(child => { child.x = 900; }); brood[0].x = 580;
  game.bullets.push({x:560, y:430, dir:1, life:1});
  game.update(.05);
  assert.equal(game.bullets.length, 1, 'a spiderling alone does not consume ammunition already in flight');
  assert.equal(brood[0].health, 1);
});

test('spiderlings cannot be killed through direct damage hooks or award score, quota, or shield charge', () => {
  const {game, skills} = realGame(30);
  const {brood} = realBrood(game, skills);
  game.totalKills = 9; game.score = 100; game.levelKills = 7;
  for (const child of brood) {
    assert.equal(skills.hit(game, child), false);
    game.killEnemy(child);
    assert.equal(child.dead, undefined);
    assert.equal(child.health, 1);
    assert.ok(game.enemies.includes(child));
  }
  assert.equal(game.totalKills, 9);
  assert.equal(game.score, 100);
  assert.equal(game.levelKills, 7);
  assert.equal(game.shieldCount, 0);
  assert.equal(game.pickups.length, 0);
});

test('real spiderling contact costs one HP and stuns controls for exactly 1.5 active seconds', () => {
  const {game, skills} = realGame(30);
  const {brood} = realBrood(game, skills);
  const child = brood[0]; child.x = game.player.x;
  game.player.invulnerable = 0;
  const health = game.player.health;
  game.updateEnemy(child, .01);
  assert.equal(game.player.health, health - 1);
  assert.equal(game.player.stunTime, 1.5);
  assert.equal(child.health, 1);
  const x = game.player.x, ammo = game.player.ammo;
  child.x = 900;
  game.keys.add('ArrowRight'); game.keys.add('KeyD'); game.jump();
  assert.equal(game.player.jumpBuffer, 0);
  assert.equal(game.shoot(1), false);
  advanceGame(game, .7);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  game.togglePause();
  const remaining = game.player.stunTime;
  advanceGame(game, 5);
  assert.equal(game.player.stunTime, remaining);
  game.togglePause();
  game.keys.add('ArrowRight'); game.keys.add('KeyD');
  advanceGame(game, .79);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  advanceGame(game, .02);
  assert.ok(game.player.x > x);
  assert.equal(game.player.ammo, ammo - 1);
  assert.ok(game.player.stunGrace > 0);
});

test('overlapping spiderlings cannot extend a stun or bypass its recovery window', () => {
  const {game, skills} = realGame(30);
  const {brood} = realBrood(game, skills);
  const child = brood[0];
  game.player.invulnerable = 0; child.x = game.player.x;
  game.updateEnemy(child, .01);
  const health = game.player.health;
  game.player.invulnerable = 0;
  child.x = game.player.x;
  game.updateEnemy(child, .01);
  assert.equal(game.player.health, health);
  assert.equal(game.player.stunTime, 1.5);
  child.x = 900;
  advanceGame(game, 1.5);
  assert.equal(game.player.stunTime, 0);
  assert.ok(game.player.stunGrace > 0);
  child.x = game.player.x; game.player.y = 438; game.player.invulnerable = 0;
  game.updateEnemy(child, .01);
  assert.equal(game.player.health, health);
  assert.equal(game.player.stunTime, 0);
  child.x = 900; advanceGame(game, .61);
  child.x = game.player.x; game.player.y = 438; game.player.invulnerable = 0;
  game.updateEnemy(child, .01);
  assert.equal(game.player.health, health - 1, 'a later attack remains dangerous after recovery');
  assert.equal(game.player.stunTime, 1.5);
});

test('only an activated shield blocks spiderling damage and stun, with the normal three-hit budget', () => {
  const {game, skills} = realGame(30);
  const {brood} = realBrood(game, skills);
  const child = brood[0];
  game.shieldCount = 2; game.player.invulnerable = 0; child.x = game.player.x;
  const health = game.player.health;
  game.updateEnemy(child, .01);
  assert.equal(game.player.health, health - 1, 'stored shields do not automatically activate');
  assert.equal(game.shieldCount, 2);
  assert.equal(game.player.stunTime, 1.5);
  game.player.stunTime = game.player.stunGrace = game.player.invulnerable = 0;
  game.player.y = 438;
  assert.equal(game.activateShield(), true);
  for (let hit = 0; hit < 3; hit++) {
    child.x = game.player.x; game.player.invulnerable = 0;
    game.updateEnemy(child, .01);
    assert.equal(game.player.shieldHits, 2 - hit);
    assert.equal(game.player.health, health - 1);
    assert.equal(game.player.stunTime, 0);
    assert.equal(child.health, 1, 'shield contact does not kill the mini spider');
    child.x = game.player.x;
    game.updateEnemy(child, .01);
    assert.equal(game.player.shieldHits, 2 - hit, 'same-frame overlap respects the contact invulnerability window');
  }
  assert.equal(game.player.shieldTime, 0);
  assert.equal(game.shieldCount, 1);
});

test('pause freezes a landed egg before its third second and spiderling contacts cannot act while paused', () => {
  const {game, skills} = realGame(30);
  const {boss, brood} = realBrood(game, skills);
  const egg = {owner:boss, x:700, targetX:700, y:438, w:28, h:32, health:2, maxHealth:2,
    landed:true, hatchTime:.02, age:0, hit:0};
  game.bossEggs.push(egg);
  game.player.invulnerable = 0;
  const health = game.player.health, child = brood[0]; child.x = game.player.x;
  game.togglePause(); advanceGame(game, 3);
  skills.spiderlingHit(game, child);
  assert.equal(game.player.health, health);
  assert.equal(game.player.stunTime, 0);
  assert.equal(egg.hatchTime, .02);
  assert.equal(game.enemies.filter(enemy => enemy.spiderling).length, 5);
  child.x = 900;
  game.togglePause(); advanceGame(game, .03);
  assert.equal(game.bossEggs.length, 0);
  assert.equal(game.enemies.filter(enemy => enemy.spiderling).length, 10);
});

test('spider boss defeat cleans its unkillable brood while preserving unrelated enemies; home and retry reset all', () => {
  const {game, skills} = realGame(30);
  const {boss, brood} = realBrood(game, skills);
  const otherBoss = game.spawn('boss', -1);
  Object.assign(otherBoss, {phase:'active', speed:0, abilityTimer:10000});
  const otherChild = game.spawn('spider', -1);
  Object.assign(otherChild, {spiderling:true, bulletUntargetable:true, ownerBoss:otherBoss, minion:true});
  const unrelated = game.spawn('zombie', -1); unrelated.minion = true;
  game.killEnemy(boss);
  assert.ok(brood.every(child => !game.enemies.includes(child)));
  assert.ok(game.enemies.includes(otherChild));
  assert.ok(game.enemies.includes(unrelated));
  const health = game.player.health;
  game.player.invulnerable = 0;
  skills.spiderlingHit(game, brood[0]);
  assert.equal(game.player.health, health, 'orphaned spiderlings cannot continue attacking');
  assert.equal(game.totalKills, 1, 'retiring a brood gives no additional kill rewards');
  game.start(30, {retry:true});
  assert.equal(game.enemies.length, 0); assert.equal(game.bossEggs.length, 0);
  realBrood(game, skills);
  game.goHome();
  assert.equal(game.enemies.length, 0); assert.equal(game.bossEggs.length, 0);
  assert.equal(game.player.stunTime, 0);
});

test('real bullets damage the zombie freely before its timed ward, then are consumed until two seconds expire', () => {
  const {game} = realGame(20);
  const boss = game.spawn('boss', 1);
  Object.assign(boss, {phase:'active', x:700, y:438, speed:0, abilityTimer:10000, health:50, maxHealth:50});
  boss.nextTsunamiAt = boss.nextGluttonAt = Infinity;
  function bullet() {
    game.bullets.push({x:boss.x - boss.w / 2 - 4, y:411, dir:1, life:1});
    game.update(.01);
    assert.equal(game.bullets.length, 0);
  }
  for (let hit = 0; hit < 10; hit++) bullet();
  assert.equal(boss.health, 40);
  assert.equal(boss.hardenedTime, 0, 'ten bullets do not activate armor');
  advanceGame(game, 14.89);
  assert.equal(boss.health, 40);
  game.update(.01);
  assert.equal(boss.health, 42, 'the fifteen-second activation heals two HP');
  assert.equal(boss.hardenedTime, 2);
  bullet();
  assert.equal(boss.health, 42);
  advanceGame(game, 1.98);
  bullet();
  assert.equal(boss.health, 41, 'damage resumes after two active seconds');
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
