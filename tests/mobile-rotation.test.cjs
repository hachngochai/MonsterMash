'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function events(target = {}) {
  const listeners = new Map();
  target.addEventListener = (type, listener) => {
    const group = listeners.get(type) || []; group.push(listener); listeners.set(type, group);
  };
  target.emit = (type, value) => (listeners.get(type) || []).forEach(listener => listener(value));
  return target;
}

function fresh(options = {}) {
  const styles = new Map(), calls = [];
  const target = {dataset:{}, clientWidth:540, clientHeight:960,
    style:{setProperty(name, value) { styles.set(name, value); }}};
  const hint = {hidden:true};
  const button = events({setAttribute() {}, querySelector() { return null; }});
  const document = events({documentElement:target, fullscreenEnabled:true, fullscreenElement:null,
    querySelector() { return options.dialog ? {open:true} : null; }, querySelectorAll() { return []; },
    getElementById(id) { return id === 'fullscreen-button' ? button : id === 'rotate-hint' ? hint : null; }});
  const orientation = events({type:'portrait-primary'});
  if (options.lock) orientation.lock = () => { calls.push('lock'); return options.lock(); };
  if (options.fullscreen) target.requestFullscreen = () => { calls.push('fullscreen'); return options.fullscreen(); };
  const visualViewport = events({width:options.width || 540, height:options.height || 960, offsetLeft:0, offsetTop:0});
  const root = events({document, visualViewport, innerWidth:visualViewport.width, innerHeight:visualViewport.height,
    navigator:{maxTouchPoints:options.desktop ? 0 : 5}, screen:{orientation},
    matchMedia:query => ({matches:query==='(pointer:coarse)'&&!options.desktop})});
  const context = vm.createContext({document,
    getComputedStyle:canvas => ({objectFit:canvas.style.objectFit || 'fill', objectPosition:canvas.style.objectPosition || '50% 100%'})});
  for (const file of ['abyss-config.js','underwater-config.js','middle-sea-config.js','campaign.js','game.js','mobile.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, random:() => .5, storage:{getItem() { return null; }, setItem() {}}});
  game.settings.effects = false; game.start(1); game.spawnTimer = game.ammoTimer = 10000;
  game.player.ammo = game.player.maxAmmo;
  const rect = {left:10, top:20, width:540, height:960};
  Object.defineProperty(rect, 'right', {get() { return this.left + this.width; }});
  Object.defineProperty(rect, 'bottom', {get() { return this.top + this.height; }});
  game.canvas = {style:{objectFit:'fill', objectPosition:'50% 100%'}, width:960, height:540,
    getBoundingClientRect:() => rect, focus() {}, setPointerCapture() {}, releasePointerCapture() {}};
  game.screen = options.screen || 'playing';
  const actualClear = game.clearInputs.bind(game);
  game.clearInputs = () => { calls.push('clear'); actualClear(); };
  game.resize = () => calls.push({type:'resize', rotated:game.mobileRotation, landscape:target.dataset.landscape,
    width:styles.get('--mobile-vw'), height:styles.get('--mobile-vh')});
  const controller = new context.MM.MobileView(game, root);
  return {game, controller, root, document, target, hint, styles, calls, rect};
}

function pointer(f, id, u, v = 270, extra = {}) {
  const {rect, game} = f;
  const point = game.mobileRotation ? {clientX:rect.right - v, clientY:rect.top + u}
    : {clientX:rect.left + u, clientY:rect.top + v};
  return {pointerId:id, pointerType:'touch', button:0, preventDefault() {}, ...point, ...extra};
}
function tick(game, seconds) {
  while (seconds > 1e-8) { const dt = Math.min(1 / 60, seconds); game.update(dt); seconds -= dt; }
}
function pad(action) {
  return {dataset:{control:action}, classList:{add() {}, remove() {}}, setPointerCapture() {}, releasePointerCapture() {}};
}
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`); }
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('iPhone Safari gets a landscape layout before fullscreen even with no orientation APIs', async () => {
  for (const screen of ['home','playing','paused','result']) {
    const f = fresh({screen, dialog:true});
    assert.equal(f.document.fullscreenElement, null);
    assert.equal(f.game.mobileRotation, true, screen);
    assert.equal(f.target.dataset.landscape, 'rotated', screen);
    assert.equal(f.styles.get('--mobile-vw'), '540px');
    assert.equal(f.styles.get('--mobile-vh'), '960px');
    assert.equal(f.calls.filter(call => call === 'clear').length, 0, 'initial layout does not cancel a game action');
    await f.controller.enter(); await settle();
    assert.equal(f.game.mobileRotation, true, screen);
    assert.equal(f.game.screen, screen, 'CSS rotation does not start, resume, or restart gameplay');
  }
});

test('rejected Safari fullscreen and landscape lock retain the rotated normal-page layout', async () => {
  const f = fresh({screen:'home', fullscreen:() => Promise.reject(new Error('Not supported')),
    lock:() => Promise.reject(new Error('Not supported'))});
  await settle();
  assert.equal(f.game.mobileRotation, true);
  assert.equal(await f.controller.enter(), false);
  assert.equal(f.target.dataset.landscape, 'rotated');
  assert.equal(f.document.fullscreenElement, null); assert.equal(f.game.screen, 'home');
  assert.ok(f.calls.includes('fullscreen') && f.calls.includes('lock'));
});

test('ordinary desktop and physically landscape phones use native coordinates', () => {
  for (const options of [{desktop:true,width:1280,height:900},{desktop:true,width:900,height:1280},{width:960,height:540}]) {
    const f = fresh(options);
    assert.equal(f.game.mobileRotation, false);
    assert.equal(f.target.dataset.landscape, 'native');
  }
});

test('visual viewport dimensions and offsets update CSS before the game resizes', () => {
  const f = fresh(), viewport = f.root.visualViewport;
  f.calls.length = 0;
  Object.assign(viewport, {width:390, height:730, offsetLeft:7, offsetTop:11});
  viewport.emit('resize');
  assert.equal(f.styles.get('--mobile-vw'), '390px'); assert.equal(f.styles.get('--mobile-vh'), '730px');
  assert.equal(f.styles.get('--mobile-left'), '7px'); assert.equal(f.styles.get('--mobile-top'), '11px');
  const resized = f.calls.filter(call => call?.type === 'resize');
  assert.equal(resized.length, 1);
  assert.deepEqual(resized[0], {type:'resize', rotated:true, landscape:'rotated', width:'390px', height:'730px'});
  f.calls.length = 0; viewport.offsetTop = 19; viewport.emit('scroll');
  assert.equal(f.styles.get('--mobile-top'), '19px');
  assert.equal(f.calls.filter(call => call?.type === 'resize').length, 1);
});

test('window resize uses the current visual viewport before recalculating the game canvas', () => {
  const f = fresh({width:960,height:540}); f.calls.length = 0;
  Object.assign(f.root.visualViewport, {width:390,height:844});
  f.root.emit('resize');
  const resized = f.calls.filter(call => call?.type === 'resize');
  assert.equal(resized.length, 1);
  assert.deepEqual(resized[0], {type:'resize', rotated:true, landscape:'rotated', width:'390px', height:'844px'});
});

test('layout changes release all held inputs once while unchanged sync leaves them intact', () => {
  const f = fresh(), {game, controller, calls} = f;
  game.padDown(pointer(f, 1, 480), pad('right'));
  game.pointerDown(pointer(f, 2, 400)); game.pointerMove(pointer(f, 2, 340));
  game.keys.add('ArrowLeft');
  for (let i = 0; i < 5; i++) assert.equal(controller.sync(), false);
  assert.equal(game.padInputs.size, 1); assert.equal(game.pointers.size, 1); assert.equal(game.keys.size, 1);
  Object.assign(f.root.visualViewport, {width:960, height:540});
  assert.equal(controller.sync(), true);
  assert.equal(game.mobileRotation, false); assert.equal(f.target.dataset.landscape, 'native');
  assert.equal(game.padInputs.size, 0); assert.equal(game.pointers.size, 0); assert.equal(game.keys.size, 0);
  assert.equal(calls.filter(call => call === 'clear').length, 1);
  assert.equal(controller.sync(), false);
  assert.equal(calls.filter(call => call === 'clear').length, 1);
});

test('rotated canvas taps shoot toward the visible left and right halves', () => {
  const f = fresh(), {game} = f, ammo = game.player.ammo;
  for (const [id, u, dir] of [[1,100,-1],[2,820,1]]) {
    game.player.shotTimer = 0;
    const event = pointer(f, id, u);
    game.pointerDown(event); game.pointerUp(event);
    assert.equal(game.bullets.at(-1).dir, dir);
  }
  assert.equal(game.player.ammo, ammo - 2);
});

test('rotated left/right swipes move in the visible direction, independent of physical axis', () => {
  for (const dir of [-1,1]) {
    const f = fresh(), {game} = f, x = game.player.x;
    game.pointerDown(pointer(f, 1, 480)); game.pointerMove(pointer(f, 1, 480 + dir * 80));
    assert.equal(game.pointers.get(1).mode, 'move'); assert.equal(game.pointers.get(1).move, dir);
    tick(game, .25);
    assert.ok((game.player.x - x) * dir > 30);
    game.pointerUp(pointer(f, 1, 480 + dir * 80)); tick(game, .2);
    assert.equal(game.player.vx, 0);
  }
});

test('rotated upward and downward swipes jump and activate the normal shield', () => {
  for (const dir of [-1,1]) {
    const f = fresh(), {game} = f; game.shieldCount = 2;
    game.pointerDown(pointer(f, 1, 480, 270)); game.pointerMove(pointer(f, 1, 480, 270 + dir * 60));
    assert.equal(game.pointers.get(1).mode, 'vertical');
    if (dir < 0) { tick(game, 1 / 60); assert.ok(game.player.y < 438); assert.equal(game.shieldCount, 2); }
    else { assert.equal(game.player.shieldTime, 5); assert.equal(game.shieldCount, 1); assert.equal(game.player.jumpBuffer, 0); }
  }
});

test('rotation keeps the 22 CSS-pixel swipe threshold rather than using scaled world pixels', () => {
  const f = fresh();
  Object.assign(f.rect, {width:270,height:480});
  f.game.pointerDown(pointer(f, 1, 240, 135));
  f.game.pointerMove(pointer(f, 1, 261, 135));
  assert.equal(f.game.pointers.get(1).mode, 'pending');
  f.game.pointerMove(pointer(f, 1, 262, 135));
  assert.equal(f.game.pointers.get(1).mode, 'move');
});

test('two rotated touch pointers can move and fire independently and release separately', () => {
  const f = fresh(), {game} = f, x = game.player.x, ammo = game.player.ammo;
  game.pointerDown(pointer(f, 1, 480)); game.pointerMove(pointer(f, 1, 400));
  game.pointerDown(pointer(f, 2, 820)); tick(game, .4);
  assert.ok(game.player.x < x - 35); assert.ok(game.player.ammo < ammo);
  assert.ok(game.bullets.every(shot => shot.dir === 1));
  game.pointerUp(pointer(f, 2, 820));
  const remaining = game.player.ammo, movingX = game.player.x;
  tick(game, .25);
  assert.equal(game.player.ammo, remaining); assert.ok(game.player.x < movingX);
  assert.equal(game.pointers.size, 1);
});

test('visible mobile buttons keep their action semantics while the page is rotated', () => {
  const f = fresh(), {game} = f, right = pad('right'), fire = pad('fire-left'), x = game.player.x;
  game.padDown(pointer(f, 1, 50), right); game.padDown(pointer(f, 2, 900), fire);
  tick(game, .3);
  assert.ok(game.player.x > x + 35); assert.ok(game.bullets.every(shot => shot.dir === -1));
  game.padUp(pointer(f, 1, 50), right);
  assert.equal(game.padInputs.has(1), false); assert.equal(game.padInputs.has(2), true);
});

test('rotated world coordinates account for contain letterboxing and bottom-aligned cover cropping', () => {
  const f = fresh(), {game, rect} = f;
  Object.assign(rect, {width:540, height:1200}); game.canvas.style.objectFit = 'contain';
  let p = game.point(pointer(f, 1, 120, 270)); near(p.x, 0); near(p.y, 270);
  p = game.point(pointer(f, 1, 1080, 270)); near(p.x, 960); near(p.y, 270);
  Object.assign(rect, {width:400, height:960}); game.canvas.style.objectFit = 'cover';
  p = game.point(pointer(f, 1, 480, 200)); near(p.x, 480); near(p.y, 340);
  p = game.point(pointer(f, 1, 0, 400)); near(p.x, 0); near(p.y, 540);
});

function freshResize({width, height, rotated = false, dpr = 1}) {
  const transforms = [];
  const context = vm.createContext({devicePixelRatio:dpr,
    getComputedStyle:canvas => ({objectFit:canvas.style.objectFit || 'cover',
      objectPosition:canvas.style.objectPosition || '50% 100%'})});
  for (const file of ['abyss-config.js','underwater-config.js','middle-sea-config.js','campaign.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, {filename:file});
  }
  const game = new context.MM.Game({headless:true, random:() => .5,
    storage:{getItem() { return null; }, setItem() {}}});
  const rect = {left:17, top:29, width, height, right:17 + width, bottom:29 + height};
  game.canvas = {width:1, height:1, style:{objectFit:'cover', objectPosition:'50% 100%'},
    getBoundingClientRect:() => rect};
  game.ctx = {setTransform(...values) { transforms.push(values); }};
  game.mobileRotation = rotated;
  game.headless = false;
  return {game, rect, transforms};
}

for (const viewport of [
  {name:'wide desktop', width:1422, height:556, dpr:1},
  {name:'landscape phone', width:844, height:300, dpr:3},
  {name:'CSS-rotated portrait iPhone', width:390, height:844, rotated:true, dpr:3}
]) {
  test(`real resize preserves the complete 960×540 arena on ${viewport.name}`, () => {
    const {game, rect, transforms} = freshResize(viewport);
    game.viewTop = 180;
    const hanging = {homeY:340, baseHomeY:180, h:60};
    const ledge = {homeY:360, baseHomeY:255, h:90, platform:{y:360}};
    game.enemies = [hanging, ledge];

    game.resize();

    const dpr = Math.min(viewport.dpr, 2);
    assert.equal(game.canvas.width, 960 * dpr);
    assert.equal(game.canvas.height, 540 * dpr);
    assert.equal(game.dpr, dpr);
    assert.deepEqual(transforms.at(-1), [dpr, 0, 0, dpr, 0, 0]);
    assert.equal(game.canvas.style.objectFit, 'contain');
    assert.equal(game.canvas.style.objectPosition, '50% 50%');
    assert.equal(game.viewTop, 0, 'resize cannot crop away the sky or flying enemies');
    assert.equal(hanging.homeY, 180, 'a formerly cropped flying position returns to its base height');
    assert.equal(ledge.homeY, 255);
    assert.equal(ledge.platform.y, 255, 'ledge platform follows the restored base height');

    const logicalWidth = viewport.rotated ? rect.height : rect.width;
    const logicalHeight = viewport.rotated ? rect.width : rect.height;
    const scale = Math.min(logicalWidth / 960, logicalHeight / 540);
    const left = (logicalWidth - 960 * scale) / 2;
    const top = (logicalHeight - 540 * scale) / 2;
    assert.ok(left >= 0 && top >= 0, 'all letterboxing remains outside the arena');
    near(left + 960 * scale, logicalWidth - left);
    near(top + 540 * scale, logicalHeight - top);

    for (const [x, y] of [[0, 0], [960, 0], [0, 540], [960, 540], [480, 270]]) {
      const u = left + x * scale, v = top + y * scale;
      const event = viewport.rotated ? {clientX:rect.right - v, clientY:rect.top + u}
        : {clientX:rect.left + u, clientY:rect.top + v};
      assert.ok(event.clientX >= rect.left - 1e-7 && event.clientX <= rect.right + 1e-7);
      assert.ok(event.clientY >= rect.top - 1e-7 && event.clientY <= rect.bottom + 1e-7);
      const point = game.point(event);
      near(point.x, x); near(point.y, y);
    }
  });
}
