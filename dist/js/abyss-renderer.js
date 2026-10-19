/* Ancient Abyss: reference-matched transparent character art and 2D caves. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, H = 540, FLOOR = 438, TAU = Math.PI * 2;
  const INK = '#11131e';
  const COLORS = ['#ef5948', '#d867f4', '#6cddff', '#b58aff', '#e9bd6e'];
  const TYPES = new Set(['minotaurCalf','parasite','littleTurtle','abyssCrow','lanternSkeleton','clayGuard','ancientHand','tombSpirit','minotaurLord','flowerDemon','mirrorTurtle','fossilRoc','thousandHands']);
  const staticScenes = new Map();
  const flameTransitions = new WeakMap();
  const visualStates = new WeakMap();
  const facingStates = new WeakMap();
  let visualSeed = 0;
  // Each image is decoded once. Native drawings stay visible until its artwork
  // has loaded, and remain the fallback if an image cannot be decoded.
  const spriteFiles={minotaur:'minotaur.png',flower:'flower.png',turtle:'turtle.png',deity:'thousand-hands.png',roc:'fossil-roc.png',knight:'roc-knight.png'};
  const spriteEntries=Object.fromEntries(Object.keys(spriteFiles).map(key=>[key,{image:null,ready:false}]));
  const scriptURL=typeof document!=='undefined'?document.currentScript?.src:null;
  const spriteBase=scriptURL&&typeof URL==='function'?new URL('../assets/sprites/abyss/',scriptURL).href:'assets/sprites/abyss/';
  const spriteVersion=scriptURL&&typeof URL==='function'?new URL(scriptURL).search:'?v=4.0.0';
  const spriteReady=Promise.all(Object.entries(spriteFiles).map(([key,file])=>{
    if(typeof root.Image!=='function')return Promise.resolve();
    return new Promise(resolve=>{
      const image=new root.Image(),entry=spriteEntries[key];entry.image=image;image.decoding='async';
      image.onload=()=>{entry.ready=(image.naturalWidth||image.width)>0;resolve();};
      image.onerror=()=>{entry.ready=false;resolve();};image.src=spriteBase+file+spriteVersion;
    });
  }));
  const spriteManifest=Object.values(spriteFiles).map(file=>'assets/sprites/abyss/'+file);
  const backgroundNames=['labyrinth','parasite','lake','echo','tomb'];
  // Source ledges differ between the five approved reference paintings. Their
  // measured top edges all map to the same gameplay floor, without stretching
  // pillars, arches or crystals in the distant wall.
  const backgroundLayouts={
    labyrinth:{width:1672,height:941,floorY:775},parasite:{width:1672,height:941,floorY:640},
    lake:{width:1672,height:941,floorY:625},echo:{width:1672,height:941,floorY:680},tomb:{width:1672,height:941,floorY:714}
  };
  const backgroundEntries=Object.fromEntries(backgroundNames.map(key=>[key,{image:null,ready:false}]));
  const backgroundBase=scriptURL&&typeof URL==='function'?new URL('../assets/backgrounds/abyss/',scriptURL).href:'assets/backgrounds/abyss/';
  const backgroundManifest=backgroundNames.map(key=>'assets/backgrounds/abyss/'+key+'.png');
  const backgroundReady=Promise.all(backgroundNames.map(key=>{
    if(typeof root.Image!=='function')return Promise.resolve();
    return new Promise(resolve=>{
      const image=new root.Image(),entry=backgroundEntries[key];entry.image=image;image.decoding='async';
      image.onload=()=>{entry.ready=(image.naturalWidth||image.width)>0;resolve();};
      image.onerror=()=>{entry.ready=false;resolve();};image.src=backgroundBase+key+'.png'+spriteVersion;
    });
  }));
  // Source rectangles exclude only transparent padding. These pixel bounds are
  // proportional to the original image size, so replacement resolutions work.
  const sourceCrops={
    minotaur:{size:[1492,1054],rect:[124,8,1335,992],pivot:.41},
    flower:{size:[1671,941],rect:[14,46,1655,865],pivot:.5},
    turtle:{size:[1774,887],rect:[2,27,1772,848],pivot:.5},
    roc:{size:[1529,1029],rect:[11,11,1487,1008],pivot:.52},
    knight:{size:[1315,1196],rect:[42,6,1260,1175],pivot:.5}
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const chapter = g => {
    const id = g.level?.id || 0;
    return id >= 101 && id <= 150 ? Math.floor((id - 101) / 10) : -1;
  };
  const motion = g => g.settings?.effects !== false && !g.settings?.reducedMotion;
  const rect = (c,x,y,w,h,color,stroke=INK,lw=1.8) => {
    c.fillStyle=color;c.fillRect(x,y,w,h);
    if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.strokeRect(x,y,w,h);}
  };
  const poly = (c,p,color,stroke=INK,lw=1.8) => {
    c.beginPath();p.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();
    if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
  };
  const line=(c,p,color,width=2)=>{c.beginPath();p.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const oval=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();};
  const ring=(c,x,y,rx,ry,color,width=1)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  function glow(c,x,y,r,color,alpha=.3){
    c.save();c.globalAlpha*=alpha;
    const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,color+'00');
    c.fillStyle=grad;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
  }
  function gem(c,x,y,r,color,bright='#e4ffff'){
    poly(c,[[x,y-r],[x+r*.65,y-r*.2],[x+r*.48,y+r*.55],[x,y+r],[x-r*.58,y+r*.2],[x-r*.6,y-r*.3]],color,INK,1.3);
    poly(c,[[x,y-r],[x,y+r],[x-r*.58,y+r*.2],[x-r*.6,y-r*.3]],bright,null);
    line(c,[[x-r*.6,y-r*.3],[x,y],[x+r*.65,y-r*.2]],'#ffffff88',.8);
  }
  function block(c,x,y,w,h,front,top,side){
    rect(c,x,y,w,h,front);
    poly(c,[[x,y],[x+5,y-5],[x+w+5,y-5],[x+w,y]],top,INK,1.2);
    poly(c,[[x+w,y],[x+w+5,y-5],[x+w+5,y+h-5],[x+w,y+h]],side,INK,1.2);
  }
  function flame(c,x,y,size,t,color='#ff9a43'){
    const flick=Math.sin(t*14+x)*size*.07;
    glow(c,x,y-size*.4,size*1.4,color,.27);
    poly(c,[[x-size*.4,y],[x-size*.49,y-size*.38],[x-size*.19,y-size*.66],[x-size*.13,y-size],[x+size*.16,y-size*.7+flick],[x+size*.41,y-size*.45],[x+size*.4,y]],color,null);
    poly(c,[[x-size*.19,y],[x-size*.23,y-size*.3],[x+size*.03,y-size*.64],[x+size*.21,y-size*.25],[x+size*.17,y]],'#ffe7a0',null);
  }
  function mushroom(c,x,y,s,color='#ff5c78'){
    rect(c,x-s*.12,y-s*.5,s*.24,s*.5,'#b9a8a3',null);
    poly(c,[[x-s*.6,y-s*.35],[x-s*.64,y-s*.57],[x-s*.3,y-s*.88],[x+s*.2,y-s],[x+s*.62,y-s*.61],[x+s*.55,y-s*.35]],color,'#291e35',1);
    rect(c,x-s*.23,y-s*.69,s*.18,s*.16,'#ffd9ba',null);rect(c,x+s*.17,y-s*.58,s*.13,s*.11,'#ffd9ba',null);
  }
  function rootBranch(c,x,y,len,dir,color='#49312f'){
    line(c,[[x,y],[x+dir*len*.15,y-len*.3],[x-dir*len*.05,y-len*.52],[x+dir*len*.12,y-len*.8],[x+dir*len*.48,y-len]],INK,13);
    line(c,[[x,y],[x+dir*len*.15,y-len*.3],[x-dir*len*.05,y-len*.52],[x+dir*len*.12,y-len*.8],[x+dir*len*.48,y-len]],color,8);
    line(c,[[x+dir*len*.05,y-len*.5],[x-dir*len*.25,y-len*.68],[x-dir*len*.3,y-len*.93]],color,4);
  }
  function flower(c,x,y,r,t=0){
    for(let i=0;i<8;i++){
      const a=i*TAU/8,tall=i%2?1:.78;
      c.save();c.translate(x,y);c.rotate(a+Math.sin(t*.9)*.025);
      poly(c,[[0,0],[-r*.22,-r*.36],[-r*.18,-r*.7*tall],[0,-r],[r*.24,-r*.62*tall],[r*.28,-r*.34]],i%2?'#8d277f':'#cb3fba',INK,1.1);
      poly(c,[[0,0],[0,-r],[r*.12,-r*.45]],'#f39bfb88',null);c.restore();
    }
    gem(c,x,y,r*.24,'#e35af6','#fff1ff');
  }
  function bones(c,x,y,s){
    line(c,[[x-s,y],[x+s,y]],'#bfb5aa',s*.2);
    for(const side of [-1,1]){rect(c,x+side*s-s*.1,y-s*.18,s*.2,s*.36,'#bfb5aa',null);}
  }
  function caveCeiling(c,kind){
    const color=['#201d29','#251f2d','#172639','#24212e','#352b2a'][kind];
    poly(c,[[0,0],[960,0],[960,87],[907,61],[886,137],[856,56],[808,81],[773,48],[733,117],[700,38],[645,85],[620,41],[568,73],[537,121],[511,46],[450,85],[425,43],[377,71],[350,142],[319,53],[274,83],[245,39],[190,100],[161,45],[115,79],[82,119],[49,51],[0,103]],color,null);
    for(let i=0;i<13;i++){
      const x=32+i*76,s=28+(i*19)%39;
      poly(c,[[x,0],[x+s*.8,0],[x+s*.4,s*1.5],[x+s*.1,s*.6]],i%2?'#302b38':'#292632',null);
    }
  }
  function paintBackdrop(c,k){
    const sky=[['#171521','#4e2431'],['#1c1729','#4b2c52'],['#091b2d','#1c5472'],['#171626','#49405a'],['#211e25','#574438']][k];
    let grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,sky[0]);grad.addColorStop(1,sky[1]);c.fillStyle=grad;c.fillRect(0,0,W,H);
    // The depth silhouettes differ in structure, not merely palette.
    if(k===0){
      for(let i=0;i<8;i++){
        const x=i*150-20,h=150+(i*83)%140;
        poly(c,[[x,438],[x+12,438-h],[x+44,418-h],[x+59,438-h],[x+83,438],[x+105,438]],'#312635',null);
        line(c,[[x+38,438-h+30],[x+26,438-h+80],[x+45,438-h+104],[x+37,438]],'#78363e55',3);
      }
      // Ruined Minotaur arch, beyond two suspended bridges.
      rect(c,638,178,58,216,'#352a35',null);rect(c,803,178,54,216,'#352a35',null);
      poly(c,[[628,193],[657,150],[686,134],[812,134],[857,163],[872,192]],'#40303a',null);
      poly(c,[[686,194],[708,164],[783,164],[806,194],[806,395],[686,395]],'#4d2734',null);
      gem(c,746,184,20,'#c44948','#f2866c');
      for(let row=0;row<2;row++){
        const y=260+row*100;
        for(let i=0;i<24;i++){const x=240+i*25,sy=Math.sin(i/23*Math.PI)*29;rect(c,x,y+sy,23,8,'#2b2630','#151822',1);}
        for(const off of [-8,10]){c.beginPath();c.moveTo(236,y+off);c.quadraticCurveTo(530,y+85+off,842,y+off);c.strokeStyle='#221d29';c.lineWidth=2;c.stroke();}
      }
      for(let i=0;i<10;i++){const x=i*108+17,y=420-(i%3)*45;glow(c,x,y,70,'#d93538',.16);mushroom(c,x,y,12+i%3*4);}
      for(let i=0;i<4;i++){const x=45+i*245;rect(c,x,355-i%2*88,98,16,'#3b323b');poly(c,[[x+9,371-i%2*88],[x+80,371-i%2*88],[x+69,405-i%2*88],[x+28,391-i%2*88]],'#292633',null);}
    }else if(k===1){
      for(let i=0;i<9;i++){const x=i*125-25;rect(c,x,80+i%3*29,52,360,'#2f2738',null);rect(c,x+5,80+i%3*29,8,360,'#3b3043',null);rootBranch(c,x+24,438,310+i%3*40,i%2?1:-1);}
      // A prehistoric rib cage held upright in the rock by enormous roots.
      for(let i=0;i<8;i++){
        const x=252+i*52,y=257-Math.sin(i/7*Math.PI)*80;
        poly(c,[[x,y],[x+16,y-3],[x+27,y+24],[x+24,y+81],[x+12,y+105],[x+3,y+94],[x+12,y+68],[x+13,y+25]],'#787076','#342c39',2);
      }
      line(c,[[240,251],[360,196],[520,189],[662,259]],'#807578',12);
      for(let i=0;i<7;i++){const x=61+i*151,y=399-(i%3)*84;flower(c,x,y,11+(i%2)*7);glow(c,x,y,54,'#c861e5',.17);}
      for(let i=0;i<6;i++)rootBranch(c,80+i*170,448,85+i%3*32,i%2?1:-1,'#4c363b');
      for(let i=0;i<6;i++)mushroom(c,165*i+40,430,10,'#a43fab');
    }else if(k===2){
      for(let i=0;i<8;i++){
        const x=i*144-15,h=155+i%3*63;
        poly(c,[[x,437],[x+17,437-h],[x+51,415-h],[x+93,437-h],[x+112,437]],'#152f44',null);
        const y=415-(i%3)*37;gem(c,x+54,y-45,43+i%2*19,'#2e8eb7','#7acfea');
      }
      // Stone waterfall shrine and a broad reflective underground lake.
      rect(c,407,95,151,225,'#173b50',null);poly(c,[[396,121],[428,81],[533,81],[571,119]],'#28566a',null);
      rect(c,445,127,80,190,'#65bfd450',null);rect(c,457,134,12,181,'#b3f4ff50',null);rect(c,502,134,7,181,'#cbf6ff35',null);
      gem(c,485,140,18,'#4cdbff','#e9ffff');
      grad=c.createLinearGradient(0,350,0,438);grad.addColorStop(0,'#194d65');grad.addColorStop(1,'#12364b');c.fillStyle=grad;c.fillRect(0,350,960,88);
      for(let i=0;i<42;i++){const x=(i*79)%960,y=354+i%13*6;rect(c,x,y,21+(i*7)%62,1,i%2?'#78c5d331':'#3f94ad55',null);}
      for(let i=0;i<10;i++)gem(c,22+i*103,424-i%3*17,19+i%3*11,'#2b8cbb','#95e7ed');
    }else if(k===3){
      // Vertical pillars above the void; chains and a broken ritual causeway.
      for(let i=0;i<9;i++){
        const x=i*132-18,y=104+(i*57)%150;
        rect(c,x,y,57,438-y,'#302c3e',null);rect(c,x-7,y-12,72,18,'#454050',null);rect(c,x+7,y+4,9,425-y,'#3f3a4b',null);
        for(let j=0;j<4;j++)line(c,[[x+10,y+50+j*48],[x+51,y+50+j*48]],'#211f2f',2);
        if(i<8){c.beginPath();c.moveTo(x+51,y+10);c.quadraticCurveTo(x+96,y+95,x+141,y+23);c.strokeStyle='#221f2d';c.lineWidth=7;c.stroke();
          for(let j=0;j<6;j++)ring(c,x+58+j*15,y+22+Math.sin(j/5*Math.PI)*32,5,3,'#50465b',1.5);}
        if(i%2)gem(c,x+29,y-29,17,'#9c55d4','#dba7ff');
      }
      // Fossil wings embedded in the rear cliff.
      for(const side of [-1,1])for(let i=0;i<5;i++)poly(c,[[480+side*(35+i*27),252-i*8],[480+side*(47+i*27),215-i*14],[480+side*(61+i*32),206-i*17],[480+side*(60+i*31),260-i*9]],'#68606b','#282331',1);
      ring(c,480,284,106,29,'#9b71ba48',3);ring(c,480,284,82,22,'#b692cf44',1);
    }else{
      // Funerary hall, clay colonnades, sarcophagi and many-handed reliefs.
      for(let i=0;i<8;i++){
        const x=26+i*132,y=83+i%2*23;
        rect(c,x,y,58,355,'#483d3b',null);rect(c,x-9,y-10,76,22,'#675344',null);rect(c,x+8,y+22,7,314,'#705b4744',null);rect(c,x-6,410,70,27,'#5b493e',null);
        line(c,[[x+27,y+52],[x+19,y+83],[x+34,y+112],[x+25,y+159],[x+38,y+185]],'#af845b35',2);
      }
      poly(c,[[350,438],[350,133],[402,82],[560,82],[608,132],[608,438]],'#302b30',null);
      poly(c,[[389,438],[389,151],[416,122],[547,122],[572,151],[572,438]],'#534235',null);
      rect(c,476,149,8,282,'#b48a4c32',null);gem(c,482,167,19,'#bc914e','#ffe0a0');
      for(const side of [-1,1])for(let i=0;i<5;i++)line(c,[[482+side*29,290],[482+side*(53+i*8),281-i*17],[482+side*(68+i*8),272-i*19]],'#80644966',9);
      for(let i=0;i<4;i++){const x=80+i*252;poly(c,[[x,399],[x+14,379],[x+93,379],[x+108,399],[x+104,424],[x+4,424]],'#5e4b40','#2e282b',2);rect(c,x+20,385,66,7,'#806548',null);}
      for(let i=0;i<5;i++)rect(c,307-i*18,413+i*5,348+i*36,7,'#6c5640','#382d2c',1);
    }
    caveCeiling(c,k);
    // The walkable foreground remains high-contrast against the background.
    const floors=['#34313b','#3a303a','#293d49','#3a3546','#5c493b'];
    rect(c,0,FLOOR,W,H-FLOOR,floors[k],null);rect(c,0,FLOOR,W,5,['#766668','#796276','#6a9fa7','#8c7d9c','#9b7b53'][k],null);
    for(let i=0;i<20;i++){
      const x=i*53-12,top=FLOOR+9+(i*13)%27;
      poly(c,[[x,top],[x+21,top-4],[x+45,top+3],[x+39,top+18],[x+11,top+20]],i%2?'#ffffff08':'#00000012',null);
      if(i%3===0)line(c,[[x+8,FLOOR+3],[x+18,FLOOR+17],[x+13,FLOOR+29]],'#11131e55',1.5);
    }
    if(k===0)for(let i=0;i<5;i++){const x=120+i*210;line(c,[[x,FLOOR+29],[x+15,FLOOR+37],[x+7,H]],'#b6413e',2);}
  }
  function cachedScene(k){
    if(staticScenes.has(k))return staticScenes.get(k);
    const canvas=typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(W,H):typeof document!=='undefined'?document.createElement('canvas'):null;
    if(!canvas?.getContext)return null;
    canvas.width=W;canvas.height=H;paintBackdrop(canvas.getContext('2d'),k);staticScenes.set(k,canvas);return canvas;
  }
  function backgroundTransform(k,image,t,animate){
    const layout=backgroundLayouts[backgroundNames[k]],iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const sourceFloor=ih*layout.floorY/layout.height;
    const scale=Math.max(W/iw,FLOOR/sourceFloor)*1.012;
    return {iw,ih,sourceFloor,scale,x:(W-iw*scale)/2+(animate?Math.sin(t*.17+k)*4:0),y:FLOOR-sourceFloor*scale};
  }
  function drawBackground(c,g,t=g.time||0){
    const k=chapter(g);if(k<0)return false;
    c.save();
    const entry=backgroundEntries[backgroundNames[k]];
    if(entry?.ready){
      const image=entry.image,transform=backgroundTransform(k,image,t,motion(g)),{iw,ih,sourceFloor,scale}=transform;
      // The ground strip always maps to the real collision floor. Only the
      // distant wall gets four pixels of motion; its seam is softly masked.
      c.save();c.beginPath();c.rect(0,0,W,FLOOR);c.clip();
      c.drawImage(image,0,0,iw,sourceFloor,transform.x,transform.y,iw*scale,sourceFloor*scale);c.restore();
      const groundScale=Math.max(W/iw,(H-FLOOR)/(ih-sourceFloor)),groundWidth=iw*groundScale;
      c.save();c.beginPath();c.rect(0,FLOOR,W,H-FLOOR);c.clip();
      c.drawImage(image,0,sourceFloor,iw,ih-sourceFloor,(W-groundWidth)/2,FLOOR,groundWidth,(ih-sourceFloor)*groundScale);c.restore();
      const seam=c.createLinearGradient(0,FLOOR-12,0,FLOOR+7);seam.addColorStop(0,'#12121b00');seam.addColorStop(.6,'#17151b55');seam.addColorStop(1,'#12121b00');
      c.fillStyle=seam;c.fillRect(0,FLOOR-12,W,19);
    }else{const scene=cachedScene(k);if(scene)c.drawImage(scene,0,0);else paintBackdrop(c,k);}
    if(motion(g)){
      for(let i=0;i<14;i++){
        const x=(i*83+Math.sin(t*.3+i)*12)%W,y=102+(i*47+t*(k===0?-7:3))%310;
        c.globalAlpha=.08+Math.sin(t+i)*.03;rect(c,x,y,2,i%3?2:4,COLORS[k],null);
      }
      c.globalAlpha=1;
      drawBiomeMotion(c,g,k,t,entry?.ready?backgroundTransform(k,entry.image,t,true):null);
      if(k===2){for(let i=0;i<8;i++)ring(c,55+i*127,361+i%3*21,16+(t*9+i*8)%49,2+(t+i)%4,'#8bd7e625',1);}
      if(k===4){
        const labyrinth=!!(g.abyss?.maze||g.abyssLabyrinth||(g.enemies||[]).some(e=>e.type==='thousandHands'&&(e.labyrinth||e.abyssPhase===2)));
        for(const side of [-1,1]){
          c.save();c.translate(480+side*260+(labyrinth?Math.sin(t*.9+side)*24:0),347);c.scale(1,.4);c.rotate(t*(labyrinth?.28:.06)*side);
          ring(c,0,0,69,69,'#b9945540',5);ring(c,0,0,50,50,'#b9945520',2);
          for(let i=0;i<8;i++){c.rotate(TAU/8);rect(c,-3,-63,6,30,'#b9945538',null);}c.restore();
        }
        if(labyrinth){for(let i=0;i<12;i++){const x=i*88+(Math.sin(t*.7+i)*18),y=478;line(c,[[480,262],[x,y]],'#d7a65e12',1);}ring(c,480,405,300+Math.sin(t)*12,62,'#d7a65e35',2);}
      }
    }
    c.restore();return true;
  }
  function drawBiomeMotion(c,g,k,t,transform){
    c.save();
    // These are background-only light, mist and dust. No painted ledges or
    // floating objects imply extra walkable collision geometry.
    if(k===0){
      for(let i=0;i<9;i++){
        const x=69+i*111,y=FLOOR-13-(i%3)*21;
        glow(c,x,y,31+(i%2)*12,'#f36c3d',.04+Math.sin(t*3+i)*.015);
        const py=y-(t*16+i*13)%49;rect(c,x+Math.sin(t+i)*9,py,1.5,3,'#e9824e66',null);
      }
      c.globalAlpha=.06;for(let i=0;i<4;i++){const x=130+i*260;oval(c,x+Math.sin(t*.23+i)*22,378-i%2*39,110,15,'#9d6d85');}
    }else if(k===1){
      for(let i=0;i<15;i++){
        const x=(i*71+Math.sin(t*.7+i)*13)%W,y=115+(i*29-t*9+600)%300;
        c.globalAlpha=.08+Math.sin(t*1.4+i)*.04;oval(c,x,y,2.5,2.5,'#db9ff7');
      }
      for(let i=0;i<4;i++)glow(c,120+i*241,370-i%2*83,53,'#c666df',.025+Math.sin(t*1.6+i)*.012);
      c.globalAlpha=.035;oval(c,470+Math.sin(t*.2)*45,360,400,33,'#dc8ae9');
    }else if(k===2){
      c.save();c.beginPath();c.rect(0,72,W,FLOOR-72);c.clip();
      // Fine vertical shimmer reads as flowing spray, never solid ice pillars.
      if(transform){
        const {x,y,scale}=transform;
        for(const [cx,top,bottom,spread] of [[883,159,459,44],[755,224,419,25],[1308,303,470,34]])for(let i=0;i<6;i++){
          const px=x+(cx-spread*.5+i*spread/5)*scale,py=y+(top+(t*54+i*31)%(bottom-top))*scale;
          line(c,[[px,py],[px,py+9*scale]],'#b4e9f125',1);
        }
      }else for(let i=0;i<12;i++){
          const x=437+i*7,y=135+(t*34+i*19)%176;
          line(c,[[x,y],[x,y+8+i%3*3]],'#b4e9f11f',1);
        }
      for(let i=0;i<11;i++){
        const x=28+i*91,y=370+i%4*13;
        line(c,[[x+Math.sin(t*.6+i)*14,y],[x+35+Math.sin(t*.6+i)*14,y]],'#9bc8d72e',1);
      }
      c.restore();
    }else if(k===3){
      c.globalAlpha=.035;
      for(let i=0;i<4;i++)oval(c,137+i*260+Math.sin(t*.19+i)*28,289+i%2*76,155,17,'#c1a0de');
      c.globalAlpha=1;for(let i=0;i<6;i++)glow(c,105+i*154,160+i%3*75,27,'#b676ed',.025+Math.sin(t*1.7+i)*.013);
    }else{
      for(let i=0;i<16;i++){
        const x=(27+i*63+Math.sin(t*.25+i)*7)%W,y=110+(i*39+t*3)%310;
        c.globalAlpha=.06+Math.sin(t+i)*.025;rect(c,x,y,i%3?1:2,2,'#e9c587',null);
      }
      c.globalAlpha=.035;oval(c,480+Math.sin(t*.16)*35,396,360,16,'#d5b678');
      for(let i=0;i<3;i++)glow(c,185+i*300,270-i%2*91,47,'#c6a66a',.025+Math.sin(t*.8+i)*.01);
    }
    c.restore();
  }
  function eyes(c,x,y,sep,color,size=4,angry=false){
    for(const side of [-1,1]){rect(c,x+side*sep-size*.5,y,size,size*.72,color,null);if(angry)line(c,[[x+side*(sep+4),y-3],[x+side*(sep-4),y+1]],INK,2.2);}
  }
  function axe(c,x,y,s,angle=0,color='#b8a6a5',energy='#ed5747'){
    c.save();c.translate(x,y);c.rotate(angle);line(c,[[0,18*s],[0,-28*s]],INK,5*s);line(c,[[0,18*s],[0,-28*s]],'#5e4141',2.6*s);
    poly(c,[[0,-27*s],[12*s,-40*s],[18*s,-33*s],[16*s,-21*s],[26*s,-16*s],[18*s,-3*s],[6*s,-8*s],[0,-18*s],[-7*s,-12*s],[-15*s,-18*s],[-12*s,-31*s]],color,INK,2*s);
    line(c,[[5*s,-24*s],[15*s,-22*s],[20*s,-15*s]],energy,2*s);gem(c,1*s,-22*s,4*s,energy,'#ffe4c0');c.restore();
  }
  function minotaur(c,e,t,boss){
    const walk=Math.sin(t*9+(e.x||0)*.03)*(Math.abs(e.vx||0)>5?3:1),state=e.abyssState||'',swing=/axe|swing|cleave/.test(e.abyssSkill||state)?Math.sin((e.abyssProgress||0)*Math.PI)*1.6:0;
    if(state==='charge'){c.translate(0,-3);c.rotate((e.dir||1)*.12);}
    if(state==='stunned')for(let i=0;i<3;i++){const a=t*3+i*TAU/3;gem(c,Math.cos(a)*23,-112+Math.sin(a)*5,3,'#ffcc87','#fff3c6');}
    const body=boss?'#49373c':'#59423f',top=boss?'#6b4a4b':'#78564b';
    for(const side of [-1,1]){block(c,side<0?-27:9,-31+walk*side,18,27,body,top,'#302933');rect(c,side<0?-29:7,-9+walk*side,24,9,'#26232c');line(c,[[side*18-2,-8+walk*side],[side*18-2,-1+walk*side]],'#bda29a',1);}
    poly(c,[[-33,-73],[-17,-80],[20,-80],[34,-68],[29,-28],[-28,-28]],body,INK,2.6);
    poly(c,[[-28,-68],[-15,-73],[-2,-66],[-5,-37],[-27,-39]],'#74514d',null);poly(c,[[5,-68],[27,-72],[29,-41],[9,-37]],'#372c32',null);
    rect(c,-28,-33,57,9,'#26252b');rect(c,-7,-34,15,11,'#b7a089');poly(c,[[-3,-31],[4,-31],[4,-25],[0,-27],[-3,-25]],'#ede1c4',null);
    for(const side of [-1,1]){
      c.save();c.translate(side*34,-63);c.rotate(side<0?-.13:-(.1+swing));
      block(c,-12,-8,24,30,body,top,'#332c31');rect(c,-11,17,23,13,'#77554b');
      poly(c,[[-14,-7],[-18,-18],[1,-22],[15,-11],[14,1]],boss?'#4d3f49':'#69504a',INK,2);
      if(side>0)axe(c,6,24,boss?.95:.6,-.12-swing,'#bdb0a4');c.restore();
    }
    // One large square bovine head; swept ivory horns preserve its silhouette.
    rect(c,-27,-98,53,39,body,INK,2.8);poly(c,[[-27,-96],[-18,-103],[25,-101],[26,-89]],top,INK,1.8);
    for(const side of [-1,1])poly(c,[[side*20,-92],[side*36,-91],[side*45,-105],[side*31,-102],[side*25,-113],[side*20,-108]],'#d9c4aa',INK,2);
    eyes(c,0,-83,13,'#ff4e3d',6,true);rect(c,-22,-72,45,18,'#745450',INK,2.1);rect(c,-12,-66,5,3,'#241f2a',null);rect(c,8,-66,5,3,'#241f2a',null);
    for(const side of [-1,1])poly(c,[[side*16,-55],[side*11,-54],[side*15,-47]],'#e5d3b3',INK,1);
    if(boss){line(c,[[-19,-45],[-12,-55],[-2,-49],[6,-58],[15,-51]],'#f76c54',1.8);line(c,[[-35,-65],[-26,-60],[-29,-49]],'#e85747',1.3);}
    if(e.abyssPhase>=3)glow(c,0,-57,53,'#ef4e41',.2);
  }
  function parasite(c,e,t){
    const frenzy=e.frenzyTime>0||e.abyssFrenzy>0,jitter=frenzy?Math.sin(t*65)*3:0;
    c.translate(jitter,0);
    for(let i=0;i<3;i++)for(const side of [-1,1]){
      const x=-25+i*25,swing=Math.sin(t*12+i)*3;
      poly(c,[[x,-29],[x+side*6,-23],[x+side*19,-11+swing],[x+side*23,-2],[x+side*16,-4],[x+side*10,-16],[x-2,-22]],'#5d514f',INK,1.4);
    }
    for(let i=0;i<3;i++)block(c,-38+i*24,-39+(i%2)*4,27,26,i===1?'#62535e':'#493e4a','#806474','#332e3b');
    rect(c,23,-42,23,27,'#6d4b61',INK,2);eyes(c,35,-32,6,frenzy?'#ff8e8a':'#ed9fff',4,true);
    for(const side of [-1,1])line(c,[[34+side*6,-42],[37+side*12,-52],[40+side*17,-54]],'#6a4b58',2.8);
    gem(c,-3,-39,13,frenzy?'#ff725f':'#c44ee7','#f0c2f9');
    for(let i=0;i<4;i++)poly(c,[[-30+i*19,-40],[-24+i*19,-53-(i%2)*3],[-17+i*19,-40]],'#927477',INK,1);
    if(frenzy){ring(c,0,-29,46,28,'#ed7bf28c',1.2);line(c,[[-25,-58],[-19,-66],[-17,-56]],'#f294ef',2);}
  }
  function turtle(c,e,t,boss){
    const walk=Math.sin(t*7+(e.x||0)*.03)*(Math.abs(e.vx||0)>3?2:0);
    for(let i=0;i<4;i++){
      const x=[-35,-18,20,37][i],shade=i%2?'#777b88':'#555d6f';
      block(c,x-8,-27+walk*(i%2?1:-1),17,26,shade,'#8c91a1','#384355');
      for(let j=0;j<2;j++)poly(c,[[x-7+j*8,-4],[x-2+j*8,-10],[x+2+j*8,-2]],'#d2e1df',INK,1);
    }
    poly(c,[[-44,-34],[-38,-62],[-22,-80],[21,-82],[44,-61],[49,-33],[26,-18],[-23,-17]],'#4d6076',INK,2.7);
    line(c,[[-34,-36],[-16,-43],[-11,-63],[12,-65],[21,-42],[36,-35]],'#57d6ef',2.5);
    c.save();c.translate(0,-62);c.rotate(e.mirrorShield||e.abyssMirror?-.2:0);
    poly(c,[[-49,7],[-37,-17],[-10,-28],[27,-23],[50,-3],[47,18],[14,29],[-20,23]],'#acd7e6',INK,2.7);
    poly(c,[[-37,-17],[-10,-28],[27,-23],[7,-5]],'#edf9f4',null);poly(c,[[-49,7],[7,-5],[-20,23]],'#6babc5',null);
    poly(c,[[7,-5],[27,-23],[50,-3],[47,18],[14,29]],'#c9eefa',null);
    line(c,[[-49,7],[7,-5],[14,29]],'#f5ffff',2);line(c,[[7,-5],[50,-3]],'#f5ffff',2);
    for(const x of [-33,0,31])gem(c,x,-17-Math.abs(x)*.1,9,'#75dafa','#edffff');
    if(e.mirrorShield||e.abyssMirror){glow(c,2,-2,65,'#8be8ff',.4);line(c,[[-43,-4],[42,-4]],'#ffffff',3);}
    c.restore();
    rect(c,24,-49,32,31,'#697d92',INK,2.5);poly(c,[[24,-49],[32,-57],[59,-49],[56,-18]],'#788a9c',INK,1.8);
    eyes(c,42,-39,9,'#8df2ff',5,true);rect(c,38,-26,20,8,'#a0afb5',INK,1.4);line(c,[[44,-22],[55,-22]],'#263342',1.6);
    if(boss)gem(c,37,-54,12,'#64d8f1','#d5ffff');
  }
  function crow(c,e,t,boss){
    const flap=Math.sin(t*(boss?3:7))*.23;
    for(const side of [-1,1]){
      c.save();c.translate(side*10,-52);c.rotate(side*flap);
      poly(c,[[0,0],[side*32,-33],[side*69,-48],[side*62,-25],[side*81,-15],[side*53,-7],[side*62,11],[side*30,5],[side*20,19]],boss?'#7b54ad':'#342b4b',INK,2.3);
      for(let i=0;i<3;i++)poly(c,[[side*(20+i*13),-5-i*7],[side*(52+i*10),-21-i*4],[side*(43+i*10),-5+i*5]],boss?'#bb79e3':'#5c416c',INK,1.1);
      c.restore();
    }
    poly(c,[[-23,-64],[-7,-82],[18,-74],[28,-42],[15,-17],[-11,-17],[-28,-39]],boss?'#51405f':'#292b3b',INK,2.4);
    for(const side of [-1,1]){line(c,[[side*11,-19],[side*15,-6],[side*25,-1]],boss?'#b3a397':'#8a7589',4);line(c,[[side*15,-5],[side*12,0]],'#d5c6ab',2);}
    rect(c,0,-87,33,29,boss?'#b9aa9c':'#453851',INK,2.4);
    poly(c,[[26,-73],[46,-67],[28,-56],[18,-58]],boss?'#d2c4ab':'#a69aab',INK,1.8);
    rect(c,18,-79,7,5,boss?'#dd97ff':'#b98ef6',null);
    if(boss){poly(c,[[-2,-84],[-12,-96],[10,-90],[21,-98],[24,-85]],'#756c7f',INK,1.8);gem(c,-8,-53,12,'#a46bee','#ead4ff');}
  }
  function roc(c,e,t){
    if(e.abyssForm==='knight'||e.rocForm==='knight'||e.form==='knight'){
      humanoid(c,e,t,'#77717d','#b7a8a0','#ac6bf1','knight');return;
    }
    // A stone plinth remains on the lower body while its spirit wings lift away.
    poly(c,[[-43,-4],[-48,-27],[-30,-41],[-17,-38],[-4,-52],[16,-35],[37,-32],[47,-4]],'#706773',INK,2.7);
    poly(c,[[-45,-5],[-26,-23],[-13,-9],[-4,-42],[10,-5]],'#968779',null);
    c.save();c.translate(0,-16);crow(c,e,t,true);c.restore();
    if(e.abyssState==='transition'||e.abyssState==='reform')for(let i=0;i<7;i++){const a=t+i*TAU/7;gem(c,Math.cos(a)*56,-53+Math.sin(a)*44,4,'#b27bf6','#e0c9ff');}
  }
  function scythe(c,x,y,s=1,angle=0){
    c.save();c.translate(x,y);c.rotate(angle);
    line(c,[[0,27*s],[0,-43*s]],INK,4*s);line(c,[[0,27*s],[0,-43*s]],'#9786a4',2*s);
    poly(c,[[-8*s,-40*s],[4*s,-48*s],[19*s,-42*s],[31*s,-28*s],[36*s,-7*s],[24*s,-24*s],[10*s,-31*s],[-3*s,-30*s]],'#baa8bb',INK,2*s);
    poly(c,[[9*s,-43*s],[25*s,-29*s],[31*s,-11*s],[20*s,-28*s],[5*s,-35*s]],'#bd70fa',null);
    gem(c,0,-37*s,4*s,'#c77bff','#f3dfff');c.restore();
  }
  function humanoid(c,e,t,stone,light,energy,kind){
    const step=Math.abs(e.vx||0)>5?Math.sin(t*10)*3:0,attack=/attack|slash|strike|slam|cleave|scythe|combo/.test(e.abyssSkill||e.abyssState||'')?Math.sin((e.abyssProgress||0)*Math.PI)*.9:0;
    for(const side of [-1,1]){block(c,side<0?-19:4,-30+side*step,15,27,stone,light,'#39343f');rect(c,side<0?-23:2,-7+side*step,21,7,stone);}
    if(kind==='knight')poly(c,[[-24,-72],[-33,-17],[-13,-27],[0,-20],[16,-31],[30,-16],[24,-71]],'#66418a88',INK,1.8);
    poly(c,[[-25,-69],[-12,-77],[17,-75],[27,-63],[21,-30],[-21,-30]],stone,INK,2.3);
    rect(c,-19,-62,39,18,light);rect(c,-20,-36,41,7,'#44353d');gem(c,1,-53,7,energy,'#f7e5c2');
    for(const side of [-1,1]){
      c.save();c.translate(side*29,-60);c.rotate(side>0?-attack:.1);block(c,-9,0,17,30,stone,light,'#3b3340');rect(c,-10,25,20,11,light);
      if(side>0&&kind==='knight')scythe(c,7,23,1.1,-.15-attack);
      if(side<0&&kind==='lantern'){
        line(c,[[-4,27],[-4,42]],'#ad9999',2);rect(c,-15,41,22,26,'#524058',INK,2);rect(c,-11,46,14,16,'#a35ae7');flame(c,-4,60,15,t,'#d8a1f9');rect(c,-17,40,26,4,'#a49b8d');rect(c,-17,64,26,4,'#a49b8d');
      }
      if(side>0&&kind==='guard'){line(c,[[6,34],[6,-34]],'#70583e',3);poly(c,[[6,-53],[-1,-35],[6,-30],[13,-35]],'#b6a787',INK,1.4);}
      c.restore();
    }
    rect(c,-19,-95,39,30,light,INK,2.4);rect(c,-22,-99,44,8,stone);
    if(kind==='knight'){
      poly(c,[[10,-88],[35,-80],[20,-69],[9,-71]],'#d3c3a8',INK,2);rect(c,-11,-84,9,7,'#1a1726',null);rect(c,-9,-82,5,4,energy,null);
      poly(c,[[-23,-96],[-14,-108],[0,-98]],stone,INK,1.7);
    }else{
      eyes(c,0,-85,10,energy,5,kind==='guard');rect(c,-7,-73,15,4,'#4d3b3e',null);
      if(kind==='lantern'){rect(c,-3,-80,6,6,'#352c3c',null);for(let i=0;i<4;i++)rect(c,-10+i*6,-72,3,6,'#423447',null);}
    }
  }
  function flowerBeast(c,e,t){
    const shade=e.flowerIllusion||e.abyssClone?'#bb9dcb':'#bbaa93',roots='#554036';
    const boneTell=e.abyssState==='tell'&&e.abyssSkill==='roots';
    const bonePower=boneTell?Math.sin((e.abyssProgress||0)*Math.PI*.5):0;
    // Broad, rectangular vertebrae and ribs clearly expose the skeletal beast.
    for(let i=0;i<4;i++){
      const x=[-40,-25,20,37][i],lift=e.abyssBoneAttack==='stomp'&&i>1?bonePower*19:0,swing=Math.sin(t*5+i)*2-lift;
      line(c,[[x,-47],[x+3,-25+swing],[x-2,-5-lift]],INK,13);line(c,[[x,-47],[x+3,-25+swing],[x-2,-5-lift]],shade,9);
      rect(c,x-9,-8-lift,19,8,shade,INK,1.6);rootBranch(c,x,-5-lift,53-lift*.5,i%2?1:-1,roots);
    }
    line(c,[[-44,-67],[-23,-75],[6,-74],[28,-63]],INK,12);line(c,[[-44,-67],[-23,-75],[6,-74],[28,-63]],shade,8);
    for(let i=0;i<6;i++){
      const x=-38+i*12,y=-69-Math.sin(i/5*Math.PI)*6;
      poly(c,[[x-5,y],[x+3,y-2],[x+10,y+15],[x+5,y+29],[x-2,y+31],[x+2,y+16]],shade,INK,1.2);rect(c,x-5,y-8,10,9,'#d5c7aa',INK,1);
    }
    for(let i=0;i<3;i++)line(c,[[-45,-55+i*9],[-28,-66+i*6],[-9,-61+i*5],[17,-69+i*9],[34,-60+i*7]],roots,3.5);
    const headPush=e.abyssBoneAttack==='flower'?bonePower*15:0;
    line(c,[[22,-61],[35+headPush*.5,-63],[40+headPush,-76],[44+headPush,-80]],roots,12);flower(c,43+headPush,-73,35,t);
    flower(c,-30,-76,7,t);flower(c,-8,-44,6,t);flower(c,8,-79,7,t);
    poly(c,[[-43,-63],[-62,-65],[-70,-53],[-76,-65],[-66,-76],[-47,-73]],shade,INK,1.6);
    if(e.flowerIllusion||e.abyssClone){c.globalAlpha*=.4;ring(c,0,-47,67,39,'#d792ed',1.6);}
  }
  function hand(c,e,t){
    const step=Math.sin(t*9)*3;
    for(let i=0;i<4;i++){
      const x=-29+i*18,h=45+(i===1?10:0),y=-h+(i%2?step:-step);
      block(c,x,y,14,h-16,'#9b8976','#c0ad91','#655b57');rect(c,x+2,y+14,10,3,'#756958',null);
    }
    poly(c,[[-34,-30],[28,-34],[43,-20],[34,-2],[-25,-2],[-41,-14]],'#a28e77',INK,2.4);
    block(c,-46,-25,15,28,'#a28e77','#c2ae90','#706153');gem(c,1,-17,8,'#dcb974','#f9de9f');
    line(c,[[-19,-24],[-12,-18],[-20,-9]],'#6c5a51',1.5);
  }
  const EMOTIONS={joy:{color:'#e9bf62',stone:'#a68858',light:'#d4b67c',face:'HỈ'},rage:{color:'#f05c48',stone:'#79514b',light:'#af7b5d',face:'NỘ'},love:{color:'#e996c7',stone:'#a77d78',light:'#d2aa9e',face:'ÁI'},hate:{color:'#a079e7',stone:'#51445f',light:'#887397',face:'Ố'}};
  function thousand(c,e,t){
    const interval=e.abyssPhase===2?(MM.AbyssConfig?.fixed?.mazeEmotionInterval||15):(MM.AbyssConfig?.fixed?.emotionInterval||20);
    const sinceTurn=interval-((e.nextEmotion??interval)-(e.abyssClock||0));
    const transition=e.abyssState==='transition';
    const emotion=transition?['joy','rage','love','hate'][Math.floor((e.abyssProgress||0)*8)%4]:e.emotion||e.abyssEmotion||'joy';
    const p=EMOTIONS[emotion]||EMOTIONS.joy;
    const turn=e.emotionTurn||(transition?(e.abyssProgress||0)*6:!e.emotionProjection&&(e.abyssClock||0)>1&&sinceTurn>=0&&sinceTurn<.6?sinceTurn/.6:0);
    // Twenty-six articulated arms, one torso and ONE rotating cuboid head.
    for(let row=0;row<2;row++)for(const side of [-1,1])for(let i=0;i<(row?6:7);i++){
      const a=-1.36+i*.37+Math.sin(t*.8+i)*.025,r=56+row*15;
      const elbowX=side*(24+Math.cos(a)*r),elbowY=-62+Math.sin(a)*r*.78;
      const handX=side*(30+Math.cos(a)*(r+22)),handY=-64+Math.sin(a)*(r+25)*.84;
      line(c,[[side*24,-59],[elbowX,elbowY],[handX,handY]],INK,11-row*2);
      line(c,[[side*24,-59],[elbowX,elbowY],[handX,handY]],row?p.stone:p.light,7-row*2);
      c.save();c.translate(handX,handY);c.rotate(side*(a+Math.PI*.5));
      rect(c,-6,-8,12,12,row?p.stone:p.light,INK,1);
      if(emotion!=='rage')for(let j=0;j<4;j++)rect(c,-6+j*3,-14-(j===1?2:0),2.4,9,row?p.stone:p.light,INK,.5);
      else{rect(c,-6,-11,12,8,p.light,INK,1);line(c,[[-3,-10],[-3,-5]],p.stone,1);}
      c.restore();
    }
    for(const side of [-1,1]){block(c,side<0?-25:7,-34,20,29,p.stone,p.light,'#4b3c42');rect(c,side<0?-29:6,-8,26,8,p.light);}
    poly(c,[[-31,-76],[-16,-86],[18,-86],[32,-72],[24,-31],[-24,-31]],p.stone,INK,2.6);
    poly(c,[[-25,-69],[-11,-74],[-8,-42],[-23,-36]],p.light,null);poly(c,[[8,-74],[25,-69],[23,-36],[9,-42]],'#332b3e55',null);
    rect(c,-25,-35,51,9,'#69533f');gem(c,0,-31,10,p.color,'#fff0cc');
    gem(c,0,-61,14,p.color,'#fff6c4');
    for(const side of [-1,1])line(c,[[side*9,-75],[side*16,-66],[side*12,-55],[side*20,-44]],p.color,1.3);
    c.save();c.translate(0,-94);c.scale(.35+.65*Math.abs(Math.cos(turn*Math.PI)),1);
    rect(c,-24,-21,48,37,p.light,INK,2.5);poly(c,[[24,-21],[32,-16],[32,15],[24,16]],p.stone,INK,1.8);
    rect(c,-28,-24,57,8,p.stone);gem(c,0,-29,7,p.color,'#ffefbf');
    if(emotion==='joy'){
      line(c,[[-16,-6],[-11,-10],[-6,-6]],'#49362f',2);line(c,[[6,-6],[11,-10],[16,-6]],'#49362f',2);
      poly(c,[[-12,2],[12,2],[8,10],[-6,11]],'#51342f',null);line(c,[[-9,4],[9,4]],'#f4dfaa',2);
    }else if(emotion==='rage'){
      eyes(c,0,-8,12,'#ff5948',6,true);poly(c,[[-11,2],[0,-2],[12,2],[11,12],[-11,12]],'#422731',null);
      for(let i=0;i<4;i++)poly(c,[[-9+i*6,2],[-5+i*6,2],[-7+i*6,7]],'#fff1c7',null);
    }else if(emotion==='love'){
      line(c,[[-17,-8],[-10,-5],[-4,-8]],'#5d3647',2);line(c,[[4,-8],[10,-5],[17,-8]],'#5d3647',2);
      line(c,[[-6,7],[0,9],[7,6]],'#79434f',2);rect(c,-19,0,7,3,'#d5758b66',null);rect(c,12,0,7,3,'#d5758b66',null);
    }else{
      eyes(c,0,-7,12,'#c092f5',5,true);poly(c,[[-12,1],[0,6],[13,-1],[9,13],[-6,14]],'#2c2237',null);
      line(c,[[-21,-17],[-16,-10],[-20,1],[-15,11]],'#413347',1.5);line(c,[[22,-16],[16,-3],[20,10]],'#413347',1.5);
    }
    c.restore();
    if(e.labyrinth||e.abyssPhase===2){ring(c,0,-53,100,81,p.color+'44',1);}
  }
  function spirit(c,e,t){
    const purple=e.type==='tombSpirit'?'#d9bd77':'#72dff8';
    c.translate(0,Math.sin(t*3+(e.x||0)) * 3);
    poly(c,[[-21,-56],[-10,-72],[11,-72],[25,-53],[18,-26],[24,-12],[8,-17],[-2,-7],[-11,-17],[-26,-12],[-20,-31]],e.type==='tombSpirit'?'#7b7158':'#477991',INK,2);
    rect(c,-17,-61,35,26,e.type==='tombSpirit'?'#a8976b':'#75a9be',INK,1.8);eyes(c,0,-51,9,purple,5,true);
    gem(c,0,-30,9,purple,'#edffff');glow(c,0,-34,32,purple,.15);
  }
  function spriteKey(type,e){
    if(type==='minotaurLord'||type==='minotaurCalf')return 'minotaur';
    if(type==='flowerDemon')return 'flower';
    if(type==='mirrorTurtle'||type==='littleTurtle')return 'turtle';
    if(type==='thousandHands')return 'deity';
    if(type==='fossilRoc')return e.abyssForm==='knight'||e.rocForm==='knight'||e.form==='knight'?'knight':'roc';
    if(type==='abyssCrow')return 'roc';
    return null;
  }
  function visualPose(e,t,air){
    let pose=visualStates.get(e);
    const delta=pose?clamp(t-pose.time,0,.1):0;
    const observed=pose&&delta>0?Math.abs((e.x||0)-(pose.x||0))/Math.max(delta,.001):0;
    const speed=Math.max(Math.abs(e.vx||0),observed);
    const moving=speed>5||['approach','walk','patrol','charge','air','pursuit','chase'].includes(e.abyssState||'');
    const targetMove=moving?clamp(Math.max(speed/54,.48),.48,1):0;
    const targetTilt=e.abyssState==='charge'?.075:e.abyssState==='tell'?Math.sin((e.abyssProgress||0)*Math.PI)*.035:0;
    if(!pose||t<pose.time){pose={time:t,x:e.x||0,seed:++visualSeed*1.618,move:targetMove,tilt:targetTilt};visualStates.set(e,pose);}
    const blend=1-Math.exp(-delta*13);
    pose.move+=(targetMove-pose.move)*blend;pose.tilt+=(targetTilt-pose.tilt)*blend;pose.time=t;pose.x=e.x||0;
    // Location never enters the phase: chasing or teleporting cannot restart
    // the stride or the wing beat. Only active game time advances animation.
    const phase=t*(air?4.3:9.2)+pose.seed;
    let facing=facingStates.get(e),target=e.dir<0?-1:1;
    if(!facing||t<facing.time){facing={time:t,value:target,target,start:target,started:t};facingStates.set(e,facing);}
    if(facing.target!==target){facing.start=facing.value;facing.target=target;facing.started=t;}
    const turn=clamp((t-facing.started)/.34,0,1),ease=turn*turn*(3-2*turn);
    facing.value=facing.start+(facing.target-facing.start)*ease;facing.time=t;
    return {phase,move:pose.move,tilt:pose.tilt,facing:facing.value,bob:air?Math.sin(phase)*2.8:Math.sin(t*2.2+pose.seed)*.35+Math.abs(Math.sin(phase))*pose.move*2.2};
  }
  function spriteParts(key,pose){
    const stride=Math.sin(pose.phase)*pose.move;
    if(key==='roc')return [
      {points:[[0,0],[.44,0],[.49,.45],[.33,.71],[0,.66]],pivot:[.44,.44],angle:Math.sin(pose.phase)*.075},
      {points:[[.64,.22],[1,.23],[1,.79],[.62,.72],[.55,.47]],pivot:[.61,.48],angle:-Math.sin(pose.phase)*.075}
    ];
    if(key==='minotaur')return [
      {points:[[.08,.78],[.31,.78],[.34,1],[.07,1]],pivot:[.23,.78],angle:stride*.13,offset:[stride*.018,-Math.max(0,stride)*.035]},
      {points:[[.45,.78],[.68,.78],[.71,1],[.43,1]],pivot:[.55,.78],angle:-stride*.13,offset:[-stride*.018,-Math.max(0,-stride)*.035]}
    ];
    if(key==='flower')return [
      {points:[[.02,.67],[.28,.67],[.30,1],[.01,1]],pivot:[.20,.68],angle:stride*.095,offset:[stride*.016,-Math.max(0,stride)*.04]},
      {points:[[.39,.67],[.65,.67],[.72,1],[.38,1]],pivot:[.53,.67],angle:-stride*.095,offset:[-stride*.016,-Math.max(0,-stride)*.04]}
    ];
    if(key==='turtle')return [
      {points:[[.02,.77],[.29,.77],[.30,1],[.01,1]],pivot:[.17,.78],angle:stride*.12,offset:[stride*.018,-Math.max(0,stride)*.035]},
      {points:[[.43,.77],[.70,.77],[.72,1],[.42,1]],pivot:[.55,.78],angle:-stride*.12,offset:[-stride*.018,-Math.max(0,-stride)*.035]}
    ];
    if(key==='deity')return [
      {points:[[0,0],[.27,0],[.30,.69],[0,.74]],pivot:[.29,.53],angle:Math.sin(pose.phase*.55)*.055},
      {points:[[.73,0],[1,0],[1,.74],[.70,.69]],pivot:[.71,.53],angle:-Math.sin(pose.phase*.55)*.055}
    ];
    if(key==='knight')return [{points:[[0,.25],[.30,.24],[.43,.49],[.25,.81],[0,.80]],pivot:[.43,.50],angle:Math.sin(pose.phase*.5)*.05}];
    return [];
  }
  function paintSpriteParts(c,image,source,destination,parts){
    const [sx,sy,sw,sh]=source,[x,y,w,h]=destination;
    const pathPart=part=>{part.points.forEach(([u,v],i)=>i?c.lineTo(x+u*w,y+v*h):c.moveTo(x+u*w,y+v*h));c.closePath();};
    c.save();c.beginPath();c.rect(x,y,w,h);for(const part of parts)pathPart(part);c.clip('evenodd');
    c.drawImage(image,sx,sy,sw,sh,x,y,w,h);c.restore();
    for(const part of parts){
      const px=x+part.pivot[0]*w,py=y+part.pivot[1]*h;
      c.save();c.translate(px,py);c.rotate(part.angle);c.translate(-px,-py);if(part.offset)c.translate(part.offset[0]*w,part.offset[1]*h);c.beginPath();pathPart(part);c.clip();
      c.drawImage(image,sx,sy,sw,sh,x,y,w,h);c.restore();
    }
  }
  function drawDeitySprite(c,image,source,destination,effects,e,parts){
    const [sx,sy,sw,sh]=source,[x,y,w,h]=destination;
    const order=['joy','rage','love','hate'],current=Math.max(0,order.indexOf(e.emotion||e.abyssEmotion||'joy'));
    const hasTurn=effects&&e.emotionChangedAt!=null&&e.emotionFrom&&e.emotionFrom!==(e.emotion||e.abyssEmotion);
    const duration=Math.max(.1,e.emotionTurnDuration||1.4),progress=hasTurn?clamp(((e.abyssClock||0)-e.emotionChangedAt)/duration,0,1):1;
    const previous=hasTurn?Math.max(0,order.indexOf(e.emotionFrom)):current;
    const headIndex=hasTurn&&progress<.5?previous:current;
    const head={x:.54,y:.255,rx:.19,ry:.205};
    const drawFrame=(index,alpha,cutHead)=>{
      const frame=[index*image.width/4,sy,image.width/4,sh];c.save();c.globalAlpha*=alpha;
      if(parts?.length){
        const pathPart=part=>{part.points.forEach(([u,v],i)=>i?c.lineTo(x+u*w,y+v*h):c.moveTo(x+u*w,y+v*h));c.closePath();};
        c.beginPath();c.rect(x,y,w,h);for(const part of parts)pathPart(part);
        if(cutHead)c.ellipse(x+head.x*w,y+head.y*h,head.rx*w,head.ry*h,0,0,TAU);
        c.clip('evenodd');c.drawImage(image,...frame,x,y,w,h);c.restore();
        for(const part of parts){const px=x+part.pivot[0]*w,py=y+part.pivot[1]*h;c.save();c.globalAlpha*=alpha;c.translate(px,py);c.rotate(part.angle);c.translate(-px,-py);c.beginPath();pathPart(part);c.clip();c.drawImage(image,...frame,x,y,w,h);c.restore();}
        return;
      }
      c.beginPath();c.rect(x,y,w,h);
      if(cutHead){c.ellipse(x+head.x*w,y+head.y*h,head.rx*w,head.ry*h,0,0,TAU);c.clip('evenodd');}else c.clip();
      c.drawImage(image,...frame,x,y,w,h);c.restore();
    };
    if(!hasTurn||progress>=1)drawFrame(current,1,false);
    else{
      const colorProgress=clamp((progress-.5)*2,0,1);
      if(progress<.5)drawFrame(previous,1,true);
      else{drawFrame(previous,1-colorProgress,true);drawFrame(current,colorProgress,true);}
      // Keep exactly one head visible. It turns edge-on first, switches its
      // expression at the narrow midpoint, then reveals the new palette.
      const turnScale=.08+.92*Math.abs(Math.cos(progress*Math.PI));
      const hx=x+head.x*w,hy=y+head.y*h;
      c.save();c.translate(hx,hy);c.scale(turnScale,1);c.translate(-hx,-hy);
      c.beginPath();c.ellipse(hx,hy,head.rx*w,head.ry*h,0,0,TAU);c.clip();
      c.drawImage(image,headIndex*image.width/4,sy,image.width/4,sh,x,y,w,h);c.restore();
    }
  }
  function drawMinotaurRage(c,e,t,width,height,pivot,effects){
    const pulse=effects?.72+Math.sin(t*16)*.12:.76;
    for(const [u,v] of [[.46,.332],[.558,.353]]){
      const x=-width*pivot+width*u,y=-height+height*v;
      glow(c,x,y,height*.075,'#ff392b',pulse*.6);
      poly(c,[[x-width*.028,y-height*.014],[x+width*.028,y-height*.005],[x+width*.016,y+height*.014],[x-width*.019,y+height*.007]],'#ffad69',null);
    }
  }
  function drawSpriteEnemy(c,g,e,t,type){
    const key=spriteKey(type,e),entry=spriteEntries[key];if(!entry?.ready||!entry.image)return false;
    const image=entry.image,iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    if(!(iw>0&&ih>0))return false;
    let sx=0,sy=0,sw=iw,sh=ih,pivot=.5;
    const crop=sourceCrops[key];
    if(crop){sx=crop.rect[0]*iw/crop.size[0];sy=crop.rect[1]*ih/crop.size[1];sw=crop.rect[2]*iw/crop.size[0];sh=crop.rect[3]*ih/crop.size[1];pivot=crop.pivot;}
    if(key==='deity'){
      const phaseTransition=e.abyssState==='transition';
      const emotion=phaseTransition?['joy','rage','love','hate'][Math.floor((e.abyssProgress||0)*8)%4]:e.emotion||e.abyssEmotion||'joy';
      const index=Math.max(0,['joy','rage','love','hate'].indexOf(emotion));
      sx=index*iw/4;sw=iw/4;sy=16*ih/724;sh=668*ih/724;
    }
    const aspect=sw/sh,w=e.w||50,h=e.h||70;
    const boss=e.boss||['minotaurLord','flowerDemon','mirrorTurtle','fossilRoc','thousandHands'].includes(type)&&!e.flowerIllusion&&!e.emotionProjection;
    // The knight's tall scythe extends above its head; size the full sprite so
    // its actual body remains comparable to the original knight hitbox.
    let height=h*(key==='knight'?1.65:boss?1.13:1.08),width=height*aspect;
    if(!boss){width=Math.min(width,w*(type==='abyssCrow'?1.75:1.45));height=width/aspect;}
    const effects=motion(g)&&!(e.petrifiedTime>0);
    const air=type==='abyssCrow'||type==='fossilRoc'&&key==='roc';
    const pose=effects?visualPose(e,t,air):{phase:0,move:0,tilt:0,bob:0};
    const bob=effects&&e.abyssState!=='corpse'?pose.bob:0;
    let tilt=effects&&air?Math.sin(pose.phase*.74)*.014:pose.tilt;
    if(key==='deity')tilt*=.25;
    c.save();c.translate(e.x,e.y-bob);c.scale(effects?pose.facing:(e.dir||1),1);c.rotate(tilt);
    if(e.flowerIllusion)c.globalAlpha*=.68;
    if(e.emotionProjection)c.globalAlpha*=e.emotion==='rage'?.82:.38;
    if(e.hit>0&&effects)c.globalAlpha*=.9+.1*Math.cos(t*24);
    if(e.petrifiedTime>0)c.filter='grayscale(1)';
    if(key==='minotaur'&&e.minotaurRage&&e.abyssState==='charge'&&effects){
      for(let i=0;i<5;i++){
        const yy=-height*(.28+i*.12),reach=15+i%3*12;
        line(c,[[-width*pivot-5,yy],[-width*pivot-reach,yy+2]],'#fa65568c',1.3+i%2);
      }
    }
    if(key==='deity'&&effects&&e.emotionChangedAt!=null){
      const duration=Math.max(.1,e.emotionTurnDuration||1.4),progress=clamp(((e.abyssClock||0)-e.emotionChangedAt)/duration,0,1);
      if(progress<1){const palette=EMOTIONS[e.emotion]||EMOTIONS.joy;c.globalAlpha*=.9+.1*Math.sin(progress*Math.PI);glow(c,0,-height*.57,height*.7,palette.color,.2*Math.sin(progress*Math.PI));}
    }
    const parts=effects&&e.abyssState!=='corpse'?spriteParts(key,pose):[];
    if(key==='deity')drawDeitySprite(c,image,[sx,sy,sw,sh],[-width*pivot,-height,width,height],effects,e,parts);
    else if(parts.length)paintSpriteParts(c,image,[sx,sy,sw,sh],[-width*pivot,-height,width,height],parts);
    else c.drawImage(image,sx,sy,sw,sh,-width*pivot,-height,width,height);
    if(key==='minotaur'&&e.minotaurRage&&type==='minotaurLord')drawMinotaurRage(c,e,t,width,height,pivot,effects);
    c.restore();return true;
  }
  function drawEnemy(c,g,e,t=g.time||0){
    const type=TYPES.has(e.type)?e.type:TYPES.has(e.archetype)?e.archetype:null;
    if(!type)return false;if(e.dead||e.health<=0)return true;
    const invisible=(e.abyssInvisible||e.invisible||e.refractionTime>0)&&type==='mirrorTurtle';
    c.save();
    if(invisible){
      // Fully hidden shell: only natural disturbances in the water reveal steps.
      if(motion(g)){ring(c,e.x,e.y-1,(e.w||140)*.35+Math.sin(t*4)*5,4,'#81bfd75c',1);ring(c,e.x+11,e.y+2,(e.w||140)*.2,2,'#72b9d04a',1);}
      c.restore();return true;
    }
    const w=e.w||50,h=e.h||70,frozen=e.petrifiedTime>0,walkTime=motion(g)&&!frozen?t:0;
    oval(c,e.x,Math.min(FLOOR,e.y)+3,w*.48,Math.min(10,w*.13),'#080b1255');
    const imageDrawn=drawSpriteEnemy(c,g,e,walkTime,type);
    c.translate(e.x,e.y);c.scale(w/100,h/110);c.scale(e.dir||1,1);
    if(e.hit>0&&motion(g))c.translate(Math.sin(t*85)*1.5,0);
    if(e.abyssClone||e.flowerIllusion)c.globalAlpha*=.64;
    if(e.emotionProjection)c.globalAlpha*=e.emotion==='rage'?.76:.28;
    if(!imageDrawn){
      if(type==='minotaurCalf'||type==='minotaurLord')minotaur(c,e,walkTime,type==='minotaurLord');
      else if(type==='parasite')parasite(c,e,walkTime);
      else if(type==='littleTurtle'||type==='mirrorTurtle')turtle(c,e,walkTime,type==='mirrorTurtle');
      else if(type==='abyssCrow')crow(c,e,walkTime,false);
      else if(type==='flowerDemon')flowerBeast(c,e,walkTime);
      else if(type==='fossilRoc')roc(c,e,walkTime);
      else if(type==='thousandHands')thousand(c,e,walkTime);
      else if(type==='lanternSkeleton')humanoid(c,e,walkTime,'#665a6c','#c5b69e','#c087f5','lantern');
      else if(type==='clayGuard')humanoid(c,e,walkTime,'#8a715a','#bd9e74','#eac17d','guard');
      else if(type==='ancientHand')hand(c,e,walkTime);
      else spirit(c,e,walkTime);
      if(frozen){c.globalAlpha=.28;poly(c,[[-48,0],[-43,-90],[0,-115],[48,-88],[48,0]],'#c3c9c7',null);}
    }
    if(e.hit>0){line(c,[[-45,-90],[-51,-99]],'#ffe9b2',2);line(c,[[45,-75],[52,-81]],'#ffe9b2',2);}
    c.restore();
    if(e.emotionProjection){
      c.save();c.font='700 10px Arial';c.textAlign='center';c.fillStyle=(EMOTIONS[e.emotion]||EMOTIONS.joy).color;
      c.fillText(e.emotion==='rage'?'NỘ · BẢN THỂ THẬT':(EMOTIONS[e.emotion]||EMOTIONS.joy).face,e.x,e.y-h-13);c.restore();
    }
    if(!e.boss&&e.maxHealth>0&&e.health<e.maxHealth){c.save();rect(c,e.x-15,e.y-h-11,30,3,'#111823',null);rect(c,e.x-15,e.y-h-11,30*clamp(e.health/e.maxHealth,0,1),3,'#c8b184',null);c.restore();}
    return true;
  }
  function weapon(g){return MM.WeaponManager?.current?.(g)||g.progression?.equipped||'gun';}
  function melee(g){
    const id=weapon(g);return ['club','axes','hammer','minotaurHammer','scythe','ancientScythe'].includes(id)||(id==='spear'&&g.weaponAttack?.form==='stab');
  }
  function lightSuppressed(g){return !!(g.abyss?.darkness||g.abyssDarkness||g.player?.abyssDarkness);}
  function deityFirstForm(g){
    if(g.level?.id!==150)return false;
    const boss=(g.enemies||[]).find(e=>e.boss&&(e.type==='thousandHands'||e.archetype==='thousandHands')&&e.health>0);
    return !boss||boss.abyssPhase===1;
  }
  function darkWeaponRadius(g,lighting=MM.AbyssConfig?.lighting||{}){
    if(deityFirstForm(g))return (lighting.deityDarkWeaponSteps??3)*(MM.AbyssConfig?.combat?.arena?.step??40);
    return lighting.darkWeaponRadius??24;
  }
  function weaponLit(g){return !!(lightSuppressed(g)&&deityFirstForm(g)||g.weaponGlow||g.abyssWeaponGlow||MM.SaveManager?.unlocked?.(g,130)||g.progression?.rewards?.includes(130));}
  function weaponLightPoint(g){
    const p=g.player,id=weapon(g),dir=p.dir||1,sx=(p.w||38)/38,sy=(p.h||54)/54;
    let x,y;
    if(melee(g)&&id!=='spear'){
      const attack=g.weaponAttack,progress=attack?.time>0?1-attack.time/Math.max(.01,attack.duration):0;
      const swing=attack?.time>0?Math.sin(progress*Math.PI):0;
      const length=id==='axes'?21:id==='scythe'?33:id==='hammer'?37:35;
      const angle=(id==='axes'?-.4:-.28)+swing*(id==='hammer'?1.8:1.7);
      x=p.x+dir*(27+Math.sin(angle)*length)*sx;y=p.y+(-26-Math.cos(angle)*length)*sy;
    }else{
      const angle=Number.isFinite(p.aimAngle)?p.aimAngle:(dir<0?Math.PI:0);
      const reach=id==='spear'?76:id==='bow'?42:id==='bones'?31:p.weaponMode==='sniper'?60:38;
      x=p.x+Math.cos(angle)*reach*sx;y=p.y-26*sy+Math.sin(angle)*reach*sy;
    }
    if(chapter(g)>=0&&g.abyss?.gravity<0)y=2*p.y-p.h-y;
    return {x,y};
  }
  function torchPoints(g){
    const p=g.player;if(!p)return [];
    const time=motion(g)?g.time||0:0;
    if(melee(g))return [0,Math.PI].map(a=>({x:p.x+Math.cos(time*1.7+a)*35,y:p.y-p.h*.55+Math.sin(time*1.7+a)*24}));
    return [{x:p.x-(p.dir||1)*25,y:p.y-p.h*(g.abyss?.gravity<0?.25:.75)}];
  }
  function drawPlayerTorch(c,g){
    if(!g.player)return false;
    const abyss=chapter(g)>=0,lit=weaponLit(g);
    if(!abyss&&!lit)return false;
    const p=g.player,t=motion(g)?g.time||0:0,suppressed=abyss&&lightSuppressed(g);
    c.save();
    if(abyss&&!suppressed){
      const target=torchPoints(g),key=weapon(g)+':'+melee(g),id=g.level.id;
      let transition=flameTransitions.get(g);
      if(!transition||transition.id!==id||transition.run!==g.abyss||t<transition.time){transition={id,run:g.abyss,key,points:target,from:target,time:t};flameTransitions.set(g,transition);}
      if(transition.key!==key){transition.from=transition.points;transition.key=key;transition.time=t;}
      const linear=motion(g)?clamp((t-transition.time)*(MM.AbyssConfig?.lighting?.transitionSpeed||5),0,1):1;
      const blend=linear*linear*(3-2*linear),count=linear<1?Math.max(target.length,transition.from.length):target.length;
      const points=Array.from({length:count},(_,i)=>{
        const a=transition.from[i%transition.from.length],b=target[i%target.length];
        return {x:a.x+(b.x-a.x)*blend,y:a.y+(b.y-a.y)*blend};
      });transition.points=points;
      if(!melee(g)){const pt=target[0];line(c,[[p.x-(p.dir||1)*15,p.y-p.h*(g.abyss?.gravity<0?.57:.43)],[pt.x,pt.y+12]],'#263a34',7);rect(c,pt.x-3,pt.y+5,6,22,'#80613f');line(c,[[pt.x-5,pt.y+6],[pt.x+5,pt.y+6]],'#c9ad68',3);}
      for(const pt of points)flame(c,pt.x,pt.y+(melee(g)?0:6),melee(g)?13:17,t);
    }
    if(lit){
      const {x,y}=weaponLightPoint(g),lighting=MM.AbyssConfig?.lighting||{};
      const radius=suppressed?darkWeaponRadius(g,lighting):(lighting.weaponRadius??95);
      glow(c,x,y,radius,'#9ce4f3',suppressed?.3:.14);
      glow(c,x,y,radius*.25,'#c5f3fc',.24);
      for(let i=0;i<4;i++)rect(c,x+Math.sin(t*1.5+i)*11,y+Math.cos(t*1.2+i*2)*9,2,2,'#d1f5ff',null);
    }
    c.restore();return true;
  }
  function drawLighting(c,g){
    if(chapter(g)<0||!g.player)return false;
    const p=g.player,suppressed=lightSuppressed(g),points=torchPoints(g),lit=weaponLit(g);
    // Gradient alpha paints darkness only; it never destroys pixels underneath.
    // About half of the logical viewport is lit at a full 287px light radius.
    const weaponPoint=weaponLightPoint(g),lighting=MM.AbyssConfig?.lighting||{};
    const x=suppressed&&lit?weaponPoint.x:suppressed?p.x:points.reduce((sum,v)=>sum+v.x,0)/points.length;
    const y=suppressed&&lit?weaponPoint.y:suppressed?p.y-p.h*.5:points.reduce((sum,v)=>sum+v.y,0)/points.length;
    const darkRadius=darkWeaponRadius(g,lighting);
    const radius=suppressed?(lit?darkRadius:darkRadius*.42):Math.sqrt(W*(H-(g.viewTop||0))*(lighting.torchViewportRatio??.5)/Math.PI);
    c.save();
    const grad=c.createRadialGradient(x,y,0,x,y,radius);
    const broadLight=suppressed&&lit&&deityFirstForm(g);
    grad.addColorStop(0,suppressed?(lit?'#05071000':'#050710bb'):'#08091000');
    grad.addColorStop(broadLight ? .72 : .48,suppressed?(broadLight?'#05071036':'#050710dc'):'#0809100d');
    grad.addColorStop(broadLight ? .88 : 1,suppressed&&broadLight?'#03040b88':suppressed?'#03040bfa':'#080910b8');
    if(broadLight)grad.addColorStop(1,'#03040bfa');
    c.fillStyle=grad;c.fillRect(0,g.viewTop||0,W,H-(g.viewTop||0));
    // Hate attacks retain a tiny readable cue even outside the weapon's glow.
    if(suppressed)for(const z of g.abyssHazards||[])if(z.darkSignal&&!z.expired&&z.phase==='warning')telegraph(c,z,'#ac83d0',motion(g)?g.time||0:0);
    c.restore();return true;
  }
  function telegraph(c,z,color,t){
    const x=z.x||0,y=z.y??FLOOR,r=z.radius||z.r||z.w*.5||35;
    c.save();c.globalAlpha=.5+Math.sin(t*12)*.18;c.setLineDash([5,5]);ring(c,x,y-2,r,Math.min(10,r*.22),color,1.8);c.setLineDash([]);
    line(c,[[x,y-47],[x,y-30]],color,3);rect(c,x-1.5,y-24,3,3,color,null);c.restore();
  }
  function drawHazard(c,g,z,t,foreground){
    if(z.dead||z.expired||z.life<=0)return;
    const kind=z.kind||z.type||'',x=z.x||0,y=z.y??FLOOR,color=z.color||COLORS[Math.max(0,chapter(g))];
    const warning=z.phase==='warning'||z.state==='warning'||z.warning>0||z.warningTime>0;
    const width=z.w||z.width||((z.radius||z.r||35)*2),height=z.h||z.height||75;
    if(warning){
      if(!foreground){
        const falling=/stalactite|ice|reverse-spike/.test(kind);
        telegraph(c,falling?{...z,y:FLOOR}:z,color,t);
        if(kind==='mushroom')mushroom(c,x,y,21+Math.sin(t*19)*3);
        if(kind==='spirit'){glow(c,x,y-18,32,'#91deef',.3);gem(c,x,y-18,13+Math.sin(t*17)*2,'#83d8ed','#e8ffff');}
        if(falling){for(let i=0;i<4;i++)rect(c,x-12+i*7,(g.viewTop||0)+26+(t*35+i*9)%30,2,3,color+'99',null);}
      }return;
    }
    if(/mushroom/.test(kind)){
      if(z.phase==='active'){
        if(foreground){ring(c,x,y-12,width*.5,13,'#e468a2bb',3);for(let i=0;i<12;i++){const a=i*TAU/12;rect(c,x+Math.cos(a)*width*.4,y-18+Math.sin(a)*height*.35,4,4,'#e9a5cf',null);}glow(c,x,y-height*.4,width*.55,'#d864c7',.2);}
      }else if(!foreground){glow(c,x,y-10,29,color,.15);mushroom(c,x,y,21+(z.armed?Math.sin(t*20)*3:0));}return;
    }
    if(/spirit|crystalMine/.test(kind)){
      if(z.phase==='active'){
        if(foreground){ring(c,x,y-15,width*.5,16,'#a1edffbb',3);for(let i=0;i<8;i++){const a=i*TAU/8;gem(c,x+Math.cos(a)*width*.42,y-30+Math.sin(a)*height*.35,4,'#79d3f2','#eaffff');}}
      }else if(!foreground){glow(c,x,y-16,25,'#75def3',.3);gem(c,x,y-15+Math.sin(t*3)*3,13,'#58c9ec','#ecffff');}return;
    }
    if(/pollen|spore|hallucination/.test(kind)){
      if(!foreground){oval(c,x,y-2,width*.5,9,'#b44de62a');for(let i=0;i<9;i++){const px=x+Math.sin(i*2.3)*width*.45,py=y-(t*18+i*11)%54;rect(c,px,py,3,3,'#df8af07f',null);}}return;
    }
    if(kind==='root'){
      if(foreground){
        const dir=z.owner?.abyssAttackDir||z.owner?.dir||1;
        c.save();c.beginPath();c.rect(x-width/2,y-height,width,height);c.clip();
        if(z.boneVariant==='stomp'){
          for(const side of [-1,1]){
            const footX=x+side*width*.23;
            line(c,[[footX,y-height],[footX+side*4,y-height*.4],[footX,y-12]],INK,19);
            line(c,[[footX,y-height],[footX+side*4,y-height*.4],[footX,y-12]],'#c3b69d',13);
            poly(c,[[footX-22,y-20],[footX+18,y-20],[footX+26,y-5],[footX-23,y-5]],'#cfbfa5',INK,2);
            line(c,[[footX-17,y-16],[footX-10,y-3]],'#6b584f',2);
          }
          ring(c,x,y-3,width*.48,10,'#d3a4cead',2.5);
          line(c,[[x-width*.45,y-2],[x-width*.25,y-8],[x,y-3],[x+width*.13,y-10],[x+width*.42,y-4]],'#a97497',2);
        }else if(z.boneVariant==='sweep'){
          const yy=y-height*.52;
          line(c,[[x-dir*width*.5,yy+8],[x+dir*width*.45,yy]],INK,17);
          line(c,[[x-dir*width*.5,yy+8],[x+dir*width*.45,yy]],'#c1b29c',11);
          for(let i=0;i<5;i++)rect(c,x-width*.38+i*width*.18,yy-8,14,24,'#c9bba2',INK,1.4);
          line(c,[[x-dir*width*.5,yy+19],[x,yy+16],[x+dir*width*.45,yy+8]],'#755362',4);
          line(c,[[x-dir*width*.4,yy-18],[x,yy-23],[x+dir*width*.47,yy-16]],'#df9bec77',2);
        }else if(z.boneVariant==='flower'){
          const r=Math.min(width*.5,height*.47),yy=y-height*.5;
          flower(c,x,yy,r,t);
          poly(c,[[x-r*.48,yy-r*.16],[x,yy-r*.33],[x+r*.5,yy-r*.13],[x+r*.38,yy+r*.37],[x,yy+r*.56],[x-r*.4,yy+r*.31]],'#342037',INK,2);
          for(let i=0;i<4;i++){
            poly(c,[[x-r*.35+i*r*.2,yy-r*.19],[x-r*.21+i*r*.2,yy-r*.24],[x-r*.24+i*r*.2,yy+r*.06]],'#ead8c3',INK,.8);
            poly(c,[[x-r*.29+i*r*.19,yy+r*.32],[x-r*.17+i*r*.19,yy+r*.33],[x-r*.2+i*r*.19,yy+r*.12]],'#ead8c3',INK,.8);
          }
        }else for(let i=0;i<3;i++){
            const base=x-dir*width*.5,yy=y-15-i*height*.27;
            line(c,[[base,y-20],[x-dir*width*.14,yy-20],[x+dir*width*.17,yy-11],[x+dir*width*.49,yy-25]],INK,12-i*2);
            line(c,[[base,y-20],[x-dir*width*.14,yy-20],[x+dir*width*.17,yy-11],[x+dir*width*.49,yy-25]],i%2?'#8a5968':'#715157',7-i);
            poly(c,[[x+dir*width*.23,yy-12],[x+dir*width*.35,yy-38],[x+dir*width*.36,yy-15]],'#be6b94',INK,1);
          }
        c.restore();
      }return;
    }
    if(kind==='clay-crack'){
      if(foreground){
        for(let i=0;i<5;i++){const px=x-width*.45+i*width*.22;poly(c,[[px-7,y],[px-11,y-height*.28],[px-2,y-height*.75],[px+8,y-height*.4],[px+10,y]],i%2?'#b69769':'#82694f',INK,1.5);}
        line(c,[[x-width*.5,y],[x-width*.23,y-5],[x,y+2],[x+width*.25,y-5],[x+width*.5,y]],'#efc47b',2);
      }return;
    }
    if(kind==='shadow-petrify'){
      if(foreground){glow(c,x,y-height*.5,Math.max(width,height)*.5,'#c4bccb',.18);for(let i=0;i<6;i++){const a=i*TAU/6+t*.5;gem(c,x+Math.cos(a)*width*.4,y-height*.5+Math.sin(a)*height*.4,4,'#b1aeb9','#e2dfe6');}}return;
    }
    if(/waterPillar|waterColumn|water-column|geyser/.test(kind)){
      if(foreground){
        const top=z.top??y-height;poly(c,[[x-width*.5,y],[x-width*.38,top+20],[x-width*.6,top],[x-width*.15,top+11],[x,top-12],[x+width*.25,top+8],[x+width*.49,top-1],[x+width*.37,top+23],[x+width*.5,y]],'#72cbe2a6',null);
        line(c,[[x-width*.2,y],[x-width*.18,top+21],[x,top]],'#d6fbef',3);ring(c,x,y,width*.7,6,'#96eaf4',2);
      }return;
    }
    if(/rock|stalactite|ice|spike|boulder/.test(kind)){
      if(foreground){
        const icy=/ice/.test(kind),r=z.r||z.radius||width*.5,spike=/stalactite|spike|ice/.test(kind);
        c.save();c.translate(x,spike?y:y-height*.5);if(/rolling|boulder/.test(kind))c.rotate(t*4*(z.vx<0?-1:z.dir||1));
        if(kind==='reverse-spike')poly(c,[[-r,0],[-r*.5,-height*.45],[0,-height],[r*.35,-height*.67],[r,0]],'#8c7b85',INK,1.7);
        else if(spike)poly(c,[[-r,-height],[r,-height],[r*.55,-height*.35],[0,0],[-r*.45,-height*.4]],icy?'#8ccfe7':'#8c7b85',INK,1.7);
        else poly(c,[[-r,-r*.5],[-r*.4,-r],[r*.6,-r*.8],[r,r*.2],[r*.5,r],[-r*.65,r*.7]],'#6a6374',INK,2);
        if(spike)line(c,[[-r*.4,-height*.8],[r*.2,-height*.6],[-r*.1,-height*.15]],icy?'#ecffff':'#a899a2',1.4);
        else line(c,[[-r*.4,-r*.6],[r*.2,-r*.3],[-r*.1,r*.4]],'#a899a2',1.4);
        c.restore();
      }return;
    }
    if(/rift|portal|swap|teleport/.test(kind)){
      if(foreground){for(let i=0;i<3;i++)ring(c,x,y-height*.5,width*.35+i*4,height*.5-i*5,'#bd83fa'+['88','44','22'][i],2);for(let i=0;i<7;i++){const a=t*2+i;rect(c,x+Math.cos(a)*width*.4,y-height*.5+Math.sin(a)*height*.45,4,4,'#e3b3ff',null);}}return;
    }
    if(/shock|quake|slam|cleave|slash|scythe|axe/.test(kind)){
      if(foreground){
        const progress=clamp(z.progress??(z.total?1-(z.timer||0)/z.total:.5),0,1);
        if(/slash|scythe|axe|cleave/.test(kind)){
          const dir=z.dir||z.owner?.abyssAttackDir||z.owner?.dir||1,r=width*.7;c.save();c.beginPath();c.rect(x-width/2,y-height,width,height);c.clip();c.translate(x-dir*width*.5,y-height*.4);c.scale(dir,1);c.rotate(-.7+progress*1.7);
          poly(c,[[4,-r*.8],[r*.68,-r*.55],[r,-r*.12],[r*.85,r*.37],[r*.4,r*.72],[r*.7,r*.24],[r*.78,-r*.08],[r*.48,-r*.4]],color+'bb',null);c.restore();
        }else{ring(c,x,y-2,width*.5,8,color+'aa',3);line(c,[[x-width*.4,y+2],[x-width*.25,y+6],[x-width*.12,y+1],[x,y+10],[x+width*.18,y+3],[x+width*.35,y+7]],'#e9b8a6',2);}
      }return;
    }
    if(/hand/.test(kind)){
      if(foreground){c.save();c.translate(x,y);c.scale(width/100,height/75);hand(c,{x},t);c.restore();}return;
    }
    // Echo waves are emitted as projectiles rather than a full-screen flash.
    if(/echo|wave|sonic/.test(kind)){
      if(foreground){ring(c,x,y,width*.5,height*.5,color+'a0',3);ring(c,x-(z.dir||1)*8,y,width*.35,height*.43,color+'45',2);}return;
    }
    if(!foreground){oval(c,x,y-1,width*.5,7,color+'35');ring(c,x,y-1,width*.5,7,color+'9a',1.5);}
  }
  function drawShot(c,s,t){
    if(s.dead||s.expired||s.life<=0)return;
    const kind=s.kind||s.type||'',color=s.color||(/water/.test(kind)?'#73ddf5':/spore/.test(kind)?'#d481ed':'#c698f0');
    c.save();c.translate(s.x||0,s.y||0);
    if(/rock|stone|ice/.test(kind)){c.rotate(t*4);poly(c,[[-10,-8],[1,-13],[12,-5],[8,10],[-8,10]],/ice/.test(kind)?'#9ce4f3':'#8b8291',INK,1.5);}
    else if(/water/.test(kind)){c.rotate(Math.atan2(s.vy||0,s.vx||1));poly(c,[[-18,0],[-5,-6],[6,-4],[10,0],[5,5],[-5,6]],'#75d6f0','#d1ffff',1);}
    else if(/echo|sonic|scythe-wave/.test(kind)){c.scale((s.vx||1)<0?-1:1,1);line(c,[[0,-19],[10,-12],[14,0],[10,12],[0,19]],color,3);line(c,[[-7,-14],[0,-9],[3,0],[0,9],[-7,14]],color+'66',2);}
    else{gem(c,0,0,s.r||7,color,'#f1dfff');glow(c,0,0,17,color,.22);}
    c.restore();
  }
  function drawCorpses(c,g){
    const effects=motion(g);
    for(const corpse of g.abyssCorpses||[]){
      const type=corpse.archetype||corpse.type;
      if(!TYPES.has(type)||corpse.expired)continue;
      const progress=clamp(Number.isFinite(corpse.progress)?corpse.progress:corpse.duration>0?1-corpse.timer/corpse.duration:1,0,1);
      if(progress>=1)continue;
      const ease=progress*progress*(3-2*progress),style=corpse.deathStyle||'crumble';
      const x=corpse.x||0,y=corpse.y??FLOOR,w=corpse.w||100,h=corpse.h||120,dir=corpse.dir||1;
      const opacity=clamp(1-(progress-.4)/.6,0,1);
      const snapshot={...corpse,type,archetype:type,boss:true,dead:false,retired:false,health:1,maxHealth:1,
        invisible:false,abyssInvisible:false,refractionTime:0,hit:0,abyssState:'corpse',emotionProjection:false,flowerIllusion:false};
      c.save();c.globalAlpha*=opacity;
      c.beginPath();c.rect(0,g.viewTop||0,W,FLOOR-(g.viewTop||0)+6);c.clip();
      if(effects){
        c.translate(x,y);
        if(style==='minotaur-fall')c.rotate(dir*ease*Math.PI*.43);
        else if(style==='deity-collapse'){
          c.translate(Math.sin(progress*62)*(1-progress)*3,ease*h*.12);
          c.rotate(Math.sin(progress*13)*.045*ease);c.scale(1-ease*.36,1-ease*.36);
        }else{
          c.translate(Math.sin(progress*55)*(1-progress)*2,ease*h*.16);
          c.rotate(dir*ease*.12);c.scale(1-ease*.14,1-ease*.14);
        }
        c.translate(-x,-y);
      }
      // One snapshot draw: it reuses the decoded reference sprite, including
      // the knight's actual form and the deity's final single emotion face.
      drawEnemy(c,g,snapshot,effects?g.time||0:0);c.restore();
      if(style==='minotaur-fall'&&progress>.18){
        // Its red-gem war axe remains planted while the fallen body fades.
        c.save();c.globalAlpha*=clamp((progress-.18)*5,0,1)*(1-progress*.75);
        c.translate(x-dir*w*.38,FLOOR+1);c.scale(dir,1);c.rotate(-.12);
        axe(c,0,-27,Math.min(1.35,h/145),Math.PI,'#bbaea6','#ee624c');
        line(c,[[-21,0],[-9,-3],[0,1],[11,-3],[19,0]],'#b28e80',1.5);c.restore();
      }
      if(effects){
        const palette=type==='minotaurLord'?['#6e4d4d','#b8a08a','#e46d52']:type==='flowerDemon'?['#bda98f','#705443','#ca6bdf']:type==='mirrorTurtle'?['#8cbed2','#d4f3ef','#65cde6']:type==='thousandHands'?['#a48a67','#725e50',(EMOTIONS[corpse.emotion]||EMOTIONS.joy).color]:['#b3a799','#6d547f','#be7ee7'];
        c.save();c.globalAlpha*=Math.sin(progress*Math.PI)*.85;
        for(let i=0;i<14;i++){
          const side=i%2?1:-1,originY=y-h*(.17+(i*19%70)/100);
          const travel=progress*(22+(i*17)%70),sx=x+side*(w*.2+travel),sy=originY-progress*(25+i%3*13)+progress*progress*(h*.45+30);
          const size=3+i%4*1.5;
          c.save();c.translate(sx,Math.min(FLOOR-2,sy));c.rotate(progress*(i%2?1:-1)*4);
          poly(c,[[-size,-size*.7],[size*.5,-size],[size,size*.3],[-size*.4,size]],palette[i%palette.length],INK,.6);c.restore();
        }
        // A low dust ring marks the impact without adding combat objects.
        if(progress>.25)ring(c,x,FLOOR+2,w*(.35+ease*.55),4+Math.sin(progress*Math.PI)*4,'#beaa8a55',2);
        c.restore();
      }
    }
  }
  function drawEffects(c,g,foreground=false){
    if(chapter(g)<0)return false;
    const t=motion(g)?g.time||0:0;
    c.save();
    for(const z of g.abyssHazards||[])drawHazard(c,g,z,t,foreground);
    for(const z of g.abyssZones||[])drawHazard(c,g,z,t,foreground);
    if(foreground){
      drawCorpses(c,g);
      for(const s of g.abyssShots||[])drawShot(c,s,t);
      const p=g.player;
      if(p&&(g.abyss?.status?.hallucination>0||p.hallucinationTime>0||p.abyssHallucination>0)){ring(c,p.x,p.y-p.h*.7,25,31,'#ca7ee3a0',1.4);for(let i=0;i<3;i++)gem(c,p.x+Math.cos(t*3+i*TAU/3)*26,p.y-p.h-7+Math.sin(t*3+i*TAU/3)*6,3,'#d38bf1','#f3ddff');}
      if(p&&(g.abyss?.status?.reverse>0||p.invertTime>0||p.abyssInvertTime>0)){c.font='700 12px Arial';c.textAlign='center';c.fillStyle='#e4bdff';c.fillText('↔',p.x,p.y-p.h-13);}
      // Projections share one boss HP, while only Rage is a real damage target.
      for(const proj of g.abyssProjections||[]){
        if(proj.expired||proj.dead)continue;
        const emotion=proj.emotion||'joy',col=(EMOTIONS[emotion]||EMOTIONS.joy).color;
        c.save();c.globalAlpha=emotion==='rage'?.73:.28;
        drawEnemy(c,g,{...proj,type:'thousandHands',health:1,w:proj.w||85,h:proj.h||120,abyssPhase:1},t);c.restore();
        c.font='700 10px Arial';c.textAlign='center';c.fillStyle=col;c.fillText((EMOTIONS[emotion]||EMOTIONS.joy).face,proj.x,proj.y-(proj.h||120)-9);
      }
    }
    c.restore();return true;
  }
  // Called at the entry to the existing drawRewardWeapon: context is already
  // translated/scaled with the hunter's feet at (0,0), but is not facing-flipped.
  function drawWeapon(c,p,id,g,t=0,effects=true){
    if(id!=='hammer'&&id!=='scythe')return false;
    const dir=p.dir||1,attack=g?.weaponAttack,active=attack?.time>0;
    const progress=active?1-attack.time/Math.max(.01,attack.duration):0,swing=active?Math.sin(progress*Math.PI)*1.8:0;
    c.save();c.scale(dir,1);line(c,[[13,-27],[26,-26]],'#101923',10);line(c,[[13,-27],[26,-26]],'#607c48',7);rect(c,23,-30,9,8,'#d8b47d','#101923',1.2);
    c.translate(28,-25);c.rotate(-.3+swing);
    if(id==='hammer'){
      line(c,[[0,18],[0,-36]],INK,6);line(c,[[0,18],[0,-36]],'#79644c',3.5);
      for(let i=0;i<3;i++)line(c,[[-2,5+i*3],[2,6+i*3]],'#d2b47b',1.3);
      block(c,-17,-47,34,22,'#55464c','#8a6a62','#342e39');
      for(const side of [-1,1])poly(c,[[side*15,-46],[side*26,-49],[side*29,-60],[side*23,-55],[side*19,-55]],'#e0c9a7',INK,1.5);
      gem(c,0,-36,6,'#f07a55','#ffe9ac');line(c,[[-13,-39],[-8,-35],[-10,-30]],'#ed7452',1.3);
    }else scythe(c,0,0,.8,-.1);
    c.restore();
    if(active){c.save();c.translate(dir*11,-28);c.scale(dir,1);c.rotate(-1.3+progress*2.5);poly(c,[[0,-57],[40,-41],[62,-9],[58,15],[48,-8],[32,-29]],id==='scythe'?'#bc84ed99':'#efbb7a99',null);c.restore();}
    return true;
  }
  function setSprite(key,image){
    if(!spriteEntries[key])return false;
    spriteEntries[key].image=image;spriteEntries[key].ready=!!image&&(image.naturalWidth||image.width)>0;return spriteEntries[key].ready;
  }
  function setBackground(key,image){
    if(!backgroundEntries[key])return false;
    backgroundEntries[key].image=image;backgroundEntries[key].ready=!!image&&(image.naturalWidth||image.width)>0;return backgroundEntries[key].ready;
  }
  MM.AbyssRenderer={drawBackground,drawEnemy,drawEffects,drawLighting,drawPlayerTorch,drawWeapon,paintBackdrop,chapter,types:[...TYPES],torchPoints,lightSuppressed,weaponLit,weaponLightPoint,
    spriteManifest,spriteReady,spriteEntries,setSprite,backgroundManifest,backgroundReady,backgroundEntries,backgroundLayouts,setBackground,
    allArtReady:Promise.all([spriteReady,backgroundReady])};
})(typeof window!=='undefined'?window:globalThis);
