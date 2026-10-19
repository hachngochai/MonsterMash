'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');

function fresh(type='boss',difficulty='normal') {
  const context=vm.createContext({});
  for(const file of ['abyss-config','campaign','bosses','golem','wolves','kong','mythic','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),context,{filename:file});
  const game=new context.MM.Game({headless:true,random:()=>.5,storage:{getItem(){return null;},setItem(){}}});
  game.settings.difficulty=difficulty;game.settings.effects=false;game.start(type==='boss'?100:91);
  game.spawnTimer=game.ammoTimer=10000;game.player.health=game.player.maxHealth=100;game.player.invulnerable=0;
  const enemy=game.spawn(type,-1);Object.assign(enemy,{phase:'active',x:260,y:438,speed:0});
  game.player.x=480;game.bossSpawned=type==='boss';
  const effects=[],apply=game.applyCombatEffect?.bind(game);
  if(apply)game.applyCombatEffect=spec=>{const before=game.player.health,result=apply(spec);effects.push({...spec,healthLost:before-game.player.health});return result;};
  return {game,enemy,skills:context.MM.MythicCombat,effects};
}
function advance(game,seconds,step=1/60) {while(seconds>1e-9){const dt=Math.min(step,seconds);game.update(dt);seconds-=dt;}}
function waitFor(game,predicate,seconds=15,step=1/60) {let elapsed=0;while(!predicate()&&elapsed<seconds){game.update(step);elapsed+=step;}assert.ok(predicate(),`condition not reached after ${seconds}s`);return elapsed;}
function fly(fixture) {const {game,enemy,skills}=fixture;skills.hit(game,enemy,Math.ceil(enemy.maxHealth/2));advance(game,1.2);assert.equal(enemy.mythicState,'air');return fixture;}
function split(fixture) {fly(fixture);fixture.skills.hit(fixture.game,fixture.enemy,fixture.enemy.health);return fixture;}
function silence(e) {e.nextAttackAt=e.nextClawAt=e.nextSummonAt=e.nextShieldAt=e.nextSkillAt=Infinity;}
function assertChimeraFlight(enemy) {
  assert.equal(enemy.mythicState,'air');
  assert.ok(enemy.y>=312-.001&&enemy.y<=328+.001,'flight stays within the eight-pixel hover around y=320');
  assert.ok(enemy.y<411,'flying feet remain above the normal horizontal shot line');
  assert.ok(enemy.y-enemy.h*1.2>=50,'the enlarged sprite keeps at least 50 pixels of clearance above its top');
}

test('lion spears are fixed-target projectiles while nearby attacks use a warned stab',()=>{
  for(const near of [false,true]) {
    const {game,enemy}=fresh('lionMan');enemy.x=near?410:80;enemy.nextAttackAt=0;
    game.update(.01);const action=enemy.mythicActions[0];
    assert.equal(action.kind,near?'stab':'spear');assert.ok(action.warning>=game.getPressure(enemy).warningFloor);
    const target=game.player.x;game.player.x=850;advance(game,action.warning+.04);
    if(near)assert.equal(action.zone.x,target);
    else{assert.equal(game.mythicShots.length,1);assert.equal(game.mythicShots[0].kind,'spear');assert.ok(game.mythicShots[0].vx>0);}
    assert.equal(game.player.health,100);
  }
});

test('Goatman waits for melee range, announces the axe, and allows escaping its fixed target',()=>{
  const {game,enemy}=fresh('goatman');enemy.nextAttackAt=0;game.update(.01);assert.equal(enemy.mythicActions.length,0);
  enemy.x=390;game.update(.01);const action=enemy.mythicActions[0];assert.equal(action.kind,'axe');
  assert.ok(action.warning>=1.05);const target=action.zone.x;game.player.x=850;
  advance(game,action.warning+.3);assert.equal(action.zone.x,target);assert.equal(game.player.health,100);
});

test('Medusa contact and five-second gaze petrify for 1.5 seconds without health damage',()=>{
  for(const contact of [false,true]) {
    const {game,enemy,effects}=fresh('medusa');game.player.invulnerable=10;
    if(contact)enemy.x=game.player.x;
    else advance(game,5);
    if(contact)game.update(.01);else{
      const action=enemy.mythicActions[0];assert.equal(action.kind,'petrify');advance(game,action.warning);
    }
    assert.ok(Math.abs(game.player.petrifyTime-1.5)<.001);assert.equal(game.player.health,100);
    assert.equal(effects.at(-1).damage,0);assert.equal(effects.at(-1).petrify,1.5);
    assert.equal(game.shoot(1),false);silence(enemy);enemy.x=100;
    advance(game,1.5);assert.equal(game.player.petrifyTime,0);
  }
});

test('only an activated shield blocks or cures Medusa; stored shields do not',()=>{
  for(const shield of ['stored','before','after']) {
    const {game,enemy}=fresh('medusa');enemy.x=game.player.x;game.shieldCount=2;
    if(shield==='before')game.activateShield();
    game.update(.01);
    if(shield==='after'){assert.ok(game.player.petrifyTime>0);game.activateShield();}
    assert.equal(game.player.petrifyTime>0,shield==='stored');assert.equal(game.player.health,100);
    if(shield==='before')assert.equal(game.player.shieldHits,2);
  }
});

test('ground Chimera chooses one valid random skill every four seconds at 20/60 FPS without overlap',()=>{
  for(const step of [1/60,.05]) {
    const {game,enemy}=fresh();const starts=[];let recorded=new Set(),casts=0;
    // Effects are disabled in this fixture, so no cosmetic RNG consumes these
    // alternating samples before the actual skill choice.
    game.random=()=>casts++%2?1:0;
    for(let time=0;time<12.1;time+=step) {
      game.update(step);
      assert.ok(enemy.mythicActions.length<=1,'the four-second scheduler never overlaps skills');
      for(const a of enemy.mythicActions)if(!recorded.has(a)){recorded.add(a);starts.push([a.kind,enemy.mythicClock]);}
    }
    assert.deepEqual(starts.map(([kind])=>kind),['laser','bite','laser']);
    for(let i=0;i<starts.length;i++)assert.ok(Math.abs(starts[i][1]-(i+1)*4)<step+.001);
  }
  const {game,enemy}=fresh();game.random=()=>0;advance(game,4);
  const beam=enemy.mythicActions[0];assert.equal(beam.kind,'laser');game.player.x=850;
  advance(game,beam.warning+.25);assert.equal(game.player.health,100);
});

test('an announced Chimera bite deals two health only once and can be jumped or moved away from',()=>{
  for(const escape of ['none','move','jump','shield']) {
    const {game,enemy,effects}=fresh();advance(game,4);
    const action=enemy.mythicActions[0];assert.equal(action.kind,'bite');
    if(escape==='move')game.player.x=850;
    if(escape==='shield'){game.shieldCount=1;game.activateShield();}
    advance(game,action.warning+.1);
    if(escape==='jump')game.jump();
    advance(game,.65);
    assert.equal(game.player.health,escape==='none'?98:100);
    assert.equal(effects.filter(e=>e.kind==='mythic-bite').length,escape==='none'||escape==='shield'?1:0);
  }
});

test('a lethal ground shot cannot skip full-health flight, and same-frame follow-ups are blocked during ascent',()=>{
  const {game,enemy,skills}=fresh();const hp=enemy.maxHealth;enemy.health=1;
  assert.equal(skills.hit(game,enemy,5),true);assert.equal(enemy.health,hp);assert.equal(enemy.mythicAir,true);
  assert.equal(enemy.intangible,true);assert.equal(skills.hit(game,enemy,5),false);
  assert.equal(game.getWeaponProfile().kind,'highAim');assert.equal(game.getWeaponProfile().locked,true);
  assert.equal(game.shoot(-1),false);advance(game,1.2);assert.equal(enemy.intangible,false);
  assertChimeraFlight(enemy);assert.equal(game.getWeaponProfile().locked,false);
  skills.hit(game,enemy,5);assert.equal(enemy.health,hp-5);
});

test('air roars affect exactly one fixed third of the arena and an active shield blocks fire and knockup',()=>{
  for(const answer of ['move','shield','none']) {
    const {game,enemy,effects}=fly(fresh());game.player.x=100;game.random=()=>0;
    advance(game,4);const action=enemy.mythicActions[0];assert.equal(action.kind,'roar');assert.equal(action.zone.w,320);assert.equal(action.zone.x,160);
    if(answer==='move')game.player.x=600;
    if(answer==='shield'){game.shieldCount=1;game.activateShield();}
    advance(game,action.warning);
    assert.equal(effects.filter(e=>e.kind==='mythic-roar').length,answer==='move'?0:1);
    if(answer==='none'){assert.equal(game.player.health,99);assert.ok(game.player.vy<0);assert.ok(game.player.burnTime>0);}
    else{assert.equal(game.player.health,100);assert.equal(game.player.burnTime||0,0);}
  }
});

test('a random four-second aerial swoop tracks escape attempts, requires an active shield, and returns to flight',()=>{
  for(const shield of [false,true]) {
    const {game,enemy,effects}=fly(fresh());advance(game,4);
    const action=enemy.mythicActions[0];assert.equal(action.kind,'swoop');game.player.x=800;game.player.invulnerable=10;
    if(shield){game.shieldCount=1;game.activateShield();}
    advance(game,action.warning+.55);
    assert.equal(effects.at(-1).kind,'mythic-swoop');assert.equal(effects.at(-1).forceHit,true);
    assert.equal(game.player.health,shield?100:98);
    advance(game,.6);assertChimeraFlight(enemy);
  }
});

test('flight starts a fresh four-second random schedule and never casts ground attacks in the air',()=>{
  for(const step of [1/60,.05]) {
    const {game,enemy,skills}=fresh();advance(game,3.8,step);
    skills.hit(game,enemy,enemy.maxHealth/2);advance(game,1.2,step);
    assert.equal(enemy.mythicActions.length,0);assert.equal(enemy.mythicClock,0);
    let choices=0;game.random=()=>choices++%2?0:1;
    const seen=new Set(),starts=[];
    for(let time=0;time<12.1;time+=step) {
      game.update(step);assert.ok(enemy.mythicActions.length<=1);
      for(const a of enemy.mythicActions)if(!seen.has(a)){seen.add(a);starts.push([a.kind,enemy.mythicClock]);}
    }
    assert.deepEqual(starts.map(([kind])=>kind),['swoop','roar','swoop']);
    for(let i=0;i<starts.length;i++)assert.ok(Math.abs(starts[i][1]-(i+1)*4)<step+.001);
  }
});

test('a late cast waits for its owned action to finish and does not queue overlapping attacks',()=>{
  const {game,enemy}=fresh();advance(game,4);const action=enemy.mythicActions[0];
  action.duration=6;enemy.nextSkillAt=enemy.mythicClock+.1;
  advance(game,5.8);assert.equal(enemy.mythicActions.length,1);assert.equal(enemy.mythicActions[0],action);
  advance(game,.25);assert.equal(enemy.mythicActions.length,1);assert.notEqual(enemy.mythicActions[0],action);
  assert.ok(enemy.nextSkillAt-enemy.mythicClock>3.9,'a delayed cast receives a full cooldown');
});

test('Chimera bite animation follows the announced target and the single impact timing',()=>{
  const {game,enemy,effects}=fresh();advance(game,4);const a=enemy.mythicActions[0],z=a.zone,target=z.x;
  assert.equal(z.kind,'bite');assert.equal(z.attackWindup,a.warning);assert.equal(z.attackLeap,.55);
  advance(game,a.warning+.25);assert.equal(z.phase,'warning');assert.ok(z.attackElapsed>a.warning);
  game.player.x=850;advance(game,.31);assert.equal(z.x,target);assert.equal(z.phase,'impact');
  assert.ok(Math.abs(z.attackElapsed-a.warning-a.leap)<.03);assert.equal(effects.filter(e=>e.kind==='mythic-bite').length,0);
});

test('air health at ten or a lethal same-frame hit creates exactly three crowned boss forms atomically',()=>{
  for(const damage of [1,1000]) {
    const {game,enemy,skills}=fly(fresh());enemy.health=11;const score=game.score,kills=game.totalKills;
    assert.equal(skills.hit(game,enemy,damage),true);
    assert.equal(enemy.dead,true);assert.equal(enemy.retired,true);assert.equal(game.score,score);assert.equal(game.totalKills,kills);
    assert.equal(skills.hit(game,enemy,1),false);
    const forms=enemy.encounter.forms;assert.equal(forms.length,3);
    assert.deepEqual(Array.from(forms,e=>[e.archetype,e.health,e.variant]),[['lion',30,'crowned'],['medusa',20,'queen'],['goatman',40,'radiant']]);
    assert.ok(forms.every(e=>e.boss&&e.phase==='active'&&e.w===76&&e.h===108));
    assert.equal(game.getWeaponProfile().kind,'normal');assert.equal(game.bossDefeated,false);
  }
});

test('real simultaneous bullet sweeps cannot bypass flight or crown splitting at 20/60 FPS',()=>{
  for(const step of [1/60,.05]) {
    const {game,enemy}=fresh();silence(enemy);enemy.health=1;
    for(let i=0;i<2;i++)game.bullets.push({x:enemy.x-20,y:411,dir:1,speed:780,life:1,damage:5});
    game.update(step);assert.equal(enemy.health,enemy.maxHealth);assert.equal(enemy.intangible,true);assert.equal(enemy.dead,undefined);
    game.bullets=[];advance(game,1.2,step);enemy.health=11;
    for(let i=0;i<2;i++)game.bullets.push({x:enemy.x-20,y:enemy.y-40,dir:1,speed:780,life:1,damage:5});
    game.update(step);assert.equal(enemy.dead,true);assert.equal(enemy.encounter.forms.length,3);
    assert.ok(enemy.encounter.forms.every(form=>!form.dead&&form.boss));assert.equal(game.bossDefeated,false);
    assert.equal(game.totalKills,0,'retiring the parent never awards a kill');
  }
});

test('Chimera shields accrue from actual damage across heals and forms, ignore blocked shots, and cap inventory',()=>{
  const {game,enemy,skills}=fresh();game.shieldCount=0;
  skills.hit(game,enemy,9);assert.equal(game.shieldCount,0);skills.hit(game,enemy,1);assert.equal(game.shieldCount,1);
  skills.hit(game,enemy,enemy.health-60);assert.equal(enemy.health,enemy.maxHealth);assert.equal(game.shieldCount,3);
  const total=enemy.encounter.totalDamage;skills.hit(game,enemy,5);assert.equal(enemy.encounter.totalDamage,total);
  advance(game,1.2);game.shieldCount=0;skills.hit(game,enemy,5);assert.equal(game.shieldCount,0);
  skills.hit(game,enemy,5);assert.equal(game.shieldCount,1);
  skills.hit(game,enemy,1000);const forms=enemy.encounter.forms;game.shieldCount=0;
  const remainder=enemy.encounter.damage;skills.hit(game,forms[0],10-remainder);assert.equal(game.shieldCount,1);
  const before=enemy.encounter.totalDamage;forms[2].mythicShield=true;assert.equal(skills.hit(game,forms[2],5),false);
  assert.equal(enemy.encounter.totalDamage,before);forms[2].mythicShield=false;
  forms[1].health=2;skills.hit(game,forms[1],500);assert.equal(enemy.encounter.totalDamage,before+2,'overkill grants only two actual HP');
});

test('crowned lion retains spears and adds leap claws; radiant Goatman retains axes and raises a two-second shield every eight seconds',()=>{
  const {game,enemy,skills}=split(fresh());const [lion,queen,goat]=enemy.encounter.forms;silence(queen);queen.x=900;game.player.x=goat.x-90;
  advance(game,6.05);assert.ok(lion.mythicActions.some(a=>a.kind==='claw'));
  assert.ok(lion.nextAttackAt>6,'the ordinary spear clock also ran');
  advance(game,1.95);assert.equal(goat.mythicShield,true);const hp=goat.health;assert.equal(skills.hit(game,goat,5),false);assert.equal(goat.health,hp);
  advance(game,2);assert.equal(goat.mythicShield,false);assert.equal(skills.hit(game,goat,1),true);
  assert.ok(goat.nextAttackAt>8,'the ordinary axe clock also ran');
  advance(game,6);assert.equal(goat.mythicShield,true);
});

test('Medusa Queen summons every ten seconds, bounds her children at six, and removes them without kill rewards',()=>{
  const {game,enemy}=split(fresh());const [lion,queen,goat]=enemy.encounter.forms;silence(lion);silence(goat);queen.nextAttackAt=Infinity;
  // Preserve the six-child cap test independently from the shorter summon lifetime.
  for(let cycle=1;cycle<=8;cycle++) {
    for(const child of game.enemies.filter(e=>e.ownerBoss===queen))child.summonLife=100;
    advance(game,10);
    const children=game.enemies.filter(e=>!e.dead&&e.ownerBoss===queen);
    assert.equal(children.length,Math.min(cycle,6));
    for(const child of children){silence(child);child.x=900;}
    game.player.petrifyTime=0;game.player.petrifyGrace=0;
  }
  const kills=game.totalKills,score=game.score;game.killEnemy(queen);
  assert.equal(game.enemies.filter(e=>e.ownerBoss===queen).length,0);assert.equal(game.totalKills,kills+1);assert.equal(game.score,score+queen.score);
});

test('boss completion waits for every crown and retiring the original Chimera never awards a victory',()=>{
  const {game,enemy}=split(fresh());game.levelKills=game.level.target;
  const forms=enemy.encounter.forms;game.checkCompletion();assert.equal(game.screen,'playing');
  game.killEnemy(forms[0]);assert.equal(game.bossDefeated,false);assert.equal(game.screen,'playing');
  game.killEnemy(forms[1]);assert.equal(game.bossDefeated,false);assert.equal(game.screen,'playing');
  game.killEnemy(forms[2]);assert.equal(game.bossDefeated,true);assert.equal(game.screen,'won');
});

test('portal warnings and pause freeze all mythic attacks; retry and home remove the encounter hazards',()=>{
  const {game,enemy}=fresh();enemy.phase='warning';enemy.warning=1;
  advance(game,.5);assert.equal(enemy.mythicClock,0);advance(game,.5);assert.equal(enemy.phase,'active');
  enemy.nextSkillAt=0;game.update(.01);const action=enemy.mythicActions[0],clock=enemy.mythicClock,elapsed=action.elapsed,deadline=enemy.nextSkillAt;
  game.togglePause();advance(game,3);assert.equal(enemy.mythicClock,clock);assert.equal(action.elapsed,elapsed);
  assert.equal(enemy.nextSkillAt,deadline);
  game.togglePause();advance(game,.2);assert.ok(action.elapsed>elapsed);
  game.start(100,{retry:true});assert.equal(game.mythicZones.length,0);assert.equal(game.mythicShots.length,0);
  const again=game.spawn('boss');again.phase='active';again.nextSkillAt=0;game.update(.01);assert.equal(game.mythicZones.length,1);
  game.goHome();assert.equal(game.mythicZones.length,0);assert.equal(game.mythicShots.length,0);
});
