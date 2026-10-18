'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const modules=['campaign','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','story','game'];
function load(){const c=vm.createContext({});for(const file of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),c);return c.MM;}
function memory(data){let value=JSON.stringify(data||{});return {getItem:()=>value,setItem(key,next){value=next;},read:()=>JSON.parse(value)};}
const plain=value=>JSON.parse(JSON.stringify(value));
const rewards=[10,20,30,40,50,60,70,80,90,100];
const oldSave={version:2,campaignSize:100,resume:100,completed:Array.from({length:100},(_,i)=>i+1),best:48000,progression:{version:1,rewards,equipped:'axes',lifeKills:9},settings:{sound:true,effects:false,difficulty:'hard',controls:'buttons',reducedMotion:true}};
test('two coherent stories cover every current stage once, in fifty-stage arcs',()=>{
 const {Story,Campaign}=load();assert.equal(Story.stories.length,2);
 for(const story of Story.stories){assert.equal(story.end-story.start+1,50);assert.equal(story.arcs.length,5);assert.equal(story.intro.length,2);assert.ok(story.ending.length>150);}
 for(const level of Campaign.levels){const matches=Story.stories.filter(s=>level.id>=s.start&&level.id<=s.end);assert.equal(matches.length,1);assert.equal(Story.forLevel(level.id).id,matches[0].id);}
 assert.equal(Story.forLevel(50).id,1);assert.equal(Story.forLevel(51).id,2);assert.equal(Story.forLevel(100).id,2);
});
test('story progress counts unique stages inside its own region and chooses the first missing stage',()=>{
 const {Story:S}=load(),first=S.get(1),second=S.get(2);
 assert.equal(S.progress(first,[1,1,2,50,51,100,'3']),3);assert.equal(S.progress(second,[1,50,51,51,100]),2);
 assert.equal(S.nextLevel(first,[1,2,4,50]),3);assert.equal(S.nextLevel(second,[1,2,50]),51);
 assert.equal(S.nextLevel(first,Array.from({length:50},(_,i)=>i+1)),1);
});
test('opening a new run removes every old map completion and reward while retaining preferences and best',()=>{
 const MM=load(),storage=memory(oldSave),g=new MM.Game({headless:true,storage,newRun:true});
 assert.equal(g.level.id,1);assert.equal(g.save.resume,1);assert.deepEqual(plain(g.save.completed),[]);
 assert.deepEqual(plain(g.progression),{version:1,rewards:[],equipped:'gun',lifeKills:0});
 assert.equal(g.shieldCount,0);assert.equal(g.totalKills,0);assert.equal(g.score,0);assert.equal(g.skillState.darkReady,false);
 assert.deepEqual(plain(MM.WeaponManager.available(g)),['gun']);assert.equal(g.save.best,48000);
 assert.equal(g.settings.difficulty,'hard');assert.equal(g.settings.controls,'buttons');assert.equal(g.settings.sound,true);
 assert.deepEqual(storage.read().completed,[]);assert.deepEqual(storage.read().progression.rewards,[]);
});
test('completed legacy saves cannot migrate rewards back into a fresh run',()=>{
 const MM=load(),storage=memory({...oldSave,progression:undefined});
 const g=new MM.Game({headless:true,storage,newRun:true});
 for(const milestone of rewards)assert.equal(MM.SaveManager.unlocked(g,milestone),false);
 assert.equal(g.save.resume,1);assert.deepEqual(storage.read().completed,[]);
});
test('a run keeps its actual boss rewards and weapon across stage transitions, but the next page entry resets them',()=>{
 const MM=load(),storage=memory(oldSave),g=new MM.Game({headless:true,storage,newRun:true});
 g.start(10);g.spawnTimer=10000;const boss=g.spawn('boss');boss.phase='active';g.killEnemy(boss);
 assert.equal(MM.SaveManager.unlocked(g,10),true);assert.equal(MM.WeaponManager.select(g,'bones'),true);
 g.start(11,{carry:true});assert.equal(MM.WeaponManager.current(g),'bones');assert.ok(g.save.completed.length===0,'a boss kill alone does not fabricate cleared map quotas');
 g.finish(true);g.goHome();assert.ok(g.save.completed.includes(11));assert.equal(MM.SaveManager.unlocked(g,10),true);
 const reopened=new MM.Game({headless:true,storage,newRun:true});assert.equal(reopened.save.resume,1);assert.deepEqual(plain(reopened.save.completed),[]);assert.equal(MM.WeaponManager.current(reopened),'gun');assert.deepEqual(plain(reopened.progression.rewards),[]);
});
test('entering the second story starts at51 with no rewards automatically granted',()=>{
 const MM=load(),g=new MM.Game({headless:true,storage:memory(oldSave),newRun:true});g.start(MM.Story.get(2).start);
 assert.equal(g.level.id,51);assert.equal(g.selectedStory,2);assert.deepEqual(plain(g.progression.rewards),[]);assert.equal(MM.WeaponManager.current(g),'gun');
});
test('story endings appear only at fifty-stage boundaries and carry the current run into the next tale',()=>{
 const MM=load(),g=new MM.Game({headless:true,storage:memory(),newRun:true});
 const node=()=>({textContent:''});g.ui={};for(const id of ['result-kicker','result-title','result-description','result-primary'])g.ui[id]=node();
 g.ui['story-dialog']={showModal(){this.open=true;}};
 g.start(49);g.screen='won';g.ui['result-title'].textContent='Unchanged';MM.StoryUI.result(g);assert.equal(g.ui['result-title'].textContent,'Unchanged');
 g.start(50);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-title'].textContent,MM.Story.get(1).name);assert.equal(g.ui['result-description'].textContent,MM.Story.get(1).ending);
 g.resultAction();assert.equal(g.selectedStory,2);assert.equal(g.storyLaunch.level,51);assert.equal(g.storyLaunch.options.carry,true);assert.equal(g.ui['story-dialog'].open,true);
 g.start(100);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-description'].textContent,MM.Story.get(2).ending);g.resultAction();assert.equal(g.screen,'home');
});
test('new runs remain playable when browser storage is denied',()=>{
 const MM=load(),storage={getItem(){throw new Error('private');},setItem(){throw new Error('private');}};
 const g=new MM.Game({headless:true,storage,newRun:true});g.start(1);g.update(.016);assert.equal(g.screen,'playing');assert.equal(g.level.id,1);assert.deepEqual(plain(g.progression.rewards),[]);
});

