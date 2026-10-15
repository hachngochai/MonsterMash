'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fixture(random = .1) {
  const context = vm.createContext({});
  for (const file of ['campaign.js', 'bosses.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, random:() => random,
    storage:{getItem() { return null; }, setItem() {}}});
  game.start(20); game.spawnTimer = game.ammoTimer = 10000; game.settings.effects = false;
  const boss = game.spawn('boss', -1);
  Object.assign(boss, {phase:'active', x:100, speed:0, abilityTimer:10000});
  game.player.health = game.player.maxHealth = 30; game.player.invulnerable = 0;
  return {game, boss, skills:context.MM.BossCombat};
}

function advance(game, seconds, skills = null, step = 1 / 60) {
  while (seconds > 1e-9) {
    const dt = Math.min(step, seconds);
    if (skills) skills.update(game, dt); else game.update(dt);
    seconds -= dt;
  }
}

const children = game => game.enemies.filter(enemy => enemy.tsunamiChild);

test('Tsunami announces its locked direction and summons exactly twenty one-HP children every ten real seconds', () => {
  for (const [random, direction] of [[.1, 1], [.9, -1]]) {
    const {game, boss, skills} = fixture(random);
    boss.nextGluttonAt = Infinity; game.player.y = 340;
    const quota = game.regularSpawned;
    advance(game, 9.2, skills);
    assert.equal(children(game).length, 0);
    assert.equal(boss.tsunamiWarning.direction, direction);
    game.random = () => direction === 1 ? .9 : .1;
    advance(game, .79, skills);
    assert.equal(children(game).length, 0);
    advance(game, .01, skills);
    assert.equal(children(game).length, 20);
    assert.ok(children(game).every(child => child.tsunamiDirection === direction && child.dir === direction));
    assert.ok(children(game).every(child => child.health === 1 && child.maxHealth === 1 && child.w === 24 && child.h === 38 && child.speed === 460));
    assert.ok(children(game).every(child => child.minion && child.ownerBoss === boss && child.abilityTimer === Infinity));
    assert.equal(children(game)[19].tsunamiDelay, 19 * .12);
    advance(game, 1, skills);
    const first = children(game)[0], second = children(game)[1];
    assert.ok(Math.abs(Math.abs(first.x - second.x) - 460 * .12) < 1e-6, 'the train retains its spacing');
    advance(game, 3.5, skills);
    assert.equal(children(game).length, 0, 'all twenty leave the arena before the next wave');
    advance(game, .5, skills);
    assert.equal(children(game).length, 0, 'a five-second respite follows the old five-second cycle');
    advance(game, 5, skills);
    assert.equal(children(game).length, 20);
    assert.equal(boss.tsunamiSerial, 2);
    assert.equal(game.regularSpawned, quota); assert.equal(game.levelKills, 0); assert.equal(game.totalKills, 0);
  }
});

test('pressure never shortens Tsunami cadence, and portal phases and pause freeze both new skills', () => {
  const {game, boss, skills} = fixture();
  game.getPressure = () => ({attackRate:20, warningFloor:.9});
  boss.phase = 'warning';
  advance(game, 20, skills);
  assert.equal(boss.zombieClock, 0); assert.equal(children(game).length, 0);
  boss.phase = 'active'; game.screen = 'paused';
  advance(game, 20, skills);
  assert.equal(boss.zombieClock, 0);
  game.screen = 'playing'; boss.nextGluttonAt = Infinity; game.player.y = 340;
  advance(game, 9.99, skills);
  assert.equal(children(game).length, 0);
  advance(game, .01, skills);
  assert.equal(children(game).length, 20);
  const position = children(game)[0].x, delay = children(game)[10].tsunamiDelay;
  game.screen = 'paused'; advance(game, 10, skills);
  assert.equal(children(game)[0].x, position); assert.equal(children(game)[10].tsunamiDelay, delay);
});

test('surviving above the fast ground wave has no delayed penalty or incidental score and quota rewards', () => {
  for (const step of [1 / 60, .05]) {
    const {game, boss, skills} = fixture();
    boss.nextGluttonAt = Infinity; game.player.y = 340;
    advance(game, 14.6, skills, step);
    assert.equal(children(game).length, 0);
    assert.equal(game.player.health, 30); assert.equal(game.score, 0); assert.equal(game.levelKills, 0); assert.equal(game.totalKills, 0);
    assert.equal(game.pickups.length, 0);
  }
});

test('one active shield hit protects against the entire twenty-body train, including when it was the final shield hit', () => {
  for (const shieldHits of [1, 3]) {
    const {game, boss} = fixture();
    boss.nextGluttonAt = Infinity; boss.nextTsunamiAt = .01;
    game.player.invulnerable = 0; game.player.shieldTime = 5; game.player.shieldHits = shieldHits;
    advance(game, 4.6);
    assert.equal(game.player.health, 30);
    assert.equal(game.player.shieldHits, shieldHits - 1, 'the wave consumes exactly one shield hit');
    assert.equal(children(game).length, 0);
  }
});

test('unshielded children deal normal contact damage and can be killed by real swept bullets without increasing the stage quota', () => {
  const {game, boss, skills} = fixture();
  boss.nextGluttonAt = Infinity; boss.nextTsunamiAt = .01;
  skills.update(game, .01);
  const child = children(game)[0];
  child.x = game.player.x; game.player.invulnerable = 0;
  skills.update(game, .001);
  assert.equal(game.player.health, 29);
  const target = children(game)[1];
  Object.assign(target, {phase:'active', tsunamiDelay:0, x:650});
  game.bullets.push({x:target.x - target.w / 2 - 5, y:411, dir:1, life:1});
  game.update(.01);
  assert.equal(target.dead, true); assert.equal(game.bullets.length, 0);
  assert.equal(game.totalKills, 1); assert.equal(game.levelKills, 0);
});

