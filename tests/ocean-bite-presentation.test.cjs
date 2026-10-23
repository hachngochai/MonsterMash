'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function fixture(){
 const scope=vm.createContext({});
 for(const name of ['underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','underwater-renderer'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
 let depth=0;const calls=[],gradient={addColorStop(){}};
 const ctx=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;},createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},
  {get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);},set(o,k,v){o[k]=v;calls.push(['set',k,v]);return true;}});
 const R=scope.MM.UnderwaterRenderer,g={level:{id:200,underwater:true},time:2,settings:{},waterZones:[],waterShots:[],underwater:{bubbles:[],oxygenCrates:[]},enemies:[]};
 const image={width:640,height:480};for(const type of ['megaLondon','leviathan','ghostShark','anglerFish'])R.setSprite(type,image);
 const enemy=extra=>({archetype:'megaLondon',x:650,y:350,w:330,h:162,health:40,dir:-1,phase:'active',finalSeaSummon:true,krakenState:'patrol',krakenProgress:1,...extra});
 const mesh=e=>{calls.length=0;R.drawEnemy(ctx,g,e,2);return calls.filter(c=>c[0]==='transform');};
 return {R,g,ctx,calls,enemy,mesh,depth:()=>depth};
}

test('a biting jaw articulates the original connected art while skull, hinge edge and tail stay fixed',()=>{
 const {mesh,enemy,depth}=fixture(),idle=mesh(enemy()),bite=mesh(enemy({krakenState:'bite',krakenTimer:.325}));
 assert.equal(idle.length,24);assert.equal(bite.length,24);
 assert.deepEqual(bite.slice(0,20),idle.slice(0,20));assert.notDeepEqual(bite.slice(20),idle.slice(20));
 for(const [,a,b,c,d,...rest]of bite){assert.ok(a*d-b*c>0,'jaw triangles must not flip');assert.ok([a,b,c,d,...rest].every(Number.isFinite));}
 assert.equal(depth(),0);
});

test('fully open anticipation and the first bite frame share the same jaw pose without a warning-progress pop',()=>{
 const {mesh,enemy}=fixture();
 assert.deepEqual(mesh(enemy({krakenState:'bite-warning',krakenTimer:0})),mesh(enemy({krakenState:'bite',krakenTimer:.65})));
 const end=mesh(enemy({krakenState:'bite',krakenTimer:0})),idle=mesh(enemy());assert.deepEqual(end,idle);
});

test('old angler actors retaining warning progress still close their jaw from the real active timer',()=>{
 const {mesh,enemy}=fixture(),common={archetype:'anglerFish',finalSeaSummon:false,krakenState:undefined,finalState:'bite',finalProgress:1,w:110,h:80};
 const open=mesh(enemy({...common,finalTimer:.45})),closed=mesh(enemy({...common,finalTimer:.225}));
 assert.deepEqual(open.slice(0,20),closed.slice(0,20));assert.notDeepEqual(open.slice(20),closed.slice(20));
});

test('Kraken summoned bites use their actual attack angle for a physical water wake without mutating combat',()=>{
 const {R,g,ctx,calls,enemy,depth}=fixture();g.enemies=[enemy({krakenState:'bite',krakenTimer:.325,krakenAngle:Math.PI*.8})];const before=JSON.stringify(g);
 R.drawEffects(ctx,g,2,true);
 assert.equal(JSON.stringify(g),before);assert.ok(calls.some(c=>c[0]==='rotate'&&c[1]===Math.PI*.8));
 assert.ok(calls.some(c=>c[0]==='bezierCurveTo'));assert.ok(calls.some(c=>c[0]==='ellipse'));
 assert.ok(!calls.some(c=>c[0]==='set'&&c[1]==='globalCompositeOperation'&&c[2]==='screen'));
 assert.ok(!calls.some(c=>c[0]==='quadraticCurveTo'),'detached glowing mouth arcs have been removed');assert.equal(depth(),0);
});

test('reduced motion keeps complete source art and suppresses extra bite-water motion',()=>{
 const {R,g,ctx,calls,enemy,depth}=fixture();g.settings.reducedMotion=true;const e=enemy({krakenState:'bite',krakenTimer:.325});g.enemies=[e];
 R.drawEnemy(ctx,g,e,2);assert.equal(calls.filter(c=>c[0]==='drawImage').length,1);calls.length=0;
 R.drawEffects(ctx,g,2,true);assert.ok(!calls.some(c=>['ellipse','bezierCurveTo','quadraticCurveTo'].includes(c[0])));assert.equal(depth(),0);
});
