/* Native outlined block art. Scenery, actors and effects share the hunter's
 * line weight and palette; no rectangular character cut-outs are composited. */
(function(root){'use strict';const MM=root.MM=root.MM||{},F=438,W=960,H=540,TAU=Math.PI*2,INK='#142228',cache=new Map();
 const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 function poly(c,p,color,stroke=INK,lw=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
 function line(c,p,color,width=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function block(c,x,y,w,h,base,light='#9c9b80',dark='#394850'){poly(c,[[x,y],[x+w-6,y],[x+w,y+6],[x+w,y+h],[x,y+h]],base);poly(c,[[x,y],[x+w-6,y],[x+w,y+6],[x+5,y+7]],light,null);poly(c,[[x+w-6,y+4],[x+w,y+6],[x+w,y+h],[x+w-7,y+h-4]],dark,null);}
 function eye(c,x,y,color,size=4){rect(c,x-size,y-size,size*2,size*2,color);rect(c,x,y-size,size*.6,size*.6,'#fff5d1');}
 function ring(c,x,y,r,color,width=2){c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function moai(c,t=0,awake=true){block(c,-28,-80,56,69,'#737b72','#b7b4a1','#43555a');poly(c,[[-32,-80],[-23,-102],[22,-102],[31,-79]],'#8a8d7f');block(c,-8,-72,17,37,'#999c88','#b8b59b','#657166');
  line(c,[[-24,-72],[-11,-74]],'#3c4c4c',5);line(c,[[11,-74],[25,-72]],'#3c4c4c',5);eye(c,-17,-70,awake?'#e9c875':'#3c4c4c',3);eye(c,18,-70,awake?'#e9c875':'#3c4c4c',3);
  block(c,-19,-27,38,14,'#737d70','#a9a98f','#4b5e59');line(c,[[-16,-31],[16,-31]],'#303d3e',3);line(c,[[-21,-59],[-24,-48],[-16,-41],[-23,-35]],'#4d5b54',1);
  block(c,-24,-15,48,15,'#616f65','#9a9c80','#354d4b');}
 function egg(c,x,y,size=18,color='#e4c190'){c.save();c.translate(x,y);poly(c,[[-size*.6,0],[-size*.7,-size*.6],[-size*.35,-size*1.35],[0,-size*1.65],[size*.4,-size*1.3],[size*.7,-size*.55],[size*.6,0]],color);line(c,[[-size*.6,-size*.5],[-size*.3,-size*.8],[0,-size*.5],[size*.3,-size*.8],[size*.6,-size*.5]],'#c9759e',3);rect(c,-size*.35,-size*1.15,4,4,'#78afaa');c.restore();}
 function clover(c,x,y,size=10,t=0){c.save();c.translate(x,y);c.rotate(t);for(let i=0;i<3;i++){c.rotate(TAU/3);poly(c,[[-2,-1],[-size,-size*.5],[-size,-size],[0,-size*1.35],[size,-size],[size,-size*.5],[2,-1]],'#8bbb72','#284d43',1);}line(c,[[0,0],[0,size]],'#4f8558',2);c.restore();}
 function palm(c,x,y,s,dead=false){c.save();c.translate(x,y);c.scale(s,s);for(let j=0;j<6;j++)block(c,j*2,-j*23,17,26,dead?'#6a5a44':'#716652','#9b9271','#3c4941');
  for(let i=0;i<7;i++){const a=-Math.PI+i*Math.PI/6,l=dead?40:76;poly(c,[[15,-135],[15+Math.cos(a)*l,-135+Math.sin(a)*l],[15+Math.cos(a)*l*.8,-125+Math.sin(a)*l*.7]],dead?'#6e6847':'#427b58',INK,1.2);}c.restore();}
 const palettes=[['#194451','#6da39a','#465f59','#8d8d6e','#485e4e'],['#343d49','#a0a48a','#5a6662','#8a8062','#4e5545'],['#17384b','#89bec7','#435e67','#8b9985','#3e5e60'],['#182f42','#5a96b0','#344f69','#6a8894','#27445a'],['#321d2a','#bd6247','#554143','#876152','#352d33']];
 function paintBackground(c,band){const p=palettes[band],sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,p[0]);sky.addColorStop(1,p[1]);rect(c,0,0,W,H,sky);rect(c,0,265,W,160,band===4?'#8d3c2e':'#437c87');
  for(let layer=0;layer<3;layer++){const y=270+layer*52,col=layer===0?p[2]:layer===1?p[4]:p[2];for(let i=0;i<9;i++){const x=i*145-layer*42,h=70+(i*31+band*41)%85;poly(c,[[x-35,y+70],[x+6,y-h],[x+38,y-h-20],[x+65,y-25],[x+125,y+70]],col,layer===2?INK:null,1.5);}}
  if(band===0){for(const [x,s]of[[100,1.1],[370,.75],[760,1.35]]){block(c,x-33*s,391,66*s,47,'#53685f','#a5aa8b','#324d4d');c.save();c.translate(x,392);c.scale(s,s);moai(c,0,false);c.restore();}palm(c,880,405,1.3);}
  if(band===1){for(let i=0;i<7;i++)palm(c,i*155+20,420,.8+i%2*.3,true);for(let i=0;i<4;i++)poly(c,[[i*240+35,428],[i*240+43,405],[i*240+82,400],[i*240+100,428]],'#283432');}
  if(band===2){for(let i=0;i<4;i++){block(c,95+i*240,300,85,105,'#667d7b','#a2ad92','#3b565c');poly(c,[[83+i*240,310],[132+i*240,275],[192+i*240,310]],'#879789');rect(c,124+i*240,350,25,55,'#1d3c49');}palm(c,890,415,1.2);}
  if(band===3){for(let i=0;i<6;i++){block(c,80+i*160,280+(i%2)*35,35,140,'#385d6f','#7b9eac','#284252');ring(c,98+i*160,280,16,'#6ed5d6',2);line(c,[[90+i*160,330],[107+i*160,345],[91+i*160,363]],'#83c6cd',2);}ring(c,480,240,100,'#84cdd244',3);}
  if(band===4){poly(c,[[180,330],[384,75],[447,61],[486,84],[690,330]],'#3e3540');poly(c,[[383,85],[406,139],[428,113],[447,163],[484,88],[446,62]],'#f18b50');for(let i=0;i<5;i++)line(c,[[410+i*8,122],[390+i*27,220],[350+i*53,330]],'#d56b45',5);}
  // Quiet, fixed detail belongs to the cached scenery, not per-frame noise.
  for(let i=0;i<25;i++){const x=(i*157+band*31)%960,y=350+(i*31)%80;poly(c,[[x,y],[x+9,y-12],[x+25,y-7],[x+29,y+8],[x+5,y+9]],p[4],p[2],1);line(c,[[x+7,y-6],[x+16,y-4],[x+20,y+3]],p[3],1);}
  if(band!==4)for(let i=0;i<16;i++){const x=i*67+13,y=424;line(c,[[x-9,y],[x-6,y-12],[x,y],[x+8,y-17],[x+6,y]],band===1?'#8b805e':'#779870',2);}
  rect(c,0,F,W,H-F,p[4]);for(let i=0;i<18;i++){const x=i*58-20,y=F+(i%3)*5;poly(c,[[x,y],[x+37,y-5],[x+60,y+10],[x+47,y+45],[x+2,y+38]],p[3]);line(c,[[x+4,y+8],[x+25,y+14],[x+32,y+28]],p[4],1.2);}rect(c,0,F-3,W,5,band===4?'#e18750':'#a4ad80');
  for(let i=0;i<35;i++){const x=(i*127)%960,y=F+48+(i*19)%48;poly(c,[[x,y],[x+5,y-3],[x+11,y+1],[x+8,y+5],[x+1,y+4]],p[2],null);}
 }
 function drawBackground(c,g){if(!g.level?.island)return false;const band=Math.max(0,Math.min(4,Math.floor((g.level.id-201)/10)));let plate=cache.get(band);
  if(!plate&&root.document?.createElement){plate=root.document.createElement('canvas');plate.width=W;plate.height=H;const ctx=plate.getContext?.('2d');if(ctx){paintBackground(ctx,band);cache.set(band,plate);}else plate=null;}
  if(plate)c.drawImage(plate,0,0);else paintBackground(c,band);
  if(g.settings?.effects!==false&&!g.settings?.reducedMotion){const t=g.time||0;c.save();c.globalAlpha=.25;for(let i=0;i<9;i++){const x=(i*137+t*(band===4?5:9))%W,y=band===4?330-(t*19+i*43)%250:90+(i*41)%230;if(band===4)rect(c,x,y,3,5,'#ffc78b');else line(c,[[x-7,y],[x,y+2],[x+8,y]],'#c7ded0',1);}c.restore();}return true;}
 function limbs(c,e,t,color,light){const move=Math.min(1,Math.abs(e.islandVX||e.vx||0)/90),step=Math.sin(t*8)*move*7,cast=e.islandState==='tell'?Math.sin((e.islandProgress||0)*Math.PI)*.7:0;
  for(const side of [-1,1]){c.save();c.translate(side*17,-28);c.rotate(side*step*.025);block(c,-9,0,18,27,color,light);block(c,-12,20,27,9,color,light);c.restore();c.save();c.translate(side*27,-67);c.rotate(side*.13-cast);block(c,-7,0,15,37,color,light);block(c,-9,27,19,14,light,color);c.restore();}}
 function rat(c,e,t){const step=Math.sin(t*12)*7;for(const side of [-1,1])for(let i=0;i<2;i++)block(c,-27+i*40,-13+side*step,14,14,'#746b5b','#a8a08a');poly(c,[[-38,-15],[-37,-58],[-15,-77],[21,-70],[39,-44],[31,-9]],'#796c5f');poly(c,[[10,-68],[33,-70],[57,-43],[35,-23],[16,-29]],'#a0957c');block(c,23,-77,19,24,'#9a8a78','#c3a493');eye(c,37,-52,'#f1ba71',4);poly(c,[[45,-35],[56,-36],[52,-23],[45,-23]],'#e4d8ab');line(c,[[-35,-31],[-62,-34],[-77,-20],[-84,-30]],'#9d8274',7);}
 function humanoid(c,e,t,k){const green=k==='luckyPatrick'||k==='leprechaun',skin=green?'#d1bc91':k==='ghostBunny'||k==='giantBunny'?'#b6c7c7':'#b3a48e',base=green?'#3c7450':'#6c7272';limbs(c,e,t,base,skin);block(c,-22,-77,44,48,base,green?'#82a16a':'#9ca08d');block(c,-21,-104,42,32,skin,'#ded9b8');eye(c,-10,-91,k==='ghostBunny'?'#b3eeed':'#f7e7bd',3);eye(c,11,-91,k==='ghostBunny'?'#b3eeed':'#f7e7bd',3);rect(c,-12,-79,25,4,'#384e46');
  if(green){block(c,-25,-132,48,29,k==='luckyPatrick'?'#305d42':'#4f7f42','#88a85b');block(c,-32,-107,64,8,'#527e47','#b6b875');clover(c,0,-121,7);rect(c,-22,-50,44,8,'#b7a152');rect(c,-5,-52,11,11,'#e5ca70');}
  if(k==='leprechaun'){poly(c,[[-19,-83],[-11,-62],[3,-57],[18,-76],[17,-86]],'#b56739');block(c,24,-42,20,25,'#9a7c43','#d6c389');rect(c,30,-39,7,7,'#e3c064');}
  if(k==='luckyPatrick'&&e.diceGlow>0){block(c,31,-87,24,24,'#e2dcbe','#fff1c7');c.fillStyle='#315b48';c.font='bold 18px sans-serif';c.fillText(String(e.diceResult||1),36,-68);}
  if(k==='ghostBunny'||k==='giantBunny'){for(const side of [-1,1]){block(c,side*14-6,-143,13,43,skin,'#e1dfc8');rect(c,side*14-2,-136,5,24,'#947c9c');}if(k==='giantBunny'){block(c,19,-60,62,20,'#856644','#bba277');line(c,[[28,-56],[35,-44]],'#5d5039',2);}else{block(c,21,-53,29,30,'#a17d51','#d0b27b');egg(c,35,-39,10);}}
  if(k==='drunkenWanderer'){c.save();c.translate(34,-40);c.rotate(-.3);block(c,-7,-20,14,27,'#628a79','#a9c4a0');block(c,-4,-30,8,10,'#749b81');c.restore();line(c,[[16,-81],[31,-80]],'#d8c8a9',3);rect(c,30,-82,3,4,'#e49f68');}}
 function bird(c,e,t){for(const side of [-1,1]){c.save();c.translate(side*23,-70);c.rotate(side*(.25+Math.sin(t*5)*.18));for(let i=0;i<6;i++)poly(c,[[0,-8],[side*(35+i*9),-45+i*10],[side*(28+i*8),17+i*5],[0,8]],i%2?'#9a8873':'#d1b995');c.restore();}limbs(c,e,t,'#706852','#c6b58b');block(c,-24,-79,48,45,'#8c805d','#b3a477');poly(c,[[-25,-112],[16,-120],[37,-94],[15,-72],[-24,-78]],'#d1c5a2');poly(c,[[18,-104],[55,-86],[18,-86]],'#e5c583');eye(c,6,-99,'#78d0dd',5);for(let i=0;i<4;i++)poly(c,[[-25+i*13,-115],[-30+i*13,-141-i%2*10],[-11+i*13,-119]],'#a98569');}
 function mana(c,e,t){const guarded=e.manaShield>0;for(let i=0;i<6;i++){const a=t*.6+i*TAU/6,x=Math.cos(a)*39,y=-65+Math.sin(a)*43;c.save();c.translate(x,y);c.rotate(Math.sin(a)*.3);block(c,-12,-22,24,44,'#65766f','#a9b89c');line(c,[[-5,-12],[5,0],[-5,12]],'#88e5df',3);c.restore();}poly(c,[[0,-101],[24,-65],[0,-29],[-24,-65]],'#6ac4d6','#a8eee4',3);eye(c,0,-67,'#f1fff1',5);if(guarded)ring(c,0,-65,58,'#9bdde0',3);}
 function make(c,e,t){limbs(c,e,t,'#554442','#a37f63');block(c,-29,-80,58,57,'#714f43','#cf8c60');for(let i=0;i<4;i++)line(c,[[-22+i*15,-74],[-25+i*15,-55],[-15+i*15,-37]],'#ed9257',3);
  poly(c,[[-35,-123],[-20,-143],[23,-143],[37,-122],[31,-80],[0,-71],[-32,-81]],'#9f8967','#28363a',3);for(const x of [-16,17]){ring(c,x,-112,12,'#463f3b',5);eye(c,x,-112,'#ffdb9c',6);}poly(c,[[-6,-108],[6,-108],[11,-90],[-11,-90]],'#c5a275');line(c,[[-17,-85],[16,-85]],'#554338',4);}
 function drawEnemy(c,g,e,t=g.time||0){const k=e.archetype||e.type;if(!MM.IslandCombat?.owns(e))return false;if(e.islandState==='burrow')return true;
  const effects=g.settings?.effects!==false&&!g.settings?.reducedMotion,clock=effects?t:0;let alpha=1;if(e.hiddenTime>0)alpha=Math.max(0,Math.min(1,(e.hiddenTime-4.7)/.3));if(alpha<=0)return true;
  c.save();c.globalAlpha*=alpha;c.translate(e.x,e.y);c.scale((e.dir||1)*(e.w||60)/80,(e.h||110)/110);if(e.petrifiedTime>0)c.filter='grayscale(1)';
  if(k==='easterEgg'){egg(c,0,0,44,'#d2c28f');eye(c,-12,-34,'#404e49',3);eye(c,12,-34,'#404e49',3);if(e.islandState==='tell')line(c,[[-12,-52],[6,-42],[-4,-24],[12,-10]],'#edab70',3);}
  else if(k==='miniMoai'||k==='awakeningMoai'){if(e.islandState==='growing')c.scale(1,Math.max(.08,1-(e.islandTimer||0)));if(k==='awakeningMoai'){limbs(c,e,clock,'#788174','#b7b39c');c.save();c.translate(0,-15);c.scale(1, .88);moai(c,clock,e.islandState!=='sleep');c.restore();if(e.stoneArmor)ring(c,0,-60,46,'#c3b88666',3);}else moai(c,clock);}
  else if(k==='deforestedAlpha'||k==='mutantRat')rat(c,e,clock);
  else if(k==='birdman')bird(c,e,clock);
  else if(k==='manaSpirit')mana(c,e,clock);
  else if(k==='makemake')make(c,e,clock);
  else{if(k==='drunkenWanderer'&&effects)c.rotate(Math.sin(clock*3)*.045);humanoid(c,e,clock,k);}
  c.restore();return true;}
 function drawEffects(c,g,front=false){if(!g.level?.island&&!g.resurrection)return;const s=g.island,t=g.settings?.reducedMotion?0:g.time||0;c.save();
  if(!front&&s){for(const p of s.platforms)block(c,p.x-p.w/2,p.y,p.w,35,'#635957','#aa9b7d');
   for(const z of s.hazards){if(z.expired)continue;const active=z.phase==='active';c.globalAlpha=active?.8:.35;const col=z.type==='lava'?'#e4804f':z.type==='poison'?'#96b86b':z.type==='rune'?'#8ec9e1':'#d8be7d';
    if(z.beam){const b=z.beam;line(c,[[b.x1,b.y1],[b.x2,b.y2]],'#81d6ce',b.r*2);line(c,[[b.x1,b.y1],[b.x2,b.y2]],'#fff2bb',6);}
    else if(['quake','lava','egg-burst','explosion','poison','emerge','earth-claw'].includes(z.type)){poly(c,[[z.x-z.w/2,z.y],[z.x-z.w*.25,z.y-z.h*.8],[z.x,z.y-z.h*.35],[z.x+z.w*.3,z.y-z.h],[z.x+z.w/2,z.y]],col,active?INK:col,2);}
    else{rect(c,z.x-z.w/2,z.y-z.h,z.w,z.h,col);line(c,[[z.x-z.w/2,z.y],[z.x+z.w/2,z.y]],'#e8dab1',2);}c.globalAlpha=1;}
   for(const z of s.seals){block(c,z.x-30,z.y-16,60,16,'#6d796e',z.activated?'#b4e8cf':'#a59a7b');ring(c,z.x,z.y-22,z.activated?18:10,z.activated?'#9eebda':'#c6b58a');if(s.protection&&z.activated){c.globalAlpha=.22;ring(c,z.x,z.y-40,MM.IslandConfig.boss.sealZone,'#8aeadb',8);c.globalAlpha=1;}}
   for(const e of g.enemies||[])if(e.islandState==='tell'){if(e.islandSkill==='laser'){const b=MM.IslandCombat.beam(e);c.setLineDash([7,6]);line(c,[[b.x1,b.y1],[b.x2,b.y2]],'#eddd99',2);c.setLineDash([]);}else{const x=e.islandSkill==='dive'?e.targetX:e.x+(e.attackDir||1)*100;line(c,[[x-45,F+1],[x+45,F+1]],'#efcf86',4);}}
  }
  if(front){for(const q of [...(s?.projectiles||[]),...(g.resurrection?.projectiles||[])]){c.save();c.translate(q.x,q.y);c.rotate(t*4);if(q.type?.includes('clover'))clover(c,0,0,10);else if(q.type?.includes('egg')||q.type?.includes('Egg')||q.type==='bomb')egg(c,0,7,13,q.poison?'#91ab83':'#dfbf90');else if(q.type==='meteor'||q.type==='fireball'){poly(c,[[-22,7],[-12,-15],[4,-25],[21,-7],[14,17]],'#e8a15b');poly(c,[[-7,7],[0,-13],[10,-4],[4,13]],'#f2db9a',null);}else{block(c,-9,-8,18,16,q.type==='stone'?'#8e9281':'#83cdd2','#d7e5bd');}c.restore();}
   if(s?.vision>0){c.globalAlpha=.23;rect(c,0,0,180,H,'#122832');rect(c,780,0,180,H,'#122832');c.globalAlpha=1;}
   const judge=(g.enemies||[]).find(e=>e.islandState==='judgment'&&!e.dead);if(judge){c.globalAlpha=.1+(judge.islandProgress||0)*.2;rect(c,0,0,W,H,'#e8ad71');c.globalAlpha=1;c.fillStyle='#fff0bd';c.font='bold 15px "Noto Sans",sans-serif';c.textAlign='center';c.fillText('PHÁN XÉT · '+Math.ceil(judge.islandTimer)+'s · '+(s.seals.filter(z=>z.activated).length)+'/'+MM.IslandConfig.boss.sealRequired+' PHONG ẤN',W/2,100);}
  }c.restore();}
 function drawWeapon(c,p,weapon,g,t){if(!['easterEgg','dreamBook'].includes(weapon))return false;
  c.save();c.scale(p.dir||1,1);block(c,-26,-30,15,12,'#5f7b4a','#9b9f7c');block(c,13,-29,20,10,'#5f7b4a','#d7bd92');
  if(weapon==='dreamBook'){block(c,14,-38,27,27,'#687b96','#a8ceda');line(c,[[27,-35],[27,-13]],'#d6e3bb',2);clover(c,28,-21,5);}
  else{const form=MM.ResurrectionRewards?.currentForm(g);if(form==='staff')block(c,22,-79,9,83,'#896b48','#d8b47c');else if(form==='glove')block(c,19,-33,21,24,'#d8be7c','#f7e4a9');else if(form==='clover')clover(c,30,-22,10);else if(form==='fire')poly(c,[[19,-11],[12,-28],[27,-50],[40,-22],[35,-8]],'#e5a45f');else egg(c,29,-13,13);}
  c.restore();return true;}
 function drawPlayer(c,g,t){const s=g.resurrection,p=g.player;if(!s||!p)return;const f=MM.ResurrectionRewards?.currentForm(g),effects=g.settings?.effects!==false&&!g.settings?.reducedMotion;c.save();
  if(MM.SaveManager?.unlocked(g,200)&&g.level.id!==70){const x=p.x+Math.sin((effects?t:0)*2)*14,y=p.y-p.h-37+(effects?Math.sin(t*3)*3:0);c.save();c.translate(x,y);block(c,-9,-16,18,17,'#c7d6bf','#e9e5bf');poly(c,[[-7,0],[7,0],[12,18],[0,12],[-12,18]],'#76bbc2');eye(c,-3,-9,'#384e55',2);eye(c,5,-9,'#384e55',2);c.restore();if(s.armorRemaining>0){ring(c,p.x,p.y-p.h*.5,54,'#a1e1d3',3);ring(c,p.x,p.y-p.h*.5,58,'#8fd2cd66',2);}}
  for(const a of [s.moai,s.clone])if(a){c.save();if(a.type==='friendlyMoai'){c.translate(a.x,a.y);c.scale(.8,.8);moai(c,t);}else{c.globalAlpha=.65;MM.Renderer?.drawHunter(c,{...a,vx:50,ammo:10,weaponMode:a.weapon},t,effects,{...g,progression:{...g.progression,equipped:a.weapon},rollSlash:null,weaponAttack:null});}c.restore();rect(c,a.x-22,a.y-a.h-12,44,4,'#263f4a');rect(c,a.x-22,a.y-a.h-12,44*Math.max(0,a.health/a.maxHealth),4,'#9ad9bd');}
  if(f==='fire')for(let i=0;i<8;i++){const a=i*TAU/8+t*.6;poly(c,[[p.x+Math.cos(a)*34,p.y-p.h*.5+Math.sin(a)*35],[p.x+Math.cos(a)*45,p.y-p.h*.5+Math.sin(a)*53],[p.x+Math.cos(a+.2)*27,p.y-p.h*.5+Math.sin(a+.2)*27]],'#e59d6080',null);}
  c.restore();}
 function drawMoaiPlayer(c,g){if(MM.ResurrectionRewards?.currentForm(g)!=='moai')return false;const p=g.player;c.save();c.translate(p.x,p.y);c.scale(p.dir*p.w/60,p.h/105);moai(c,g.time);c.restore();return true;}
 MM.IslandRenderer={drawBackground,drawEnemy,drawEffects,drawPlayer,drawWeapon,drawMoaiPlayer};
})(typeof window!=='undefined'?window:globalThis);
