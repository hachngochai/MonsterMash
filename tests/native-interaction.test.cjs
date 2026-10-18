'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function game(){const c=vm.createContext({});for(const file of ['campaign','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),c);return new c.MM.Game({headless:true,storage:{getItem(){return null;},setItem(){}}});}
function event(type,{editable=false,inside=true}={}){return {type,prevented:false,target:{closest(selector){return selector==='.app'?inside:editable;}},preventDefault(){this.prevented=true;}};}
test('active combat suppresses native copy, selection, dragging and context menus',()=>{
 const g=game();g.start(1);
 for(const type of ['copy','selectstart','dragstart','contextmenu']){const e=event(type);assert.equal(g.nativeInteraction(e),true);assert.equal(e.prevented,true);}
});
test('paused menus, editable fields and interactions outside the game keep their browser behavior',()=>{
 const g=game();g.start(1);
 for(const e of [event('selectstart',{editable:true}),event('contextmenu',{inside:false})]){assert.equal(g.nativeInteraction(e),false);assert.equal(e.prevented,false);}
 g.screen='paused';const e=event('copy');assert.equal(g.nativeInteraction(e),false);assert.equal(e.prevented,false);
});
