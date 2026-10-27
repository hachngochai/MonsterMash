import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = ['fonts.css','noto-sans-vietnamese.woff2','noto-sans-latin.woff2','noto-serif-vietnamese.woff2','noto-serif-latin.woff2','OFL-NotoSans.txt','OFL-NotoSerif.txt'];
const sprites = [...['fire','ice','wind','earth','lightning','ancient'].map(name=>`dragons/${name}.png`),...['lion','medusa','goatman','chimera'].map(name=>`mythic/${name}.png`)];
sprites.push(...['minotaur','flower','turtle','fossil-roc','roc-knight','thousand-hands','lantern-sentinel'].map(name=>`abyss/${name}.png`));
sprites.push(...['piranha','pufferfish','seahorse','twin-claw-fish'].map(name=>`underwater/${name}.png`));
sprites.push(...['baby-shark','electric-jellyfish','phantom-jellyfish'].map(name=>`underwater/${name}.png`));
const managers=['save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','progression-ui','story','tutorial'].map(name=>`js/${name}.js`);
const files = ['index.html','style.css','js/typography.js','js/campaign.js','js/mobile.js','js/bosses.js','js/golem.js','js/wolves.js','js/kong.js','js/dragons.js','js/mythic.js','js/renderer.js','js/game.js','assets/favicon.svg','.nojekyll',...fonts.map(file => `assets/fonts/${file}`),...sprites.map(file=>`assets/sprites/${file}`)];
files.push('manifest.webmanifest',...['apple-touch-icon','icon-192','icon-512'].map(name=>'assets/icons/'+name+'.png'));
files.push('js/key-bindings.js','js/atlas-landmarks.js','js/atlas-terrain.js','js/atlas-3d.js',...['three.module.js','three.core.js','LICENSE','VERSION'].map(name=>'vendor/three/'+name));
files.push(...['abyss-config','abyss-combat','abyss-renderer'].map(name=>'js/'+name+'.js'));
files.push(...['labyrinth','parasite','lake','echo','tomb'].map(name=>'assets/backgrounds/abyss/'+name+'.png'));
files.push(...['underwater-config','underwater','underwater-enemies','boss160','underwater-renderer'].map(name=>'js/'+name+'.js'));
files.push('underwater.css','assets/backgrounds/underwater/shallow-ruins.png');
files.push(...['middle-sea-config','middle-sea-enemies','boss170'].map(name=>'js/'+name+'.js'),'assets/backgrounds/underwater/middle-reef.png');
files.push(...["predator-sea-config", "predator-sea-enemies", "boss-180", "deep-sea-config", "deep-sea-enemies", "boss190", "final-sea-config", "final-sea-enemies", "boss200", "merfolk", "lightning-orb", "ocean-visuals", "chapter-transition"].map(name=>'js/'+name+'.js'));
files.push(...["hammerhead", "electric-ray", "swordfish", "mega-london", "gulper", "ghost-shark", "glow-bug", "leviathan", "sea-crab", "pearl-clam", "angler-fish", "giant-squid", "sea-turtle", "kraken"].map(name=>'assets/sprites/underwater/'+name+'.png'));
files.push(...['predator-trench','deep-chasm','kraken-grave'].map(name=>'assets/backgrounds/underwater/'+name+'.png'));
files.push(...['forest-passage','cave-passage','whirlpool-passage','shore-return','submerged-passage'].map(name=>'assets/backgrounds/transitions/'+name+'.png'));
files.push(...['island-config','island-combat','resurrection-rewards','island-art','island-fx','island-renderer'].map(name=>'js/'+name+'.js'));
files.push(...['easter-egg','ghost-bunny','patrick','leprechaun','drunken-wanderer','mini-moai','awakening-moai','deforested-alpha','birdman','mana-spirit','makemake','golden-fish'].map(name=>'assets/sprites/island/'+name+'.png'));
files.push(...['quarry','dead-palms','bird-cliffs','mana-sanctuary','volcano'].map(name=>'assets/backgrounds/island/'+name+'.png'));
const cosmicRegions=['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun','blackHole'];
files.push('cosmic.css',...['cosmic-config','cosmic-balance','cosmic-combat','cosmic-rewards','cosmic-scenery','cosmic-art','cosmic-essence-fx','cosmic-renderer','cosmic-planets','cosmic-ui','ufo-transition'].map(name=>'js/'+name+'.js'));
files.push(...cosmicRegions.map(name=>'assets/backgrounds/cosmic/'+name+'.png'));
files.push(...cosmicRegions.map(name=>'assets/sprites/cosmic/'+name+'-enemies.png'));
files.push(...['hermes','aphrodite','ares','zeus','chronos','ouranos','poseidon','selene','helios','singularitySovereign'].map(name=>'assets/sprites/cosmic/'+name+'.png'));
// Preview rooms ship with the same runtime and local assets as the game.
// Include newly added rooms automatically, without copying Node-only tests.
files.push(...fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.html')).map(name=>'tests/'+name));
for (const file of [...files,...managers]) {
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
  const target=path.join(root,'dist',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,file),target);
}
console.log(`Built ${files.length+managers.length} static files in dist/. All runtime assets bundled locally.`);
