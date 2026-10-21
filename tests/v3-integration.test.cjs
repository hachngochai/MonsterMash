'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const MILESTONES=[10,20,30,40,50,60,70,80,90,100];
const plain=value=>JSON.parse(JSON.stringify(value));
function fresh({level=1,rewards=MILESTONES.filter(id=>id!==40),equipped='gun',data}={}) {
  const context=vm.createContext({});
  for(const name of ['abyss-config','underwater-config','middle-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic',
    'key-bindings','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','game']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context,{filename:name+'.js'});
  }
  const records=new Map(),writes=[];
  records.set('monster-mash-v2',JSON.stringify(data||{version:2,campaignSize:100,completed:[],
    progression:{version:1,rewards,equipped,lifeKills:0}}));
  const storage={getItem:key=>records.get(key)||null,setItem(key,value){records.set(key,value);writes.push(JSON.parse(value));}};
  const MM=context.MM,g=new MM.Game({headless:true,storage,random:()=>.5});
  g.start(level);g.settings.effects=false;g.spawnTimer=g.ammoTimer=100000;
  g.player.invulnerable=0;g.player.health=g.player.maxHealth=30;
  return {g,MM,context,records,writes,storage};
}
function advance(g,seconds,step=1/120) {
  for(let left=seconds;left>1e-8;left-=Math.min(step,left))g.update(Math.min(step,left));
}
function tap(g,code) {g.keyDown({code,repeat:false,preventDefault(){}});g.keyUp({code});}
function pair(g,dir=1) {tap(g,dir<0?'ArrowLeft':'ArrowRight');advance(g,.1);tap(g,dir<0?'ArrowLeft':'ArrowRight');}
function stationary(g,{x=650,health=30,type='greenZombie',...extra}={}) {
  const e=g.spawn(type,-1);Object.assign(e,{x,y:438,phase:'active',health,maxHealth:health,
    speed:0,petrifiedTime:10000,abilityState:'ground',...extra});return e;
}
function pad(g,action,id=1) {
  const button={dataset:{control:action},classList:{add(){},remove(){}}};
  const event={pointerId:id,preventDefault(){}};g.padDown(event,button);g.padUp(event,button);
}
function swipe(g,dir,id=1) {
  const e={pointerId:id,pointerType:'touch',button:0,clientX:480,clientY:300,preventDefault(){}};
  g.pointerDown(e);g.pointerMove({...e,clientX:480+dir*80});g.pointerUp({...e,clientX:480+dir*80});
}

for(const weapon of ['gun','bones','club','bow','spear']) {
  test(`V3 real Game: ${weapon} double arrows cannot create Roll Slash or extra damage`,()=>{
    const {g,MM}=fresh({equipped:weapon}),e=stationary(g,{x:560});
    pair(g,1);advance(g,.4);pair(g,-1);advance(g,.4);
    assert.equal(g.rollSlash,null);assert.equal(g.player.rollTime,0);assert.equal(e.health,30);
    assert.equal(MM.WeaponManager.current(g),weapon);
  });
}

test('V3 real Game: dual axes double arrows roll in the requested direction and deal two HP once per target',()=>{
  for(const dir of [-1,1]) {
    const {g}=fresh({equipped:'axes'}),origin=g.player.x;
    const a=stationary(g,{x:origin+dir*70}),b=stationary(g,{x:origin+dir*150});
    pair(g,dir);assert.ok(g.rollSlash);const action=g.rollSlash;
    assert.equal(action.dir,dir);assert.equal(g.player.rollTime,0);
    for(let i=0;i<16;i++)tap(g,dir<0?'ArrowLeft':'ArrowRight');
    assert.equal(g.rollSlash,action,'the same tap sequence cannot queue or replace an active attack');
    advance(g,.35);
    assert.equal(a.health,28);assert.equal(b.health,28);assert.equal(g.rollSlash,null);
    assert.ok((g.player.x-origin)*dir>200);assert.equal(g.player.rollTime,0);
  }
});

