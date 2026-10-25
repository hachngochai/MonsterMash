const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const modules=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','merfolk','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','island-combat','resurrection-rewards','island-renderer','chapter-transition','game'];
function fixture(id=201,rewards=[]){const scope=vm.createContext({});for(const name of modules)vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name});const MM=scope.MM,g=new MM.Game({headless:true,random:()=>.5,storage:{getItem:()=>null,setItem(){}}});g.start(id);g.progression.rewards=rewards.slice();g.spawnTimer=999;g.player.invulnerable=0;return {MM,g,scope};}
function enemy(g,type,x=700){const e=g.spawn(type,1);e.phase='active';e.warning=0;e.x=x;e.islandNext=999;return e;}
function boss(g){g.bossSpawned=true;const e=enemy(g,'boss');if(e.islandState==='sleep'){e.islandState='walk';e.intangible=false;}return e;}
function tick(g,time){for(let left=time;left>1e-8&&g.screen==='playing';){const dt=Math.min(.02,left);g.update(dt);left-=dt;}}
const plain=x=>JSON.parse(JSON.stringify(x));

test('Island adds precisely50 land stages and five exclusive boss arenas without changing1–200',()=>{
 const {MM}=fixture();assert.equal(MM.Campaign.levels.length,250);assert.equal(MM.Campaign.worlds.length,25);
 const old=vm.createContext({});for(const name of modules.slice(0,6).concat('campaign'))vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),old);
 assert.deepEqual(plain(MM.Campaign.levels.slice(0,200)),plain(old.MM.Campaign.levels));
 for(let id=201;id<=250;id++){const level=MM.Campaign.getLevel(id);assert.equal(level.id,id);assert.equal(level.island,true);assert.equal(level.underwater,false);assert.equal(level.world,Math.floor((id-1)/10));assert.equal(level.boss,id%10===0);if(level.boss)assert.equal(level.target,0);assert.ok(level.types.every(k=>Object.hasOwn(MM.IslandConfig.enemies,k)));}
 assert.deepEqual(Array.from(MM.Campaign.getLevel(203).types),['easterEgg','ghostBunny','miniMoai']);assert.deepEqual(Array.from(MM.Campaign.getLevel(248).types),['miniMoai','ghostBunny','luckyPatrick','leprechaun','drunkenWanderer']);
 for(const level of MM.Campaign.levels.slice(200))assert.ok(!level.types.includes('giantBunny')&&!level.types.includes('mutantRat'),'summons never enter ordinary spawn quotas');
});

test('landing on201 restores gravity, jumping and all equipment without ocean effects',()=>{
 const {MM,g}=fixture(200,[160,170,190,200]);g.progression.equipped='lightningOrb';g.player.swimming=true;g.underwater.oxygen=2;g.start(201,{carry:true});
 assert.equal(MM.UnderwaterMode.active(g),false);assert.equal(g.player.swimming===true,false);assert.equal(g.player.merfolkTime||0,0);assert.equal(MM.WeaponManager.current(g),'lightningOrb');
 g.jump();tick(g,.04);assert.ok(g.player.y<438&&g.player.vy<0);assert.equal(MM.MerfolkTransformation.activate(g),false);
});

test('explosive egg warns and explodes only once without adding burn or stun',()=>{
 const {g}=fixture();g.player.x=480;const e=enemy(g,'easterEgg',510);tick(g,.2);assert.equal(e.islandState,'tell');assert.equal(g.player.health,5);tick(g,1.2);
 assert.equal(e.dead,true);assert.equal(g.totalKills,1);assert.equal(g.player.burnTime,0);assert.equal(g.player.stunTime,0);const hp=g.player.health;tick(g,1);assert.equal(g.totalKills,1);assert.equal(g.player.health,hp);
});

test('ghost bunny distinguishes ranged fire from melee and follows a continuous over-head jump',()=>{
 const {MM,g}=fixture(201,[60,170]);const e=enemy(g,'ghostBunny',800);g.player.x=200;g.progression.equipped='club';e.islandNext=0;tick(g,.8);
 assert.ok(g.island.projectiles.some(q=>q.type==='stone'&&q.stun===MM.IslandConfig.ordinary.stoneStun));
 g.island.projectiles=[];g.progression.equipped='lightningOrb';e.islandState='walk';e.islandNext=0;tick(g,.8);assert.ok(g.island.projectiles.some(q=>q.type==='thrown-egg'&&!q.stun));
 e.x=250;e.islandState='walk';e.islandNext=0;tick(g,.02);assert.equal(e.islandState,'jump');const start=e.x;tick(g,.3);assert.ok(e.y<400&&Math.abs(e.x-start)<240);tick(g,.6);assert.equal(e.y,438);
});

