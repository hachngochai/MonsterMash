'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=170){const c=vm.createContext({});for(const n of ['abyss-config','underwater-config','middle-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','game'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c,{filename:n});
 const MM=c.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;g.underwater.oxygenTimer=g.underwater.middleHazardTimer=1e6;g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;
 const spawn=(type,x=700)=>{const e=g.spawn(type);e.phase='active';e.warning=0;e.x=x;return e;};
 const boss=(x=700)=>{const e=spawn('boss',x);e.middleNextShock=e.middleNextSummon=e.middleNextLaser=Infinity;return e;};return {g,MM,spawn,boss};}
function tick(g,seconds,step=.01){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(step,left);g.update(dt);left-=dt;}}
function contact(g,e){g.player.x=e.x;g.player.y=e.y-e.h*.5+g.player.h*.5;g.player.swimAnchorY=g.player.y;g.player.invulnerable=0;}

test('middle sea inherits oxygen, smooth swimming and the exact seahorse attack profile',()=>{
 const {g,MM,spawn}=fixture(167);assert.equal(g.player.swimming,true);g.keys.add('ArrowRight');tick(g,.3);assert.ok(g.player.vx>0&&g.player.vx<=245);g.keys.clear();assert.ok(Math.abs(g.underwater.oxygen-29.7)<1e-6);
 const e=spawn('seahorse',g.player.x-300);e.waterNextAttack=0;tick(g,.82);assert.equal(g.waterShots.length,1);assert.equal(g.waterShots[0].range,480);assert.equal(g.waterShots[0].damage,1);assert.equal(Math.round(Math.hypot(g.waterShots[0].vx,g.waterShots[0].vy)),320);
 assert.equal(MM.UnderwaterConfig.seahorse.cooldown,5);
});
test('baby shark telegraphs a mouth bite and deals one HP once, without stun or bonus oxygen loss',()=>{
 const {g,spawn}=fixture(161),e=spawn('babyShark',g.player.x+65);e.dir=-1;e.middleNextBite=0;const hp=g.player.health;
 g.update(.01);assert.equal(e.middleState,'bite-warning');assert.equal(g.player.health,hp);tick(g,.51);assert.equal(g.player.health,hp-1);assert.equal(g.player.stunTime,0);assert.ok(Math.abs(g.underwater.oxygen-29.48)<1e-5);tick(g,.8);assert.equal(g.player.health,hp-1);assert.ok(e.middleNextBite>2.5);
});
test('ordinary jelly rises, stuns2s without HP or oxygen damage, cannot chain-lock or be killed for loot',()=>{
 const {g,MM,spawn}=fixture(164),e=spawn('electricJellyfish',480);assert.ok(e.y>540);e.y=330;contact(g,e);const hp=g.player.health,oxygen=g.underwater.oxygen;
 g.update(.01);assert.equal(g.player.stunTime,2);assert.equal(g.player.health,hp);assert.ok(Math.abs(g.underwater.oxygen-(oxygen-.01))<1e-6);assert.equal(g.shoot(1),false);assert.equal(g.dealEnemyDamage(e,999,{kind:'scytheWave'}),false);g.killEnemy(e);assert.equal(e.dead,undefined);assert.equal(g.totalKills,0);assert.equal(g.pickups.length,0);
 assert.equal(MM.SkillManager.eligible(e),false);g.progression.rewards=[140];g.progression.equipped='scythe';assert.equal(MM.WeaponManager.swapTarget(g),null);
 tick(g,2.01);assert.equal(g.player.stunTime,0);assert.ok(g.player.stunGrace>.98);assert.equal(e.middleContactUsed,true);const y=e.y;tick(g,.2);assert.ok(e.y<y);assert.equal(g.player.stunTime,0);e.y=.1;g.update(.01);assert.equal(e.retired,true);assert.equal(g.totalKills,0);
});
test('summoned jelly removes one third of current oxygen once; active shield blocks stun and oxygen',()=>{
 for(const shield of [false,true]){const {g,spawn}=fixture(),e=spawn('electricJellyfish',480);e.summonedJelly=true;e.y=330;contact(g,e);g.underwater.oxygen=20;if(shield){g.player.shieldTime=5;g.player.shieldHits=3;}
 g.update(.01);assert.equal(g.player.health,100);assert.ok(Math.abs(g.underwater.oxygen-(shield?19.99:19.99*2/3))<1e-6);assert.equal(g.player.stunTime,shield?0:2);assert.equal(e.middleContactUsed,true);if(shield)assert.equal(g.player.shieldHits,2);
 const oxygen=g.underwater.oxygen;tick(g,.2);assert.ok(Math.abs(g.underwater.oxygen-(oxygen-.2))<1e-6);}
});
test('shock has a10s cast clock and valid contact causes exactly1HP,3s stun and half-current oxygen',()=>{
 const {g,boss}=fixture(),b=boss(g.player.x+20);b.middleNextShock=10;tick(g,9.99);assert.equal(b.middleShockCasts,0);tick(g,.02);assert.equal(b.middleShockCasts,1);
 let hit=false;for(let n=0;n<350;n++){const air=g.underwater.oxygen;g.update(.01);if(g.player.health===99){assert.equal(g.player.stunTime,3);assert.ok(Math.abs(g.underwater.oxygen-(air-.01)*.5)<1e-6);hit=true;break;}}
 assert.equal(hit,true);const health=g.player.health;tick(g,.3);assert.equal(g.player.health,health);g.underwater.refillCooldown=0;assert.equal(g.jumpAction(),true,'oxygen remains available during electrical stun');
 const until=20.02-b.middleClock;tick(g,until);assert.equal(b.middleShockCasts,2);
});
test('shock shield blocks all three effects; missing the electrical zone causes no effects',()=>{
 for(const shield of [false,true]){const {g,boss}=fixture(),b=boss(800);b.middleNextShock=0;if(shield){b.x=g.player.x+20;g.player.shieldTime=5;g.player.shieldHits=3;}else g.player.x=28;
 tick(g,2.5);assert.equal(g.player.health,100);assert.equal(g.player.stunTime,0);assert.ok(Math.abs(g.underwater.oxygen-27.5)<1e-6);if(shield)assert.equal(g.player.shieldHits,2);}
});
test('a shock damage window expires on schedule even while a laser animation occupies the boss',()=>{
 const {g,boss,MM}=fixture(),b=boss(800),c=MM.MiddleSeaConfig.boss;
 const shock={kind:'middle-shock',owner:b,phase:'active',x:800,y:330,w:130,h:125,timer:c.shockLife,total:c.shockLife,hit:false};
 b.middleShockState='active';b.middleShockTimer=c.shockLife;b.middleShockZone=shock;g.waterZones.push(shock);
 b.middleLaserZone={kind:'middle-plasma',owner:b,phase:'warning',x:800,y:180,targetX:800,targetY:180,angle:0,range:480,width:18,timer:1,total:1,hit:false};g.waterZones.push(b.middleLaserZone);
 tick(g,c.shockLife+.03);assert.equal(shock.expired,true);assert.ok(!g.waterZones.includes(shock));assert.equal(g.player.health,100);
});
test('summoning stops previous damaging casts and cannot secretly extend a shock during the summon telegraph',()=>{
 const {g,boss}=fixture(),b=boss(480);const p=g.player;
 const shock={kind:'middle-shock',owner:b,phase:'active',x:p.x,y:p.y+20,w:130,h:125,timer:.45,total:.45,hit:false};
 const laser={kind:'middle-plasma',owner:b,phase:'active',x:p.x-100,y:p.y-p.h*.5,angle:0,range:480,width:18,timer:.6,total:.6,hit:false};
 b.middleShockState='active';b.middleShockTimer=.45;b.middleShockZone=shock;b.middleLaserZone=laser;g.waterZones.push(shock,laser);b.middleNextSummon=0;
 tick(g,.2);assert.equal(b.middleState,'summon-warning');assert.equal(shock.expired,true);assert.equal(laser.expired,true);
 assert.equal(g.player.health,100);assert.equal(g.player.stunTime,0);assert.ok(Math.abs(g.underwater.oxygen-29.8)<1e-6);
});
test('swarm summons exactly5 rising immortal jellyfish per15s with bounded lifetimes',()=>{
 const {g,boss}=fixture(),b=boss();b.middleNextSummon=15;g.player.x=28;tick(g,14.99);assert.equal(g.enemies.filter(e=>e.summonedJelly).length,0);tick(g,1.03);assert.equal(b.middleSummonCasts,1);
 const wave=g.enemies.filter(e=>e.summonedJelly);assert.equal(wave.length,5);assert.equal(new Set(wave.map(e=>e.x)).size,5);assert.ok(wave.every(e=>e.indestructible&&e.y>540));tick(g,15);assert.equal(b.middleSummonCasts,2);assert.ok(g.enemies.filter(e=>e.summonedJelly&&!e.dead).length<=5);
});
test('plasma warns then fires a480px beam for2HP once without stun or oxygen drain',()=>{
 for(const outside of [false,true]){const {g,boss}=fixture(),b=boss(outside?850:700);g.player.x=outside?28:480;b.middleNextLaser=.1;tick(g,.11);const z=g.waterZones.find(z=>z.kind==='middle-plasma');assert.equal(z.phase,'warning');assert.equal(z.range,480);assert.equal(z.width,18);assert.equal(g.player.health,100);tick(g,.8);assert.equal(g.player.health,100);tick(g,.2);assert.equal(g.player.health,outside?100:98);assert.equal(g.player.stunTime,0);tick(g,.6);assert.equal(g.player.health,outside?100:98);assert.equal(g.waterZones.filter(z=>z.kind==='middle-plasma').length,0);assert.ok(Math.abs(g.underwater.oxygen-28.29)<1e-5);}
});
test('plasma collision follows its visible round caps without invisible rectangular corner hits',()=>{
 const {MM}=fixture(),z={x:0,y:0,angle:0,range:100,width:18};
 assert.equal(MM.Boss170.laserTouches({x:113,y:15,w:10,h:10},z),false,'distance sqrt(8²+5²) exceeds the 9px cap');
 assert.equal(MM.Boss170.laserTouches({x:113,y:14,w:10,h:10},z),true,'distance sqrt(8²+4²) is inside the cap');
 assert.equal(MM.Boss170.laserTouches({x:50,y:17,w:10,h:10},z),true);
 assert.equal(MM.Boss170.laserTouches({x:50,y:20,w:10,h:10},z),false);
});
test('illusion triggers once at25%, has independent matching HP, never casts, and swaps with telegraph',()=>{
 const {g,boss}=fixture(),b=boss(750);g.dealEnemyDamage(b,105,{kind:'gun'});const copy=g.enemies.find(e=>e.middleSeaTwin);assert.equal(b.health,35);assert.equal(copy.health,35);assert.equal(copy.w,b.w);assert.equal(copy.h,b.h);
 g.dealEnemyDamage(copy,1,{kind:'gun'});assert.equal(b.health,35);assert.equal(copy.health,34);tick(g,6.02);assert.equal(g.middleSeaEncounter.swapState,'warning');assert.equal(b.middleSwapWarning,true);assert.equal(copy.middleSwapWarning,true);tick(g,.8);
 const from=[b.x,copy.x];tick(g,.65);assert.ok(Math.abs(b.x-from[1])<3);assert.ok(Math.abs(copy.x-from[0])<3);assert.equal(g.enemies.filter(e=>e.middleSeaTwin).length,1);assert.equal(copy.middleShockCasts+copy.middleSummonCasts+copy.middleLaserCasts,0);
});
test('only the real boss must die; defeating the illusion first cannot win or recreate copies',()=>{
 for(const copyFirst of [false,true]){const {g,boss}=fixture(),b=boss();g.levelKills=g.level.target;g.bossSpawned=true;g.dealEnemyDamage(b,105,{kind:'gun'});const copy=g.enemies.find(e=>e.middleSeaTwin);
 if(copyFirst){g.dealEnemyDamage(copy,35,{kind:'gun'});assert.equal(g.screen,'playing');assert.equal(g.bossDefeated,false);}
 g.dealEnemyDamage(b,35,{kind:'gun'});assert.equal(g.screen,'won');assert.equal(g.bossDefeated,true);assert.equal(copy.retired||copy.dead,true);assert.equal(g.middleSeaEncounter,null);assert.equal(g.waterZones.length,0);}
});
test('threshold crossing keeps residual damage on the real boss and a lethal crossing never creates a zero-HP illusion',()=>{
 const first=fixture(),b=first.boss();first.g.dealEnemyDamage(b,120,{kind:'gun'});const copy=first.g.enemies.find(e=>e.middleSeaTwin);
 assert.equal(b.health,20);assert.equal(copy.health,35);assert.equal(copy.maxHealth,35);
 const second=fixture(),real=second.boss();second.g.levelKills=second.g.level.target;second.g.bossSpawned=true;
 let copyInitialHP;
 const originalSpawn=second.g.spawn.bind(second.g);let created;second.g.spawn=(...args)=>{created=originalSpawn(...args);return created;};
 const kill=second.g.killEnemy.bind(second.g);second.g.killEnemy=e=>{copyInitialHP=created?.health;return kill(e);};
 second.g.dealEnemyDamage(real,999,{kind:'gun'});assert.equal(copyInitialHP,35);assert.equal(second.g.screen,'won');assert.equal(created.retired,true);
});
test('an illusion cannot cast even after every attack deadline is due',()=>{
 const {g,boss}=fixture(),b=boss();g.dealEnemyDamage(b,105,{kind:'gun'});const copy=g.enemies.find(e=>e.middleSeaTwin);
 copy.middleNextShock=copy.middleNextSummon=copy.middleNextLaser=0;g.player.x=28;tick(g,16);
 assert.equal(copy.middleShockCasts+copy.middleSummonCasts+copy.middleLaserCasts,0);assert.equal(g.enemies.filter(e=>e.summonedJelly).length,0);
 assert.equal(g.player.health,100);assert.equal(g.enemies.filter(e=>e.middleSeaTwin).length,1);
});
test('immortal obstacles use no killable spawn slots and cannot deadlock completion',()=>{
 const {g,spawn}=fixture(164);g.level.target=2;g.spawnTimer=0;for(let n=0;n<8;n++)spawn('electricJellyfish',70+n*100);g.update(.01);assert.equal(g.regularSpawned,1);
 let fish=g.enemies.find(e=>!e.middleSeaHazard);fish.phase='active';g.dealEnemyDamage(fish,999,{kind:'gun'});g.spawnTimer=0;g.update(.01);assert.equal(g.regularSpawned,2);fish=g.enemies.find(e=>!e.middleSeaHazard&&!e.dead);fish.phase='active';g.dealEnemyDamage(fish,999,{kind:'gun'});assert.equal(g.screen,'won');assert.equal(g.levelKills,2);assert.ok(g.enemies.filter(e=>e.middleSeaHazard).every(e=>e.retired));
});
test('death, retry and exit clear electrical status, summons, laser and encounter state',()=>{
 const {g,boss}=fixture(),b=boss();g.dealEnemyDamage(b,105,{kind:'gun'});g.player.stunTime=3;g.player.electricStunGrace=1;g.waterZones.push({kind:'middle-plasma',owner:b});g.finish(false);assert.equal(g.middleSeaEncounter,null);assert.equal(g.waterZones.length,0);assert.equal(g.player.electricStunGrace,0);
 assert.equal(b.middleShockState,'idle');assert.equal(b.middleIllusionTimer,0);assert.equal(b.middleSwapProgress,0);assert.equal(b.tell,false);
 g.start(170,{retry:true});assert.equal(g.player.stunTime,0);assert.equal(g.underwater.oxygen,30);g.start(1);assert.equal(g.player.swimming,false);assert.equal(g.underwater.active,false);
});
