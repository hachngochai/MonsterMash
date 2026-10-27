'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/cosmic-scenery.js','utf8');
const ids=['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun','blackHole'];
function fixture(extra={}){const scope=vm.createContext({...extra});vm.runInContext(fs.readFileSync('js/cosmic-config.js','utf8'),scope);vm.runInContext(source,scope);return {R:scope.MM.CosmicScenery,scope};}
function canvas(){
 const calls=[],states=[],target={globalAlpha:1,globalCompositeOperation:'source-over'},finite=(name,args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name+' finite');};
 const methods={save(){states.push({...target});calls.push(['save']);},restore(){assert.ok(states.length);const s=states.pop();for(const k of Object.keys(target))delete target[k];Object.assign(target,s);calls.push(['restore']);},createLinearGradient(...args){finite('linear gradient',args);calls.push(['gradient',...args]);return {addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);calls.push(['stop',offset,color]);}};},createRadialGradient(...args){finite('radial gradient',args);assert.ok(args[2]>=0&&args[5]>0);calls.push(['radial',...args]);return {addColorStop(offset,color){assert.ok(offset>=0&&offset<=1);calls.push(['stop',offset,color]);}};}};
 const c=new Proxy(target,{get(o,key){if(key in methods)return methods[key];if(key in o)return o[key];return(...args)=>{finite(String(key),args);if(key==='ellipse')assert.ok(args[2]>0&&args[3]>0);if(key==='arc')assert.ok(args[2]>0);calls.push([key,...args]);};},set(o,key,v){if(['globalAlpha','lineWidth'].includes(key))assert.ok(Number.isFinite(v));o[key]=v;return true;}});
 return {c,calls,depth:()=>states.length};
}
test('all ten cosmic regions paint distinct finite geometry without changing authored region data or caller canvas state',()=>{
 const {R,scope}=fixture(),signatures=[];
 for(const [i,id]of ids.entries())for(const time of [0,1,1e6,-50,NaN,Infinity]){
  const {c,calls,depth}=canvas();c.globalAlpha=.73;c.globalCompositeOperation='screen';const input=scope.MM.CosmicConfig.authored.regions[i],before=JSON.stringify(input);
  assert.equal(R.drawBackground(c,input,time),true);assert.equal(JSON.stringify(input),before);assert.equal(depth(),0);assert.equal(c.globalAlpha,.73);assert.equal(c.globalCompositeOperation,'screen');
  assert.ok(calls.length<2300,'bounded native fallback draw work');
  if(time===0)signatures.push(JSON.stringify(calls));
 }
 assert.equal(new Set(signatures).size,10);
});
test('reduced motion and disabled effects keep each scene deterministic while normal ambience advances',()=>{
 const {R}=fixture();
 for(const id of ids){
  for(const options of [{effects:false},{reducedMotion:true}]){const a=canvas(),b=canvas();R.drawBackground(a.c,id,1,options);R.drawBackground(b.c,id,900,options);assert.equal(JSON.stringify(a.calls),JSON.stringify(b.calls),id);}
  if(id!=='moon'){const a=canvas(),b=canvas();R.drawBackground(a.c,id,1);R.drawBackground(b.c,id,90);assert.notEqual(JSON.stringify(a.calls),JSON.stringify(b.calls),id+' has live ambient movement');}
 }
});
test('only released cosmic stage IDs or known regions can paint, with the same floor for every ten-stage band',()=>{
 const {R}=fixture();for(const value of [null,0,250,351,NaN,Infinity,'__proto__','constructor',{},'unknown']){const {c,calls}=canvas();assert.equal(R.drawBackground(c,value),false);assert.equal(calls.length,0);}
 for(const [i,id]of ids.entries())for(const value of [251+i*10,260+i*10,{region:id}]){const a=canvas(),b=canvas();R.drawBackground(a.c,value,0);R.drawBackground(b.c,id,0);assert.equal(JSON.stringify(a.calls),JSON.stringify(b.calls));assert.ok(a.calls.some(v=>v[0]==='fillRect'&&v[2]===438),'real walking baseline remains y438');}
});
test('background loading is local and reusable; a failed plate keeps its code-native biome available',async()=>{
 const pending=[];class FakeImage{constructor(){this.width=1672;this.height=941;}set src(value){this.srcValue=value;pending.push(this);}}
 const {R}=fixture({Image:FakeImage});assert.equal(pending.length,10);assert.equal(new Set(pending.map(p=>p.srcValue)).size,10);
 for(const image of pending)image.srcValue.includes('venus.png')?image.onerror():image.onload();const results=Array.from(await R.allArtReady);assert.equal(results.filter(Boolean).length,9);
 assert.equal(R.getState().venus.failed,true);assert.equal(R.getState().venus.ready,false);
 const failed=canvas();assert.equal(R.drawBackground(failed.c,'venus',0),true);assert.ok(!failed.calls.some(v=>v[0]==='drawImage'));
 const image={width:1800,height:1000};assert.equal(R.setBackground(image,'venus',{floor:.7}),true);assert.equal(R.getState().venus.floor,.7);
 const ready=canvas();R.drawBackground(ready.c,'venus',3);assert.equal(ready.calls.filter(v=>v[0]==='drawImage').length,2,'a decoded plate is split only at its measured walking line');assert.equal(pending.length,10,'drawing never refetches an image');
 for(const invalid of [null,{width:0,height:500},{width:Infinity,height:500}])assert.equal(R.setBackground(invalid,'venus'),false);
});
