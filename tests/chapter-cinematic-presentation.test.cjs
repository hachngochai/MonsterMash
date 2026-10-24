'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scenes=['forest','cave','whirlpool','ending'];
function fixture(){
 const scope=vm.createContext({});vm.runInContext(fs.readFileSync('js/chapter-transition.js','utf8'),scope);
 const g={screen:'playing',settings:{reducedMotion:false},player:{x:480,y:438,w:38,h:54,health:5,ammo:17,swimming:false,rollTime:.3,merfolkTime:4},
  level:{id:200,underwater:true},underwater:{oxygen:20},save:{completed:[50,100,150,200]},levelTime:23,time:31,ui:{'cinematic-skip':{hidden:true}},clearInputs(){}};
 return {MM:scope.MM,g,scope};
}
function nativeCanvases(scope){
 const made=[];scope.document={createElement(tag){assert.equal(tag,'canvas');const calls=[],node={width:0,height:0,getContext(type){assert.equal(type,'2d');return {drawImage(...args){calls.push(args);}};}};made.push({node,calls});return node;}};
 return made;
}
// A stateful canvas double catches invalid gradients, negative radii, leaking
// transforms/alpha and unbalanced save/restore without requiring a browser.
function canvas(){
 const calls=[],stack=[],target={globalAlpha:1,globalCompositeOperation:'source-over',font:'10px sans-serif',textBaseline:'alphabetic'};
 const finite=(name,args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${name} receives a finite number`);};
 const methods={
  save(){stack.push({...target});calls.push(['save']);},
  restore(){assert.ok(stack.length,'restore has a matching save');const state=stack.pop();for(const key of Object.keys(target))delete target[key];Object.assign(target,state);calls.push(['restore']);},
  createLinearGradient(...args){finite('linear gradient',args);return {addColorStop(offset){assert.ok(Number.isFinite(offset)&&offset>=0&&offset<=1);}};},
  createRadialGradient(...args){finite('radial gradient',args);assert.ok(args[2]>=0&&args[5]>=0,'radial gradients have valid radii');return {addColorStop(offset){assert.ok(Number.isFinite(offset)&&offset>=0&&offset<=1);}};},
  measureText(value){return {width:String(value).length*8};}
 };
 const c=new Proxy(target,{get(o,key){if(key in methods)return methods[key];if(key in o)return o[key];return (...args)=>{finite(String(key),args);if(key==='arc')assert.ok(args[2]>=0);if(key==='ellipse')assert.ok(args[2]>=0&&args[3]>=0);calls.push([key,...args]);};},
  set(o,key,value){if(['globalAlpha','lineWidth','shadowBlur'].includes(key))assert.ok(Number.isFinite(value),`${String(key)} is finite`);o[key]=value;return true;}});
 return {c,calls,depth:()=>stack.length};
}
function actorRenderer(MM,actors){
 MM.Renderer={drawHunter(c,actor,time,moving,game){actors.push({kind:'hunter',actor,time,moving,game});}};
 MM.UnderwaterRenderer={drawBackground(){return false;},drawEnemy(c,g,actor){actors.push({kind:'enemy',actor});return true;}};
}
test('each cinematic uses its own local high resolution background asset',()=>{
 const {MM}=fixture(),manifest=MM.ChapterTransition.backgroundManifest;
 const expected=['forest-passage','cave-passage','whirlpool-passage','shore-return'].map(name=>`assets/backgrounds/transitions/${name}.png`);
 const paths=Array.isArray(manifest)?Array.from(manifest):Object.values(manifest);
 assert.equal(paths.length,4);assert.equal(new Set(paths).size,4);
 assert.deepEqual(paths.slice().sort(),expected.slice().sort());
 for(const path of paths){
  const png=fs.readFileSync(path);assert.ok(png.length>50000,path);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',path);
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.ok(width>=960&&height>=540,`${path}: sufficient source resolution`);
  assert.ok(width/height>1.4&&width/height<2.2,`${path}: landscape framing`);
 }
});
test('the decoded backdrop is painted and is also safe when assets are unavailable',()=>{
 const {MM,g}=fixture(),R=MM.ChapterTransition;
 const images={forest:{width:1536,height:1024},cave:{width:1536,height:1024},whirlpool:{width:1536,height:1024},shore:{width:1536,height:1024}};
 for(const [key,image]of Object.entries(images))assert.equal(R.setBackground(image,key),true);
 for(const kind of scenes){const {c,calls,depth}=canvas();R.begin(g,kind);for(const p of [.15,.5,.95]){g.cinematic.time=g.cinematic.duration*p;const before=JSON.stringify(g);R.draw(c,g);assert.equal(JSON.stringify(g),before);assert.equal(depth(),0);}
  assert.ok(calls.some(([name,image])=>name==='drawImage'&&Object.values(images).includes(image)),kind);R.skip(g);}
 const fallback=fixture();for(const kind of scenes){const {c,depth}=canvas();fallback.MM.ChapterTransition.begin(fallback.g,kind);fallback.g.cinematic.time=fallback.g.cinematic.duration*.5;assert.equal(fallback.MM.ChapterTransition.draw(c,fallback.g),true);assert.equal(depth(),0);fallback.MM.ChapterTransition.skip(fallback.g);}
});
test('undecoded or non-finite backdrops cannot introduce invalid canvas geometry',()=>{
 const {MM,g}=fixture(),R=MM.ChapterTransition;
 for(const image of [null,{width:0,height:540},{width:960,height:0},{width:Infinity,height:540},{width:960,height:NaN}]){
  assert.equal(R.setBackground(image,'forest'),false);const {c,depth}=canvas();R.begin(g,'forest');g.cinematic.time=2;R.draw(c,g);assert.equal(depth(),0);R.skip(g);
 }
 assert.equal(R.setBackground({width:960,height:540},'__proto__'),false);
});
test('timeline poses are finite, continuous across phase changes and use constant cameras for reduced motion',()=>{
 const {MM}=fixture(),R=MM.ChapterTransition;
 for(const kind of scenes){let previous=null;
  for(let i=0;i<=500;i++){
   const p=i/500,shot=R.sampleShot(kind,p,false),again=R.sampleShot(kind,p,false);
   assert.equal(JSON.stringify(shot),JSON.stringify(again),'sampling a scene is deterministic');
   for(const key of ['x','y','scale','tilt','vx'])assert.ok(Number.isFinite(shot[key]),`${kind}.${key} at ${p}`);
   assert.ok(shot.scale>0&&shot.scale<4,`${kind} uses a visible finite actor scale`);
   for(const key of ['zoom','x','y'])assert.ok(Number.isFinite(shot.camera[key]),`${kind}.camera.${key}`);
   assert.ok(shot.camera.zoom>0&&shot.camera.zoom<3);
   if(previous)assert.ok(Math.hypot(shot.x-previous.x,shot.y-previous.y)<20,`${kind}: no teleport from ${previous.phase} to ${shot.phase} at ${p}`);
   previous=shot;
  }
  const camera=JSON.stringify(R.sampleShot(kind,0,true).camera);
  for(const p of [.1,.3,.5,.7,.9,1])assert.equal(JSON.stringify(R.sampleShot(kind,p,true).camera),camera,`${kind}: reduced motion has no pan/zoom`);
 }
});
test('all scene frames balance canvas state and never mutate inventory, oxygen or actor effects',()=>{
 const {MM,g}=fixture(),R=MM.ChapterTransition,actors=[];actorRenderer(MM,actors);
 g.endingBoss={archetype:'kraken',x:650,y:400,w:390,h:360,health:0,dead:true,krakenStone:true};
 for(const reduced of [false,true])for(const kind of scenes){g.settings.reducedMotion=reduced;R.begin(g,kind);
  for(const p of [0,.0001,.08,.15,.25,.3,.4,.5,.6,.7,.75,.8,.9,.99,1]){
   const {c,depth}=canvas();c.globalAlpha=.75;c.globalCompositeOperation='screen';g.cinematic.time=g.cinematic.duration*p;
   const before=JSON.stringify(g),firstActor=actors.length;assert.equal(R.draw(c,g),true);assert.equal(JSON.stringify(g),before);assert.equal(depth(),0);
   const hunters=actors.slice(firstActor).filter(({kind})=>kind==='hunter');assert.equal(hunters.length,1,'one continuous hunter replaces the overlapping swimmer/walker copies');
   const drawn=hunters[0];assert.equal(drawn.actor.rollTime,0);assert.equal(drawn.actor.merfolkTime,0);assert.notEqual(drawn.game,g);assert.equal(drawn.game.rollSlash,null);
   assert.equal(drawn.actor.w,38);assert.equal(drawn.actor.h,54,'actor dimensions stay native while the canvas scales once');
   assert.equal(c.globalAlpha,.75);assert.equal(c.globalCompositeOperation,'screen');
  }R.skip(g);
 }
 assert.ok(actors.length>20);for(const {actor}of actors){assert.notEqual(actor,g.player);assert.notEqual(actor,g.endingBoss);}
});
test('native entry frames preserve full device resolution, blend only at entry and remain private',()=>{
 const {MM,g,scope}=fixture(),R=MM.ChapterTransition,made=nativeCanvases(scope);g.canvas={width:1920,height:1080};
 R.begin(g,'whirlpool');assert.equal(made.length,1);assert.equal(made[0].node.width,1920);assert.equal(made[0].node.height,1080);
 assert.deepEqual(made[0].calls,[[g.canvas,0,0]],'copy the complete native canvas without cropping');
 const {c,calls,depth}=canvas(),before=JSON.stringify(g);R.draw(c,g);
 assert.ok(calls.some(([name,image,x,y,w,h])=>name==='drawImage'&&image===made[0].node&&x===0&&y===0&&w===960&&h===540));
 calls.length=0;g.cinematic.time=g.cinematic.duration*.5;const middle=JSON.stringify(g);R.draw(c,g);
 assert.equal(JSON.stringify(g),middle);assert.equal(depth(),0);assert.ok(!calls.some(([name,image])=>name==='drawImage'&&image===made[0].node));
 assert.equal(made.length,1,'painting does not allocate canvas copies');
 const seen=new Set();function visit(value){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);assert.ok(!made.some(({node})=>node===value),'canvas snapshots stay outside the serializable game graph');for(const child of Object.values(value))visit(child);}visit(g);
 assert.ok(before.includes('"oxygen":20'));R.skip(g);assert.equal(R.drawLanding(c,g),false);
});
test('a completed film fades into its real adjacent destination for exactly half a second',()=>{
 for(const [from,kind]of[[50,'forest'],[100,'cave'],[150,'whirlpool']]){
  const {MM,g,scope}=fixture(),R=MM.ChapterTransition,made=nativeCanvases(scope);g.level={id:from};g.canvas={width:1920,height:1080};let done=0;
  R.begin(g,kind,()=>{done++;R.clear(g);g.level={id:from+1};g.screen='playing';});R.update(g,5);assert.equal(done,1);assert.equal(made.length,2);
  const {c,calls,depth}=canvas(),before=JSON.stringify(g);assert.equal(R.drawLanding(c,g),true);assert.equal(JSON.stringify(g),before);assert.equal(depth(),0);
  assert.ok(calls.some(([name,image,x,y,w,h])=>name==='drawImage'&&image===made[1].node&&x===0&&y===0&&w===960&&h===540));
  assert.equal(R.updateLanding(g,.499),true);assert.equal(R.drawLanding(c,g),true);assert.equal(R.updateLanding(g,.001),false);assert.equal(R.drawLanding(c,g),false);
  assert.equal(made.length,2);assert.equal(done,1);
 }
});
test('skips, unrelated destinations and explicit cancellations cannot leave stale film overlays',()=>{
 for(const action of ['skip','different-map','same-map','home','retry','ending']){
  const {MM,g,scope}=fixture(),R=MM.ChapterTransition,made=nativeCanvases(scope);g.level={id:150};g.canvas={width:960,height:540};
  R.begin(g,action==='ending'?'ending':'whirlpool',()=>{g.screen='playing';g.level={id:action==='different-map'?170:action==='same-map'?150:151};});
  if(action==='skip')R.skip(g);else R.update(g,action==='ending'?11:5);
  if(action==='home'){g.screen='home';R.clear(g);}if(action==='retry')R.clear(g);
  const {c}=canvas();assert.equal(R.drawLanding(c,g),false,action);assert.ok(made.length<=2,'no per-frame capture');
 }
});
