import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = ['fonts.css','noto-sans-vietnamese.woff2','noto-sans-latin.woff2','noto-serif-vietnamese.woff2','noto-serif-latin.woff2','OFL-NotoSans.txt','OFL-NotoSerif.txt'];
const sprites = [...['fire','ice','wind','earth','lightning','ancient'].map(name=>`dragons/${name}.png`),...['lion','medusa','goatman','chimera'].map(name=>`mythic/${name}.png`)];
sprites.push(...['minotaur','flower','turtle','fossil-roc','roc-knight','thousand-hands','lantern-sentinel'].map(name=>`abyss/${name}.png`));
sprites.push(...['piranha','pufferfish','seahorse','twin-claw-fish'].map(name=>`underwater/${name}.png`));
const managers=['save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','progression-ui','story','tutorial'].map(name=>`js/${name}.js`);
const files = ['index.html','style.css','js/typography.js','js/campaign.js','js/mobile.js','js/bosses.js','js/golem.js','js/wolves.js','js/kong.js','js/dragons.js','js/mythic.js','js/renderer.js','js/game.js','assets/favicon.svg','.nojekyll',...fonts.map(file => `assets/fonts/${file}`),...sprites.map(file=>`assets/sprites/${file}`)];
files.push('manifest.webmanifest',...['apple-touch-icon','icon-192','icon-512'].map(name=>'assets/icons/'+name+'.png'));
files.push('js/key-bindings.js','js/atlas-3d.js',...['three.module.js','three.core.js','LICENSE','VERSION'].map(name=>'vendor/three/'+name));
files.push(...['abyss-config','abyss-combat','abyss-renderer'].map(name=>'js/'+name+'.js'));
files.push(...['labyrinth','parasite','lake','echo','tomb'].map(name=>'assets/backgrounds/abyss/'+name+'.png'));
files.push(...['underwater-config','underwater','underwater-enemies','boss160','underwater-renderer'].map(name=>'js/'+name+'.js'));
files.push('underwater.css','assets/backgrounds/underwater/shallow-ruins.png');
for (const file of [...files,...managers]) {
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
  const target=path.join(root,'dist',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,file),target);
}
console.log(`Built ${files.length+managers.length} static files in dist/. All runtime assets bundled locally.`);
