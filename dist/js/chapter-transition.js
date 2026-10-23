/* Brief chapter passages and the final ascent. All paint state is local;
 * gameplay, oxygen, inventories and persistence remain owned by Game. */
(function(root){'use strict';const MM=root.MM=root.MM||{},W=960,H=540,TAU=Math.PI*2;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const kinds={50:'forest',100:'cave',150:'whirlpool',200:'ending',forest:'forest',cave:'cave',whirlpool:'whirlpool',ending:'ending'};
 function skipButton(g,hidden){const button=g.ui?.['cinematic-skip'];if(button){button.hidden=hidden;if(!hidden)button.textContent='Bỏ qua ›';}}
 function finish(g){const s=g.cinematic;if(!s||s.finished)return false;s.finished=true;g.cinematic=null;g.screen=s.previousScreen;g.lastTime=0;skipButton(g,true);s.done?.(g);return true;}
 function begin(g,kind,done){
  const normalized=kinds[kind];if(!normalized||g.cinematic)return false;
  const reduced=!!g.settings?.reducedMotion,duration=reduced?1.2:normalized==='ending'?11:5;
  g.cinematic={kind:normalized,time:0,duration,done:typeof done==='function'?done:null,previousScreen:g.screen,reducedMotion:reduced,finished:false};
  g.clearInputs?.();g.screen='cinematic';g.lastTime=0;
  for(const id of ['result-overlay','home-overlay','stage-banner','toast'])if(g.ui?.[id])g.ui[id].hidden=true;
  skipButton(g,false);return true;
 }
 function update(g,dt){const s=g.cinematic;if(!s||g.screen!=='cinematic')return false;s.time=Math.min(s.duration,s.time+Math.max(0,Number.isFinite(dt)?dt:0));if(s.time+1e-8>=s.duration)finish(g);return true;}
 function skip(g){return finish(g);}
 function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function line(c,x0,y0,x1,y1,color,width=1){c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function ellipse(c,x,y,rx,ry,color,stroke,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function glow(c,x,y,r,color,alpha=1){c.save();c.globalAlpha*=alpha;const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,'#00000000');rect(c,x-r,y-r,r*2,r*2,gradient);c.restore();}
 function backdrop(c,top,bottom){const gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,top);gradient.addColorStop(1,bottom);rect(c,0,0,W,H,gradient);}
 function title(c,kicker,text,sub,alpha=1){c.save();c.globalAlpha*=alpha;c.textAlign='center';c.fillStyle='#c9b887';c.font='600 11px system-ui, sans-serif';c.fillText(kicker,W*.5,62);
  c.fillStyle='#f0e8cf';c.font='bold 29px Georgia, serif';c.fillText(text,W*.5,101);c.fillStyle='#b6c9c4';c.font='13px system-ui, sans-serif';c.fillText(sub,W*.5,128);c.restore();}
 function hunter(c,g,x,y,t,{swim=false,scale=1,vx=105,tilt=0,alpha=1}={}){
  const actor={...g.player,x,y,w:38*scale,h:54*scale,dir:1,vx,vy:0,swimming:swim,swimPhase:t*7,swimTilt:tilt,
   invulnerable:0,stunTime:0,petrifyTime:0,knockdownTime:0,burnTime:0,immortalTime:0,shieldTime:0,rollTime:0,shotTimer:0,weaponMode:'normal',merfolkTime:0};
  c.save();c.globalAlpha*=alpha;
  if(MM.Renderer?.drawHunter)MM.Renderer.drawHunter(c,actor,t,!g.settings?.reducedMotion,g);
  else{rect(c,x-14*scale,y-31*scale,28*scale,24*scale,'#536f42');rect(c,x-15*scale,y-53*scale,30*scale,24*scale,'#d4b57f');rect(c,x-21*scale,y-56*scale,42*scale,8*scale,'#3c5943');rect(c,x-13*scale,y-7*scale,9*scale,7*scale,'#182c2a');rect(c,x+5*scale,y-7*scale,9*scale,7*scale,'#182c2a');}
  c.restore();
 }
 function star(c,x,y,r,fill){const p=[];for(let i=0;i<10;i++){const a=-Math.PI*.5+i*Math.PI/5,d=i%2?r*.45:r;p.push([x+Math.cos(a)*d,y+Math.sin(a)*d]);}poly(c,p,fill,'#b4a261',.8);}
 function stars(c,x,y,t,alpha=1){c.save();c.globalAlpha*=alpha;for(let i=0;i<3;i++){const a=t*.65+i*TAU/3,px=x+Math.cos(a)*48,py=y-29+Math.sin(a)*23;glow(c,px,py,35,'#bfeee13d');star(c,px,py,7,'#f5de9b');}c.restore();}
 function tree(c,x,y,scale,color,detail){c.save();c.translate(x,y);c.scale(scale,scale);rect(c,-9,-94,18,94,'#182a2b');poly(c,[[-67,-68],[-34,-114],[-53,-111],[-13,-175],[0,-223],[16,-176],[52,-112],[34,-115],[68,-68]],color,detail,2);line(c,0,-181,0,-65,detail||'#304b42',1.5);c.restore();}
 function forest(c,g,s,p,t){
  backdrop(c,'#0b1b24','#173b36');glow(c,735,147,190,'#b1d9a61c');
  for(let layer=0;layer<3;layer++){const scale=.55+layer*.35,offset=s.reducedMotion?0:p*(35+layer*45);
   for(let i=0;i<8;i++){const x=(i*180+layer*70-offset+1200)%1200-120;tree(c,x,375+layer*32,scale,['#14312f','#1b4037','#17352d'][layer],layer===2?'#3d5840':null);}}
  poly(c,[[0,425],[170,412],[350,431],[610,415],[795,425],[960,411],[960,540],[0,540]],'#1a3027','#49664a',2);
  poly(c,[[0,468],[170,451],[340,474],[540,452],[760,473],[960,454],[960,540],[0,540]],'#10241f');
  for(let i=0;i<30;i++){const x=(i*97+(s.reducedMotion?0:t*9))%W,y=190+(i*73)%270;ellipse(c,x,y,1.5,1.5,'#bddea166');}
  const x=lerp(185,680,ease(p));glow(c,x+27,400,120,'#d2d99a12');hunter(c,g,x,428,t,{vx:s.reducedMotion?0:105});
  title(c,'CỐT TRUYỆN II · 51—100','Lời Nguyền Cổ Thú','Ánh đèn dẫn lối vào khu rừng chưa từng ngủ.');
 }
 function cave(c,g,s,p,t){
  backdrop(c,'#090d1a','#26203b');
  for(let i=0;i<9;i++){const x=i*127-(s.reducedMotion?0:p*50),base=370+i%3*22;poly(c,[[x-70,base],[x-52,95+i%2*65],[x+8,58+i%3*50],[x+45,base]],i%2?'#171b2b':'#202035','#303049',1);}
  poly(c,[[0,0],[960,0],[960,108],[835,83],[772,121],[698,76],[640,112],[570,68],[482,99],[390,71],[284,120],[177,80],[73,117],[0,89]],'#111421');
  poly(c,[[0,439],[190,421],[340,440],[500,421],[680,437],[820,424],[960,440],[960,540],[0,540]],'#1b1c2b','#4b435e',2);
  // The stone entrance has a real open centre rather than a flat plaque.
  poly(c,[[677,425],[677,219],[710,166],[807,139],[882,192],[905,425],[858,425],[853,217],[813,190],[754,202],[727,239],[727,425]],'#45415b','#70617a',2);
  for(let i=0;i<7;i++)line(c,681+i*31,202+(i%2)*9,700+i*28,227+(i%2)*10,'#181b2a',3);
  for(let i=0;i<10;i++){const x=40+i*104,y=434+(i%3)*19;poly(c,[[x-10,y],[x-7,y-32-i%2*18],[x+3,y-46],[x+13,y-8]],i%2?'#493a70':'#384561','#a184b344',1);}
  const x=lerp(180,713,ease(p)),flame=s.reducedMotion?0:Math.sin(t*12)*3;
  glow(c,x+34,381,145,'#eda34e44');hunter(c,g,x,430,t,{vx:s.reducedMotion?0:105});
  line(c,x+27,405,x+34,379,'#75553b',5);poly(c,[[x+26,382],[x+29,367-flame],[x+34,373],[x+37,359-flame],[x+43,375],[x+40,384]],'#e5a557','#ffe2a1',1);poly(c,[[x+31,382],[x+35,370],[x+39,382]],'#fff0bf');
  title(c,'CỐT TRUYỆN III · 101—150','Vực Sâu Cổ Đại','Sau cánh cổng đá, những ký ức bị phong ấn thức giấc.');
 }
 function ruins(c,t,dark=false){
  for(let i=0;i<7;i++){const x=45+i*151;poly(c,[[x,500],[x+7,271+i%2*42],[x+35,257+i%2*43],[x+53,501]],dark?'#102431':'#154251','#32607166',1);rect(c,x-4,267+i%2*42,50,18,dark?'#1b3542':'#205567');}
  for(let i=0;i<16;i++){const x=(i*89+25)%W,y=H-((t*35+i*41)%H);ellipse(c,x,y,2+i%3,3+i%3,null,'#c3eff640',1);}
 }
 function whirlpool(c,g,s,p,t){
  backdrop(c,'#082b44','#081421');ruins(c,t);const cx=640,cy=330,turn=s.reducedMotion?.7:t*.65;
  for(let i=0;i<9;i++){const r=165-i*15,alpha=.16+i*.035;c.save();c.globalAlpha=alpha;c.strokeStyle=i%2?'#6fd4de':'#2b728e';c.lineWidth=5-i*.3;c.beginPath();
   for(let k=0;k<=50;k++){const a=k/50*TAU+turn+i*.24,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.46;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.restore();}
  ellipse(c,cx,cy,34,15,'#050e1d');glow(c,cx,cy,140,'#5babcf24');
  const approach=ease(p),x=lerp(230,cx,approach),y=lerp(238,cy+12,approach),scale=1-.5*ease((p-.45)/.55);
  hunter(c,g,x,y,t,{swim:true,scale,vx:90,tilt:-.28+approach*.5,alpha:1-ease((p-.83)/.17)});
  title(c,'CỐT TRUYỆN IV · 151—200','Hải Vực Quên Lãng','Dòng xoáy mở đường xuống những miền ký ức dưới biển.');
 }
 function underwaterEnding(c,g,t){
  if(!MM.UnderwaterRenderer?.drawBackground?.(c,g,t)){backdrop(c,'#06162b','#03101d');ruins(c,t,true);}
  const beam=c.createLinearGradient(0,0,0,H);beam.addColorStop(0,'#9ce3e933');beam.addColorStop(.65,'#6aa7bf00');rect(c,310,0,330,H,beam);
 }
 function surface(c,t){
  backdrop(c,'#91c6c6','#f1d4a2');glow(c,708,125,160,'#fff2bd99');ellipse(c,708,125,39,39,'#f9e8b4');
  poly(c,[[0,240],[95,218],[190,236],[290,222],[386,239],[504,223],[620,235],[750,222],[870,238],[960,220],[960,540],[0,540]],'#367b82');
  for(let i=0;i<14;i++){const y=265+i*23,drift=Math.sin(t*.4+i)*8;line(c,30+(i*97)%180+drift,y,210+(i*131)%700+drift,y-2,'#c2e5cf36',1+i*.08);}
  for(let i=0;i<5;i++){const x=120+i*173,y=100+(i%2)*36;line(c,x-7,y,x,y+4,'#526c6c',1.5);line(c,x,y+4,x+7,y,'#526c6c',1.5);}
 }
 function land(c,t){
  surface(c,t);poly(c,[[0,385],[173,374],[308,405],[508,397],[657,409],[798,389],[960,398],[960,540],[0,540]],'#8d9470','#c8c393',2);
  poly(c,[[0,431],[160,414],[340,435],[520,420],[710,438],[960,421],[960,540],[0,540]],'#536a4a');
  tree(c,82,425,1.03,'#415e46','#789064');tree(c,897,432,.9,'#48694b','#82976a');
  for(let i=0;i<20;i++)line(c,i*53,450+(i%3)*10,i*53+4,438+(i%3)*10,'#91a36b',2);
 }
 function ending(c,g,s,p,t){
  const elapsed=p*11;underwaterEnding(c,g,t);
  const fall=ease(elapsed/2.7),boss=g.endingBoss;
  if(boss&&elapsed<3.4&&MM.UnderwaterRenderer?.drawEnemy){
   const actor={...boss,dead:false,retired:false,health:1,phase:'active',hit:0,krakenStone:false,krakenDying:false,krakenEcho:false,
    x:boss.x||630,y:lerp(boss.y||400,690,fall),vx:0,vy:30,krakenClock:0};
   c.save();c.globalAlpha=1-ease((elapsed-1.5)/1.9);c.translate(actor.x,actor.y-actor.h*.5);c.rotate(fall*.2);c.translate(-actor.x,-(actor.y-actor.h*.5));MM.UnderwaterRenderer.drawEnemy(c,g,actor,0);c.restore();
   // Cold light leaves the body while its weight carries it into the trench.
   c.save();c.globalCompositeOperation='multiply';c.globalAlpha=fall*.4;ellipse(c,actor.x,actor.y-actor.h*.5,actor.w*.44,actor.h*.4,'#183044');c.restore();
  }
  const seaFade=ease((elapsed-5.3)/1.2),landFade=ease((elapsed-8)/1.25);
  if(seaFade>0){c.save();c.globalAlpha=seaFade;surface(c,t);c.restore();}
  if(landFade>0){c.save();c.globalAlpha=landFade;land(c,t);c.restore();}
  if(elapsed<6.1){const rise=ease((elapsed-2.3)/3.5),y=lerp(340,106,rise),alpha=1-ease((elapsed-5.3)/.8);glow(c,480,y-28,130,'#aee7e32d',alpha);hunter(c,g,480,y,t,{swim:true,vx:70,tilt:-.42,alpha});stars(c,480,y,t,alpha);}
  if(elapsed>5.3&&elapsed<9.1){const alpha=seaFade*(1-landFade),y=318-Math.sin(ease((elapsed-5.3)/2.2)*Math.PI)*25;
   hunter(c,g,480,y,t,{swim:true,vx:25,tilt:0,alpha});stars(c,480,y,t,alpha);c.save();c.globalAlpha*=alpha;ellipse(c,480,y+3,46,6,null,'#d8ead179',1.5);c.restore();}
  if(landFade>0){const x=lerp(420,580,ease((elapsed-8.2)/2.8));hunter(c,g,x,428,t,{vx:elapsed>10.6?0:85,alpha:landFade});stars(c,x,428,t,landFade*.65);}
  if(elapsed<3.2)title(c,'HẢI VỰC QUÊN LÃNG','Đáy biển đã lặng yên.','Những hung thần cuối cùng chìm vào ký ức.',1-ease((elapsed-2.5)/.7));
  else if(elapsed<8.3)title(c,'HÀNH TRÌNH TRỞ VỀ','Theo ánh sao về phía mặt trời.','Không còn lời nguyền nào níu người giữ đèn.',ease((elapsed-3.2)/.7)*(1-ease((elapsed-7.6)/.7)));
  else title(c,'BIÊN NIÊN NGỌN ĐÈN','Bình minh đã trở lại.','Sau hai trăm đêm, đôi chân lại chạm đất.',ease((elapsed-8.3)/.9));
 }
 function draw(c,g){const s=g.cinematic;if(!s||g.screen!=='cinematic')return false;
  const p=clamp(s.time/s.duration),t=s.reducedMotion?0:s.time;c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
  ({forest,cave,whirlpool,ending}[s.kind])(c,g,s,p,t);
  const vignette=c.createLinearGradient(0,0,0,H);vignette.addColorStop(0,'#030b182b');vignette.addColorStop(.48,'#030b1800');vignette.addColorStop(1,'#030b1877');rect(c,0,0,W,H,vignette);
  rect(c,30,H-24,W-60,2,'#d2dfcb20');rect(c,30,H-24,(W-60)*p,2,'#d2dfcb9c');
  const fadeIn=1-ease(p/.08),fadeOut=s.kind==='ending'?0:ease((p-.9)/.1),fade=Math.max(fadeIn,fadeOut);if(fade>0)rect(c,0,0,W,H,'rgba(3,12,20,'+fade+')');c.restore();return true;
 }
 MM.ChapterTransition={begin,update,draw,skip};
})(typeof window!=='undefined'?window:globalThis);
