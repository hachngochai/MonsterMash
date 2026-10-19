'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadGame(globals = {}, afterLoad = () => {}) {
  const context = vm.createContext(globals);
  for (const file of ['abyss-config.js','campaign.js', 'golem.js', 'wolves.js', 'kong.js', 'dragons.js', 'mythic.js', 'game.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
  }
  afterLoad(context);
  return context.MM;
}

function storage(initial) {
  let value = initial === undefined ? null : JSON.stringify(initial);
  return { getItem() { return value; }, setItem(key, data) { value = data; }, read() { return JSON.parse(value || '{}'); } };
}

function fresh(level = 1, options = {}) {
  const MM = loadGame();
  const game = new MM.Game({ headless: true, random: () => .5, storage: storage(), ...options });
  game.settings.effects = false;
  game.start(level);
  // Tests that exercise combat and controls should not receive unrelated spawns.
  game.spawnTimer = 10000;
  return { MM, game };
}

function tick(game, seconds) {
  while (seconds > 1e-8) {
    const dt = Math.min(1 / 60, seconds);
    game.update(dt);
    seconds -= dt;
  }
}

const key = (code, extra = {}) => ({ code, repeat: false, preventDefault() {}, ...extra });
const pointer = (pointerId, clientX, clientY, extra = {}) => ({ pointerId, clientX, clientY, pointerType: 'touch', button: 0, preventDefault() {}, ...extra });

function defeat(game, count, type = 'skeleton') {
  for (let index = 0; index < count; index += 1) game.killEnemy(game.spawn(type, -1));
}

test('keyboard supports simultaneous movement and directional fire; release stops movement', () => {
  const { game } = fresh();
  if (game.player.maxAmmo) game.player.ammo = game.player.maxAmmo;
  const originalX = game.player.x;
  game.keyDown(key('ArrowRight'));
  game.keyDown(key('KeyA'));
  assert.equal(game.bullets[0].dir, -1);
  tick(game, .35);
  assert.ok(game.player.x > originalX + 40);
  assert.ok(game.bullets.length > 1, 'holding fire repeats at a controlled rate');
  assert.ok(game.bullets.every(bullet => bullet.dir === -1));
  game.keyUp(key('ArrowRight'));
  game.keyUp(key('KeyA'));
  tick(game, .2);
  assert.equal(game.player.vx, 0);
  const settledX = game.player.x;
  tick(game, .3);
  assert.equal(game.player.x, settledX);
  game.keyDown(key('KeyD'));
  assert.equal(game.bullets.at(-1).dir, 1);
  game.keyUp(key('KeyD'));
  game.player.shotTimer = 0;
  game.keyDown(key('KeyJ'));
  assert.equal(game.bullets.at(-1).dir, -1);
  game.keyUp(key('KeyJ'));
  game.player.shotTimer = 0;
  game.keyDown(key('KeyL'));
  assert.equal(game.bullets.at(-1).dir, 1);
});

test('jump is buffered once, and holding or repeating the key cannot bunny-hop', () => {
  const { game } = fresh();
  game.keyDown(key('ArrowUp'));
  game.update(1 / 60);
  assert.equal(game.player.grounded, false);
  assert.ok(game.player.vy < 0);
  for (let index = 0; index < 60; index += 1) {
    game.keyDown(key('ArrowUp', { repeat: true }));
    game.update(1 / 60);
  }
  assert.equal(game.player.grounded, true);
  assert.equal(game.player.y, 438);
  assert.equal(game.player.jumpBuffer, 0);
  game.keyUp(key('ArrowUp'));
  game.keyDown(key('KeyW'));
  game.update(1 / 60);
  assert.ok(game.player.vy < 0);
});

test('typing in UI controls does not move or shoot the player', () => {
  const { game } = fresh();
  for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A']) {
    game.keyDown(key('KeyD', { target: { tagName } }));
    game.keyDown(key('ArrowRight', { target: { tagName } }));
  }
  assert.equal(game.bullets.length, 0);
  assert.equal(game.keys.size, 0);
});

