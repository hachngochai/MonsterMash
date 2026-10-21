'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=151){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);
 g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;g.underwater.oxygenTimer=1e6;
 g.player.health=g.player.maxHealth=100;g.player.invulnerable=0;g.settings.effects=false;
 const spawn=(type,x=700)=>{const e=g.spawn(type);e.phase='active';e.x=x;e.warning=0;return e;};
 const boss=(x=700)=>{const e=spawn('boss',x);e.waterNextClaw=e.waterNextVortex=e.waterNextSilence=Infinity;return e;};
 return {MM,g,spawn,boss,scope};
}
function tick(g,seconds,dt=1/60){for(let remaining=seconds;remaining>1e-8&&g.screen==='playing';){const step=Math.min(dt,remaining);g.update(step);remaining-=step;}}
const key=(code,extra={})=>({code,repeat:false,preventDefault(){},...extra});

test('151 switches to smooth suspended swimming, up supplies finite oxygen instead of jumping and exiting restores land controls',()=>{
 const {MM,g}=fixture();assert.equal(g.player.swimming,true);assert.equal(g.player.y,MM.UnderwaterConfig.arena.centerY);
 const x=g.player.x;g.keyDown(key('ArrowRight'));g.update(.01);assert.ok(g.player.x>x&&g.player.x-x<1,'acceleration has no position snap');
 tick(g,.6);g.keyUp(key('ArrowRight'));assert.ok(g.player.vx>0);tick(g,.4);assert.ok(Math.abs(g.player.y-MM.UnderwaterConfig.arena.centerY)<8);assert.equal(g.player.grounded,false);
 g.underwater.oxygen=10;g.underwater.refillCooldown=0;g.keyDown(key('ArrowUp'));assert.equal(g.underwater.oxygen,25);assert.equal(g.underwater.reserve,1);
 assert.equal(g.player.jumpBuffer,0);assert.ok(Math.abs(g.player.vy)<30);g.keyDown(key('ArrowUp',{repeat:true}));assert.equal(g.underwater.reserve,1);g.keyUp(key('ArrowUp'));
 g.start(1);assert.equal(g.player.swimming,false);assert.equal(g.player.y,438);assert.equal(g.underwater.active,false);
 g.keyDown(key('ArrowUp'));assert.ok(g.player.jumpBuffer>0);g.update(.02);assert.ok(g.player.y<438,'normal map jumps again');
});

test('oxygen lasts thirty active seconds and refills cost one of two finite reserve bottles',()=>{
 const {MM,g}=fixture();assert.equal(g.underwater.oxygen,30);assert.equal(g.underwater.reserve,2);
 tick(g,10);assert.ok(Math.abs(g.underwater.oxygen-20)<1e-7);
 g.screen='paused';g.update(.05);assert.ok(Math.abs(g.underwater.oxygen-20)<1e-7);g.screen='playing';
 g.underwater.oxygen=0;MM.UnderwaterMode.oxygenChanged(g);assert.equal(MM.UnderwaterMode.supply(g),true);assert.equal(g.underwater.oxygen,15);assert.equal(g.underwater.reserve,1);
 g.underwater.refillCooldown=0;g.underwater.oxygen=0;assert.equal(MM.UnderwaterMode.supply(g),true);assert.equal(g.underwater.oxygen,15);assert.equal(g.underwater.reserve,0);
 g.underwater.refillCooldown=0;g.underwater.oxygen=0;assert.equal(MM.UnderwaterMode.supply(g),false);assert.equal(g.underwater.oxygen,0);assert.equal(g.underwater.reserve,0);
});

test('touch jump, upward swipe and a customized jump key all supply one finite bottle without a jump',()=>{
 for(const input of ['button','swipe','key']){
  const {MM,g}=fixture();g.underwater.oxygen=5;
  if(input==='button'){
   const button={dataset:{control:'jump'},classList:{add(){},remove(){}}};const e={pointerId:1,preventDefault(){}};
   g.padDown(e,button);tick(g,.4);g.padUp(e,button);
  }else if(input==='swipe'){
   const e={pointerId:1,pointerType:'touch',button:0,clientX:400,clientY:300,preventDefault(){}};
   g.pointerDown(e);g.pointerMove({...e,clientY:220});tick(g,.4);g.pointerUp({...e,clientY:220});
  }else{MM.KeyBindings.set(g,'jump','KeyE');g.keyDown(key('KeyE'));tick(g,.4);g.keyDown(key('KeyE',{repeat:true}));g.keyUp(key('KeyE'));}
  assert.equal(g.underwater.reserve,1,input);assert.ok(Math.abs(g.underwater.oxygen-19.6)<1e-6,input);assert.equal(g.player.jumpBuffer,0);assert.ok(g.player.y>280);
 }
});

