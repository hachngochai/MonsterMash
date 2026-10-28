/* Paint-only cosmic attacks and suit overlay; authored damage zones remain
 * visible throughout tell/impact/recovery and never move with the camera. */
(function(root){'use strict';const MM=root.MM=root.MM||{},TAU=Math.PI*2;
 const jetVisuals=new WeakMap(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const suitActive=g=>!!g?.level?.cosmic&&MM.SaveManager?.unlocked(g,250)===true;
 const ellipse=(c,x,y,rx,ry,fill,stroke)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function glow(c,x,y,r,color){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'#00000000');ellipse(c,x,y,r,r,gr);}
 function jetpackState(g){const s=jetVisuals.get(g);return {active:!!s?.active,particles:s?.particles.length||0,thrust:s?.thrust||0};}
 function drawJetpack(c,g,time=0){
  const p=g.player;if(!p||!g.level?.cosmic){jetVisuals.delete(g);return false;}
  const t=Number.isFinite(time)?time:0,moving=g.settings?.effects!==false&&!g.settings?.reducedMotion,active=(g.cosmicRewards?.jetpack||0)>0,scale=clamp((p.h||54)/54,.7,2.2),dir=p.dir<0?-1:1;
  const x=p.x-dir*((p.w||38)*.5+8*scale),y=p.y-4*scale;
  let s=jetVisuals.get(g);if(!s||s.player!==p||t<s.time){s={player:p,time:t,y:p.y,thrust:0,active,particles:[],emission:0,serial:0,lift:0};jetVisuals.set(g,s);}
  const elapsed=clamp(t-s.time,0,.1);s.active=active;
  if(elapsed>0){
   s.lift+=(clamp((s.y-p.y)/elapsed,0,260)-s.lift)*(1-Math.exp(-elapsed*10));
   s.thrust+=((active?1:0)-s.thrust)*(1-Math.exp(-elapsed*(active?19:24)));if(s.thrust<.002)s.thrust=0;
   for(const q of s.particles){q.age+=elapsed;q.x+=q.vx*elapsed;q.y=Math.min(436,q.y+q.vy*elapsed);q.vx*=Math.exp(-elapsed*1.8);}
   s.particles=s.particles.filter(q=>q.age<q.life);
   if(active&&moving){s.emission+=elapsed*21;while(s.emission>=1&&s.particles.length<28){s.emission--;const seed=++s.serial,spread=Math.sin(seed*12.37),length=Math.min(52*scale,Math.max(5,438-y-3));s.particles.push({x:x+spread*3*scale,y:Math.min(435,y+length*.72),vx:-(p.vx||0)*.1+spread*11,vy:25+Math.cos(seed*4.9)*8,age:0,life:.38+(Math.sin(seed*3.7)+1)*.15,seed});}}else s.emission=0;
  }
  s.time=t;s.y=p.y;if(!moving)s.particles=[];
  c.save();c.lineCap='round';c.lineJoin='round';
  // Exhaust lives in world space, so turning does not snap an old plume to
  // the opposite side of the backpack. No gameplay RNG or clocks are used.
  if(moving)for(const q of s.particles){const u=q.age/q.life,fade=Math.sin(u*Math.PI)*(1-u),r=(2+u*8)*scale;c.globalAlpha=.13*fade;glow(c,q.x,q.y,r,'#b6cdd49c');if(u<.35){c.globalAlpha=.4*(1-u/.35);ellipse(c,q.x,q.y,1.2*scale,2.5*scale,'#b6ecff');}}
  c.globalAlpha=1;
  const thrust=moving?s.thrust:active?1:0;
  if(thrust>.002){
   const phase=moving?t:0,room=Math.max(6,438-y-2),length=Math.min(room,(47+s.lift*.035+(moving?Math.sin(phase*17)*2.2+Math.sin(phase*29)*1.1:0))*scale)*thrust;
   const lean=moving?clamp((p.vx||0)/950,-.22,.22):0;
   c.save();c.translate(x,y);c.rotate(lean);c.globalCompositeOperation='screen';c.globalAlpha=thrust;
   glow(c,0,8*scale,21*scale,'#81cfff64');
   for(let layer=0;layer<3;layer++){
    const len=Math.max(.5,length*[1,.78,.43][layer]),w=[7,4.6,2.7][layer]*scale,curl=moving?Math.sin(phase*11+layer)*2.2*scale:0;
    const gr=c.createLinearGradient(0,0,0,len);gr.addColorStop(0,layer===2?'#f1ffff':'#9bdfff');gr.addColorStop(.2,layer===2?'#defffff0':layer===1?'#8cdaffe8':'#4ca4f7b0');gr.addColorStop(.58,layer===2?'#fff2baaf':layer===1?'#ffe3a9d0':'#ffb45f9c');gr.addColorStop(1,'#ed754000');
    c.beginPath();c.moveTo(-w*.55,0);c.bezierCurveTo(-w,len*.2,-w*.35+curl,len*.74,curl*.6,len);c.bezierCurveTo(w*.38+curl,len*.78,w*.93,len*.22,w*.55,0);c.closePath();c.fillStyle=gr;c.fill();
   }
   // Small compression knots inside the core suggest a continuous hot jet,
   // instead of a solid line or an isolated triangular flame.
   for(let i=0;i<3;i++){const yy=(7+i*10)*scale;if(yy>length*.65)break;c.globalAlpha=thrust*(.3-i*.06);ellipse(c,Math.sin(phase*8+i)*.3*scale,yy,(2.7-i*.45)*scale,1.2*scale,'#f0fbff');}
   c.restore();
   const ground=1-clamp((438-y)/80,0,1);if(ground>0){c.globalAlpha=ground*thrust*.45;glow(c,x,436,32*scale,'#8cbfdf55');ellipse(c,x,436,20*scale,2.2*scale,null,'#b6c5bd70');}
  }
  // Beveled tank, heat shield and flared nozzle share the hunter's ink lines.
  c.globalAlpha=1;c.save();c.translate(x,y);c.scale(scale,scale);
  line(c,[[dir*4,-21],[dir*11,-19]],'#263640',3);line(c,[[dir*4,-10],[dir*10,-9]],'#263640',3);
  c.fillStyle='#d4dfe3';c.strokeStyle='#101923';c.lineWidth=1.4;c.beginPath();c.moveTo(-6,-27);c.lineTo(4,-27);c.lineTo(6,-23);c.lineTo(6,-6);c.lineTo(3,-3);c.lineTo(-5,-3);c.lineTo(-7,-7);c.lineTo(-7,-23);c.closePath();c.fill();c.stroke();
  const metal=c.createLinearGradient(-7,0,6,0);metal.addColorStop(0,'#a1b2bd');metal.addColorStop(.35,'#f0f4f2');metal.addColorStop(.65,'#c7d3db');metal.addColorStop(1,'#8199a9');c.fillStyle=metal;c.fillRect(-5,-25,8,19);
  c.fillStyle='#233b48';c.fillRect(-4,-18,6,4);c.fillStyle=active?'#b1f1fa':'#6a9ba5';c.fillRect(-3,-17,4,2);
  line(c,[[-6,-23],[4,-23]],'#b6c7c9',1);line(c,[[-6,-8],[4,-8]],'#152733',2);
  c.beginPath();c.moveTo(-4,-5);c.lineTo(3,-5);c.lineTo(5,0);c.quadraticCurveTo(0,3,-6,0);c.closePath();c.fillStyle='#34424c';c.fill();c.strokeStyle='#14202a';c.stroke();
  ellipse(c,-.5,0,4.2,1.3,active?'#d5f8ff':'#172632',active?'#79bfeb':'#768b91');c.restore();c.restore();return true;
 }
 function drawBackground(c,g,t){if(!g.level?.cosmic)return false;return MM.CosmicScenery.drawBackground(c,g.level.id,t,g.settings);}
 function drawEnemy(c,g,e,t){if(!g.level?.cosmic||!MM.CosmicCombat?.owns(e))return false;if(MM.CosmicArt.drawEnemy(c,g,e,t))return true;
  c.save();c.globalAlpha*=.5;ellipse(c,e.x,e.y-e.h*.5,e.w*.4,e.h*.45,'#182536','#8ecedb');c.restore();return true;}
 function shard(c,x,y,size,color,t){c.save();c.translate(x,y);c.rotate(t);c.beginPath();c.moveTo(0,-size);c.lineTo(size*.6,0);c.lineTo(0,size);c.lineTo(-size*.5,size*.1);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#ffffff55';c.lineWidth=1;c.stroke();c.restore();}
 function drawEffects(c,g,front=false){
  const t=g.settings?.reducedMotion?0:g.time||0,color=MM.CosmicConfig?.getRegion(g.level?.id)?.color||'#abcde5';
  c.save();
  if(!front)for(const z of g.cosmic?.hazards||[]){
   const warning=z.warning>0,progress=warning?1-z.warning/z.initialWarning:Math.min(1,z.elapsed/.2),cy=z.y-z.h*.5;
   if(warning){c.globalAlpha=.35+Math.sin(t*7)*.12;c.setLineDash([7,6]);c.lineWidth=1.5;ellipse(c,z.x,z.y-2,z.w/2,Math.min(14,z.h/3),null,z.extinction?'#ef9fff':color);c.setLineDash([]);
    if(z.h>100)line(c,[[z.x,Math.max(55,z.y-z.h)],[z.x,z.y-8]],color,1);c.globalAlpha=.25;glow(c,z.x,z.y-8,Math.min(70,z.w),color+'88');c.globalAlpha=1;continue;}
   c.globalAlpha=Math.min(1,z.life/.2)*.8;
   if(z.extinction){const B=MM.CosmicBalance.boss;const wave=c.createLinearGradient(0,0,960,0);wave.addColorStop(0,'#b27afb00');wave.addColorStop(.5,'#f7dbffac');wave.addColorStop(1,'#b27afb00');c.fillStyle=wave;c.fillRect(0,30,960,408);
    for(const x of B.coverXs){glow(c,x,380,90,'#97f6d080');ellipse(c,x,422,B.coverWidth/2,65,'#143a3b99','#acffda');}continue;}
   if(/beam|ray|lightning|silver-ice|meteor|cold-ray|aurora/.test(z.type)){
    const x=z.x;glow(c,x,cy,Math.min(105,z.h*.4),color+'55');for(let j=0;j<3;j++){const pts=[];for(let i=0;i<9;i++)pts.push([x+(i%2?-1:1)*Math.sin(t*15+i+j)*Math.min(z.w*.35,15),z.y-z.h+i*z.h/8]);line(c,pts,j===1?'#f4f5d8':color,j===1?3:7);}
    if(/meteor|ice/.test(z.type))shard(c,x,z.y-z.h*(1-progress),z.w*.42,/ice/.test(z.type)?'#beeafa':'#a36e54',t);}
   else if(/vortex|spiral|twister|gravity|void|time-slow|sonic/.test(z.type)){
    for(let i=0;i<7;i++){const yy=z.y-i*z.h/7,rx=z.w*.45*(.35+i/10);ellipse(c,z.x+Math.sin(t*2+i)*8,yy,rx,7,null,color);}
    glow(c,z.x,cy,Math.min(z.w/2,130),color+'45');
   }else if(/ground|rift|path|trail|heat|mine|puddle|acid/.test(z.type)){
    const pts=[];for(let i=0;i<13;i++)pts.push([z.x-z.w*.5+i*z.w/12,z.y-3-Math.sin(i*4+t)*Math.min(z.h*.2,9)]);line(c,pts,color,4);line(c,pts,'#fff4cf',1);
    for(let i=0;i<8;i++)shard(c,z.x-z.w*.45+i*z.w/8,z.y-12-Math.abs(Math.sin(t*3+i))*Math.min(z.h,55),4+i%3,color,t+i);
   }else{ellipse(c,z.x,cy,z.w*.45,z.h*.42,color+'35',color);for(let i=0;i<6;i++)shard(c,z.x+Math.cos(i*TAU/6+t)*z.w*.35,cy+Math.sin(i*TAU/6+t)*z.h*.3,6,color,t+i);}
   c.globalAlpha=1;
  }
  if(front){
   for(const q of g.cosmic?.projectiles||[]){const ice=/ice|freeze|cold/.test(q.type);line(c,[[q.x-q.vx*.055,q.y-q.vy*.055],[q.x,q.y]],ice?'#bbf2ff88':color+'88',6);shard(c,q.x,q.y,Math.max(q.w,q.h)*.55,ice?'#c3f3ff':color,t*4);}
   MM.CosmicEssenceFX?.draw(c,g,t);
  }
  c.restore();return true;
 }
 function drawPlayer(c,g,t){
  const p=g.player,s=g.cosmicRewards;if(!p)return;
  c.save();
  if(suitActive(g)){
   drawJetpack(c,g,t);
  }
  MM.CosmicEssenceFX?.drawPlayer(c,g,t);
  if(s?.virtualArmor>0)ellipse(c,p.x,p.y-p.h*.5,p.w*.8,p.h*.63,null,'#cdb5f1');
  c.restore();
 }
 MM.CosmicRenderer={drawBackground,drawEnemy,drawEffects,drawPlayer,drawJetpack,jetpackState,suitActive};
})(typeof window!=='undefined'?window:globalThis);