test('local test mode unlocks every milestone without changing the saved expedition',()=>{
  const records=new Map([['monster-mash-v2',JSON.stringify({resume:8,completed:[1,2],progression:{version:1,rewards:[10],equipped:'bones',lifeKills:4}})]]);
  let writes=0;
  const store={getItem:key=>records.get(key)||null,setItem:(key,value)=>{writes++;records.set(key,value);}};
  const MM=loadGame({},context=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/save-manager.js'),'utf8'),context,{filename:'save-manager.js'}));
  const game=new MM.Game({headless:true,testMode:true,storage:store});
  assert.deepEqual(Array.from(game.progression.rewards),Array.from(MM.SaveManager.milestones));
  for(const weapon of ['gun','bones','club','bow','spear','axes','hammer','scythe'])assert.equal(MM.SaveManager.weaponUnlocked(game,weapon),true);
  game.start(150);game.persist();
  assert.equal(writes,0,'test-mode writes never reach local storage');
  assert.deepEqual(JSON.parse(records.get('monster-mash-v2')).progression.rewards,[10]);
  assert.deepEqual(JSON.parse(records.get('monster-mash-v2')).completed,[1,2]);
});

test('touch taps shoot by canvas half after coordinate scaling', () => {
  const { game } = fresh();
  game.canvas = { focus() {}, getBoundingClientRect: () => ({ left: 100, top: 50, width: 480, height: 270 }) };
  game.pointerDown(pointer(1, 200, 150));
  assert.equal(game.bullets.length, 0, 'touch waits to distinguish taps from swipes');
  game.pointerUp(pointer(1, 200, 150));
  assert.equal(game.bullets[0].dir, -1);
  tick(game, .2);
  game.pointerDown(pointer(2, 500, 150));
  game.pointerUp(pointer(2, 500, 150));
  assert.equal(game.bullets.at(-1).dir, 1);
  assert.equal(game.pointers.size, 0);
});

test('horizontal swipe moves without firing; cancellation releases movement', () => {
  const { game } = fresh();
  const originalX = game.player.x;
  game.pointerDown(pointer(1, 300, 200));
  game.pointerMove(pointer(1, 360, 205));
  tick(game, .25);
  assert.ok(game.player.x > originalX + 20);
  assert.equal(game.bullets.length, 0);
  game.pointerUp(pointer(1, 360, 205), true);
  tick(game, .2);
  assert.equal(game.player.vx, 0);
  assert.equal(game.pointers.size, 0);
  assert.equal(game.bullets.length, 0);
  game.pointerDown(pointer(2, 100, 200));
  game.pointerUp(pointer(2, 100, 200), true);
  assert.equal(game.bullets.length, 0, 'a cancelled tap must not shoot');
});

test('vertical swipes jump and activate shields without also firing', () => {
  const { game } = fresh();
  game.pointerDown(pointer(1, 400, 200));
  game.pointerMove(pointer(1, 403, 150));
  game.update(1 / 60);
  assert.ok(game.player.vy < 0);
  game.pointerUp(pointer(1, 403, 150));
  assert.equal(game.bullets.length, 0);
  game.shieldCount = 1;
  game.pointerDown(pointer(2, 600, 100));
  game.pointerMove(pointer(2, 605, 160));
  game.pointerUp(pointer(2, 605, 160));
  assert.equal(game.shieldCount, 0);
  assert.equal(game.player.shieldTime, 5);
  assert.equal(game.player.shieldHits, 3);
  assert.equal(game.bullets.length, 0);
});

test('multitouch can move and hold directional fire independently', () => {
  const { game } = fresh();
  game.pointerDown(pointer(1, 100, 200));
  game.pointerMove(pointer(1, 145, 200));
  game.pointerDown(pointer(2, 850, 200));
  tick(game, .5);
  assert.ok(game.player.vx > 0);
  assert.ok(game.bullets.length >= 2);
  assert.ok(game.bullets.every(bullet => bullet.dir === 1));
  const count = game.bullets.length;
  game.pointerUp(pointer(2, 850, 200));
  assert.equal(game.bullets.length, count, 'release must not add a second tap shot after holding');
  game.pointerUp(pointer(1, 145, 200));
  tick(game, .2);
  assert.equal(game.player.vx, 0);
});

test('every ten cumulative kills awards one shield across stages, without duplicate rewards', () => {
  const { game } = fresh(2);
  defeat(game, 7);
  assert.equal(game.shieldCount, 0);
  game.start(3, { carry: true });
  const first = game.spawn('skeleton', -1);
  game.killEnemy(first);
  game.killEnemy(first);
  assert.equal(game.totalKills, 8);
  assert.equal(game.levelKills, 1);
  defeat(game, 2);
  assert.equal(game.totalKills, 10);
  assert.equal(game.shieldCount, 1);
  assert.equal(game.activateShield(), true);
  assert.equal(game.shieldCount, 0);
  assert.equal(game.activateShield(), false);
  assert.equal(game.shieldCount, 0);
});

test('Space repeat cannot spend multiple charges; shields block three hits or expire', () => {
  const { game } = fresh();
  game.shieldCount = 2;
  game.keyDown(key('Space'));
  game.keyDown(key('Space', { repeat: true }));
  assert.equal(game.shieldCount, 1);
  const health = game.player.health;
  const enemy = game.spawn('skeleton', -1);
  enemy.x = game.player.x - 20;
  for (let index = 0; index < 3; index += 1) {
    game.player.invulnerable = 0;
    game.hurt(enemy);
    assert.equal(game.player.health, health);
  }
  assert.equal(game.player.shieldTime, 0);
  game.player.invulnerable = 0;
  game.hurt(enemy);
  assert.equal(game.player.health, health - 1);
  game.enemies = [];
  game.keyUp(key('Space'));
  game.keyDown(key('Space'));
  assert.equal(game.shieldCount, 0);
  tick(game, 5.1);
  assert.equal(game.player.shieldTime, 0);
});

test('contact grants invulnerability and death stops the game', () => {
  const { game } = fresh();
  const enemy = game.spawn('skeleton', -1);
  enemy.x = game.player.x - 30;
  game.player.health = 2;
  game.player.invulnerable = 0;
  game.hurt(enemy);
  assert.equal(game.player.health, 1);
  game.hurt(enemy);
  assert.equal(game.player.health, 1, 'overlapping enemies cannot damage on every frame');
  game.player.invulnerable = 0;
  game.hurt(enemy);
  assert.equal(game.player.health, 0);
  assert.equal(game.screen, 'lost');
  game.keyDown(key('KeyA'));
  assert.equal(game.bullets.length, 0);
});

test('ground-level bullets hit short spiders and sweep through fast frames', () => {
  const { game } = fresh(12);
  const spider = game.spawn('spider', 1);
  spider.phase = 'active';
  spider.x = game.player.x + 76;
  spider.speed = 0;
  game.shoot(1);
  game.update(.05);
  assert.equal(spider.dead, true);
  assert.equal(game.levelKills, 1);
  assert.equal(game.bullets.length, 0);
  const near = game.spawn('skeleton', 1);
  const far = game.spawn('skeleton', 1);
  for (const enemy of [near, far]) { enemy.phase = 'active'; enemy.speed = 0; enemy.w = 8; }
  near.x = game.player.x + 40;
  far.x = game.player.x + 58;
  game.player.shotTimer = 0;
  game.shoot(1);
  game.update(.05);
  assert.equal(near.dead, true, 'the nearest crossed target receives the bullet');
  assert.equal(far.dead, undefined);
});

test('warnings cannot hurt or take bullets; regular spawn limits prevent overcrowding', () => {
  const { game } = fresh();
  const enemy = game.spawn('skeleton', 1);
  enemy.x = game.player.x + 42;
  enemy.warning = 10;
  game.shoot(1);
  game.update(.05);
  assert.equal(enemy.health, enemy.maxHealth);
  assert.equal(game.player.health, game.player.maxHealth);
  game.enemies = [];
  game.bullets = [];
  game.player.invulnerable = 100;
  for (let index = 0; index < game.level.maxAlive; index += 1) game.spawn('skeleton', 1);
  game.spawnTimer = 0;
  game.update(.05);
  assert.equal(game.enemies.length, game.level.maxAlive);
  assert.equal(game.regularSpawned, 0);
  game.enemies.pop();
  game.update(.05);
  assert.equal(game.enemies.length, game.level.maxAlive);
  assert.equal(game.regularSpawned, 1);
  game.enemies = [];
  game.regularSpawned = game.level.target;
  game.spawnTimer = 0;
  game.update(.05);
  assert.equal(game.enemies.length, 0, 'waves stop after the required quota has spawned');
});

test('quota overshoot completes regular stages; milestone stages require exactly one boss', () => {
  const { game, MM } = fresh();
  game.levelKills = game.level.target + 2;
  game.checkCompletion();
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 2);
  assert.ok(game.save.completed.includes(1));
  game.start(10);
  game.levelKills = game.level.target;
  game.checkCompletion();
  assert.equal(game.screen, 'playing');
  assert.equal(game.bossSpawned, true);
  assert.equal(game.enemies.filter(enemy => enemy.boss).length, 1);
  game.checkCompletion();
  assert.equal(game.enemies.filter(enemy => enemy.boss).length, 1);
  game.killEnemy(game.enemies.find(enemy => enemy.boss));
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 11);
  game.start(50);
  game.levelKills = game.level.target;
  game.checkCompletion();
  game.killEnemy(game.enemies.find(enemy => enemy.boss));
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 51);
  assert.ok(game.save.completed.includes(50));
  game.start(60);
  game.levelKills = game.level.target;
  game.checkCompletion();
  game.killEnemy(game.enemies.find(enemy => enemy.boss));
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 61);
  assert.ok(game.save.completed.includes(60));
  game.start(70);
  game.levelKills = game.level.target;
  game.checkCompletion();
  game.killEnemy(game.enemies.find(enemy => enemy.boss));
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 71);
  assert.ok(game.save.completed.includes(70));
  game.start(80);
  game.spawnTimer = 10000;
  game.levelKills = game.level.target;
  game.checkCompletion();
  game.checkCompletion();
  assert.equal(game.enemies.filter(enemy => enemy.boss).length, 1);
  const king = game.enemies.find(enemy => enemy.boss);
  Object.assign(king, { phase: 'active', x: 850, speed: 0 });
  MM.KongCombat.hit(game, king, king.maxHealth / 2);
  tick(game, 1.5);
  MM.KongCombat.hit(game, king, king.maxHealth);
  assert.equal(game.screen, 'playing', 'zero health starts the final stand instead of completing the campaign');
  game.shieldCount = 1;
  game.activateShield();
  tick(game, 4.9);
  assert.equal(game.screen, 'playing');
  tick(game, .1);
  assert.equal(game.screen, 'won');
  assert.equal(game.save.resume, 81);
  assert.ok(game.save.completed.includes(80));
});

