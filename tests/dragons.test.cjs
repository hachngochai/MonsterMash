'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh(variant = 'fire', boss = false) {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/dragons.js'), 'utf8'), context);
  const hits = [], game = {
    screen:'playing', enemies:[], dragonZones:[], dragonShots:[], shieldCount:0,
    random:() => .1, getPressure:() => ({warningFloor:.9}),
    player:{x:480, y:438, w:38, h:54, health:1000, shieldTime:0, shieldHits:0, stunTime:0, grounded:true},
    updateUI() {}, sound:{play() {}}, burst() {}, floating() {},
    applyCombatEffect(spec) {
      const p = this.player, shielded = p.shieldTime > 0 && p.shieldHits > 0;
      if (shielded) {
        p.shieldHits--; p.burnTime = 0;
        if (spec.pierceShield) p.health -= spec.pierceShield;
      } else {
        p.health -= spec.damage || 0;
        if (spec.stun) p.stunTime = Math.max(p.stunTime, spec.stun);
        if (spec.burn) p.burnTime = spec.burn;
        if (spec.knockup) { p.vy = spec.knockup; p.grounded = false; }
      }
      hits.push({...spec, blocked:shielded, clock:enemy.dragonClock, knightClock:enemy.knightClock});
      return !shielded || !!spec.pierceShield;
    }
  };
  const enemy = {type:boss ? 'boss' : variant + 'Dragon', archetype:'dragon', variant:boss ? 'yinYang' : variant,
    phase:'active', boss, x:300, y:438, w:boss ? 252 : 92, h:boss ? 190 : 76,
    health:boss ? 100 : 5, maxHealth:boss ? 100 : 5, speed:0, dir:1};
  game.enemies.push(enemy);
  const skills = context.MM.DragonCombat; skills.setup(game, enemy);
  return {game, enemy, skills, hits};
}
function advance(f, seconds, step = 1 / 60) {
  while (seconds > 1e-9) { const dt = Math.min(step, seconds); f.skills.update(f.game, dt); seconds -= dt; }
}
function knight(f, step) {
  f.skills.hit(f.game, f.enemy, 50); advance(f, 3.2, step);
  f.skills.hit(f.game, f.enemy, 50); advance(f, 1.2, step);
  assert.equal(f.enemy.dragonState, 'knight'); return f;
}

test('air dragons stay beyond a ground shot and active clocks freeze during portals and pause', () => {
  const f = fresh(), {game, enemy} = f;
  assert.equal(enemy.airborne, true); assert.ok(enemy.y < 300);
  enemy.phase = 'warning'; advance(f, 20); assert.equal(enemy.dragonClock, 0);
  enemy.phase = 'active'; advance(f, 3.99); assert.equal(game.dragonZones.length, 0);
  const x = enemy.x, clock = enemy.dragonClock; game.screen = 'paused'; advance(f, 8);
  assert.equal(enemy.x, x); assert.equal(enemy.dragonClock, clock);
  game.screen = 'playing'; advance(f, .01); assert.equal(game.dragonZones[0].phase, 'warning');
  assert.equal(enemy.dragonSkillCount, 1);
});

test('fire is aimed once, applies a two-second burn, and cannot follow a dodge', () => {
  for (const dodge of [false, true]) {
    const f = fresh(); advance(f, 4);
    const z = f.game.dragonZones[0]; assert.equal(z.kind, 'fire'); assert.equal(z.x, 480);
    if (dodge) f.game.player.x = 850;
    advance(f, 1.5);
    assert.equal(f.hits.length, dodge ? 0 : 1);
    if (!dodge) { assert.equal(f.hits[0].damage, 0); assert.equal(f.game.player.burnTime, 2); }
    assert.equal(f.game.dragonZones.length, 0);
  }
});

test('ice releases exactly four falling cubes with one HP per collision', () => {
  const f = fresh('ice'); advance(f, 4);
  assert.equal(f.game.dragonZones.length, 4);
  assert.deepEqual(Array.from(f.game.dragonZones, z => z.x), [336, 432, 528, 624]);
  f.game.player.x = 432; advance(f, 1.1);
  assert.ok(f.game.dragonZones.every(z => z.phase === 'falling' && z.y > 20 && z.y < 438));
  advance(f, .9); assert.equal(f.hits.length, 1); assert.equal(f.game.player.health, 999);
  assert.equal(f.game.dragonZones.length, 0);
});

