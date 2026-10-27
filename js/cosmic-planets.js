/* Procedural spherical map emblems: recognisable astronomical colours,
 * craters, gas bands and rings, without a remote texture dependency. */
(function(root){'use strict';const MM=root.MM=root.MM||{},cache=new Map(),TAU=Math.PI*2;
 const colours={mercury:[139,130,117],venus:[218,184,126],mars:[176,91,59],jupiter:[195,167,140],saturn:[211,194,151],uranus:[143,207,212],neptune:[63,102,193],moon:[163,166,168],sun:[255,167,34]};
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
 function texture(id){if(cache.has(id))return cache.get(id);const rgb=colours[id];if(!rgb)return null;
  try{const canvas=root.document?.createElement?.('canvas')||(typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(160,160):null);if(!canvas)return null;canvas.width=canvas.height=160;
   const c=canvas.getContext('2d'),image=c.createImageData(160,160),p=image.data;
   for(let y=0;y<160;y++)for(let x=0;x<160;x++){const nx=(x-79.5)/78,ny=(y-79.5)/78,q=nx*nx+ny*ny;if(q>1)continue;const z=Math.sqrt(1-q),lat=Math.asin(-ny),lon=Math.atan2(nx,z),grain=noise(Math.floor(lon*105),Math.floor(lat*105));
    let tone=1,diffuse=.22+.78*clamp(-nx*.4-ny*.47+z*.78),base=rgb.slice();
    if(['jupiter','saturn'].includes(id)){const bands=Math.sin(lat*34+Math.sin(lon*7+lat*4)*.45);tone=.86+bands*.12+grain*.06;if(id==='jupiter'){const spot=((nx+.33)/.27)**2+((ny-.32)/.12)**2;if(spot<1){base=[164,101,75];tone=.9+spot*.1;}}}
    else if(id==='venus')tone=.87+Math.sin(lat*22+Math.sin(lon*5)*1.5)*.075+grain*.06;
    else if(id==='uranus')tone=.95+Math.sin(lat*17)*.02+grain*.025;
    else if(id==='neptune')tone=.83+Math.sin(lat*25+Math.sin(lon*8)*.8)*.06+grain*.055;
    else if(id==='sun'){tone=.72+grain*.32+Math.sin(lon*19+lat*32)*.08;diffuse=.85+.15*z;}
    else{tone=.7+grain*.3+(Math.sin(lon*11+lat*5)+Math.sin(lat*18+lon*4))*.065;if(id==='mars'&&Math.abs(ny)>.86)base=[202,197,180];}
    const offset=(y*160+x)*4;for(let i=0;i<3;i++)p[offset+i]=clamp(base[i]*tone*diffuse,0,255);p[offset+3]=Math.round(clamp((1-q)*80)*255);
   }c.putImageData(image,0,0);
   if(['mercury','moon','mars'].includes(id)){c.save();c.beginPath();c.arc(80,80,77,0,TAU);c.clip();for(let i=0;i<22;i++){const x=30+noise(i,2)*100,y=20+noise(i,4)*120,r=2+noise(i,9)*8;c.beginPath();c.ellipse(x,y,r,r*.7,.15,0,TAU);c.fillStyle='#100e0b25';c.fill();c.strokeStyle='#e8dfcb30';c.lineWidth=.7;c.stroke();}c.restore();}
   cache.set(id,canvas);return canvas;
  }catch{return null;}
 }
 function disk(c,x,y,r,colour){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=colour;c.fill();}
 function rings(c,id,x,y,r,front){c.save();c.translate(x,y);c.rotate(id==='uranus'?1.35:-.37);c.scale(1,.3);for(let i=0;i<9;i++){c.beginPath();c.arc(0,0,r*(1.35+i*.045),front?0:Math.PI,front?Math.PI:TAU);c.strokeStyle=id==='saturn'?(i%3?'#cbbb94aa':'#6c634c88'):'#a8d8dd88';c.lineWidth=r*.035;c.stroke();}c.restore();}
 function draw(c,id,x,y,r,time=0){c.save();
  if(id==='blackHole'){c.translate(x,y);c.rotate(-.25);c.scale(1,.7);for(let i=0;i<12;i++){c.beginPath();c.ellipse(0,0,r*(.9+i*.045),r*(.25+i*.008),0,0,TAU);c.strokeStyle=i%2?'#dbb0f9':'#fff2cb';c.globalAlpha=.35+i*.035;c.lineWidth=r*.035;c.stroke();}c.globalAlpha=1;c.scale(1,1/.7);disk(c,0,0,r*.61,'#03020a');c.beginPath();c.arc(0,0,r*.64,0,TAU);c.strokeStyle='#cdb2f6';c.lineWidth=r*.04;c.stroke();c.restore();return true;}
  if(!colours[id]){c.restore();return false;}
  if(id==='saturn'||id==='uranus')rings(c,id,x,y,r,false);
  if(id==='sun'){const glow=c.createRadialGradient(x,y,r*.8,x,y,r*1.4);glow.addColorStop(0,'#ffb43c88');glow.addColorStop(1,'#ffb43c00');disk(c,x,y,r*1.4,glow);}
  const im=texture(id);if(im)c.drawImage(im,x-r,y-r,r*2,r*2);else disk(c,x,y,r,'rgb('+colours[id].join(',')+')');
  if(id==='saturn'||id==='uranus')rings(c,id,x,y,r,true);
  c.restore();return true;
 }
 MM.CosmicPlanets={draw,texture};
})(typeof window!=='undefined'?window:globalThis);