test('Patrick applies exactly one dice result, bounded summons, fractional ammo and five independent friendly-fire clovers',()=>{
 const {MM,g}=fixture();const p=enemy(g,'luckyPatrick');g.player.health=3;g.player.ammo=9;
 MM.IslandCombat.dice(g,p,1);assert.equal(g.player.health,4);assert.equal(g.island.projectiles.length,0);
 MM.IslandCombat.dice(g,p,4);assert.equal(g.player.ammo,4.5);assert.equal(g.player.maxAmmo,90);
 MM.IslandCombat.dice(g,p,2);assert.equal(g.island.projectiles.filter(q=>q.type==='bomb').length,1);
 MM.IslandCombat.dice(g,p,5);assert.equal(g.island.projectiles.filter(q=>q.friendlyFire).length,5);
 for(let i=0;i<15;i++)MM.IslandCombat.dice(g,p,6);assert.equal(g.enemies.filter(e=>e.archetype==='giantBunny'||e.type==='giantBunny').length,2);
 MM.IslandCombat.dice(g,p,3);assert.equal(p.hiddenTime,5);MM.IslandCombat.updateEnemy(g,p,4.99);assert.ok(p.hiddenTime>0);MM.IslandCombat.updateEnemy(g,p,.01);assert.equal(p.hiddenTime,0);
});

test('Leprechaun steals at most three without contact damage and Moai never damages the player',()=>{
 const {g}=fixture();g.player.ammo=2;const thief=enemy(g,'leprechaun',g.player.x+20);thief.islandNext=0;tick(g,.8);assert.equal(g.player.ammo,0);assert.equal(g.player.health,5);tick(g,.2);assert.equal(g.player.ammo,0);
 const wall=enemy(g,'miniMoai',g.player.x);tick(g,2);assert.equal(g.player.health,5);assert.equal(wall.damage,0);
});

test('Moai wakes before attacking and wall impact creates a real finite armor-break window',()=>{
 const {MM,g}=fixture(210);g.bossSpawned=true;const e=enemy(g,'boss');assert.equal(MM.IslandCombat.hit(g,e,10,{}),false);assert.equal(e.health,120);
 MM.IslandCombat.updateEnemy(g,e,.01);assert.equal(e.islandState,'awakening');MM.IslandCombat.updateEnemy(g,e,1.5);assert.equal(e.intangible,false);
 g.dealEnemyDamage(e,10,{kind:'normal'});assert.equal(e.health,119);
 g.player.x=100;e.x=830;e.attackDir=1;e.islandState='charge';e.islandTimer=2;MM.IslandCombat.updateEnemy(g,e,.2);assert.equal(e.stoneArmor,false);assert.equal(e.weakTime,8);
 g.dealEnemyDamage(e,10,{kind:'normal'});assert.equal(e.health,109);MM.IslandCombat.updateEnemy(g,e,8);assert.equal(e.stoneArmor,true);
});

test('Alpha underground has no invisible contact and summons are cleaned at final death',()=>{
 const {MM,g}=fixture(220);const e=boss(g);e.islandState='tell';e.islandSkill='burrow';e.islandDuration=1;e.islandTimer=.001;MM.IslandCombat.updateEnemy(g,e,.01);assert.equal(e.intangible,true);assert.equal(e.bulletUntargetable,true);
 e.x=g.player.x;const hp=g.player.health;MM.IslandCombat.updateEnemy(g,e,.5);assert.equal(g.player.health,hp);
 e.islandState='tell';e.intangible=false;e.bulletUntargetable=false;e.islandSkill='rats';e.islandTimer=.001;MM.IslandCombat.updateEnemy(g,e,.01);const rats=g.enemies.filter(a=>a.islandOwner===e);assert.equal(rats.length,3);
 g.dealEnemyDamage(e,9999,{kind:'test'});assert.ok(rats.every(a=>a.dead));assert.equal(g.island.hazards.length,0);
});

