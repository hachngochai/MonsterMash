'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=1,{rewards=[170],ammo=50}={}){
 const c=vm.createContext({});
 for(const n of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','game'])
  vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c,{filename:n});
 const data={version:2,campaignSize:180,completed:[],progression:{version:1,rewards,equipped:'lightningOrb',lifeKills:0}};
 const MM=c.MM,g=new MM.Game({headless:true,storage:{getItem:()=>JSON.stringify(data),setItem(){}},random:()=>.5});
 g.start(level);g.settings.effects=false;g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;g.player.invulnerable=0;g.player.health=g.player.maxHealth=100;g.player.ammo=ammo;
 if(g.underwater)g.underwater.oxygenTimer=g.underwater.middleHazardTimer=g.underwater.predatorHazardTimer=1e6;
 const spawn=(type='skeleton',x=600,hp=30)=>{const e=g.spawn(type,1);Object.assign(e,{x,y:g.player.y+(e.h-g.player.h)*.5,health:hp,maxHealth:hp,phase:'active',warning:0});return e;};
 return {g,MM,spawn};
}
const near=(n,expected)=>assert.ok(Math.abs(n-expected)<1e-7,`${n} should equal ${expected}`);

test('orb unlocks only after170 and joins quick selection; map70 still suppresses it',()=>{
 const {g,MM}=fixture();assert.ok(MM.WeaponManager.available(g).includes('lightningOrb'));
 assert.equal(MM.WeaponManager.profile(g).channel,true);assert.equal(MM.WeaponManager.current(g),'lightningOrb');
 MM.WeaponManager.select(g,'gun');assert.equal(MM.WeaponManager.cycle(g),true);assert.equal(MM.WeaponManager.current(g),'lightningOrb');
 g.progression.rewards=[];assert.equal(MM.WeaponManager.select(g,'lightningOrb'),false);
 const suppressed=fixture(70);assert.equal(suppressed.MM.WeaponManager.current(suppressed.g),'gun');assert.equal(suppressed.MM.LightningOrbWeapon.fire(suppressed.g,1),false);
});
test('channel chooses the nearest five unique living targets in its forward range',()=>{
 const {g,MM,spawn}=fixture(),front=Array.from({length:7},(_,i)=>spawn('skeleton',550+i*27));
 const behind=spawn('skeleton',300),far=spawn('skeleton',950),dead=spawn('skeleton',540);dead.dead=true;
 const entering=spawn('skeleton',530);entering.phase='warning';const immortal=spawn('skeleton',535);immortal.indestructible=true;
 g.enemies.push(front[0]);MM.LightningOrbWeapon.fire(g,1);
 assert.deepEqual(front.map(e=>e.health),[29,29,29,29,29,30,30]);assert.equal(g.player.ammo,45);
 assert.equal(behind.health,30);assert.equal(far.health,30);assert.equal(entering.health,30);assert.equal(immortal.health,30);
 assert.equal(g.lightningOrb.targets.length,5);
});
test('a held channel pulses every0.35s and release or picker immediately removes its rays',()=>{
 const {g,MM,spawn}=fixture(),e=spawn();MM.LightningOrbWeapon.fire(g,1);assert.equal(e.health,29);
 MM.LightningOrbWeapon.update(g,.34,1);assert.equal(e.health,29);MM.LightningOrbWeapon.update(g,.01,1);assert.equal(e.health,28);
 MM.LightningOrbWeapon.update(g,.1,0);assert.equal(g.lightningOrb.active,false);assert.equal(g.lightningOrb.targets.length,0);assert.equal(g.lightningOrb.origin,null);
 g.player.shotTimer=0;MM.LightningOrbWeapon.update(g,.25,1);assert.equal(e.health,27);g.weaponPicker={open:true};const cooldown=g.lightningOrb.cooldown;
 MM.LightningOrbWeapon.update(g,10,1);assert.equal(e.health,27);assert.equal(g.lightningOrb.active,false);assert.equal(g.lightningOrb.cooldown,cooldown);
});
test('fractional ammo limits actual HP removed and never produces damage past the paid budget',()=>{
 const {g,MM,spawn}=fixture(1,{ammo:.75}),first=spawn('skeleton',550),second=spawn('skeleton',600);
 MM.LightningOrbWeapon.fire(g,1);near(first.health,29.25);assert.equal(second.health,30);near(g.player.ammo,0);assert.equal(g.lightningOrb.active,false);
});
test('overkill pays only remaining HP then gives the rest of the ammo budget to the next ray',()=>{
 const {g,MM,spawn}=fixture(1,{ammo:1}),first=spawn('skeleton',550,.25),second=spawn('skeleton',600,10);
 MM.LightningOrbWeapon.fire(g,1);assert.equal(first.dead,true);near(second.health,9.25);near(g.player.ammo,0);assert.equal(g.totalKills,1);
});
test('Darken doubles exactly one successful ray and does not consume itself on a blocked first target',()=>{
 const {g,MM,spawn}=fixture(1,{rewards:[40,170]}),block=spawn('greenZombie',540),first=spawn('skeleton',590),second=spawn('skeleton',650);
 block.bulletArmor=true;block.hardenedTime=1;g.skillState.darkReady=true;
 MM.LightningOrbWeapon.fire(g,1);assert.equal(block.health,30);assert.equal(first.health,28);assert.equal(second.health,29);assert.equal(g.player.ammo,47);assert.equal(g.skillState.darkReady,false);
});
test('all blocked rays cost no ammo and preserve a prepared Darken charge',()=>{
 const {g,MM,spawn}=fixture(1,{rewards:[40,170]}),e=spawn('greenZombie');e.bulletArmor=true;e.hardenedTime=2;g.skillState.darkReady=true;
 MM.LightningOrbWeapon.fire(g,1);assert.equal(e.health,30);assert.equal(g.player.ammo,50);assert.equal(g.skillState.darkReady,true);assert.equal(g.lightningOrb.targets.length,0);
});
test('turtle armor costs exactly0.5ammo for0.5HP, while reflection costs none',()=>{
 const {g,MM,spawn}=fixture(130),e=spawn('boss',650,140);e.invisible=false;e.mirrorShield=false;
 MM.LightningOrbWeapon.fire(g,1);near(e.health,139.5);near(g.player.ammo,49.5);
 e.mirrorShield=true;g.lightningOrb.cooldown=0;MM.LightningOrbWeapon.fire(g,1);near(e.health,139.5);near(g.player.ammo,49.5);assert.equal(g.abyssShots.length,1);
});
test('fractional last ammo also remains exact through turtle armor',()=>{
 const {g,MM,spawn}=fixture(130,{ammo:.2}),e=spawn('boss',650,140);e.invisible=false;e.mirrorShield=false;
 MM.LightningOrbWeapon.fire(g,1);near(e.health,139.8);near(g.player.ammo,0);
});
test('phase refills on the wolf, Kong and Chimera still pay the damage before the refill',()=>{
 for(const level of [70,80,100]){
  const {g,MM,spawn}=fixture(level),e=spawn('boss',650,20);e.health=11;
  // Map70 intentionally suppresses reward equipment; its receipt route can
  // still be checked directly, without granting the orb inside that map.
  const receipt={damage:0};assert.equal(g.dealEnemyDamage(e,2,{kind:'lightningOrb',weaponId:'lightningOrb',damageBudget:2,damageReceipt:receipt}),true);
  near(receipt.damage,2);assert.equal(e.health,20);
 }
});
test('Abyss phase refills and bird-to-knight transition record pre-refill HP loss',()=>{
 for(const [level,hp] of [[140,.5],[150,80.5]]){
  const {g,MM,spawn}=fixture(level),e=spawn('boss',650,160);e.abyssGuarded=e.intangible=false;e.health=hp;
  MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,level===140?49.5:49);
  if(level===140){assert.equal(e.abyssForm,'knight');assert.ok(e.health>1);}else{assert.equal(e.abyssPhase,2);assert.equal(e.health,160);}
 }
});
test('deity Rage projection charges the shared owner HP, never its dummy1HP',()=>{
 const {g,MM,spawn}=fixture(150),owner=spawn('boss',800,160);owner.abyssPhase=2;owner.abyssGuarded=false;owner.bulletUntargetable=true;
 const projection=spawn('boss',600,1);Object.assign(projection,{boss:false,emotionProjection:true,projectionOwner:owner,emotion:'rage',abyssGuarded:false,bulletUntargetable:false});
 MM.LightningOrbWeapon.fire(g,1);assert.equal(owner.health,159);assert.equal(projection.health,1);assert.equal(g.player.ammo,49);
});
test('boss160 split and170 illusion retain exact fractional receipts with independent clones',()=>{
 for(const level of [160,170]){
  const {g,MM,spawn}=fixture(level,{ammo:.5}),e=spawn('boss',650,120);e.health=level===160?60.25:30.25;
  MM.LightningOrbWeapon.fire(g,1);near(e.health,level===160?59.75:29.75);near(g.player.ammo,0);
  const copy=g.enemies.find(other=>other!==e&&other.boss);assert.ok(copy);assert.ok(copy.health>0);
 }
});
test('dead targets vanish from channel rays and switching, stun, suffocation and pause stop the channel',()=>{
 for(const condition of ['switch','stun','suffocation','pause']){
  const {g,MM,spawn}=fixture(condition==='suffocation'?171:1),e=spawn();MM.LightningOrbWeapon.fire(g,1);assert.equal(g.lightningOrb.active,true);
  if(condition==='switch')MM.WeaponManager.select(g,'gun');
  if(condition==='stun')g.player.stunTime=1;
  if(condition==='suffocation')g.underwater.oxygen=0;
  if(condition==='pause')g.screen='paused';
  MM.LightningOrbWeapon.update(g,.35,1);assert.equal(g.lightningOrb.active,false);assert.equal(g.lightningOrb.targets.length,0);assert.equal(e.health,29);
 }
 const {g,MM,spawn}=fixture(),e=spawn();MM.LightningOrbWeapon.fire(g,1);e.dead=true;MM.LightningOrbWeapon.update(g,.01,1);assert.equal(g.lightningOrb.targets.length,0);
});
test('Mega London rage and hidden mode cannot drain ammo or receive additional damage',()=>{
 const {g,MM,spawn}=fixture(180),e=spawn('boss',650,160);e.health=.25;MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,49.75);assert.equal(e.predatorRage,true);
 g.lightningOrb.cooldown=0;MM.LightningOrbWeapon.fire(g,1);near(g.player.ammo,49.75);assert.equal(e.health,0);
});
test('real keyboard hold sustains the orb and key release clears it on the next frame',()=>{
 const {g,spawn}=fixture(),e=spawn();e.petrifiedTime=1000;
 g.keyDown({code:'KeyL',repeat:false,preventDefault(){}});
 for(let i=0;i<50;i++)g.update(.01);
 assert.equal(e.health,28);assert.equal(g.player.ammo,48);assert.equal(g.lightningOrb.active,true);
 g.keyUp({code:'KeyL'});g.update(.01);assert.equal(g.lightningOrb.active,false);assert.equal(g.lightningOrb.targets.length,0);
 for(let i=0;i<50;i++)g.update(.01);assert.equal(e.health,28);
});
test('fractional damage bypasses legacy integer rounding only for receipt-based attacks',()=>{
 for(const level of [80,90,100]){
  const {g,MM,spawn}=fixture(level,{ammo:.2}),e=spawn('boss',650,100);e.health=75;
  if(level===90){e.yinYangTriggered=true;e.dragonGuarded=false;}
  MM.LightningOrbWeapon.fire(g,1);near(e.health,74.8);near(g.player.ammo,0);
 }
});
