'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
function fresh({boss=true,difficulty='normal'}={}){
  const context=vm.createContext({});
  for(const file of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../js/${file}.js`),'utf8'),context);
  const game=new context.MM.Game({headless:true,random:()=>.5,storage:{getItem(){return null;},setItem(){}}});
  game.settings.difficulty=difficulty;game.settings.effects=false;game.start(boss?80:71);
  game.spawnTimer=game.ammoTimer=10000;game.player.invulnerable=0;
  const enemy=game.spawn(boss?'boss':'miniKingKong',-1);
  Object.assign(enemy,{phase:'active',x:game.player.x-180,y:438,speed:0,kongCooldown:10000});
  return {game,enemy,skills:context.MM.KongCombat};
}
function advance(game,seconds,step=1/60){while(seconds>1e-9){const dt=Math.min(step,seconds);game.update(dt);seconds-=dt;}}
function vine(fixture){const {game,enemy,skills}=fixture;enemy.health=enemy.maxHealth/2+1;skills.hit(game,enemy,1);advance(game,1.4);assert.equal(enemy.kongState,'vine-swing');return fixture;}
function final(fixture){vine(fixture);fixture.skills.hit(fixture.game,fixture.enemy,fixture.enemy.maxHealth);assert.equal(fixture.enemy.kongState,'final-rage');return fixture;}

test('mini KingKong announces a fixed target then throws a visible parabolic banana',()=>{
  const {game,enemy}=fresh({boss:false});enemy.kongCooldown=0;game.update(.01);
  assert.equal(enemy.kongState,'banana-windup');assert.ok(enemy.kongTimer>=game.getPressure(enemy).warningFloor);
  const target=enemy.bananaTargetX;game.player.x=850;advance(game,enemy.kongTimer);
  assert.equal(enemy.kongState,'banana-throw');assert.equal(enemy.bananaTargetX,target);
  const shot=game.enemyShots[0];assert.equal(shot.kind,'banana');assert.equal(shot.giant,false);assert.ok(shot.vx>0&&shot.vy<0);
  const vy=shot.vy;advance(game,.2);assert.ok(shot.vy>vy,'gravity bends the flight');
  advance(game,2);assert.equal(game.enemyShots.length,0);assert.equal(game.bananaPeels.length,1);
  assert.ok(Math.abs(game.bananaPeels[0].x-target)<45);
});
test('giant bananas explode into exactly five outward pieces and five ground peels',()=>{
  const {game,enemy,skills}=fresh();game.player.x=30;
  const shot={kind:'banana',owner:enemy,x:500,y:437,w:46,h:34,vx:0,vy:20,gravity:500,life:3,giant:true};game.enemyShots.push(shot);
  skills.updateShot(game,shot,.05);
  const pieces=game.enemyShots.filter(s=>s.fragment);assert.equal(pieces.length,5);
  assert.deepEqual(Array.from(pieces,s=>s.vx),[-180,-90,0,90,180]);assert.equal(shot.life,0);
  skills.updateShot(game,shot,.05);assert.equal(game.enemyShots.filter(s=>s.fragment).length,5,'explosion cannot duplicate');
  advance(game,1);assert.equal(game.bananaPeels.length,5);assert.equal(game.enemyShots.length,0);
});
test('a banana hit knocks down for half a second despite ordinary damage invulnerability; an active shield blocks it',()=>{
  for(const shield of [false,true]){
    const {game,enemy,skills}=fresh({boss:false});game.player.invulnerable=1;
    if(shield){game.shieldCount=1;game.activateShield();}
    const shot={kind:'banana',owner:enemy,x:game.player.x,y:420,w:18,h:14,vx:0,vy:0,gravity:0,life:3,damage:1};
    skills.updateShot(game,shot,0);
    assert.equal(game.player.stunTime,shield?0:.5);assert.equal(game.player.knockdownTime,shield?0:.5);
    assert.equal(game.player.health,game.player.maxHealth);assert.equal(game.player.shieldHits,shield?2:0);
    advance(game,.5);assert.equal(game.player.stunTime,0);
  }
});
test('ground peels can be jumped over and are bounded and removed with their owner',()=>{
  const {game,enemy,skills}=fresh({boss:false});
  for(let i=0;i<30;i++)skills.updateShot(game,{kind:'banana',owner:enemy,x:100+i*2,y:438,w:18,h:14,vx:0,vy:0,life:1},0);
  assert.equal(game.bananaPeels.length,20);game.player.x=140;game.player.y=330;game.player.grounded=false;
  skills.update(game,.01);assert.equal(game.player.stunTime,0);
  game.player.y=438;game.player.grounded=true;skills.update(game,.01);assert.equal(game.player.stunTime,.5);
  game.killEnemy(enemy);assert.equal(game.bananaPeels.length,0);assert.equal(game.enemyShots.length,0);
});
test('half health refills KingKong exactly once and a lethal first-phase bullet cannot skip the vine duel',()=>{
  const {game,enemy,skills}=fresh();enemy.health=1;
  assert.equal(skills.hit(game,enemy,5),true);assert.equal(enemy.health,enemy.maxHealth);
  assert.equal(enemy.vineTriggered,true);assert.equal(enemy.intangible,true);assert.equal(enemy.kongState,'vine-rise');
  assert.equal(skills.hit(game,enemy,5),false);assert.equal(game.shoot(-1),false);
  advance(game,1.4);assert.equal(enemy.intangible,false);assert.equal(game.getWeaponProfile().kind,'highAim');
  skills.hit(game,enemy,enemy.maxHealth/2);assert.equal(enemy.health,enemy.maxHealth/2);assert.equal(enemy.kongState,'vine-swing');
});
test('high-angle shots use one ammo for two HP and receive one stored shield per five actual shots',()=>{
  const {game,enemy}=vine(fresh());game.player.ammo=20;enemy.kongCooldown=10000;
  const hp=enemy.health;assert.equal(game.shoot(-1),true);
  assert.equal(game.player.ammo,19);assert.equal(game.bullets[0].damage,2);assert.ok(game.bullets[0].vy<0);
  assert.equal(game.player.shotCooldown,.22);assert.equal(enemy.highAimShots,1);assert.equal(game.shoot(-1),false);
  advance(game,.3);assert.equal(enemy.health,hp-2,'diagonal sweep hits the aerial body');
  for(let i=0;i<4;i++){assert.equal(game.shoot(i%2?-1:1),true);advance(game,.23);}
  assert.equal(enemy.highAimShots,5);assert.equal(game.shieldCount,1);assert.equal(game.player.ammo,15);
  game.player.ammo=0;game.player.shotTimer=0;assert.equal(game.shoot(1),false);assert.equal(enemy.highAimShots,5);
  game.shieldCount=3;game.player.ammo=10;
  for(let i=0;i<5;i++){game.player.shotTimer=0;assert.equal(game.shoot(1),true);game.bullets=[];}
  assert.equal(game.shieldCount,3,'the inventory remains capped');
});
test('diagonal bullet sweeps hit the nearest blocker without tunneling through it',()=>{
  const {game,enemy}=fresh();enemy.x=400;enemy.y=260;enemy.w=80;enemy.h=80;
  const blocker=game.spawn('skeleton',-1);Object.assign(blocker,{phase:'active',x:200,y:438,w:40,h:140,speed:0,health:1});
  game.bullets.push({x:100,y:400,vx:6000,vy:-3000,dir:1,life:1,damage:2,kind:'highAim'});
  const hp=enemy.health;game.update(.05);assert.equal(blocker.dead,true);assert.equal(enemy.health,hp);assert.equal(game.bullets.length,0);
});
test('a scream locks half the arena and can be escaped on all difficulties even at maximum pressure',()=>{
  for(const difficulty of ['story','normal','hard']){
    const {game,enemy}=vine(fresh({difficulty}));enemy.combatTime=200;game.player.x=30;enemy.kongCooldown=0;
    game.update(.01);assert.equal(enemy.kongState,'scream-windup');
    const zone=enemy.kongZone;assert.equal(zone.x,240);assert.equal(zone.w,480);assert.ok(zone.total>=1.75);
    game.keys.add('ArrowRight');advance(game,zone.total);assert.ok(game.player.x>500);assert.equal(game.player.health,game.player.maxHealth);
    assert.equal(enemy.kongZone.x,240,'the warning never follows an escaping player');advance(game,.36);
    assert.equal(game.kongZones.length,0);
  }
});
test('standing in the scream is hit once; an active shield absorbs it',()=>{
  for(const shield of [false,true]){
    const {game,enemy}=vine(fresh());game.player.x=200;enemy.kongCooldown=0;game.update(.01);
    if(shield){game.shieldCount=1;game.activateShield();}
    const hp=game.player.health;advance(game,enemy.kongTimer+.3);
    assert.equal(game.player.health,hp-(shield?0:2));assert.equal(game.player.shieldHits,shield?2:0);
  }
});
test('zero aerial HP starts a five-second final stand and bullets cannot shorten it',()=>{
  const {game,enemy,skills}=final(fresh());assert.equal(enemy.dead,undefined);assert.equal(enemy.health,1);
  assert.equal(game.bossDefeated,false);assert.equal(enemy.kongRageTime,5);assert.equal(game.getWeaponProfile().kind,'normal');
  assert.equal(skills.hit(game,enemy,5),false);assert.equal(enemy.health,1);
  game.shieldCount=1;game.activateShield();advance(game,4.99);
  assert.equal(enemy.dead,undefined);assert.equal(game.screen,'playing');assert.ok(enemy.kongRageTime>0);
  advance(game,.01);assert.equal(enemy.dead,true);assert.equal(game.bossDefeated,true);
});
test('one shield protects the complete final rage at 20 and 60 FPS and only then completes level 80',()=>{
  for(const step of [1/60,.05]){
    const {game,enemy}=final(fresh());game.levelKills=game.regularSpawned=game.level.target;game.bossSpawned=true;
    game.shieldCount=1;game.activateShield();const hp=game.player.health;
    advance(game,4.95,step);assert.equal(game.screen,'playing');assert.equal(game.player.health,hp);assert.equal(game.player.shieldHits,3);
    advance(game,.05,step);assert.equal(game.screen,'won');assert.equal(enemy.dead,true);
    assert.ok(game.save.completed.includes(80));assert.equal(game.save.resume,81);
    assert.equal(game.kongZones.length,0);assert.equal(game.bananaPeels.length,0);assert.equal(game.getWeaponProfile().kind,'normal');
  }
});
test('unshielded players and players with only a stored shield are defeated within the last five seconds',()=>{
  for(const difficulty of ['story','normal','hard']){
    const {game,enemy}=final(fresh({difficulty}));game.shieldCount=3;game.player.invulnerable=100;game.player.x=900;
    advance(game,4);assert.equal(game.screen,'lost');assert.equal(game.player.health,0);
    assert.equal(game.shieldCount,3);assert.equal(enemy.dead,undefined);assert.equal(game.bossDefeated,false);
  }
});
test('portal, pause, retry and home freeze or clear every new skill and weapon counter',()=>{
  const {game,enemy,skills}=fresh();enemy.phase='warning';enemy.warning=10;advance(game,2);assert.equal(enemy.kongActiveTime,0);
  enemy.phase='active';skills.hit(game,enemy,enemy.maxHealth);advance(game,.3);game.togglePause();
  const timer=enemy.kongTimer;advance(game,5);assert.equal(enemy.kongTimer,timer);game.togglePause();advance(game,timer);
  skills.hit(game,enemy,enemy.maxHealth);advance(game,.3);game.togglePause();const rage=enemy.kongRageTime;
  advance(game,5);assert.equal(enemy.kongRageTime,rage);game.togglePause();
  game.start(80,{retry:true});assert.equal(game.kongZones.length,0);assert.equal(game.bananaPeels.length,0);assert.equal(game.player.weaponMode,'normal');
  const replacement=game.spawn('boss',-1);replacement.phase='active';skills.hit(game,replacement,replacement.maxHealth);game.goHome();
  assert.equal(game.kongZones.length,0);assert.equal(game.bananaPeels.length,0);assert.equal(game.enemies.length,0);assert.equal(game.getWeaponProfile().kind,'normal');
});
