'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/weapon-manager.js'), 'utf8'), context);
  const MM = context.MM, rewards = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  let writes = 0;
  MM.SaveManager = {unlocked:(g, level) => rewards.has(level), write:() => writes++};
  MM.MapManager = {suppressed:g => g.level.id === 70, skillsEnabled:g => g.level.id !== 70,
    manualAim:g => g.level.id !== 70 && rewards.has(80)};
  MM.SkillManager = {consumeDamage(g, damage) {
    if (!g.darkReady) return damage;
    g.darkReady = false; return damage * 2;
  }};
  const hits = [];
  const g = {screen:'playing', level:{id:1}, progression:{equipped:'gun'}, aimMode:'ground',
    player:{x:480, y:438, w:38, h:54, dir:1, ammo:100, shotTimer:0, rollTime:0,
      stunTime:0, petrifyTime:0, dryCooldown:0}, bullets:[], enemies:[],
    getWeaponProfile:() => ({kind:'normal', cost:1, damage:1, cooldown:.17, speed:780, locked:false}),
    dealEnemyDamage(e, damage, source) { hits.push({e, damage, source}); e.health -= damage; return true; },
    burst() {}, updateUI() {}, updateAmmoUI() {}, sound:{play() {}}};
  MM.WeaponManager.init(g);
  const enemy = (x = 540, extra = {}) => ({x, y:438, w:38, h:54, health:100, phase:'active', ...extra});
  return {g, MM, weapons:MM.WeaponManager, rewards, hits, enemy, writes:() => writes};
}

test('weapon rewards unlock only the prescribed equipment and selecting persists identity', () => {
  const {g, weapons, rewards, writes} = fresh(); rewards.clear();
  assert.deepEqual(Array.from(weapons.available(g)), ['gun']);
  assert.equal(weapons.select(g, 'axes'), false);
  for (const [level, expected] of [[10, ['gun', 'bones']], [60, ['gun', 'bones', 'club']],
    [90, ['gun', 'bones', 'club', 'bow', 'spear']], [100, ['gun', 'bones', 'club', 'bow', 'spear', 'axes']]]) {
    rewards.add(level); assert.deepEqual(Array.from(weapons.available(g)), expected);
  }
  assert.equal(weapons.select(g, 'club'), true);
  assert.equal(g.progression.equipped, 'club'); assert.equal(writes(), 1);
  assert.equal(weapons.cycle(g), true); assert.equal(weapons.current(g), 'bow');
});

test('three bones have independent 1 damage, a 12 degree spread and exactly 3 ammunition cost', () => {
  const {g, weapons} = fresh(); weapons.select(g, 'bones');
  assert.equal(weapons.fire(g, 1), true);
  assert.equal(g.player.ammo, 97); assert.equal(g.player.shotTimer, .65);
  assert.equal(g.bullets.length, 3);
  assert.deepEqual(g.bullets.map(b => b.damage), [1, 1, 1]);
  for (const [index, degrees] of [-12, 0, 12].entries()) {
    const b = g.bullets[index];
    assert.ok(Math.abs(b.angle - degrees * Math.PI / 180) < 1e-12);
    assert.equal(b.life * b.speed, 700);
  }
  assert.equal(weapons.fire(g, 1), false, 'cooldown blocks another whole volley');
});

test('a volley cannot partially fire when it lacks enough ammunition', () => {
  for (const [id, insufficient] of [['bones', 2], ['bow', 4]]) {
    const {g, weapons} = fresh(); weapons.select(g, id); g.player.ammo = insufficient;
    assert.equal(weapons.fire(g, 1), false);
    assert.equal(g.bullets.length, 0); assert.equal(g.player.ammo, insufficient);
    assert.equal(g.player.shotTimer, 0);
  }
});

test('Darken doubles exactly one projectile, including the five independent dark arrows', () => {
  for (const [id, count, total, cost, cooldown] of [['bones', 3, 4, 3, .65], ['bow', 5, 6, 5, .9]]) {
    const {g, weapons} = fresh(); weapons.select(g, id); g.darkReady = true;
    assert.equal(weapons.fire(g, -1), true);
    assert.equal(g.bullets.length, count);
    assert.equal(g.bullets.filter(b => b.damage === 2).length, 1);
    assert.equal(g.bullets.reduce((sum, b) => sum + b.damage, 0), total);
    assert.equal(g.player.ammo, 100 - cost); assert.equal(g.player.shotTimer, cooldown);
    assert.equal(g.darkReady, false);
  }
});

test('club sweeps three base damage and only its first target consumes a Darken charge', () => {
  const {g, weapons, enemy, hits} = fresh(); weapons.select(g, 'club'); g.darkReady = true;
  const near = enemy(540), far = enemy(590), behind = enemy(390), above = enemy(550, {y:300});
  g.enemies = [far, behind, above, near];
  assert.equal(weapons.fire(g, 1), true);
  assert.deepEqual(hits.map(hit => hit.damage), [6, 3]);
  assert.deepEqual(hits.map(hit => hit.e), [near, far]);
  assert.equal(g.player.ammo, 100); assert.equal(g.player.shotTimer, .75);
  assert.equal(g.weaponAttack.form, 'swing');
});

test('a missed melee attack does not spend Darken, and normal dual axes cost no ammunition', () => {
  const {g, weapons, enemy, hits} = fresh(); weapons.select(g, 'axes'); g.darkReady = true;
  assert.equal(weapons.fire(g, 1), true); assert.equal(g.darkReady, true);
  g.player.shotTimer = 0; g.enemies = [enemy(540)];
  assert.equal(weapons.fire(g, 1), true);
  assert.equal(hits[0].damage, 4); assert.equal(g.player.ammo, 100);
  assert.equal(g.player.shotTimer, .55);
});