test('completed old campaign saves continue into the new chapter while explicit replays stay selected', () => {
  const MM=loadGame();
  const old=MM.readSave(storage({version:2,resume:50,completed:Array.from({length:50},(_,i)=>i+1),best:12345,settings:{controls:'buttons',difficulty:'hard'}}));
  assert.equal(old.resume,51);
  assert.equal(old.campaignSize,150);
  assert.equal(old.completed.length,50);
  assert.equal(old.best,12345);
  assert.equal(old.settings.controls,'buttons');
  assert.equal(old.settings.difficulty,'hard');
  const replay=MM.readSave(storage({...old,resume:50}));
  assert.equal(replay.resume,50);
  const unfinished=MM.readSave(storage({resume:50,completed:[49]}));
  assert.equal(unfinished.resume,50);
  const completed60=MM.readSave(storage({campaignSize:60,resume:60,completed:Array.from({length:60},(_,i)=>i+1),best:23456}));
  assert.equal(completed60.resume,61);
  assert.equal(completed60.completed.length,60);
  assert.equal(completed60.best,23456);
  const replay60=MM.readSave(storage({...completed60,resume:60}));
  assert.equal(replay60.resume,60);
  const completed70=MM.readSave(storage({campaignSize:70,resume:70,completed:Array.from({length:70},(_,i)=>i+1),best:34567,settings:{controls:'gestures',difficulty:'story'}}));
  assert.equal(completed70.resume,71);
  assert.equal(completed70.campaignSize,150);
  assert.equal(completed70.completed.length,70);
  assert.equal(completed70.best,34567);
  assert.equal(completed70.settings.controls,'gestures');
  assert.equal(completed70.settings.difficulty,'story');
  const replay70=MM.readSave(storage({...completed70,resume:70}));
  assert.equal(replay70.resume,70);
  const completed80=MM.readSave(storage({campaignSize:80,resume:80,completed:Array.from({length:80},(_,i)=>i+1),best:45678,settings:{controls:'buttons',difficulty:'hard',sound:true}}));
  assert.equal(completed80.resume,81);
  assert.equal(completed80.campaignSize,150);
  assert.equal(completed80.completed.length,80);
  assert.equal(completed80.best,45678);
  assert.equal(completed80.settings.controls,'buttons');
  assert.equal(completed80.settings.difficulty,'hard');
  assert.equal(completed80.settings.sound,true);
  const replay80=MM.readSave(storage({...completed80,resume:80}));
  assert.equal(replay80.resume,80);
  const unfinished80=MM.readSave(storage({campaignSize:80,resume:80,completed:[79]}));
  assert.equal(unfinished80.resume,80);
  const current100=MM.readSave(storage({campaignSize:100,resume:100,completed:Array.from({length:100},(_,i)=>i+1)}));
  assert.equal(current100.resume,101,'finishing the previous campaign opens the appended chapter');
  const current150=MM.readSave(storage({campaignSize:150,resume:150,completed:[150]}));
  assert.equal(current150.resume,150,'current final stage stays replayable');
});

