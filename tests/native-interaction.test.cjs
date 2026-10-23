'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function game(selection){
 const context={};
 if(selection!==undefined)context.getSelection=()=>selection;
 const c=vm.createContext(context);
 for(const file of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','campaign','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),c);
 return new c.MM.Game({headless:true,storage:{getItem(){return null;},setItem(){}}});
}
function element({scope='app',editable=false,inheritedEditable=false}={}){
 return {
  nodeType:1,isContentEditable:inheritedEditable,
  closest(selector){
   if(selector.includes('contenteditable'))return editable?this:null;
   if(selector.includes('.app')||selector.includes('dialog'))return scope?this:null;
   return null;
  }
 };
}
const textNode=parentElement=>({nodeType:3,parentElement});
function event(type,target=element()){
 return {type,target,prevented:false,preventDefault(){this.prevented=true;}};
}
function selection(anchorNode,focusNode=anchorNode,{collapsed=false}={}){
 return {
  anchorNode,focusNode,isCollapsed:collapsed,rangeCount:collapsed?0:1,removed:0,
  removeAllRanges(){this.removed++;this.isCollapsed=true;this.rangeCount=0;}
 };
}

test('atlas, combat, paused and result screens suppress native selection, dragging, copy and callouts',()=>{
 const g=game();
 for(const screen of ['home','playing','paused','won','lost'])for(const scope of ['app','dialog']){
  g.screen=screen;
  for(const type of ['copy','selectstart','dragstart','contextmenu']){
   const e=event(type,element({scope}));
   assert.equal(g.nativeInteraction(e),true,`${screen}/${scope}/${type}`);
   assert.equal(e.prevented,true);
  }
 }
});

test('atlas text nodes are protected just like their containing story and boss buttons',()=>{
 const g=game();
 for(const type of ['selectstart','dragstart','contextmenu','copy']){
  const e=event(type,textNode(element()));
  assert.equal(g.nativeInteraction(e),true,type);
  assert.equal(e.prevented,true);
 }
});

test('native form controls, editable descendants and interactions outside the game retain browser behavior',()=>{
 const g=game();
 for(const screen of ['home','playing','paused'])for(const type of ['copy','selectstart','dragstart','contextmenu']){
  g.screen=screen;
  for(const target of [element({editable:true}),textNode(element({editable:true})),element({inheritedEditable:true}),element({scope:null})]){
   const e=event(type,target);
   assert.equal(g.nativeInteraction(e),false,`${screen}/${type}`);
   assert.equal(e.prevented,false);
  }
 }
});

test('selection cleanup removes existing atlas or dialog highlights, including ranges crossing the game boundary',()=>{
 for(const [anchor,focus] of [
  [textNode(element()),textNode(element())],
  [textNode(element({scope:'dialog'})),textNode(element({scope:'dialog'}))],
  [textNode(element({scope:null})),textNode(element())],
  [textNode(element()),textNode(element({scope:null}))]
 ]){
  const current=selection(anchor,focus),g=game(current);
  assert.equal(g.clearNativeSelection(),true);
  assert.equal(current.removed,1);
  assert.equal(current.isCollapsed,true);
  assert.equal(g.clearNativeSelection(),false,'cleared selection must not be cleared repeatedly');
  assert.equal(current.removed,1);
 }
});

test('selection cleanup preserves editable selections and unrelated page text',()=>{
 for(const current of [
  selection(textNode(element({scope:null}))),
  selection(textNode(element({editable:true}))),
  selection(textNode(element({inheritedEditable:true}))),
  selection(textNode(element({editable:true})),textNode(element())),
  selection(textNode(element()),textNode(element({editable:true}))),
  selection(textNode(element()),undefined,{collapsed:true})
 ]){
  assert.equal(game(current).clearNativeSelection(),false);
  assert.equal(current.removed,0);
 }
});

test('copy from a body target cannot copy an existing atlas highlight, but outside selections remain usable',()=>{
 const highlighted=selection(textNode(element())),g=game(highlighted),copy=event('copy',element({scope:null}));
 assert.equal(g.nativeInteraction(copy),true);
 assert.equal(copy.prevented,true);
 assert.equal(highlighted.removed,1);
 const unrelated=selection(textNode(element({scope:null}))),outside=event('copy',element({scope:null}));
 assert.equal(game(unrelated).nativeInteraction(outside),false);
 assert.equal(outside.prevented,false);
 assert.equal(unrelated.removed,0);
});

test('missing selection APIs and targets do not break native-interaction handling',()=>{
 const g=game();
 assert.equal(g.clearNativeSelection(),false);
 const e=event('copy',null);
 assert.equal(g.nativeInteraction(e),false);
 assert.equal(e.prevented,false);
});