test('water carry preserves bottles and rewards while retry restores the checkpoint without multiplying supplies',()=>{
 const {g,MM}=fixture();g.progression.rewards=[10,20,100,140];MM.WeaponManager.select(g,'scythe');g.underwater.reserve=5;g.underwater.oxygen=3;
 g.start(152,{carry:true});assert.equal(g.underwater.reserve,5);assert.equal(g.underwater.oxygen,30);assert.equal(MM.WeaponManager.current(g),'scythe');
 g.underwater.reserve=9;g.start(152,{retry:true});assert.equal(g.underwater.reserve,5);assert.equal(g.underwater.oxygen,30);
 g.underwater.reserve=0;g.start(152,{retry:true});assert.equal(g.underwater.reserve,5);assert.equal(g.progression.rewards.join(','),'10,20,100,140');
 g.start(1);g.start(151);assert.equal(g.underwater.reserve,2,'a fresh sea entry uses its configured starting supply');
});

test('zero oxygen immediately blocks weapon and roll damage, grants five seconds grace, then one HP each second',()=>{
 const {MM,g,spawn}=fixture();const target=spawn('piranha',g.player.x+200);target.waterNextAttack=Infinity;
 g.underwater.oxygen=0;MM.UnderwaterMode.oxygenChanged(g);assert.equal(g.underwater.suffocating,true);assert.equal(g.shoot(1),false);
 const hp=target.health;assert.equal(g.dealEnemyDamage(target,3,{kind:'scytheWave'}),false);assert.equal(target.health,hp);
 g.progression.rewards=[100];MM.WeaponManager.select(g,'axes');assert.equal(MM.WeaponManager.tryRollSlash(g,1),false);
 g.enemies=[];const health=g.player.health;tick(g,4.99);assert.equal(g.player.health,health);tick(g,.02);assert.equal(g.player.health,health-1);
 tick(g,2);assert.equal(g.player.health,health-3);assert.ok(Math.abs(g.underwater.suffocationTime-7.01)<1e-6);
 assert.equal(MM.UnderwaterMode.supply(g),true);assert.equal(g.underwater.suffocating,false);assert.equal(g.underwater.suffocationTime,0);
 assert.equal(g.underwater.damageClock,0);assert.equal(MM.UnderwaterMode.canAttack(g),true);assert.equal(g.shoot(1),true);
});

test('silence and suffocation stay independent: oxygen can be supplied while silent and both conditions gate weapons',()=>{
 const {MM,g}=fixture();g.underwater.oxygen=0;g.underwater.silenceTime=3;MM.UnderwaterMode.oxygenChanged(g);
 assert.equal(MM.UnderwaterMode.canAttack(g),false);assert.equal(MM.UnderwaterMode.supply(g),true);
 assert.equal(g.underwater.oxygen,15);assert.equal(g.underwater.silenceTime,3);assert.equal(g.shoot(1),false);
 tick(g,2.99);assert.equal(g.shoot(1),false);tick(g,.02);assert.equal(g.underwater.silenceTime,0);assert.equal(g.shoot(1),true);
 g.underwater.oxygen=0;MM.UnderwaterMode.oxygenChanged(g);assert.equal(g.shoot(1),false,'silence expiring cannot bypass the oxygen requirement');
});

test('oxygen, ammunition and health supplies settle around mid-height without disappearing at the settling boundary',()=>{
 const {MM,g}=fixture();g.player.x=50;g.player.ammo=0;
 const air=MM.UnderwaterLoot.dropOxygen(g,800),ammo=g.dropAmmo(700),heart={x:600,y:426,w:28,h:28,life:14};g.pickups.push(heart);
 tick(g,5);assert.equal(air.landed,true);assert.equal(ammo.landed,true);assert.ok(g.underwater.oxygenCrates.includes(air));assert.ok(g.ammoCrates.includes(ammo));
 for(const item of [air,ammo,heart])assert.ok(Math.abs(item.y-MM.UnderwaterConfig.arena.itemY)<=6);
 const reserve=g.underwater.reserve;g.player.x=air.x;g.player.y=air.y;g.update(.01);assert.equal(g.underwater.reserve,reserve+2);
 g.player.x=ammo.x;g.player.y=ammo.y;g.update(.01);assert.ok(g.player.ammo>0);
 const hp=g.player.health;g.player.health--;g.player.x=heart.x;g.player.y=heart.y;g.update(.01);assert.equal(g.player.health,hp);
});

