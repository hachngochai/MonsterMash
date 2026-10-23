'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(type='kraken'){
 const scope=vm.createContext({});for(const n of ['underwater-config','final-sea-config','underwater-renderer'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),scope);
 let depth=0;const calls=[],gradient={addColorStop(){}};
 const ctx=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;},createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},
 {get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);},set(o,k,v){o[k]=v;return true;}});
 const e={archetype:type,x:650,y:430,w:type==='kraken'?390:118,h:type==='kraken'?360:148,health:20,dir:-1,phase:'active',krakenState:'suction-warning',krakenTimer:1,finalState:'tentacle-warning',finalTimer:.8,finalTargetX:430,finalTargetY:280};
 const z={kind:'kraken-tentacle',owner:e,x:430,y:280,w:92,h:108,phase:'warning',timer:1,total:1};e.krakenTentacle=z;
 const g={level:{id:200,underwater:true},time:2,settings:{},enemies:[e],waterZones:type==='kraken'?[z]:[],waterShots:[],underwater:{bubbles:[]}};
 const R=scope.MM.UnderwaterRenderer;
 const paint=t=>{calls.length=0;R.drawEffects(ctx,g,t,false);let start=calls.findIndex(c=>c[0]==='beginPath'),end=calls.findIndex((c,i)=>i>start&&c[0]==='closePath');return calls.slice(start,end).filter(c=>c[0]==='moveTo'||c[0]==='lineTo').map(c=>c.slice(1));};
 return {g,e,z,R,ctx,calls,paint,depth:()=>depth};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Kraken and squid extend a tapered continuous arm from an attached root before the active collision',()=>{
 for(const type of ['kraken','giantSquid']){
  const {e,paint,depth}=fixture(type),early=paint(2);e.krakenTimer=e.finalTimer=0;const late=paint(2);
  assert.ok(late.length>early.length*2,'the distal arm must visibly travel during anticipation');
  const root=p=>[(p[0][0]+p.at(-1)[0])/2,(p[0][1]+p.at(-1)[1])/2];assert.deepEqual(root(early),root(late));
  const half=late.length/2,baseWidth=Math.hypot(late[0][0]-late.at(-1)[0],late[0][1]-late.at(-1)[1]);
  const tipWidth=Math.hypot(late[half-1][0]-late[half][0],late[half-1][1]-late[half][1]);assert.ok(baseWidth>tipWidth*8,'the tip must taper rather than stay a fixed-width hose');assert.equal(depth(),0);
 }
});
test('the end of anticipation and first active frame keep the same attached arm pose',()=>{
 for(const type of ['kraken','giantSquid']){
  const {e,z,paint}=fixture(type);e.krakenTimer=e.finalTimer=0;const ready=paint(2);
  e.krakenState='suction';e.finalState='tentacle';e.krakenTimer=.4;e.finalTimer=.35;z.phase='active';const active=paint(2);
  assert.equal(ready.length,active.length);ready.forEach((p,i)=>p.forEach((n,j)=>near(n,active[i][j])));
 }
});
test('arm recoil retracts smoothly after damage ends and never mutates the simulation',()=>{
 const {g,e,z,paint,R,ctx,calls,depth}=fixture();e.krakenState='suction';e.krakenTimer=.001;z.phase='active';paint(2);
 e.krakenState='patrol';e.krakenTentacle=null;g.waterZones=[];const before=JSON.stringify(g),start=paint(2.01),middle=paint(2.22),end=paint(2.44);
 assert.ok(start.length>middle.length);assert.equal(end.length,0);assert.equal(JSON.stringify(g),before);
 R.drawEffects(ctx,g,2.44,true);assert.equal(JSON.stringify(g),before);assert.equal(depth(),0);
 assert.ok(calls.every(c=>c.slice(1).every(n=>typeof n!=='number'||Number.isFinite(n))));
});
test('reduced-motion tentacles stay readable and darkness redraws only the exact warning box',()=>{
 const {g,e,z,R,ctx,calls,paint}=fixture();g.settings.reducedMotion=true;e.krakenTimer=.4;
 const first=paint(2),second=paint(20);assert.deepEqual(first,second);
 calls.length=0;R.drawMandatoryWarnings(ctx,g,20);
 assert.ok(calls.some(c=>c[0]==='strokeRect'&&c[1]===z.x-z.w/2&&c[2]===z.y-z.h/2&&c[3]===z.w&&c[4]===z.h));
 assert.ok(!calls.some(c=>c[0]==='ellipse'),'lighting must not repaint full opaque arms over the character');
});
