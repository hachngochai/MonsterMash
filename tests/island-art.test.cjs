'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(extra={}) {
  const context=vm.createContext(extra);
  vm.runInContext(fs.readFileSync('js/island-art.js','utf8'),context);
  return {Art:context.MM.IslandArt,context};
}
function drawing() {
  let depth=0;
  const calls=[];
  const target={globalAlpha:1,filter:'none',save(){depth++;calls.push(['save']);},restore(){depth--;calls.push(['restore']);}};
  const c=new Proxy(target,{get(o,key){if(key in o)return o[key];return(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key)+' uses finite geometry');calls.push([key,...args]);};},set(o,key,value){o[key]=value;return true;}});
  return {c,calls,depth:()=>depth,images:()=>calls.filter(row=>row[0]==='drawImage')};
}
const actor=(type,extra={})=>({archetype:type,x:300,y:438,w:50,h:70,dir:1,phase:'active',islandState:'walk',...extra});
const game=(extra={})=>({level:{id:201,island:true},settings:{effects:true,reducedMotion:true},time:0,...extra});
const image={width:1024,height:1536};
const types=['easterEgg','ghostBunny','luckyPatrick','leprechaun','drunkenWanderer','miniMoai','awakeningMoai','deforestedAlpha','birdman','manaSpirit','makemake'];

test('reference art remains an optional island-only layer until each asset decodes',async()=>{
  const {Art}=fixture(),draw=drawing();
  assert.equal(Art.drawEnemy(draw.c,game(),actor('ghostBunny')),false);
  assert.equal(Art.drawBackground(draw.c,game()),false);assert.equal(draw.calls.length,0);
  assert.equal(Art.setSprite('enemies',image),true);
  assert.equal(Art.drawEnemy(draw.c,game({level:{id:70}}),actor('ghostBunny')),false);
  assert.equal(Art.drawEnemy(draw.c,game(),actor('skeleton')),false);
  assert.equal(Array.from(await Art.allArtReady).length,17);assert.ok(Array.from(await Art.allArtReady).every(x=>x===false));
  assert.equal(Art.spriteManifest.length,12);assert.ok(Art.spriteManifest.includes('assets/sprites/island/awakening-moai.png'));assert.ok(Art.spriteManifest.includes('assets/sprites/island/golden-fish.png'));
  assert.ok(Art.backgroundManifest.includes('assets/backgrounds/island/bird-cliffs.png'));
});

test('all eleven atlas characters stay within their own padded cell and keep the feet anchored',()=>{
  const {Art}=fixture();Art.setSprite('enemies',image);Art.setSprite('bosses',image);
  for(const [index,type]of types.entries()) {
    const draw=drawing(),e=actor(type);assert.equal(Art.drawEnemy(draw.c,game(),e),true);
    const commands=draw.images();assert.equal(commands.length,1,'reduced motion paints one intact sprite');
    const [,resource,sx,sy,sw,sh,dx,dy,dw,dh]=commands[0];assert.equal(resource,image);
    const local=index<6?index:index-6;
    const column=local%2,row=Math.floor(local/2),full=type==='makemake';
    assert.equal(sx,full?2:column*512+2);assert.equal(sy,row*512+2);
    assert.equal(sw,full?1020:508);assert.equal(sh,508);
    assert.ok(Math.abs(dy+dh)<1e-8,'foot baseline is exactly the actor baseline');
    assert.ok(Math.abs(dw/dh-sw/sh)<1e-8,'the reference is never stretched out of proportion');
    assert.equal(draw.depth(),0);assert.ok(dx<0&&dw>0);
  }
});

test('individual PNG overrides support source bounds, safe metadata, aliases and explicit anchors',()=>{
  const {Art}=fixture();assert.equal(Art.setSprite('ghostBunny',{width:320,height:480},{frame:[30,40,200,400],anchor:[.42,1],heightScale:1,trim:false}),true);
  let draw=drawing();Art.drawEnemy(draw.c,game(),actor('giantBunny'));
  assert.deepEqual(draw.images()[0].slice(2,6),[30,40,200,400]);
  assert.equal(Art.setSprite('giantBunny',{width:64,height:96},{trim:false}),true);
  draw=drawing();Art.drawEnemy(draw.c,game(),actor('giantBunny'));assert.equal(draw.images()[0][1].width,64);
  assert.equal(Art.setSprite('unknown',image),false);assert.equal(Art.setSprite('__proto__',image),false);
  assert.equal(Art.setSprite('bosses',{width:0,height:10}),false);
  assert.equal(Art.setSprite('easterEgg',image,{frame:[10,10,-4,25]}),false);
});

