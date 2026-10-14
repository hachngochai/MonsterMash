'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh({boss = false, difficulty = 'normal'} = {}) {
  const context = vm.createContext({});
  for (const file of ['campaign.js', 'bosses.js', 'golem.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, storage:{getItem() { return null; }, setItem() {}}, random:() => .5});
  game.settings.difficulty = difficulty;
  game.start(boss ? 60 : 51);
  game.settings.effects = false;
  game.spawnTimer = game.ammoTimer = 10000;
  game.player.health = game.player.maxHealth = 30;
  game.player.invulnerable = 0;
  const enemy = game.spawn(boss ? 'boss' : 'golem', -1);
  Object.assign(enemy, {phase:'active', x:game.player.x - (boss ? 160 : 110), y:438, speed:0});
  const hits = [];
  const hurt = game.hurt.bind(game);
  game.hurt = attacker => {
    const before = game.player.health, shields = game.player.shieldHits;
    hurt(attacker);
    hits.push({time:game.levelTime, kind:attacker.kind, damage:before - game.player.health,
      shieldHits:shields - game.player.shieldHits, comboIndex:attacker.comboIndex, forceHit:attacker.forceHit});
  };
  return {game, enemy, hits, skills:context.MM.GolemCombat};
}

function advance(game, seconds, step = 1 / 60) {
  while (seconds > 1e-9) { const dt = Math.min(step, seconds); game.update(dt); seconds -= dt; }
}

function waitFor(game, predicate, limit = 15) {
  let elapsed = 0;
  while (!predicate() && elapsed < limit) { game.update(1 / 60); elapsed += 1 / 60; }
  assert.ok(predicate(), `condition was not reached in ${limit} seconds`);
  return elapsed;
}

test('normal golems announce a locked club zone and deal one hit per swing', () => {
  const {game, enemy, hits} = fresh();
  enemy.golemCooldown = 0;
  game.update(.01);
  assert.equal(enemy.golemState, 'windup');
  assert.equal(enemy.golemTimer, .9);
  assert.equal(game.golemZones.length, 1);
  const x = game.golemZones[0].x;
  advance(game, .89);
  assert.equal(hits.length, 0);
  assert.equal(game.golemZones[0].x, x);
  assert.equal(enemy.skillWarning.remaining > 0, true, 'boss combat must not erase the golem warning');
  advance(game, .01);
  assert.equal(enemy.golemState, 'swing');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].damage, 1);
  advance(game, .19);
  assert.equal(hits.length, 1, 'remaining in the impact does not deal repeated frame damage');
});

test('movement out of a warned club zone and a jump both avoid the hit', () => {
  for (const escape of ['move', 'jump']) {
    const {game, enemy, hits} = fresh();
    enemy.golemCooldown = 0; game.update(.01);
    const x = game.golemZones[0].x;
    if (escape === 'move') game.player.x = 800;
    else { advance(game, .78); game.jump(); }
    advance(game, escape === 'move' ? 1.11 : .33);
    assert.equal(hits.length, 0);
    assert.equal(game.player.health, 30);
    assert.equal(enemy.x, 370, 'the golem cannot chase during its announced swing');
    assert.ok(x < 600);
  }
});

test('active shields block a club once while stored shields alone do not protect', () => {
  for (const active of [false, true]) {
    const {game, enemy, hits} = fresh();
    game.shieldCount = 2;
    if (active) { assert.equal(game.activateShield(), true); game.player.invulnerable = 0; }
    enemy.golemCooldown = 0; game.update(.01);
    advance(game, 1.1);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, active ? 0 : 1);
    assert.equal(game.shieldCount, active ? 1 : 2);
    assert.equal(game.player.shieldHits, active ? 2 : 0);
  }
});

