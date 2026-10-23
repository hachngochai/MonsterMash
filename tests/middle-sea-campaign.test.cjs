'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(){const context=vm.createContext({});for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','story','tutorial'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context);return context.MM;}
const plain=value=>JSON.parse(JSON.stringify(value));

test('middle sea opens exactly161–170 with one new world and no invented future bosses',()=>{
 const {Campaign:C,MiddleSeaConfig:M}=load(),levels=C.levels.filter(level=>level.middleSea);
 assert.equal(C.levels.length,200);assert.equal(C.worlds.length,20);assert.deepEqual(plain(levels.map(level=>level.id)),Array.from({length:10},(_,i)=>161+i));
 const world=C.worlds[16];assert.equal(world.scenery,16);assert.equal(world.underwater,true);assert.equal(world.middleSea,true);
 for(const [index,level]of levels.entries()){
  assert.equal(level.world,16);assert.equal(level.underwater,true);assert.equal(level.balanceStatus,'provisional-playtest');assert.equal(level.boss,index===9);
  assert.equal(level.target,M.campaign.targets[index]);assert.equal(level.spawnInterval,M.campaign.intervals[index]);assert.equal(level.maxAlive,M.campaign.caps[index]);
  assert.equal(level.healthMultiplier,M.campaign.healthMultiplier);assert.equal(level.speedMultiplier,M.campaign.speedMultiplier);
  assert.ok(level.story.length>50&&level.tutorial&&level.layout);assert.equal(level.abilitySpawnEvery,0);
 }
 const boss=C.getLevel(170);assert.equal(boss.bossArchetype,'phantomJellyfish');assert.equal(boss.bossHealth,M.boss.health);
 assert.deepEqual(plain(boss.bossSkills),['electric-numb','jellyfish-swarm','plasma-laser','illusion-swap']);
 assert.equal(C.levels.filter(level=>level.middleSea).some(level=>level.id>170),false);
});

test('fish and immortal obstacle streams follow the requested introduction without blocking quotas',()=>{
 const {Campaign:C}=load();
 for(let id=161;id<=170;id++){
  const level=C.getLevel(id);
  assert.deepEqual(plain(level.types),id<=163||id>=167?['seahorse','babyShark']:['babyShark']);
  assert.deepEqual(plain(level.hazardTypes),id<=163?[]:['electricJellyfish']);
  assert.equal(level.types.includes('electricJellyfish'),false,'immortal jellyfish do not use killable enemy slots');
  assert.ok(level.types.every(type=>Number.isFinite(C.enemyTypes[type].health)&&C.enemyTypes[type].health>0));
 }
});

test('middle-sea enemies use centralized dimensions and preserve seahorse stats',()=>{
 const {Campaign:C,UnderwaterConfig:U,MiddleSeaConfig:M}=load();
 assert.deepEqual(plain(C.enemyTypes.seahorse),plain(U.enemies.seahorse));
 for(const id of [161,163,167,169]){
  const horse=C.createEnemy('seahorse',id,'normal',-1,()=>.5),original=C.createEnemy('seahorse',157,'normal',-1,()=>.5);
  for(const field of ['w','h','health','damage','speed','ability'])assert.equal(horse[field],original[field],field);
  const shark=C.createEnemy('babyShark',id,'normal',1,()=>.5),stats=M.enemies.babyShark;
  assert.equal(shark.w,stats.w);assert.equal(shark.h,stats.h);assert.equal(shark.health,stats.health);assert.equal(shark.damage,stats.damage);
 }
 const boss=C.createEnemy('boss',170,'normal',1,()=>.5),stats=M.enemies.phantomJellyfish;
 assert.equal(boss.w,stats.w);assert.equal(boss.h,stats.h);assert.equal(boss.health,M.boss.health);assert.equal(boss.archetype,'phantomJellyfish');
});

test('the fourth story keeps its middle-sea route inside the complete fifty-stage ocean',()=>{
 const {Story:S,Tutorial:T}=load(),story=S.get(4),marks=S.milestones(story,[160,170,180,200]);
 assert.equal(story.start,151);assert.equal(story.end,200);assert.equal(story.plannedEnd,undefined);assert.equal(S.length(story),50);
 assert.deepEqual(plain(marks.map(mark=>[mark.level,mark.available,mark.mark])),[[160,true,'O'],[170,true,'O'],[180,true,'O'],[190,true,'X'],[200,true,'O']]);
 assert.deepEqual(plain(S.trail(story).dots.map(dot=>dot.level)),Array.from({length:50},(_,i)=>151+i).filter(id=>id%10));
 assert.equal(S.nextLevel(story,Array.from({length:10},(_,i)=>151+i)),161);
 assert.equal(S.nextLevel(story,Array.from({length:20},(_,i)=>151+i)),171,'the next released chapter follows170');
 assert.equal(T.guides.length,20);assert.equal(T.forLevel(161).start,161);assert.equal(T.forLevel(170).end,170);
});
