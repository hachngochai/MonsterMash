/* Paint-only essence choreography. Stream ribbons, connected vines, rolling
 * stone volumes and accretion arcs use bounded samples and real cast clocks. */
(function(root){'use strict';const MM=root.MM=root.MM||{},TAU=Math.PI*2;
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
 const ellipse=(c,x,y,rx,ry,fill,stroke)=>{c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 function path(c,points,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
 function glow(c,x,y,r,colour){const gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,colour);gr.addColorStop(1,'#00000000');ellipse(c,x,y,r,r,gr);}
 function diamond(c,x,y,r,colour){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.6,y);c.lineTo(x,y+r);c.lineTo(x-r*.6,y);c.closePath();c.fillStyle=colour;c.fill();c.strokeStyle='#f6f6e4bd';c.lineWidth=1;c.stroke();}
 function pressure(c,g,e,t){const p=g.player,fade=ease(e.age/.18)*ease(e.remaining/.22),length=480,startX=p.x+e.dir*24,y=p.y-p.h*.52;
  c.save();c.translate(startX,y);c.scale(e.dir,1);c.globalAlpha*=fade;c.globalCompositeOperation='screen';
  const gr=c.createLinearGradient(0,0,length,0);gr.addColorStop(0,'#e8ffffbd');gr.addColorStop(.18,'#82e9ffad');gr.addColorStop(.8,'#4cb7ef75');gr.addColorStop(1,'#2ea0de00');
  c.beginPath();c.moveTo(0,-5);for(let i=1;i<=18;i++){const x=i*length/18;c.lineTo(x,-(5+i*.55)+Math.sin(x*.05-t*17)*2);}for(let i=18;i>=0;i--){const x=i*length/18;c.lineTo(x,5+i*.55+Math.sin(x*.04-t*15)*2);}c.closePath();c.fillStyle=gr;c.fill();
  for(let j=0;j<6;j++){const pts=[];for(let i=0;i<=20;i++){const x=i*length/20;pts.push([x,(j-2.5)*2+Math.sin(x*.035-t*13+j)*Math.min(5,x*.022)]);}path(c,pts,j===2?'#ecffffd9':'#8fdefe70',j===2?2.2:1);}
  for(let i=0;i<22;i++){const x=(t*580+i*31)%length,yy=Math.sin(i*7+t*2)*(4+x*.035);ellipse(c,x,yy,2.5,1,'#bcf6ffb0');}
  glow(c,0,0,28,'#9beeff9c');c.restore();
  for(const target of e.targets||[]){const edge=target.x-target.w/2*e.dir,xx=e.dir>0?Math.min(p.x+480,edge):Math.max(p.x-480,edge);c.save();c.globalAlpha*=fade;for(let i=0;i<6;i++){const a=i*TAU/6+t*2,r=6+(t*65+i*4)%23;path(c,[[xx,y],[xx+Math.cos(a)*r,y+Math.sin(a)*r]],'#c5f7ff9c',1.5);}c.restore();}
 }
 function fire(c,g,e,t){const p=g.player,fade=ease(e.age/.18)*ease(e.remaining/.22);c.save();c.translate(p.x+e.dir*24,p.y-p.h*.52);c.scale(e.dir,1);c.globalAlpha*=fade;c.globalCompositeOperation='screen';
  for(let layer=0;layer<3;layer++){const length=480-layer*60,thickness=45-layer*12,gr=c.createLinearGradient(0,0,length,0);gr.addColorStop(0,layer===2?'#fff5c6':'#ffb54c');gr.addColorStop(.35,layer===2?'#ffe995c9':'#ff8531c9');gr.addColorStop(.8,layer===2?'#ffce7470':'#ed3e2075');gr.addColorStop(1,'#ff583000');
   c.beginPath();c.moveTo(0,-4);for(let i=1;i<=24;i++){const x=i*length/24,envelope=(.15+.85*Math.sin(i/24*Math.PI*.85))*thickness;const turbulence=Math.sin(x*.035-t*10+layer)*6+Math.sin(x*.073-t*17)*3;c.lineTo(x,-envelope+turbulence);}for(let i=24;i>=0;i--){const x=i*length/24,envelope=(.15+.85*Math.sin(i/24*Math.PI*.85))*thickness;c.lineTo(x,envelope+Math.sin(x*.047-t*12+layer)*5);}c.closePath();c.fillStyle=gr;c.fill();
  }
  for(let i=0;i<24;i++){const x=(t*(230+i%3*35)+i*47)%480,y=Math.sin(i*11+t*2)*Math.min(40,x*.11)-(x/480)**2*14;path(c,[[x,y],[x-5-i%4,y+2]],i%3?'#ffd37ca0':'#fff4c8c0',1.3);}
  glow(c,2,0,30,'#ffc876b0');c.restore();
 }
 function vine(c,g,e,t){const p=g.player,dir=e.dir<0?-1:1,grow=ease(e.age/.8),fade=ease(e.remaining/.3),length=480*grow,pulse=Math.max(0,1-(e.age%1)/.26);
  const rootY=x=>-4-Math.abs(Math.sin(x*.036+t*.65))*4-Math.sin(x*.019)*1.5;
  c.save();c.translate(p.x,438);c.scale(dir,1);c.globalAlpha*=fade;
  // A connected root advances along the soil. Its silhouette stays below the
  // hunter's knees, including when an aerial enemy is among the hit targets.
  const trunk=()=>{c.beginPath();c.moveTo(0,-1);const count=Math.max(1,Math.ceil(length/28));for(let i=0;i<count;i++){const x=i*length/count,end=(i+1)*length/count,mid=(x+end)/2;c.quadraticCurveTo(mid,rootY(mid)-2,end,rootY(end));}};
  trunk();c.strokeStyle='#13271c';c.lineWidth=8;c.stroke();c.strokeStyle='#577849';c.lineWidth=5.2;c.stroke();c.strokeStyle='#a6bd6b8c';c.lineWidth=1.25;c.stroke();
  for(let i=0;i<17;i++){const x=15+i*28;if(x>length-5)break;const yy=rootY(x),unfurl=ease((length-x)/30),side=i%2?1:-1,reach=Math.min(length-x-2,(17+Math.sin(i*4.1)*4)*unfurl),rise=(7+i%3*3)*unfurl,sway=Math.sin(t*1.8+i)*1.2;
   c.beginPath();c.moveTo(x,yy);c.bezierCurveTo(x+reach*.3,yy-rise*.7,x+reach*.7,yy-rise+sway,x+reach,yy-rise*.55);c.strokeStyle='#243b26';c.lineWidth=3.8;c.stroke();c.strokeStyle='#8b9b56';c.lineWidth=1.7;c.stroke();
   const leafX=x+reach*.72,leafY=yy-rise*.75+sway*.5,leafLength=Math.min((8+i%3)*unfurl,Math.max(0,length-leafX-1));
   c.beginPath();c.moveTo(leafX,leafY);c.bezierCurveTo(leafX+side*leafLength*.25,leafY-6*unfurl,leafX+leafLength*.8,leafY-7*unfurl,leafX+leafLength,leafY-4*unfurl);c.bezierCurveTo(leafX+leafLength*.55,leafY+2*unfurl,leafX+leafLength*.2,leafY+2*unfurl,leafX,leafY);c.fillStyle=i%2?'#7e9d56':'#a5b86b';c.fill();path(c,[[leafX,leafY],[leafX+leafLength*.78,leafY-3*unfurl]],'#d5dba262',.7);
   // Fine hooked thorns and short side roots replace the former tall columns.
   c.beginPath();c.moveTo(x+5,yy-1);c.quadraticCurveTo(x+5,yy-7*unfurl,x+8,yy-8*unfurl);c.quadraticCurveTo(x+8,yy-3*unfurl,x+11,yy);c.fillStyle='#bbc08a';c.fill();
   if(i%3===1){c.beginPath();c.moveTo(x,yy+1);c.bezierCurveTo(x-2,yy+5,x+10,yy+7,x+17,yy+4);c.strokeStyle='#3b5130';c.lineWidth=1.6;c.stroke();}
  }
  const tipY=rootY(length);glow(c,length,tipY,14,'#b3d77b35');
  for(let i=0;i<5;i++){const x=length-3-i*6;if(x<0)continue;ellipse(c,x,1+Math.sin(i*4)*1.5,1.2+i*.2,.8,'#8b826670');}
  for(const target of (e.targets||[]).slice(0,8)){const x=(target.x-p.x)*dir;if(x<0||x>length)continue;if(pulse>0){c.save();c.globalAlpha*=pulse*.48;glow(c,x,-5,22,'#d3f69a68');ellipse(c,x,-2,13,2,null,'#d6e9a68a');c.restore();}}
  c.restore();
 }
 function stone(c,q,t){const r=21;c.save();c.translate(q.x,q.y);ellipse(c,0,19,29,5,'#070e1465');c.rotate(q.x/r);const points=[];for(let i=0;i<9;i++){const a=i*TAU/9,rr=r*(.88+Math.sin(i*9+1)*.12);points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();const gr=c.createLinearGradient(-20,-20,20,20);gr.addColorStop(0,'#d4c6a7');gr.addColorStop(.35,'#9b927e');gr.addColorStop(1,'#4c4e49');c.fillStyle=gr;c.fill();c.strokeStyle='#292f31';c.lineWidth=2;c.stroke();
  for(let i=0;i<4;i++)path(c,[[Math.cos(i*2)*8,Math.sin(i*2)*7],[Math.cos(i*2+.6)*19,Math.sin(i*2+.6)*19]],'#e6d8bb66',1);c.restore();
  c.save();c.globalAlpha=.35;for(let i=0;i<4;i++){const x=q.x-Math.sign(q.vx)*(14+i*9),y=q.y+15-i*2;ellipse(c,x,y,3+i,2+i*.3,'#b2a58d');}c.restore();
 }
 function accretion(c,x,y,t,r=65,intensity=1){c.save();c.translate(x,y);c.rotate(-.24);c.globalCompositeOperation='screen';c.globalAlpha*=intensity;glow(c,0,0,r*1.8,'#a578e950');
  for(let arm=0;arm<4;arm++){const pts=[];for(let i=0;i<70;i++){const u=i/69,a=u*TAU*1.15+t*(arm%2?-.55:.55)+arm*TAU/4,rr=r*(.65+u*.7);pts.push([Math.cos(a)*rr,Math.sin(a)*rr*.34]);}path(c,pts,arm%2?'#f2d8ff9c':'#c8a4f780',arm===0?3:1.5);}
  for(let i=0;i<48;i++){const a=i*TAU/48+t*.7,rr=r*(.8+(i%7)/18),xx=Math.cos(a)*rr,yy=Math.sin(a)*rr*.34;ellipse(c,xx,yy,1.5+i%2,.7,i%3?'#dbb0ffae':'#fff0d4d0');}
  c.globalCompositeOperation='source-over';ellipse(c,0,0,r*.53,r*.53,'#02030c');c.lineWidth=2;ellipse(c,0,0,r*.56,r*.56,null,'#ddb3f6d0');
  c.globalCompositeOperation='screen';c.beginPath();c.ellipse(0,5,r*1.28,r*.29,0,0,Math.PI);c.strokeStyle='#f6deffaa';c.lineWidth=3;c.stroke();c.restore();
 }
 function gravity(c,g,e,t){const p=g.player,push=Math.floor(e.age/2)%2===1,pulse=ease((e.age%2)/.55)*(1-ease(((e.age%2)-.55)/.8));
  const s=g.cosmicRewards;s.entityActor=s.entityActor||{archetype:'poseidon',x:p.x,y:p.y-40,w:80,h:110,displayHeight:110,dir:p.dir};const a=s.entityActor;a.x+=(p.x-a.x)*.15;a.y=p.y-45;a.dir=p.dir;
  c.save();c.globalAlpha=.4;MM.CosmicArt?.drawEnemy(c,g,a,t);c.restore();
  c.save();c.globalAlpha=.45;const colour=push?'#f3bbff':'#9ed7ff';for(let i=0;i<24;i++){const side=i%2?-1:1,u=(t*.5+i*.079)%1,xx=p.x+side*(push?u:1-u)*500,yy=p.y-p.h*.5+Math.sin(i*6)*90;path(c,[[xx,yy],[xx+(push?side:-side)*9,yy]],colour,1.5);}
  c.globalAlpha=pulse*.55;ellipse(c,p.x,p.y-p.h*.5,35+pulse*460,28+pulse*80,null,colour);c.restore();
 }
 function palm(c,q,t){const speed=Math.hypot(q.vx,q.vy)||1,dx=q.vx/speed,dy=q.vy/speed;c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(dy,dx));c.globalCompositeOperation='screen';
  if(q.id==='moon'){glow(c,0,0,31,'#b3deff60');c.beginPath();c.arc(-5,0,21,-Math.PI*.55,Math.PI*.55);c.quadraticCurveTo(12,0,-5-1,-21);c.fillStyle='#e6f7ffd0';c.fill();path(c,[[-6,-18],[6,0],[-6,18]],'#ffffffd9',1.5);}
  else{glow(c,0,0,34,'#ffae5e80');ellipse(c,0,0,12,12,'#fff0b8');for(let i=0;i<5;i++){c.beginPath();c.moveTo(5,-8+i*4);c.quadraticCurveTo(-20,-16+Math.sin(t*10+i)*8,-44-i*3,Math.sin(t*11+i)*7);c.strokeStyle=i%2?'#ffb849b0':'#ff6e3380';c.lineWidth=4-i*.5;c.stroke();}}
  path(c,[[-10,0],[-45,0]],q.id==='moon'?'#bddffff0':'#ffc278b0',2);c.restore();
 }
 function drawPlayer(c,g,t){const p=g.player,s=g.cosmicRewards;if(!p||!s?.stance)return;
  if(g.settings?.effects===false||g.settings?.reducedMotion)t=0;
  c.save();const moon=s.stance==='moon',x=p.x-p.dir*7,y=p.y-p.h*.5;
  if(moon){c.globalAlpha=.65;c.beginPath();c.arc(x,y,44,-Math.PI*.75,Math.PI*.75);c.strokeStyle='#c8e6fd';c.lineWidth=4;c.stroke();c.lineWidth=1;c.strokeStyle='#eefaff';c.stroke();for(let i=0;i<7;i++){const a=i*TAU/7+t*.25;diamond(c,x+Math.cos(a)*47,y+Math.sin(a)*47,2,'#cfebff');}}
  else{glow(c,x,y,64,'#ffc1643a');for(let i=0;i<16;i++){const a=i*TAU/16+t*.13,r=42+Math.sin(t*2+i)*2;path(c,[[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(a)*(r+6),y+Math.sin(a)*(r+6)]],'#ffd17a9c',1.5);}c.lineWidth=2;ellipse(c,x,y,39,39,null,'#ffcc7b88');}
  glow(c,p.x+p.dir*31,p.y-p.h*.5,21,moon?'#b8e9ff68':'#ffcb7d70');diamond(c,p.x+p.dir*31,p.y-p.h*.5,8,moon?'#c9eaff':'#ffd98e');c.restore();
 }
 function draw(c,g,t){const s=g.cosmicRewards;if(!s)return false;const moving=g.settings?.effects!==false&&!g.settings?.reducedMotion;if(!moving)t=0;c.save();c.lineCap='round';c.lineJoin='round';
  for(const e of s.effects){if(e.id==='mercury')pressure(c,g,e,t);if(e.id==='mars')fire(c,g,e,t);if(e.id==='jupiter')vine(c,g,e,t);if(e.id==='neptune')gravity(c,g,e,t);
   if(e.id==='venus'){const p=g.player;glow(c,p.x,p.y-p.h*.5,70,'#f1d78228');for(let i=0;i<4;i++){const a=t*.7+i*Math.PI/2;diamond(c,p.x+Math.cos(a)*40,p.y-p.h*.5+Math.sin(a)*28,4,'#ffe5a1');}}
   if(e.id==='blackHole'){accretion(c,480,270,t,65+Math.sin(t*2)*2,ease(e.age/.4)*ease(e.remaining/.35));for(let i=0;i<24;i++){const u=(t*.22+i/24)%1,a=i*2.4+t*.4,rr=65+(1-u)*240;const xx=480+Math.cos(a)*rr,yy=270+Math.sin(a)*rr*.7;path(c,[[xx,yy],[xx-Math.cos(a)*10,yy-Math.sin(a)*7]],'#bea2ef70',1);}}
  }
  for(const q of s.projectiles)q.kind==='stone'?stone(c,q,t):palm(c,q,t);
  for(const a of s.knights){a.visualActor=a.visualActor||{archetype:'ouranos',w:44,h:72,displayHeight:72};Object.assign(a.visualActor,{x:a.x,y:a.y,dir:a.dir});if(!MM.CosmicArt?.drawEnemy(c,g,a.visualActor,t)){c.lineWidth=2;ellipse(c,a.x,a.y-40,17,29,'#8497a666','#b6dcea');}c.save();c.globalAlpha=.8;c.fillStyle='#182737';c.fillRect(a.x-14,a.y-81,28,3);c.fillStyle='#a8d6eb';c.fillRect(a.x-14,a.y-81,28*a.health/a.maxHealth,3);c.restore();}
  for(const f of s.flashes||[]){const u=1-f.remaining/f.duration,fade=1-ease(u);c.save();c.globalAlpha=fade*.6;glow(c,f.x,f.y,80+u*500,'#dec6ff88');c.lineWidth=4*(1-u)+1;ellipse(c,f.x,f.y,40+u*650,30+u*450,null,'#f2ddff');c.restore();}
  c.restore();return true;
 }
 MM.CosmicEssenceFX={draw,drawPlayer};
})(typeof window!=='undefined'?window:globalThis);
