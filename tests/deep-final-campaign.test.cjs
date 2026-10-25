'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function load(game=false){const c=vm.createContext({}),names=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','save-manager','boss-manager','map-manager','story','tutorial'];if(game)names.push('game');for(const n of names)vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',n+'.js'),'utf8'),c,{filename:n});return c.MM;}
const plain=v=>JSON.parse(JSON.stringify(v)),digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('deep and final ocean stages preserve all1–180 campaign data and actors',()=>{
 const {Campaign:C,DeepSeaConfig:D,FinalSeaConfig:F}=load();
 assert.equal(digest(C.levels.slice(0,180)),'72ce31e7c1598247423f39368c5deda9b696aa143bd9fe7235d75055fa77953e');
 assert.equal(digest(C.worlds.slice(0,18)),'04df5f1e48e725cfb3e5aa57e2651ce4c97f3e7cf8f8a36d512c8925ffce6146');
 const additions=new Set([...Object.keys(D.enemies),...Object.keys(F.enemies)]);
 assert.equal(digest(Object.fromEntries(Object.entries(C.enemyTypes).filter(([key])=>!additions.has(key)))),'6593ec94854562b7cf6d1f19fb6fb50ba681a135272ec158b1725726b2b7c523');
});

test('181–190 introduce Gulper, ghost sharks and reused glow bugs with a separate five-skill Leviathan',()=>{
 const {Campaign:C,DeepSeaConfig:D}=load(),stages=C.levels.filter(l=>l.deepSea);
 assert.equal(C.levels.length,200);assert.equal(C.worlds.length,20);assert.equal(D.provisional,true);
 assert.deepEqual(plain(stages.map(l=>l.id)),Array.from({length:10},(_,i)=>181+i));
 for(const [i,l]of stages.entries()){
  assert.equal(l.underwater,true);assert.equal(l.world,18);assert.equal(l.oxygenDrainMultiplier,1.5);assert.equal(l.balanceStatus,'provisional-playtest');
  assert.equal(l.target,D.campaign.targets[i]);assert.equal(l.spawnInterval,D.campaign.intervals[i]);assert.equal(l.maxAlive,D.campaign.caps[i]);
  assert.deepEqual(plain(l.types),i<3?['gulper']:i<6?['gulper','ghostShark']:['gulper','ghostShark','glowBug']);assert.deepEqual(plain(l.hazardTypes),[]);assert.equal(l.boss,i===9);
 }
 const boss=C.getLevel(190);assert.equal(boss.bossArchetype,'leviathan');assert.equal(boss.bossHealth,D.boss.health);
 assert.deepEqual(plain(boss.bossSkills),['ancient-bite','echo-swarm','sea-lord','black-hole','first-rebirth','final-breath']);
 assert.equal(D.gulper.cooldown,5);assert.equal(D.gulper.rangeSteps,4);assert.equal(D.gulper.damage,1);assert.equal(D.ghostShark.detectSteps,6);
 assert.equal(D.boss.basicCooldown,10);assert.equal(D.boss.swarmCooldown,20);assert.equal(D.boss.swarmDuration,3);assert.equal(D.boss.swarmCount,2);
 assert.equal(D.boss.lordCooldown,15);assert.equal(D.boss.lordDamage,1);assert.equal(D.boss.blackHoleRange,480);assert.equal(D.boss.swallowDuration,5);assert.equal(D.boss.releaseDamage,3);
 assert.equal(D.boss.rebirthHealthFraction,.25);assert.equal(D.boss.rebirthDuration,5);assert.equal(D.boss.rebirthWaves,2);assert.equal(D.boss.finalDuration,5);
});