test('Birdman locks a visible dive target and has separate poison and explosive eggs',()=>{
 const {MM,g}=fixture(230);const e=boss(g);e.islandState='tell';e.islandSkill='dive';e.islandTimer=.001;e.islandDuration=1;e.targetX=200;MM.IslandCombat.updateEnemy(g,e,.01);g.player.x=800;MM.IslandCombat.updateEnemy(g,e,.3);assert.ok(e.x<700&&e.x>200);MM.IslandCombat.updateEnemy(g,e,.4);assert.equal(e.x,200);assert.equal(e.y,438);
 for(let i=0;i<2;i++){e.islandState='tell';e.islandSkill='cursed-egg';e.islandTimer=.001;MM.IslandCombat.updateEnemy(g,e,.01);}assert.deepEqual(Array.from(g.island.projectiles,q=>q.poison),[true,false]);
});

test('Mana spirit shield stops physical attacks for finite hits but never lightning or magic',()=>{
 const {MM,g}=fixture(240);const e=boss(g);e.manaShield=5;e.manaShieldTime=4;const hp=e.health;
 assert.equal(g.dealEnemyDamage(e,3,{kind:'normal'}),false);assert.equal(e.health,hp);assert.equal(e.manaShield,4);
 assert.equal(g.dealEnemyDamage(e,3,{kind:'lightningOrb'}),true);assert.equal(e.health,hp-3);MM.IslandCombat.updateEnemy(g,e,4);assert.equal(e.manaShield,0);
 e.islandState='tell';e.islandSkill='teleport';e.islandTimer=.001;e.islandDuration=1;MM.IslandCombat.updateEnemy(g,e,.01);assert.ok(e.x>=100&&e.x<=860);
});

test('Judgment requires two distinct seals and an occupied safe zone, ignoring personal immortality',()=>{
 for(const safe of [false,true]){const {MM,g}=fixture(250,[200,230]);const e=boss(g);g.player.health=100;g.player.maxHealth=100;g.player.immortalTime=99;g.resurrection.armorRemaining=99;g.progression.equipped='easterEgg';g.resurrection.form='light';g.resurrection.formRemaining=20;
  g.dealEnemyDamage(e,9999,{kind:'test',magic:true});assert.equal(e.islandState,'judgment');assert.equal(e.health,1);assert.equal(e.pendingDeath,true);assert.equal(g.island.seals.length,3);
  if(safe){for(const x of [175,480]){g.player.x=x;assert.equal(MM.IslandCombat.interact(g),true);assert.equal(MM.IslandCombat.interact(g),false);}assert.equal(MM.IslandCombat.protectedBySeals(g),true);}
  MM.IslandCombat.updateEnemy(g,e,8);assert.equal(g.screen,safe?'won':'lost');assert.equal(e.judgmentUses,1);if(safe)assert.ok(e.dead);else assert.equal(g.player.health,0);
 }
});

test('reward200 grants three seconds of free armor every ten active seconds and pauses cleanly',()=>{
 const {MM,g}=fixture(201,[200]);MM.ResurrectionRewards.update(g,9.99);assert.equal(MM.ResurrectionRewards.protectsHP(g),false);MM.ResurrectionRewards.update(g,.01);assert.equal(g.resurrection.armorRemaining,3);
 g.player.shieldTime=3;g.player.shieldHits=3;g.applyCombatEffect({damage:2,forceHit:true});assert.equal(g.player.health,5);assert.equal(g.player.shieldHits,3);
 g.screen='paused';MM.ResurrectionRewards.update(g,20);assert.equal(g.resurrection.armorRemaining,3);g.screen='playing';MM.ResurrectionRewards.update(g,2.999);assert.ok(g.resurrection.armorRemaining>0);MM.ResurrectionRewards.update(g,.001);assert.equal(MM.ResurrectionRewards.protectsHP(g),false);
});

test('R switches by region, summons only one real-HP Moai and leaves merfolk unlocked',()=>{
 const {MM,g}=fixture(201,[160,210]);g.keyDown({code:'KeyR'});assert.ok(g.resurrection.moai);assert.equal(g.resurrection.moai.health,12);assert.equal(MM.ResurrectionRewards.activate(g),false);
 g.start(151);g.keyDown({code:'KeyR'});assert.equal(g.merfolk.remaining,10);assert.equal(g.resurrection.moai,null);assert.equal(MM.SaveManager.unlocked(g,210),true);
 g.start(201);assert.equal(g.merfolk.remaining,0);MM.ResurrectionRewards.activate(g);const ally=g.resurrection.moai;ally.x=700;ally.hurtNext=0;MM.ResurrectionRewards.damageCompanion(g,{x:700,y:438,w:80,h:100,damage:12});MM.ResurrectionRewards.update(g,.01);assert.equal(g.resurrection.moai,null);
});

