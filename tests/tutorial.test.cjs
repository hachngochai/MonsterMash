'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
 const element=()=>({children:[],textContent:'',dataset:{},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},querySelectorAll(){return [];},open:false,showModal(){this.open=true;}});
 const document={createElement:element,createDocumentFragment:element,getElementById:()=>null};
 const context=vm.createContext({document});
 for(const name of ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','save-manager','tutorial','game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),context);
 let stored=JSON.stringify({resume:1,completed:[],progression:{version:1,rewards:[],equipped:'gun'}}),writes=0;
 const storage={getItem:()=>stored,setItem(_key,value){stored=value;writes++;}};
 const MM=context.MM,g=new MM.Game({headless:true,storage});
 g.updateUI=()=>{};g.clearInputs=()=>{g.keys.clear();};g.canvas={focus(){}};
 g.ui=Object.fromEntries(['tutorial-dialog','tutorial-kicker','tutorial-title','tutorial-content','tutorial-controls','tutorial-begin','boss-guide-sections'].map(id=>[id,element()]));
 return {MM,g,storage,read:()=>JSON.parse(stored),writes:()=>writes,element};
}
test('twenty-five guides cover 1–250 with the exact chapter starts and appropriate boss',()=>{
 const {MM}=fixture(),T=MM.Tutorial;
 assert.equal(T.guides.length,25);
 for(let level=1;level<=250;level++){const guide=T.forLevel(level);assert.equal(guide.start,Math.floor((level-1)/10)*10+1);assert.equal(guide.end,guide.start+9);assert.ok(guide.learn.length&&guide.fight.length&&guide.reward);assert.ok(guide.boss.includes(String(guide.end)));}
 assert.deepEqual(Array.from(T.normalizeSeen([1,1,11,12,'21',141,151,161,171,181,191,201])),[1,11,141,151,161,171,181,191,201]);
});
test('briefings open at 1,11,…241, freeze real combat and mark only the acknowledged region',()=>{
 for(let level=1;level<=241;level+=10){
  const {MM,g,read}=fixture();g.start(level);g.headless=false;
  assert.equal(MM.Tutorial.onStart(g),true);assert.equal(g.screen,'briefing');
  const time=g.levelTime,spawn=g.spawnTimer,health=g.player.health;
  for(let frame=0;frame<180;frame++)g.update(1/60);
  assert.equal(g.levelTime,time);assert.equal(g.spawnTimer,spawn);assert.equal(g.player.health,health);assert.deepEqual(Array.from(g.save.guidesSeen),[]);
  assert.equal(MM.Tutorial.complete(g),true);assert.equal(g.screen,'playing');assert.deepEqual(read().guidesSeen,[level]);
  assert.equal(MM.Tutorial.complete(g),false,'closing twice never records another completion');
  const reopened=new MM.Game({headless:true,storage:{getItem:()=>JSON.stringify(read()),setItem(){}}});
  assert.deepEqual(Array.from(reopened.save.guidesSeen),[level]);reopened.headless=false;reopened.ui=g.ui;
  assert.equal(MM.Tutorial.onStart(reopened),false,'already-read briefing stays closed on reload');
 }
});
test('ordinary stages, retries and headless preview arenas never open a briefing',()=>{
 const {MM,g}=fixture();
 for(const level of [2,10,12,20,70,150,152,160,162,170,172,180,182,190,192,200]){g.start(level);g.headless=false;assert.equal(MM.Tutorial.onStart(g),false);g.headless=true;}
 g.start(11);assert.equal(MM.Tutorial.onStart(g),false);g.headless=false;assert.equal(MM.Tutorial.onStart(g,{retry:true}),false);
 assert.deepEqual(Array.from(g.save.guidesSeen),[]);
});
test('cancelled and replaced briefings cannot acknowledge or resume a different stage',()=>{
 const {MM,g}=fixture();g.start(11);g.headless=false;MM.Tutorial.onStart(g);MM.Tutorial.cancel(g);
 g.level=MM.Campaign.getLevel(21);g.screen='playing';assert.equal(MM.Tutorial.complete(g),false);assert.deepEqual(Array.from(g.save.guidesSeen),[]);
});
test('fresh expeditions reset the guide ledger; test mode never writes its guide acknowledgements to the real save',()=>{
 const {MM,g,storage,read,writes}=fixture();g.start(141);g.headless=false;MM.Tutorial.onStart(g);g.testMode=true;
 const before=writes();MM.Tutorial.complete(g);assert.equal(writes(),before);assert.equal(read().guidesSeen.includes(141),false);
 const reset=new MM.Game({headless:true,storage,newRun:true});assert.deepEqual(Array.from(reset.save.guidesSeen),[]);
});