test('keyboard and mobile sniper repeat at normal gun speed, costing five ammo per successful shot', () => {
  for(const input of ['keyboard','mobile']) {
    const {game,MM}=fresh(70);
    game.ammoTimer=10000;
    const boss=game.spawn('boss',1);
    Object.assign(boss,{phase:'active',x:850,speed:0});
    MM.WolfCombat.hit(game,boss,boss.maxHealth/2);
    tick(game,1.2);
    // Isolate held-fire cadence from the independent double-claw damage.
    game.player.health=game.player.maxHealth=100;
    game.player.ammo=40;
    const shots=[];
    const shoot=game.shoot.bind(game);
    game.shoot=dir=>{const fired=shoot(dir);if(fired)shots.push({time:game.time,...game.bullets.at(-1)});return fired;};
    const button={dataset:{control:'fire-right'},classList:{add(){},remove(){}},setPointerCapture(){},releasePointerCapture(){}};
    if(input==='keyboard')game.keyDown(key('KeyD'));
    else game.padDown(pointer(1,0,0),button);
    tick(game,.7);
    if(input==='keyboard')game.keyUp(key('KeyD'));
    else game.padUp(pointer(1,0,0),button);
    assert.equal(shots.length,4,`${input} fires immediately and repeats while held`);
    assert.equal(game.player.ammo,20);
    for(let i=0;i<shots.length;i++) {
      assert.equal(shots[i].kind,'sniper');assert.equal(shots[i].damage,5);
      if(i>0)assert.ok(Math.abs(shots[i].time-shots[i-1].time-.17)<=1/60+1e-8,`${input} maintains the ordinary 0.17-second gun cooldown`);
    }
    tick(game,1.1);
    assert.equal(shots.length,4,`${input} release stops fire with ammunition still available`);
  }
});

