'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function fresh(rewards=[20,30,40,50,100]) {
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/skill-manager.js'),'utf8'),context);
  let saves=0;
  const g={screen:'playing',level:{id:1},save:{progression:{rewards,lifeKills:0}},
    player:{x:480,y:438,w:38,h:54,health:4,maxHealth:6,grounded:true,vy:0,
      shieldTime:0,shieldHits:0,jumpBuffer:0,coyote:.1,stunTime:0,petrifyTime:0,rollTime:0},
    shieldCount:3,enemies:[],random:()=>0,persist(){saves++;},updateUI(){},
    activateShield(){if(this.player.shieldTime>0||this.shieldCount<=0)return false;
      this.shieldCount--;this.player.shieldTime=5;this.player.shieldHits=3;return true;},
    jump(){this.player.jumpBuffer=.14;}};
  const skills=context.MM.SkillManager;skills.init(g);
  return {g,skills,context,saves:()=>saves};
}
const corpse=(extra={})=>({health:0,dead:true,...extra});
const target=(extra={})=>({health:5,dead:false,phase:'active',x:300,y:438,w:38,h:54,...extra});

test('Immortal Shield double tap spends exactly two charges and lasts exactly 12 active seconds',()=>{
  const {g,skills}=fresh();
  assert.equal(skills.shieldTap(g),true);
  assert.equal(g.shieldCount,2);assert.equal(g.player.shieldTime,5);
  skills.update(g,.2);assert.equal(skills.shieldTap(g),true);
  assert.equal(g.shieldCount,1);assert.equal(g.player.immortalTime,12);
  assert.equal(g.player.shieldTime,0);assert.equal(g.player.shieldHits,0);
  assert.equal(skills.shieldTap(g),false,'an active immortal effect cannot stack');
  assert.equal(g.shieldCount,1);
  skills.update(g,11.99);assert.ok(Math.abs(g.player.immortalTime-.01)<1e-8);
  g.screen='paused';skills.update(g,100);assert.ok(g.player.immortalTime>0);
  g.screen='playing';skills.update(g,.01);assert.equal(g.player.immortalTime,0);
});

test('Immortal Shield requires three charges before the first tap, and late taps stay ordinary',()=>{
  const {g,skills}=fresh();g.shieldCount=2;
  skills.shieldTap(g);skills.update(g,.1);skills.shieldTap(g);
  assert.equal(g.player.immortalTime,0);assert.equal(g.shieldCount,1);
  g.player.shieldTime=0;g.shieldCount=3;skills.update(g,.4);
  skills.shieldTap(g);skills.update(g,.281);skills.shieldTap(g);
  assert.equal(g.player.immortalTime,0);assert.equal(g.shieldCount,2);
});

test('Immortal Shield conversion with a previously active shield still spends exactly two charges',()=>{
  const {g,skills}=fresh();g.player.shieldTime=4;g.player.shieldHits=2;
  assert.equal(skills.shieldTap(g),false);assert.equal(g.shieldCount,3);
  skills.update(g,.1);assert.equal(skills.shieldTap(g),true);
  assert.equal(g.shieldCount,1);assert.equal(g.player.immortalTime,12);
});

test('Darken prepares one held attack every five seconds and enhances only one unit',()=>{
  const {g,skills}=fresh();
  skills.update(g,4.99);assert.equal(skills.consumeDamage(g,1),1);
  skills.update(g,.01);assert.equal(g.skillState.darkReady,true);
  assert.deepEqual([1,1,1].map(d=>skills.consumeDamage(g,d)),[2,1,1]);
  skills.update(g,15);assert.equal(g.skillState.darkReady,true);
  assert.equal(skills.consumeDamage(g,2),4);assert.equal(skills.consumeDamage(g,2),2);
  skills.update(g,.001);assert.equal(g.skillState.darkReady,false,'floating point boundary cannot refill the same charge twice');
});

