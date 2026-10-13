import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html','style.css','js/campaign.js','js/renderer.js','js/game.js','assets/favicon.svg','.nojekyll'];
for (const file of files) {
  if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
  const target=path.join(root,'dist',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,file),target);
}
console.log(`Built ${files.length} static files in dist/. No external dependencies.`);
