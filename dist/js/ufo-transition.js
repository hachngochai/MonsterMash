/* Paint-only UFO journeys. The game owns rewards, saving and the destination;
 * this controller never changes the hunter's HP, ammunition or equipment. */
(function(root){
 'use strict';const MM=root.MM=root.MM||{},W=960,H=540,F=438,TAU=Math.PI*2;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,ease=n=>{n=clamp(n);return n*n*(3-2*n);};
 const fade=(t,a,b)=>ease((t-a)/(b-a||1));
 const entryFrames=new WeakMap();
 function captureEntry(g){
  const source=g.canvas;if(!(source?.width>0&&source?.height>0))return;
  try{const frame=root.document?.createElement?.('canvas');if(!frame)return;frame.width=W;frame.height=H;const c=frame.getContext?.('2d');if(!c)return;c.drawImage(source,0,0,W,H);entryFrames.set(g,frame);}catch{/* An unavailable frame copy never blocks a journey. */}
 }
 const route=from=>Number.isInteger(from)?MM.CosmicConfig?.authored?.crossings.find(c=>c.from===from)||null:null;
 const region=id=>MM.CosmicConfig?.authored?.regions.find(r=>r.id===id)||null;
 const spans=first=>first?{duration:18,lift:3.3,aboard:6.2,depart:8.6,cabinStart:8.6,cabinEnd:12.2,cruise:15}:{duration:12,lift:2.1,aboard:4,depart:6,cabinStart:0,cabinEnd:0,cruise:8.4};
 function track(points,time){
  if(time<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++)if(time<=points[i][0])return mix(points[i-1][1],points[i][1],fade(time,points[i-1][0],points[i][0]));
  return points.at(-1)[1];
 }
 function sample(from,progress,entry={}){
  const crossing=route(from);if(!crossing)return null;
  const p=clamp(Number.isFinite(progress)?progress:0),first=crossing.firstBoarding,s=spans(first),t=p*s.duration;
  const land=s.cruise,end=s.duration,cabin=first?fade(t,s.cabinStart-.25,s.cabinStart+.4)*(1-fade(t,s.cabinEnd-.45,s.cabinEnd+.1)):0;
  const source=1-fade(t,s.depart-1.9,s.depart-.6),arrival=fade(t,land-.7,land+.5),pickup=fade(t,s.lift-.5,s.lift)*(1-fade(t,s.aboard-.15,s.aboard+.25));
  const cabinA=first?s.cabinStart+.45:s.depart+.1,cabinB=first?s.cabinEnd-.65:s.depart+.2;
  const entryX=clamp(Number.isFinite(entry.x)?entry.x:480,24,W-24),entryY=clamp(Number.isFinite(entry.y)?entry.y:F,60,F);
  const walkEnd=Math.max(.4,s.lift-.55),walkPoints=[[0,entryX],[walkEnd,480],[s.aboard,480],[cabinA,365],[cabinB,425],[land-.2,320],[end-1.2,320],[end,480]];
  const hero={
   x:track(walkPoints,t),
   y:track([[0,entryY],[Math.min(.7,walkEnd),F],[s.lift+.15,F],[s.aboard-.35,145],[s.aboard,94],[cabinA,F],[cabinB,F],[land-.2,325],[end-1.8,325],[end-1.2,F],[end,F]],t),
   scale:track([[0,1],[s.aboard,1],[cabinA,1.12],[cabinB,1.12],[land,1],[end,1]],t),
   alpha:(1-fade(t,s.aboard-.55,s.aboard-.05))+(first?fade(t,cabinA,cabinA+.3)*(1-fade(t,cabinB-.3,cabinB+.15)):0)+fade(t,end-1.8,end-1.3),
   suit:first?fade(t,s.cabinStart+.65,s.cabinStart+1.45):1,
   tilt:pickup?Math.sin(fade(t,s.lift,s.aboard)*Math.PI)*-.08:0,
   walk:0,phase:t<s.lift?'waiting':t<s.aboard?'lift':cabin>.1?'cabin':t<land?'aboard':'arrival'
  };
  hero.alpha=clamp(hero.alpha);
  const epsilon=.0001,position=time=>track(walkPoints,time),velocity=(position(Math.min(end,t+epsilon))-position(Math.max(0,t-epsilon)))/(2*epsilon);
  if((t<walkEnd||cabin>.1||t>end-1.2)&&hero.alpha>.1)hero.walk=clamp(Math.abs(velocity),0,160);
  hero.dir=Math.abs(velocity)>1?Math.sign(velocity):(Number(entry.dir)<0?-1:1);
  if(t>=walkEnd&&t<end-1.2)hero.dir=1;
  const ship={
   x:track([[0,480],[s.depart,480],[land-1.5,480],[land,320],[end,320]],t),
   y:track([[0,-150],[s.lift-.5,116],[s.aboard,116],[s.depart-.7,-180],[s.depart,-230],[land-1.5,180],[land,150],[end-1.8,305],[end,305]],t),
   scale:track([[0,1.05],[s.aboard,1.05],[s.depart,.48],[land-1.5,.48],[land,1],[end,1]],t),
   alpha:fade(t,0,.6)*(1-fade(t,s.depart-.6,s.depart))*(1-arrival)+fade(t,land-1.4,land-.75)*(1-fade(t,end-.65,end)),
   hatch:Math.max(pickup,fade(t,end-2.2,end-1.8)*(1-fade(t,end-.8,end-.4))),
   engine:fade(t,s.aboard-.2,s.aboard+.3)*(1-fade(t,s.depart-.2,s.depart+.1))+fade(t,land-1.5,land-.7)*(1-fade(t,end-1.9,end-1.4))
  };
  ship.alpha=clamp(ship.alpha);
  const phase=t<s.lift?'ufo-descent':t<s.aboard?'beam-boarding':t<s.depart?'departure':cabin>.1?'ufo-interior':t<land?'space-travel':'planet-arrival';
  return {from,to:crossing.to,first,progress:p,time:t,duration:s.duration,phase,hero,ship,sourceAlpha:source,arrivalAlpha:arrival,cabinAlpha:cabin,
   beamAlpha:pickup,arrivalBeam:fade(t,end-2,end-1.65)*(1-fade(t,end-1.25,end-.9)),
   darkness:fade(t,0,s.lift-.8)*.68,earthAlpha:fade(t,s.depart-1.8,s.depart-.5)*(1-fade(t,land-2.5,land-1.5)),
   earthRadius:track([[0,130],[s.depart-.6,95],[land-2,25],[end,25]],t),
   destinationAlpha:fade(t,s.depart-.3,first?s.cabinStart+.5:s.depart+.4)*(1-arrival),
   destinationRadius:track([[0,32],[s.depart,42],[land,190],[end,200]],t),
   travel:fade(t,s.depart-.2,s.depart+.5)*(1-fade(t,land-.4,land+.2)),crossing,destination:region(crossing.toRegion)};
 }
 function skipUI(g,hidden){const button=g.ui?.['cinematic-skip'];if(button){button.hidden=hidden;if(!hidden)button.textContent='Bỏ qua ›';}}
 function clear(g){if(!g?.ufoCinematic)return false;const s=g.ufoCinematic;g.ufoCinematic=null;entryFrames.delete(g);if(g.screen==='ufo-cinematic')g.screen=s.previousScreen;skipUI(g,true);return true;}
 function begin(g,from,done){
  const crossing=route(from);if(!g||!crossing||g.ufoCinematic||g.cinematic)return false;
  const reduced=!!g.settings?.reducedMotion;
  captureEntry(g);
  g.ufoCinematic={from,to:crossing.to,time:0,duration:spans(crossing.firstBoarding).duration,reducedMotion:reduced,previousScreen:g.screen,
   entry:{x:g.player?.x,y:g.player?.y,dir:g.player?.dir},
   done:typeof done==='function'?done:null,finished:false};
  g.clearInputs?.();g.screen='ufo-cinematic';g.lastTime=0;skipUI(g,false);return true;
 }
 function finish(g,skipped){const s=g?.ufoCinematic;if(!s||s.finished)return false;s.finished=true;clear(g);g.lastTime=0;s.done?.(g,{from:s.from,to:s.to,skipped:!!skipped});return true;}
 function skip(g){return finish(g,true);}
 function update(g,dt){const s=g?.ufoCinematic;if(!s||g.screen!=='ufo-cinematic')return false;s.time=Math.min(s.duration,s.time+Math.max(0,Number.isFinite(dt)?dt:0));if(s.time+1e-8>=s.duration)finish(g,false);return true;}
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function glow(c,x,y,r,color,alpha=1){c.save();c.globalAlpha*=alpha;const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'#00000000');ellipse(c,x,y,r,r,gr);c.restore();}
 function space(c,t,moving,travel=0){
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#050919');sky.addColorStop(.65,'#182541');sky.addColorStop(1,'#0b1527');rect(c,0,0,W,H,sky);
  glow(c,650,190,220,'#554c9245',.55);glow(c,260,320,190,'#2c567b44',.5);
  for(let i=0;i<78;i++){const x=(i*137.13+31+(moving?t*(2+i%3)*(1+travel*5):0))%W,y=24+(i*79.7)%470,size=.65+i%3*.5;rect(c,x,y,size,size,i%7?'#cddceb9c':'#ffe9b5');
   if(travel>.05){c.save();c.globalAlpha*=travel*.3;line(c,[[x,y],[x-25-travel*90,y+3]],'#b0e6f2',.8);c.restore();}}
 }
 function planet(c,x,y,r,color,earth=false,ring=false){
  c.save();glow(c,x,y,r*1.15,color+'35',.6);ellipse(c,x,y,r,r,color,'#bdd9ed55',1);c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();
  if(earth){poly(c,[[x-r*.9,y-r*.3],[x-r*.4,y-r*.7],[x+r*.2,y-r*.5],[x+r*.4,y-r*.15],[x-r*.05,y+r*.15],[x-r*.15,y+r*.7],[x-r*.45,y+r*.55]],'#668e7b');poly(c,[[x+r*.5,y-r*.55],[x+r*.9,y-r*.25],[x+r*.7,y+r*.45],[x+r*.3,y+r*.22]],'#7b987e');}
  else for(let i=0;i<7;i++){const yy=y-r+(i+.5)*r*2/7;line(c,[[x-r,yy],[x+r,yy+r*.12]],i%2?'#e5dbc029':'#101b2b35',r*.08);}
  const shade=c.createLinearGradient(x-r,y-r,x+r,y+r);shade.addColorStop(0,'#e1f1f81a');shade.addColorStop(.6,'#00040a11');shade.addColorStop(1,'#00030bcc');rect(c,x-r,y-r,r*2,r*2,shade);c.restore();
  if(ring){c.save();c.translate(x,y);c.rotate(-.27);c.beginPath();c.ellipse(0,0,r*1.65,r*.35,0,0,TAU);c.strokeStyle='#e0d2b982';c.lineWidth=r*.08;c.stroke();c.restore();}c.restore();
 }
 function celestial(c,id,x,y,r,t=0){const target=region(id);if(MM.CosmicPlanets?.draw){MM.CosmicPlanets.draw(c,id,x,y,r,t);return;}planet(c,x,y,r,target?.color||'#517f9b',false,id==='saturn');}
 function landscape(c,g,id,t,options){
  const target=region(id);
  if(id==='island'&&MM.IslandRenderer?.drawBackground(c,{...g,time:t,level:{id:250,island:true}},t))return;
  if(target&&MM.CosmicScenery?.drawBackground(c,target,t,options)!==false&&MM.CosmicScenery?.drawBackground)return;
  const colors=id==='island'?['#403b3c','#865d3d']:['#152b44',target?.color||'#b69d75'];
  const sky=c.createLinearGradient(0,0,0,F);sky.addColorStop(0,colors[0]);sky.addColorStop(1,colors[1]);rect(c,0,0,W,F,sky);
  planet(c,750,115,75,target?.color||'#d98c55',false,id==='saturn');
  for(let i=0;i<12;i++){const x=i*92-30,height=75+(i*37)%125;poly(c,[[x,F],[x+12,F-height],[x+46,F-height-17],[x+86,F]],i%2?'#3e4949':'#53564b');}
  rect(c,0,F,W,H-F,'#252e35');line(c,[[0,F],[W,F]],'#9b9e80',3);
  if(target&&target.terrain!=='rock'&&target.terrain!=='low-gravity-rock'){line(c,[[0,F+6],[W,F+6]],'#8ec9d0',4);for(let i=0;i<12;i++)line(c,[[i*87,F+10],[i*87+26,F+30]],'#719ca6',3);}
 }
 function beam(c,x,top,bottom,alpha,color='#a8e2e4',moving=false,t=0){
  if(alpha<=0)return;c.save();c.globalAlpha*=alpha;const fill=c.createLinearGradient(x,top,x,bottom);fill.addColorStop(0,color+'85');fill.addColorStop(1,color+'08');poly(c,[[x-17,top],[x+17,top],[x+100,bottom],[x-100,bottom]],fill);
  line(c,[[x-18,top],[x-100,bottom]],color+'44',1);line(c,[[x+18,top],[x+100,bottom]],color+'44',1);
  for(let i=0;i<12;i++){const q=(i/12+(moving?t*.2:0))%1,xx=x+Math.sin(i*2.4)*q*70,yy=mix(top,bottom,1-q);rect(c,xx,yy,1.4,4,color+'9a');}
  ellipse(c,x,bottom,95,12,null,color+'55',1.4);c.restore();
 }
 function ufo(c,a,t,moving){
  if(a.alpha<=0)return;c.save();c.globalAlpha*=a.alpha;c.translate(a.x,a.y);c.scale(a.scale,a.scale);const pulse=moving?Math.sin(t*4)*.08:0;
  if(a.engine>0){glow(c,0,-15,110,'#90dbea66',a.engine*.5);poly(c,[[-72,-6],[-82,-69],[0,-155],[82,-69],[72,-6]],'#6eaad51c');}
  poly(c,[[-168,10],[-125,-17],[-70,-28],[70,-28],[125,-17],[168,10],[105,40],[-105,40]],'#506779','#122638',3);
  poly(c,[[-168,10],[-72,7],[0,14],[72,7],[168,10],[105,40],[-105,40]],'#263b4b','#0d2333',2);
  poly(c,[[-100,-15],[-70,-60],[-25,-82],[29,-82],[73,-58],[101,-15],[43,-2],[-42,-2]],'#406a7d','#162e42',2);
  poly(c,[[-70,-60],[-25,-82],[29,-82],[9,-34],[-38,-17],[-85,-17]],'#81b1bd55');line(c,[[-70,-60],[-25,-82],[29,-82],[73,-58]],'#b0dde0a8',2);
  for(let i=0;i<9;i++){const x=-117+i*29,y=12+Math.abs(i-4)*1.1;rect(c,x-6,y,12,4,i%2?'#b6e0d7':'#75cce0');}
  ellipse(c,0,37,35,8,'#081a29','#9cc5cb',1.3);ellipse(c,0,38,27,5,'#9ad1d7'+Math.round((.45+a.hatch*.4+pulse)*255).toString(16).padStart(2,'0'));
  for(const side of [-1,1]){line(c,[[side*98,28],[side*116,58]],'#192c3a',5);line(c,[[side*105,58],[side*131,58]],'#8ba7ac',3);}
  c.restore();
 }
 function hunter(c,g,a,t,moving){
  if(a.alpha<=0)return;c.save();c.globalAlpha*=a.alpha;c.translate(a.x,a.y);c.scale(a.scale,a.scale);c.rotate(a.tilt);
  const actor={...g.player,x:0,y:F,w:38,h:54,dir:a.dir,vx:moving?a.walk*a.dir:0,vy:0,swimming:false,invulnerable:0,stunTime:0,petrifyTime:0,knockdownTime:0,burnTime:0,immortalTime:0,shieldTime:0,rollTime:0,rollProgress:0,shotTimer:0,merfolkTime:0};
  const paint={settings:{...g.settings,reducedMotion:!moving},level:{id:251,underwater:false},progression:{...g.progression,equipped:g.progression?.equipped||'gun'},rollSlash:null,weaponAttack:null};
  if(MM.Renderer?.drawHunter){
   const suit=clamp(a.suit);for(const [wearing,opacity] of [[false,1-suit],[true,suit]]){if(opacity<=0)continue;const dressed={...paint,level:{...paint.level,cosmic:wearing}};c.save();c.globalAlpha*=opacity;c.translate(0,-F);MM.Renderer.drawHunter(c,actor,t,moving,dressed);if(wearing)MM.CosmicRenderer?.drawJetpack(c,{...dressed,player:actor,cosmicRewards:{jetpack:0}},t);c.restore();}
  }
  else{rect(c,-16,-32,32,24,'#577846');rect(c,-16,-53,32,26,'#d8b47d');rect(c,-22,-56,44,7,'#354b3c');rect(c,-12,-12,8,13,'#243d38');rect(c,4,-12,8,13,'#243d38');rect(c,-10,-42,5,5,'#fff1d7');rect(c,6,-42,5,5,'#fff1d7');}
  c.restore();
 }
 function text(c,value,x,y,size=13,color='#dce9df',serif=false){c.fillStyle=color;c.textAlign='center';c.textBaseline='alphabetic';if('letterSpacing'in c)c.letterSpacing='0px';if('fontKerning'in c)c.fontKerning='normal';c.font=(serif?'700 ':'500 ')+size+'px '+(serif?(MM.Typography?.serif||'"Noto Serif",Georgia,serif'):(MM.Typography?.sans||'"Noto Sans",Arial,sans-serif'));c.fillText(String(value).normalize('NFC'),x,y);}
 function cabin(c,g,a,t,moving){
  const fill=c.createLinearGradient(0,0,0,H);fill.addColorStop(0,'#0f1f32');fill.addColorStop(1,'#223844');rect(c,0,0,W,H,fill);
  poly(c,[[140,70],[820,70],[864,116],[842,318],[126,318],[103,116]],'#071426','#587786',5);c.save();c.beginPath();c.rect(126,83,716,226);c.clip();space(c,t,moving,.5);celestial(c,a.destination.id,565,195,88,t);c.restore();
  for(const side of [-1,1]){const x=480+side*390;poly(c,[[x-31,20],[x+31,20],[x+21,390],[x-28,390]],'#263e4b','#0d1c2b',2);line(c,[[x-18,44],[x-21,291]],'#62b7c7',3);}
  poly(c,[[0,F],[141,344],[820,344],[960,F],[960,H],[0,H]],'#344b55','#142b37',2);
  for(let i=0;i<7;i++)line(c,[[i*160,F],[480+(i-3)*90,344]],'#57727c',1);line(c,[[0,F],[W,F]],'#7ed5dc',2);
  for(const x of [180,650]){poly(c,[[x,320],[x+135,320],[x+148,379],[x-13,379]],'#1b333f','#577a83',2);rect(c,x+16,332,98,27,'#30566a');for(let i=0;i<4;i++)rect(c,x+22+i*22,340,14,3,i%2?'#84d6ce':'#b8d4ad');}
  const pod=655;poly(c,[[pod,106],[pod+104,106],[pod+117,288],[pod-12,288]],'#22475355','#97b8bc',2);ellipse(c,pod+52,156,25,24,'#8cb6c544','#c6ded5',2);poly(c,[[pod+27,186],[pod+77,186],[pod+85,239],[pod+63,255],[pod+40,255],[pod+18,239]],'#b7cdc8','#507884',2);rect(c,pod+29,250,18,28,'#91a9aa');rect(c,pod+57,250,18,28,'#91a9aa');
  text(c,'MAKEMAKE',pod+52,307,11,'#a9ddd4');text(c,a.destination.name.toUpperCase(),263,335,11,'#91dad7');
 }
 function caption(c,a){
  const labels={'ufo-descent':['TÍN HIỆU TỪ BẦU TRỜI','Một hành trình khác đang chờ.'],'beam-boarding':['KHOANG TIẾP NHẬN','Theo chùm sáng rời khỏi mặt đất.'],departure:['RỜI BẦU KHÍ QUYỂN','Giữ ngọn đèn giữa biển sao.'],'ufo-interior':['BỘ ĐỒ PHI HÀNH GIA MAKEMAKE','Sẵn sàng cho những miền trọng lực mới.'],'space-travel':['ĐẠI CHIẾN VŨ TRỤ','Điểm đến: '+a.destination.name+'.'],'planet-arrival':[a.destination.name.toUpperCase(),a.destination.subtitle]};
  const pair=labels[a.phase];c.save();const shade=c.createLinearGradient(0,0,0,135);shade.addColorStop(0,'#030a15e8');shade.addColorStop(1,'#030a1500');rect(c,0,0,W,135,shade);text(c,a.first?'ĐẠI CHIẾN VŨ TRỤ · 250 → 251':'UFO LIÊN HÀNH TINH · '+a.from+' → '+a.to,480,35,10,'#c4bc91');text(c,pair[0],480,73,25,'#f1e8cf',true);text(c,pair[1],480,99,12,'#bbd6d6');c.restore();
 }
 function draw(c,g){
  const film=g?.ufoCinematic;if(!film||g.screen!=='ufo-cinematic')return false;
  const a=sample(film.from,film.time/film.duration,film.entry);if(!a)return false;const moving=!(film.reducedMotion||g.settings?.effects===false),t=moving?a.time:0,options={effects:moving,reducedMotion:!moving};
  c.save();c.beginPath();c.rect(0,0,W,H);c.clip();space(c,t,moving,a.travel);
  if(a.earthAlpha>0){c.save();c.globalAlpha*=a.earthAlpha;if(a.first)planet(c,690,365,a.earthRadius,'#517f9b',true);else celestial(c,a.crossing.fromRegion,690,365,a.earthRadius,t);c.restore();}
  if(a.destinationAlpha>0){c.save();c.globalAlpha*=a.destinationAlpha;celestial(c,a.destination.id,735,220,a.destinationRadius,t);c.restore();}
  if(a.sourceAlpha>0){c.save();c.globalAlpha*=a.sourceAlpha;landscape(c,g,a.crossing.fromRegion,t,options);rect(c,0,0,W,H,'rgba(3,8,20,'+a.darkness+')');c.restore();}
  if(a.arrivalAlpha>0){c.save();c.globalAlpha*=a.arrivalAlpha;landscape(c,g,a.destination.id,t,options);c.restore();}
  if(a.cabinAlpha>0){c.save();c.globalAlpha*=a.cabinAlpha;cabin(c,g,a,t,moving);c.restore();}
  if(a.beamAlpha>0)beam(c,a.ship.x,a.ship.y+37*a.ship.scale,F,a.beamAlpha,'#a8e2e4',moving,t);
  if(a.arrivalBeam>0)beam(c,320,342,F,a.arrivalBeam*.65,'#a8e2e4',moving,t);
  const ship={...a.ship,alpha:a.ship.alpha*(1-a.cabinAlpha)};ufo(c,ship,t,moving);hunter(c,g,a.hero,t,moving);
  if(a.arrivalAlpha>.2&&a.destination.terrain.includes('protected')){c.save();c.globalAlpha*=a.arrivalAlpha*.16;ellipse(c,480,F,480,235,null,a.destination.id==='sun'?'#ffd39f':'#b8b0ed',2);c.restore();}
  caption(c,a);rect(c,0,0,W,12,'#030a11b9');rect(c,0,H-16,W,16,'#030a11bf');rect(c,28,H-8,W-56,1,'#94bbbd40');rect(c,28,H-8,(W-56)*a.progress,1,'#c9dfd2');
  const entryFrame=entryFrames.get(g),entryAlpha=1-fade(a.time,0,.32);if(entryFrame&&entryAlpha>0){c.save();c.globalAlpha*=entryAlpha;c.drawImage(entryFrame,0,0,W,H);c.restore();}
  c.restore();return true;
 }
 MM.UFOTransition={begin,update,draw,skip,sample,clear};
})(typeof window!=='undefined'?window:globalThis);
