'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const plain=value=>JSON.parse(JSON.stringify(value));
function load(globals={}){const c=vm.createContext(globals);for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','story'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),c);return c.MM;}
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('Ancient Abyss appends fifty stages and keeps the complete original campaign data byte-equivalent',()=>{
 const {Campaign:C,AbyssConfig:A,UnderwaterConfig:U,MiddleSeaConfig:M,PredatorSeaConfig:P,DeepSeaConfig:D,FinalSeaConfig:F}=load();
 assert.equal(C.levels.length,200);assert.equal(C.worlds.length,20);
 assert.equal(digest(C.levels.slice(0,100)),'7f358a02560c1a124f2c3ddd2fb386882d714d303a9dabb5bee4c7b504b30818');
 assert.equal(digest(C.worlds.slice(0,10)),'3f6f6bbfcbe769938c4557b2b4b5817732a73ec2aa15792b9a9fd98d077e8b78');
 const appended=new Set([...Object.keys(A.enemies),...Object.keys(A.bosses),...Object.keys(U.enemies),...Object.keys(M.enemies),...Object.keys(P.enemies),...Object.keys(D.enemies),...Object.keys(F.enemies)]);
 assert.equal(digest(Object.fromEntries(Object.entries(C.enemyTypes).filter(([key])=>!appended.has(key)))),'7696fa212370f4b2bf051ede030c9939de958d7aa58f355297c30ed7e61b7206');
 assert.deepEqual(plain(C.levels.map(level=>level.id)),Array.from({length:200},(_,i)=>i+1));
});

test('the five underground worlds have distinct scenery, ten named stages and their own final boss',()=>{
 const {Campaign:C}=load();
 const bosses=['minotaurLord','flowerDemon','mirrorTurtle','fossilRoc','thousandHands'];
 for(let n=0;n<5;n++){
  const world=C.worlds[n+10],levels=C.levels.filter(level=>level.world===world.id);
  assert.equal(world.scenery,n+10);assert.equal(levels.length,10);assert.equal(new Set(levels.map(level=>level.name)).size,10);
  assert.equal(levels.filter(level=>level.boss).length,1);assert.equal(levels[9].bossArchetype,bosses[n]);
  assert.ok(levels.every(level=>level.abyss&&level.story.length>45&&level.layout&&level.tutorial));
  assert.ok(new Set(levels.map(level=>level.spawnInterval)).size>4);assert.ok(levels[4].recovery);
  for(const level of levels)for(const type of level.types)assert.ok(C.enemyTypes[type],type);
 }
});

test('traps and new regular enemies follow the requested introduction schedule',()=>{
 const {Campaign:C}=load(),has=(id,name)=>C.getLevel(id).hazardTypes.includes(name);
 assert.equal(has(103,'mushroom'),false);assert.equal(has(104,'mushroom'),true);assert.equal(has(105,'stalactite'),false);assert.equal(has(106,'stalactite'),true);
 assert.ok(C.getLevel(112).types.includes('minotaurCalf'));assert.equal(C.getLevel(112).types.includes('parasite'),false);assert.ok(C.getLevel(113).types.includes('parasite'));
 assert.ok(has(116,'spore'));assert.deepEqual(plain(C.getLevel(121).hazardTypes),[]);assert.equal(has(123,'crystalSpirit'),false);assert.ok(has(124,'crystalSpirit'));assert.ok(has(126,'icicle'));
 assert.equal(has(133,'rollingStone'),false);assert.ok(has(134,'rollingStone'));assert.equal(C.getLevel(135).types.includes('lanternSkeleton'),false);assert.ok(C.getLevel(136).types.includes('lanternSkeleton'));
 assert.equal(C.getLevel(143).types.includes('ancientHand'),false);assert.ok(C.getLevel(144).types.includes('ancientHand'));assert.equal(C.getLevel(145).types.includes('tombSpirit'),false);assert.ok(C.getLevel(146).types.includes('tombSpirit'));assert.ok(has(148,'tombPulse'));
});

test('new enemy and boss factories use centralized health and exact model dimensions',()=>{
 const {Campaign:C,AbyssConfig:A}=load();
 for(const [key,stats] of Object.entries(A.enemies)){
  const enemy=C.createEnemy(key,101,'normal',-1,()=>.5);
  assert.equal(enemy.archetype,key);assert.equal(enemy.w,stats.w);assert.equal(enemy.h,stats.h);assert.equal(enemy.health,stats.health);assert.ok(Number.isFinite(enemy.speed));
 }
 for(const id of [110,120,130,140,150]){
  const level=C.getLevel(id),enemy=C.createEnemy('boss',id,'normal',1,()=>.5),stats=A.bosses[level.bossArchetype];
  assert.equal(enemy.archetype,level.bossArchetype);assert.equal(enemy.health,stats.health);assert.equal(enemy.w,stats.w);assert.equal(enemy.h,stats.h);assert.ok(enemy.bossSkills.length>=3);
 }
});

test('four stories cover the expanded campaign and keep both original trail layouts',()=>{
 const {Story:S,Campaign:C}=load();assert.equal(S.stories.length,4);
 for(const story of S.stories){assert.equal(story.end-story.start+1,50);assert.equal(story.arcs.length,5);assert.equal(story.intro.length,2);assert.ok(story.ending.length>150);}
 for(const level of C.levels)assert.equal(S.stories.filter(story=>level.id>=story.start&&level.id<=story.end).length,1);
 assert.deepEqual(plain(S.trail(S.get(1)).bosses),[[150,208],[260,180],[360,236],[290,320],[160,308]]);
 assert.deepEqual(plain(S.trail(S.get(2)).bosses),[[650,185],[850,165],[790,265],[620,280],[880,315]]);
 const trail=S.trail(S.get(3));assert.equal(trail.dots.length,45);assert.equal(trail.bosses.length,5);
 assert.deepEqual(plain(trail.dots.map(dot=>dot.level)),Array.from({length:50},(_,i)=>i+101).filter(id=>id%10!==0));
 assert.deepEqual(plain(S.milestones(S.get(3),[110,130,150]).map(mark=>mark.mark)),['O','X','O','X','O']);
 assert.equal(S.nextLevel(S.get(3),[101,102,104]),103);
});

test('surface islands occupy more of their pages without clipping terrain, routes or boss targets',()=>{
 const {Story:S}=load(),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const islands=Array.from(html.matchAll(/<path class="atlas-island [^"]+" data-atlas-page="chapter([123])" d="([^"]+)"/g));
 for(const [,id,data] of islands){
  const view=S.viewport(Number(id)),coordinates=data.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=coordinates.filter((_,i)=>i%2===0),ys=coordinates.filter((_,i)=>i%2===1);
  assert.ok(Math.min(...xs)>view.x+20);assert.ok(Math.max(...xs)<view.x+view.width-20);
  assert.ok(Math.min(...ys)>view.y+20);assert.ok(Math.max(...ys)<view.y+view.height-20);
  if(Number(id)<3){const occupancy=(Math.max(...xs)-Math.min(...xs))/view.width;assert.ok(occupancy>=.6&&occupancy<=.7,'surface terrain fills at least 60% of its page width');}
  for(const [x,y] of S.trail(S.get(Number(id))).bosses){assert.ok((x-view.x)/view.width>.1&&(x-view.x)/view.width<.9);assert.ok((y-view.y)/view.height>.1&&(y-view.y)/view.height<.9);}
 }
 for(const route of S.crossingRoutes)for(const side of ['out','in']){
  const view=S.viewport(route[side+'Story']),coordinates=route[side+'Path'].match(/-?\d+(?:\.\d+)?/g).map(Number);
  for(let n=0;n<coordinates.length;n+=2){assert.ok(coordinates[n]>=view.x+5&&coordinates[n]<=view.x+view.width-5);assert.ok(coordinates[n+1]>=view.y+5&&coordinates[n+1]<=view.y+view.height-5);}
 }
 assert.deepEqual(plain(S.viewport(3)),{x:50,y:-20,width:900,height:430});
});

test('the second story ending opens the Abyss and the third opens the sea and the current final ending returns home',()=>{
 const MM=load(),node=()=>({textContent:''});
 const g={headless:true,screen:'won',level:{id:100},save:{completed:[]},ui:{},buildMap(){},updateUI(){},openDialog(id){this.opened=id;},goHome(){this.screen='home';}};
 for(const id of ['result-kicker','result-title','result-description','result-primary'])g.ui[id]=node();
 MM.StoryUI.result(g);g.resultAction();assert.equal(g.selectedStory,3);assert.equal(g.storyLaunch.level,101);assert.equal(g.storyLaunch.options.carry,true);assert.equal(g.opened,'story-dialog');
 g.level.id=150;MM.StoryUI.result(g);assert.equal(g.ui['result-description'].textContent,MM.Story.get(3).ending);g.resultAction();assert.equal(g.selectedStory,4);assert.equal(g.storyLaunch.level,151);
 g.level.id=200;MM.StoryUI.result(g);g.resultAction();assert.equal(g.screen,'home');
});

test('atlas page selection shows exactly one story and restores either original island',()=>{
 const node=dataset=>({dataset,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},classList:{toggle(){}}});
 const map=node({}),pages=[1,2,3].map(id=>node({atlasPage:'chapter'+id})),tabs=[1,2,3].map(id=>node({atlasSwitch:'chapter'+id}));
 const document={querySelector:()=>map,querySelectorAll:query=>query==='[data-atlas-page]'?pages:query==='[data-atlas-switch]'?tabs:[]};
 const {StoryUI}=load({document}),g={selectedStory:3,headless:false,ui:{},save:{completed:[101,110]},progression:{rewards:[110]}};
 for(const id of [3,1,2]){
  g.selectedStory=id;StoryUI.sync(g);assert.equal(map.attrs['data-atlas-view'],'chapter'+id);
  pages.forEach((page,i)=>assert.equal('hidden' in page.attrs,i!==id-1));assert.equal(tabs[id-1].attrs['aria-pressed'],'true');
 }
});

test('page includes the original two-island atlas, separate Abyss page and dependency order',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/atlas-west" data-atlas-page="chapter1"/);assert.match(html,/atlas-east" data-atlas-page="chapter2"/);assert.match(html,/atlas-abyss" data-atlas-page="chapter3"/);
 assert.equal((html.match(/data-boss-marker=/g)||[]).length,20);assert.equal((html.match(/data-story-choice=/g)||[]).length,4);
 for(const id of [110,120,130,140,150])assert.ok(html.includes('id="atlas-boss-'+id+'"'));
 assert.ok(html.indexOf('src="js/abyss-config.js')<html.indexOf('src="js/campaign.js'));
 assert.ok(html.indexOf('src="js/abyss-combat.js')<html.indexOf('src="js/abyss-renderer.js'));
 assert.ok(html.indexOf('src="js/abyss-renderer.js')<html.indexOf('src="js/renderer.js'));
 assert.equal(html.includes('Mở lại trang: hành trình mới.'),false);assert.equal(html.includes('Tải lại trang bắt đầu chuyến đi mới.'),false);
});

