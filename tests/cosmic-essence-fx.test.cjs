'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync('js/cosmic-essence-fx.js','utf8');
const ids=['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun','blackHole'];
function fixture(extra={}){const scope=vm.createContext({});vm.runInContext(source,scope);scope.MM.CosmicArt={drawEnemy(c,g,a,t){c.save();c.translate(a.x,a.y);c.rotate(Math.sin(t)*.01);c.fillRect(-15,-a.h,30,a.h);c.restore();return true;}};
  const g={settings:{effects:true,reducedMotion:false},player:{x:400,y:438,w:38,h:54,dir:1,health:55,ammo:60},enemies:[{x:650,y:438,w:60,h:80,health:20}],
    cosmicRewards:{effects:[],projectiles:[],knights:[],flashes:[],stance:null,virtualArmor:5},...extra};
  return {FX:scope.MM.CosmicEssenceFX,g};
}
function put(g,id){const s=g.cosmicRewards,target=g.enemies[0];
  if(id==='saturn')s.projectiles.push({id,kind:'stone',x:440,y:418,vx:330,vy:0,damage:20,life:3});
  else if(id==='uranus')s.knights.push({x:450,y:438,w:35,h:65,dir:1,health:20,maxHealth:20,life:20});
  else if(id==='moon'||id==='sun'){s.stance=id;s.projectiles.push({id,kind:'palm',x:500,y:410,vx:650,vy:0,damage:6,life:2});}
  else s.effects.push({id,age:1.3,remaining:3.7,dir:1,x:400,y:408,targets:[target]});
}
function canvas(){
  const calls=[],states=[],target={globalAlpha:.73,globalCompositeOperation:'source-over',lineWidth:2,lineCap:'butt',lineJoin:'miter'};
  const finite=(name,args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name+' has finite geometry');};
  const methods={save(){states.push({...target});calls.push(['save']);},restore(){assert.ok(states.length,'every restore has a matching save');const previous=states.pop();for(const key of Object.keys(target))delete target[key];Object.assign(target,previous);calls.push(['restore']);},
    createLinearGradient(...args){finite('linear gradient',args);calls.push(['linear',...args]);return {addColorStop(offset,colour){assert.ok(offset>=0&&offset<=1);calls.push(['stop',offset,colour]);}};},
    createRadialGradient(...args){finite('radial gradient',args);assert.ok(args[2]>=0&&args[5]>0);calls.push(['radial',...args]);return {addColorStop(offset,colour){assert.ok(offset>=0&&offset<=1);calls.push(['stop',offset,colour]);}};}};
  const c=new Proxy(target,{get(o,key){if(key in methods)return methods[key];if(key in o)return o[key];return(...args)=>{finite(String(key),args);if(key==='ellipse')assert.ok(args[2]>0&&args[3]>0);if(key==='arc')assert.ok(args[2]>0);calls.push([key,...args]);};},set(o,key,value){if(['globalAlpha','lineWidth'].includes(key))assert.ok(Number.isFinite(value));o[key]=value;return true;}});
  return {c,calls,depth:()=>states.length,properties:()=>({...target})};
}

test('all ten essences draw distinct finite effects and restore the caller canvas state',()=>{
  const signatures=[];
  for(const id of ids)for(const time of [0,.1,3,1e6]){
    const {FX,g}=fixture();put(g,id);const {c,calls,depth,properties}=canvas(),before=properties();
    assert.equal(FX.draw(c,g,time),true);FX.drawPlayer(c,g,time);
    assert.equal(depth(),0);assert.deepEqual(properties(),before);assert.ok(calls.length<3500,'bounded draw work for '+id);
    if(time===3)signatures.push(JSON.stringify(calls));
  }
  assert.equal(new Set(signatures).size,10);
});

test('overlapping essence effects and explosion aftermath never change combat timers, HP, ammo or targets',()=>{
  const {FX,g}=fixture();for(const id of ids)put(g,id);g.cosmicRewards.flashes.push({x:480,y:270,remaining:.5,duration:1});
  const state=()=>JSON.stringify({player:g.player,enemies:g.enemies,effects:g.cosmicRewards.effects,projectiles:g.cosmicRewards.projectiles,
    knights:g.cosmicRewards.knights.map(({visualActor,...a})=>a),flashes:g.cosmicRewards.flashes});const before=state();
  for(let i=0;i<120;i++){const {c,calls,depth}=canvas();FX.draw(c,g,i/60);FX.drawPlayer(c,g,i/60);assert.equal(depth(),0);assert.ok(calls.length<5000);}
  assert.equal(state(),before);
});

test('reduced motion and disabled effects keep essence ambience and player halos still',()=>{
  for(const settings of [{effects:false,reducedMotion:false},{effects:true,reducedMotion:true}]){
    const render=time=>{const {FX,g}=fixture({settings});for(const id of ids)put(g,id);const {c,calls}=canvas();FX.draw(c,g,time);FX.drawPlayer(c,g,time);return crypto.createHash('sha256').update(JSON.stringify(calls)).digest('hex');};
    assert.equal(render(1),render(90));
  }
});

test('empty essence state paints nothing and missing state returns cleanly',()=>{
  const {FX,g}=fixture(),{c,calls,depth}=canvas();delete g.cosmicRewards;
  assert.equal(FX.draw(c,g,2),false);FX.drawPlayer(c,g,2);assert.equal(calls.length,0);assert.equal(depth(),0);
  const ready=fixture(),empty=canvas();assert.equal(ready.FX.draw(empty.c,ready.g,2),true);assert.equal(empty.depth(),0);
  assert.ok(!empty.calls.some(v=>['fill','stroke','fillRect','drawImage'].includes(v[0])));
});
