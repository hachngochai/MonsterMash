'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const scope=vm.createContext({});vm.runInContext(fs.readFileSync('js/chapter-transition.js','utf8'),scope);let clearCount=0;
 const ui=Object.fromEntries(['cinematic-skip','result-overlay','home-overlay','stage-banner','toast'].map(id=>[id,{hidden:id==='cinematic-skip'}]));
 const g={screen:'playing',settings:{reducedMotion:false},level:{id:150,underwater:false},ui,player:{x:400,y:438,w:38,h:54,health:5,ammo:7,swimming:false},
  save:{completed:[50,100,150]},underwater:{oxygen:23},score:123,levelTime:17,time:23,clearInputs(){clearCount++;}};
 return {MM:scope.MM,g,scope,clearCount:()=>clearCount};
}
function context(){const calls=[],target={globalAlpha:1,globalCompositeOperation:'source-over'};
 const c=new Proxy(target,{get(obj,key){if(key in obj)return obj[key];if(String(key).startsWith('create'))return ()=>({addColorStop(){}});return (...args)=>calls.push([key,...args]);},set(obj,key,value){obj[key]=value;return true;}});return {c,calls};}
function gameFixture(level){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','merfolk','lightning-orb','chapter-transition','game'])
  vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name+'.js'});
 let writes=0;const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){writes++;}},random:()=>.5});g.start(level);g.canvas={};g.ui={'cinematic-skip':{hidden:true}};return {g,MM,writes:()=>writes};
}
function tick(g,seconds){for(let remaining=seconds;remaining>1e-8;){const dt=Math.min(.05,remaining);g.update(dt);remaining-=dt;}}

