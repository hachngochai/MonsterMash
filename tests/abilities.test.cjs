'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh(level = 1, difficulty = 'normal') {
  const context = vm.createContext({});
  for (const file of ['abyss-config.js','underwater-config.js','campaign.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
  }
  const game = new context.MM.Game({ headless: true, storage: { getItem() { return null; }, setItem() {} }, random: () => .5 });
  game.settings.effects = false;
  game.settings.difficulty = difficulty;
  game.start(level);
  game.spawnTimer = 10000;
  game.ammoTimer = 10000;
  game.player.invulnerable = 1000;
  return { game, MM: context.MM };
}

function advance(game, seconds, method = 'update') {
  while (seconds > 1e-8) {
    const dt = Math.min(1 / 60, seconds);
    game[method](dt);
    seconds -= dt;
  }
}

function record(game, enemy, seconds) {
  const samples = [];
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    samples.push({ state: enemy.abilityState, x: enemy.x, y: enemy.y, bat: enemy.isBat, tell: enemy.tell });
    game.update(1 / 60);
    assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y));
    assert.ok(enemy.x >= 0 && enemy.x <= 960);
    assert.ok(enemy.y <= 438);
  }
  return samples;
}

function activeAbility(game, type, ability) {
  const enemy = game.spawn(type, -1);
  game.configureAbility(enemy, ability);
  enemy.phase = 'active';
  enemy.warning = 0;
  return enemy;
}

test('ammunition is finite: each successful shot spends one round and empty/cooldown shots spend none', () => {
  for (const id of [1, 20, 50]) {
    const { game } = fresh(id);
    const initial = game.player.ammo;
    assert.ok(Number.isInteger(initial) && initial > 0 && initial <= game.player.maxAmmo);
    assert.equal(game.shoot(1), true);
    assert.equal(game.player.ammo, initial - 1);
    assert.equal(game.shoot(-1), false, 'cooldown cannot spend a second round');
    assert.equal(game.player.ammo, initial - 1);
    while (game.player.ammo > 0) {
      game.player.shotTimer = 0;
      assert.equal(game.shoot(-1), true);
    }
    assert.equal(game.bullets.length, initial);
    game.player.shotTimer = 0;
    for (let attempt = 0; attempt < 10; attempt += 1) assert.equal(game.shoot(1), false);
    assert.equal(game.player.ammo, 0);
    assert.equal(game.bullets.length, initial);
  }
});

test('ammo crates fall from above the screen, land on the floor, then expire', () => {
  const { game } = fresh();
  const crate = game.dropAmmo(800);
  assert.ok(crate);
  assert.equal(crate.y, -40);
  assert.equal(crate.landed, false);
  advance(game, .5, 'updateAmmo');
  assert.ok(crate.y > -40 && crate.y < 438);
  advance(game, 3, 'updateAmmo');
  assert.equal(crate.landed, true);
  assert.equal(crate.y, 438);
  const landingY = crate.y;
  advance(game, .2, 'updateAmmo');
  assert.equal(crate.y, landingY);
  assert.ok(crate.life > 0);
  crate.life = .02;
  advance(game, .05, 'updateAmmo');
  assert.equal(game.ammoCrates.includes(crate), false);
});

test('only physical pickup replenishes ammo, including while the player is airborne, and capacity is respected', () => {
  const { game } = fresh();
  game.player.ammo = 0;
  const missed = game.dropAmmo(850);
  advance(game, 3, 'updateAmmo');
  assert.equal(game.player.ammo, 0);
  assert.ok(game.ammoCrates.includes(missed));
  game.player.x = missed.x;
  advance(game, 1 / 60, 'updateAmmo');
  assert.equal(game.player.ammo, missed.amount);
  assert.equal(game.ammoCrates.includes(missed), false);
  game.player.ammo = 0;
  game.player.y = 330;
  game.player.grounded = false;
  const airborne = game.dropAmmo(game.player.x);
  airborne.y = game.player.y - 15;
  advance(game, 1 / 60, 'updateAmmo');
  assert.equal(game.player.ammo, airborne.amount);
  assert.equal(game.ammoCrates.includes(airborne), false);
  game.player.ammo = game.player.maxAmmo - 1;
  const overfill = game.dropAmmo(game.player.x);
  overfill.y = game.player.y - 15;
  advance(game, 1 / 60, 'updateAmmo');
  assert.equal(game.player.ammo, game.player.maxAmmo);
});