test('Lifesteal heals one HP after ten distinct kills, including shootable summons and bosses',()=>{
  const {g,skills,saves}=fresh();
  const first=corpse();assert.equal(skills.onKill(g,first),true);
  assert.equal(skills.onKill(g,first),false);assert.equal(g.save.progression.lifeKills,1);
  for(let i=0;i<8;i++)skills.onKill(g,corpse({minion:i===0,boss:i===1}));
  assert.equal(g.player.health,4);assert.equal(g.save.progression.lifeKills,9);
  skills.onKill(g,corpse());assert.equal(g.player.health,5);
  assert.equal(g.save.progression.lifeKills,0);assert.equal(saves(),10);
});

test('Lifesteal excludes retirement, unshootable spiders, and living targets, and never overheals',()=>{
  const {g,skills}=fresh();
  for(const e of [corpse({retired:true}),corpse({bulletUntargetable:true}),corpse({spiderling:true}),target()])assert.equal(skills.onKill(g,e),false);
  assert.equal(g.save.progression.lifeKills,0);
  g.player.health=g.player.maxHealth;g.save.progression.lifeKills=9;
  skills.onKill(g,corpse());assert.equal(g.player.health,g.player.maxHealth);
  assert.equal(g.save.progression.lifeKills,0);
});

test('Lifesteal progress survives combat reset and serialized reload',()=>{
  const {g,skills}=fresh();
  for(let i=0;i<7;i++)skills.onKill(g,corpse());
  skills.reset(g);assert.equal(g.save.progression.lifeKills,7);
  const next=fresh();next.g.save=JSON.parse(JSON.stringify(g.save));next.skills.init(next.g);
  for(let i=0;i<3;i++)next.skills.onKill(next.g,corpse());
  assert.equal(next.g.player.health,5);assert.equal(next.g.save.progression.lifeKills,0);
});

test('Petrify triggers on the eight-second clock, freezes for two seconds, and excludes bosses and dead targets',()=>{
  const {g,skills}=fresh();const enemy=target();
  g.enemies=[target({boss:true}),corpse(),target({phase:'warning'}),target({bulletUntargetable:true}),enemy];
  skills.update(g,7.99);assert.equal(enemy.petrifiedTime,undefined);
  skills.update(g,.01);assert.equal(enemy.petrifiedTime,2);
  assert.equal(g.enemies[0].petrifiedTime,undefined);
  skills.update(g,1.99);assert.ok(Math.abs(enemy.petrifiedTime-.01)<1e-8);
  g.screen='paused';skills.update(g,10);assert.ok(skills.frozen(enemy));
  g.screen='playing';skills.update(g,.01);assert.equal(enemy.petrifiedTime,0);
  skills.update(g,5.99);assert.equal(enemy.petrifiedTime,0);
  skills.update(g,.01);assert.equal(enemy.petrifiedTime,2);
});

test('Map 70 suppresses permanent skill effects without erasing their unlocks or lifesteal progress',()=>{
  const {g,skills}=fresh();g.level.id=70;g.save.progression.lifeKills=6;
  skills.update(g,16);assert.equal(g.skillState.darkReady,false);
  g.enemies=[target()];assert.equal(skills.onKill(g,corpse()),false);
  skills.shieldTap(g);skills.update(g,.1);skills.shieldTap(g);
  assert.equal(g.player.immortalTime,0);assert.equal(g.enemies[0].petrifiedTime,undefined);
  assert.equal(g.save.progression.lifeKills,6);assert.equal(g.save.progression.rewards.length,5);
  g.level.id=71;skills.update(g,5);assert.equal(g.skillState.darkReady,true);
});

test('Double jump upgrades the same launch to 1.8 times apex height and cannot stack',()=>{
  const {g,skills}=fresh();skills.jumpTap(g);
  assert.equal(skills.jumpVelocity(g),-610,'single tap remains the original jump');
  g.player.grounded=false;g.player.y=390;g.player.vy=-400;
  skills.update(g,.1);skills.jumpTap(g);
  const desired=610**2/(2*1420)*1.8;
  assert.ok(Math.abs((438-g.player.y)+g.player.vy**2/(2*1420)-desired)<1e-8);
  const velocity=g.player.vy;skills.jumpTap(g);assert.equal(g.player.vy,velocity);
  skills.update(g,.1);skills.jumpTap(g);assert.equal(g.player.vy,velocity);
});

