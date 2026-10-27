/* Cosmic scenery is paint-only. Every solid-looking foreground deck shares the
 * real y438 walking plane; the gas giants, Sun and black hole never gain a
 * fictional natural surface. No particles or scenery enter the combat graph. */
(function(root){
 'use strict';
 const MM=root.MM=root.MM||{},W=960,H=540,F=438,TAU=Math.PI*2;
 const ids=['mercury','venus','mars','jupiter','saturn','uranus','neptune','moon','sun','blackHole'];
 const authored=()=>MM.CosmicConfig?.authored?.regions||[];
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
 const palettes={
  mercury:{sky:['#141c30','#8c5143'],rock:'#393c48',light:'#87877d',edge:'#b5a182',glow:'#efa56b'},
  venus:{sky:['#766137','#bd964f'],rock:'#665b3b',light:'#b7ad65',edge:'#e0d987',glow:'#dee698'},
  mars:{sky:['#34212b','#b0664a'],rock:'#693d36',light:'#ad745b',edge:'#d39a75',glow:'#e9a06d'},
  jupiter:{sky:['#302c38','#9d8269'],rock:'#3e5356',light:'#839d91',edge:'#96d7b6',glow:'#b6efd0'},
  saturn:{sky:['#101e36','#4a536b'],rock:'#4b5264',light:'#9ba3b3',edge:'#c8c6b5',glow:'#d5d9e9'},
  uranus:{sky:['#102a43','#478ca2'],rock:'#395e72',light:'#a3d2dc',edge:'#d7f6f0',glow:'#a9eae9'},
  neptune:{sky:['#08162f','#284d91'],rock:'#33465f',light:'#748aa9',edge:'#a6bddf',glow:'#b2a6ef'},
  moon:{sky:['#080f20','#18263b'],rock:'#535866',light:'#9296a0',edge:'#bbc0c8',glow:'#e3e8e4'},
  sun:{sky:['#591e24','#df7539'],rock:'#584247',light:'#a28c7b',edge:'#f7c97c',glow:'#ffdda0'},
  blackHole:{sky:['#090e25','#332a48'],rock:'#3a3f56',light:'#80798f',edge:'#c0acd8',glow:'#c3a8ef'}
 };
 const walkingLines={mercury:.73,venus:.795,mars:.84,jupiter:.537,saturn:F/H,uranus:.885,neptune:.617,moon:.89,sun:.475,blackHole:.653};
 const entries=Object.fromEntries(ids.map(id=>[id,{image:null,ready:false,failed:false,floor:walkingLines[id]}]));
 const fallbackPlates=new Map();
 const script=root.document?.currentScript?.src;
 const base=script&&typeof URL==='function'?new URL('../',script).href:'';
 const version=script&&typeof URL==='function'?new URL(script).search:'';
 const backgroundManifest=Object.freeze(Object.fromEntries(ids.map(id=>[id,'assets/backgrounds/cosmic/'+id+'.png'])));

 function region(value){
  if(typeof value==='object'&&value){
   if(Object.hasOwn(entries,value.id))return value;
   if(Object.hasOwn(entries,value.region))return authored().find(r=>r.id===value.region)||{id:value.region};
  }
  if(typeof value==='string'&&Object.hasOwn(entries,value))return authored().find(r=>r.id===value)||{id:value};
  if(Number.isInteger(value)&&value>=251&&value<=350){const id=ids[Math.floor((value-251)/10)];return authored().find(r=>r.id===id)||{id};}
  return null;
 }
 function dimensions(image){const width=image&&(image.naturalWidth||image.width),height=image&&(image.naturalHeight||image.height);return width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)?{width,height}:null;}
 function setBackground(image,value,metadata={}){
  const r=region(value);if(!r||!dimensions(image))return false;
  Object.assign(entries[r.id],{image,ready:true,failed:false,floor:clamp(finite(metadata.floor,walkingLines[r.id]),.4,.94)});return true;
 }
 function load(id){
  if(typeof root.Image!=='function')return Promise.resolve(false);
  return new Promise(resolve=>{const image=new root.Image();image.decoding='async';
   image.onload=()=>resolve(setBackground(image,id));image.onerror=()=>{entries[id].failed=true;resolve(false);};
   image.src=base+backgroundManifest[id]+version;
  });
 }
 const allArtReady=Promise.all(ids.map(load));
 function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
 function poly(c,points,fill,stroke,width=1){path(c,points);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function ellipse(c,x,y,rx,ry,fill,stroke,width=1,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rotation,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function gradient(c,top,bottom){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);rect(c,0,0,W,H,g);}
 function glow(c,x,y,r,color,alpha=.3){c.save();c.globalAlpha*=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');ellipse(c,x,y,r,r,g);c.restore();}
 function starField(c,seed=1){
  for(let i=0;i<54;i++){const x=(i*137+seed*73)%W,y=18+(i*71+seed*29)%305,bright=i%7===0;c.globalAlpha=bright?.63:.28;
   rect(c,x,y,bright?2:1,bright?2:1,'#e2edf5');if(bright)line(c,[[x-2,y+.6],[x+4,y+.6]],'#bed2e1',.5);
  }c.globalAlpha=1;
 }
 function ridge(c,baseY,height,color,seed=1){const points=[[-12,F]];for(let i=0;i<=16;i++)points.push([i*62-12,baseY-height*(.3+Math.sin(i*1.73+seed)*.22+Math.cos(i*.59+seed)*.28)]);points.push([W+20,F]);poly(c,points,color);}
 function boulder(c,x,y,w,h,fill,light){poly(c,[[x-w*.5,y],[x-w*.43,y-h*.61],[x-w*.13,y-h],[x+w*.29,y-h*.83],[x+w*.51,y-h*.32],[x+w*.38,y]],fill,'#17233366');poly(c,[[x-w*.43,y-h*.61],[x-w*.13,y-h],[x+w*.29,y-h*.83],[x+w*.1,y-h*.39]],light);}
 function crater(c,x,y,rx,ry,color,light){ellipse(c,x,y,rx,ry,color,light,1.8);c.beginPath();c.ellipse(x,y,rx*.74,ry*.64,0,Math.PI,TAU);c.strokeStyle='#141b2a99';c.lineWidth=2;c.stroke();}
 function rockGround(c,id){
  const p=palettes[id];rect(c,0,F,W,H-F,p.rock);rect(c,0,F,W,4,p.edge);
  for(let i=0;i<17;i++){const x=i*62-18,y=F+4+(i%3)*2;poly(c,[[x,y],[x+35,y-2],[x+60,y+8],[x+49,y+42],[x+6,y+37]],i%3?p.rock:p.light,'#101a2866',1.4);line(c,[[x+5,y+11],[x+21,y+17],[x+26,y+31]],'#17223166');}
  for(let i=0;i<28;i++){const x=(i*139+21)%W,y=F+49+(i*17)%43;poly(c,[[x,y],[x+5,y-2],[x+11,y],[x+7,y+4]],i%3?p.light:p.edge);}
 }
 function platform(c,id){
  const p=palettes[id];
  // The continuous engineered deck is the collision floor. Distant floating
  // islets and gas cloud shapes remain decoration outside the playable plane.
  rect(c,0,F,W,7,p.edge);rect(c,0,F+7,W,20,p.rock);rect(c,0,F+28,W,8,'#172338');
  for(let i=0;i<16;i++){const x=i*64;poly(c,[[x+2,F+7],[x+59,F+7],[x+47,F+23],[x+13,F+23]],i%2?p.light:p.rock,'#1a273b',1.1);rect(c,x+17,F+10,28,2,p.glow);}
  for(let i=0;i<7;i++){const x=i*160+20;poly(c,[[x,F+35],[x+78,F+35],[x+59,F+58],[x+32,F+64]],'#29344c','#566072',1.2);rect(c,x+33,F+37,15,13,p.glow);}
  const under=c.createLinearGradient(0,F+35,0,H);under.addColorStop(0,'#08152900');under.addColorStop(1,'#040b20cc');rect(c,0,F+35,W,H-F-35,under);
 }
 function planet(c,x,y,r,top,bottom,bands=0,tilt=0){
  c.save();c.translate(x,y);c.rotate(tilt);c.beginPath();c.arc(0,0,r,0,TAU);c.clip();
  const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,top);g.addColorStop(1,bottom);rect(c,-r,-r,r*2,r*2,g);
  for(let i=0;i<bands;i++){const yy=-r+i*r*2/bands;c.globalAlpha=i%2?.16:.08;rect(c,-r,yy,r*2,r/bands*.8,i%2?'#fff4c9':'#08172e');}c.globalAlpha=1;
  const night=c.createLinearGradient(-r,0,r,0);night.addColorStop(0,'#00000000');night.addColorStop(.6,'#020b1900');night.addColorStop(1,'#020b19ad');rect(c,-r,-r,r*2,r*2,night);c.restore();
  ellipse(c,x,y,r,r,null,'#d6edf13d',1);
 }
 function ringPlanet(c,x,y,r,tilt){
  c.save();c.translate(x,y);c.rotate(tilt);
  for(let i=0;i<8;i++)ellipse(c,0,0,r*(1.32+i*.072),r*(.27+i*.018),null,i%2?'#c5bda46e':'#8e9bb15c',2.4);
  c.restore();planet(c,x,y,r,'#d1c29f','#686577',10,tilt);
  c.save();c.translate(x,y);c.rotate(tilt);for(let i=0;i<8;i++){c.beginPath();c.ellipse(0,0,r*(1.32+i*.072),r*(.27+i*.018),0,0,Math.PI);c.strokeStyle=i%2?'#d7d3bc9c':'#9cabc378';c.lineWidth=2.4;c.stroke();}c.restore();
 }
 function ice(c,x,y,s,color='#76a7bf'){poly(c,[[x-15*s,y],[x-18*s,y-19*s],[x-7*s,y-54*s],[x+3*s,y-27*s],[x+13*s,y-64*s],[x+24*s,y-13*s],[x+18*s,y]],color,'#d6f4f1',1.1);line(c,[[x-7*s,y-51*s],[x-3*s,y-10*s],[x+12*s,y-62*s],[x+16*s,y-7*s]],'#ddffffa3',1);}
 function floatingIce(c,seed){for(let i=0;i<6;i++){const x=55+i*175,y=345+(i%3)*19;boulder(c,x,y,59+(i%2)*19,18,'#526b84','#b0d9e0');ice(c,x+5,y-12,.32+i%2*.12);}}
 function swirl(c,x,y,rx,ry,color,t=0,turns=3){
  for(let arm=0;arm<3;arm++){c.beginPath();for(let i=0;i<=58;i++){const q=i/58,a=arm*TAU/3+q*TAU*turns+t*.03,r=1-q*.9,px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r;i?c.lineTo(px,py):c.moveTo(px,py);}c.strokeStyle=color;c.lineWidth=arm%2?1.1:2;c.stroke();}
 }
 function fallback(c,id){
  const p=palettes[id];gradient(c,...p.sky);if(!['venus','sun'].includes(id))starField(c,ids.indexOf(id)+1);
  if(id==='mercury'){
   glow(c,786,108,142,'#ffb665',.45);planet(c,786,108,66,'#ffedb0','#f49a59');
   ridge(c,290,125,'#3c3744',4);ridge(c,362,84,'#51515b',2);
   const shade=c.createLinearGradient(0,0,W,0);shade.addColorStop(0,'#b86b3d5e');shade.addColorStop(.5,'#1d243000');shade.addColorStop(1,'#14305b70');rect(c,0,210,W,F-210,shade);
   for(let i=0;i<8;i++)crater(c,60+i*132,393+(i%2)*20,42+(i%3)*9,9+(i%2)*4,'#282d3c','#85867d');rockGround(c,id);
  }else if(id==='venus'){
   for(let i=0;i<7;i++){const y=45+i*40;poly(c,[[-30,y+15],[120,y-11],[310,y+10],[475,y-7],[680,y+9],[990,y-17],[990,y+35],[-30,y+43]],i%2?'#a3a06750':'#dbc57430');}
   ridge(c,302,130,'#6d6044',4);ridge(c,374,92,'#817345',1);
   for(let i=0;i<6;i++){const x=50+i*182,y=423;poly(c,[[x-20,y],[x-25,y-48],[x-8,y-91],[x+8,y-58],[x+17,y-80],[x+29,y]],'#adab57','#d0c675',1.3);line(c,[[x-7,y-81],[x-4,y-14],[x+16,y-65],[x+19,y-9]],'#e5d981',1.4);}rockGround(c,id);
  }else if(id==='mars'){
   planet(c,171,88,18,'#b9a59b','#63515e');
   // Olympus is broad and shallow rather than a terrestrial pointed peak.
   poly(c,[[115,347],[290,307],[386,257],[479,224],[550,198],[614,200],[670,223],[753,255],[893,319],[990,347]],'#7b4b43');
   poly(c,[[466,228],[550,198],[614,200],[668,223],[602,215],[542,216]],'#bd8b6c');ridge(c,384,55,'#9a5c45',4);
   for(let i=0;i<7;i++){const x=12+i*155;boulder(c,x,430,54+(i%2)*20,24+(i%3)*11,'#7f4d3f','#b07859');}rockGround(c,id);
  }else if(id==='jupiter'){
   for(let i=0;i<11;i++){const y=15+i*36;poly(c,[[-20,y],[160,y-13],[360,y+4],[620,y-6],[980,y+12],[980,y+38],[720,y+23],[440,y+34],[100,y+20],[-20,y+35]],['#baad8c50','#473b4759','#d8c6a940','#85675966'][i%4]);}
   ellipse(c,687,180,112,42,'#9f5f4c','#d5b39266',2);ellipse(c,688,180,83,27,'#a56d55');swirl(c,687,180,102,36,'#d5a27b99');platform(c,id);
  }else if(id==='saturn'){
   ringPlanet(c,697,145,107,-.29);floatingIce(c,2);platform(c,id);
  }else if(id==='uranus'){
   // A background view of the tilted planet, not a claim of a solid surface.
   planet(c,756,116,82,'#b2dfdf','#438ba5',7,Math.PI*98/180);
   c.save();c.translate(756,116);c.rotate(Math.PI*98/180);for(let i=0;i<3;i++)ellipse(c,0,0,110+i*5,21+i*1.5,null,'#b3e8e050',1);c.restore();
   ridge(c,332,115,'#315d78',2);ridge(c,395,95,'#629fb1',5);
   for(let i=0;i<7;i++)ice(c,26+i*161,432,.5+(i%3)*.24,['#4e8ba5','#76b0c0','#396d8c'][i%3]);rockGround(c,id);
  }else if(id==='neptune'){
   planet(c,778,110,97,'#3c84bf','#13306b',9,-.1);ellipse(c,614,244,94,34,'#0b2459');swirl(c,614,244,94,33,'#809de080');
   for(let i=0;i<5;i++)poly(c,[[-20,100+i*55],[215,62+i*59],[425,110+i*47],[675,70+i*59],[990,105+i*52],[990,129+i*52],[675,93+i*59],[425,129+i*47],[215,82+i*59],[-20,123+i*55]],'#3e73b92b');platform(c,id);
  }else if(id==='moon'){
   planet(c,754,108,71,'#76c4dc','#234c80');c.save();c.beginPath();c.arc(754,108,70,0,TAU);c.clip();poly(c,[[714,65],[738,62],[741,78],[766,84],[758,103],[736,108],[727,94],[707,87]],'#87a88b');poly(c,[[764,126],[783,119],[797,132],[795,151],[779,159],[766,143]],'#a3ad8d');line(c,[[704,84],[747,91],[775,83],[805,98]],'#e2eddf80',4);c.restore();
   ridge(c,332,89,'#3b4455',1);ridge(c,391,54,'#737989',4);
   for(let i=0;i<7;i++)crater(c,42+i*151,405+(i%2)*13,34+(i%3)*9,8+(i%2)*3,'#535a6b','#a3a7ad');
   rect(c,123,346,87,34,'#747e88');poly(c,[[115,348],[132,334],[202,334],[216,348]],'#a2a7a8');rect(c,143,357,22,13,'#263a51');line(c,[[184,335],[184,306],[211,291]],'#a0a9b1',2);ellipse(c,211,292,15,6,'#8d99a5','#d5d9d9',1,-.45);rockGround(c,id);
  }else if(id==='sun'){
   glow(c,734,115,318,'#ffdf8b',.64);planet(c,734,115,222,'#ffdc7e','#df632c',0);
   for(let i=0;i<17;i++){const x=(i*173)%W,y=185+(i*43)%235;poly(c,[[x-35,y+14],[x-14,y-4],[x+8,y-11],[x+38,y+8],[x+14,y+22]],i%2?'#ffe09c38':'#7b292b40');}
   platform(c,id);
  }else{
   c.save();c.translate(697,165);c.rotate(-.22);for(let i=0;i<14;i++)ellipse(c,0,0,150+i*5,31+i*2.3,null,['#e1ba815c','#ac83d178','#d8cbab66'][i%3],2.2);c.restore();
   glow(c,697,165,123,'#b98cf0',.24);ellipse(c,697,165,78,78,'#030817','#9c91c48c',2);
   c.beginPath();c.ellipse(697,164,94,129,-.17,Math.PI*1.02,Math.PI*2.06);c.strokeStyle='#dbb8ed99';c.lineWidth=5;c.stroke();
   for(let i=0;i<8;i++){const x=38+i*131,y=313+(i%3)*27;boulder(c,x,y,25+i%3*11,18+(i%2)*9,'#4b4660','#9692a5');}platform(c,id);
  }
 }
 function newCanvas(){try{const value=root.document?.createElement?root.document.createElement('canvas'):typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(W,H):null;if(!value)return null;value.width=W;value.height=H;return value;}catch{return null;}}
 function fallbackPlate(id){
  if(fallbackPlates.has(id))return fallbackPlates.get(id);
  const surface=newCanvas(),c=surface?.getContext?.('2d');if(!c)return null;
  c.save();fallback(c,id);c.restore();fallbackPlates.set(id,surface);return surface;
 }
 function imagePlate(c,entry,t){
  const size=dimensions(entry.image);if(!size)return false;const sourceFloor=size.height*entry.floor,scale=Math.max(W/size.width,F/sourceFloor)*1.025,width=size.width*scale,x=(W-width)/2+Math.sin(t*.075)*3,y=F-sourceFloor*scale;
  c.save();c.beginPath();c.rect(0,0,W,F);c.clip();c.drawImage(entry.image,0,0,size.width,sourceFloor,x,y,width,sourceFloor*scale);c.restore();
  c.save();c.beginPath();c.rect(0,F,W,H-F);c.clip();c.drawImage(entry.image,0,sourceFloor,size.width,size.height-sourceFloor,x,F,width,Math.max(H-F,(size.height-sourceFloor)*scale));c.restore();return true;
 }
 function wind(c,t,color,rows=5,speed=8){
  for(let i=0;i<rows;i++){const x=((i*193+t*speed)%1100+1100)%1100-90,y=100+(i*63)%285;c.beginPath();c.moveTo(x-80,y);c.bezierCurveTo(x-20,y-12,x+90,y+9,x+160,y-4);c.strokeStyle=color;c.lineWidth=1+i%2*.6;c.stroke();}
 }
 function aurora(c,t,color){
  for(let band=0;band<3;band++){const points=[];for(let i=0;i<=24;i++){const x=i*40,y=78+band*21+Math.sin(i*.42+t*.09+band*.8)*21;points.push([x,y]);}for(let i=24;i>=0;i--)points.push([i*40,132+band*18+Math.sin(i*.42+t*.09+band*.8)*17]);poly(c,points,color);}
 }
 function plasmaArc(c,t){
  for(let i=0;i<3;i++){const x=75+i*330,height=150+i%2*55+sine(t*.3+i)*4;c.beginPath();c.moveTo(x-95,F-13);c.bezierCurveTo(x-100,F-height,x+102,F-height-20,x+93,F-15);c.strokeStyle='#ffb4652e';c.lineWidth=14;c.stroke();c.strokeStyle='#ffe5a957';c.lineWidth=2;c.stroke();}
 }
 const sine=Math.sin;
 function ambience(c,id,t,loaded){
  if(id==='mercury'){
   c.save();c.globalAlpha=.1+.025*Math.sin(t*.7);const edge=c.createLinearGradient(0,0,W,0);edge.addColorStop(0,'#edb57700');edge.addColorStop(1,'#ffbd6e');rect(c,0,55,W,F-55,edge);c.restore();wind(c,t,'#c8b2a111',3,3);
  }else if(id==='venus'){
   wind(c,t,'#e1cf9130',7,7);for(let i=0;i<4;i++){const x=105+i*247,y=F-12,q=(t*.04+i*.23)%1;c.save();c.globalAlpha=(1-q)*.11;ellipse(c,x+Math.sin(t*.16+i)*9,y-q*120,19+q*24,7+q*18,'#e3ce79');c.restore();}
  }else if(id==='mars')wind(c,t,'#e7b08324',6,16);
  else if(id==='jupiter'){
   if(!loaded)swirl(c,687,180,101,35,'#d8ab7e66',t);
   wind(c,t,'#c3d7aa24',6,10);const pulse=.16+.04*Math.sin(t*.9);glow(c,455,F+12,150,'#b4f2ce',pulse);
  }else if(id==='saturn'){
   for(let i=0;i<9;i++){const x=(((i*127+t*2.4)%1040)+1040)%1040-40,y=60+(i*67)%300,dy=Math.sin(t*.25+i)*2;c.save();c.translate(x,y+dy);c.rotate(i*.8+t*.018);poly(c,[[-3,-6],[5,-3],[7,4],[-2,5],[-6,0]],i%2?'#d2dfe48c':'#b3bacb99');c.restore();}
  }else if(id==='uranus'){aurora(c,t,'#b4efda17');wind(c,t,'#d1f0ee22',4,4);}
  else if(id==='neptune'){wind(c,t,'#b1b6e431',8,20);if(!loaded)swirl(c,614,244,93,32,'#8d9edb56',t);}
  else if(id==='moon'){
   // Vacuum has no dust haze or moving cloud layer. A restrained sunlight rim
   // is sufficient ambience while the regolith and stars remain still.
   line(c,[[0,F+1],[W,F+1]],'#c4cde344',1);
  }else if(id==='sun'){
   plasmaArc(c,t);for(let i=0;i<15;i++){const q=((t*.13+i*.071)%1+1)%1,x=30+(i*137)%900,y=F-q*250;ellipse(c,x+Math.sin(q*4+i)*12,y,1+(1-q)*1.5,2+(1-q)*2,'#ffd78f59');}
   c.save();c.globalAlpha=.1+.02*Math.sin(t*.4);ellipse(c,W/2,F-10,510,115,'#b5e9f31a','#d9f1e559',1.5);c.restore();
  }else{
   c.save();c.translate(697,165);c.rotate(-.22);for(let i=0;i<3;i++){const a=t*.08+i*TAU/3;c.beginPath();c.ellipse(0,0,170+i*11,45+i*4,0,a,a+.8);c.strokeStyle='#e2c2f46b';c.lineWidth=1.3;c.stroke();}c.restore();
   for(let i=0;i<6;i++){const y=35+i*47;c.beginPath();c.moveTo(880,y);c.quadraticCurveTo(748,y+23,806,y+48);c.strokeStyle='#a9b6df22';c.lineWidth=1;c.stroke();}
  }
 }
 function drawBackground(c,value,time=0,options={}){
  const r=region(value);if(!r||typeof c?.save!=='function')return false;
  const moving=options.effects!==false&&!options.reducedMotion,t=moving?finite(time):0,id=r.id,entry=entries[id];
  c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
  const loaded=entry.ready&&imagePlate(c,entry,t);
  if(!loaded){const plate=fallbackPlate(id);if(plate)c.drawImage(plate,0,0,W,H);else fallback(c,id);}
  if(loaded&&['jupiter','saturn','neptune','sun','blackHole'].includes(id))platform(c,id);
  ambience(c,id,t,loaded);
  c.restore();return true;
 }
 function getState(){return Object.fromEntries(ids.map(id=>[id,{ready:entries[id].ready,failed:entries[id].failed,floor:entries[id].floor,path:backgroundManifest[id]}]));}
 MM.CosmicScenery={drawBackground,allArtReady,backgroundManifest,setBackground,getState};
})(typeof window!=='undefined'?window:globalThis);
