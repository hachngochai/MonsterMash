'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function managers() {
  const context = vm.createContext({});
  for (const name of ['save-manager','boss-manager','map-manager']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context);
  return context.MM;
}
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(MM,level=10,rewards=[]) {
  return {level:{id:level,boss:level%10===0},enemies:[],save:{completed:[]},progression:MM.SaveManager.normalize({rewards}),bossDefeated:true,persisted:0,toasts:[],persist(){this.persisted++;},toast(message){this.toasts.push(message);}};
}
const defeated = () => ({boss:true,dead:true,health:0});

test('V3 normalizes and migrates only completed boss milestones, never a resume map',() => {
  const {SaveManager:S}=managers();
  const result=S.normalize({resume:100,completed:[1,9,10,10,20,99,100,'30',NaN],progression:{rewards:[20,30,33,100,101],equipped:'bow',lifeKills:3}});
  assert.deepEqual(plain(result),{version:1,rewards:[10,20,30,100],equipped:'gun',lifeKills:3});
  assert.deepEqual(plain(S.normalize({resume:100})),{version:1,rewards:[],equipped:'gun',lifeKills:0});
  assert.deepEqual(plain(S.normalize({},[60,90])),{version:1,rewards:[60,90],equipped:'gun',lifeKills:0});
});

test('V3 saves reject invalid equipment and sanitize malformed counters',() => {
  const {SaveManager:S}=managers();
  for(const raw of [null,[],17,'bad'])assert.deepEqual(plain(S.normalize(raw)),{version:1,rewards:[],equipped:'gun',lifeKills:0});
  assert.equal(S.normalize({equipped:'toString',lifeKills:Infinity}).equipped,'gun');
  assert.equal(S.normalize({equipped:'axes',rewards:[100],lifeKills:10}).equipped,'axes');
  assert.equal(S.normalize({lifeKills:10}).lifeKills,9);
  assert.equal(S.normalize({lifeKills:-8}).lifeKills,0);
  assert.equal(S.normalize({lifeKills:2.9}).lifeKills,2);
});

test('V3 boss reward is granted once, persists, and survives reload',() => {
  const MM=managers(),game=fixture(MM),enemy=defeated();
  game.enemies=[enemy];
  assert.equal(MM.BossManager.onDefeated(game,enemy),true);
  assert.equal(game.persisted,1);assert.equal(game.toasts.length,1);
  assert.deepEqual(plain(game.save.progression.rewards),[10]);
  assert.equal(MM.BossManager.onDefeated(game,enemy),false);
  assert.equal(game.persisted,1);assert.equal(game.toasts.length,1);
  const reloaded=fixture(MM);reloaded.progression=MM.SaveManager.normalize(JSON.parse(JSON.stringify(game.save)).progression);
  assert.equal(MM.SaveManager.unlocked(reloaded,10),true);
  assert.equal(MM.BossManager.onDefeated(reloaded,enemy),false);
  assert.equal(reloaded.persisted,0);
});

test('V3 rewards require a dead boss and an actually completed milestone encounter',() => {
  const MM=managers();
  for(const [level,enemy,flag] of [[9,defeated(),true],[10,{boss:false,dead:true,health:0},true],[10,{boss:true,dead:false,health:0},true],[10,{boss:true,dead:true,health:1},true],[10,{boss:true,dead:true,health:0,retired:true},true],[10,defeated(),false]]) {
    const game=fixture(MM,level);game.bossDefeated=flag;
    assert.equal(MM.BossManager.onDefeated(game,enemy),false);
    assert.deepEqual(plain(game.progression.rewards),[]);
    assert.equal(game.persisted,0);
  }
});

test('V3 Dracula awards only after both original and clone have died',() => {
  const MM=managers(),game=fixture(MM,50),first=defeated(),clone={boss:true,dead:false,health:1};
  game.enemies=[first,clone];game.bossDefeated=false;
  assert.equal(MM.BossManager.onDefeated(game,first),false);
  game.bossDefeated=true; // An incorrectly early encounter flag still cannot award.
  assert.equal(MM.BossManager.onDefeated(game,first),false);
  clone.dead=true;clone.health=0;
  assert.equal(MM.BossManager.onDefeated(game,clone),true);
  assert.deepEqual(plain(game.progression.rewards),[50]);
});

