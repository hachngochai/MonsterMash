'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const load=names=>{const c=vm.createContext({});for(const n of names)vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c);return c;};
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('water extension preserves every original stage, world and enemy definition from release4.0.6',()=>{
 const {MM}=load(['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign']);const C=MM.Campaign;
 assert.equal(digest(C.levels.slice(0,150)),'9b479889e9c08cb6694f66f27cf22635784931d1a2f22a75c0f97b0ed0eb50e0');
 assert.equal(digest(C.worlds.slice(0,15)),'29471aa58d67cde208fef233360777908380fd0335ed0ffabb87c12619111ff4');
 const sea=new Set([...Object.keys(MM.UnderwaterConfig.enemies),...Object.keys(MM.MiddleSeaConfig.enemies),...Object.keys(MM.PredatorSeaConfig.enemies),...Object.keys(MM.DeepSeaConfig.enemies),...Object.keys(MM.FinalSeaConfig.enemies)]);
 assert.equal(digest(Object.fromEntries(Object.entries(C.enemyTypes).filter(([name])=>!sea.has(name)))),'e28629f4b04c9759efce8e4d38b55df715dcf0cfce4452e5e4a8db677d38cd72');
 assert.equal(C.levels.length,200);assert.equal(C.getLevel(200).id,200);
 const HP=new Set();for(const level of C.levels.slice(150,160)){
  assert.equal(level.underwater,true);assert.equal(level.balanceStatus,'provisional-playtest');
  assert.deepEqual(Array.from(level.types),level.id<154?['piranha']:level.id<157?['piranha','pufferfish']:['piranha','pufferfish','seahorse']);
  assert.equal(level.enemyPressureCap,1);assert.equal(level.bossPressureCap,1);
  HP.add(C.createEnemy('piranha',level,'normal',-1,()=>.5).health);
 }assert.deepEqual([...HP],[3]);assert.equal(C.getLevel(160).bossHealth,120);
});
function paint(){let depth=0;const calls=[],gradient={addColorStop(){}};
 const ctx=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},
 {get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);},set(o,k,v){o[k]=v;return true;}});
 const {MM}=load(['underwater-config','underwater-renderer']);
 const g={level:{id:160,underwater:true},time:2,settings:{},underwater:{bubbles:[],oxygenCrates:[],silenceTime:0},waterZones:[],waterShots:[]};
 return {MM,R:MM.UnderwaterRenderer,g,ctx,calls,depth:()=>depth};
}
test('water renderer declines land, paints all four fallback species and balances paint state',()=>{
 const {R,g,ctx,calls,depth}=paint();g.level={id:150};assert.equal(R.drawBackground(ctx,g),false);assert.equal(calls.length,0);
 g.level={id:160,underwater:true};assert.equal(R.drawBackground(ctx,g),true);
 for(const type of R.types)assert.equal(R.drawEnemy(ctx,g,{type,x:600,y:292,w:80,h:70,health:5,maxHealth:5,dir:1,phase:'active'},2),true);
 g.waterZones=[{kind:'water-vortex',phase:'warning',x:400,y:250,radius:170,coreRadius:30,timer:1,total:1},{kind:'water-claw',phase:'active',x:600,y:250,w:155,h:155,timer:.15,total:.35,dir:1}];
 g.waterShots=[{x:300,y:250,vx:320,vy:10,life:1}];g.underwater.bubbles=[{x:250,y:200,size:3,life:1,maxLife:3}];g.underwater.oxygenCrates=[{x:300,y:270,life:8}];
 R.drawEffects(ctx,g,2,false);R.drawEffects(ctx,g,2,true);R.drawLoot(ctx,g,2);assert.equal(depth(),0);
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1].includes('NÉ TÂM')));
});
test('decoded sprites move on one connected surface and reduced motion uses one whole image',()=>{
 const {R,g,ctx,calls,depth}=paint();const image={width:640,height:480};R.setSprite('twinClawFish',image);
 const e={type:'boss',archetype:'twinClawFish',x:700,y:292,w:166,h:134,health:120,dir:1,phase:'active',waterState:'claw-combo',waterClawIndex:2};
 R.drawEnemy(ctx,g,e,2);const pieces=calls.filter(c=>c[0]==='drawImage');assert.equal(pieces.length,24);
 for(const [,im,x,y,w,h]of pieces){assert.equal(im,image);assert.ok(x>=0&&y>=0&&x+w<=640.00001&&y+h<=480.00001);}
 assert.equal(depth(),0);calls.length=0;g.settings.reducedMotion=true;R.drawEnemy(ctx,g,e,3);assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);assert.equal(depth(),0);
});
test('all art is local, shipped and connected before game bootstrap, with oxygen directly below hearts',()=>{
 const {R}=paint();for(const p of [...R.spriteManifest,...R.backgroundManifest])assert.ok(fs.statSync(p).size>10000,p);
 const html=fs.readFileSync('index.html','utf8'),build=fs.readFileSync('scripts/build.mjs','utf8');
 for(const name of ['underwater-config','underwater','underwater-enemies','boss160','underwater-renderer']){
  assert.ok(html.indexOf('src="js/'+name+'.js')<html.indexOf('src="js/game.js'));assert.ok(build.includes("'"+name+"'"));
 }assert.ok(html.indexOf('src="js/underwater-config.js')<html.indexOf('src="js/campaign.js'));
 assert.match(html,/<div class="health-stack"><div class="health"[^>]+><\/div><div class="oxygen-hud"/);assert.match(html,/id="oxygen-button"/);
 assert.match(html,/underwater\.css\?v=\d+\.\d+\.\d+/);assert.match(fs.readFileSync('underwater.css','utf8'),/grid-column:2;grid-row:1/);
});
test('oxygen HUD tracks finite reserves and independent statuses without rebuilding bubble nodes',()=>{
 const scope=load(['underwater-config','underwater']);const {MM}=scope;
 const classes=()=>({values:{},toggle(k,v){this.values[k]=v;}}),node=()=>({textContent:'',children:[],classList:classes(),setAttribute(k,v){this[k]=v;},append(n){this.children.push(n);}});
 const small=node(),jump={querySelector:()=>small,setAttribute(k,v){this[k]=v;}};
 scope.document={body:{classList:classes()},querySelector:()=>jump,createElement:node};
 const g={headless:false,screen:'playing',level:{underwater:true},player:{x:300,y:292,h:54},ui:Object.fromEntries(['oxygen-hud','oxygen-pips','oxygen-label','underwater-status','oxygen-button'].map(id=>[id,node()]))};
 const s=MM.UnderwaterMode.reset(g);MM.UnderwaterMode.syncUI(g);assert.equal(small.textContent,'OXY');assert.equal(g.ui['oxygen-button'].disabled,true);
 const original=g.ui['oxygen-pips'].children[0];s.oxygen=0;s.silenceTime=2.9;MM.UnderwaterMode.oxygenChanged(g);MM.UnderwaterMode.syncUI(g);
 assert.match(g.ui['underwater-status'].textContent,/NGẠT 5s · CÂM LẶNG 3s/);assert.equal(g.ui['oxygen-button'].disabled,false);
 s.oxygen=15;MM.UnderwaterMode.oxygenChanged(g);MM.UnderwaterMode.syncUI(g);assert.match(g.ui['underwater-status'].textContent,/^CÂM LẶNG/);
 assert.equal(g.ui['oxygen-pips'].children.length,10);assert.equal(g.ui['oxygen-pips'].children[0],original);
 g.level={underwater:false};MM.UnderwaterMode.syncUI(g);assert.equal(g.ui['oxygen-hud'].hidden,true);assert.equal(small.textContent,'NHẢY');
});
test('each ocean band selects its matching local scene without replacing the first two backgrounds',()=>{
 const {R,g,ctx,calls}=paint(),keys=['shallow','middle','predator','deep','final'];
 const images=keys.map(key=>({width:960,height:540,name:key}));keys.forEach((key,i)=>assert.equal(R.setBackground(images[i],key),true));
 for(const [i,id]of[151,161,171,181,191].entries()){
  calls.length=0;g.level={id,underwater:true};R.drawBackground(ctx,g,2);assert.equal(calls.find(call=>call[0]==='drawImage')[1],images[i]);
 }
 assert.ok(R.backgroundManifest.includes('assets/backgrounds/underwater/deep-chasm.png'));assert.ok(R.backgroundManifest.includes('assets/backgrounds/underwater/kraken-grave.png'));
});
test('new sea actors use complete connected art, preserve source bounds and keep front-facing species unmirrored',()=>{
 const {R,g,ctx,calls,depth}=paint(),image={width:640,height:480};g.level={id:200,underwater:true};
 const front=new Set(['electricRay','seaCrab','pearlClam','glowBug','kraken']);
 const old=new Set(['piranha','pufferfish','seahorse','twinClawFish','babyShark','electricJellyfish','phantomJellyfish']);
 for(const type of R.types.filter(type=>!old.has(type))){
  calls.length=0;R.setSprite(type,image);const e={archetype:type,x:650,y:400,w:150,h:100,health:10,maxHealth:10,dir:-1,phase:'active',pearlAvailable:true};
  R.drawEnemy(ctx,g,e,3);const pieces=calls.filter(call=>call[0]==='drawImage');assert.equal(pieces.length,['giantSquid','kraken'].includes(type)?40:24,type);
  for(const [,im,x,y,w,h]of pieces){assert.equal(im,image);assert.ok(x>=0&&y>=0&&x+w<=640.00001&&y+h<=480.00001,type);}
  if(front.has(type))assert.ok(!calls.some(call=>call[0]==='scale'&&call[1]<0),type);
  assert.ok(calls.every(call=>call.slice(1).every(value=>typeof value!=='number'||Number.isFinite(value))),type);assert.equal(depth(),0);
  calls.length=0;g.settings.reducedMotion=true;R.drawEnemy(ctx,g,e,8);assert.equal(calls.filter(call=>call[0]==='drawImage').length,1,type);g.settings.reducedMotion=false;
 }
 assert.equal(R.types.length,22);assert.equal(new Set(R.spriteManifest).size,R.spriteManifest.length);
});
test('zero-HP pending finales remain visible while a genuinely hidden or defeated body cannot be painted',()=>{
 const {R,g,ctx,calls}=paint();g.level={id:200,underwater:true};g.settings.reducedMotion=true;
 for(const [type,state]of[['megaLondon',{predatorRage:true}],['leviathan',{deepEnraged:true}],['leviathan',{deepFinal:true}],['kraken',{krakenDying:true,krakenStone:true}]]){
  R.setSprite(type,{width:640,height:480});calls.length=0;R.drawEnemy(ctx,g,{archetype:type,x:650,y:400,w:180,h:120,health:0,dir:1,phase:'active',...state},2);
  assert.ok(calls.some(call=>call[0]==='drawImage'),type);
 }
 for(const state of [{health:0},{health:20,predatorHidden:true},{health:20,dead:true},{health:20,retired:true}]){
  calls.length=0;R.drawEnemy(ctx,g,{archetype:'megaLondon',x:650,y:400,w:180,h:120,dir:1,phase:'active',...state},2);assert.equal(calls.length,0);
 }
});
test('new warnings follow simulation geometry, include real shipwreck art, and never mutate combat state',()=>{
 const {R,g,ctx,calls,depth}=paint();g.level={id:200,underwater:true};g.player={x:480,y:292,w:38,h:54};
 g.enemies=[
  {archetype:'swordfish',x:-69,y:292,w:138,h:44,health:3,phase:'warning',predatorDirection:1,predatorWarningX:24},
  {archetype:'megaLondon',x:700,y:600,w:330,h:162,health:20,predatorHidden:true,predatorState:'dive-hidden',predatorTargetX:330,predatorEmergenceLocked:true},
  {archetype:'gulper',x:700,y:292,w:136,h:62,health:5,dir:-1,deepState:'suction-warning'},
  {archetype:'glowBug',x:500,y:300,w:38,h:36,health:1,deepState:'explode-warning'},
  {archetype:'leviathan',x:650,y:300,w:350,h:172,health:0,dir:-1,deepFinal:true,deepBossState:'final-warning'},
  {archetype:'seaCrab',x:350,y:425,w:84,h:58,health:5,finalState:'claw-warning'},
  {archetype:'giantSquid',x:700,y:330,w:118,h:148,health:9,finalState:'tentacle-warning',finalTargetX:480,finalTargetY:265},
  {archetype:'kraken',x:700,y:400,w:390,h:360,health:110,krakenState:'ship-warning',krakenTargetX:480,krakenTargetY:265,krakenProgress:.5}
 ];
 g.waterZones=[{kind:'predator-roar',phase:'warning',x:600,y:250,dir:-1,range:480,height:300,timer:1,total:1},
  {kind:'predator-roar',phase:'active',x:600,y:250,dir:-1,range:480,height:300,frontRadius:190,timer:.5,total:3},
  {kind:'kraken-tentacle',phase:'warning',x:480,y:265,w:92,h:108,originX:700,originY:240},
  {kind:'kraken-tentacle',phase:'active',x:480,y:265,w:92,h:108,originX:700,originY:240}];
 g.waterShots=[{kind:'predator-electric',x:500,y:250,vx:-420,vy:0,life:1},{kind:'kraken-ship',x:570,y:290,w:88,h:46,rotation:.2,life:1}];
 g.finalSea={vents:[{x:155,y:438,w:60,h:330,phase:'warning'},{x:805,y:438,w:60,h:330,phase:'active',damage:2}],inkClouds:[{x:650,y:265,radius:80,life:1,total:2.5}]};
 const before=JSON.stringify(g);R.drawEffects(ctx,g,2,false);R.drawEffects(ctx,g,2,true);R.drawMandatoryWarnings(ctx,g,2);assert.equal(JSON.stringify(g),before);assert.equal(depth(),0);
 assert.ok(calls.some(call=>call[0]==='fillText'&&call[1].includes('CÁ KIẾM TỪ TRÁI')));assert.ok(calls.some(call=>call[0]==='strokeRect'&&call[1]===125&&call[2]===108&&call[3]===60&&call[4]===330));
 assert.ok(calls.some(call=>call[0]==='bezierCurveTo'));assert.ok(calls.every(call=>call.slice(1).every(value=>typeof value!=='number'||Number.isFinite(value))));
 g.level.id=170;calls.length=0;assert.equal(R.drawMandatoryWarnings(ctx,g,2),false);assert.equal(calls.length,0);
});