test('periodic supply continues with no ammo and after the wave quota, with at most three active crates', () => {
  const { game } = fresh(50);
  game.regularSpawned = game.level.target;
  game.player.ammo = 0;
  game.player.x = 60;
  game.ammoTimer = .01;
  game.update(.05);
  assert.equal(game.ammoCrates.length, 1);
  assert.equal(game.player.ammo, 0, 'falling supplies do not grant ammo remotely');
  advance(game, 1);
  assert.equal(game.player.ammo, 0);
  game.dropAmmo(600);
  game.dropAmmo(800);
  assert.equal(game.ammoCrates.length, 3);
  const denied = game.dropAmmo(700);
  assert.ok(!denied);
  assert.equal(game.ammoCrates.length, 3);
  game.ammoTimer = .01;
  game.update(.05);
  assert.equal(game.ammoCrates.length, 3);
  game.ammoCrates[0].life = .01;
  game.ammoCrates[0].landed = true;
  game.ammoCrates[0].y = 438;
  advance(game, .05);
  assert.ok(game.ammoCrates.length <= 3);
  game.ammoTimer = .01;
  game.update(.05);
  assert.equal(game.ammoCrates.length, 3, 'supply resumes after a slot is available');
  assert.equal(game.player.ammo, 0);
});

test('ammo crates and timers freeze during pause', () => {
  const { game } = fresh();
  const crate = game.dropAmmo(800);
  const timer = game.ammoTimer;
  const life = crate.life;
  game.togglePause();
  game.update(100);
  assert.equal(crate.y, -40);
  assert.equal(crate.life, life);
  assert.equal(game.ammoTimer, timer);
});

test('zombies patrol a moving ledge, warn before diving, then return to ground combat', () => {
  const { game } = fresh(8);
  const enemy = activeAbility(game, 'zombie', 'ledge');
  const samples = record(game, enemy, 14);
  const ledge = samples.filter(sample => sample.state === 'ledge');
  assert.ok(ledge.length > 15);
  assert.ok(Math.max(...ledge.map(sample => sample.x)) - Math.min(...ledge.map(sample => sample.x)) > 10);
  assert.ok(ledge.every(sample => sample.y < 300));
  assert.ok(samples.some(sample => sample.tell > 0));
  assert.ok(samples.some(sample => sample.state === 'diving'));
  assert.ok(samples.some(sample => sample.state === 'ground'));
  assert.equal(enemy.y, 438);
  assert.equal(game.totalKills, 0);
});

test('spiders hang and bob on their silk before a fixed-position fall', () => {
  const { game } = fresh(14);
  const enemy = activeAbility(game, 'spider', 'hanging');
  const samples = record(game, enemy, 10);
  const hanging = samples.filter(sample => sample.state === 'hanging');
  const diving = samples.filter(sample => sample.state === 'diving');
  assert.ok(hanging.length > 15);
  assert.ok(Math.max(...hanging.map(sample => sample.y)) - Math.min(...hanging.map(sample => sample.y)) > 5);
  assert.ok(samples.some(sample => sample.tell > 0));
  assert.ok(diving.length > 1);
  assert.ok(Math.max(...diving.map(sample => sample.x)) - Math.min(...diving.map(sample => sample.x)) < 1);
  assert.ok(samples.some(sample => sample.state === 'ground'));
  assert.equal(game.totalKills, 0);
});

