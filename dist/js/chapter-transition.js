/* Chapter films: deterministic paint-only scenery. Gameplay, oxygen, inventory
 * and persistence stay owned by Game while the public timeline is running. */
(function(root){
 'use strict';
 const MM=root.MM=root.MM||{},W=960,H=540,TAU=Math.PI*2;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const kinds=new Map([[50,'forest'],[100,'cave'],[150,'whirlpool'],[200,'ending'],['forest','forest'],['cave','cave'],['whirlpool','whirlpool'],['ending','ending']]);
 const backgroundManifest=Object.freeze({
  forest:'assets/backgrounds/transitions/forest-passage.png',cave:'assets/backgrounds/transitions/cave-passage.png',
  whirlpool:'assets/backgrounds/transitions/whirlpool-passage.png',shore:'assets/backgrounds/transitions/shore-return.png'
 });
 const art=Object.fromEntries(Object.keys(backgroundManifest).map(key=>[key,{image:null,ready:false,failed:false}]));
 const endingArt={deep:{image:null,ready:false},kraken:{image:null,ready:false}};
 // Native frame copies stay outside the game/save graph. Allocate only at the
 // two scene boundaries; ordinary frames just composite the retained bitmap.
 const entryFrames=new WeakMap(),landingFrames=new WeakMap(),landingDuration=.5;
 function copyCanvas(source){
  const width=source?.width,height=source?.height;
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)return null;
  try{
   const frame=root.document?.createElement?root.document.createElement('canvas'):typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(width,height):null;
   if(!frame)return null;frame.width=width;frame.height=height;
   const ctx=frame.getContext?.('2d');if(typeof ctx?.drawImage!=='function')return null;
   ctx.drawImage(source,0,0);return frame;
  }catch{return null;}
 }
 function clear(g){entryFrames.delete(g);landingFrames.delete(g);}
 function validLanding(g,state){return !!state&&!g.cinematic&&g.level?.id===state.level&&(g.screen==='playing'||g.screen==='paused');}
 function updateLanding(g,dt){
  const state=landingFrames.get(g);if(!state)return false;
  if(!validLanding(g,state)){landingFrames.delete(g);return false;}
  state.time+=Math.max(0,Number.isFinite(dt)?dt:0);
  if(state.time+1e-8>=landingDuration){landingFrames.delete(g);return false;}return true;
 }
 function drawLanding(c,g){
  const state=landingFrames.get(g);if(!validLanding(g,state)||state.time>=landingDuration)return false;
  c.save();c.globalAlpha*=1-ease(state.time/landingDuration);c.drawImage(state.frame,0,0,W,H);c.restore();return true;
 }
 const script=typeof document!=='undefined'?document.currentScript?.src:null;
 const rootURL=script&&typeof URL==='function'?new URL('../',script).href:'';
 const version=script&&typeof URL==='function'?new URL(script).search:'';
 function setBackground(image,key='forest'){
  if(!Object.hasOwn(art,key))return false;
  const width=image&&(image.naturalWidth||image.width),height=image&&(image.naturalHeight||image.height);
  const ready=Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0;
  Object.assign(art[key],{image,ready,failed:false});return ready;
 }
 function getBackgroundState(){return Object.fromEntries(Object.entries(art).map(([key,v])=>[key,{ready:v.ready,failed:v.failed,path:backgroundManifest[key]}]));}
 function load(path,entry,done){
  if(typeof root.Image!=='function')return Promise.resolve(false);
  return new Promise(resolve=>{const im=new root.Image();im.decoding='async';im.onload=()=>{entry.image=im;entry.ready=true;done?.(im);resolve(true);};im.onerror=()=>{entry.failed=true;resolve(false);};im.src=rootURL+path+version;});
 }
 const allArtReady=Promise.all(Object.entries(backgroundManifest).map(([key,path])=>load(path,art[key])).concat([
  load('assets/backgrounds/underwater/deep-chasm.png',endingArt.deep),load('assets/sprites/underwater/kraken.png',endingArt.kraken)
 ]));
 function skipButton(g,hidden){const button=g.ui?.['cinematic-skip'];if(button){button.hidden=hidden;if(!hidden)button.textContent='Bỏ qua ›';}}
 function finish(g,skipped=false){
  const s=g.cinematic;if(!s||s.finished)return false;
  const from=g.level?.id,expected={forest:50,cave:100,whirlpool:150}[s.kind];
  const frame=!skipped&&from===expected?copyCanvas(g.canvas):null;
  s.finished=true;clear(g);g.cinematic=null;g.screen=s.previousScreen;g.lastTime=0;skipButton(g,true);s.done?.(g);
  // Game.start clears old visual records inside the callback. Only its actual
  // adjacent destination receives this last film frame after the reset.
  if(frame&&g.screen==='playing'&&g.level?.id===from+1)landingFrames.set(g,{frame,level:g.level.id,time:0});
  return true;
 }
 function begin(g,kind,done){
  const normalized=kinds.get(kind);if(!normalized||g.cinematic)return false;
  clear(g);const frame=copyCanvas(g.canvas);if(frame)entryFrames.set(g,frame);
  const reduced=!!g.settings?.reducedMotion,duration=reduced?1.2:normalized==='ending'?11:5;
  g.cinematic={kind:normalized,time:0,duration,done:typeof done==='function'?done:null,previousScreen:g.screen,reducedMotion:reduced,finished:false};
  g.clearInputs?.();g.screen='cinematic';g.lastTime=0;
  for(const id of ['result-overlay','home-overlay','stage-banner','toast'])if(g.ui?.[id])g.ui[id].hidden=true;
  skipButton(g,false);return true;
 }
 function update(g,dt){const s=g.cinematic;if(!s||g.screen!=='cinematic')return false;s.time=Math.min(s.duration,s.time+Math.max(0,Number.isFinite(dt)?dt:0));if(s.time+1e-8>=s.duration)finish(g);return true;}
 function skip(g){return finish(g,true);}

 /* World positions before the camera. Continuous positions, scale and heading
  * across each shot avoid the old duplicated swimmer/walker crossfade. */
 function sampleShot(kind,progress,reduced=false){
  kind=kinds.get(kind);if(!kind)return null;const p=clamp(Number.isFinite(progress)?progress:0),q=ease(p);
  const a={x:0,y:0,scale:1,tilt:0,alpha:1,swim:false,vx:105,phase:kind,camera:{zoom:1,x:0,y:0}};
  if(kind==='forest'){
   Object.assign(a,{x:lerp(174,770,q),y:lerp(443,401,q*q)+Math.sin(q*Math.PI)*20,scale:lerp(1.34,.87,q),vx:100*(1-ease((p-.91)/.09)),phase:'walk'});
   a.camera={zoom:1.025+.065*q,x:-10*q,y:-3*q};
  }else if(kind==='cave'){
   Object.assign(a,{x:lerp(170,752,q),y:430,scale:lerp(1.35,.9,q),vx:108,alpha:1-ease((p-.91)/.09),phase:p<.82?'approach':'entrance'});
   a.camera={zoom:1.025+.08*q,x:-15*q,y:-3*q};
  }else if(kind==='whirlpool'){
   if(p<.2){const u=ease(p/.2);Object.assign(a,{x:lerp(144,314,u),y:239,scale:1.27,vx:100,phase:'ledge'});}
   else if(p<.58){const u=(p-.2)/.38;Object.assign(a,{x:lerp(314,650,ease(u)),y:239-Math.sin(u*Math.PI)*126+91*u,scale:lerp(1.27,.94,u),tilt:Math.sin(u*Math.PI)*.19,vx:0,phase:'jump'});}
   else if(p<.85){const u=(p-.58)/.27,r=48*Math.sin(Math.PI*u)*(1-u);Object.assign(a,{x:650+Math.sin(u*TAU*1.1)*r,y:330+u*65,scale:lerp(.94,.29,ease(u)),tilt:.85*ease(u),vx:0,swim:true,phase:'descent'});}
   else{const u=ease((p-.85)/.15);Object.assign(a,{x:650,y:lerp(395,436,u),scale:lerp(.29,.62,u),tilt:lerp(.85,.38,u),vx:40,swim:true,phase:'submerged'});}
   a.camera={zoom:1.025+.055*q,x:-7*q,y:-3*q};
  }else{
   const time=p*11;
   if(time<2.8){const u=ease(time/2.8);Object.assign(a,{x:lerp(365,382,u),y:lerp(414,398,u),scale:1.07,tilt:-.2,swim:true,vx:30,phase:'release'});}
   else if(time<6.4){const u=ease((time-2.8)/3.6);Object.assign(a,{x:lerp(382,460,u),y:lerp(398,319,u),scale:lerp(1.07,.96,u),tilt:lerp(-.2,-.65,u),swim:true,vx:75,phase:'ascent'});}
   else if(time<8.25){const u=ease((time-6.4)/1.85);Object.assign(a,{x:lerp(460,515,u),y:lerp(319,425,u),scale:lerp(.96,1.12,u),tilt:lerp(-.65,0,u),swim:true,vx:42,phase:'surface'});}
   else{const u=ease((time-8.25)/2.75);Object.assign(a,{x:lerp(515,670,u),y:lerp(425,460,u),scale:lerp(1.12,1.32,u),vx:85*(1-ease((time-10.55)/.45)),phase:'shore'});}
   a.camera={zoom:1.025+.025*q,x:-4*q,y:-3*q};
  }
  if(reduced){a.camera={zoom:1,x:0,y:0};a.vx=0;a.tilt=0;}return a;
 }
 function rect(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}
 function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
 function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function glow(c,x,y,r,color,alpha=1,stretch=1){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(stretch,1);const gr=c.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,color);gr.addColorStop(1,'#00000000');rect(c,-r,-r,r*2,r*2,gr);c.restore();
 }
 function cover(c,key,alpha=1){const entry=art[key]||endingArt[key];if(!entry?.ready)return false;const im=entry.image,iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,z=Math.max(W/iw,H/ih),w=iw*z,h=ih*z;c.save();c.globalAlpha*=alpha;c.drawImage(im,(W-w)/2,(H-h)/2,w,h);c.restore();return true;}
 function backdrop(c,top,bottom){const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,top);gr.addColorStop(1,bottom);rect(c,0,0,W,H,gr);}
 function camera(c,a){c.translate(W*.5+a.camera.x,H*.58+a.camera.y);c.scale(a.camera.zoom,a.camera.zoom);c.translate(-W*.5,-H*.58);}
 function title(c,kicker,text,sub,alpha=1){
  const sans=MM.Typography?.sans||'"Noto Sans", Arial, sans-serif',serif=MM.Typography?.serif||'"Noto Serif", Georgia, serif';
  c.save();c.globalAlpha*=clamp(alpha);const scrim=c.createLinearGradient(0,0,0,164);scrim.addColorStop(0,'#020b12e8');scrim.addColorStop(.6,'#03101aa8');scrim.addColorStop(1,'#03101a00');rect(c,0,0,W,164,scrim);
  c.textAlign='center';c.textBaseline='alphabetic';if('letterSpacing'in c)c.letterSpacing='0px';if('fontKerning'in c)c.fontKerning='normal';
  c.fillStyle='#e1c991';c.font='600 11px '+sans;c.fillText(String(kicker).normalize('NFC'),W*.5,51);
  c.fillStyle='#fff1d7';c.font='700 29px '+serif;c.fillText(String(text).normalize('NFC'),W*.5,89);
  c.fillStyle='#dfebe5';c.font='400 13px '+sans;c.fillText(String(sub).normalize('NFC'),W*.5,116);c.restore();
 }

 /* Native player art remains intact, with combat items stowed. A clipping
  * silhouette removes only the outstretched gun pose; relaxed arms use the
  * original sleeves and skin. Scaling happens once in the canvas transform. */
 function hunter(c,g,a,t,torch=false){
  const animated=!g.settings?.reducedMotion,gait=animated&&a.vx?Math.sin(t*18)*Math.min(1,Math.abs(a.vx)/120):0;
  const actor={...g.player,x:0,y:438,w:38,h:54,dir:1,vx:a.vx,vy:0,swimming:a.swim,swimPhase:t*6,swimTilt:0,invulnerable:0,stunTime:0,petrifyTime:0,knockdownTime:0,burnTime:0,immortalTime:0,shieldTime:0,rollTime:0,rollProgress:0,shotTimer:0,weaponMode:'normal',merfolkTime:0};
  const paintGame={settings:g.settings,level:{id:101,underwater:a.swim},progression:{equipped:'gun'},rollSlash:null,weaponAttack:null};
  const film=g.cinematic,p=film?clamp(film.time/film.duration):0;
  const boundaryAlpha=entryFrames.has(g)&&film?.kind!=='ending'?ease((p-.12)/.08)*(1-ease((p-.88)/.12)):1;
  c.save();c.globalAlpha*=a.alpha*boundaryAlpha;c.translate(a.x,a.y);c.scale(a.scale,a.scale);c.translate(0,-29);c.rotate(a.tilt);c.translate(0,29);
  function arm(front){const side=front?1:-1,hx=torch&&front?28:side*(22+gait*3),hy=torch&&front?-27:-11+side*gait*3;
   line(c,[[side*15,-30],[side*20,-22],[hx,hy]],front?'#607c48':'#3f593d',7.5);line(c,[[side*16,-30],[side*21,-22],[hx,hy-1]],'#9aaa6b',1);ellipse(c,hx,hy,4.4,4.2,'#d8b47d','#16252b',1.2);
  }
  arm(false);
  if(MM.Renderer?.drawHunter){
   c.save();c.beginPath();c.rect(-25,-90,50,56);c.rect(-18,-34,36,21);c.rect(-24,-13,48,36);c.clip();c.translate(0,-438);MM.Renderer.drawHunter(c,actor,t,animated,paintGame);c.restore();
  }else{
   rect(c,-16,-32,32,24,'#577846');rect(c,-16,-53,32,26,'#d8b47d');rect(c,-22,-56,44,7,'#354b3c');rect(c,-12+gait*3,-12,8,13,'#203b36');rect(c,4-gait*3,-12,8,13,'#273d38');rect(c,-10,-42,5,5,'#fff1d7');rect(c,6,-42,5,5,'#fff1d7');
  }
  arm(true);if(torch)torchInHand(c,t,animated);c.restore();
 }
 function torchInHand(c,t,animated){
  const f=animated?Math.sin(t*17)*.8+Math.sin(t*29)*.45:0;
  line(c,[[27,-24],[35,-65]],'#201c1b',7);line(c,[[27,-24],[35,-65]],'#80553b',4);line(c,[[29,-30],[35,-61]],'#c89356',1);
  for(let i=0;i<4;i++)line(c,[[30+i*.6,-58-i*3],[39+i*.5,-56-i*3]],i%2?'#c5a36f':'#7b6654',2.1);
  c.save();c.globalCompositeOperation='screen';glow(c,36,-73,37,'#ff963d78',.75+f*.04);c.restore();
  c.beginPath();c.moveTo(29,-63);c.bezierCurveTo(23,-74,36,-82+f*2,33,-97-f*3);c.bezierCurveTo(48,-84,45,-76,44,-71);c.bezierCurveTo(46,-66,43,-62,37,-62);c.closePath();c.fillStyle='#eb6c2a';c.fill();
  c.beginPath();c.moveTo(32,-64);c.bezierCurveTo(29,-75,38,-77,38,-88-f*2);c.bezierCurveTo(47,-76,42,-67,40,-64);c.closePath();c.fillStyle='#ffd675';c.fill();
  c.beginPath();c.moveTo(35,-65);c.quadraticCurveTo(34,-74,39,-79);c.quadraticCurveTo(43,-69,39,-64);c.fillStyle='#fff2bd';c.fill();
  if(animated)for(let i=0;i<6;i++){const age=(t*.45+i*.17)%1,x=37+age*16+Math.sin(age*9+i)*4,y=-95-age*62;glow(c,x,y,4+age*8,'#bcb9b933',(1-age)*.36);if(i<3)ellipse(c,35+Math.sin(t*2+i)*10,-89-age*70,.7,.7,'#ffce8199');}
 }
 function shadow(c,a,opacity=.6){glow(c,a.x+3,a.y+4,25,'#020c12bb',opacity,1.8*a.scale);}
 function footsteps(c,a,t,reduced){
  if(reduced||a.vx<10)return;const step=(t*2.86)%1;
  for(let i=0;i<4;i++){const age=(step+i*.25)%1;ellipse(c,a.x-8-age*19-i*3,a.y-age*6,1.2+age*2,.7+age*.9,'rgba(183,162,124,'+(1-age)*.11+')');}
 }
 function motes(c,t,reduced,water=false,alpha=1,count=22){
  c.save();c.globalAlpha*=alpha;const drift=reduced?0:t;
  for(let i=0;i<count;i++){const x=(i*137+31+Math.sin(drift*.25+i*1.7)*10)%W,y=water?H-((i*71+drift*(8+i%4))%H):134+(i*83)%330+Math.sin(drift*.4+i)*5;
   if(water)ellipse(c,x,y,1+i%3*.45,1+i%3*.45,null,'#c6eaf03f',.8);else ellipse(c,x,y,.6+i%3*.36,.6+i%3*.36,'#d6d2b947');
  }c.restore();
 }
 function fog(c,y,t,reduced,color='#aac6b834',alpha=1){
  for(let i=0;i<3;i++){const x=90+i*370+(reduced?0:Math.sin(t*.19+i*1.6)*41);c.save();c.globalAlpha*=alpha;c.translate(x,y+i%2*25);c.scale(3.4,.31);glow(c,0,0,87,color,.7);c.restore();}
 }
 function shafts(c,t,reduced){
  c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++){const x=578+i*102+(reduced?0:Math.sin(t*.22+i)*5),gr=c.createLinearGradient(x,0,x-135,440);gr.addColorStop(0,'#a9d1cc22');gr.addColorStop(.75,'#a9d1cc09');gr.addColorStop(1,'#00000000');poly(c,[[x-10,0],[x+21,0],[x-78,449],[x-240,449]],gr);}c.restore();
 }
 function leaf(c,x,y,length,angle,color){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(length*.25,-length*.3,length*.8,-length*.24,length,0);c.bezierCurveTo(length*.7,length*.13,length*.18,length*.16,0,0);c.fillStyle=color;c.fill();c.restore();}
 function fern(c,x,y,size,t,reduced,color){
  c.save();c.translate(x,y);c.scale(size,size);c.rotate(reduced?0:Math.sin(t*.7+x*.01)*.035);
  for(let f=0;f<5;f++){const a=-Math.PI*.88+f*.31,dx=Math.cos(a)*83,dy=Math.sin(a)*83;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(dx*.25,dy*.82,dx,dy);c.strokeStyle=color;c.lineWidth=2;c.stroke();
   for(let j=1;j<7;j++){const q=j/7,xx=dx*q*q,yy=dy*(2*q-q*q),len=(1-q)*24+4;leaf(c,xx,yy,len,a-.8,color);leaf(c,xx,yy,len,a+.75,color);}
  }c.restore();
 }
 function forestFallback(c){
  backdrop(c,'#112c34','#213f35');
  for(let i=0;i<9;i++){const x=i*127-34,w=14+i%3*7;c.beginPath();c.moveTo(x-w,450);c.bezierCurveTo(x-3,299,x-w*1.3,154,x-12,0);c.lineTo(x+w+12,0);c.bezierCurveTo(x+w,177,x+3,330,x+w,450);c.fillStyle=i%2?'#173431':'#102c2c';c.fill();}
  rect(c,0,412,W,128,'#22372c');c.beginPath();c.moveTo(120,540);c.bezierCurveTo(393,448,451,424,740,407);c.bezierCurveTo(629,443,598,488,638,540);c.fillStyle='#6e71604d';c.fill();
 }
 function forest(c,g,s,p,t){
  const a=sampleShot('forest',p,s.reducedMotion);c.save();camera(c,a);if(!cover(c,'forest'))forestFallback(c);
  shafts(c,t,s.reducedMotion);fog(c,356,t,s.reducedMotion,'#9ac1ae29',.7);motes(c,t,s.reducedMotion,false,.6);
  footsteps(c,a,t,s.reducedMotion);shadow(c,a,.55);hunter(c,g,a,t);fog(c,455,t,s.reducedMotion,'#87bca229',.48);
  const slide=s.reducedMotion?0:p*17;fern(c,61-slide,550,1.1,t,s.reducedMotion,'#061b1d');fern(c,955+slide,550,1,t,s.reducedMotion,'#06191b');
  // Close leaves move farther than the background, making a restrained dolly.
  for(let i=0;i<8;i++)leaf(c,12+i*16-slide,34+i%3*12,43+i%2*12,.35+i*.09+(s.reducedMotion?0:Math.sin(t*.55+i)*.02),'#071c1e');
  c.restore();title(c,'CỐT TRUYỆN II · 51—100','Lời Nguyền Cổ Thú','Ánh đèn dẫn lối vào khu rừng chưa từng ngủ.');
 }
 function caveFallback(c){
  backdrop(c,'#0c1723','#28303a');poly(c,[[0,435],[248,417],[443,438],[710,425],[960,439],[960,540],[0,540]],'#323438');
  c.beginPath();c.moveTo(654,445);c.bezierCurveTo(650,337,621,240,700,201);c.bezierCurveTo(790,162,842,246,836,435);c.fillStyle='#050b13';c.fill();
 }
 function cave(c,g,s,p,t){
  const a=sampleShot('cave',p,s.reducedMotion),f=s.reducedMotion?1:1+Math.sin(t*17)*.035+Math.sin(t*29)*.019;
  c.save();camera(c,a);if(!cover(c,'cave'))caveFallback(c);
  const shade=c.createLinearGradient(0,0,W,0);shade.addColorStop(0,'#04101e36');shade.addColorStop(.5,'#040c1322');shade.addColorStop(1,'#0207106b');rect(c,0,0,W,H,shade);
  c.save();c.globalCompositeOperation='screen';glow(c,a.x+40*a.scale,a.y-74*a.scale,178*a.scale,'#df884d41',f,1.14);glow(c,a.x+32,a.y+3,79,'#e7984a42',.7,1.5);c.restore();
  fog(c,390,t,s.reducedMotion,'#9cacab16',.45);motes(c,t,s.reducedMotion,false,.65,23);footsteps(c,a,t,s.reducedMotion);shadow(c,a,.78);hunter(c,g,a,t,true);
  const offset=s.reducedMotion?0:p*23;
  c.beginPath();c.moveTo(-10,441);c.bezierCurveTo(75-offset,426,102-offset,477,137-offset,515);c.lineTo(215,540);c.lineTo(0,540);c.fillStyle='#071017';c.fill();
  c.beginPath();c.moveTo(960,478);c.bezierCurveTo(912+offset,462,917+offset,505,859+offset,540);c.lineTo(960,540);c.fillStyle='#080f17';c.fill();c.restore();
  title(c,'CỐT TRUYỆN III · 101—150','Vực Sâu Cổ Đại','Sau cánh cổng đá, những ký ức bị phong ấn thức giấc.');
 }
 function underwater(c,g,t,reduced,deep=false,rise=0){
  c.save();c.translate(0,rise);
  if(!cover(c,'deep')){
   const paintGame={...g,level:{...(g.level||{}),id:deep?181:151,underwater:true},endingOnLand:false,settings:{...g.settings,reducedMotion:reduced}};
   if(!MM.UnderwaterRenderer?.drawBackground?.(c,paintGame,t))backdrop(c,'#176a87','#041729');
  }c.restore();rect(c,0,0,W,H,deep?'#03182a44':'#135b7b20');
  if(rise>0){const top=c.createLinearGradient(0,0,0,rise+120);top.addColorStop(0,'#529ca9');top.addColorStop(1,'#07223500');rect(c,0,0,W,rise+120,top);}
  c.save();c.globalCompositeOperation='screen';const beam=c.createLinearGradient(470,0,405,H);beam.addColorStop(0,'#b5eced3b');beam.addColorStop(.7,'#88bebe0d');beam.addColorStop(1,'#88bebe00');poly(c,[[427,0],[550,0],[659,540],[260,540]],beam);c.restore();motes(c,t,reduced,true,.55,17);
 }
 /* Spiral streamlines join a deep shaded throat. Foam travels down the wall,
  * with a real front lip that occludes the swimmer after entry. */
 function vortex(c,t,reduced,alpha=1){
  const cx=650,cy=330,turn=reduced?.6:t*.9;c.save();c.globalAlpha*=alpha;
  const funnel=c.createRadialGradient(cx,cy+56,5,cx,cy,154);funnel.addColorStop(0,'#020d1bc9');funnel.addColorStop(.3,'#062c4380');funnel.addColorStop(.72,'#12516e1c');funnel.addColorStop(1,'#36a5bc00');ellipse(c,cx,cy+18,204,100,funnel);
  for(let b=0;b<4;b++){c.beginPath();for(let i=0;i<=108;i++){const q=i/108,a=turn+b*TAU/4+q*TAU*1.8,r=198*(1-q)+9,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.4+q*q*62;i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=b%2?'#88dce13d':'#4ca6c54d';c.lineWidth=b%2?1.8:3;c.lineCap='round';c.stroke();}
  for(let i=0;i<35;i++){const q=(i*.071+(reduced?0:t*.13))%1,a=i*2.399+turn+q*TAU,r=196*(1-q)+12,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.4+q*q*62;c.save();c.globalAlpha*=Math.sin(q*Math.PI)*.65;c.translate(x,y);c.rotate(-Math.cos(a)*.3);ellipse(c,0,0,2+(1-q)*3.4,.6+(1-q)*.65,'#d0f5f2');c.restore();}
  c.restore();
 }
 function splash(c,x,y,progress,alpha=1){
  const q=clamp(progress);if(q<=0||q>=1)return;c.save();c.globalAlpha*=Math.sin(Math.PI*q)*alpha;
  for(let i=0;i<13;i++){const a=Math.PI+i/12*Math.PI,vx=Math.cos(a)*(24+i%3*11),vy=Math.sin(a)*(40+i%4*12);ellipse(c,x+vx*q,y+vy*q+q*q*44,1.1+(1-q)*.8,2.1+(1-q)*1.4,'#d8ffffb2');}
  ellipse(c,x,y+2,10+q*43,2+q*8,null,'#d7fbfa99',1.7*(1-q));c.restore();
 }
 function whirlpool(c,g,s,p,t){
  const a=sampleShot('whirlpool',p,s.reducedMotion),submerge=ease((p-.78)/.2);
  c.save();camera(c,a);if(!cover(c,'whirlpool')){backdrop(c,'#223847','#154c61');poly(c,[[0,239],[130,230],[192,220],[340,239],[290,279],[0,347]],'#303d3e','#768582',1);}
  vortex(c,t,s.reducedMotion);if(p<.58)shadow(c,{...a,y:239},p<.2?.7:.2);
  if(submerge>0){c.save();c.globalAlpha=submerge;underwater(c,g,t,s.reducedMotion);c.restore();}
  hunter(c,g,a,t);if(!s.reducedMotion)splash(c,650,336,(p-.55)/.19,1-submerge);
  if(p>=.58&&submerge<1){c.save();c.globalAlpha=(1-submerge)*clamp((p-.58)/.08);c.beginPath();c.ellipse(650,350,90,38,0,.04,Math.PI*.96);c.strokeStyle='#b7ebe961';c.lineWidth=2;c.stroke();c.restore();}
  if(p>.78)motes(c,t,s.reducedMotion,true,submerge,19);c.restore();
  title(c,'CỐT TRUYỆN IV · 151—200','Hải Vực Quên Lãng','Dòng xoáy mở đường xuống những miền ký ức dưới biển.');
 }
 function stars(c,a,t,reduced,alpha=1){
  c.save();c.globalAlpha*=alpha;
  for(let i=0;i<3;i++){const ang=(reduced?.4:t*.6)+i*TAU/3,x=a.x+Math.cos(ang)*44*a.scale,y=a.y-30*a.scale+Math.sin(ang)*21*a.scale,pts=[];
   glow(c,x,y,26,'#d5ecd645',.55);for(let j=0;j<10;j++){const angle=-Math.PI/2+j*Math.PI/5,r=j%2?2.3*a.scale:5.3*a.scale;pts.push([x+Math.cos(angle)*r,y+Math.sin(angle)*r]);}poly(c,pts,'#f8e6b1','#d8c283',.7);
  }c.restore();
 }
 function shore(c,t,reduced){
  if(!cover(c,'shore')){backdrop(c,'#8dadaf','#ecd4ae');rect(c,0,285,W,255,'#3d8087');poly(c,[[0,490],[460,433],[960,370],[960,540],[0,540]],'#a39d7a');}
  c.save();c.globalCompositeOperation='screen';glow(c,758,196,166,'#fff3ce20',.45);c.restore();
  for(let row=0;row<4;row++){const shift=reduced?0:Math.sin(t*.65-row*.6)*7;c.beginPath();c.moveTo(55,445+row*5+shift);c.bezierCurveTo(287,430+row*5+shift,518,409+row*5+shift,950,325+row*6+shift);c.strokeStyle=row===0?'#e0efda38':'#b3d9d120';c.lineWidth=row===0?1.7:1;c.stroke();}
  motes(c,t,reduced,false,.22,13);
 }
 function waterOcclusion(c,a,t,reduced,alpha){
  if(alpha<=0)return;c.save();c.globalAlpha*=alpha;const y=a.y-12*a.scale,gr=c.createLinearGradient(0,y-3,0,y+19);gr.addColorStop(0,'#4e909a00');gr.addColorStop(.35,'#497e8594');gr.addColorStop(1,'#4d8e938c');ellipse(c,a.x,y+9,35*a.scale,13*a.scale,gr);
  c.beginPath();c.ellipse(a.x,y+2,39*a.scale,7*a.scale,0,.05,Math.PI*.94);c.strokeStyle='#d4ece19e';c.lineWidth=1.4;c.stroke();ellipse(c,a.x-9,y+13,51*a.scale,5,null,'#d2e6d459',.7);c.restore();
 }
 function fallingKraken(c,g,time,reduced){
  if(time>=3.6)return;const boss=g.endingBoss,q=ease(time/3.6),x=boss?.x||650,y=lerp(boss?.y||400,780,q),w=320,h=350;
  c.save();c.globalAlpha*=1-ease((time-1.5)/2.1);c.translate(x,y-h*.5);c.rotate(reduced?0:q*.14);
  if(endingArt.kraken.ready)c.drawImage(endingArt.kraken.image,-w*.5,-h*.5,w,h);
  else if(boss&&MM.UnderwaterRenderer?.drawEnemy){const actor={...boss,dead:false,retired:false,health:1,phase:'active',hit:0,krakenStone:false,krakenDying:false,krakenEcho:false,x:0,y:h*.5,vx:0,vy:30,krakenClock:0};MM.UnderwaterRenderer.drawEnemy(c,{...g,settings:{...g.settings,reducedMotion:reduced},time:0},actor,0);}
  c.restore();
 }
 function ending(c,g,s,p,t){
  const elapsed=p*11,a=sampleShot('ending',p,s.reducedMotion),shoreFade=ease((elapsed-5.8)/1.35);c.save();camera(c,a);
  underwater(c,g,t,s.reducedMotion,true,s.reducedMotion?0:ease((elapsed-2.8)/3.6)*105);fallingKraken(c,g,elapsed,s.reducedMotion);
  if(shoreFade>0){c.save();c.globalAlpha=shoreFade;shore(c,t,s.reducedMotion);c.restore();}
  if(elapsed>8.25){shadow(c,a,ease((elapsed-8.25)/1.4)*.65);footsteps(c,a,t,s.reducedMotion);}
  glow(c,a.x,a.y-30,100,'#c4e6d12a',1-shoreFade*.7);hunter(c,g,a,t);stars(c,a,t,s.reducedMotion,1-ease((elapsed-10.2)/.8)*.6);
  waterOcclusion(c,a,t,s.reducedMotion,ease((elapsed-6.1)/.65)*(1-ease((elapsed-8.25)/1.1)));
  if(elapsed>8.25&&elapsed<9.3&&!s.reducedMotion)splash(c,a.x-10,a.y,(elapsed-8.25)/1.05,.25);c.restore();
  if(elapsed<3.2)title(c,'HẢI VỰC QUÊN LÃNG','Đáy biển đã lặng yên.','Những hung thần cuối cùng chìm vào ký ức.',1-ease((elapsed-2.5)/.7));
  else if(elapsed<8.3)title(c,'HÀNH TRÌNH TRỞ VỀ','Theo ánh sao về phía mặt trời.','Không còn lời nguyền nào níu người giữ đèn.',ease((elapsed-3.2)/.7)*(1-ease((elapsed-7.6)/.7)));
  else title(c,'BIÊN NIÊN NGỌN ĐÈN','Bình minh đã trở lại.','Sau hai trăm đêm, đôi chân lại chạm đất.',ease((elapsed-8.3)/.9));
 }
 function draw(c,g){
  const s=g.cinematic;if(!s||g.screen!=='cinematic')return false;const p=clamp(s.time/s.duration),t=s.reducedMotion?0:s.time;
  c.save();c.beginPath();c.rect(0,0,W,H);c.clip();({forest,cave,whirlpool,ending}[s.kind])(c,g,s,p,t);
  const v=c.createLinearGradient(0,0,0,H);v.addColorStop(0,'#01071317');v.addColorStop(.58,'#01071300');v.addColorStop(1,'#01071373');rect(c,0,0,W,H,v);
  rect(c,0,0,W,15,'#02070dc2');rect(c,0,H-21,W,21,'#02070dc2');rect(c,29,H-12,W-58,1,'#d6dec92d');rect(c,29,H-12,(W-58)*p,1,'#e8d9b69c');
  const entry=entryFrames.get(g);
  if(entry&&p<.12){c.save();c.globalAlpha*=1-ease(p/.12);c.drawImage(entry,0,0,W,H);c.restore();}
  else if(!entry){const fade=Math.max(1-ease(p/.07),s.kind==='ending'?0:ease((p-.92)/.08));if(fade>0)rect(c,0,0,W,H,'rgba(3,12,20,'+fade+')');}
  c.restore();return true;
 }
 MM.ChapterTransition={begin,update,draw,skip,clear,updateLanding,drawLanding,allArtReady,backgroundManifest,setBackground,getBackgroundState,sampleShot};
})(typeof window!=='undefined'?window:globalThis);
