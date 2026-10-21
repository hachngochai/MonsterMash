'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const modules=['abyss-config','underwater-config','middle-sea-config','campaign','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','story','game'];
function load(globals={}){if(globals.document&&!globals.document.getElementById)globals.document.getElementById=()=>null;const c=vm.createContext(globals);for(const file of modules)vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),c);return c.MM;}
function memory(data){let value=JSON.stringify(data||{});return {getItem:()=>value,setItem(key,next){value=next;},read:()=>JSON.parse(value)};}
const plain=value=>JSON.parse(JSON.stringify(value));
const rewards=[10,20,30,40,50,60,70,80,90,100];
const oldSave={version:2,campaignSize:100,resume:100,completed:Array.from({length:100},(_,i)=>i+1),best:48000,progression:{version:1,rewards,equipped:'axes',lifeKills:9},settings:{sound:true,effects:false,difficulty:'hard',controls:'buttons',reducedMotion:true}};
test('four coherent stories cover every released stage once, preserving the original fifty-stage arcs',()=>{
 const {Story,Campaign}=load();assert.equal(Story.stories.length,4);
 for(const story of Story.stories){assert.equal(Story.length(story),story.id===4?20:50);assert.equal(story.arcs.length,5);assert.equal(story.intro.length,2);assert.ok(story.ending.length>150);}
 for(const level of Campaign.levels){const matches=Story.stories.filter(s=>level.id>=s.start&&level.id<=s.end);assert.equal(matches.length,1);assert.equal(Story.forLevel(level.id).id,matches[0].id);}
 assert.equal(Story.forLevel(50).id,1);assert.equal(Story.forLevel(51).id,2);assert.equal(Story.forLevel(100).id,2);
 assert.equal(Story.forLevel(101).id,3);assert.equal(Story.forLevel(150).id,3);
 assert.equal(Story.forLevel(151).id,4);assert.equal(Story.forLevel(170).id,4);assert.equal(Story.get(4).plannedEnd,200);
});
test('story progress counts unique stages inside its own region and chooses the first missing stage',()=>{
 const {Story:S}=load(),first=S.get(1),second=S.get(2);
 assert.equal(S.progress(first,[1,1,2,50,51,100,'3']),3);assert.equal(S.progress(second,[1,50,51,51,100]),2);
 assert.equal(S.nextLevel(first,[1,2,4,50]),3);assert.equal(S.nextLevel(second,[1,2,50]),51);
 assert.equal(S.nextLevel(first,Array.from({length:50},(_,i)=>i+1)),1);
});
test('explicitly starting a new run clears completion and rewards while retaining preferences and best',()=>{
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
test('boss rewards and equipment survive stage transitions and reopening the saved expedition',()=>{
 const MM=load(),storage=memory(oldSave),g=new MM.Game({headless:true,storage,newRun:true});
 g.start(10);g.spawnTimer=10000;const boss=g.spawn('boss');boss.phase='active';g.killEnemy(boss);
 assert.equal(MM.SaveManager.unlocked(g,10),true);assert.equal(MM.WeaponManager.select(g,'bones'),true);
 g.start(11,{carry:true});assert.equal(MM.WeaponManager.current(g),'bones');assert.ok(g.save.completed.length===0,'a boss kill alone does not fabricate cleared map quotas');
 g.finish(true);g.goHome();assert.ok(g.save.completed.includes(11));assert.equal(MM.SaveManager.unlocked(g,10),true);
 const reopened=new MM.Game({headless:true,storage});assert.ok(reopened.save.completed.includes(11));assert.equal(MM.WeaponManager.current(reopened),'bones');assert.ok(reopened.progression.rewards.includes(10));
 const fresh=new MM.Game({headless:true,storage,newRun:true});assert.equal(fresh.save.resume,1);assert.deepEqual(plain(fresh.save.completed),[]);assert.equal(MM.WeaponManager.current(fresh),'gun');assert.deepEqual(plain(fresh.progression.rewards),[]);
});
test('entering the second story starts at51 with no rewards automatically granted',()=>{
 const MM=load(),g=new MM.Game({headless:true,storage:memory(oldSave),newRun:true});g.start(MM.Story.get(2).start);
 assert.equal(g.level.id,51);assert.equal(g.selectedStory,2);assert.deepEqual(plain(g.progression.rewards),[]);assert.equal(MM.WeaponManager.current(g),'gun');
});
test('released story endings carry the run forward and the first ocean chapter returns to its map',()=>{
 const MM=load(),g=new MM.Game({headless:true,storage:memory(),newRun:true});
 const node=()=>({textContent:''});g.ui={};for(const id of ['result-kicker','result-title','result-description','result-primary'])g.ui[id]=node();
 g.ui['story-dialog']={showModal(){this.open=true;}};
 g.start(49);g.screen='won';g.ui['result-title'].textContent='Unchanged';MM.StoryUI.result(g);assert.equal(g.ui['result-title'].textContent,'Unchanged');
 g.start(50);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-title'].textContent,MM.Story.get(1).name);assert.equal(g.ui['result-description'].textContent,MM.Story.get(1).ending);
 g.resultAction();assert.equal(g.selectedStory,2);assert.equal(g.storyLaunch.level,51);assert.equal(g.storyLaunch.options.carry,true);assert.equal(g.ui['story-dialog'].open,true);
 g.start(100);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-description'].textContent,MM.Story.get(2).ending);g.resultAction();assert.equal(g.selectedStory,3);assert.equal(g.storyLaunch.level,101);assert.equal(g.storyLaunch.options.carry,true);
 g.start(150);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-description'].textContent,MM.Story.get(3).ending);g.resultAction();assert.equal(g.selectedStory,4);assert.equal(g.storyLaunch.level,151);assert.equal(g.storyLaunch.options.carry,true);
 g.start(160);g.screen='won';g.ui['result-title'].textContent='Keep playing';MM.StoryUI.result(g);assert.equal(g.ui['result-title'].textContent,'Keep playing');
 g.start(170);g.screen='won';MM.StoryUI.result(g);assert.equal(g.ui['result-description'].textContent,MM.Story.get(4).ending);assert.equal(g.ui['result-kicker'].textContent,'HOÀN THÀNH CHẶNG HIỆN TẠI');g.resultAction();assert.equal(g.screen,'home');
});
test('new runs remain playable when browser storage is denied',()=>{
 const MM=load(),storage={getItem(){throw new Error('private');},setItem(){throw new Error('private');}};
 const g=new MM.Game({headless:true,storage,newRun:true});g.start(1);g.update(.016);assert.equal(g.screen,'playing');assert.equal(g.level.id,1);assert.deepEqual(plain(g.progression.rewards),[]);
});

test('each land has exactly five independent treasure sites tied to its boss rewards',()=>{
 const {Story:S}=load();
 assert.deepEqual(plain(S.milestones(S.get(1)).map(m=>m.level)),[10,20,30,40,50]);
 assert.deepEqual(plain(S.milestones(S.get(2)).map(m=>m.level)),[60,70,80,90,100]);
 assert.deepEqual(plain(S.milestones(S.get(3)).map(m=>m.level)),[110,120,130,140,150]);
 assert.deepEqual(plain(S.milestones(S.get(4)).map(m=>m.level)),[160,170,180,190,200]);
 assert.deepEqual(plain(S.milestones(S.get(4),[160,170,200]).map(m=>[m.available,m.mark])),[[true,'O'],[true,'O'],[false,'X'],[false,'X'],[false,'X']]);
 const first=S.milestones(S.get(1),[10,30,30,60,100]),second=S.milestones(S.get(2),[10,30,60,100]);
 assert.deepEqual(plain(first.map(m=>m.mark)),['O','X','O','X','X']);
 assert.deepEqual(plain(second.map(m=>m.mark)),['O','X','X','X','O']);
});

test('each released boss has nine preceding dots and planned ocean bosses do not create playable stages',()=>{
 const {Story:S}=load(),routes=S.stories.map(s=>S.trail(s));
 for(let i=0;i<routes.length;i++){
  const route=routes[i],story=S.stories[i],count=story.id===4?18:45;assert.equal(route.dots.length,count);assert.equal(route.bosses.length,5);
  assert.deepEqual(plain(route.dots.map(d=>d.level)),Array.from({length:S.length(story)},(_,n)=>story.start+n).filter(level=>level%10!==0));
  assert.equal(new Set(route.dots.map(d=>d.x+':'+d.y)).size,count);
  for(const dot of route.dots){assert.ok(dot.x>0&&dot.x<1000);assert.ok(dot.y>0&&dot.y<400);}
 }
 const relative=route=>route.bosses.map(([x,y])=>[x-route.bosses[0][0],y-route.bosses[0][1]]);
 assert.notDeepEqual(plain(relative(routes[0])),plain(relative(routes[1])));
});

test('a real boss defeat circles its treasure site before the quota, persists on entry and clears only for an explicit new run',()=>{
 const MM=load(),storage=memory(),g=new MM.Game({headless:true,storage,newRun:true}),story=MM.Story.get(1);
 const mark=game=>MM.Story.milestones(story,game.progression.rewards)[0].mark;
 g.start(10);assert.equal(mark(g),'X');g.spawnTimer=10000;
 const ordinary=g.spawn('skeleton');g.killEnemy(ordinary);assert.equal(mark(g),'X');
 const boss=g.spawn('boss');boss.phase='active';g.killEnemy(boss);assert.equal(mark(g),'O');assert.equal(g.save.completed.includes(10),false);
 g.goHome();assert.equal(mark(g),'O');assert.equal(MM.Story.milestones(story,g.progression.rewards)[1].mark,'X');
 const reopened=new MM.Game({headless:true,storage});assert.equal(mark(reopened),'O');
 const fresh=new MM.Game({headless:true,storage,newRun:true});assert.equal(mark(fresh),'X');
});

test('ocean atlas uses its own region and progress denominator, keeping future milestones disabled',()=>{
 const node=dataset=>({dataset,attrs:{},textContent:'',classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},getAttribute(k){return this.attrs[k];},querySelector(){return this.symbol||(this.symbol={textContent:''});}});
 const map=node({}),pages=[1,2,3,4].map(id=>node({atlasPage:'chapter'+id})),regions=['surface','abyss','ocean'].map(atlasRegion=>node({atlasRegion}));
 const document={querySelector:()=>map,querySelectorAll:query=>query==='[data-atlas-page]'?pages:query==='[data-atlas-region]'?regions:[]};
 const {StoryUI}=load({document}),g={selectedStory:4,headless:false,ui:{},save:{completed:[151,152,160]},progression:{rewards:[]}};
 for(const id of ['save-label','story-progress-4','atlas-page-count','atlas-previous','atlas-next'])g.ui[id]=node({});
 for(const id of [160,170,180,190,200])g.ui['atlas-boss-'+id]=node({});
 StoryUI.sync(g);
 assert.match(g.ui['story-progress-4'].textContent,/1\/2 boss · 3\/20 màn/);assert.match(g.ui['save-label'].textContent,/151—170 · 3\/20/);assert.match(g.ui['save-label'].textContent,/171–200 SẮP MỞ/);assert.equal(g.ui['atlas-page-count'].textContent,'04 / 04');
 pages.forEach((page,i)=>assert.equal('hidden' in page.attrs,i!==3));regions.forEach((region,i)=>assert.equal('hidden' in region.attrs,i!==2));
 assert.equal(g.ui['atlas-boss-160'].disabled,false);assert.equal(g.ui['atlas-boss-160'].symbol.textContent,'O');
 assert.equal(g.ui['atlas-boss-170'].disabled,false);
 for(const id of [180,190,200]){assert.equal(g.ui['atlas-boss-'+id].disabled,true);assert.match(g.ui['atlas-boss-'+id].attrs['aria-label'],/Chưa mở/);}
 assert.equal(g.ui['atlas-next'].disabled,true);assert.equal(g.ui['atlas-previous'].disabled,false);
});

test('ocean page follows the third story through swipe and includes the150→151→160 entrance',()=>{
 const listeners={},map={addEventListener(name,fn){listeners[name]=fn;},setPointerCapture(){},hasPointerCapture:()=>false};
 const {Story:S,StoryUI}=load({document:{querySelector:()=>map}}),g={screen:'home',selectedStory:3,settings:{reducedMotion:true},updateUI(){},buildMap(){}};
 StoryUI.bindSwipe(g,map);
 const event=x=>({clientX:x,clientY:100,pointerId:1,pointerType:'touch',isPrimary:true,cancelable:true,preventDefault(){},target:{closest:()=>null}});
 const swipe=()=>{listeners.pointerdown(event(300));listeners.pointermove(event(200));listeners.pointerup(event(200));};
 swipe();assert.equal(g.selectedStory,4);swipe();assert.equal(g.selectedStory,4);
 assert.deepEqual(plain(S.crossingRoutes.at(-1)),{from:150,entrance:151,to:160,outStory:3,inStory:4,outPath:'M460 315C520 380 840 385 925 300',inPath:'M70 155C95 120 110 120 125 130Q180 105 295 195'});
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/id="atlas-ocean-dots"/);assert.match(html,/data-atlas-region="ocean"/);assert.match(html,/data-route-from="150" data-route-entry="151" data-route-to="160"/);
 assert.equal((html.match(/data-story-choice=/g)||[]).length,4);assert.equal((html.match(/data-boss-marker=/g)||[]).length,20);
 for(const id of [180,190,200])assert.match(html,new RegExp('id="atlas-boss-'+id+'"[^>]+disabled'));
});