test('ghosts patrol horizontally with a vertical sine motion before descending', () => {
  const { game } = fresh(24);
  const enemy = activeAbility(game, 'ghost', 'airborne');
  const samples = record(game, enemy, 14);
  const airborne = samples.filter(sample => sample.state === 'airborne');
  assert.ok(airborne.length > 15);
  assert.ok(Math.max(...airborne.map(sample => sample.x)) - Math.min(...airborne.map(sample => sample.x)) > 10);
  assert.ok(Math.max(...airborne.map(sample => sample.y)) - Math.min(...airborne.map(sample => sample.y)) > 5);
  assert.ok(samples.some(sample => sample.tell > 0));
  assert.ok(samples.some(sample => sample.state === 'diving'));
  assert.ok(samples.some(sample => sample.state === 'ground'));
  assert.equal(game.totalKills, 0);
});

test('a vampire morphs into a rising bat and lands without resetting its HP or counting extra enemies', () => {
  const { game } = fresh(34);
  const enemy = game.spawn('vampire', -1);
  enemy.phase = 'active';
  enemy.x = 150;
  enemy.health = 2;
  const maximum = enemy.maxHealth;
  game.morphToBat(enemy);
  assert.equal(enemy.isBat, true);
  const samples = record(game, enemy, 18);
  for (const state of ['rising', 'airborne', 'diving', 'ground']) assert.ok(samples.some(sample => sample.state === state), state);
  assert.ok(samples.some(sample => sample.bat && sample.y < 250));
  assert.ok(samples.some(sample => sample.state === 'ground' && !sample.bat));
  assert.ok(game.enemies.includes(enemy), 'morphs retain the same tracked enemy');
  assert.equal(game.enemies.length, 1);
  assert.equal(enemy.health, 2);
  assert.equal(enemy.maxHealth, maximum);
  assert.equal(game.levelKills, 0);
  assert.equal(game.totalKills, 0);
  game.killEnemy(enemy);
  game.killEnemy(enemy);
  assert.equal(game.levelKills, 1);
  assert.equal(game.totalKills, 1);
});

test('bosses inherit their archetype abilities without duplicating health or kill counts', () => {
  for (const [id, ability, state] of [[20, 'ledge', 'ledge'], [30, 'hanging', 'hanging'], [40, 'airborne', 'airborne'], [50, 'bat', 'rising']]) {
    const { game } = fresh(id);
    const boss = activeAbility(game, 'boss', ability);
    assert.equal(boss.boss, true);
    assert.equal(boss.abilityState, state);
    const hp = boss.health;
    record(game, boss, 4);
    assert.equal(boss.health, hp);
    assert.equal(game.enemies.length, 1);
    assert.equal(game.totalKills, 0);
  }
});

test('ammo carries into the next level and retry restores its checkpoint supply', () => {
  const { game } = fresh(4);
  game.player.ammo = 2;
  game.start(5, { carry: true });
  assert.equal(game.player.ammo, 2 + game.level.initialAmmo);
  const checkpointAmmo = game.player.ammo;
  game.shoot(1);
  assert.equal(game.player.ammo, checkpointAmmo - 1);
  game.player.ammo = game.player.maxAmmo;
  game.start(5, { retry: true });
  assert.equal(game.player.ammo, checkpointAmmo);
  assert.equal(game.ammoCrates.length, 0);
  game.start(1);
  assert.equal(game.player.ammo, game.level.initialAmmo);
});

test('a full gun leaves its crate available until ammunition is actually spent', () => {
  const { game } = fresh();
  game.player.ammo = game.player.maxAmmo;
  const crate = game.dropAmmo(game.player.x);
  crate.y = 438;
  crate.landed = true;
  advance(game, 1 / 60, 'updateAmmo');
  assert.ok(game.ammoCrates.includes(crate));
  assert.equal(game.player.ammo, game.player.maxAmmo);
  game.shoot(1);
  advance(game, 1 / 60, 'updateAmmo');
  assert.equal(game.player.ammo, game.player.maxAmmo);
  assert.equal(game.ammoCrates.includes(crate), false);
});