test('V3 real Game: changing off axes removes Roll Slash rights without erasing the reward',()=>{
  const {g,MM}=fresh({equipped:'axes'});pair(g);advance(g,.95);
  assert.equal(MM.WeaponManager.select(g,'gun'),true);pair(g);assert.equal(g.rollSlash,null);
  assert.ok(g.progression.rewards.includes(100));
});

test('V3 real Game: mobile buttons and swipes enforce the same exclusive axes attack',()=>{
  for(const operation of [pad,swipe])for(const weapon of ['gun','bones','club','bow','spear','axes']) {
    const {g}=fresh({equipped:weapon}),e=stationary(g,{x:550});
    operation(g,operation===pad?'right':1,1);advance(g,.1);operation(g,operation===pad?'right':1,2);
    assert.equal(!!g.rollSlash,weapon==='axes',`${weapon} via ${operation.name}`);
    advance(g,.35);assert.equal(e.health,weapon==='axes'?28:30);
  }
});

test('V3 real Game: map 70 suppresses saved axes but retains the independent non-damaging Blood Moon evade',()=>{
  const {g,MM}=fresh({level:70,equipped:'axes'}),wolf=stationary(g,{type:'boss',x:600});
  Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
  assert.equal(MM.WeaponManager.current(g),'gun');pair(g,-1);
  assert.equal(g.rollSlash,null);assert.ok(g.player.rollTime>0);
  const health=wolf.health;advance(g,.35);assert.equal(wolf.health,health);
  assert.equal(g.progression.equipped,'axes');g.start(71);
  assert.equal(MM.WeaponManager.current(g),'axes');assert.ok(g.progression.rewards.includes(100));
});

test('V3 real Game: first map 70 attempt grants its automatic sniper at normal cadence without permanent rewards',()=>{
  const {g,MM}=fresh({level:70,rewards:[]}),wolf=stationary(g,{type:'boss',x:780});
  Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
  g.player.ammo=20;assert.equal(g.shoot(1),true);assert.equal(g.player.ammo,15);
  assert.equal(g.bullets[0].damage,5);assert.equal(g.bullets[0].kind,'sniper');
  advance(g,.16);assert.equal(g.shoot(1),false);advance(g,.01);assert.equal(g.shoot(1),true);
  assert.equal(g.player.ammo,10);assert.deepEqual(plain(g.progression.rewards),[]);
  g.start(71);assert.equal(MM.WeaponManager.profile(g).kind,'normal');
});

test('V3 real Game: a stray Blood Moon wolf outside map 70 cannot grant sniper or evade',()=>{
  const {g,MM}=fresh({level:71,rewards:[]}),wolf=stationary(g,{type:'werewolf'});
  Object.assign(wolf,{boss:true,archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
  assert.equal(MM.WeaponManager.profile(g).kind,'normal');pair(g);
  assert.equal(g.player.rollTime,0);assert.equal(g.rollSlash,null);
});

test('map70 mobile dash buttons work in either direction and never grant axes damage',()=>{
  for(const dir of [-1,1])for(const controls of ['both','buttons','gestures']) {
    const {g}=fresh({level:70,equipped:'axes'}),wolf=stationary(g,{type:'boss',x:780});
    Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});g.settings.controls=controls;
    const x=g.player.x,hp=wolf.health;pad(g,dir<0?'dash-left':'dash-right');
    assert.equal(g.player.rollDir,dir);assert.ok(g.player.rollTime>0);assert.equal(g.rollSlash,null);
    advance(g,.34);assert.ok((g.player.x-x)*dir>200);assert.equal(wolf.health,hp);
  }
});

test('mobile dash does not interrupt a held firing pointer: auto fire resumes when the evade ends',()=>{
  const {g}=fresh({level:70}),wolf=stationary(g,{type:'boss',x:850});
  Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
  g.player.ammo=g.player.maxAmmo=100;
  const fire={dataset:{control:'fire-right'},classList:{add(){},remove(){}}};
  const event={pointerId:7,preventDefault(){}};g.padDown(event,fire);
  pad(g,'dash-left',8);advance(g,.25);assert.equal(g.player.ammo,95);
  advance(g,.3);assert.ok(g.player.ammo<=85,'held fire automatically restarts after rolling');
  g.padUp(event,fire);const remaining=g.player.ammo;advance(g,.4);assert.equal(g.player.ammo,remaining);
});

