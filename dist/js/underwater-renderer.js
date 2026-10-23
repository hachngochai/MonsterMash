/* Hải Vực Quên Lãng: reference sprites, suspended combat and shallow-water light.
 * Paint-only module. Simulation owns every timer, projectile and hitbox. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{},W=960,H=540,TAU=Math.PI*2,INK='#102533';
  const files={piranha:'piranha.png',pufferfish:'pufferfish.png',seahorse:'seahorse.png',twinClawFish:'twin-claw-fish.png',
    babyShark:'baby-shark.png',electricJellyfish:'electric-jellyfish.png',phantomJellyfish:'phantom-jellyfish.png',
    hammerhead:'hammerhead.png',electricRay:'electric-ray.png',swordfish:'swordfish.png',megaLondon:'mega-london.png',
    gulper:'gulper.png',ghostShark:'ghost-shark.png',glowBug:'glow-bug.png',leviathan:'leviathan.png',leviathanChild:'leviathan.png',
    seaCrab:'sea-crab.png',pearlClam:'pearl-clam.png',anglerFish:'angler-fish.png',giantSquid:'giant-squid.png',seaTurtle:'sea-turtle.png',kraken:'kraken.png'};
  const types=new Set(Object.keys(files));
  const entries=Object.fromEntries(Object.keys(files).map(key=>[key,{image:null,ready:false,crop:null}]));
  const background={image:null,ready:false};
  const backgrounds={shallow:background,middle:{image:null,ready:false},predator:{image:null,ready:false},deep:{image:null,ready:false},final:{image:null,ready:false}};
  const poses=new WeakMap();
  const script=typeof document!=='undefined'?document.currentScript?.src:null;
  const base=script&&typeof URL==='function'?new URL('../assets/',script).href:'assets/';
  const version=script&&typeof URL==='function'?new URL(script).search:'';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const water=g=>MM.UnderwaterMode?.active?.(g)??g.level?.underwater===true;
  const motion=g=>g.settings?.effects!==false&&!g.settings?.reducedMotion;
  const kind=e=>e.archetype||e.type;
  const jelly=type=>type==='electricJellyfish'||type==='phantomJellyfish';
  const later=type=>!['piranha','pufferfish','seahorse','twinClawFish','babyShark','electricJellyfish','phantomJellyfish'].includes(type);
  const frontal=type=>jelly(type)||['electricRay','seaCrab','pearlClam','glowBug','kraken'].includes(type);
  const tentacled=type=>type==='giantSquid'||type==='kraken';
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
  const artReady=Promise.all([...new Set(Object.values(files))].map(file=>load(base+'sprites/underwater/'+file,image=>{
    const crop=imageBounds(image);for(const key of Object.keys(files))if(files[key]===file)Object.assign(entries[key],{image,ready:true,crop});
  })).concat([
    load(base+'backgrounds/underwater/shallow-ruins.png',image=>setBackground(image)),
    load(base+'backgrounds/underwater/middle-reef.png',image=>setBackground(image,'middle')),
    load(base+'backgrounds/underwater/predator-trench.png',image=>setBackground(image,'predator')),
    load(base+'backgrounds/underwater/deep-chasm.png',image=>setBackground(image,'deep')),
    load(base+'backgrounds/underwater/kraken-grave.png',image=>setBackground(image,'final'))]));

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
    if(!water(g))return false;const animated=motion(g),time=animated?t:0,stage=g.level?.id||151,
      trench=stage>=171,abyssal=stage>=181,bottom=stage>=191,deep=middle(g)||trench,art=bottom?backgrounds.final:abyssal?backgrounds.deep:trench?backgrounds.predator:deep?backgrounds.middle:background;
    c.save();
    if(art.ready){
      const iw=art.image.naturalWidth||art.image.width,ih=art.image.naturalHeight||art.image.height;
      const scale=Math.max(W/iw,H/ih),w=iw*scale,h=ih*scale,drift=animated?Math.sin(time*.18)*3:0;
      c.drawImage(art.image,(W-w)/2-4+drift,(H-h)/2,w+8,h);
      if(trench)rect(c,0,0,W,H,bottom?'#010811c9':abyssal?'#03132977':'#07213822');
      else{const depth=clamp(((g.level?.id||151)-(deep?161:151))/9,0,1);rect(c,0,0,W,H,(deep?'#071832':'#052f49')+Math.round((deep?16:28)+depth*(deep?24:44)).toString(16).padStart(2,'0'));}
    }else fallbackBackground(c,time,animated,deep);
    c.save();c.globalCompositeOperation='screen';
    for(let i=0;i<(abyssal?0:trench?1:deep?3:5);i++){
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
      for(let i=0;i<(bottom?3:7);i++){
        const x=34+i*147,y=471+(i%3)*14,pulse=animated?.65+.2*Math.sin(time*1.1+i):.7;
        glow(c,x,y,34,i%2?'#8872ec':'#43b9dc',.13*pulse);
        ellipse(c,x,y-16,2.1,1.5,i%2?'#c4a4fb':'#a9eaf6');
      }
      for(let i=0;i<(bottom?0:6);i++){
        const x=(i*173+(animated?time*(5+i%3):0))%(W+80)-40,y=88+i*49+(animated?Math.sin(time*.6+i)*6:0);
        c.globalAlpha=.21;poly(c,[[x-5,y],[x+2,y-3],[x+7,y],[x+2,y+3]],'#7ce6e8',null);line(c,[[x-5,y],[x-9,y-3],[x-9,y+3],[x-5,y]],'#a1a1ec',1);
      }c.restore();
    }
    // Background particles are analytic rather than newly allocated objects.
    if(animated)for(let i=0;i<15;i++){
      const x=(i*137+Math.sin(time*.45+i)*9)%W,y=H-((time*(9+i%4)+i*71)%H);
      ellipse(c,x,y,1.2+(i%3)*.45,1.2+(i%3)*.45,null,'#b4ebf445',.8);
    }
    if(trench)for(let i=0;i<6;i++)coral(c,40+i*178,504,.7+(i%3)*.15,bottom?'#10242d':'#174652',time,animated);
    const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#06243600');shade.addColorStop(.72,'#06243600');shade.addColorStop(1,'#04192777');rect(c,0,0,W,H,shade);
    c.restore();return true;
  }
  function fallbackFish(c,type,e,t){
    if(later(type)){fallbackLater(c,type,e,t);return;}
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
  function fallbackLater(c,type,e,t){
    if(type==='pearlClam'){
      poly(c,[[-37,17],[-31,-16],[-15,-30],[8,-33],[32,-19],[39,16],[18,28],[-18,27]],'#3d8294','#142b43',2);
      for(let i=0;i<5;i++)line(c,[[-26+i*13,-17],[i*3-6,18]],'#89bfc9',1.5);
      ellipse(c,0,11,28,11,'#142f45','#8abfc9',2);return;
    }
    if(type==='seaCrab'){
      for(const side of [-1,1]){for(let i=0;i<3;i++)line(c,[[side*17,4+i*6],[side*32,8+i*6],[side*40,19+i*4]],'#527e8c',4);
        poly(c,[[side*17,-4],[side*28,-25],[side*42,-24],[side*34,-12],[side*42,-8],[side*28,1]],'#598b9b','#17303f',2);}
      poly(c,[[-27,-12],[-10,-23],[13,-22],[29,-9],[23,18],[-22,18]],'#3d6b7b','#102736',2);for(const x of [-10,10])rect(c,x-3,-27,6,12,'#a8e2e6',INK,1);return;
    }
    if(tentacled(type)){
      const kraken=type==='kraken',count=kraken?8:6;
      for(let i=0;i<count;i++){const x=(i-(count-1)*.5)*7,sway=Math.sin(t*2+i)*8;
        line(c,[[x,-1],[x*1.4,11],[x*1.7+sway,25],[x*1.5+sway,34]],kraken?'#39506f':'#456988',5);
        line(c,[[x,4],[x*1.4,12],[x*1.7+sway,25]],'#9d89b0',1);}
      poly(c,[[-23,-7],[-23,-25],[-10,-39],[12,-39],[25,-23],[23,-5],[10,5],[-11,4]],kraken?'#405071':'#426480','#101c32',2);
      for(const x of [-10,10])poly(c,[[x-5,-15],[x+5,-13],[x+3,-7],[x-3,-8]],e.krakenEcho?'#ff666c':'#a1eee8',null);return;
    }
    if(type==='electricRay'){
      poly(c,[[-5,-23],[-17,-16],[-41,8],[-29,18],[-8,9],[0,22],[8,9],[29,18],[41,8],[17,-16],[5,-23]],'#385d93','#142739',2);
      line(c,[[0,12],[6,25],[2,40]],'#a19aef',3);for(const side of [-1,1])line(c,[[side*5,-4],[side*18,4],[side*30,8]],'#93c8fd',1.4);return;
    }
    if(type==='glowBug'){
      for(const side of [-1,1])for(let i=0;i<3;i++)line(c,[[side*10,-10+i*10],[side*25,-14+i*12]],'#7bcec4',3);
      poly(c,[[-16,-22],[12,-24],[24,-8],[17,22],[-13,25],[-24,3]],'#27858b','#092e3b',2);ellipse(c,0,5,11,15,'#b1ffcf');return;
    }
    if(type==='seaTurtle'){
      for(const side of [-1,1])for(const y of [-10,12])poly(c,[[side*12,y],[side*29,y-7],[side*33,y+10],[side*14,y+7]],'#477e7e',INK,1.5);
      poly(c,[[-29,-18],[-10,-28],[15,-23],[29,-5],[21,22],[-9,27],[-29,14]],'#49645f',INK,2);poly(c,[[-13,-10],[5,-17],[18,-1],[8,15],[-14,13],[-22,0]],'#6d9480',INK,1.5);
      poly(c,[[20,-9],[39,-6],[44,6],[24,13]],'#7bada0',INK,1.5);rect(c,34,-4,4,4,'#dcf8dc');return;
    }
    // The fallback is used only until the matching local reference cutout has
    // decoded. It never replaces or recolors a successfully loaded drawing.
    const dark=['gulper','anglerFish','megaLondon','leviathan','leviathanChild'].includes(type);
    c.save();c.translate(-26,0);c.rotate(Math.sin(t*6)*.14);poly(c,[[4,-7],[-22,-26],[-16,-2],[-25,20],[4,8]],dark?'#315b70':'#5187a8',INK,2);c.restore();
    poly(c,[[-29,-13],[-6,-23],[23,-22],[43,-7],[44,13],[20,27],[-12,19],[-31,5]],dark?'#294a63':'#688eaa',INK,2);
    poly(c,[[-9,-21],[0,-40],[13,-23]],'#53728a',INK,1.5);poly(c,[[2,5],[42,-5],[42,15],[20,25],[3,16]],'#b4c9c6',INK,1.5);
    const open=type==='gulper'?14:9;poly(c,[[13,1],[43,-5],[41,open+8],[19,19]],'#211c30',INK,1);
    for(let i=0;i<4;i++)poly(c,[[16+i*7,1-i],[23+i*6,-i],[20+i*6,8-i]],'#f4ead2',null);
    rect(c,23,-15,8,6,dark?'#f48374':'#d3f3ff',INK,1);
    if(type==='hammerhead')poly(c,[[24,-18],[40,-26],[48,-16],[39,-9],[26,-6]],'#89b4c3',INK,1.5);
    if(type==='swordfish')poly(c,[[37,-6],[72,-10],[42,1]],'#c1e4ed',INK,1);
    if(type==='anglerFish'){line(c,[[16,-22],[17,-39],[34,-43],[42,-31]],'#55788a',2);ellipse(c,42,-31,5,5,'#aaffdd');}
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
    const us=[0,.2,.4,.65,1],vs=jelly(type)||tentacled(type)?[0,.25,.45,.65,.83,1]:[0,.35,.65,1],x=-width*.5,y=-height*.5;
    const fast=['dash','claw-dash'].includes(e.waterState)||['ram','bite-dash','emerge-bite','pass'].includes(e.predatorState)||e.deepBossState==='bite'||e.krakenState==='bite',phase=t*(fast?19:type==='seahorse'?6:8);
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
      if(later(type)){
        const lower=clamp((v-.38)/.62,0,1),flank=Math.abs(u-.5)*2;
        if(tentacled(type)){du=Math.sin(t*2.2+u*9)*.028*lower*lower;dv=Math.sin(t*2.1+u*8)*.018*lower;}
        else if(type==='electricRay'){du=Math.sin(t*2.8)*.012*flank;dv=Math.sin(t*2.8+u*Math.PI)*.045*flank*flank;}
        else if(type==='seaCrab'){du=Math.sin(t*7+u*6)*.022*lower*flank;dv=Math.sin(t*7+u*8)*.025*lower*flank;}
        else if(type==='pearlClam'){du=0;dv=Math.sin(t*1.8)*.004*Math.sin(v*Math.PI);}
        else if(type==='glowBug'){du=Math.sin(t*8+v*8)*.025*flank;dv=Math.sin(t*8+u*7)*.025*lower;}
        else if(type==='seaTurtle'){du+=Math.sin(t*4.5+u*5)*.015*lower;dv+=Math.sin(t*4.5+u*5)*.036*lower*flank;}
        else{
          const attackState=e.predatorState||e.deepBossState||e.deepState||e.finalState||e.krakenState||'';
          const bite=attackState.includes('bite')||attackState==='ram',open=bite?clamp(e.predatorProgress??e.deepBossProgress??e.deepProgress??e.finalProgress??e.krakenProgress??.5,0,1):0;
          dv+=Math.sin(open*Math.PI)*.06*lower*clamp((u-.5)*2,0,1);
        }
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
    const type=kind(e);if(!water(g)||!types.has(type))return false;
    const pendingFinal=e.predatorRage||e.deepEnraged||e.deepFinal||e.krakenDying&&e.krakenStone;
    if(e.dead||e.retired||e.health<=0&&!pendingFinal||e.predatorHidden)return true;
    const animated=motion(g)&&!(e.petrifiedTime>0),time=animated?t:0,p=animated?pose(e,time):{facing:e.dir<0?-1:1,tilt:0};
    const phase=e.waterClock??e.predatorClock??e.deepClock??e.deepBossClock??e.krakenClock??time,bob=animated?Math.sin(phase*2.2+(e.x||0)*.005)*1.4:0,isJelly=jelly(type),isFrontal=frontal(type);
    c.save();c.translate(e.x,e.y-e.h*.5+bob);
    if(e.phase==='warning'){c.globalAlpha*=.32+.35*(1-clamp((e.warning||0)/2,0,1));if(e.waterTwin)glow(c,0,0,e.w,'#9beefa',.28);}
    if(e.waterState==='split')glow(c,0,0,e.w,'#9beefa',.23);
    if(e.middleSwapWarning||e.middleState==='illusion')glow(c,0,-e.h*.1,e.w*.85,'#9b86ef',.22);
    if(e.middleState==='summon-warning')for(let i=0;i<3;i++){
      const r=e.w*(.35+i*.16)+(animated?(time*31)%24:12);c.save();c.globalAlpha*=.55-i*.12;
      ellipse(c,0,0,r,r*.55,null,i%2?'#bd9ef5':'#9aebff',1.6);c.restore();
    }
    if(e.predatorRage||e.deepEnraged||e.deepFinal)glow(c,0,0,e.w*.75,'#c33d6e',animated?.2+.05*Math.sin(time*8):.2);
    if(e.krakenEcho)glow(c,0,-e.h*.2,e.w*.3,'#dd4a79',.13);
    c.scale(isFrontal?1:Math.abs(p.facing)<.12?(p.facing<0?-.12:.12):p.facing,1);c.rotate(isFrontal?p.tilt*.45:p.tilt);
    if(e.petrifiedTime>0||e.krakenStone)c.filter=e.krakenStone?'grayscale(1) brightness(.78)':'grayscale(1)';
    if(type==='pearlClam'&&e.clamOpen===false){c.translate(0,e.h*.18);c.scale(1,.5);}
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
      if(later(type)){const fit=Math.min(e.w*1.15/crop[2],e.h*1.13/crop[3]);width=crop[2]*fit;height=crop[3]*fit;}
      const attack=e.waterState==='claw-combo'?Math.sin((e.waterClawIndex||0)*2+phase*12)*.025:0;
      c.scale(1+breath+attack,1-breath*.65);
      if(isJelly&&animated&&(e.middleSwapWarning||e.middleSwapProgress>0)){
        const dx=(e.middleSwapFromX??e.x)-e.x,dy=(e.middleSwapFromY??e.y)-e.y;
        for(let i=1;i<=2;i++){c.save();c.globalAlpha*=.09/i;c.drawImage(entry.image,...crop,-width*.5+dx*i*.2,-height*.5+dy*i*.2,width,height);c.restore();}
      }
      if(animated)spriteSurface(c,entry.image,crop,width,height,type,e,time);
      else c.drawImage(entry.image,...crop,-width*.5,-height*.5,width,height);
    }else{c.save();c.scale(e.w/74,e.h/65);fallbackFish(c,type,e,time);c.restore();}
    if(type==='pearlClam'){
      if(e.pearlAvailable===false){
        // The inner mouth is repainted as a dark cavity when its pearl has
        // actually been collected; a baked highlight cannot remain as loot.
        ellipse(c,0,e.h*.045,e.w*.205,e.h*.255,'#173043','#476a7c',1);
      }else{
        glow(c,0,e.h*.025,e.w*.5,'#8effe9',.22);ellipse(c,0,e.h*.025,e.w*.105,e.w*.105,'#d0fff8','#a0ddeb',1.3);
        ellipse(c,-e.w*.025,-e.h*.012,e.w*.027,e.w*.027,'#ffffff');
      }
    }
    if(type==='anglerFish'){
      const retract=clamp(e.lureRetract||0,0,1),lx=e.w*(.37-retract*.12),ly=-e.h*(.57-retract*.24);
      line(c,[[e.w*.06,-e.h*.24],[e.w*.1,-e.h*.62],[lx-e.w*.08,ly-e.h*.05],[lx,ly]],'#73a5b2',1.3);
      glow(c,lx,ly,e.w*.2,'#b5ffbd',animated?.2+.04*Math.sin(time*4):.2);ellipse(c,lx,ly,3.8,3.8,'#d7ffe1');
    }
    if(type==='glowBug')glow(c,0,e.h*.08,e.w*1.4,e.deepState==='explode-warning'?'#fae4a1':'#8ef1cb',.2);
    if(type==='electricRay'&&e.predatorState==='electric-warning'){
      for(const side of [-1,1])line(c,[[side*e.w*.08,-e.h*.1],[side*e.w*.18,e.h*.02],[side*e.w*.32,-e.h*.02]],'#b5c5ff',1.5);
      glow(c,0,0,e.w*.5,'#a4a2ff',.18);
    }
    if(type==='kraken'&&(e.krakenEcho||e.krakenStone))for(const side of [-1,1]){
      const x=side*e.w*.11,y=-e.h*.22;glow(c,x,y,e.w*.065,'#f94e81',.35);ellipse(c,x,y,e.w*.017,e.h*.009,'#ffd4d9');
    }
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
    if(!e.boss&&!isJelly&&!e.indestructible&&e.health<e.maxHealth){rect(c,e.x-18,e.y-e.h-12,36,3,'#072d3f');rect(c,e.x-18,e.y-e.h-12,36*clamp(e.health/e.maxHealth,0,1),3,'#9cded1');}
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
  function caption(c,text,x,y,color='#e3f8f1'){
    c.save();c.font='700 10px "Noto Sans",sans-serif';c.textAlign='center';c.fillStyle=color;
    c.fillText(text,clamp(x,95,W-95),clamp(y,15,H-12));c.restore();
  }
  function dangerBox(c,x,y,w,h,color='#f3c59a',active=false){
    c.save();c.fillStyle=active?'#c69b7030':'#dfb89b0d';c.fillRect(x-w*.5,y-h*.5,w,h);c.strokeStyle=color;c.lineWidth=active?1.8:1.1;
    if(!active)c.setLineDash([5,6]);c.strokeRect(x-w*.5,y-h*.5,w,h);c.restore();
  }
  function electricShot(c,s,t,animated){
    c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy||0,s.vx||1));c.globalCompositeOperation='screen';
    const wiggle=animated?Math.sin(t*37)*3:0;
    line(c,[[-30,0],[-20,wiggle-3],[-13,3-wiggle],[-4,-wiggle],[3,0]],'#7c92ec77',6);
    line(c,[[-26,0],[-18,wiggle-3],[-11,3-wiggle],[-3,-wiggle],[5,0]],'#c9edff',1.5);
    poly(c,[[-8,-3],[2,-6],[10,0],[2,6],[-8,3]],'#d4edff','#9ba6fa',1);glow(c,0,0,22,'#9baff9',.23);c.restore();
  }
  function shipwreck(c,s){
    c.save();c.translate(s.x,s.y);c.rotate(s.rotation||0);const w=s.w||88,h=s.h||46;c.scale(w/88,h/46);
    poly(c,[[-43,-7],[-28,-13],[-4,-10],[18,-14],[42,-8],[30,12],[11,19],[-27,13]],'#74635a','#263944',2);
    poly(c,[[-41,-7],[-24,-4],[-6,-6],[14,-3],[39,-8],[30,1],[11,5],[-24,3]],'#9b8570','#344a55',1);
    for(let i=0;i<4;i++)line(c,[[-26+i*15,-5],[-22+i*14,12]],'#443e3e',2);
    line(c,[[0,-9],[0,-40],[5,-48]],'#9a8a75',3);poly(c,[[3,-37],[24,-32],[18,-23],[22,-16],[3,-20]],'#aab4af','#4b6065',1.2);
    line(c,[[-36,-9],[-29,-23],[-20,-17]],'#b0a08a',2);line(c,[[30,-10],[37,-23]],'#9b8e7a',2);c.restore();
  }
  function drawRoar(c,z,t,animated){
    const range=z.range||480,h=z.height||300,dir=z.dir||1,warning=z.phase==='warning';c.save();c.translate(z.x,z.y);c.scale(dir,1);
    if(warning){
      const gradient=c.createLinearGradient(0,0,range,0);gradient.addColorStop(0,'#d1ad8e22');gradient.addColorStop(1,'#d1ad8e00');rect(c,0,-h*.5,range,h,gradient);
      c.setLineDash([6,7]);c.strokeStyle='#f3cfad99';c.lineWidth=1.1;c.strokeRect(0,-h*.5,range,h);c.setLineDash([]);
      c.save();c.scale(1,h/(range*2));c.beginPath();c.arc(0,0,range,-Math.PI*.5,Math.PI*.5);c.strokeStyle='#e5d2be';c.lineWidth=2;c.stroke();c.restore();
    }else{
      const front=clamp(z.frontRadius??range,0,range);
      for(let i=0;i<4;i++){const r=Math.max(4,front-i*24);if(r>range)continue;c.save();c.globalAlpha*=.55-i*.1;c.scale(1,h/(range*2));c.beginPath();c.arc(0,0,r,-Math.PI*.5,Math.PI*.5);c.strokeStyle=i?'#83d5e7':'#d8f6fb';c.lineWidth=i?2:4;c.stroke();c.restore();}
      if(animated)for(let i=0;i<7;i++){const x=Math.max(0,front-((t*40+i*31)%80)),y=(i/6-.5)*h*.8;line(c,[[x-8,y],[x+6,y]],'#afdff077',1);}
    }c.restore();
    if(warning)caption(c,'ÂM VANG · RỜI VÙNG CẢNH BÁO',z.x+dir*range*.5,z.y-h*.5-9,'#f2d4b8');
  }
  function suction(c,x,y,range,t,animated,warning=false,large=false,dir=1){
    c.save();
    if(warning){c.setLineDash([5,7]);ring(c,x,y,range,'#9dc6e277',1.1);c.setLineDash([]);ring(c,x,y,18,'#e5d3e7',1.5);}
    else{
      glow(c,x,y,large?70:30,large?'#9a6cdc':'#8bc7dd',.2);
      for(let i=0;i<(large?8:5);i++){
        const angle=(i/(large?8:5))*TAU+(animated?t*.5:0),phase=animated?(t*75+i*37)%range:i*31%range,r=range-phase;
        const px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r;
        line(c,[[px,py],[px+Math.cos(angle)*12,py+Math.sin(angle)*12]],large?'#b8b2fa77':'#a2dbe477',large?2:1.2);
      }
      if(large)for(let i=0;i<5;i++){c.save();c.translate(x,y);c.rotate((animated?t*1.9:0)+i*TAU/5);c.beginPath();c.moveTo(65,0);c.bezierCurveTo(50,-35,-12,-40,-8,0);c.strokeStyle='#ae9be5bb';c.lineWidth=2;c.stroke();c.restore();}
    }c.restore();
  }
  function mouthEffect(c,e,t,animated){
    const state=e.finalSeaSummon?e.krakenState:e.predatorState||e.deepBossState||e.deepState||e.finalState||'',warning=state.includes('warning'),biting=['bite','bite-dash','emerge-bite','ram'].includes(state);
    if(!biting&&!warning)return;
    if(!/bite|ram|lord/.test(state))return;
    const vertical=state==='emerge-bite',angle=vertical?-Math.PI/2:e.predatorAttackAngle??(e.dir<0?Math.PI:0),dir=e.dir||1;
    const x=e.x+(vertical?0:dir*e.w*.42),y=e.y-e.h*.5+(vertical?-e.h*.43:0),size=Math.max(18,Math.min(e.w*.22,70));
    c.save();c.translate(x,y);if(vertical)c.rotate(-Math.PI*.5);else c.scale(dir,1);
    if(warning){
      line(c,[[size*.2,-size*.6],[size*.6,-size*.75],[size,-size*.55]],'#ffd3a8',1.5);
      line(c,[[size*.2,size*.6],[size*.6,size*.75],[size,size*.55]],'#ffd3a899',1.2);
    }else{
      const progress=clamp(e.predatorProgress??e.deepBossProgress??e.deepProgress??e.finalProgress??e.krakenProgress??.3,0,1),fade=Math.sin(Math.PI*clamp(progress,.08,.92));
      c.globalAlpha*=fade;c.globalCompositeOperation='screen';
      for(const side of [-1,1]){c.beginPath();c.moveTo(-size*.45,side*size*.5);c.quadraticCurveTo(size*.5,side*size*.9,size*1.05,side*size*.08);c.strokeStyle='#c5f4fc88';c.lineWidth=3;c.stroke();}
      if(animated)for(let i=0;i<5;i++){const phase=(t*39+i*7)%22;ellipse(c,size*.5+phase,(i-2)*size*.23,1.3+i%2,1.3+i%2,null,'#d3f6f9aa',1);}
    }c.restore();
  }
  function drawVent(c,z,t,animated){
    if(z.phase==='idle')return;const w=z.w||60,h=z.h||330,x=z.x,y=z.y||438,warning=z.phase==='warning';
    c.save();
    if(warning){
      dangerBox(c,x,y-h*.5,w,h,'#f2bf8d',false);glow(c,x,y,36,'#f5a46c',.23);
      if(animated)for(let i=0;i<5;i++){const rise=(t*32+i*17)%80;ellipse(c,x+Math.sin(i*3)*w*.2,y-rise,2+i%2,2+i%2,null,'#efcdab99',1);}
      caption(c,'MIỆNG PHUN',x,y-h-8,'#f5cd9f');
    }else{
      const gradient=c.createLinearGradient(0,y,0,y-h);gradient.addColorStop(0,z.damage>1?'#facda6bd':'#c2ecf4a0');gradient.addColorStop(.4,'#94ccdc77');gradient.addColorStop(1,'#c9f6fb11');
      rect(c,x-w*.5,y-h,w,h,gradient);line(c,[[x-w*.5,y],[x-w*.5,y-h]],'#b3e9f278',1);line(c,[[x+w*.5,y],[x+w*.5,y-h]],'#b3e9f278',1);
      if(animated)for(let i=0;i<10;i++){const py=y-((t*230+i*39)%h),px=x+Math.sin(i*4+t*2)*w*.35;line(c,[[px,py+13],[px,py-6]],'#e2faffb8',1.8);}
      glow(c,x,y,44,z.damage>1?'#ffbe90':'#93e4ed',.28);
    }
    poly(c,[[x-w*.55,y+5],[x-w*.4,y-9],[x-w*.15,y-14],[x+w*.08,y-8],[x+w*.3,y-17],[x+w*.53,y+5]],'#263b43','#639ca5',1.5);c.restore();
  }
  function drawTentacle(c,z,t,animated){
    const warning=z.phase==='warning';
    if(warning){dangerBox(c,z.x,z.y,z.w,z.h,'#d1a4e7',false);caption(c,'VÒI GIÁC HÚT · NÉ VÒNG QUẤN',z.x,z.y-z.h*.5-9,'#e7c7f4');}
    else{
      const ox=z.originX??z.x-120,oy=z.originY??z.y,dx=z.x-ox,dy=z.y-oy;
      c.save();c.beginPath();c.moveTo(ox,oy);c.bezierCurveTo(ox+dx*.15,oy+dy*.7+25,z.x-dx*.2,z.y-28,z.x,z.y);
      c.strokeStyle='#183744';c.lineWidth=25;c.lineCap='round';c.stroke();c.strokeStyle='#755d8e';c.lineWidth=18;c.stroke();
      // A live wrap is confined to the simulation's actual target box.
      const rx=z.w*.42,ry=z.h*.42;ellipse(c,z.x,z.y,rx,ry,null,'#8f79a5',11);ellipse(c,z.x,z.y,rx,ry,null,'#d8b1cf',2);
      for(let i=0;i<9;i++){const angle=i*TAU/9+(animated?t*.22:0);ellipse(c,z.x+Math.cos(angle)*rx,z.y+Math.sin(angle)*ry,3.6,2.7,'#d4b8cc','#785d82',1);}
      glow(c,z.x,z.y,Math.max(z.w,z.h)*.5,'#b0a0f3',.13);c.restore();
    }
  }
  function drawLaterEnemyEffects(c,g,e,t,animated,foreground){
    const type=kind(e);if(!later(type)||e.dead||e.retired)return;
    if(!foreground){
      if(type==='swordfish'&&e.phase==='warning'){
        const dir=e.predatorDirection||1,x=e.predatorWarningX??(dir>0?24:936),y=e.y-e.h*.5;
        c.save();c.setLineDash([9,10]);line(c,[[20,y],[940,y]],'#bce4f255',1);c.setLineDash([]);
        for(let i=0;i<3;i++){const px=x+dir*i*13;poly(c,[[px-dir*6,y-10],[px+dir*5,y],[px-dir*6,y+10]],i?'#bee8ef77':'#f2e6bc',null);}
        caption(c,dir>0?'CÁ KIẾM TỪ TRÁI →':'← CÁ KIẾM TỪ PHẢI',clamp(x+dir*85,100,860),y-20);c.restore();
      }
      if(type==='megaLondon'&&['dive-down','dive-hidden'].includes(e.predatorState)){
        const x=e.predatorTargetX??g.player?.x??480,y=422,ready=e.predatorEmergenceLocked||e.predatorState==='dive-down';
        if(ready){ring(c,x,y,38,'#f4d9b8aa',1.5);ring(c,x,y,17,'#f4e5d3aa',1);caption(c,'PHỤC KÍCH · RỜI VÙNG BỌT NƯỚC',x,y-60);}
        if(animated)for(let i=0;i<8;i++){const rise=(t*62+i*13)%75;ellipse(c,x+Math.sin(i*2.3)*24,y-rise,2+i%3,2+i%3,null,'#c9f5fbaa',1);}
      }
      if(type==='gulper'&&['suction-warning','suction'].includes(e.deepState)){
        const range=(MM.DeepSeaConfig?.gulper?.rangeSteps||4)*(MM.DeepSeaConfig?.step||50),x=e.x+(e.dir||1)*e.w*.41,y=e.y-e.h*.5;
        suction(c,x,y,range,t,animated,e.deepState==='suction-warning');
      }
      if(type==='glowBug'&&e.deepState==='explode-warning'){
        const r=MM.DeepSeaConfig?.glowBug?.radius||65;c.save();c.setLineDash([4,5]);ring(c,e.x,e.y-e.h*.5,r,'#f5d5a0',1.2);c.setLineDash([]);glow(c,e.x,e.y-e.h*.5,r,'#e7dfa2',.14);c.restore();
      }
      if(type==='leviathan'&&!e.finalSeaSummon){
        const state=e.deepBossState||'',x=e.x+(e.dir||1)*e.w*.42,y=e.y-e.h*.5;
        if(state==='hole-warning'||state==='hole-pull'||state==='swallow'){
          suction(c,x,y,MM.DeepSeaConfig?.boss?.blackHoleRange||480,t,animated,state==='hole-warning',true,e.dir||1);
          if(state==='swallow')caption(c,'BỊ NUỐT · CẤP OXY, CHUẨN BỊ KHIÊN',e.x,e.y-e.h-20,'#e6d7f6');
        }
        if(state==='lord-warning')ring(c,x,y,MM.DeepSeaConfig?.boss?.lordRange||480,'#d9b8df88',1.3);
        if(state==='swarm'||state==='rebirth')for(let i=0;i<3;i++){
          const r=e.w*(.38+i*.14)+(animated?(t*37)%33:10);ellipse(c,e.x,e.y-e.h*.5,r,r*.3,null,i%2?'#b4c7ef88':'#b4e6ed88',1.5);
        }
        if(e.deepFinal){dangerBox(c,g.player.x,g.player.y-g.player.h*.5,g.player.w+38,g.player.h+30,'#f0c5ec',false);caption(c,'HƠI THỞ CUỐI CÙNG · BẬT KHIÊN',480,35,'#f4d1ee');}
      }
      if(type==='seaCrab'&&e.finalState==='claw-warning')for(const side of [-1,1])dangerBox(c,e.x+side*e.w*.5,e.y-e.h*.65,MM.FinalSeaConfig?.crab?.clawWidth||48,MM.FinalSeaConfig?.crab?.clawHeight||55,'#e9bc9c',false);
      if(type==='giantSquid'&&e.finalState==='tentacle-warning')dangerBox(c,e.finalTargetX,e.finalTargetY,MM.FinalSeaConfig?.squid?.tentacleWidth||95,MM.FinalSeaConfig?.squid?.tentacleHeight||75,'#d2b5ea',false);
      if(type==='kraken'&&e.krakenState==='ship-warning'){
        const dir=Math.sign((e.krakenTargetX??g.player.x)-e.x)||1,x=e.x+dir*e.w*.25,y=e.y-e.h*.35,range=MM.FinalSeaConfig?.boss?.shipRange||320;
        const angle=Math.atan2((e.krakenTargetY??g.player.y)-y,(e.krakenTargetX??g.player.x)-x);
        c.save();c.translate(x,y);c.rotate(angle);c.setLineDash([7,7]);line(c,[[0,0],[range,0]],'#e9d4b5aa',1.3);c.setLineDash([]);c.restore();
        c.save();c.globalAlpha*=.5;shipwreck(c,{x,y:y+35*(1-(e.krakenProgress||0)),w:88,h:46,rotation:animated?Math.sin(t*5)*.05:0});c.restore();
      }
      if(type==='kraken'&&e.krakenState==='fossil'){
        const remain=Math.max(0,e.krakenTimer||0);caption(c,'HÓA THẠCH · '+remain.toFixed(1)+'s · VẪN CÓ THỂ BẮN',e.x,e.y-e.h-10,'#d6c7da');
      }
    }else{
      mouthEffect(c,e,t,animated);
      if(type==='giantSquid'&&e.finalState==='tentacle'){
        const x=e.finalTargetX,y=e.finalTargetY;c.save();c.beginPath();c.moveTo(e.x,e.y-e.h*.3);c.quadraticCurveTo(e.x+(x-e.x)*.5,y-45,x,y);c.strokeStyle='#517290';c.lineWidth=9;c.stroke();line(c,[[x-25,y-7],[x,y+6],[x+25,y-7]],'#aec7d7',2);c.restore();
      }
    }
  }
  function drawEffects(c,g,t=g.time||0,foreground=false){
    if(!water(g))return false;const animated=motion(g);
    c.save();
    for(const z of g.waterZones||[])if(!z.expired){
      if(z.kind==='water-vortex'&&!foreground)drawVortex(c,z,t,animated);
      else if(z.kind==='water-claw'&&foreground)drawClaw(c,z,t);
      else if(z.kind==='middle-plasma'&&foreground===(z.phase==='active'))drawPlasma(c,z,t,animated);
      else if(z.kind==='middle-shock'&&foreground===(z.phase==='active'))drawShock(c,z,t,animated);
      else if(z.kind==='predator-roar'&&foreground===(z.phase==='active'))drawRoar(c,z,t,animated);
      else if(z.kind==='kraken-tentacle'&&foreground===(z.phase==='active'))drawTentacle(c,z,t,animated);
    }
    for(const e of g.enemies||[])drawLaterEnemyEffects(c,g,e,t,animated,foreground);
    if(!foreground){
      for(const cloud of g.finalSea?.inkClouds||[]){
        const r=cloud.radius||80;c.save();c.globalAlpha*=clamp((cloud.life||0)/Math.max(.1,cloud.total||2.5),0,1)*.52;
        for(let i=0;i<4;i++)ellipse(c,cloud.x+Math.sin(i*2)*r*.25,cloud.y+Math.cos(i*3)*r*.16,r*(.8-i*.08),r*(.55-i*.04),'#091622');c.restore();
      }
      for(const z of g.finalSea?.vents||[])if(z.phase==='warning')drawVent(c,z,t,animated);
    }else for(const z of g.finalSea?.vents||[])if(z.phase==='active')drawVent(c,z,t,animated);
    if(foreground){
      for(const shot of g.waterShots||[])if(shot.life>0){
        if(shot.kind==='predator-electric'){electricShot(c,shot,t,animated);continue;}
        if(shot.kind==='kraken-ship'){shipwreck(c,shot);continue;}
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
  // Called after the limited darkness mask: exact telegraphs must remain
  // readable even when Kraken temporarily turns off the starfish lights.
  // Older sea maps use their existing single-pass rendering unchanged.
  function drawMandatoryWarnings(c,g,t=g.time||0){
    if(!water(g)||(g.level?.id||0)<181)return false;const animated=motion(g);c.save();
    for(const z of g.finalSea?.vents||[])if(z.phase!=='idle')drawVent(c,z,t,animated);
    for(const z of g.waterZones||[])if(!z.expired&&z.kind==='kraken-tentacle')drawTentacle(c,z,t,animated);
    for(const e of g.enemies||[])drawLaterEnemyEffects(c,g,e,t,animated,false);
    for(const s of g.waterShots||[])if(s.life>0&&s.kind==='kraken-ship')shipwreck(c,s);
    c.restore();return true;
  }
  MM.UnderwaterRenderer={drawBackground,drawEnemy,drawEffects,drawLoot,drawPlayer,drawMandatoryWarnings,setSprite,setBackground,
    types:[...types],spriteEntries:entries,backgroundEntry:background,backgroundEntries:backgrounds,
    spriteManifest:[...new Set(Object.values(files))].map(file=>'assets/sprites/underwater/'+file),
    backgroundManifest:['assets/backgrounds/underwater/shallow-ruins.png','assets/backgrounds/underwater/middle-reef.png','assets/backgrounds/underwater/predator-trench.png','assets/backgrounds/underwater/deep-chasm.png','assets/backgrounds/underwater/kraken-grave.png'],allArtReady:artReady};
})(typeof window!=='undefined'?window:globalThis);