test('keyboard and mobile held fire aim at airborne KingKong while movement and release stay independent', () => {
  for (const input of ['keyboard', 'mobile']) {
    const { game, MM } = fresh(80);
    game.ammoTimer = 10000;
    const boss = game.spawn('boss', 1);
    Object.assign(boss, { phase: 'active', x: 850, speed: 0 });
    MM.KongCombat.hit(game, boss, boss.maxHealth / 2);
    tick(game, 1.4);
    assert.equal(game.getWeaponProfile().kind, 'highAim');
    game.player.ammo = 15;
    const samples = [];
    const shoot = game.shoot.bind(game);
    game.shoot = dir => {
      const fired = shoot(dir);
      if (fired) samples.push({ time: game.time, ...game.bullets.at(-1) });
      return fired;
    };
    const button = control => ({ dataset: { control }, classList: { add() {}, remove() {} }, setPointerCapture() {}, releasePointerCapture() {} });
    const move = button('left'), fire = button('fire-right');
    const startX = game.player.x;
    if (input === 'keyboard') {
      game.keyDown(key('ArrowLeft'));
      game.keyDown(key('KeyD'));
    } else {
      game.padDown(pointer(1, 0, 0), move);
      game.padDown(pointer(2, 0, 0), fire);
    }
    tick(game, 1);
    assert.equal(samples.length, 5, `${input} repeats at the high-aim cooldown`);
    assert.equal(game.player.ammo, 10);
    assert.equal(boss.highAimShots, 5);
    assert.equal(game.shieldCount, 1);
    assert.ok(game.player.x < startX - 40, `${input} movement works while firing upwards`);
    for (let index = 0; index < samples.length; index++) {
      assert.equal(samples[index].kind, 'highAim');
      assert.equal(samples[index].damage, 2);
      assert.ok(samples[index].vy < 0, `${input} shot points upwards`);
      if (index > 0) assert.ok(samples[index].time - samples[index - 1].time >= .22 - 1 / 60);
    }
    if (input === 'keyboard') game.keyUp(key('KeyD'));
    else game.padUp(pointer(2, 0, 0), fire);
    tick(game, .3);
    assert.equal(samples.length, 5, `${input} fire release stops ammunition spending`);
    assert.ok(game.player.vx < 0, `${input} movement remains held after fire release`);
    if (input === 'keyboard') game.keyUp(key('ArrowLeft'));
    else game.padUp(pointer(1, 0, 0), move);
    tick(game, .2);
    assert.equal(game.player.vx, 0);
  }
});