test('connected animation never samples a neighbouring cell or leaks canvas state over movement and teleport',()=>{
  const {Art}=fixture();Art.setSprite('enemies',image);Art.setSprite('bosses',image);
  const g=game({settings:{effects:true,reducedMotion:false}});
  for(const type of types) {
    const e=actor(type,{boss:types.indexOf(type)>=6}),draw=drawing();
    for(let i=0;i<10;i++) {e.x+=i===5?500:2;e.islandState=i===8?'tell':'walk';e.islandProgress=.5;Art.drawEnemy(draw.c,g,e,i*.02);assert.equal(draw.depth(),0);}
    const local=types.indexOf(type)<6?types.indexOf(type):types.indexOf(type)-6;
    const left=type==='makemake'?2:local%2*512+2,top=Math.floor(local/2)*512+2;
    const right=type==='makemake'?1022:left+508,bottom=top+508;
    assert.ok(draw.images().length>100&&draw.images().length<=1120,'fixed-size connected mesh has bounded rendering cost');
    for(const row of draw.calls.filter(c=>c[0]==='transform'))assert.ok(row[1]*row[4]-row[2]*row[3]>.04,'an articulated cell never folds or reverses the reference texture');
    for(const row of draw.images()) {
      const [,resource,sx,sy,sw,sh]=row;assert.equal(resource,image);
      assert.ok(sx>=left-1e-7&&sy>=top-1e-7&&sx+sw<=right+1e-7&&sy+sh<=bottom+1e-7,type+' remains in its authored cell');
    }
  }
});

test('pause preserves the exact pose and reduced motion paints a single whole figure',()=>{
  const {Art}=fixture();Art.setSprite('enemies',image);
  const g=game({settings:{effects:true,reducedMotion:false}}),e=actor('ghostBunny');
  Art.drawEnemy(drawing().c,g,e,0);e.x+=3;Art.drawEnemy(drawing().c,g,e,.02);
  const first=drawing(),second=drawing();Art.drawEnemy(first.c,g,e,.02);Art.drawEnemy(second.c,g,e,.02);
  assert.deepEqual(first.calls,second.calls,'unchanged simulation time never advances gait');
  g.settings.reducedMotion=true;const reduced=drawing();Art.drawEnemy(reduced.c,g,e,100);assert.equal(reduced.images().length,1);assert.equal(reduced.depth(),0);
  g.settings.reducedMotion=false;e.petrifiedTime=2;const frozen=drawing();Art.drawEnemy(frozen.c,g,e,101);assert.equal(frozen.images().length,1);
});

test('burrow and the opaque part of Patrick invisibility do not reveal a sprite',()=>{
  const {Art}=fixture();Art.setSprite('enemies',image);Art.setSprite('bosses',image);
  for(const e of [actor('deforestedAlpha',{islandState:'burrow'}),actor('luckyPatrick',{hiddenTime:4.5})]) {
    const draw=drawing();assert.equal(Art.drawEnemy(draw.c,game(),e),true);assert.equal(draw.images().length,0);assert.equal(draw.depth(),0);
  }
  const draw=drawing();Art.drawEnemy(draw.c,game(),actor('luckyPatrick',{hiddenTime:0}));assert.equal(draw.images().length,1);
});

test('five landscapes align their source walking line to the actual world floor without cropping the playfield',()=>{
  const {Art}=fixture();const plate={width:1536,height:1024};
  const names=['quarry','dead-palms','bird-cliff','mana-sanctuary','volcano'];
  names.forEach((name,i)=>assert.equal(Art.setBackground(name,plate,{floor:.8+i*.01}),true));
  for(let band=0;band<5;band++) {
    const draw=drawing(),g=game({level:{id:201+band*10,island:true}});assert.equal(Art.drawBackground(draw.c,g),true);
    const [upper,ground]=draw.images();assert.equal(draw.images().length,2);assert.equal(draw.depth(),0);
    assert.ok(Math.abs(upper[7]+upper[9]-438)<1e-8,'top image terminates at the walking line');
    assert.equal(ground[7],438);assert.ok(ground[9]>=102);assert.ok(upper[8]>=960&&ground[8]>=960);
    assert.equal(upper[5],1024*(.8+band*.01));
  }
  assert.equal(Art.setBackground('unknown',plate),false);
  assert.equal(Art.drawBackground(drawing().c,game({level:{id:151,underwater:true}})),false);
});

test('loading failures remain local and successful atlas and background decodes are reusable',async()=>{
  const pending=[];
  class FakeImage {constructor(){this.width=1024;this.height=1536;}set src(value){this.url=value;pending.push(this);}}
  const {Art}=fixture({Image:FakeImage});assert.equal(pending.length,17);
  for(const im of pending) {if(im.url.includes('dead-palms'))im.onerror();else im.onload();}
  const results=Array.from(await Art.allArtReady);assert.equal(results.filter(Boolean).length,16);
  assert.equal(Art.getState().overrides.length,11);
  assert.equal(Art.getState().companion.ready,true);
  assert.equal(Art.drawBackground(drawing().c,game({level:{id:211,island:true}})),false);
  assert.equal(Art.drawBackground(drawing().c,game()),true);
});

