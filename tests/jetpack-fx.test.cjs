'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(extra={}){
  const math=Object.create(Math);math.random=()=>{throw new Error('jetpack painting must not consume gameplay RNG');};
  const scope=vm.createContext({Math:math});vm.runInContext(fs.readFileSync('js/cosmic-renderer.js','utf8'),scope);
  const g={level:{cosmic:true},settings:{effects:true,reducedMotion:false},time:0,
    player:{x:480,y:275,w:38,h:54,dir:1,vx:0,vy:0,health:5,maxHealth:5,ammo:47},cosmicRewards:{jetpack:6,jetCooldown:0},
    random(){throw new Error('painting must not consume game RNG');},...extra};
  return {R:scope.MM.CosmicRenderer,g};
}
function canvas(capture=true){
  const calls=[],states=[],target={globalAlpha:.73,globalCompositeOperation:'source-over',lineWidth:2,lineCap:'butt',lineJoin:'miter'};let count=0;
  const note=(name,args=[])=>{count++;if(capture)calls.push([name,...args]);for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name+' finite');};
  const methods={save(){states.push({...target});note('save');},restore(){assert.ok(states.length,'balanced restore');const previous=states.pop();for(const key of Object.keys(target))delete target[key];Object.assign(target,previous);note('restore');},
    createLinearGradient(...args){note('linear',args);return {addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);note('stop',[offset,color]);}};},
    createRadialGradient(...args){note('radial',args);assert.ok(args[2]>=0&&args[5]>0);return {addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);note('stop',[offset,color]);}};}};
  const c=new Proxy(target,{get(o,key){if(key in methods)return methods[key];if(key in o)return o[key];return(...args)=>{if(key==='ellipse')assert.ok(args[2]>0&&args[3]>0);note(String(key),args);};},set(o,key,value){if(['globalAlpha','lineWidth'].includes(key))assert.ok(Number.isFinite(value));o[key]=value;return true;}});
  return {c,calls,depth:()=>states.length,count:()=>count,properties:()=>({...target})};
}
const signature=calls=>crypto.createHash('sha256').update(JSON.stringify(calls)).digest('hex');

test('jetpack exhaust stays finite and restores canvas state through takeoff, movement, turns and landing',()=>{
  for(const dir of [-1,1])for(const y of [80,275,438])for(const vx of [-180,0,180]){
    const {R,g}=fixture();Object.assign(g.player,{dir,y,vx});const before=JSON.stringify(g);
    for(const time of [0,.008,.024,.074,.174,NaN,Infinity]){const {c,depth,properties,count}=canvas(false),state=properties();
      assert.equal(R.drawJetpack(c,g,time),true);assert.equal(depth(),0);assert.deepEqual(properties(),state);assert.ok(count()<1200);}
    assert.equal(JSON.stringify(g),before,'paint-only state cannot change player resources or physics');
  }
});

test('a game-clock pause freezes plume particles and pressure without consulting wall time',()=>{
  const {R,g}=fixture();R.drawJetpack(canvas().c,g,0);R.drawJetpack(canvas().c,g,.1);R.drawJetpack(canvas().c,g,.2);
  const before=R.jetpackState(g),first=canvas();R.drawJetpack(first.c,g,.2);
  for(let i=0;i<20;i++){const next=canvas();R.drawJetpack(next.c,g,.2);assert.equal(signature(next.calls),signature(first.calls));assert.deepEqual(R.jetpackState(g),before);}
  const debug=R.jetpackState(g);debug.active=false;debug.particles=10000;assert.deepEqual(R.jetpackState(g),before,'debug snapshots cannot mutate the renderer cache');
});

test('switching off thrust clears the flame and all remaining wisps after a short settle',()=>{
  const {R,g}=fixture();for(let i=0;i<=30;i++)R.drawJetpack(canvas(false).c,g,i*.02);
  assert.ok(R.jetpackState(g).particles>0);g.cosmicRewards.jetpack=0;
  for(let i=31;i<=110;i++)R.drawJetpack(canvas(false).c,g,i*.02);
  const state=R.jetpackState(g),last=canvas();R.drawJetpack(last.c,g,2.22);
  assert.equal(state.active,false);assert.equal(state.particles,0);assert.equal(state.thrust,0);
  assert.ok(!last.calls.some(call=>call[0]==='radial'),'inactive housing has no exhaust glow');
  assert.equal(g.cosmicRewards.jetCooldown,0,'paint cannot start or alter gameplay cooldowns');
});

test('several minutes of exhaust use a bounded particle pool and never modify HP, ammo or jetpack duration',()=>{
  const {R,g}=fixture();const before=JSON.stringify(g);let peak=0;
  for(let i=0;i<3600;i++){const {c,count,depth}=canvas(false);R.drawJetpack(c,g,i*.05);const state=R.jetpackState(g);peak=Math.max(peak,state.particles);
    assert.ok(state.particles<=32);assert.ok(count()<1200);assert.equal(depth(),0);}
  assert.ok(peak>0);assert.equal(JSON.stringify(g),before);assert.equal(g.cosmicRewards.jetpack,6);
});

test('reduced motion and disabled effects paint a static readable jet without accumulating particles',()=>{
  for(const settings of [{effects:false,reducedMotion:false},{effects:true,reducedMotion:true}]){
    const render=time=>{const {R,g}=fixture({settings}),{c,calls}=canvas();R.drawJetpack(c,g,time);assert.equal(R.jetpackState(g).particles,0);return signature(calls);};
    assert.equal(render(1),render(100));
  }
});

test('jetpack painting remains optional outside cosmic maps and requires no image or combat modules',()=>{
  const {R,g}=fixture();g.level.cosmic=false;const blank=canvas();assert.equal(R.drawJetpack(blank.c,g,0),false);assert.equal(blank.calls.length,0);
  delete g.player;assert.equal(R.drawJetpack(blank.c,g,0),false);
  const minimal={player:{x:400,y:300,w:38,h:54,dir:-1,vx:10,vy:0},cosmicRewards:{jetpack:1},settings:{},level:{cosmic:true}};
  assert.equal(R.drawJetpack(canvas().c,minimal,0),true);assert.equal(R.drawJetpack(canvas().c,minimal,.1),true);
});
