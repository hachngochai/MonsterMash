'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=190,rewards=[160,170]){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM;let saved=JSON.stringify({version:2,campaignSize:200,completed:[],progression:{version:1,rewards,equipped:'gun',lifeKills:0}});
 const storage={getItem:()=>saved,setItem(key,value){saved=value;}};
 const g=new MM.Game({headless:true,storage,random:()=>.5});g.start(level);g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;
 g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;g.underwater.oxygenTimer=g.underwater.middleHazardTimer=g.underwater.predatorHazardTimer=1e6;
 const s=MM.FinalSeaEnemies.state(g);s.ambientSpawned=true;s.turtleTimer=s.bugTimer=1e6;s.vents=[];
 const spawn=(type='boss',x=650)=>{const e=g.spawn(type,1);e.x=x;e.phase='active';e.warning=0;
  e.waterNextClaw=e.waterNextVortex=e.waterNextSilence=e.middleNextShock=e.middleNextSummon=e.middleNextLaser=Infinity;
  e.predatorNextBite=e.predatorNextDive=e.predatorNextRoar=e.deepNextBite=e.deepNextSwarm=e.deepNextLord=e.deepNextHole=Infinity;
  e.krakenNextSuction=e.krakenNextShip=e.krakenNextDark=Infinity;return e;};
 return {g,MM,spawn,saved:()=>JSON.parse(saved),storage};
}
function tick(g,seconds){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(.01,left);g.update(dt);left-=dt;}}
const near=(n,want)=>assert.ok(Math.abs(n-want)<1e-7,`${n} should equal ${want}`);