test('wind has a four-second cadence and knocks up with two-second stun but no damage', () => {
  const f = fresh('wind'); advance(f, 3.99); assert.equal(f.game.dragonZones.length, 0);
  advance(f, .01); assert.equal(f.game.dragonZones[0].kind, 'wind'); advance(f, 1.5);
  assert.equal(f.game.player.health, 1000); assert.equal(f.game.player.stunTime, 2);
  assert.equal(f.game.player.vy, -620); assert.equal(f.game.player.grounded, false);
  advance(f, 2.5); assert.equal(f.enemy.dragonSkillCount, 2);
});

test('earth warns three tiles then erupts once and removes all tiles', () => {
  const f = fresh('earth'); advance(f, 4);
  assert.equal(f.game.dragonZones.length, 3); assert.equal(f.hits.length, 0);
  f.game.player.x = 480; advance(f, 1.6);
  assert.equal(f.hits.length, 1); assert.equal(f.hits[0].damage, 1);
  assert.equal(f.game.dragonZones.length, 0);
});

test('lightning is fixed below the flying dragon and adds one HP damage plus star-stun time', () => {
  const f = fresh('lightning'); advance(f, 4);
  const z = f.game.dragonZones[0], x = z.x; assert.equal(x, f.enemy.x);
  f.game.player.x = x; advance(f, 1.3);
  assert.equal(z.x, x); assert.equal(f.game.player.health, 999); assert.equal(f.game.player.stunTime, 2);
});

test('active shields block burns, falling ice, wind, earth and lightning statuses', () => {
  for (const element of ['fire', 'ice', 'wind', 'earth', 'lightning']) {
    const f = fresh(element); f.game.player.shieldTime = 30; f.game.player.shieldHits = 3;
    advance(f, 4);
    f.game.player.x = f.game.dragonZones[element === 'ice' ? 1 : 0].x; advance(f, 2);
    assert.ok(f.hits.some(h => h.blocked), element);
    assert.equal(f.game.player.health, 1000, element); assert.equal(f.game.player.stunTime, 0, element);
    assert.ok(!f.game.player.burnTime, element);
  }
});

test('ancient dragon chooses all five elements at exact three-second intervals at 20 and 60 FPS', () => {
  for (const step of [1 / 60, .05]) {
    const f = fresh('yinYang', true), seen = [];
    for (let i = 0; i < 5; i++) {
      f.game.random = () => (i + .5) / 5;
      advance(f, 2.9, step); assert.equal(f.enemy.dragonSkillCount || 0, i);
      advance(f, .1, step); seen.push(f.enemy.lastDragonSkill);
    }
    assert.deepEqual(seen, ['fire', 'ice', 'wind', 'earth', 'lightning']);
  }
});

test('every regular element casts at four active seconds regardless of pressure or frame rate', () => {
  for (const step of [1 / 60, .05]) for (const element of ['fire', 'ice', 'wind', 'earth', 'lightning']) {
    const f = fresh(element);
    f.game.getPressure = () => ({attackRate:3, warningFloor:.5});
    for (let count = 1; count <= 3; count++) {
      advance(f, 3.99, step);
      assert.equal(f.enemy.dragonSkillCount || 0, count - 1, `${element}: no early cast at ${step}`);
      assert.equal(f.game.dragonZones.length, 0, `${element}: previous cast finishes before the next`);
      advance(f, .01, step);
      assert.equal(f.enemy.dragonSkillCount, count, `${element}: cast ${count} at ${count * 4}s`);
      assert.ok(f.game.dragonZones.every(z => z.phase === 'warning'));
      assert.ok(Math.abs(f.enemy.nextDragonSkillAt - (count + 1) * 4) < 1e-8);
    }
  }
});

