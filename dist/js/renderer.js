/* Monster Mash — original block characters, hand-painted with native Canvas 2D. */
(function () {
  'use strict';
  const font = window.MM?.Typography?.sans || '"Noto Sans", Arial, sans-serif';
  const W = 960, H = 540, GROUND = 438, TAU = Math.PI * 2;
  const bossFacingStates = new WeakMap();
  const bossMotionStates = new WeakMap();
  function bossLocomotion(enemy,time,effects,type){
    if(!effects)return {phase:0,intensity:0,bob:0,lean:0};
    let state=bossMotionStates.get(enemy);
    if(!state||time<state.time){state={time,x:enemy.x||0,intensity:.15};bossMotionStates.set(enemy,state);}
    const dt=Math.max(0,Math.min(.1,time-state.time));
    if(dt>0){
      const dx=(enemy.x||0)-state.x,speed=Math.max(Math.abs(enemy.vx||0),Math.abs(dx)/dt);
      const moving=speed>5||/approach|walk|patrol|charge|chase|pursuit|swoop/.test(enemy.abyssState||enemy.mythicState||enemy.dragonState||'');
      const target=moving?Math.max(.55,Math.min(1,speed/70)):.14;
      state.intensity+=(target-state.intensity)*(1-Math.exp(-dt*11));state.velocity=dx/dt;state.x=enemy.x||0;state.time=time;
    }
    const phase=time*(type==='spider'?11:type==='dragon'?5:8.4)+(enemy.motionSeed||0);
    const attacking=/charge|swoop|pounce|claw|bite|combo|stomp|attack/.test(enemy.abyssState||enemy.mythicState||enemy.dragonState||'');
    return {phase,intensity:state.intensity,bob:Math.sin(phase*2)*2.1*state.intensity,lean:attacking?0:Math.max(-.055,Math.min(.055,(enemy.vx||state.velocity||0)*.0006))};
  }
  function smoothBossFacing(enemy,time,effects){
    const target=enemy.dir<0?-1:1;if(!effects)return target;
    let state=bossFacingStates.get(enemy);
    if(!state||time<state.time){state={time,value:target,target,start:target,started:time};bossFacingStates.set(enemy,state);}
    if(state.target!==target){state.start=state.value;state.target=target;state.started=time;}
    const p=Math.max(0,Math.min(1,(time-state.started)/.32)),ease=p*p*(3-2*p);
    state.value=state.start+(state.target-state.start)*ease;state.time=time;return state.value;
  }
  // User-supplied character art is decoded once; native drawings remain available
  // while an image loads or when a browser cannot load a particular asset.
  const spriteFiles = {
    fire:'dragons/fire.png',ice:'dragons/ice.png',wind:'dragons/wind.png',
    earth:'dragons/earth.png',lightning:'dragons/lightning.png',ancient:'dragons/ancient.png',
    lion:'mythic/lion.png',medusa:'mythic/medusa.png',goatman:'mythic/goatman.png',chimera:'mythic/chimera.png'
  };
  const spriteEntries = Object.fromEntries(Object.keys(spriteFiles).map(name=>[name,{image:null,ready:false}]));
  const ImageType = window.Image;
  const scriptURL = typeof document!=='undefined' ? document.currentScript?.src : null;
  const spriteBase = scriptURL ? new URL('../assets/sprites/',scriptURL).href : 'assets/sprites/';
  const spriteReady = Promise.all(Object.entries(spriteFiles).map(([name,file])=>{
    if(typeof ImageType!=='function')return Promise.resolve();
    return new Promise(resolve=>{
      const image=new ImageType(),entry=spriteEntries[name];entry.image=image;image.decoding='async';
      image.onload=()=>{entry.ready=(image.naturalWidth||image.width)>0;resolve();};
      image.onerror=()=>{entry.ready=false;resolve();};
      image.src=spriteBase+file+'?v=3.2.2';
    });
  }));
  window.MM=window.MM||{};
  window.MM.SpriteArt={entries:spriteEntries,ready:spriteReady,set(name,image){
    if(spriteEntries[name]){spriteEntries[name].image=image;spriteEntries[name].ready=!!image&&(image.naturalWidth||image.width)>0;}
  }};
  function drawSprite(c,name,dir,t,e,effects) {
    const entry=spriteEntries[name];if(!entry?.ready)return false;
    const image=entry.image,iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const dragon=['fire','ice','wind','earth','lightning','ancient'].includes(name);
    const facing=['lion','medusa','chimera'].includes(name)?-1:1;
    const factor=dragon?1.25:name==='chimera'?1.2:1.1;
    const height=(e.h||54)*factor,width=height*iw/ih;
    const pivot=dragon ? .59 : name==='lion' ? .54 : name==='goatman' ? .47 : name==='chimera' ? .49 : .5;
    const flying=dragon||e.mythicAir,gait=e.boss?bossLocomotion(e,t,effects,e.type||name):null;
    const bob=effects&&flying?Math.sin(t*4.1+(e.motionSeed||0))*Math.min(4,(e.h||54)*.018):gait?.bob||0;
    const attacking=/^(axe|stab|spear|claw|bite|swoop)$/.test(e.mythicState||'');
    const tilt=effects?(flying?Math.sin(t*3.1+(e.motionSeed||0))*.035:attacking?Math.sin((e.mythicProgress||0)*Math.PI)*.065:gait?.lean||0):0;
    c.save();
    // Undo the vector drawer's anisotropic scale before fitting the PNG.
    c.scale(40/(e.w||40),54/(e.h||54));c.scale((dir||1)*facing,1);c.translate(0,bob);c.rotate(tilt);
    c.drawImage(image,-width*pivot,-height*.967,width,height);
    c.restore();return true;
  }
  const palettes = [
    { sky: '#111529', horizon: '#41405c', far: '#24273c', near: '#171d2d', ground: '#151c26', soil: '#101620', edge: '#556461', glow: '#b9a2ff', mist: '#a8aec5', moon: '#ddd8cb', name: 'cemetery' },
    { sky: '#0b1926', horizon: '#244f4b', far: '#183c3c', near: '#102827', ground: '#132924', soil: '#0b1919', edge: '#668369', glow: '#9ee1a2', mist: '#85bba5', moon: '#d8e9cd', name: 'woods' },
    { sky: '#102030', horizon: '#304d62', far: '#233c4e', near: '#162d3d', ground: '#1b3039', soil: '#14252d', edge: '#679199', glow: '#8ee7ee', mist: '#9bcfdc', moon: '#d5f1e9', name: 'city' },
    { sky: '#261524', horizon: '#6b364b', far: '#422433', near: '#291b2a', ground: '#291c29', soil: '#18141f', edge: '#82605f', glow: '#ff9a9d', mist: '#b97f8f', moon: '#f2a690', name: 'castle' },
    { sky: '#171624', horizon: '#514039', far: '#3d3035', near: '#28232d', ground: '#292729', soil: '#181820', edge: '#927950', glow: '#ffc878', mist: '#c09968', moon: '#e5b770', name: 'eclipse' },
    { sky: '#141b20', horizon: '#343d32', far: '#22302c', near: '#1c2623', ground: '#242a25', soil: '#171b20', edge: '#727650', glow: '#d4cd89', mist: '#8c9b7f', moon: '#b4bca0', name: 'cursed-valley' },
    { sky: '#141b20', horizon: '#343d32', far: '#22302c', near: '#1c2623', ground: '#242a25', soil: '#171b20', edge: '#727650', glow: '#d4cd89', mist: '#8c9b7f', moon: '#b4bca0', name: 'blood-valley' },
    { sky: '#141b20', horizon: '#343d32', far: '#22302c', near: '#1c2623', ground: '#242a25', soil: '#171b20', edge: '#727650', glow: '#d4cd89', mist: '#8c9b7f', moon: '#b4bca0', name: 'primal-forest' },
    { sky: '#141c37', horizon: '#496781', far: '#334961', near: '#24374b', ground: '#303a43', soil: '#1d2634', edge: '#93aaa0', glow: '#b9e8ed', mist: '#a6c1d0', moon: '#ede8d8', name: 'dragon-peaks' },
    { sky: '#221b36', horizon: '#7b647c', far: '#51485c', near: '#393949', ground: '#454545', soil: '#282b36', edge: '#b9aa83', glow: '#f2d5a2', mist: '#cab6b3', moon: '#f0e0c8', name: 'mythic-ruins' }
  ];
  const scenes = new Map();
  function seedRandom(seed) {
    let s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }
  function rounded(c, x, y, w, h, r, fill, stroke, lineWidth = 1) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  function ellipse(c, x, y, rx, ry, color) {
    c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); c.fillStyle = color; c.fill();
  }
  function line(c, x1, y1, x2, y2, color, width = 1) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  function polygon(c, points, fill, stroke, width = 1) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function halo(c, x, y, radius, color, alpha = .2) {
    c.save(); c.globalAlpha *= alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, color); g.addColorStop(1, color + '00');
    c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }
  function tree(c, x, base, height, color, thickness = 8, branch = 0) {
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineCap = 'round';
    polygon(c, [[x - thickness / 2, base], [x - thickness * .25, base - height], [x + thickness * .28, base - height], [x + thickness / 2, base]], color);
    const r = seedRandom(123 + Math.floor(x));
    for (let i = 0; i < 7; i++) {
      const direction = i % 2 ? -1 : 1, y = base - height * (.25 + i * .092);
      const reach = height * (.2 + r() * .19), tip = x + direction * reach;
      c.lineWidth = Math.max(1, thickness * (.48 - i * .05));
      c.beginPath(); c.moveTo(x, y + height * .05); c.quadraticCurveTo(x + direction * reach * .18, y - height * .04, tip, y - height * (.10 + r() * .06)); c.stroke();
      c.lineWidth *= .65;
      c.beginPath(); c.moveTo(x + direction * reach * .6, y - height * .065); c.lineTo(x + direction * reach * .69, y - height * .18); c.stroke();
      if (branch) {
        ellipse(c, tip, y - height * .14, reach * .58, height * .07, color);
        ellipse(c, x + direction * reach * .5, y - height * .18, reach * .57, height * .09, color);
      }
    }
    c.restore();
  }
  function grave(c, x, y, size, color, cross = false) {
    c.save(); c.translate(x, y); c.rotate((x % 7 - 3) * .014);
    if (cross) { rounded(c, -size * .14, -size, size * .28, size, 2, color); rounded(c, -size * .4, -size * .78, size * .8, size * .23, 2, color); }
    else {
      rounded(c, -size * .36, -size, size * .72, size, size * .29, color, '#95a2a014', 1);
      line(c, -size * .19, -size * .48, size * .19, -size * .48, '#a4aaa42e', 2);
      line(c, -size * .13, -size * .35, size * .13, -size * .35, '#a4aaa426', 2);
      if (size > 38) { line(c, 0, -size * .83, 0, -size * .58, '#a4aaa449', 2); line(c, -size * .1, -size * .72, size * .1, -size * .72, '#a4aaa449', 2); }
    }
    c.restore();
  }
  function web(c, x, y, span, direction, opacity) {
    c.save(); c.translate(x, y); c.scale(direction, 1); c.strokeStyle = '#ddd7bf'; c.globalAlpha = opacity; c.lineWidth = .75;
    for (let i = 0; i <= 5; i++) { const a = i * Math.PI / 10; line(c, 0, 0, Math.cos(a) * span, Math.sin(a) * span, '#ddd7bf', .75); }
    for (let j = 1; j < 6; j++) {
      c.beginPath(); const len = span * j / 6; c.moveTo(len, 0);
      for (let i = 1; i <= 5; i++) { const a = i * Math.PI / 10, pa = (i - 1) * Math.PI / 10; c.quadraticCurveTo(Math.cos((a + pa) / 2) * len * .89, Math.sin((a + pa) / 2) * len * .89, Math.cos(a) * len, Math.sin(a) * len); }
      c.stroke();
    }
    c.restore();
  }
  function tower(c, x, base, h, w, color, windows) {
    rect(c, x, base - h, w, h, color);
    polygon(c, [[x - 7, base - h], [x + w * .5, base - h - w * .65], [x + w + 7, base - h]], color);
    if (windows) for (let row = 0; row < 3; row++) { rounded(c, x + w * .4, base - h + 21 + row * 37, w * .17, 17, 5, '#bb6a6933'); }
  }
  function ruins(c, x, y, scale, color) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    rect(c, -8, -125, 25, 125, color); rect(c, 63, -137, 24, 137, color);
    polygon(c, [[-14, -125], [-14, -145], [33, -164], [66, -159], [94, -146], [94, -137], [61, -139], [32, -143]], color);
    rect(c, -14, -19, 38, 11, color); rect(c, 56, -16, 39, 11, color);
    line(c, 1, -108, 1, -26, '#97b8c118', 3); line(c, 76, -119, 76, -22, '#97b8c118', 3);
    c.restore();
  }
  function thornVine(c, points, color, width, thornSize = 7) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) c.quadraticCurveTo(points[i][0], points[i][1], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
    c.lineTo(points[points.length - 1][0], points[points.length - 1][1]); c.strokeStyle = color; c.lineWidth = width; c.stroke();
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(1, Math.hypot(dx, dy));
      for (const side of [-1, 1]) {
        const x = a[0] + dx * .55, y = a[1] + dy * .55, nx = -dy / len * side, ny = dx / len * side;
        polygon(c, [[x - dx / len * 4, y - dy / len * 4], [x + nx * (width / 2 + thornSize), y + ny * (width / 2 + thornSize)], [x + dx / len * 4, y + dy / len * 4]], color);
      }
    }
    c.restore();
  }
  function createScene(world) {
    const p = palettes[world], r = seedRandom(7617 + world * 91);
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    const sky = c.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, p.sky); sky.addColorStop(.6, p.horizon); sky.addColorStop(1, p.near);
    rect(c, 0, 0, W, H, sky);
    for (let i = 0; i < 88; i++) { const x = r() * W, y = r() * 280; ellipse(c, x, y, r() > .9 ? 1.1 : .6, .7, '#e2dde0' + (r() > .7 ? '8c' : '37')); }
    const moonX = world === 4 ? 713 : 728, moonY = world === 4 ? 113 : 122;
    if (world !== 5) {
    halo(c, moonX, moonY, 157, p.moon, .18); halo(c, moonX, moonY, 89, p.moon, .17);
    ellipse(c, moonX, moonY, world === 3 || world === 4 ? 46 : 38, world === 3 || world === 4 ? 46 : 38, p.moon);
    ellipse(c, moonX - 12, moonY - 9, 9, 11, p.sky + '12'); ellipse(c, moonX + 10, moonY + 13, 13, 10, p.sky + '13'); ellipse(c, moonX + 14, moonY - 19, 6, 5, p.sky + '15');
    if (world === 4) {
      ellipse(c, moonX - 2, moonY - 2, 43, 43, '#1d1b29');
      ellipse(c, moonX - 2, moonY - 2, 41, 41, '#151521');
      halo(c, moonX, moonY + 43, 21, p.glow, .2);
    }
    }
    // Broad brush cloud bands and layered hills keep silhouettes readable.
    for (let i = 0; i < 8; i++) { const x = r() * W, y = 110 + r() * 132; ellipse(c, x, y, 80 + r() * 180, 8 + r() * 12, p.sky + '33'); }
    for (let layer = 0; layer < 3; layer++) {
      const base = 297 + layer * 47, pts = [[0, H], [0, base]];
      for (let x = 0; x <= W + 70; x += 65) pts.push([x, base - r() * (58 - layer * 12)]);
      pts.push([W, H]); polygon(c, pts, layer === 0 ? p.far : layer === 1 ? p.near : p.ground);
    }
    if (world === 0 || world === 1) {
      for (let i = 0; i < 15; i++) tree(c, i * 76 - 20 + r() * 35, 378 + r() * 25, 108 + r() * 114, p.far, 5 + r() * 7, world === 1);
      for (let i = 0; i < 12; i++) grave(c, 30 + i * 87 + r() * 35, 401 + r() * 13, 22 + r() * 24, '#344044', i % 5 === 0);
      if (world === 0) {
        rect(c, 608, 338, 201, 68, '#19242d');
        polygon(c, [[595, 340], [634, 307], [785, 307], [822, 340]], '#1e2a34');
        rect(c, 651, 356, 20, 50, '#111d28'); rect(c, 733, 356, 20, 50, '#111d28');
        line(c, 662, 352, 662, 368, '#a9bbad44', 2); line(c, 656, 358, 668, 358, '#a9bbad44', 2);
      }
      tree(c, -9, GROUND, 323, '#111924', 22, world === 1); tree(c, 953, GROUND, 293, '#111924', 20, world === 1);
      if (world === 1) { web(c, 0, 30, 202, 1, .13); web(c, W, 51, 181, -1, .13); web(c, 42, 207, 93, 1, .1); }
      for (let i = 0; i < 24; i++) { const x = 15 + i * 41; line(c, x, 398, x, 431, '#253437', 2); polygon(c, [[x - 3, 397], [x, 390], [x + 3, 397]], '#253437'); }
      line(c, 0, 411, W, 411, '#273638', 2);
    } else if (world === 2) {
      // Forgotten streets: silent windows, a ruined station and cyan lamps.
      for (let i = 0; i < 7; i++) {
        const x = i * 142 - 11, h = 108 + r() * 78, width = 96 + r() * 31;
        rect(c, x, 397 - h, width, h, '#203745');
        polygon(c, [[x - 5, 397 - h], [x + width * .48, 377 - h], [x + width + 4, 397 - h]], '#203745');
        for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) rounded(c, x + 13 + col * 29, 412 - h + row * 29, 12, 16, 3, (row + col + i) % 4 === 0 ? '#b4e8e026' : '#132b38');
      }
      ruins(c, 121, 415, .85, '#233d49'); ruins(c, 583, 411, 1.17, '#233b48'); ruins(c, 803, 420, .7, '#29424b');
      for (let i = 0; i < 8; i++) { const x = i * 137 + r() * 30; polygon(c, [[x, 414], [x + 14, 394], [x + 42, 399], [x + 62, 418]], '#30434a'); }
      tree(c, 17, 438, 274, '#122938', 13); tree(c, 937, 438, 222, '#122938', 11);
      for (let i = 0; i < 6; i++) halo(c, 102 + i * 154, 344 + r() * 45, 29, '#9adddd', .07);
      for (const x of [265, 508, 864]) {
        line(c, x, 429, x, 304, '#1b303c', 4); line(c, x, 304, x + 17, 304, '#1b303c', 3);
        rounded(c, x + 10, 305, 13, 18, 3, '#aecdc36e', '#1b303c', 2); halo(c, x + 17, 316, 27, p.glow, .1);
      }
    } else if (world === 3) {
      tower(c, 562, 410, 148, 61, '#342333', true); tower(c, 682, 410, 192, 73, '#342333', true); tower(c, 802, 410, 136, 54, '#342333', true);
      rect(c, 602, 301, 204, 109, '#342333');
      for (let i = 0; i < 11; i++) rect(c, 600 + i * 19, 294, 12, 14, '#342333');
      rounded(c, 692, 349, 40, 61, 20, '#211b2a');
      tower(c, 112, 420, 114, 43, '#3c2935', false);
      tree(c, 5, 438, 261, '#201924', 16); tree(c, 944, 438, 250, '#201924', 14);
      for (let i = 0; i < 13; i++) { const x = i * 85; rect(c, x, 379, 10, 59, '#392733'); line(c, x, 378, x + 70, 394, '#392733', 3); }
    } else if (world === 4) {
      // A monumental basalt temple beneath the eclipsed sun closes the campaign.
      polygon(c, [[476, 408], [495, 387], [929, 387], [949, 408]], '#31292f');
      rect(c, 506, 370, 409, 17, '#463b36'); rect(c, 525, 357, 371, 15, '#3c3333');
      for (const x of [538, 594, 810, 866]) {
        rect(c, x, 227, 22, 135, '#423736'); rect(c, x - 6, 217, 34, 12, '#55453c'); rect(c, x - 5, 351, 32, 11, '#55453c');
        line(c, x + 7, 236, x + 7, 343, '#aa91672e', 2);
      }
      polygon(c, [[520, 220], [538, 202], [644, 202], [713, 176], [782, 202], [892, 202], [909, 220]], '#4c3e38', '#7661463b');
      polygon(c, [[608, 353], [608, 265], [637, 228], [713, 211], [789, 228], [817, 265], [817, 353]], '#463932');
      rounded(c, 643, 243, 140, 112, 48, '#171c27', '#9f805045', 4);
      halo(c, 713, 299, 91, p.glow, .07);
      c.strokeStyle = '#a88c526e'; c.lineWidth = 2; c.beginPath(); c.arc(713, 299, 43, 0, TAU); c.stroke();
      c.strokeStyle = '#c9a65c38'; c.lineWidth = 1; c.beginPath(); c.arc(713, 299, 36, 0, TAU); c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, x = 713 + Math.cos(a) * 55, y = 299 + Math.sin(a) * 55;
        line(c, x - 2, y - 3, x + 2, y + 3, '#dbb8786b', 1.3); line(c, x - 2, y + 3, x + 2, y, '#dbb8786b', 1.3);
      }
      for (const x of [94, 211, 388]) {
        polygon(c, [[x - 12, 421], [x - 9, 311], [x + 4, 283], [x + 12, 307], [x + 11, 421]], '#3c3335');
        line(c, x, 327, x, 359, '#caa35d6b', 2); line(c, x - 4, 339, x + 4, 347, '#caa35d6b', 1.5);
      }
      tree(c, 2, 438, 251, '#1d1d28', 14); tree(c, 957, 438, 267, '#1d1d28', 16);
      for (const x of [557, 864]) { rect(c, x, 333, 6, 29, '#382c2d'); ellipse(c, x + 3, 332, 4, 7, '#e2b374'); halo(c, x + 3, 332, 24, p.glow, .17); }
    } else if (world === 8) {
      // High open sky gives the flying dragons room to read above the arena.
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 7; i++) {
        const x = i * 170 - 55 + r() * 36, base = 431 + layer * 3, peak = 125 + layer * 66 + r() * 65;
        polygon(c, [[x-61,base],[x-42,peak+110],[x-13,peak+42],[x+6,peak],[x+28,peak+71],[x+74,base]], ['#3e5268','#31485c','#263d4e'][layer]);
        polygon(c, [[x-13,peak+42],[x+6,peak],[x+28,peak+71],[x+8,peak+53]], '#d4dcd74c');
        line(c,x+6,peak+9,x+13,peak+134,'#a6c8ce20',2);
      }
      for (const [x,y,size,col] of [[104,352,19,'#dd8b6b'],[836,371,26,'#99d8e9'],[675,408,15,'#c6a9eb'],[298,414,13,'#bad38c']]) {
        polygon(c,[[x-size*.6,y],[x-size*.4,y-size],[x,y-size*1.55],[x+size*.5,y-size*.4],[x+size*.4,y]],col+'a8','#ecf8ea49');
        line(c,x,y-size*1.4,x+size*.1,y-3,'#f3f7e4a0',1);halo(c,x,y-size*.6,size*2,col,.08);
      }
      for (let i=0;i<6;i++) ellipse(c,80+i*183,267+(i%2)*43,129,12,'#c5d9e719');
      polygon(c,[[0,438],[0,366],[36,339],[69,382],[101,394],[136,438]],'#263c47');
      polygon(c,[[960,438],[960,346],[925,319],[894,381],[862,400],[830,438]],'#263c47');
    } else if (world === 9) {
      // Fluted columns and a broken pediment place the final chapter in Greek ruins.
      for (const [x,base,height,width] of [[95,427,188,32],[238,422,135,27],[589,423,166,30],[768,425,210,37],[892,427,143,29]]) {
        rect(c,x,base-height,width,height,'#605a66');rect(c,x-7,base-height-12,width+14,13,'#8c7d80');
        rect(c,x-9,base-12,width+18,12,'#7d746f');
        for(let fl=0;fl<4;fl++)line(c,x+5+fl*(width-9)/3,base-height+8,x+5+fl*(width-9)/3,base-18,'#b8aa9525',2);
        polygon(c,[[x,base-height+47],[x+13,base-height+55],[x+6,base-height+68],[x+width,base-height+82]],'#373b4b');
      }
      polygon(c,[[53,230],[53,214],[126,175],[230,202],[278,222],[275,236],[215,226],[131,203]],'#776a75','#b49b8e3b');
      polygon(c,[[703,203],[704,186],[790,146],[897,183],[911,201],[861,193],[787,171],[741,192]],'#74636f','#b49b8e3b');
      for(const x of [367,428,481]) {rounded(c,x,362,22,64,3,'#696166');line(c,x+5,367,x+5,413,'#b6a38a36',2);}
      for(let i=0;i<12;i++){const x=27+i*86,y=424+(i%2)*6;polygon(c,[[x-16,y],[x-12,y-12],[x+4,y-21],[x+23,y-10],[x+28,y]],i%2?'#76706a':'#5e5c61');}
      thornVine(c,[[10,425],[29,335],[20,270],[37,195]],'#293d3a',9,3);
      thornVine(c,[[948,425],[927,347],[941,273],[924,231]],'#293d3a',10,3);
      for(const x of [339,638]) {rect(c,x,392,9,37,'#5c535a');ellipse(c,x+4,391,5,11,'#e9bd8c');halo(c,x+4,390,30,'#edb77e',.12);}
    } else {
      // Primordial canopy and thorn roots: earthy, dense, and distinct from the web forest.
      for (let i = 0; i < 13; i++) {
        const x = i * 81 - 21 + r() * 24;
        tree(c, x, 423, 243 + r() * 120, i % 3 ? '#24352e' : '#302a38', 17 + r() * 17, 1);
      }
      for (const x of [264, 483, 706]) polygon(c, [[x, 103], [x + 12, 98], [x + 92, 427], [x + 26, 427]], '#dceab309');
      for (const x of [102, 328, 605, 843]) {
        const bend = x % 3 ? 1 : -1;
        thornVine(c, [[x, 428], [x + bend * 34, 337], [x - bend * 17, 237], [x + bend * 20, 133], [x - bend * 16, 32]], '#25332d', 28, 10);
        thornVine(c, [[x - 60, 427], [x - 28, 406], [x, 414], [x + 29, 399], [x + 82, 430]], '#354035', 12, 6);
      }
      for (let i = 0; i < 12; i++) {
        const x = i * 94 - 28, y = 33 + r() * 30;
        ellipse(c, x, y, 74 + r() * 31, 47 + r() * 22, i % 2 ? '#172720' : '#1b2528');
        thornVine(c, [[x - 39, y + 17], [x - 12, y + 84], [x + 16, y + 101], [x + 8, y + 169]], '#283830', 5, 6);
      }
      for (let i = 0; i < 8; i++) {
        const x = i * 132 + 37, y = 408 + r() * 13;
        for (let leaf = -2; leaf <= 2; leaf++) polygon(c, [[x, y], [x + leaf * 13 + 4, y - 27 + Math.abs(leaf) * 5], [x + leaf * 16, y - 11]], '#3f4f38');
      }
      for (const x of [358, 547, 746]) {
        polygon(c, [[x - 20, 425], [x - 14, 384], [x + 5, 369], [x + 17, 386], [x + 26, 428]], '#3e4439', '#817b4b1f');
        thornVine(c, [[x - 18, 431], [x + 2, 415], [x - 3, 390], [x + 13, 382]], '#566047', 4, 3);
      }
      thornVine(c, [[-13, -20], [22, 91], [-8, 191], [28, 309], [8, 425]], '#101d1c', 42, 12);
      thornVine(c, [[975, -20], [936, 112], [970, 224], [936, 344], [954, 425]], '#101d1c', 42, 12);
    }
    const ground = c.createLinearGradient(0, GROUND, 0, H); ground.addColorStop(0, p.ground); ground.addColorStop(1, p.soil);
    rect(c, 0, GROUND, W, H - GROUND, ground);
    const groundPoints = [[0, GROUND + 8], [0, GROUND]];
    for (let x = 0; x < W; x += 9) groundPoints.push([x, GROUND - r() * 4]);
    groundPoints.push([W, GROUND], [W, GROUND + 8]); polygon(c, groundPoints, p.edge + '75');
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = GROUND + 5 + r() * 95;
      ellipse(c, x, y, 1 + r() * 4, .6 + r() * 1.2, i % 3 ? '#a59a7a14' : '#080d144c');
    }
    for (let i = 0; i < 50; i++) {
      const x = r() * W, size = 2 + r() * 8;
      line(c, x, GROUND + 1, x - size / 2, GROUND - size, p.edge + '80', 1);
      line(c, x, GROUND + 1, x + size / 2, GROUND - size * .7, p.edge + '6b', 1);
    }
    for (const x of [42, 197, 766, 914]) {
      ellipse(c, x, 448, 15, 5, '#0b111961');
      polygon(c, [[x - 13, 446], [x - 9, 437], [x + 1, 431], [x + 11, 438], [x + 16, 447]], p.edge + '48', p.edge + '27');
    }
    // A restrained vignette frames the arena without obscuring enemy entrances.
    const vignette = c.createRadialGradient(W / 2, 280, 210, W / 2, 280, 620); vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#07091488');
    rect(c, 0, 0, W, H, vignette);
    return canvas;
  }
  function drawAtmosphere(c, world, t, effects) {
    const p = palettes[world];
    c.save();
    for (let i = 0; i < 3; i++) {
      const shift = effects ? Math.sin(t * .12 + i * 2.3) * 42 : 0;
      ellipse(c, 230 + i * 256 + shift, 420 - i * 9, 258, 15 + i * 6, p.mist + (i === 0 ? '09' : '07'));
    }
    if (effects) {
      for (let i = 0; i < (world === 5 ? 7 : 18); i++) {
        const x = ((i * 173.61 + Math.sin(t * .15 + i) * 17 + t * (world === 4 ? 4 : 1.3)) % 1040) - 40;
        const y = 270 + ((i * 57.31 - t * (world === 4 ? 8 : 1.1)) % 155 + 155) % 155;
        const opacity = .16 + Math.sin(t * 1.2 + i * 3.1) * .12;
        c.globalAlpha = opacity; ellipse(c, x, y, i % 3 === 0 ? 1.6 : .9, i % 3 === 0 ? 1.6 : .9, p.glow);
      }
    }
    c.restore();
  }
  function shadow(c, x, y, width, flying) { ellipse(c, x, Math.min(GROUND + 3, y + 3), width * .65, flying ? 4 : 5, '#060b1466'); }
  function eye(c, x, y, size, color, direction, angry = false) {
    rounded(c, x - size / 2, y - size / 2, size, size, size * .25, color);
    ellipse(c, x + direction * size * .13, y + .5, size * .16, size * .21, '#111721');
    ellipse(c, x - size * .16, y - size * .19, size * .1, size * .1, '#ffffffbe');
    if (angry) line(c, x - size * .55, y - size * .6, x + size * .55, y - size * .25, '#19202a', 2);
  }
  function drawRewardBone(c, x, y, size, angle, dark = false) {
    c.save();c.translate(x,y);c.rotate(angle);c.lineCap='round';
    const outline='#202330',bone=dark?'#d6b6ff':'#f2e6c8';
    line(c,-size*.33,0,size*.33,0,outline,size*.34);line(c,-size*.33,0,size*.33,0,bone,size*.19);
    for(const side of [-1,1])for(const edge of [-1,1]){ellipse(c,side*size*.35,edge*size*.1,size*.13,size*.13,outline);ellipse(c,side*size*.35,edge*size*.1,size*.085,size*.085,bone);}
    line(c,-size*.22,-size*.035,size*.22,-size*.035,'#fff8e2',.8);c.restore();
  }
  function drawRewardAxe(c, x, y, angle, size=1) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    line(c,0,-20,0,17,'#19232c',5);line(c,0,-19,0,16,'#a58b62',2.6);
    for(let i=0;i<3;i++)line(c,-2,6+i*3,2,7+i*3,'#e7c893',1.3);
    polygon(c,[[-2,-19],[-12,-25],[-18,-21],[-18,-9],[-12,-4],[-3,-9]],'#8b9ba5','#19232c',1.5);
    polygon(c,[[2,-19],[12,-25],[18,-21],[18,-9],[12,-4],[3,-9]],'#c5d4d3','#19232c',1.5);
    line(c,-17,-20,-17,-10,'#e9f3e4',1);line(c,17,-20,17,-10,'#f9ffed',1.5);
    polygon(c,[[0,-22],[4,-16],[0,-11],[-4,-16]],'#b14e62','#ffb6a4',.8);c.restore();
  }
  function drawRewardWeapon(c, player, weapon, game, t, effects) {
    if(window.MM?.IslandRenderer?.drawWeapon(c,player,weapon,game,t,effects))return;
    if(window.MM?.OceanVisuals?.drawWeapon(c,player,weapon,game,t,effects))return;
    if(window.MM?.AbyssRenderer?.drawWeapon(c,player,weapon,game,t,effects))return;
    const dir=player.dir||1,attack=game?.weaponAttack,active=attack&&attack.time>0,space=window.MM?.CosmicRenderer?.suitActive?.(game),sleeve=space?'#e6edf1':'#607c48',glove=space?'#f1f3ed':'#d8b47d';
    const progress=active?1-attack.time/Math.max(.01,attack.duration):0;
    const swing=active&&attack.form==='swing'?Math.sin(progress*Math.PI):0;
    const thrust=active&&attack.form==='stab'?Math.sin(progress*Math.PI)*20:0;
    c.save();c.scale(dir,1);c.lineCap='round';c.lineJoin='round';
    rounded(c,-25,-29,16,10,3,sleeve,'#101923',1.8);rounded(c,-29,-28,8,8,3,glove,'#101923',1.3);
    line(c,14,-25,26,-27,sleeve,8);rounded(c,23,-30,9,8,2,glove,'#101923',1.3);
    c.translate(27,-26);
    if(game?.skillState?.darkReady)halo(c,3,-5,32,'#bd8cf0',.28);
    if(weapon==='bones') {
      for(let i=0;i<3;i++)drawRewardBone(c,-4+i*4,-3-i*4,22,-.8+i*.35);
    } else if(weapon==='club') {
      c.rotate(-.28+swing*1.7);
      line(c,0,15,0,-34,'#17222a',7);line(c,0,15,0,-34,'#947452',4);
      for(let i=0;i<3;i++)line(c,-2,2+i*4,3,4+i*4,'#d2bf8d',1.8);
      polygon(c,[[-11,-39],[-7,-49],[6,-51],[15,-42],[13,-24],[4,-19],[-10,-24]],'#64746b','#18242c',2);
      polygon(c,[[-7,-45],[5,-47],[11,-39],[1,-35],[-9,-38]],'#a7b39a');
      for(const side of [-1,1])for(let i=0;i<2;i++)polygon(c,[[side*11,-42+i*12],[side*20,-39+i*12],[side*12,-33+i*12]],'#d0c1a0','#26343b',1);
      line(c,-2,-31,7,-38,'#c4d3ae',1.5);
    } else if(weapon==='bow') {
      const angle=Number.isFinite(player.aimAngle)?player.aimAngle+(dir<0?Math.PI:0):0;c.rotate(angle);
      c.beginPath();c.moveTo(1,-31);c.bezierCurveTo(25,-22,26,22,1,31);c.strokeStyle='#16212e';c.lineWidth=7;c.stroke();
      c.strokeStyle='#9a7bb6';c.lineWidth=3;c.stroke();line(c,1,-31,-5,0,'#d8c2ed',1);line(c,-5,0,1,31,'#d8c2ed',1);
      polygon(c,[[0,-5],[7,0],[0,5],[-6,0]],'#8e57c4','#e3b4ff',1);
      for(const side of [-1,1])polygon(c,[[1,side*23],[-5,side*30],[3,side*35],[7,side*28]],'#3e354e','#b69acc',1);
      line(c,-14,0,28,0,'#bda68a',2);polygon(c,[[28,-4],[38,0],[28,4]],'#e4d8f5','#493958',1);
    } else if(weapon==='spear') {
      const angle=Number.isFinite(player.aimAngle)?player.aimAngle+(dir<0?Math.PI:0):-.12;c.rotate(angle);c.translate(thrust,0);
      if(active&&attack.form==='throw')c.translate(Math.sin(progress*Math.PI)*12,0);
      line(c,-41,0,40,0,'#19242f',5);line(c,-40,0,40,0,'#c2cfcf',2.8);line(c,-37,-.6,38,-.6,'#f7f1d1',.7);
      polygon(c,[[37,0],[49,-8],[65,0],[49,8]],'#c7dadb','#223240',1.6);polygon(c,[[41,0],[49,-5],[60,0]],'#f6ffff');
      line(c,35,-8,35,8,'#d8b46e',3);polygon(c,[[39,0],[44,-3],[47,0],[44,3]],'#e6cb8b');
      for(let i=0;i<3;i++)line(c,-13+i*4,-2,-11+i*4,2,'#b9955e',1.7);
    } else if(weapon==='axes') {
      drawRewardAxe(c,2,-2,-.4+swing*1.7,.93);drawRewardAxe(c,-53,0,.35-swing*1.7,.85);
    }
    c.restore();
    if(active&&attack.form==='swing') {
      const radius=weapon==='club'?66:58,angle=-Math.PI*.95+progress*Math.PI*1.6;
      c.save();c.strokeStyle=weapon==='club'?'#d4d9a3b8':'#e1c6a5d9';c.lineWidth=effects?5:2;
      c.beginPath();c.ellipse(dir*12,-27,radius,radius*.68,dir*.2,dir>0?angle-.35:Math.PI-angle,dir>0?angle+.4:Math.PI-angle+.7);c.stroke();c.restore();
    }
  }
  function drawHunter(c, player, t, effects, game) {
    const x = player.x, y = player.y, dir = player.dir || 1, motion = Math.min(1, Math.abs(player.vx || 0) / 120);
    const slash=game?.rollSlash,slashing=(slash?.time||0)>0;
    const knocked = player.knockdownTime > 0, rolling = player.rollTime > 0 || slashing;
    const rollProgress=slashing?1-slash.time/Math.max(.01,slash.duration):player.rollProgress||0,rollDir=slashing?slash.dir:player.rollDir||dir;
    const swimming=player.swimming===true;
    const stride = !knocked && effects ? swimming?Math.sin(player.swimPhase||t*2)*(2+5*motion):Math.abs(player.vx||0)>10?Math.sin(t*18)*4*motion:0:0;
    const airborne = y < GROUND - 4, bob = !knocked && !airborne && effects ? Math.abs(Math.sin(t * 18)) * motion * .9 : 0;
    if(!swimming)shadow(c, x, y, knocked ? 62 : player.w || 38, airborne);
    c.save(); c.translate(x, y - bob); c.scale((player.w || 38) / 38, (player.h || 54) / 54); c.lineJoin = 'round'; c.lineCap = 'round';
    if(swimming&&!rolling&&!knocked){c.translate(0,-27);c.rotate(player.swimTilt||0);c.translate(0,27);}
    if (knocked) c.rotate(-1.16 * dir);
    if (rolling) { c.translate(0, -27); c.rotate(rollProgress * TAU * rollDir); c.translate(0, 27); }
    if (player.invulnerable > 0 && effects) c.globalAlpha = .72 + Math.sin(t * 37) * .18;
    const weapon=game&&window.MM?.WeaponManager?window.MM.WeaponManager.current(game):'gun';
    const sniper = weapon==='gun' && player.weaponMode === 'sniper', highAim = player.weaponMode === 'highAim';
    const astronaut=window.MM?.CosmicRenderer?.suitActive?.(game)===true,sleeve=astronaut?'#e6edf1':'#607c48';
    const outline = '#101923', skin = astronaut?'#f1f3ed':'#d8b47d', empty = (sniper ? player.ammo < 5 : player.ammo === 0) && !(player.shotTimer > .001);
    // Combat boots and articulated legs under the original square camo body.
    if(swimming&&window.MM?.OceanVisuals?.drawTail(c,player,t,effects)){
      // The upper body and equipped weapon remain the hunter's original art.
    }else if(swimming){
      for(const side of [-1,1]){c.save();c.translate(side*8,-13);c.rotate(side*stride*.07);
        rounded(c,-4,-1,8,13,2,side<0?'#283e3a':'#35493d',outline,2);
        polygon(c,[[-5,9],[6,9],[10,16],[-7,16]],'#247986',outline,1.5);line(c,-3,12,5,13,'#86dce1',1);c.restore();}
    }else if(astronaut){
      for(const side of [-1,1]){const step=side<0?stride:-stride,xx=side<0?-13:4;
        rounded(c,xx+step,-15,10,14,3,side<0?'#b6c4cd':'#e4ebef',outline,1.7);
        rounded(c,xx+step,-13,10,4,1,'#7f94a2',outline,.8);line(c,xx+step+2,-7,xx+step+7,-7,'#f6f9f2',1);
        rounded(c,xx+step-3,-5,16,7,2,'#d9e0e3',outline,1.5);rect(c,xx+step-3,0,16,2,'#4f616c');line(c,xx+step-1,-3,xx+step+10,-3,'#f3f5ef',.8);
      }
    }else{
    rounded(c, -13 + stride, -13, 9, 13, 2, '#283e3a', outline, 2);
    rounded(c, 4 - stride, -13, 9, 13, 2, '#35493d', outline, 2);
    rounded(c, -16 + stride, -5, 14, 6, 2, '#17252b', outline, 1.5);
    rounded(c, 3 - stride, -5, 14, 6, 2, '#223039', outline, 1.5);
    line(c, -13 + stride, -2, -5 + stride, -2, '#73806b', 1); line(c, 6 - stride, -2, 14 - stride, -2, '#73806b', 1);
    }
    if(astronaut){
      rounded(c,-19,-34,38,25,6,'#e0e8ed',outline,2);rounded(c,-18,-32,8,20,3,'#adbdc9');
      polygon(c,[[-14,-31],[-8,-34],[9,-34],[15,-29],[13,-23],[-12,-23]],'#f4f6f1');
      line(c,-13,-22,-13,-13,'#78909e',1);line(c,13,-21,13,-13,'#78909e',1);rounded(c,-9,-30,18,12,2,'#5c7180',outline,1.1);
      rect(c,-6,-27,8,3,'#b8d8df');rect(c,4,-27,2,3,'#e6ac8e');line(c,-6,-21,6,-21,'#243b4c',1);
      rounded(c,-19,-15,38,5,1,'#91a4af',outline,1);rounded(c,-5,-15,10,5,1,'#e5e9df',outline,.8);
      ellipse(c,12,-19,2,2,'#d16e59',outline);line(c,-12,-29,-18,-26,'#b4c9d0',2);
      rounded(c,-22,-64,44,38,14,'#edf1ef',outline,2.2);rounded(c,-20,-61,7,26,4,'#bdcbd3');
      rounded(c,-18,-56,36,26,9,'#101a23','#8299a7',1.4);
      const visor=c.createLinearGradient(-15,-55,16,-30);visor.addColorStop(0,'#263b4a');visor.addColorStop(.38,'#101820');visor.addColorStop(1,'#050b12');rounded(c,-16,-54,32,22,8,visor);
      c.save();c.globalAlpha=.45;c.beginPath();c.moveTo(-12,-48);c.quadraticCurveTo(-10,-52,-1,-51);c.strokeStyle='#b9d5df';c.lineWidth=1.5;c.stroke();c.restore();
      line(c,-9,-59,9,-59,'#ffffff',1.2);rounded(c,-24,-51,5,11,2,'#b5c4cb',outline,1);rounded(c,19,-51,5,11,2,'#cad5d8',outline,1);
      line(c,-23,-43,-20,-43,'#73b6c6',1.3);line(c,20,-43,23,-43,'#73b6c6',1.3);rounded(c,-15,-28,30,4,1,'#788d9b',outline,1);
    }else{
    rounded(c, -18, -33, 36, 24, 4, '#577846', outline, 2);
    polygon(c, [[-14, -31], [-4, -31], [-2, -24], [-10, -20], [-16, -24]], '#354f36');
    polygon(c, [[7, -24], [15, -29], [17, -17], [8, -14], [4, -19]], '#3c593b');
    polygon(c, [[-7, -16], [-4, -22], [3, -23], [6, -17], [1, -12]], '#7d8a4f');
    rounded(c, -17, -16, 34, 6, 1, '#263b36'); rect(c, -4, -15, 8, 5, '#c6a466'); rect(c, -2, -14, 4, 3, '#514e32');
    rounded(c, -18, -54, 36, 28, 5, skin, outline, 2.3);
    rect(c, -16, -31, 32, 4, '#b48b61');
    rounded(c, -20, -57, 40, 9, 4, '#506849', outline, 2); rounded(c, -24, -51, 48, 5, 2, '#354b3c', outline, 1.5);
    line(c, -13, -55, 11, -55, '#92a376', 1.4); rect(c, -4, -56, 8, 6, '#c8b979'); rect(c, -2, -55, 4, 4, '#e6d494');
    eye(c, -7, -40, 7, '#f4ebd1', dir); eye(c, 7, -40, 7, '#f4ebd1', dir);
    line(c, -12, -46, -3, -44, '#805c42', 1.5); line(c, 3, -44, 12, -46, '#805c42', 1.5);
    line(c, -4, -31, 5, -31, '#765941', 1.7); ellipse(c, 12, -33, 2, 1, '#eecc9f');
    }
    if(game?.cosmicRewards?.stance){
      c.save();c.scale(dir,1);const casting=player.shotTimer>0,reach=casting?5:0;
      line(c,-15,-25,-22,-21,sleeve,8);rounded(c,-27,-25,9,8,3,skin,outline,1.5);
      line(c,15,-25,27+reach,-28,sleeve,8);rounded(c,24+reach,-32,10,10,3,skin,outline,1.5);c.restore();
    }
    else if(weapon!=='gun')drawRewardWeapon(c,player,weapon,game,t,effects);
    else if (sniper) {
      c.save(); c.scale(dir, 1);
      // Both hands brace a long rifle; its glass scope remains clear at mobile scale.
      rounded(c, -24, -31, 18, 11, 3, astronaut?'#c3cfd7':'#4e673f', outline, 2);
      line(c, -16, -25, 9, -27, sleeve, 8); rounded(c, 4, -30, 10, 8, 2, skin, outline, 1.4);
      line(c, 15, -24, 30, -29, sleeve, 7); rounded(c, 26, -31, 10, 7, 2, skin, outline, 1.4);
      polygon(c, [[-15, -33], [-3, -33], [2, -29], [-3, -24], [-16, -24]], '#647256', outline, 1.7);
      rounded(c, -3, -33, 37, 8, 2, empty ? '#667376' : '#aab9b3', outline, 1.6);
      rect(c, 4, -33, 25, 2, '#d3d9c6'); rounded(c, 7, -26, 6, 8, 1, '#40564c', outline, 1);
      rounded(c, 29, -31, 29, 4, 1, '#a0ada9', outline, 1.4); rounded(c, 53, -33, 11, 7, 1, '#445752', outline, 1.4);
      line(c, 35, -29, 59, -29, '#d9e0c8', .8);
      line(c, 10, -34, 10, -39, '#344b45', 2); line(c, 23, -34, 23, -39, '#344b45', 2);
      rounded(c, 5, -43, 25, 7, 3, '#526965', outline, 1.5); ellipse(c, 28, -39.5, 3.2, 3.2, '#b1e1cf');
      line(c, 8, -41, 24, -41, '#c8d8c2', .9); rounded(c, 14, -46, 6, 4, 1, '#89998a', outline, .8);
      if (empty) rect(c, 19, -31, 5, 3, '#d69774');
      if (effects && player.shotTimer > (player.shotCooldown || 1) - .08) {
        polygon(c, [[64, -29], [77, -35], [72, -30], [84, -29], [72, -27], [76, -22]], '#fff0b4');
        line(c, 63, -29, 79, -29, '#ffffff', 2);
      }
      c.restore();
    } else for (const side of [-1, 1]) {
      if(game?.level?.id>=101&&side===-dir)continue;
      // Dual pistols retain the distinctive original left/right shooting pose.
      c.save();
      if (highAim && side === dir && Number.isFinite(player.aimAngle)) {
        const angle = player.aimAngle + (side < 0 ? Math.PI : 0);
        c.translate(side * 18, -26); c.rotate(angle); c.translate(-side * 18, 26);
      }
      rounded(c, side < 0 ? -26 : 14, -28, 12, 9, 3, sleeve, outline, 2);
      rounded(c, side < 0 ? -29 : 22, -28, 8, 8, 3, skin, outline, 1.7);
      c.save();
      if (empty) { c.translate(side * 26, -27); c.rotate(side * .42); c.translate(-side * 26, 27); }
      rounded(c, side < 0 ? -39 : 26, -30, 13, 6, 1, empty ? '#59696d' : '#8a99a0', '#18232a', 1.5);
      rect(c, side < 0 ? -37 : 27, -30, 10, 2, empty ? '#8b8d78' : '#c3c9c7');
      rounded(c, side < 0 ? -30 : 26, -25, 5, 8, 1, '#3b4c50', '#18232a', 1);
      if (empty) rect(c, side < 0 ? -34 : 30, -28, 4, 2, '#d69774');
      c.restore();
      if (effects && player.shotTimer > .09 && dir === side) {
        polygon(c, [[side * 39, -28], [side * 48, -35], [side * 46, -29], [side * 54, -27], [side * 45, -25], [side * 48, -20]], '#ffd98b');
        polygon(c, [[side * 39, -28], [side * 48, -28], [side * 42, -25]], '#fff6d4');
      }
      c.restore();
    }
    if (player.petrifyTime > 0) {
      rounded(c,-19,-54,38,29,5,'#9aa6a8e8','#d3dbd6',1.6);rounded(c,-19,-32,38,23,4,'#859396e8','#c3cdc9',1.5);
      line(c,-12,-43,-3,-43,'#354b55',2);line(c,4,-43,13,-43,'#354b55',2);line(c,-4,-33,6,-33,'#354b55',1.4);
      polygon(c,[[-8,-52],[-4,-42],[-8,-33],[1,-25],[-1,-14]],null,'#556b73',1.4);
      rounded(c,-51,-84,102,18,4,'#1b2936ee','#c9d4d281');c.font=`700 11px ${font}`;c.textAlign='center';c.fillStyle='#e1e5dc';c.fillText(`HÓA ĐÁ ${player.petrifyTime.toFixed(1)}s`,0,-71);
    }
    if (player.stunTime > 0 && !knocked && ['stars','electric'].includes(player.stunStyle)) {
      const orbit = effects ? t * 5 : .6;
      c.save();c.strokeStyle='#ffe9aa99';c.lineWidth=1;c.beginPath();c.ellipse(0,-67,24,7,0,0,TAU);c.stroke();
      for(let i=0;i<3;i++){const angle=orbit+i*TAU/3,x=Math.cos(angle)*24,y=-67+Math.sin(angle)*7;const points=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?2.4:5.4;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}polygon(c,points,'#ffe49a','#8f6b45',.8);}
      rounded(c,-49,-99,98,18,4,'#152731ee','#eed18b80');c.font=`700 11px ${font}`;c.textAlign='center';c.fillStyle='#ffe5a4';c.fillText(`CHOÁNG ${player.stunTime.toFixed(1)}s`,0,-86);c.restore();
    }
    if (player.stunTime > 0 && !knocked && player.stunStyle !== 'stars' && !(player.petrifyTime > 0)) {
      c.save(); c.globalAlpha = 1;
      c.beginPath(); c.ellipse(0, -29, 29, 33, 0, 0, TAU); c.fillStyle = '#d6edbf14'; c.fill(); c.strokeStyle = '#d4efb7'; c.lineWidth = 1.6; c.stroke();
      for (let i = 0; i < 5; i++) {
        const webY = -51 + i * 10;
        c.beginPath(); c.moveTo(-23, webY); c.quadraticCurveTo(0, webY + 13, 23, webY - 2); c.strokeStyle = '#d4efb7b3'; c.lineWidth = 1; c.stroke();
      }
      line(c, -17, -52, 15, -7, '#f0ffd49c', 1); line(c, 18, -52, -15, -7, '#f0ffd49c', 1);
      rounded(c, -49, -83, 98, 18, 4, '#152731ee', '#bddda35e', 1);
      c.font = `700 11px ${font}`; c.textAlign = 'center'; c.fillStyle = '#e1f5ca';
      c.fillText(`CHOÁNG ${player.stunTime.toFixed(1)}s`, 0, -70); c.restore();
    }
    if (player.shieldTime > 0) {
      c.save(); c.globalAlpha = .8; c.strokeStyle = '#98e8ec'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, -29, 48, 42, 0, 0, TAU); c.stroke();
      c.fillStyle = '#69d8e713'; c.fill();
      c.strokeStyle = '#d8fff5'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -29, 49, 43, 0, -Math.PI * .75 + t * .8, -Math.PI * .25 + t * .8); c.stroke();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + (effects ? t * .3 : 0); ellipse(c, Math.cos(a) * 48, -29 + Math.sin(a) * 42, 2, 2, '#c8fff5'); }
      c.restore();
    }
    if (player.burnTime > 0) {
      c.save();for(let i=0;i<5;i++){const x=-17+i*8,y=-6-(i%2)*7,flicker=effects?Math.sin(t*18+i)*3:0;polygon(c,[[x-4,y],[x-6,y-9],[x-2,y-15-flicker],[x,y-8],[x+3,y-21-flicker],[x+6,y-8],[x+4,y]],'#e47144','#ffd68c',.6);polygon(c,[[x-1,y],[x-2,y-8],[x+2,y-13],[x+3,y]],'#ffe3a4');}
      rounded(c,-47,6,94,18,4,'#38212aee','#ef9b6a99');c.font=`700 10px ${font}`;c.textAlign='center';c.fillStyle='#ffce93';c.fillText(`THIÊU ĐỐT ${player.burnTime.toFixed(1)}s`,0,19);c.restore();
    }
    c.restore();
    if(player.immortalTime>0) {
      // The countdown stays upright while either roll animation turns the body.
      c.save();c.translate(x,y-bob);c.scale((player.w||38)/38,(player.h||54)/54);
      const angle=effects?t*.8:0;c.strokeStyle='#ffe9a2';c.lineWidth=3;
      c.beginPath();c.ellipse(0,-29,52,47,0,0,TAU);c.stroke();c.fillStyle='#f2cf6c16';c.fill();
      for(let i=0;i<8;i++){const a=angle+i*TAU/8,px=Math.cos(a)*52,py=-29+Math.sin(a)*47;polygon(c,[[px,py-3],[px+3,py],[px,py+3],[px-3,py]],'#fff4c6');}
      rounded(c,-49,-97,98,19,5,'#302d31ee','#e9cc7a');c.font=`700 11px ${font}`;c.textAlign='center';c.fillStyle='#fff1be';
      c.fillText('BẤT TỬ '+(Math.ceil(player.immortalTime*10)/10).toFixed(1)+'s',0,-83);c.restore();
    }
    if (rolling) {
      c.save();c.strokeStyle=slashing?'#f4c78d':'#d8e9ee';c.lineWidth=slashing?4:2;c.beginPath();c.arc(x,y-23,slashing?43:30,-.1+rollProgress*TAU,Math.PI+rollProgress*TAU);c.stroke();
      if(slashing){c.strokeStyle='#ffe6b7';c.lineWidth=2;c.beginPath();c.arc(x,y-23,49,Math.PI+rollProgress*TAU,TAU-.3+rollProgress*TAU);c.stroke();}
      if(effects)for(let i=1;i<=3;i++)line(c,x-rollDir*(25+i*11),y-10-i*8,x-rollDir*(42+i*11),y-10-i*8,(slashing?'#eac691':'#c7e9ef')+(i===1?'80':'40'),2);c.restore();
    }
    if (knocked) {
      c.save(); rounded(c, x - 68, y - 71, 136, 20, 4, '#152731ee', '#cadcd481', 1);
      c.font = `700 11px ${font}`; c.textAlign = 'center'; c.fillStyle = '#e6f0de';
      c.fillText('BỊ ĐÁNH NGÃ', x, y - 57); c.restore();
    }
  }
  function drawSkeleton(c, dir, walk, t, boss) {
    const bone = boss ? '#e8d9b8' : '#dddaca', shade = '#aaa994', outline = '#19242d';
    line(c, -8, -16, -10 + walk, -4, bone, 5); line(c, 8, -16, 10 - walk, -4, bone, 5);
    rounded(c, -14 + walk, -5, 10, 5, 2, bone, outline); rounded(c, 4 - walk, -5, 10, 5, 2, bone, outline);
    line(c, 0, -31, 0, -12, bone, 4);
    for (let i = 0; i < 3; i++) { const y = -28 + i * 5; rounded(c, -13 + i, y, 26 - i * 2, 3, 1, i === 0 ? bone : shade); }
    rounded(c, -10, -14, 20, 5, 2, bone, outline);
    line(c, -14, -28, -23, -18 + walk * .3, bone, 4); line(c, 14, -28, 25, -21 - walk * .3, bone, 4);
    for (let i = 0; i < 3; i++) { line(c, -23, -18, -26 + i * 3, -12 + i, bone, 1.6); line(c, 25, -21, 25 + i * 2, -15 - i, bone, 1.6); }
    rounded(c, -19, -52, 38, 25, 5, bone, outline, 2.5); rounded(c, -12, -30, 24, 6, 2, shade, outline, 1);
    rounded(c, -13, -44, 10, 11, 3, '#273039'); rounded(c, 4, -44, 10, 11, 3, '#273039');
    ellipse(c, -8 + dir, -39, 2.2, 2.2, '#ffc98f'); ellipse(c, 9 + dir, -39, 2.2, 2.2, '#ffc98f');
    polygon(c, [[0, -35], [-3, -31], [3, -31]], '#35404a');
    for (let i = 0; i < 5; i++) line(c, -9 + i * 4.5, -28, -9 + i * 4.5, -24, '#35404a', 1);
    line(c, -15, -49, -6, -49, '#ffffff66', 1.5);
  }
  function drawTsunamiChild(c, dir, walk, t, enemy, effects) {
    const skin = '#94c966', outline = '#182b27', stride = effects ? Math.sin((enemy.age || t) * 22 + (enemy.tsunamiIndex || 0)) * 5 : 3;
    c.save(); c.scale(dir, 1); c.rotate(.12);
    // A large young face and short running limbs distinguish the summoned wave.
    line(c, -6, -16, -11 - stride, -5, '#52694b', 6); line(c, 6, -16, 8 + stride, -4, '#73865b', 6);
    rounded(c, -17 - stride, -6, 11, 5, 2, '#28382e', outline); rounded(c, 6 + stride, -5, 12, 5, 2, '#334133', outline);
    rounded(c, -13, -31, 27, 19, 3, '#4b7144', outline, 2);
    polygon(c, [[-11, -29], [-3, -24], [-7, -13], [-12, -17]], '#314c3b');
    line(c, -11, -27, -18, -19 + stride * .3, skin, 5); line(c, 10, -27, 23, -31 - stride * .25, skin, 5);
    for (let finger = 0; finger < 3; finger++) line(c, 22, -32 + finger * 2, 27 + finger, -29 + finger * 2, skin, 1.5);
    rounded(c, -17, -52, 33, 27, 5, skin, outline, 2.2);
    polygon(c, [[-16, -52], [15, -52], [14, -46], [7, -48], [2, -44], [-7, -48], [-16, -45]], '#34432c');
    eye(c, -6, -40, 8, '#fff1b8', 1, true); eye(c, 8, -40, 8, '#f4e994', 1, true);
    rounded(c, -1, -32, 13, 7, 2, '#30492e'); rect(c, 1, -32, 3, 3, '#eee2b0'); rect(c, 8, -27, 3, 2, '#eee2b0');
    line(c, -11, -34, -5, -32, '#d0d998', 1); c.restore();
  }
  function drawZombie(c, dir, walk, t, boss, enemy, effects) {
    if (enemy && enemy.tsunamiChild) { drawTsunamiChild(c, dir, walk, t, enemy, effects); return; }
    const devouring = boss && enemy && enemy.gluttonState === 'chase';
    const preparing = boss && enemy && enemy.gluttonState === 'warning';
    c.save();
    if (devouring) c.rotate(dir * .16);
    const green = boss || enemy && (enemy.type === 'greenZombie' || enemy.archetype === 'greenZombie' || enemy.variant === 'green');
    const skin = green ? (boss ? '#81ad5c' : '#75a457') : '#adb194', outline = '#14232b';
    rounded(c, -12 + walk, -14, 9, 13, 2, '#3c4340', outline, 2); rounded(c, 3 - walk, -14, 10, 13, 2, '#485247', outline, 2);
    rounded(c, -15 + walk, -5, 13, 5, 1, '#202b30'); rounded(c, 3 - walk, -5, 14, 5, 1, '#253032');
    rounded(c, -19, -31, 38, 21, 3, green ? '#385439' : '#3d5362', outline, 2.3);
    polygon(c, [[-16, -31], [-3, -25], [-8, -12], [-17, -17]], '#2a3c49'); polygon(c, [[7, -18], [14, -24], [19, -15], [12, -10]], '#627258');
    line(c, 0, -29, 0, -12, '#738376', 1); ellipse(c, 3, -22, 1, 1, '#afb097');
    line(c, dir * 13, -25, dir * (devouring ? 34 : 30), (devouring ? -32 : -26) - walk * .4, skin, 6); line(c, -dir * 15, -24, -dir * 25, (devouring ? -27 : -15) + walk * .2, skin, 5);
    for (let i = 0; i < 3; i++) { line(c, dir * 29, -27 + i * 2, dir * (34 + i), -24 + i * 3, skin, 2); }
    rounded(c, -19, -51, 38, 28, 4, skin, outline, 2.5); polygon(c, [[-19, -51], [19, -51], [17, -44], [10, -47], [4, -43], [-4, -47], [-12, -43], [-19, -45]], '#28332d');
    eye(c, -7, -39, 9, '#f2df9f', dir); eye(c, 8, -40, 8, '#d6d8aa', dir);
    line(c, -16, -32, -9, -30, '#657b54', 2); line(c, 7, -32, 15, -34, '#657b54', 1.5);
    if (devouring || preparing) {
      rounded(c, -7, -32, 23, devouring ? 14 : 10, 3, '#1b3326', '#b9d88b', .8);
      for (const toothX of [-4, 3, 10]) { rect(c, toothX, -32, 4, 4, '#eee5b9'); rect(c, toothX + 1, devouring ? -22 : -25, 3, 3, '#d2d4a4'); }
      if (devouring) ellipse(c, 5, -23, 6, 2, '#8c6957');
    } else { rounded(c, -6, -30, 17, 5, 1, '#354a37'); rect(c, -3, -30, 3, 3, '#d3d0ab'); rect(c, 6, -28, 3, 3, '#d3d0ab'); }
    line(c, -11, -45, -4, -44, '#d4dbaa66', 1);
    c.restore();
  }
  function drawRock(c, x, y, size, rotation = 0) {
    c.save(); c.translate(x, y); c.rotate(rotation); c.scale(size / 20, size / 20);
    polygon(c, [[-9, -4], [-5, -10], [3, -9], [10, -3], [8, 6], [1, 10], [-7, 7]], '#77837b', '#223630', 1.8);
    polygon(c, [[-5, -9], [3, -8], [6, -2], [-2, 0], [-8, -3]], '#b2b9a0');
    polygon(c, [[6, -2], [9, -3], [7, 6], [1, 9], [-2, 0]], '#4a6056');
    polygon(c, [[-8, -2], [-2, 0], [1, 9], [-6, 6]], '#899079');
    line(c, -5, -9, 3, -8, '#e0d4af', 1.4); line(c, 3, -8, 7, -4, '#c8c3a1', 1.2);
    line(c, -3, -5, 0, -2, '#758774', .9); line(c, 0, -2, -1, 3, '#596e5d', .9); c.restore();
  }
  function drawGolem(c, dir, walk, t, boss, e, effects) {
    e = e || {};
    const state = e.golemState || 'approach', progress = Math.max(0, Math.min(1, e.swingProgress || 0)), rage = e.rageTime > 0;
    const outline = '#15242a', stone = boss ? '#717365' : '#6c7567', wood = '#62513a', moss = boss ? '#668049' : '#657f4b';
    const eyeColor = rage ? '#ffab70' : '#edd296';
    const endAngle = boss ? 1.3 : 1.14;
    let gripY = -29;
    let clubAngle = .46;
    if (state === 'windup' || state === 'combo-windup') clubAngle = -2.06;
    if (state === 'rage-windup') clubAngle = -1.6;
    if (state === 'swing' || state === 'combo-swing') { clubAngle = -2.06 + progress * (2.06 + endAngle); gripY = -29 - progress * 28; }
    if (state === 'shock' || state === 'recover') { clubAngle = endAngle; gripY = -57; }
    if (state === 'charge') clubAngle = -.15;
    c.save(); c.scale(dir, 1);
    // Heavy root joints support square blocks of ancient stone.
    for (const side of [-1, 1]) {
      const step = side * walk * .55;
      line(c, side * 11, -20, side * 12 + step, -7, '#473f30', 9);
      line(c, side * 10, -20, side * 14 + step, -7, '#8c8060', 2.1);
      rounded(c, side < 0 ? -20 + step : 4 + step, -10, 17, 10, 2, '#6f7060', outline, 2);
      polygon(c, [[side * 4 + step, -8], [side * 16 + step, -8], [side * 17 + step, -3], [side * 10 + step, -4]], moss);
      line(c, side * 11 + step, -7, side * 16 + step, -2, '#aaa082', .8);
    }
    const rockWindup = state === 'rock-windup', rockThrow = state === 'rock-throw';
    const throwProgress = Math.max(0, Math.min(1, e.throwProgress || 0));
    const lift = Math.max(0, Math.min(1, 1 - (e.golemStateTimer || 0) / Math.max(.01, e.golemStateTotal || 1)));
    const backHandX = rockThrow ? -26 + throwProgress * 65 : rockWindup ? -28 + lift * 7 : -28;
    const backHandY = rockThrow ? -61 + throwProgress * 31 : rockWindup ? -42 - lift * 19 : state === 'rage-windup' ? -51 : -19;
    line(c, -20, -32, backHandX, backHandY, wood, 8);
    rounded(c, backHandX - 5, backHandY - 5, 13, 12, 3, '#696a54', outline, 1.7);
    line(c, backHandX - 1, backHandY - 3, backHandX - 1, backHandY + 5, '#aaa079', 1);
    line(c, backHandX + 3, backHandY - 3, backHandX + 3, backHandY + 5, '#aaa079', 1);
    polygon(c, [[-21, -36], [20, -36], [24, -20], [17, -9], [-16, -9], [-23, -20]], stone, outline, 2.2);
    polygon(c, [[-19, -34], [-4, -34], [-5, -22], [-16, -21]], '#899081');
    polygon(c, [[2, -34], [19, -34], [21, -23], [5, -24]], '#5e675c');
    polygon(c, [[-16, -18], [-4, -20], [1, -12], [-13, -10]], '#4e6050');
    polygon(c, [[4, -21], [20, -20], [15, -11], [2, -11]], '#858373');
    line(c, -2, -35, 2, -26, '#354439', 1.5); line(c, 2, -26, -3, -17, '#354439', 1.5);
    line(c, -12, -20, -8, -14, '#354439', 1.2); line(c, 8, -30, 14, -24, '#354439', 1.2);
    polygon(c, [[-21, -33], [-14, -37], [-7, -32], [-12, -28], [-20, -28]], moss);
    polygon(c, [[7, -19], [15, -23], [21, -17], [14, -12], [9, -13]], moss);
    for (const side of [-1, 1]) {
      const shoulder = boss ? 29 : 24;
      polygon(c, [[side * 13, -36], [side * shoulder, -42], [side * (shoulder + 4), -32], [side * 23, -23], [side * 16, -26]], boss ? '#8c8972' : '#737d67', outline, 1.7);
      line(c, side * 18, -35, side * (shoulder - 1), -36, '#c2b48a', 1);
      polygon(c, [[side * 18, -37], [side * shoulder, -40], [side * (shoulder + 1), -35], [side * 24, -33]], moss);
    }
    rounded(c, -16, -54, 32, 22, 3, '#7d8071', outline, 2.2);
    polygon(c, [[-16, -54], [1, -54], [-1, -46], [-14, -47]], '#959884');
    polygon(c, [[3, -53], [16, -53], [16, -38], [11, -38], [8, -45]], '#636e60');
    polygon(c, [[-15, -53], [-5, -57], [3, -52], [-5, -48], [-14, -49]], moss);
    rounded(c, -12, -46, 9, 5, 1, '#263632'); rounded(c, 4, -46, 9, 5, 1, '#263632');
    if (rage) { ellipse(c, -7, -43, 8, 5, '#ffa46b26'); ellipse(c, 8, -43, 8, 5, '#ffa46b26'); }
    rect(c, -10, -44, 6, 2.5, eyeColor); rect(c, 5, -44, 6, 2.5, eyeColor);
    if (rage) { line(c, -14, -47, -4, -43, '#ffbc7977', 1.1); line(c, 4, -43, 14, -47, '#ffbc7977', 1.1); }
    polygon(c, [[-1, -44], [-3, -38], [3, -38]], '#565f50');
    line(c, -8, -35, 9, -35, '#354b40', 2); line(c, -3, -38, -2, -33, '#4c5b48', 1);
    line(c, 10, -51, 7, -46, '#384b3d', 1); line(c, 7, -46, 10, -39, '#384b3d', 1);
    if (boss) {
      // Root antlers and ruined battlements make the king distinct from regular golems.
      polygon(c, [[-17, -52], [-24, -65], [-12, -59], [-8, -68], [0, -62], [8, -69], [13, -59], [25, -65], [17, -52]], '#7a7653', outline, 1.6);
      line(c, -21, -61, -15, -51, '#aec184', 1.5); line(c, 21, -61, 14, -52, '#aec184', 1.5);
      rounded(c, -5, -59, 10, 6, 1, '#b0a271', '#4d5138', 1); ellipse(c, 0, -57, 1.6, 1.6, eyeColor);
      line(c, -22, -28, -12, -16, '#415b39', 2); line(c, 18, -28, 10, -12, '#415b39', 2);
    }
    if (rage) {
      line(c, -2, -31, 3, -25, '#edb47a', 1.4); line(c, 3, -25, -1, -18, '#edb47a', 1.2);
      polygon(c, [[-5, -29], [0, -34], [5, -29], [1, -24]], '#d28d5270', '#efb677', .9);
    }
    const heldRockSize = (boss ? 27 : e.type === 'miniGolem' ? 16 : 20) * 40 / Math.max(1, e.w || 40);
    if (rockWindup || rockThrow && throwProgress < .22) drawRock(c, backHandX + 1, backHandY - 8, heldRockSize, -.3);
    if (rockThrow) {
      // The free arm follows the released stone while the other hand keeps its club.
      line(c, -20, -32, backHandX, backHandY, wood, 8);
      ellipse(c, backHandX + 1, backHandY, 5.5, 5.5, '#7b775c');
      line(c, backHandX - 1, backHandY - 3, backHandX + 2, backHandY + 3, '#b2a47c', 1);
    }
    // The club is actual timber: broad head, wood grain, binding and carved root spikes.
    c.save(); c.translate(23, gripY); c.rotate(clubAngle);
    if (effects && (state === 'swing' || state === 'combo-swing')) {
      c.globalAlpha = .2; polygon(c, [[14, -1], [39, -15], [66, -17], [60, 7], [34, 15]], rage ? '#eab375' : '#d0be85'); c.globalAlpha = 1;
    }
    rounded(c, -1, -3, 42, 6, 2, '#8a7047', outline, 1.7); line(c, 5, -1, 33, -1, '#cab084', 1);
    polygon(c, [[33, -9], [55, -11], [62, -5], [60, 8], [35, 11], [30, 5]], '#82643e', outline, 2);
    polygon(c, [[34, -6], [56, -7], [55, -3], [34, -2]], '#b2935b');
    line(c, 36, 5, 56, 3, '#4b3f2d', 1.3); line(c, 37, -2, 54, -1, '#4b3f2d', 1);
    line(c, 42, -8, 42, 9, '#493f30', 3); line(c, 52, -9, 52, 9, '#493f30', 3);
    for (const spikeX of [36, 46, 57]) {
      polygon(c, [[spikeX - 3, -8], [spikeX + 1, -18], [spikeX + 4, -9]], '#b6a06d', outline, 1);
      polygon(c, [[spikeX - 3, 8], [spikeX + 1, 18], [spikeX + 4, 8]], '#968259', outline, 1);
    }
    polygon(c, [[59, -5], [69, -1], [60, 5]], '#b6a06d', outline, 1); c.restore();
    line(c, 18, -28, 26, gripY, wood, 8); ellipse(c, 25, gripY, 5, 5, '#7b775c');
    line(c, 23, gripY - 4, 23, gripY + 4, '#aaa177', 1); line(c, 27, gripY - 3, 27, gripY + 3, '#aaa177', 1);
    c.restore();
  }
  function drawWerewolf(c, dir, walk, t, boss, e, effects) {
    e = e || {};
    if (e.variant === 'pup' || e.wolfPup || e.type === 'wolfPup') { drawWolfPup(c, dir, walk, t, e, effects); return; }
    const state = e.wolfState || 'approach', progress = Math.max(0, Math.min(1, e.wolfProgress || 0));
    const blood = !!e.bloodMoon, preparing = state === 'windup' || state === 'blood-windup' || state === 'claw-windup';
    const leaping = state === 'leap' || state === 'blood-leap', attacking = state === 'pounce' || state === 'claw';
    const outline = '#17252a', fur = blood ? '#b1a99f' : boss ? '#9a9d99' : '#77766d';
    const shade = blood ? '#59464a' : boss ? '#536465' : '#515b56', mane = blood ? '#ddd0bf' : boss ? '#c4c4b0' : '#99937f';
    const claw = blood ? '#ffe1c3' : '#dedcca', eyeColor = blood ? '#ff6257' : boss ? '#f7c67a' : '#d6db95';
    c.save(); c.scale(dir, boss ? 54 / 66 : 54 / 61); c.translate(preparing ? -2 : 0, preparing ? 3 : 0);
    // Digitigrade legs, rough fur and a forward muzzle give the new creature its own silhouette.
    for (const side of [-1, 1]) {
      const step = leaping ? side * 4 : side * walk, hip = side * 8;
      line(c, hip, -21, hip - 3 + step, -10, shade, 9);
      line(c, hip - 3 + step, -10, hip + 4 + step, -5, fur, 6);
      polygon(c, [[hip - 3 + step, -8], [hip + 6 + step, -7], [hip + 13 + step, -2], [hip + 11 + step, 0], [hip - 3 + step, 0]], shade, outline, 1.5);
      for (let toe = 0; toe < 3; toe++) polygon(c, [[hip + 7 + step + toe * 2, -3], [hip + 12 + step + toe * 2, -1], [hip + 8 + step + toe * 2, 0]], claw, outline, .5);
      polygon(c, [[hip - 5 + step, -16], [hip - 2 + step, -11], [hip - 8 + step, -8]], mane);
    }
    polygon(c, [[-14, -22], [-28, -19], [-34, -26], [-33, -16], [-23, -12], [-12, -15]], shade, outline, 1.3);
    polygon(c, [[-13, -41], [-20, -34], [-15, -24], [-13, -16], [12, -14], [20, -26], [13, -39]], fur, outline, 2);
    polygon(c, [[-15, -39], [-25, -36], [-20, -30], [-24, -28], [-17, -25], [-18, -20], [-10, -22], [-7, -34]], mane, outline, 1.4);
    polygon(c, [[-7, -35], [6, -36], [14, -28], [8, -19], [-6, -21]], mane);
    polygon(c, [[-8, -29], [-4, -32], [1, -28], [6, -31], [9, -26], [4, -18], [-4, -21]], '#c4b99b44');
    line(c, -9, -19, 4, -17, '#504d43', 1.2);
    // Shredded hunting trousers keep the monster recognisably humanoid.
    polygon(c, [[-13, -19], [12, -17], [14, -10], [8, -12], [4, -7], [0, -12], [-5, -8], [-8, -12], [-13, -11]], '#464646', outline, 1.4);
    line(c, -8, -16, 8, -15, '#938f75', 1.2);
    const forwardX = leaping ? 29 : state === 'pounce' ? 33 : state === 'claw' ? 20 + progress * 20 : preparing ? 24 : 24;
    const forwardY = leaping ? -38 : state === 'pounce' ? -8 : state === 'claw' ? -45 + progress * 30 : preparing ? -39 : -24 + walk * .3;
    for (const back of [true, false]) {
      const shoulderX = back ? -13 : 12, shoulderY = -33;
      const handX = back ? (leaping ? 15 : preparing ? -21 : -23) : forwardX;
      const handY = back ? (leaping ? -35 : preparing ? -43 : -18) : forwardY;
      line(c, shoulderX, shoulderY, back ? -22 : 22, (shoulderY + handY) / 2, shade, 8);
      line(c, back ? -22 : 22, (shoulderY + handY) / 2, handX, handY, fur, 7);
      polygon(c, [[shoulderX - 4, -37], [shoulderX + 7, -34], [shoulderX + 5, -26], [shoulderX, -30]], mane);
      rounded(c, handX - 5, handY - 4, 10, 8, 2, fur, outline, 1.3);
      for (let finger = 0; finger < 3; finger++) {
        const fingerY = handY - 3 + finger * 2.8;
        polygon(c, [[handX + 2, fingerY], [handX + (blood ? 12 : 10), fingerY + 3], [handX + 4, fingerY + 2]], claw, outline, .6);
      }
    }
    c.save();
    if (e.howling) { c.translate(2, -34); c.rotate(-.38); c.translate(-2, 34); }
    polygon(c, [[-15, -51], [-15, -61], [-5, -54], [3, -57], [13, -53], [18, -45], [17, -34], [7, -29], [-5, -32], [-12, -39]], fur, outline, 2);
    polygon(c, [[-14, -58], [-8, -54], [-13, -48]], '#ac9c8e', outline, .8);
    polygon(c, [[5, -53], [13, -61], [17, -47]], mane, outline, 1.2);
    polygon(c, [[11, -54], [13, -58], [14, -50]], '#77635d');
    polygon(c, [[-13, -49], [-19, -46], [-15, -39], [-18, -36], [-11, -35], [-7, -42]], mane);
    polygon(c, [[8, -44], [23, -43], [28, -37], [24, -33], [12, -32], [4, -37]], mane, outline, 1.5);
    polygon(c, [[24, -43], [30, -40], [27, -36], [23, -38]], '#1d282b');
    line(c, 11, -35, 25, -35, '#403631', 1.5);
    polygon(c, [[12, -35], [16, -35], [15, -28]], '#f3e3c9', outline, .6);
    polygon(c, [[21, -35], [24, -35], [22, -30]], '#f3e3c9', outline, .6);
    if (e.howling) {
      polygon(c, [[11, -35], [25, -35], [23, -25], [13, -27], [7, -31]], '#24212a', outline, 1.2);
      polygon(c, [[12, -28], [23, -26], [25, -24], [12, -23], [6, -28]], mane, outline, 1.2);
      polygon(c, [[15, -35], [18, -35], [17, -29]], '#f3e3c9');
      polygon(c, [[22, -35], [25, -35], [23, -29]], '#f3e3c9');
      ellipse(c, 16, -26, 4, 1.3, '#c77c78');
    }
    rounded(c, 3, -47, 12, 5, 2, '#23332f'); ellipse(c, 10, -45, 3.5, 2, eyeColor);
    ellipse(c, 11, -45, .7, 1.7, '#222626'); line(c, 2, -49, 15, -46, shade, 2.1);
    line(c, -8, -52, -3, -54, '#e1dfc477', 1); line(c, -9, -40, -5, -36, '#e1dfc477', 1);
    if (boss) {
      // Crown-like fur, a broken bronze collar and scars belong only to Lang Vương.
      polygon(c, [[-15, -50], [-22, -57], [-11, -56], [-10, -64], [-4, -58], [0, -66], [5, -57], [11, -62], [13, -53]], mane, outline, 1.3);
      line(c, -6, -49, 2, -35, '#d8a994', 1.5); line(c, -9, -43, -3, -47, '#6e514e', .9);
      line(c, 3, -48, 8, -37, '#f0c6a4', 1.3); line(c, 1, -43, 7, -46, '#6e514e', .8);
      line(c, -9, -32, 10, -30, '#75664a', 4); line(c, -9, -33, 10, -31, '#bcaa72', 1.3);
      polygon(c, [[-2, -30], [3, -31], [7, -26], [2, -22], [-3, -26]], '#ac9464', outline, .9);
      ellipse(c, 2, -26, 1.8, 1.8, blood ? '#ff7067' : '#e5b177');
    }
    c.restore();
    if (blood) {
      line(c, -11, -30, -6, -24, '#c28b828c', 1.1); line(c, 4, -24, 8, -20, '#c28b828c', 1.1);
      if (effects) halo(c, 10, -45, 8, '#ff6157', .3);
    }
    if (attacking) {
      // The three claw grooves communicate the attack even when particles are disabled.
      const reach = blood ? 38 : 31;
      for (let clawIndex = 0; clawIndex < 3; clawIndex++) {
        const offset = clawIndex * 4, upper = e.clawIndex === 2 ? -24 : -43;
        c.beginPath(); c.moveTo(forwardX - 6, upper + offset); c.quadraticCurveTo(reach + 14, upper + offset - 5, reach + 5, -6 + offset); c.strokeStyle = blood ? '#ffdec3' : '#eee5c9'; c.lineWidth = blood ? 1.7 : 1.2; c.stroke();
        if (effects) { c.beginPath(); c.moveTo(forwardX - 7, upper + offset); c.quadraticCurveTo(reach + 13, upper + offset - 6, reach + 4, -6 + offset); c.strokeStyle = '#e4655860'; c.lineWidth = 4; c.stroke(); }
      }
    }
    c.restore();
  }
  function drawWolfPup(c, dir, walk, t, e, effects) {
    const outline = '#1b2828', fur = '#8a8a78', shade = '#4c5c53', mane = '#c0b99a';
    const stride = effects ? Math.sin((e.age || t) * 17) * 4 : 0;
    c.save(); c.scale(dir, 1);
    polygon(c, [[-15, -28], [-23, -34], [-25, -42], [-20, -38], [-16, -37], [-10, -30]], shade, outline, 1.5);
    for (const [hip, phase] of [[-12, -1], [9, 1]]) {
      line(c, hip, -24, hip + stride * phase, -12, shade, 6);
      line(c, hip + stride * phase, -12, hip + 5 + stride * phase, -3, shade, 4);
      rounded(c, hip + stride * phase, -4, 9, 4, 1.4, '#43534d', outline, 1);
    }
    polygon(c, [[-16, -36], [-8, -40], [10, -37], [16, -28], [11, -19], [-8, -21], [-17, -26]], fur, outline, 1.6);
    polygon(c, [[-8, -35], [10, -33], [11, -22], [-7, -25]], mane);
    for (const [hip, phase] of [[-11, 1], [10, -1]]) {
      line(c, hip, -23, hip + stride * phase, -12, fur, 5.5);
      line(c, hip + stride * phase, -12, hip + 3 + stride * phase, -3, fur, 3.5);
      rounded(c, hip - 1 + stride * phase, -4, 9, 4, 1.4, shade, outline, 1);
      line(c, hip + 5 + stride * phase, -2, hip + 8 + stride * phase, -1, '#e8dfbe', 1);
    }
    polygon(c, [[3, -38], [-1, -46], [2, -54], [8, -47], [13, -49], [16, -54], [20, -42], [19, -33], [11, -31]], fur, outline, 1.6);
    polygon(c, [[2, -51], [6, -46], [2, -44]], '#b09283');
    polygon(c, [[16, -50], [18, -43], [14, -45]], '#b09283');
    polygon(c, [[11, -40], [22, -38], [25, -33], [19, -30], [10, -32]], mane, outline, 1.2);
    ellipse(c, 23, -34, 2.5, 2, '#26332d'); ellipse(c, 12, -41, 2.2, 2, '#e4d999');
    ellipse(c, 13, -41, .65, 1.3, '#27342c'); line(c, 14, -33, 21, -32, '#536050', 1);
    polygon(c, [[17, -32], [20, -32], [18, -28]], '#f1e3c1', outline, .5);
    polygon(c, [[-15, -32], [-21, -30], [-17, -26]], mane);
    c.restore();
  }
  function drawBanana(c, x, y, size = 18, angle = 0) {
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(size / 20, size / 20);
    c.beginPath(); c.moveTo(-9, -5); c.quadraticCurveTo(-1, 2, 9, -5); c.quadraticCurveTo(7, 7, -2, 7); c.quadraticCurveTo(-10, 6, -9, -5);
    c.fillStyle = '#f3d55c'; c.fill(); c.strokeStyle = '#695d2f'; c.lineWidth = 1.5; c.stroke();
    c.beginPath(); c.moveTo(-7, -1); c.quadraticCurveTo(0, 4, 7, -1); c.strokeStyle = '#fff1a7'; c.lineWidth = 1.6; c.stroke();
    line(c, -9, -5, -10, -8, '#6c5735', 2); line(c, 9, -5, 11, -7, '#6c5735', 2); c.restore();
  }
  function drawMiniKingKong(c, dir, walk, t, boss, e, effects) {
    e = e || {};
    const raging = e.kongState === 'final-rage', vine = !!e.vinePhase;
    const outline = '#201d20', fur = boss ? '#81573e' : '#6b4939', shade = '#432f2b', face = boss ? '#c4a17b' : '#b7926b';
    const windup = e.kongState === 'banana-windup', throwing = e.kongState === 'banana-throw';
    const progress = Math.max(0, Math.min(1, e.kongProgress || 0));
    const reach = vine ? 16 : raging ? 23 : throwing ? 9 + progress * 25 : windup ? -13 : 20;
    const handY = vine ? -49 : raging ? -6 - Math.abs(Math.sin(t * 12)) * 38 : throwing ? -51 + progress * 22 : windup ? -58 : -26;
    c.save(); c.scale(dir, 1);
    for (const side of [-1, 1]) {
      const step = side * walk;
      line(c, side * 10, -16, side * 10 + step, -5, shade, 9);
      rounded(c, side * 10 - 5 + step, -6, 13, 6, 2, shade, outline, 1.5);
      line(c, side * 10 - 2 + step, -2, side * 10 + 5 + step, -2, '#a57b54', 1);
    }
    ellipse(c, -1, -29, 19, 20, shade);
    polygon(c, [[-16, -42], [-6, -49], [13, -43], [20, -28], [12, -14], [-12, -14], [-21, -28]], fur, outline, 2);
    ellipse(c, 1, -28, 12, 13, '#8d6448');
    line(c, -13, -37, -23, -23 + walk, shade, 13); line(c, -23, -23 + walk, -22, -6, fur, 11);
    rounded(c, -27, -10, 13, 9, 3, '#866448', outline, 1.6);
    for (let finger = 0; finger < 3; finger++) line(c, -24 + finger * 3, -8, -24 + finger * 3, -3, face, .8);
    line(c, 12, -38, windup ? 20 : 22, windup ? -46 : -28, shade, 12);
    line(c, windup ? 20 : 22, windup ? -46 : -28, reach, handY, fur, 10);
    rounded(c, reach - 6, handY - 5, 12, 10, 3, face, outline, 1.5);
    if (!vine && !raging && (!throwing || progress < .15)) drawBanana(c, reach + 2, handY - 6, boss ? 20 : 15, windup ? -.8 : .5);
    ellipse(c, -11, -43, 4, 6, shade); ellipse(c, 14, -43, 4, 6, shade);
    rounded(c, -13, -54, 29, 26, 9, fur, outline, 2);
    polygon(c, [[-11, -50], [-6, -57], [-1, -54], [4, -58], [9, -52], [13, -52]], shade);
    rounded(c, -9, -47, 24, 16, 6, face, outline, 1.2);
    rounded(c, -7, -47, 8, 6, 2, shade); rounded(c, 5, -47, 8, 6, 2, shade);
    ellipse(c, -2, -44, 1.6, 1.4, raging ? '#ff6246' : '#f7da8b'); ellipse(c, 9, -44, 1.6, 1.4, raging ? '#ff6246' : '#f7da8b');
    line(c, -8, -48, 0, -46, '#382823', 2); line(c, 4, -46, 13, -48, '#382823', 2);
    ellipse(c, 3, -39, 5, 3.5, '#725340'); ellipse(c, 1, -39, 1, 1, outline); ellipse(c, 5, -39, 1, 1, outline);
    if (e.kongState === 'scream' || e.kongState === 'scream-windup' || raging) {
      rounded(c, -3, -36, 15, 12, 4, '#2b2123', '#76513d', 1);
      rounded(c, -1, -35, 11, 3, 1, '#efe1b5'); ellipse(c, 4, -27, 4, 1.5, '#b86f67');
    } else { line(c, -2, -33, 9, -33, '#563c32', 1.5); polygon(c, [[6, -33], [9, -33], [8, -29]], '#efe1b5'); }
    if (boss) {
      polygon(c, [[-14, -41], [-22, -43], [-18, -37], [-22, -34], [-17, -29], [-12, -31]], '#b28b60', outline, 1);
      line(c, -9, -43, -6, -33, '#d8b691', 1.1); line(c, -10, -36, -5, -40, '#70503e', .8);
      line(c, -7, -24, 1, -22, '#c59b6d', 1.4); line(c, 4, -22, 10, -25, '#c59b6d', 1.4);
    }
    line(c, -8, -22, 7, -21, '#b28659', 1.1); c.restore();
  }
  function drawSpider(c, dir, walk, t, boss) {
    const outline = '#111b25', shell = boss ? '#aa683f' : '#71514a';
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
      const y = -37 + i * 6, offset = walk * (i % 2 ? 1 : -1);
      line(c, side * 15, y, side * (24 + i * 2), y - 4 + offset, outline, 5);
      line(c, side * (24 + i * 2), y - 4 + offset, side * (31 + i), -3 - i * 2, outline, 4);
      line(c, side * 15, y - 1, side * (24 + i * 2), y - 5 + offset, '#aa81726b', 1.3);
    }
    rounded(c, -20, -45, 40, 39, 12, shell, outline, 2.5);
    rounded(c, -19, -46, 38, 23, 8, '#303b48', outline, 2);
    line(c, -11, -12, -6, -7, '#b28164', 2); line(c, 0, -15, 0, -8, '#b28164', 2); line(c, 7, -12, 11, -8, '#b28164', 2);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      ellipse(c, -12 + i * 8 + dir, -38 + row * 9, row ? 2.2 : 2.7, row ? 2.2 : 2.7, '#f4c58b');
      ellipse(c, -12 + i * 8 + dir, -39 + row * 9, .75, .75, '#fff7d8');
    }
    polygon(c, [[-10, -25], [-4, -25], [-6, -14]], '#eee3c7', outline); polygon(c, [[4, -25], [10, -25], [6, -14]], '#eee3c7', outline);
    line(c, -14, -43, 8, -43, '#73829377', 1.3);
  }
  function drawGhost(c, dir, walk, t, boss) {
    const body = boss ? '#edf6ef' : '#d0e7e3';
    c.save(); c.globalAlpha *= .9;
    c.beginPath(); c.moveTo(-20, -31); c.quadraticCurveTo(-22, -53, -9, -53); c.lineTo(9, -53); c.quadraticCurveTo(21, -53, 20, -31);
    c.lineTo(22, -7); c.quadraticCurveTo(17, -1, 11, -9); c.quadraticCurveTo(6, 3, 0, -7); c.quadraticCurveTo(-6, 3, -11, -7); c.quadraticCurveTo(-18, 1, -22, -7); c.closePath();
    c.fillStyle = body; c.fill(); c.strokeStyle = '#537a84'; c.lineWidth = 2; c.stroke();
    polygon(c, [[-18, -34], [-31, -22 + walk], [-21, -24], [-15, -18]], body, '#537a84'); polygon(c, [[18, -34], [31, -23 - walk], [22, -24], [16, -18]], body, '#537a84');
    rounded(c, -12, -41, 9, 11, 3, '#224658'); rounded(c, 5, -41, 9, 11, 3, '#224658');
    ellipse(c, -7 + dir, -37, 1.6, 2.6, '#a6f5ec'); ellipse(c, 10 + dir, -37, 1.6, 2.6, '#a6f5ec');
    ellipse(c, 2, -24, 4, 5, '#436977'); line(c, -13, -47, 8, -47, '#f3fff1aa', 2);
    line(c, -13, -18, -14, -9, '#ffffff44', 1.5); line(c, 13, -23, 15, -13, '#ffffff44', 1.5);
    c.restore();
  }
  function drawVampire(c, dir, walk, t, boss) {
    const outline = '#111923', cape = boss ? '#b04251' : '#843843';
    polygon(c, [[-22, -38], [-31, -6 - walk], [-20, -10], [-13, -3], [0, -8], [13, -3], [21, -10], [31, -6 + walk], [22, -38]], cape, outline, 2);
    polygon(c, [[-22, -38], [-26, -8], [-17, -12], [0, -13], [17, -12], [26, -8], [22, -38]], '#3d2838');
    rounded(c, -12 + walk, -13, 9, 13, 2, '#222938', outline, 1.5); rounded(c, 3 - walk, -13, 9, 13, 2, '#222938', outline, 1.5);
    rounded(c, -14 + walk, -4, 11, 4, 1, '#161d29'); rounded(c, 3 - walk, -4, 12, 4, 1, '#161d29');
    rounded(c, -18, -30, 36, 20, 3, '#29323e', outline, 2); polygon(c, [[-7, -31], [7, -31], [2, -12], [-2, -12]], '#b8c6c2');
    polygon(c, [[-7, -31], [0, -26], [-7, -23]], cape); polygon(c, [[7, -31], [0, -26], [7, -23]], cape); ellipse(c, 0, -23, 2, 2, '#e0af75');
    rounded(c, -19, -52, 38, 27, 4, '#c0cbbb', outline, 2.5);
    polygon(c, [[-19, -52], [19, -52], [19, -38], [13, -47], [6, -48], [0, -42], [-6, -48], [-13, -47], [-19, -38]], '#252632');
    eye(c, -7, -37, 7, '#f3b997', dir, true); eye(c, 8, -37, 7, '#f3b997', dir, true);
    rounded(c, -5, -29, 16, 3, 1, '#66525a'); polygon(c, [[-4, -29], [0, -29], [-1, -21]], '#fff2d5'); polygon(c, [[7, -29], [11, -29], [9, -21]], '#fff2d5');
    polygon(c, [[-20, -39], [-31, -44], [-25, -30], [-19, -30]], cape, outline); polygon(c, [[20, -39], [31, -44], [25, -30], [19, -30]], cape, outline);
    line(c, -13, -49, -5, -49, '#5b4c5e', 1);
  }
  function drawBat(c, e, t, effects) {
    const boss = !!e.boss, flap = effects ? Math.sin((e.age || t) * 15) * 6 : -2;
    c.save(); c.translate(e.x, e.y); c.scale((e.w || 28) / 40, (e.h || 24) / 30);
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (const side of [-1, 1]) {
      polygon(c, [[side * 4, -19], [side * 12, -23 + flap], [side * 21, -27 + flap], [side * 20, -12 + flap * .4], [side * 15, -15 + flap * .3], [side * 12, -8 + flap * .3], [side * 8, -12], [side * 4, -6]], boss ? '#80394f' : '#563348', '#19212d', 1.6);
      line(c, side * 5, -18, side * 20, -25 + flap, '#b979876b', 1.1);
      line(c, side * 5, -18, side * 14, -14 + flap * .3, '#b979874a', .7);
    }
    rounded(c, -7, -22, 14, 21, 3, '#30303f', '#111c27', 1.5);
    polygon(c, [[-6, -19], [-7, -29], [-1, -23]], '#55394c', '#111c27');
    polygon(c, [[6, -19], [7, -29], [1, -23]], '#55394c', '#111c27');
    eye(c, -3.5, -16, 4, '#f7cb90', e.dir || 1); eye(c, 3.5, -16, 4, '#f7cb90', e.dir || 1);
    polygon(c, [[-3, -9], [-1, -9], [-2, -6]], '#e8e0c6'); polygon(c, [[1, -9], [3, -9], [2, -6]], '#e8e0c6');
    line(c, -3, -4, -3, 0, '#ae8f86', 1); line(c, 3, -4, 3, 0, '#ae8f86', 1);
    if (boss) polygon(c, [[-4, -24], [-5, -29], [0, -26], [5, -29], [4, -24]], '#dbb96e', '#221f2c');
    if (e.hit > 0) { c.globalAlpha = Math.min(.8, e.hit * 5); line(c, -17, -22, -23, -26, '#fff0c0', 1.8); line(c, 17, -22, 23, -26, '#fff0c0', 1.8); }
    c.restore();
  }
  function drawPlatforms(c, enemies, t, effects) {
    for (const e of enemies) {
      if (!e.platform || e.abilityState !== 'ledge') continue;
      const p = e.platform, width = p.w || 102, x = p.x - width / 2, y = p.y;
      c.save();
      ellipse(c, p.x, y + 15, width * .48, 5, '#add5b60c');
      polygon(c, [[x, y + 4], [x + 10, y + 17], [x + width * .4, y + 23], [x + width * .73, y + 19], [x + width - 5, y + 12], [x + width, y + 3]], '#344047', '#14212b', 1.5);
      rounded(c, x, y - 2, width, 8, 2, '#637568', '#23343c', 1.5);
      line(c, x + 4, y, x + width - 5, y, '#a7bc8877', 1.4);
      for (let i = 1; i < 4; i++) line(c, x + width * i / 4, y + 5, x + width * i / 4 - 4, y + 14, '#202e36', 1);
      for (let i = 0; i < 3; i++) {
        const rise = effects ? (t * 14 + i * 12) % 25 : i * 8;
        ellipse(c, x + 18 + i * (width - 36) / 2, y + 22 + rise, 1.2, 1.2, '#a9cfa744');
      }
      c.restore();
    }
  }
  function drawAbilityTell(c, e, t, effects) {
    if (!e.tell && !e.charging) return;
    const x = Number.isFinite(e.landX) ? e.landX : e.x, pulse = effects ? .63 + Math.sin(t * 10) * .14 : .65;
    c.save(); c.globalAlpha = pulse;
    c.strokeStyle = '#ffd193'; c.lineWidth = 1.7;
    c.beginPath(); c.ellipse(x, GROUND + 1, Math.max(24, e.w * .55), 7, 0, 0, TAU); c.stroke();
    for (const side of [-1, 1]) line(c, x + side * 13, GROUND - 12, x + side * 7, GROUND - 7, '#ffd193', 1.7);
    if (e.abilityState !== 'ground' && e.y < GROUND - 80) {
      c.setLineDash([3, 7]); line(c, e.x, e.y + 10, x, GROUND - 24, '#ffd19359', 1); c.setLineDash([]);
    }
    c.font = `700 18px ${font}`; c.textAlign = 'center'; c.fillStyle = '#ffd193'; c.fillText('!', e.x, e.y - e.h - 16);
    c.restore();
  }
  function drawBulletArmor(c, e, t, effects) {
    if (!(e.hardenedTime > 0)) return;
    const glow = effects ? .72 + Math.sin(t * 8) * .12 : .85;
    c.save();
    rounded(c, -23, -57, 46, 59, 8, '#91ed9910', '#b7f6a1', 2.2);
    c.globalAlpha = glow;
    for (const side of [-1, 1]) {
      line(c, side * 23, -44, side * 26, -35, '#b7f6a1', 1.5);
      line(c, side * 26, -35, side * 24, -27, '#b7f6a1', 1.5);
    }
    polygon(c, [[23, -47], [34, -44], [33, -36], [29, -32], [24, -36]], '#244c35', '#c4ffad', 1.3);
    line(c, 29, -43, 29, -36, '#c4ffad', 1.2); line(c, 26, -40, 32, -40, '#c4ffad', 1.2);
    c.restore();
  }
  function drawPhantomTell(c, e, t, effects, viewTop) {
    if (e.phantomState !== 'windup') return;
    const targetX = Number.isFinite(e.landX) ? e.landX : e.phantomTarget && e.phantomTarget.x || e.x;
    const targetY = Math.max(viewTop + 145, Math.min(GROUND - 28, e.phantomTarget && e.phantomTarget.y || GROUND - 34));
    const side = e.attackSide || 'top', arrowX = side === 'left' ? 18 : side === 'right' ? W - 18 : targetX;
    const arrowY = side === 'top' ? viewTop + 144 : targetY;
    c.save(); c.strokeStyle = '#e7fbf5'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(targetX, GROUND, 35, 8, 0, 0, TAU); c.stroke();
    for (const sign of [-1, 1]) { line(c, targetX + sign * 35, GROUND - 11, targetX + sign * 26, GROUND - 7, '#e7fbf5', 2); }
    c.setLineDash([4, 8]); line(c, arrowX, arrowY, targetX, GROUND - 23, '#d4f7ef70', 1); c.setLineDash([]);
    c.translate(arrowX, arrowY);
    c.rotate(side === 'left' ? -Math.PI / 2 : side === 'right' ? Math.PI / 2 : 0);
    polygon(c, [[-9, -11], [-3, -11], [-3, 0], [9, 0], [0, 12], [-9, 0], [3, 0], [3, -11]], '#edfdf4', '#244354', 2);
    c.restore();
  }
  const hazardStyles = {
    bones: { color: '#efd3a2', label: 'CỘT XƯƠNG' },
    web: { color: '#c2e6ac', label: 'LƯỚI TƠ' },
    spectral: { color: '#92e8ed', label: 'HỒN MA' },
    blood: { color: '#ff9a9d', label: 'NANH MÁU' },
    eclipse: { color: '#ffd292', label: 'NHẬT THỰC' }
  };
  function drawBossHazards(c, hazards, t, effects, world) {
    for (const hazard of hazards || []) {
      if (hazard.phase !== 'warning' && hazard.phase !== 'active') continue;
      const style = hazardStyles[hazard.kind] || { color: palettes[world].glow, label: 'NGUY HIỂM' };
      const width = Math.max(16, hazard.w || 70), height = Math.max(8, hazard.h || 65);
      const x = hazard.x, y = Number.isFinite(hazard.y) ? hazard.y : GROUND, left = x - width / 2, top = y - height;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      // The dashed box is the locked future damage area; cosmetic settings never hide it.
      if (hazard.phase === 'warning') {
        const remaining = Math.max(0, Number(hazard.timer) || 0), total = Math.max(.01, Number(hazard.warning) || remaining || 1);
        const progress = Math.max(0, Math.min(1, 1 - remaining / total));
        c.globalAlpha = .07 + progress * .07; rect(c, left, top, width, height, style.color);
        c.globalAlpha = .8; c.strokeStyle = style.color; c.lineWidth = 1.7; c.setLineDash([5, 5]); c.strokeRect(left, top, width, height); c.setLineDash([]);
        for (const side of [-1, 1]) {
          const edge = x + side * width / 2;
          line(c, edge, y + 2, edge, y - 9, style.color, 2.5); line(c, edge, y + 2, edge - side * 9, y + 2, style.color, 2.5);
        }
        c.globalAlpha = 1; rounded(c, x - 66, y - 33, 132, 19, 4, '#111c2dea', style.color + '99', 1);
        c.font = `600 10px ${font}`; c.textAlign = 'center'; c.fillStyle = style.color;
        c.fillText(`${style.label} · ${remaining.toFixed(1)}s`, x, y - 20);
        rounded(c, left, y + 7, width, 3, 1, '#111c2dcc'); rounded(c, left, y + 7, Math.max(1, width * progress), 3, 1, style.color);
        c.restore(); continue;
      }
      c.globalAlpha = .11; rect(c, left, top, width, height, style.color);
      c.globalAlpha = .7; line(c, left, y + 2, left + width, y + 2, style.color, 3);
      c.globalAlpha = 1;
      if (hazard.kind === 'bones') {
        const count = Math.max(2, Math.min(10, Math.ceil(width / 22)));
        for (let i = 0; i < count; i++) {
          const bx = left + width * (i + .5) / count, tip = top + (i % 3) * Math.min(6, height * .12);
          line(c, bx, y - 2, bx, tip + 5, '#3f303b', 8); line(c, bx, y - 2, bx, tip + 5, '#c4b08d', 5);
          for (const side of [-1, 1]) { ellipse(c, bx + side * 2.4, tip + 4, 4, 4, '#3f303b'); ellipse(c, bx + side * 2.4, tip + 4, 2.8, 2.8, '#f6dfb7'); }
          line(c, bx - 1, y - 8, bx - 1, tip + 13, '#f6dfb77a', 1);
        }
      } else if (hazard.kind === 'web') {
        ellipse(c, x, y - height / 2, width / 2, height / 2, '#98be8d24');
        c.strokeStyle = '#d6edba'; c.lineWidth = 1;
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(c, x, y - height / 2, x + Math.cos(a) * width / 2, y - height / 2 + Math.sin(a) * height / 2, '#d6edba', 1); }
        for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(x, y - height / 2, width / 2 * i / 3, height / 2 * i / 3, 0, 0, TAU); c.stroke(); }
        for (const side of [-1, 1]) polygon(c, [[x + side * width * .34, y - 5], [x + side * width * .34 - 3, y - 11], [x + side * width * .34 + 3, y - 11]], '#e1f5ce');
      } else if (hazard.kind === 'spectral') {
        const count = Math.max(2, Math.min(6, Math.ceil(width / 30)));
        for (let i = 0; i < count; i++) {
          const gx = left + width * (i + .5) / count, sway = effects ? Math.sin(t * 5 + i * 2) * 3 : 0, tip = top + (i % 2) * height * .12;
          c.beginPath(); c.moveTo(gx - 8, y); c.quadraticCurveTo(gx - 14 + sway, y - height * .58, gx + sway, tip); c.quadraticCurveTo(gx + 14 + sway, y - height * .62, gx + 8, y); c.closePath(); c.fillStyle = '#8cd4dc65'; c.fill();
          line(c, gx + sway, tip + 9, gx + sway, y - 13, '#b9fff08a', 2);
          ellipse(c, gx - 3 + sway, tip + height * .28, 1.4, 2, '#153c55'); ellipse(c, gx + 3 + sway, tip + height * .28, 1.4, 2, '#153c55');
        }
      } else if (hazard.kind === 'blood') {
        const count = Math.max(2, Math.min(8, Math.ceil(width / 27)));
        for (let i = 0; i < count; i++) {
          const bx = left + width * (i + .5) / count, half = width / count * .42, tip = top + (i % 2) * height * .15;
          polygon(c, [[bx - half, y], [bx + 3, tip], [bx + half, y]], '#aa4856', '#ed8c96', 1.2);
          polygon(c, [[bx + 3, tip + 3], [bx + 4, y - 8], [bx - half * .45, y - 7]], '#efb5ad');
          line(c, bx + 4, tip + 13, bx + half * .65, y - 8, '#fff0d55e', 1);
        }
      } else {
        // Eclipse energy uses crisp edges so the whole beam remains readable on mobile.
        rect(c, left, top, width, height, '#dc9b4528'); rect(c, left + width * .15, top, width * .7, height, '#ffd29227');
        rect(c, x - Math.max(2, width * .055), top, Math.max(4, width * .11), height, '#fff0b8a6');
        line(c, left + 1, top, left + 1, y, '#eab374', 1.5); line(c, left + width - 1, top, left + width - 1, y, '#eab374', 1.5);
        c.strokeStyle = '#ffe6a9'; c.lineWidth = 1.4;
        c.beginPath(); c.ellipse(x, top + 4, width / 2, 6, 0, 0, TAU); c.stroke();
        c.beginPath(); c.ellipse(x, y - 3, width / 2, 8, 0, 0, TAU); c.stroke();
        if (effects) for (let i = 0; i < 4; i++) { const rise = (t * 78 + i * height / 4) % height; line(c, x - width * .22, y - rise, x + width * .22, y - rise - 5, '#ffe0a960', 1); }
      }
      c.restore();
    }
  }
  function drawGroundCracks(c, cracks) {
    for (const crack of cracks || []) {
      const width = Math.max(20, crack.w || 120), y = Number.isFinite(crack.y) ? crack.y : GROUND;
      const r = seedRandom(Math.floor(crack.x * 13 + width * 7)), points = [], opacity = Math.max(0, Math.min(1, crack.life / (crack.maxLife || 2)));
      for (let i = 0; i <= 10; i++) points.push([crack.x - width / 2 + width * i / 10, y + 4 + r() * 8]);
      c.save(); c.globalAlpha = opacity * .8;
      for (let i = 1; i < points.length; i++) {
        line(c, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], '#101913', 4);
        line(c, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], '#e5b675', 1.3);
        if (i % 2 === 0) {
          const p = points[i], reach = 8 + r() * 17;
          line(c, p[0], p[1], p[0] + (r() - .5) * 12, p[1] + reach, '#c7976177', 1.2);
        }
      }
      c.restore();
    }
  }
  function drawGolemZones(c, zones, t, effects) {
    for (const zone of zones || []) {
      if (zone.phase !== 'warning' && zone.phase !== 'impact') continue;
      const width = Math.max(20, zone.w || 145), height = Math.max(8, zone.h || 54), x = zone.x, y = Number.isFinite(zone.y) ? zone.y : GROUND;
      const left = x - width / 2, color = zone.kind === 'shock' ? '#f5d69a' : '#ecb87b';
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      if (zone.phase === 'warning') {
        const remaining = Math.max(0, Number(zone.timer) || 0), total = Math.max(.01, Number(zone.total) || remaining || 1);
        c.globalAlpha = .13; rect(c, left, y - height, width, height, color); c.globalAlpha = 1;
        c.strokeStyle = color; c.lineWidth = 1.5; c.setLineDash([6, 5]); c.strokeRect(left, y - height, width, height); c.setLineDash([]);
        for (const side of [-1, 1]) { line(c, x + side * width / 2, y - 10, x + side * width / 2, y + 3, color, 2.3); line(c, x + side * width / 2, y + 3, x + side * (width / 2 - 10), y + 3, color, 2.3); }
        const text = zone.kind === 'shock' ? 'SÓNG CHẤN · NHẢY!' : zone.kind === 'slam' ? `DẬP ĐẤT ${zone.comboIndex || 1}/3` : 'VUNG CHÙY';
        rounded(c, x - 82, y - height - 24, 164, 19, 4, '#152326ee', '#e7b47580', 1);
        c.font = `600 10px ${font}`; c.textAlign = 'center'; c.fillStyle = '#f4d4a2'; c.fillText(`${text} · ${remaining.toFixed(1)}s`, x, y - height - 11);
        rounded(c, left, y + 7, width, 3, 1, '#152326'); rounded(c, left, y + 7, Math.max(1, width * Math.min(1, Math.max(0, 1 - remaining / total))), 3, 1, color);
      } else {
        c.globalAlpha = .16; rect(c, left, y - height, width, height, color); c.globalAlpha = 1;
        line(c, left, y + 1, left + width, y + 1, '#f5d2a0', 3);
        if (zone.kind === 'shock') {
          c.strokeStyle = '#f4d9a3'; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, y - 6, width / 2, 13, 0, 0, TAU); c.stroke();
          for (let i = 0; i < 6; i++) polygon(c, [[left + width * i / 6, y], [left + width * (i + .35) / 6, y - height * .7], [left + width * (i + .75) / 6, y]], '#e4b77e5c');
        } else {
          for (let i = 0; i < 7; i++) {
            const a = Math.PI + i * Math.PI / 6, reach = height * (.52 + (i % 2) * .3);
            line(c, x + Math.cos(a) * 8, y + Math.sin(a) * 5, x + Math.cos(a) * width * .36, y + Math.sin(a) * reach, '#f3d0a1', i % 2 ? 2 : 1.2);
          }
        }
        if (effects) for (let i = 0; i < 5; i++) {
          const progress = Math.min(1, Math.max(0, 1 - (zone.timer || 0) / (zone.total || .3))), rx = left + width * (i + .5) / 5;
          ellipse(c, rx, y - 4 - Math.sin(progress * Math.PI) * (12 + i % 2 * 7), 12 + progress * 14, 5 + progress * 4, '#a99b7740');
          polygon(c, [[rx - 3, y - 5 - progress * 21], [rx, y - 11 - progress * 24], [rx + 5, y - 6 - progress * 21]], '#c8b387');
        }
      }
      c.restore();
    }
  }
  function drawWolfZones(c, zones, t, effects) {
    for (const zone of zones || []) {
      if (zone.phase !== 'warning' && zone.phase !== 'impact') continue;
      const x = zone.x, y = Number.isFinite(zone.y) ? zone.y : GROUND, width = Math.max(20, zone.w || 118), height = Math.max(8, zone.h || 52);
      const left = x - width / 2, color = zone.kind === 'claw' ? '#ffb5a1' : '#eed59e';
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha = zone.phase === 'warning' ? .13 : .2; rect(c, left, y - height, width, height, color); c.globalAlpha = 1;
      if (zone.phase === 'warning') {
        const remaining = Math.max(0, Number(zone.timer) || 0), total = Math.max(.01, Number(zone.total) || remaining || 1);
        const progress = Math.max(0, Math.min(1, 1 - remaining / total));
        c.strokeStyle = color; c.lineWidth = 1.7; c.setLineDash([6, 4]); c.strokeRect(left, y - height, width, height); c.setLineDash([]);
        for (const side of [-1, 1]) {
          line(c, x + side * width / 2, y - 9, x + side * width / 2, y + 3, color, 2.5);
          line(c, x + side * width / 2, y + 3, x + side * (width / 2 - 10), y + 3, color, 2.5);
        }
        const label = zone.kind === 'claw' ? `CÀO ${zone.clawIndex || 1}/2 · NÉ HOẶC KHIÊN` : 'VỒ XUỐNG · NÉ!';
        const labelWidth = zone.kind === 'claw' ? 210 : 156;
        rounded(c, x - labelWidth / 2, y - height - 25, labelWidth, 20, 4, '#17242aee', color + 'a0', 1);
        c.font = `600 10px ${font}`; c.textAlign = 'center'; c.fillStyle = color;
        c.fillText(`${label} · ${remaining.toFixed(1)}s`, x, y - height - 12);
        rounded(c, left, y + 7, width, 3, 1, '#18262a'); rounded(c, left, y + 7, Math.max(1, width * progress), 3, 1, color);
      } else {
        line(c, left, y + 1, left + width, y + 1, color, 3);
        for (let i = 0; i < 3; i++) {
          const clawX = left + width * (.23 + i * .23), lean = zone.clawIndex === 2 ? -1 : 1;
          c.beginPath(); c.moveTo(clawX - lean * 8, y - height + 5); c.quadraticCurveTo(clawX + lean * 18, y - height * .5, clawX + lean * 4, y - 5);
          c.strokeStyle = '#ffd8b9'; c.lineWidth = 3; c.stroke();
          c.beginPath(); c.moveTo(clawX - lean * 11, y - height + 5); c.quadraticCurveTo(clawX + lean * 15, y - height * .5, clawX + lean, y - 5);
          c.strokeStyle = '#da655b'; c.lineWidth = 1.2; c.stroke();
        }
        if (effects) for (let i = 0; i < 4; i++) {
          const progress = Math.max(0, Math.min(1, 1 - (zone.timer || 0) / (zone.total || .3)));
          ellipse(c, left + width * (i + .5) / 4, y - 3 - Math.sin(progress * Math.PI) * 11, 12 + progress * 10, 5 + progress * 3, '#bcb79830');
        }
      }
      if(zone.kind==='claw'&&zone.castDuration>0){
        const elapsed=Math.max(0,zone.castElapsed||0),duration=zone.castDuration;
        const combo=zone.owner?.bloodCombo,first=!!combo?.firstDone||(zone.phase==='impact'&&zone.clawIndex===1),second=!!combo?.secondDone||(zone.phase==='impact'&&zone.clawIndex===2);
        // Both claw trails belong to one 1.5-second cast; they add no hit windows.
        c.save();c.globalAlpha=effects ? .78 : .58;c.lineCap='round';
        for(const [released,lean] of [[first,1],[second,-1]])if(released){
          for(let i=0;i<3;i++){
            const sx=left+width*(.23+i*.23);
            c.beginPath();c.moveTo(sx-lean*24,y-height+1);c.bezierCurveTo(sx+lean*23,y-height*.85,sx+lean*27,y-height*.32,sx-lean*3,y-3);
            c.strokeStyle='#a2364e';c.lineWidth=effects?8:5;c.stroke();c.strokeStyle='#ffb6a5';c.lineWidth=3;c.stroke();
            c.strokeStyle='#fff0cf';c.lineWidth=1;c.stroke();
          }
        }
        c.globalAlpha=1;rounded(c,x-64,y+13,128,17,4,'#30222ced','#ffba9c88');
        c.font=`600 9px ${font}`;c.textAlign='center';c.fillStyle='#ffd7bd';c.fillText(`SONG TRẢO · ${Math.max(0,duration-elapsed).toFixed(1)}s`,x,y+25);c.restore();
      }
      c.restore();
    }
  }
  function drawBloodMoon(c, game, t, effects) {
    const boss = (game.enemies || []).find(e => e.boss && e.health > 0 && e.bloodMoon);
    if (!boss) return;
    const x = W - 103, y = Math.min(GROUND - 136, (game.viewTop || 0) + 83);
    c.save();
    // The moon and wash indicate the combat phase, so cosmetic settings never remove them.
    const wash = c.createLinearGradient(0, 0, 0, H); wash.addColorStop(0, '#98152170'); wash.addColorStop(.55, '#8419274d'); wash.addColorStop(1, '#640e191e');
    rect(c, 0, 0, W, H, wash);
    halo(c, x, y, effects ? 103 + Math.sin(t * 1.1) * 4 : 103, '#f04a40', .24);
    halo(c, x, y, 64, '#ff7157', .22);
    ellipse(c, x, y, 42, 42, '#ef7460'); ellipse(c, x - 2, y - 1, 39, 39, '#bb3b3b');
    ellipse(c, x - 10, y - 10, 21, 25, '#da594a'); ellipse(c, x + 13, y + 11, 14, 11, '#8c2b37');
    ellipse(c, x - 14, y + 17, 8, 7, '#a02e39'); ellipse(c, x + 16, y - 20, 6, 5, '#ec8060');
    line(c, x - 32, y - 15, x - 24, y - 27, '#efb082', 1.4);
    c.font = `600 10px ${font}`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#341e28'; c.fillStyle = '#ffcfb5';
    c.strokeText('TRĂNG MÁU', x, y + 59); c.fillText('TRĂNG MÁU', x, y + 59);
    if (boss.wolfState === 'transform') {
      const remaining = Math.max(0, Number(boss.transformTime) || 0);
      c.strokeStyle = '#ffbc9f'; c.lineWidth = 1.8; c.beginPath(); c.ellipse(boss.x, boss.y - boss.h * .45, boss.w * .62, boss.h * .61, 0, 0, TAU); c.stroke();
      c.font = `700 13px ${font}`; c.textAlign = 'center'; c.fillStyle = '#ffe0bd'; c.lineWidth = 3; c.strokeStyle = '#3d262c';
      const label = `LANG VƯƠNG THỨC TỈNH · ${remaining.toFixed(1)}s`;
      c.strokeText(label, boss.x, Math.max((game.viewTop || 0) + 142, boss.y - boss.h - 18)); c.fillText(label, boss.x, Math.max((game.viewTop || 0) + 142, boss.y - boss.h - 18));
    }
    c.restore();
  }
  function drawKongRage(c, game) {
    const boss = (game.enemies || []).find(e => e.boss && e.health > 0 && e.kongState === 'final-rage');
    if (!boss) return;
    c.save();
    const wash = c.createLinearGradient(0, 0, 0, H); wash.addColorStop(0, '#973a2226'); wash.addColorStop(.65, '#ba58221c'); wash.addColorStop(1, '#de8a383b');
    rect(c, 0, 0, W, H, wash); c.restore();
  }
  function drawWolfHowl(c, e, t, effects, viewTop) {
    if (!e.howling || !(e.howlTime > 0)) return;
    const color = e.bloodMoon ? '#ffac97' : '#ecdda8', x = e.x, y = e.y - e.h * .55;
    c.save(); c.lineWidth = 1.7;
    // The solid outline always identifies immunity, even with cosmetic effects disabled.
    c.strokeStyle = color; c.beginPath(); c.ellipse(x, y, e.w * .65, e.h * .6, 0, 0, TAU); c.stroke();
    for (let index = 0; index < 3; index++) {
      const progress = effects ? (t * .62 + index / 3) % 1 : .22 + index * .24;
      const radius = e.w * (.75 + progress * 1.15);
      c.globalAlpha = .55 * (1 - progress); c.strokeStyle = color; c.lineWidth = 1 + (1 - progress) * 1.5;
      c.beginPath(); c.ellipse(x, y, radius, e.h * (.36 + progress * .45), 0, 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;
    const labelY = Math.max(viewTop + 139, e.y - e.h - 20), labelX = Math.max(98, Math.min(W - 98, x));
    rounded(c, labelX - 94, labelY - 16, 188, 24, 5, '#152127ee', color + 'a0', 1);
    c.font = `700 10px ${font}`; c.textAlign = 'center'; c.fillStyle = color;
    c.fillText(`HÚ GỌI BẦY · MIỄN ĐẠN ${e.howlTime.toFixed(1)}s`, labelX, labelY); c.restore();
  }
  function drawBananaTell(c, e, t, effects, viewTop) {
    if (e.kongState !== 'banana-windup') return;
    const targetX = Number.isFinite(e.kongTargetX) ? e.kongTargetX : Number.isFinite(e.bananaTargetX) ? e.bananaTargetX : e.targetX;
    if (!Number.isFinite(targetX)) return;
    const x = e.x + (e.dir || 1) * e.w * .25, y = e.y - e.h * .78, targetY = GROUND - 24;
    c.save(); c.lineCap = 'round'; c.strokeStyle = '#f0d269'; c.lineWidth = 1.6;
    c.setLineDash([6, 7]); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + targetX) / 2, Math.min(y, targetY) - 94, targetX, targetY); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.ellipse(targetX, GROUND - 3, e.boss ? 52 : 25, 7, 0, 0, TAU); c.stroke();
    line(c, targetX - 18, GROUND - 28, targetX + 18, GROUND - 28, '#ffeba0', 2);
    line(c, targetX, GROUND - 40, targetX, GROUND - 15, '#ffeba0', 2);
    const labelX = Math.max(65, Math.min(W - 65, e.x)), labelY = Math.max(viewTop + 137, e.y - e.h - 18);
    rounded(c, labelX - 59, labelY - 16, 118, 23, 4, '#25241cee', '#d6b75d', 1);
    c.font = `700 10px ${font}`; c.textAlign = 'center'; c.fillStyle = '#ffea92'; c.fillText(e.boss ? 'CHUỐI NỔ · NÉ!' : 'NÉM CHUỐI · NÉ!', labelX, labelY); c.restore();
  }
  function drawBananaPeels(c, peels, t, effects) {
    for (const peel of peels || []) {
      const x = peel.x, y = Number.isFinite(peel.y) ? peel.y : GROUND, width = peel.w || 38;
      c.save(); c.globalAlpha = Math.min(1, Math.max(.25, (peel.life || 0) / .5));
      c.strokeStyle = '#f3d975'; c.lineWidth = 1.2; c.setLineDash([4, 4]);
      c.beginPath(); c.ellipse(x, y - 2, width / 2, 5, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      polygon(c, [[x - 1, y - 13], [x - 6, y - 7], [x - 16, y - 3], [x - 13, y], [x - 2, y - 4], [x + 2, y - 3], [x + 14, y + 1], [x + 18, y - 2], [x + 8, y - 7], [x + 3, y - 14]], '#e7c659', '#67522d', 1.3);
      polygon(c, [[x - 1, y - 13], [x - 2, y - 5], [x + 2, y - 2], [x + 4, y - 5], [x + 2, y - 14]], '#ffeba1', '#9d7e35', .7);
      line(c, x, y - 14, x + 1, y - 17, '#665132', 2);
      if (effects) { c.globalAlpha *= .55; ellipse(c, x + 13, y - 14, 1.5, 1.5, '#ffefb2'); }
      c.restore();
    }
  }
  function drawKongVine(c, e, t, effects) {
    if (!e.vinePhase || e.kongState === 'final-rage') return;
    const anchorX = Number.isFinite(e.vineAnchorX) ? e.vineAnchorX : W / 2;
    const anchorY = Number.isFinite(e.vineAnchorY) ? e.vineAnchorY : 0;
    const handX = e.x + (e.dir || 1) * e.w * .4, handY = e.y - e.h * 49 / 54;
    c.save(); c.lineCap = 'round';
    line(c, anchorX, anchorY, handX, handY, '#16281c', 8);
    line(c, anchorX - 1, anchorY, handX - 1, handY, '#83934e', 4);
    line(c, anchorX + 1, anchorY, handX + 1, handY, '#b1b07c', 1);
    for (const progress of [.16, .32, .47, .63, .79]) {
      const x = anchorX + (handX - anchorX) * progress, y = anchorY + (handY - anchorY) * progress;
      const direction = progress < .5 ? -1 : 1;
      polygon(c, [[x, y], [x + direction * 12, y - 9], [x + direction * 16, y - 5], [x + direction * 8, y + 3]], '#647447', '#203826', .8);
    }
    c.restore();
  }
  function drawKongZones(c, zones, game, t, effects) {
    for (const zone of zones || []) {
      if (zone.phase !== 'warning' && zone.phase !== 'impact') continue;
      const x = Number.isFinite(zone.x) ? zone.x : W / 2, width = zone.w || W / 2, height = zone.h || GROUND;
      const left = Math.max(0, x - width / 2), y = Number.isFinite(zone.y) ? zone.y : GROUND;
      const warning = zone.phase === 'warning', scream = zone.kind === 'scream';
      const color = scream ? '#f4d88c' : '#ffa579';
      c.save(); c.globalAlpha = warning ? .08 : .17; rect(c, left, Math.max(0, y - height), Math.min(W - left, width), height, color); c.globalAlpha = 1;
      c.strokeStyle = color; c.lineWidth = 2; c.setLineDash(warning ? [8, 7] : []); c.strokeRect(left + 1, Math.max(0, y - height) + 1, Math.min(W - left - 2, width - 2), height - 2); c.setLineDash([]);
      if (scream) for (let index = 0; index < 4; index++) {
        const radius = 40 + index * 46 + (effects ? t * 36 % 46 : 0);
        const originX = zone.owner?.x || x, originY = (zone.owner?.y || 250) - 70;
        const angle = Math.atan2(y - height / 2 - originY, x - originX);
        c.globalAlpha = .6 - index * .11; c.beginPath(); c.arc(originX, originY, radius, angle - Math.PI / 3, angle + Math.PI / 3); c.stroke();
      }
      c.globalAlpha = 1;
      const label = scream ? 'TIẾNG THÉT · CHẠY SANG NỬA AN TOÀN' : 'CUỒNG NỘ · BẬT KHIÊN';
      const labelX = Math.max(157, Math.min(W - 157, x));
      const labelY = scream ? GROUND - 32 : Math.max((game.viewTop || 0) + 164, GROUND - 165);
      rounded(c, labelX - 151, labelY - 18, 302, 25, 5, '#25201ded', color + 'a0', 1);
      c.font = `700 11px ${font}`; c.textAlign = 'center'; c.fillStyle = color;
      const remaining = Math.max(0, zone.timer || 0);
      c.fillText(`${label}${warning ? ` · ${remaining.toFixed(1)}s` : ''}`, labelX, labelY - 2); c.restore();
    }
  }
  function drawGolemRockTell(c, e, t, effects) {
    if (e.golemState !== 'rock-windup' || !Number.isFinite(e.rockAimX) || !Number.isFinite(e.rockAimY)) return;
    const dir = e.dir || 1;
    const x = Number.isFinite(e.rockOriginX) ? e.rockOriginX : e.x + dir * (e.w || 60) * .33;
    const y = Number.isFinite(e.rockOriginY) ? e.rockOriginY : e.y - (e.h || 90) * .60;
    const dx = e.rockAimX - x, dy = e.rockAimY - y, length = Math.max(1, Math.hypot(dx, dy)), angle = Math.atan2(dy, dx);
    const pulse = effects ? .82 + Math.sin(t * 9) * .12 : .9;
    c.save(); c.globalAlpha = pulse; c.lineCap = 'round';
    // These fixed paths and aim marks are gameplay warnings, including with effects disabled.
    for (const spread of e.boss ? [-.13, 0, .13] : [0]) {
      const targetX = x + Math.cos(angle + spread) * length, targetY = y + Math.sin(angle + spread) * length;
      c.setLineDash([8, 7]); line(c, x, y, targetX, targetY, spread ? '#d9b982' : '#f7d599', spread ? 1.3 : 1.8); c.setLineDash([]);
      c.beginPath(); c.ellipse(targetX, targetY, spread ? 11 : 22, spread ? 11 : 22, 0, 0, TAU); c.strokeStyle = '#ffdc9f'; c.lineWidth = spread ? 1 : 1.8; c.stroke();
      if (!spread) {
        line(c, targetX - 28, targetY, targetX - 15, targetY, '#fff0c0', 2); line(c, targetX + 15, targetY, targetX + 28, targetY, '#fff0c0', 2);
        line(c, targetX, targetY - 28, targetX, targetY - 15, '#fff0c0', 2); line(c, targetX, targetY + 15, targetX, targetY + 28, '#fff0c0', 2);
      }
    }
    ellipse(c, x, y, 3, 3, '#ffe7b1');
    const labelY = Math.max(24, e.y - (e.h || 90) - 24), labelX = Math.max(51, Math.min(W - 51, e.x));
    rounded(c, labelX - 46, labelY - 14, 92, 23, 4, '#14232bee', '#dbb777', 1);
    c.font = `700 10px ${font}`; c.textAlign = 'center'; c.fillStyle = '#ffe5af'; c.fillText('NÉM ĐÁ', labelX, labelY + 1); c.restore();
  }
  function drawZombieSkillTell(c, e, t, effects, viewTop) {
    if (!e.boss) return;
    const wave = e.tsunamiWarning;
    if (wave) {
      const dir = wave.direction === -1 ? -1 : 1, remaining = Math.max(0, wave.remaining || 0), labelX = dir > 0 ? 140 : W - 140;
      c.save(); c.lineCap = 'round';
      // The direction and runner lane remain visible with cosmetic effects disabled.
      rect(c, 0, GROUND - 43, W, 43, '#a1db7812');
      for (let index = 0; index < 9; index++) {
        const x = 56 + index * 106;
        line(c, x - dir * 17, GROUND - 19, x + dir * 14, GROUND - 19, '#bfe68a9e', 2);
        line(c, x + dir * 14, GROUND - 19, x + dir * 6, GROUND - 26, '#bfe68a9e', 2);
        line(c, x + dir * 14, GROUND - 19, x + dir * 6, GROUND - 12, '#bfe68a9e', 2);
      }
      line(c, dir > 0 ? 4 : W - 4, GROUND - 65, dir > 0 ? 4 : W - 4, GROUND + 2, '#c8ef92', 4);
      rounded(c, labelX - 123, GROUND - 94, 246, 39, 5, '#14261eed', '#aad378', 1.3);
      c.font = `700 11px ${font}`; c.textAlign = 'center'; c.fillStyle = '#daf0ae';
      c.fillText(`TSUNAMI · 20 THÂY MA CON · ${remaining.toFixed(1)}s`, labelX, GROUND - 79);
      c.font = `600 10px ${font}`; c.fillStyle = '#b6d896';
      c.fillText(dir > 0 ? 'TRÁI → PHẢI · NHẢY / BẮN / KHIÊN' : 'PHẢI → TRÁI · NHẢY / BẮN / KHIÊN', labelX, GROUND - 64); c.restore();
    }
    const pursuing = e.gluttonState === 'chase', preparing = e.gluttonState === 'warning';
    if (pursuing || preparing) {
      const target = e.gluttonTarget || {}, targetX = Number.isFinite(target.x) ? target.x : e.x + (e.dir || 1) * 150;
      const targetY = Number.isFinite(target.y) ? target.y : GROUND, centreY = targetY - 27;
      const startY = e.y - e.h * .6, color = pursuing ? '#d8f599' : '#b6dd86';
      const labelX = Math.max(115, Math.min(W - 115, targetX));
      const nearTarget = Math.abs(e.x - targetX) < 120 + e.w / 2 && Math.abs(e.y - targetY) < 70;
      const labelY = Math.max((viewTop || 0) + 178, nearTarget ? Math.min(targetY - 81, e.y - e.h * 1.3 - 24) : targetY - 81);
      c.save(); c.lineCap = 'round'; c.strokeStyle = color; c.lineWidth = pursuing ? 2 : 1.5; c.setLineDash(preparing ? [6, 5] : []);
      c.beginPath(); c.moveTo(e.x, startY);
      if (e.gluttonJump) c.quadraticCurveTo((e.x + targetX) / 2, Math.min(startY, centreY) - 55, targetX, centreY);
      else c.lineTo(targetX, centreY);
      c.stroke(); c.setLineDash([]);
      c.beginPath(); c.ellipse(targetX, centreY, 24, 32, 0, 0, TAU); c.stroke();
      for (const dir of [-1, 1]) line(c, targetX + dir * 30, centreY, targetX + dir * 21, centreY, color, 2.5);
      rounded(c, labelX - 111, labelY - 17, 222, 24, 5, '#192c22ef', color + 'bd', 1);
      c.font = `700 10px ${font}`; c.textAlign = 'center'; c.fillStyle = color;
      c.fillText(`PHÀM ĂN · ${pursuing ? 'TRUY ĐUỔI' : 'NÉ VỒ'} · ${Math.max(0, e.gluttonTimer || 0).toFixed(1)}s`, labelX, labelY - 1);
      if (effects && pursuing) {
        for (let index = 0; index < 3; index++) {
          const back = (e.dir || 1) * (15 + index * 13);
          line(c, e.x - back, e.y - e.h * (.27 + index * .15), e.x - back - (e.dir || 1) * 24, e.y - e.h * (.27 + index * .15) + 4, '#b8dc7980', 2);
        }
      }
      c.restore();
    }
    const healFlash = Math.max(e.gluttonHealFlash || 0, e.wardHealFlash || 0);
    if (healFlash > 0) {
      c.save();
      const centreY = e.y - e.h * .5, progress = Math.max(0, Math.min(1, 1 - healFlash / .5));
      if (effects) halo(c, e.x, centreY, e.w * (.8 + progress * .45), '#b5ea79', .35 * (1 - progress));
      c.strokeStyle = '#c3ee95'; c.lineWidth = 1.8; c.globalAlpha = Math.max(.2, 1 - progress);
      c.beginPath(); c.ellipse(e.x, centreY, e.w * .62 + progress * 15, e.h * .59 + progress * 8, 0, 0, TAU); c.stroke();
      const x = e.x - e.w * .65, y = e.y - e.h - 14;
      line(c, x - 5, y, x + 5, y, '#daf8a8', 3); line(c, x, y - 5, x, y + 5, '#daf8a8', 3); c.restore();
    }
  }
  const dragonColors = {
    fire:{body:'#ac4545',shade:'#682f42',light:'#e98262',belly:'#e9b888',wing:'#84314b',membrane:'#c7595c',eye:'#ffcf67',accent:'#f1a367'},
    ice:{body:'#6daacb',shade:'#3c648c',light:'#b5e7ec',belly:'#def0e2',wing:'#39698c',membrane:'#6aa9c3',eye:'#f2ffff',accent:'#cdf4ed'},
    wind:{body:'#5f9d87',shade:'#355e60',light:'#a2d5aa',belly:'#d2dcaa',wing:'#365e66',membrane:'#6f9d8a',eye:'#f0e6a1',accent:'#c2e3b2'},
    earth:{body:'#a08055',shade:'#604f43',light:'#cfad71',belly:'#e1c58f',wing:'#5d4e43',membrane:'#a1875f',eye:'#ffdb76',accent:'#d9bd82'},
    lightning:{body:'#8b70b5',shade:'#51406f',light:'#b49acc',belly:'#e6cea0',wing:'#4e3c72',membrane:'#8b659c',eye:'#fff0a0',accent:'#f4d16d'},
    yinYang:{body:'#363746',shade:'#202432',light:'#a7a8b2',belly:'#e6dbc1',wing:'#373442',membrane:'#8c738a',eye:'#ffd583',accent:'#eee8d4'}
  };
  function yinYang(c,x,y,r,t,effects,alpha=1) {
    c.save();c.translate(x,y);c.rotate(effects?t*.65:.4);c.globalAlpha*=alpha;
    ellipse(c,0,0,r,r,'#e9eadc');c.beginPath();c.arc(0,0,r,-Math.PI/2,Math.PI/2);c.arc(0,r/2,r/2,Math.PI/2,-Math.PI/2,true);c.arc(0,-r/2,r/2,Math.PI/2,-Math.PI/2);c.closePath();c.fillStyle='#263142';c.fill();
    ellipse(c,0,-r/2,r*.13,r*.13,'#e9eadc');ellipse(c,0,r/2,r*.13,r*.13,'#263142');
    c.strokeStyle='#d6cba5';c.lineWidth=1.5;c.beginPath();c.arc(0,0,r+5,0,TAU);c.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8;c.save();c.rotate(a);line(c,r+10,-4,r+18,-4,'#c8c7b0',2);line(c,r+10,0,r+18,0,'#c8c7b0',2);line(c,r+10,4,r+18,4,'#c8c7b0',2);c.restore();}c.restore();
  }
  function drawDragon(c,dir,walk,t,boss,e,effects) {
    if(e.dragonForm==='knight'){drawDragonKnight(c,dir,walk,t,boss,e,effects);return;}
    if(drawSprite(c,e.variant==='yinYang'||boss?'ancient':e.variant||'fire',dir,t,e,effects))return;
    const variant=e.variant||'fire',p=dragonColors[variant]||dragonColors.fire,outline='#171b29';
    const royal=variant==='yinYang',flap=effects?Math.sin((e.wingTime||t)*5)*2.1:0;
    const breath=effects?Math.sin(t*2.8+(e.x||0)*.003)*.45:0,armed=!!e.tell||e.dragonState==='laser-windup';
    const claw=effects?Math.sin(t*3.2)*.9:0,horn='#ead8b8',ivory='#fff0d2';
    c.save();c.scale(dir,1);c.lineJoin='round';c.lineCap='round';
    // Broad, angular bat wings and a coiled tail retain the reference silhouette.
    for(const side of [-1,1]){
      const top=-49-flap,tip=-40-flap*.55;
      polygon(c,[[side*4,-26],[side*11,-38],[side*16,top],[side*35,tip],[side*27,-34],[side*26,-25],[side*20,-28],[side*16,-20],[side*9,-24]],p.wing,outline,1.5);
      polygon(c,[[side*15,top+2],[side*32,tip],[side*25,-35],[side*24,-28],[side*19,-31],[side*16,-23],[side*11,-26]],p.membrane,outline,.85);
      polygon(c,[[side*16,top+3],[side*31,tip+.7],[side*22,-35]],p.light);
      line(c,side*5,-27,side*16,top,p.body,1.75);
      line(c,side*16,top,side*25,-26,p.shade,1.3);
      line(c,side*16,top,side*16,-22,p.shade,1.15);
      polygon(c,[[side*14,top+1],[side*18,top-4],[side*17,top+3]],horn,outline,.65);
    }
    polygon(c,[[-9,-17],[-15,-10],[-27,-10],[-34,-19],[-29,-17],[-26,-20],[-25,-13],[-17,-14],[-12,-23]],p.shade,outline,1.5);
    line(c,-25,-12,-18,-13,p.light,1.3);
    for(const [x,y] of [[-30,-18],[-25,-19],[-20,-17]])polygon(c,[[x-1.5,y],[x,y-5],[x+2,y+1]],p.accent,outline,.65);
    // The upright torso has a plated belly, heavy feet and separate clawed arms.
    c.save();c.translate(0,breath);
    polygon(c,[[-12,-31],[-2,-34],[11,-29],[13,-12],[8,-5],[-10,-5],[-15,-13]],p.body,outline,1.65);
    polygon(c,[[-12,-26],[-6,-29],[-5,-7],[-11,-7],[-14,-14]],p.shade);
    polygon(c,[[-2,-28],[10,-25],[11,-11],[7,-7],[-2,-8]],p.belly,outline,1);
    for(let i=0;i<4;i++)line(c,-1,-23+i*3.6,10,-21.8+i*3.5,p.shade,.7);
    for(const [x,s] of [[-8,-1],[7,1]]){
      polygon(c,[[x-4,-10],[x+3,-10],[x+4,-3],[x+6,-1],[x-5,-1],[x-5,-5]],s<0?p.shade:p.body,outline,1.25);
      for(let i=0;i<3;i++)rect(c,x-3.5+i*2.6,-2.6,1.8,1.6,horn);
    }
    for(const side of [-1,1]){
      const x=side<0?-13:13,y=-19+claw*(side<0?1:-1);
      polygon(c,[[x-side*2,-27],[x+side*3,-25],[x+side*5,y],[x+side*1,y+3],[x-side*3,y-1]],side<0?p.shade:p.body,outline,1.15);
      line(c,x+side*2,y-1,x+side*4,y+1,p.light,.8);
      for(let i=0;i<2;i++)polygon(c,[[x+side*(1+i*2),y+1],[x+side*(2+i*2),y+4],[x+side*(3+i*2),y+1]],horn,outline,.5);
    }
    c.restore();
    // Oversized square head, narrow eyes and the wide, tooth-filled jaw define this family.
    polygon(c,[[-13,-44],[-17,-53],[-7,-47],[-5,-41]],horn,outline,1.15);
    polygon(c,[[15,-44],[19,-53],[22,-42]],royal?'#f5edda':p.accent,outline,1.15);
    polygon(c,[[-12,-46],[14,-46],[19,-42],[19,-37],[27,-37],[28,-31],[26,-24],[10,-23],[-12,-29]],p.body,outline,1.8);
    polygon(c,[[-11,-45],[-5,-44],[-6,-30],[-11,-31]],p.shade);
    polygon(c,[[-5,-44],[12,-44],[17,-41],[16,-35],[-4,-35]],royal?'#4b4959':p.light);
    if(royal)polygon(c,[[11,-44],[16,-42],[17,-35],[12,-35],[11,-39]],'#e9e7d8');
    polygon(c,[[-5,-40],[3,-37.5],[2,-35],[-4,-36]],p.eye,outline,.8);
    polygon(c,[[8,-37.5],[16,-40],[16,-36],[10,-35]],royal?'#e7bb7a':p.eye,outline,.8);
    rect(c,-1.5,-37.8,1.1,2.2,outline);rect(c,12,-37.8,1.1,2.2,outline);
    line(c,-6,-41,3,-38,outline,1.8);line(c,7.5,-38,17,-41,outline,1.8);
    polygon(c,[[8,-37],[27,-37],[27.5,-33],[9,-32]],royal?'#767582':p.light,outline,1);
    line(c,20.5,-35.7,20,-34.1,outline,1);line(c,25,-35.7,24.5,-34.1,outline,1);
    polygon(c,[[-2.5,-34],[26.7,-32.8],[25.5,-26],[10,-25],[-3,-28]],'#301f2b',outline,1.1);
    polygon(c,[[1,-28.4],[7,-29],[12,-26.1],[3,-27]],'#a24b59');
    for(let i=0;i<7;i++){
      const x=-1.6+i*3.9,y=-33.7+i*.16;
      polygon(c,[[x,y],[x+3.3,y+.1],[x+1.8,y+3.3+(i%2)*.6]],ivory);
    }
    for(let i=0;i<6;i++){
      const x=2+i*4,y=-27.3+(i>1?.8:0);
      polygon(c,[[x,y],[x+1.6,y-2.7],[x+3,y+.2]],ivory);
    }
    polygon(c,[[-3,-28],[10,-25],[26,-26],[25,-23],[10,-22],[-3,-25]],p.shade,outline,1);
    line(c,11,-23.6,23,-24,p.light,.6);
    if(variant==='ice'){
      polygon(c,[[-10,-44],[-9,-49],[-6,-44]],'#d6fbf3',outline,.55);
      polygon(c,[[-12,-23],[-9,-19],[-12,-16],[-15,-20]],'#b7eced',p.shade,.6);
    }
    if(variant==='wind'){
      line(c,-10,-32,-7,-34,p.accent,.7);line(c,-9,-30,-6,-32,p.accent,.7);
      polygon(c,[[-13,-24],[-17,-24],[-14,-21]],p.light,outline,.5);
    }
    if(variant==='earth')polygon(c,[[-13,-23],[-9,-25],[-7,-21],[-10,-18],[-14,-19]],p.light,p.shade,.7);
    if(variant==='lightning')polygon(c,[[-10,-26],[-4,-27],[-7,-22],[-2,-23],[-10,-15],[-7,-21],[-12,-20]],p.accent,outline,.35);
    if(royal){
      polygon(c,[[-7,-47],[-10,-55],[-3,-52],[2,-59],[7,-52],[13,-55],[12,-47]],'#e4c776',outline,1.15);
      polygon(c,[[-7,-54],[-4,-50],[-1,-52],[2,-57],[5,-52],[9,-50],[11,-53],[10,-48],[-5,-48]],'#fff0a7');
      polygon(c,[[2,-54],[4,-51],[2,-48],[0,-51]],'#b44d65',outline,.45);
      ellipse(c,-5,-50,.8,.8,'#b44d65');ellipse(c,10,-50,.8,.8,'#b44d65');
    }
    if(armed){
      ellipse(c,28,-29.5,2.1,1.7,p.eye);
      if(effects){
        halo(c,29,-29.5,8,p.eye,.22);
        for(let i=0;i<3;i++){
          const progress=((t*1.6+i/3)%1+1)%1,x=29+progress*8,y=-29.5+Math.sin(t*5+i*2)*1.8;
          polygon(c,[[x-1,y],[x,y-1.3],[x+1.5,y],[x,y+1.2]],p.eye);
        }
      }
    }
    c.restore();
  }
  function drawDragonKnight(c,dir,walk,t,boss,e,effects) {
    const outline='#162232',metal='#cbd4d1',shade='#596d79',thrust=e.spearProgress||0;
    c.save();c.scale(dir,1);
    polygon(c,[[-11,-38],[-22,-15],[-16,-4],[-4,-11],[7,-28]],'#303548',outline,1.4);
    for(const [x,s]of[[-9,1],[8,-1]]){line(c,x,-20,x+s*walk,-5,shade,7);rounded(c,x-6+s*walk,-6,13,6,2,metal,outline,1.2);}
    polygon(c,[[-16,-39],[-7,-43],[9,-41],[16,-33],[11,-17],[-10,-17],[-17,-28]],metal,outline,1.6);
    polygon(c,[[-11,-36],[0,-38],[11,-34],[0,-20]],shade);line(c,0,-36,0,-21,'#eae9d2',1);
    polygon(c,[[-13,-49],[-9,-56],[3,-59],[13,-52],[13,-42],[0,-38],[-12,-42]],metal,outline,1.5);
    polygon(c,[[-10,-54],[-17,-60],[-13,-48]],'#d5c792',outline,.8);polygon(c,[[8,-55],[17,-59],[13,-48]],'#d5c792',outline,.8);
    line(c,-8,-47,9,-47,'#233644',3);line(c,-5,-47,7,-47,'#e7d190',1);polygon(c,[[0,-52],[5,-51],[4,-42],[0,-39]],shade);
    line(c,-13,-34,-19,-23,shade,6);ellipse(c,-19,-23,4,4,metal);
    line(c,11,-33,22+thrust*12,-29,shade,6);ellipse(c,22+thrust*12,-29,3.8,3.8,metal);
    const sx=12+thrust*22;line(c,sx-19,-28,sx+39,-28,'#6d614a',2.4);line(c,sx-13,-29,sx+30,-29,'#e1d2a6',.8);
    polygon(c,[[sx+27,-28],[sx+40,-33],[sx+47,-28],[sx+40,-23]],'#f0edd0',outline,1);polygon(c,[[sx+31,-28],[sx+44,-28],[sx+38,-25]],'#9cc7cc');
    c.restore();
  }
  function crown(c,y=-57) {
    polygon(c,[[-14,y+8],[-18,y-4],[-7,y+1],[0,y-9],[7,y+1],[18,y-4],[14,y+8]],'#dbc17a','#5d473e',1);
    line(c,-12,y+5,12,y+5,'#fff0ad',1);ellipse(c,0,y+1,2,2,'#b95767');
  }
  function drawLion(c,dir,walk,t,boss,e,effects) {
    if(drawSprite(c,'lion',dir,t,e,effects))return;
    const outline='#222837',gold=e.mythicCrowned?'#d8ab5c':'#bb874b',fur='#d9bb7b',attack=e.mythicState==='spear'||e.mythicState==='pounce';
    c.save();c.scale(dir,1);
    for(const[x,s]of[[-9,1],[8,-1]]){line(c,x,-18,x+walk*s,-5,gold,6);rounded(c,x-5+walk*s,-5,12,5,2,'#765645',outline,1);}
    rounded(c,-15,-36,30,21,5,'#7b5551',outline,1.5);polygon(c,[[-14,-35],[0,-39],[14,-35],[9,-19],[-9,-19]],gold,outline,1);
    line(c,-13,-31,-21,-22,fur,6);line(c,13,-31,attack?28:22,attack?-30:-21,fur,6);
    polygon(c,[[-15,-33],[-23,-41],[-18,-52],[-9,-59],[5,-60],[19,-53],[23,-42],[16,-32],[0,-27]],'#855c3f',outline,1.5);
    for(let i=0;i<7;i++){const a=-Math.PI*.9+i*Math.PI*.3;line(c,Math.cos(a)*15,-44+Math.sin(a)*13,Math.cos(a)*20,-44+Math.sin(a)*17,'#b67e43',1.1);}
    rounded(c,-13,-53,28,22,6,fur,outline,1.1);ellipse(c,-9,-52,5,4,gold);ellipse(c,12,-52,5,4,gold);
    eye(c,-5,-45,5,'#fff4d0',1,true);eye(c,8,-45,5,'#fff4d0',1,true);
    ellipse(c,3,-37,10,6,'#e3cca0');polygon(c,[[-1,-40],[7,-40],[3,-36]],'#3b3540');line(c,3,-36,3,-33,'#5f4240',1);line(c,-2,-32,8,-32,'#6e4640',1);
    const x=attack?39:26;line(c,x,-53,x,-3,'#72533d',2);polygon(c,[[x,-61],[x-5,-48],[x,-44],[x+5,-48]],'#cedbd8',outline,1);line(c,x,-56,x,-47,'#f9ecc3',1);
    if(e.mythicCrowned)crown(c,-61);c.restore();
  }
  function drawMedusa(c,dir,walk,t,boss,e,effects) {
    if(drawSprite(c,'medusa',dir,t,e,effects))return;
    const outline='#172d36',queen=e.mythicCrowned,skin=queen?'#aac99a':'#88b394';
    c.save();c.scale(dir,1);
    polygon(c,[[-11,-27],[10,-27],[17,-2],[7,0],[1,-4],[-6,0],[-18,-3]],queen?'#655778':'#465878',outline,1.4);
    for(const x of [-9,0,9])line(c,x*.5,-24,x,-3,'#a0a6b559',1);
    rounded(c,-12,-38,25,18,5,skin,outline,1.3);polygon(c,[[-13,-34],[0,-28],[12,-35],[9,-21],[-8,-21]],'#d0ae6a',outline,1);
    line(c,-11,-32,-22,-23,skin,5);line(c,12,-32,24,-35,skin,5);for(let i=0;i<3;i++)line(c,23,-35,29,-38+i*3,skin,1.2);
    for(let i=0;i<9;i++){const a=-Math.PI+i*Math.PI/8,x=Math.cos(a)*14,y=-47+Math.sin(a)*10,sway=effects?Math.sin(t*3+i)*2:0;
      c.beginPath();c.moveTo(x*.6,-46);c.bezierCurveTo(x*1.4,-63-i%3*2,x*1.8+sway,y-12,x*1.3+sway,y-3);c.strokeStyle=i%2?'#507c65':'#6c9870';c.lineWidth=3.5;c.stroke();ellipse(c,x*1.3+sway,y-3,3.2,2.2,'#8ab17f');ellipse(c,x*1.3+sway+1,y-4, .65,.65,'#f5dd95');
    }
    rounded(c,-12,-52,25,22,6,skin,outline,1.3);eye(c,-5,-43,5,'#eddea2',1,true);eye(c,7,-43,5,'#eddea2',1,true);line(c,-3,-34,6,-34,'#5b6470',1.1);
    if(e.mythicState==='petrify'||e.tell){for(const x of [-5,7]){line(c,x,-43,x+18,-43,'#d2f2ab',1.3);ellipse(c,x,-43,2.5,2,'#f1ffd2');}}
    if(queen)crown(c,-61);c.restore();
  }
  function drawGoatman(c,dir,walk,t,boss,e,effects) {
    if(drawSprite(c,'goatman',dir,t,e,effects))return;
    const outline='#222735',fur=e.mythicCrowned?'#a9aca2':'#8b8b83',armor=e.mythicCrowned?'#b89f67':'#685957';
    c.save();c.scale(dir,1);
    for(const[x,s]of[[-9,1],[9,-1]]){line(c,x,-17,x+s*walk,-6,fur,6);polygon(c,[[x-5+s*walk,-7],[x+5+s*walk,-7],[x+7+s*walk,-1],[x+s*walk,0],[x-6+s*walk,-1]],'#35333b',outline,1);line(c,x+s*walk,-4,x+s*walk,-1,'#8f8c81',.8);}
    polygon(c,[[-18,-39],[-5,-43],[13,-40],[19,-30],[11,-16],[-11,-16],[-19,-29]],fur,outline,1.6);
    polygon(c,[[-17,-36],[-8,-39],[-3,-32],[11,-37],[17,-32],[9,-21],[-9,-22]],armor,outline,1);
    line(c,-16,-32,-24,-20,fur,7);line(c,16,-33,25,-26,fur,7);
    polygon(c,[[-13,-52],[-7,-56],[9,-55],[15,-46],[9,-36],[-2,-34],[-13,-42]],fur,outline,1.5);
    for(const side of [-1,1]){c.beginPath();c.moveTo(side*8,-52);c.bezierCurveTo(side*25,-66,side*25,-40,side*13,-39);c.strokeStyle='#282a35';c.lineWidth=6;c.stroke();c.beginPath();c.moveTo(side*8,-53);c.bezierCurveTo(side*23,-64,side*24,-43,side*14,-40);c.strokeStyle='#c4b997';c.lineWidth=3.6;c.stroke();}
    eye(c,-5,-46,4,'#ecd1a0',1,true);eye(c,7,-46,4,'#ecd1a0',1,true);polygon(c,[[1,-41],[9,-40],[5,-36]],'#3e3e45');polygon(c,[[-5,-37],[7,-36],[2,-27]],'#b7b8a3');
    const swing=e.mythicState==='axe'?(e.mythicProgress||0)*1.2:0;c.save();c.translate(24,-27);c.rotate(swing-.25);line(c,0,16,0,-25,'#735841',3);polygon(c,[[0,-25],[11,-30],[17,-23],[13,-11],[1,-14]],'#aebdbd',outline,1.3);polygon(c,[[12,-28],[17,-23],[13,-12],[10,-15]],'#e0e5d2');c.restore();
    if(e.mythicCrowned)crown(c,-65);c.restore();
  }
  function drawChimera(c,dir,walk,t,boss,e,effects) {
    if(drawSprite(c,'chimera',dir,t,e,effects))return;
    const outline='#1e2836',air=!!e.mythicAir||e.y<GROUND-50,flap=effects?Math.sin(t*6)*3:0;
    c.save();c.scale(dir,1);
    // The snake is the tail itself; the mane, single goat horn and two wings are structural.
    c.beginPath();c.moveTo(-12,-21);c.bezierCurveTo(-31,-14,-29,-46,-22,-39);c.bezierCurveTo(-19,-36,-22,-29,-19,-29);c.strokeStyle='#182c35';c.lineWidth=5;c.stroke();c.beginPath();c.moveTo(-12,-21);c.bezierCurveTo(-31,-14,-29,-46,-22,-39);c.bezierCurveTo(-19,-36,-22,-29,-19,-29);c.strokeStyle='#78947c';c.lineWidth=3.5;c.stroke();ellipse(c,-19,-29,4,2.8,'#a8b98a');ellipse(c,-17,-30, .8,.8,'#f4dc8d');line(c,-15,-28,-12,-27,'#c77f80',.7);
    for(const side of [-1,1]){polygon(c,[[side*4,-25],[side*11,-44-flap],[side*21,-55-flap],[side*20,-35],[side*25,-27],[side*13,-29],[side*8,-18]],'#6e536f',outline,1);line(c,side*4,-25,side*21,-55-flap,'#d1ac94',.9);line(c,side*11,-44-flap,side*20,-35,'#b78d8e',.7);}
    ellipse(c,-2,-21,17,12,'#af8c59');ellipse(c,-3,-16,12,6,'#c6b081');
    for(const[x,s]of[[-12,1],[-5,-1],[7,1],[14,-1]]){const stride=air?3:walk*s;line(c,x,-18,x+stride,-6, s>0?'#c09d63':'#997b58',4);rounded(c,x-3+stride,-6,8,5,2,'#d1b881',outline,.8);}
    polygon(c,[[10,-35],[8,-45],[15,-50],[23,-45],[26,-34],[22,-23],[13,-23]],'#80613f',outline,1.2);
    for(let i=0;i<6;i++)line(c,11+i*2,-44,10+i*3,-46-i%2*3,'#c29c63',1.1);
    rounded(c,14,-43,16,17,5,'#d0b17c',outline,.9);eye(c,24,-37,3.8,'#f7e6a5',1,true);ellipse(c,29,-31,5.5,3.6,'#e4c998');polygon(c,[[29,-34],[33,-32],[29,-30]],'#3c3740');
    c.beginPath();c.moveTo(16,-45);c.bezierCurveTo(9,-59,23,-60,21,-49);c.strokeStyle='#292d37';c.lineWidth=4;c.stroke();c.beginPath();c.moveTo(16,-46);c.bezierCurveTo(10,-57,22,-58,21,-49);c.strokeStyle='#d2c49c';c.lineWidth=2.6;c.stroke();
    if(e.mythicState==='pounce'||e.mythicState==='roar-windup'){rounded(c,25,-31,9,7,2,'#4e2937',outline,.8);polygon(c,[[27,-31],[29,-27],[30,-31]],'#f6e4b8');}
    c.restore();
  }
  const monsterDrawers = { skeleton: drawSkeleton, zombie: drawZombie, greenZombie: drawZombie, spider: drawSpider, ghost: drawGhost, vampire: drawVampire, golem: drawGolem, miniGolem: drawGolem, werewolf: drawWerewolf, wolfPup: drawWerewolf, kong: drawMiniKingKong, miniKingKong: drawMiniKingKong, dragon:drawDragon, fireDragon:drawDragon,iceDragon:drawDragon,windDragon:drawDragon,earthDragon:drawDragon,lightningDragon:drawDragon,dragonKnight:drawDragonKnight,lion:drawLion,lionMan:drawLion,medusa:drawMedusa,goatman:drawGoatman,chimera:drawChimera };
  function drawPetrifiedEnemy(c,e,w,h) {
    if(!(e.petrifiedTime>0))return;
    const top=e.y-h,x=e.x;
    c.save();c.lineJoin='round';
    polygon(c,[[x-w*.4,e.y],[x-w*.52,top+h*.56],[x-w*.38,top+h*.08],[x-w*.15,top-h*.02],[x+w*.29,top+h*.02],[x+w*.5,top+h*.48],[x+w*.38,e.y]],'#9da9a8a8','#d0d7cc',1.6);
    polygon(c,[[x-w*.38,top+h*.08],[x-w*.02,top+h*.22],[x-w*.21,top+h*.59],[x-w*.52,top+h*.56]],'#d9ded328');
    polygon(c,[[x+w*.29,top+h*.02],[x+w*.04,top+h*.45],[x+w*.38,e.y],[x+w*.5,top+h*.48]],'#3f56624a');
    line(c,x-w*.22,top+h*.2,x-w*.02,top+h*.38,'#546a71',1.2);line(c,x-w*.02,top+h*.38,x-w*.14,top+h*.58,'#546a71',1.2);line(c,x-w*.14,top+h*.58,x+w*.08,top+h*.78,'#546a71',1.2);
    const badgeY=top-22;rounded(c,x-37,badgeY,74,17,4,'#1d2d38ee','#b9c7c6',1);
    c.font=`700 9px ${font}`;c.textAlign='center';c.fillStyle='#e2e7da';c.fillText('HÓA ĐÁ '+Math.max(0,e.petrifiedTime).toFixed(1)+'s',x,badgeY+12);c.restore();
  }
  function drawMonster(c, e, t, effects, world, viewTop = 0) {
    if(e.dead)return;
    if(e.petrifiedTime>0){effects=false;t=0;}
    const boss = e.boss || e.type === 'boss';
    const fallbackWorld = Math.max(0, Math.min(palettes.length - 1, e.world == null ? world : e.world));
    const fallbackType = window.MM?.Campaign?.worlds?.[fallbackWorld]?.enemy || ['skeleton', 'spider', 'ghost', 'vampire', 'vampire', 'golem', 'werewolf'][fallbackWorld] || 'skeleton';
    const type = monsterDrawers[e.archetype] ? e.archetype : monsterDrawers[e.type] ? e.type : monsterDrawers[fallbackType] ? fallbackType : 'skeleton';
    const transforming = type === 'werewolf' && e.wolfState === 'transform';
    const grabbingVine = type === 'kong' && e.kongState === 'vine-rise';
    const arrivingKnight = type === 'dragon' && e.dragonState === 'knight-rise';
    const arrivingMythic = type === 'chimera' && (e.mythicState === 'rise' || e.mythicState === 'split');
    const growth = transforming ? .5 + .5 * Math.max(0, Math.min(1, 1 - (e.transformTime || 0) / 1.2)) : 1;
    const w = (e.w || (boss ? 68 : 40)) * growth, h = (e.h || (boss ? 88 : 52)) * growth, gait=boss?bossLocomotion(e,t,effects,type):null, dir = boss?smoothBossFacing(e,t,effects):(e.dir||1);
    drawPhantomTell(c, e, t, effects, viewTop);
    if (e.intangible && !transforming && !grabbingVine && !arrivingKnight && !arrivingMythic) {
      if (effects) { c.save(); c.globalAlpha = .045; ellipse(c, e.x, e.y - h * .42, 17, 5, '#c5eeeb'); c.restore(); }
      return;
    }
    const aerial = e.abilityState && e.abilityState !== 'ground' || e.y < GROUND - 8;
    shadow(c, e.x, aerial ? GROUND : e.y, w, !!aerial);
    if (type === 'dragon' && (e.variant === 'yinYang' || e.boss)) {
      const radius=e.dragonForm==='knight'?34:Math.min(106,h*.52);
      yinYang(c,e.x,e.y-h*.48,radius,t,effects,.7);
      if(e.dragonGuarded){c.save();c.strokeStyle='#f8f0d2';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y-h*.48,w*.6,h*.65,0,0,TAU);c.stroke();c.restore();}
    }
    if (e.mythicCrowned) {
      c.save();c.strokeStyle=e.mythicShield?'#a9e2e8':'#efcf89';c.lineWidth=e.mythicShield?3:1.5;c.globalAlpha=.8;
      c.beginPath();c.ellipse(e.x,e.y-h*.5,w*.6,h*.6,0,0,TAU);c.stroke();
      if(e.mythicShield){c.fillStyle='#a6e6e616';c.fill();rounded(c,e.x-53,e.y-h-30,106,18,4,'#1a3341ee','#a3d7dd');c.font=`700 10px ${font}`;c.textAlign='center';c.fillStyle='#d5f8e8';c.fillText('LÁ CHẮN MIỄN ĐẠN',e.x,e.y-h-17);}c.restore();
    }
    if (e.spiderling) {
      // The tiny, unshootable brood remains readable with decorative effects disabled.
      c.save(); c.lineWidth = 1.3; c.strokeStyle = '#f1a683'; c.fillStyle = '#c9614b38';
      c.beginPath(); c.ellipse(e.x, e.y - h * .38, w * .61, h * .60, 0, 0, TAU); c.fill(); c.stroke();
      const badgeY = e.y - h - 6;
      polygon(c, [[e.x, badgeY - 6], [e.x + 5, badgeY + 3], [e.x - 5, badgeY + 3]], '#e8ab7c', '#35252a', 1);
      line(c, e.x, badgeY - 3, e.x, badgeY, '#35252a', 1.2); ellipse(c, e.x, badgeY + 1.6, .65, .65, '#35252a');
      c.restore();
    }
    if (type === 'zombie' || type === 'greenZombie') drawZombieSkillTell(c, e, t, effects, viewTop);
    if (e.tsunamiChild && effects) {
      c.save(); c.globalAlpha = .45;
      for (let index = 0; index < 2; index++) line(c, e.x - dir * (w * .4 + 3), e.y - 7 - index * 8, e.x - dir * (w * .4 + 18 + index * 7), e.y - 5 - index * 8, '#b5d789', 1.4);
      c.restore();
    }
    if (type === 'werewolf') drawWolfHowl(c, e, t, effects, viewTop);
    if (type === 'kong' || type === 'miniKingKong') { drawKongVine(c, e, t, effects); drawBananaTell(c, e, t, effects, viewTop); }
    if (type === 'golem' || type === 'miniGolem') drawGolemRockTell(c, e, t, effects);
    if (type === 'spider' && e.abilityState === 'hanging') {
      line(c, e.x, 0, e.x, e.y - h + 3, '#d3e3ce85', boss ? 1.6 : 1);
      line(c, e.x - 1, 0, e.x - 1, e.y - h + 3, '#ffffff18', .6);
    }
    drawAbilityTell(c, e, t, effects);
    if (e.isBat && type === 'vampire') {
      drawBat(c, e, t, effects);
      drawPetrifiedEnemy(c,e,w,h);
      if (!boss && e.health < e.maxHealth && e.health > 0) { rounded(c, e.x - 14, e.y - h - 10, 28, 3, 1, '#101a27a6'); rounded(c, e.x - 14, e.y - h - 10, 28 * e.health / e.maxHealth, 3, 1, '#e2b986'); }
      return;
    }
    if (type === 'ghost' && (aerial || e.phantomState === 'strike') && effects) {
      c.save(); c.globalAlpha = .12;
      const vertical = e.phantomState === 'strike' && e.attackSide === 'top';
      ellipse(c, e.x - (vertical ? 0 : dir * 11), e.y - h * .46 - (vertical ? 14 : 0), w * .65, h * .34, '#a7e2df');
      ellipse(c, e.x - (vertical ? 0 : dir * 24), e.y - h * .4 - (vertical ? 33 : 0), w * .48, h * .22, '#a7e2df'); c.restore();
    }
    c.save();
    const locomotionPhase=gait?.phase??(Number(e.age)||t)*(type==='dragon'?3.2:2.35)+(e.motionSeed||0);
    const settled=effects&&boss&&!['charge','swoop','pounce','claw','bite','combo','stomp'].includes(e.abyssState||e.mythicState||e.dragonState||'');
    const idleBob=gait?gait.bob:(settled?Math.sin(locomotionPhase)*1.15:0);
    const lean=gait?gait.lean:0;
    c.translate(e.x, e.y+idleBob); c.rotate(lean); c.scale(w / 40, h / 54); c.lineCap = 'round'; c.lineJoin = 'round';
    if (e.abilityState === 'shadow-windup') c.globalAlpha = .6;
    const walk = effects ? Math.sin(locomotionPhase)*(boss?4.8*(gait?.intensity||.15):2.7) : 0;
    if (boss) {
      c.save(); c.globalAlpha = .25;
      c.strokeStyle = e.kongState === 'final-rage' ? '#ffae77' : e.bloodMoon ? '#ffa68d' : palettes[world].glow; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -32, 31, 37, 0, 0, TAU); c.stroke(); c.restore();
    }
    monsterDrawers[type](c, dir, walk, t, boss, e, effects);
    drawBulletArmor(c, e, t, effects);
    if (boss && !['golem','werewolf','kong','dragon','dragonKnight','lion','lionMan','medusa','goatman','chimera'].includes(type)) {
      polygon(c, [[-17, -52], [-23, -65], [-9, -59], [0, -69], [9, -59], [23, -65], [17, -52]], '#bea05d', '#251e25', 1.6);
      line(c, -15, -54, 15, -54, '#f4d493', 1.2); ellipse(c, 0, -60, 2.8, 2.8, '#f5927c');
      polygon(c, [[-21, -29], [-25, -36], [-16, -37], [-11, -29]], '#b9a574', '#211e2b'); polygon(c, [[21, -29], [25, -36], [16, -37], [11, -29]], '#b9a574', '#211e2b');
    }
    if (e.hit > 0) { c.globalAlpha = Math.min(.8, e.hit * 5); line(c, -25, -40, -32, -45, '#fff0c0', 2); line(c, 25, -37, 32, -43, '#fff0c0', 2); }
    c.restore();
    drawPetrifiedEnemy(c,e,w,h);
    if (!boss && !e.spiderling && e.health < e.maxHealth && e.health > 0) {
      rounded(c, e.x - 17, e.y - h - 12, 34, 4, 2, '#101a27a6');
      rounded(c, e.x - 17, e.y - h - 12, 34 * Math.max(.02, e.health / e.maxHealth), 4, 2, '#e2b986');
    }
  }
  function drawWarning(c, e, t, effects, world) {
    const p = palettes[world], pulse = effects ? .6 + Math.sin(t * 9) * .18 : .65, y = Math.min(e.y || GROUND, GROUND);
    c.save(); c.globalAlpha = pulse; c.strokeStyle = p.glow; c.lineWidth = 2;
    c.beginPath(); c.ellipse(e.x, y - 2, e.boss ? 44 : 25, e.boss ? 10 : 6, 0, 0, TAU); c.stroke();
    c.fillStyle = p.glow + '14'; c.fill();
    c.lineWidth = 1; c.beginPath(); c.ellipse(e.x, y - 2, e.boss ? 34 : 18, e.boss ? 7 : 4, 0, 0, TAU); c.stroke();
    for (let i = 0; i < 4; i++) { const x = e.x - 17 + i * 11, rise = effects ? (t * 24 + i * 13) % 48 : i * 9; line(c, x, y - rise, x, y - rise - 4, p.glow, 1.5); }
    c.globalAlpha = .8; rounded(c, e.x - 9, y - 55, 18, 20, 4, '#232534a8', p.glow + '6b');
    line(c, e.x, y - 51, e.x, y - 43, '#f4e6b5', 2); ellipse(c, e.x, y - 39, 1.4, 1.4, '#f4e6b5'); c.restore();
    if(e.drop && !e.abilityState){
      c.save();c.strokeStyle=p.glow+'80';c.setLineDash([3,7]);c.lineWidth=1;
      c.beginPath();c.moveTo(e.x,30);c.lineTo(e.x,y-75);c.stroke();c.setLineDash([]);
      c.fillStyle=p.glow;c.font=`400 11px ${font}`;c.textAlign='center';c.fillText('NHỆN RƠI ↓',e.x,26);c.restore();
    }
  }
  function drawBullet(c, b, effects) {
    const direction = b.dir || (b.vx < 0 ? -1 : 1);
    c.save(); c.lineCap = 'round';
    const dark=Number.isFinite(b.baseDamage)&&b.damage>b.baseDamage;
    if(dark)halo(c,b.x,b.y,18,'#ba84ee',.3);
    if(b.kind==='scytheWave') {
      c.translate(b.x,b.y);c.scale(direction,1);
      const color=dark?'#f0cfff':'#be91ff';
      if(effects) {
        const trail=c.createLinearGradient(-85,0,16,0);
        trail.addColorStop(0,'#9562db00');trail.addColorStop(.75,'#9562db35');trail.addColorStop(1,'#d9b9ff99');
        c.fillStyle=trail;c.beginPath();c.moveTo(-85,-4);c.quadraticCurveTo(-22,-7,-5,-35);
        c.quadraticCurveTo(32,0,-5,35);c.quadraticCurveTo(-22,7,-85,4);c.fill();
        c.shadowColor=color;c.shadowBlur=16;
      }
      c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.moveTo(-6,-32);c.quadraticCurveTo(28,0,-6,32);c.stroke();
      c.shadowBlur=0;c.strokeStyle='#faf0ff';c.lineWidth=1.8;c.beginPath();c.moveTo(-4,-28);c.quadraticCurveTo(22,0,-4,28);c.stroke();
      if(effects)for(let i=0;i<3;i++){
        const offset=(b.life*95+i*23)%62;
        line(c,-offset-12,(i-1)*12,-offset,(i-1)*10,'#d9bcff88',1.5);
      }
      c.restore();return;
    }
    if(['bones','bow','spear'].includes(b.kind)) {
      const angle=Math.atan2(b.vy||0,b.vx||direction);
      if(effects)line(c,b.x-Math.cos(angle)*30,b.y-Math.sin(angle)*30,b.x,b.y,dark?'#cf9cff66':'#dcd2b855',3);
      if(b.kind==='bones')drawRewardBone(c,b.x,b.y,24,angle+(effects?(b.life||0)*11:0),dark);
      else {
        c.translate(b.x,b.y);c.rotate(angle);
        const spear=b.kind==='spear',length=spear?52:31;
        line(c,-length*.65,0,length*.2,0,'#182631',4);line(c,-length*.65,0,length*.2,0,spear?'#d5dfda':'#a292ac',2);
        polygon(c,[[length*.15,-(spear?6:4)],[length*.48,0],[length*.15,spear?6:4],[length*.23,0]],dark?'#d7b8ff':spear?'#f1ffff':'#dfc5f1','#4c4d63',1);
        if(spear)line(c,length*.09,-5,length*.09,5,'#d4b87b',2);
        else for(const side of [-1,1])polygon(c,[[-length*.62,0],[-length*.8,side*5],[-length*.42,side*4],[-length*.32,0]],dark?'#ac70da':'#68557e','#c6abd9',.7);
      }
      c.restore();return;
    }
    if (b.kind === 'highAim') {
      const length = Math.max(1, Math.hypot(b.vx || 0, b.vy || 0)), dx = (b.vx || 0) / length, dy = (b.vy || 0) / length;
      if (effects) line(c, b.x - dx * 42, b.y - dy * 42, b.x, b.y, '#e8eca74a', 5);
      line(c, b.x - dx * 25, b.y - dy * 25, b.x, b.y, '#ffe9ad', 2.5); ellipse(c, b.x, b.y, 3.2, 3.2, '#fff8d5');
      c.restore(); return;
    }
    if (b.kind === 'sniper') {
      if (effects) line(c, b.x - direction * 76, b.y, b.x, b.y, '#fff1bb38', 6);
      line(c, b.x - direction * 56, b.y, b.x, b.y, '#d9be77', 2.8);
      line(c, b.x - direction * 48, b.y, b.x, b.y, '#fffde4', 1.2);
      ellipse(c, b.x, b.y, 5, 1.7, '#ffffff'); c.restore(); return;
    }
    if (effects) { line(c, b.x - direction * 26, b.y, b.x, b.y, '#f2ce8159', 4); line(c, b.x - direction * 14, b.y, b.x, b.y, '#ffd791', 2.5); }
    ellipse(c, b.x, b.y, 4.2, 2, '#fff1bb'); c.restore();
  }
  // Dragon attacks share the same locked floor footprint as combat. Their moving
  // ribbons, mist and debris are paint only: no new particle objects or hitboxes.
  const dragonZoneColors = {fire:'#ffb46d',ice:'#b9efff',wind:'#bce9d0',earth:'#ffac65',lightning:'#e3d3ff','yin-yang':'#f1ead3'};
  const dragonZoneNames = {fire:'LỬA · THIÊU ĐỐT',ice:'BĂNG RƠI',wind:'GIÓ · HẤT TUNG',earth:'DUNG NHAM',lightning:'SÉT · CHOÁNG','yin-yang':'ÂM DƯƠNG · RỜI VÙNG SÁNG'};
  const effectClamp = n => Math.max(0,Math.min(1,n));
  function dragonZoneProgress(z) {
    return effectClamp(1-Math.max(0,z.timer||0)/Math.max(.001,z.total||z.impactTime||1));
  }
  function dragonFloorMark(c,z,color,warning,t,effects) {
    const x=z.x,w=z.w||90,y=z.kind==='ice'?GROUND:z.y||GROUND,left=x-w/2;
    const pulse=effects ? .62+Math.sin(t*8)*.12 : .7;
    c.save();c.lineCap='round';
    const ground=c.createLinearGradient(left,y-8,left,y+8);
    ground.addColorStop(0,color+'00');ground.addColorStop(.45,color+(warning?'20':'60'));ground.addColorStop(1,color+'00');
    rect(c,left,y-8,w,16,ground);
    c.globalAlpha=warning?pulse:.9;
    line(c,left,y-2,left+w,y-2,color,warning?1.5:2);
    for(const side of [-1,1]){
      const edge=x+side*w/2;
      c.beginPath();c.moveTo(edge-side*11,y+3);c.lineTo(edge,y+3);c.lineTo(edge,y-17);c.strokeStyle=color;c.lineWidth=2;c.stroke();
    }
    if(warning){
      const progress=dragonZoneProgress(z);line(c,left,y+2,left+w*progress,y+2,'#fff4d4',2);
      const ticks=Math.min(16,Math.ceil(w/38));
      for(let i=0;i<ticks;i++){const fx=left+w*(i+.5)/ticks;line(c,fx-3,y-7,fx+3,y-12,color+'a0',1);}
    }
    c.restore();
  }
  function dragonZoneBadge(c,z,color,viewTop) {
    const w=z.w||90,wide=w>=120,label=wide?dragonZoneNames[z.kind]:Math.max(0,z.timer||0).toFixed(1)+'s';
    const width=wide?Math.min(w-6,label.length*6.5+18):42;
    const y=Math.max(viewTop+43,Math.min((z.y||GROUND)-28,GROUND-25));
    rounded(c,z.x-width/2,y-14,width,21,4,'#14232deb',color+'8a');
    c.font=`600 ${wide?10:9}px ${font}`;c.textAlign='center';c.fillStyle=color;c.fillText(label,z.x,y);
  }
  function dragonMouth(z,viewTop) {
    const e=z.owner||{},h=e.h||76,w=e.w||92,dir=e.dir||1;
    return {x:Number.isFinite(z.originX)?z.originX:(e.x??z.x)+dir*w*.3,
      y:Number.isFinite(z.originY)?z.originY:Math.max(viewTop+25,(e.y||185)-h*.48)};
  }
  function drawDragonFire(c,z,t,effects,viewTop) {
    const mouth=dragonMouth(z,viewTop),targetY=(z.y||GROUND)-19;
    const dx=z.x-mouth.x,dy=targetY-mouth.y,length=Math.max(20,Math.hypot(dx,dy));
    const angle=Math.atan2(dy,dx),half=(z.w||132)*.49,time=effects?t:0;
    c.save();c.translate(mouth.x,mouth.y);c.rotate(angle);c.lineCap='round';
    // A continuous, widening breath stream follows the mouth toward the mark.
    const stream=c.createLinearGradient(0,0,length,0);
    stream.addColorStop(0,'#fff1bcba');stream.addColorStop(.18,'#ffcc69c4');stream.addColorStop(.7,'#f66b2799');stream.addColorStop(1,'#c23f2238');
    const flicker=Math.sin(time*12)*half*.1;
    c.beginPath();c.moveTo(0,-3);c.bezierCurveTo(length*.28,-11,length*.56,-half*.38,length*.72,-half*.77);c.bezierCurveTo(length*.83,-half*.5,length*.89,-half*1.12+flicker,length,-half*.8);c.quadraticCurveTo(length+half*.25,-half*.44,length*.96,0);c.bezierCurveTo(length+half*.16,half*.3,length*.98,half*.76,length*.9,half);c.bezierCurveTo(length*.8,half*.65,length*.73,half*.85,length*.62,half*.43);c.bezierCurveTo(length*.42,half*.28,length*.23,6,0,3);c.closePath();c.fillStyle=stream;c.fill();
    const tongues=effects?8:4;
    for(let i=0;i<tongues;i++){
      const side=i%2?1:-1,spread=side*(.2+(i%4)*.18),phase=time*12+i*2.3;
      const start=length*(.05+(i%3)*.08),end=length*(.7+(i%3)*.13),curl=Math.sin(phase)*half*.17;
      c.beginPath();c.moveTo(start,spread*half*.09);
      c.bezierCurveTo(length*.37,spread*half*.55-curl,length*.6,spread*half*.15+curl,end-length*.1,spread*half*.82);
      c.quadraticCurveTo(end-length*.04,spread*half*.6-curl,end,spread*half+curl);
      c.bezierCurveTo(end-length*.12,spread*half*.3+curl,length*.42,spread*half*.05-curl,start,spread*half*.09);c.closePath();
      c.fillStyle=i%3?'#ffb43fa8':'#ffedb9ce';c.fill();
    }
    c.beginPath();c.moveTo(0,-1);c.bezierCurveTo(length*.1,-3,length*.23,5+flicker*.1,length*.37,3);c.strokeStyle='#fff4c9';c.lineWidth=effects?4:3;c.stroke();
    if(effects){
      for(let i=0;i<10;i++){
        const travel=(time*1.8+i*.137)%1,side=Math.sin(i*7.1),px=length*travel,py=side*half*travel;
        ellipse(c,px,py,1.2+(i%3)*.6,1.2,'#ffe3a1');
      }
    }
    c.restore();
    if(effects){
      halo(c,mouth.x,mouth.y,23,'#ffae42',.23);
      halo(c,z.x,targetY+8,(z.w||132)*.62,'#ff792d',.22);
      for(let i=0;i<5;i++){
        const drift=(time*.7+i*.21)%1,sx=z.x+Math.sin(i*2.7+drift)*half*.85,sy=targetY-10-drift*55;
        ellipse(c,sx,sy,11+drift*14,8+drift*10,'#442b3029');
      }
    }
    dragonFloorMark(c,z,dragonZoneColors.fire,false,t,effects);
  }
  function drawIceCube(c,x,y,w,h,alpha=1) {
    c.save();c.globalAlpha*=alpha;
    const ice=c.createLinearGradient(x-w/2,y-h/2,x+w/2,y+h/2);
    ice.addColorStop(0,'#e7fcffec');ice.addColorStop(.46,'#8ad9f3b8');ice.addColorStop(1,'#347dc1cc');
    polygon(c,[[x-w*.42,y-h*.45],[x+w*.28,y-h*.5],[x+w*.48,y-h*.16],[x+w*.36,y+h*.46],[x-w*.36,y+h*.43],[x-w*.5,y-h*.1]],ice,'#d8faff',1.4);
    polygon(c,[[x-w*.42,y-h*.45],[x+w*.28,y-h*.5],[x+w*.08,y-h*.15],[x-w*.5,y-h*.1]],'#e8ffffa6');
    polygon(c,[[x+w*.08,y-h*.15],[x+w*.48,y-h*.16],[x+w*.36,y+h*.46],[x+w*.04,y+h*.17]],'#70b9e766');
    line(c,x-w*.21,y-h*.29,x+w*.08,y+h*.28,'#efffffba',1.2);
    line(c,x+w*.2,y-h*.26,x-w*.13,y+h*.09,'#c1f5ffb3',1);
    line(c,x+w*.08,y-h*.15,x+w*.28,y-h*.5,'#ffffffb8',1);
    c.restore();
  }
  function drawDragonIce(c,z,t,effects,viewTop) {
    const x=z.x,w=z.w||52,h=z.h||52,progress=dragonZoneProgress(z);
    if(z.phase==='falling'){
      const cy=z.y-h/2;
      if(effects){
        const mist=c.createLinearGradient(x,cy-h*1.8,x,cy);
        mist.addColorStop(0,'#b6efff00');mist.addColorStop(1,'#a5e9ff48');
        polygon(c,[[x-w*.2,cy-h*2],[x+w*.2,cy-h*2],[x+w*.4,cy],[x-w*.4,cy]],mist);
        for(let i=0;i<4;i++){
          const rise=(t*1.3+i*.27)%1;ellipse(c,x+Math.sin(i*3.1)*w*.25,cy-h*.6-rise*60,3+rise*6,3+rise*5,'#c8f4ff30');
        }
      }
      drawIceCube(c,x,cy,w,h);
      // The landing guide stays at the true collision footprint while falling.
      dragonFloorMark(c,{...z,y:GROUND},dragonZoneColors.ice,true,t,effects);
      return;
    }
    const spread=effects?progress: .5;
    c.save();c.globalAlpha=effects?1-progress*.6:1;
    ellipse(c,x,GROUND-3,w*(.55+spread*.65),5+spread*5,'#bceeff50');
    c.strokeStyle='#d9ffffb0';c.lineWidth=1.5;c.beginPath();c.ellipse(x,GROUND-4,w*(.38+spread*.8),4+spread*7,0,0,TAU);c.stroke();
    const shards=effects?9:5;
    for(let i=0;i<shards;i++){
      const a=-Math.PI+(i+.5)*Math.PI/shards,r=w*(.2+spread*.9),sx=x+Math.cos(a)*r,sy=GROUND-5+Math.sin(a)*r*.7+spread*spread*10;
      polygon(c,[[sx-3,sy+5],[sx+(i%2?4:-1),sy-9],[sx+5,sy+3]],i%2?'#7ccceccf':'#defaffd9','#d1f7ff',.7);
    }
    c.restore();
  }
  function drawDragonWind(c,z,t,effects) {
    const x=z.x,y=z.y||GROUND,w=z.w||300,time=effects?t:0,coils=effects?7:4;
    if(effects){
      const haze=c.createRadialGradient(x,y-85,3,x,y-85,w*.49);
      haze.addColorStop(0,'#b5ddcb18');haze.addColorStop(1,'#b5ddcb00');c.fillStyle=haze;c.fillRect(x-w/2,y-240,w,250);
    }
    c.lineCap='round';
    for(let i=0;i<coils;i++){
      const fraction=i/(coils-1),cy=y-9-fraction*205,radius=w*(.45-fraction*.29),spin=time*9+i*1.9;
      c.beginPath();c.moveTo(x-radius,cy+6);c.bezierCurveTo(x-radius*.2,cy+22,x+radius*1.2,cy+7,x+radius*.85,cy-9);c.bezierCurveTo(x+radius*.6,cy-22,x-radius*.6,cy-22,x-radius*.75,cy-5);
      c.strokeStyle=i%2?'#dcfff0b8':'#86bfafa0';c.lineWidth=i%2?2:3.5;c.stroke();
      if(effects){
        const px=x+Math.cos(spin)*radius,py=cy+Math.sin(spin)*11;
        c.save();c.translate(px,py);c.rotate(spin*.4);polygon(c,[[-4,0],[0,-2.5],[5,0],[0,2.5]],i%2?'#bbce8c':'#77aa89');c.restore();
      }
    }
    if(effects)for(let i=0;i<4;i++){
      const travel=(time*.9+i*.26)%1,px=x+Math.sin(travel*8+i)*w*(.4-travel*.2),py=y-travel*205;
      line(c,px-8,py+12,px+4,py-4,'#dcfff05c',1);
    }
    dragonFloorMark(c,z,dragonZoneColors.wind,false,t,effects);
  }
  function drawDragonEarth(c,z,t,effects) {
    const x=z.x,y=z.y||GROUND,w=z.w||88,p=dragonZoneProgress(z),time=effects?t:0;
    ellipse(c,x,y-1,w*.49,8,'#3d2630');ellipse(c,x,y-2,w*.4,5,'#ff743ac9');
    c.lineCap='round';
    // Molten fissures branch over the ground, rather than forming a rock wall.
    for(let i=0;i<5;i++){
      const sx=x-w*.42+i*w*.2+Math.sin(i*4+x)*3,offset=Math.sin(i*5+x*.1)*5;
      c.beginPath();c.moveTo(sx-4,y+4);c.lineTo(sx+3,y);c.lineTo(sx-1+offset,y-5);c.lineTo(sx+5,y-8-(i%2)*3);
      c.moveTo(sx+3,y);c.lineTo(sx+9,y-2);c.lineTo(sx+11+offset*.5,y-6);
      c.strokeStyle='#542a2c';c.lineWidth=4;c.stroke();c.strokeStyle='#ff9b47';c.lineWidth=1.7;c.stroke();c.strokeStyle='#ffe8a4';c.lineWidth=.55;c.stroke();
    }
    if(effects){
      halo(c,x,y-9,w*.68,'#ff7137',.21);
      for(let i=0;i<8;i++){
        const spread=(i-3.5)/3.5,age=effectClamp(p*1.05+(i%3)*.04),height=(42+(i%3)*21)*Math.sin(Math.PI*age);
        const px=x+spread*w*.48*(.2+age),py=y-10-height;
        line(c,px-spread*5,py+10,px,py,'#f16d3152',4);
        ellipse(c,px,py,2.5+(i%2),4+(i%3),'#ffb748');ellipse(c,px-.6,py-1,1.1,2,'#fff0b7');
      }
      for(let i=0;i<3;i++){
        const wave=(time*1.5+i*.34)%1;c.beginPath();c.ellipse(x,y-4,w*(.3+wave*.35),5+wave*5,0,0,TAU);c.strokeStyle='#ffb45b'+Math.round((1-wave)*70).toString(16).padStart(2,'0');c.lineWidth=1;c.stroke();
      }
    }else{
      for(let i=0;i<3;i++)ellipse(c,x-18+i*18,y-11-(i%2)*11,3,6,'#ffc46d');
    }
    dragonFloorMark(c,z,dragonZoneColors.earth,false,t,effects);
  }
  function drawDragonLightning(c,z,t,effects,viewTop) {
    const x=z.x,y=z.y||GROUND,e=z.owner||{},sy=Math.max(viewTop+22,Math.min(y-130,(e.y||180)-(e.h||76)*.5));
    const sx=Number.isFinite(z.originX)?z.originX:(e.x??x),frame=effects?Math.floor(t*28):4,seed=x*.113+frame*2.47;
    c.lineJoin='miter';c.lineCap='round';
    c.beginPath();c.moveTo(sx,sy);
    for(let i=1;i<=11;i++){
      const f=i/11,offset=i===11?0:Math.sin(seed+i*7.43)*(10+Math.sin(i*2)*8);
      c.lineTo(sx+(x-sx)*f+offset,sy+(y-sy)*f);
    }
    c.strokeStyle='#8665ca60';c.lineWidth=effects?17:10;c.stroke();c.strokeStyle='#d6b8ff';c.lineWidth=5.2;c.stroke();c.strokeStyle='#ffffed';c.lineWidth=2;c.stroke();
    if(effects){
      for(let i=0;i<3;i++){
        const f=.25+i*.21,bx=sx+(x-sx)*f,by=sy+(y-sy)*f,side=i%2?1:-1;
        c.beginPath();c.moveTo(bx,by);c.lineTo(bx+side*18,by+12);c.lineTo(bx+side*9,by+27);c.lineTo(bx+side*33,by+45);c.strokeStyle='#d9c4ffa0';c.lineWidth=1.5;c.stroke();
      }
      halo(c,x,y-8,66,'#bea2ff',.32);halo(c,sx,sy,28,'#ddd5ff',.28);
      for(let i=0;i<7;i++){
        const a=i*TAU/7+seed*.15,r=16+(i%3)*7;line(c,x+Math.cos(a)*8,y-5+Math.sin(a)*3,x+Math.cos(a)*r,y-5+Math.sin(a)*r*.4,'#eee0ffb0',1.3);
      }
    }
    c.strokeStyle='#f5e9ff';c.lineWidth=2;c.beginPath();c.ellipse(x,y-3,(z.w||100)*.42,7,0,0,TAU);c.stroke();
    dragonFloorMark(c,z,dragonZoneColors.lightning,false,t,effects);
  }
  function drawDragonYinYang(c,z,t,effects,viewTop,warning) {
    const x=z.x,y=z.y||GROUND,w=z.w||640,left=x-w/2,top=viewTop+18,height=y-top,time=effects?t:0;
    c.save();
    // Thin outer rails always delimit the full two-thirds-map danger area.
    for(const edge of [left,left+w]){
      const edgeGlow=c.createLinearGradient(edge-7,0,edge+7,0);edgeGlow.addColorStop(0,'#fff4d600');edgeGlow.addColorStop(.5,warning?'#f8e9c572':'#fff3d4c2');edgeGlow.addColorStop(1,'#fff4d600');
      rect(c,edge-7,top,14,height,edgeGlow);line(c,edge,top,edge,y,warning?'#e8dcb380':'#fff3d9',warning?1:2);
    }
    if(warning){
      const faint=c.createLinearGradient(left,0,left+w,0);faint.addColorStop(0,'#eee9d10d');faint.addColorStop(.5,'#d9dfec18');faint.addColorStop(1,'#eee9d10d');rect(c,left,top,w,height,faint);
      const radius=31+dragonZoneProgress(z)*13;yinYang(c,x,top+height*.36,radius,time,effects,.65);
      if(effects)for(let i=0;i<8;i++){
        const a=i*TAU/8-time*.8,r=radius+20+Math.sin(time*2+i)*8;line(c,x+Math.cos(a)*r,top+height*.36+Math.sin(a)*r,x+Math.cos(a)*(r+8),top+height*.36+Math.sin(a)*(r+8),'#e7e5d57c',1.2);
      }
    }else{
      const plasma=c.createLinearGradient(left,0,left+w,0);
      plasma.addColorStop(0,'#fff8de30');plasma.addColorStop(.2,'#e5e3d5ae');plasma.addColorStop(.48,'#fffbe5b8');plasma.addColorStop(.51,'#182438d9');plasma.addColorStop(.8,'#111b32dd');plasma.addColorStop(1,'#d4d7e046');rect(c,left,top,w,height,plasma);
      const strands=effects?7:3;
      for(let i=0;i<strands;i++){
        c.beginPath();
        for(let j=0;j<=18;j++){
          const f=j/18,px=left+w*(i+.5)/strands+Math.sin(f*TAU*1.5+time*10+i*1.7)*w*.055,py=top+height*f;
          if(j)c.lineTo(px,py);else c.moveTo(px,py);
        }
        c.strokeStyle=i%2?'#070e27bc':'#fff9dfbf';c.lineWidth=i%2?17:10;c.stroke();c.strokeStyle=i%2?'#8e9ebf74':'#ffffffaa';c.lineWidth=2;c.stroke();
      }
      yinYang(c,x,top+height*.32,Math.min(61,w*.11),time,effects,.94);
      if(effects)for(let i=0;i<4;i++){
        const p=(time*1.8+i*.26)%1;c.beginPath();c.ellipse(x,y-5,w*(.08+p*.45),6+p*20,0,0,TAU);c.strokeStyle=i%2?'#f7efd7b0':'#182138d9';c.lineWidth=3-p*2;c.stroke();
      }
    }
    c.restore();dragonFloorMark(c,z,dragonZoneColors['yin-yang'],warning,t,effects);
  }
  function drawDragonZone(c,z,t,effects,viewTop) {
    const warning=z.phase==='warning',color=dragonZoneColors[z.kind],x=z.x,y=z.y||GROUND,w=z.w||90;
    if(z.kind==='yin-yang'){
      drawDragonYinYang(c,z,t,effects,viewTop,warning);
      if(warning)dragonZoneBadge(c,z,color,viewTop);return;
    }
    if(warning){
      dragonFloorMark(c,z,color,true,t,effects);
      if(z.kind==='ice'){
        const cy=Math.max(viewTop+42,z.fallStartY||viewTop+40);drawIceCube(c,x,cy,w*.52,(z.h||52)*.52,.4);
        c.setLineDash([2,8]);line(c,x,cy+22,x,y-42,color+'30',1);c.setLineDash([]);
      }else if(z.kind==='fire'){
        const mouth=dragonMouth(z,viewTop);c.setLineDash([4,9]);c.beginPath();c.moveTo(mouth.x,mouth.y);c.quadraticCurveTo((mouth.x+x)/2,mouth.y+30,x,y-18);c.strokeStyle=color+'70';c.lineWidth=1.3;c.stroke();c.setLineDash([]);
        if(effects)halo(c,mouth.x,mouth.y,10+dragonZoneProgress(z)*12,'#ffbd69',.2);
      }else if(z.kind==='earth'){
        c.beginPath();c.moveTo(x-w*.42,y-2);c.lineTo(x-w*.2,y-8);c.lineTo(x-w*.05,y-2);c.lineTo(x+w*.2,y-7);c.lineTo(x+w*.42,y-2);c.strokeStyle='#f9b973a0';c.lineWidth=1.4;c.stroke();
      }else if(z.kind==='wind'){
        for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,y-13-i*12,w*(.42-i*.07),6,0,.1,Math.PI*1.8);c.strokeStyle=color+'65';c.lineWidth=1.2;c.stroke();}
      }else if(z.kind==='lightning'){
        const sy=Math.max(viewTop+37,(z.owner?.y||180)-(z.owner?.h||76)*.6);c.setLineDash([2,9]);line(c,x,sy,x,y-30,color+'65',1);c.setLineDash([]);
        polygon(c,[[x+3,y-72],[x-8,y-51],[x+1,y-53],[x-4,y-36],[x+12,y-59],[x+3,y-58]],color+'c0');
      }
      dragonZoneBadge(c,z,color,viewTop);return;
    }
    if(z.kind==='fire')drawDragonFire(c,z,t,effects,viewTop);
    else if(z.kind==='ice')drawDragonIce(c,z,t,effects,viewTop);
    else if(z.kind==='wind')drawDragonWind(c,z,t,effects);
    else if(z.kind==='earth')drawDragonEarth(c,z,t,effects);
    else if(z.kind==='lightning')drawDragonLightning(c,z,t,effects,viewTop);
  }
  function drawChimeraBite(c,z,t,effects,viewTop) {
    const x=z.x||0,y=z.y||GROUND,w=z.w||190,h=z.h||85;
    const warning=z.phase==='warning',windup=z.attackWindup||z.total||.95,leap=z.attackLeap||.55;
    const elapsed=Number.isFinite(z.attackElapsed)?z.attackElapsed:warning?windup-(z.timer||0):windup+leap+.07;
    const travel=Math.max(0,Math.min(1,(elapsed-windup)/leap));
    const impactAge=Math.max(0,elapsed-windup-leap),opening=warning ? .3+Math.sin(travel*Math.PI*.8)*.7 : Math.max(.03,.18-impactAge*1.1);
    const centerY=y-h*.48,half=w*.46,gap=5+opening*18;
    c.save();c.lineCap='round';c.lineJoin='round';
    // The fixed footprint stays identical to the damage zone, even while the
    // creature leaps. Teeth are an attack silhouette, not a second hitbox.
    rect(c,x-w/2,y-5,w,5,warning?'#e2ab7170':'#f7d39bc9');
    if(warning) {
      const ratio=Math.max(0,Math.min(1,elapsed/(windup+leap)));
      rect(c,x-w/2,y-3,w*ratio,3,'#f6d5a0');
      c.setLineDash([7,5]);c.strokeStyle='#e8bb8080';c.lineWidth=1.2;c.strokeRect(x-w/2,Math.max(viewTop+15,y-h),w,Math.min(h,y-viewTop-15));c.setLineDash([]);
      const labelY=Math.max(viewTop+39,y-h-12);rounded(c,x-72,labelY-15,144,21,4,'#1b2734ed','#dfa975aa');
      c.font=`600 10px ${font}`;c.textAlign='center';c.fillStyle='#f0c081';c.fillText('NHẢY CẮN · RỜI VÙNG',x,labelY);
      if(travel<=0){c.restore();return;}
    }
    if(effects) {
      const owner=z.owner,sx=owner?owner.x+(z.facing||owner.dir||1)*owner.w*.22:x,sy=owner?owner.y-owner.h*.61:centerY-65;
      if(warning){
        c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+x)*.5,Math.min(sy,centerY)-26,x,centerY);
        c.strokeStyle='#f1c88a45';c.lineWidth=9;c.stroke();c.strokeStyle='#ffe2ac83';c.lineWidth=1.4;c.stroke();
      } else halo(c,x,centerY,w*.6,'#f7c58b',.17*Math.max(.2,1-impactAge*3));
    }
    c.translate(x,centerY);c.globalAlpha*=warning?Math.min(.88,.28+travel*.65):Math.max(.25,1-impactAge*2.7);
    const jaw=(lower)=>{
      c.save();c.translate(0,lower?gap:-gap);if(lower)c.scale(1,-1);
      const depth=lower?15:21;
      c.beginPath();c.moveTo(-half,3);c.bezierCurveTo(-half*.99,-depth*.7,-half*.68,-depth-6,-half*.3,-depth);
      c.quadraticCurveTo(0,-depth-10,half*.3,-depth);c.bezierCurveTo(half*.72,-depth-4,half*1.04,-depth*.55,half,3);
      c.quadraticCurveTo(half*.55,10,0,6);c.quadraticCurveTo(-half*.52,11,-half,3);c.closePath();
      const skin=c.createLinearGradient(0,-depth-7,0,7);skin.addColorStop(0,'#2b2533');skin.addColorStop(.6,'#68444b');skin.addColorStop(1,'#a36b68');
      c.fillStyle=skin;c.fill();c.strokeStyle='#f0c291';c.lineWidth=2;c.stroke();
      c.beginPath();c.moveTo(-half*.9,1);c.quadraticCurveTo(0,-4,half*.9,1);c.quadraticCurveTo(0,11,-half*.9,1);c.fillStyle='#642c3b';c.fill();
      const count=lower?6:7;
      for(let i=0;i<count;i++) {
        const u=(i+.5)/count,tx=(u*2-1)*half*.89,rootY=2+(1-Math.abs(u*2-1))*2;
        const canine=i===1||i===count-2,len=canine?(lower?21:27):12+Math.sin(u*Math.PI)*4,width=canine?7:6;
        c.beginPath();c.moveTo(tx-width,rootY-2);c.quadraticCurveTo(tx-2,rootY+len*.7,tx+Math.sign(tx)*2,rootY+len);
        c.quadraticCurveTo(tx+width*.6,rootY+len*.48,tx+width,rootY-1);c.closePath();
        const ivory=c.createLinearGradient(tx,rootY,tx,rootY+len);ivory.addColorStop(0,'#b59e83');ivory.addColorStop(.5,'#f8e9c8');ivory.addColorStop(1,'#fff8e1');c.fillStyle=ivory;c.fill();c.strokeStyle='#52373b';c.lineWidth=.8;c.stroke();
      }
      c.beginPath();c.moveTo(-half*.75,-depth*.45);c.quadraticCurveTo(0,-depth*.85,half*.76,-depth*.42);c.strokeStyle='#f0c7a044';c.lineWidth=1.3;c.stroke();c.restore();
    };
    jaw(false);jaw(true);
    if(!warning) {
      // Closing fangs land once; the crack and grit fade during the existing
      // impact window, without adding flashes or a new combat event.
      const spread=1+impactAge*4;
      c.beginPath();c.moveTo(-half*.72,2);c.lineTo(-half*.4,-4);c.lineTo(-half*.1,4);c.lineTo(half*.18,-3);c.lineTo(half*.5,3);c.lineTo(half*.77,-1);c.strokeStyle='#fff0c7';c.lineWidth=2.1;c.stroke();
      if(effects)for(let i=0;i<10;i++) {
        const angle=i*Math.PI*.2+.21,r=(21+i%3*8)*spread,px=Math.cos(angle)*r,py=Math.sin(angle)*r*.5;
        polygon(c,[[px-2,py],[px,py-4],[px+3,py+1]],i%2?'#dba97c':'#f8deaa');
      }
    }
    c.restore();
  }
  function drawRealmZones(c, zones, t, effects, viewTop=0) {
    const styles={fire:['#ed9269','LỬA · THIÊU ĐỐT'],ice:['#b6e9f4','BĂNG RƠI'],wind:['#b3e7ce','GIÓ · HẤT TUNG'],earth:['#efa16a','DUNG NHAM'],lightning:['#f0d89b','SÉT · CHOÁNG'],'yin-yang':['#e9e6da','ÂM DƯƠNG · RỜI VÙNG SÁNG'],spear:['#e6d5a7','THÁNH THƯƠNG'],laser:['#f3b39b','TIA HỦY DIỆT'],bite:['#f0c081','NHẢY CẮN'],claw:['#f0c081','NHẢY CÀO'],roar:['#efab7c','HỎA PHONG'],stab:['#e1c994','ĐÂM GIÁO'],axe:['#d6c1b0','BỔ RÌU'],petrify:['#bee0b0','ÁNH NHÌN HÓA ĐÁ · BẬT KHIÊN'],swoop:['#e7bf98','KHÓA MỤC TIÊU · BẬT KHIÊN']};
    for(const z of zones||[]){
      if(dragonZoneColors[z.kind]){c.save();c.lineJoin='round';drawDragonZone(c,z,t,effects,viewTop);c.restore();continue;}
      // Biting jaws close over their prey after the creature/player pass, so
      // the giant body cannot hide the actual impact silhouette.
      if(z.kind==='bite')continue;
      const style=styles[z.kind]||['#e9cfa0','NGUY HIỂM'],color=style[0],warning=z.phase==='warning',x=z.x||0,y=z.y||GROUND,w=z.w||90,h=z.h||70,left=x-w/2,top=Math.max(viewTop+15,y-h);
      c.save();c.lineJoin='round';
      if(z.kind==='laser'&&Number.isFinite(z.x1)){
        if(warning){c.setLineDash([7,6]);line(c,z.x1,z.y1,z.x2,z.y2,color,2);c.setLineDash([]);line(c,z.x1,z.y1,z.x2,z.y2,color+'26',25);}
        else{line(c,z.x1,z.y1,z.x2,z.y2,'#9b526b',30);line(c,z.x1,z.y1,z.x2,z.y2,color,19);line(c,z.x1,z.y1,z.x2,z.y2,'#fff4da',7);}c.restore();continue;
      }
      if(z.kind==='ice'&&z.phase==='falling'){
        const cubeTop=y-h;c.save();c.translate(x,cubeTop+h/2);polygon(c,[[-w*.42,-h*.48],[w*.29,-h*.5],[w*.48,-h*.17],[w*.37,h*.45],[-w*.4,h*.45],[-w*.5,-h*.17]],'#81c7e1d9','#dcf8f3',2);polygon(c,[[-w*.42,-h*.48],[w*.29,-h*.5],[w*.07,-h*.12],[-w*.5,-h*.17]],'#b7eced');line(c,-w*.2,-h*.3,w*.2,h*.2,'#effffa',1.5);line(c,w*.22,-h*.33,-w*.1,h*.32,'#c7f5f2',1);c.restore();
        line(c,x,viewTop+10,x,Math.max(viewTop+12,cubeTop-10),color+'30',1);c.restore();continue;
      }
      if(warning){
        rect(c,left,top,w,Math.max(3,y-top),color+(z.kind==='petrify'?'0d':'12'));
        c.strokeStyle=color+'a6';c.lineWidth=1.5;c.setLineDash([6,6]);c.strokeRect(left,top,w,Math.max(3,y-top));c.setLineDash([]);
        rect(c,left,y-5,w,5,color+'a6');
        const ratio=Math.max(0,Math.min(1,1-(z.timer||0)/Math.max(.01,z.total||1)));rect(c,left,y-3,w*ratio,3,color);
        for(let i=0;i<Math.min(20,Math.ceil(w/25));i++)line(c,left+10+i*25,y-9,left+17+i*25,y-16,color+'9c',1);
        if(z.kind==='lightning'){polygon(c,[[x+3,top+14],[x-8,top+39],[x+2,top+37],[x-4,top+56],[x+12,top+29],[x+2,top+31]],color);}
        if(z.kind==='earth')for(let j=0;j<3;j++)polygon(c,[[x-25+j*22,y-3],[x-28+j*22,y-11],[x-20+j*22,y-18],[x-13+j*22,y-4]],'#907151',color,.8);
        const labelY=Math.max(viewTop+41,Math.min(y-24,GROUND-18));const badgeWidth=Math.min(w-6,style[1].length*6.4+18);
        if(badgeWidth>45){rounded(c,x-badgeWidth/2,labelY-14,badgeWidth,20,4,'#172733ee',color+'80');c.font=`600 ${w<90?9:10}px ${font}`;c.textAlign='center';c.fillStyle=color;c.fillText(w<90?`${Math.max(0,z.timer||0).toFixed(1)}s`:style[1],x,labelY);}
      }else if(z.kind==='yin-yang'){
        rect(c,left,top,w/2,y-top,'#e8e5d3ba');rect(c,x,top,w/2,y-top,'#162537e6');
        for(let i=0;i<9;i++){const bx=left+w*(i+.5)/9;line(c,bx,top,bx+Math.sin(t*8+i)*25,y,i%2?'#f1ede1b8':'#0b1528b0',8);}
        line(c,left,top,left,y,'#fcf4d4',3);line(c,left+w,top,left+w,y,'#e8dfb6',3);yinYang(c,x,top+(y-top)*.44,Math.min(66,w*.12),t,effects,.85);
      }else if(z.kind==='fire'||z.kind==='roar'){
        rect(c,left,top,w,y-top,'#d65d4430');for(let i=0;i<Math.min(12,Math.ceil(w/30));i++){const fx=left+w*(i+.5)/Math.ceil(w/30),height=(y-top)*(.5+(i%3)*.16),wave=effects?Math.sin(t*13+i)*10:0;polygon(c,[[fx-16,y],[fx-19,y-height*.4],[fx-4,y-height+wave],[fx+2,y-height*.45],[fx+14,y-height*1.13],[fx+20,y-height*.22],[fx+13,y]],'#da704875',color,.8);polygon(c,[[fx-6,y],[fx-6,y-height*.35],[fx+5,y-height*.67],[fx+10,y]],'#ffe1a382');}
      }else if(z.kind==='lightning'){
        rect(c,left,top,w,y-top,'#b29ae52b');const pts=[[x,top]];for(let i=1;i<=8;i++)pts.push([x+(i%2?1:-1)*(i%3?15:27),top+(y-top)*i/8]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#cab3ff';c.lineWidth=12;c.stroke();c.strokeStyle='#fff4ce';c.lineWidth=4;c.stroke();ellipse(c,x,y-6,w*.5,8,'#f8e4ad');
      }else if(z.kind==='wind'){
        for(let i=0;i<6;i++){const wy=y-12-i*21,ww=w*(.25+i*.1),shift=effects?Math.sin(t*9+i)*12:0;c.beginPath();c.ellipse(x+shift,wy,ww/2,7,0,.1,Math.PI*1.8);c.strokeStyle=color;c.lineWidth=2.4;c.stroke();}polygon(c,[[x-7,y-99],[x,y-121],[x+7,y-99]],color);
      }else if(z.kind==='earth'){
        ellipse(c,x,y-4,w*.51,9,'#713c39');for(let i=0;i<5;i++){const fx=x-w*.4+i*w*.2;polygon(c,[[fx-8,y],[fx-7,y-39-i%3*17],[fx+2,y-h+8+i%2*23],[fx+10,y-25],[fx+8,y]],'#d47949',color,1);line(c,fx,y-10,fx+2,y-49,'#ffe3a0',2);}
      }else if(z.kind==='petrify'){
        rect(c,left,top,w,y-top,'#9ebba418');for(let i=0;i<5;i++){const radius=35+i*18;c.strokeStyle=color+(i%2?'88':'4f');c.lineWidth=2;c.beginPath();c.arc(z.owner?.x||x,(z.owner?.y||y)-(z.owner?.h||54)*.6,radius,-.4,Math.PI*.8);c.stroke();}
      }else{
        rect(c,left,y-Math.min(h,90),w,Math.min(h,90),color+'22');
        for(let i=0;i<3;i++){const sx=left+20+i*w*.24;line(c,sx,y-64,sx+w*.25,y-9,color,3);}
      }
      c.restore();
    }
  }
  function drawRealmShot(c,s,t,effects) {
    c.save();c.translate(s.x,s.y);const angle=Number.isFinite(s.rotation)?s.rotation:Math.atan2(s.vy||0,s.vx||1);c.rotate(angle);
    if(s.kind==='spear'){
      const len=s.w||38;line(c,-len*.65,0,len*.35,0,'#95734e',2.8);line(c,-len*.6,-.5,len*.2,-.5,'#dfc18b',.8);polygon(c,[[len*.2,0],[len*.48,-5],[len*.68,0],[len*.48,5]],'#d8e1d4','#4e626a',1);
      if(effects)line(c,-len*.8,0,-len*1.5,0,'#f1ddb34f',2);
    }else if(s.kind==='sonic'){
      // The knight sends paired white/dark pressure fronts, with a transparent
      // centre so several projectiles remain readable over the player.
      for(let i=0;i<(effects?3:2);i++){
        const radius=9+i*4,offset=-i*6;
        c.beginPath();c.ellipse(offset,0,radius*.45,radius,0,-Math.PI*.46,Math.PI*.46);
        c.strokeStyle=i%2?'#77839ead':'#fff1cdcf';c.lineWidth=i?1.5:3;c.stroke();
      }
      line(c,2,-6,5,0,'#fffbe9',1.6);line(c,5,0,2,6,'#fffbe9',1.6);
      if(effects){line(c,-9,-5,-28,-9,'#e9e4cb44',1);line(c,-9,5,-28,9,'#e9e4cb44',1);}
    }else{
      c.strokeStyle='#e8e6cf';c.lineWidth=2.4;c.beginPath();c.arc(-2,0,10,-Math.PI*.4,Math.PI*.4);c.stroke();c.strokeStyle='#aaa9c4';c.lineWidth=1.2;c.beginPath();c.arc(-7,0,15,-Math.PI*.38,Math.PI*.38);c.stroke();ellipse(c,5,0,3.5,2,'#fff1c9');
      if(effects)line(c,-10,0,-27,0,'#cabfba66',3);
    }c.restore();
  }
  function drawEnemyShot(c, shot, t, effects) {
    if (shot.kind === 'banana' || shot.kind === 'bananaFragment') {
      const size = Math.max(8, shot.w || 18);
      c.save();
      if (effects) line(c, shot.x, shot.y, shot.x - (shot.vx || 0) * .06, shot.y - (shot.vy || 0) * .06, '#f6d87860', shot.giant ? 7 : 3);
      drawBanana(c, shot.x, shot.y, size, Number.isFinite(shot.rotation) ? shot.rotation : (shot.rotationSeed || 0) + t * 8);
      if (shot.giant) { c.strokeStyle = '#ffe994'; c.lineWidth = 1.6; c.beginPath(); c.arc(shot.x, shot.y, size * .72, 0, TAU); c.stroke(); }
      c.restore(); return;
    }
    if (shot.kind === 'rock' || shot.type === 'rock') {
      const size = Math.max(8, shot.w || 20), vx = shot.vx || 0, vy = shot.vy || 0;
      c.save(); c.lineCap = 'round';
      if (effects) {
        line(c, shot.x, shot.y, shot.x - vx * .08, shot.y - vy * .08, '#c8c4a249', size * .5);
        const length = Math.max(1, Math.hypot(vx, vy)), nx = -vy / length, ny = vx / length;
        for (let i = 1; i <= 3; i++) {
          const offset = Math.sin(t * 10 + (shot.rotationSeed || 0) + i * 1.8) * size * .3;
          ellipse(c, shot.x - vx * .025 * i + nx * offset, shot.y - vy * .025 * i + ny * offset, Math.max(1, size * .085), Math.max(1, size * .065), '#cfcaab80');
        }
      }
      const rotation = (shot.rotationSeed || 0) + (effects ? t * 5 : 0);
      drawRock(c, shot.x, shot.y, size, rotation); c.restore(); return;
    }
    if (shot.kind === 'spectral' || shot.kind === 'blood' || shot.kind === 'eclipse' || shot.kind === 'eclipseshot' || shot.kind === 'web') {
      const color = shot.kind === 'spectral' ? '#97e9ed' : shot.kind === 'blood' ? '#f6a2ac' : shot.kind === 'web' ? '#d8edbc' : '#ffd292';
      c.save();
      if (effects) line(c, shot.x, shot.y, shot.x - (shot.vx || 0) * .075, shot.y - (shot.vy || 0) * .075, color + '59', 3);
      c.translate(shot.x, shot.y); c.rotate(Math.atan2(shot.vy || 0, shot.vx || 1));
      c.scale((shot.w || 12) / 12, (shot.h || 12) / 12);
      if (shot.kind === 'web') {
        ellipse(c, 0, 0, 6, 6, '#526b4c'); ellipse(c, 0, 0, 4.7, 4.7, '#d8edbc99');
        c.strokeStyle = '#eaffd2'; c.lineWidth = .8; c.beginPath(); c.arc(0, 0, 4.5, 0, TAU); c.stroke();
        for (let i = 0; i < 6; i++) { const a = i * TAU / 6; line(c, 0, 0, Math.cos(a) * 6.5, Math.sin(a) * 6.5, '#eaffd2', .8); }
        line(c, -4, -3, -11, -5, '#d8edbc', .9); line(c, -4, 0, -13, 0, '#d8edbc', .9); line(c, -4, 3, -10, 5, '#d8edbc', .9);
      } else if (shot.kind === 'spectral') {
        ellipse(c, 0, 0, 6, 5.5, '#2b6472'); ellipse(c, 0, 0, 4.6, 4.1, color); ellipse(c, 1, -1, 2.3, 2.2, '#e0fff0');
        polygon(c, [[-3, -3], [-10, -2], [-7, 1], [-11, 4], [-2, 3]], '#97e9ed8c');
      } else if (shot.kind === 'blood') {
        polygon(c, [[-6, -5], [8, 0], [-6, 5], [-2, 0]], '#a74560', color, 1.4); polygon(c, [[-3, -2], [6, 0], [-3, 2]], '#ffe2cc');
      } else {
        polygon(c, [[-7, 0], [0, -6], [7, 0], [0, 6]], '#ae744b', color, 1.4); polygon(c, [[-3, 0], [0, -3], [4, 0], [0, 3]], '#fff0bc');
        line(c, -8, -5, -11, -5, '#ffd292', 1); line(c, -8, 5, -11, 5, '#ffd292', 1);
      }
      c.restore(); return;
    }
    c.save();
    if (effects) line(c, shot.x, shot.y, shot.x - (shot.vx || 0) * .06, shot.y - (shot.vy || 0) * .06, '#e7ac8852', 2);
    c.translate(shot.x, shot.y); c.rotate(Math.atan2(shot.vy || 0, shot.vx || 1) + (effects ? t * 8 : 0));
    c.scale((shot.w || 10) / 10, (shot.h || 10) / 10);
    line(c, -4, 0, 4, 0, '#503744', 5); line(c, -4, 0, 4, 0, '#e2cda8', 2.5);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      ellipse(c, side * 4.2, end * 1.8, 2.5, 2.2, '#503744'); ellipse(c, side * 4.2, end * 1.8, 1.6, 1.4, '#f7e8c4');
    }
    c.restore();
  }
  function drawParticle(c, p) {
    const alpha = Math.max(0, Math.min(1, p.life / (p.maxLife || 1))), size = p.size || 2;
    c.save(); c.globalAlpha = alpha; c.fillStyle = p.color || '#e7cf96';
    if (p.type === 'ring') {
      c.strokeStyle = p.color || '#e7cf96'; c.lineWidth = 1.5 * alpha;
      c.beginPath(); c.arc(p.x, p.y, size * (2 - alpha), 0, TAU); c.stroke();
    } else if (p.type === 'spark' || p.type === 'streak') {
      c.lineCap = 'round'; line(c, p.x, p.y, p.x - (p.vx || 0) * .025, p.y - (p.vy || 0) * .025, p.color || '#ffe6aa', size);
    } else if (p.type === 'smoke') ellipse(c, p.x, p.y, size * (1.5 - alpha), size * (1.5 - alpha), p.color || '#8ba1a1');
    else { c.translate(p.x, p.y); c.rotate((p.life || 0) * 3); rect(c, -size / 2, -size / 2, size, size, p.color || '#ead499'); }
    c.restore();
  }
  function drawPickup(c, p, t, effects) {
    const y = p.y + (effects ? Math.sin(t * 3 + p.x) * 3 : 0);
    shadow(c, p.x, Math.min(p.y + 18, GROUND), 18, true);
    c.save(); c.translate(p.x, y); c.rotate(effects ? Math.sin(t * 2) * .06 : 0);
    rounded(c, -11, -12, 22, 22, 5, '#c8dab2', '#3c604d', 2); rounded(c, -8, -9, 16, 16, 3, '#eaf0ce');
    rect(c, -2, -6, 4, 11, '#6f9c70'); rect(c, -5.5, -2.5, 11, 4, '#6f9c70');
    line(c, -6, -9, 5, -9, '#ffffffb3', 1); c.restore();
  }
  function drawAmmoCrate(c, crate, t, effects) {
    const w = crate.w || 36, h = crate.h || 30, landed = crate.landed || crate.y >= GROUND;
    const y = crate.y, bob = landed && effects ? Math.sin(t * 3 + crate.x) * .6 : 0;
    shadow(c, crate.x, GROUND, w, !landed);
    c.save();
    if (crate.life < 3 && effects) c.globalAlpha = .65 + Math.sin(t * 10) * .3;
    c.translate(crate.x, y - h / 2 + bob);
    if (!landed && effects) c.rotate(Number.isFinite(crate.rotation) ? crate.rotation : Math.sin(t * 4 + crate.x) * .15);
    rounded(c, -w / 2, -h / 2, w, h, 3, '#546447', '#14212a', 2);
    rect(c, -w / 2 + 3, -h / 2 + 4, w - 6, h - 8, '#3f523a');
    rounded(c, -w / 2 + 3, -h / 2, w - 6, 5, 1, '#c0a36b', '#766341', .7);
    rect(c, -w / 2 + 4, -h / 2, 4, h, '#aa9160'); rect(c, w / 2 - 8, -h / 2, 4, h, '#aa9160');
    for (const side of [-1, 1]) for (const edge of [-1, 1]) ellipse(c, side * (w / 2 - 6), edge * (h / 2 - 3), 1, 1, '#e0c185');
    c.font = 'bold 8px monospace'; c.textAlign = 'center'; c.fillStyle = '#eed596'; c.fillText('AMMO', 0, 5);
    line(c, -5, -5, 5, -5, '#cfb879', 1.5);
    c.restore();
    if (!landed && effects) {
      for (let i = 0; i < 2; i++) line(c, crate.x - w * .26 + i * w * .52, y - h - 7, crate.x - w * .26 + i * w * .52, y - h - 20, '#cfb87926', 1);
    }
  }
  function drawBossEggs(c, eggs, t, effects) {
    for (const egg of eggs || []) {
      if (!(egg.health > 0)) continue;
      const width = egg.w || 30, height = egg.h || 38, y = egg.y;
      shadow(c, egg.x, GROUND, width, !egg.landed);
      c.save(); c.translate(egg.x, y - height / 2);
      if (!egg.landed && effects) c.rotate(Number.isFinite(egg.rotation) ? egg.rotation : Math.sin(t * 3) * .2);
      c.beginPath(); c.ellipse(0, 0, width / 2, height / 2, -.06, 0, TAU); c.fillStyle = '#7e965f'; c.fill(); c.strokeStyle = '#1d3a32'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.ellipse(-width * .12, -height * .08, width * .29, height * .38, -.06, 0, TAU); c.fillStyle = '#aebc779c'; c.fill();
      for (let i = 0; i < 5; i++) {
        const webY = -height * .35 + i * height * .16, reach = width * (.29 + Math.sin((i + 1) * Math.PI / 6) * .12);
        c.beginPath(); c.moveTo(-reach, webY); c.quadraticCurveTo(0, webY + height * .18, reach, webY - height * .04); c.strokeStyle = '#e2ebba9c'; c.lineWidth = .85; c.stroke();
      }
      line(c, -width * .15, -height * .41, width * .12, height * .4, '#dbe7b37a', .8);
      if (egg.health < (egg.maxHealth || 2)) {
        c.beginPath(); c.moveTo(width * .25, -height * .35); c.lineTo(width * .03, -height * .13); c.lineTo(width * .22, height * .04); c.lineTo(-width * .06, height * .25); c.strokeStyle = '#3b563a'; c.lineWidth = 1.8; c.stroke();
      }
      c.restore();
      const remaining = Math.max(0, Number(egg.hatchTime) || 0);
      const progress = Math.max(0, Math.min(1, remaining / 3));
      c.save(); c.font = `700 11px ${font}`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#172b2e'; c.fillStyle = remaining < 2 ? '#f4c58e' : '#d8edbb';
      const label = remaining.toFixed(1) + 's'; c.strokeText(label, egg.x, y - height - 9); c.fillText(label, egg.x, y - height - 9);
      if (egg.landed) {
        rounded(c, egg.x - 15, y - height - 6, 30, 3, 1, '#19352e');
        if (progress > 0) rounded(c, egg.x - 15, y - height - 6, 30 * progress, 3, 1, remaining < 1 ? '#efac83' : '#c8e89f');
      }
      const ticks = Math.max(1, Math.min(5, egg.maxHealth || 2));
      for (let i = 0; i < ticks; i++) rounded(c, egg.x - ticks * 4 + i * 8, y + 5, 6, 3, 1, i < egg.health ? '#c8e89f' : '#38564a');
      c.restore();
    }
  }
  function drawDraculaDrain(c, boss, player, t, effects) {
    if (!player || !(boss.health > 0) || (!boss.drainWarning && !(boss.drainFlash > 0))) return;
    const startY = boss.y - boss.h * .48, endY = player.y - player.h * .5;
    c.save(); c.lineCap = 'round';
    if (boss.drainWarning) {
      line(c, boss.x, startY, player.x, endY, '#ec96a3a6', 1.2);
      c.beginPath(); c.ellipse(player.x, endY, 25, 32, 0, 0, TAU); c.strokeStyle = '#f3a4ac'; c.lineWidth = 1.5; c.stroke();
      if (effects) for (let i = 0; i < 3; i++) {
        const progress = (t * 1.1 + i / 3) % 1;
        ellipse(c, boss.x + (player.x - boss.x) * progress, startY + (endY - startY) * progress, 2, 2, '#ffd6c5');
      }
    }
    if (boss.drainFlash > 0) {
      if (effects) { c.globalAlpha = .45; line(c, boss.x, startY, player.x, endY, '#d57399', 9); c.globalAlpha = 1; }
      line(c, boss.x, startY, player.x, endY, '#ffccd1', effects ? 3 : 2);
      ellipse(c, boss.x, startY, 4, 4, '#ffdbcb'); ellipse(c, player.x, endY, 5, 5, '#f6bbc2');
    }
    c.restore();
  }
  function drawBossHUD(c, bosses, game) {
    if (!bosses.length) return;
    const top = game.viewTop || 0, slotWidth = Math.min(360, (W - 100) / bosses.length);
    for (let i = 0; i < bosses.length; i++) {
      const boss = bosses[i], centre = W / 2 + (i - (bosses.length - 1) / 2) * slotWidth;
      const width = Math.min(260, slotWidth - 40), x = centre - width / 2;
      const attackRate = boss.pressure && Number.isFinite(boss.pressure.attackRate) ? Math.max(1, boss.pressure.attackRate) : 1;
      const split = boss.splitTriggered || boss.draculaClone;
      const owner = boss.draculaClone ? 'II' : 'I';
      const heirNames={lion:'SƯ TỬ VƯƠNG',medusa:'MEDUSA QUEEN',goatman:'GOATMAN HUY HOÀNG'};
      const name = boss.finalSeaSummon ? (boss.archetype==='megaLondon'?'MEGA LONDON · TRIỆU HỒI':'LEVIATHAN · TRIỆU HỒI') : boss.mythicCrowned ? heirNames[boss.archetype]||'VƯƠNG THÚ' : boss.dragonForm==='knight' ? 'KỊ SĨ RỒNG' : split ? 'DRACULA ' + owner : (game.level.bossName || 'KẺ GIỮ CỔNG').toUpperCase();
      c.save(); c.textAlign = 'center'; c.font = `600 11px ${font}`; c.fillStyle = '#eadbc2';
      c.fillText(name, centre, top + 31);
      if (!boss.intangible || boss.wolfState === 'transform' || boss.kongState === 'vine-rise' || boss.dragonState==='knight-rise' || boss.mythicState==='rise') {
        const visibleHealth = boss.kongFinalTriggered ? 0 : boss.health;
        rounded(c, x, top + 42, width, 5, 2, '#071018bb');
        if (visibleHealth > 0) rounded(c, x, top + 42, width * Math.max(.01, visibleHealth / boss.maxHealth), 5, 2, boss.bloodMoon ? '#f28d78' : attackRate > 1.3 ? '#d28b72' : '#d9a174');
        c.font = `400 9px ${font}`; c.fillStyle = '#b7c4ba'; c.fillText(`${Math.round(visibleHealth*100)/100} / ${boss.maxHealth}`, centre, top + 63);
      } else { c.font = `600 10px ${font}`; c.fillStyle = '#b7d5d1'; c.fillText('ĐÃ BIẾN MẤT', centre, top + 56); }
      c.font = `600 10px ${font}`; c.fillStyle = attackRate > 1.3 ? '#dfa180' : '#9ea99b';
      c.fillText(`NHỊP TẤN CÔNG ×${attackRate.toFixed(2)}`, centre, top + 79);
      let armorY = top + 98;
      // Drain's shield instruction has priority when it coincides with another cast.
      const warning = boss.drainWarning || boss.howlWarning || boss.tsunamiWarning || boss.skillWarning;
      if (warning) {
        const remaining = Math.max(0, Number(warning.remaining) || 0), total = Math.max(.01, Number(warning.total) || remaining || 1);
        const cardWidth = Math.min(330, slotWidth - 18), warningColor = boss.drainWarning ? '#f5abb7' : '#f1cf97';
        rounded(c, centre - cardWidth / 2, top + 86, cardWidth, 25, 5, '#101c2aeb', boss.drainWarning ? '#d894a077' : '#e5b17666', 1);
        c.font = `600 11px ${font}`; c.fillStyle = warningColor;
        const warningName = boss.drainWarning ? 'HÚT MÁU · BẬT KHIÊN' : boss.howling ? 'HÚ GỌI BẦY · MIỄN ĐẠN' : String(warning.name || 'KỸ NĂNG BOSS');
        const warningText=`${split ? owner + ' · ' : ''}${warningName} · ${remaining.toFixed(1)}s`;
        let warningSize=11;while(warningSize>8&&c.measureText(warningText).width>cardWidth-14){warningSize-=.5;c.font=`600 ${warningSize}px ${font}`;}c.fillText(warningText, centre, top + 101);
        rounded(c, centre - cardWidth / 2 + 10, top + 108, cardWidth - 20, 2, 1, '#493e34');
        rounded(c, centre - cardWidth / 2 + 10, top + 108, (cardWidth - 20) * Math.max(.002, Math.min(1, 1 - remaining / total)), 2, 1, warningColor);
        armorY = top + 128;
      }
      if (boss.bulletArmor) {
        c.font = `600 11px ${font}`; c.fillStyle = boss.hardenedTime > 0 ? '#c4f6aa' : '#a8caa1';
        const nextWardIn = Math.max(0, (Number.isFinite(boss.nextWardAt) ? boss.nextWardAt : 15) - (boss.zombieClock || 0));
        const text = boss.hardenedTime > 0 ? `KHIÊN MIỄN ĐẠN · ${boss.hardenedTime.toFixed(1)}s` : `KHIÊN SAU ${nextWardIn.toFixed(1)}s · HỒI 1 MÁU`;
        c.lineWidth = 3; c.strokeStyle = '#13222aed'; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
        if (boss.wardHealFlash > 0) {
          c.font = `700 10px ${font}`; c.fillStyle = '#d6f5af';
          c.strokeText('KHIÊN HỒI PHỤC · +1 MÁU', centre, armorY + 16); c.fillText('KHIÊN HỒI PHỤC · +1 MÁU', centre, armorY + 16);
        }
      }
      if ((boss.archetype === 'golem' || boss.type === 'golem') && boss.rageTime > 0) {
        c.font = `600 11px ${font}`; c.fillStyle = '#f5bd89'; c.lineWidth = 3; c.strokeStyle = '#13222aed';
        const text = `CUỒNG NỘ · ${boss.rageTime.toFixed(1)}s`; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
      }
      if (boss.howling && boss.howlTime > 0) {
        c.font = `700 10px ${font}`; c.fillStyle = '#ffe6ab'; c.lineWidth = 3; c.strokeStyle = '#34232bed';
        const text = `MIỄN ĐẠN · 5 SÓI CON · ${boss.howlTime.toFixed(1)}s`; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
        armorY += 17;
      }
      if (boss.bloodMoon) {
        c.font = `600 10px ${font}`; c.fillStyle = '#ffd3b4'; c.lineWidth = 3; c.strokeStyle = '#34232bed';
        const text = boss.wolfState === 'transform' ? 'THỨC TỈNH · MIỄN ĐẠN' : 'NGẮM 0,5s · NHẤN ĐÔI DI CHUYỂN ĐỂ LƯỚT'; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
      }
      if (boss.archetype === 'kong') {
        const raging = boss.kongState === 'final-rage';
        c.font = `700 10px ${font}`; c.fillStyle = raging ? '#ffbb85' : '#e5d8a1'; c.lineWidth = 3; c.strokeStyle = '#34232bed';
        const text = raging ? `CUỒNG NỘ · KHIÊN ${Math.max(0, boss.kongRageTime || 0).toFixed(1)}s` : boss.vinePhase ? 'NGẮM LÊN CAO · 2 SÁT THƯƠNG / ĐẠN' : 'CHUỐI NỔ · COI CHỪNG VỎ CHUỐI';
        c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
        if (boss.vinePhase && !raging) {
          c.font = `600 10px ${font}`; c.fillStyle = '#b7dfa4';
          c.fillText(`BẮN 5 PHÁT · +1 KHIÊN · ${Math.max(0, boss.highAimShots || 0) % 5}/5`, centre, armorY + 17);
        }
      }
      if(boss.archetype==='dragon'){
        c.font=`600 10px ${font}`;c.textAlign='center';c.fillStyle='#d9e5dc';c.lineWidth=3;c.strokeStyle='#162333ed';
        const text=boss.dragonForm==='knight'?`THÁNH THƯƠNG · TRÚNG ${Math.max(0,boss.knightHits||0)%10}/10 · +1 KHIÊN`:boss.dragonGuarded?'ÂM DƯƠNG · KHIÊN VẪN MẤT 1 MÁU':'NGẮM LÊN CAO · 2 SÁT THƯƠNG / ĐẠN';c.strokeText(text,centre,armorY);c.fillText(text,centre,armorY);
      }
      if(boss.archetype==='chimera'||boss.mythicCrowned){
        c.font=`600 10px ${font}`;c.fillStyle='#e9d8b0';c.lineWidth=3;c.strokeStyle='#242737ed';
        const damage=boss.encounter?.damage||0,text=`${boss.mythicAir?'NGẮM LÊN CAO · ':''}GÂY ${damage%10}/10 MÁU · +1 KHIÊN`;c.strokeText(text,centre,armorY);c.fillText(text,centre,armorY);
      }
      const shieldHits=game.bossShieldProgress?.();
      if(i===0&&shieldHits&&!shieldHits.special){
        c.font=`600 10px ${font}`;c.fillStyle='#b7e7d4';c.lineWidth=3;c.strokeStyle='#17232ded';
        const cap=game.maxShields?.()||3,text=shieldHits.full?`KHIÊN DỰ TRỮ ${cap}/${cap} · ĐÃ ĐẦY`:`TRÚNG ${shieldHits.count}/${shieldHits.goal} PHÁT · +1 KHIÊN`;
        const shieldY=top+Math.max(142,armorY-top+18);c.strokeText(text,W/2,shieldY);c.fillText(text,W/2,shieldY);
      }
      c.restore();
    }
  }
  function drawFloats(c, floats) {
    c.save(); c.textAlign = 'center'; c.font = `700 15px ${font}`;
    for (const f of floats || []) { c.globalAlpha = Math.min(1, Math.max(0, f.life * 2)); c.lineWidth = 3; c.strokeStyle = '#14202a'; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.color || '#eadab1'; c.fillText(f.text, f.x, f.y); }
    c.restore();
  }
  function drawHomeCast(c, t, effects, world, level) {
    // The empty centre leaves room for the home interface above the arena.
    const types = (level && level.types || ['skeleton']).filter(type => monsterDrawers[type]);
    const pool = types.length ? [...new Set(types)] : ['skeleton'], positions = [92, 215, 335, 624, 747, 870];
    for (let i = 0; i < positions.length; i++) {
      const type = pool[i % pool.length], stats = window.MM?.Campaign?.enemyTypes?.[type];
      const w = stats?.archetype==='dragon'?90:type === 'wolfPup' ? 26 : type === 'miniKingKong' ? 56 : type === 'miniGolem' ? 38 : type === 'werewolf' ? 48 : type === 'golem' ? 58 : type === 'spider' ? 46 : stats?.w||43;
      const h = stats?.archetype==='dragon'?76:type === 'wolfPup' ? 36 : type === 'miniKingKong' ? 62 : type === 'miniGolem' ? 68 : type === 'werewolf' ? 72 : type === 'golem' ? 88 : type === 'spider' ? 32 : stats?.h||61;
      drawMonster(c, { x: positions[i], y: stats?.archetype==='dragon'?270:GROUND, w, h, type, variant: stats && stats.variant, archetype: stats && stats.archetype || type, dir: i < 3 ? 1 : -1 }, t, effects, world);
    }
    drawHunter(c, { x: 477, y: GROUND, w: 45, h: 64, dir: 1, vx: 0 }, t, effects);
  }
  function draw(c, game) {
    if(window.MM?.UFOTransition?.draw(c,game))return;
    if(window.MM?.ChapterTransition?.draw(c,game))return;
    const world = Math.max(0, Math.min(palettes.length - 1, game.level && Number.isFinite(game.level.world) ? Math.trunc(game.level.world) : 0));
    const t = game.time || 0, settings = game.settings || {}, effects = settings.effects !== false && !settings.reducedMotion;
    const scenery = window.MM?.Campaign?.worlds?.[world]?.scenery;
    const sceneWorld = Number.isFinite(scenery) ? Math.max(0, Math.min(palettes.length - 1, Math.trunc(scenery))) : world === 6 ? 5 : world;
    if (!scenes.has(sceneWorld)) scenes.set(sceneWorld, createScene(sceneWorld));
    c.save();
    if (effects && game.shake > 0) c.translate(Math.sin(t * 83) * game.shake, Math.cos(t * 97) * game.shake * .6);
    const abyss=window.MM?.AbyssRenderer,water=window.MM?.UnderwaterRenderer,island=window.MM?.IslandRenderer;
    const cosmicScene=window.MM?.CosmicRenderer?.drawBackground(c,game,t);
    const islandScene=island?.drawBackground(c,game,t);
    const waterScene=water?.drawBackground(c,game,t);
    const abyssScene=abyss?.drawBackground(c,game,t);
    if(!abyssScene&&!waterScene&&!islandScene&&!cosmicScene){c.drawImage(scenes.get(sceneWorld), 0, 0); drawAtmosphere(c, sceneWorld, t, effects);}
    drawBloodMoon(c, game, t, effects);
    drawKongRage(c, game);
    if (game.screen === 'home' && (!game.enemies || !game.enemies.length)) {
      if(waterScene){for(const [i,type] of (game.level.middleSea?['babyShark','electricJellyfish','seahorse']:['piranha','pufferfish','seahorse']).entries())water.drawEnemy(c,game,{type,archetype:type,x:190+i*285,y:300,w:type==='seahorse'?55:75,h:['seahorse','electricJellyfish'].includes(type)?90:60,health:1,maxHealth:1,phase:'active',dir:i%2?-1:1},t);}
      else drawHomeCast(c, t, effects, world, game.level);
    }
    else {
      drawBossHazards(c, game.bossHazards, t, effects, world);
      drawGroundCracks(c, game.groundCracks);
      drawGolemZones(c, game.golemZones, t, effects);
      drawWolfZones(c, game.wolfZones, t, effects);
      drawKongZones(c, game.kongZones, game, t, effects);
      drawRealmZones(c,game.dragonZones,t,effects,game.viewTop||0);
      drawRealmZones(c,game.mythicZones,t,effects,game.viewTop||0);
      drawBananaPeels(c, game.bananaPeels, t, effects);
      abyss?.drawEffects(c,game,false);
      island?.drawEffects(c,game,false);
      window.MM?.CosmicRenderer?.drawEffects(c,game,false);
      water?.drawEffects(c,game,t,false);
      drawPlatforms(c, game.enemies || [], t, effects);
      for (const p of game.pickups || []) drawPickup(c, p, t, effects);
      for (const crate of game.ammoCrates || []) drawAmmoCrate(c, crate, t, effects);
      water?.drawLoot(c,game,t);
      drawBossEggs(c, game.bossEggs, t, effects);
      for (const e of game.enemies || []) {
        if (e.phase === 'warning') drawWarning(c, e, t, effects, world);
        else if(e.playerShadow){
          c.save();c.globalAlpha=.7;
          const shadowGame={...game,progression:{...game.progression,equipped:e.shadowSnapshot?.weapon||'gun'},rollSlash:null,weaponAttack:null};
          drawHunter(c,{...e,ammo:e.ammo,weaponMode:e.shadowSnapshot?.profile?.kind||'normal'},t,effects,shadowGame);
          c.globalCompositeOperation='source-atop';ellipse(c,e.x,e.y-e.h*.5,e.w*.7,e.h*.55,'#51347166');c.restore();
        }else if(!window.MM?.CosmicRenderer?.drawEnemy(c,game,e,t)&&!island?.drawEnemy(c,game,e,t)&&!water?.drawEnemy(c,game,e,t)&&!abyss?.drawEnemy(c,game,e,t))drawMonster(c, e, t, effects, world, game.viewTop || 0);
        if ((e.splitTriggered || e.draculaClone) && e.health > 0 && !e.intangible) {
          c.save(); rounded(c, e.x - 10, e.y - e.h - 27, 20, 17, 3, '#202634c9', '#bd98a05e', 1);
          c.font = `600 11px ${font}`; c.fillStyle = '#f6d7bd'; c.textAlign = 'center'; c.fillText(e.draculaClone ? 'II' : 'I', e.x, e.y - e.h - 15); c.restore();
        }
      }
      if(game.screen==='playing'&&window.MM?.WeaponManager?.current(game)==='scythe'&&!(game.scytheSwapCooldown>0)) {
        const target=window.MM.WeaponManager.swapTarget(game);
        if(target) {
          c.save();c.strokeStyle='#d6b3ff';c.lineWidth=1.5;
          c.setLineDash([4,4]);c.beginPath();c.ellipse(target.x,target.y+2,target.w*.65+6,7,0,0,Math.PI*2);c.stroke();
          c.setLineDash([]);c.font=`600 10px ${font}`;c.fillStyle='#e5cbff';c.textAlign='center';
          c.fillText('⇄',target.x,target.y-target.h-10);c.restore();
        }
      }
      for (const e of game.enemies || []) drawDraculaDrain(c, e, game.player, t, effects);
      if (game.player) {
        c.save();
        if(window.MM?.AbyssCombat?.gravityDirection(game)<0){c.translate(0,2*game.player.y-game.player.h);c.scale(1,-1);}
        if(window.MM?.ResurrectionRewards?.currentForm(game)==='light')c.filter='grayscale(1) brightness(3)';
        if(!island?.drawMoaiPlayer(c,game))drawHunter(c, game.player, t, effects,game);c.restore();
        abyss?.drawPlayerTorch(c,game);
        island?.drawPlayer(c,game,t);
        window.MM?.CosmicRenderer?.drawPlayer(c,game,t);
      }
      for (const z of game.mythicZones || []) if(z.kind==='bite'&&!z.expired)drawChimeraBite(c,z,t,effects,game.viewTop||0);
      for (const b of game.bullets || []) drawBullet(c, b, effects);
      for (const shot of game.enemyShots || []) drawEnemyShot(c, shot, t, effects);
      for (const shot of game.dragonShots || []) drawRealmShot(c,shot,t,effects);
      for (const shot of game.mythicShots || []) drawRealmShot(c,shot,t,effects);
      if (effects) for (const p of game.particles || []) drawParticle(c, p);
      abyss?.drawEffects(c,game,true);
      water?.drawEffects(c,game,t,true);
      island?.drawEffects(c,game,true);
      window.MM?.CosmicRenderer?.drawEffects(c,game,true);
      abyss?.drawLighting(c,game);
      window.MM?.OceanVisuals?.drawEffects(c,game,t);
      window.MM?.OceanVisuals?.drawLighting(c,game,t);
      drawFloats(c, game.floats);
      drawBossHUD(c, (game.enemies || []).filter(e => e.boss && !e.dead && (e.health > 0 || e.predatorRage || e.deepFinal || e.krakenStone) && !e.middleSeaTwin), game);
    }
    if (game.flash > 0 && effects && !abyssScene) { c.globalAlpha = Math.min(.19, game.flash); rect(c, 0, 0, W, H, '#d2eeec'); c.globalAlpha = 1; }
    c.restore();
    window.MM?.ChapterTransition?.drawLanding(c,game);
  }
  function drawPortrait(c, type = 'hunter', x = 40, y = 75, scale = 1, world = 0) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    if (type === 'hunter' || type === 'player') drawHunter(c, { x: 0, y: 0, w: 38, h: 54, dir: 1 }, 0, false);
    else if(!window.MM?.AbyssRenderer?.drawEnemy(c,{level:{id:101},settings:{effects:false}},{x:0,y:0,w:40,h:54,type,dir:1,health:1},0))drawMonster(c, { x: 0, y: 0, w: 40, h: 54, type, dir: 1, boss: type === 'boss', world }, 0, false, world);
    c.restore();
  }
  window.MM = window.MM || {};
  window.MM.Renderer = { draw, drawPortrait, drawHunter, palettes, width: W, height: H, groundY: GROUND };
})();
