'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function fresh() {
  const context = vm.createContext({});
  for (const file of ['weapon-manager.js', 'input-manager.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const MM = context.MM, rewards = new Set([10, 60, 80, 90, 100]);
  MM.SaveManager = {unlocked:(_g, level) => rewards.has(level), write() {}};
  MM.MapManager = {suppressed:g => g.level.id === 70, skillsEnabled:g => g.level.id !== 70,
    manualAim:g => rewards.has(80) && g.level.id !== 70};
  let evades = 0;
  const g = {screen:'playing', level:{id:1}, progression:{equipped:'gun'}, keys:new Set(), pointers:new Map(), padInputs:new Map(),
    player:{x:480, y:438, w:38, h:54, dir:1, ammo:100, shotTimer:0, rollTime:0, stunTime:0, petrifyTime:0},
    bullets:[], enemies:[], clearInputs() { this.keys.clear(); this.pointers.clear(); this.padInputs.clear(); this.player.vx = 0; MM.InputManager.reset(this); },
    tryRoll() { if (!this.blood) return false; evades++; this.player.rollTime = .32; return true; },
    updateUI() {}, updateAmmoUI() {}, burst() {}};
  MM.WeaponManager.init(g); MM.InputManager.init(g);
  const event = (code, repeat = false) => ({code, repeat, preventDefault() { this.prevented = true; }});
  const pair = (dir = 1) => { MM.InputManager.directionTap(g, dir); MM.InputManager.update(g, .1); return MM.InputManager.directionTap(g, dir); };
  return {g, MM, input:MM.InputManager, weapons:MM.WeaponManager, rewards, event, pair, evades:() => evades};
}

for (const id of ['gun', 'bones', 'club', 'bow', 'spear']) {
  test(`${id}: double direction never activates damaging roll slash`, () => {
    const {g, weapons, pair, evades} = fresh(); weapons.select(g, id);
    assert.equal(pair(1), false); assert.equal(g.rollSlash, null); assert.equal(g.player.rollTime, 0);
    assert.equal(pair(-1), false); assert.equal(g.rollSlash, null); assert.equal(evades(), 0);
  });
}

test('dual axes double direction activates exactly one exclusive roll slash in the requested direction', () => {
  for (const dir of [-1, 1]) {
    const {g, weapons, input, pair, evades} = fresh(); weapons.select(g, 'axes');
    assert.equal(pair(dir), true); const action = g.rollSlash;
    assert.equal(action.dir, dir); assert.equal(g.player.rollTime, 0); assert.equal(evades(), 0);
    for (let i = 0; i < 10; i++) input.directionTap(g, dir);
    assert.equal(g.rollSlash, action); assert.equal(action.hit.size, 0);
  }
});

test('opposite directions, late taps, and triplets cannot manufacture a second action', () => {
  const {g, weapons, input} = fresh(); weapons.select(g, 'axes');
  input.directionTap(g, -1); input.update(g, .1); input.directionTap(g, 1);
  assert.equal(g.rollSlash, null);
  input.update(g, .281); input.directionTap(g, 1); assert.equal(g.rollSlash, null);
  input.update(g, .1); assert.equal(input.directionTap(g, 1), true);
  const first = g.rollSlash; input.directionTap(g, 1); assert.equal(g.rollSlash, first);
});

test('map70 double direction runs its independent non-damaging evade, even with saved dual axes', () => {
  const {g, weapons, pair, evades} = fresh(); weapons.select(g, 'axes'); g.level.id = 70; g.blood = true;
  assert.equal(pair(-1), true); assert.equal(evades(), 1);
  assert.equal(g.rollSlash, null); assert.equal(g.player.rollTime, .32);
  assert.equal(g.progression.equipped, 'axes');
  g.level.id = 71; g.player.rollTime = 0;
  assert.equal(weapons.current(g), 'axes');
});

test('F short release cycles equipment, and keyboard repeat cannot restart the hold clock', () => {
  const {g, input, event} = fresh();
  assert.equal(input.keyDown(g, event('KeyF')), true); input.update(g, .1);
  const started = g.inputState.weaponDownAt;
  input.keyDown(g, event('KeyF', true)); assert.equal(g.inputState.weaponDownAt, started);
  assert.equal(input.keyUp(g, event('KeyF')), true);
  assert.equal(g.progression.equipped, 'bones'); assert.equal(g.weaponPicker.open, false);
  assert.equal(input.keyUp(g, event('KeyF')), false, 'one release cycles only once');
});

test('hold F at .35 seconds opens chooser and release cannot additionally quick-cycle', () => {
  const {g, input, event} = fresh();
  g.keys.add('ArrowRight'); g.pointers.set(1, {}); g.padInputs.set(2, 'right'); g.player.vx = 285;
  input.keyDown(g, event('KeyF')); input.update(g, .349);
  assert.equal(g.weaponPicker.open, false); input.update(g, .001);
  assert.equal(g.weaponPicker.open, true); assert.equal(g.weaponPicker.selected, 0);
  assert.equal(g.keys.size, 0); assert.equal(g.pointers.size, 0); assert.equal(g.padInputs.size, 0); assert.equal(g.player.vx, 0);
  input.keyUp(g, event('KeyF')); assert.equal(g.progression.equipped, 'gun');
});

test('chooser has input priority: arrows only select and Enter confirms without moving or rolling', () => {
  const {g, input, weapons, event, evades} = fresh(); weapons.select(g, 'axes'); input.open(g);
  const origin = g.player.x, selection = g.weaponPicker.selected;
  for (const code of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft']) assert.equal(input.keyDown(g, event(code)), true);
  assert.equal(g.player.x, origin); assert.equal(g.rollSlash, null); assert.equal(evades(), 0);
  assert.equal(g.weaponPicker.selected, selection);
  input.keyDown(g, event('ArrowRight')); input.keyDown(g, event('Enter'));
  assert.equal(g.weaponPicker.open, false); assert.equal(g.progression.equipped, 'gun');
  assert.equal(g.keys.size, 0);
});

test('touch direction taps use the same weapon gate, and touch hold/select shares the keyboard picker', () => {
  const {g, input, weapons, pair} = fresh(); weapons.select(g, 'bones');
  assert.equal(pair(1), false); assert.equal(g.rollSlash, null);
  input.weaponDown(g); input.update(g, .35); assert.equal(g.weaponPicker.open, true);
  input.weaponUp(g); assert.equal(input.select(g, 'axes'), true);
  assert.equal(g.progression.equipped, 'axes'); assert.equal(g.weaponPicker.open, false);
  assert.equal(pair(-1), true); assert.equal(g.rollSlash.dir, -1);
});

test('canceling a touch weapon hold never quick-cycles equipment', () => {
  const {g, input} = fresh(); input.weaponDown(g); input.update(g, .1);
  assert.equal(input.weaponCancel(g), true); assert.equal(input.weaponUp(g), false);
  assert.equal(g.progression.equipped, 'gun'); assert.equal(g.weaponPicker.open, false);
});

test('before reward10 F has no effect, and reward60 exclusively enables the hold picker', () => {
  const {g, input, event, rewards} = fresh(); rewards.clear();
  assert.equal(input.keyDown(g, event('KeyF')), false); assert.equal(input.weaponDown(g), false);
  rewards.add(10); input.weaponDown(g); input.update(g, 1);
  assert.equal(g.weaponPicker.open, false); input.weaponUp(g);
  assert.equal(g.progression.equipped, 'bones');
  rewards.add(60); input.weaponDown(g); input.update(g, .35); assert.equal(g.weaponPicker.open, true);
});

test('W/S are consumed only after reward80, and they never replace a melee weapon', () => {
  const {g, input, weapons, event, rewards} = fresh(); rewards.delete(80);
  assert.equal(input.keyDown(g, event('KeyW')), false, 'old W jump stays available before the reward');
  rewards.add(80); weapons.select(g, 'club');
  assert.equal(input.keyDown(g, event('KeyW')), true); assert.equal(g.aimMode, 'high');
  assert.equal(g.progression.equipped, 'club');
  assert.equal(input.keyDown(g, event('KeyS')), true); assert.equal(g.aimMode, 'ground');
  g.level.id = 70; assert.equal(input.keyDown(g, event('KeyW')), false);
});
