'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=200,{rewards=[]}={}){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM,data={version:2,campaignSize:200,completed:[],progression:{version:1,rewards,equipped:'gun',lifeKills:0}};
 const g=new MM.Game({headless:true,storage:{getItem:()=>JSON.stringify(data),setItem(){}},random:()=>.5});g.start(level);
 g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;
 g.underwater.oxygenTimer=g.underwater.middleHazardTimer=g.underwater.predatorHazardTimer=1e6;
 const s=MM.FinalSeaEnemies.state(g);s.ambientSpawned=true;s.turtleTimer=s.bugTimer=1e6;
 const spawn=(type,x=700)=>{const e=g.spawn(type,1);e.x=x;e.phase='active';e.warning=0;return e;};
 const boss=(x=700)=>{const e=spawn('boss',x);e.krakenNextSuction=e.krakenNextShip=e.krakenNextDark=Infinity;return e;};
 return {g,MM,spawn,boss};
}
function tick(g,seconds,step=.01){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(step,left);g.update(dt);left-=dt;}}
function align(g,x,y){g.player.x=x;g.player.y=y;g.player.swimAnchorY=y;g.player.vx=g.player.vy=0;g.player.invulnerable=0;}
const near=(n,want)=>assert.ok(Math.abs(n-want)<1e-6,`${n} should equal ${want}`);