test('boss220 increases all generic shield awards from three to five without duplicating hits',()=>{
 const {g}=fixture(220,[220]);const e=boss(g);g.shieldCount=2;for(let i=0;i<45;i++)g.dealEnemyDamage(e,1,{kind:'normal'});assert.equal(g.shieldCount,5);assert.equal(g.maxShields(),5);
 const shot={kind:'normal'};const count=g.abyssBossHits;g.recordBossHit(e,shot);g.recordBossHit(e,shot);assert.equal(g.abyssBossHits,count+1);
});

test('Easter Egg has seven temporary no-ammo forms, independent clovers and exactly one empowered projectile',()=>{
 const {MM,g}=fixture(201,[40,230]);g.progression.equipped='easterEgg';g.player.ammo=0;
 for(let i=0;i<7;i++){g.random=()=>i/7+.001;g.resurrection.form=null;g.resurrection.formRemaining=0;g.player.shotTimer=0;assert.equal(MM.WeaponManager.fire(g,1),true);assert.equal(g.resurrection.form,MM.ResurrectionRewards.forms[i]);assert.equal(g.resurrection.formRemaining,20);assert.equal(g.player.ammo,0);}
 g.resurrection.form='clover';g.resurrection.projectiles=[];g.player.shotTimer=0;g.skillState.darkReady=true;MM.WeaponManager.fire(g,1);assert.equal(g.resurrection.projectiles.length,5);assert.deepEqual(g.resurrection.projectiles.map(q=>q.damage),[2,1,1,1,1]);
 g.resurrection.form='moai';MM.ResurrectionRewards.update(g,.01);assert.equal(g.player.h,105);assert.equal(MM.ResurrectionRewards.protectsHP(g),true);assert.ok(MM.ResurrectionRewards.movementMultiplier(g)<1);g.resurrection.formRemaining=.01;MM.ResurrectionRewards.update(g,.01);assert.equal(g.player.h,54);
});

test('resurrection Light dashes only while its form is active and damages each target once per dash',()=>{
 const {MM,g}=fixture(201,[230]);g.progression.equipped='easterEgg';g.resurrection.form='light';g.resurrection.formRemaining=20;g.player.x=60;const e=enemy(g,'ghostBunny',300);e.health=1500;e.maxHealth=1500;g.moveTap(1);assert.ok(g.resurrection.dash);for(let i=0;i<20;i++)MM.ResurrectionRewards.update(g,.02);assert.equal(e.health,501);assert.equal(g.player.x,934);
 g.progression.equipped='gun';assert.equal(MM.ResurrectionRewards.directionTap(g,-1),false);assert.equal(g.resurrection.dash,null);
});

test('Dream Book owns one bounded real-HP clone, never consumes player ammo and keeps R separate',()=>{
 const {MM,g}=fixture(201,[10,60,160,210,230,240]);g.progression.equipped='dreamBook';g.player.ammo=4;assert.equal(MM.WeaponManager.fire(g,1),true);const clone=g.resurrection.clone;assert.equal(clone.health,10);assert.equal(clone.life,20);assert.ok(!['dreamBook','easterEgg'].includes(clone.weapon));assert.equal(MM.WeaponManager.fire(g,1),false);assert.equal(g.player.ammo,4);assert.equal(MM.ResurrectionRewards.activate(g),true);assert.equal(g.resurrection.clone,clone);MM.ResurrectionRewards.update(g,20);assert.equal(g.resurrection.clone,null);
});

test('all island figures and five landscapes draw finite bounded native geometry without leaking canvas state',()=>{
 const {MM,g}=fixture();let depth=0,calls=0;const grad={addColorStop(){}};const c=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;},createLinearGradient(){return grad;}},{get(o,k){if(k in o)return o[k];return(...args)=>{calls++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));};},set(o,k,v){o[k]=v;return true;}});
 for(const id of [201,211,221,231,241]){g.level=MM.Campaign.getLevel(id);assert.equal(MM.IslandRenderer.drawBackground(c,g),true);assert.equal(depth,0);}
 for(const type of Object.keys(MM.IslandConfig.enemies).concat(Object.keys(MM.IslandConfig.bosses))){const e={...MM.IslandConfig.enemies[type],...MM.IslandConfig.bosses[type],type,x:500,y:438,dir:1,health:5,islandState:'walk'};for(const t of [0,1,10]){assert.equal(MM.IslandRenderer.drawEnemy(c,g,e,t),true);assert.equal(depth,0);}}
 assert.ok(calls>500&&calls<50000);assert.equal(MM.IslandRenderer.drawEnemy(c,g,{type:'skeleton'}),false);
});