test('real keyboard uses physical event timing after remapping, without OS repeats manufacturing a double tap',()=>{
  const {g,MM}=fresh({level:70}),wolf=stationary(g,{type:'boss',x:850});
  Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
  MM.KeyBindings.set(g,'right','KeyE');
  const event=(timeStamp,repeat=false)=>({code:'KeyE',timeStamp,repeat,preventDefault(){}});
  g.keyDown(event(1000));g.keyDown(event(1200,true));assert.equal(g.player.rollTime,0);
  g.keyUp(event(1250));g.keyDown(event(1340));assert.ok(g.player.rollTime>0);
  assert.equal(g.player.rollDir,1);assert.equal(g.rollSlash,null);
  g.clearInputs();g.player.rollTime=g.player.rollCooldown=0;
  g.keyDown(event(2000));g.keyUp(event(2010));g.update(.05);
  g.keyDown(event(2420));assert.equal(g.player.rollTime,0,'slow frames cannot make an old press look recent');
});

test('map70 accepts a near-ready dash once and clears its buffer on pause or phase exit',()=>{
  for(const cancel of [false,'pause','phase']) {
    const {g}=fresh({level:70}),wolf=stationary(g,{type:'boss',x:850});
    Object.assign(wolf,{archetype:'werewolf',bloodMoon:true,wolfState:'approach'});
    g.player.rollCooldown=.1;pad(g,'dash-left');assert.ok(g.inputState.pendingDash);
    if(cancel==='pause')g.togglePause();else if(cancel==='phase')wolf.bloodMoon=false;
    advance(g,.16);
    assert.equal(g.inputState.pendingDash,null);
    assert.equal(g.player.rollTime>0,!cancel);
    if(!cancel){advance(g,1);assert.equal(g.player.rollTime,0,'one buffered press cannot repeat a dash');}
  }
});

test('V3 real Game: Darken enhances only one of three independent bone hits and five independent arrows',()=>{
  for(const [equipped,count,cost] of [['bones',3,3],['bow',5,5]]) {
    const {g}=fresh({equipped,rewards:MILESTONES});advance(g,5);
    const e=stationary(g,{x:650,health:30,w:100,h:300});
    g.player.ammo=g.player.maxAmmo=30;
    const ammo=g.player.ammo;assert.equal(g.shoot(1),true);
    assert.equal(g.player.ammo,ammo-cost);assert.equal(g.bullets.length,count);
    assert.deepEqual(plain(g.bullets.map(b=>b.damage)),[2,...Array(count-1).fill(1)]);
    advance(g,.4);assert.equal(e.health,30-(count+1));
  }
});

test('V3 real Game: Immortal Shield costs two charges, survives forced and piercing combat damage, and ends after twelve active seconds',()=>{
  const {g}=fresh();g.shieldCount=3;
  tap(g,'Space');assert.equal(g.shieldCount,2);advance(g,.1);tap(g,'Space');
  assert.equal(g.shieldCount,1);assert.equal(g.player.immortalTime,12);
  const hp=g.player.health;g.player.invulnerable=0;
  g.hurt({x:100,damage:3,forceHit:true});assert.equal(g.player.health,hp);
  g.applyCombatEffect({damage:3,pierceShield:1,forceHit:true});assert.equal(g.player.health,hp);
  // Exercise the shield-piercing branch as well as the unshielded effect path.
  g.player.shieldTime=2;g.player.shieldHits=1;
  g.applyCombatEffect({damage:3,pierceShield:1,forceHit:true});assert.equal(g.player.health,hp);
  const owner={health:2,maxHealth:10};g.drainTarget(owner);
  assert.equal(g.player.health,hp);assert.equal(owner.health,2);
  g.player.burnTime=2;g.player.burnTick=1;advance(g,2);assert.equal(g.player.health,hp);
  advance(g,9.99);assert.ok(g.player.immortalTime>0);
  g.togglePause();advance(g,3);assert.ok(g.player.immortalTime>0);
  g.togglePause();advance(g,.01);assert.equal(g.player.immortalTime,0);
  g.hurt({x:100,damage:1,forceHit:true});assert.equal(g.player.health,hp-1);
});

