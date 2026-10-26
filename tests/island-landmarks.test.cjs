'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{pathToFileURL}=require('node:url');
function fixture(){const scope=vm.createContext({});for(const name of ['island-config','story','atlas-landmarks','atlas-terrain'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);const MM=scope.MM,html=fs.readFileSync('index.html','utf8'),d=html.match(/<path class="atlas-island atlas-resurrection"[^>]+d="([^"]+)"/)[1];return {MM,landscape:MM.AtlasTerrain.plan(MM.AtlasTerrain.outline(d),5,MM.Story.trail(MM.Story.get(5)))};}
async function build(){const {MM,landscape}=fixture(),T=await import(pathToFileURL(path.resolve('vendor/three/three.module.js')).href);return {MM,landscape,T,scene:MM.AtlasLandmarks.build(T,landscape)};}
function dispose(group){const geometries=new Set(),materials=new Set();group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [].concat(n.material||[]))materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
test('island landmark geometry contains sculpted ancestors, quarried terrain and engraved petroglyphs without moving the monuments',async()=>{
 const {scene}=await build();try{
  const heads=[],glyphs=[];scene.group.traverse(n=>{if(/^ancestral-moai-\d$/.test(n.name))heads.push(n);if(/^ancient-glyph-/.test(n.name))glyphs.push(n);});
  assert.equal(heads.length,3);assert.equal(glyphs.length,2);assert.ok(scene.group.getObjectByName('moai-mountain-cliff'));assert.ok(scene.stats.drawCalls<30,'detail stays batched for mobile');
  const bounds=heads.map(n=>{n.geometry.computeBoundingBox();return n.geometry.boundingBox.clone();});
  for(const box of bounds)assert.ok((box.max.z-box.min.z)/(box.max.x-box.min.x)>2.5,'long carved faces remain visibly Moai-shaped');
  assert.ok(bounds[1].max.z>110&&bounds[0].max.z>80&&bounds[2].max.z>80,'the central ancestor rises above the ridge, flanked by two substantial guardians');
  const ridge=scene.group.getObjectByName('moai-mountain-cliff');ridge.geometry.computeBoundingBox();assert.ok(ridge.geometry.boundingBox.max.z>40&&ridge.geometry.boundingBox.max.z<60,'irregular ridge rises as a mountain instead of a low platform');
  for(const time of [0,1000,1e8])for(const moving of [false,true]){scene.update(time,moving);scene.group.updateMatrixWorld(true);scene.group.traverse(n=>{
   assert.ok(n.matrixWorld.elements.every(Number.isFinite));if(n.geometry?.attributes.position)assert.ok(n.geometry.attributes.position.array.every(Number.isFinite));if(n.instanceMatrix)assert.ok(n.instanceMatrix.array.every(Number.isFinite));
  });}
  heads.forEach((head,i)=>assert.deepEqual(head.geometry.boundingBox,bounds[i],'sun/glyph ambience never repositions the Moai'));
  scene.update(123456,true);scene.update(123456,false);const paused=glyphs.map(n=>n.material.opacity);scene.update(1e8,false);assert.deepEqual(glyphs.map(n=>n.material.opacity),paused,'reduced motion has one deterministic phase');
 }finally{dispose(scene.group);}
});
test('the raised Moai faces and carved steles leave every island exploration dot and boss mark visible',async()=>{
 const {scene,landscape,T}=await build();try{
  const boxes=[];scene.group.updateMatrixWorld(true);scene.group.traverse(n=>{if(/^ancestral-moai-\d$/.test(n.name)||n.name==='ancient-glyph-incisions')boxes.push(new T.Box3().setFromObject(n));});
  const points=[...landscape.route.dots,...landscape.route.bosses.map(([x,y])=>({x,y,boss:true}))],tilt=Math.sin(.46);
  for(const box of boxes){const left=box.min.x+500,right=box.max.x+500,top=200-box.max.y-box.max.z*tilt,bottom=200-box.min.y-box.min.z*tilt;
   for(const p of points){const margin=p.boss?20:7;assert.ok(p.x<left-margin||p.x>right+margin||p.y<top-margin||p.y>bottom+margin,'a projected monument must not cover the playable route');}
  }
 }finally{dispose(scene.group);}
});
