'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function fixture(level=110){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','game'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);g.level.target=999;g.spawnTimer=g.ammoTimer=1e6;g.level.hazardTypes=[];
 g.player.health=g.player.maxHealth=100;g.player.immortalTime=100;g.player.ammo=100;
 const boss=g.spawn('boss',-1);Object.assign(boss,{phase:'active',x:620,speed:0,abyssNext:1e6,nextEmotion:1e6,nextVanish:1e6});
 return {MM,g,boss};
}
const projectile=(kind='gun',extra={})=>({kind,dir:1,...extra});
function hits(g,e,count=1,damage=1,kind='gun'){
 for(let i=0;i<count;i++)assert.equal(g.dealEnemyDamage(e,damage,projectile(kind)),true);
}
function advance(g,seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(left,1/60);g.update(dt);left-=dt;}}

test('real gun projectiles grant exactly one shield at ten boss hits while ordinary kills keep their separate five-kill reward',()=>{
 const {g,boss}=fixture();boss.health=boss.maxHealth=1000;g.player.x=320;
 for(let count=1;count<=20;count++){
  g.player.shotTimer=0;assert.equal(g.shoot(1),true);
  advance(g,.45);assert.equal(g.bullets.length,0);assert.equal(g.abyssBossHits,count);
  assert.equal(g.shieldCount,Math.floor(count/10));assert.equal(g.abyssShieldKills,0);
 }
 for(let i=0;i<5;i++){const e=g.spawn('minotaurCalf',-1);e.phase='active';g.killEnemy(e);}
 assert.equal(g.abyssBossHits,20);assert.equal(g.abyssShieldKills,5);assert.equal(g.shieldCount,3);
});

test('boss credit counts each accepted ranged projectile once regardless of damage or weapon spread',()=>{
 const {g,boss}=fixture();boss.health=boss.maxHealth=10000;
 for(const kind of ['normal','highAim','sniper','gun','bones','bow','spear'])hits(g,boss,1,5,kind);
 assert.equal(g.abyssBossHits,7);assert.equal(g.shieldCount,0);
 const shared=projectile('bow');assert.equal(g.dealEnemyDamage(boss,5,shared),true);assert.equal(g.dealEnemyDamage(boss,5,shared),true);
 assert.equal(g.abyssBossHits,8,'the same projectile cannot be credited twice');
 hits(g,boss,2,1,'bones');assert.equal(g.shieldCount,1);assert.equal(g.abyssBossHits,10);
 for(const attack of [projectile('club',{melee:true}),projectile('axes',{melee:true}),projectile('rollSlash',{melee:true,rollSlash:true}),projectile('gun',{reflected:true}),projectile('gun',{reflection:true}),{}])g.dealEnemyDamage(boss,1,attack);
 assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
});

test('guarded, intangible and inactive bosses, ordinary enemies and temporary shadows cannot grant boss-hit credit',()=>{
 const {g,boss}=fixture();boss.health=boss.maxHealth=1000;
 for(const [key,value] of [['abyssGuarded',true],['intangible',true],['bulletUntargetable',true],['phase','warning']]){
  const previous=boss[key];boss[key]=value;assert.equal(g.dealEnemyDamage(boss,1,projectile()),false);boss[key]=previous;
 }
 const regular=g.spawn('minotaurCalf',-1);Object.assign(regular,{phase:'active',health:50,maxHealth:50});hits(g,regular,10);
 const shadow=g.spawn('minotaurCalf',-1);Object.assign(shadow,{phase:'active',health:50,maxHealth:50,playerShadow:true});hits(g,shadow,10);
 const illusion=g.spawn('minotaurCalf',-1);Object.assign(illusion,{phase:'active',health:50,maxHealth:50,flowerIllusion:true});
 assert.equal(g.dealEnemyDamage(illusion,1,projectile()),false);
 assert.equal(g.abyssBossHits,0);assert.equal(g.shieldCount,0);
});

test('mirror turtle awards ten half-damage hits but reflected projectiles grant no credit',()=>{
 const {g,boss}=fixture(130),health=boss.health;boss.mirrorShield=true;
 for(let i=0;i<10;i++)assert.equal(g.dealEnemyDamage(boss,1,projectile()),false);
 assert.equal(boss.health,health);assert.equal(g.abyssBossHits,0);assert.equal(g.shieldCount,0);
 boss.mirrorShield=false;hits(g,boss,10);assert.equal(boss.health,health-5);assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
});

