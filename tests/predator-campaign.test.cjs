'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const modules=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','save-manager','boss-manager','map-manager','story','tutorial'];
function load(){const scope=vm.createContext({});for(const name of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),scope,{filename:name});return scope.MM;}
const plain=value=>JSON.parse(JSON.stringify(value));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('predator expansion preserves every released1–170 stage, world and enemy record',()=>{
 const {Campaign:C,PredatorSeaConfig:P,DeepSeaConfig:D,FinalSeaConfig:F}=load();
 assert.equal(digest(C.levels.slice(0,170)),'c69ff05f813661e1ae5748ecc5dcdfccb92067b138264674612a9d58ee019eaa');
 assert.equal(digest(C.worlds.slice(0,17)),'36d2465894bd9015b125aa9c226afa261a5b864515ddf8984e9debe06e5fc2b2');
 const additions=new Set([...Object.keys(P.enemies),...Object.keys(D.enemies),...Object.keys(F.enemies)]);
 assert.equal(digest(Object.fromEntries(Object.entries(C.enemyTypes).filter(([name])=>!additions.has(name)))),'97faa205e068a220d8ccfcccf54f6af5ab9527e038b5785626349abe4a452962');
});

test('exactly ten predator stages continue the ocean through180 with staged enemy introductions',()=>{
 const {Campaign:C,PredatorSeaConfig:P}=load();
 assert.equal(C.levels.length,200);assert.equal(C.worlds.length,20);assert.equal(P.provisional,true);
 const stages=C.levels.filter(level=>level.predatorSea);
 assert.deepEqual(plain(stages.map(level=>level.id)),Array.from({length:10},(_,i)=>171+i));
 assert.equal(C.worlds[17].underwater,true);assert.equal(C.worlds[17].predatorSea,true);
 for(const [i,level]of stages.entries()){
  assert.equal(level.world,17);assert.equal(level.underwater,true);assert.equal(level.balanceStatus,'provisional-playtest');
  assert.equal(level.target,P.campaign.targets[i]);assert.equal(level.spawnInterval,P.campaign.intervals[i]);assert.equal(level.maxAlive,P.campaign.caps[i]);
  assert.deepEqual(plain(level.types),i<3?['hammerhead']:['hammerhead','electricRay']);
  assert.deepEqual(plain(level.hazardTypes),i<6?[]:['swordfish']);assert.equal(level.types.includes('swordfish'),false,'one-pass hazards cannot strand the kill quota');
  assert.equal(level.abilitySpawnEvery,0);assert.equal(level.boss,i===9);assert.ok(level.story.length>70&&level.tutorial&&level.layout);
 }
 const boss=C.getLevel(180);assert.equal(boss.bossArchetype,'megaLondon');assert.equal(boss.bossHealth,P.boss.health);
 assert.deepEqual(plain(boss.bossSkills),['sonic-bite','deep-ambush','shockwave-roar','final-rage']);
 assert.equal(C.getLevel(181).deepSea,true);assert.equal(C.levels.filter(level=>level.predatorSea).some(level=>level.id>180),false);
});

test('predator actors use centralized trial dimensions without changing official damage and timing',()=>{
 const {Campaign:C,PredatorSeaConfig:P}=load();
 for(const type of ['hammerhead','electricRay','swordfish']){
  const e=C.createEnemy(type,179,'normal',-1,()=>.5),stats=P.enemies[type];
  for(const field of ['w','h','health','damage'])assert.equal(e[field],stats[field]);
 }
 const boss=C.createEnemy('boss',180,'normal',1,()=>.5);assert.equal(boss.archetype,'megaLondon');assert.equal(boss.w,P.enemies.megaLondon.w);assert.equal(boss.h,P.enemies.megaLondon.h);
 assert.equal(P.hammerhead.ramCooldown,2);assert.equal(P.hammerhead.ramDamage,1);
 assert.equal(P.electricRay.cooldown,10);assert.equal(P.electricRay.damage,1);assert.equal(P.electricRay.stun,1);
 assert.equal(P.swordfish.attackWindow,5);assert.equal(P.boss.biteCooldown,15);assert.equal(P.boss.biteDamage,3);
 assert.equal(P.boss.diveCooldown,10);assert.equal(P.boss.hiddenDuration,3);assert.equal(P.boss.roarDuration,3);assert.equal(P.boss.roarRange,480);
 assert.equal(P.boss.panicDuration,3);assert.equal(P.boss.panicTick,1);assert.equal(P.boss.panicOxygenFraction,.1);assert.equal(P.boss.rageDuration,5);
});

