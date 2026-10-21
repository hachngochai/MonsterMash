'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(id=150,save={}){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','underwater-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','key-bindings','game'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
 let text=JSON.stringify(save);const storage={getItem:()=>text,setItem:(k,v)=>{text=v;}};
 const MM=scope.MM,g=new MM.Game({headless:true,storage,random:()=>.5});g.start(id);g.spawnTimer=g.ammoTimer=1e6;g.level.hazardTypes=[];
 return {MM,g,storage,scope};
}
const key=code=>({code,repeat:false,preventDefault(){}});
test('reloading preserves permanent old/new rewards, equipment, maps and life counter',()=>{
 const saved={campaignSize:150,resume:141,completed:[10,120,130,140],progression:{version:1,rewards:[10,50,100,120,130,140],equipped:'scythe',lifeKills:7}};
 const {MM,storage,g}=fixture(141,saved);g.persist();
 const restored=new MM.Game({headless:true,storage});
 assert.equal(restored.save.resume,141);assert.equal(restored.progression.equipped,'scythe');assert.equal(restored.progression.lifeKills,7);
 assert.deepEqual(Array.from(restored.progression.rewards),[10,50,100,120,130,140]);assert.equal(MM.SaveManager.weaponUnlocked(restored,'hammer'),true);
 assert.deepEqual(Array.from(restored.save.completed),[10,120,130,140]);
});
test('a selected final stage gives no item and a real completed boss migrates only once',()=>{
 const first=fixture(150,{resume:150,completed:[],progression:{version:1,rewards:[],equipped:'scythe'}});
 assert.equal(first.g.progression.rewards.length,0);assert.equal(first.g.progression.equipped,'gun');
 const old=fixture(141,{completed:[120,130,140],progression:{version:1,rewards:[10,120],equipped:'hammer'}});
 assert.deepEqual(Array.from(old.g.progression.rewards),[10,120,130,140]);old.g.persist();
 const reload=new old.MM.Game({headless:true,storage:old.storage});assert.deepEqual(Array.from(reload.progression.rewards),[10,120,130,140]);
});
test('reversal swaps horizontal movement and up/down without modifying saved key bindings',()=>{
 const {g,MM}=fixture();g.abyss.status.reverse=4;const settings=JSON.stringify(g.settings.keyBindings);
 g.keyDown(key('ArrowRight'));g.update(.04);assert.ok(g.player.vx<0);g.keyUp(key('ArrowRight'));
 g.player.grounded=true;g.player.coyote=.12;g.keyDown(key('ArrowDown'));assert.ok(g.player.jumpBuffer>0);g.keyUp(key('ArrowDown'));
 assert.equal(JSON.stringify(g.settings.keyBindings),settings);MM.AbyssCombat.cleanse(g);assert.equal(MM.AbyssCombat.inputDirection(g),1);
 assert.equal(MM.KeyBindings.translate(g,key('ArrowDown')).code,'Unbound:ArrowDown');
});
test('weapon picker navigation stays independent from reversed movement',()=>{
 const {g,MM}=fixture(150,{progression:{version:1,rewards:[10,60],equipped:'gun'}});g.abyss.status.reverse=4;
 assert.equal(MM.InputManager.open(g),true);const x=g.player.x;g.keyDown(key('ArrowRight'));assert.equal(g.weaponPicker.selected,1);assert.equal(g.player.x,x);assert.equal(g.rollSlash,null);
});
test('inverted gravity can shoot a ground boss with original gun damage and ammunition cost',()=>{
 const {g}=fixture();g.abyss.gravity=-1;g.player.y=72;g.player.ammo=20;const b=g.spawn('boss');b.phase='active';b.x=700;
 assert.equal(g.shoot(1),true);assert.ok(g.bullets[0].vy>0);assert.equal(g.bullets[0].damage,1);assert.equal(g.player.ammo,19);
});
test('new melee weapons never inherit dual-axe rolling damage',()=>{
 for(const weapon of ['hammer','scythe']){const {g,MM}=fixture(150,{progression:{version:1,rewards:[60,100,120,140],equipped:weapon}});
  assert.equal(MM.WeaponManager.current(g),weapon);g.moveTap(1);g.moveTap(1);assert.equal(g.rollSlash,null);
 }
});
test('stable combat frames retain heart SVG nodes while health and atlas selection still refresh the HUD',()=>{
 const {g,MM,scope}=fixture(110);let hearts=0,syncs=0;
 const element=()=>({classList:{toggle(){}},style:{},setAttribute(){},set textContent(v){this.text=v;},get textContent(){return this.text;},set innerHTML(v){if(this.heart)hearts++;this.html=v;}});
 const nodes={};g.ui=new Proxy(nodes,{get(o,k){return o[k]||(o[k]=element());}});g.ui.health.heart=true;
 scope.document={body:{dataset:{}},fullscreenElement:null,querySelector:()=>element(),querySelectorAll:()=>[]};
 MM.StoryUI={sync(){syncs++;}};MM.KeyBindings.sync=()=>{};g.headless=false;
 g.updateUI();const initial=hearts;g.updateUI();g.updateUI();assert.equal(hearts,initial);assert.equal(syncs,1);
 g.player.health--;g.updateUI();assert.equal(hearts,initial+1);
 g.selectedStory=2;g.updateUI();assert.equal(syncs,3);
});