test('ancient three-second cast clock excludes both the arrival portal and paused time', () => {
  for (const step of [1 / 60, .05]) {
    const f = fresh('yinYang', true);
    f.game.getPressure = () => ({attackRate:3, warningFloor:.5});
    f.enemy.phase = 'warning'; advance(f, 10, step);
    assert.equal(f.enemy.dragonClock, 0); assert.equal(f.enemy.dragonSkillCount || 0, 0);
    f.enemy.phase = 'active'; advance(f, 2.99, step);
    assert.equal(f.enemy.dragonSkillCount || 0, 0);
    f.game.screen = 'paused'; advance(f, 10, step);
    assert.ok(Math.abs(f.enemy.dragonClock - 2.99) < 1e-8);
    f.game.screen = 'playing'; advance(f, .01, step);
    assert.equal(f.enemy.dragonSkillCount, 1);
    const zone = f.game.dragonZones[0], timer = zone.timer;
    f.game.screen = 'paused'; advance(f, 10, step);
    assert.equal(zone.timer, timer, 'a pause also freezes the announced attack');
    f.game.screen = 'playing'; advance(f, 2.99, step);
    assert.equal(f.enemy.dragonSkillCount, 1); assert.equal(f.game.dragonZones.length, 0);
    advance(f, .01, step); assert.equal(f.enemy.dragonSkillCount, 2);
  }
});

test('reincarnation suspends elemental casts and resumes three seconds after the beam clears', () => {
  for (const step of [1 / 60, .05]) {
    const f = fresh('yinYang', true);
    advance(f, 3, step); assert.equal(f.enemy.dragonSkillCount, 1);
    f.skills.hit(f.game, f.enemy, 50);
    assert.equal(f.game.dragonZones.length, 1, 'old elemental tells are retired by reincarnation');
    assert.equal(f.game.dragonZones[0].kind, 'yin-yang');
    while (f.enemy.dragonGuarded) {
      advance(f, step, step);
      assert.equal(f.enemy.dragonSkillCount, 1, 'no elemental cast overlaps the beam');
    }
    assert.equal(f.game.dragonZones.length, 0);
    const endedAt = f.enemy.dragonClock;
    assert.ok(Math.abs(f.enemy.nextDragonSkillAt - endedAt - 3) < 1e-8);
    advance(f, 2.99, step); assert.equal(f.enemy.dragonSkillCount, 1);
    advance(f, .01, step); assert.equal(f.enemy.dragonSkillCount, 2);
    assert.ok(f.game.dragonZones.every(z => z.kind !== 'yin-yang' && z.phase === 'warning'));
  }
});

test('half-health reincarnation locks exactly two-thirds of the arena with a reachable warning', () => {
  for (const side of ['left', 'right']) {
    const f = fresh('yinYang', true); f.game.player.x = side === 'left' ? 100 : 860;
    assert.equal(f.skills.hit(f.game, f.enemy, 50), true);
    assert.equal(f.enemy.health, 50); assert.equal(f.enemy.dragonState, 'laser-windup');
    const z = f.game.dragonZones[0]; assert.equal(z.w, 640); assert.equal(z.total, 2.6);
    assert.equal(z.x, side === 'left' ? 320 : 640);
    assert.equal(f.skills.hit(f.game, f.enemy, 50), false);
    f.game.player.x = side === 'left' ? 850 : 100;
    advance(f, 3.2); assert.equal(f.hits.length, 0); assert.equal(f.enemy.dragonGuarded, false);
    assert.equal(f.enemy.dragonState, 'air'); assert.equal(f.enemy.health, 50);
  }
});

test('yin-yang beam causes three HP, or exactly one HP through an active shield', () => {
  for (const shielded of [false, true]) {
    const f = fresh('yinYang', true);
    if (shielded) { f.game.player.shieldTime = 4; f.game.player.shieldHits = 3; }
    f.skills.hit(f.game, f.enemy, 50); advance(f, 3.2);
    assert.equal(f.hits.length, 1); assert.equal(f.game.player.health, shielded ? 999 : 997);
    assert.equal(f.hits[0].pierceShield, 1);
    assert.equal(f.hits[0].forceHit, true, 'a newly activated shield cannot hide the required one-HP beam cost behind invulnerability');
  }
});