test('boss arrival grants one physical crate, and never refills an empty gun remotely', () => {
  const { game } = fresh(30);
  game.player.ammo = 0;
  game.levelKills = game.level.target;
  game.checkCompletion();
  assert.equal(game.player.ammo, 0);
  assert.equal(game.ammoCrates.length, 1);
  assert.equal(game.ammoCrates[0].y, -40);
  assert.equal(game.enemies[0].abilityState, 'hanging');
  game.checkCompletion();
  assert.equal(game.ammoCrates.length, 1);
});

test('the final boss completes a bat and shadow-drop cycle without resetting HP or duplicating itself', () => {
  const { game } = fresh(50);
  game.regularSpawned = game.level.target;
  game.levelKills = game.level.target;
  game.checkCompletion();
  const boss = game.enemies.find(enemy => enemy.boss);
  assert.ok(boss);
  boss.health -= 1;
  const health = boss.health;
  const samples = record(game, boss, 30);
  const compact = samples.map(sample => sample.state).filter((state, index, states) => index === 0 || state !== states[index - 1]);
  assert.ok(compact.join(',').includes('rising,airborne,diving,ground,shadow-windup,diving,ground,rising'), compact.join(','));
  assert.ok(samples.some(sample => sample.state === 'shadow-windup' && sample.tell && !sample.bat));
  assert.equal(boss.health, health);
  assert.equal(game.enemies.length, 1);
  assert.equal(game.enemies[0], boss);
  assert.equal(game.totalKills, 0);
  assert.equal(game.levelKills, game.level.target);
  assert.equal(game.screen, 'playing');
  game.killEnemy(boss);
  game.killEnemy(boss);
  assert.equal(game.totalKills, 1);
  assert.equal(game.levelKills, game.level.target);
  assert.equal(game.screen, 'won');
});

test('the skeleton boss telegraphs bounded bone volleys whose shots can hurt or be blocked by shields', () => {
  const { game } = fresh(10);
  const boss = game.spawn('boss', -1);
  boss.phase = 'active';
  boss.x = 150;
  boss.speed = 0;
  advance(game, 4.1);
  assert.equal(boss.abilityState, 'volley-windup');
  assert.equal(boss.tell, true);
  assert.equal(game.enemyShots.length, 0);
  advance(game, 1.3);
  assert.equal(game.enemyShots.length, 3);
  for (let volley = 0; volley < 10; volley += 1) game.fireBoneVolley(boss);
  assert.equal(game.enemyShots.length, 12);
  assert.equal(game.totalKills, 0);
  assert.equal(game.levelKills, 0);
  game.enemies = [];
  const shot = () => ({ x: game.player.x, y: game.player.y - 27, vx: 0, vy: 0, w: 12, h: 10, life: 1, type: 'bone' });
  game.player.invulnerable = 0;
  const health = game.player.health;
  game.enemyShots = [shot()];
  game.update(1 / 60);
  assert.equal(game.player.health, health - 1);
  assert.equal(game.enemyShots.length, 0);
  game.shieldCount = 1;
  game.activateShield();
  game.player.invulnerable = 0;
  game.enemyShots = [shot()];
  game.update(1 / 60);
  assert.equal(game.player.health, health - 1);
  assert.equal(game.player.shieldHits, 2);
  assert.equal(game.enemyShots.length, 0);
  assert.equal(game.totalKills, 0);
  assert.equal(game.levelKills, 0);
});