test('piranha telegraphs a target-locked dash, accelerates and recovers without following normal floor physics',()=>{
 const {MM,g,spawn}=fixture();const fish=spawn('piranha',g.player.x-250);fish.waterNextAttack=0;
 g.update(.02);assert.equal(fish.waterState,'windup');assert.ok(fish.skillWarning);
 const aim=fish.waterTargetX;g.player.x+=100;tick(g,MM.UnderwaterConfig.piranha.warning+.03);
 assert.equal(fish.waterTargetX,aim);assert.equal(fish.waterState,'dash');assert.ok(Math.abs(fish.vx)>300);assert.ok(fish.y<438);
 tick(g,MM.UnderwaterConfig.piranha.dashTime+.03);assert.equal(fish.waterState,'recover');assert.equal(fish.tell,false);
});

test('piranha outside detection range turns at the arena edge instead of becoming stuck in patrol',()=>{
 const {MM,g,spawn}=fixture();g.player.x=950;const fish=spawn('piranha',100);fish.dir=-1;
 tick(g,1.5);assert.equal(fish.waterState,'patrol');assert.equal(fish.dir,1);assert.ok(fish.x>MM.UnderwaterConfig.arena.edge+fish.w/2);
});

test('pufferfish inflates smoothly with matching hitbox, uses range hysteresis and contact immunity',()=>{
 const {MM,g,spawn}=fixture(154);const fish=spawn('pufferfish',g.player.x+100);const base=fish.w;
 g.update(.01);assert.ok(fish.w>base&&fish.w<base*MM.UnderwaterConfig.pufferfish.inflateScale);
 tick(g,1);assert.ok(fish.inflation>.9);assert.ok(Math.abs(fish.w/fish.waterBaseW-fish.h/fish.waterBaseH)<1e-10);
 g.player.x=fish.x-190;g.update(.01);assert.equal(fish.waterInflating,true,'the release band does not flicker inflation');
 g.player.x=fish.x-250;g.update(.01);assert.equal(fish.waterInflating,false);
 g.player.x=fish.x;g.player.y=fish.y-fish.h*.5+g.player.h*.5;g.player.invulnerable=0;
 const hp=g.player.health;g.update(.01);assert.equal(g.player.health,hp-1);assert.ok(Math.abs(g.player.vx)>0);
 for(let i=0;i<5;i++){g.player.x=fish.x;g.player.invulnerable=0;g.update(.01);}assert.equal(g.player.health,hp-1,'one contact cannot damage once per frame');
});

test('seahorse water shots have a fixed half-screen range and cannot hit through that range limit',()=>{
 const {MM,g,spawn}=fixture(157);g.player.x=800;const horse=spawn('seahorse',200);horse.waterNextAttack=0;
 tick(g,1);assert.equal(g.waterShots.length,0,'no attack beyond half screen');
 g.player.x=600;horse.x=200;horse.waterState='patrol';horse.waterNextAttack=horse.waterClock;
 g.update(.01);assert.equal(horse.waterState,'windup');tick(g,MM.UnderwaterConfig.seahorse.warning+.02);
 assert.equal(g.waterShots.length,1);const shot=g.waterShots[0];assert.equal(shot.range,480);assert.ok(shot.vx>0);
 g.player.x=950;const hp=g.player.health;tick(g,2);assert.equal(g.player.health,hp);assert.equal(g.waterShots.length,0);
});

test('an aimed seahorse pressure projectile damages once inside its valid range and then expires',()=>{
 const {g,spawn}=fixture(157);g.player.x=600;const horse=spawn('seahorse',200);horse.waterNextAttack=0;
 const hp=g.player.health;tick(g,2.1);assert.equal(g.player.health,hp-1);assert.equal(g.waterShots.length,0);
 tick(g,.3);assert.equal(g.player.health,hp-1);
});