async function atlasScene(initialPage='chapter1'){
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const paths=Array.from(html.matchAll(/<path class="atlas-island [^"]+" data-atlas-page="([^"]+)" d="([^"]+)"/g),match=>({dataset:{atlasPage:match[1]},getAttribute:name=>name==='d'?match[2]:null}));
 const groups=[],cameras=[],renders=[];
 class Node{constructor(){this.children=[];this.visible=true;this.position={set(){}};this.rotation={};this.scale={};}add(child){this.children.push(child);}}
 class Group extends Node{constructor(){super();groups.push(this);}}
 class Scene extends Node{}
 class Camera extends Node{constructor(...bounds){super();this.bounds=bounds;cameras.push(this);}updateProjectionMatrix(){}}
 class Light extends Node{constructor(color,intensity){super();this.intensity=intensity;}}
 class Shape{constructor(){this.points=[];}moveTo(x,y){this.points.push([x,y]);}lineTo(x,y){this.points.push([x,y]);}closePath(){}}
 class Geometry{constructor(shape,options){this.shape=shape;this.options=options;}translate(...value){this.translation=value;}}
 class Material{constructor(options){this.options=options;}}
 class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
 class Renderer{setPixelRatio(){}setClearColor(){}setSize(){}render(scene){renders.push(scene);}dispose(){}}
 const THREE={Group,Scene,OrthographicCamera:Camera,HemisphereLight:Light,DirectionalLight:Light,Shape,ExtrudeGeometry:Geometry,MeshStandardMaterial:Material,Mesh,WebGLRenderer:Renderer};
 const classes={add(){},remove(){},toggle(){}};
 const {Story}=load(),viewboxes=Object.fromEntries(Story.stories.map(story=>{const view=Story.viewport(story);return ['chapter'+story.id,[view.x,view.y,view.width,view.height].join(' ')];}));
 const map={dataset:{atlasView:initialPage},attrs:{'data-atlas-camera':viewboxes[initialPage]},getAttribute(name){return this.attrs[name];},classList:classes,style:{setProperty(){}},clientWidth:1000,clientHeight:400,querySelectorAll:()=>paths,prepend(){},addEventListener(){}};
 const canvas={setAttribute(){},getContext:()=>({}),addEventListener(){},remove(){}};
 const document={hidden:false,currentScript:{src:'https://example.test/js/atlas-3d.js'},querySelector:()=>map,createElement:()=>canvas,addEventListener(){}};
 const game={screen:'home',settings:{effects:true,reducedMotion:true}};
 const context=vm.createContext({MM:{game,Story},document,URL,location:{href:'https://example.test/'},THREE,devicePixelRatio:1,ResizeObserver:class{observe(){}},matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 const source=fs.readFileSync(path.join(__dirname,'../js/atlas-3d.js'),'utf8').replace('import(moduleURL.href)','Promise.resolve(THREE)');
 vm.runInContext(source,context);context.MM.Atlas3D.sync();
 await new Promise(resolve=>setImmediate(resolve));
 return {groups,cameras,renders,map,game,api:context.MM.Atlas3D};
}

test('orthographic atlas shows only the active terrain page and preserves both original island meshes',async()=>{
 const scene=await atlasScene(),first=scene.groups.find(group=>group.name==='atlas-chapter1'),second=scene.groups.find(group=>group.name==='atlas-chapter2'),abyss=scene.groups.find(group=>group.name==='atlas-chapter3');
 assert.ok(first);assert.ok(second);assert.ok(abyss);assert.equal(first.visible,true);assert.equal(second.visible,false);assert.equal(abyss.visible,false);
 assert.equal(first.children.length,2);assert.equal(second.children.length,2);assert.equal(abyss.children.length,2);
 assert.deepEqual(plain(first.children[0].geometry.shape.points[0]),[-424,41]);
 assert.deepEqual(plain(second.children[0].geometry.shape.points[0]),[79,56]);
 assert.equal(first.children[0].material[0].options.color,0x526445);assert.equal(second.children[0].material[0].options.color,0x454b3d);
 assert.deepEqual(plain(scene.cameras[0].bounds),[-500,500,200,-200,.1,2000]);
 assert.deepEqual(plain([scene.cameras[0].left,scene.cameras[0].right,scene.cameras[0].top,scene.cameras[0].bottom]),[-550,50,220,-210]);
 const firstRenderCount=scene.renders.length;
 scene.map.dataset.atlasView='chapter3';scene.map.attrs['data-atlas-camera']='50 -20 900 430';scene.api.sync();assert.equal(first.visible,false);assert.equal(second.visible,false);assert.equal(abyss.visible,true);assert.ok(scene.renders.length>firstRenderCount);
 assert.deepEqual(plain([scene.cameras[0].left,scene.cameras[0].right,scene.cameras[0].top,scene.cameras[0].bottom]),[-450,450,220,-210]);
 scene.map.dataset.atlasView='chapter2';scene.map.attrs['data-atlas-camera']='455 -20 600 430';scene.api.sync();assert.equal(first.visible,false);assert.equal(second.visible,true);assert.equal(abyss.visible,false);
 assert.deepEqual(plain([scene.cameras[0].left,scene.cameras[0].right,scene.cameras[0].top,scene.cameras[0].bottom]),[-45,555,220,-210]);
});

test('orthographic fallback uses the same selected story viewport when its DOM camera is absent',async()=>{
 const scene=await atlasScene('chapter3');
 scene.map.dataset.atlasView='chapter2';delete scene.map.attrs['data-atlas-camera'];scene.api.sync();
 assert.deepEqual(plain([scene.cameras[0].left,scene.cameras[0].right,scene.cameras[0].top,scene.cameras[0].bottom]),[-45,555,220,-210]);
});

test('cold-loading the saved third story hides surface meshes even if sync runs before Three.js resolves',async()=>{
 const scene=await atlasScene('chapter3');
 assert.equal(scene.groups.find(group=>group.name==='atlas-chapter1').visible,false);
 assert.equal(scene.groups.find(group=>group.name==='atlas-chapter2').visible,false);
 assert.equal(scene.groups.find(group=>group.name==='atlas-chapter3').visible,true);
 assert.ok(scene.renders.length>0);
});

test('continuation paths explicitly enter stage51 and101 before the next boss',()=>{
 const {Story:S}=load(),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.deepEqual(plain(S.crossingRoutes.map(route=>[route.from,route.entrance,route.to])),[[50,51,60],[100,101,110],[150,151,160]]);
 for(const route of S.crossingRoutes){
  assert.ok(html.includes(`data-route-from="${route.from}" data-route-entry="${route.entrance}" data-route-to="${route.to}"`));
  assert.ok(route.inPath.endsWith(S.trail(S.get(route.inStory)).bosses[0].join(' ')));
 }
 for(const story of S.stories){const view=S.viewport(story);for(const [x,y] of S.trail(story).bosses){assert.ok(x>view.x&&x<view.x+view.width);assert.ok(y>view.y&&y<view.y+view.height);}}
});

function swipeFixture(rotated=false){
 const listeners={},map={addEventListener(name,fn){listeners[name]=fn;},setPointerCapture(){},hasPointerCapture(){return false;}};
 const MM=load({document:{querySelector:()=>map}}),g={screen:'home',selectedStory:1,mobileRotation:rotated,settings:{reducedMotion:true},buildMap(){},updateUI(){}};
 MM.StoryUI.bindSwipe(g,map);
 const event=(x,y,options={})=>({pointerId:1,pointerType:'touch',clientX:x,clientY:y,isPrimary:true,cancelable:true,preventDefault(){this.prevented=true;},target:{closest:()=>null},...options});
 function gesture(from,to,options){listeners.pointerdown(event(...from,options));const move=event(...to,options);listeners.pointermove(move);listeners.pointerup(event(...to,options));return move;}
 return {g,gesture,listeners,event,MM};
}

test('horizontal swipes turn one story per gesture, clamp at ends and work on the rotated iPhone layout',()=>{
 const normal=swipeFixture();normal.gesture([300,100],[200,105]);assert.equal(normal.g.selectedStory,2);normal.gesture([300,100],[200,105]);assert.equal(normal.g.selectedStory,3);normal.gesture([300,100],[200,105]);assert.equal(normal.g.selectedStory,4);normal.gesture([300,100],[200,105]);assert.equal(normal.g.selectedStory,4);
 normal.gesture([150,100],[240,102]);assert.equal(normal.g.selectedStory,3);
 const rotated=swipeFixture(true);rotated.gesture([100,300],[104,200]);assert.equal(rotated.g.selectedStory,2);rotated.gesture([100,200],[101,300]);assert.equal(rotated.g.selectedStory,1);
});

test('vertical gestures, short drags, button presses and cancelled swipes do not turn stories',()=>{
 const fixture=swipeFixture();
 fixture.gesture([300,100],[295,180]);assert.equal(fixture.g.selectedStory,1);
 fixture.gesture([300,100],[280,101]);assert.equal(fixture.g.selectedStory,1);
 fixture.gesture([300,100],[200,100],{target:{closest:()=>({tagName:'BUTTON'})}});assert.equal(fixture.g.selectedStory,1);
 fixture.listeners.pointerdown(fixture.event(300,100));fixture.listeners.pointermove(fixture.event(200,100));fixture.listeners.pointercancel();fixture.listeners.pointerup(fixture.event(200,100));assert.equal(fixture.g.selectedStory,1);
 fixture.g.screen='playing';fixture.gesture([300,100],[200,100]);assert.equal(fixture.g.selectedStory,1);
});
