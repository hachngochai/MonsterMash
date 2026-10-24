'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{pathToFileURL}=require('node:url');
const scope=vm.createContext({});
for(const name of ['story','atlas-landmarks','atlas-terrain'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
const MM=scope.MM,html=fs.readFileSync('index.html','utf8');
function landscape(chapter){const d=html.match(new RegExp('<path class="atlas-island [^"]+" data-atlas-page="chapter'+chapter+'" d="([^"]+)"'))[1];return MM.AtlasTerrain.plan(MM.AtlasTerrain.outline(d),chapter,MM.Story.trail(MM.Story.get(chapter)));}
test('the Abyss has an open central drop while exploration dots stay on their original plane',()=>{
 const plan=landscape(3);assert.equal(plan.inCavity(530,240),true);assert.equal(plan.inCavity(700,240),false);assert.ok(plan.cavity.depth>=80);
 for(const point of [...plan.objects,...plan.hills])assert.equal(plan.inCavity(point.x,point.y,18),false);
 for(const dot of plan.route.dots){assert.equal(plan.inCavity(dot.x,dot.y),false);assert.equal(plan.heightAt(dot.x,dot.y),0);}
});
test('real Three.js geometry builds distinct cave, abyss and ocean landmarks with bounded draw calls and finite motion',async()=>{
 const T=await import(pathToFileURL(path.resolve('vendor/three/three.module.js')).href);
 const expected={2:'ancient-cave',3:'terraced-abyss',4:'ocean-whirlpool'};
 for(const chapter of [2,3,4]){
  const scene=MM.AtlasTerrain.build(T,landscape(chapter));assert.ok(scene.stats.landmarks.landmarks.includes(expected[chapter]));assert.ok(scene.stats.landmarks.drawCalls<60);
  for(const time of [0,1000,1e8])for(const moving of [false,true]){scene.update(time,moving);scene.group.updateMatrixWorld(true);scene.group.traverse(node=>{
   assert.ok(node.matrixWorld.elements.every(Number.isFinite),'all world transforms must remain finite');
   if(node.geometry?.attributes.position)assert.ok(node.geometry.attributes.position.array.every(Number.isFinite),'all vertex positions must remain finite');
   if(node.instanceMatrix)assert.ok(node.instanceMatrix.array.every(Number.isFinite),'all instanced transforms must remain finite');
  });}
  const meshes=[];scene.group.traverse(node=>{if(node.isMesh)meshes.push(node);});
  if(chapter===4)assert.ok(meshes.some(node=>node.geometry.type==='PlaneGeometry'&&node.position.z===1&&node.material.transparent&&node.material.depthWrite===false),'ocean surface covers the seabed, not a dry island');
  const geometries=new Set(),materials=new Set();scene.group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [].concat(node.material||[]))materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
 }
});
test('landmark module is bundled before terrain and all three SVG fallback scenes remain available',()=>{
 assert.ok(html.indexOf('src="js/atlas-landmarks.js')<html.indexOf('src="js/atlas-terrain.js'));
 for(const name of ['atlas-cave-environment','atlas-rift-scene','atlas-ocean-scene'])assert.ok(html.includes(name));
 assert.ok(fs.readFileSync('scripts/build.mjs','utf8').includes("'js/atlas-landmarks.js'"));
});
