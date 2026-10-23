'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function fixture(level=200){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5,testMode:true});
 g.start(level);g.settings.effects=false;g.level.target=999;g.spawnTimer=g.ammoTimer=1e6;
 g.player.health=g.player.maxHealth=100;g.player.ammo=1000;g.player.invulnerable=100;
 const boss=g.spawn('boss',1);Object.assign(boss,{phase:'active',warning:0,x:650,health:10000,maxHealth:10000});
 return {g,MM,boss,scope};
}
const shot=(kind='gun',extra={})=>({kind,weaponId:kind,dir:1,...extra});
function hits(g,e,count=1,damage=1,kind='gun'){
 for(let i=0;i<count;i++)assert.equal(g.dealEnemyDamage(e,damage,shot(kind)),true);
}

test('ten successful ranged hits grant one shield on every campaign boss including all ocean bosses',()=>{
 for(const level of [10,20,30,40,50,60,70,80,90,110,120,130,140,150,160,170,180,190,200]){
  const {g,boss}=fixture(level);hits(g,boss,9);
  assert.equal(g.shieldCount,0,'not before ten at '+level);assert.equal(g.bossShieldProgress().count,9,'visible counter at '+level);
  hits(g,boss);assert.equal(g.shieldCount,1,'tenth shot at '+level);assert.equal(g.bossShieldProgress().count,0);
 }
});

test('spread projectiles, sniper and ranged scythe waves count attack units rather than their damage',()=>{
 const {g,boss}=fixture(200);
 for(const kind of ['normal','highAim','sniper','gun','bones','bones','bow','bow','spear','scytheWave'])hits(g,boss,1,5,kind);
 assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);assert.equal(boss.health,9950);
 for(const attack of [shot('club',{melee:true}),shot('spear',{melee:true}),shot('axes',{melee:true}),shot('rollSlash',{melee:true,rollSlash:true}),shot('gun',{reflected:true}),shot('gun',{reflection:true}),{}])
  g.dealEnemyDamage(boss,1,attack);
 assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
});

test('one projectile touching multiple bosses receives only one generic hit credit',()=>{
 const {g,boss}=fixture(160),other=g.spawn('boss',-1);Object.assign(other,{phase:'active',health:10000,maxHealth:10000,waterTwin:true});
 const shared=shot('bow');assert.equal(g.dealEnemyDamage(boss,1,shared),true);assert.equal(g.dealEnemyDamage(other,1,shared),true);
 assert.equal(g.abyssBossHits,1);assert.equal(g.dealEnemyDamage(boss,1,shared),true);assert.equal(g.abyssBossHits,1);
 hits(g,other,9);assert.equal(g.shieldCount,1);
});

test('immune, invisible, warning and ordinary targets never charge boss shields',()=>{
 for(const [level,flag] of [[20,'hardenedTime'],[70,'howling'],[130,'mirrorShield'],[180,'intangible'],[190,'indestructible']]){
  const {g,boss}=fixture(level),before=boss.health;
  if(flag==='indestructible'){boss.deepFinal=true;boss.health=0;}else boss[flag]=flag==='hardenedTime'?1:true;
  for(let i=0;i<10;i++)assert.equal(g.dealEnemyDamage(boss,1,shot()),false,'immunity at '+level);
  assert.equal(g.abyssBossHits,0);assert.equal(g.shieldCount,0);if(flag!=='indestructible')assert.equal(boss.health,before);
 }
 const {g,boss}=fixture();boss.phase='warning';assert.equal(g.dealEnemyDamage(boss,1,shot()),false);
 const regular=g.spawn('seaCrab');Object.assign(regular,{phase:'active',health:100,maxHealth:100});hits(g,regular,10);
 assert.equal(g.abyssBossHits,0);assert.equal(g.shieldCount,0);
});

test('the orb charges once per damaging target/tick including fractional damage, with no credit for zero damage',()=>{
 const {g,MM,boss}=fixture();boss.y=g.player.y-g.player.h*.5+boss.h*.5;
 MM.WeaponManager.select(g,'lightningOrb');
 for(let i=0;i<9;i++){g.lightningOrb.cooldown=0;g.player.shotTimer=0;assert.equal(MM.LightningOrbWeapon.fire(g,1),true);}
 assert.equal(g.abyssBossHits,9);assert.equal(g.shieldCount,0);
 g.player.ammo=.5;g.lightningOrb.cooldown=0;g.player.shotTimer=0;MM.LightningOrbWeapon.fire(g,1);
 assert.equal(g.player.ammo,0);assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);assert.equal(boss.health,9990.5);
 const noLoss=shot('lightningOrb',{damageReceipt:{damage:0},damageBudget:0});
 assert.equal(g.dealEnemyDamage(boss,0,noLoss),false);assert.equal(g.abyssBossHits,10);
});

