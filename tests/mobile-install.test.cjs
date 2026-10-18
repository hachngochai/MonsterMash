'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('home-screen manifest and real PNG icons resolve within both local and GitHub Pages deployments',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'landscape');
 for(const base of ['http://127.0.0.1:4174/','https://hachngochai.github.io/MonsterMash/']){
  const scope=new URL(manifest.scope,base),start=new URL(manifest.start_url,base);
  assert.equal(start.href,base);assert.equal(scope.href,base);
  for(const icon of manifest.icons)assert.ok(new URL(icon.src,base).href.startsWith(base));
 }
 for(const [file,size] of [['apple-touch-icon',180],['icon-192',192],['icon-512',512]]){
  const png=fs.readFileSync(path.join(root,'assets/icons',file+'.png'));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/rel="manifest" href="manifest.webmanifest"/);assert.match(html,/name="apple-mobile-web-app-capable" content="yes"/);
});
