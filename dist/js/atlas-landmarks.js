/* Sculpted chapter silhouettes, in the same SVG coordinates as the route. */
(function(root){
 'use strict';
 const MM=root.MM=root.MM||{},TAU=Math.PI*2,TILT=Math.sin(.46);
 const definitions={
  2:[{id:'ancient-cave',x:750,y:218,width:128,depth:50,height:72},{id:'old-growth-guardians',x:750,y:238,width:176,depth:35,height:63}],
  3:[{id:'terraced-abyss',x:530,y:240,width:226,depth:98,height:78},{id:'sunken-rune-sanctum',x:530,y:240,width:49,depth:29,height:38},{id:'colossal-rib-cage',x:366,y:263,width:91,depth:34,height:36}],
  4:[{id:'drowned-temple',x:510,y:239,width:107,depth:64,height:44},{id:'broken-shipwreck',x:350,y:282,width:112,depth:38,height:59},{id:'ocean-whirlpool',x:650,y:244,width:140,depth:66,height:18},{id:'living-coral-reefs',x:465,y:270,width:540,depth:74,height:29}]
 };
 const describe=chapter=>(definitions[chapter]||[]).map(value=>({...value}));
 function build(T,landscape){
  const chapter=Number(landscape.chapter),group=new T.Group(),batches=new Map(),materials={},animations=[],stats={landmarks:describe(chapter).map(value=>value.id),batches:0,instances:0,drawCalls:0};
  group.name='atlas-landmarks-'+chapter;
  if(chapter<2||chapter>4)return {group,stats,update(){}};
  const geometries={rock:new T.IcosahedronGeometry(1,0),leaf:new T.IcosahedronGeometry(1,1),box:new T.BoxGeometry(1,1,1),column:new T.CylinderGeometry(1,1,1,7),spike:new T.ConeGeometry(1,1,5)};
  geometries.column.rotateX(Math.PI*.5);geometries.spike.rotateX(Math.PI*.5);
  const dummy=new T.Object3D(),up=new T.Vector3(0,0,1),vector=new T.Vector3(),quaternion=new T.Quaternion();
  const material=(key,color,extra={})=>materials[key]||(materials[key]=new T.MeshStandardMaterial({color,roughness:.91,flatShading:true,...extra}));
  const stone=material('stone',chapter===2?0x697164:chapter===3?0x5a506b:0x547d83),lightStone=material('light-stone',chapter===2?0x92957c:chapter===3?0x887395:0x8caaa0),darkStone=material('dark-stone',chapter===2?0x34413b:chapter===3?0x332d47:0x285567);
  const moss=material('moss',chapter===2?0x4d6842:0x4e8f83),bark=material('bark',0x514333),bone=material('bone',0xb7ac9d),wood=material('wood',0x715a43),woodLight=material('wood-light',0x95815c);
  const amber=material('amber',0xf4b75f,{emissive:0xd77b28,emissiveIntensity:.9,roughness:.4}),violet=material('violet',0xbda0eb,{emissive:0x6944a5,emissiveIntensity:.7,roughness:.35}),cyan=material('cyan',0x8ee7dd,{emissive:0x267b87,emissiveIntensity:.55,roughness:.35});
  const coral=material('coral',0xd49d9c),coralTip=material('coral-tip',0xecd2a3),kelp=material('kelp',0x3b9a89);
  function batch(type,mat){const key=type+':'+mat.uuid;if(!batches.has(key))batches.set(key,{type,mat,items:[]});return batches.get(key);}
  function put(type,mat,x,y,z,sx,sy,sz,angle=0){batch(type,mat).items.push({x:x-500,y:200-y,z,sx,sy,sz,angle});}
  function segment(mat,a,b,radius=1,type='column'){
   const start=new T.Vector3(a[0]-500,200-a[1],a[2]),end=new T.Vector3(b[0]-500,200-b[1],b[2]);
   vector.copy(end).sub(start);const length=vector.length();if(length<.001)return;
   quaternion.setFromUnitVectors(up,vector.normalize());const middle=start.add(end).multiplyScalar(.5);
   batch(type,mat).items.push({x:middle.x,y:middle.y,z:middle.z,sx:radius,sy:radius,sz:length,quaternion:quaternion.clone()});
  }
  function mesh(positions,mat,colors){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(colors)geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const result=new T.Mesh(geometry,mat);result.castShadow=true;result.receiveShadow=true;group.add(result);stats.drawCalls++;return result;}
  function quad(out,a,b,c,d){for(const point of [a,b,c,a,c,d])out.push(point[0]-500,200-point[1],point[2]);}
  function line(points,mat,closed=false){const geometry=new T.BufferGeometry().setFromPoints(points.map(point=>new T.Vector3(point[0]-500,200-point[1],point[2]))),result=closed?new T.LineLoop(geometry,mat):new T.Line(geometry,mat);group.add(result);stats.drawCalls++;return result;}
  function rock(x,y,z,sx,sy,sz,seed=0,mat=stone){put('rock',mat,x,y,z+sz*.55,sx,sy,sz,seed);}
  function crystal(x,y,z,size,mat){for(let i=0;i<3;i++)put('spike',mat,x+(i-1)*size*3.1,y+(i%2)*size*2,z+(8+i*4)*size,size*(2.8-i*.4),size*2.3,(16+i*8)*size,i*.8);rock(x,y,z,size*6,size*4,size*3,1,darkStone);}
  const ground=(x,y)=>Number(landscape.heightAt?.(x,y))||0;
  function clear(x,y,z,radius=10){const py=y-z*TILT,route=landscape.route||{dots:[],bosses:[]};return route.dots.every(dot=>Math.hypot(x-dot.x,py-dot.y)>radius+11)&&route.bosses.every(point=>Math.abs(x-point[0])>radius+24||Math.abs(py-point[1])>radius+37);}
  function curveSegments(mat,points,radius){for(let i=1;i<points.length;i++)segment(mat,points[i-1],points[i],radius);}
  function tree(x,y,size){
   const z=ground(x,y),h=58*size;
   segment(bark,[x,y,z],[x+2*size,y-2*size,z+h*.67],4.2*size);
   for(const side of [-1,1]){
    segment(bark,[x,y,z+h*.37],[x+side*13*size,y-2*size,z+h*.81],2*size);
    put('leaf',moss,x+side*11*size,y-3*size,z+h*.82,16*size,13*size,15*size,side*.6);
    curveSegments(bark,[[x,y,z+5],[x+side*8*size,y+6*size,z+2],[x+side*17*size,y+8*size,z+.6]],1.7*size);
   }
   put('leaf',moss,x,y-2*size,z+h,17*size,13*size,13*size,.8);
  }
  function cave(){
   const cx=750,front=232,z=ground(cx,218),rx=64,h=69,wall=18,depth=40,frontFaces=[],roofFaces=[],insideFaces=[],back=[],innerRx=rx-wall,innerH=h-wall;
   const point=(a,r,height,y)=>[cx+Math.cos(a)*r,y,z+Math.sin(a)*height];
   // A thick horseshoe tunnel: the aperture is actual empty space, with an
   // inset back wall and a visible inner roof rather than a surface disc.
   for(let i=0;i<18;i++){
    const a=i*Math.PI/18,b=(i+1)*Math.PI/18;
    quad(frontFaces,point(a,rx,h,front),point(b,rx,h,front),point(b,innerRx,innerH,front),point(a,innerRx,innerH,front));
    quad(roofFaces,point(a,rx,h,front),point(a,rx*.91,h*.95,front-depth),point(b,rx*.91,h*.95,front-depth),point(b,rx,h,front));
    quad(insideFaces,point(a,innerRx,innerH,front),point(b,innerRx,innerH,front),point(b,innerRx*.76,innerH*.8,front-depth+2),point(a,innerRx*.76,innerH*.8,front-depth+2));
    const center=[cx,front-depth+1,z+.3];for(const p of [center,point(a,innerRx*.77,innerH*.81,front-depth+1),point(b,innerRx*.77,innerH*.81,front-depth+1)])back.push(p[0]-500,200-p[1],p[2]);
   }
   const cavern=new T.MeshBasicMaterial({color:0x071511,side:T.DoubleSide});
   mesh(back,cavern);mesh(roofFaces,darkStone);mesh(insideFaces,material('inner-cave',0x101b18,{side:T.DoubleSide}));mesh(frontFaces,stone);
   const aperture=[];for(let i=0;i<18;i++){for(const p of [[cx,front-5,z+2],point(i*Math.PI/18,innerRx*.96,innerH*.96,front-5),point((i+1)*Math.PI/18,innerRx*.96,innerH*.96,front-5)])aperture.push(p[0]-500,200-p[1],p[2]);}mesh(aperture,cavern);
   const floor=[];quad(floor,[cx-innerRx,front,z+2],[cx+innerRx,front,z+2],[cx+innerRx*.7,front-depth,z+2],[cx-innerRx*.7,front-depth,z+2]);mesh(floor,cavern);
   for(let i=0;i<15;i++){
    const a=i*Math.PI/14,px=cx+Math.cos(a)*(rx-2),pz=z+Math.sin(a)*(h-2);
    rock(px,front+1.8,pz-6,9+i%3*2,9,9+i%2*3,i*.72,i%3===0?lightStone:stone);
   }
   for(let i=0;i<7;i++){
    const a=.3+i*.43,px=cx+Math.cos(a)*innerRx*.91,pz=z+Math.sin(a)*innerH;
    const length=8+(i%3)*4;batch('spike',darkStone).items.push({x:px-500,y:200-(front-4-i%2*9),z:pz-length*.5,sx:2.3+i%2,sy:2.2,sz:length,angle:i*.7,flip:true});
   }
   for(const side of [-1,1]){
    const px=cx+side*53;
    crystal(px,front+3,z,.65,amber);
    segment(bark,[px,front+6,z+4],[px,front+6,z+19],1.4);
    put('leaf',amber,px,front+6,z+21,2.3,2.3,5.5);
    curveSegments(bark,[[cx+side*25,front-12,z+65],[cx+side*39,front-9,z+58],[cx+side*48,front-2,z+41],[cx+side*56,front+3,z+26]],1.6);
   }
   for(const item of [[674,246,.91],[819,221,.83]])if(clear(item[0],item[1],58*item[2],15))tree(...item);
   for(const side of [-1,1])for(let i=0;i<3;i++)rock(cx+side*(57+i*9),front+9-i*11,z,11-i,9,8+i*2,i+.6,i%2?moss:darkStone);
   animations.push(time=>{amber.emissiveIntensity=.86+Math.sin(time*.0031)*.12+Math.sin(time*.0067)*.045;});
  }
  function abyss(){
   const cx=530,cy=240,rx=110,ry=47,cliff=[],strata=[],levels=[[1.035,3],[.94,-9],[.89,-9],[.78,-28],[.72,-28],[.61,-50],[.54,-50],[.43,-72]];
   const p=(a,r,z)=>[cx+Math.cos(a)*rx*r*(1+.09*Math.sin(a*3)+.045*Math.sin(a*9)),cy+Math.sin(a)*ry*r*(1+.12*Math.cos(a*5)+.04*Math.sin(a*11)),z+(r<1?Math.sin(a*13)*3:0)];
   for(let j=0;j<levels.length-1;j++)for(let i=0;i<48;i++){
    const a=i*TAU/48,b=(i+1)*TAU/48,target=j%2?strata:cliff;
    quad(target,p(a,...levels[j]),p(b,...levels[j]),p(b,...levels[j+1]),p(a,...levels[j+1]));
   }
   mesh(cliff,material('abyss-cliff',0x3c354e,{side:T.DoubleSide}));mesh(strata,stone);
   for(let i=0;i<29;i++){
    const a=i*TAU/29,px=cx+Math.cos(a)*rx*1.025,py=cy+Math.sin(a)*ry*1.025;
    if(clear(px,py,9,6))rock(px,py,-2,8+i%3*2,6+i%2,7+i%4,i*.7,i%4===0?lightStone:stone);
   }
   // The sanctuary is suspended well below the lip. Most of the aperture
   // remains open, so the surrounding walls retain an unmistakable drop.
   put('box',darkStone,cx,cy,-65,49,29,5,.09);
   put('column',stone,cx,cy,-59,19,19,7);
   for(let i=0;i<4;i++){
    const a=Math.PI*.25+i*Math.PI*.5,px=cx+Math.cos(a)*24,py=cy+Math.sin(a)*14,h=19+i%2*13;
    put('column',lightStone,px,py,-62+h*.5,3.3,3.3,h,i*.4);
    put('box',violet,px-.2,py+3.4,-58+h*.5,1.6,.7,h*.4);
   }
   put('box',lightStone,cx,cy,-44,11,9,25,.15);
   put('box',violet,cx,cy+4.6,-43,2.4,.5,14);
   const runePoints=[];for(let i=0;i<12;i++){const a=i*TAU/12;runePoints.push([cx+Math.cos(a)*17,cy+Math.sin(a)*12,-54.5]);}
   line(runePoints,new T.LineBasicMaterial({color:0xcbb0ff,transparent:true,opacity:.76}),true);
   // A fossilised rib cage frames the western approach without bridging
   // the chasm or crossing the original exploration route.
   const start=333,end=404;
   for(let x=start;x<end;x+=9){
    const centerY=253+(x-start)*.2,height=27+Math.sin((x-start)/(end-start)*Math.PI)*7,points=[];
    for(let i=0;i<=10;i++){const a=i*Math.PI/10;points.push([x,centerY+Math.cos(a)*17,5+Math.sin(a)*height]);}
    curveSegments(bone,points,1.7);
   }
   segment(bone,[start-4,252,36],[end+3,268,31],2.6);
   rock(320,250,4,12,8,8,.4,bone);rock(309,253,1,8,5,4,.2,bone);
   put('rock',darkStone,316,256,11,3.8,1.3,3.2,.2);put('rock',darkStone,326,257,10,3.4,1.3,3,.5);
   for(const v of [[423,240,.82],[657,289,1.08],[569,304,.83],[374,203,.75]])if(clear(v[0],v[1],25*v[2],9))crystal(v[0],v[1],ground(v[0],v[1]),v[2],violet);
   const fissures=[];for(const route of [[[703,273],[713,282],[707,293],[724,302]],[[343,299],[358,304],[365,316]]])for(let i=1;i<route.length;i++)for(const point of [route[i-1],route[i]])fissures.push(point[0]-500,200-point[1],ground(...point)+.9);
   const fissureGeometry=new T.BufferGeometry();fissureGeometry.setAttribute('position',new T.Float32BufferAttribute(fissures,3));group.add(new T.LineSegments(fissureGeometry,new T.LineBasicMaterial({color:0xe392a5,transparent:true,opacity:.64})));stats.drawCalls++;
   animations.push(time=>{violet.emissiveIntensity=.65+Math.sin(time*.0008)*.13;});
  }
  function reef(x,y,size){
   const z=-15+ground(x,y)*.25;rock(x,y,z,14*size,10*size,5*size,.4,moss);
   for(let i=0;i<5;i++){
    const px=x+(i-2)*5*size,py=y+Math.sin(i*2)*4*size,h=(15+i%3*5)*size;
    segment(coral,[px,py,z+3],[px+Math.sin(i)*3*size,py,z+h],1.5*size);
    for(const side of [-1,1]){
     segment(coral,[px,py,z+h*.55],[px+side*5*size,py+(i%2?2:-2)*size,z+h*.86],1.1*size);
     put('rock',coralTip,px+side*5*size,py+(i%2?2:-2)*size,z+h*.86,2*size,1.5*size,1.8*size);
    }
   }
   for(let i=0;i<4;i++){
    const px=x-16*size+i*10*size,py=y+9*size,h=(17+i%2*7)*size;
    curveSegments(kelp,[[px,py,z],[px-3*size,py,z+h*.5],[px+2*size,py,z+h]],1.3*size);
    put('leaf',kelp,px+2*size,py,z+h*.75,2*size,1.2*size,h*.32,.4);
   }
  }
  function temple(){
   const cx=510,cy=239,z=-18;
   for(let i=0;i<3;i++)put('box',i===2?lightStone:stone,cx,cy,z+i*3,107-i*12,64-i*9,4);
   for(const v of [[-36,-14,39],[-10,-14,33],[17,-14,42],[38,-14,19],[-36,16,31],[17,16,25]]){
    const [dx,dy,h]=v;put('column',lightStone,cx+dx,cy+dy,z+7+h*.5,4.4,4.4,h);
    put('box',stone,cx+dx,cy+dy,z+9,12,12,5);put('box',lightStone,cx+dx,cy+dy,z+7+h,12,11,4,.04*dx);
    if(h>30)put('column',stone,cx+dx,cy+dy,z+9+h*.5,5.2,5.2,3);
   }
   put('box',stone,cx-10,cy-14,z+47,68,13,7,.025);
   const pediment=[];for(const point of [[cx-44,cy-21,z+49],[cx+25,cy-21,z+49],[cx-11,cy-21,z+65]])pediment.push(point[0]-500,200-point[1],point[2]);
   mesh(pediment,material('temple-pediment',0x6f9390,{side:T.DoubleSide}));
   put('box',darkStone,cx-11,cy-20.4,z+53,12,1.2,3);
   // Fallen column sections and broken lintels make the building a ruin.
   segment(lightStone,[cx+37,cy+12,z+10],[cx+59,cy+21,z+14],4.3);
   put('box',stone,cx-7,cy+17,z+12,28,10,6,-.24);put('box',lightStone,cx+36,cy-20,z+8,19,11,8,.4);
   reef(cx-37,cy+24,.6);reef(cx+43,cy+18,.6);
  }
  function wreck(){
   const cx=350,cy=282,z=-15,positions=[],edge=[[-55,2],[-39,13],[-16,18],[-7,19],[7,18],[29,16],[46,10],[56,1]];
   for(let i=0;i<edge.length-1;i++){
    if(i===3)continue;const a=edge[i],b=edge[i+1];
    for(const side of [-1,1])quad(positions,[cx+a[0],cy+side*a[1],z+12],[cx+b[0],cy+side*b[1],z+12+(i%2)*3],[cx+b[0],cy+side*b[1]*.5,z+2],[cx+a[0],cy+side*a[1]*.5,z+2]);
   }
   mesh(positions,material('wreck-hull',0x61503d,{side:T.DoubleSide}));
   for(const dx of [-43,-33,-22,17,28,39]){
    const width=dx<0?15:13;
    segment(woodLight,[cx+dx,cy-width,z+13],[cx+dx,cy,z+3],1.5);
    segment(woodLight,[cx+dx,cy,z+3],[cx+dx,cy+width,z+13],1.5);
    put('box',wood,cx+dx,cy,z+4,7,width*1.5,1.7,.02*dx);
   }
   segment(wood,[cx-52,cy,z+1],[cx-8,cy,z+1],2);segment(wood,[cx+8,cy,z+1],[cx+54,cy,z+1],2);
   segment(woodLight,[cx-18,cy,z+6],[cx-30,cy-4,z+59],1.8);
   segment(wood,[cx-47,cy-4,z+39],[cx-7,cy-4,z+36],1.2);
   const sail=[];for(const point of [[cx-28,cy-3.5,z+55],[cx-8,cy-3.5,z+37],[cx-16,cy-3.5,z+37],[cx-28,cy-3.5,z+55],[cx-16,cy-3.5,z+37],[cx-26,cy-3.5,z+41]])sail.push(point[0]-500,200-point[1],point[2]);
   mesh(sail,material('wreck-sail',0xb4b998,{side:T.DoubleSide,transparent:true,opacity:.8}));
   segment(wood,[cx+19,cy,z+6],[cx+47,cy+5,z+22],1.8);
   put('box',wood,cx+39,cy,z+12,20,17,10,.07);put('box',darkStone,cx+40,cy+8.7,z+14,7,.5,4,.07);
   for(let i=0;i<4;i++)put('box',woodLight,cx-6+i*4,cy+4-i*3,z+3+i,13,3,1.6,i*.5);
   reef(cx-48,cy+17,.63);reef(cx+47,cy-17,.55);
  }
  function whirlpool(){
   const cx=650,cy=244,rx=70,ry=33,water=[],rings=[[1,1.2],[.78,.6],[.49,-3],[.22,-8],[.04,-15]];
   for(let j=0;j<rings.length-1;j++)for(let i=0;i<48;i++){
    const a=i*TAU/48,b=(i+1)*TAU/48,p=(angle,ring)=>[cx+Math.cos(angle)*rx*ring[0],cy+Math.sin(angle)*ry*ring[0],ring[1]];
    quad(water,p(a,rings[j]),p(b,rings[j]),p(b,rings[j+1]),p(a,rings[j+1]));
   }
   mesh(water,material('whirlpool-water',0x10384e,{metalness:.2,roughness:.35,transparent:true,opacity:.74,depthWrite:false,side:T.DoubleSide}));
   const foamMaterial=new T.LineBasicMaterial({color:0xc0eeeb,transparent:true,opacity:.64,depthWrite:false});
   for(let arm=0;arm<3;arm++){
    const points=[];for(let i=0;i<=70;i++){const t=i/70,a=arm*TAU/3+t*TAU*1.16,r=1-t*.84;points.push([cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r,2.4+t*.45]);}
    line(points,foamMaterial);
   }
   const currents=new T.LineBasicMaterial({color:0x97dedb,transparent:true,opacity:.32,depthWrite:false});
   for(const [x,y,w]of [[226,248,56],[418,194,47],[737,302,51]]){
    const points=[];for(let i=0;i<=22;i++){const t=i/22;points.push([x+(t-.5)*w*2,y+Math.sin(t*TAU)*5,2.1]);}line(points,currents);
   }
   animations.push(time=>{foamMaterial.opacity=.57+Math.sin(time*.00065)*.09;currents.opacity=.28+Math.sin(time*.0005+1)*.045;});
  }
  function seaLife(){
   const fishGeometry=new T.BufferGeometry(),fishVertices=[];
   for(const point of [[-4,0,0],[0,-1.7,0],[4,0,0],[-4,0,0],[4,0,0],[0,1.7,0],[-4,0,0],[-6,-2.1,0],[-6,2.1,0],[0,-1.7,0],[0,0,1.7],[4,0,0],[0,1.7,0],[4,0,0],[0,0,1.7]])fishVertices.push(...point);
   fishGeometry.setAttribute('position',new T.Float32BufferAttribute(fishVertices,3));fishGeometry.computeVertexNormals();
   const schools=[];
   for(const [cx,cy,count,direction] of [[411,211,8,1],[722,283,7,-1]]){
    const school=new T.Group(),fish=new T.InstancedMesh(fishGeometry,material('fish',0xd4d690,{emissive:0x365a44,emissiveIntensity:.2,side:T.DoubleSide}),count);
    for(let i=0;i<count;i++){dummy.position.set(cx-500+(i%4)*10,200-cy-Math.floor(i/4)*8+Math.sin(i*2)*3,7+Math.sin(i)*3);dummy.rotation.set(.2,direction===1?0:Math.PI,(i%3-1)*.08);dummy.scale.set(.62,.62,.62);dummy.updateMatrix();fish.setMatrixAt(i,dummy.matrix);}
    school.add(fish);group.add(school);schools.push(school);stats.instances+=count;stats.drawCalls++;
   }
   const bubbles=[];for(let i=0;i<24;i++){const cluster=i%3,x=cluster===0?319:cluster===1?549:750,y=cluster===0?286:cluster===1?241:280;bubbles.push(x-500+Math.sin(i*4.7)*12,200-y+Math.cos(i*2.3)*7,-4+(i%8)*4);}
   const bubbleGeometry=new T.BufferGeometry();bubbleGeometry.setAttribute('position',new T.Float32BufferAttribute(bubbles,3));const bubbleCloud=new T.Points(bubbleGeometry,new T.PointsMaterial({color:0xc2ede4,size:2.5,transparent:true,opacity:.54,depthWrite:false,sizeAttenuation:false}));group.add(bubbleCloud);stats.drawCalls++;
   animations.push(time=>{schools.forEach((school,i)=>{school.position.x=Math.sin(time*.00027+i*2)*4;school.position.z=Math.sin(time*.00053+i)*1.6;});bubbleCloud.position.z=Math.sin(time*.0007)*2.2;});
  }
  if(chapter===2)cave();
  if(chapter===3)abyss();
  if(chapter===4){temple();wreck();whirlpool();reef(216,267,1.05);reef(749,268,1.1);seaLife();}
  for(const value of batches.values()){
   const instances=new T.InstancedMesh(geometries[value.type],value.mat,value.items.length);
   let index=0;
   for(const item of value.items){
    dummy.position.set(item.x,item.y,item.z);dummy.scale.set(item.sx,item.sy,item.sz);
    if(item.quaternion)dummy.quaternion.copy(item.quaternion);else dummy.rotation.set(item.flip?Math.PI:0,0,item.angle||0);
    dummy.updateMatrix();instances.setMatrixAt(index++,dummy.matrix);
   }
   instances.instanceMatrix.needsUpdate=true;instances.castShadow=true;instances.receiveShadow=true;group.add(instances);stats.instances+=value.items.length;
  }
  stats.batches=batches.size;stats.drawCalls+=batches.size;
  // Absolute bounded phases make toggling reduced motion deterministic.
  function update(time,moving){const phase=moving&&Number.isFinite(time)?time:0;for(const animate of animations)animate(phase);}
  update(0,false);
  return {group,stats,update};
 }
 MM.AtlasLandmarks={build,describe};
})(typeof window!=='undefined'?window:globalThis);
