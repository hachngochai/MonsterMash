/* Connected alpha-sprite surfaces for the Cosmic Expedition. This module only
 * paints; positions, hitboxes, HP and attack clocks belong to combat modules. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{},D=MM.CosmicConfig?.authored;
  if(!D)throw new Error('Load cosmic-config.js before cosmic-art.js.');
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const mask=(v,a,b,soft=.06)=>smooth(a-soft,a+soft,v)*(1-smooth(b-soft,b+soft,v));
  const sheetFrames={"blackHole": [[0, 0, 512, 540], [512, 0, 512, 545], [0, 540, 512, 510], [512, 545, 512, 493], [0, 1050, 512, 486]], "jupiter": [[0, 0, 512, 516], [512, 0, 512, 522], [0, 516, 518, 555], [518, 522, 506, 531], [0, 1071, 518, 465]], "mars": [[0, 0, 512, 543], [512, 0, 512, 533], [0, 543, 541, 437], [541, 533, 483, 507], [0, 980, 541, 556]], "mercury": [[0, 0, 550, 541], [550, 0, 474, 554], [0, 541, 555, 476], [555, 554, 469, 449], [0, 1017, 555, 519]], "moon": [[0, 0, 512, 511], [512, 0, 512, 530], [0, 511, 536, 542], [536, 530, 488, 501], [0, 1053, 536, 483]], "neptune": [[0, 0, 514, 531], [514, 0, 510, 534], [0, 531, 532, 508], [532, 534, 492, 491], [0, 1039, 532, 497]], "saturn": [[0, 0, 504, 606], [504, 0, 520, 601], [0, 606, 512, 451], [512, 601, 512, 498], [0, 1057, 512, 479]], "sun": [[0, 0, 520, 515], [520, 0, 504, 515], [0, 515, 512, 504], [512, 515, 512, 504], [0, 1019, 512, 517]], "uranus": [[0, 0, 504, 595], [504, 0, 520, 592], [0, 595, 512, 466], [512, 592, 512, 442], [0, 1061, 512, 475]], "venus": [[0, 0, 523, 518], [523, 0, 501, 510], [0, 518, 468, 488], [468, 510, 556, 494], [0, 1006, 468, 530]]};
  const bosses=Object.fromEntries(D.regions.map(r=>[r.boss,r]));
  const spriteManifest=D.regions.flatMap(r=>[r.bossSprite,'assets/sprites/cosmic/'+r.id+'-enemies.png']);
  const images=new Map(),states=new Map(),poses=new WeakMap(),sheetAudits=new Map();
  const source=root.document?.currentScript?.src;
  const base=source&&typeof URL==='function'?new URL('../',source).href:'';
  const version=source&&typeof URL==='function'?new URL(source).search:'';
  const dimensions=im=>{const w=im&&(im.naturalWidth||im.width),h=im&&(im.naturalHeight||im.height);return Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0?[w,h]:null;};
  function trim(im,frame){
    const [x,y,w,h]=frame;
    try{
      const canvas=root.document?.createElement?.('canvas')||(typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(w,h):null);
      if(!canvas)return frame;canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);
      const c=canvas.getContext('2d',{willReadFrequently:true});
      c.drawImage(im,x,y,w,h,0,0,canvas.width,canvas.height);
      const data=c.getImageData(0,0,canvas.width,canvas.height).data;
      let l=canvas.width,r=-1,t=canvas.height,b=-1;
      for(let row=0;row<canvas.height;row++)for(let col=0;col<canvas.width;col++)if(data[(row*canvas.width+col)*4+3]>6){l=Math.min(l,col);r=Math.max(r,col);t=Math.min(t,row);b=Math.max(b,row);}
      if(r<l)return frame;
      l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(canvas.width-1,r+2);b=Math.min(canvas.height-1,b+2);
      return [x+l*w/canvas.width,y+t*h/canvas.height,(r-l+1)*w/canvas.width,(b-t+1)*h/canvas.height];
    }catch{return frame;}
  }
  function setSprite(key,image,metadata={}){
    const size=dimensions(image);
    if(!size||!bosses[key]&&!D.enemies[key])return false;
    const frame=metadata.frame||[0,0,...size];
    if(!Array.isArray(frame)||frame.length!==4||!frame.every(Number.isFinite)||frame[0]<0||frame[1]<0||frame[2]<=0||frame[3]<=0||frame[0]+frame[2]>size[0]+.01||frame[1]+frame[3]>size[1]+.01)return false;
    images.set(key,{image,frame:metadata.trim===false?frame:trim(image,frame),flip:metadata.flip===true});return true;
  }
  function setSheet(regionId,image){
    const region=D.regions.find(r=>r.id===regionId),size=dimensions(image);
    if(!region||!size)return false;
    const isolated=isolateSheet(regionId,image,size);
    if(isolated){region.enemies.forEach((key,i)=>setSprite(key,isolated[i],{trim:false}));return true;}
    // The final sixth cell is deliberately unused. A transparent gutter in
    // each cell prevents sampling a neighbour during continuous deformation.
    region.enemies.forEach((key,i)=>{const f=sheetFrames[regionId]?.[i];setSprite(key,image,{frame:f?[f[0]*size[0]/1024,f[1]*size[1]/1536,f[2]*size[0]/1024,f[3]*size[1]/1536]:[i%2*size[0]/2,Math.floor(i/2)*size[1]/3,size[0]/2,size[1]/3]});});return true;
  }
  // Artist sheets have transparent gutters, but silhouettes may cross a cell's
  // nominal rectangle. Partition connected alpha instead of slicing limbs at
  // x=512 or a row boundary. This runs once when the five sprites are loaded.
  function isolateSheet(regionId,image,[w,h]){
    const make=(ww,hh)=>{const c=root.document?.createElement?.('canvas')||(typeof root.OffscreenCanvas==='function'?new root.OffscreenCanvas(ww,hh):null);if(c){c.width=ww;c.height=hh;}return c;};
    try{
      const canvas=make(w,h),ctx=canvas?.getContext('2d',{willReadFrequently:true});if(!ctx?.getImageData||!ctx.createImageData)return null;
      ctx.drawImage(image,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),parts=[];
      for(let start=0;start<n;start++){
        if(labels[start]||pixels[start*4+3]<=120)continue;const label=parts.length+1;let read=0,end=1,l=w,r=0,top=h,b=0,sx=0,sy=0;queue[0]=start;labels[start]=label;
        while(read<end){const at=queue[read++],x=at%w,y=Math.floor(at/w);l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y);sx+=x;sy+=y;
          const visit=next=>{if(!labels[next]&&pixels[next*4+3]>120){labels[next]=label;queue[end++]=next;}};
          if(x>0)visit(at-1);if(x+1<w)visit(at+1);if(y>0)visit(at-w);if(y+1<h)visit(at+w);
        }
        parts.push({label,count:end,l,r,top,b,x:sx/end,y:sy/end});
      }
      const major=parts.slice().sort((a,b)=>b.count-a.count).slice(0,5);if(major.length!==5||major.some(p=>p.count<64))return null;
      const anchors=Array.from({length:5},(_,i)=>{const f=sheetFrames[regionId]?.[i];return f?[(f[0]+f[2]/2)*w/1024,(f[1]+f[3]/2)*h/1536]:[(i%2+.5)*w/2,(Math.floor(i/2)+.5)*h/3];});
      let best=null,bestCost=Infinity;
      function match(order,left,cost){if(!left.length){if(cost<bestCost){bestCost=cost;best=order.slice();}return;}const i=order.length;for(const p of left){const dx=(p.x-anchors[i][0])/w,dy=(p.y-anchors[i][1])/h;match([...order,p],left.filter(v=>v!==p),cost+dx*dx+dy*dy);}}
      match([],major,0);const owners=new Uint8Array(parts.length+1),nearest=new Uint8Array(n),bounds=best.map(()=>({l:w,r:0,t:h,b:0}));
      best.forEach((p,i)=>{owners[p.label]=i+1;});let read=0,end=0;
      for(let at=0;at<n;at++){const owner=owners[labels[at]];if(owner){nearest[at]=owner;queue[end++]=at;}}
      // The nearest solid silhouette owns soft glow and detached fragments.
      // Low-alpha bridges between neighbours must never merge their bodies.
      while(read<end){const at=queue[read++],x=at%w,owner=nearest[at];const visit=next=>{if(!nearest[next]){nearest[next]=owner;queue[end++]=next;}};if(x>0)visit(at-1);if(x+1<w)visit(at+1);if(at>=w)visit(at-w);if(at+w<n)visit(at+w);}
      for(const p of parts)if(!owners[p.label])owners[p.label]=nearest[Math.round(p.y)*w+Math.round(p.x)];
      const pixelOwner=at=>pixels[at*4+3]>6?(owners[labels[at]]||nearest[at]):0;
      for(let at=0;at<n;at++){const owner=pixelOwner(at);if(!owner)continue;const x=at%w,y=Math.floor(at/w),b=bounds[owner-1];b.l=Math.min(b.l,x);b.r=Math.max(b.r,x);b.t=Math.min(b.t,y);b.b=Math.max(b.b,y);}
      const result=bounds.map(b=>{b.l=Math.max(0,b.l-2);b.t=Math.max(0,b.t-2);b.r=Math.min(w-1,b.r+2);b.b=Math.min(h-1,b.b+2);const c=make(b.r-b.l+1,b.b-b.t+1),cx=c.getContext('2d'),data=cx.createImageData(c.width,c.height);return {canvas:c,ctx:cx,data,b};});
      for(let at=0;at<n;at++){const owner=pixelOwner(at);if(!owner)continue;const out=result[owner-1],x=at%w-out.b.l,y=Math.floor(at/w)-out.b.t,to=(y*out.canvas.width+x)*4,from=at*4;out.data.data[to]=pixels[from];out.data.data[to+1]=pixels[from+1];out.data.data[to+2]=pixels[from+2];out.data.data[to+3]=pixels[from+3];}
      for(const out of result)out.ctx.putImageData(out.data,0,0);
      sheetAudits.set(regionId,{method:'connected-alpha',figures:5,frames:result.map(o=>[o.b.l,o.b.t,o.canvas.width,o.canvas.height]),corePixels:best.map(p=>p.count)});
      return result.map(o=>o.canvas);
    }catch{return null;}
  }
  function load(path,done){
    if(typeof root.Image!=='function')return Promise.resolve(false);
    return new Promise(resolve=>{const im=new root.Image();im.decoding='async';im.onload=()=>resolve(done(im));im.onerror=()=>resolve(false);im.src=base+path+version;});
  }
  function loadRegion(id){
    const region=D.regions.find(r=>r.id===id);
    if(!region)return Promise.resolve(false);
    if(states.has(id))return states.get(id);
    const promise=Promise.all([load(region.bossSprite,im=>setSprite(region.boss,im)),load('assets/sprites/cosmic/'+id+'-enemies.png',im=>setSheet(id,im))]);
    states.set(id,promise);return promise;
  }
  // Normal gameplay can call loadRegion on approach. The art theatre requests
  // preloadAll explicitly; opening the ordinary game does not fetch 20 PNGs.
  const preloadAll=()=>Promise.all(D.regions.map(r=>loadRegion(r.id)));
  function poseFor(e,time,animated=true){
    const t=finite(time);let s=poses.get(e);
    if(!s||t<s.time){s={time:t,x:finite(e.x),phase:0,speed:0};poses.set(e,s);}
    const dt=clamp(t-s.time,0,.1),distance=Math.abs(finite(e.x)-s.x);
    if(dt>0){
      const relocated=distance>Math.max(70,finite(e.w,70)*1.5),velocity=relocated?0:distance/dt;
      s.speed+=(clamp(velocity/80)-s.speed)*(1-Math.exp(-dt*11));
      if(!relocated)s.phase+=distance/clamp(finite(e.h,80)*.45,28,110)*Math.PI*2;
    }
    s.time=t;s.x=finite(e.x);
    return {phase:s.phase,move:animated?s.speed:0,time:animated?t:0,breath:animated?Math.sin(t*2.2)*.004:0,
      wind:animated?clamp(finite(e.castProgress)):0,strike:animated?clamp(finite(e.strikeProgress)):0};
  }
  function deform(type,u,v,pose){
    const design=D.enemies[type],shape=design?.shape;
    let x=u,y=v;const stride=Math.sin(pose.phase)*pose.move,legs=smooth(.6,.84,v),upper=1-smooth(.65,.95,v);
    const flying=['specter','wisp','drone','spore','vortex','eel','whale','jellyfish','bird','phoenix','dragon','siren'].includes(shape)||['aphrodite','zeus','poseidon','selene','helios','singularitySovereign'].includes(type);
    if(!flying){
      const limb=1-smooth(.43,.55,Math.abs(u-.5)),side=u<.5?1:-1;
      x+=stride*.027*legs*side*limb;
      y-=Math.max(0,stride*side)*.026*legs*limb;
      y-=Math.sin(pose.phase*2)*pose.move*.005*upper;
    }
    if(['slug','worm','leech','eel'].includes(shape)){
      const tail=1-smooth(.2,.8,u);y+=Math.sin(pose.phase+u*8+pose.time*3)*.023*tail;x+=Math.cos(pose.phase+u*7)*pose.move*.012;
    }
    if(shape==='spider'||shape==='quadruped'){
      const foot=smooth(.52,.8,v),phase=pose.phase+(Math.floor(u*4)%2?Math.PI:0);
      x+=Math.sin(phase)*pose.move*.028*foot;y-=Math.max(0,Math.cos(phase))*pose.move*.02*foot;
    }
    if(shape==='bird'||shape==='phoenix'||type==='helios'||type==='selene'){
      const wing=smooth(.15,.45,Math.abs(u-.5))*(1-smooth(.6,.9,v));
      y+=Math.sin(pose.time*4.2+Math.abs(u-.5))*wing*.033;x+=Math.sin(pose.time*2.1)*wing*.008;
    }
    if(shape==='jellyfish'||['zeus','poseidon','singularitySovereign'].includes(type)){
      const tentacle=smooth(.4,.8,v),outer=smooth(.15,.43,Math.abs(u-.5));
      x+=Math.sin(pose.time*2.6+v*5+u*9)*.025*Math.max(tentacle,outer*.6);
      y+=Math.cos(pose.time*2+u*8)*.017*tentacle;
    }
    if(flying)y+=Math.sin(pose.time*2.1)*.007;
    if(['hermes','ares','ouranos'].includes(type)||shape==='knight'||shape==='construct'||shape==='golem'){
      const arm=mask(u,.04,.4,.1)*mask(v,.25,.68,.1);
      x+=(pose.wind*.025-pose.strike*.045-stride*.013)*arm;
      y+=(pose.wind*-.03+pose.strike*.022)*arm;
    }
    if(type==='aphrodite'||type==='chronos'){
      const outer=smooth(.18,.43,Math.abs(u-.5));
      x+=Math.sin(pose.time*1.4+v*4)*.009*outer;y+=Math.cos(pose.time*1.5+u*5)*.012*outer;
    }
    if(type==='ouranos')x+=Math.sin(pose.time*2.4+v*4)*.011*(1-smooth(.25,.6,u))*upper;
    x+=(u-.5)*pose.breath*upper;y-=pose.breath*upper;
    return [x,y];
  }
  function surface(c,art,box,warp,columns,rows){
    const [x,y,w,h]=box,grid=[];
    for(let row=0;row<=rows;row++){const line=[];for(let col=0;col<=columns;col++){const u=col/columns,v=row/rows,[du,dv]=warp(u,v);line.push({s:[x+u*w,y+v*h],d:[x+du*w,y+dv*h]});}grid.push(line);}
    function triangle(a,b,d){
      const [ax,ay]=a.s,[bx,by]=b.s,[dx,dy]=d.s,[px,py]=a.d,[qx,qy]=b.d,[rx,ry]=d.d;
      const det=(bx-ax)*(dy-ay)-(dx-ax)*(by-ay);if(Math.abs(det)<1e-9)return;
      const aa=((qx-px)*(dy-ay)-(rx-px)*(by-ay))/det,bb=((qy-py)*(dy-ay)-(ry-py)*(by-ay))/det;
      const cc=((rx-px)*(bx-ax)-(qx-px)*(dx-ax))/det,dd=((ry-py)*(bx-ax)-(qy-py)*(dx-ax))/det;
      const cx=(px+qx+rx)/3,cy=(py+qy+ry)/3;
      c.save();c.beginPath();for(const [i,[xx,yy]] of [[px,py],[qx,qy],[rx,ry]].entries()){
        const length=Math.max(.001,Math.hypot(xx-cx,yy-cy)),ex=xx+(xx-cx)/length*.32,ey=yy+(yy-cy)/length*.32;
        if(i)c.lineTo(ex,ey);else c.moveTo(ex,ey);
      }c.closePath();c.clip();c.transform(aa,bb,cc,dd,px-aa*ax-cc*ay,py-bb*ax-dd*ay);
      const l=Math.max(x,Math.min(ax,bx,dx)-1),top=Math.max(y,Math.min(ay,by,dy)-1),r=Math.min(x+w,Math.max(ax,bx,dx)+1),bottom=Math.min(y+h,Math.max(ay,by,dy)+1);
      c.drawImage(art.image,art.frame[0]+(l-x)/w*art.frame[2],art.frame[1]+(top-y)/h*art.frame[3],(r-l)/w*art.frame[2],(bottom-top)/h*art.frame[3],l,top,r-l,bottom-top);c.restore();
    }
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){triangle(grid[row][col],grid[row][col+1],grid[row+1][col]);triangle(grid[row][col+1],grid[row+1][col+1],grid[row+1][col]);}
  }
  function drawEnemy(c,g,e,time=finite(g?.time),override){
    const type=override||e.archetype||e.type,art=images.get(type);if(!art)return false;
    const animated=g?.settings?.effects!==false&&!g?.settings?.reducedMotion&&!(e.petrifiedTime>0);
    const requested=Math.max(4,finite(e.displayHeight,finite(e.h,80))),height=Number.isFinite(e.displayWidth)?Math.min(requested,Math.max(4,e.displayWidth)*art.frame[3]/art.frame[2]):requested,width=height*art.frame[2]/art.frame[3];
    const pose=poseFor(e,time,animated),box=[-width/2,-height,width,height];
    c.save();c.translate(finite(e.x),finite(e.y,438));c.scale((e.dir===-1?-1:1)*(art.flip?-1:1),1);
    if(e.hiddenTime>0)c.globalAlpha*=.15;
    if(e.petrifiedTime>0)c.filter='grayscale(1)';else if(e.hit>0)c.filter='brightness(1.18)';
    if(animated)surface(c,art,box,(u,v)=>deform(type,u,v,pose),e.boss?12:6,e.boss?10:6);else c.drawImage(art.image,...art.frame,...box);
    c.restore();return true;
  }
  const getState=()=>({ready:[...images.keys()],requestedRegions:[...states.keys()],sheets:Object.fromEntries(sheetAudits)});
  MM.CosmicArt={spriteManifest,loadRegion,preloadAll,setSprite,setSheet,drawEnemy,getState,poseFor,deform};
})(typeof window!=='undefined'?window:globalThis);
