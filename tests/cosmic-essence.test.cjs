'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const modules=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','cosmic-config','cosmic-balance','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','merfolk','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','island-combat','resurrection-rewards','cosmic-combat','cosmic-rewards','ufo-transition','story','game'];
function fixture(id=251){let value=null;const scope=vm.createContext({});for(const name of modules)vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name});const MM=scope.MM,g=new MM.Game({headless:true,random:()=>.5,storage:{getItem:()=>value,setItem(k,v){value=v;}}});g.start(id);g.spawnTimer=999;g.progression.rewards=Array.from(MM.SaveManager.milestones);g.player.invulnerable=0;return {MM,g};}
function target(g,type=g.level.types[0],extra={}){const e=g.spawn(type,1);Object.assign(e,{phase:'active',warning:0,x:500,y:438,health:10000,maxHealth:10000,cosmicNext:999,...extra});return e;}
function advance(MM,g,duration,step=.02){let remaining=duration;while(remaining>1e-8){const dt=Math.min(step,remaining);MM.CosmicRewards.update(g,dt);remaining-=dt;}}
const event=(code,repeat=false)=>({code,repeat,preventDefault(){}});

test('Moon and Sun replace the visible weapon profile without imposing a stance selection cooldown',()=>{
  const {MM,g}=fixture();MM.WeaponManager.select(g,'spear');
  assert.equal(MM.CosmicRewards.activate(g,'moon'),true);assert.equal(MM.WeaponManager.profile(g).kind,'cosmicPalm');
  assert.equal(MM.WeaponManager.profile(g).equipped,'moon');assert.equal(MM.WeaponManager.profile(g).damage,6);
  assert.equal(MM.CosmicRewards.activate(g,'sun'),true);assert.equal(MM.CosmicRewards.activate(g,'moon'),true);
  assert.equal(g.cosmicRewards.cooldowns.moon,0);assert.equal(g.cosmicRewards.cooldowns.sun,0);
  assert.equal(g.progression.equipped,'spear');MM.WeaponManager.select(g,'gun');
  assert.equal(g.cosmicRewards.stance,null);assert.equal(MM.WeaponManager.profile(g).equipped,'gun');
});

test('Neptune alternates one pull and one push every two seconds for fifteen seconds; CC immunity survives',()=>{
  const {MM,g}=fixture();g.player.x=200;const ordinary=target(g,undefined,{x:600}),immune=target(g,'singularityVoidEater',{x:650});
  assert.equal(immune.ccImmune,true);MM.CosmicRewards.activate(g,'neptune');advance(MM,g,.1);
  assert.equal(ordinary.health,9998);assert.equal(immune.health,9998);assert.ok(ordinary.x<600);assert.equal(immune.x,650);
  assert.equal(ordinary.cosmicFrozen,.5);assert.ok(!immune.cosmicFrozen);
  advance(MM,g,1.9);assert.equal(ordinary.health,9998,'no repeated pull damage during the same phase');
  advance(MM,g,.02);assert.equal(ordinary.health,8999,'the first push deals exactly999');
  advance(MM,g,12.98);assert.equal(ordinary.health,5996);assert.equal(immune.health,5996);
  assert.equal(g.cosmicRewards.effects.length,0);advance(MM,g,3);assert.equal(ordinary.health,5996);
});

test('guardian knights intercept a swept hostile projectile once and can each be destroyed after twenty damage',()=>{
  const {MM,g}=fixture();g.player.x=300;MM.CosmicRewards.activate(g,'uranus');const [left,right]=g.cosmicRewards.knights;
  const owner=target(g,undefined,{x:750});const shot=MM.CosmicCombat.projectile(g,owner,'bullet',{x:440,y:400,vx:-1000,vy:0,damage:3});
  MM.CosmicCombat.update(g,.1);assert.equal(right.health,17);assert.equal(left.health,20);assert.equal(shot.life,0);assert.equal(g.player.health,5);
  MM.CosmicCombat.update(g,.1);assert.equal(right.health,17,'a consumed shot cannot hit again');
  MM.CosmicRewards.damageKnight(g,{x:right.x,y:438,w:40,h:100,damage:17});MM.CosmicRewards.update(g,.01);
  assert.equal(g.cosmicRewards.knights.length,1);assert.equal(g.cosmicRewards.knights[0],left);
  MM.CosmicRewards.damageKnight(g,{x:left.x,y:438,w:40,h:100,damage:20});MM.CosmicRewards.update(g,.01);
  assert.equal(g.cosmicRewards.knights.length,0);
});

