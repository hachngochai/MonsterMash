'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const plain=value=>JSON.parse(JSON.stringify(value));
function managers(cosmic=true){
  const scope=vm.createContext({});
  const names=cosmic?['cosmic-config','cosmic-balance','save-manager','boss-manager']:['save-manager','boss-manager'];
  for(const name of names)vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),scope,{filename:name});
  return scope.MM;
}
function fixture(MM,level=250){
  return {level:{id:level},enemies:[],bossDefeated:true,save:{completed:[],resume:level,best:72},
    progression:MM.SaveManager.normalize({}),writes:0,persist(){this.writes++;},toast(){}};
}
const deadBoss=()=>({boss:true,dead:true,health:0});

test('all eleven new rewards persist once and survive reload without altering old equipment',()=>{
  const MM=managers(),g=fixture(MM);g.progression.rewards=[10,90];g.progression.equipped='spear';
  for(let level=250;level<=350;level+=10){
    g.level.id=level;const enemy=deadBoss();g.enemies=[enemy];
    assert.equal(MM.BossManager.onDefeated(g,enemy),true);
    assert.equal(MM.BossManager.onDefeated(g,enemy),false);
    const reloaded=MM.SaveManager.normalize(plain(g.save));
    assert.ok(reloaded.rewards.includes(level));assert.equal(reloaded.equipped,'spear');
  }
  assert.equal(g.writes,11);assert.equal(g.save.best,72);assert.equal(g.progression.rewards.length,13);
});

test('new rewards require final boss death and cannot be inferred from current planet or resume',()=>{
  const MM=managers();
  for(let level=250;level<=350;level+=10){
    const g=fixture(MM,level);g.save.currentPlanet='blackHole';g.save.resume=350;
    const boss={boss:true,dead:false,health:1};g.enemies=[boss];
    assert.equal(MM.BossManager.onDefeated(g,boss),false);
    boss.dead=true;boss.health=0;g.bossDefeated=false;
    assert.equal(MM.BossManager.onDefeated(g,boss),false);
    g.bossDefeated=true;g.enemies.push({boss:true,dead:false,health:1});
    assert.equal(MM.BossManager.onDefeated(g,boss),false);
    assert.deepEqual(plain(MM.SaveManager.normalize(g.save).rewards),[]);
  }
});

test('cosmic metadata derives highest completed map and planet from validated campaign progress',()=>{
  const MM=managers(),snapshot=MM.SaveManager.cosmicSnapshot({completed:[1,250,260,260,NaN,'350',351],resume:261,maxMap:350,currentPlanet:'blackHole'});
  assert.deepEqual(plain(snapshot),{maxMap:260,currentPlanet:'venus',nextPlanet:'mars',cosmicJourney:null,cosmicTransitions:[]});
  assert.equal(MM.SaveManager.cosmicSnapshot({completed:[],resume:1}).currentPlanet,null);
  assert.equal(MM.SaveManager.cosmicSnapshot({completed:[350],resume:350}).nextPlanet,null);
});

test('each valid UFO route retains flight and arrival separately across normalization',()=>{
  const MM=managers();
  for(let from=250;from<=340;from+=10){
    const raw={completed:[from],resume:from+1,cosmicJourney:{from,to:from+1,state:'in-flight',extra:'discard'}};
    const flying=MM.SaveManager.cosmicSnapshot(raw);
    assert.deepEqual(plain(flying.cosmicJourney),{from,to:from+1,state:'in-flight'});
    assert.deepEqual(plain(flying.cosmicTransitions),[]);
    const arrived=MM.SaveManager.cosmicSnapshot({...raw,cosmicJourney:{from,to:from+1,state:'arrived'}});
    assert.deepEqual(plain(arrived.cosmicTransitions),[from]);
    assert.deepEqual(plain(MM.SaveManager.cosmicSnapshot({...raw,...arrived})),plain(arrived));
  }
});

test('invalid and unearned journey records never unlock a transition or reward',()=>{
  const MM=managers();
  for(const journey of [null,[],{from:250,to:261,state:'arrived'},{from:251,to:252,state:'arrived'},
    {from:350,to:351,state:'arrived'},{from:250,to:251,state:'done'},
    {from:250,to:251,state:'in-flight'},{from:'250',to:251,state:'arrived'}]){
    const snapshot=MM.SaveManager.cosmicSnapshot({completed:[],resume:251,cosmicJourney:journey,cosmicTransitions:[250,260,350,'250']});
    assert.equal(snapshot.cosmicJourney,null);assert.deepEqual(plain(snapshot.cosmicTransitions),[]);
  }
  const snapshot=MM.SaveManager.cosmicSnapshot({completed:[250,260],resume:261,cosmicTransitions:[260,250,260,261,350]});
  assert.deepEqual(plain(snapshot.cosmicTransitions),[250,260]);
});

test('normalizing cosmic metadata leaves the legacy progression schema unchanged',()=>{
  const MM=managers(),old=managers(false),input={rewards:[10,90,250,260],equipped:'spear',lifeKills:7};
  assert.deepEqual(plain(MM.SaveManager.normalize(input)),{version:1,rewards:[10,90,250,260],equipped:'spear',lifeKills:7});
  assert.deepEqual(plain(old.SaveManager.cosmicSnapshot({completed:[250],resume:251})),{});
  assert.deepEqual(plain(old.SaveManager.normalize(input)),{version:1,rewards:[10,90],equipped:'spear',lifeKills:7});
});

test('writes retain journey metadata while preserving runtime progression references',()=>{
  const MM=managers(),g=fixture(MM,261);g.save.completed=[250,260];g.save.resume=261;
  g.save.cosmicJourney={from:260,to:261,state:'arrived'};g.progression.rewards=[10,250,260];
  const progression=g.progression;MM.SaveManager.write(g);
  assert.equal(g.progression,progression);assert.equal(g.save.progression,progression);
  assert.deepEqual(plain(g.save.cosmicJourney),{from:260,to:261,state:'arrived'});
  assert.deepEqual(plain(g.save.cosmicTransitions),[260]);assert.equal(g.save.currentPlanet,'venus');
  assert.equal(g.save.maxMap,260);assert.equal(g.save.best,72);assert.equal(g.writes,1);
});