test('fossil bird transition counts the triggering projectile once and preserves progress into its knight form',()=>{
 const {g,boss,MM}=fixture(140);hits(g,boss,9);assert.equal(g.abyssBossHits,9);
 assert.equal(g.dealEnemyDamage(boss,10000,projectile()),true);assert.equal(boss.abyssForm,'knight');assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
 assert.equal(g.dealEnemyDamage(boss,1,projectile()),false);assert.equal(g.abyssBossHits,10);
 advance(g,MM.AbyssConfig.combat.roc.transition+.01);hits(g,boss,10);
 assert.equal(g.abyssBossHits,20);assert.equal(g.shieldCount,2);assert.equal(boss.dead,undefined);
});

test('deity maze transition and its Rage projection share the boss counter without crediting the other projections',()=>{
 const {g,boss,MM}=fixture(150);hits(g,boss,9);assert.equal(g.abyssBossHits,9);
 assert.equal(g.dealEnemyDamage(boss,boss.maxHealth/2,projectile()),true);assert.equal(boss.abyssPhase,2);assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
 advance(g,MM.AbyssConfig.combat.deity.transition+.01);
 const projections=g.enemies.filter(e=>e.emotionProjection),rage=projections.find(e=>e.emotion==='rage');assert.ok(rage);
 for(const e of projections.filter(e=>e!==rage))assert.equal(g.dealEnemyDamage(e,1,projectile()),false);
 assert.equal(g.dealEnemyDamage(boss,1,projectile()),false);assert.equal(g.abyssBossHits,10);
 const shared=projectile();assert.equal(g.dealEnemyDamage(rage,1,shared),true);assert.equal(g.dealEnemyDamage(rage,1,shared),true);
 assert.equal(g.abyssBossHits,11);hits(g,rage,9);assert.equal(g.abyssBossHits,20);assert.equal(g.shieldCount,2);
 assert.equal(g.abyssShieldKills,0);assert.equal(rage.health,1);
});

test('boss shield storage caps at three and retries, new maps and home clear only the boss-hit stage counter',()=>{
 const {g,boss}=fixture();boss.health=boss.maxHealth=1000;hits(g,boss,40);assert.equal(g.abyssBossHits,40);assert.equal(g.shieldCount,3);
 assert.equal(g.activateShield(),true);assert.equal(g.shieldCount,2);hits(g,boss,9);assert.equal(g.shieldCount,2);hits(g,boss);assert.equal(g.shieldCount,3);
 g.start(110,{retry:true});assert.equal(g.abyssBossHits,0);
 const retryBoss=g.spawn('boss');retryBoss.phase='active';hits(g,retryBoss,3);assert.equal(g.abyssBossHits,3);
 g.start(111,{carry:true});assert.equal(g.abyssBossHits,0);
 g.start(110);const last=g.spawn('boss');last.phase='active';hits(g,last,3);g.goHome();assert.equal(g.abyssBossHits,0);
});

test('a lethal tenth projectile grants its shield once even when Rage projection cleanup retires the struck body',()=>{
 const {g,boss,MM}=fixture(150);g.dealEnemyDamage(boss,boss.maxHealth/2,projectile());
 advance(g,MM.AbyssConfig.combat.deity.transition+.01);
 const rage=g.enemies.find(e=>e.emotionProjection&&e.emotion==='rage');hits(g,rage,8);assert.equal(g.abyssBossHits,9);
 const last=projectile();assert.equal(g.dealEnemyDamage(rage,boss.health,last),true);
 assert.equal(boss.dead,true);assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);assert.equal(g.abyssShieldKills,0);
 assert.equal(g.dealEnemyDamage(rage,1,last),false);assert.equal(g.abyssBossHits,10);assert.equal(g.shieldCount,1);
});

test('legacy dragon knight and Chimera retain their own shield rewards without an additional Abyss reward',()=>{
 const knight=fixture(90);Object.assign(knight.boss,{dragonForm:'knight',dragonGuarded:false,dragonState:'knight-patrol',knightHits:0,health:1000,maxHealth:1000});
 hits(knight.g,knight.boss,10);assert.equal(knight.boss.knightHits,10);assert.equal(knight.g.shieldCount,1);assert.equal(knight.g.abyssBossHits,0);
 const chimera=fixture(100);chimera.boss.health=chimera.boss.maxHealth=1000;hits(chimera.g,chimera.boss,10);
 assert.equal(chimera.g.shieldCount,1);assert.equal(chimera.boss.encounter.totalDamage,10);assert.equal(chimera.g.abyssBossHits,0);
});
