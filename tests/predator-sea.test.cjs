'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=180){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);
 g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;
 g.underwater.oxygenTimer=g.underwater.middleHazardTimer=g.underwater.predatorHazardTimer=1e6;
 g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;
 const spawn=(type,x=700,side=1)=>{const e=g.spawn(type,side);if(type!=='swordfish'){e.x=x;e.phase='active';e.warning=0;}return e;};
 const boss=(x=700)=>{const e=spawn('boss',x);e.predatorNextBite=e.predatorNextDive=e.predatorNextRoar=Infinity;return e;};
 return {g,MM,spawn,boss};
}
function tick(g,seconds,step=.01){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(step,left);g.update(dt);left-=dt;}}
function contact(g,e){g.player.x=e.x;g.player.y=e.y-e.h*.5+g.player.h*.5;g.player.swimAnchorY=g.player.y;g.player.invulnerable=0;}

test('171–180 inherit the existing swimming, finite oxygen and provisionally configured balance',()=>{
 for(const level of [171,174,177,180]){const {g,MM}=fixture(level);assert.equal(g.level.predatorSea,true);assert.equal(g.player.swimming,true);
  const x=g.player.x;g.keys.add('ArrowRight');tick(g,.2);assert.ok(g.player.x>x);assert.ok(g.player.vx<=245);assert.ok(Math.abs(g.underwater.oxygen-29.8)<1e-7);
  assert.equal(MM.PredatorSeaConfig.provisional,true);assert.equal(g.level.balanceStatus,'provisional-playtest');}
});
test('hammerhead starts each warned ram on its two-second clock and only the head deals one HP once',()=>{
 const {g,MM,spawn}=fixture(171),e=spawn('hammerhead',g.player.x-190);e.dir=1;
 tick(g,1.99);assert.equal(e.predatorCasts,0);tick(g,.02);assert.equal(e.predatorCasts,1);assert.equal(e.predatorState,'ram-warning');
 const hp=g.player.health;tick(g,1);assert.equal(g.player.health,hp-1);assert.equal(g.player.stunTime,0);
 assert.ok(Math.abs(g.underwater.oxygen-26.99)<1e-6,'the ram has no extra oxygen loss');
 tick(g,1);assert.equal(e.predatorCasts,2);assert.equal(MM.PredatorSeaConfig.hammerhead.ramDamage,1);
});
test('hammerhead body outside its head sweep causes no invisible contact damage',()=>{
 const {g,spawn}=fixture(171),e=spawn('hammerhead',480);e.dir=1;e.predatorState='ram';e.predatorTimer=.2;e.predatorHit=false;e.vx=e.vy=0;
 g.player.x=e.x-35;g.player.y=e.y;g.player.swimAnchorY=g.player.y;tick(g,.1);assert.equal(g.player.health,100);
});
test('ray releases one electric shot per ten seconds for one HP and one second stun without oxygen damage',()=>{
 const {g,spawn}=fixture(174),e=spawn('electricRay',g.player.x+300);
 tick(g,9.99);assert.equal(e.predatorCasts,0);tick(g,.02);assert.equal(e.predatorCasts,1);assert.equal(e.predatorState,'electric-warning');
 tick(g,.81);const shot=g.waterShots.find(s=>s.kind==='predator-electric');assert.ok(shot);assert.equal(shot.owner,e);assert.equal(shot.damage,1);assert.equal(shot.stun,1);
 shot.x=g.player.x;shot.y=g.player.y-g.player.h*.5;shot.vx=shot.vy=0;
 const oxygen=g.underwater.oxygen;g.update(.01);assert.equal(g.player.health,99);assert.equal(g.player.stunTime,1);assert.equal(g.player.stunStyle,'electric');
 assert.ok(Math.abs(g.underwater.oxygen-(oxygen-.01))<1e-6);assert.ok(!g.waterShots.includes(shot));
 tick(g,20.02-e.predatorClock);assert.equal(e.predatorCasts,2);
});
test('swordfish warnings match both travel directions and each fish makes one bounded pass',()=>{
 for(const side of [-1,1]){const {g,spawn,MM}=fixture(177),e=spawn('swordfish',0,side),dir=e.predatorDirection;
  assert.equal(dir,side===-1?1:-1);assert.equal(e.predatorWarningX,dir>0?24:936);assert.equal(e.phase,'warning');
  assert.equal(e.predatorState,'edge-warning');const edge=e.x;tick(g,MM.PredatorSeaConfig.swordfish.warning-.01);assert.equal(e.x,edge);
  tick(g,.03);assert.equal(e.phase,'active');const x=e.x;tick(g,.03);assert.ok((e.x-x)*dir>0);assert.equal(e.dir,dir);
  tick(g,2);assert.equal(e.retired,true);assert.equal(e.dead,true);assert.equal(g.regularSpawned,0);assert.equal(g.levelKills,0);
  tick(g,4);assert.equal(g.enemies.filter(f=>f.archetype==='swordfish'&&!f.retired).length,0);}
});
test('swordfish can be shot, never occupies ordinary spawn quota, and cannot trigger completion early',()=>{
 const {g,spawn}=fixture(177);g.level.target=2;g.spawnTimer=0;const e=spawn('swordfish');tick(g,.92);assert.equal(g.regularSpawned,1);
 assert.equal(g.dealEnemyDamage(e,999,{kind:'gun'}),true);assert.equal(g.levelKills,0);assert.equal(g.screen,'playing');
 const regular=g.enemies.find(f=>!f.predatorSeaHazard);regular.phase='active';g.dealEnemyDamage(regular,999,{kind:'gun'});
 g.spawnTimer=0;g.update(.01);assert.equal(g.regularSpawned,2);const last=g.enemies.find(f=>!f.predatorSeaHazard&&!f.dead);last.phase='active';g.dealEnemyDamage(last,999,{kind:'gun'});
 assert.equal(g.screen,'won');assert.equal(g.levelKills,2);
});
test('retired swordfish leave no retained hitboxes and passive petrification cannot strand a pass',()=>{
 const {g,spawn}=fixture(177),e=spawn('swordfish');tick(g,.91);e.petrifiedTime=2;const x=e.x;g.update(.05);assert.ok((e.x-x)*e.predatorDirection>0);
 tick(g,2);assert.ok(!g.enemies.includes(e));g.underwater.predatorHazardTimer=0;tick(g,24);
 assert.ok(g.enemies.filter(f=>f.archetype==='swordfish').length<=1);assert.equal(g.regularSpawned,0);
});
test('sonic bite starts on its fifteen-second clock and the mouth deals three HP once, respecting a shield',()=>{
 for(const shield of [false,true]){const {g,boss}=fixture(),b=boss(250);b.predatorNextBite=15;
  if(shield){g.player.shieldTime=30;g.player.shieldHits=3;}
  tick(g,14.99);assert.equal(b.predatorBiteCasts,0);b.x=250;b.y=g.player.y-g.player.h*.5+b.h*.5;tick(g,.02);
  assert.equal(b.predatorBiteCasts,1);assert.equal(b.predatorState,'bite-warning');assert.ok(b.skillWarning);tick(g,1.5);
  assert.equal(g.player.health,shield?100:97);assert.equal(g.player.stunTime,0);if(shield)assert.equal(g.player.shieldHits,2);
  tick(g,.5);assert.equal(g.player.health,shield?100:97);assert.ok(Math.abs(b.predatorNextBite-30)<1e-7);}
});
test('deep ambush has no hidden hurtbox, stays hidden exactly three seconds, and emerges with one three-HP bite',()=>{
 const {g,boss,MM}=fixture(),b=boss(700);b.predatorNextDive=0;g.update(.01);assert.equal(b.predatorState,'dive-down');
 tick(g,MM.PredatorSeaConfig.boss.diveDownDuration);assert.equal(b.predatorState,'dive-hidden');assert.equal(b.predatorHidden,true);assert.equal(b.intangible,true);
 assert.equal(g.dealEnemyDamage(b,999,{kind:'gun'}),false);assert.equal(b.health,160);const hp=g.player.health;
 tick(g,2.99);assert.equal(b.predatorHidden,true);assert.equal(g.player.health,hp);assert.equal(b.predatorEmergenceLocked,true);
 tick(g,.01);assert.equal(b.predatorHidden,false);assert.equal(b.predatorState,'emerge-bite');assert.equal(b.intangible,false);
 tick(g,.6);assert.equal(g.player.health,hp-3);assert.equal(g.player.stunTime,0);tick(g,.5);assert.equal(g.player.health,hp-3);
 assert.equal(b.predatorNextDive,10.01);
});
test('roar lasts three seconds in half the arena, never deals HP, and applies panic only once',()=>{
 const {g,boss,MM}=fixture(),b=boss(200);g.player.x=400;b.predatorNextRoar=0;g.update(.01);assert.equal(b.predatorState,'roar-warning');
 tick(g,MM.PredatorSeaConfig.boss.roarWarning);assert.equal(b.predatorState,'roar');const zone=g.waterZones.find(z=>z.kind==='predator-roar');
 assert.equal(zone.range,480);assert.equal(zone.total,3);tick(g,1);assert.equal(zone.hit,true);assert.equal(g.player.health,100);assert.ok(g.predatorPanic);
 const panic=g.predatorPanic;tick(g,1);assert.equal(g.predatorPanic,panic);assert.equal(g.player.health,100);tick(g,1.01);
 assert.equal(b.predatorState,'patrol');assert.equal(g.waterZones.filter(z=>z.kind==='predator-roar').length,0);
});
test('panic drains ten percent of current oxygen at each of exactly three one-second boundaries',()=>{
 const {g,boss,MM}=fixture(),b=boss();g.underwater.oxygen=20;MM.Boss180.startPanic(g,b);MM.Boss180.update(g,.99);assert.equal(g.underwater.oxygen,20);
 MM.Boss180.update(g,.01);assert.ok(Math.abs(g.underwater.oxygen-18)<1e-9);MM.Boss180.update(g,1);assert.ok(Math.abs(g.underwater.oxygen-16.2)<1e-9);
 MM.Boss180.update(g,1);assert.ok(Math.abs(g.underwater.oxygen-14.58)<1e-9);assert.equal(g.predatorPanic,null);MM.Boss180.update(g,1);assert.ok(Math.abs(g.underwater.oxygen-14.58)<1e-9);
 assert.equal(g.player.health,100);
});
test('roar shielding blocks control and panic using the existing shield charge rules',()=>{
 const {g,boss,MM}=fixture(),b=boss(200);g.player.x=400;g.player.shieldTime=10;g.player.shieldHits=3;b.predatorNextRoar=0;
 tick(g,2);assert.equal(g.player.health,100);assert.equal(g.player.stunTime,0);assert.equal(g.player.shieldHits,2);assert.equal(g.predatorPanic??null,null);
 assert.ok(Math.abs(g.underwater.oxygen-28)<1e-7);assert.equal(MM.PredatorSeaConfig.boss.shieldBlocksPanic,true);
});
test('lethal damage starts one five-second invulnerable rage at zero HP and only then completes the boss',()=>{
 const {g,boss,MM}=fixture(),b=boss();g.levelKills=g.level.target;g.bossSpawned=true;
 assert.equal(g.dealEnemyDamage(b,999,{kind:'gun'}),true);assert.equal(b.health,0);assert.equal(b.predatorRage,true);assert.equal(b.predatorRageTime,5);
 assert.equal(g.screen,'playing');assert.equal(g.bossDefeated,false);assert.equal(g.dealEnemyDamage(b,999,{kind:'gun'}),false);
 assert.equal(MM.Boss180.startRage(g,b),false);g.killEnemy(b);assert.equal(b.dead,undefined);tick(g,4.99);assert.equal(g.screen,'playing');assert.equal(b.health,0);
 tick(g,.01);assert.equal(g.screen,'won');assert.equal(b.predatorFinalComplete,true);assert.equal(b.dead,true);assert.equal(g.bossDefeated,true);
 assert.equal(g.waterZones.length,0);assert.equal(g.predatorPanic,null);assert.equal(b.indestructible,false);
});
test('rage preserves active attacks and boss damage instead of healing or introducing a damage rule',()=>{
 const {g,boss}=fixture(),b=boss(250);b.predatorNextBite=0;g.update(.01);g.dealEnemyDamage(b,999,{kind:'gun'});assert.equal(b.predatorState,'bite-warning');
 tick(g,1.3);assert.equal(g.player.health,97);assert.equal(b.health,0);assert.equal(b.predatorRage,true);assert.equal(b.predatorBiteCasts,1);
});
test('pause, weapon picker, death, retry and map exit do not leak predator timers, panic or hidden hitboxes',()=>{
 const {g,boss,MM}=fixture(),b=boss();b.predatorNextDive=0;g.update(.01);tick(g,.45);MM.Boss180.startPanic(g,b);
 const timer=b.predatorTimer,air=g.underwater.oxygen;g.screen='paused';tick(g,2);g.update(.05);assert.equal(b.predatorTimer,timer);assert.equal(g.underwater.oxygen,air);
 g.screen='playing';g.weaponPicker={open:true};g.update(.05);assert.equal(b.predatorTimer,timer);g.weaponPicker.open=false;
 g.finish(false);assert.equal(b.predatorHidden,false);assert.equal(b.intangible,false);assert.equal(b.bulletUntargetable,false);assert.equal(g.predatorPanic,null);assert.equal(g.waterShots.length,0);assert.equal(g.waterZones.length,0);
 g.start(180,{retry:true});assert.equal(g.player.panicTime||0,0);assert.equal(g.underwater.oxygen,30);g.start(1);assert.equal(g.player.swimming,false);assert.equal(g.underwater.active,false);
});