test('three separate claw strikes cost three HP and three stored shields, or consume three active blocks with no HP loss',()=>{
 for(const shield of [false,true]){
  const {g,boss}=fixture(160),b=boss(g.player.x-100);b.y=g.player.y-g.player.h*.5+b.h*.5;
  b.waterState='claw-combo';b.waterClawIndex=0;b.waterClawTimer=0;g.shieldCount=3;
  if(shield){g.player.shieldTime=5;g.player.shieldHits=3;}
  const hp=g.player.health;tick(g,1.3);
  assert.equal(b.waterClawIndex,3);assert.equal(b.waterClawHits,3);assert.equal(g.player.health,hp-(shield?0:3));
  assert.equal(g.shieldCount,shield?3:0);if(shield)assert.equal(g.player.shieldHits,0);
  tick(g,.2);assert.equal(b.waterClawIndex,3,'completed combo does not repeat damage while recovering');
 }
 const {g,boss}=fixture(160),b=boss(g.player.x-100);b.y=g.player.y-g.player.h*.5+b.h*.5;b.waterState='claw-combo';b.waterClawTimer=0;g.player.immortalTime=12;
 const hp=g.player.health;tick(g,1.3);assert.equal(g.player.health,hp,'previous Immortal reward still protects HP');
});

test('boss splits once at half health into an independent sixty-HP twin and only victory after both die',()=>{
 const {g,boss}=fixture(160),b=boss(700);assert.equal(b.maxHealth,120);
 assert.equal(g.dealEnemyDamage(b,60,{kind:'gun'}),true);const twin=g.enemies.find(e=>e.waterTwin);
 assert.ok(twin);assert.equal(twin.health,60);assert.equal(twin.maxHealth,60);assert.equal(b.health,60);
 assert.equal(g.dealEnemyDamage(b,1,{kind:'gun'}),true);assert.equal(g.enemies.filter(e=>e.waterTwin).length,1);
 g.levelKills=g.level.target;g.bossSpawned=true;g.dealEnemyDamage(b,59,{kind:'gun'});assert.equal(b.dead,true);assert.equal(g.screen,'playing');assert.equal(g.bossDefeated,false);
 tick(g,2);assert.equal(twin.phase,'active');g.underwater.silenceTime=0;g.dealEnemyDamage(twin,60,{kind:'gun'});
 assert.equal(twin.dead,true);assert.equal(g.screen,'won');assert.equal(g.bossDefeated,true);assert.equal(g.waterBossEncounter,null);
});

test('a lethal first hit cannot skip the twin phase, and killing the clone first also requires the original',()=>{
 const first=fixture(160),one=first.boss(800);first.g.levelKills=first.g.level.target;first.g.bossSpawned=true;
 first.g.dealEnemyDamage(one,120,{kind:'gun'});const survivor=first.g.enemies.find(e=>e.waterTwin);
 assert.equal(one.dead,true);assert.equal(survivor.health,60);assert.equal(first.g.bossDefeated,false);assert.equal(first.g.screen,'playing');
 tick(first.g,1.51);first.g.dealEnemyDamage(survivor,60,{kind:'gun'});assert.equal(first.g.screen,'won');
 const second=fixture(160),main=second.boss(800);second.g.levelKills=second.g.level.target;second.g.bossSpawned=true;
 const spawn=second.g.spawn.bind(second.g);let copies=0;second.g.spawn=(...args)=>{copies++;return spawn(...args);};
 second.g.dealEnemyDamage(main,60,{kind:'gun'});const twin=second.g.enemies.find(e=>e.waterTwin);tick(second.g,1.51);
 second.g.dealEnemyDamage(twin,60,{kind:'gun'});assert.equal(twin.dead,true);assert.ok(!main.dead);assert.equal(second.g.screen,'playing');assert.equal(second.g.bossDefeated,false);
 second.g.dealEnemyDamage(main,60,{kind:'gun'});assert.equal(second.g.screen,'won');assert.equal(copies,1);
});

test('silence starts every fifteen seconds normally and every ten in the twin phase, with a three-second independent status',()=>{
 const first=fixture(160),b=first.boss(800);b.waterNextSilence=15;tick(first.g,14.95);assert.equal(first.g.underwater.silenceTime,0);
 tick(first.g,.1);assert.equal(b.waterSilenceCasts,1);assert.ok(first.g.underwater.silenceTime>2.9&&first.g.underwater.silenceTime<=3);
 assert.ok(Math.abs(b.waterNextSilence-30)<.1);tick(first.g,3);assert.equal(first.g.underwater.silenceTime,0);
 first.g.underwater.oxygen=30;tick(first.g,12);assert.equal(b.waterSilenceCasts,2,'each fifteen-second deadline produces only one cast');
 const second=fixture(160),main=second.boss(800);main.waterNextSilence=15;second.g.dealEnemyDamage(main,60,{kind:'gun'});
 const twin=second.g.enemies.find(e=>e.waterTwin);twin.waterNextSilence=twin.waterNextClaw=twin.waterNextVortex=Infinity;
 tick(second.g,10.05);assert.equal(main.waterSilenceCasts,1);assert.ok(Math.abs(main.waterNextSilence-20)<.1);
 assert.equal(second.g.underwater.oxygen>0,true,'phase change did not pause oxygen consumption');
});