test('the ocean briefing explains oxygen instead of jumping and keeps Abyss bonuses scoped to101–150',()=>{
 const {MM,g}=fixture(),guide=MM.Tutorial.forLevel(151),text=[...guide.learn,...guide.fight,guide.reward].join(' ');
 assert.match(text,/30 giây/);assert.match(text,/50% oxy/);assert.match(text,/5 giây ngạt/);assert.match(text,/60 HP/);assert.match(text,/khóa sát thương vũ khí/);
 assert.equal(guide.learn.some(line=>line.startsWith('Trong màn 101–150')),false);
 assert.equal(MM.Tutorial.forLevel(141).learn.some(line=>line.startsWith('Trong màn 101–150')),true);
 g.start(151);g.headless=false;assert.equal(MM.Tutorial.onStart(g),true);
 assert.equal(g.ui['tutorial-kicker'].textContent,'CHẶNG 16 / 25 · MÀN 151–160');
 assert.match(g.ui['tutorial-controls'].textContent,/↑ cấp oxy/);assert.match(g.ui['tutorial-controls'].textContent,/nút OXY/);
 assert.doesNotMatch(g.ui['tutorial-controls'].textContent,/nhảy/);
});

test('middle-sea briefing preserves oxygen controls and explains immortal jellyfish and the harmless illusion',()=>{
 const {MM,g}=fixture(),guide=MM.Tutorial.forLevel(161),text=[...guide.learn,...guide.fight,guide.reward].join(' ');
 assert.match(text,/choáng 2 giây/);assert.match(text,/không thể bị tiêu diệt/);assert.match(text,/không ra chiêu/);assert.match(text,/chỉ cần hạ boss thật/);
 assert.match(text,/0,8 giây/);assert.match(text,/mỗi 6 giây/);assert.match(text,/oxy hiện có/);assert.match(text,/cấp oxy trong lúc choáng/);
 assert.equal(guide.learn.some(line=>line.startsWith('Trong màn 101–150')),false);
 g.start(161);g.headless=false;assert.equal(MM.Tutorial.onStart(g),true);
 assert.equal(g.ui['tutorial-kicker'].textContent,'CHẶNG 17 / 25 · MÀN 161–170');assert.match(g.ui['tutorial-controls'].textContent,/↑ cấp oxy/);assert.doesNotMatch(g.ui['tutorial-controls'].textContent,/nhảy/);
});

test('predator briefing explains the final five seconds and both newly unlocked rewards',()=>{
 const {MM,g}=fixture(),T=MM.Tutorial,guide=T.forLevel(171),text=[...guide.learn,...guide.fight,guide.reward].join(' ');
 assert.match(T.forLevel(151).reward,/R hoặc nút Ngư Nhân/);assert.match(T.forLevel(151).reward,/một lần mỗi lượt vào màn/);assert.match(T.forLevel(151).reward,/miễn mọi đòn hút oxy/);
 assert.match(T.forLevel(161).reward,/Cầu Chớp/);assert.match(T.forLevel(161).reward,/kể cả đạn lẻ/);assert.match(T.forLevel(161).reward,/Chỉ Song Rìu/);
 assert.match(text,/bất khả xâm phạm đúng 5 giây/);assert.match(text,/không hồi máu/);assert.match(text,/mỗi đợt 5 giây chỉ có một con/i);
 g.start(171);g.headless=false;assert.equal(T.onStart(g),true);assert.equal(g.ui['tutorial-kicker'].textContent,'CHẶNG 18 / 25 · MÀN 171–180');assert.match(g.ui['tutorial-controls'].textContent,/↑ cấp oxy/);
});