test('elapsed pressure starts at one, rises smoothly, and remains bounded for every difficulty', () => {
  const floors = { story: 1.1, normal: .9, hard: .75 };
  for (const difficulty of ['story', 'normal', 'hard']) {
    for (const id of [1, 25, 50]) {
      const { game } = fresh(id, difficulty);
      const boss = game.spawn('boss', -1);
      for (const enemy of [null, boss]) {
        const warmup = enemy ? game.level.bossWarmup : game.level.pressureWarmup;
        const ramp = enemy ? game.level.bossRampSeconds : game.level.pressureRampSeconds;
        const cap = 1 + ((enemy ? game.level.bossPressureCap : game.level.enemyPressureCap) - 1) * game.tuning.pressureMultiplier;
        let previous = 1;
        for (const elapsed of [0, warmup / 2, warmup, warmup + ramp / 4, warmup + ramp / 2, warmup + ramp, warmup + ramp * 10]) {
          if (enemy) enemy.combatTime = elapsed;
          else game.levelTime = elapsed;
          const pressure = game.getPressure(enemy);
          assert.ok(pressure.attackRate >= previous && pressure.attackRate <= cap + 1e-9);
          assert.ok(pressure.moveRate >= 1 && pressure.moveRate < 1.34);
          assert.ok(pressure.diveRate >= 1 && pressure.diveRate < 1.34);
          assert.ok(pressure.projectileRate >= 1 && pressure.projectileRate < 1.38);
          assert.ok(pressure.warning >= floors[difficulty]);
          if (elapsed <= warmup) {
            assert.equal(pressure.attackRate, 1);
            assert.equal(pressure.moveRate, 1);
            assert.equal(pressure.diveRate, 1);
          }
          if (elapsed === warmup + ramp / 2) assert.ok(Math.abs(pressure.attackRate - (1 + cap) / 2) < 1e-9);
          if (elapsed >= warmup + ramp) assert.ok(Math.abs(pressure.attackRate - cap) < 1e-9);
          previous = pressure.attackRate;
        }
      }
    }
  }
});

test('boss pressure uses its own active combat clock; pause freezes clocks and new stages reset pressure', () => {
  const { game } = fresh(50);
  game.levelTime = 1000;
  const boss = game.spawn('boss', -1);
  assert.equal(game.getPressure(boss).attackRate, 1, 'a late boss arrival starts at its normal cadence');
  game.update(.05);
  assert.equal(boss.combatTime, 0, 'portal warnings are excluded from boss combat time');
  boss.phase = 'active';
  game.update(.05);
  assert.equal(boss.combatTime, .05);
  boss.combatTime = 30;
  const levelTime = game.levelTime;
  const combatTime = boss.combatTime;
  const pressure = JSON.stringify(game.getPressure(boss));
  game.togglePause();
  advance(game, 5);
  assert.equal(game.levelTime, levelTime);
  assert.equal(boss.combatTime, combatTime);
  assert.equal(JSON.stringify(game.getPressure(boss)), pressure);
  game.start(2, { carry: true });
  assert.equal(game.levelTime, 0);
  assert.equal(game.getPressure().attackRate, 1);
  assert.equal(game.enemies.length, 0);
  const nextBoss = game.spawn('boss', -1);
  assert.equal(nextBoss.combatTime, 0);
  assert.equal(game.getPressure(nextBoss).attackRate, 1);
});

test('elapsed pressure accelerates genuine skill cycles, movement and dives', () => {
  for (const [id, type, state, target] of [[8, 'zombie', 'ledge', 'diving'], [14, 'spider', 'hanging', 'diving'], [24, 'ghost', 'airborne', 'diving'], [34, 'vampire', 'ground', 'rising']]) {
    const elapsed = [];
    for (const late of [false, true]) {
      const { game } = fresh(id);
      const enemy = state === 'ground' ? game.spawn(type, -1) : activeAbility(game, type, state);
      enemy.phase = 'active';
      enemy.abilityTimer = 6;
      if (late) game.levelTime = 1000;
      let seconds = 0;
      while (enemy.abilityState !== target && seconds < 15) { game.update(1 / 60); seconds += 1 / 60; }
      assert.equal(enemy.abilityState, target);
      elapsed.push(seconds);
    }
    assert.ok(elapsed[1] < elapsed[0] - .4, `${type}: ${elapsed.join(' / ')} seconds`);
  }
  const travel = [];
  const descent = [];
  for (const late of [false, true]) {
    const { game } = fresh(24);
    if (late) game.levelTime = 1000;
    const ground = game.spawn('skeleton', -1);
    ground.phase = 'active';
    ground.x = 100;
    const startX = ground.x;
    game.update(.05);
    travel.push(ground.x - startX);
    game.enemies = [];
    const diving = activeAbility(game, 'spider', 'hanging');
    diving.abilityState = 'diving';
    diving.y = 200;
    diving.diveSpeed = 300;
    game.update(.05);
    descent.push(diving.y - 200);
  }
  assert.ok(travel[1] > travel[0] && travel[1] < travel[0] * 1.34);
  assert.ok(descent[1] > descent[0] && descent[1] < descent[0] * 1.34);
});

