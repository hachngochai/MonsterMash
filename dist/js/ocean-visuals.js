/* Paint-only companions, held lightning and finite underwater illumination. */
(function(root){'use strict';const MM=root.MM=root.MM||{},TAU=Math.PI*2;
 const water=g=>MM.UnderwaterMode?.active(g)===true;
 const moving=g=>g.settings?.effects!==false&&!g.settings?.reducedMotion;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function poly(c,points,fill,stroke='#142b3e',width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function glow(c,x,y,r,color){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,color.slice(0,7)+'00');c.fillStyle=gr;c.fillRect(x-r,y-r,r*2,r*2);}
 function star(c,x,y,size,angle,lit){const pts=[];for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,r=i%2?size*.46:size;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}poly(c,pts,lit?'#c7eeab':'#567a91',lit?'#e6ffd4':'#83a6b7',1);poly(c,[[x-2,y],[x,y-3],[x+2,y],[x,y+3]],lit?'#fbffe6':'#7d9db3',null);}
 function starfish(g,t){
  if(!water(g)||!MM.SaveManager?.unlocked(g,180))return [];
  const p=g.player,clock=moving(g)?t:0;
  return [0,1,2].map(i=>{const a=clock*.85+i*TAU/3;return {x:p.x+Math.cos(a)*43,y:p.y-p.h*.5+Math.sin(a)*30,angle:a,size:7};});
 }
 function lightState(g){return {enabled:water(g)&&!!MM.SaveManager?.unlocked(g,180),radius:(MM.DeepSeaConfig?.step||50)*8,blackout:(g.krakenDarkTime||0)>0};}
 function drawTail(c,p,t,effects){
  if(!(p.merfolkTime>0))return false;
  const sway=effects?Math.sin((p.swimPhase||t*6)*.7)*7:0;
  poly(c,[[-14,-14],[12,-14],[11,-2],[sway+6,8],[sway+1,16],[sway-7,7],[-11,-1]],'#287f97','#123343',1.5);
  poly(c,[[sway+1,12],[sway-14,7],[sway-17,15],[sway-2,20],[sway+15,18],[sway+17,10]],'#6ccbd0','#235565',1.5);
  poly(c,[[-9,-10],[3,-8],[sway+1,10],[-2,0]],'#4dafa9',null);
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(-7+i*5,-7);c.lineTo(-6+i*4,-1);c.strokeStyle='#99ebd4';c.lineWidth=.8;c.stroke();}return true;
 }
 function drawWeapon(c,p,weapon,g,t,effects){
  if(weapon!=='lightningOrb')return false;const dir=p.dir||1,active=g.lightningOrb?.active;
  c.save();c.scale(dir,1);c.lineCap='round';
  c.strokeStyle='#527446';c.lineWidth=8;c.beginPath();c.moveTo(13,-27);c.lineTo(27,-28);c.stroke();
  poly(c,[[24,-33],[32,-33],[34,-27],[27,-23],[23,-27]],'#d8b47d');
  const x=35,y=-29,r=active?12:9;glow(c,x,y,r*2,active?'#87bbff77':'#7da7df44');
  poly(c,[[x-r,y-3],[x-r*.5,y-r],[x+r*.5,y-r],[x+r,y-2],[x+r*.7,y+r*.7],[x,y+r],[x-r*.8,y+r*.5]],'#6c80d9','#b5e9ff',1.5);
  poly(c,[[x-4,y-5],[x+4,y-6],[x+6,y],[x,y+5],[x-5,y+2]],'#dcf7ff','#92d8ff');
  for(let i=0;i<3;i++){const a=(effects?t*3:0)+i*TAU/3;const xx=x+Math.cos(a)*15,yy=y+Math.sin(a)*15;c.beginPath();c.moveTo(xx-3,yy-4);c.lineTo(xx+2,yy-1);c.lineTo(xx-2,yy+2);c.lineTo(xx+3,yy+5);c.strokeStyle='#cfbcff';c.lineWidth=1;c.stroke();}
  c.restore();return true;
 }
 function effects(c,g,t){
  if(!g.player)return;const s=g.lightningOrb;
  c.save();
  if(s?.active&&s.origin){
    const o=s.origin,animated=moving(g);glow(c,o.x,o.y,36,'#919bff55');
    for(const [index,e]of(s.targets||[]).slice(0,5).entries()){
      if(e.dead||e.health<=0)continue;const tx=e.x,ty=e.y-e.h*.5,dx=tx-o.x,dy=ty-o.y,len=Math.max(1,Math.hypot(dx,dy));
      const pts=[[o.x,o.y]];for(let j=1;j<9;j++){const k=j/9,jitter=animated?Math.sin(t*38+j*2+index*3)*6:((j%2)*2-1)*4;pts.push([o.x+dx*k-dy/len*jitter,o.y+dy*k+dx/len*jitter]);}pts.push([tx,ty]);
      for(const [color,w]of[['#777ee855',7],['#b3baff',2.5],['#effaff',.9]]){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineWidth=w;c.strokeStyle=color;c.stroke();}
      glow(c,tx,ty,16,'#acbaff55');
    }
  }
  if(water(g)){
    const dark=(g.krakenDarkTime||0)>0;
    for(const s of starfish(g,t)){if(!dark)glow(c,s.x,s.y,24,'#baf1ca33');star(c,s.x,s.y,s.size,s.angle,!dark);}
    if(g.player.merfolkTime>0){const p=g.player;glow(c,p.x,p.y-p.h*.4,57,'#57d5e52b');}
  }c.restore();
 }
 let mask=null;
 function lighting(c,g,t){
  if(!water(g)||g.level.id<181||!root.document)return;
  if(!mask){mask=root.document.createElement('canvas');mask.width=960;mask.height=540;}
  const m=mask.getContext('2d');if(!m)return;
  const p=g.player,l=lightState(g),opacity=g.level.id>=191?.87:.7;
  m.clearRect(0,0,960,540);m.globalCompositeOperation='source-over';m.fillStyle=`rgba(1,8,21,${l.blackout?.94:opacity})`;m.fillRect(0,0,960,540);m.globalCompositeOperation='destination-out';
  function hole(x,y,r,power=1){const gr=m.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(0,0,0,${power})`);gr.addColorStop(.62,`rgba(0,0,0,${power*.87})`);gr.addColorStop(1,'rgba(0,0,0,0)');m.fillStyle=gr;m.fillRect(x-r,y-r,r*2,r*2);}
  // Three stars share ONE eight-step radius; they never add up to 24 steps.
  hole(p.x,p.y-p.h*.5,l.enabled&&!l.blackout?l.radius:l.blackout?75:140,1);
  for(const e of g.enemies||[]){if(e.dead)continue;const k=e.archetype;
    if(e.boss)hole(e.x,e.y-e.h*.65,Math.min(170,Math.max(80,e.w*.45)),.5);
    if(k==='glowBug'||k==='anglerFish'||k==='pearlClam'&&e.pearlAvailable)hole(e.x,e.y-e.h*.5,65,.68);
    if(e.tell||e.skillWarning)hole(e.x,e.y-e.h*.5,Math.min(140,Math.max(70,e.w*.5)),.62);
  }
  for(const z of g.finalSea?.vents||[])if(z.phase!=='idle')hole(z.x,z.y-25,82,.68);
  for(const b of [...(g.ammoCrates||[]),...(g.underwater?.oxygenCrates||[]),...(g.pickups||[])])hole(b.x,b.y-10,40,.7);
  m.globalCompositeOperation='source-over';c.save();c.drawImage(mask,0,0);c.restore();
  MM.UnderwaterRenderer?.drawMandatoryWarnings(c,g,t);
  // Telegraph captions are painted after darkness, so the ink never hides an
  // unavoidable warning or the precise time of Leviathan's shield test.
  c.save();c.font='600 10px "Noto Sans",sans-serif';c.textAlign='center';
  for(const e of g.enemies||[])if(!e.dead&&e.skillWarning){const x=clamp(e.x,130,830),y=clamp(e.y-e.h-20,92,470);const label=e.skillWarning.name+' · '+Math.max(0,e.skillWarning.remaining||0).toFixed(1)+'s';const w=Math.min(350,label.length*6+14);c.fillStyle='#0b1b2ef0';c.fillRect(x-w/2,y-12,w,18);c.fillStyle='#ffdfa7';c.fillText(label,x,y);}
  c.restore();
 }
 MM.OceanVisuals={starfish,lightState,drawTail,drawWeapon,drawEffects:effects,drawLighting:lighting};
})(typeof window!=='undefined'?window:globalThis);
