'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/mobile.js'), 'utf8'), context);
const Controller = context.MM.MobileView;

function events(target = {}) {
  const listeners = new Map();
  target.addEventListener = (type, listener) => {
    const group = listeners.get(type) || [];
    group.push(listener);
    listeners.set(type, group);
  };
  target.emit = (type, event) => (listeners.get(type) || []).forEach(listener => listener(event));
  return target;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture(options = {}) {
  const calls = [];
  const button = events({ id: 'fullscreen-button', textContent: '', title: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
  const hint = { hidden: true };
  const document = events({ fullscreenEnabled: true, fullscreenElement: null, getElementById(id) { return id === 'fullscreen-button' ? button : id === 'rotate-hint' ? hint : null; } });
  const target = { clientWidth: 390, clientHeight: 844 };
  document.documentElement = target;
  target.requestFullscreen = function () {
    assert.equal(this, target);
    calls.push('request');
    if (options.request) return options.request(document, target);
    document.fullscreenElement = target;
    document.emit('fullscreenchange');
    return Promise.resolve();
  };
  document.exitFullscreen = function () {
    assert.equal(this, document);
    calls.push('exit');
    if (options.exit) return options.exit(document);
    document.fullscreenElement = null;
    document.emit('fullscreenchange');
    return Promise.resolve();
  };
  const orientation = events({ type: 'portrait-primary', lock(value) { calls.push('lock:' + value); return options.lock ? options.lock() : Promise.resolve(); }, unlock() { calls.push('unlock'); if (options.unlock) options.unlock(); } });
  const root = events({ document, innerWidth: 390, innerHeight: 844, navigator: { maxTouchPoints: options.touchPoints ?? 1, userAgent:options.ua||'', standalone:options.standalone===true }, screen: { orientation }, matchMedia: query => ({ matches:query==='(display-mode: standalone)' ? options.standalone===true : options.coarse ?? true }) });
  const game = { screen: options.screen || 'playing', lastTime: 44, canvas: { focus() { calls.push('focus'); } }, resize() { calls.push('resize'); }, clearInputs() { calls.push('clear'); }, togglePause() { calls.push('pause'); this.screen = this.screen === 'playing' ? 'paused' : 'playing'; } };
  const controller = new Controller(game, root);
  return { controller, game, root, document, target, orientation, button, hint, calls };
}

const settle = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
const count = (calls, name) => calls.filter(call => call === name).length;

test('touch entry requests the whole document synchronously, then locks landscape', async () => {
  const pending = deferred();
  const f = fixture({ request: () => pending.promise });
  const result = f.controller.enter();
  assert.deepEqual(f.calls, ['request']);
  assert.equal(f.hint.hidden, false);
  f.document.fullscreenElement = f.target;
  f.document.emit('fullscreenchange');
  pending.resolve();
  assert.equal(await result, true);
  assert.ok(f.calls.indexOf('request') < f.calls.indexOf('lock:landscape'));
  assert.equal(f.game.screen, 'playing');
  assert.equal(count(f.calls, 'pause'), 0);
  assert.equal(f.button.textContent, 'Thoát toàn màn hình');
  assert.equal(f.button.title, 'Thoát toàn màn hình');
  assert.equal(f.button.attributes['aria-pressed'], 'true');
});

test('iPhone without fullscreen gives installation help only on a manual request',async()=>{
 const f=fixture({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'});
 delete f.target.requestFullscreen;delete f.orientation.lock;
 const dialogs=[];f.game.openDialog=id=>{dialogs.push(id);f.game.togglePause();};f.controller.sync();
 assert.equal(f.button.title,'Chơi trọn màn');assert.equal(await f.controller.enter(),false);assert.deepEqual(dialogs,[]);
 f.button.emit('click');assert.deepEqual(dialogs,['ios-install-dialog']);assert.equal(f.game.screen,'paused');assert.equal(count(f.calls,'request'),0);
});

test('iPhone rejected fullscreen falls back to install help after its manual click',async()=>{
 const f=fixture({ua:'iPhone',request:()=>Promise.reject(new Error('unsupported'))}),dialogs=[];
 f.game.openDialog=id=>{dialogs.push(id);f.game.togglePause();};f.button.emit('click');await settle();
 assert.deepEqual(dialogs,['ios-install-dialog']);assert.equal(f.game.screen,'paused');assert.equal(f.document.fullscreenElement,null);
});

test('installed iPhone app uses standalone without another fullscreen request or install prompt',async()=>{
 const f=fixture({ua:'iPhone',standalone:true});assert.equal(f.controller.standalone,true);assert.equal(f.button.hidden,true);
 assert.equal(await f.controller.enter(),true);assert.equal(count(f.calls,'request'),0);assert.equal(f.game.screen,'playing');
});

test('touch points detect touch without relying on the user agent', async () => {
  const f = fixture({ coarse: false, touchPoints: 2 });
  assert.equal(f.controller.mobile, true);
  assert.equal(await f.controller.enter(), true);
  assert.equal(count(f.calls, 'request'), 1);
});

test('desktop does not enter automatically, but the manual button can enter', async () => {
  const f = fixture({ coarse: false, touchPoints: 0 });
  assert.equal(await f.controller.enter(), false);
  assert.equal(count(f.calls, 'request'), 0);
  assert.equal(f.hint.hidden, true);
  f.button.emit('click');
  assert.equal(count(f.calls, 'request'), 1);
  await settle();
  assert.equal(count(f.calls, 'lock:landscape'), 0);
  assert.equal(f.game.screen, 'playing');
  assert.equal(count(f.calls, 'focus'), 1);
});

test('unsupported fullscreen and orientation preserve normal portrait play', async () => {
  const f = fixture();
  delete f.target.requestFullscreen;
  delete f.orientation.lock;
  assert.equal(await f.controller.enter(), false);
  assert.equal(f.game.screen, 'playing');
  assert.equal(f.hint.hidden, false);
  assert.equal(f.button.title, 'Toàn màn hình');
  assert.equal(count(f.calls, 'pause'), 0);
  const minimal = new Controller({ screen: 'playing' }, {});
  assert.equal(await minimal.enter(true), false);
  assert.equal(await minimal.leave(), false);
});

test('rejected fullscreen and orientation APIs are safe fallback paths', async () => {
  const f = fixture({ request: () => Promise.reject(new Error('Denied')), lock: () => Promise.reject(new Error('Unsupported')) });
  assert.equal(await f.controller.enter(), false);
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  assert.equal(f.game.screen, 'playing');
  assert.equal(f.hint.hidden, false);
  assert.equal(f.controller.pending, null);
});

test('orientation can succeed when an installed browser does not offer fullscreen', async () => {
  const f = fixture();
  delete f.target.requestFullscreen;
  assert.equal(await f.controller.enter(), true);
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  f.game.screen = 'home';
  await f.controller.leave();
  assert.equal(count(f.calls, 'unlock'), 1);
  assert.equal(count(f.calls, 'exit'), 0);
});

test('duplicate entry calls share the request and do not relock owned fullscreen', async () => {
  const pending = deferred();
  const f = fixture({ request: () => pending.promise });
  const first = f.controller.enter();
  const second = f.controller.enter();
  assert.equal(first, second);
  assert.equal(count(f.calls, 'request'), 1);
  f.document.fullscreenElement = f.target;
  f.document.emit('fullscreenchange');
  pending.resolve();
  await first;
  assert.equal(await f.controller.enter(), true);
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  assert.equal(count(f.calls, 'pause'), 0);
});

test('leaving before fullscreen resolves cancels locking and removes the stale fullscreen', async () => {
  const pending = deferred();
  const f = fixture({ request: () => pending.promise });
  const entered = f.controller.enter();
  f.game.screen = 'home';
  assert.equal(await f.controller.leave(), false);
  assert.equal(f.hint.hidden, false, 'the home fallback still offers the rotation guide');
  f.document.fullscreenElement = f.target;
  f.document.emit('fullscreenchange');
  pending.resolve();
  assert.equal(await entered, false);
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(count(f.calls, 'lock:landscape'), 0);
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(count(f.calls, 'exit'), 1);
  assert.equal(count(f.calls, 'pause'), 0);
});

test('leaving during an orientation lock unlocks both pending and late resolution', async () => {
  const lock = deferred();
  const f = fixture({ lock: () => lock.promise });
  const entered = f.controller.enter();
  await settle();
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  f.game.screen = 'home';
  await f.controller.leave();
  assert.equal(count(f.calls, 'exit'), 1);
  assert.ok(count(f.calls, 'unlock') >= 1);
  lock.resolve();
  assert.equal(await entered, false);
  assert.equal(f.controller.ownsOrientation, false);
  assert.ok(count(f.calls, 'unlock') >= 2);
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(count(f.calls, 'pause'), 0);
});

test('home navigation does not exit fullscreen owned by another feature', async () => {
  const f = fixture();
  f.document.fullscreenElement = f.target;
  f.controller.wasFullscreen = true;
  // Joining existing fullscreen only owns the orientation lock.
  assert.equal(await f.controller.enter(), true);
  f.game.screen = 'home';
  assert.equal(await f.controller.leave(), false);
  assert.equal(count(f.calls, 'request'), 0);
  assert.equal(count(f.calls, 'exit'), 0);
  assert.equal(count(f.calls, 'unlock'), 1);
  assert.equal(f.document.fullscreenElement, f.target);
});

test('unexpected fullscreen exit clears input, resets timing, unlocks and pauses once', async () => {
  const f = fixture();
  await f.controller.enter();
  f.calls.length = 0;
  f.document.fullscreenElement = null;
  f.document.emit('fullscreenchange');
  assert.equal(count(f.calls, 'clear'), 1);
  assert.equal(count(f.calls, 'pause'), 1);
  assert.equal(count(f.calls, 'unlock'), 1);
  assert.equal(f.game.lastTime, 0);
  assert.equal(f.game.screen, 'paused');
  assert.equal(f.button.title, 'Toàn màn hình');
  assert.equal(f.hint.hidden, true);
  f.document.emit('fullscreenchange');
  assert.equal(count(f.calls, 'pause'), 1);
});

test('sync is idle until viewport geometry changes, then releases held input without changing game timing', () => {
  const f = fixture();
  f.calls.length = 0;
  for (let index = 0; index < 30; index++) f.controller.sync();
  assert.equal(f.hint.hidden, false);
  assert.deepEqual(f.calls, []);
  f.root.innerWidth = 844;
  f.root.innerHeight = 390;
  f.controller.sync();
  assert.equal(f.hint.hidden, true);
  assert.deepEqual(f.calls, ['clear']);
  f.controller.sync();assert.equal(count(f.calls,'clear'),1);
  assert.equal(f.game.lastTime, 44);
  assert.equal(f.game.screen, 'playing');
  f.root.emit('resize');
  assert.equal(count(f.calls, 'resize'), 1);
});

test('manual exit releases owned mode and pauses instead of restarting gameplay', async () => {
  const f = fixture();
  await f.controller.enter();
  f.button.emit('click');
  await settle();
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(count(f.calls, 'exit'), 1);
  assert.equal(count(f.calls, 'pause'), 1);
  assert.equal(f.game.screen, 'paused');
  assert.equal(f.controller.ownsOrientation, false);
});

test('synchronous browser exceptions never prevent normal game play', async () => {
  const f = fixture({ request: () => { throw new Error('Policy'); }, lock: () => { throw new Error('Policy'); }, unlock: () => { throw new Error('Policy'); }, exit: () => { throw new Error('Policy'); } });
  assert.equal(await f.controller.enter(), false);
  assert.equal(f.game.screen, 'playing');
  f.controller.ownsOrientation = true;
  f.controller.ownsFullscreen = true;
  f.document.fullscreenElement = f.target;
  assert.equal(await f.controller.leave(), false);
  assert.equal(f.game.screen, 'playing');
});

test('loading mobile home immediately attempts landscape without requesting fullscreen', async () => {
  const f = fixture({ screen: 'home' });
  assert.equal(count(f.calls, 'lock:landscape'), 1, 'constructor attempts the supported immediate path');
  assert.equal(count(f.calls, 'request'), 0);
  await settle();
  assert.equal(f.controller.ownsOrientation, true);
  assert.equal(f.game.screen, 'home');
  assert.equal(f.hint.hidden, false);
  assert.equal(f.button.title, 'Chơi ngang');
  await f.controller.prepareLanding();
  assert.equal(count(f.calls, 'lock:landscape'), 1, 'landing preparation is one-time');
});

test('a rejected initial landscape request retains home and its guide without errors', async () => {
  const f = fixture({ screen: 'home', lock: () => Promise.reject(new Error('Requires fullscreen')) });
  await settle();
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  assert.equal(count(f.calls, 'request'), 0);
  assert.equal(f.game.screen, 'home');
  assert.equal(f.controller.ownsOrientation, false);
  assert.equal(f.hint.hidden, false);
  assert.equal(f.button.textContent, 'Chơi ngang');
});

test('the first home pointerup requests fullscreen and retries a rejected landing lock once', async () => {
  let locks = 0;
  const f = fixture({ screen: 'home', lock: () => ++locks === 1 ? Promise.reject(new Error('Requires fullscreen')) : Promise.resolve() });
  await settle();
  f.document.emit('pointerdown', { isTrusted: true });
  assert.equal(count(f.calls, 'request'), 0);
  f.document.emit('pointerup', { isTrusted: true });
  assert.equal(count(f.calls, 'request'), 1, 'fullscreen request stays in the gesture stack');
  await settle();
  assert.equal(count(f.calls, 'lock:landscape'), 2);
  assert.equal(f.game.screen, 'home', 'orientation does not start gameplay');
  assert.equal(f.controller.ownsOrientation, true);
  f.document.emit('click', { isTrusted: true });
  assert.equal(count(f.calls, 'request'), 1, 'the click following pointerup cannot duplicate the request');
});

test('a first home click can use the same automatic path without a preceding pointerup', async () => {
  const f = fixture({ screen: 'home' });
  await settle();
  f.document.emit('click', { isTrusted: false });
  assert.equal(count(f.calls, 'request'), 0);
  f.document.emit('click', { isTrusted: true });
  assert.equal(count(f.calls, 'request'), 1);
  await settle();
  assert.equal(f.game.screen, 'home');
  assert.equal(count(f.calls, 'lock:landscape'), 1, 'successful landing lock is adopted');
});

test('manual home entry does not start the game or double-lock the initial landscape', async () => {
  const f = fixture({ screen: 'home' });
  await settle();
  f.document.emit('pointerup', { isTrusted: true, target: f.button });
  assert.equal(count(f.calls, 'request'), 0, 'the dedicated fullscreen button owns its click');
  f.button.emit('click');
  f.document.emit('click', { isTrusted: true, target: f.button });
  await settle();
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(count(f.calls, 'exit'), 0);
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  assert.equal(f.game.screen, 'home');
  assert.equal(f.button.title, 'Thoát toàn màn hình');
});

test('Start adopts a pending landing gesture request and its initial orientation lock', async () => {
  const fullscreen = deferred(), lock = deferred();
  const f = fixture({ screen: 'home', request: () => fullscreen.promise, lock: () => lock.promise });
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  f.document.emit('pointerup', { isTrusted: true });
  const first = f.controller.pending.promise;
  assert.equal(count(f.calls, 'request'), 1, 'pending page-load orientation cannot block the user fullscreen request');
  f.game.screen = 'playing';
  assert.equal(f.controller.enter(), first);
  f.document.fullscreenElement = f.target;
  f.document.emit('fullscreenchange');
  fullscreen.resolve();
  lock.resolve();
  assert.equal(await first, true);
  assert.equal(count(f.calls, 'lock:landscape'), 1);
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(f.game.screen, 'playing');
});

test('leaving before the page-load lock resolves unlocks it and disarms late landing gestures', async () => {
  const lock = deferred();
  const f = fixture({ screen: 'home', lock: () => lock.promise });
  const prepared = f.controller.landingPending.promise;
  await f.controller.leave();
  assert.equal(count(f.calls, 'unlock'), 1);
  lock.resolve();
  assert.equal(await prepared, false);
  assert.equal(count(f.calls, 'unlock'), 2, 'a late successful lock is released again');
  assert.equal(f.controller.ownsOrientation, false);
  f.document.emit('pointerup', { isTrusted: true });
  f.document.emit('click', { isTrusted: true });
  assert.equal(count(f.calls, 'request'), 0);
  assert.equal(f.game.screen, 'home');
});

test('home fullscreen entry stays canceled after leave even though home remains an eligible screen', async () => {
  const pending = deferred();
  const f = fixture({ screen: 'home', request: () => pending.promise });
  await settle();
  const entering = f.controller.enter(true);
  await f.controller.leave();
  f.document.fullscreenElement = f.target;
  f.document.emit('fullscreenchange');
  pending.resolve();
  assert.equal(await entering, false);
  assert.equal(f.document.fullscreenElement, null);
  assert.equal(count(f.calls, 'request'), 1);
  assert.equal(count(f.calls, 'exit'), 1);
  assert.equal(f.game.screen, 'home');
});

test('desktop landing and paused or finished screens do not automatically request or lock', async () => {
  const desktop = fixture({ screen: 'home', coarse: false, touchPoints: 0 });
  await settle();
  desktop.document.emit('click', { isTrusted: true });
  assert.equal(count(desktop.calls, 'request'), 0);
  assert.equal(count(desktop.calls, 'lock:landscape'), 0);
  assert.equal(desktop.hint.hidden, true);
  for (const screen of ['paused', 'won', 'lost']) {
    const f = fixture({ screen });
    assert.equal(await f.controller.enter(true), false);
    assert.equal(count(f.calls, 'request'), 0);
    assert.equal(count(f.calls, 'lock:landscape'), 0);
    assert.equal(f.hint.hidden, true);
  }
});
