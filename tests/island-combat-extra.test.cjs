const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const modules=['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','underwater','merfolk','underwater-enemies','boss160','middle-sea-enemies','boss170','predator-sea-enemies','boss-180','deep-sea-enemies','boss190','final-sea-enemies','boss200','save-manager','boss-manager','map-manager','skill-manager','lightning-orb','weapon-manager','input-manager','key-bindings','island-combat','resurrection-rewards','island-renderer','chapter-transition','game'];
function fixture(level=201,rewards=[]){
 const scope=vm.createContext({});
 for(const name of modules)vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name});
 const MM=scope.MM,g=new MM.Game({headless:true,random:()=>.5,storage:{getItem:()=>null,setItem(){}}});
 g.start(level);g.progression.rewards=rewards.slice();g.spawnTimer=g.ammoTimer=999;g.player.invulnerable=0;
 return {MM,g};
}
function spawn(g,type='boss',x=740){const e=g.spawn(type,1);e.phase='active';e.warning=0;e.x=x;e.islandNext=999;e.islandState='walk';e.intangible=false;return e;}
function tick(g,seconds){for(let left=seconds;left>1e-8&&g.screen==='playing';){const dt=Math.min(.02,left);g.update(dt);left-=dt;}}
function rune(g,owner,status='slow'){
 const q={owner,type:status==='slow'?'fish-rune':'bird-rune',x:g.player.x,y:g.player.y-g.player.h*.5,w:18,h:18,vx:0,vy:0,life:1,damage:0,status,hit:new Set()};
 g.island.projectiles.push(q);return q;
}

test('island controllers leave old actors alone and all clocks stop on pause or petrification',()=>{
 const {MM,g}=fixture(240);const boss=spawn(g);boss.islandNext=0;
 for(const type of ['skeleton','spider','fossilRoc','kraken'])assert.equal(MM.IslandCombat.owns({type,archetype:type}),false);
 g.screen='paused';const before=JSON.stringify({clock:g.island.clock,enemy:boss});
 MM.IslandCombat.update(g,20);MM.IslandCombat.updateEnemy(g,boss,20);
 assert.equal(JSON.stringify({clock:g.island.clock,enemy:boss}),before);
 g.screen='playing';boss.petrifiedTime=2;MM.IslandCombat.updateEnemy(g,boss,1);
 assert.equal(boss.islandClock,0);assert.equal(boss.islandCasts,0);assert.equal(boss.islandState,'walk');
});

test('blocked Mana runes cannot apply slow or vulnerability through roll, hit immunity, shield or guardian armor',()=>{
 for(const protection of ['roll','invulnerable','shield','guardian'])for(const effect of ['slow','vulnerable']){
  const {MM,g}=fixture(240,protection==='guardian'?[200]:[]),boss=spawn(g);
  if(protection==='roll')g.player.rollTime=.3;
  if(protection==='invulnerable')g.player.invulnerable=1;
  if(protection==='shield'){g.player.shieldTime=2;g.player.shieldHits=3;}
  if(protection==='guardian')g.resurrection.armorRemaining=3;
  rune(g,boss,effect);MM.IslandCombat.update(g,.02);
  assert.equal(g.island[effect],0,protection+' blocks the '+effect+' hit');
  assert.equal(g.player.health,5);assert.equal(g.island.projectiles.length,0,'a rejected contact is consumed once');
 }
});

test('a protected player cannot receive Birdman Fear from an otherwise rejected scream hit',()=>{
 for(const protection of ['roll','invulnerable','shield','guardian']){
  const {MM,g}=fixture(230,protection==='guardian'?[200]:[]),boss=spawn(g);
  if(protection==='roll')g.player.rollTime=.3;
  if(protection==='invulnerable')g.player.invulnerable=1;
  if(protection==='shield'){g.player.shieldTime=2;g.player.shieldHits=3;}
  if(protection==='guardian')g.resurrection.armorRemaining=3;
  g.island.hazards.push({type:'scream',owner:boss,x:g.player.x,y:438,w:300,h:200,damage:0,phase:'active',timer:.3,life:.3,hit:false,fear:1.5,fearDir:1});
  MM.IslandCombat.update(g,.02);assert.equal(g.island.fear,0,protection+' rejects Fear');assert.equal(g.island.vision,0);
 }
});

test('Mana debuffs expire on active time and do not silently persist across map changes',()=>{
 const {MM,g}=fixture(240),boss=spawn(g);rune(g,boss,'slow');MM.IslandCombat.update(g,.02);
 assert.equal(g.island.slow,MM.IslandConfig.boss.manaSlowTime);
 assert.equal(MM.IslandCombat.playerModifiers(g).speed,MM.IslandConfig.boss.manaSlow);
 g.screen='paused';MM.IslandCombat.update(g,10);assert.equal(g.island.slow,MM.IslandConfig.boss.manaSlowTime);
 g.screen='playing';MM.IslandCombat.update(g,MM.IslandConfig.boss.manaSlowTime-.001);assert.ok(g.island.slow>0);
 MM.IslandCombat.update(g,.001);assert.equal(g.island.slow,0);assert.equal(MM.IslandCombat.playerModifiers(g).speed,1);
 g.island.vulnerable=3;g.island.fear=1;g.start(241);assert.equal(g.island.vulnerable,0);assert.equal(g.island.fear,0);
});