test('late boss volleys arrive sooner and their bone velocity rises within a modest bound', () => {
  const times = [];
  const speeds = [];
  for (const late of [false, true]) {
    const { game } = fresh(10);
    const boss = game.spawn('boss', -1);
    boss.phase = 'active';
    boss.x = 150;
    boss.speed = 0;
    boss.abilityTimer = 6;
    if (late) boss.combatTime = 1000;
    let seconds = 0;
    while (game.enemyShots.length === 0 && seconds < 15) { game.update(1 / 60); seconds += 1 / 60; }
    assert.equal(game.enemyShots.length, 3);
    times.push(seconds);
    speeds.push(Math.hypot(game.enemyShots[0].vx, game.enemyShots[0].vy));
  }
  assert.ok(times[1] < times[0] - .4);
  assert.ok(speeds[1] > speeds[0] && speeds[1] < speeds[0] * 1.38);
});

test('accelerated attacks retain their full announced warning interval in real seconds', () => {
  const floors = { story: 1.1, normal: .9, hard: .75 };
  for (const difficulty of ['story', 'normal', 'hard']) {
    const { game } = fresh(50, difficulty);
    game.levelTime = 1000;
    const enemy = activeAbility(game, 'spider', 'hanging');
    enemy.abilityTimer = 1.6;
    while (!enemy.tell) game.update(1 / 60);
    const locked = enemy.lockedWarning;
    assert.ok(locked >= floors[difficulty]);
    advance(game, locked - .05);
    assert.equal(enemy.abilityState, 'hanging');
    assert.ok(enemy.tell);
    advance(game, .1);
    assert.equal(enemy.abilityState, 'diving');
    const boss = game.spawn('boss', -1);
    boss.phase = 'active';
    boss.combatTime = 1000;
    game.shadowDrop(boss);
    const shadowWarning = boss.lockedWarning;
    assert.ok(shadowWarning >= floors[difficulty]);
    advance(game, shadowWarning - .05);
    assert.equal(boss.abilityState, 'shadow-windup');
    advance(game, .1);
    assert.equal(boss.abilityState, 'diving');
    const { game: bones } = fresh(10, difficulty);
    const skeleton = bones.spawn('boss', -1);
    skeleton.phase = 'active';
    skeleton.x = 150;
    skeleton.speed = 0;
    skeleton.combatTime = 1000;
    skeleton.abilityTimer = .01;
    bones.update(1 / 60);
    assert.equal(skeleton.abilityState, 'volley-windup');
    const boneWarning = skeleton.lockedWarning;
    assert.ok(boneWarning >= floors[difficulty]);
    advance(bones, boneWarning - .05);
    assert.equal(bones.enemyShots.length, 0);
    assert.equal(skeleton.abilityState, 'volley-windup');
    advance(bones, .1);
    assert.equal(bones.enemyShots.length, 3);
  }
});

test('elapsed attack pressure leaves falling ammo quantity and supply cadence unchanged', () => {
  const snapshots = [];
  for (const late of [false, true]) {
    const { game } = fresh(50);
    if (late) game.levelTime = 1000;
    game.player.x = 60;
    game.player.ammo = 0;
    game.ammoTimer = 2.4;
    advance(game, 11);
    snapshots.push({ ammo: game.player.ammo, timer: game.ammoTimer, crates: game.ammoCrates.map(crate => ({ x: crate.x, y: crate.y, amount: crate.amount, landed: crate.landed, life: crate.life })) });
  }
  assert.equal(snapshots[0].ammo, 0);
  assert.equal(snapshots[1].ammo, 0);
  assert.equal(JSON.stringify(snapshots[0]), JSON.stringify(snapshots[1]));
});
