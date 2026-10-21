'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(id=141){
  const scope=vm.createContext({});
  for(const name of ['abyss-config','underwater-config','middle-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','game'])
    vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
  const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});
  g.progression.rewards=[40,60,100,140];g.progression.equipped='scythe';g.start(id);
  g.spawnTimer=g.ammoTimer=1e6;g.level.target=999;g.level.hazardTypes=[];
  g.player.x=250;g.player.immortalTime=100;
  function enemy(x,extra={}){const e=g.spawn('skeleton');Object.assign(e,{x,y:438,phase:'active',health:100,maxHealth:100,speed:0,abilityTimer:1e6,...extra});return e;}
  return {MM,g,enemy};
}
function advance(g,time){for(let left=time;left>1e-8;){const dt=Math.min(.02,left);g.update(dt);left-=dt;}}
const key=(code,extra={})=>({code,repeat:false,preventDefault(){},...extra});

test('scythe sends a free shockwave left or right with the original slash cooldown and long-range damage',()=>{
  for(const dir of [-1,1]){
    const {g,enemy}=fixture();g.player.x=480;const target=enemy(480+dir*330),ammo=g.player.ammo;
    assert.equal(g.shoot(dir),true);const wave=g.bullets[0];
    assert.equal(wave.kind,'scytheWave');assert.equal(wave.vx,dir*700);assert.equal(wave.life*wave.speed,560);
    assert.equal(g.player.shotTimer,.7);assert.equal(g.player.ammo,ammo);assert.equal(g.shoot(dir),false);
    advance(g,.55);assert.equal(target.health,97);assert.equal(g.bullets.length,0);
  }
});

test('one swing never double hits nearby enemies and Darken empowers just one unit of that attack',()=>{
  const {g,enemy}=fixture();const near=enemy(300),far=enemy(580);g.skillState.darkReady=true;
  g.shoot(1);assert.equal(near.health,94);assert.equal(g.bullets[0].damage,3);
  advance(g,.55);assert.equal(near.health,94);assert.equal(far.health,97);assert.equal(g.skillState.darkReady,false);
  const next=fixture(),distant=next.enemy(580);next.g.skillState.darkReady=true;next.g.shoot(1);
  assert.equal(next.g.bullets[0].damage,6);advance(next.g,.55);assert.equal(distant.health,94);
});

test('shockwave respects boss guards, has a swept hitbox and does not inherit damaging rolls',()=>{
  const {g,MM}=fixture(130);const boss=g.spawn('boss');Object.assign(boss,{x:580,phase:'active',speed:0,abyssNext:1e6,mirrorShield:true});
  const hp=boss.health;g.shoot(1);advance(g,.55);assert.equal(boss.health,hp);
  assert.equal(g.abyssBossHits,0);assert.equal(MM.WeaponManager.tryRollSlash(g,1),false);
});

test('G swaps with nearest real ordinary enemy, never a boss or its projections and never changes health',()=>{
  const {g,enemy}=fixture(),target=enemy(600),boss=enemy(260,{boss:true}),projection=enemy(270,{emotionProjection:true}),shadow=enemy(280,{playerShadow:true});
  const hp=g.player.health;g.keyDown(key('KeyG'));
  assert.equal(g.player.x,600);assert.equal(target.x,250);assert.equal(g.player.health,hp);assert.equal(target.health,100);
  assert.equal(boss.x,260);assert.equal(projection.x,270);assert.equal(shadow.x,280);assert.equal(g.scytheSwapCooldown,6);
  g.keyDown(key('KeyG'));assert.equal(g.player.x,600,'cooldown prevents repeated swapping');
});

test('swap fails without a normal target or while locked, and held key cannot repeatedly cast',()=>{
  const {g,MM,enemy}=fixture();enemy(600,{boss:true});assert.equal(MM.WeaponManager.tryScytheSwap(g),false);assert.equal(g.scytheSwapCooldown,0);
  enemy(500);g.keyDown(key('KeyG',{repeat:true}));assert.equal(g.scytheSwapCooldown,0);
  for(const property of ['stunTime','petrifyTime','rollTime']){g.player[property]=1;assert.equal(MM.WeaponManager.tryScytheSwap(g),false);g.player[property]=0;}
  g.weaponPicker.open=true;assert.equal(MM.WeaponManager.tryScytheSwap(g),false);g.keyDown(key('KeyG'));assert.equal(g.player.x,250);g.weaponPicker.open=false;
  g.screen='paused';assert.equal(MM.WeaponManager.tryScytheSwap(g),false);g.screen='playing';
  for(const equipped of ['gun','axes','hammer']){g.progression.equipped=equipped;assert.equal(MM.WeaponManager.tryScytheSwap(g),false);}
  g.progression.equipped='scythe';g.level.id=70;assert.equal(MM.WeaponManager.tryScytheSwap(g),false);
});

test('swap cooldown pauses, survives weapon switching, expires after six active seconds and resets on restart',()=>{
  const {g,MM,enemy}=fixture();enemy(600);MM.WeaponManager.tryScytheSwap(g);
  g.screen='paused';MM.WeaponManager.update(g,3);assert.equal(g.scytheSwapCooldown,6);g.screen='playing';
  MM.WeaponManager.select(g,'gun');MM.WeaponManager.select(g,'scythe');assert.equal(g.scytheSwapCooldown,6);
  MM.WeaponManager.update(g,5.99);assert.equal(MM.WeaponManager.tryScytheSwap(g),false);
  MM.WeaponManager.update(g,.01);assert.equal(MM.WeaponManager.tryScytheSwap(g),true);
  g.start(141);assert.equal(g.scytheSwapCooldown,0);
});

test('custom swap binding works without leaking the old G shortcut and clamps swapped bodies inside arena',()=>{
  const {g,MM,enemy}=fixture();enemy(959);MM.KeyBindings.set(g,'scytheSwap','KeyQ');
  g.keyDown(key('KeyG'));assert.equal(g.scytheSwapCooldown,0);g.keyDown(key('KeyQ'));
  assert.ok(g.player.x<=960-g.player.w/2-8);assert.equal(g.scytheSwapCooldown,6);
});

test('non-boss summons remain swappable even when they cannot be shot, and airborne destinations respect arena bounds',()=>{
  const {g,MM,enemy}=fixture();const target=enemy(600,{bulletUntargetable:true,spiderling:true,minion:true,y:100});
  assert.equal(MM.WeaponManager.tryScytheSwap(g),true);assert.equal(g.player.x,600);assert.equal(g.player.y,100);
  assert.equal(target.x,250);assert.equal(target.health,100);
});
