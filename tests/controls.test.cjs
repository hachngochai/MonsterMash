'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const context = vm.createContext({});
for (const file of ['abyss-config.js','underwater-config.js','middle-sea-config.js','campaign.js', 'game.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
}
const { Game } = context.MM;

function storage(initial) {
  let saved = initial === undefined ? null : JSON.stringify(initial);
  return { getItem() { return saved; }, setItem(key, value) { saved = value; }, read() { return JSON.parse(saved || '{}'); } };
}

function fresh(saved) {
  const game = new Game({ headless: true, random: () => 0.5, storage: saved || storage() });
  game.settings.effects = false;
  game.start(1);
  // Keep actual movement, firing, cooldown and timers, without unrelated waves.
  game.spawnTimer = 10000;
  game.ammoTimer = 10000;
  game.player.ammo = game.player.maxAmmo;
  return game;
}

function tick(game, seconds) {
  while (seconds > 1e-8) {
    const dt = Math.min(1 / 60, seconds);
    game.update(dt);
    seconds -= dt;
  }
}

function button(action) {
  const captures = new Set(), classes = new Set();
  return {
    dataset: { control: action }, captures,
    setPointerCapture(id) { captures.add(id); },
    releasePointerCapture(id) { captures.delete(id); },
    classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); }, toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); } }
  };
}

const pointer = (pointerId, clientX = 500, clientY = 300, extra = {}) => ({ pointerId, clientX, clientY, pointerType: 'touch', button: 0, preventDefault() {}, ...extra });
const key = code => ({ code, repeat: false, preventDefault() {} });

test('holding move and fire buttons moves and shoots independently, including the first shot', () => {
  const game = fresh(), move = button('right'), fire = button('fire-left');
  const x = game.player.x, ammo = game.player.ammo;
  game.padDown(pointer(1), move);
  game.padDown(pointer(2), fire);
  assert.equal(game.player.ammo, ammo - 1, 'fire button responds on press');
  assert.equal(game.bullets[0].dir, -1);
  tick(game, 0.4);
  assert.ok(game.player.x > x + 50);
  assert.ok(game.player.ammo < ammo - 1, 'holding repeats fire after cooldown');
  assert.ok(game.bullets.every(bullet => bullet.dir === -1));
  assert.ok(move.captures.has(1) && fire.captures.has(2));
});

test('releasing fire keeps held movement active and spends no more ammunition', () => {
  const game = fresh(), move = button('right'), fire = button('fire-right');
  game.padDown(pointer(1), move);
  game.padDown(pointer(2), fire);
  tick(game, 0.3);
  game.padUp(pointer(2), fire);
  const x = game.player.x, ammo = game.player.ammo;
  tick(game, 0.35);
  assert.ok(game.player.x > x + 50);
  assert.equal(game.player.ammo, ammo);
  assert.equal(fire.captures.has(2), false);
  assert.equal(move.captures.has(1), true);
});

test('releasing movement keeps directional fire held while the player comes to rest', () => {
  const game = fresh(), move = button('left'), fire = button('fire-right');
  game.padDown(pointer(1), move);
  game.padDown(pointer(2), fire);
  tick(game, 0.3);
  game.padUp(pointer(1), move);
  tick(game, 0.2);
  const restingX = game.player.x, ammo = game.player.ammo;
  tick(game, 0.3);
  assert.equal(game.player.x, restingX);
  assert.equal(game.player.vx, 0);
  assert.ok(game.player.ammo < ammo);
  assert.equal(move.captures.has(1), false);
  assert.equal(fire.captures.has(2), true);
});

test('opposing movement buttons cancel regardless of press order, then the remaining direction resumes', () => {
  for (const firstDirection of ['left', 'right']) {
    const game = fresh(), left = button('left'), right = button('right');
    const first = firstDirection === 'left' ? left : right;
    const second = firstDirection === 'left' ? right : left;
    game.padDown(pointer(1), first);
    game.padDown(pointer(2), second);
    const x = game.player.x;
    tick(game, 0.3);
    assert.equal(game.player.x, x);
    assert.equal(game.player.vx, 0);
    game.padUp(pointer(1), first);
    tick(game, 0.2);
    assert.ok(second === right ? game.player.x > x : game.player.x < x);
  }
});

