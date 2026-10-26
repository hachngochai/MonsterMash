/* Reference artwork for Resurrection Island. Each transparent sprite is sampled
 * through one connected surface: no rectangular limbs are detached or pasted
 * over the body. Combat positions and hitboxes remain owned by IslandCombat. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const W = 960, H = 540, FLOOR = 438, TAU = Math.PI * 2;
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
  const smooth = (lo, hi, value) => {
    const t = clamp((value - lo) / (hi - lo || 1));
    return t * t * (3 - 2 * t);
  };
  const spriteFiles = Object.freeze({
    easterEgg:'easter-egg.png',ghostBunny:'ghost-bunny.png',luckyPatrick:'patrick.png',
    leprechaun:'leprechaun.png',drunkenWanderer:'drunken-wanderer.png',miniMoai:'mini-moai.png',
    awakeningMoai:'awakening-moai.png',deforestedAlpha:'deforested-alpha.png',birdman:'birdman.png',
    manaSpirit:'mana-spirit.png',makemake:'makemake.png'
  });
  const backgroundFiles = Object.freeze({
    quarry:'quarry.png', 'dead-palms':'dead-palms.png',
    'bird-cliff':'bird-cliffs.png', 'mana-sanctuary':'mana-sanctuary.png',
    volcano:'volcano.png'
  });
  const backgroundOrder = Object.keys(backgroundFiles);
  const companionFile = 'assets/sprites/island/golden-fish.png';
  const spriteManifest = Object.values(spriteFiles).map(file => 'assets/sprites/island/' + file).concat(companionFile);
  const backgroundManifest = Object.values(backgroundFiles).map(file => 'assets/backgrounds/island/' + file);

  // Cell coordinates are normalized against the complete sheet. An individual
  // archetype may be supplied to setSprite() without changing any consumer.
  const frames = Object.freeze({
    easterEgg:{sheet:'enemies', frame:[0,0,.5,1/3]},
    ghostBunny:{sheet:'enemies', frame:[.5,0,.5,1/3]},
    luckyPatrick:{sheet:'enemies', frame:[0,1/3,.5,1/3]},
    leprechaun:{sheet:'enemies', frame:[.5,1/3,.5,1/3]},
    drunkenWanderer:{sheet:'enemies', frame:[0,2/3,.5,1/3]},
    miniMoai:{sheet:'enemies', frame:[.5,2/3,.5,1/3]},
    awakeningMoai:{sheet:'bosses', frame:[0,0,.5,1/3]},
    deforestedAlpha:{sheet:'bosses', frame:[.5,0,.5,1/3]},
    birdman:{sheet:'bosses', frame:[0,1/3,.5,1/3]},
    manaSpirit:{sheet:'bosses', frame:[.5,1/3,.5,1/3]},
    makemake:{sheet:'bosses', frame:[0,2/3,1,1/3]}
  });
  const aliases = Object.freeze({giantBunny:'ghostBunny', mutantRat:'deforestedAlpha',friendlyMoai:'miniMoai'});
  // Legacy atlas injection remains supported by offline tests and custom art;
  // production loads individual alpha sprites so no anatomy crosses a tile.
  const entries = Object.fromEntries(['enemies','bosses'].map(key => [key, {image:null,ready:false,frames:new Map()}]));
  const overrides = new Map();
  const floorLines={quarry:.698,'dead-palms':.68,'bird-cliff':.689,'mana-sanctuary':.667,volcano:.692};
  const backgrounds = Object.fromEntries(backgroundOrder.map(key => [key, {image:null,ready:false,floor:floorLines[key]}]));
  const poses = new WeakMap();
  const companionPoses = new WeakMap();
  let companionArt = null;
  const script = root.document?.currentScript?.src;
  const rootURL = script && typeof URL === 'function' ? new URL('../', script).href : '';
  const version = script && typeof URL === 'function' ? new URL(script).search : '';

  function dimensions(image) {
    const width = image && (image.naturalWidth || image.width);
    const height = image && (image.naturalHeight || image.height);
    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? {width,height} : null;
  }
  function canvas(width, height) {
    try {
      const value = root.document?.createElement ? root.document.createElement('canvas')
        : typeof root.OffscreenCanvas === 'function' ? new root.OffscreenCanvas(width,height) : null;
      if (!value) return null;
      value.width = width; value.height = height;
      return value;
    } catch { return null; }
  }
  function validFrame(frame, image, normalized = false) {
    const size = dimensions(image);
    if (!size || !Array.isArray(frame) || frame.length !== 4 || !frame.every(Number.isFinite)) return null;
    let [x,y,w,h] = frame;
    if (normalized) { x *= size.width; w *= size.width; y *= size.height; h *= size.height; }
    x = clamp(x,0,size.width); y = clamp(y,0,size.height);
    w = clamp(w,0,size.width-x); h = clamp(h,0,size.height-y);
    return w > 0 && h > 0 ? [x,y,w,h] : null;
  }
  function alphaBounds(image, frame, trim = true) {
    if (!trim) return frame;
    const [x,y,w,h] = frame, surface = canvas(Math.ceil(w), Math.ceil(h));
    if (!surface) return frame;
    try {
      const c = surface.getContext('2d', {willReadFrequently:true});
      if (!c?.getImageData) return frame;
      c.drawImage(image,x,y,w,h,0,0,surface.width,surface.height);
      const pixels = c.getImageData(0,0,surface.width,surface.height).data;
      let left = surface.width, right = -1, top = surface.height, bottom = -1;
      for (let row=0;row<surface.height;row++) for (let col=0;col<surface.width;col++) {
        if (pixels[(row*surface.width+col)*4+3] <= 2) continue;
        left = Math.min(left,col); right = Math.max(right,col);
        top = Math.min(top,row); bottom = Math.max(bottom,row);
      }
      if (right < left || bottom < top) return frame;
      // A two-pixel transparent gutter retains soft light and antialiased edges.
      left = Math.max(0,left-2); top = Math.max(0,top-2);
      right = Math.min(surface.width-1,right+2); bottom = Math.min(surface.height-1,bottom+2);
      return [x+left*w/surface.width,y+top*h/surface.height,
        (right-left+1)*w/surface.width,(bottom-top+1)*h/surface.height];
    } catch { return frame; } // Storage/privacy restrictions must not break play.
  }
  function prepare(image, frame, metadata = {}) {
    let region = validFrame(frame,image,metadata.normalized === true);
    if (!region) return null;
    const inset = clamp(finite(metadata.inset),0,Math.min(region[2],region[3])*.05);
    if (inset) region = [region[0]+inset,region[1]+inset,region[2]-inset*2,region[3]-inset*2];
    return {image,frame:alphaBounds(image,region,metadata.trim !== false),
      anchor:Array.isArray(metadata.anchor) ? [clamp(finite(metadata.anchor[0],.5)),clamp(finite(metadata.anchor[1],1))] : [.5,1],
      heightScale:clamp(finite(metadata.heightScale,1.05),.5,1.6),
      flip:metadata.flip === true};
  }
  /** Set a complete sheet, or override one archetype with an individual PNG.
   * Individual metadata.frame uses source pixels unless normalized:true. */
  function setSprite(key, image, metadata = {}) {
    if (!dimensions(image)) return false;
    if (Object.hasOwn(entries,key)) {
      const entry = entries[key]; entry.image = image; entry.ready = true; entry.frames.clear();
      for (const [type,record] of Object.entries(frames)) if (record.sheet === key) {
        const custom = metadata.frames?.[type];
        const spec = Array.isArray(custom) ? {...metadata,frame:custom} : custom || {};
        const region = spec.frame || record.frame;
        const prepared = prepare(image,region,{inset:2,...metadata,...spec,normalized:spec.normalized ?? !spec.frame});
        if (prepared) entry.frames.set(type,prepared);
      }
      return entry.frames.size > 0;
    }
    const type = aliases[key] || key;
    if (!Object.hasOwn(frames,type)) return false;
    const size = dimensions(image), record = prepare(image,metadata.frame || [0,0,size.width,size.height],metadata);
    if (!record) return false;
    overrides.set(key,record); return true;
  }
  /** floor is the normalized source-image walking line, not the world floor. */
  function setBackground(key, image, metadata = {}) {
    if (typeof key === 'number') key = backgroundOrder[key];
    if (!Object.hasOwn(backgrounds,key) || !dimensions(image)) return false;
    Object.assign(backgrounds[key],{image,ready:true,floor:clamp(finite(metadata.floor,floorLines[key]),.55,.95)});
    return true;
  }
  function load(path, done) {
    if (typeof root.Image !== 'function') return Promise.resolve(false);
    return new Promise(resolve => {
      const image = new root.Image(); image.decoding = 'async';
      image.onload = () => { resolve(done(image)); };
      image.onerror = () => resolve(false);
      image.src = rootURL + path + version;
    });
  }
  const allArtReady = Promise.all([
    ...Object.entries(spriteFiles).map(([key,file]) => load('assets/sprites/island/'+file,image => setSprite(key,image))),
    ...Object.entries(backgroundFiles).map(([key,file]) => load('assets/backgrounds/island/'+file,image => setBackground(key,image))),
    load(companionFile,image => setCompanion(image))
  ]);
  function artwork(type) {
    if (overrides.has(type)) return overrides.get(type);
    const original = aliases[type] || type;
    if (overrides.has(original)) return overrides.get(original);
    const record = frames[original];
    return record ? entries[record.sheet].frames.get(original) || null : null;
  }
  function movingPose(e, t, animated, type) {
    let state = poses.get(e);
    if (!state || t < state.time) {
      state = {time:t,x:finite(e.x),phase:0,move:0,lean:0,wind:0,strike:0,releaseAt:-Infinity,
        previousState:e.islandState,skill:e.islandSkill,releaseSkill:null}; poses.set(e,state);
    }
    const dt = clamp(t-state.time,0,.1), distance = Math.abs(finite(e.x)-state.x);
    const relocated = distance > Math.max(70,finite(e.w,50)*1.6);
    const speed = dt > 0 && !relocated ? distance/dt : 0;
    if (dt > 0) {
      const blend = 1-Math.exp(-dt*12);
      const heavy = type==='awakeningMoai'||type==='makemake';
      const quadruped = type==='deforestedAlpha'||type==='mutantRat';
      const strideLength=clamp(heavy?finite(e.h,150)*.31:quadruped?finite(e.w,100)*.43:finite(e.h,65)*.58,30,105);
      state.move += (clamp(speed/(heavy?38:75))-state.move)*blend;
      // Travel, not wall-clock time, advances the foot cycle. No phase restart
      // occurs when the creature slows, pauses, casts or changes direction.
      if (!relocated) state.phase += Math.min(distance,30)/strideLength*TAU;
      if(state.previousState==='tell'&&e.islandState!=='tell'){
        state.releaseAt=t;state.releaseSkill=state.skill;
      }
      const wind=e.islandState==='tell'?smooth(0,1,finite(e.islandProgress)):0;
      state.wind+=(wind-state.wind)*(1-Math.exp(-dt*18));
      const age=t-state.releaseAt;
      const strike=age>=0&&age<.26?Math.sin(age/.26*Math.PI):age<.58&&age>=.26?-.18*Math.sin((age-.26)/.32*Math.PI):0;
      state.strike+=(strike-state.strike)*(1-Math.exp(-dt*23));
      const target = e.islandState === 'charge' ? .055 : e.islandState === 'tell' ? -.025 : 0;
      state.lean += (target-state.lean)*(1-Math.exp(-dt*10));
      state.previousState=e.islandState;
      if(e.islandSkill)state.skill=e.islandSkill;
    }
    state.x = finite(e.x); state.time = t;
    return {phase:state.phase,move:animated?state.move:0,lean:animated?state.lean:0,
      breath:animated?Math.sin(t*2.1)*.006:0,flap:animated?Math.sin(t*(e.islandState==='dive'?8:4.8)):0,
      wind:animated?state.wind:0,strike:animated?state.strike:0,
      skill:e.islandSkill||state.releaseSkill||state.skill,
      dive:animated&&e.islandState==='dive'?1:0,orbit:animated?t*.75:0};
  }
  const mask=(value,lo,hi,soft=.04)=>smooth(lo-soft,lo+soft,value)*(1-smooth(hi-soft,hi+soft,value));
  function rotated(u,v,cx,cy,angle,weight){
    const dx=u-cx,dy=v-cy,cs=Math.cos(angle),sn=Math.sin(angle);
    return [(dx*cs-dy*sn-dx)*weight,(dx*sn+dy*cs-dy)*weight];
  }
  function vertex(type,u,v,pose) {
    let x=u, y=v;
    const upper = 1-smooth(.63,.93,v), stride = Math.sin(pose.phase)*pose.move;
    const heavy=type==='awakeningMoai'||type==='makemake';
    const legStart=heavy?.68:type==='birdman'?.74:.65;
    const legs = smooth(legStart,.94,v), left = 1-smooth(.43,.52,u), right = smooth(.5,.64,u);
    const footLift=heavy?.058:.083,footStride=heavy?.061:.075;
    if (type === 'deforestedAlpha' || type === 'mutantRat') {
      // Four paw columns alternate diagonally; the hips remain connected to
      // the shoulders instead of translating the whole lower half as a card.
      const lower=smooth(.58,.94,v),phase=pose.phase;
      for(const [cx,offset]of[[.18,0],[.43,Math.PI],[.67,Math.PI],[.89,0]]){
        const paw=Math.exp(-(((u-cx)/.115)**2))*lower;
        const step=Math.sin(phase+offset)*pose.move;
        x+=step*.046*paw;y-=Math.max(0,Math.cos(phase+offset))*.072*pose.move*paw;
      }
      const tail=(1-smooth(.12,.33,u))*mask(v,.24,.72,.13);
      y+=Math.sin(pose.phase*.6+u*8)*(.012+pose.move*.026)*tail;
      const lunge=pose.strike*.04-pose.wind*.022;
      x+=lunge*smooth(.48,.85,u)*(1-smooth(.67,.92,v));
      y+=pose.wind*.028*upper-Math.abs(Math.sin(pose.phase*2))*.013*pose.move*upper;
    } else if (!['easterEgg','miniMoai','friendlyMoai','manaSpirit'].includes(type)) {
      x+=stride*footStride*legs*(left-right);
      y-=Math.max(0,Math.cos(pose.phase))*footLift*legs*left*pose.move
        +Math.max(0,-Math.cos(pose.phase))*footLift*legs*right*pose.move;
      // Alternating shoulder and head counter-rotation makes the weight shift
      // visible while the support foot stays on the same ground baseline.
      const [tx,ty]=rotated(u,v,.54,.65,stride*(heavy?.033:.05),upper);
      x+=tx;y+=ty-Math.abs(Math.sin(pose.phase*2))*(heavy?.013:.019)*pose.move*upper;
      const head=mask(u,.46,.88,.09)*(1-smooth(.38,.6,v));
      const [hx,hy]=rotated(u,v,.62,.45,-stride*.045,head);x+=hx;y+=hy;
    }
    if (type === 'birdman') {
      const leftWing=(1-smooth(.29,.5,u))*(1-smooth(.54,.74,v));
      const rightWing=smooth(.68,.85,u)*(1-smooth(.63,.77,v));
      const angle=pose.flap*.19-pose.wind*.16-pose.dive*.22;
      const [lx,ly]=rotated(u,v,.41,.43,angle,leftWing);
      const [rx,ry]=rotated(u,v,.75,.53,-angle,rightWing);
      x+=lx+rx;y+=ly+ry;
      y-=pose.flap*.008*mask(u,.4,.8,.05);
      x+=pose.dive*.018*upper;
    }
    if (type === 'ghostBunny' || type === 'giantBunny') {
      const ears = 1-smooth(.18,.4,v);
      x += Math.sin(pose.phase*.5+.4)*pose.move*.032*ears;
      y-=pose.wind*.026*upper;
    }
    if (type === 'manaSpirit') {
      // The central mask stays rigid; only the outer rune/ancestor belt orbits.
      // This is angular motion, not a sine-wave rubber deformation of the face.
      const radius=Math.hypot((u-.53)/.28,(v-.43)/.25),outer=smooth(.65,1.1,radius);
      const angle=Math.sin(pose.orbit+v*1.8)*.065;
      const [ox,oy]=rotated(u,v,.53,.49,angle,outer);x+=ox;y+=oy;
      const core=1-outer;x+=pose.wind*.012*core;y-=pose.wind*.022*core;
    } else if(type==='easterEgg') {
      const [ex,ey]=rotated(u,v,.5,.98,Math.sin(pose.phase)*pose.move*.075+pose.wind*.035,1);
      x+=ex;y+=ey-pose.wind*.018*(1-v);
    } else if(type==='awakeningMoai'||type==='makemake') {
      const fist=mask(u,.05,.49,.1)*mask(v,.28,.73,.1);
      const [ax,ay]=rotated(u,v,.48,.47,pose.wind*.14-pose.strike*.34-stride*.055,fist);
      x+=ax;y+=ay;
      if(pose.skill==='stomp')y-=pose.wind*.07*legs*right;
      y+=pose.strike*.018*upper;
    } else if(!['miniMoai','friendlyMoai','deforestedAlpha','mutantRat'].includes(type)) {
      // The arm, wrist and prop share one shoulder transform. The surrounding
      // blend remains connected, so a throw never reveals a rectangular cut.
      const throwing=['ghostBunny','giantBunny','luckyPatrick','drunkenWanderer'].includes(type);
      const arm=type==='drunkenWanderer'
        ?(1-smooth(.39,.55,u))*(1-smooth(.34,.52,v))
        :throwing?(1-smooth(.34,.54,u))*mask(v,.2,.6,.12):smooth(.72,.9,u)*mask(v,.4,.78,.09);
      const shoulder=type==='drunkenWanderer'?[.47,.35]:[.5,.47];
      const angle=pose.wind*.29-pose.strike*.5-stride*.11;
      const [ax,ay]=rotated(u,v,shoulder[0],shoulder[1],angle,arm);x+=ax;y+=ay;
    }
    x += pose.lean*upper;
    x += (u-.5)*pose.breath*upper;
    y -= pose.breath*upper;
    return [x,y];
  }
  const ordinaryMesh={columns:[0,.2,.4,.56,.76,1],rows:[0,.28,.52,.7,.87,1]};
  const bossMesh={columns:[0,.15,.29,.43,.56,.7,.84,1],rows:[0,.18,.34,.5,.64,.76,.86,.94,1]};
  const fishMesh={columns:[0,.2,.45,.72,1],rows:[0,.33,.67,1]};
  function paintSurface(c, image, source, destination, deform,mesh=ordinaryMesh) {
    const [x,y,w,h] = destination;
    const grid = mesh.rows.map(v => mesh.columns.map(u => {
      const [du,dv] = deform(u,v);
      return {source:[x+u*w,y+v*h],target:[x+du*w,y+dv*h]};
    }));
    function triangle(a,b,d) {
      const [ax,ay]=a.source,[bx,by]=b.source,[dx,dy]=d.source;
      const [px,py]=a.target,[qx,qy]=b.target,[rx,ry]=d.target;
      const determinant=(bx-ax)*(dy-ay)-(dx-ax)*(by-ay);
      if (Math.abs(determinant)<1e-8) return;
      const aa=((qx-px)*(dy-ay)-(rx-px)*(by-ay))/determinant;
      const bb=((qy-py)*(dy-ay)-(ry-py)*(by-ay))/determinant;
      const cc=((rx-px)*(bx-ax)-(qx-px)*(dx-ax))/determinant;
      const dd=((ry-py)*(bx-ax)-(qy-py)*(dx-ax))/determinant;
      const cx=(px+qx+rx)/3,cy=(py+qy+ry)/3;
      c.save(); c.beginPath();
      for (const [index,[xx,yy]] of [[px,py],[qx,qy],[rx,ry]].entries()) {
        const length=Math.max(.001,Math.hypot(xx-cx,yy-cy));
        const ex=xx+(xx-cx)/length*.4,ey=yy+(yy-cy)/length*.4;
        if (index) c.lineTo(ex,ey); else c.moveTo(ex,ey);
      }
      c.closePath(); c.clip(); c.transform(aa,bb,cc,dd,px-aa*ax-cc*ay,py-bb*ax-dd*ay);
      const left=Math.max(x,Math.min(ax,bx,dx)-1),top=Math.max(y,Math.min(ay,by,dy)-1);
      const right=Math.min(x+w,Math.max(ax,bx,dx)+1),bottom=Math.min(y+h,Math.max(ay,by,dy)+1);
      c.drawImage(image,source[0]+(left-x)/w*source[2],source[1]+(top-y)/h*source[3],
        (right-left)/w*source[2],(bottom-top)/h*source[3],left,top,right-left,bottom-top);
      c.restore();
    }
    for (let r=0;r<grid.length-1;r++) for (let col=0;col<grid[r].length-1;col++) {
      const a=grid[r][col],b=grid[r][col+1],d=grid[r+1][col],e=grid[r+1][col+1];
      triangle(a,b,d); triangle(b,e,d);
    }
  }
  function drawEnemy(c,g,e,time=finite(g.time),overrideType) {
    const type=overrideType||e.archetype||e.type, art=artwork(type);
    if (!art || !g.level?.island) return false;
    if (e.islandState==='burrow') return true;
    const t=finite(time),animated=g.settings?.effects!==false&&!g.settings?.reducedMotion&&!(e.petrifiedTime>0);
    const height=Math.max(8,finite(e.h,60))*art.heightScale,width=height*art.frame[2]/art.frame[3];
    const [anchorX,anchorY]=art.anchor,destination=[-width*anchorX,-height*anchorY,width,height];
    const pose=movingPose(e,t,animated,type);
    let alpha=1;
    if (e.hiddenTime>0) alpha=clamp((e.hiddenTime-4.7)/.3);
    if (alpha<=0) return true;
    const visualX=clamp(finite(e.x),Math.min(W/2,width*.5+3),Math.max(W/2,W-width*.5-3));
    c.save();c.globalAlpha*=alpha;c.translate(visualX,finite(e.y,FLOOR));
    if (!e.airborne&&e.islandState!=='growing') {
      c.save();c.globalAlpha*=.22;c.fillStyle='#12202a';c.beginPath();
      c.ellipse(0,2,Math.max(10,finite(e.w,35)*.55),Math.max(3,height*.018),0,0,TAU);c.fill();c.restore();
    }
    c.scale((e.dir===-1?-1:1)*(art.flip?-1:1),1);
    if (e.petrifiedTime>0) c.filter='grayscale(1)';
    else if (e.hit>0) c.filter='brightness(1.18)';
    else if (e.islandState==='sleep') c.filter='brightness(.76) saturate(.75)';
    if (e.islandState==='growing'||e.islandState==='emerge') {
      const length=e.islandState==='growing'?(MM.IslandConfig?.ordinary.wallWarning||1):(MM.IslandConfig?.boss.emergeWarning||1);
      const progress=smooth(0,1,1-clamp(finite(e.islandTimer)/length));
      c.beginPath();c.rect(destination[0]-4,-height-4,width+8,height+4);c.clip();c.translate(0,(1-progress)*height);
    }
    if (animated && !['sleep','growing'].includes(e.islandState)) paintSurface(c,art.image,art.frame,destination,(u,v)=>vertex(type,u,v,pose),e.boss?bossMesh:ordinaryMesh);
    else c.drawImage(art.image,...art.frame,...destination);
    if(e.manaShield>0||e.stoneArmor&&e.islandState!=='sleep'){
      c.filter='none';c.globalAlpha*=e.manaShield>0?.45:.16;c.strokeStyle=e.manaShield>0?'#a5eff2':'#e6cc8f';c.lineWidth=2;
      c.beginPath();c.ellipse(0,-height*.48,Math.min(width*.46,finite(e.w,60)*.62),height*.49,0,0,TAU);c.stroke();
    }
    c.restore();return true;
  }
  function setCompanion(image) {
    const size=dimensions(image);if(!size)return false;
    companionArt=prepare(image,[0,0,size.width,size.height],{anchor:[.5,.5],heightScale:1});
    return !!companionArt;
  }
  function drawCompanion(c,g,time=finite(g.time)) {
    if(!companionArt||!g.player||g.level?.id===70||MM.SaveManager?.unlocked(g,200)!==true)return false;
    const t=finite(time),p=g.player,animated=g.settings?.effects!==false&&!g.settings?.reducedMotion;
    let state=companionPoses.get(g);
    const targetX=finite(p.x)+Math.sin(t*1.7)*(animated?6:0),targetY=finite(p.y,FLOOR)-finite(p.h,54)-34+(animated?Math.sin(t*2.8)*3:0);
    if(!state||t<state.time){state={time:t,x:targetX,y:targetY,dir:p.dir||1};companionPoses.set(g,state);}
    const dt=clamp(t-state.time,0,.1),blend=1-Math.exp(-dt*11);
    if(dt>0){state.x+=(targetX-state.x)*blend;state.y+=(targetY-state.y)*blend;state.dir=p.dir||state.dir;state.time=t;}
    const ratio=companionArt.frame[2]/companionArt.frame[3],height=Math.min(20,30/ratio),width=height*ratio;
    c.save();c.translate(clamp(state.x,width*.5,W-width*.5),Math.max(15,state.y));c.scale(state.dir===-1?-1:1,1);
    const destination=[-width*.5,-height*.5,width,height];
    if(animated)paintSurface(c,companionArt.image,companionArt.frame,destination,(u,v)=>{
      const tail=1-smooth(.18,.46,u),fin=mask(u,.36,.75,.1)*Math.abs(v-.5)*2;
      return [u+Math.sin(t*8+v*2)*.03*tail,v+Math.sin(t*8)*.07*tail+Math.sin(t*7+1)*.025*fin];
    },fishMesh);else c.drawImage(companionArt.image,...companionArt.frame,...destination);
    c.restore();return true;
  }
  function drawBackground(c,g,time=finite(g.time)) {
    if (!g.level?.island) return false;
    const band=clamp(Math.floor((finite(g.level.id,201)-201)/10),0,4),entry=backgrounds[backgroundOrder[band]];
    if (!entry.ready) return false;
    const size=dimensions(entry.image),sourceFloor=size.height*entry.floor;
    const animated=g.settings?.effects!==false&&!g.settings?.reducedMotion,t=finite(time);
    const scale=Math.max(W/size.width,FLOOR/sourceFloor)*1.025;
    const width=size.width*scale,x=(W-width)/2+(animated?Math.sin(t*.08)*4:0),y=FLOOR-sourceFloor*scale;
    c.save();c.beginPath();c.rect(0,0,W,FLOOR);c.clip();
    c.drawImage(entry.image,0,0,size.width,sourceFloor,x,y,width,sourceFloor*scale);c.restore();
    const sourceGround=size.height-sourceFloor,groundHeight=Math.max(H-FLOOR,sourceGround*scale);
    c.save();c.beginPath();c.rect(0,FLOOR,W,H-FLOOR);c.clip();
    c.drawImage(entry.image,0,sourceFloor,size.width,sourceGround,x,FLOOR,width,groundHeight);c.restore();
    return true;
  }
  function getState() {
    return {sprites:Object.fromEntries(Object.entries(entries).map(([key,e])=>[key,{ready:e.ready,frames:e.frames.size}])),
      overrides:[...overrides.keys()],companion:{ready:!!companionArt},backgrounds:Object.fromEntries(Object.entries(backgrounds).map(([key,e])=>[key,{ready:e.ready,floor:e.floor}]))};
  }
  MM.IslandArt={spriteManifest,backgroundManifest,allArtReady,setSprite,setBackground,setCompanion,drawEnemy,drawBackground,drawCompanion,getState};
})(typeof window!=='undefined'?window:globalThis);