test('Patrick random boundaries select exactly one of all six approved outcomes',()=>{
 for(let result=1;result<=6;result++){
  const {MM,g}=fixture(),p=spawn(g,'luckyPatrick',240);g.player.health=3;g.player.ammo=10;g.random=()=>((result-1)+.5)/6;
  assert.equal(MM.IslandCombat.dice(g,p),result);assert.equal(p.diceResult,result);
  assert.equal(g.player.health,result===1?4:3);assert.equal(g.player.ammo,result===4?5:10);
  assert.equal(g.island.projectiles.length,result===2?1:result===5?5:0);
  assert.equal(g.enemies.filter(e=>e!==p&&e.minion).length,result===6?1:0);
  assert.equal(p.hiddenTime||0,result===3?5:0);
 }
});

test('Patrick can be hit by its own launched clover after moving back into its flight path',()=>{
 const {MM,g}=fixture(),patrick=spawn(g,'luckyPatrick',180);g.player.x=850;patrick.health=patrick.maxHealth=20;
 MM.IslandCombat.dice(g,patrick,5);const clover=g.island.projectiles[2];g.island.projectiles=[clover];
 // Let the shot clear its source body. The source can later enter its path,
 // for example through the existing position-swap weapon skill.
 MM.IslandCombat.update(g,.4);const before=patrick.health;patrick.x=clover.x+clover.vx*.01;
 MM.IslandCombat.update(g,.02);assert.equal(patrick.health,before-MM.IslandConfig.ordinary.cloverDamage);
 MM.IslandCombat.update(g,.02);assert.equal(patrick.health,before-MM.IslandConfig.ordinary.cloverDamage,'one projectile hits a target once');
});

test('ambient defensive Moai follow the ten-second clock, honor their cap, never deal damage and clear on retry',()=>{
 const {MM,g}=fixture(203);g.player.x=480;MM.IslandCombat.update(g,9.999);assert.equal(g.enemies.length,0);
 g.screen='paused';MM.IslandCombat.update(g,50);assert.equal(g.enemies.length,0);
 g.screen='playing';MM.IslandCombat.update(g,.001);assert.equal(g.enemies.length,1);assert.equal(g.enemies[0].damage,0);
 MM.IslandCombat.update(g,10);assert.equal(g.enemies.length,MM.IslandConfig.ordinary.wallCap);
 MM.IslandCombat.update(g,10);assert.equal(g.enemies.length,MM.IslandConfig.ordinary.wallCap);
 const hp=g.player.health;for(const e of g.enemies){e.x=g.player.x;MM.IslandCombat.updateEnemy(g,e,1);}assert.equal(g.player.health,hp);
 g.start(203);assert.equal(g.enemies.length,0);assert.equal(g.island.clock,0);assert.equal(g.island.nextWall,10);
});

test('all five boss deaths retire their summons and clear owned attacks, seals and debuffs without killing unrelated actors',()=>{
 for(const level of [210,220,230,240,250]){
  const {MM,g}=fixture(level),boss=spawn(g),summon=spawn(g,'mutantRat',100),other=spawn(g,'luckyPatrick',900);
  boss.judgmentUses=MM.IslandConfig.boss.judgmentUses;boss.stoneArmor=false;boss.weakTime=8;
  summon.minion=true;summon.islandOwner=boss;
  g.island.hazards.push({owner:boss,phase:'active',timer:1,life:1});g.island.projectiles.push({owner:boss,life:1});
  g.island.seals.push({x:100,activated:true});g.island.fear=g.island.slow=g.island.vulnerable=g.island.vision=2;
  assert.equal(g.dealEnemyDamage(boss,99999,{kind:'audit',magic:true}),true);
  assert.equal(boss.dead,true);assert.equal(summon.dead,true);assert.equal(Boolean(other.dead),false);
  assert.equal(g.island.hazards.length,0);assert.equal(g.island.projectiles.length,0);assert.equal(g.island.seals.length,0);
  for(const key of ['fear','slow','vulnerable','vision'])assert.equal(g.island[key],0,level+' clears '+key);
 }
});

test('two activated seals protect only their real zones, rather than granting global immunity',()=>{
 const {MM,g}=fixture(250,[200,230]),boss=spawn(g);g.player.immortalTime=20;g.resurrection.armorRemaining=3;
 MM.IslandCombat.startJudgment(g,boss);
 for(const x of MM.IslandConfig.boss.sealXs.slice(0,2)){g.player.x=x;assert.equal(MM.IslandCombat.interact(g),true);}
 g.player.x=930;assert.equal(MM.IslandCombat.protectedBySeals(g),false);
 MM.IslandCombat.updateEnemy(g,boss,8);assert.equal(g.player.health,0);assert.equal(g.screen,'lost');
});
