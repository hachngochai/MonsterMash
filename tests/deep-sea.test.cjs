'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=190){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);
 g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;
 g.underwater.oxygenTimer=g.underwater.middleHazardTimer=g.underwater.predatorHazardTimer=1e6;
 g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;
 const spawn=(type,x=700,side=1)=>{const e=g.spawn(type,side);e.x=x;e.phase='active';e.warning=0;return e;};
 const boss=(x=700)=>{const e=spawn('boss',x);e.deepNextBite=e.deepNextSwarm=e.deepNextLord=e.deepNextHole=Infinity;return e;};
 return {g,MM,spawn,boss};
}
function tick(g,seconds,step=.01){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(step,left);g.update(dt);left-=dt;}}
function primeFinal(g,b){g.levelKills=g.level.target;g.bossSpawned=true;g.dealEnemyDamage(b,b.health,{kind:'gun'});tick(g,5);g.enemies=[b];g.player.invulnerable=g.player.stunTime=0;g.dealEnemyDamage(b,b.health,{kind:'gun'});}

test('deep sea keeps swimming, capacity and supply rules while using exactly 1.5 times oxygen',()=>{
 for(const level of [181,184,187,190]){const {g,MM}=fixture(level);assert.equal(g.level.deepSea,true);assert.equal(g.player.swimming,true);assert.equal(g.underwater.maxOxygen,30);
  tick(g,1);assert.ok(Math.abs(g.underwater.oxygen-28.5)<1e-7);assert.equal(MM.UnderwaterMode.supply(g),true);assert.equal(g.underwater.oxygen,30);assert.equal(g.underwater.reserve,1);}
 const {g}=fixture(180);tick(g,1);assert.ok(Math.abs(g.underwater.oxygen-29)<1e-7);
});
test('Gulper uses the shared four-step range, warns every five seconds and deals one HP once per suction',()=>{
 const {g,MM,spawn}=fixture(181),e=spawn('gulper',g.player.x-120);e.dir=1;
 assert.equal(MM.DeepSeaConfig.gulper.rangeSteps*MM.DeepSeaConfig.step,200);tick(g,4.99);assert.equal(e.deepCasts,0);tick(g,.02);
 assert.equal(e.deepCasts,1);assert.equal(e.deepState,'suction-warning');assert.equal(g.player.health,100);const x=g.player.x;
 tick(g,.8);assert.ok(g.player.x<x,'suction moves the player gradually toward the mouth');tick(g,1);assert.equal(g.player.health,99);assert.equal(g.player.stunTime,0);
 const hp=g.player.health;tick(g,.3);assert.equal(g.player.health,hp);assert.ok(Math.abs(e.deepNextAttack-10)<1e-7);
});
test('Gulper outside four steps cannot pull or damage the player',()=>{
 const {g,spawn}=fixture(181),e=spawn('gulper',100);g.player.x=850;e.deepNextAttack=0;const x=g.player.x;
 tick(g,2);assert.equal(e.deepCasts,0);assert.equal(g.player.x,x);assert.equal(g.player.health,100);
});
test('ghost shark detects six of the same steps and its one bite has no extra stun or oxygen loss',()=>{
 const {g,MM,spawn}=fixture(184),e=spawn('ghostShark',g.player.x-299);g.update(.01);assert.equal(e.deepDetected,true);
 e.deepDetected=false;e.x=g.player.x-351;g.update(.01);assert.equal(e.deepDetected,false);assert.equal(MM.DeepSeaConfig.ghostShark.detectSteps*MM.DeepSeaConfig.step,300);
 e.x=g.player.x-70;e.y=g.player.y-g.player.h*.5+e.h*.5;e.deepNextAttack=0;const hp=g.player.health,air=g.underwater.oxygen;tick(g,1);
 assert.equal(g.player.health,hp-MM.DeepSeaConfig.ghostShark.damage);assert.equal(g.player.stunTime,0);assert.ok(Math.abs(g.underwater.oxygen-(air-1.5))<1e-6);
});
test('glow bug warns then explodes once and can be shot before the explosion',()=>{
 for(const shoot of [false,true]){const {g,spawn,MM}=fixture(187),e=spawn('glowBug',g.player.x+20);e.y=g.player.y-g.player.h*.5+e.h*.5;g.update(.01);
  assert.equal(e.deepState,'explode-warning');assert.equal(g.player.health,100);assert.equal(MM.DeepSeaConfig.glowBug.killable,true);
  if(shoot)assert.equal(g.dealEnemyDamage(e,1,{kind:'gun'}),true);tick(g,1.1);assert.equal(g.player.health,shoot?100:99);assert.equal(e.dead,true);assert.ok(!g.enemies.includes(e));
  const hp=g.player.health,kills=g.totalKills;tick(g,2);assert.equal(g.player.health,hp);assert.equal(g.totalKills,kills);}
});
test('ancient bite has its independent ten-second clock and one configured mouth damage event',()=>{
 const {g,boss,MM}=fixture(),b=boss(250);b.deepNextBite=10;tick(g,9.99);assert.equal(b.deepBiteCasts,0);
 b.x=250;b.y=g.player.y-g.player.h*.5+b.h*.5;tick(g,.02);assert.equal(b.deepBossState,'bite-warning');assert.equal(b.deepBiteCasts,1);tick(g,1.5);
 assert.equal(g.player.health,100-MM.DeepSeaConfig.boss.basicDamage);assert.equal(g.player.stunTime,0);assert.ok(Math.abs(b.deepNextBite-20)<1e-7);
});
test('echo swarm has a twenty-second clock, three-second sound and exactly two children at one quarter max HP',()=>{
 const {g,boss,MM}=fixture(),b=boss();b.deepNextSwarm=20;g.underwater.oxygen=300;g.underwater.maxOxygen=300;
 tick(g,19.99);assert.equal(b.deepSwarmCasts,0);tick(g,.02);assert.equal(b.deepBossState,'swarm');assert.equal(b.deepSwarmCasts,1);
 tick(g,2.98);assert.equal(g.enemies.filter(e=>e.archetype==='leviathanChild').length,0);assert.ok(g.shake>0);tick(g,.03);
 const children=g.enemies.filter(e=>e.archetype==='leviathanChild');assert.equal(children.length,2);assert.ok(children.every(e=>e.health===b.maxHealth*.25&&e.maxHealth===b.maxHealth*.25&&e.summonOwner===b&&e.minion));
 assert.ok(children.every(e=>e.deepNextSwarm===undefined));assert.equal(MM.DeepSeaConfig.boss.swarmCount,2);
});
test('swarm child capacity stays bounded while each requested wave still creates exactly two',()=>{
 const {g,boss,MM}=fixture(),b=boss();for(let n=0;n<12;n++)MM.Boss190.spawnChildren(g,b,2);
 const children=g.enemies.filter(e=>e.archetype==='leviathanChild');assert.equal(children.length,MM.DeepSeaConfig.boss.childCap);
 assert.ok(children.every(e=>!e.dead&&!e.retired));
});
test('sea lord uses a fifteen-second clock, a non-damaging roar and a single one-HP contact bite',()=>{
 const {g,boss}=fixture(),b=boss(250);b.deepNextLord=15;tick(g,14.99);assert.equal(b.deepLordCasts,0);
 b.x=250;b.y=g.player.y-g.player.h*.5+b.h*.5;tick(g,.02);assert.equal(b.deepBossState,'lord-warning');tick(g,.9);
 assert.equal(g.player.health,100);assert.ok(g.player.stunTime>.98&&g.player.stunTime<=1);tick(g,.8);assert.equal(g.player.health,99);assert.ok(Math.abs(b.deepNextLord-30)<1e-7);
});
test('black hole pulls within half a map, swallows five seconds and releases for three HP once',()=>{
 const {g,boss,MM}=fixture(),b=boss(600);g.player.x=410;b.dir=-1;b.deepNextHole=0;
 tick(g,1.2);assert.equal(b.deepBossState,'swallow');assert.ok(g.player.swallowedTime>4.8);const remaining=g.player.swallowedTime,hp=g.player.health;
 assert.equal(g.player.swallowedBy,b);assert.equal(g.shoot(1),false);const air=g.underwater.oxygen;g.underwater.refillCooldown=0;assert.equal(g.jumpAction(),true);assert.ok(g.underwater.oxygen>air);
 tick(g,remaining-.01);assert.ok(g.player.swallowedTime>0);assert.equal(g.player.health,hp);tick(g,.02);
 assert.equal(g.player.swallowedTime,0);assert.equal(g.player.swallowedBy,null);assert.equal(g.player.health,hp-3);assert.ok(g.player.x>=28&&g.player.x<=932);
 tick(g,.5);assert.equal(g.player.health,hp-3);assert.equal(MM.DeepSeaConfig.boss.blackHoleRange,480);
});
test('a valid active shield blocks black-hole pull, swallowing and its release damage',()=>{
 const {g,boss}=fixture(),b=boss(600);g.player.x=410;g.player.shieldTime=10;g.player.shieldHits=3;b.deepNextHole=0;const x=g.player.x;
 tick(g,4);assert.equal(g.player.swallowedTime||0,0);assert.equal(g.player.health,100);assert.equal(g.player.shieldHits,2);assert.equal(g.player.x,x);assert.equal(b.deepHoleBlocked,true);
});
test('first zero HP heals exactly twenty-five percent once and produces exactly two waves in five seconds',()=>{
 const {g,boss,MM}=fixture(),b=boss();g.dealEnemyDamage(b,999,{kind:'gun'});assert.equal(b.health,b.maxHealth*.25);assert.equal(b.deepRebirthUsed,true);assert.equal(b.deepEnraged,true);assert.equal(g.screen,'playing');
 tick(g,.01);assert.equal(b.deepRebirthWaves,1);tick(g,2.48);assert.equal(b.deepRebirthWaves,1);tick(g,.01);assert.equal(b.deepRebirthWaves,2);
 const children=g.enemies.filter(e=>e.archetype==='leviathanChild');assert.equal(children.length,2*MM.DeepSeaConfig.boss.rebirthWaveCount);
 tick(g,2.5);assert.equal(b.deepEnraged,false);assert.equal(b.deepBossState,'patrol');assert.equal(b.health,b.maxHealth*.25);assert.equal(b.deepFinal,false);
 assert.equal(MM.Boss190.beginRebirth(g,b),false);
});
test('damage during rebirth cannot skip its two waves or run both zero-HP phases concurrently',()=>{
 const {g,boss}=fixture(),b=boss();g.dealEnemyDamage(b,999,{kind:'gun'});g.dealEnemyDamage(b,999,{kind:'gun'});
 assert.equal(b.health,0);assert.equal(b.deepEnraged,true);assert.equal(b.deepFinal,false);assert.equal(b.deepPendingFinal,true);tick(g,4.99);assert.equal(b.deepFinal,false);assert.equal(b.deepRebirthWaves,2);
 tick(g,.01);assert.equal(b.deepEnraged,false);assert.equal(b.deepFinal,true);assert.equal(b.deepFinalTime,5);assert.equal(b.health,0);
});
test('second zero HP starts only one five-second final challenge and shield success wins at its end',()=>{
 const {g,boss,MM}=fixture(),b=boss();primeFinal(g,b);assert.equal(b.deepFinal,true);assert.equal(b.health,0);assert.equal(g.screen,'playing');assert.equal(g.bossDefeated,false);
 assert.equal(g.dealEnemyDamage(b,1,{kind:'gun'}),false);assert.equal(MM.Boss190.beginFinal(g,b),false);tick(g,2.8);g.shieldCount=1;assert.equal(g.shieldAction(),true);tick(g,.21);
 assert.equal(b.deepFinalResolved,true);assert.equal(b.deepFinalBlocked,true);assert.equal(g.screen,'playing');assert.equal(g.player.shieldHits,2);tick(g,1.98);assert.equal(g.screen,'playing');tick(g,.01);
 assert.equal(g.screen,'won');assert.equal(b.deepFinalComplete,true);assert.equal(g.bossDefeated,true);assert.equal(g.enemies.filter(e=>e.archetype==='leviathanChild').length,0);
});
test('failing the final shield challenge loses without inventing any HP damage or allowing Merfolk to bypass it',()=>{
 const {g,boss,MM}=fixture(),b=boss();primeFinal(g,b);g.progression.rewards=[160];assert.equal(MM.MerfolkTransformation.activate(g),true);const hp=g.player.health;
 tick(g,4.99);assert.equal(g.screen,'playing');assert.equal(b.deepFinalBlocked,false);tick(g,.01);assert.equal(g.screen,'lost');assert.equal(g.player.health,hp);assert.equal(g.player.swallowedTime||0,0);
 assert.equal(g.bossDefeated,false);
});
test('Merfolk protects against ordinary deep enemies while boss-owned children retain boss damage',()=>{
 const {g,spawn,boss,MM}=fixture(),b=boss(),e=spawn('ghostShark',g.player.x-50);g.progression.rewards=[160];assert.equal(MM.MerfolkTransformation.activate(g),true);
 e.deepNextAttack=0;e.y=g.player.y-g.player.h*.5+e.h*.5;tick(g,1);assert.equal(g.player.health,100);const child=spawn('leviathanChild',g.player.x-50);child.summonOwner=b;child.deepNextAttack=0;child.y=g.player.y-g.player.h*.5+child.h*.5;g.player.invulnerable=0;
 tick(g,1);assert.ok(g.player.health<100);assert.equal(g.underwater.oxygen,30);
});
test('pause, retry and changing maps clear swallowing, waves and final state without a stuck player',()=>{
 const {g,boss}=fixture(),b=boss(600);g.player.x=410;b.deepNextHole=0;tick(g,1.2);assert.ok(g.player.swallowedTime>0);const remaining=g.player.swallowedTime;
 g.screen='paused';g.update(.05);assert.equal(g.player.swallowedTime,remaining);g.screen='playing';g.finish(false);assert.equal(g.player.swallowedTime,0);assert.equal(g.player.swallowedBy,null);assert.equal(b.deepSwarmTimer,0);
 g.start(190,{retry:true});assert.equal(g.player.swallowedTime||0,0);assert.equal(g.underwater.oxygen,30);g.start(1);assert.equal(g.player.swimming,false);
});
test('Boss200 legacy Leviathan summons are excluded from Boss190 phase handling',()=>{
 const {g,boss,MM}=fixture(),b=boss();b.finalSeaSummon=true;assert.equal(MM.Boss190.owns(b),false);assert.equal(MM.Boss190.hit(g,b,999),undefined);assert.equal(b.deepRebirthUsed,false);
});
