'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(level=101){
 const scope=vm.createContext({});
 for(const name of ['abyss-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat','save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','game'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope);
 const MM=scope.MM,g=new MM.Game({headless:true,storage:{getItem:()=>null,setItem(){}},random:()=>.5});g.start(level);g.level.target=999;g.spawnTimer=g.ammoTimer=1e6;g.level.hazardTypes=[];
 return {MM,g,scope};
}
function kill(g,count=1){let last;for(let i=0;i<count;i++){last=g.spawn('minotaurCalf',-1);last.phase='active';g.killEnemy(last);}return last;}
test('all 101–150 maps use five regular kills; the original hundred maps keep ten',()=>{
 const {g,MM}=fixture();
 for(let level=1;level<=150;level++){g.level=MM.Campaign.getLevel(level);assert.equal(g.shieldProgress().goal,level>=101?5:10,'level '+level);}
 for(const level of [101,110,111,120,130,140,150]){g.start(level);g.level.target=999;kill(g,4);assert.equal(g.shieldCount,0);kill(g);assert.equal(g.shieldCount,1);assert.equal(g.shieldProgress().count,0);}
 g.start(100);g.level.target=999;kill(g,5);assert.equal(g.shieldCount,0);kill(g,5);assert.equal(g.shieldCount,1);
});
test('five-kill shields never double-award at ten, cannot duplicate a death and retain the three-shield cap',()=>{
 const {g}=fixture();const last=kill(g,5);assert.equal(g.shieldCount,1);g.killEnemy(last);assert.equal(g.abyssShieldKills,5);assert.equal(g.shieldCount,1);
 kill(g,5);assert.equal(g.shieldCount,2);kill(g,5);assert.equal(g.shieldCount,3);kill(g,5);assert.equal(g.shieldCount,3);
 g.activateShield();assert.equal(g.shieldCount,2);kill(g,5);assert.equal(g.shieldCount,3);
});
test('ordinary summons count, but boss kills, projections and player shadows do not fill the five-kill counter',()=>{
 const {g}=fixture(110);kill(g,3);
 const summoned=g.spawn('minotaurCalf');summoned.minion=true;g.killEnemy(summoned);assert.equal(g.abyssShieldKills,4);
 const boss=g.spawn('boss');g.killEnemy(boss);assert.equal(g.abyssShieldKills,4);assert.equal(g.shieldCount,0);
 for(const flag of ['playerShadow','flowerIllusion','emotionProjection','abyssClone']){const e=g.spawn('minotaurCalf');e[flag]=true;g.killEnemy(e);assert.equal(g.abyssShieldKills,4,flag);assert.equal(g.shieldCount,0);}
 kill(g);assert.equal(g.shieldCount,1);
});
test('a nonlethal shot does not fill the counter and a lethal hit counts only once',()=>{
 const {g}=fixture();const e=g.spawn('minotaurCalf');e.phase='active';e.health=e.maxHealth=5;
 g.dealEnemyDamage(e,1,{kind:'gun'});assert.equal(e.health,4);assert.equal(g.abyssShieldKills,0);
 g.dealEnemyDamage(e,4,{kind:'gun'});assert.equal(g.abyssShieldKills,1);g.dealEnemyDamage(e,1,{kind:'gun'});assert.equal(g.abyssShieldKills,1);
});
test('carry, retry and leaving the Abyss preserve the intended shield checkpoint without using old ten-kill progress',()=>{
 const {g}=fixture(100);kill(g,9);g.start(101,{carry:true});g.level.target=999;kill(g);assert.equal(g.totalKills,10);assert.equal(g.abyssShieldKills,1);assert.equal(g.shieldCount,0);
 kill(g,3);g.start(102,{carry:true});g.level.target=999;assert.equal(g.abyssShieldKills,4);kill(g);assert.equal(g.shieldCount,1);
 g.start(102,{retry:true});g.level.target=999;assert.equal(g.abyssShieldKills,4);assert.equal(g.shieldCount,0);kill(g);assert.equal(g.shieldCount,1);
 g.start(101);assert.equal(g.abyssShieldKills,0);assert.equal(g.shieldCount,0);kill(g,4);g.start(100,{carry:true});assert.equal(g.abyssShieldKills,0);assert.equal(g.shieldProgress().goal,10);
 g.start(101,{carry:true});assert.equal(g.abyssShieldKills,0);kill(g,2);g.goHome();assert.equal(g.abyssShieldKills,0);
});
test('the HUD and empty-shield hint show exactly the same five-kill progress',()=>{
 const {g,scope}=fixture();kill(g,4);const messages=[];g.toast=text=>messages.push(text);g.activateShield();assert.match(messages.at(-1),/Còn 1 quái thường/);
 const element=()=>({classList:{toggle(){}},style:{},setAttribute(){},textContent:'',innerHTML:''});const nodes={};g.ui=new Proxy(nodes,{get(o,k){return o[k]||(o[k]=element());}});
 scope.document={body:{dataset:{}},fullscreenElement:null,querySelector:()=>element(),querySelectorAll:()=>[]};g.headless=false;
 g.updateUI();assert.match(g.ui['charge-label'].textContent,/4\/5 quái thường/);g.headless=true;kill(g);g.headless=false;g.updateUI();assert.match(g.ui['charge-label'].textContent,/1 khiên sẵn sàng · 0\/5 quái thường/);
});
