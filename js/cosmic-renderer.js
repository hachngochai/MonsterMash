/* Paint-only cosmic attacks and suit overlay; authored damage zones remain
 * visible throughout tell/impact/recovery and never move with the camera. */
(function(root){'use strict';const MM=root.MM=root.MM||{},TAU=Math.PI*2;
 const ellipse=(c,x,y,rx,ry,fill,stroke)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function glow(c,x,y,r,color){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'#00000000');ellipse(c,x,y,r,r,gr);}
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
  if(g.level?.cosmic&&MM.SaveManager?.unlocked(g,250)){
   c.lineWidth=2;c.strokeStyle='#c4e6ef';ellipse(c,p.x,p.y-p.h*.72,p.w*.6,p.h*.39,'#98d3ef17','#bfdce8');
   line(c,[[p.x-p.w*.35,p.y-p.h*.92],[p.x+p.w*.24,p.y-p.h*.99]],'#ffffff9c',2);
   c.fillStyle='#788c98';c.fillRect(p.x-p.dir*26-5,p.y-p.h*.52,10,26);c.fillStyle='#8ae0ee';c.fillRect(p.x-p.dir*26-2,p.y-p.h*.46,4,15);
   if(s?.jetpack>0){glow(c,p.x-p.dir*27,p.y-8,30,'#82e0ff77');line(c,[[p.x-p.dir*27,p.y-12],[p.x-p.dir*27+Math.sin(t*30)*4,p.y+20]],'#91edff',5);}
  }
  MM.CosmicEssenceFX?.drawPlayer(c,g,t);
  if(s?.virtualArmor>0)ellipse(c,p.x,p.y-p.h*.5,p.w*.8,p.h*.63,null,'#cdb5f1');
  c.restore();
 }
 MM.CosmicRenderer={drawBackground,drawEnemy,drawEffects,drawPlayer};
})(typeof window!=='undefined'?window:globalThis);