test('Two jump taps before the next frame upgrade its impulse without granting an airborne jump',()=>{
  const {g,skills}=fresh();skills.jumpTap(g);skills.jumpTap(g);
  assert.ok(Math.abs(skills.jumpVelocity(g)+610*Math.sqrt(1.8))<1e-8);
  assert.equal(skills.jumpVelocity(g),-610,'the impulse is consumed once');
  skills.reset(g);g.player.grounded=false;g.player.coyote=0;g.player.vy=200;
  skills.jumpTap(g);skills.update(g,.1);skills.jumpTap(g);assert.equal(g.player.vy,200);
});

function specializedFixture() {
  const context=vm.createContext({});
  for(const file of ['abyss-config.js','underwater-config.js','campaign.js','bosses.js','golem.js','wolves.js','kong.js','dragons.js','mythic.js','game.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context,{filename:file});
  const g=new context.MM.Game({headless:true,storage:{getItem(){return null;},setItem(){}},random:()=>.5});
  g.start(95);g.spawnTimer=g.ammoTimer=10000;g.player.health=g.player.maxHealth=100;
  return {g,MM:context.MM};
}
for(const [type,module,clock] of [
  ['golem','GolemCombat','golemActiveTime'],['werewolf','WolfCombat','wolfActiveTime'],
  ['miniKingKong','KongCombat','kongClock'],['fireDragon','DragonCombat','dragonClock'],
  ['lionMan','MythicCombat','mythicClock'],['medusa','MythicCombat','mythicClock'],['goatman','MythicCombat','mythicClock']]) {
  test(`Petrified ${type} cannot move, advance its skill clock, or start attacks`,()=>{
    const {g,MM}=specializedFixture(),e=g.spawn(type,-1);
    Object.assign(e,{phase:'active',x:200,petrifiedTime:2});
    const before={x:e.x,y:e.y,clock:e[clock],shots:g.enemyShots.length+g.dragonShots.length+g.mythicShots.length};
    for(let i=0;i<20;i++)MM[module].update(g,.05);
    assert.equal(e.x,before.x);assert.equal(e.y,before.y);assert.equal(e[clock],before.clock);
    assert.equal(g.enemyShots.length+g.dragonShots.length+g.mythicShots.length,before.shots);
  });
}

test('Petrification pauses a dragon warning while released projectiles continue to fly',()=>{
  const {g,MM}=specializedFixture(),e=g.spawn('fireDragon',-1);
  Object.assign(e,{phase:'active',petrifiedTime:2});
  const z={owner:e,kind:'fire',phase:'warning',timer:.2,total:.2,x:800,y:438,w:100,h:438};
  g.dragonZones.push(z);
  const s={owner:e,kind:'sonic',x:10,y:10,vx:100,vy:0,w:10,h:10,life:1,spec:{damage:1}};
  g.dragonShots.push(s);MM.DragonCombat.update(g,.05);
  assert.equal(z.timer,.2);assert.equal(z.phase,'warning');assert.equal(s.x,15);
});

test('Immediate Dracula damage hook creates the second body before a lethal multishot death is resolved',()=>{
  const {g,MM}=specializedFixture();g.start(50);
  const original=g.spawn('boss',-1);Object.assign(original,{phase:'active',health:0});
  MM.BossCombat.afterDamage(g,original);
  const clone=g.enemies.find(e=>e.draculaClone);
  assert.ok(clone);assert.equal(original.splitTriggered,true);assert.ok(clone.health>0);
  MM.BossCombat.afterDamage(g,original);assert.equal(g.enemies.filter(e=>e.draculaClone).length,1);
  g.killEnemy(original);assert.equal(g.bossDefeated,false);assert.ok(g.enemies.includes(clone));
});
