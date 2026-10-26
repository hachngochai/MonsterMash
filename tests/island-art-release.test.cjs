'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('every island rendering page loads the reference-art module before its consumer',()=>{
 const pages=['index.html',...fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.html')).map(name=>'tests/'+name)];
 let count=0;
 for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');if(!html.includes('island-renderer.js'))continue;count++;
  const scripts=[...html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(match=>match[1]);
  const art=scripts.findIndex(src=>/(?:^|\/)island-art\.js(?:\?|$)/.test(src)),renderer=scripts.findIndex(src=>/(?:^|\/)island-renderer\.js(?:\?|$)/.test(src));
  assert.ok(art>=0&&art<renderer,page+' loads image resources before IslandRenderer');
  const effects=scripts.findIndex(src=>/(?:^|\/)island-fx\.js(?:\?|$)/.test(src));
  assert.ok(effects>art&&effects<renderer,page+' loads attack choreography before IslandRenderer');
  assert.equal(scripts.filter(src=>/(?:^|\/)island-art\.js(?:\?|$)/.test(src)).length,1,page+' loads the resource cache exactly once');
 }
 assert.ok(count>=3,'main game, island arena and chapter cinema are all covered');
});

test('the static build explicitly packages individual reference sprites and every island landscape',()=>{
 const build=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
 assert.match(build,/'island-art'/);
 assert.match(build,/'island-fx'/);
 for(const name of ['easter-egg','ghost-bunny','patrick','leprechaun','drunken-wanderer','mini-moai','awakening-moai','deforested-alpha','birdman','mana-spirit','makemake','golden-fish'])assert.ok(build.includes("'"+name+"'"),name+' is packaged');
 assert.ok(build.includes("['quarry','dead-palms','bird-cliffs','mana-sanctuary','volcano'].map(name=>'assets/backgrounds/island/"));
});