test('elapsed pressure accelerates golem movement and cooldown while preserving full warnings', () => {
  const travel = [], cooldowns = [], floors = {story:1.1, normal:.9, hard:.75};
  for (const rate of [1, 2]) {
    const {game, enemy} = fresh();
    game.getPressure = () => ({attackRate:rate, moveRate:1 + (rate - 1) * .25, warningFloor:.9});
    enemy.x = 100; enemy.speed = 50;
    advance(game, .5);
    travel.push(enemy.x - 100);
    enemy.x = game.player.x - 110; enemy.speed = 0; enemy.golemCooldown = 2.7;
    cooldowns.push(waitFor(game, () => enemy.golemState === 'windup', 4));
    assert.equal(enemy.golemTimer, .9);
  }
  assert.ok(travel[1] > travel[0]);
  assert.ok(cooldowns[1] < cooldowns[0] - 1);
  for (const difficulty of Object.keys(floors)) {
    const {game, enemy} = fresh({difficulty});
    enemy.golemCooldown = 0; game.update(.01);
    assert.ok(enemy.golemTimer >= floors[difficulty]);
    const warning = enemy.golemTimer;
    advance(game, warning - .01);
    assert.equal(enemy.golemState, 'windup');
    advance(game, .01);
    assert.equal(enemy.golemState, 'swing');
  }
});

test('the boss starts five-second rage windows exactly at ten and twenty active seconds', () => {
  const {game, enemy} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  game.player.invulnerable = 10000;
  advance(game, 9.99);
  assert.equal(enemy.rageTime, 0);
  advance(game, .01);
  assert.equal(enemy.golemState, 'rage-windup');
  assert.equal(enemy.rageTime, 5);
  assert.equal(enemy.nextRageAt, 20);
  advance(game, 4.999);
  assert.ok(enemy.rageTime > 0 && enemy.rageTime < .002);
  advance(game, .001);
  assert.equal(enemy.rageTime, 0);
  assert.equal(enemy.golemState, 'approach');
  enemy.golemCooldown = 10000;
  advance(game, 4.99);
  assert.equal(enemy.rageTime, 0);
  advance(game, .01);
  assert.equal(enemy.rageTime, 5);
  assert.equal(enemy.nextRageAt, 30);
});

test('rage opens with a jumpable ground shock that stuns for one second and leaves cracks', () => {
  const {game, enemy, hits} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  advance(game, 10);
  assert.equal(game.golemZones[0].kind, 'shock');
  assert.equal(game.golemZones[0].phase, 'warning');
  assert.equal(game.golemZones[0].h, 38);
  advance(game, 1.19);
  assert.equal(hits.length, 0);
  advance(game, .01);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'golem-shock');
  assert.equal(game.player.stunTime, 1);
  assert.equal(game.player.health, 29);
  assert.equal(game.groundCracks.length, 1);
  assert.equal(game.groundCracks[0].owner, enemy);
  assert.ok(game.groundCracks[0].life > 0);
});

test('shielding the opening shock prevents both damage and stun', () => {
  const {game, enemy, hits} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  advance(game, 11.19);
  game.shieldCount = 1; game.activateShield(); game.player.invulnerable = 0;
  advance(game, .01);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].damage, 0);
  assert.equal(game.player.stunTime, 0);
  assert.equal(game.player.shieldHits, 2);
});

test('all three rage slams land for three HP each on every difficulty and fit inside the rage window', () => {
  for (const difficulty of ['story', 'normal', 'hard']) {
    const {game, enemy, hits} = fresh({boss:true, difficulty});
    enemy.golemCooldown = 10000;
    advance(game, 15, .05);
    const slams = hits.filter(hit => hit.kind === 'golem-slam');
    assert.equal(slams.length, 3, difficulty);
    assert.deepEqual(slams.map(hit => hit.comboIndex), [1, 2, 3]);
    assert.ok(slams.every(hit => hit.damage === 3 && hit.forceHit === true));
    assert.ok(slams.every(hit => hit.time > 10 && hit.time < 15));
    assert.ok(slams[1].time - slams[0].time >= .65 && slams[2].time - slams[1].time >= .65);
    assert.equal(game.player.health, 20, 'one shock HP plus nine slam HP');
    assert.equal(enemy.rageTime, 0);
  }
});