test('lethal first-phase hits cannot skip the laser and the second health bar lands as a player-sized knight', () => {
  const f = fresh('yinYang', true); f.skills.hit(f.game, f.enemy, 500);
  assert.equal(f.enemy.health, 1); assert.equal(f.enemy.yinYangTriggered, true);
  advance(f, 3.2); f.skills.hit(f.game, f.enemy, 500);
  assert.equal(f.enemy.health, 100); assert.equal(f.enemy.dragonForm, 'knight');
  assert.equal(f.enemy.w, 38); assert.equal(f.enemy.h, 54); assert.equal(f.enemy.intangible, true);
  assert.equal(f.skills.hit(f.game, f.enemy, 500), false);
  advance(f, 1.2); assert.equal(f.enemy.y, 438); assert.equal(f.enemy.airborne, false);
  assert.equal(f.enemy.dragonState, 'knight'); assert.equal(f.enemy.intangible, false);
  f.skills.hit(f.game, f.enemy, 500); assert.equal(f.enemy.health, 0); assert.equal(f.enemy.knightTriggered, true);
});

test('knight fires five sonic waves every six seconds and three fixed-target spear strikes every three', () => {
  for (const step of [1 / 60, .05]) {
    const f = knight(fresh('yinYang', true), step); f.game.player.x = 480;
    advance(f, 3, step); assert.ok(f.enemy.knightCombo); const target = f.enemy.knightCombo.targetX;
    advance(f, 1.5, step);
    assert.equal(f.hits.filter(h => h.kind === 'dragon-spear').length, 3);
    assert.ok(f.hits.filter(h => h.kind === 'dragon-spear').every(h => h.x === target && h.forceHit));
    advance(f, 1.5, step); assert.equal(f.enemy.sonicVolleys, 1); assert.equal(f.game.dragonShots.length, 5);
    const secondTarget = f.enemy.knightCombo.targetX; f.game.player.x = 880;
    advance(f, 1.5, step); assert.equal(secondTarget, 480);
    assert.equal(f.hits.filter(h => h.kind === 'dragon-spear').length, 3, 'the second locked thrust can be dodged');
    advance(f, 4.5, step); assert.equal(f.enemy.sonicVolleys, 2);
  }
});

test('knight shields count ten successful hits rather than damage, reject immunity, and cap at three', () => {
  const f = knight(fresh('yinYang', true)); f.enemy.health = f.enemy.maxHealth = 1000;
  for (let i = 0; i < 9; i++) f.skills.hit(f.game, f.enemy, 5);
  assert.equal(f.enemy.knightHits, 9); assert.equal(f.game.shieldCount, 0);
  f.enemy.dragonGuarded = true; assert.equal(f.skills.hit(f.game, f.enemy, 5), false);
  assert.equal(f.enemy.knightHits, 9); f.enemy.dragonGuarded = false;
  f.skills.hit(f.game, f.enemy, 1); assert.equal(f.game.shieldCount, 1);
  for (let i = 0; i < 40; i++) f.skills.hit(f.game, f.enemy, 1);
  assert.equal(f.enemy.knightHits, 50); assert.equal(f.game.shieldCount, 3);
});

test('pause freezes knight projectiles and clocks; cleanup preserves other dragons and bounds repeated attacks', () => {
  const f = knight(fresh('yinYang', true)); advance(f, 6);
  const s = f.game.dragonShots[0], x = s.x, clock = f.enemy.knightClock;
  f.game.screen = 'paused'; advance(f, 20); assert.equal(s.x, x); assert.equal(f.enemy.knightClock, clock);
  f.game.screen = 'playing'; f.game.player.x = 930; advance(f, 100, .05);
  assert.ok(f.game.dragonShots.length <= 20); assert.ok(f.game.dragonZones.length <= 48);
  const other = {health:1}; f.game.dragonZones.push({owner:other}); f.game.dragonShots.push({owner:other});
  f.skills.cleanup(f.game, f.enemy);
  assert.equal(f.game.dragonZones.length, 1); assert.equal(f.game.dragonZones[0].owner, other);
  assert.equal(f.game.dragonShots.length, 1); assert.equal(f.game.dragonShots[0].owner, other);
  assert.equal(f.enemy.skillWarning, null);
});