test('Merfolk expiry charges only the unprotected part of a frame at each ocean depth',()=>{
 for(const [level,multiplier] of [[151,1],[181,1.5],[191,2]]){const {g,MM}=fixture(level);g.underwater.oxygen=12;g.player.stunTime=.5;
  assert.equal(MM.MerfolkTransformation.activate(g),true);g.merfolk.remaining=.013;g.update(.05);
  near(g.underwater.oxygen,12-.037*multiplier);assert.equal(g.merfolk.remaining,0);near(g.player.stunTime,.45);assert.equal(g.merfolk.used,true);assert.equal(MM.MerfolkTransformation.activate(g),false);}
});
test('zero-air Merfolk expiry restarts the normal five-second suffocation grace without a stale drowning tick',()=>{
 const {g,MM}=fixture(191);g.underwater.oxygen=0;g.underwater.suffocationTime=4.99;g.underwater.damageClock=.99;
 assert.equal(MM.MerfolkTransformation.activate(g),true);assert.equal(MM.UnderwaterMode.canAttack(g),true);g.merfolk.remaining=.013;g.update(.05);
 near(g.underwater.suffocationTime,.037);assert.equal(g.player.health,100);assert.equal(MM.UnderwaterMode.canAttack(g),false);tick(g,4.96);assert.equal(g.player.health,100);tick(g,.01);assert.equal(g.player.health,99);
});
test('every authored ocean oxygen attack respects Merfolk while boss HP damage remains active',()=>{
 for(const level of [160,170,180,200]){const {g,MM,spawn}=fixture(level),e=spawn();g.underwater.oxygen=20;assert.equal(MM.MerfolkTransformation.activate(g),true);
  if(level===160){g.waterZones.push({kind:'water-vortex',owner:e,phase:'active',x:g.player.x,y:g.player.y-g.player.h*.5,radius:170,coreRadius:30,timer:1,hit:false});MM.Boss160.update(g,.01);assert.equal(g.player.health,98);}
  if(level===170){MM.MiddleSeaEnemies.applyElectric(g,{owner:e,sourceBoss:true,damage:1,stun:3,stunLimit:3,oxygenFraction:.5});assert.equal(g.player.health,99);assert.equal(g.player.stunTime,3);}
  if(level===180){MM.Boss180.startPanic(g,e);MM.Boss180.update(g,3);assert.equal(g.player.health,100);assert.equal(g.predatorPanic,null);}
  if(level===200){MM.Boss200.contact(g,e,1,1,.5);assert.equal(g.player.health,99);assert.equal(g.player.stunTime,1);}
  near(g.underwater.oxygen,20);}
});
test('Merfolk distinguishes ordinary electrical damage, boss-owned children and environmental vents',()=>{
 const {g,MM,spawn}=fixture(200),ordinary=spawn('electricRay'),owner=spawn();assert.equal(MM.MerfolkTransformation.activate(g),true);
 g.applyCombatEffect({damage:1,stun:1,owner:ordinary,sourceBoss:false});assert.equal(g.player.health,100);assert.equal(g.player.stunTime,1);
 g.player.stunTime=g.player.invulnerable=0;const child=spawn('leviathanChild');child.summonOwner=owner;
 g.applyCombatEffect({damage:1,owner:child});assert.equal(g.player.health,99);g.player.invulnerable=0;
 g.applyCombatEffect({damage:1,environment:true});assert.equal(g.player.health,98);near(g.underwater.oxygen,30);
});
test('an orb can spend fractional ammo at zero oxygen during Merfolk, then stops on the exact expiry frame',()=>{
 const {g,MM,spawn}=fixture(171),e=spawn('hammerhead',600);e.health=10;e.petrifiedTime=1000;g.player.ammo=.75;g.underwater.oxygen=0;
 assert.equal(MM.WeaponManager.select(g,'lightningOrb'),true);assert.equal(MM.MerfolkTransformation.activate(g),true);assert.equal(MM.LightningOrbWeapon.fire(g,1),true);
 near(e.health,9.25);near(g.player.ammo,0);g.player.ammo=5;g.player.shotTimer=0;g.merfolk.remaining=.005;g.keys.add('KeyL');g.update(.01);
 assert.equal(g.lightningOrb.active,false);near(e.health,9.25);near(g.player.ammo,5);assert.equal(g.dealEnemyDamage(e,1,{kind:'gun'}),false);
});
test('fractional orb receipts cannot smuggle a Leviathan phase refill into ammo cost or award190 early',()=>{
 const {g,MM,spawn,saved}=fixture(190),e=spawn();g.levelKills=g.level.target;g.bossSpawned=true;g.player.ammo=.25;e.health=.25;MM.WeaponManager.select(g,'lightningOrb');
 MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,0);near(e.health,e.maxHealth*.25);assert.equal(saved().progression.rewards.includes(190),false);
 tick(g,5);g.enemies=[e];e.health=.25;g.player.ammo=.25;g.player.shotTimer=0;g.lightningOrb.cooldown=0;e.x=650;e.y=g.player.y-g.player.h*.5+e.h*.5;
 MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,0);assert.equal(e.deepFinal,true);assert.equal(e.health,0);assert.equal(saved().progression.rewards.includes(190),false);
 tick(g,2.8);g.player.stunTime=g.player.petrifyTime=0;g.shieldCount=1;assert.equal(g.shieldAction(),true);tick(g,2.2);
 assert.equal(g.screen,'won');assert.equal(saved().completed.includes(190),true);assert.equal(saved().progression.rewards.filter(x=>x===190).length,1);
 assert.equal(MM.BossManager.onDefeated(g,e),false);
});
test('Kraken overkill waits for both finite legacy summons and never grants their map180/190 rewards',()=>{
 for(const order of [[0,1],[1,0]]){const {g,MM,spawn,saved}=fixture(200),e=spawn();g.levelKills=g.level.target;g.bossSpawned=true;e.health=.25;g.player.ammo=1;MM.WeaponManager.select(g,'lightningOrb');
  MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,.75);assert.equal(e.health,0);assert.equal(e.krakenStone,true);assert.equal(g.screen,'playing');
  tick(g,5.01);const children=g.enemies.filter(x=>x.finalSeaSummon);assert.equal(children.length,2);assert.equal(e.dead,true);assert.equal(g.bossDefeated,false);
  for(const [index,childIndex] of order.entries()){const child=children[childIndex];child.phase='active';g.dealEnemyDamage(child,999,{kind:'gun'});
   assert.equal(child.predatorRage,undefined);assert.equal(child.deepRebirthUsed,undefined);if(index===0)assert.equal(g.screen,'playing');}
  assert.ok(['won','ending','cinematic'].includes(g.screen));assert.equal(saved().completed.includes(200),true);assert.equal(saved().completed.includes(180),false);assert.equal(saved().completed.includes(190),false);
  assert.equal(saved().progression.rewards.includes(180),false);assert.equal(saved().progression.rewards.includes(190),false);}
});
test('ordinary aquatic petrification freezes its own warning and clock before resuming the same attack',()=>{
 for(const [level,type,key] of [[171,'hammerhead','predatorClock'],[181,'gulper','deepClock'],[191,'seaCrab','finalClock']]){const {g,spawn}=fixture(level),e=spawn(type,600);e.petrifiedTime=1;
  const clock=e[key];tick(g,.99);assert.equal(e[key],clock);tick(g,.03);assert.ok(e[key]>clock);assert.equal(e.petrifiedTime,0);}
});
