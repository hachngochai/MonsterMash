'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh({boss = false, difficulty = 'normal'} = {}) {
  const context = vm.createContext({});
  for (const file of ['campaign.js', 'bosses.js', 'golem.js', 'wolves.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, storage:{getItem() { return null; }, setItem() {}}, random:() => .5});
  game.settings.difficulty = difficulty; game.start(boss ? 70 : 62);
  game.settings.effects = false; game.spawnTimer = game.ammoTimer = 10000;
  game.player.health = game.player.maxHealth = 30; game.player.invulnerable = 0;
  const enemy = game.spawn(boss ? 'boss' : 'werewolf', -1);
  Object.assign(enemy, {phase:'active', x:game.player.x - 180, y:438, speed:0});
  const hits = [], hurt = game.hurt.bind(game);
  game.hurt = attacker => {
    const before = game.player.health, shields = game.player.shieldHits;
    hurt(attacker);
    hits.push({time:enemy.bloodActiveTime, kind:attacker.kind, damage:before - game.player.health,
      shieldHits:shields - game.player.shieldHits, clawIndex:attacker.clawIndex, forceHit:attacker.forceHit});
  };
  return {game, enemy, hits, skills:context.MM.WolfCombat};
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

function enterBlood(fixture) {
  const {game, enemy, skills} = fixture;
  enemy.health = Math.floor(enemy.maxHealth / 2) + 1;
  assert.equal(skills.hit(game, enemy, 1), true);
  advance(game, 1.2);
  assert.equal(enemy.wolfState, 'approach');
  assert.equal(enemy.intangible, false);
  return fixture;
}

test('werewolves lock a visible target before a parabolic leap and pounce only once', () => {
  const {game, enemy, hits} = fresh();
  enemy.wolfCooldown = 0; game.update(.01);
  assert.equal(enemy.wolfState, 'windup');
  assert.equal(enemy.wolfTimer, .9);
  assert.equal(game.wolfZones[0].phase, 'warning');
  const target = game.wolfZones[0].x;
  advance(game, .89); assert.equal(hits.length, 0);
  advance(game, .01); assert.equal(enemy.wolfState, 'leap');
  advance(game, .31); assert.ok(enemy.y < 315, 'the wolf actually leaves the ground');
  assert.equal(game.wolfZones[0].x, target);
  advance(game, .31);
  assert.equal(enemy.wolfState, 'pounce');
  assert.equal(enemy.y, 438);
  assert.equal(hits.length, 1); assert.equal(hits[0].damage, 1);
  advance(game, .17); assert.equal(hits.length, 1);
});

test('moving out of the locked pounce and jumping over the landing both avoid it', () => {
  for (const escape of ['move', 'jump']) {
    const {game, enemy, hits} = fresh();
    enemy.wolfCooldown = 0; game.update(.01);
    const target = enemy.wolfTargetX;
    if (escape === 'move') game.player.x = 850;
    else { advance(game, 1.38); game.jump(); }
    waitFor(game, () => enemy.wolfState === 'pounce');
    assert.equal(enemy.wolfTargetX, target);
    assert.equal(game.wolfZones[0].x, target);
    assert.equal(hits.length, 0);
    assert.equal(game.player.health, 30);
  }
});

test('werewolf movement and cooldown accelerate with pressure but warning floors remain intact', () => {
  const travel = [], cooldown = [];
  for (const rate of [1, 2]) {
    const {game, enemy} = fresh();
    game.getPressure = () => ({attackRate:rate, moveRate:1 + (rate - 1) * .35, warningFloor:.9});
    enemy.x = 70; enemy.speed = 60; advance(game, .5); travel.push(enemy.x - 70);
    enemy.x = game.player.x - 180; enemy.speed = 0; enemy.wolfCooldown = 3;
    cooldown.push(waitFor(game, () => enemy.wolfState === 'windup', 4));
    assert.ok(enemy.wolfTimer >= .9);
  }
  assert.ok(travel[1] > travel[0]); assert.ok(cooldown[1] < cooldown[0] - 1);
  for (const [difficulty, floor] of [['story', 1.1], ['normal', .9], ['hard', .75]]) {
    const {game, enemy} = fresh({difficulty});
    enemy.wolfCooldown = 0; game.update(.01);
    assert.ok(enemy.wolfTimer >= floor);
    const seconds = enemy.wolfTimer; advance(game, seconds - .01);
    assert.equal(enemy.wolfState, 'windup'); advance(game, .01);
    assert.equal(enemy.wolfState, 'leap');
  }
});

test('a stored shield does not block pounces; an active shield spends one hit', () => {
  for (const active of [false, true]) {
    const {game, enemy, hits} = fresh(); game.shieldCount = 2;
    enemy.wolfCooldown = 0; game.update(.01);
    waitFor(game, () => enemy.wolfState === 'leap');
    if (active) { game.activateShield(); game.player.invulnerable = 0; }
    waitFor(game, () => enemy.wolfState === 'pounce');
    assert.equal(hits.length, 1); assert.equal(hits[0].damage, active ? 0 : 1);
    assert.equal(game.shieldCount, active ? 1 : 2);
    assert.equal(game.player.shieldHits, active ? 2 : 0);
  }
});

test('the first half-health hit refills the king once, doubles dimensions, and cancels old attacks', () => {
  const {game, enemy, skills} = fresh({boss:true});
  enemy.wolfCooldown = 0; game.update(.01); assert.equal(game.wolfZones.length, 1);
  const width = enemy.baseW, height = enemy.baseH, hp = enemy.maxHealth;
  enemy.health = hp / 2 + 1;
  assert.equal(skills.hit(game, enemy, 1), true);
  assert.equal(enemy.health, hp); assert.equal(enemy.bloodMoon, true);
  assert.equal(enemy.w, width * 2); assert.equal(enemy.h, height * 2);
  assert.equal(enemy.wolfState, 'transform'); assert.equal(enemy.transformTime, 1.2);
  assert.equal(enemy.intangible, true); assert.equal(game.wolfZones.length, 0);
  assert.equal(game.player.weaponMode, 'sniper');
  assert.equal(skills.hit(game, enemy, 5), false); assert.equal(enemy.health, hp);
  assert.equal(game.shoot(-1), false, 'the player sees the phase change before firing');
  advance(game, 1.2); assert.equal(enemy.intangible, false);
  assert.equal(skills.hit(game, enemy, hp / 2), true);
  assert.equal(enemy.health, hp / 2, 'phase two cannot heal or transform a second time');
  assert.equal(enemy.w, width * 2); assert.equal(enemy.h, height * 2);
});

test('a lethal shot and simultaneous follow-up bullets cannot skip the blood moon phase', () => {
  const {game, enemy} = fresh({boss:true});
  enemy.health = 2; enemy.wolfCooldown = 10000;
  for (let index = 0; index < 2; index++) game.bullets.push({x:enemy.x - 45,y:411,dir:1,life:1,speed:1280,damage:5});
  game.update(.01);
  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(enemy.bloodMoon, true); assert.equal(enemy.wolfState, 'transform');
  assert.equal(enemy.dead, undefined); assert.ok(game.enemies.includes(enemy));
  assert.equal(game.bossDefeated, false);
});

test('blood moon repeats every three seconds and completes both claws before the next leap at 60 and 20 FPS', () => {
  for (const difficulty of ['story', 'normal', 'hard']) for (const step of [1/60,.05]) {
    const {game, enemy, hits} = enterBlood(fresh({boss:true, difficulty}));
    advance(game, 2.99,step); assert.equal(game.wolfZones.length, 0);
    advance(game, .01,step);
    for(let cycle=1;cycle<=4;cycle++){
      const start=cycle*3;
      assert.equal(enemy.wolfState,'blood-windup');
      assert.equal(enemy.nextBloodAt,start+3);
      assert.ok(enemy.wolfTimer>=game.getPressure(enemy).warningFloor);
      advance(game,2.99,step);
      const claws=hits.filter(hit=>hit.kind==='wolf-claw');
      assert.equal(claws.length,cycle*2,`${difficulty}, dt=${step}, cycle=${cycle}`);
      const pair=claws.slice(-2);
      assert.deepEqual(pair.map(hit=>hit.clawIndex),[1,2]);
      assert.ok(pair.every(hit=>hit.damage===2&&hit.forceHit&&hit.time>start&&hit.time<start+3));
      assert.ok(pair[1].time-pair[0].time>=.6);
      assert.equal(game.player.health,30-cycle*4);
      assert.equal(enemy.wolfState,'recover','the second impact completes before the next cycle');
      if(cycle<4)advance(game,.01,step);
    }
  }
});

test('both blood claws can be blocked despite shield invulnerability between strikes', () => {
  const {game, enemy, hits} = enterBlood(fresh({boss:true}));
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  game.shieldCount = 1; assert.equal(game.activateShield(), true);
  advance(game, 4);
  const claws = hits.filter(hit => hit.kind === 'wolf-claw');
  assert.equal(claws.length, 2);
  assert.ok(claws.every(hit => hit.damage === 0 && hit.shieldHits === 1));
  assert.equal(game.player.health, 30); assert.equal(game.player.shieldHits, 1);
});

test('blood claws hold the target through both strikes and reacquire it for the next three-second cycle', () => {
  const {game, enemy, hits} = enterBlood(fresh({boss:true}));
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  const target = enemy.wolfTargetX; game.player.x = 850;
  advance(game, 1.3); assert.equal(enemy.wolfState, 'blood-leap');
  advance(game, 1); assert.equal(game.wolfZones[0].x, target);
  advance(game, .69);
  assert.equal(enemy.wolfTargetX, target);
  assert.equal(hits.length, 0); assert.equal(game.player.health, 30);
  advance(game,.01);
  assert.equal(enemy.wolfState,'blood-windup');
  assert.equal(enemy.wolfTargetX,850);
  assert.equal(game.wolfZones[0].x,850);
  assert.ok(enemy.wolfTimer>=game.getPressure(enemy).warningFloor);
});

test('sniper consumes five ammo, deals five HP, and recharges for one real second', () => {
  const {game, enemy} = enterBlood(fresh({boss:true}));
  game.player.ammo = 15; enemy.x = game.player.x - 150;
  const health = enemy.health;
  assert.equal(game.shoot(-1), true); assert.equal(game.player.ammo, 10);
  assert.equal(game.player.shotTimer, 1); assert.equal(game.player.shotCooldown, 1);
  assert.equal(game.bullets[0].damage, 5); assert.equal(game.bullets[0].speed, 1280);
  assert.equal(game.shoot(-1), false); advance(game, .12);
  assert.equal(enemy.health, health - 5);
  advance(game, .87); assert.equal(game.shoot(-1), false);
  advance(game, .01); assert.equal(game.shoot(-1), true); assert.equal(game.player.ammo, 5);
  advance(game, 1); assert.equal(game.shoot(1), true); assert.equal(game.player.ammo, 0);
  advance(game, 1); assert.equal(game.shoot(1), false);
});

test('sniper cannot fire with fewer than five ammo and falling supplies can restore a shot', () => {
  const {game} = enterBlood(fresh({boss:true}));
  game.player.ammo = 4; assert.equal(game.shoot(1), false);
  assert.equal(game.player.ammo, 4); assert.equal(game.bullets.length, 0);
  const crate = game.dropAmmo(game.player.x); assert.ok(crate);
  advance(game, 3); assert.equal(game.ammoCrates.length, 0);
  assert.ok(game.player.ammo >= 5); const ammo = game.player.ammo;
  assert.equal(game.shoot(1), true); assert.equal(game.player.ammo, ammo - 5);
});

test('a lethal sniper hit in phase two defeats the king and completes level 70', () => {
  const {game, enemy} = enterBlood(fresh({boss:true}));
  game.levelKills = game.level.target; game.regularSpawned = game.level.target; game.bossSpawned = true;
  enemy.health = 5; game.player.ammo = 5;
  assert.equal(game.shoot(-1), true); advance(game, .2);
  assert.equal(enemy.dead, true); assert.equal(enemy.health, 0);
  assert.equal(game.bossDefeated, true); assert.equal(game.screen, 'won');
  assert.ok(game.save.completed.includes(70)); assert.equal(game.save.resume, 70);
  assert.equal(game.wolfZones.length, 0); assert.equal(game.getWeaponProfile().kind, 'normal');
});

test('portals and pause freeze wolf movement, transform, combo timers, and sniper cooldown', () => {
  const fixture = fresh({boss:true}), {game, enemy, skills} = fixture;
  enemy.phase = 'warning'; enemy.warning = 8; advance(game, 2);
  assert.equal(enemy.wolfActiveTime, 0); assert.equal(enemy.wolfCooldown, 3);
  enemy.phase = 'active'; enemy.health = 26; skills.hit(game, enemy, 1);
  advance(game, .3); game.togglePause(); const transformTime = enemy.transformTime;
  advance(game, 5); assert.equal(enemy.transformTime, transformTime);
  game.togglePause(); advance(game, transformTime);
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  game.player.ammo = 10; game.shoot(1);
  const bloodTime = enemy.bloodActiveTime, timer = enemy.wolfTimer, shotTimer = game.player.shotTimer;
  game.togglePause(); advance(game, 5);
  assert.equal(enemy.bloodActiveTime, bloodTime); assert.equal(enemy.wolfTimer, timer);
  assert.equal(game.wolfZones[0].timer, timer); assert.equal(game.player.shotTimer, shotTimer);
});

test('wolf death cleans only its own warnings and restores the normal gun; retry and home clear attacks', () => {
  const {game, enemy} = enterBlood(fresh({boss:true}));
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  const normal = game.spawn('werewolf', 1);
  Object.assign(normal, {phase:'active',x:game.player.x + 180,speed:0,wolfCooldown:0}); game.update(.01);
  const normalZone = game.wolfZones.find(zone => zone.owner === normal); assert.ok(normalZone);
  game.killEnemy(enemy);
  assert.ok(game.wolfZones.every(zone => zone.owner !== enemy)); assert.ok(game.wolfZones.includes(normalZone));
  assert.equal(game.getWeaponProfile().kind, 'normal'); assert.equal(game.player.weaponMode, 'normal');
  game.player.ammo = 5; game.player.shotTimer = 0; assert.equal(game.shoot(-1), true);
  assert.equal(game.player.ammo, 4); assert.equal(game.bullets.at(-1).damage, 1);
  game.start(70, {retry:true}); assert.equal(game.wolfZones.length, 0);
  assert.equal(game.player.weaponMode, 'normal'); assert.equal(game.enemies.length, 0);
  const replacement = game.spawn('boss', -1);
  Object.assign(replacement, {phase:'active',x:game.player.x - 180,speed:0,wolfCooldown:0}); game.update(.01);
  assert.equal(game.wolfZones.length, 1); game.goHome(); assert.equal(game.wolfZones.length, 0);
  assert.equal(game.player.weaponMode, 'normal');
});