test('mini golems match skeleton size and announce a smaller jumpable club area', () => {
  const {game,MM}=fresh(61);
  const mini=game.spawn('miniGolem',-1),skeleton=MM.Campaign.createEnemy('skeleton',61,'normal',-1);
  assert.equal(mini.w,skeleton.w);
  assert.equal(mini.h,skeleton.h);
  Object.assign(mini,{phase:'active',x:game.player.x-70,speed:0,golemCooldown:0});
  game.update(.01);
  assert.equal(mini.golemState,'windup');
  assert.equal(game.golemZones[0].w,95);
  assert.equal(game.golemZones[0].h,44);
  assert.ok(game.golemZones[0].w<145,'mini club is shorter than a full golem club');
  const health=game.player.health;
  game.player.invulnerable=0;
  tick(game,.9);
  assert.equal(game.player.health,health-1);
});

test('carry restores health and preserves resources; retry restores the start checkpoint', () => {
  const { game } = fresh(4);
  game.player.health = 2;
  game.score = 300;
  game.totalKills = 7;
  game.shieldCount = 1;
  game.start(5, { carry: true });
  assert.equal(game.player.health, 4);
  assert.equal(game.score, 300);
  assert.equal(game.totalKills, 7);
  assert.equal(game.shieldCount, 1);
  defeat(game, 3);
  game.activateShield();
  game.start(5, { retry: true });
  assert.equal(game.score, 300);
  assert.equal(game.totalKills, 7);
  assert.equal(game.shieldCount, 1);
  assert.equal(game.levelKills, 0);
  assert.equal(game.player.health, game.player.maxHealth);
  game.start(1);
  assert.equal(game.score, 0);
  assert.equal(game.totalKills, 0);
  assert.equal(game.shieldCount, 0);
});

