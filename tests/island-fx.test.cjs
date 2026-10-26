const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){const scope=vm.createContext({});vm.runInContext(fs.readFileSync('js/island-fx.js','utf8'),scope);return scope.MM.IslandFX;}
function drawing(){let depth=0;const commands=[];const c=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;},createRadialGradient(){return{addColorStop(){}};},createLinearGradient(){return{addColorStop(){}};}},{get(o,k){if(k in o)return o[k];return(...a)=>{for(const n of a)if(typeof n==='number')assert.ok(Number.isFinite(n),k+' stays finite');commands.push([k,...a]);};},set(o,k,v){o[k]=v;return true;}});return{c,commands,depth:()=>depth};}
const game={time:1,settings:{effects:true,reducedMotion:false}};
test('every island skill has finite paint-only warning, strike and dissolve choreography',()=>{
 const fx=fixture();for(const type of ['wind','scream','quake','lava','poison','boulder','earth-claw','emerge','log','egg-burst','explosion','eye-laser'])for(const phase of ['warning','active'])for(const q of [.01,.5,.99]){
  const z={type,phase,x:480,y:438,w:180,h:110,timer:1-q,life:1,visualLife:1,visualWarning:1,owner:{x:700,y:438,w:100,h:160},...(type==='eye-laser'?{beam:{x1:700,y1:300,x2:200,y2:410,r:12}}:{})};const before=JSON.stringify(z),d=drawing();
  assert.equal(fx.drawHazard(d.c,game,z,3+q),true);assert.equal(d.depth(),0);assert.equal(JSON.stringify(z),before);assert.ok(d.commands.length>2);
  assert.equal(d.commands.filter(c=>c[0]==='fillRect').length,0,'skill artwork never paints an opaque hitbox rectangle');
 }
});
test('projectiles have independent readable silhouettes and finite motion trails',()=>{
 const fx=fixture(),signatures=new Set();for(const type of ['hostile-clover','fish-rune','bird-rune','meteor','fireball','stone','bottle','poison-egg','cursed-bomb','moaiCrack','blessing','cloneShot']){const q={type,x:400,y:300,vx:200,vy:50,life:2,status:type==='fish-rune'?'slow':'vulnerable',poison:type==='poison-egg'},before=JSON.stringify(q),d=drawing();fx.drawProjectile(d.c,game,q,1);assert.equal(d.depth(),0);assert.equal(JSON.stringify(q),before);signatures.add(d.commands.map(c=>c[0]).join(','));assert.equal(d.commands.filter(c=>c[0]==='fillRect').length,0);}assert.ok(signatures.size>=8);
});
test('impact animation is bounded, deterministic on pause and never mutates an enemy',()=>{
 const fx=fixture(),e={x:500,y:438,w:130,h:180,dir:1,archetype:'awakeningMoai',islandState:'charge'};fx.drawEnemy(drawing().c,game,e,0);e.islandState='rest';const before=JSON.stringify(e),a=drawing(),b=drawing();fx.drawEnemy(a.c,game,e,.02);fx.drawEnemy(b.c,game,e,.02);assert.deepEqual(a.commands,b.commands);assert.equal(JSON.stringify(e),before);assert.ok(a.commands.length<220);assert.equal(a.depth(),0);
 const reduced=drawing();fx.drawEnemy(reduced.c,{settings:{reducedMotion:true}},e,100);assert.equal(reduced.commands.length,0);
});
