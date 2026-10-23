'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh({boss = false, mini = false, difficulty = 'normal'} = {}) {
  const context = vm.createContext({});
  for (const file of ['abyss-config.js','underwater-config.js','middle-sea-config.js','predator-sea-config.js','deep-sea-config.js','final-sea-config.js','campaign.js', 'bosses.js', 'golem.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, storage:{getItem() { return null; }, setItem() {}}, random:() => .5});
  game.settings.difficulty = difficulty;
  game.start(boss ? 60 : mini ? 61 : 51);
  game.settings.effects = false;
  game.spawnTimer = game.ammoTimer = 10000;
  game.player.health = game.player.maxHealth = 30;
  game.player.invulnerable = 0;
  const enemy = game.spawn(boss ? 'boss' : mini ? 'miniGolem' : 'golem', -1);
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

test('missed rocks break on the ground without changing bone projectiles', () => {
  const {game,enemy}=fresh();
  game.settings.effects=true;
  const rock={kind:'rock',owner:enemy,x:750,y:437,vx:0,vy:60,w:20,h:20,life:4,damage:1};
  const bone={kind:'bone',x:700,y:437,vx:0,vy:60,w:12,h:10,life:4};
  game.enemyShots=[rock,bone];
  const health=game.player.health;
  game.update(.05);
  assert.equal(game.enemyShots.includes(rock),false);
  assert.ok(game.enemyShots.includes(bone));
  assert.equal(game.player.health,health);
  assert.ok(game.particles.length>0,'impact produces fragments');
});

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

test('regular, mini, and king golems warn a fixed stone trajectory and release only one volley', () => {
  for (const options of [{}, {mini:true}, {boss:true}]) {
    const {game, enemy} = fresh(options);
    enemy.x = 80; enemy.rockCooldown = 0;
    game.update(.01);
    assert.equal(enemy.golemState, 'rock-windup');
    assert.equal(enemy.tell, true);
    const warning = enemy.golemTimer, x = enemy.x;
    const originX = enemy.rockOriginX, originY = enemy.rockOriginY;
    const targetX = enemy.rockAimX, targetY = enemy.rockAimY;
    game.player.x = 650;
    advance(game, warning - .01);
    assert.equal(game.enemyShots.length, 0);
    assert.equal(enemy.x, x, 'movement freezes during the warning');
    assert.equal(enemy.rockAimX, targetX, 'aim cannot follow a player moving after the warning');
    assert.ok(enemy.skillWarning.remaining > 0, 'the private warning survives the boss HUD update');
    advance(game, .01);
    assert.equal(enemy.golemState, 'rock-throw');
    const count = options.boss ? 3 : 1;
    assert.equal(game.enemyShots.length, count);
    const center = game.enemyShots[options.boss ? 1 : 0];
    const angle = Math.atan2(targetY - originY, targetX - originX);
    assert.ok(Math.abs(Math.atan2(center.vy, center.vx) - angle) < 1e-9);
    assert.ok(Math.abs(Math.hypot(center.vx, center.vy) - (options.boss ? 280 : options.mini ? 240 : 260)) < 1e-9);
    assert.equal(center.damage, 1);
    assert.equal(center.owner, enemy);
    assert.equal(center.kind, 'rock');
    assert.equal(center.type, 'rock');
    assert.equal(enemy.rockCooldown, options.boss ? 5 : options.mini ? 6.5 : 6);
    advance(game, .17);
    assert.ok(enemy.throwProgress > .4 && enemy.throwProgress < .6);
    assert.equal(game.enemyShots.length, count, 'release animation does not create shots every frame');
    advance(game, .17);
    assert.equal(enemy.golemState, 'recover');
    advance(game, .35);
    assert.equal(enemy.golemState, 'approach');
  }
});

test('stones use the live projectile collision: one HP, active shield protection, and jump avoidance', () => {
  for (const protection of ['none', 'stored', 'active', 'jump']) {
    const {game, enemy, hits} = fresh();
    enemy.x = 80; enemy.rockCooldown = 0;
    waitFor(game, () => game.enemyShots.length > 0);
    enemy.rockCooldown = 10000;
    const shot = game.enemyShots[0], oldX = shot.x, oldY = shot.y;
    advance(game, .1);
    assert.ok(Math.abs(shot.x - oldX - shot.vx * .1) < 1e-8);
    assert.ok(Math.abs(shot.y - oldY - shot.vy * .1) < 1e-8);
    if (protection === 'stored' || protection === 'active') game.shieldCount = 1;
    if (protection === 'active') { game.activateShield(); game.player.invulnerable = 0; }
    if (protection === 'jump') {
      waitFor(game, () => Math.abs(game.player.x - shot.x) < 120, 2);
      game.jump(); advance(game, 1);
      assert.equal(hits.filter(hit => hit.kind === 'rock').length, 0);
      assert.equal(game.player.health, 30);
    } else {
      waitFor(game, () => hits.some(hit => hit.kind === 'rock'), 2);
      const rockHit = hits.find(hit => hit.kind === 'rock');
      assert.equal(rockHit.damage, protection === 'active' ? 0 : 1);
      assert.equal(game.player.health, protection === 'active' ? 30 : 29);
      assert.equal(game.player.shieldHits, protection === 'active' ? 2 : 0);
      assert.equal(game.enemyShots.length, 0, 'a collided rock is consumed once');
      advance(game, .5);
      assert.equal(hits.filter(hit => hit.kind === 'rock').length, 1);
    }
  }
});

test('late pressure shortens the stone cooldown and speeds projectiles without shortening safety floors', () => {
  const releases = [], speeds = [];
  for (const late of [false, true]) {
    const {game, enemy} = fresh();
    enemy.x = 80;
    if (late) game.levelTime = 1000;
    releases.push(waitFor(game, () => game.enemyShots.length > 0, 6));
    speeds.push(Math.hypot(game.enemyShots[0].vx, game.enemyShots[0].vy));
  }
  assert.ok(releases[1] < releases[0] - 1);
  assert.ok(speeds[1] > speeds[0] && speeds[1] < speeds[0] * 1.4);
  for (const [difficulty, floor] of Object.entries({story:1.1, normal:.9, hard:.75})) {
    const {game, enemy} = fresh({difficulty});
    enemy.x = 80; enemy.rockCooldown = 0; game.levelTime = 1000;
    game.update(.01);
    const warning = enemy.golemTimer;
    assert.ok(warning >= floor);
    advance(game, warning - .01);
    assert.equal(game.enemyShots.length, 0);
    advance(game, .01);
    assert.equal(game.enemyShots.length, 1);
  }
});

test('stones respect ranged distance and leave the close-range club priority intact', () => {
  const {game, enemy} = fresh();
  enemy.x = game.player.x - 200; enemy.rockCooldown = 0; enemy.golemCooldown = 10000;
  game.update(.01);
  assert.equal(enemy.golemState, 'approach');
  assert.equal(game.enemyShots.length, 0);
  enemy.x = game.player.x - 240; game.update(.01);
  assert.equal(enemy.golemState, 'rock-windup');
  const close = fresh({mini:true});
  close.enemy.x = close.game.player.x - 75;
  close.enemy.rockCooldown = close.enemy.golemCooldown = 0;
  close.game.update(.01);
  assert.equal(close.enemy.golemState, 'windup');
  assert.equal(close.game.golemZones[0].kind, 'club');
});

test('portals and pause freeze stone cooldowns, warnings, and in-flight projectiles', () => {
  const {game, enemy} = fresh();
  enemy.x = 80; enemy.phase = 'warning'; enemy.warning = 8;
  advance(game, 2);
  assert.equal(enemy.rockCooldown, 3);
  assert.equal(enemy.golemActiveTime, 0);
  enemy.phase = 'active'; enemy.rockCooldown = 0; game.update(.01);
  const warning = enemy.golemTimer, clock = enemy.golemActiveTime;
  game.togglePause(); advance(game, 3);
  assert.equal(enemy.golemTimer, warning);
  assert.equal(enemy.golemActiveTime, clock);
  assert.equal(game.enemyShots.length, 0);
  game.togglePause(); advance(game, warning);
  const shot = game.enemyShots[0], position = {x:shot.x, y:shot.y, life:shot.life};
  game.togglePause(); advance(game, 3);
  assert.deepEqual({x:shot.x, y:shot.y, life:shot.life}, position);
});

test('the fixed rage clock cancels a pending stone throw with no late projectile release', () => {
  const {game, enemy} = fresh({boss:true});
  enemy.x = 80; enemy.rockCooldown = 0; enemy.golemActiveTime = 9.9;
  game.update(.01);
  assert.equal(enemy.golemState, 'rock-windup');
  advance(game, .09);
  assert.ok(Math.abs(enemy.golemActiveTime - 10) < 1e-8);
  assert.equal(enemy.golemState, 'rage-windup');
  assert.equal(enemy.rageTime, 5);
  assert.equal(enemy.throwProgress, 0);
  advance(game, 5);
  assert.equal(enemy.rageTime, 0);
  assert.equal(enemy.golemState, 'approach');
  assert.equal(game.enemyShots.filter(shot => shot.kind === 'rock').length, 0);
});

test('stone volleys share the twelve-projectile cap and cleanup preserves other owners', () => {
  for (const existing of [0, 11, 12]) {
    const {game, enemy} = fresh({boss:true});
    enemy.x = 80; enemy.rockCooldown = 0;
    game.enemyShots = Array.from({length:existing}, () => ({type:'bone', x:850, y:100, vx:0, vy:0, w:12, h:10, life:20}));
    waitFor(game, () => enemy.golemState === 'rock-throw');
    assert.equal(game.enemyShots.length, Math.min(12, existing + 3));
    assert.equal(game.enemyShots.filter(shot => shot.kind === 'rock').length, Math.min(3, 12 - existing));
  }
  const {game, enemy, skills} = fresh();
  enemy.x = 80; enemy.rockCooldown = 0;
  const second = game.spawn('miniGolem', 1);
  Object.assign(second, {phase:'active', x:900, speed:0, rockCooldown:0});
  waitFor(game, () => game.enemyShots.length === 2);
  const secondRock = game.enemyShots.find(shot => shot.owner === second);
  const ownOtherSkill = {kind:'bone', owner:enemy};
  game.enemyShots.push(ownOtherSkill);
  skills.cleanup(game, enemy);
  assert.equal(game.enemyShots.some(shot => shot.owner === enemy && shot.kind === 'rock'), false);
  assert.ok(game.enemyShots.includes(secondRock));
  assert.ok(game.enemyShots.includes(ownOtherSkill), 'Golem cleanup only removes its owned rocks');
  game.killEnemy(second);
  assert.equal(game.enemyShots.includes(secondRock), false);
  game.start(51, {retry:true});
  assert.equal(game.enemyShots.length, 0);
  enemy.dead = false; enemy.health = 1; enemy.phase = 'active'; enemy.x = 80;
  game.enemies.push(enemy); skills.setup(game, enemy); enemy.rockCooldown = 0;
  waitFor(game, () => game.enemyShots.length > 0);
  game.goHome();
  assert.equal(game.enemyShots.length, 0);
});