test('large bosses take readable alternating steps while their head and shoulders counterbalance',()=>{
  const {Art}=fixture();Art.setSprite('bosses',image);
  const g=game({settings:{effects:true,reducedMotion:false}}),e=actor('awakeningMoai',{boss:true,w:155,h:224});
  const feet=[],heads=[];
  for(let i=0;i<40;i++){
    e.x+=1.5;const draw=drawing();Art.drawEnemy(draw.c,g,e,i/60);
    const points=draw.calls.filter(c=>c[0]==='moveTo'||c[0]==='lineTo');
    feet.push(points.slice(-42).map(c=>[c[1],c[2]]));heads.push(points.slice(0,42).map(c=>[c[1],c[2]]));
  }
  const excursion=samples=>Math.max(...samples[0].map((_p,index)=>{
    const xs=samples.map(frame=>frame[index][0]),ys=samples.map(frame=>frame[index][1]);
    return Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  }));
  assert.ok(excursion(feet)>12,'a giant foot travels more than twelve world pixels across its stride');
  assert.ok(excursion(heads)>1&&excursion(heads)<24,'the upper body visibly balances without swinging as far as a loose sign');
});

test('a connected throw anticipates, strikes and recovers continuously instead of snapping between images',()=>{
  const {Art}=fixture();Art.setSprite('enemies',image);
  const g=game({settings:{effects:true,reducedMotion:false}}),e=actor('drunkenWanderer',{h:100,w:60,islandState:'tell',islandSkill:'drunkenWanderer'});
  const samples=[];
  for(let i=0;i<80;i++){
    if(i<35)e.islandProgress=i/35;else{e.islandState='rest';e.islandSkill=null;}
    const draw=drawing();Art.drawEnemy(draw.c,g,e,i/60);samples.push(draw.calls.filter(c=>c[0]==='moveTo'||c[0]==='lineTo').map(c=>[c[1],c[2]]));
  }
  let range=0,jump=0;
  for(let n=0;n<samples[0].length;n++){
    const xs=samples.map(a=>a[n][0]),ys=samples.map(a=>a[n][1]);range=Math.max(range,Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)));
    for(let i=1;i<samples.length;i++)jump=Math.max(jump,Math.hypot(samples[i][n][0]-samples[i-1][n][0],samples[i][n][1]-samples[i-1][n][1]));
  }
  assert.ok(range>8,'the arm and bottle make a visible throwing arc');assert.ok(jump<6,'a single frame never snaps more than six world pixels');
});

test('Mana keeps the central face rigid while its outer rune belt follows an angular orbit',()=>{
  const {Art}=fixture();Art.setSprite('bosses',image);
  const g=game({settings:{effects:true,reducedMotion:false}}),e=actor('manaSpirit',{boss:true,h:160,w:124});
  const first=drawing(),later=drawing();Art.drawEnemy(first.c,g,e,0);Art.drawEnemy(later.c,g,e,1);
  const a=first.calls.filter(c=>c[0]==='transform'),b=later.calls.filter(c=>c[0]==='transform');
  assert.equal(a.length,112);assert.equal(b.length,112);
  assert.ok(a.some((m,i)=>Math.abs(m[2]-b[i][2])>.01),'the belt turns rather than merely translating the whole sprite');
  for(const row of b)assert.ok(row[1]*row[4]-row[2]*row[3]>.7,'orbiting runes retain a solid, non-folding surface');
});

test('the guardian is a tiny golden fish with tail motion and a stable position above the player',()=>{
  const {Art}=fixture({MM:{SaveManager:{unlocked:()=>true}}}),g=game({player:{x:300,y:438,w:38,h:54,dir:1}});
  assert.equal(Art.drawCompanion(drawing().c,g),false,'no human substitute appears before the fish decodes');
  assert.equal(Art.setCompanion({width:1200,height:800}),true);const still=drawing();assert.equal(Art.drawCompanion(still.c,g,0),true);
  const draw=still.images()[0];assert.ok(draw[8]<=30&&draw[9]<=20);const translation=still.calls.find(c=>c[0]==='translate');
  assert.equal(translation[1],300);assert.equal(translation[2],350,'fish is thirty-four pixels above the head');
  g.settings.reducedMotion=false;const moving=drawing();Art.drawCompanion(moving.c,g,.1);assert.equal(moving.images().length,24);assert.equal(moving.depth(),0);
  g.level.id=70;assert.equal(Art.drawCompanion(drawing().c,g,.2),false,'the existing map70 reward suppression remains intact');
});
