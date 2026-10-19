const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
function fixture(options={}){
 const logs=[],gradients=[];let depth=0;
 const gradient={addColorStop(...v){logs.push(['stop',...v]);}};
 const ctx=new Proxy({globalAlpha:1,save(){depth++;logs.push(['save']);},restore(){depth--;logs.push(['restore']);},
  createLinearGradient(...v){logs.push(['linear',...v]);return gradient;},
  createRadialGradient(...v){gradients.push(v);logs.push(['radial',...v]);return gradient;}},
  {get(o,k){if(k in o)return o[k];return (...v)=>logs.push([k,...v]);},set(o,k,v){o[k]=v;return true;}});
 const scope={window:{MM:{AbyssConfig:{lighting:{torchViewportRatio:.5,weaponRadius:95,darkWeaponRadius:24,deityDarkWeaponSteps:3},combat:{arena:{step:40}}},SaveManager:{unlocked(g,id){return g.progression?.rewards?.includes(id)||false;}}}}};
 if(options.Image)scope.window.Image=options.Image;
 vm.createContext(scope);vm.runInContext(fs.readFileSync('js/abyss-renderer.js','utf8'),scope);
 const game={level:{id:101},time:1.4,settings:{},abyss:{},player:{x:300,y:438,w:38,h:54,dir:1},progression:{equipped:'gun',rewards:[]}};
 return {A:scope.window.MM.AbyssRenderer,MM:scope.window.MM,ctx,logs,gradients,game,depth:()=>depth};
}
test('Abyss rendering declines original stages and maps precisely five new biomes',()=>{
 const {A,ctx,logs,game}=fixture();
 for(const id of [1,50,70,100,151]){game.level.id=id;assert.equal(A.drawBackground(ctx,game),false);assert.equal(A.drawLighting(ctx,game),false);}
 assert.equal(logs.length,0);
 for(let k=0;k<5;k++){game.level.id=101+k*10;assert.equal(A.chapter(game),k);game.level.id=110+k*10;assert.equal(A.chapter(game),k);}
});
test('five cave regions have distinct actual geometry and isolate drawing state',()=>{
 const hashes=[];
 for(let k=0;k<5;k++){
  const {A,ctx,logs,game,depth}=fixture();game.level.id=101+k*10;
  assert.equal(A.drawBackground(ctx,game),true);assert.equal(depth(),0);
  hashes.push(crypto.createHash('sha256').update(JSON.stringify(logs.filter(v=>!['stop'].includes(v[0])))).digest('hex'));
 }
 assert.equal(new Set(hashes).size,5);
});
test('all thirteen block creatures draw unique silhouettes, including knight and emotions',()=>{
 const {A,ctx,logs,game,depth}=fixture(),hashes=[];
 for(const type of A.types){
  logs.length=0;assert.equal(A.drawEnemy(ctx,game,{type,x:400,y:438,w:100,h:110,health:5,maxHealth:5,dir:1}),true);
  assert.equal(depth(),0);hashes.push(crypto.createHash('sha256').update(JSON.stringify(logs)).digest('hex'));
 }
 assert.equal(new Set(hashes).size,13);
 for(const emotion of ['joy','rage','love','hate']){
  assert.equal(A.drawEnemy(ctx,game,{type:'thousandHands',emotion,x:400,y:438,w:100,h:110,health:5}),true);
  assert.equal(A.drawEnemy(ctx,game,{type:'thousandHands',emotion,emotionProjection:true,abyssPhase:2,x:400,y:438,w:100,h:110,health:1}),true);
 }
 assert.equal(A.drawEnemy(ctx,game,{type:'fossilRoc',abyssForm:'knight',x:400,y:438,w:100,h:110,health:5}),true);
 assert.equal(depth(),0);assert.equal(A.drawEnemy(ctx,game,{type:'skeleton',health:5}),false);
});
test('refracted turtle draws water disturbances without an outline or filled body',()=>{
 const {A,ctx,logs,game}=fixture();
 A.drawEnemy(ctx,game,{type:'mirrorTurtle',invisible:true,x:400,y:438,w:140,h:140,health:20});
 assert.equal(logs.filter(v=>v[0]==='ellipse').length,2);
 assert.equal(logs.some(v=>['fill','fillRect','strokeRect','lineTo'].includes(v[0])),false);
});
test('torch is one held flame or two symmetric orbit flames; light footprint is half viewport',()=>{
 const {A,ctx,game,gradients}=fixture();
 assert.equal(A.torchPoints(game).length,1);
 game.progression.equipped='hammer';const points=A.torchPoints(game);assert.equal(points.length,2);
 assert.ok(Math.abs(points[0].x+points[1].x-game.player.x*2)<1e-8);
 assert.ok(Math.abs(points[0].y+points[1].y-(game.player.y-game.player.h*.55)*2)<1e-8);
 A.drawLighting(ctx,game);const radius=gradients.at(-1)[5];
 assert.ok(Math.abs(Math.PI*radius**2/(960*540)-.5)<1e-8);
});
test('light extinction suppresses torch separately while unlocked weapon glows survive',()=>{
 const {A,ctx,game,logs,gradients}=fixture();game.abyss.darkness=true;
 assert.equal(A.lightSuppressed(game),true);A.drawPlayerTorch(ctx,game);assert.equal(logs.filter(v=>v[0]==='fillRect').length,0);
 A.drawLighting(ctx,game);assert.equal(gradients.at(-1)[5],24*.42);
 game.progression.rewards=[130];A.drawLighting(ctx,game);assert.equal(gradients.at(-1)[5],24);
 assert.equal(A.weaponLit(game),true);A.drawPlayerTorch(ctx,game);assert.ok(logs.some(v=>v[0]==='fillRect'));
});
test('deity form one weapon lights a three-step sphere during darkness only',()=>{
 const {A,ctx,game,gradients}=fixture();game.level.id=150;game.abyss.darkness=true;
 game.enemies=[{type:'thousandHands',boss:true,health:160,abyssPhase:1}];
 assert.equal(A.weaponLit(game),true);A.drawLighting(ctx,game);assert.equal(gradients.at(-1)[5],120);
 game.enemies[0].abyssPhase=2;assert.equal(A.weaponLit(game),false);A.drawLighting(ctx,game);assert.equal(gradients.at(-1)[5],24*.42);
});
test('weapon glow follows reward 130 in old stages without adding torches or darkness',()=>{
 const {A,ctx,game,logs,gradients,depth}=fixture();
 for(const id of [1,10,50,80,100]){
  game.level.id=id;logs.length=0;gradients.length=0;
  assert.equal(A.drawPlayerTorch(ctx,game),false);assert.equal(logs.length,0);
  game.progression.rewards=[130];
  assert.equal(A.drawPlayerTorch(ctx,game),true);
  assert.equal(gradients[0][5],95);
  assert.equal(logs.some(v=>['lineTo','strokeRect'].includes(v[0])),false,'no torch shaft, flame or additional hand');
  logs.length=0;assert.equal(A.drawLighting(ctx,game),false);assert.equal(logs.length,0);
  game.progression.rewards=[];
 }
 assert.equal(depth(),0);
});
test('weapon glow uses configured radii and tracks aiming, melee swing and weapon changes',()=>{
 const {A,MM,ctx,game,gradients}=fixture();game.progression.rewards=[130];
 const normal=A.weaponLightPoint(game);game.player.aimAngle=-Math.PI/4;
 const high=A.weaponLightPoint(game);assert.ok(high.y<normal.y);assert.ok(high.x<normal.x);
 game.player.aimAngle=null;game.progression.equipped='hammer';
 const idle=A.weaponLightPoint(game);game.weaponAttack={time:.12,duration:.24,form:'swing'};
 const swing=A.weaponLightPoint(game);assert.ok(Math.abs(swing.x-idle.x)>10);
 MM.AbyssConfig.lighting.weaponRadius=73;A.drawPlayerTorch(ctx,game);assert.ok(gradients.some(v=>v[5]===73));
 game.abyss.darkness=true;MM.AbyssConfig.lighting.darkWeaponRadius=31;
 A.drawLighting(ctx,game);assert.equal(gradients.at(-1)[5],31);
 const center=A.weaponLightPoint(game);assert.equal(gradients.at(-1)[0],center.x);assert.equal(gradients.at(-1)[1],center.y);
});
test('new melee weapons are isolated helpers and never hijack old equipment drawings',()=>{
 const {A,ctx,game,logs,depth}=fixture();
 for(const id of ['gun','bones','club','axes','bow','spear'])assert.equal(A.drawWeapon(ctx,game.player,id,game),false);
 assert.equal(logs.length,0);
 for(const id of ['hammer','scythe'])assert.equal(A.drawWeapon(ctx,game.player,id,game),true);
 assert.equal(depth(),0);
});
test('all gameplay hazard and projectile kinds render both phases without leaking state',()=>{
 const {A,ctx,game,depth}=fixture();
 const kinds=['mushroom','stalactite','spirit','ice','pollen','root','water-column','rolling-rock','hand','shockwave','rift-strike','reverse-spike','clay-crack','shadow-petrify','axe-arc','scythe-arc'];
 for(const phase of ['warning','active','falling','idle']){
  game.abyssHazards=kinds.map((kind,i)=>({kind,x:70+i*65,y:438,w:40,h:80,phase,life:2,timer:1,total:2}));
  game.abyssShots=['water','spirit-bolt','sonic','scythe-wave','shadow-shot','reflection','rock'].map((kind,i)=>({kind,x:50+i*100,y:250,life:1,vx:100}));
  A.drawEffects(ctx,game,false);A.drawEffects(ctx,game,true);assert.equal(depth(),0);
 }
});
test('Flower Demon stomp, root lash, bone sweep and flower bite match distinct hazard footprints',()=>{
 const hashes=[];
 for(const boneVariant of ['stomp','roots','sweep','flower']){
  const {A,ctx,game,logs,depth}=fixture();game.level.id=120;
  game.abyssHazards=[{kind:'root',boneVariant,x:400,y:438,w:boneVariant==='flower'?115:230,h:boneVariant==='stomp'?80:boneVariant==='sweep'?70:170,phase:'active',life:.2,timer:.1,total:.2,owner:{dir:1}}];
  A.drawEffects(ctx,game,true);
  assert.equal(depth(),0);assert.ok(logs.some(v=>v[0]==='clip'));
  hashes.push(crypto.createHash('sha256').update(JSON.stringify(logs)).digest('hex'));
 }
 assert.equal(new Set(hashes).size,4);
});
test('all seven reference art assets are shipped and preload safely without a document',async()=>{
 const requested=[];
 class ImageStub{
  set src(value){this.width=1536;this.height=1024;requested.push(value);this.onload();}
 }
 const {A}=fixture({Image:ImageStub});await A.spriteReady;
 assert.equal(A.spriteManifest.length,7);assert.equal(requested.length,A.spriteManifest.length+A.backgroundManifest.length);
 for(const file of A.spriteManifest){assert.ok(fs.statSync(file).size>1000);assert.ok(requested.some(url=>url.startsWith(file+'?')));}
 assert.equal(Object.values(A.spriteEntries).every(entry=>entry.ready),true);
 const fallback=fixture();await fallback.A.spriteReady;
 assert.equal(Object.values(fallback.A.spriteEntries).every(entry=>!entry.ready),true);
});
test('ready transparent reference sprites replace native bodies and retain their full aspect ratio',()=>{
 const {A,ctx,logs,game,depth}=fixture();game.settings.effects=false;
 const pairs=[['minotaurLord','minotaur'],['flowerDemon','flower'],['mirrorTurtle','turtle'],['fossilRoc','roc'],['thousandHands','deity'],['minotaurCalf','minotaur'],['littleTurtle','turtle'],['abyssCrow','roc'],['lanternSkeleton','lantern']];
 for(const [type,key] of pairs){
  const source={width:key==='deity'?2172:1536,height:key==='deity'?724:1024};A.setSprite(key,source);logs.length=0;
  A.drawEnemy(ctx,game,{type,x:400,y:438,w:150,h:180,health:10,maxHealth:10,boss:type.endsWith('Lord')||type==='flowerDemon'||type==='mirrorTurtle'||type==='fossilRoc'||type==='thousandHands',dir:1});
  const painted=logs.filter(v=>v[0]==='drawImage');assert.equal(painted.length,1,type);assert.equal(painted[0][1],source);
  const [,image,sx,sy,sw,sh,dx,dy,dw,dh]=painted[0];
  assert.ok(sx>=0&&sy>=0&&sx+sw<=source.width+.001&&sy+sh<=source.height+.001,type+' full source crop');
  assert.ok(Math.abs(dw/dh-sw/sh)<1e-10,type+' uniform scale');assert.ok(Math.abs(dy+dh)<1e-10,type+' feet at local floor');
  assert.equal(logs.some(v=>v[0]==='strokeRect'),false,type+' native body must not be painted on top');assert.equal(depth(),0);
 }
});
test('deity art follows the actual four emotion frames, knight art follows the actual phase',()=>{
 const {A,ctx,logs,game}=fixture();game.settings.effects=false;
 const deity={width:2172,height:724},bird={width:1529,height:1029},knight={width:1315,height:1196};
 A.setSprite('deity',deity);A.setSprite('roc',bird);A.setSprite('knight',knight);
 for(const [index,emotion] of ['joy','rage','love','hate'].entries()){
  logs.length=0;A.drawEnemy(ctx,game,{type:'thousandHands',emotion,x:400,y:438,w:200,h:255,health:100,boss:true,dir:-1});
  const call=logs.find(v=>v[0]==='drawImage');assert.equal(call[1],deity);assert.equal(call[2],index*543);assert.equal(call[4],543);
 }
 for(const [form,expected] of [['bird',bird],['knight',knight]]){
  logs.length=0;A.drawEnemy(ctx,game,{type:'fossilRoc',abyssForm:form,x:400,y:438,w:64,h:96,health:50,boss:true});
  assert.equal(logs.find(v=>v[0]==='drawImage')[1],expected);
 }
 logs.length=0;A.setSprite('turtle',{width:1774,height:887});
 A.drawEnemy(ctx,game,{type:'mirrorTurtle',invisible:true,x:400,y:438,w:220,h:145,health:100,boss:true});
 assert.equal(logs.some(v=>v[0]==='drawImage'),false,'refraction remains fully invisible even with decoded sprite');
});
test('image load errors retain native fallback instead of hiding combatants',async()=>{
 class FailedImage{set src(value){this.onerror();}}
 const {A,ctx,logs,game}=fixture({Image:FailedImage});await A.spriteReady;
 assert.equal(A.spriteEntries.minotaur.ready,false);
 assert.equal(A.drawEnemy(ctx,game,{type:'minotaurLord',x:400,y:438,w:158,h:180,health:100,boss:true}),true);
 assert.equal(logs.some(v=>v[0]==='drawImage'),false);assert.ok(logs.some(v=>v[0]==='strokeRect'));
});
test('boss death snapshots render actual art once in foreground and keep combat data immutable',()=>{
 const {A,ctx,logs,game,depth}=fixture();game.level.id=150;
 const images={minotaur:{width:1492,height:1054},deity:{width:2172,height:724},knight:{width:1315,height:1196}};
 for(const [id,image] of Object.entries(images))A.setSprite(id,image);
 game.abyssCorpses=[
  {type:'minotaurLord',archetype:'minotaurLord',x:260,y:438,w:158,h:180,dir:1,progress:.45,timer:.55,duration:1,deathStyle:'minotaur-fall'},
  {type:'thousandHands',archetype:'thousandHands',x:600,y:438,w:200,h:255,dir:-1,emotion:'hate',progress:.45,timer:.55,duration:1,deathStyle:'deity-collapse'},
  {type:'fossilRoc',archetype:'fossilRoc',x:780,y:438,w:64,h:96,dir:-1,abyssForm:'knight',progress:.45,timer:.55,duration:1,deathStyle:'crumble'}
 ];
 const saved=JSON.stringify(game.abyssCorpses);
 A.drawEffects(ctx,game,false);assert.equal(logs.some(v=>v[0]==='drawImage'),false);
 logs.length=0;A.drawEffects(ctx,game,true);
 const imageCalls=logs.filter(v=>v[0]==='drawImage');assert.equal(imageCalls.length,3);
 assert.equal(imageCalls[0][1],images.minotaur);assert.equal(imageCalls[1][1],images.deity);assert.equal(imageCalls[1][2],1629);assert.equal(imageCalls[2][1],images.knight);
 assert.equal(JSON.stringify(game.abyssCorpses),saved);assert.equal(depth(),0);
 assert.ok(logs.some(v=>v[0]==='rotate'&&Math.abs(v[1])>.1),'fall and debris animate');
});
test('death art disappears exactly on expiry and reduced motion uses a stable fade',()=>{
 const {A,ctx,logs,game,depth}=fixture();game.level.id=110;
 A.setSprite('minotaur',{width:1492,height:1054});
 game.abyssCorpses=[{type:'minotaurLord',x:500,y:438,w:158,h:180,dir:1,timer:.5,duration:1,deathStyle:'crumble'}];
 game.settings.reducedMotion=true;A.drawEffects(ctx,game,true);
 assert.equal(logs.filter(v=>v[0]==='drawImage').length,1);assert.equal(logs.some(v=>v[0]==='rotate'&&v[1]!==0),false);
 logs.length=0;game.abyssCorpses[0].timer=0;A.drawEffects(ctx,game,true);
 assert.equal(logs.some(v=>v[0]==='drawImage'),false);
 logs.length=0;game.abyssCorpses[0].timer=.5;game.abyssCorpses[0].expired=true;A.drawEffects(ctx,game,true);
 assert.equal(logs.some(v=>v[0]==='drawImage'),false);assert.equal(depth(),0);
});
test('all five reference backgrounds replace native scenery while retaining the true floor',()=>{
 const {A,ctx,logs,game,depth}=fixture();game.settings.effects=false;
 assert.equal(A.backgroundManifest.length,5);
 for(const [index,key] of ['labyrinth','parasite','lake','echo','tomb'].entries()){
  const source={width:1536,height:864};assert.equal(A.setBackground(key,source),true);game.level.id=101+index*10;logs.length=0;
  A.drawBackground(ctx,game);const calls=logs.filter(v=>v[0]==='drawImage');assert.equal(calls.length,2);
  assert.equal(calls[0][1],source);assert.equal(calls[1][1],source);
  assert.equal(calls[1][7],438);assert.ok(calls[1][9]>=102);assert.ok(calls[1][6]<=0);assert.ok(calls[1][8]>=960);
  assert.ok(Math.abs(calls[0][8]/calls[0][4]-calls[0][9]/calls[0][5])<1e-10,'wall scale preserves architecture proportions');
  assert.ok(Math.abs(calls[1][8]/calls[1][4]-calls[1][9]/calls[1][5])<1e-10,'ground scale preserves stone proportions');
  assert.ok(Math.abs(calls[0][7]+calls[0][9]-438)<1e-10,'painted ledge aligns exactly to collision floor');
  assert.equal(depth(),0);
 }
});
test('background motion is limited to distant walls and never moves its walkable ground',()=>{
 const {A,ctx,logs,game}=fixture();A.setBackground('lake',{width:1536,height:864});game.level.id=125;
 const grounds=[];
 for(const time of [0,.016,2,5,10,33]){
  game.time=time;logs.length=0;A.drawBackground(ctx,game);
  const [wall,ground]=logs.filter(v=>v[0]==='drawImage');
  const center=(960-wall[8])/2;
  assert.ok(Math.abs(wall[6]-center)<=4.001);assert.ok(Math.abs(wall[7]+wall[9]-438)<1e-10);
  grounds.push(JSON.stringify(ground.slice(2)));
 }
 assert.equal(new Set(grounds).size,1);
});
test('missing background assets retain complete scenery and reduced motion stops decorative drift',async()=>{
 const {A,ctx,logs,game}=fixture();await A.backgroundReady;await A.allArtReady;
 A.drawBackground(ctx,game);assert.equal(logs.some(v=>v[0]==='drawImage'),false);assert.ok(logs.filter(v=>v[0]==='fillRect').length>20);
 A.setBackground('labyrinth',{width:1536,height:864});game.settings.reducedMotion=true;
 const frames=[];
 for(const time of [1,20]){logs.length=0;game.time=time;A.drawBackground(ctx,game);frames.push(JSON.stringify(logs));}
 assert.equal(frames[0],frames[1]);
});
test('reference sprite legs and wings animate with stable phases independent of chasing position',()=>{
 const {A,ctx,logs,game,depth}=fixture();A.setSprite('minotaur',{width:1492,height:1054});
 const enemy={type:'minotaurLord',x:300,y:438,w:158,h:180,health:100,boss:true,abyssState:'patrol',dir:1};
 A.drawEnemy(ctx,game,enemy);const originalRotations=logs.filter(v=>v[0]==='rotate').map(v=>v[1]);
 assert.equal(logs.filter(v=>v[0]==='drawImage').length,3);assert.ok(logs.some(v=>v[0]==='clip'&&v[1]==='evenodd'));
 logs.length=0;enemy.x=650;A.drawEnemy(ctx,game,enemy);
 assert.deepEqual(logs.filter(v=>v[0]==='rotate').map(v=>v[1]),originalRotations,'position changes do not restart stride');
 logs.length=0;game.time+=1/60;enemy.abyssState='rest';A.drawEnemy(ctx,game,enemy);
 const nextRotations=logs.filter(v=>v[0]==='rotate').map(v=>v[1]);
 for(let i=0;i<nextRotations.length;i++)assert.ok(Math.abs(nextRotations[i]-originalRotations[i])<.02,'state transitions blend continuously');
 A.setSprite('roc',{width:1529,height:1029});logs.length=0;
 A.drawEnemy(ctx,game,{...enemy,type:'fossilRoc',abyssState:'air'});assert.equal(logs.filter(v=>v[0]==='drawImage').length,3);
 logs.length=0;game.settings.reducedMotion=true;A.drawEnemy(ctx,game,enemy);assert.equal(logs.filter(v=>v[0]==='drawImage').length,1);assert.equal(depth(),0);
});
test('Minotaur rage intensifies its actual sprite eyes and charge trails without replacing the model',()=>{
 const {A,ctx,logs,game,gradients}=fixture(),source={width:1492,height:1054};A.setSprite('minotaur',source);
 const enemy={type:'minotaurLord',x:600,y:438,w:158,h:180,health:100,boss:true,abyssState:'charge',dir:-1,minotaurRage:false};
 A.drawEnemy(ctx,game,enemy);assert.equal(gradients.length,0);
 logs.length=0;enemy.minotaurRage=true;A.drawEnemy(ctx,game,enemy);
 assert.equal(gradients.length,2);assert.ok(logs.some(v=>v[0]==='stop'&&v[2]==='#ff392b'));
 for(const call of logs.filter(v=>v[0]==='drawImage'))assert.equal(call[1],source);
 logs.length=0;gradients.length=0;enemy.minotaurRage=false;A.drawEnemy(ctx,game,enemy);assert.equal(gradients.length,0);
});
test('all Abyss bosses ease their facing change and keep animation phases stable across movement',()=>{
 const {A,ctx,logs,game}=fixture();A.setSprite('minotaur',{width:1492,height:1054});
 const boss={type:'minotaurLord',x:400,y:438,w:158,h:180,health:100,boss:true,abyssState:'patrol',dir:1};
 A.drawEnemy(ctx,game,boss);logs.length=0;boss.dir=-1;A.drawEnemy(ctx,game,boss);
 const atStart=logs.filter(v=>v[0]==='scale').map(v=>v[1]);assert.ok(atStart.includes(1),'the render keeps its old facing on the first turn frame');
 logs.length=0;game.time+=.17;A.drawEnemy(ctx,game,boss);
 const halfway=logs.filter(v=>v[0]==='scale').map(v=>v[1]);assert.ok(halfway.some(v=>Math.abs(v)<.02),'the body turns edge-on smoothly');
 logs.length=0;game.time+=.17;boss.x=650;A.drawEnemy(ctx,game,boss);
 const finished=logs.filter(v=>v[0]==='scale').map(v=>v[1]);assert.ok(finished.includes(-1),'the new facing settles without restarting the stride');
});
test('grounded Abyss bosses animate a visible alternating stride while moving',()=>{
 const {A,ctx,logs,game}=fixture();A.setSprite('minotaur',{width:1492,height:1054});
 const boss={type:'minotaurLord',x:400,y:438,w:158,h:180,health:100,boss:true,abyssState:'approach',dir:1};
 A.drawEnemy(ctx,game,boss);boss.x+=5;game.time+=.05;logs.length=0;A.drawEnemy(ctx,game,boss);
 const rotations=logs.filter(v=>v[0]==='rotate').map(v=>Math.abs(v[1]));assert.ok(rotations.some(v=>v>.04),'the leg artwork rotates visibly during a walking step');
});
test('deity turns a single head before its emotion changes and crossfades the reference palette',()=>{
 const {A,ctx,logs,game,depth}=fixture(),image={width:2172,height:724};A.setSprite('deity',image);
 const boss={type:'thousandHands',x:500,y:438,w:200,h:255,health:100,boss:true,dir:1,emotion:'rage',emotionFrom:'joy',emotionChangedAt:0,emotionTurnDuration:1.4,abyssClock:0,abyssState:'patrol'};
 A.drawEnemy(ctx,game,boss);let frames=logs.filter(v=>v[0]==='drawImage');
 assert.equal(frames.length,4,'the old expression and body stay intact during the first half turn');
 assert.ok(frames.every(v=>v[1]===image));assert.equal(frames.at(-1)[2],0,'the original expression stays visible before the turn');
 logs.length=0;boss.abyssClock=.7;game.time+=.7;A.drawEnemy(ctx,game,boss);frames=logs.filter(v=>v[0]==='drawImage');
 assert.equal(frames.length,7);assert.equal(frames.at(-1)[2],543,'the new expression appears at the edge-on midpoint');
 assert.ok(logs.some(v=>v[0]==='scale'&&Math.abs(v[1]-.08)<.001),'the head turns edge-on before revealing the new face');
 logs.length=0;boss.abyssClock=1.4;game.time+=.7;A.drawEnemy(ctx,game,boss);
 assert.equal(logs.filter(v=>v[0]==='drawImage').length,3,'the finished pose returns to one new-color body');assert.equal(depth(),0);
});
test('approved backgrounds use measured source ledges, never a shared guessed floor ratio',()=>{
 const {A,ctx,logs,game}=fixture();game.settings.reducedMotion=true;
 const measured=[775,640,625,680,714];
 for(const [index,key] of ['labyrinth','parasite','lake','echo','tomb'].entries()){
  A.setBackground(key,{width:1672,height:941});game.level.id=101+index*10;logs.length=0;A.drawBackground(ctx,game);
  const calls=logs.filter(v=>v[0]==='drawImage');
  assert.equal(calls[0][5],measured[index]);assert.equal(calls[1][3],measured[index]);
  assert.equal(calls[1][7],438);assert.ok(Math.abs(calls[0][7]+calls[0][9]-438)<1e-10);
 }
});