test('Phàm ăn gives a real warning, then heals at most five HP and pursues for one second with one two-HP impact', () => {
  const {game, boss} = fixture();
  boss.nextTsunamiAt = Infinity; boss.nextGluttonAt = 1;
  boss.x = game.player.x - 100; boss.health = boss.maxHealth - 8;
  advance(game, .5);
  assert.equal(boss.gluttonState, 'warning'); assert.equal(boss.health, boss.maxHealth - 8);
  assert.equal(boss.x, game.player.x - 100, 'the tell does not secretly rush the player');
  advance(game, .5);
  assert.equal(boss.gluttonState, 'chase'); assert.equal(boss.health, boss.maxHealth - 3);
  assert.equal(boss.gluttonTimer, 1);
  advance(game, .99);
  assert.equal(boss.gluttonState, 'chase'); assert.equal(game.player.health, 28);
  assert.equal(boss.health, boss.maxHealth - 3, 'contact does not repeatedly heal');
  advance(game, .01);
  assert.equal(boss.gluttonState, null); assert.equal(boss.y, 438);
  assert.equal(boss.abilityState, 'ground'); assert.equal(boss.abilityTimer, 4.5);
});

test('Phàm ăn healing respects max HP and its pursuit tracks a moving player rather than a stale target', () => {
  const {game, boss, skills} = fixture();
  boss.nextTsunamiAt = Infinity; boss.nextGluttonAt = .01;
  boss.health = boss.maxHealth - 2; boss.x = 100;
  skills.update(game, .01);
  assert.equal(boss.health, boss.maxHealth);
  advance(game, .2, skills); const x = boss.x;
  game.player.x = 40;
  advance(game, .2, skills);
  assert.ok(boss.x < x); assert.equal(boss.gluttonTarget.x, 40);
  advance(game, .6, skills);
  assert.equal(boss.gluttonState, null);
  assert.equal(boss.health, boss.maxHealth);
});

test('Phàm ăn leaps from a ledge and its pursuit can overlap the periodic fifteen-second ward', () => {
  for (const shielded of [false, true]) {
    const {game, boss, skills} = fixture();
    boss.nextTsunamiAt = Infinity; boss.nextGluttonAt = 14.5; boss.zombieClock = 14.49;
    boss.health = boss.maxHealth - 10;
    Object.assign(boss, {x:game.player.x - 40, y:170, abilityState:'ledge', platform:{x:440,y:170,w:150,dir:1,offset:0,walkDir:1}});
    game.player.shieldTime = shielded ? 5 : 0; game.player.shieldHits = shielded ? 3 : 0;
    skills.update(game, .01);
    assert.equal(boss.gluttonJump, true);
    assert.equal(boss.health, boss.maxHealth - 5, 'the chase still heals five HP');
    advance(game, .2, skills); assert.ok(boss.y < 170, 'the arc rises before descending toward the player');
    for (let index = 0; index < 10; index++) assert.equal(skills.hit(game, boss), true);
    assert.equal(boss.hardenedTime, 0, 'ten bullets do not create a defensive shield');
    advance(game, .3, skills);
    assert.equal(boss.gluttonState, 'chase');
    assert.equal(boss.health, boss.maxHealth - 4, 'the periodic ward independently heals one HP');
    assert.equal(boss.hardenedTime, 1); assert.equal(skills.hit(game, boss), false);
    advance(game, .5, skills);
    assert.equal(game.player.health, shielded ? 30 : 28);
    assert.equal(game.player.shieldHits, shielded ? 2 : 0);
    assert.equal(boss.gluttonState, null); assert.equal(boss.y, 438); assert.equal(boss.platform, null);
    assert.ok(boss.hardenedTime > .49 && boss.hardenedTime < .51);
  }
});

test('Phàm ăn repeats every eight active seconds and a missed one-second pursuit does not hurt at a distance', () => {
  const {game, boss, skills} = fixture();
  boss.nextTsunamiAt = Infinity; game.player.x = 900; game.player.y = 340; boss.x = 50;
  boss.health = boss.maxHealth - 10;
  advance(game, 7.99, skills); assert.equal(boss.health, boss.maxHealth - 10);
  advance(game, .01, skills); assert.equal(boss.health, boss.maxHealth - 5);
  advance(game, 1, skills);
  assert.equal(boss.gluttonState, null); assert.equal(game.player.health, 30);
  assert.equal(boss.nextGluttonAt, 16);
  advance(game, 7, skills); assert.equal(boss.health, boss.maxHealth);
});

test('boss death removes owned children and chase warnings while leaving other minions untouched', () => {
  const {game, boss, skills} = fixture();
  boss.nextTsunamiAt = boss.nextGluttonAt = .01;
  skills.update(game, .01);
  const other = game.spawn('greenZombie', 1); other.minion = true;
  assert.equal(children(game).length, 20);
  game.killEnemy(boss);
  assert.equal(children(game).length, 0); assert.ok(game.enemies.includes(other));
  assert.equal(boss.gluttonState, null); assert.equal(boss.tsunamiWarning, null); assert.equal(boss.tsunamiWaves.length, 0);
  assert.equal(game.totalKills, 1, 'retiring summoned children awards no extra kills');
});
