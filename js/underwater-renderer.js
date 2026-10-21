/* Hải Vực Quên Lãng: reference sprites, suspended combat and shallow-water light.
 * Paint-only module. Simulation owns every timer, projectile and hitbox. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{},W=960,H=540,TAU=Math.PI*2,INK='#102533';
  const types=new Set(['piranha','pufferfish','seahorse','twinClawFish','babyShark','electricJellyfish','phantomJellyfish']);
  const files={piranha:'piranha.png',pufferfish:'pufferfish.png',seahorse:'seahorse.png',twinClawFish:'twin-claw-fish.png',
    babyShark:'baby-shark.png',electricJellyfish:'electric-jellyfish.png',phantomJellyfish:'phantom-jellyfish.png'};
  const entries=Object.fromEntries(Object.keys(files).map(key=>[key,{image:null,ready:false,crop:null}]));
  const background={image:null,ready:false};
  const backgrounds={shallow:background,middle:{image:null,ready:false}};
  const poses=new WeakMap();
  const script=typeof document!=='undefined'?document.currentScript?.src:null;
  const base=script&&typeof URL==='function'?new URL('../assets/',script).href:'assets/';
  const version=script&&typeof URL==='function'?new URL(script).search:'';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const water=g=>MM.UnderwaterMode?.active?.(g)??g.level?.underwater===true;
  const motion=g=>g.settings?.effects!==false&&!g.settings?.reducedMotion;
  const kind=e=>e.archetype||e.type;
  const jelly=type=>type==='electricJellyfish'||type==='phantomJellyfish';
  const middle=g=>{const range=MM.MiddleSeaConfig?.range;return g.level?.id>=(range?.first||161)&&g.level.id<=(range?.last||170);};
  function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
  function poly(c,points,fill,stroke=INK,width=1.5){path(c,points);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function line(c,points,color,width=1.5){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
  function rect(c,x,y,w,h,fill,stroke,width=1.5){c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.strokeRect(x,y,w,h);}}
  function ellipse(c,x,y,rx,ry,fill,stroke,width=1.5){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function glow(c,x,y,r,color,alpha=.2){const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,color+'00');c.save();c.globalAlpha*=alpha;c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
  function ring(c,x,y,r,color,width=1.5){ellipse(c,x,y,r,r,null,color,width);}
  function imageBounds(image){
    const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
    if(!root.document?.createElement||!w||!h)return [0,0,w,h];
    try{
      // Locate only transparent padding. The sprite is always painted whole:
      // no separated fin, jaw or claw rectangles can expose cutout seams.
      const canvas=root.document.createElement('canvas');canvas.width=w;canvas.height=h;
      const c=canvas.getContext('2d');if(!c?.getImageData)return [0,0,w,h];
      c.drawImage(image,0,0);const rgba=c.getImageData(0,0,w,h).data;
      let left=w,top=h,right=0,bottom=0;
      for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3)if(rgba[(y*w+x)*4+3]>160){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(left>=right||top>=bottom)return [0,0,w,h];
      const pad=Math.max(8,Math.round(Math.max(w,h)*.025));left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(w,right+pad+3);bottom=Math.min(h,bottom+pad+3);
      return [left,top,right-left,bottom-top];
    }catch{return [0,0,w,h];}
  }
  function setSprite(key,image){if(!entries[key])return false;Object.assign(entries[key],{image,ready:!!image&&(image.naturalWidth||image.width)>0,crop:image?imageBounds(image):null});return entries[key].ready;}
  function setBackground(image,key='shallow'){const entry=backgrounds[key];if(!entry)return false;entry.image=image;entry.ready=!!image&&(image.naturalWidth||image.width)>0;return entry.ready;}
  function load(url,done){if(typeof root.Image!=='function')return Promise.resolve();return new Promise(resolve=>{const image=new root.Image();image.decoding='async';image.onload=()=>{done(image);resolve();};image.onerror=()=>resolve();image.src=url+version;});}
  const artReady=Promise.all([...Object.entries(files).map(([key,file])=>load(base+'sprites/underwater/'+file,image=>setSprite(key,image))),
    load(base+'backgrounds/underwater/shallow-ruins.png',image=>setBackground(image)),
    load(base+'backgrounds/underwater/middle-reef.png',image=>setBackground(image,'middle'))]);

  function coral(c,x,y,scale,color,t,animated){
    const bend=animated?Math.sin(t*1.2+x*.01)*3:0;c.save();c.translate(x,y);c.scale(scale,scale);
    poly(c,[[-3,0],[-4,-25],[bend-10,-37],[bend-7,-42],[bend-1,-32],[bend+3,-54],[bend+8,-53],[bend+8,-24],[16,-34],[20,-30],[9,-17],[9,0]],color,'#0b526033',1);c.restore();
  }
  function fallbackBackground(c,t,animated,deep=false){
    const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,deep?'#125288':'#159fc1');bg.addColorStop(.48,deep?'#0a315b':'#0b668a');bg.addColorStop(1,deep?'#061d35':'#082e4e');rect(c,0,0,W,H,bg);
    for(let layer=0;layer<2;layer++){
      c.save();c.globalAlpha=layer?.26:.16;
      for(let i=0;i<7;i++){
        const x=i*166-50+(animated?Math.sin(t*.18)*4*(layer+1):0),height=180+(i*53+layer*41)%160;
        if(deep)poly(c,[[x-24,540],[x-22,280-height],[x+5,250-height],[x+33,273-height],[x+51,218-height],[x+85,260-height],[x+100,540]],layer?'#071f3e':'#1c4162',null);
        else{rect(c,x,455-height,46+layer*15,height,layer?'#164658':'#85bac0');rect(c,x-8,448-height,65,18,layer?'#164658':'#85bac0');}
      }c.restore();
    }
    poly(c,[[0,458],[90,447],[173,470],[280,454],[340,471],[480,455],[620,468],[710,452],[820,461],[960,449],[960,540],[0,540]],'#144551',null);
    for(let i=0;i<11;i++)coral(c,20+i*95,490+(i%3)*12,.55+(i%3)*.18,deep?(i%2?'#376fcb':'#9b69cc'):(i%2?'#2e8f88':'#976a95'),t,animated);
  }
  function drawBackground(c,g,t=g.time||0){
    if(!water(g))return false;const animated=motion(g),time=animated?t:0,deep=middle(g),art=deep?backgrounds.middle:background;
    c.save();
    if(art.ready){
      const iw=art.image.naturalWidth||art.image.width,ih=art.image.naturalHeight||art.image.height;
      const scale=Math.max(W/iw,H/ih),w=iw*scale,h=ih*scale,drift=animated?Math.sin(time*.18)*3:0;
      c.drawImage(art.image,(W-w)/2-4+drift,(H-h)/2,w+8,h);
      const depth=clamp(((g.level?.id||151)-(deep?161:151))/9,0,1);rect(c,0,0,W,H,(deep?'#071832':'#052f49')+Math.round((deep?16:28)+depth*(deep?24:44)).toString(16).padStart(2,'0'));
    }else fallbackBackground(c,time,animated,deep);
    c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<(deep?3:5);i++){
      const x=80+i*205+(animated?Math.sin(time*.25+i)*14:0),beam=c.createLinearGradient(x,0,x+135,H);
      beam.addColorStop(0,'#bceffb21');beam.addColorStop(.6,'#83dbe909');beam.addColorStop(1,'#83dbe900');
      poly(c,[[x-15,0],[x+37,0],[x+(deep?130:195),deep?H*.64:H],[x+75,deep?H*.64:H]],beam,null);
    }
    c.globalAlpha=.16;
    for(let row=0;row<4;row++)for(let i=0;i<6;i++){
      const x=i*190+(row%2)*68+(animated?Math.sin(time*.7+row)*12:0),y=415+row*26;
      line(c,[[x,y],[x+32,y-5],[x+57,y+2],[x+88,y-3]],'#a7eff4',1.2);
    }c.restore();
    if(deep){
      // Bioluminescence stays behind combat sprites and never fills the arena.
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<7;i++){
        const x=34+i*147,y=471+(i%3)*14,pulse=animated?.65+.2*Math.sin(time*1.1+i):.7;
        glow(c,x,y,34,i%2?'#8872ec':'#43b9dc',.13*pulse);
        ellipse(c,x,y-16,2.1,1.5,i%2?'#c4a4fb':'#a9eaf6');
      }
      for(let i=0;i<6;i++){
        const x=(i*173+(animated?time*(5+i%3):0))%(W+80)-40,y=88+i*49+(animated?Math.sin(time*.6+i)*6:0);
        c.globalAlpha=.21;poly(c,[[x-5,y],[x+2,y-3],[x+7,y],[x+2,y+3]],'#7ce6e8',null);line(c,[[x-5,y],[x-9,y-3],[x-9,y+3],[x-5,y]],'#a1a1ec',1);
      }c.restore();
    }
    // Background particles are analytic rather than newly allocated objects.
    if(animated)for(let i=0;i<15;i++){
      const x=(i*137+Math.sin(time*.45+i)*9)%W,y=H-((time*(9+i%4)+i*71)%H);
      ellipse(c,x,y,1.2+(i%3)*.45,1.2+(i%3)*.45,null,'#b4ebf445',.8);
    }
    const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#06243600');shade.addColorStop(.72,'#06243600');shade.addColorStop(1,'#04192777');rect(c,0,0,W,H,shade);
    c.restore();return true;
  }
  function fallbackFish(c,type,e,t){
    const boss=type==='twinClawFish',s=boss?1.15:1,tail=Math.sin(t*(e.waterState==='dash'?20:7))*.16;
    c.save();c.scale(s,s);
    if(jelly(type)){
      const boss=type==='phantomJellyfish';
      poly(c,[[-34,-8],[-30,-24],[-16,-33],[12,-34],[29,-23],[35,-7],[26,2],[-25,2]],boss?'#38528c':'#99c9ec','#102e56',2);
      poly(c,[[-30,-10],[-15,-25],[2,-30],[17,-24],[29,-8],[12,-3],[-13,-3]],boss?'#607db9':'#c3e7f8','#5577b4',1);
      poly(c,[[-30,-7],[-15,-3],[0,-7],[14,-3],[30,-8],[26,3],[12,6],[0,2],[-13,6],[-27,2]],'#a3a4ed','#535a9c',1);
      rect(c,-17,-14,9,5,'#e8fcff');rect(c,8,-14,9,5,'#e8fcff');
      line(c,[[-20,-24],[-9,-17],[0,-23],[9,-17],[21,-23]],'#9eaff4',1);
      for(let i=0;i<(boss?7:5);i++){
        const x=-23+i*(boss?7.7:11.5),sway=Math.sin(t*2.7+i*1.8)*5;
        line(c,[[x,1],[x+sway*.25,11],[x-sway*.6,21],[x+sway,32]],i%2?'#aa94ee':'#6fd7ef',2.6);
      }
    }else if(type==='babyShark'){
      const open=e.middleState==='bite-warning'?.4+.6*clamp(e.middleProgress||0,0,1):e.middleState==='bite'?Math.max(0,1-(e.middleProgress||0)):0;
      c.save();c.translate(-26,0);c.rotate(tail);poly(c,[[5,-7],[-12,-23],[-10,-4],[-17,16],[4,7]],'#788fa9');c.restore();
      poly(c,[[-28,-9],[-12,-16],[0,-15],[2,-32],[14,-17],[28,-14],[41,-6],[42,9],[19,18],[-10,14],[-29,7]],'#7994a6');
      poly(c,[[-15,3],[12,1],[40,-3],[40,9+open*5],[18,18+open*4],[-6,12]],'#c2d7dc');
      poly(c,[[13,1],[41,-3],[39,9+open*5],[21,14+open*4],[12,8]],'#233749');
      for(let i=0;i<4;i++)poly(c,[[15+i*6,1-i],[20+i*6,-i],[18+i*6,6-i*.5]],'#f3edce',null);
      for(let i=0;i<3;i++)poly(c,[[20+i*6,11+open*4-i],[25+i*6,9+open*4-i],[22+i*6,5+open*4-i]],'#f3edce',null);
      poly(c,[[-5,3],[4,9],[-1,23],[-12,8]],'#577c93');
      rect(c,22,-10,7,5,'#d8f8ff','#223c50',1);rect(c,26,-9,3,4,'#18334b');
      for(let i=0;i<3;i++)line(c,[[6-i*4,-4],[5-i*4,3]],'#344f63',1);
    }else if(type==='seahorse'){
      poly(c,[[-10,-31],[2,-38],[15,-28],[12,-15],[5,-6],[4,9],[-1,18],[-8,22],[-15,18],[-15,10],[-9,8],[-6,13],[-2,12],[-3,6],[-14,-3],[-20,-16]],'#298ba4');
      poly(c,[[6,-27],[31,-23],[31,-14],[10,-18]],'#5ec6d9');rect(c,27,-22,7,7,'#122c3c','#79eff2',1);
      for(let i=0;i<5;i++)rect(c,-12,-9+i*5,12,4,'#e3d1a6');
      for(let i=0;i<4;i++)poly(c,[[-14,-22+i*9],[-25,-26+i*9],[-17,-14+i*9]],'#d9b366');
      rect(c,4,-31,9,9,'#f4e1b8',INK);rect(c,8,-29,4,5,'#163241');
    }else if(type==='pufferfish'){
      poly(c,[[-22,-19],[-10,-29],[12,-29],[26,-13],[26,12],[13,25],[-11,25],[-26,8]],'#69b3a9');
      poly(c,[[-21,-2],[22,-4],[24,14],[9,25],[-10,24],[-24,9]],'#e2d8b3');
      for(let i=0;i<10;i++){const angle=i*TAU/10,xx=Math.cos(angle)*26,yy=Math.sin(angle)*26;poly(c,[[xx-4,yy+3],[xx+Math.cos(angle)*11,yy+Math.sin(angle)*11],[xx+4,yy-3]],'#e8c36f',INK,1);}
      for(const x of [1,18]){rect(c,x-6,-13,13,14,'#f6f1d6',INK);rect(c,x+1,-9,5,7,'#122c36');}rect(c,20,2,10,10,'#d66b45',INK);
    }else{
      c.save();c.translate(-22,0);c.rotate(tail);poly(c,[[3,-8],[-26,-24],[-20,-1],[-30,19],[4,9]],'#b64f64');c.restore();
      poly(c,[[-26,-14],[-9,-26],[20,-23],[34,-11],[38,14],[17,27],[-13,21],[-29,7]],'#20677e');
      poly(c,[[-12,-23],[-7,-38],[4,-25],[14,-39],[18,-23]],'#a34b64');
      poly(c,[[-5,7],[36,-1],[35,16],[19,27],[-5,18]],'#b6c3b8');
      poly(c,[[6,-7],[37,-9],[36,14],[18,23],[5,17]],'#772b39');
      for(let i=0;i<4;i++){poly(c,[[7+i*8,-7],[14+i*7,-8],[11+i*7,4]],'#f5e1b7',INK,1);if(i<3)poly(c,[[10+i*8,18],[17+i*8,19],[14+i*8,9]],'#f5e1b7',INK,1);}
      poly(c,[[5,-24],[22,-22],[18,-11],[7,-12]],'#e9aa72');rect(c,14,-20,5,6,'#f25138');
      if(boss){
        const swing=e.waterState==='claw-combo'?Math.sin(t*18)*.4:Math.sin(t*2)*.08;
        for(const side of [-1,1]){c.save();c.translate(side<0?-8:22,6);c.rotate(side*swing);poly(c,[[-7,-8],[9,-5],[18,13],[9,24],[-7,16]],'#786082');for(let j=0;j<3;j++)poly(c,[[5+j*5,15],[10+j*5,30],[17+j*4,13]],'#e7dbc0',INK,1);c.restore();}
      }
    }c.restore();
  }
  function drawJellyTendrils(c,width,height,e,t,animated){
    const boss=kind(e)==='phantomJellyfish',count=boss?9:6;
    const shock=['shock-warning','shock'].includes(e.middleState),power=shock?1.55:1;
    c.save();c.globalAlpha*=boss?.78:.65;
    for(let i=0;i<count;i++){
      const x=(i/(count-1)-.5)*width*.68,phase=t*2.4+i*1.73;
      const sway=animated?Math.sin(phase)*width*.045:0,end=height*(.39+(i%3)*.025);
      const points=[[x,-height*.12],[x+sway*.25,height*.05],[x-sway*.55,height*.2],[x+sway,end]];
      line(c,points,i%2?'#9b86e355':'#58cbe855',boss?5:3);
      line(c,points,i%2?'#c6abf7':'#91eff7',(boss?1.6:1)*power);
      if(boss&&i%2===0)poly(c,[[x+sway-3,end-4],[x+sway,end+5],[x+sway+3,end-4]],shock?'#f1e3ff':'#a9e5ff',null);
      if(animated&&Math.sin(phase*2.1)>.68){
        const y=height*.12,jitter=Math.sin(phase*3)*3;
        line(c,[[x+sway*.1,y-8],[x+jitter+4,y-2],[x+jitter-3,y+3],[x+sway*.4,y+11]],'#d7f5ff',.9);
      }
    }c.restore();
  }
  function pose(e,t){
    let p=poses.get(e);if(!p||t<p.time){p={time:t,facing:e.dir<0?-1:1,tilt:0};poses.set(e,p);}
    const dt=clamp(t-p.time,0,.1),blend=1-Math.exp(-dt*10);p.time=t;
    p.facing+=((e.dir<0?-1:1)-p.facing)*blend;
    const target=clamp((e.vy||0)/400,-.12,.12)+(e.waterState==='claw-dash'?.05:0);
    p.tilt+=(target-p.tilt)*blend;return p;
  }
  function spriteSurface(c,image,crop,width,height,type,e,t){
    const us=[0,.2,.4,.65,1],vs=jelly(type)?[0,.25,.45,.65,.83,1]:[0,.35,.65,1],x=-width*.5,y=-height*.5;
    const fast=['dash','claw-dash'].includes(e.waterState),phase=t*(fast?19:type==='seahorse'?6:8);
    const swing=Math.sin(phase),claw=e.waterState==='claw-combo'?Math.sin(t*16+(e.waterClawIndex||0)*1.8):Math.sin(t*2)*.18;
    const rows=vs.map(v=>us.map(u=>{
      const tail=Math.pow(clamp((.43-u)/.43,0,1),2),low=clamp((v-.52)/.48,0,1);
      let du=swing*.017*tail*Math.sin(v*Math.PI),dv=swing*.036*tail;
      if(type==='seahorse'){du=swing*.037*low*low;dv=0;}
      if(type==='twinClawFish'){
        const hand=low*clamp((u-.25)/.3,0,1);
        du+=claw*.027*hand*(u<.65?1:-1);dv+=claw*.02*hand;
      }
      if(type==='babyShark'){
        const open=e.middleState==='bite-warning'?.4+.6*clamp(e.middleProgress||0,0,1):e.middleState==='bite'?Math.max(0,1-(e.middleProgress||0)):0;
        dv+=open*.055*low*clamp((u-.55)/.45,0,1);du+=swing*.008*tail;
      }
      if(jelly(type)){
        // One shared surface bends the complete art; no detached rectangular limbs.
        const lower=clamp((v-.38)/.62,0,1),pulse=Math.sin(t*2.4);
        du=Math.sin(t*2.4+u*11)*.024*lower*lower;
        dv=pulse*.014*(1-lower)*Math.sin(v*Math.PI);
      }
      return {sx:x+u*width,sy:y+v*height,dx:x+(u+du)*width,dy:y+(v+dv)*height};
    }));
    const triangle=(a,b,d)=>{
      const determinant=(b.sx-a.sx)*(d.sy-a.sy)-(d.sx-a.sx)*(b.sy-a.sy);if(Math.abs(determinant)<1e-8)return;
      const aa=((b.dx-a.dx)*(d.sy-a.sy)-(d.dx-a.dx)*(b.sy-a.sy))/determinant;
      const bb=((b.dy-a.dy)*(d.sy-a.sy)-(d.dy-a.dy)*(b.sy-a.sy))/determinant;
      const cc=((d.dx-a.dx)*(b.sx-a.sx)-(b.dx-a.dx)*(d.sx-a.sx))/determinant;
      const dd=((d.dy-a.dy)*(b.sx-a.sx)-(b.dy-a.dy)*(d.sx-a.sx))/determinant;
      const cx=(a.dx+b.dx+d.dx)/3,cy=(a.dy+b.dy+d.dy)/3;c.save();c.beginPath();
      for(const [i,v]of[a,b,d].entries()){
        const length=Math.max(.001,Math.hypot(v.dx-cx,v.dy-cy)),xx=v.dx+(v.dx-cx)/length*.4,yy=v.dy+(v.dy-cy)/length*.4;
        if(i)c.lineTo(xx,yy);else c.moveTo(xx,yy);
      }
      c.closePath();c.clip();c.transform(aa,bb,cc,dd,a.dx-aa*a.sx-cc*a.sy,a.dy-bb*a.sx-dd*a.sy);
      const left=Math.max(x,Math.min(a.sx,b.sx,d.sx)-1),top=Math.max(y,Math.min(a.sy,b.sy,d.sy)-1);
      const right=Math.min(x+width,Math.max(a.sx,b.sx,d.sx)+1),bottom=Math.min(y+height,Math.max(a.sy,b.sy,d.sy)+1);
      c.drawImage(image,crop[0]+(left-x)/width*crop[2],crop[1]+(top-y)/height*crop[3],
        (right-left)/width*crop[2],(bottom-top)/height*crop[3],left,top,right-left,bottom-top);c.restore();
    };
    for(let row=0;row<rows.length-1;row++)for(let col=0;col<rows[row].length-1;col++){
      const a=rows[row][col],b=rows[row][col+1],d=rows[row+1][col],e=rows[row+1][col+1];triangle(a,b,d);triangle(b,e,d);
    }
  }
  function drawEnemy(c,g,e,t=g.time||0){
    const type=kind(e);if(!water(g)||!types.has(type))return false;if(e.dead||e.health<=0)return true;
    const animated=motion(g)&&!(e.petrifiedTime>0),time=animated?t:0,p=animated?pose(e,time):{facing:e.dir<0?-1:1,tilt:0};
    const phase=e.waterClock??time,bob=animated?Math.sin(phase*2.2+(e.x||0)*.005)*1.4:0,isJelly=jelly(type);
    c.save();c.translate(e.x,e.y-e.h*.5+bob);
    if(e.phase==='warning'){c.globalAlpha*=.32+.35*(1-clamp((e.warning||0)/2,0,1));if(e.waterTwin)glow(c,0,0,e.w,'#9beefa',.28);}
    if(e.waterState==='split')glow(c,0,0,e.w,'#9beefa',.23);
    if(e.middleSwapWarning||e.middleState==='illusion')glow(c,0,-e.h*.1,e.w*.85,'#9b86ef',.22);
    if(e.middleState==='summon-warning')for(let i=0;i<3;i++){
      const r=e.w*(.35+i*.16)+(animated?(time*31)%24:12);c.save();c.globalAlpha*=.55-i*.12;
      ellipse(c,0,0,r,r*.55,null,i%2?'#bd9ef5':'#9aebff',1.6);c.restore();
    }
    c.scale(isJelly?1:Math.abs(p.facing)<.12?(p.facing<0?-.12:.12):p.facing,1);c.rotate(isJelly?p.tilt*.45:p.tilt);
    if(e.petrifiedTime>0)c.filter='grayscale(1)';
    if(e.hit>0&&animated)c.globalAlpha*=.9;
    const entry=entries[type],crop=entry?.crop;
    let visualWidth=e.w*1.18,visualHeight=e.h*1.12;
    if(isJelly&&crop){const fit=Math.min(e.w*1.28/crop[2],e.h*1.12/crop[3]);visualWidth=crop[2]*fit;visualHeight=crop[3]*fit;}
    if(isJelly)drawJellyTendrils(c,visualWidth,visualHeight,e,time,animated);
    if(entry?.ready&&crop){
      const aspect=crop[2]/crop[3],breath=animated?Math.sin(phase*(type==='piranha'?8:2.6))*.012:0;
      let width=e.w*1.18,height=width/aspect;
      if(type==='seahorse'){height=e.h*1.18;width=height*aspect;}
      if(type==='pufferfish'){height=e.h*1.18;width=height*aspect;}
      if(type==='twinClawFish'){width=e.w*1.28;height=width/aspect;}
      if(isJelly){width=visualWidth;height=visualHeight;}
      const attack=e.waterState==='claw-combo'?Math.sin((e.waterClawIndex||0)*2+phase*12)*.025:0;
      c.scale(1+breath+attack,1-breath*.65);
      if(isJelly&&animated&&(e.middleSwapWarning||e.middleSwapProgress>0)){
        const dx=(e.middleSwapFromX??e.x)-e.x,dy=(e.middleSwapFromY??e.y)-e.y;
        for(let i=1;i<=2;i++){c.save();c.globalAlpha*=.09/i;c.drawImage(entry.image,...crop,-width*.5+dx*i*.2,-height*.5+dy*i*.2,width,height);c.restore();}
      }
      if(animated)spriteSurface(c,entry.image,crop,width,height,type,e,time);
      else c.drawImage(entry.image,...crop,-width*.5,-height*.5,width,height);
    }else{c.save();c.scale(e.w/74,e.h/65);fallbackFish(c,type,e,time);c.restore();}
    if(e.tell){
      if(type==='seahorse'){ring(c,e.w*.45,-e.h*.15,8+Math.sin(time*9)*2,'#b1f9ff',2);glow(c,e.w*.45,-e.h*.15,18,'#81eaf7',.3);}
      else if(type==='piranha'||type==='twinClawFish'||type==='babyShark'){line(c,[[e.w*.15,-e.h*.2],[e.w*.45,-e.h*.3]],'#ffd2a1',2);}
    }
    if(type==='phantomJellyfish'&&['laser-warning','laser'].includes(e.middleState)){
      const pulse=animated?1+.15*Math.sin(time*18):1;
      for(const side of [-1,1]){const x=side*visualWidth*.16,y=-visualHeight*.26;
        glow(c,x,y,visualWidth*.16*pulse,'#bb9cff',.42);ellipse(c,x,y,visualWidth*.038,visualHeight*.016,'#ecf8ff');
      }
    }
    if(e.waterSilenceTimer>0){
      const radius=e.w*.42+(animated?Math.sin(time*8)*3:0);
      ring(c,e.w*.18,-e.h*.12,radius,'#c9aeed99',1.4);
      ring(c,e.w*.18,-e.h*.12,radius*.68,'#e4c7fa88',1);
    }
    if(animated&&['dash','claw-dash'].includes(e.waterState))for(let i=0;i<4;i++)line(c,[[-e.w*.7-14-i*7,(i-1.5)*e.h*.16],[-e.w*.5-4,(i-1.5)*e.h*.13]],'#9beaf677',1.3);
    if(type==='babyShark'&&animated&&Math.abs(e.vx||0)>65)for(let i=0;i<3;i++){
      const r=(time*31+i*11)%38;ellipse(c,-e.w*.6-r,(i-1)*6+Math.sin(time*5+i)*2,1.2+i*.4,1.2+i*.4,null,'#bee8ef66',.7);
    }
    c.restore();
    if(!e.boss&&!isJelly&&e.health<e.maxHealth){rect(c,e.x-18,e.y-e.h-12,36,3,'#072d3f');rect(c,e.x-18,e.y-e.h-12,36*clamp(e.health/e.maxHealth,0,1),3,'#9cded1');}
    return true;
  }
  function drawPlayer(c,g,t,draw){
    if(!water(g)||typeof draw!=='function')return false;const p=g.player;
    c.save();c.translate(p.x,p.y-p.h*.5);c.rotate(motion(g)?clamp(p.swimTilt||0,-.22,.22):0);c.translate(-p.x,-p.y+p.h*.5);
    draw(c,p,t,motion(g),g);c.restore();return true;
  }
  function drawVortex(c,z,t,animated){
    const warning=z.phase==='warning',x=warning?(z.targetX??z.x):z.x,y=warning?(z.targetY??z.y):z.y;
    const radius=z.radius||170,core=z.coreRadius||30,progress=clamp(1-(z.timer||0)/Math.max(.001,z.total||1),0,1);
    c.save();
    if(warning){
      c.setLineDash([6,7]);ring(c,x,y,radius,'#7bd9e64d',1.3);c.setLineDash([]);ring(c,x,y,core,'#ffd3a1',2);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;line(c,[[x+Math.cos(a)*(core+9),y+Math.sin(a)*(core+9)],[x+Math.cos(a)*(core+20),y+Math.sin(a)*(core+20)]],'#f9ddb8',2);}
      c.font='600 10px "Noto Sans",sans-serif';c.textAlign='center';c.fillStyle='#d7f8ee';c.fillText('CẦU XOÁY · NÉ TÂM',x,y-radius-9);
      ring(c,x,y,core+10+(1-progress)*12,'#a9f6ed88',1.2);
    }else{
      const scale=z.phase==='travel'?.28+.35*progress:1;c.translate(x,y);c.scale(scale,scale);
      glow(c,0,0,radius,'#55cddd',.12);ellipse(c,0,0,radius,radius,'#164e7120','#76e1ef55',1);
      for(let i=0;i<6;i++){
        c.save();c.rotate((animated?t*1.8:0)+i*TAU/6);c.beginPath();c.moveTo(radius*.9,0);c.bezierCurveTo(radius*.65,-radius*.52,-radius*.04,-radius*.7,-core*.45,0);c.strokeStyle=i%2?'#b6f7f88a':'#58bfdf99';c.lineWidth=2;c.stroke();c.restore();
      }
      const center=c.createRadialGradient(0,0,0,0,0,core);center.addColorStop(0,'#e5feffe0');center.addColorStop(.4,'#6bd9eecc');center.addColorStop(1,'#0e648877');ellipse(c,0,0,core,core,center,'#cdfcff',1.5);
      if(animated)for(let i=0;i<8;i++){const a=t*(1+i%3*.3)+i*.8,r=core+((i*31+t*42)%(radius-core));ellipse(c,Math.cos(a)*r,Math.sin(a)*r,2,2,null,'#bbf5f788',1);}
    }c.restore();
  }
  function drawClaw(c,z,t){
    const progress=clamp(1-(z.timer||0)/Math.max(.001,z.total||.35),0,1),dir=z.dir||1;
    c.save();c.translate(z.x,z.y);c.scale(dir,1);c.globalAlpha*=Math.sin(Math.PI*clamp(progress,.05,.95));
    for(let i=0;i<3;i++){
      const offset=(i-1)*13,shift=progress*18;
      line(c,[[-z.w*.4+shift,-z.h*.35+offset],[-z.w*.05+shift,-z.h*.11+offset],[z.w*.35,z.h*.29+offset]],'#78dcf688',8-i);
      line(c,[[-z.w*.4+shift,-z.h*.35+offset],[-z.w*.05+shift,-z.h*.11+offset],[z.w*.35,z.h*.29+offset]],'#e7fbff',2.5);
    }c.restore();
  }
  function drawPlasma(c,z,t,animated){
    const range=z.range||480,width=z.width||18,warning=z.phase==='warning';
    const progress=clamp(1-(z.timer||0)/Math.max(.001,z.total||1),0,1);
    c.save();c.translate(z.x,z.y);c.rotate(z.angle||0);
    if(warning){
      c.fillStyle='#b791f20d';c.fillRect(0,-width*.5,range,width);
      c.setLineDash([9,8]);c.strokeStyle='#cfb5fb99';c.lineWidth=1;c.beginPath();c.moveTo(0,-width*.5);c.lineTo(range,-width*.5);
      c.arc(range,0,width*.5,-Math.PI*.5,Math.PI*.5);c.lineTo(0,width*.5);c.arc(0,0,width*.5,Math.PI*.5,Math.PI*1.5);c.closePath();c.stroke();c.setLineDash([]);
      c.beginPath();c.moveTo(0,0);c.lineTo(range,0);c.strokeStyle='#aee8f7bb';c.lineWidth=.8;c.lineCap='butt';c.stroke();
      glow(c,0,0,16+progress*14,'#b19bff',.22+progress*.15);
    }else{
      c.save();c.globalCompositeOperation='screen';
      // The solid beam is exactly the simulation capsule: no random aim offsets.
      const beam=c.createLinearGradient(0,0,range,0);beam.addColorStop(0,'#fbf4ff');beam.addColorStop(.22,'#d3b1ff');beam.addColorStop(1,'#66ccea');
      c.beginPath();c.moveTo(0,0);c.lineTo(range,0);c.lineCap='round';c.strokeStyle='#b57cf22a';c.lineWidth=width*1.7;c.stroke();
      c.strokeStyle=beam;c.lineWidth=width;c.stroke();c.strokeStyle='#f3faff';c.lineWidth=width*.26;c.stroke();
      glow(c,0,0,width*2.2,'#bca3fb',.38);
      if(animated)for(let i=0;i<8;i++){
        const x=range*(i+.5)/8,side=i%2?1:-1,y=side*(width*.65+((t*43+i*13)%19));
        line(c,[[x-4,y],[x,y+side*3],[x+4,y-1]],'#c5b7ff99',1);
        ellipse(c,x+6,y+side*7,1.2,1.2,null,'#9ce8fa88',.8);
      }c.restore();
    }c.restore();
  }
  function drawShock(c,z,t,animated){
    const w=z.w||150,h=z.h||110,warning=z.phase==='warning';c.save();c.translate(z.x,z.y-h*.5);
    if(warning){
      c.fillStyle='#c9a4ef0c';c.fillRect(-w*.5,-h*.5,w,h);c.setLineDash([5,6]);
      c.strokeStyle='#bcaffb99';c.lineWidth=1.2;c.strokeRect(-w*.5,-h*.5,w,h);c.setLineDash([]);
      ring(c,0,0,11,'#c7bcfa',1.2);
    }else{
      c.globalCompositeOperation='screen';glow(c,0,0,Math.max(w,h)*.55,'#8e81ea',.16);
      for(let i=0;i<5;i++){
        const x=(i/4-.5)*w*.8,sway=animated?Math.sin(t*23+i)*w*.05:0;
        line(c,[[x,-h*.5],[x+sway+4,-h*.22],[x-sway-5,h*.1],[x+sway,h*.46]],'#9377ee77',4);
        line(c,[[x,-h*.5],[x+sway+4,-h*.22],[x-sway-5,h*.1],[x+sway,h*.46]],'#e0eeff',1.1);
      }
    }c.restore();
  }
  function drawEffects(c,g,t=g.time||0,foreground=false){
    if(!water(g))return false;const animated=motion(g);
    c.save();
    for(const z of g.waterZones||[])if(!z.expired){
      if(z.kind==='water-vortex'&&!foreground)drawVortex(c,z,t,animated);
      else if(z.kind==='water-claw'&&foreground)drawClaw(c,z,t);
      else if(z.kind==='middle-plasma'&&foreground===(z.phase==='active'))drawPlasma(c,z,t,animated);
      else if(z.kind==='middle-shock'&&foreground===(z.phase==='active'))drawShock(c,z,t,animated);
    }
    if(foreground){
      for(const shot of g.waterShots||[])if(shot.life>0){
        const angle=Math.atan2(shot.vy||0,shot.vx||1);c.save();c.translate(shot.x,shot.y);c.rotate(angle);
        if(animated)line(c,[[-32,0],[0,0]],'#78e9fa66',8);
        poly(c,[[-14,-4],[5,-5],[13,0],[5,5],[-14,4],[-9,0]],'#c4fcff','#4ab9d9',1.2);c.restore();
      }
      const bubbles=g.underwater?.bubbles||[],limit=Math.min(bubbles.length,MM.UnderwaterConfig?.particles?.limit||64);
      if(animated)for(let index=0;index<limit;index++){
        const b=bubbles[index];if(b.life<=0)continue;c.save();c.globalAlpha*=clamp(b.life/Math.max(.01,b.maxLife||1),0,1)*.75;
        ellipse(c,b.x,b.y,b.size||2,b.size||2,'#a1eefa15','#b9f7ff',.85);ellipse(c,b.x-(b.size||2)*.3,b.y-(b.size||2)*.35,.6,.6,'#efffff');c.restore();
      }
      if(g.underwater?.silenceTime>0&&g.player){
        const p=g.player;ring(c,p.x,p.y-p.h-13,9,'#e4afff',1.5);line(c,[[p.x-6,p.y-p.h-19],[p.x+6,p.y-p.h-7]],'#e4afff',2);
      }
      if(g.player?.stunStyle==='electric'&&g.player.stunTime>0){
        const p=g.player;c.save();c.globalCompositeOperation='screen';
        for(let i=0;i<4;i++){
          const side=i%2?1:-1,x=p.x+side*(p.w*.55+3),y=p.y-p.h+i*p.h*.25,jitter=animated?Math.sin(t*26+i)*4:0;
          line(c,[[x,y],[x+side*5+jitter,y+6],[x-side*3,y+11],[x+side*3+jitter,y+16]],'#b9d9ff',1.2);
        }
        if(animated&&p.stunTime>2.86){c.globalAlpha*=.045;rect(c,0,0,W,H,'#b8cbff');}
        c.restore();
      }
    }
    c.restore();return true;
  }
  function drawLoot(c,g,t=g.time||0){
    if(!water(g))return false;c.save();
    for(const box of g.underwater?.oxygenCrates||[]){
      if(box.life<=0)continue;const x=box.x,y=box.y;
      if(motion(g))glow(c,x,y-15,30,'#79e9f1',.13+.03*Math.sin(t*3));
      poly(c,[[x-17,y-29],[x+12,y-29],[x+17,y-23],[x+17,y],[x-17,y]],'#236e96',INK,2);
      rect(c,x-13,y-25,25,21,'#69c3cc','#acdfe0',1);rect(c,x-17,y-29,4,29,'#537a78');rect(c,x+13,y-24,4,24,'#174a69');
      c.fillStyle='#063a54';c.font='800 12px "Noto Sans",sans-serif';c.textAlign='center';c.fillText('O₂',x,y-10);ring(c,x-6,y-20,2,'#d3ffff',1);
    }c.restore();return true;
  }
  MM.UnderwaterRenderer={drawBackground,drawEnemy,drawEffects,drawLoot,drawPlayer,setSprite,setBackground,
    types:[...types],spriteEntries:entries,backgroundEntry:background,backgroundEntries:backgrounds,
    spriteManifest:Object.values(files).map(file=>'assets/sprites/underwater/'+file),
    backgroundManifest:['assets/backgrounds/underwater/shallow-ruins.png','assets/backgrounds/underwater/middle-reef.png'],allArtReady:artReady};
})(typeof window!=='undefined'?window:globalThis);