test('each distinct combo impact can spend one active shield hit despite prior invulnerability', () => {
  const {game, enemy, hits} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  waitFor(game, () => enemy.golemState === 'combo-windup');
  game.shieldCount = 1; assert.equal(game.activateShield(), true);
  const health = game.player.health;
  advance(game, 3);
  const slams = hits.filter(hit => hit.kind === 'golem-slam');
  assert.equal(slams.length, 3);
  assert.ok(slams.every(hit => hit.damage === 0 && hit.shieldHits === 1));
  assert.equal(game.player.health, health);
  assert.equal(game.player.shieldHits, 0);
  assert.equal(game.player.shieldTime, 0);
});

test('charge and all three slams keep their announced target when the player moves away', () => {
  const {game, enemy, hits} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  waitFor(game, () => enemy.golemState === 'charge');
  const target = enemy.chargeTargetX;
  game.player.x = 850;
  waitFor(game, () => enemy.golemState === 'combo-windup');
  const x = game.golemZones[0].x;
  assert.equal(x, target);
  advance(game, 3);
  assert.equal(hits.filter(hit => hit.kind === 'golem-slam').length, 0);
  assert.equal(enemy.chargeTargetX, target);
  assert.ok(Math.abs(enemy.x - (target - enemy.dir * (enemy.w / 2 + 45))) < 1e-6);
});

test('portal and pause freeze golem skill clocks, warnings, zone lifetime, and rage', () => {
  const {game, enemy} = fresh({boss:true});
  enemy.phase = 'warning'; enemy.warning = 8;
  const cooldown = enemy.golemCooldown;
  advance(game, 2);
  assert.equal(enemy.golemActiveTime, 0);
  assert.equal(enemy.golemCooldown, cooldown);
  enemy.phase = 'active'; enemy.golemCooldown = 10000;
  advance(game, 10.3);
  const state = enemy.golemState, rage = enemy.rageTime, timer = enemy.golemTimer, time = enemy.golemActiveTime;
  const zoneTimer = game.golemZones[0].timer;
  game.togglePause(); advance(game, 5);
  assert.equal(enemy.golemState, state);
  assert.equal(enemy.rageTime, rage);
  assert.equal(enemy.golemTimer, timer);
  assert.equal(enemy.golemActiveTime, time);
  assert.equal(game.golemZones[0].timer, zoneTimer);
});

test('death removes only the killed golem effects; retry and home remove all pending attacks', () => {
  const {game, enemy} = fresh({boss:true});
  enemy.golemCooldown = 10000;
  advance(game, 11.21);
  assert.ok(game.golemZones.length && game.groundCracks.length);
  const second = game.spawn('golem', 1);
  second.phase = 'active'; second.x = 700; second.speed = 0; second.golemCooldown = 0;
  game.player.x = 600;
  game.update(.01);
  const secondZone = game.golemZones.find(zone => zone.owner === second);
  assert.ok(secondZone);
  game.killEnemy(enemy);
  assert.ok(game.golemZones.every(zone => zone.owner !== enemy));
  assert.ok(game.groundCracks.every(crack => crack.owner !== enemy));
  assert.ok(game.golemZones.includes(secondZone));
  game.start(60, {retry:true});
  assert.equal(game.golemZones.length, 0);
  assert.equal(game.groundCracks.length, 0);
  assert.equal(game.enemies.length, 0);
  const newBoss = game.spawn('boss', -1);
  newBoss.phase = 'active'; newBoss.golemCooldown = 0; newBoss.x = game.player.x - 160;
  game.update(.01);
  assert.equal(game.golemZones.length, 1);
  assert.equal(newBoss.golemActiveTime, .01);
  game.goHome();
  assert.equal(game.golemZones.length, 0);
  assert.equal(game.groundCracks.length, 0);
});
