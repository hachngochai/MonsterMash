const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  const logs = [];
  let depth = 0;
  const gradient = {addColorStop(...args) { logs.push(['addColorStop', ...args]); }};
  const ctx = new Proxy({
    globalAlpha: 1,
    save() { depth++; logs.push(['save']); },
    restore() { depth--; logs.push(['restore']); },
    createLinearGradient(...args) { logs.push(['linear', ...args]); return gradient; },
    createRadialGradient(...args) { logs.push(['radial', ...args]); return gradient; }
  }, {
    get(target, key) { return key in target ? target[key] : (...args) => logs.push([key, ...args]); },
    set(target, key, value) { target[key] = value; return true; }
  });
  const scope = {window: {MM: {}}};
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/abyss-renderer.js'), 'utf8'), scope);
  const A = scope.window.MM.AbyssRenderer;
  const image = {width: 1315, height: 1196};
  A.setSprite('knight', image);
  const game = {level: {id: 140}, time: 2, settings: {}, abyss: {}, player: {x: 270, y: 438, w: 38, h: 54, dir: 1}};
  const enemy = {type: 'fossilRoc', abyssForm: 'knight', abyssPhase: 2, abyssState: 'knight',
    x: 700, y: 438, w: 64, h: 96, health: 90, maxHealth: 90, boss: true, dir: -1, abyssWalkVelocity: 0};
  function draw() {
    logs.length = 0;
    assert.equal(A.drawEnemy(ctx, game, enemy), true);
    assert.equal(depth, 0, 'every frame restores the Canvas state');
    return logs.map(call => call.slice());
  }
  return {A, ctx, logs, image, game, enemy, draw};
}

const transforms = calls => calls.filter(call => call[0] === 'transform');
const frames = calls => calls.filter(call => call[0] === 'drawImage');
function transformDelta(a, b) {
  assert.equal(a.length, b.length, 'surface topology stays stable');
  let maximum = 0;
  for (let i = 0; i < a.length; i++) {
    // Translation is in local display pixels; matrix coefficients are unitless.
    for (let j = 1; j <= 6; j++) maximum = Math.max(maximum, Math.abs(a[i][j] - b[i][j]));
  }
  return maximum;
}

test('bird knight uses its original connected artwork without folded triangles or sprite cut-out holes', () => {
  const {image, game, enemy, draw} = fixture();
  for (const [state, skill] of [['knight', null], ['tell', 'scythe'], ['charge', 'dash'], ['combo', 'combo'], ['rest', null]]) {
    enemy.abyssState = state; enemy.abyssSkill = skill; enemy.abyssProgress = .5;
    enemy.abyssWalkVelocity = state === 'charge' ? -420 : -120;
    for (let frame = 0; frame < 25; frame++) {
      game.time += 1 / 60;
      enemy.x -= Math.abs(enemy.abyssWalkVelocity) / 60;
      const calls = draw(), painted = frames(calls), mesh = transforms(calls);
      assert.ok(painted.length > 1 && painted.length <= 160, 'the animation uses one bounded connected surface');
      assert.ok(mesh.length > 1 && mesh.every(call => call.slice(1).every(Number.isFinite)));
      assert.ok(mesh.every(call => call[1] * call[4] - call[2] * call[3] > 0), 'the image never folds or mirrors inside a limb');
      assert.ok(painted.every(call => call[1] === image && call.slice(2).every(Number.isFinite)));
      assert.ok(painted.every(call => call[2] >= 42 - 1e-8 && call[3] >= 6 - 1e-8 &&
        call[4] > 0 && call[5] > 0 && call[2] + call[4] <= 1302 + 1e-8 && call[3] + call[5] <= 1181 + 1e-8), 'source samples stay in the approved sprite crop');
      assert.equal(calls.some(call => call[0] === 'clip' && call[1] === 'evenodd'), false, 'no detached wing or empty shoulder cut-out');
    }
  }
});