test('shore ending continues into the island film and starts201 with saved rewards intact',()=>{
 const {MM,g}=fixture(200,[160,170,190,200]);g.canvas={};g.finish(true);assert.equal(g.cinematic.kind,'ending');for(let i=0;i<221;i++)g.update(.05);assert.equal(g.cinematic.kind,'island');for(let i=0;i<101;i++)g.update(.05);assert.equal(g.level.id,201);assert.equal(g.screen,'playing');assert.equal(MM.UnderwaterMode.active(g),false);assert.ok(g.progression.rewards.includes(200));assert.equal(g.save.resume,201);
});

test('every new boss awards only its own permanent reward after final death, with no reward at250',()=>{
 for(const id of [210,220,230,240,250]){const {MM,g}=fixture(id);const e=boss(g);e.stoneArmor=false;e.weakTime=8;e.judgmentUses=1;
  assert.equal(MM.BossManager.onDefeated(g,e),false);assert.deepEqual(Array.from(g.progression.rewards),[]);
  g.dealEnemyDamage(e,99999,{kind:'test',magic:true});assert.equal(e.dead,true);assert.equal(g.screen,'won');
  assert.deepEqual(Array.from(g.progression.rewards),id===250?[]:[id]);assert.ok(g.save.completed.includes(id));assert.equal(MM.BossManager.onDefeated(g,e),false);
 }
});

test('all fifty island stages use their actual spawn quotas and never spawn an old biome enemy',()=>{
 for(let id=201;id<=250;id++){const {g}=fixture(id);g.spawnTimer=0;g.player.health=g.player.maxHealth=500;
  g.update(.02);if(id%10===0){assert.equal(g.regularSpawned,0);assert.equal(g.enemies.length,1);assert.equal(g.enemies[0].boss,true);}else{assert.equal(g.regularSpawned,1);assert.equal(g.enemies.length,1);assert.ok(g.level.types.includes(g.enemies[0].archetype));}
 }
});

test('Moai eye beam follows its warned locked line and quake can be jumped without HP damage',()=>{
 const {MM,g}=fixture(210);const e=boss(g);g.player.x=220;e.x=740;e.targetX=220;e.targetY=438;e.islandState='tell';e.islandSkill='laser';e.islandTimer=.001;e.islandDuration=1;
 MM.IslandCombat.updateEnemy(g,e,.01);assert.equal(g.island.hazards.length,1);const beam=g.island.hazards[0];assert.equal(MM.IslandCombat.touches(g.player,beam),true);
 const hp=g.player.health;MM.IslandCombat.update(g,.02);assert.equal(g.player.health,hp-2);g.island.hazards=[];g.player.invulnerable=0;g.player.y=250;g.player.stunTime=0;
 g.island.hazards.push({type:'quake',owner:e,x:g.player.x,y:438,w:80,h:28,damage:0,phase:'active',timer:1,life:1,hit:false,stun:1});MM.IslandCombat.update(g,.02);assert.equal(g.player.stunTime,0);assert.equal(g.player.health,hp-2);
 g.player.y=438;MM.IslandCombat.update(g,.02);assert.equal(g.player.stunTime,1);assert.equal(g.player.health,hp-2);
});

test('new ranged forms honor high aiming and summons can be hurt by actual island projectiles',()=>{
 const {MM,g}=fixture(201,[80,210,230]);g.player.x=200;const e=enemy(g,'ghostBunny',500);e.y=180;e.airborne=true;e.health=e.maxHealth=100;g.progression.equipped='easterEgg';g.resurrection.form='glove';g.resurrection.formRemaining=20;
 MM.WeaponManager.setAim(g,'high');MM.WeaponManager.fire(g,1);assert.ok(g.resurrection.projectiles[0].vy<0);for(let i=0;i<30;i++)MM.ResurrectionRewards.update(g,.02);assert.equal(e.health,97);
 g.player.shotTimer=0;MM.WeaponManager.setAim(g,'ground');MM.WeaponManager.fire(g,1);assert.equal(g.resurrection.projectiles.at(-1).vy,0);
 MM.ResurrectionRewards.activate(g);const a=g.resurrection.moai;g.island.projectiles.push({type:'stone',owner:e,x:a.x,y:a.y-a.h*.5,w:20,h:20,vx:0,vy:0,damage:2,life:1,hit:new Set()});MM.IslandCombat.update(g,.02);assert.equal(a.health,10);assert.equal(g.player.health,5);
});