test('ocean phase-changing and lethal hits keep their credit before heals, immunity and actor cleanup',()=>{
 for(const level of [160,170,180,190,200]){
  const {g,boss}=fixture(level);hits(g,boss,9);boss.health=1;
  assert.equal(g.dealEnemyDamage(boss,1,shot()),true,'transition at '+level);
  assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1,'reward at '+level);
  if(level===180){assert.equal(boss.predatorRage,true);assert.equal(g.dealEnemyDamage(boss,1,shot()),false);}
  if(level===190)assert.equal(boss.deepRebirthUsed,true);
 }
});

test('both finite Kraken legacy summons share the encounter hit counter',()=>{
 const {g,MM,boss}=fixture(200);hits(g,boss,8);MM.Boss200.summon(g,boss);
 const children=g.enemies.filter(e=>e.finalSeaSummon);assert.equal(children.length,2);
 for(const child of children){child.phase='active';hits(g,child);}
 assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
});

test('existing knight, Chimera and high-vine Kong rules do not receive a second generic shield',()=>{
 const knight=fixture(90);Object.assign(knight.boss,{dragonForm:'knight',dragonGuarded:false,dragonState:'knight-patrol',knightHits:0});
 hits(knight.g,knight.boss,10);assert.equal(knight.g.shieldCount,1);assert.equal(knight.g.abyssBossHits,0);
 assert.equal(knight.g.bossShieldProgress().special,'knight');assert.equal(knight.g.bossShieldProgress().goal,10);
 const chimera=fixture(100);hits(chimera.g,chimera.boss,5,2);assert.equal(chimera.g.shieldCount,1);assert.equal(chimera.g.abyssBossHits,0);
 assert.equal(chimera.g.bossShieldProgress().special,'chimera');assert.equal(chimera.g.bossShieldProgress().unit,'máu');
 const kong=fixture(80);Object.assign(kong.boss,{vinePhase:true,highAimShots:0});
 for(let i=0;i<10;i++){kong.MM.KongCombat.recordShot(kong.g,kong.boss);hits(kong.g,kong.boss);}
 assert.equal(kong.g.shieldCount,2);assert.equal(kong.g.abyssBossHits,0);
 assert.equal(kong.g.bossShieldProgress().special,'kong');assert.equal(kong.g.bossShieldProgress().goal,5);
});

test('storage stays capped at three, consumes the completed cycle, and resets the stage counter on retry',()=>{
 const {g,boss}=fixture();hits(g,boss,40);assert.equal(g.shieldCount,3);assert.equal(g.bossShieldProgress().full,true);
 assert.equal(g.activateShield(),true);hits(g,boss,9);assert.equal(g.shieldCount,2);hits(g,boss);assert.equal(g.shieldCount,3);
 g.start(200,{retry:true});assert.equal(g.abyssBossHits,0);assert.equal(g.shieldCount,0);assert.equal(g.bossShieldProgress(),null);
});

test('the DOM HUD reports ocean boss progress and explicitly marks a full shield inventory',()=>{
 const {g,boss,scope,MM}=fixture();hits(g,boss,9);MM.UnderwaterMode.syncUI=()=>{};
 const element=()=>({classList:{toggle(){}},style:{},setAttribute(){},textContent:'',innerHTML:''}),nodes={};
 g.ui=new Proxy(nodes,{get(o,k){return o[k]||(o[k]=element());}});
 scope.document={body:{dataset:{}},fullscreenElement:null,querySelector:()=>element(),querySelectorAll:()=>[]};g.headless=false;
 g.updateUI();assert.match(g.ui['charge-label'].textContent,/Boss 9\/10 phát trúng/);
 g.headless=true;hits(g,boss,21);g.headless=false;g.updateUI();assert.match(g.ui['charge-label'].textContent,/Kho khiên đầy \(3\/3\)/);
});
