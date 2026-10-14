/* Monster Mash — original block characters, hand-painted with native Canvas 2D. */
(function () {
  'use strict';
  const font = window.MM?.Typography?.sans || '"Noto Sans", Arial, sans-serif';
  const W = 960, H = 540, GROUND = 438, TAU = Math.PI * 2;
  const palettes = [
    { sky: '#111529', horizon: '#41405c', far: '#24273c', near: '#171d2d', ground: '#151c26', soil: '#101620', edge: '#556461', glow: '#b9a2ff', mist: '#a8aec5', moon: '#ddd8cb', name: 'cemetery' },
    { sky: '#0b1926', horizon: '#244f4b', far: '#183c3c', near: '#102827', ground: '#132924', soil: '#0b1919', edge: '#668369', glow: '#9ee1a2', mist: '#85bba5', moon: '#d8e9cd', name: 'woods' },
    { sky: '#102030', horizon: '#304d62', far: '#233c4e', near: '#162d3d', ground: '#1b3039', soil: '#14252d', edge: '#679199', glow: '#8ee7ee', mist: '#9bcfdc', moon: '#d5f1e9', name: 'city' },
    { sky: '#261524', horizon: '#6b364b', far: '#422433', near: '#291b2a', ground: '#291c29', soil: '#18141f', edge: '#82605f', glow: '#ff9a9d', mist: '#b97f8f', moon: '#f2a690', name: 'castle' },
    { sky: '#171624', horizon: '#514039', far: '#3d3035', near: '#28232d', ground: '#292729', soil: '#181820', edge: '#927950', glow: '#ffc878', mist: '#c09968', moon: '#e5b770', name: 'eclipse' },
    { sky: '#141b20', horizon: '#343d32', far: '#22302c', near: '#1c2623', ground: '#242a25', soil: '#171b20', edge: '#727650', glow: '#d4cd89', mist: '#8c9b7f', moon: '#b4bca0', name: 'cursed-valley' }
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
  function drawHunter(c, player, t, effects) {
    const x = player.x, y = player.y, dir = player.dir || 1, motion = Math.min(1, Math.abs(player.vx || 0) / 120);
    const knocked = player.knockdownTime > 0;
    const stride = !knocked && effects && Math.abs(player.vx || 0) > 10 ? Math.sin(t * 18) * 4 * motion : 0;
    const airborne = y < GROUND - 4, bob = !knocked && !airborne && effects ? Math.abs(Math.sin(t * 18)) * motion * .9 : 0;
    shadow(c, x, y, knocked ? 62 : player.w || 38, airborne);
    c.save(); c.translate(x, y - bob); c.scale((player.w || 38) / 38, (player.h || 54) / 54); c.lineJoin = 'round'; c.lineCap = 'round';
    if (knocked) c.rotate(-1.16 * dir);
    if (player.invulnerable > 0 && effects) c.globalAlpha = .72 + Math.sin(t * 37) * .18;
    const outline = '#101923', skin = '#d8b47d', empty = player.ammo === 0 && !(player.shotTimer > .001);
    // Combat boots and articulated legs under the original square camo body.
    rounded(c, -13 + stride, -13, 9, 13, 2, '#283e3a', outline, 2);
    rounded(c, 4 - stride, -13, 9, 13, 2, '#35493d', outline, 2);
    rounded(c, -16 + stride, -5, 14, 6, 2, '#17252b', outline, 1.5);
    rounded(c, 3 - stride, -5, 14, 6, 2, '#223039', outline, 1.5);
    line(c, -13 + stride, -2, -5 + stride, -2, '#73806b', 1); line(c, 6 - stride, -2, 14 - stride, -2, '#73806b', 1);
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
    // Dual pistols retain the distinctive original left/right shooting pose.
    for (const side of [-1, 1]) {
      rounded(c, side < 0 ? -26 : 14, -28, 12, 9, 3, '#607c48', outline, 2);
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
    }
    if (player.stunTime > 0 && !knocked) {
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
    c.restore();
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
  function drawZombie(c, dir, walk, t, boss, enemy) {
    const green = boss || enemy && (enemy.type === 'greenZombie' || enemy.archetype === 'greenZombie' || enemy.variant === 'green');
    const skin = green ? (boss ? '#81ad5c' : '#75a457') : '#adb194', outline = '#14232b';
    rounded(c, -12 + walk, -14, 9, 13, 2, '#3c4340', outline, 2); rounded(c, 3 - walk, -14, 10, 13, 2, '#485247', outline, 2);
    rounded(c, -15 + walk, -5, 13, 5, 1, '#202b30'); rounded(c, 3 - walk, -5, 14, 5, 1, '#253032');
    rounded(c, -19, -31, 38, 21, 3, green ? '#385439' : '#3d5362', outline, 2.3);
    polygon(c, [[-16, -31], [-3, -25], [-8, -12], [-17, -17]], '#2a3c49'); polygon(c, [[7, -18], [14, -24], [19, -15], [12, -10]], '#627258');
    line(c, 0, -29, 0, -12, '#738376', 1); ellipse(c, 3, -22, 1, 1, '#afb097');
    line(c, dir * 13, -25, dir * 30, -26 - walk * .4, skin, 6); line(c, -dir * 15, -24, -dir * 25, -15 + walk * .2, skin, 5);
    for (let i = 0; i < 3; i++) { line(c, dir * 29, -27 + i * 2, dir * (34 + i), -24 + i * 3, skin, 2); }
    rounded(c, -19, -51, 38, 28, 4, skin, outline, 2.5); polygon(c, [[-19, -51], [19, -51], [17, -44], [10, -47], [4, -43], [-4, -47], [-12, -43], [-19, -45]], '#28332d');
    eye(c, -7, -39, 9, '#f2df9f', dir); eye(c, 8, -40, 8, '#d6d8aa', dir);
    line(c, -16, -32, -9, -30, '#657b54', 2); line(c, 7, -32, 15, -34, '#657b54', 1.5);
    rounded(c, -6, -30, 17, 5, 1, '#354a37'); rect(c, -3, -30, 3, 3, '#d3d0ab'); rect(c, 6, -28, 3, 3, '#d3d0ab');
    line(c, -11, -45, -4, -44, '#d4dbaa66', 1);
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
    const backHandY = state === 'rage-windup' ? -51 : -19;
    line(c, -20, -32, -28, backHandY, wood, 8);
    rounded(c, -33, backHandY - 5, 13, 12, 3, '#696a54', outline, 1.7);
    line(c, -29, backHandY - 3, -29, backHandY + 5, '#aaa079', 1);
    line(c, -25, backHandY - 3, -25, backHandY + 5, '#aaa079', 1);
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
  const monsterDrawers = { skeleton: drawSkeleton, zombie: drawZombie, greenZombie: drawZombie, spider: drawSpider, ghost: drawGhost, vampire: drawVampire, golem: drawGolem };
  function drawMonster(c, e, t, effects, world, viewTop = 0) {
    const boss = e.boss || e.type === 'boss';
    const fallbackWorld = Math.max(0, Math.min(palettes.length - 1, e.world == null ? world : e.world));
    const fallbackType = window.MM?.Campaign?.worlds?.[fallbackWorld]?.enemy || ['skeleton', 'spider', 'ghost', 'vampire', 'vampire', 'golem'][fallbackWorld] || 'skeleton';
    const type = monsterDrawers[e.archetype] ? e.archetype : monsterDrawers[e.type] ? e.type : monsterDrawers[fallbackType] ? fallbackType : 'skeleton';
    const w = e.w || (boss ? 68 : 40), h = e.h || (boss ? 88 : 52), dir = e.dir || 1;
    drawPhantomTell(c, e, t, effects, viewTop);
    if (e.intangible) {
      if (effects) { c.save(); c.globalAlpha = .045; ellipse(c, e.x, e.y - h * .42, 17, 5, '#c5eeeb'); c.restore(); }
      return;
    }
    const aerial = e.abilityState && e.abilityState !== 'ground' || e.y < GROUND - 8;
    shadow(c, e.x, aerial ? GROUND : e.y, w, !!aerial);
    if (type === 'spider' && e.abilityState === 'hanging') {
      line(c, e.x, 0, e.x, e.y - h + 3, '#d3e3ce85', boss ? 1.6 : 1);
      line(c, e.x - 1, 0, e.x - 1, e.y - h + 3, '#ffffff18', .6);
    }
    drawAbilityTell(c, e, t, effects);
    if (e.isBat && type === 'vampire') {
      drawBat(c, e, t, effects);
      if (!boss && e.health < e.maxHealth && e.health > 0) { rounded(c, e.x - 14, e.y - h - 10, 28, 3, 1, '#101a27a6'); rounded(c, e.x - 14, e.y - h - 10, 28 * e.health / e.maxHealth, 3, 1, '#e2b986'); }
      return;
    }
    if (type === 'ghost' && (aerial || e.phantomState === 'strike') && effects) {
      c.save(); c.globalAlpha = .12;
      const vertical = e.phantomState === 'strike' && e.attackSide === 'top';
      ellipse(c, e.x - (vertical ? 0 : dir * 11), e.y - h * .46 - (vertical ? 14 : 0), w * .65, h * .34, '#a7e2df');
      ellipse(c, e.x - (vertical ? 0 : dir * 24), e.y - h * .4 - (vertical ? 33 : 0), w * .48, h * .22, '#a7e2df'); c.restore();
    }
    c.save(); c.translate(e.x, e.y); c.scale(w / 40, h / 54); c.lineCap = 'round'; c.lineJoin = 'round';
    if (e.abilityState === 'shadow-windup') c.globalAlpha = .6;
    const walk = effects ? Math.sin((e.age || t) * (type === 'spider' ? 13 : 8) + e.x * .007) * 2.7 : 0;
    if (boss) {
      c.save(); c.globalAlpha = .25;
      c.strokeStyle = palettes[world].glow; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, -32, 31, 37, 0, 0, TAU); c.stroke(); c.restore();
    }
    monsterDrawers[type](c, dir, walk, t, boss, e, effects);
    drawBulletArmor(c, e, t, effects);
    if (boss && type !== 'golem') {
      polygon(c, [[-17, -52], [-23, -65], [-9, -59], [0, -69], [9, -59], [23, -65], [17, -52]], '#bea05d', '#251e25', 1.6);
      line(c, -15, -54, 15, -54, '#f4d493', 1.2); ellipse(c, 0, -60, 2.8, 2.8, '#f5927c');
      polygon(c, [[-21, -29], [-25, -36], [-16, -37], [-11, -29]], '#b9a574', '#211e2b'); polygon(c, [[21, -29], [25, -36], [16, -37], [11, -29]], '#b9a574', '#211e2b');
    }
    if (e.hit > 0) { c.globalAlpha = Math.min(.8, e.hit * 5); line(c, -25, -40, -32, -45, '#fff0c0', 2); line(c, 25, -37, 32, -43, '#fff0c0', 2); }
    c.restore();
    if (!boss && e.health < e.maxHealth && e.health > 0) {
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
    if (effects) { line(c, b.x - direction * 26, b.y, b.x, b.y, '#f2ce8159', 4); line(c, b.x - direction * 14, b.y, b.x, b.y, '#ffd791', 2.5); }
    ellipse(c, b.x, b.y, 4.2, 2, '#fff1bb'); c.restore();
  }
  function drawEnemyShot(c, shot, t, effects) {
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
      c.save(); c.font = `700 11px ${font}`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#172b2e'; c.fillStyle = remaining < 2 ? '#f4c58e' : '#d8edbb';
      const label = remaining.toFixed(1) + 's'; c.strokeText(label, egg.x, y - height - 9); c.fillText(label, egg.x, y - height - 9);
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
      const name = split ? 'DRACULA ' + owner : (game.level.bossName || 'KẺ GIỮ CỔNG').toUpperCase();
      c.save(); c.textAlign = 'center'; c.font = `600 11px ${font}`; c.fillStyle = '#eadbc2';
      c.fillText(name, centre, top + 31);
      if (!boss.intangible) {
        rounded(c, x, top + 42, width, 5, 2, '#071018bb');
        rounded(c, x, top + 42, width * Math.max(.01, boss.health / boss.maxHealth), 5, 2, attackRate > 1.3 ? '#d28b72' : '#d9a174');
        c.font = `400 9px ${font}`; c.fillStyle = '#b7c4ba'; c.fillText(`${boss.health} / ${boss.maxHealth}`, centre, top + 63);
      } else { c.font = `600 10px ${font}`; c.fillStyle = '#b7d5d1'; c.fillText('ĐÃ BIẾN MẤT', centre, top + 56); }
      c.font = `600 10px ${font}`; c.fillStyle = attackRate > 1.3 ? '#dfa180' : '#9ea99b';
      c.fillText(`NHỊP TẤN CÔNG ×${attackRate.toFixed(2)}`, centre, top + 79);
      let armorY = top + 98;
      // Drain's shield instruction has priority when it coincides with another cast.
      const warning = boss.drainWarning || boss.skillWarning;
      if (warning) {
        const remaining = Math.max(0, Number(warning.remaining) || 0), total = Math.max(.01, Number(warning.total) || remaining || 1);
        const cardWidth = Math.min(330, slotWidth - 18), warningColor = boss.drainWarning ? '#f5abb7' : '#f1cf97';
        rounded(c, centre - cardWidth / 2, top + 86, cardWidth, 25, 5, '#101c2aeb', boss.drainWarning ? '#d894a077' : '#e5b17666', 1);
        c.font = `600 11px ${font}`; c.fillStyle = warningColor;
        const warningName = boss.drainWarning ? 'HÚT MÁU · BẬT KHIÊN' : String(warning.name || 'KỸ NĂNG BOSS');
        c.fillText(`${split ? owner + ' · ' : ''}${warningName} · ${remaining.toFixed(1)}s`, centre, top + 101);
        rounded(c, centre - cardWidth / 2 + 10, top + 108, cardWidth - 20, 2, 1, '#493e34');
        rounded(c, centre - cardWidth / 2 + 10, top + 108, (cardWidth - 20) * Math.max(.002, Math.min(1, 1 - remaining / total)), 2, 1, warningColor);
        armorY = top + 128;
      }
      if (boss.bulletArmor) {
        c.font = `600 11px ${font}`; c.fillStyle = boss.hardenedTime > 0 ? '#c4f6aa' : '#a8caa1';
        const text = boss.hardenedTime > 0 ? `CƯỜNG HÓA · MIỄN ĐẠN ${boss.hardenedTime.toFixed(1)}s` : `GIÁP ${Math.max(0, boss.armorHits || 0)}/10`;
        c.lineWidth = 3; c.strokeStyle = '#13222aed'; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
      }
      if ((boss.archetype === 'golem' || boss.type === 'golem') && boss.rageTime > 0) {
        c.font = `600 11px ${font}`; c.fillStyle = '#f5bd89'; c.lineWidth = 3; c.strokeStyle = '#13222aed';
        const text = `CUỒNG NỘ · ${boss.rageTime.toFixed(1)}s`; c.strokeText(text, centre, armorY); c.fillText(text, centre, armorY);
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
      const w = type === 'golem' ? 58 : type === 'spider' ? 46 : 43, h = type === 'golem' ? 88 : type === 'spider' ? 32 : 61;
      drawMonster(c, { x: positions[i], y: GROUND, w, h, type, archetype: stats && stats.archetype || type, dir: i < 3 ? 1 : -1 }, t, effects, world);
    }
    drawHunter(c, { x: 477, y: GROUND, w: 45, h: 64, dir: 1, vx: 0 }, t, effects);
  }
  function draw(c, game) {
    const world = Math.max(0, Math.min(palettes.length - 1, game.level && Number.isFinite(game.level.world) ? Math.trunc(game.level.world) : 0));
    const t = game.time || 0, settings = game.settings || {}, effects = settings.effects !== false && !settings.reducedMotion;
    if (!scenes.has(world)) scenes.set(world, createScene(world));
    c.save();
    if (effects && game.shake > 0) c.translate(Math.sin(t * 83) * game.shake, Math.cos(t * 97) * game.shake * .6);
    c.drawImage(scenes.get(world), 0, 0); drawAtmosphere(c, world, t, effects);
    if (game.screen === 'home' && (!game.enemies || !game.enemies.length)) drawHomeCast(c, t, effects, world, game.level);
    else {
      drawBossHazards(c, game.bossHazards, t, effects, world);
      drawGroundCracks(c, game.groundCracks);
      drawGolemZones(c, game.golemZones, t, effects);
      drawPlatforms(c, game.enemies || [], t, effects);
      for (const p of game.pickups || []) drawPickup(c, p, t, effects);
      for (const crate of game.ammoCrates || []) drawAmmoCrate(c, crate, t, effects);
      drawBossEggs(c, game.bossEggs, t, effects);
      for (const e of game.enemies || []) {
        if (e.phase === 'warning') drawWarning(c, e, t, effects, world);
        else drawMonster(c, e, t, effects, world, game.viewTop || 0);
        if ((e.splitTriggered || e.draculaClone) && e.health > 0 && !e.intangible) {
          c.save(); rounded(c, e.x - 10, e.y - e.h - 27, 20, 17, 3, '#202634c9', '#bd98a05e', 1);
          c.font = `600 11px ${font}`; c.fillStyle = '#f6d7bd'; c.textAlign = 'center'; c.fillText(e.draculaClone ? 'II' : 'I', e.x, e.y - e.h - 15); c.restore();
        }
      }
      for (const e of game.enemies || []) drawDraculaDrain(c, e, game.player, t, effects);
      if (game.player) drawHunter(c, game.player, t, effects);
      for (const b of game.bullets || []) drawBullet(c, b, effects);
      for (const shot of game.enemyShots || []) drawEnemyShot(c, shot, t, effects);
      if (effects) for (const p of game.particles || []) drawParticle(c, p);
      drawFloats(c, game.floats);
      drawBossHUD(c, (game.enemies || []).filter(e => e.boss && e.health > 0), game);
    }
    if (game.flash > 0 && effects) { c.globalAlpha = Math.min(.19, game.flash); rect(c, 0, 0, W, H, '#d2eeec'); c.globalAlpha = 1; }
    c.restore();
  }
  function drawPortrait(c, type = 'hunter', x = 40, y = 75, scale = 1, world = 0) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    if (type === 'hunter' || type === 'player') drawHunter(c, { x: 0, y: 0, w: 38, h: 54, dir: 1 }, 0, false);
    else drawMonster(c, { x: 0, y: 0, w: 40, h: 54, type, dir: 1, boss: type === 'boss', world }, 0, false, world);
    c.restore();
  }
  window.MM = window.MM || {};
  window.MM.Renderer = { draw, drawPortrait, palettes, width: W, height: H, groundY: GROUND };
})();
