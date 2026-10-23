'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const names=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','merfolk','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','ocean-visuals','game'];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} should equal ${b}`);
function fixture(level=171,rewards=[160,170,180,190]){
 const c=vm.createContext({});for(const n of names)vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c,{filename:n});const MM=c.MM;
 const raw={version:2,campaignSize:200,completed:[],progression:{version:1,rewards,equipped:'gun',lifeKills:0}};let writes=0;
 const g=new MM.Game({headless:true,random:()=>.5,storage:{getItem:()=>JSON.stringify(raw),setItem(){writes++;}}});g.start(level);
 g.settings.effects=false;g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;g.spawnTimer=g.ammoTimer=1e6;
 for(const name of ['oxygenTimer','middleHazardTimer','predatorHazardTimer'])g.underwater[name]=1e6;
 if(g.finalSea){g.finalSea.ambientSpawned=true;g.finalSea.vents=[];g.finalSea.turtleTimer=g.finalSea.bugTimer=1e6;}
 const key=(code,release=false,timeStamp=1000)=>g[release?'keyUp':'keyDown']({code,timeStamp,preventDefault(){}});
 return {g,MM,key,writes:()=>writes};
}
function tick(g,time,step=.01){for(let remaining=time;remaining>1e-9&&g.screen==='playing';){const dt=Math.min(step,remaining);g.update(dt);remaining-=dt;}}

test('R needs a real160 unlock, stays water-only and keeps existing stun and silence',()=>{
 const locked=fixture(171,[]);assert.equal(locked.MM.MerfolkTransformation.activate(locked.g),false);
 const {g,MM,key}=fixture();g.player.stunTime=1.5;g.underwater.silenceTime=2;key('KeyR');
 assert.equal(MM.MerfolkTransformation.active(g),true);near(g.player.stunTime,1.5);near(g.underwater.silenceTime,2);assert.equal(MM.UnderwaterMode.canAttack(g),false);
 g.start(1);assert.equal(MM.MerfolkTransformation.activate(g),false);assert.equal(MM.MerfolkTransformation.active(g),false);
 g.start(70);assert.equal(MM.MerfolkTransformation.activate(g),false);assert.equal(MM.SaveManager.unlocked(g,160),true);
});

test('Merfolk lasts exactly10 active seconds, blocks suffocation at zero air, then resumes from real oxygen',()=>{
 const {g,MM}=fixture();g.underwater.oxygen=0;MM.UnderwaterMode.oxygenChanged(g);assert.equal(MM.MerfolkTransformation.activate(g),true);
 assert.equal(MM.UnderwaterMode.canAttack(g),true);const hp=g.player.health;tick(g,9.99);assert.equal(MM.MerfolkTransformation.active(g),true);near(g.merfolk.remaining,.01);near(g.underwater.oxygen,0);near(g.player.health,hp);
 tick(g,.01);assert.equal(MM.MerfolkTransformation.active(g),false);near(g.player.merfolkTime,0);assert.equal(MM.UnderwaterMode.canAttack(g),false);near(g.underwater.suffocationTime,0);
 tick(g,4.99);near(g.player.health,hp);tick(g,.01);near(g.player.health,hp-1);
 const air=fixture(181);air.g.underwater.oxygen=17;air.MM.MerfolkTransformation.activate(air.g);tick(air.g,10);near(air.g.underwater.oxygen,17);tick(air.g,.2);near(air.g.underwater.oxygen,16.7);
});

test('pause and weapon selection freeze Merfolk; one activation per entry and retry resets the temporary use',()=>{
 const {g,MM}=fixture(171,[60,160,170,180,190]);assert.equal(MM.MerfolkTransformation.activate(g),true);tick(g,2);near(g.merfolk.remaining,8);
 g.screen='paused';g.update(.5);near(g.merfolk.remaining,8);g.screen='playing';assert.equal(MM.InputManager.open(g),true);g.update(.5);near(g.merfolk.remaining,8);MM.InputManager.close(g);
 assert.equal(MM.MerfolkTransformation.activate(g),false);tick(g,8);assert.equal(MM.MerfolkTransformation.activate(g),false);
 g.start(171,{retry:true});assert.equal(g.merfolk.used,false);assert.equal(MM.MerfolkTransformation.activate(g),true);
 g.goHome();assert.equal(MM.MerfolkTransformation.active(g),false);near(g.player.merfolkTime||0,0);
});

test('Merfolk ignores ordinary HP damage but keeps control effects and boss or boss-owned summon damage',()=>{
 const {g,MM}=fixture();MM.MerfolkTransformation.activate(g);const hp=g.player.health;
 g.applyCombatEffect({kind:'ordinary',damage:2,stun:1,owner:{archetype:'electricRay',boss:false},sourceBoss:false});near(g.player.health,hp);near(g.player.stunTime,1);
 g.player.invulnerable=0;g.applyCombatEffect({damage:3,owner:{boss:true,archetype:'megaLondon'},sourceBoss:true});near(g.player.health,hp-3);
 g.player.invulnerable=0;g.applyCombatEffect({damage:1,owner:{boss:false,summonOwner:{boss:true}}});near(g.player.health,hp-4);
 g.player.invulnerable=0;g.applyCombatEffect({damage:1,environment:true});near(g.player.health,hp-5);
});

test('Merfolk blocks all defined boss oxygen drains while bosses keep their normal HP damage',()=>{
 {
  const {g,MM}=fixture(160);g.underwater.oxygen=20;MM.MerfolkTransformation.activate(g);const b=g.spawn('boss');b.phase='active';b.x=700;
  MM.Boss160.summonVortex(g,b);const z=g.waterZones.find(z=>z.kind==='water-vortex');assert.ok(z);z.phase='active';z.timer=2;z.x=z.targetX;z.y=z.targetY;g.player.x=z.x;g.player.y=z.y+g.player.h*.5;const hp=g.player.health;
  MM.Boss160.update(g,.01);near(g.underwater.oxygen,20);near(g.player.health,hp-2);
 }
 {
  const {g,MM}=fixture(170);g.underwater.oxygen=20;MM.MerfolkTransformation.activate(g);const hp=g.player.health;
  MM.MiddleSeaEnemies.applyElectric(g,{owner:{boss:true},sourceBoss:true,damage:1,stun:3,stunLimit:3,oxygenFraction:.5});near(g.underwater.oxygen,20);near(g.player.health,hp-1);near(g.player.stunTime,3);
 }
 {
  const {g,MM}=fixture(180);g.underwater.oxygen=20;MM.MerfolkTransformation.activate(g);const b=g.spawn('boss');b.phase='active';MM.Boss180.startPanic(g,b);MM.Boss180.update(g,3);near(g.underwater.oxygen,20);assert.equal(g.predatorPanic,null);
 }
 {
  const {g,MM}=fixture(200);g.underwater.oxygen=20;MM.MerfolkTransformation.activate(g);const b=g.spawn('boss');b.phase='active';const hp=g.player.health;
  MM.Boss200.contact(g,b,1,1,.5);near(g.underwater.oxygen,20);near(g.player.health,hp-1);near(g.player.stunTime,1);
 }
});

test('Merfolk key rebinding uses the same one-use action and never changes saved reward ownership',()=>{
 const {g,MM,key}=fixture();const before=JSON.stringify(g.progression.rewards);assert.equal(MM.KeyBindings.set(g,'merfolk','KeyT'),true);
 key('KeyR');assert.equal(MM.MerfolkTransformation.active(g),false);key('KeyT');assert.equal(MM.MerfolkTransformation.active(g),true);assert.equal(JSON.stringify(g.progression.rewards),before);
 MM.WeaponManager.select(g,'lightningOrb');assert.equal(MM.MerfolkTransformation.active(g),true);assert.equal(JSON.stringify(g.progression.rewards),before);
});

test('free swim requires190, W/S move vertically without changing aim, and ArrowUp still only supplies oxygen',()=>{
 const locked=fixture(191,[160,170,180]);assert.equal(locked.MM.UnderwaterMode.freeSwim(locked.g),false);
 const {g,MM,key}=fixture(191);assert.equal(MM.UnderwaterMode.freeSwim(g),true);const y=g.player.y;g.aimMode='ground';key('KeyW');tick(g,.3);key('KeyW',true);assert.ok(g.player.y<y-20);assert.equal(g.aimMode,'ground');
 key('KeyS');tick(g,.4);key('KeyS',true);assert.ok(g.player.vy>0);assert.equal(g.aimMode,'ground');g.clearInputs();g.player.vy=0;
 g.underwater.oxygen=10;g.underwater.reserve=2;const yy=g.player.y;key('ArrowUp');key('ArrowUp',true);near(g.underwater.oxygen,25);assert.equal(g.underwater.reserve,1);assert.equal(g.swimVertical,0);near(g.player.y,yy);
});

test('free-swim diagonals keep the normal speed and stay inside the full 2D arena',()=>{
 const {g,MM,key}=fixture(191);key('ArrowRight');key('KeyW');tick(g,.5);assert.ok(g.player.vx>0&&g.player.vy<0);assert.ok(Math.hypot(g.player.vx,g.player.vy)<=MM.UnderwaterConfig.swim.speed+1e-7);
 tick(g,4);assert.ok(g.player.x<=MM.UnderwaterConfig.arena.width-MM.UnderwaterConfig.arena.edge);assert.ok(g.player.y>=g.player.h+18);g.clearInputs();g.player.vx=g.player.vy=0;
 key('ArrowLeft');key('KeyS');tick(g,5);assert.ok(g.player.x>=MM.UnderwaterConfig.arena.edge);assert.ok(g.player.y<=MM.UnderwaterConfig.arena.height-20);assert.ok(Number.isFinite(g.player.swimTilt));
});

test('custom swim keys, touch buttons and vertical swipes leave aim and oxygen bindings independent',()=>{
 const {g,MM,key}=fixture(191);MM.KeyBindings.set(g,'aimHigh','KeyI');MM.KeyBindings.set(g,'aimGround','KeyK');key('KeyI');tick(g,.2);assert.ok(g.player.vy<0);key('KeyI',true);g.clearInputs();g.player.vy=0;
 const button={dataset:{control:'swim-down'},classList:{add(){},remove(){}},setPointerCapture(){},releasePointerCapture(){}},event={pointerId:7,preventDefault(){}};
 const y=g.player.y;g.padDown(event,button);tick(g,.25);assert.ok(g.player.y>y);assert.equal(g.aimMode,'ground');g.padUp(event,button);assert.equal(g.padInputs.size,0);
 g.canvas={focus(){},getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}),setPointerCapture(){},releasePointerCapture(){}};g.clearInputs();g.player.vy=0;g.underwater.oxygen=12;const reserve=g.underwater.reserve;
 const pointer={pointerId:8,pointerType:'touch',clientX:250,clientY:250,button:0,preventDefault(){}};g.pointerDown(pointer);g.pointerMove({...pointer,clientY:190});assert.equal(g.pointers.get(8).mode,'swim');tick(g,.2);assert.ok(g.player.vy<0);assert.equal(g.underwater.reserve,reserve);assert.equal(g.aimMode,'ground');g.pointerUp(pointer);assert.equal(g.pointers.size,0);
});

test('three permanent starfish share one eight-step radius and survive a temporary Kraken blackout',()=>{
 const {g,MM}=fixture(200);const stars=MM.OceanVisuals.starfish(g,1),light=MM.OceanVisuals.lightState(g);assert.equal(stars.length,3);assert.equal(new Set(stars.map(s=>s.x+':'+s.y)).size,3);assert.equal(light.radius,8*MM.DeepSeaConfig.step);assert.equal(light.enabled,true);
 g.krakenDarkTime=10;const dim=MM.OceanVisuals.lightState(g);assert.equal(dim.blackout,true);assert.equal(MM.OceanVisuals.starfish(g,2).length,3);g.krakenDarkTime=0;assert.equal(MM.OceanVisuals.lightState(g).blackout,false);
 g.start(1);assert.equal(MM.OceanVisuals.starfish(g,3).length,0);assert.equal(MM.OceanVisuals.lightState(g).enabled,false);assert.equal(MM.SaveManager.unlocked(g,180),true);
});