test('each land has exactly five independent treasure sites tied to its boss rewards',()=>{
 const {Story:S}=load();
 assert.deepEqual(plain(S.milestones(S.get(1)).map(m=>m.level)),[10,20,30,40,50]);
 assert.deepEqual(plain(S.milestones(S.get(2)).map(m=>m.level)),[60,70,80,90,100]);
 const first=S.milestones(S.get(1),[10,30,30,60,100]),second=S.milestones(S.get(2),[10,30,60,100]);
 assert.deepEqual(plain(first.map(m=>m.mark)),['O','X','O','X','X']);
 assert.deepEqual(plain(second.map(m=>m.mark)),['O','X','X','X','O']);
});

test('each treasure route has nine normal stages before every boss and different island layouts',()=>{
 const {Story:S}=load(),routes=S.stories.map(s=>S.trail(s));
 for(let i=0;i<routes.length;i++){
  const route=routes[i],story=S.stories[i];assert.equal(route.dots.length,45);assert.equal(route.bosses.length,5);
  assert.deepEqual(plain(route.dots.map(d=>d.level)),Array.from({length:50},(_,n)=>story.start+n).filter(level=>level%10!==0));
  assert.equal(new Set(route.dots.map(d=>d.x+':'+d.y)).size,45);
  for(const dot of route.dots){assert.ok(dot.x>0&&dot.x<1000);assert.ok(dot.y>0&&dot.y<400);}
 }
 const relative=route=>route.bosses.map(([x,y])=>[x-route.bosses[0][0],y-route.bosses[0][1]]);
 assert.notDeepEqual(plain(relative(routes[0])),plain(relative(routes[1])));
});

test('a real boss defeat circles its treasure site before the remaining map quota and a new entry restores X',()=>{
 const MM=load(),storage=memory(),g=new MM.Game({headless:true,storage,newRun:true}),story=MM.Story.get(1);
 const mark=game=>MM.Story.milestones(story,game.progression.rewards)[0].mark;
 g.start(10);assert.equal(mark(g),'X');g.spawnTimer=10000;
 const ordinary=g.spawn('skeleton');g.killEnemy(ordinary);assert.equal(mark(g),'X');
 const boss=g.spawn('boss');boss.phase='active';g.killEnemy(boss);assert.equal(mark(g),'O');assert.equal(g.save.completed.includes(10),false);
 g.goHome();assert.equal(mark(g),'O');assert.equal(MM.Story.milestones(story,g.progression.rewards)[1].mark,'X');
 const reopened=new MM.Game({headless:true,storage,newRun:true});assert.equal(mark(reopened),'X');
});