test('final ocean keeps the official damage, timings, finite summons and two-thirds-height Kraken in config',()=>{
 const {MM}=fixture(),c=MM.FinalSeaConfig;assert.equal(c.provisional,true);assert.equal(c.oxygenDrainMultiplier,2);assert.equal(c.enemies.kraken.h,360);
 assert.equal(c.clam.closeDelay,2);assert.equal(c.clam.regrowDelay,10);assert.equal(c.squid.damage,1);
 assert.equal(c.vents.damage,1);assert.equal(c.vents.boostedDamage,2);assert.equal(c.vents.stun,1);
 assert.equal(c.boss.suctionCooldown,10);assert.equal(c.boss.suctionDamage,1);assert.equal(c.boss.shipCooldown,15);assert.equal(c.boss.shipRange,320);assert.equal(c.boss.shipDamage,1);
 assert.equal(c.boss.darkDuration,10);assert.equal(c.boss.echoThreshold,.5);assert.equal(c.boss.fossilDuration,5);assert.equal(c.boss.fossilHealRatio,.25);assert.equal(c.boss.fossilInvulnerable,false);assert.equal(c.boss.summonRatio,.25);assert.equal(c.boss.victoryRule,'defeat-all-three');
});
test('crab raises its two claws before a once-only one-HP pinch, without extra stun',()=>{
 const {g,spawn}=fixture(191),e=spawn('seaCrab',480);align(g,480+e.w*.5,400);e.finalNextAttack=0;
 g.update(.01);assert.equal(e.finalState,'claw-warning');assert.equal(g.player.health,100);tick(g,.68);assert.equal(g.player.health,100);tick(g,.05);assert.equal(g.player.health,99);assert.equal(g.player.stunTime,0);tick(g,.4);assert.equal(g.player.health,99);
});
test('a pearl is collected once, closes at2s, regrows at10s and clamps the real oxygen amount',()=>{
 const {g,MM,spawn}=fixture(191),e=spawn('pearlClam',480);align(g,e.x,400);g.underwater.oxygen=25;
 MM.FinalSeaEnemies.updateEnemy(g,e,.01);assert.equal(e.pearlAvailable,false);assert.equal(e.pearlCollections,1);assert.equal(g.underwater.oxygen,30);
 MM.FinalSeaEnemies.updateEnemy(g,e,1.99);assert.equal(e.clamOpen,true);MM.FinalSeaEnemies.updateEnemy(g,e,.01);assert.equal(e.clamOpen,false);assert.equal(e.clamCloseCount,1);assert.equal(g.player.health,100);assert.ok(g.player.y<=e.y-e.h-8);
 MM.FinalSeaEnemies.updateEnemy(g,e,7.99);assert.equal(e.pearlAvailable,false);MM.FinalSeaEnemies.updateEnemy(g,e,.01);assert.equal(e.pearlAvailable,true);assert.equal(e.clamOpen,true);assert.equal(e.pearlCollections,1);
 assert.equal(g.dealEnemyDamage(e,99,{kind:'gun'}),false);g.killEnemy(e);assert.equal(e.dead,undefined);assert.equal(g.levelKills,0);
});
test('each clam keeps an independent collection and regrowth clock',()=>{
 const {g,MM,spawn}=fixture(191),one=spawn('pearlClam',250),two=spawn('pearlClam',700);align(g,250,400);g.underwater.oxygen=5;
 MM.FinalSeaEnemies.updateEnemy(g,one,.01);MM.FinalSeaEnemies.updateEnemy(g,one,4);assert.equal(one.pearlElapsed,4);assert.equal(two.pearlAvailable,true);
 align(g,700,400);MM.FinalSeaEnemies.updateEnemy(g,two,.01);assert.equal(two.pearlElapsed,0);assert.equal(one.pearlElapsed,4);assert.equal(g.underwater.oxygen,25);
});
test('angler retracts a real attached lure, warns, then bites once without electric status',()=>{
 const {g,spawn}=fixture(194),e=spawn('anglerFish',600);e.dir=-1;align(g,480,292);e.finalNextAttack=0;
 g.update(.01);assert.equal(e.finalState,'bite-warning');assert.equal(g.player.health,100);tick(g,.4);assert.ok(e.lureRetract>0&&e.lureRetract<1);tick(g,.55);assert.equal(g.player.health,99);assert.equal(g.player.stunTime,0);tick(g,.3);assert.equal(g.player.health,99);
});
test('squid tentacle deals exactly1HP; being hit creates bounded harmless ink and a visible bounded escape',()=>{
 const {g,MM,spawn}=fixture(197),e=spawn('giantSquid',560);align(g,480,292);e.y=330;e.finalNextAttack=0;
 g.update(.01);assert.equal(e.finalState,'tentacle-warning');tick(g,.85);assert.equal(g.player.health,99);tick(g,.4);assert.equal(g.player.health,99);
 const x=e.x,y=e.y;g.dealEnemyDamage(e,1,{kind:'gun'});assert.equal(e.finalState,'flee');assert.equal(g.finalSea.inkClouds.length,1);assert.equal(g.krakenDarkTime||0,0);
 for(let i=0;i<6;i++)g.dealEnemyDamage(e,.1,{kind:'gun',damageReceipt:{damage:0},damageBudget:.1});assert.equal(g.finalSea.inkClouds.length,1);
 tick(g,1.25);assert.ok(Math.hypot(e.x-x,e.y-y)>20);assert.ok(e.x>=28+e.w*.5&&e.x<=932-e.w*.5);assert.ok(e.y>=e.h+12&&e.y<=400);tick(g,2);assert.equal(g.finalSea.inkClouds.length,0);assert.equal(g.krakenDarkTime||0,0);
});
test('passing turtle keeps its initial direction, has a mouth-only bite and retires without a quota kill',()=>{
 const {g,spawn}=fixture(197),e=spawn('seaTurtle',450);e.finalDirection=1;e.dir=1;e.y=300;align(g,80,300);
 tick(g,.4);const x=e.x;align(g,900,300);tick(g,.4);assert.ok(e.x>x);assert.equal(e.finalDirection,1);assert.equal(g.player.health,100);
 e.x=960+e.w*.5-.1;align(g,80,300);tick(g,.05);assert.equal(e.retired,true);assert.equal(g.totalKills,0);assert.equal(g.levelKills,0);
});
test('vents warn before eruption, hit once for1HP and1s stun, and a shield blocks the event',()=>{
 for(const shield of [false,true]){
  const {g,MM}=fixture(191),z={kind:'hydrothermal-vent',x:480,y:438,w:60,h:330,phase:'idle',timer:0,hit:false,damage:1,stun:1};g.finalSea.vents=[z];align(g,480,292);if(shield){g.player.shieldTime=10;g.player.shieldHits=3;}
  g.update(.01);assert.equal(z.phase,'warning');assert.equal(g.player.health,100);tick(g,1.08);assert.equal(g.player.health,100);tick(g,.05);assert.equal(g.player.health,shield?100:99);if(!shield)assert.ok(g.player.stunTime>.95);else assert.equal(g.player.shieldHits,2);
  tick(g,.8);assert.equal(g.player.health,shield?100:99);assert.equal(MM.FinalSeaEnemies.boostVents(g),true);assert.equal(MM.FinalSeaEnemies.boostVents(g),false);assert.equal(z.damage,2);
 }
});
test('half-health echo activates once, doubles vent damage once, and keeps its stun at1s',()=>{
 const {g,MM,boss}=fixture(),e=boss();g.finalSea.vents=[{x:480,y:438,w:60,h:330,phase:'idle',timer:0,hit:false,damage:1}];
 g.dealEnemyDamage(e,110,{kind:'gun'});assert.equal(e.krakenEchoCasts,1);assert.equal(g.finalSea.boosted,true);assert.equal(e.krakenState,'echo');g.dealEnemyDamage(e,1,{kind:'gun'});assert.equal(e.krakenEchoCasts,1);assert.equal(g.finalSea.vents[0].damage,2);
 e.krakenNextSuction=e.krakenNextShip=e.krakenNextDark=Infinity;align(g,480,292);tick(g,1.15);assert.equal(g.player.health,98);assert.ok(g.player.stunTime>.9);assert.equal(MM.FinalSeaConfig.vents.stun,1);
});
test('suction starts on its10s clock, warns, and costs1HP,1s stun and half current oxygen once',()=>{
 const {g,boss}=fixture(),e=boss(700);e.krakenNextSuction=10;tick(g,9.99);assert.equal(e.krakenSuctionCasts,0);tick(g,.02);assert.equal(e.krakenSuctionCasts,1);const z=g.waterZones.find(z=>z.kind==='kraken-tentacle');assert.equal(z.phase,'warning');
 align(g,z.x,z.y+g.player.h*.5);g.underwater.oxygen=20;tick(g,.98);assert.equal(g.player.health,100);const air=g.underwater.oxygen;tick(g,.03);assert.equal(g.player.health,99);assert.ok(g.player.stunTime>.95);assert.ok(g.underwater.oxygen<air*.51);tick(g,.3);assert.equal(g.player.health,99);
});
test('active shield blocks suction HP, stun and oxygen; Merfolk blocks oxygen but boss HP remains dangerous',()=>{
 for(const mode of ['shield','merfolk']){
  const {g,MM,boss}=fixture(200,{rewards:[160]}),e=boss();e.krakenNextSuction=0;g.update(.01);const z=g.waterZones.find(z=>z.kind==='kraken-tentacle');align(g,z.x,z.y+g.player.h*.5);g.underwater.oxygen=20;
  if(mode==='shield'){g.player.shieldTime=5;g.player.shieldHits=3;}else assert.equal(MM.MerfolkTransformation.activate(g),true);
  tick(g,1.05);assert.equal(g.player.health,mode==='shield'?100:99);if(mode==='shield'){assert.equal(g.player.stunTime,0);near(g.underwater.oxygen,20-2.1);assert.equal(g.player.shieldHits,2);}else near(g.underwater.oxygen,20);
 }
});
test('ship waits for its15s warning, travels no farther than320px and damages only on contact',()=>{
 const {g,boss,MM}=fixture(),e=boss();e.krakenNextShip=15;tick(g,14.99);assert.equal(e.krakenShipCasts,0);g.underwater.oxygen=30;tick(g,.02);assert.equal(e.krakenShipCasts,1);assert.equal(g.waterShots.filter(s=>s.kind==='kraken-ship').length,0);tick(g,1.19);const s=g.waterShots.find(s=>s.kind==='kraken-ship');assert.ok(s);assert.equal(g.player.health,100);assert.equal(s.range,320);
 align(g,28,105);const saved=s;tick(g,1.1);assert.ok(saved.travelled<=320+1e-7);assert.equal(saved.life<=0,true);assert.equal(g.player.health,100);assert.equal(g.waterShots.filter(s=>s.kind==='kraken-ship').length,0);
});
test('Black Ink disables light for exactly10 active seconds without HP or extra oxygen effects',()=>{
 const {g,MM,boss}=fixture(),e=boss();e.krakenNextDark=0;g.update(.01);tick(g,.85);assert.ok(g.krakenDarkTime>9.97&&g.krakenDarkTime<=10);const before=g.krakenDarkTime,air=g.underwater.oxygen;
 g.screen='paused';g.update(.05);assert.equal(g.krakenDarkTime,before);g.screen='playing';tick(g,before-.01);assert.ok(g.krakenDarkTime>0);tick(g,.02);assert.equal(g.krakenDarkTime,0);assert.equal(g.player.health,100);near(g.underwater.oxygen,air-2*(before+.01));
});
test('fossil heals25% maximum HP over5s once, stays damageable and then summons both original species',()=>{
 const {g,MM,boss}=fixture(),e=boss();g.dealEnemyDamage(e,165,{kind:'gun'});assert.equal(e.health,55);assert.equal(e.krakenStone,true);assert.equal(e.krakenFossilCasts,1);
 tick(g,2);near(e.health,77);assert.equal(g.dealEnemyDamage(e,5,{kind:'gun'}),true);near(e.health,72);tick(g,3);near(e.health,105);near(g.krakenEncounter.fossilHeal,55);assert.equal(e.krakenStone,false);
 const summons=g.enemies.filter(e=>e.finalSeaSummon);assert.equal(summons.length,2);assert.deepEqual(Array.from(summons,e=>e.archetype).sort(),['leviathan','megaLondon']);assert.equal(summons.find(e=>e.archetype==='megaLondon').health,40);assert.equal(summons.find(e=>e.archetype==='leviathan').health,45);
 assert.ok(summons.every(e=>e.boss&&e.krakenOwner===g.krakenEncounter.original));g.dealEnemyDamage(e,60,{kind:'gun'});assert.equal(e.krakenFossilCasts,1);assert.equal(g.krakenEncounter.summoned,true);
});
test('a lethal hit during fossil does not heal the dead body or win before finite summons arrive',()=>{
 const {g,boss}=fixture(),e=boss();g.levelKills=g.level.target;g.bossSpawned=true;g.dealEnemyDamage(e,165,{kind:'gun'});g.dealEnemyDamage(e,99,{kind:'gun'});assert.equal(e.health,0);assert.equal(e.krakenDying,true);assert.equal(e.dead,undefined);assert.equal(g.screen,'playing');tick(g,4.99);assert.equal(e.health,0);assert.equal(g.screen,'playing');tick(g,.02);assert.equal(e.dead,true);assert.equal(g.bossDefeated,false);assert.equal(g.screen,'playing');
 const summons=g.enemies.filter(e=>e.finalSeaSummon);for(const child of summons){child.phase='active';child.warning=0;g.dealEnemyDamage(child,999,{kind:'gun'});}
 assert.equal(g.bossDefeated,true);assert.ok(g.screen==='won'||g.screen==='ending');assert.equal(g.save.completed.includes(180),false);assert.equal(g.save.completed.includes(190),false);assert.equal(g.progression.rewards.includes(180),false);assert.equal(g.progression.rewards.includes(190),false);
});
test('legacy summons never enter old resurrection/final-rage controllers and have no repeated spawn loop',()=>{
 const {g,MM,boss}=fixture(),e=boss();g.dealEnemyDamage(e,165,{kind:'gun'});tick(g,5.02);const summons=g.enemies.filter(e=>e.finalSeaSummon);assert.equal(summons.length,2);
 for(const child of summons){assert.equal(MM.Boss180.owns(child),false);assert.equal(MM.Boss190.owns(child),false);child.phase='active';g.dealEnemyDamage(child,999,{kind:'gun'});assert.equal(child.dead,true);assert.equal(child.predatorRage,undefined);assert.equal(child.deepFinalTriggered,undefined);}
 tick(g,1);assert.equal(g.enemies.filter(e=>e.finalSeaSummon&&!e.dead).length,0);assert.equal(g.krakenEncounter.summoned,true);assert.equal(g.screen,'playing');
});
test('retry, exit and death clear bottom hazards, ink, dark timer, pending summons and boss casts',()=>{
 for(const action of ['retry','home','death']){
  const {g,boss}=fixture(),e=boss();g.dealEnemyDamage(e,165,{kind:'gun'});g.krakenDarkTime=10;g.finalSea.inkClouds=[{life:10}];g.waterShots.push({kind:'kraken-ship',life:2,owner:e});
  if(action==='retry')g.start(200,{retry:true});else if(action==='home')g.goHome();else g.finish(false);
  assert.equal(g.krakenDarkTime||0,0);assert.equal(g.krakenEncounter,null);assert.equal(g.waterShots.length,0);assert.equal(g.waterZones.length,0);assert.equal(g.finalSea?.inkClouds.length||0,0);assert.equal(e.tell,false);
 }
});