test('pointer cancellation releases only its button; clearInputs stops buttons, gestures and keys together', () => {
  const game = fresh(), move = button('right'), fire = button('fire-left');
  game.padDown(pointer(1), move);
  game.padDown(pointer(2), fire);
  tick(game, 0.2);
  game.padUp(pointer(1, 500, 300, { type: 'pointercancel' }), move);
  tick(game, 0.2);
  const ammo = game.player.ammo;
  tick(game, 0.2);
  assert.equal(game.player.vx, 0);
  assert.ok(game.player.ammo < ammo, 'canceling movement does not cancel the other finger');
  game.pointerDown(pointer(3, 500));
  game.pointerMove(pointer(3, 430));
  game.keyDown(key('ArrowRight'));
  game.clearInputs();
  const x = game.player.x, stoppedAmmo = game.player.ammo;
  tick(game, 0.4);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, stoppedAmmo);
  assert.equal(game.keys.size, 0);
  assert.equal(game.pointers.size, 0);
  assert.equal(game.padInputs.size, 0);
});

test('holding jump performs one jump and requires another press after landing', () => {
  const game = fresh(), jump = button('jump');
  game.padDown(pointer(1), jump);
  tick(game, 1 / 60);
  assert.ok(game.player.y < 438);
  assert.equal(game.player.grounded, false);
  tick(game, 1.2);
  assert.equal(game.player.y, 438);
  assert.equal(game.player.grounded, true);
  tick(game, 0.3);
  assert.equal(game.player.y, 438, 'the held button cannot automatically jump again');
  game.padUp(pointer(1), jump);
  game.padDown(pointer(2), jump);
  tick(game, 1 / 60);
  assert.ok(game.player.y < 438);
});

test('a shield press spends one charge; holding never reactivates after expiry', () => {
  const game = fresh(), shield = button('shield');
  game.shieldCount = 2;
  game.padDown(pointer(1), shield);
  assert.equal(game.shieldCount, 1);
  assert.equal(game.player.shieldHits, 3);
  assert.equal(game.player.shieldTime, 5);
  tick(game, 5.2);
  assert.equal(game.player.shieldTime, 0);
  assert.equal(game.shieldCount, 1);
  game.padUp(pointer(1), shield);
  game.padDown(pointer(2), shield);
  assert.equal(game.shieldCount, 0);
  assert.equal(game.player.shieldTime, 5);
});

test('buttons-only mode ignores canvas touch gestures and taps while retaining PC mouse and keyboard', () => {
  const game = fresh();
  game.settings.controls = 'buttons';
  const x = game.player.x, ammo = game.player.ammo;
  game.pointerDown(pointer(1, 100));
  game.pointerMove(pointer(1, 250));
  game.pointerUp(pointer(1, 250));
  game.pointerDown(pointer(2, 800));
  tick(game, 0.4);
  game.pointerUp(pointer(2, 800));
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  assert.equal(game.pointers.size, 0);
  game.pointerDown(pointer(3, 800, 300, { pointerType: 'mouse' }));
  assert.equal(game.player.ammo, ammo - 1);
  assert.equal(game.bullets.at(-1).dir, 1);
  tick(game, 0.4);
  game.pointerUp(pointer(3, 800, 300, { pointerType: 'mouse' }));
  assert.ok(game.player.ammo < ammo - 1);
  game.player.ammo = game.player.maxAmmo;
  game.keyDown(key('ArrowLeft'));
  game.keyDown(key('KeyA'));
  tick(game, 0.3);
  assert.ok(game.player.x < x);
  assert.ok(game.bullets.some(bullet => bullet.dir === -1));
  assert.ok(game.player.ammo < game.player.maxAmmo);
});

test('a canvas movement swipe and a held fire button work together', () => {
  const game = fresh(), fire = button('fire-right');
  game.settings.controls = 'both';
  const x = game.player.x, ammo = game.player.ammo;
  game.pointerDown(pointer(1, 500));
  game.pointerMove(pointer(1, 425));
  game.padDown(pointer(2), fire);
  tick(game, 0.35);
  assert.ok(game.player.x < x - 40);
  assert.ok(game.player.ammo < ammo - 1);
  assert.ok(game.bullets.every(bullet => bullet.dir === 1));
  game.pointerUp(pointer(1, 425));
  tick(game, 0.2);
  const restingX = game.player.x, remainingAmmo = game.player.ammo;
  tick(game, 0.25);
  assert.equal(game.player.x, restingX);
  assert.ok(game.player.ammo < remainingAmmo);
});