test('the completed ocean story exposes five X sites and45 ordinary dots',()=>{
 const {Story:S,Tutorial:T}=load(),ocean=S.get(4),done=Array.from({length:20},(_,i)=>151+i);
 assert.equal(S.length(ocean),50);assert.equal(ocean.plannedEnd,undefined);assert.equal(S.nextLevel(ocean,done),171);assert.equal(S.forLevel(200).id,4);
 assert.deepEqual(plain(S.milestones(ocean,[160,170,180,190,200]).map(m=>[m.level,m.available,m.mark])),[[160,true,'O'],[170,true,'O'],[180,true,'O'],[190,true,'O'],[200,true,'O']]);
 assert.deepEqual(plain(S.trail(ocean).dots.map(dot=>dot.level)),Array.from({length:50},(_,i)=>151+i).filter(id=>id%10!==0));
 assert.equal(T.guides.length,20);assert.equal(T.forLevel(171).start,171);assert.equal(T.forLevel(180).end,180);assert.match(ocean.ending,/Kraken/);
});

test('completed160/170 saves migrate permanent rewards but resume selections never grant them',()=>{
 const {SaveManager:S}=load();
 for(const raw of [{resume:180},{resume:180,progression:{version:1,rewards:[],equipped:'lightningOrb'}},{resume:170,completed:[151,161,169]}]){
  const p=S.normalize(raw);assert.equal(p.rewards.includes(160),false);assert.equal(p.rewards.includes(170),false);assert.equal(p.equipped,'gun');
 }
 for(const progression of [undefined,{version:1,rewards:[],equipped:'lightningOrb'}]){
  const p=S.normalize({completed:[160,170,170,180,190],progression});
  assert.deepEqual(plain(p.rewards),[160,170,180,190]);assert.equal(S.weaponUnlocked({progression:p},'lightningOrb'),true);
  assert.equal(S.normalize({completed:[160,170],progression:p}).equipped,p.equipped);
 }
 assert.equal(S.weaponUnlocked({progression:S.normalize({rewards:[160]})},'lightningOrb'),false);assert.equal(S.milestones.includes(200),false);
});

test('ocean rewards require the final boss encounter and award exactly once;200 invents no reward',()=>{
 const {SaveManager:S,BossManager:B}=load(),make=level=>({level:{id:level},save:{completed:[]},progression:S.normalize({}),bossDefeated:false,enemies:[],writes:0,persist(){this.writes++;},toast(){}});
 assert.deepEqual(plain(B.rewards[160].skills),['merfolk']);assert.deepEqual(plain(B.rewards[170].weapons),['lightningOrb']);assert.deepEqual(plain(B.rewards[180].skills),['starfish']);assert.deepEqual(plain(B.rewards[190].skills),['freeSwim']);assert.equal(B.rewards[200],undefined);
 for(const level of [160,170,180,190]){
  const g=make(level),boss={boss:true,dead:true,health:0},other={boss:true,dead:false,health:1};g.enemies=[boss,other];
  assert.equal(B.onDefeated(g,boss),false);g.bossDefeated=true;assert.equal(B.onDefeated(g,boss),false);
  other.dead=true;other.health=0;assert.equal(B.onDefeated(g,other),true);assert.equal(B.onDefeated(g,other),false);
  assert.equal(g.writes,1);assert.deepEqual(plain(g.save.progression.rewards),[level]);
  const reload={progression:S.normalize(JSON.parse(JSON.stringify(g.save)))};assert.equal(S.unlocked(reload,level),true);
 }
 const end=make(200);end.bossDefeated=true;assert.equal(B.onDefeated(end,{boss:true,dead:true,health:0}),false);assert.equal(end.writes,0);
});