test('walking knight has a real gait and blends into tells and recovery without a one-frame snap', () => {
  const f = fixture();
  f.draw();
  f.enemy.abyssWalkVelocity = -120;
  let moving;
  for (let i = 0; i < 30; i++) { f.game.time += 1 / 60; f.enemy.x -= 2; moving = transforms(f.draw()); }
  const still = fixture(); still.draw();
  for (let i = 0; i < 30; i++) { still.game.time += 1 / 60; still.draw(); }
  assert.ok(transformDelta(moving, transforms(still.draw())) > .05, 'feet and body respond to actual walking rather than only idle breathing');
  for (const [state, skill] of [['tell', 'scythe'], ['rest', null], ['knight', null]]) {
    const before = transforms(f.draw());
    f.enemy.abyssState = state; f.enemy.abyssSkill = skill; f.enemy.abyssProgress = 0; f.enemy.abyssWalkVelocity = 0;
    f.game.time += 1 / 60;
    assert.ok(transformDelta(before, transforms(f.draw())) < 3, 'one simulation frame blends the old pose into the new one');
  }
});

test('a teleport cannot be mistaken for running and repeated paused draws do not advance the knight pose', () => {
  const teleported = fixture(), stationary = fixture();
  teleported.draw(); stationary.draw();
  teleported.game.time += 1 / 60; stationary.game.time += 1 / 60;
  teleported.enemy.x += 300;
  const jumped = transforms(teleported.draw()), idle = transforms(stationary.draw());
  assert.deepEqual(jumped, idle, 'a discontinuous world-position change does not restart the gait or add a speed burst');
  assert.deepEqual(transforms(teleported.draw()), jumped, 'two draws at the same game time are identical');
  teleported.game.screen = 'paused';
  for (let i = 0; i < 3; i++) assert.deepEqual(transforms(teleported.draw()), jumped, 'paused time does not animate the mesh');
});

test('bird knight rendering leaves gameplay intact and honors reduced motion, disabled effects and petrification', () => {
  for (const mode of ['reducedMotion', 'effectsOff', 'petrified', 'corpse']) {
    const f = fixture();
    if (mode === 'reducedMotion') f.game.settings.reducedMotion = true;
    if (mode === 'effectsOff') f.game.settings.effects = false;
    if (mode === 'petrified') f.enemy.petrifiedTime = 2;
    if (mode === 'corpse') f.enemy.abyssState = 'corpse';
    const saved = JSON.stringify({game: f.game, enemy: f.enemy});
    const calls = f.draw();
    assert.equal(frames(calls).length, 1, mode + ' retains the whole original static artwork');
    assert.equal(transforms(calls).length, 0);
    assert.equal(JSON.stringify({game: f.game, enemy: f.enemy}), saved, 'rendering never changes HP, cooldowns, movement or inventory');
  }
  const f = fixture(); const saved = JSON.stringify({game: f.game, enemy: f.enemy}); f.draw();
  assert.equal(JSON.stringify({game: f.game, enemy: f.enemy}), saved);
});

test('the knight surface does not change the bird form or other bosses', () => {
  const {A, ctx, logs, game} = fixture();
  for (const [key, type, extra] of [['roc', 'fossilRoc', {abyssForm: 'bird', airborne: true, abyssState: 'air'}], ['minotaur', 'minotaurLord', {abyssState: 'patrol'}]]) {
    const image = key === 'roc' ? {width: 1529, height: 1029} : {width: 1492, height: 1054};
    A.setSprite(key, image); logs.length = 0;
    A.drawEnemy(ctx, game, {type, x: 700, y: 438, w: 158, h: 180, health: 100, boss: true, dir: 1, ...extra});
    assert.equal(frames(logs).length, 3, key + ' keeps its existing wing/leg rendering');
    assert.ok(frames(logs).every(call => call[1] === image));
    assert.equal(transforms(logs).length, 0, 'only the knight receives its new surface animation');
  }
});