test('vortex warning and travel do not hit; attraction is separate from its once-only core damage and half-current-oxygen drain',()=>{
 const {MM,g,boss}=fixture(160),b=boss(800);MM.Boss160.summonVortex(g,b);let z=g.waterZones.find(v=>v.kind==='water-vortex');
 const hp=g.player.health;tick(g,1.61);assert.equal(g.player.health,hp);assert.equal(z.phase,'active');
 g.player.x=z.x+z.coreRadius+12;g.player.y=z.y+g.player.h*.5;const oxygen=g.underwater.oxygen;
 g.update(.01);assert.equal(g.player.health,hp);assert.ok(Math.abs(g.underwater.oxygen-(oxygen-.01))<1e-6);assert.ok(g.player.vx<0,'outer water pulls but cannot deal core damage');
 g.player.x=z.x;g.player.y=z.y+g.player.h*.5;g.player.vx=g.player.vy=0;const before=g.underwater.oxygen;g.update(.01);
 assert.equal(g.player.health,hp-2);assert.ok(Math.abs(g.underwater.oxygen-(before-.01)*.5)<1e-6);assert.equal(z.hit,true);assert.equal(g.waterZones.includes(z),false);
 const after=g.underwater.oxygen;tick(g,.1);assert.ok(Math.abs(g.underwater.oxygen-(after-.1))<1e-6,'the same cast cannot halve oxygen twice');
});

test('active shield absorbs vortex HP while oxygen loss is still applied, and water state is cleared on retry/death/exit',()=>{
 const {MM,g,boss}=fixture(160),b=boss(800);MM.Boss160.summonVortex(g,b);tick(g,1.61);const z=g.waterZones.find(v=>v.kind==='water-vortex');
 g.player.x=z.x;g.player.y=z.y+g.player.h*.5;g.player.shieldTime=5;g.player.shieldHits=3;
 const hp=g.player.health,before=g.underwater.oxygen;g.update(.01);assert.equal(g.player.health,hp);assert.equal(g.player.shieldHits,2);assert.ok(g.underwater.oxygen<before*.51);
 g.underwater.oxygen=0;g.underwater.suffocationTime=4;g.underwater.silenceTime=3;g.waterShots.push({life:10});g.start(151);
 assert.equal(g.underwater.oxygen,30);assert.equal(g.underwater.suffocationTime,0);assert.equal(g.underwater.silenceTime,0);assert.equal(g.waterShots.length,0);assert.equal(g.waterZones.length,0);assert.equal(g.waterBossEncounter,null);
 g.player.health=1;g.underwater.oxygen=0;MM.UnderwaterMode.oxygenChanged(g);tick(g,5.01);assert.equal(g.screen,'lost');assert.equal(g.underwater.suffocating,false);
 g.start(1);assert.equal(g.player.swimming,false);assert.equal(g.waterZones.length,0);assert.equal(g.underwater.silenceTime,0);
});

test('underwater double-direction remains exclusive to dual axes and bubbles are pooled within the configured limit',()=>{
 const {MM,g}=fixture();g.progression.rewards=[10,60,90,100,120,140];
 for(const weapon of ['gun','bones','club','bow','spear','hammer','scythe']){
  MM.WeaponManager.select(g,weapon);MM.InputManager.reset(g);g.moveTap(1);g.moveTap(1);assert.equal(g.rollSlash,null,weapon);
 }
 MM.WeaponManager.select(g,'axes');MM.InputManager.reset(g);g.moveTap(1);g.moveTap(1);assert.ok(g.rollSlash);assert.equal(g.player.rollTime,0);
 for(let i=0;i<200;i++)MM.UnderwaterMode.bubble(g,480,280);assert.equal(g.underwater.bubbles.length,MM.UnderwaterConfig.particles.limit);
 const identities=new Set(g.underwater.bubbles);tick(g,4);
 for(let i=0;i<200;i++)MM.UnderwaterMode.bubble(g,480,280);
 assert.ok(g.underwater.bubbles.length<=MM.UnderwaterConfig.particles.limit);assert.ok(g.underwater.bubbles.every(item=>identities.has(item)),'expired bubble objects are reused');
});