test('V3 real Game: Immortal Shield protects HP while combat crowd control continues',()=>{
  const {g}=fresh();g.player.immortalTime=12;g.player.invulnerable=0;
  g.hurt({x:100,damage:2,forceHit:true,stun:1.5,kind:'spiderling'});
  assert.equal(g.player.health,30);assert.equal(g.player.stunTime,1.5);
  g.player.stunTime=0;g.player.stunGrace=0;
  g.applyCombatEffect({damage:1,stun:2,knockup:-620,forceHit:true});
  assert.equal(g.player.health,30);assert.equal(g.player.stunTime,2);assert.equal(g.player.vy,-620);
});

test('V3 real Game: ordinary shield activation retains its cure while the player is already stunned or petrified',()=>{
  const {g}=fresh();g.shieldCount=1;g.player.stunTime=1;g.player.petrifyTime=1.5;
  tap(g,'Space');assert.equal(g.shieldCount,0);assert.equal(g.player.shieldTime,5);
  assert.equal(g.player.petrifyTime,0);assert.equal(g.player.stunTime,1,'the existing ordinary shield does not cure a web stun');
});

test('V3 real Game: Lifesteal credits ten actual unique deaths, persists progress, and resets its counter',()=>{
  const {g,records}=fresh({rewards:[50]});g.player.health=20;
  const first=stationary(g,{x:50,health:1,type:'skeleton'});g.dealEnemyDamage(first,1);g.killEnemy(first);
  assert.equal(g.progression.lifeKills,1);
  for(let i=0;i<8;i++)g.dealEnemyDamage(stationary(g,{x:50,health:1,type:'skeleton',minion:true}),1);
  assert.equal(g.player.health,20);assert.equal(g.progression.lifeKills,9);
  assert.equal(JSON.parse(records.get('monster-mash-v2')).progression.lifeKills,9);
  g.dealEnemyDamage(stationary(g,{x:50,health:1,type:'skeleton',minion:true}),1);
  assert.equal(g.player.health,21);assert.equal(g.progression.lifeKills,0);
});

test('V3 real Game: Petrify selects a living non-boss every eight seconds and prevents real movement/attacks for two seconds',()=>{
  const {g}=fresh({rewards:[100]}),e=stationary(g,{type:'medusa',x:700});
  e.petrifiedTime=0;e.nextAttackAt=Infinity;
  advance(g,7.99);assert.ok(!(e.petrifiedTime>0));advance(g,.01);
  assert.equal(e.petrifiedTime,2);const x=e.x,clock=e.mythicClock;
  advance(g,1.98);assert.equal(e.x,x);assert.equal(e.mythicClock,clock);
  advance(g,.02);assert.equal(e.petrifiedTime,0);assert.ok(e.mythicClock>clock);
  advance(g,6);assert.equal(e.petrifiedTime,2);
});

test('V3 real Game: single jump remains normal while a double tap reaches the approved 1.8× apex with gravity and landing',()=>{
  function height(double) {
    const {g}=fresh({rewards:[30]});tap(g,'ArrowUp');advance(g,.1);
    if(double)tap(g,'ArrowUp');let top=g.player.y;
    for(let i=0;i<160;i++){g.update(1/240);top=Math.min(top,g.player.y);}
    advance(g,.8);assert.equal(g.player.y,438);assert.equal(g.player.grounded,true);
    return 438-top;
  }
  const ordinary=height(false),high=height(true);
  assert.ok(ordinary>128&&ordinary<132);assert.ok(high/ordinary>1.78&&high/ordinary<1.83);
});

test('V3 real Game: manual W/S aim keeps the selected equipment and W no longer jumps after reward 80',()=>{
  const {g,MM}=fresh({equipped:'bones'});tap(g,'KeyW');
  assert.equal(g.aimMode,'high');assert.equal(g.player.jumpBuffer,0);assert.equal(g.player.vy,0);
  assert.equal(MM.WeaponManager.current(g),'bones');g.shoot(1);
  assert.ok(g.bullets.every(b=>b.vy<0));advance(g,.7);tap(g,'KeyS');
  assert.equal(g.aimMode,'ground');assert.equal(MM.WeaponManager.current(g),'bones');
  tap(g,'ArrowUp');assert.ok(g.player.jumpBuffer>0);
  const legacy=fresh({rewards:[]}).g;tap(legacy,'KeyW');assert.ok(legacy.player.jumpBuffer>0);
});