test('V3 Chimera retains its encounter and awards only after all three heirs die',() => {
  const MM=managers(),game=fixture(MM,100),forms=Array.from({length:3},()=>({boss:true,dead:false,health:1}));
  game.enemies=forms;
  for(let i=0;i<forms.length;i++) {
    forms[i].dead=true;forms[i].health=0;
    assert.equal(MM.BossManager.onDefeated(game,forms[i]),i===2);
  }
  assert.deepEqual(plain(game.progression.rewards),[100]);assert.equal(game.persisted,1);
});

test('V3 every milestone has exactly one persisted reward and the right equipment gates',() => {
  const MM=managers(),game=fixture(MM);
  for(const level of MM.SaveManager.milestones) {
    game.level.id=level;
    assert.equal(MM.BossManager.onDefeated(game,defeated()),true);
    assert.equal(MM.BossManager.onDefeated(game,defeated()),false);
  }
  assert.equal(game.persisted,24);
  assert.deepEqual(plain(game.progression.rewards),[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240]);
  for(const weapon of ['gun','bones','club','bow','spear','axes','hammer','scythe','lightningOrb','easterEgg','dreamBook'])assert.equal(MM.SaveManager.weaponUnlocked(game,weapon),true);
  assert.equal(MM.SaveManager.milestones.includes(250),false);assert.equal(MM.BossManager.rewards[250],undefined);
  assert.equal(MM.SaveManager.weaponUnlocked(game,'unknown'),false);
  assert.equal(MM.SaveManager.unlocked(game,1),false);
});

test('V3 writes retain runtime state identity and preserve unrelated legacy save fields',() => {
  const MM=managers(),game=fixture(MM,20,[10]);
  game.save.best=1234;game.save.resume=70;game.progression.equipped='bones';game.progression.lifeKills=7;
  const identity=game.progression;
  MM.SaveManager.write(game);
  assert.equal(game.progression,identity);assert.equal(game.save.progression,identity);
  assert.equal(game.save.best,1234);assert.equal(game.save.resume,70);
  assert.deepEqual(plain(MM.SaveManager.normalize(game.save.progression)),{version:1,rewards:[10],equipped:'bones',lifeKills:7});
});

test('V3 map 70 suppresses skills and weapons for the entire map without erasing rewards',() => {
  const MM=managers(),game=fixture(MM,69,[10,20,30,40,50,60,70,80,90,100]);
  game.progression.equipped='axes';
  const before=JSON.stringify(game.progression);
  assert.equal(MM.MapManager.weapon(game),'axes');assert.equal(MM.MapManager.manualAim(game),true);
  game.level.id=70;
  assert.equal(MM.MapManager.suppressed(game),true);assert.equal(MM.MapManager.skillsEnabled(game),false);
  assert.equal(MM.MapManager.weapon(game),'gun');assert.equal(MM.MapManager.manualAim(game),false);
  assert.equal(MM.MapManager.bloodMoon(game),false);
  game.enemies=[{boss:true,archetype:'werewolf',bloodMoon:true,health:5}];
  assert.equal(MM.MapManager.bloodMoon(game),true);
  game.level.id=71;
  assert.equal(MM.MapManager.suppressed(game),false);assert.equal(MM.MapManager.skillsEnabled(game),true);
  assert.equal(MM.MapManager.weapon(game),'axes');assert.equal(MM.MapManager.bloodMoon(game),false);
  assert.equal(MM.MapManager.manualAim(game),true);assert.equal(JSON.stringify(game.progression),before);
  assert.equal(game.persisted,0);
});

test('V3 first map 70 attempt can use its blood moon exception without unlocking other rewards',() => {
  const MM=managers(),game=fixture(MM,70),boss={boss:true,archetype:'werewolf',bloodMoon:true,health:5};
  game.enemies=[boss];
  assert.equal(MM.MapManager.bloodMoon(game),true);
  assert.equal(MM.SaveManager.unlocked(game,70),false);
  assert.equal(MM.MapManager.weapon(game),'gun');
  for(const change of [{dead:true},{dead:false,health:0},{health:5,retired:true},{retired:false,bloodMoon:false}]) {
    Object.assign(boss,change);assert.equal(MM.MapManager.bloodMoon(game),false);
  }
});