test('chapter passages accept only the four known kinds and prevent overlapping callbacks',()=>{
 for(const [kind,want] of [[50,'forest'],[100,'cave'],[150,'whirlpool'],[200,'ending'],['forest','forest']]){const {g,MM,clearCount}=fixture();
  assert.equal(MM.ChapterTransition.begin(g,kind,()=>{}),true);assert.equal(g.cinematic.kind,want);assert.equal(g.screen,'cinematic');assert.equal(clearCount(),1);
  assert.equal(g.ui['cinematic-skip'].hidden,false);for(const id of ['result-overlay','home-overlay','stage-banner','toast'])assert.equal(g.ui[id].hidden,true);
  assert.equal(MM.ChapterTransition.begin(g,'cave',()=>assert.fail('nested callback')),false);}
 const {g,MM}=fixture();assert.equal(MM.ChapterTransition.begin(g,'unknown'),false);assert.equal(g.screen,'playing');assert.equal(g.cinematic,undefined);
});
test('normal passages last five seconds, the ending eleven and reduced motion exactly1.2 seconds',()=>{
 for(const [kind,reduced,duration] of [['forest',false,5],['cave',false,5],['whirlpool',false,5],['ending',false,11],['forest',true,1.2],['ending',true,1.2]]){
  const {g,MM}=fixture();g.settings.reducedMotion=reduced;let done=0;MM.ChapterTransition.begin(g,kind,()=>{done++;assert.equal(g.screen,'playing');assert.equal(g.cinematic,null);});
  assert.equal(g.cinematic.duration,duration);MM.ChapterTransition.update(g,duration-.001);assert.equal(done,0);MM.ChapterTransition.update(g,.001);assert.equal(done,1);
  assert.equal(MM.ChapterTransition.update(g,100),false);assert.equal(MM.ChapterTransition.skip(g),false);assert.equal(g.ui['cinematic-skip'].hidden,true);}
});
test('skipping finishes once, preserves inventory and oxygen, and restores the previous screen before the callback',()=>{
 const {g,MM}=fixture();g.screen='won';const before=JSON.stringify({player:g.player,save:g.save,underwater:g.underwater,score:g.score,time:g.time,levelTime:g.levelTime});let done=0;
 MM.ChapterTransition.begin(g,'whirlpool',()=>{done++;assert.equal(g.screen,'won');});MM.ChapterTransition.update(g,.8);assert.equal(MM.ChapterTransition.skip(g),true);assert.equal(done,1);
 assert.equal(MM.ChapterTransition.skip(g),false);assert.equal(JSON.stringify({player:g.player,save:g.save,underwater:g.underwater,score:g.score,time:g.time,levelTime:g.levelTime}),before);
});
test('drawing every passage and ending phase only paints actor copies and never modifies gameplay state',()=>{
 const {g,MM}=fixture(),{c,calls}=context(),actors=[];MM.Renderer={drawHunter(c,actor){actors.push(actor);}};
 MM.UnderwaterRenderer={drawBackground(){return false;},drawEnemy(c,game,actor){actors.push(actor);return true;}};
 g.endingBoss={archetype:'kraken',x:650,y:400,w:390,h:360,health:0,dead:true,krakenStone:true};
 for(const kind of ['forest','cave','whirlpool','ending']){MM.ChapterTransition.begin(g,kind,()=>{});for(const fraction of [0,.15,.4,.6,.85,.99]){g.cinematic.time=g.cinematic.duration*fraction;const before=JSON.stringify(g);assert.equal(MM.ChapterTransition.draw(c,g),true);assert.equal(JSON.stringify(g),before);}MM.ChapterTransition.skip(g);}
 assert.ok(actors.length>12);assert.ok(actors.every(actor=>actor!==g.player&&actor!==g.endingBoss));assert.equal(g.endingBoss.dead,true);assert.equal(g.endingBoss.health,0);assert.ok(calls.some(([key])=>key==='fillText'));
 assert.equal(MM.ChapterTransition.draw(c,g),false);
});
test('the real Game freezes combat and oxygen during each chapter passage and starts the next map only once',()=>{
 for(const [from,kind] of [[50,'forest'],[100,'cave'],[150,'whirlpool']]){const {g,writes}=gameFixture(from);g.screen='won';g.player.ammo=7;g.levelTime=12;const oxy=g.underwater.oxygen,time=g.time;
  const count=writes();g.start(from+1,{carry:true});assert.equal(g.screen,'cinematic');assert.equal(g.cinematic.kind,kind);assert.equal(g.level.id,from);assert.equal(writes(),count);
  tick(g,4.99);assert.equal(g.level.id,from);assert.equal(g.levelTime,12);assert.equal(g.time,time);assert.equal(g.underwater.oxygen,oxy);assert.equal(g.player.ammo,7);
  tick(g,.01);assert.equal(g.level.id,from+1);assert.equal(g.screen,'playing');assert.equal(g.cinematic,null);assert.equal(g.save.resume,from+1);assert.equal(writes(),count+1);}
});
test('Escape, Enter and Space skip a real passage without activating movement, shield or weapon actions',()=>{
 for(const code of ['Escape','Enter','Space']){const {g}=gameFixture(150);g.screen='won';g.shieldCount=2;g.start(151,{carry:true});let prevented=0;
  g.keyDown({code,repeat:false,preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(g.level.id,151);assert.equal(g.screen,'playing');assert.equal(g.shieldCount,2);assert.equal(g.player.shieldTime,0);assert.equal(g.keys.size,0);}
});
test('the real final ending preserves completed200 before playing, freezes timers and returns the hunter to land',()=>{
 const {g,MM,writes}=gameFixture(200);g.endingBoss={archetype:'kraken',w:390,h:360,x:650,y:400};g.levelTime=34;g.underwater.oxygen=8;g.finish(true);
 assert.equal(g.screen,'cinematic');assert.equal(g.cinematic.kind,'ending');assert.equal(g.save.completed.includes(200),true);const count=writes(),time=g.time;
 tick(g,10.99);assert.equal(g.screen,'cinematic');assert.equal(g.levelTime,34);assert.equal(g.time,time);assert.equal(g.underwater.oxygen,8);assert.equal(writes(),count);
 tick(g,.01);assert.equal(g.screen,'won');assert.equal(g.endingOnLand,true);assert.equal(g.player.swimming,false);assert.equal(g.player.merfolkTime,0);assert.equal(g.cinematic,null);assert.equal(writes(),count);
 assert.equal(MM.ChapterTransition.skip(g),false);
});