test('191–200 introduce independent pearls and passing turtles without adding them to kill quotas',()=>{
 const {Campaign:C,DeepSeaConfig:D,FinalSeaConfig:F}=load(),stages=C.levels.filter(l=>l.finalSea);
 assert.deepEqual(plain(stages.map(l=>l.id)),Array.from({length:10},(_,i)=>191+i));assert.equal(F.provisional,true);
 assert.deepEqual(plain(C.enemyTypes.glowBug),plain(D.enemies.glowBug),'the final region reuses the original glowing bug');
 for(const [i,l]of stages.entries()){
  assert.equal(l.underwater,true);assert.equal(l.world,19);assert.equal(l.oxygenDrainMultiplier,2,'replace1.5 with2, never multiply to3');assert.equal(l.balanceStatus,'provisional-playtest');
  assert.equal(l.target,F.campaign.targets[i]);assert.equal(l.spawnInterval,F.campaign.intervals[i]);assert.equal(l.maxAlive,F.campaign.caps[i]);
  assert.deepEqual(plain(l.types),i<3?['seaCrab']:i<6?['seaCrab','anglerFish','glowBug']:['seaCrab','anglerFish','glowBug','giantSquid']);
  assert.deepEqual(plain(l.hazardTypes),i<6?['pearlClam']:['pearlClam','seaTurtle']);assert.equal(l.boss,i===9);assert.equal(l.types.includes('pearlClam')||l.types.includes('seaTurtle'),false);
 }
 const boss=C.getLevel(200);assert.equal(boss.bossArchetype,'kraken');assert.equal(boss.bossHealth,F.boss.health);assert.equal(C.createEnemy('boss',200,'normal',1,()=>.5).h,360);
 assert.deepEqual(plain(boss.bossSkills),['suction-tentacle','shipwreck-throw','black-ink','ocean-echo','fossil-summons']);
 assert.equal(F.clam.closeDelay,2);assert.equal(F.clam.regrowDelay,10);assert.equal(F.squid.damage,1);assert.equal(F.vents.damage,1);assert.equal(F.vents.boostedDamage,2);assert.equal(F.vents.stun,1);
 assert.equal(F.boss.suctionCooldown,10);assert.equal(F.boss.suctionDamage,1);assert.equal(F.boss.shipCooldown,15);assert.equal(F.boss.shipRange,320);assert.equal(F.boss.shipDamage,1);
 assert.equal(F.boss.darkDuration,10);assert.equal(F.boss.echoThreshold,.5);assert.equal(F.boss.fossilDuration,5);assert.equal(F.boss.fossilHealRatio,.25);
});

test('completed ocean saves migrate light, swim and the authorized merfolk guardian reward permanently',()=>{
 const {SaveManager:S,BossManager:B}=load();
 const raw={campaignSize:180,resume:180,completed:[180,190,200,180],progression:{version:1,rewards:[160,170],equipped:'lightningOrb',lifeKills:7}};
 const migrated=S.normalize(raw);assert.deepEqual(plain(migrated.rewards),[160,170,180,190,200]);assert.equal(migrated.equipped,'lightningOrb');assert.equal(migrated.lifeKills,7);
 const g={save:raw,progression:migrated,persist(){this.stored=JSON.stringify(this.save);}};S.write(g);
 const reopened=S.normalize(JSON.parse(g.stored));assert.deepEqual(plain(reopened),plain(migrated));
 for(const level of [180,190,200])assert.equal(S.unlocked({progression:S.normalize({resume:level})},level),false);
 assert.deepEqual(plain(B.rewards[180].skills),['starfish']);assert.deepEqual(plain(B.rewards[190].skills),['freeSwim']);assert.deepEqual(plain(B.rewards[200].skills),['merfolkArmor']);assert.equal(S.milestones.includes(200),true);
 assert.equal(B.rewards[250],undefined);assert.equal(S.milestones.includes(250),false,'the new final boss still has no invented reward');
});

test('completed older sea releases continue to the first new map; unfinished bosses and explicit replays do not jump',()=>{
 const {readSave}=load(true),storage=value=>({getItem:()=>JSON.stringify(value)});
 for(const last of [160,170,180,190]){
  assert.equal(readSave(storage({campaignSize:last,resume:last,completed:[last]})).resume,last+1);
  assert.equal(readSave(storage({campaignSize:last,resume:last,completed:[last-1]})).resume,last);
  assert.equal(readSave(storage({campaignSize:200,resume:last,completed:[last]})).resume,last,'explicit replays stay selected');
 }
 assert.equal(readSave(storage({campaignSize:200,resume:200,completed:[200]})).resume,200);
 assert.equal(readSave(storage({resume:999,completed:[200,201,999]})).resume,200);assert.deepEqual(plain(readSave(storage({completed:[200,201,999]})).completed),[200]);
});

test('new tutorial steps preserve oxygen controls and teach phase rules and permanent rewards',()=>{
 const {Tutorial:T,Story:S}=load();assert.equal(T.guides.length,25);
 const deep=T.forLevel(181),final=T.forLevel(191),deepText=[...deep.learn,...deep.fight,deep.reward].join(' '),finalText=[...final.learn,...final.fight,final.reward].join(' ');
 assert.equal(deep.start,181);assert.equal(deep.end,190);assert.equal(final.start,191);assert.equal(final.end,200);
 assert.match(deepText,/1,5 lần/);assert.match(deepText,/↑ vẫn cấp oxy/);assert.match(deepText,/25% HP tối đa/);assert.match(deepText,/lần thứ hai|Cạn HP lần hai/);assert.match(deep.reward,/Tự Do Đại Dương/);
 assert.match(finalText,/không cộng thành x3/);assert.match(finalText,/10 giây tính từ lúc lấy/);assert.match(finalText,/choáng vẫn 1 giây/);assert.match(final.reward,/Tiểu Ngư Nhân|tiểu ngư nhân/);
 assert.match(T.forLevel(171).reward,/Tam Tinh Hải Đăng/);assert.match(T.forLevel(171).reward,/8 bước/);assert.match(S.get(4).ending,/Bạn đã chinh phục tận cùng đại dương/);
});