test('V3 real Game: the F chooser consumes arrow input without moving, jumping, shooting or rolling',()=>{
  const {g,MM}=fresh({equipped:'axes'});g.keyDown({code:'KeyF',preventDefault(){}});advance(g,.35);
  assert.equal(g.weaponPicker.open,true);const x=g.player.x,clock=g.skillState.clock;
  tap(g,'ArrowRight');tap(g,'ArrowRight');tap(g,'ArrowUp');tap(g,'ArrowLeft');
  pad(g,'right');swipe(g,1);advance(g,.5);
  assert.equal(g.player.x,x);assert.equal(g.rollSlash,null);assert.equal(g.player.rollTime,0);
  assert.equal(g.player.jumpBuffer,0);assert.equal(g.bullets.length,0);
  assert.equal(g.skillState.clock,clock,'choosing equipment pauses combat clocks');
  tap(g,'Enter');assert.equal(g.weaponPicker.open,false);assert.ok(MM.WeaponManager.current(g));
});

test('V3 real Game: Dracula reward waits for both bodies even when a same-frame burst kills the original',()=>{
  const {g}=fresh({level:50,rewards:[]});g.levelKills=g.level.target;g.bossSpawned=true;
  const original=stationary(g,{type:'boss',health:3,maxHealth:6,x:700});
  g.dealEnemyDamage(original,3);assert.equal(original.dead,true);
  const clone=g.enemies.find(e=>e.draculaClone);assert.ok(clone);
  assert.equal(g.progression.rewards.includes(50),false);assert.equal(g.screen,'playing');
  clone.phase='active';clone.intangible=false;g.dealEnemyDamage(clone,clone.health);
  assert.equal(g.progression.rewards.filter(id=>id===50).length,1);assert.equal(g.screen,'won');
});

test('V3 real Game: Chimera retirement awards nothing and the last crowned form grants reward 100 once',()=>{
  const {g,MM}=fresh({level:100,rewards:[]});g.levelKills=g.level.target;g.bossSpawned=true;
  const chimera=stationary(g,{type:'boss',x:700,health:10});
  Object.assign(chimera,{mythicAir:true,mythicAirTriggered:true,mythicSplit:false,intangible:false,mythicActions:[]});
  g.dealEnemyDamage(chimera,1);assert.equal(chimera.retired,true);
  assert.equal(g.progression.rewards.includes(100),false);
  const forms=g.enemies.filter(e=>e.chimeraForm);assert.equal(forms.length,3);
  for(const e of forms.slice(0,2)){e.mythicShield=false;g.dealEnemyDamage(e,e.health);assert.equal(g.progression.rewards.includes(100),false);}
  const last=forms[2];last.mythicShield=false;g.dealEnemyDamage(last,last.health);
  assert.equal(g.screen,'won');assert.equal(g.progression.rewards.filter(id=>id===100).length,1);
  assert.equal(MM.BossManager.onDefeated(g,last),false);assert.ok(MM.SaveManager.weaponUnlocked(g,'axes'));
});

test('V3 real Game: finishing a map without a boss death does not create a reward, including on reload',()=>{
  const {g,records,MM}=fresh({level:10,rewards:[]});g.finish(true);
  assert.equal(g.progression.rewards.includes(10),false);assert.equal(MM.SaveManager.unlocked(g,10),false);
  const next=fresh({data:JSON.parse(records.get('monster-mash-v2'))});
  assert.equal(next.g.progression.rewards.includes(10),false);
});