test('a staff rains for four seconds only and never consumes player ammunition',()=>{
 const {MM,g}=fixture(201,[230]);g.progression.equipped='easterEgg';g.resurrection.form='staff';g.resurrection.formRemaining=20;g.player.ammo=3;
 MM.WeaponManager.fire(g,1);assert.equal(g.resurrection.zones.length,1);assert.equal(g.resurrection.zones[0].w,480);
 for(let i=0;i<201;i++)MM.ResurrectionRewards.update(g,.02);assert.equal(g.resurrection.zones.length,0);assert.equal(g.player.ammo,3);assert.ok(g.resurrection.projectiles.length<=48);
 for(let i=0;i<120;i++)MM.ResurrectionRewards.update(g,.02);assert.equal(g.resurrection.projectiles.length,0);
});

test('the fifth story has45 ordinary dots, five independent X/O sites and a200→201→210 connection',()=>{
 const {MM,scope}=fixture();vm.runInContext(fs.readFileSync('js/story.js','utf8'),scope);const s=MM.Story.get(5),trail=MM.Story.trail(s);
 assert.equal(MM.Story.stories.length,5);assert.equal(s.start,201);assert.equal(s.end,250);assert.equal(trail.dots.length,45);
 assert.deepEqual(Array.from(MM.Story.milestones(s,[210,230]),m=>m.mark),['O','X','O','X','X']);assert.equal(MM.Story.forLevel(200).id,4);assert.equal(MM.Story.forLevel(201).id,5);
 const route=MM.Story.crossingRoutes.find(r=>r.from===200);assert.equal(route.entrance,201);assert.equal(route.to,210);
 const html=fs.readFileSync('index.html','utf8');for(const id of ['atlas-crossing-200-out','atlas-crossing-200-in','atlas-island-dots'])assert.ok(html.includes(id));
 assert.match(fs.readFileSync('js/atlas-3d.js','utf8'),/chapter\[12345\]/);
});

test('the new island passage begins at the previous shoreline pose and freezes combat once',()=>{
 const {MM,g}=fixture(200,[200]);const old=MM.ChapterTransition.sampleShot('ending',1),next=MM.ChapterTransition.sampleShot('island',0);
 for(const k of ['x','y','scale'])assert.equal(next[k],old[k],k+' continues the same shoreline actor');let called=0;MM.ChapterTransition.begin(g,'island',()=>called++);const oxy=g.underwater.oxygen,levelTime=g.levelTime;
 for(let i=0;i<499;i++)g.update(.01);assert.equal(g.underwater.oxygen,oxy);assert.equal(g.levelTime,levelTime);assert.equal(called,0);MM.ChapterTransition.update(g,.01);assert.equal(called,1);MM.ChapterTransition.skip(g);assert.equal(called,1);
});

test('Makemake waiting on the final seal challenge has no remaining HP to farm shield hits',()=>{
 const {g}=fixture(250);const e=boss(g);g.dealEnemyDamage(e,99999,{kind:'normal'});assert.equal(e.pendingDeath,true);const before=g.abyssBossHits;
 for(let i=0;i<30;i++)assert.equal(g.dealEnemyDamage(e,1,{kind:'normal'}),false);assert.equal(g.abyssBossHits,before);assert.equal(e.health,1);assert.equal(g.screen,'playing');
});

test('five-shield capacity reaches old Knight, KingKong and Chimera award paths without double awards',()=>{
 const knight=fixture(90,[220]);const k=boss(knight.g);k.dragonForm='knight';k.dragonGuarded=false;k.intangible=false;k.knightHits=9;k.health=k.maxHealth=1000;knight.g.shieldCount=4;
 knight.g.dealEnemyDamage(k,1,{kind:'normal'});assert.equal(knight.g.shieldCount,5);assert.equal(knight.g.abyssBossHits,0);
 const kong=fixture(80,[220]);const a=boss(kong.g);a.vinePhase=true;a.highAimShots=4;kong.g.shieldCount=4;kong.MM.KongCombat.recordShot(kong.g,a);assert.equal(kong.g.shieldCount,5);assert.equal(kong.g.abyssBossHits,0);
 const myth=fixture(100,[220]);const c=boss(myth.g);c.health=c.maxHealth=1000;c.encounter.damage=9;c.encounter.totalDamage=9;myth.g.shieldCount=4;
 myth.g.dealEnemyDamage(c,1,{kind:'normal'});assert.equal(myth.g.shieldCount,5);assert.equal(myth.g.abyssBossHits,0);
});
