'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(settings={effects:true,reducedMotion:false}){
 const scope=vm.createContext({});vm.runInContext(fs.readFileSync('js/cosmic-essence-fx.js','utf8'),scope);
 const effect={id:'jupiter',age:1.25,remaining:3.75,dir:1,targets:[{x:600,y:170,h:150,w:70,health:10}]};
 const g={settings,player:{x:300,y:260,w:38,h:54,dir:-1,ammo:80,health:5},cosmicRewards:{effects:[effect],projectiles:[],knights:[],flashes:[]}};
 return {FX:scope.MM.CosmicEssenceFX,g,effect};
}
function canvas(){const calls=[],points=[],stack=[],properties={globalAlpha:.72,lineWidth:2,lineCap:'butt',lineJoin:'miter'},methods={
 save(){stack.push({...properties});},restore(){assert.ok(stack.length);const saved=stack.pop();for(const k of Object.keys(properties))delete properties[k];Object.assign(properties,saved);},
 createRadialGradient(...args){assert.ok(args.every(Number.isFinite));calls.push(['gradient',...args]);return {addColorStop(n){assert.ok(n>=0&&n<=1);}};}
 };const c=new Proxy(properties,{get(o,k){if(k in methods)return methods[k];if(k in o)return o[k];return(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k+' finite');calls.push([k,...args]);if(['moveTo','lineTo','quadraticCurveTo','bezierCurveTo'].includes(k))for(let i=0;i<args.length;i+=2)points.push([args[i],args[i+1]]);};},set(o,k,v){o[k]=v;return true;}});
 return {c,calls,points,depth:()=>stack.length,properties:()=>({...properties})};
}
test('creeping vine remains on the soil even when the hunter and target are high in the air',()=>{
 const {FX,g}=fixture(),drawing=canvas(),before=drawing.properties(),state=JSON.stringify(g);FX.draw(drawing.c,g,2);
 assert.ok(drawing.calls.some(v=>v[0]==='translate'&&v[1]===300&&v[2]===438));
 assert.ok(drawing.calls.some(v=>v[0]==='scale'&&v[1]===1),'cast direction remains right despite hunter facing left');
 assert.ok(drawing.points.length>100);assert.ok(drawing.points.every(([,y])=>y>=-34&&y<=9),'no tall wrapping columns or aerial tendrils');
 assert.equal(drawing.depth(),0);assert.deepEqual(drawing.properties(),before);assert.equal(JSON.stringify(g),state,'painting never consumes ammunition or applies damage');
});
test('a left cast grows progressively along the same ground baseline, with finite bounded work',()=>{
 for(const age of [0,.02,.15,.4,.8,1,4.999]){const {FX,g,effect}=fixture();effect.age=age;effect.remaining=5-age;effect.dir=-1;const drawing=canvas();FX.draw(drawing.c,g,age);
  assert.ok(drawing.calls.some(v=>v[0]==='scale'&&v[1]===-1));assert.equal(drawing.depth(),0);assert.ok(drawing.calls.length<1100);
  assert.ok(drawing.points.every(([x,y])=>x>=0&&x<=492&&y>=-34&&y<=9));
  if(age===.02)assert.ok(drawing.points.every(([x])=>x<20),'new roots emerge instead of appearing across the whole range');
 }
});
test('reduced-motion vine is deterministic across render times while preserving its authored cast clock',()=>{
 for(const settings of [{effects:true,reducedMotion:true},{effects:false,reducedMotion:false}]){const draw=t=>{const {FX,g}=fixture(settings),drawing=canvas();FX.draw(drawing.c,g,t);return JSON.stringify(drawing.calls);};assert.equal(draw(1),draw(300));}
});