test('platinum spear stabs within one 40px edge-gap step and throws beyond it with distinct animation', () => {
  for (const [gap, mode, damage, ammo] of [[40, 'stab', 2, 100], [41, 'throw', 3, 99], [200, 'throw', 3, 99]]) {
    const {g, weapons, enemy, hits} = fresh(); weapons.select(g, 'spear');
    g.enemies = [enemy(g.player.x + 38 + gap)];
    assert.equal(weapons.fire(g, 1), true);
    assert.equal(g.weaponAttack.form, mode); assert.equal(g.player.shotTimer, .8);
    assert.equal(g.player.ammo, ammo);
    if (mode === 'stab') { assert.equal(hits.length, 1); assert.equal(hits[0].damage, damage); }
    else { assert.equal(hits.length, 0); assert.equal(g.bullets[0].damage, damage); }
  }
});

test('manual ground/high aim changes a ranged trajectory without replacing the equipped weapon', () => {
  for (const id of ['gun', 'bones', 'bow', 'spear']) {
    const {g, weapons} = fresh(); weapons.select(g, id);
    assert.equal(weapons.setAim(g, 'high'), true);
    assert.equal(weapons.fire(g, -1), true);
    assert.equal(weapons.current(g), id);
    assert.ok(g.bullets.every(b => b.vx < 0 && b.vy < 0), `${id} aims upwards and left`);
    g.player.shotTimer = 0; g.bullets = [];
    assert.equal(weapons.setAim(g, 'ground'), true); weapons.fire(g, 1);
    assert.equal(weapons.current(g), id);
    assert.ok(g.bullets.some(b => b.vy === 0));
  }
});

test('before reward80 aerial gun aim retains its legacy target, damage, and Kong shot credit', () => {
  const {g, MM, weapons, rewards} = fresh(); rewards.delete(80);
  const kong = {x:700, y:200, h:140, archetype:'kong'}; let credits = 0;
  MM.KongCombat = {recordShot:(_g, target) => { assert.equal(target, kong); credits++; }};
  g.getWeaponProfile = () => ({kind:'highAim', cost:1, damage:2, cooldown:.22, speed:1050, target:kong});
  assert.equal(weapons.setAim(g, 'high'), false);
  weapons.fire(g, 1);
  assert.equal(g.bullets[0].damage, 2); assert.equal(g.player.shotTimer, .22);
  assert.equal(credits, 1); assert.ok(g.bullets[0].vy < 0);
  assert.equal(g.progression.equipped, 'gun');
});

test('map70 masks saved equipment and skill damage, preserves 0.5s sniper, and restores equipment on exit', () => {
  const {g, weapons} = fresh(); weapons.select(g, 'axes'); g.level.id = 70; g.darkReady = true;
  g.getWeaponProfile = () => ({kind:'sniper', cost:5, damage:5, cooldown:.5, speed:1280});
  assert.equal(weapons.current(g), 'gun'); assert.deepEqual(Array.from(weapons.available(g)), ['gun']);
  assert.equal(weapons.select(g, 'bones'), false); assert.equal(weapons.tryRollSlash(g, 1), false);
  assert.equal(weapons.fire(g, 1), true); assert.equal(g.bullets[0].damage, 5);
  assert.equal(g.player.shotTimer, .5); assert.equal(g.player.ammo, 95);
  assert.equal(g.darkReady, true); assert.equal(g.progression.equipped, 'axes');
  g.level.id = 71; assert.equal(weapons.current(g), 'axes');
});

test('one roll slash damages each swept target once, and repeated triggers cannot stack the action', () => {
  const {g, weapons, enemy, hits} = fresh(); weapons.select(g, 'axes');
  const a = enemy(510), b = enemy(565), dead = enemy(525, {dead:true}), tooHigh = enemy(530, {y:200});
  g.enemies = [a, b, dead, tooHigh];
  assert.equal(weapons.tryRollSlash(g, 1), true);
  const action = g.rollSlash;
  assert.equal(weapons.tryRollSlash(g, 1), false); assert.equal(g.rollSlash, action);
  g.player.x = 610; weapons.update(g, .05);
  assert.equal(hits.length, 2); assert.ok(hits.every(hit => hit.damage === 2));
  for (let i = 0; i < 7; i++) { weapons.tryRollSlash(g, -1); weapons.update(g, .05); }
  assert.equal(hits.length, 2); assert.equal(g.rollSlash, null);
  assert.equal(weapons.tryRollSlash(g, 1), false, 'the independent .9s cooldown remains');
  weapons.update(g, .6); assert.equal(weapons.tryRollSlash(g, -1), true);
  assert.equal(g.player.rollTime, 0, 'ordinary evade state was never activated');
});

test('roll slash Darken empowers only the first target and changing equipment cancels residual damage', () => {
  const {g, weapons, enemy, hits} = fresh(); weapons.select(g, 'axes'); g.darkReady = true;
  g.enemies = [enemy(500), enemy(530)]; weapons.tryRollSlash(g, 1); weapons.update(g, .01);
  assert.deepEqual(hits.map(hit => hit.damage), [4, 2]);
  g.progression.equipped = 'gun'; g.enemies.push(enemy(550)); g.player.x = 550;
  weapons.update(g, .01); assert.equal(g.rollSlash, null); assert.equal(hits.length, 2);
  assert.equal(weapons.tryRollSlash(g, 1), false);
});