test('pause freezes simulation, clears all inputs, and resume clamps stale elapsed time', () => {
  const { game } = fresh();
  game.keyDown(key('ArrowRight'));
  game.pointerDown(pointer(1, 200, 100));
  game.pointerMove(pointer(1, 250, 100));
  game.padInputs.set(2, 'left');
  game.keyDown(key('KeyP'));
  assert.equal(game.screen, 'paused');
  assert.equal(game.keys.size, 0);
  assert.equal(game.pointers.size, 0);
  assert.equal(game.padInputs.size, 0);
  const snapshot = { time: game.time, x: game.player.x, timer: game.spawnTimer };
  game.update(1000);
  assert.equal(game.time, snapshot.time);
  assert.equal(game.player.x, snapshot.x);
  assert.equal(game.spawnTimer, snapshot.timer);
  game.pointerUp(pointer(1, 250, 100));
  assert.equal(game.bullets.length, 0);
  game.keyDown(key('KeyP', { repeat: true }));
  assert.equal(game.screen, 'paused');
  game.keyDown(key('Escape'));
  assert.equal(game.screen, 'playing');
  game.update(1000);
  assert.equal(game.time, snapshot.time + .05);
  assert.equal(game.player.x, snapshot.x);
  const resumedTime = game.time;
  game.update(NaN);
  game.update(-1);
  assert.equal(game.time, resumedTime);
});

test('browser blur and hidden documents pause and release pressed inputs', () => {
  function target() {
    const listeners = new Map();
    return {
      listeners,
      addEventListener(name, callback) { listeners.set(name, callback); },
      emit(name, event = {}) { listeners.get(name)?.(event); }
    };
  }
  const browser = target();
  const documentTarget = target();
  documentTarget.querySelectorAll = () => [];
  documentTarget.hidden = false;
  const MM = loadGame({ addEventListener: browser.addEventListener.bind(browser) }, context => { context.document = documentTarget; });
  const game = new MM.Game({ headless: true, storage: storage(), random: () => .5 });
  game.canvas = target();
  const nodes = new Map();
  game.ui = new Proxy({}, { get(object, id) { if (!nodes.has(id)) nodes.set(id, target()); return nodes.get(id); } });
  game.bind();
  game.start();
  game.keyDown(key('ArrowRight'));
  browser.emit('blur');
  assert.equal(game.screen, 'paused');
  assert.equal(game.keys.size, 0);
  game.togglePause();
  game.keyDown(key('KeyD'));
  game.lastTime = 12000;
  documentTarget.hidden = true;
  documentTarget.emit('visibilitychange');
  assert.equal(game.screen, 'paused');
  assert.equal(game.keys.size, 0);
  assert.equal(game.lastTime, 0);
});

test('the final shot ends combat before other bullets can award extra kills', () => {
  const { game } = fresh();
  game.levelKills = game.level.target - 1;
  const near = game.spawn('skeleton', 1);
  const far = game.spawn('skeleton', 1);
  for (const enemy of [near, far]) { enemy.phase = 'active'; enemy.speed = 0; enemy.w = 8; }
  near.x = game.player.x + 50;
  far.x = game.player.x + 200;
  game.bullets = [
    { x: game.player.x + 30, dir: 1, y: 411, life: 1 },
    { x: game.player.x + 180, dir: 1, y: 411, life: 1 }
  ];
  game.update(.05);
  assert.equal(game.screen, 'won');
  assert.equal(game.levelKills, game.level.target);
  assert.equal(game.totalKills, 1);
  assert.equal(far.dead, undefined);
});

test('death prevents pending bullets and callbacks from awarding kills', () => {
  const { game } = fresh();
  const contact = game.spawn('skeleton', -1);
  contact.phase = 'active';
  contact.x = game.player.x;
  contact.speed = 0;
  const distant = game.spawn('skeleton', 1);
  distant.phase = 'active';
  distant.x = game.player.x + 200;
  distant.speed = 0;
  game.player.health = 1;
  game.player.invulnerable = 0;
  game.bullets = [{ x: game.player.x + 175, dir: 1, y: 411, life: 1 }];
  game.update(.05);
  assert.equal(game.screen, 'lost');
  assert.equal(game.totalKills, 0);
  assert.equal(game.score, 0);
  game.killEnemy(distant);
  assert.equal(game.totalKills, 0);
});

