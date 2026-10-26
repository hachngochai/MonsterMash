'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){const scope=vm.createContext({});for(const name of ['island-config','story','atlas-terrain'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);return scope.MM;}
const html=fs.readFileSync('index.html','utf8'),outlines=Array.from(html.matchAll(/<path class="atlas-island [^"]+" data-atlas-page="chapter(\d)" d="([^"]+)"/g),m=>({chapter:Number(m[1]),d:m[2]}));
test('miniature scenery stays on each original island and clear of the playable exploration routes',()=>{
 const MM=fixture();assert.equal(outlines.length,5);
 for(const {chapter,d}of outlines){const p=MM.AtlasTerrain.outline(d),route=MM.Story.trail(MM.Story.get(chapter)),a=MM.AtlasTerrain.plan(p,chapter,route),b=MM.AtlasTerrain.plan(p,chapter,route);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.ok(a.objects.length>12&&a.objects.length<=60);assert.ok(a.hills.length>0&&a.hills.length<=6);
  for(const o of a.objects){assert.equal(MM.AtlasTerrain.inside(o.x,o.y,p),true);assert.ok(MM.AtlasTerrain.edgeDistance(o.x,o.y,p)>18);assert.ok(MM.AtlasTerrain.trailDistance(o.x,o.y,route)>18);assert.ok(o.height>0&&o.height<60);}
  for(const dot of route.dots)assert.equal(a.heightAt(dot.x,dot.y),0,'route ground stays on the exact SVG/HTML plane');
  for(let y=a.bounds.top;y<a.bounds.bottom;y+=17)for(let x=a.bounds.left;x<a.bounds.right;x+=17)assert.ok(Number.isFinite(a.heightAt(x,y))&&a.heightAt(x,y)>=0);
 }
});
test('each region gets its own physical scenery while keeping semantic map controls and fallback artwork',()=>{
 const MM=fixture(),types=[];
 for(const {chapter,d}of outlines){const p=MM.AtlasTerrain.plan(MM.AtlasTerrain.outline(d),chapter,MM.Story.trail(MM.Story.get(chapter)));types.push(new Set(p.objects.map(o=>o.type)));}
 assert.ok(types[0].has('tree'));assert.ok(types[1].has('tree'));assert.ok(types[2].has('crystal'));assert.ok(types[3].has('coral'));assert.ok(types[4].has('moai'));
 assert.ok(types[4].has('runeStele'));assert.equal(types[4].has('ruin'),false,'island uses carved steles instead of generic house or temple props');
 assert.ok(html.indexOf('src="js/atlas-terrain.js')<html.indexOf('src="js/atlas-3d.js'));
 assert.equal((html.match(/data-boss-marker="\d+"/g)||[]).length,25);
 const css=fs.readFileSync('style.css','utf8');assert.match(css,/\.atlas-terrain-ready \.atlas-flat-scenery\{opacity:0\}/);
 assert.match(html,/atlas-flat-scenery/);assert.ok(fs.readFileSync('scripts/build.mjs','utf8').includes("'js/atlas-terrain.js'"));
});
