import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = ['fonts.css','noto-sans-vietnamese.woff2','noto-sans-latin.woff2','noto-serif-vietnamese.woff2','noto-serif-latin.woff2','OFL-NotoSans.txt','OFL-NotoSerif.txt'];
const files = ['index.html','style.css','js/typography.js','js/campaign.js','js/mobile.js','js/bosses.js','js/renderer.js','js/game.js','assets/favicon.svg','.nojekyll',...fonts.map(file => `assets/fonts/${file}`)];
for (const file of files) {
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
  const target=path.join(root,'dist',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,file),target);
}
console.log(`Built ${files.length} static files in dist/. No external dependencies.`);
