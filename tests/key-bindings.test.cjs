'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fresh(saved){const c=vm.createContext({});for(const file of ['abyss-config','underwater-config','middle-sea-config','campaign','key-bindings','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),c);let value=JSON.stringify(saved||{});const storage={getItem:()=>value,setItem(_k,v){value=v;}};const g=new c.MM.Game({headless:true,storage,newRun:true});g.start(1);g.spawnTimer=g.ammoTimer=10000;return {g,MM:c.MM,storage};}
const key=(code,extra={})=>({code,repeat:false,preventDefault(){},...extra});
test('WASD-style mappings drive real movement, jump, shooting and key release without old arrow bindings',()=>{
 const {g,MM}=fresh(),K=MM.KeyBindings;g.settings.keyBindings={...K.defaults,left:'KeyA',right:'KeyD',jump:'KeyW',shootLeft:'KeyJ',shootRight:'KeyL',aimHigh:'KeyI',aimGround:'KeyK'};
 const start=g.player.x;g.keyDown(key('ArrowLeft'));g.update(.1);assert.equal(g.player.x,start);g.keyUp(key('ArrowLeft'));
 g.keyDown(key('KeyD'));g.update(.1);assert.ok(g.player.x>start);g.keyUp(key('KeyD',{ctrlKey:true}));assert.equal(g.keys.has('ArrowRight'),false);
 g.keyDown(key('KeyW'));g.update(.05);assert.ok(g.player.y<438);g.keyUp(key('KeyW'));
 assert.equal(K.translate(g,key('KeyI')).code,'Unbound:KeyI','locked high aim must not add an unexpected jump binding');
 g.player.shotTimer=0;const ammo=g.player.ammo;g.keyDown(key('KeyJ'));assert.equal(g.player.ammo,ammo-1);assert.equal(g.bullets.at(-1).dir,-1);g.keyUp(key('KeyJ'));
});
test('remapped double direction, shield and weapon hold use the existing skill rules',()=>{
 const {g,MM}=fresh(),K=MM.KeyBindings;g.progression.rewards=[10,20,60,100];MM.WeaponManager.select(g,'axes');
 K.set(g,'right','KeyE');g.keyDown(key('KeyE'));g.keyUp(key('KeyE'));g.update(.1);g.keyDown(key('KeyE'));assert.ok(g.rollSlash);g.keyUp(key('KeyE'));
 g.rollSlash=null;K.set(g,'shield','KeyQ');g.shieldCount=3;g.keyDown(key('KeyQ'));g.keyUp(key('KeyQ'));g.update(.1);g.keyDown(key('KeyQ'));assert.equal(g.player.immortalTime,12);assert.equal(g.shieldCount,1);g.keyUp(key('KeyQ'));
 K.set(g,'weapon','KeyR');g.keyDown(key('KeyR'));for(let i=0;i<7;i++)g.update(.05);assert.equal(g.weaponPicker.open,true);g.keyUp(key('KeyR'));assert.equal(g.weaponPicker.open,true);g.keyDown(key('Enter'));assert.equal(g.weaponPicker.open,false);
});
test('conflicts swap keys and bindings survive a fresh expedition while rewards reset',()=>{
 const {g,MM,storage}=fresh(),K=MM.KeyBindings;assert.equal(K.set(g,'left','KeyD'),true);assert.equal(g.settings.keyBindings.shootRight,'ArrowLeft');
 assert.equal(new Set(Object.values(g.settings.keyBindings)).size,Object.keys(K.defaults).length);assert.equal(K.set(g,'right','Escape'),false);
 g.progression.rewards=[10];g.persist();const reopened=new MM.Game({headless:true,storage,newRun:true});assert.equal(reopened.settings.keyBindings.left,'KeyD');assert.equal(reopened.settings.keyBindings.shootRight,'ArrowLeft');assert.equal(reopened.progression.rewards.length,0);
 const malformed=K.normalize({left:'Escape',right:'KeyA',jump:'KeyA'});assert.equal(new Set(Object.values(malformed)).size,Object.keys(K.defaults).length);assert.ok(Object.values(malformed).every(code=>code!=='Escape'));
});
test('capture cancels safely and remapped pause remains independent of browser shortcuts',()=>{
 const {g,MM}=fresh();g.keyCapture='left';assert.equal(MM.KeyBindings.capture(g,key('Escape')),true);assert.equal(g.keyCapture,null);
 MM.KeyBindings.set(g,'pause','KeyO');g.keyDown(key('KeyO',{ctrlKey:true}));assert.equal(g.screen,'playing');g.keyDown(key('KeyO'));assert.equal(g.screen,'paused');g.keyDown(key('Escape'));assert.equal(g.screen,'playing');
});
