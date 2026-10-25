const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const modules=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','merfolk','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','island-combat','resurrection-rewards','island-renderer','chapter-transition','game'];
function fixture(rewards=[200,210,220,230,240]){
 const scope=vm.createContext({});for(const name of modules)vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name});
 const MM=scope.MM,g=new MM.Game({headless:true,random:()=>.5,storage:{getItem:()=>null,setItem(){}}});
 g.start(201);g.progression.rewards=rewards.slice();g.spawnTimer=999;g.enemies=[];g.player.x=200;g.player.invulnerable=0;
 return {MM,g};
}
function target(g,x=500,extra={}){
 const e={type:'skeleton',archetype:'skeleton',x,y:438,w:38,h:68,health:2000,maxHealth:2000,phase:'active',damage:0,dir:-1,dead:false,...extra};g.enemies.push(e);return e;
}
function advance(MM,g,time){for(let left=time;left>1e-8;){const dt=Math.min(.01,left);MM.ResurrectionRewards.update(g,dt);left-=dt;}}
function form(MM,g,id){g.progression.equipped='easterEgg';g.resurrection.form=id;g.resurrection.formRemaining=20;g.resurrection.auraNext=g.resurrection.clock+1;g.player.shotTimer=0;}

test('a Dream Book clone carrying a melee weapon closes to its actual attack range',()=>{
 const {MM,g}=fixture([60,240]);const e=target(g,700);g.progression.equipped='dreamBook';
 assert.equal(MM.WeaponManager.fire(g,1),true);g.resurrection.clone.weapon='club';g.resurrection.clone.x=150;
 const ammo=g.player.ammo;advance(MM,g,5.5);
 assert.ok(e.health<2000,'the clone reaches the enemy and uses the club rather than waiting280px away');
 assert.equal(g.player.ammo,ammo,'a clone never spends the real player ammunition');
});

test('an ally whose HP is depleted cannot deliver a final attack before cleanup',()=>{
 const {MM,g}=fixture();assert.equal(MM.ResurrectionRewards.activate(g),true);const a=g.resurrection.moai,e=target(g,a.x+35);
 a.health=0;a.attackNext=0;MM.ResurrectionRewards.update(g,.01);
 assert.equal(e.health,2000,'zero-HP Moai does not attack while being retired');assert.equal(g.resurrection.moai,null);
 g.progression.equipped='dreamBook';g.player.shotTimer=0;assert.equal(MM.WeaponManager.fire(g,1),true);
 g.resurrection.clone.health=0;g.resurrection.clone.attackNext=0;g.resurrection.clone.x=e.x-30;
 const projectiles=g.resurrection.projectiles.length;MM.ResurrectionRewards.update(g,.01);
 assert.equal(g.resurrection.projectiles.length,projectiles,'zero-HP clone cannot fire');assert.equal(g.resurrection.clone,null);
});

test('Moai close combat respects vertical reach and cannot punch an airborne target from the ground',()=>{
 const {MM,g}=fixture();const e=target(g,260,{y:160,h:50,airborne:true});form(MM,g,'moai');MM.ResurrectionRewards.update(g,.01);
 assert.equal(MM.WeaponManager.fire(g,1),true);advance(MM,g,.15);
 assert.equal(e.health,2000,'neither the grounded fist nor ground crack reaches the high target');
});

test('resurrection projectiles apply authored damage and Egg Gun has a bounded five-step blast',()=>{
 const {MM,g}=fixture();const e=target(g,500),near=target(g,650),outside=target(g,740);
 form(MM,g,'eggGun');assert.equal(MM.WeaponManager.fire(g,1),true);advance(MM,g,.65);
 assert.equal(e.health,1995);assert.equal(near.health,1995);assert.equal(outside.health,2000);
 g.enemies=[];g.resurrection.projectiles=[];const glove=target(g,400);form(MM,g,'glove');MM.WeaponManager.fire(g,1);advance(MM,g,.4);assert.equal(glove.health,1997);
 g.enemies=[];g.resurrection.projectiles=[];const burned=target(g,280);form(MM,g,'fire');MM.WeaponManager.fire(g,1);advance(MM,g,.3);assert.equal(burned.health,1992,'a fireball causes eight HP');advance(MM,g,.71);assert.equal(burned.health,1991,'the aura causes one HP per active second');
});

test('Moai punch and ground crack retain separate damage, and Light deals9 only once to a boss per dash',()=>{
 const {MM,g}=fixture();const e=target(g,265);form(MM,g,'moai');MM.ResurrectionRewards.update(g,.01);MM.WeaponManager.fire(g,1);advance(MM,g,.1);assert.equal(e.health,1985,'close punch10 plus one ground crack5');
 g.enemies=[];g.resurrection.projectiles=[];g.player.x=60;const normal=target(g,300),boss=target(g,600,{boss:true,archetype:'auditBoss'});form(MM,g,'light');
 assert.equal(MM.ResurrectionRewards.directionTap(g,1),true);advance(MM,g,.4);assert.equal(normal.health,1001);assert.equal(boss.health,1991);assert.equal(g.player.x,934);
 advance(MM,g,.5);assert.equal(boss.health,1991,'finishing the dash never repeats its hit');
});

test('completed boss220 migrates to permanent five-shield capacity without serializing temporary rewards',()=>{
 const {MM,g}=fixture([]);const clean=MM.SaveManager.normalize({version:1,rewards:[],equipped:'easterEgg',resurrection:{form:'light',armorRemaining:99}},[200,210,220,230,240,250]);
 assert.deepEqual(Array.from(clean.rewards),[200,210,220,230,240]);assert.equal(clean.equipped,'easterEgg');assert.equal(Object.hasOwn(clean,'resurrection'),false);
 g.progression=clean;assert.equal(g.maxShields(),5);assert.equal(MM.SaveManager.unlocked(g,200),true);assert.equal(MM.SaveManager.unlocked(g,250),false);
 g.start(70);g.progression=clean;assert.equal(MM.ResurrectionRewards.shieldCap(g),3,'the existing map70 reward suppression remains in force');
});
