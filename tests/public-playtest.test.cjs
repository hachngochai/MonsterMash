'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const original={campaignSize:150,resume:61,completed:[1,10,20,30,40,50],best:1234,guidesSeen:[1,11,21],
  progression:{version:1,rewards:[10,20,30,40,50],equipped:'bones',lifeKills:7},settings:{difficulty:'hard',sound:true}};
function fixture(search='',hostname='hachngochai.github.io'){
  const scope=vm.createContext({URLSearchParams,location:{hostname,search}});
  for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','tutorial','game'])
    vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
  let bytes=JSON.stringify(original),writes=0;
  const storage={getItem:()=>bytes,setItem(k,v){writes++;bytes=v;}};
  return {MM:scope.MM,scope,storage,read:()=>bytes,writes:()=>writes,
    game:()=>new scope.MM.Game({headless:true,storage})};
}

test('shared public test link unlocks all weapons and skills regardless of version parameter order',()=>{
  for(const search of ['?test=all','?v=4.0.5&test=all','?test=all&v=4.0.5']){
    const f=fixture(search),g=f.game();assert.equal(g.testMode,true);
    assert.deepEqual(Array.from(g.progression.rewards),Array.from(f.MM.SaveManager.milestones));
    assert.deepEqual(Array.from(f.MM.WeaponManager.available(g)),['gun','bones','club','bow','spear','axes','hammer','scythe','lightningOrb','easterEgg','dreamBook']);
    assert.equal(f.MM.Campaign.levels.length,250);assert.equal(f.MM.Campaign.getLevel(250).id,250);
    assert.equal(g.progression.equipped,'gun');assert.equal(g.progression.lifeKills,0);
    assert.deepEqual(Array.from(g.save.completed),original.completed,'unlocked test inventory does not fake ordinary map victories');
    assert.equal(f.writes(),0);
  }
});

test('public normal links and invalid flags retain real progress and equipment',()=>{
  for(const search of ['','?v=4.0.5','?test=off&v=4.0.5','?test=invalid','?contest=all','?test=all-extra']){
    const f=fixture(search),g=f.game();assert.equal(g.testMode,false,search);
    assert.deepEqual(Array.from(g.progression.rewards),original.progression.rewards);
    assert.equal(g.progression.equipped,'bones');assert.equal(g.save.resume,61);
    g.persist();assert.equal(f.writes(),1,'normal game still saves');
  }
});

test('public test map changes, equipment, settings and wins never touch the real save',()=>{
  const f=fixture('?test=all&v=4.0.5'),before=f.read(),g=f.game();
  g.start(150);assert.equal(f.MM.WeaponManager.select(g,'scythe'),true);
  g.settings.difficulty='story';g.settings.sound=false;g.save.guidesSeen.push(141);g.persist();
  f.MM.KeyBindings.set(g,'scytheSwap','KeyQ');f.MM.SaveManager.write(g);
  g.finish(true);g.goHome();
  assert.equal(f.writes(),0);assert.equal(f.read(),before);
  f.scope.location.search='';const restored=f.game();assert.equal(restored.testMode,false);
  assert.equal(restored.save.resume,61);assert.equal(restored.settings.difficulty,'hard');assert.equal(restored.settings.sound,true);
  assert.equal(restored.progression.equipped,'bones');assert.equal(restored.progression.lifeKills,7);
  assert.deepEqual(Array.from(restored.save.completed),original.completed);
  assert.deepEqual(Array.from(restored.save.guidesSeen),original.guidesSeen);
});

test('public test works for new visitors without storage access or existing progress',()=>{
  const f=fixture('?test=all');const g=new f.MM.Game({headless:true,storage:{getItem(){throw Error('disabled');},setItem(){throw Error('must not write');}}});
  assert.equal(g.testMode,true);assert.equal(g.save.resume,1);assert.equal(g.progression.rewards.length,24);
  g.start(250);g.persist();assert.equal(g.screen,'playing');assert.equal(g.level.island,true);
});

test('localhost test=off also works beside version parameters in the browser constructor',async()=>{
  const f=fixture('?v=4.0.5&test=off','127.0.0.1');
  const canvas={getContext:()=>({})};
  f.scope.document={getElementById:()=>canvas,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({setAttribute(){}})};
  f.scope.requestAnimationFrame=()=>0;
  for(const method of ['bind','buildMap','syncSettings','updateUI','resize'])f.MM.Game.prototype[method]=()=>{};
  const normal=new f.MM.Game({storage:f.storage});assert.equal(normal.testMode,false);
  f.scope.location.search='?v=4.0.5';const localTest=new f.MM.Game({storage:f.storage});assert.equal(localTest.testMode,true);
});