test('malformed and denied saves fall back safely; progress and options survive reload', () => {
  const MM = loadGame();
  const malformed = MM.readSave({ getItem() { return '{ broken'; } });
  assert.equal(malformed.resume, 1);
  assert.equal(malformed.best, 0);
  assert.equal(malformed.settings.difficulty, 'normal');
  const denied = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Denied'); } };
  const game = new MM.Game({ headless: true, storage: denied });
  assert.doesNotThrow(() => { game.start(); game.finish(true); });
  const unsafe = MM.readSave(storage({ resume: 900, best: -1, completed: [1, 1, 50, 51, 61, 71, 80, 81, 90, 100, 101, '2', null], settings: { difficulty: 'bogus', sound: 'true', effects: false } }));
  assert.equal(unsafe.resume, 150);
  assert.equal(unsafe.best, 0);
  assert.equal(JSON.stringify(unsafe.completed), '[1,50,51,61,71,80,81,90,100,101]');
  assert.equal(unsafe.settings.difficulty, 'normal');
  assert.equal(unsafe.settings.sound, false);
  assert.equal(unsafe.settings.effects, false);
  const saved = storage();
  const { game: playing } = fresh(2, { storage: saved });
  playing.score = 1800;
  playing.settings.sound = true;
  playing.settings.difficulty = 'story';
  playing.levelKills = playing.level.target;
  playing.checkCompletion();
  const reload = new MM.Game({ headless: true, storage: saved });
  assert.equal(reload.save.resume, 3);
  assert.equal(reload.save.best, 1800);
  assert.equal(JSON.stringify(reload.save.completed), '[2]');
  assert.equal(reload.settings.sound, true);
  assert.equal(reload.settings.difficulty, 'story');
});

test('the jump arc clears every boss contact box, including the tallest vampire', () => {
  for (const id of [10,20,30,40,50]) {
    const { game } = fresh(id);
    const boss = game.spawn('boss',1);
    boss.x=850;boss.phase='active';boss.speed=0;
    game.jump();
    let apex=game.player.y;
    for(let frame=0;frame<50;frame++){game.update(1/60);apex=Math.min(apex,game.player.y);}
    assert.ok(apex < 424-boss.h*.88, `jump must clear boss ${id} even at the lowest ghost float`);
  }
});

test('portals are visible before entry and airborne specialists give space and warning', () => {
  const { game } = fresh(24);
  const edge=game.spawn('skeleton',-1);
  assert.ok(edge.x>=0&&edge.x<=960);
  game.enemies=[];game.regularSpawned=game.level.abilitySpawnEvery-1;game.spawnTimer=0;
  game.update(1/60);
  const ghost=game.enemies[0];
  assert.equal(ghost.type,'ghost');assert.equal(ghost.ambush,true);
  assert.ok(Math.abs(ghost.x-game.player.x)>=150);
  assert.ok(ghost.warning>=game.tuning.warningTime-1/60);assert.equal(ghost.phase,'warning');
  assert.equal(ghost.abilityState,'airborne');
});

test('forest drop attacks keep their marked landing point and land safely', () => {
  const { game } = fresh(14);
  game.regularSpawned=game.level.abilitySpawnEvery-1;game.spawnTimer=0;
  game.update(1/60);game.spawnTimer=10000;
  const spider=game.enemies[0],landingX=spider.x;
  assert.equal(spider.type,'spider');assert.equal(spider.drop,true);
  tick(game,2);
  assert.equal(spider.abilityState,'hanging');assert.equal(spider.x,landingX);
  assert.ok(spider.y>0&&spider.y<300);
  for(let frame=0;frame<900&&spider.abilityState!=='diving';frame++)game.update(1/60);
  assert.equal(spider.abilityState,'diving');assert.equal(spider.x,landingX);
  for(let frame=0;frame<180&&spider.abilityState==='diving';frame++)game.update(1/60);
  assert.equal(spider.abilityState,'ground');assert.equal(spider.y,438);
});
