'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const load=names=>{const c=vm.createContext({});for(const n of names)vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),c);return c;};
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('water extension preserves every original stage, world and enemy definition from release4.0.6',()=>{
 const {MM}=load(['abyss-config','underwater-config','middle-sea-config','campaign']);const C=MM.Campaign;
 assert.equal(digest(C.levels.slice(0,150)),'9b479889e9c08cb6694f66f27cf22635784931d1a2f22a75c0f97b0ed0eb50e0');
 assert.equal(digest(C.worlds.slice(0,15)),'29471aa58d67cde208fef233360777908380fd0335ed0ffabb87c12619111ff4');
 const sea=new Set([...Object.keys(MM.UnderwaterConfig.enemies),...Object.keys(MM.MiddleSeaConfig.enemies)]);
 assert.equal(digest(Object.fromEntries(Object.entries(C.enemyTypes).filter(([name])=>!sea.has(name)))),'e28629f4b04c9759efce8e4d38b55df715dcf0cfce4452e5e4a8db677d38cd72');
 assert.equal(C.levels.length,170);assert.equal(C.getLevel(200).id,170);
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
 assert.match(html,/underwater\.css\?v=4\.2\.0/);assert.match(fs.readFileSync('underwater.css','utf8'),/grid-column:2;grid-row:1/);
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