test('persistent hazards damage guardians once per hazard tick rather than once per rendered frame',()=>{
  const {MM,g}=fixture();g.player.x=100;MM.CosmicRewards.activate(g,'uranus');const knight=g.cosmicRewards.knights[1];
  MM.CosmicCombat.hazard(g,null,'test-puddle',knight.x,438,20,100,{warning:0,life:3,damage:2,tick:1});
  MM.CosmicCombat.update(g,.05);assert.equal(knight.health,18);
  for(let i=0;i<18;i++)MM.CosmicCombat.update(g,.05);assert.equal(knight.health,18);
  MM.CosmicCombat.update(g,.1);assert.equal(knight.health,16);
});

test('virtual armor protects legacy contact damage and modern effects while ordinary shields and immortality retain priority',()=>{
  const {MM,g}=fixture();g.cosmicRewards.virtualArmor=1.5;g.hurt({x:600,damage:2});
  assert.equal(g.player.health,4.5);assert.equal(g.cosmicRewards.virtualArmor,0);
  g.cosmicRewards.virtualArmor=4;g.player.invulnerable=0;g.player.immortalTime=12;g.hurt({x:600,damage:2});
  assert.equal(g.player.health,4.5);assert.equal(g.cosmicRewards.virtualArmor,4);
  g.player.immortalTime=0;g.player.invulnerable=0;g.player.shieldTime=5;g.player.shieldHits=1;
  g.applyCombatEffect({damage:2,forceHit:true});assert.equal(g.player.shieldHits,0);assert.equal(g.cosmicRewards.virtualArmor,4);
  g.applyCombatEffect({damage:2,forceHit:true});assert.equal(g.player.health,4.5);assert.equal(g.cosmicRewards.virtualArmor,2);
});

test('Sun burns for exactly two one-second ticks and Moon freeze only procs below the twenty-five percent threshold',()=>{
  for(const roll of [.24999,.25]){const {MM,g}=fixture();g.player.x=200;g.random=()=>roll;const e=target(g);MM.CosmicRewards.activate(g,'moon');
    assert.equal(MM.CosmicRewards.fire(g,1),true);advance(MM,g,.5);assert.equal(e.health,9994);assert.equal(!!e.cosmicFrozen,roll<.25);}
  const {MM,g}=fixture();g.player.x=200;const e=target(g);MM.CosmicRewards.activate(g,'sun');MM.CosmicRewards.fire(g,1);advance(MM,g,.5);
  assert.equal(e.health,9994);advance(MM,g,2);assert.equal(e.health,9988);advance(MM,g,5);assert.equal(e.health,9988);
});

test('blocked boss hits produce no Moon freeze or Sun burn and preserve the existing immunity gate',()=>{
  for(const stance of ['moon','sun']){const {MM,g}=fixture(260);g.player.x=200;g.random=()=>0;const boss=target(g,'boss',{x:500,ward:10});
    MM.CosmicRewards.activate(g,stance);MM.CosmicRewards.fire(g,1);advance(MM,g,.5);
    assert.equal(boss.health,10000);assert.ok(!boss.cosmicFrozen);assert.equal(g.cosmicRewards.burns.size,0);}
});

test('essence hotkeys have independent costs and timers, ignore held repeats and pause in the weapon picker',()=>{
  const {MM,g}=fixture();g.player.ammo=100;g.keyDown(event('Digit1'));assert.equal(g.player.ammo,80);
  g.keyDown(event('Digit1',true));assert.equal(g.player.ammo,80);g.keyDown(event('Digit3'));assert.equal(g.player.ammo,60);
  assert.deepEqual(Array.from(g.cosmicRewards.effects,e=>e.id),['mercury','mars']);
  advance(MM,g,1);const water=g.cosmicRewards.cooldowns.mercury;g.keyDown(event('Digit5'));
  assert.equal(g.player.ammo,60);assert.equal(g.cosmicRewards.cooldowns.mercury,water);assert.equal(g.cosmicRewards.projectiles.length,3);
  g.weaponPicker.open=true;advance(MM,g,20);assert.equal(g.cosmicRewards.cooldowns.mercury,water);
  assert.equal(MM.CosmicRewards.keyDown(g,event('Digit0')),false);g.weaponPicker.open=false;
  assert.equal(MM.CosmicRewards.keyDown(g,event('Digit0')),true);assert.ok(g.cosmicRewards.effects.some(e=>e.id==='blackHole'));
});

test('locked essence hotkeys and the whole-map70 suppression cannot grant temporary effects',()=>{
  const {MM,g}=fixture();g.progression.rewards=[];g.player.ammo=100;
  for(const code of ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'])g.keyDown(event(code));
  assert.equal(g.player.ammo,100);assert.equal(g.cosmicRewards.effects.length,0);assert.equal(g.cosmicRewards.projectiles.length,0);assert.equal(g.cosmicRewards.stance,null);
  g.progression.rewards=Array.from(MM.SaveManager.milestones);g.start(70);g.keyDown(event('Digit8'));g.keyDown(event('Digit0'));
  assert.equal(g.cosmicRewards.stance,null);assert.equal(g.cosmicRewards.effects.length,0);
});
