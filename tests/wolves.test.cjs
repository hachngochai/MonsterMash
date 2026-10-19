'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh({boss = false, difficulty = 'normal', howls = false} = {}) {
  const context = vm.createContext({});
  for (const file of ['abyss-config.js','campaign.js', 'bosses.js', 'golem.js', 'wolves.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, storage:{getItem() { return null; }, setItem() {}}, random:() => .5});
  game.settings.difficulty = difficulty; game.start(boss ? 70 : 62);
  game.settings.effects = false; game.spawnTimer = game.ammoTimer = 10000;
  game.player.health = game.player.maxHealth = 30; game.player.invulnerable = 0;
  const enemy = game.spawn(boss ? 'boss' : 'werewolf', -1);
  Object.assign(enemy, {phase:'active', x:game.player.x - 180, y:438, speed:0});
  if (!howls) enemy.nextHowlAt = Infinity;
  const hits = [], hurt = game.hurt.bind(game);
  game.hurt = attacker => {
    const before = game.player.health, shields = game.player.shieldHits;
    hurt(attacker);
    hits.push({time:enemy.bloodActiveTime, kind:attacker.kind, damage:before - game.player.health,
      shieldHits:shields - game.player.shieldHits, clawIndex:attacker.clawIndex, forceHit:attacker.forceHit});
  };
  return {game, enemy, hits, howls, skills:context.MM.WolfCombat, campaign:context.MM.Campaign};
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
  if (!fixture.howls) enemy.nextHowlAt = Infinity;
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

test('blood moon completes two claws in every 1.5-second cycle at 60/20 FPS and uneven frame durations', () => {
  for (const difficulty of ['story', 'normal', 'hard']) for (const step of [1/60,.05,.04,.049]) {
    const {game, enemy, hits} = enterBlood(fresh({boss:true, difficulty}));
    advance(game, 1.49,step); assert.equal(game.wolfZones.length, 0);
    advance(game, .01,step);
    for(let cycle=1;cycle<=4;cycle++){
      const start=cycle*1.5;
      assert.equal(enemy.wolfState,'blood-windup');
      assert.equal(enemy.nextBloodAt,start+1.5);
      assert.equal(enemy.bloodCombo.duration,1.5);
      assert.equal(enemy.bloodCombo.secondAt,1.35);
      assert.ok(enemy.comboFirstImpactAt>=game.getPressure(enemy).warningFloor);
      assert.equal(game.wolfZones[0].total,enemy.comboFirstImpactAt);
      assert.equal(game.wolfZones[0].castDuration,1.5);
      advance(game,1.49,step);
      const claws=hits.filter(hit=>hit.kind==='wolf-claw');
      assert.equal(claws.length,cycle*2,`${difficulty}, dt=${step}, cycle=${cycle}`);
      const pair=claws.slice(-2);
      assert.deepEqual(pair.map(hit=>hit.clawIndex),[1,2]);
      assert.ok(pair.every(hit=>hit.damage===2&&hit.forceHit&&hit.time>=start+enemy.comboFirstImpactAt-1e-8&&hit.time<start+1.5));
      assert.ok(pair[1].time-pair[0].time>=.2);
      assert.equal(game.player.health,30-cycle*4);
      assert.equal(enemy.wolfState,'claw','the final slash remains visible through the full 1.5-second cast');
      assert.ok(Math.abs(game.wolfZones[0].castProgress-1.49/1.5)<1e-7);
      if(cycle<4)advance(game,.01,step);
    }
  }
});

test('the 1.5-second blood claw cast keeps two one-shot impacts and replaces its trail only at the next cast', () => {
  const {game, enemy, hits} = enterBlood(fresh({boss:true}));
  advance(game, 1.5);
  const area = game.wolfZones[0], combo = enemy.bloodCombo;
  advance(game, combo.firstAt - .01);
  assert.equal(hits.length, 0); assert.equal(game.player.health, 30);
  advance(game, .01);
  assert.equal(hits.length, 1); assert.equal(game.player.health, 28);
  advance(game, combo.secondAt - combo.firstAt - .01);
  assert.equal(hits.length, 1); assert.equal(game.player.health, 28);
  advance(game, .01);
  assert.equal(hits.length, 2); assert.equal(game.player.health, 26);
  advance(game, .14);
  assert.equal(hits.length, 2, 'the visible final slash never deals extra damage on later frames');
  assert.equal(game.wolfZones[0], area); assert.equal(area.phase, 'impact');
  assert.ok(Math.abs(area.castElapsed - 1.49) < 1e-7);
  advance(game, .01);
  assert.equal(hits.length, 2); assert.equal(enemy.wolfState, 'blood-windup');
  assert.notEqual(game.wolfZones[0], area); assert.notEqual(enemy.bloodCombo, combo);
  assert.ok(game.wolfZones[0].castElapsed < 1e-7);
});

test('both blood claws can be blocked despite shield invulnerability between strikes', () => {
  const {game, enemy, hits} = enterBlood(fresh({boss:true}));
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  game.shieldCount = 1; assert.equal(game.activateShield(), true);
  advance(game, 1.49);
  const claws = hits.filter(hit => hit.kind === 'wolf-claw');
  assert.equal(claws.length, 2);
  assert.ok(claws.every(hit => hit.damage === 0 && hit.shieldHits === 1));
  assert.equal(game.player.health, 30); assert.equal(game.player.shieldHits, 1);
});

test('blood claws hold the target through both strikes and reacquire it for the next 1.5-second cycle', () => {
  const {game, enemy, hits} = enterBlood(fresh({boss:true}));
  waitFor(game, () => enemy.wolfState === 'blood-windup');
  const target = enemy.wolfTargetX; game.player.x = 850;
  advance(game, .5); assert.equal(enemy.wolfState, 'blood-leap');
  advance(game, .65); assert.equal(game.wolfZones[0].x, target);
  advance(game, .34);
  assert.equal(enemy.wolfTargetX, target);
  assert.equal(hits.length, 0); assert.equal(game.player.health, 30);
  advance(game,.01);
  assert.equal(enemy.wolfState,'blood-windup');
  assert.equal(enemy.wolfTargetX,850);
  assert.equal(game.wolfZones[0].x,850);
  assert.ok(enemy.comboFirstImpactAt>=game.getPressure(enemy).warningFloor);
});

test('sniper retains five-ammo damage and fires at the normal gun cadence', () => {
  const {game, enemy} = enterBlood(fresh({boss:true}));
  game.player.ammo = 15; enemy.x = game.player.x - 150;
  const health = enemy.health;
  assert.equal(game.shoot(-1), true); assert.equal(game.player.ammo, 10);
  assert.equal(game.player.shotTimer, .17); assert.equal(game.player.shotCooldown, .17);
  assert.equal(game.bullets[0].damage, 5); assert.equal(game.bullets[0].speed, 1280);
  assert.equal(game.shoot(-1), false); advance(game, .12);
  assert.equal(enemy.health, health - 5);
  advance(game, .04); assert.equal(game.shoot(-1), false);
  advance(game, .01); assert.equal(game.shoot(-1), true); assert.equal(game.player.ammo, 5);
  advance(game, .17); assert.equal(game.shoot(1), true); assert.equal(game.player.ammo, 0);
  advance(game, .17); assert.equal(game.shoot(1), false);
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
  const {game, enemy, campaign} = enterBlood(fresh({boss:true}));
  game.levelKills = game.level.target; game.regularSpawned = game.level.target; game.bossSpawned = true;
  enemy.health = 5; game.player.ammo = 5;
  assert.equal(game.shoot(-1), true); advance(game, .2);
  assert.equal(enemy.dead, true); assert.equal(enemy.health, 0);
  assert.equal(game.bossDefeated, true); assert.equal(game.screen, 'won');
  assert.ok(game.save.completed.includes(70)); assert.equal(game.save.resume, Math.min(71, campaign.levels.length));
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
  const bloodTime = enemy.bloodActiveTime, timer = enemy.wolfTimer, zoneTimer = game.wolfZones[0].timer, shotTimer = game.player.shotTimer;
  game.togglePause(); advance(game, 5);
  assert.equal(enemy.bloodActiveTime, bloodTime); assert.equal(enemy.wolfTimer, timer);
  assert.equal(game.wolfZones[0].timer, zoneTimer); assert.equal(game.player.shotTimer, shotTimer);
});

test('normal pack howl lasts four real seconds, summons exactly five pups, then leaves six vulnerable seconds', () => {
  for (const step of [1/60,.05,.049]) {
    const {game, enemy, skills} = fresh({boss:true, howls:true});
    enemy.wolfCooldown = Infinity;
    advance(game, 5.99, step); assert.equal(enemy.howling, false);
    advance(game, .01, step); assert.equal(enemy.howling, true);
    assert.ok(Math.abs(enemy.howlTime - 4) < 1e-7);
    const pups = game.enemies.filter(other => other.ownerBoss === enemy);
    assert.equal(pups.length, 5);
    assert.ok(pups.every(pup => pup.type === 'wolfPup' && pup.archetype === 'werewolf' && pup.variant === 'pup' && pup.minion && pup.wolfPup));
    assert.ok(pups.every(pup => pup.health === 1 && pup.maxHealth === 1 && pup.w === 26 && pup.h === 36));
    assert.ok(pups.some(pup => pup.x === 24) && pups.some(pup => pup.x === 936));
    assert.equal(enemy.intangible, false, 'howling does not hide the king');
    assert.equal(enemy.skillWarning, enemy.howlWarning);
    const hp = enemy.health;
    assert.equal(skills.hit(game, enemy, 5), false); assert.equal(enemy.health, hp);
    advance(game, 3.99, step); assert.equal(enemy.howling, true);
    advance(game, .01, step); assert.equal(enemy.howling, false);
    assert.ok(Math.abs(enemy.nextHowlAt - 16) < 1e-7);
    assert.equal(skills.hit(game, enemy, 1), true); assert.equal(enemy.health, hp - 1);
    advance(game, 5.99, step); assert.equal(enemy.howling, false);
    advance(game, .01, step); assert.equal(enemy.howling, true); assert.equal(enemy.packSerial, 2);
  }
});

test('blood moon howl leaves four vulnerable seconds and double claws continue through its immune window', () => {
  const fixture = enterBlood(fresh({boss:true, howls:true})), {game, enemy, hits, skills} = fixture;
  game.player.health = game.player.maxHealth = 1000;
  advance(game, 3.99); assert.equal(enemy.howling, false);
  advance(game, .01); assert.equal(enemy.howling, true);
  const hp = enemy.health, clawsBefore = hits.filter(hit => hit.kind === 'wolf-claw').length;
  assert.equal(skills.hit(game, enemy, 5), false); assert.equal(enemy.health, hp);
  advance(game, 3.99); assert.equal(enemy.howling, true);
  assert.ok(hits.filter(hit => hit.kind === 'wolf-claw').length >= clawsBefore + 4, 'howling never cancels either claw');
  assert.ok(enemy.bloodActiveTime > 7.9); assert.ok(enemy.nextBloodAt >= 9);
  advance(game, .01); assert.equal(enemy.howling, false);
  assert.ok(Math.abs(enemy.nextHowlAt - 12) < 1e-7);
  assert.equal(skills.hit(game, enemy, 5), true); assert.equal(enemy.health, hp - 5);
  advance(game, 3.99); assert.equal(enemy.howling, false);
  advance(game, .01); assert.equal(enemy.howling, true); assert.equal(enemy.packSerial, 2);
});

test('howl immunity blocks a half-health transition and sniper damage while allowing shots at the summoned pack', () => {
  const fixture = fresh({boss:true, howls:true}), {game, enemy, skills} = fixture;
  enemy.wolfCooldown = Infinity; advance(game, 6);
  enemy.health = enemy.maxHealth / 2 + 1;
  assert.equal(skills.hit(game, enemy, 5), false);
  assert.equal(enemy.bloodMoon, false); assert.equal(enemy.bloodPhaseTriggered, false);
  advance(game, 4); assert.equal(skills.hit(game, enemy, 1), true);
  assert.equal(enemy.bloodMoon, true); assert.equal(enemy.health, enemy.maxHealth);
  advance(game, 1.2); enemy.nextBloodAt = Infinity; advance(game, 4);
  const hp = enemy.health;
  assert.equal(game.getWeaponProfile().locked, false);
  assert.equal(game.getWeaponProfile().kind, 'sniper');
  game.player.ammo = 15; assert.equal(game.shoot(1), true); assert.equal(game.player.ammo, 10);
  assert.equal(skills.hit(game, enemy, 5), false); assert.equal(enemy.health, hp);
  const pup = game.enemies.find(other => other.ownerBoss === enemy && other.phase === 'active');
  assert.ok(pup); assert.equal(skills.hit(game, pup, 5), true); assert.equal(pup.health, 0);
});

test('wolf pups move at the reduced speed and deal one HP when their one-way run crosses the player', () => {
  const {game, skills, campaign} = fresh();
  game.enemies = [];
  const pup = game.spawn('wolfPup', -1);
  Object.assign(pup, {phase:'active', x:game.player.x - 150, y:438});
  assert.equal(campaign.enemyTypes.wolfPup.speed, 76);
  assert.ok(pup.speed < 100, 'chapter scaling still leaves this pup slower than the old base speed');
  advance(game, .5);
  assert.ok(pup.x > game.player.x - 120); assert.equal(pup.wolfState, 'run');
  assert.equal(pup.health, 1); assert.equal(game.wolfZones.length, 0);
  waitFor(game, () => game.player.health < 30, 3);
  assert.equal(game.player.health, 29); assert.equal(pup.y, 438); assert.equal(pup.wolfState, 'run');
  assert.equal(skills.hit(game, pup, 1), true); assert.equal(pup.health, 0);
});

test('pups retain their spawn direction even after the player crosses behind them', () => {
  for (const side of [-1, 1]) {
    const {game} = fresh(); game.enemies = [];
    const pup = game.spawn('wolfPup', side);
    Object.assign(pup, {phase:'active', x:480, y:438}); game.player.x = side === -1 ? 800 : 160;
    const direction = -side; advance(game, .5); const x = pup.x;
    game.player.x = side === -1 ? 100 : 860; advance(game, .5);
    assert.equal(pup.dir, direction); assert.equal(pup.pupRunDir, direction);
    assert.ok((pup.x - x) * direction > 30, 'running past the player never starts a pursuit');
    assert.equal(pup.wolfState, 'run'); assert.equal(game.wolfZones.length, 0);
  }
});

test('escaped regular pups release their wave reservation while summoned pups retire without rewards or quota changes', () => {
  for (const minion of [false, true]) {
    const {game} = fresh(); game.enemies = [];
    game.regularSpawned = game.level.target; game.levelKills = game.level.target - 1; game.spawnTimer = 10000;
    const pup = game.spawn('wolfPup', -1);
    Object.assign(pup, {phase:'active', x:1004, minion});
    const score = game.score, kills = game.totalKills, quota = game.levelKills;
    advance(game, .05);
    assert.equal(pup.dead, true); assert.ok(!game.enemies.includes(pup));
    assert.equal(game.score, score); assert.equal(game.totalKills, kills); assert.equal(game.levelKills, quota);
    assert.equal(game.regularSpawned, game.level.target - (minion ? 0 : 1));
    assert.equal(game.screen, 'playing');
    if (!minion) {
      assert.ok(game.spawnTimer <= .8);
      advance(game, .8); assert.equal(game.regularSpawned, game.level.target, 'the escaped quota is replaced instead of leaving the level stuck');
      assert.ok(game.enemies.length > 0);
    }
  }
});

test('every howl creates a full five-pup pack while older packs retreat at the ten-summon limit', () => {
  const {game, enemy} = fresh({boss:true, howls:true});
  enemy.wolfCooldown = Infinity; enemy.nextHowlAt = .01;
  const spawned = [], originalSpawn = game.spawn.bind(game);
  game.spawn = (type, side) => {
    const pup = originalSpawn(type, side);
    if (type === 'wolfPup') { spawned.push(pup); pup.speed = 0; }
    return pup;
  };
  const initialScore = game.score, kills = game.totalKills, levelKills = game.levelKills;
  for (let pack = 1; pack <= 3; pack++) {
    advance(game, .01); assert.equal(enemy.howling, true);
    const pups = game.enemies.filter(other => other.ownerBoss === enemy);
    assert.equal(spawned.length, pack * 5); assert.equal(pups.length, Math.min(pack * 5, 10));
    pups.forEach(pup => { pup.summonLife = 10000; });
    advance(game, 4); assert.equal(enemy.howling, false);
    enemy.nextHowlAt = enemy.howlClock + .01;
  }
  assert.ok(spawned.slice(0, 5).every(pup => pup.dead && pup.health === 0));
  assert.equal(game.score, initialScore); assert.equal(game.totalKills, kills); assert.equal(game.levelKills, levelKills);
  const target = game.enemies.find(other => other.ownerBoss === enemy);
  game.killEnemy(target);
  assert.equal(game.levelKills, levelKills, 'summoned pups do not advance the wave quota');
  assert.equal(game.totalKills, kills + 1); assert.equal(game.score, initialScore + target.score);
});

test('pause freezes howl immunity and pup movement; defeating the king removes only his owned pack', () => {
  const fixture = enterBlood(fresh({boss:true, howls:true})), {game, enemy} = fixture;
  game.player.health = game.player.maxHealth = 1000;
  advance(game, 4.5);
  const pups = game.enemies.filter(other => other.ownerBoss === enemy), timer = enemy.howlTime, clock = enemy.howlClock, blood = enemy.bloodActiveTime;
  const positions = pups.map(pup => pup.x), lifetimes = pups.map(pup => pup.summonLife);
  game.togglePause(); advance(game, 9);
  assert.equal(enemy.howlTime, timer); assert.equal(enemy.howlClock, clock); assert.equal(enemy.bloodActiveTime, blood);
  assert.deepEqual(pups.map(pup => pup.x), positions); assert.deepEqual(pups.map(pup => pup.summonLife), lifetimes);
  game.togglePause();
  const regularPup = game.spawn('wolfPup', 1);
  const score = game.score, kills = game.totalKills;
  game.killEnemy(enemy);
  assert.equal(enemy.howling, false); assert.equal(enemy.howlWarning, null);
  assert.ok(game.enemies.includes(regularPup)); assert.ok(!game.enemies.some(other => other.ownerBoss === enemy));
  assert.equal(game.score, score + enemy.score); assert.equal(game.totalKills, kills + 1);
  assert.equal(game.player.weaponMode, 'normal'); assert.equal(game.wolfZones.length, 0);
  game.start(70, {retry:true}); assert.equal(game.enemies.length, 0);
  const replacement = game.spawn('boss', -1);
  Object.assign(replacement, {phase:'active', nextHowlAt:0, wolfCooldown:Infinity}); advance(game, .01);
  assert.equal(game.enemies.filter(other => other.ownerBoss === replacement).length, 5);
  game.goHome(); assert.equal(game.enemies.length, 0); assert.equal(game.wolfZones.length, 0);
});

test('repeated blood howls retain damage windows large enough to defeat the king', () => {
  const fixture = enterBlood(fresh({boss:true, howls:true})), {game, enemy, skills} = fixture;
  game.player.health = game.player.maxHealth = 1000;
  const damageTimes = [], immuneTimes = [];
  for (let second = 1; second <= 25 && enemy.health > 0; second++) {
    advance(game, 1);
    const before = enemy.health;
    if (skills.hit(game, enemy, 5)) damageTimes.push(second); else immuneTimes.push(second);
    assert.equal(enemy.health, before - (enemy.howling ? 0 : 5));
  }
  assert.equal(enemy.health, 0); assert.ok(damageTimes.length === 10);
  assert.ok(immuneTimes.includes(4) && immuneTimes.includes(7) && immuneTimes.includes(12));
  assert.ok(damageTimes.includes(8) && damageTimes.includes(11) && damageTimes.includes(16));
  game.killEnemy(enemy); assert.equal(game.bossDefeated, true);
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