test('a held move button and a canvas fire gesture work together and release independently', () => {
  const game = fresh(), move = button('right');
  game.settings.controls = 'both';
  const x = game.player.x, ammo = game.player.ammo;
  game.padDown(pointer(1), move);
  game.pointerDown(pointer(2, 120));
  tick(game, 0.5);
  assert.ok(game.player.x > x + 70);
  assert.ok(game.player.ammo < ammo);
  assert.ok(game.bullets.every(bullet => bullet.dir === -1));
  game.padUp(pointer(1), move);
  tick(game, 0.2);
  const restingX = game.player.x, remainingAmmo = game.player.ammo;
  tick(game, 0.25);
  assert.equal(game.player.x, restingX);
  assert.ok(game.player.ammo < remainingAmmo);
  game.pointerUp(pointer(2, 120));
  const releasedAmmo = game.player.ammo;
  tick(game, 0.3);
  assert.equal(game.player.ammo, releasedAmmo);
});

test('control preferences default safely and reject obsolete or malformed saved choices', () => {
  for (const invalid of [undefined, null, 'invalid', 'BOTH', 0, {}, []]) {
    const game = new Game({ headless: true, storage: storage({ settings: { controls: invalid } }) });
    assert.equal(game.settings.controls, 'both');
  }
  const oldSave = new Game({ headless: true, storage: storage({ version: 2, settings: { difficulty: 'hard' } }) });
  assert.equal(oldSave.settings.controls, 'both');
  assert.equal(oldSave.settings.difficulty, 'hard');
  const denied = new Game({ headless: true, storage: { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } } });
  assert.equal(denied.settings.controls, 'both');
  assert.doesNotThrow(() => denied.persist());
});

test('all three control modes survive saving and reload without resetting progress', () => {
  for (const mode of ['both', 'gestures', 'buttons']) {
    const saved = storage({ completed: [1, 2], resume: 3, settings: { controls: 'both' } });
    const game = new Game({ headless: true, storage: saved });
    game.settings.controls = mode;
    game.persist();
    assert.equal(saved.read().settings.controls, mode);
    const reloaded = new Game({ headless: true, storage: saved });
    assert.equal(reloaded.settings.controls, mode);
    assert.equal(reloaded.save.resume, 3);
    assert.equal(reloaded.save.completed.join(','), '1,2');
  }
});

test('two-second stun prevents movement, firing and jumping, but allows a shield and recovery', () => {
  const game = fresh(), move = button('left'), fire = button('fire-right'), jump = button('jump'), shield = button('shield');
  game.player.stunTime = 2;
  const x = game.player.x, ammo = game.player.ammo;
  game.padDown(pointer(1), move);
  game.padDown(pointer(2), fire);
  game.padDown(pointer(3), jump);
  tick(game, 1.8);
  assert.equal(game.player.x, x);
  assert.equal(game.player.y, 438);
  assert.equal(game.player.ammo, ammo);
  assert.equal(game.player.jumpBuffer, 0);
  assert.ok(game.player.stunTime > 0);
  game.shieldCount = 1;
  game.padDown(pointer(4), shield);
  assert.equal(game.shieldCount, 0);
  assert.equal(game.player.shieldTime, 5);
  tick(game, 0.1);
  assert.equal(game.player.x, x);
  assert.equal(game.player.ammo, ammo);
  tick(game, 0.2);
  assert.equal(game.player.stunTime, 0);
  assert.ok(game.player.x < x, 'held movement recovers after the stun');
  assert.ok(game.player.ammo < ammo, 'held shooting recovers after the stun');
  assert.equal(game.player.y, 438, 'a jump pressed during stun does not trigger late');
  assert.ok(game.player.shieldTime > 0);
  assert.ok(game.player.stunGrace > 0 && game.player.stunGrace <= 0.6);
  game.padUp(pointer(3), jump);
  game.padDown(pointer(5), jump);
  tick(game, 1 / 60);
  assert.ok(game.player.y < 438, 'a fresh jump works after recovery');
  tick(game, 0.7);
  assert.equal(game.player.stunGrace, 0);
});

test('pausing freezes a stun and stage restart removes its residual timers', () => {
  const game = fresh();
  game.player.stunTime = 2;
  game.togglePause();
  tick(game, 0.75);
  assert.equal(game.player.stunTime, 2);
  game.togglePause();
  tick(game, 0.25);
  assert.ok(game.player.stunTime < 2 && game.player.stunTime > 1.7);
  game.start(2);
  assert.equal(game.player.stunTime, 0);
  assert.equal(game.player.stunGrace, 0);
  assert.equal(game.player.knockdownTime, 0);
});