test('V3 real Game: reward 10 persists once and weapon changes retain skill unlocks and lifesteal progress',()=>{
  const {g,MM,records}=fresh({level:10,rewards:[]});g.levelKills=g.level.target;g.bossSpawned=true;
  const boss=stationary(g,{type:'boss',health:1,x:700});g.dealEnemyDamage(boss,1);
  assert.deepEqual(plain(g.progression.rewards),[10]);assert.equal(MM.BossManager.onDefeated(g,boss),false);
  g.start(11);assert.equal(MM.WeaponManager.select(g,'bones'),true);
  g.progression.rewards=MILESTONES.slice();g.progression.lifeKills=7;MM.SaveManager.write(g);
  for(const weapon of ['axes','bow','spear','club','gun'])assert.equal(MM.WeaponManager.select(g,weapon),true);
  assert.deepEqual(plain(g.progression.rewards),MILESTONES);assert.equal(g.progression.lifeKills,7);
  const next=fresh({data:JSON.parse(records.get('monster-mash-v2'))});
  assert.deepEqual(plain(next.g.progression.rewards),MILESTONES);assert.equal(next.g.progression.lifeKills,7);
  assert.equal(next.g.progression.equipped,'gun');assert.equal(next.g.save.progression,next.g.progression);
});

test('V3 independently earned weapon rewards remain accessible when earlier bosses were skipped',()=>{
  for(const [level,weapon] of [[60,'club'],[90,'bow'],[100,'axes']]){
    const {g,MM}=fresh({rewards:[level]});
    tap(g,'KeyF');assert.equal(MM.WeaponManager.current(g),weapon);
    assert.deepEqual(plain(g.progression.rewards),[level],'do not grant earlier boss rewards');
    if(level===60){g.keyDown({code:'KeyF',repeat:false,preventDefault(){}});advance(g,.35);assert.equal(g.weaponPicker.open,true);}
  }
});

test('V3 manual high fire preserves KingKong five-trigger shield and knight counts ranged hits only',()=>{
  const {g,MM}=fresh({level:80});
  const kong=stationary(g,{type:'boss',x:750});
  Object.assign(kong,{vinePhase:true,kongFinalTriggered:false,kongState:'vine-patrol',highAimShots:0});
  g.player.ammo=50;MM.WeaponManager.setAim(g,'high');
  for(let i=0;i<5;i++){g.player.shotTimer=0;assert.equal(g.shoot(1),true);}
  assert.equal(kong.highAimShots,5);assert.equal(g.shieldCount,1);
  const next=fresh({level:90}),knight=stationary(next.g,{type:'boss',x:600,health:100});
  Object.assign(knight,{dragonForm:'knight',dragonGuarded:false,dragonState:'knight-patrol',knightHits:0});
  next.g.dealEnemyDamage(knight,2,{melee:true,kind:'club'});assert.equal(knight.knightHits,0);
  for(let i=0;i<10;i++)next.g.dealEnemyDamage(knight,1,{kind:'bow'});
  assert.equal(knight.knightHits,10);assert.equal(next.g.shieldCount,1);
});

for(const level of MILESTONES) {
  test(`V3 real Game: the complete boss ${level} encounter grants its reward exactly once and survives reload`,()=>{
    const {g,MM,records,writes}=fresh({level,rewards:[]});
    g.levelKills=g.level.target;g.bossSpawned=true;g.player.immortalTime=120;
    const boss=g.spawn('boss',-1);Object.assign(boss,{phase:'active',x:700});
    // Use the production damage route and advance real simulation through each
    // mandatory transformation. Large hits must still respect every phase gate.
    let finalBoss=boss;
    for(let round=0;round<100&&g.screen==='playing';round++) {
      for(const e of g.enemies.slice())if(e.boss&&!e.dead&&e.phase==='active') {
        finalBoss=e;g.dealEnemyDamage(e,10000,{kind:'integration-hit',dir:1});
      }
      if(g.screen==='playing')advance(g,.25);
    }
    assert.equal(g.screen,'won',`boss ${level} must finish all its phases`);
    assert.deepEqual(plain(g.progression.rewards),[level]);
    assert.equal(MM.BossManager.onDefeated(g,finalBoss),false);
    assert.ok(writes.some(save=>save.progression.rewards.includes(level)));
    assert.ok(writes.every(save=>save.progression.rewards.filter(id=>id===level).length<=1));
    const loaded=fresh({data:JSON.parse(records.get('monster-mash-v2'))});
    assert.deepEqual(plain(loaded.g.progression.rewards),[level]);
  });
}
