/* Deterministic miniature landscapes. SVG routes remain the interaction layer. */
(function(root){'use strict';const MM=root.MM=root.MM||{},TAU=Math.PI*2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function outline(d){const n=(String(d).match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);return Array.from({length:Math.floor(n.length/2)},(_,i)=>[n[i*2],n[i*2+1]]);}
 function inside(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
 function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],q=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-dx*q,y-a[1]-dy*q);}
 function edgeDistance(x,y,p){return Math.min(...p.map((a,i)=>segmentDistance(x,y,a,p[(i+1)%p.length])));}
 function trailDistance(x,y,route){return Math.min(...route.dots.map(p=>Math.hypot(x-p.x,y-p.y)),...route.bosses.map(p=>Math.hypot(x-p[0],y-p[1])));}
 function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
 function plan(p,chapter,route={dots:[],bosses:[]}){
  const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]),bounds={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)},r=rng(chapter*6731),objects=[],hills=[];
  const clear=(x,y,margin=18,height=25)=>inside(x,y,p)&&edgeDistance(x,y,p)>margin&&trailDistance(x,y,route)>margin&&trailDistance(x,y-height*.5,route)>margin&&route.bosses.every(v=>Math.abs(x-v[0])>36||Math.abs(y-v[1])>48);
  for(let i=0;i<350;i++){
   const x=bounds.left+18+r()*(bounds.right-bounds.left-36),y=bounds.top+28+r()*(bounds.bottom-bounds.top-46);
   if(y<112||!clear(x,y,19,35))continue;
   const type=chapter===4?(i%5===0?'ruin':i%3===0?'crystal':'coral'):chapter===3?(i%6===0?'ruin':i%3===0?'rock':'crystal'):(i%12===0?'ruin':i%5===0?'rock':'tree');
   const size=.7+r()*.8,height=type==='tree'?22+size*13:type==='ruin'?24:12+size*10;
   if(objects.some(o=>Math.hypot(x-o.x,y-o.y)<(type==='tree'?13:19)))continue;
   objects.push({x,y,type,size,height,angle:r()*TAU,seed:r()});if(objects.length>=(chapter<3?60:50))break;
  }
  for(let i=0;i<70&&hills.length<6;i++){
   const x=lerp(bounds.left+35,bounds.right-35,r()),y=lerp(bounds.top+75,bounds.bottom-30,r());
   if(clear(x,y,30,45)&&hills.every(h=>Math.hypot(x-h.x,y-h.y)>55))hills.push({x,y,radius:27+r()*24,height:7+r()*13});
  }
  function heightAt(x,y){if(!inside(x,y,p))return 0;const edge=clamp(edgeDistance(x,y,p)/19,0,1),path=clamp((trailDistance(x,y,route)-11)/25,0,1);let h=0;for(const hill of hills)h+=hill.height*Math.exp(-((x-hill.x)**2+(y-hill.y)**2)/(hill.radius*hill.radius));return edge*path*(h+1.8*(1+Math.sin(x*.063)*Math.cos(y*.057)));}
  return {chapter,bounds,objects,hills,heightAt,outline:p,route};
 }
 const lerp=(a,b,p)=>a+(b-a)*p;
 function build(T,landscape){
  const group=new T.Group(),page=landscape.chapter,geom={},mats={},waves=[];
  const material=(key,color,extra={})=>mats[key]||(mats[key]=new T.MeshStandardMaterial({color,roughness:.92,flatShading:true,...extra}));
  const palettes={1:{low:0x475b3e,high:0x7e8263,rock:0x64716a,tree:0x264b3b},2:{low:0x315c43,high:0x7f8970,rock:0x63746b,tree:0x1d5746},3:{low:0x393445,high:0x6f637b,rock:0x59566c,tree:0x604371},4:{low:0x245c70,high:0x4e8d94,rock:0x386b7b,tree:0x448e96}},palette=palettes[page];
  const surface=new T.BufferGeometry(),positions=[],colors=[],step=10,lo=new T.Color(palette.low),hi=new T.Color(palette.high),shade=new T.Color();
  const {left,right,top,bottom}=landscape.bounds;
  function vertex(x,y){const h=landscape.heightAt(x,y);positions.push(x-500,200-y,h+.3);shade.copy(lo).lerp(hi,clamp(h/25+Math.sin(x*.14+y*.3)*.025,0,.9));colors.push(shade.r,shade.g,shade.b);}
  for(let y=top;y<bottom-step;y+=step)for(let x=left;x<right-step;x+=step){const corners=[[x,y],[x+step,y],[x,y+step],[x+step,y+step]];if(!corners.every(v=>inside(...v,landscape.outline)))continue;for(const i of [0,2,1,1,2,3])vertex(...corners[i]);}
  surface.setAttribute('position',new T.Float32BufferAttribute(positions,3));surface.setAttribute('color',new T.Float32BufferAttribute(colors,3));surface.computeVertexNormals();
  const ground=new T.Mesh(surface,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));ground.receiveShadow=true;group.add(ground);
  const geometries={rock:new T.IcosahedronGeometry(1,0),leaf:new T.IcosahedronGeometry(1,1),trunk:new T.CylinderGeometry(.7,1.2,1,5),crystal:new T.ConeGeometry(1,1,5),box:new T.BoxGeometry(1,1,1),pillar:new T.CylinderGeometry(1,1,1,6),roof:new T.ConeGeometry(1,1,6)};
  for(const key of ['trunk','crystal','pillar','roof'])geometries[key].rotateX(Math.PI*.5);
  const batches=new Map(),dummy=new T.Object3D();
  function instance(type,mat,x,y,z,sx,sy,sz,angle=0){const key=type+':'+mat.uuid;if(!batches.has(key))batches.set(key,{type,mat,items:[]});batches.get(key).items.push({x,y,z,sx,sy,sz,angle});}
  const bark=material('bark',0x584a37),leaf=material('leaf',palette.tree),leafLight=material('leaf-light',page===1?0x49654a:0x34755b),stone=material('stone',palette.rock),stoneLight=material('stone-light',page===4?0x7ea8a7:0x9a9c89),roof=material('roof',page===1?0x593c43:0x364a51),crystal=material('crystal',page===4?0x73d2d6:0x9d6bc5,{emissive:page===4?0x16464f:0x43235e,emissiveIntensity:.45,roughness:.4}),coral=material('coral',0x986e9c),coralLight=material('coral-light',0xc1a2a6);
  function rock(x,y,z,size,seed){instance('rock',stone,x,y,z+size*4,size*7,size*5,size*(5+seed*5),seed*3);}
  for(const o of landscape.objects){const x=o.x-500,y=200-o.y,z=landscape.heightAt(o.x,o.y),s=o.size;
   if(o.type==='tree'){
    const h=o.height;instance('trunk',bark,x,y,z+h*.28,s*1.5,s*1.5,h*.58);
    instance('leaf',leaf,x,y,z+h*.72,s*8,s*6,h*.35,o.angle);
    instance('leaf',leafLight,x-s*4,y+s,z+h*.9,s*5.5,s*5,h*.23,o.angle+.8);
    instance('leaf',leaf,x+s*5,y-s*2,z+h*.65,s*5.2,s*4,h*.25,o.angle+2);
   }else if(o.type==='rock'){
    rock(x,y,z,s,o.seed);rock(x+s*5,y-s*2,z,s*.65,1-o.seed);
   }else if(o.type==='crystal'){
    for(let i=0;i<3;i++){const height=(14+i*6)*s;instance('crystal',crystal,x+(i-1)*s*4,y+Math.sin(i*2)*s*2,z+height*.5,s*(3+i*.5),s*(3+i*.5),height,o.angle+i);}
    rock(x,y,z,s*.7,o.seed);
   }else if(o.type==='coral'){
    for(let i=0;i<4;i++){const h=s*(7+i*2);instance('pillar',i%2?coral:coralLight,x+(i-1.5)*s*3,y+Math.sin(i)*3,z+h*.5,s*1.1,s*1.1,h,o.angle);instance('rock',coralLight,x+(i-1.5)*s*3,y+Math.sin(i)*3,z+h,s*2.5,s*1.5,s*2);}
   }else{
    instance('box',stone,x,y,z+2,22*s,15*s,4,0);
    for(const side of [-1,1]){instance('pillar',stoneLight,x+side*8*s,y,z+12*s,3.2*s,3.2*s,21*s);instance('roof',roof,x+side*8*s,y,z+25*s,4.8*s,4.8*s,8*s);}
    instance('box',stone,x,y,z+12*s,13*s,9*s,20*s);
    instance('box',roof,x,y-4.6*s,z+14*s,4*s,.4,7*s);
    for(let j=-1;j<=1;j++)instance('box',stoneLight,x+j*4*s,y,z+23*s,2.5*s,10*s,4*s);
   }
  }
  const pathStone=material('path-stone',page===3?0xb7a0c3:page===4?0xa3c8bf:0xb9ad83);
  for(const dot of landscape.route.dots)instance('pillar',pathStone,dot.x-500,200-dot.y,.8,2.4,2.4,1.6);
  for(const [x,y] of landscape.route.bosses){instance('pillar',stone,x-500,200-y,1,11,11,2);instance('pillar',pathStone,x-500,200-y,2.2,8.3,8.3,1.2);}
  // A small number of irregular peaks accent the rolling height field.
  for(const h of landscape.hills){const x=h.x-500,y=200-h.y,z=landscape.heightAt(h.x,h.y);for(let i=0;i<3;i++)instance('rock',stone,x+(i-1)*7,y+(i%2)*4,z+5,9+i*2,9,12+i*4,i*1.7);}
  for(const batch of batches.values()){
   const mesh=new T.InstancedMesh(geometries[batch.type],batch.mat,batch.items.length);let index=0;
   for(const o of batch.items){dummy.position.set(o.x,o.y,o.z);dummy.rotation.set(0,0,o.angle);dummy.scale.set(o.sx,o.sy,o.sz);dummy.updateMatrix();mesh.setMatrixAt(index++,dummy.matrix);}
   mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  const coastPoints=landscape.outline.map(p=>new T.Vector3(p[0]-500,200-p[1],-3));
  const coast=new T.LineLoop(new T.BufferGeometry().setFromPoints(coastPoints),new T.LineBasicMaterial({color:page===3?0x9988aa:0xadd8cd,transparent:true,opacity:.4}));group.add(coast);
  const sea=new T.Mesh(new T.PlaneGeometry(1600,700,1,1),new T.MeshStandardMaterial({color:page===3?0x152936:0x164456,roughness:.4,metalness:.18,transparent:true,opacity:.8}));sea.position.z=-40;sea.receiveShadow=true;group.add(sea);
  for(let i=0;i<16;i++){
   const angle=i*TAU/16,r=(landscape.bounds.right-landscape.bounds.left)*.55,x=(left+right)/2+Math.cos(angle)*r,y=(top+bottom)/2+Math.sin(angle)*(bottom-top)*.57;
   const curve=new T.EllipseCurve(x-500,200-y,17+i%3*7,4+i%2*2,0,Math.PI*1.4,false,angle*.1),wave=new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(22)),new T.LineBasicMaterial({color:0x91c5c5,transparent:true,opacity:.15}));wave.position.z=-35;group.add(wave);waves.push(wave);
  }
  return {group,stats:{objects:landscape.objects.length,hills:landscape.hills.length,batches:batches.size,triangles:positions.length/9},update(time,moving){coast.material.opacity=moving?.31+.09*Math.sin(time*.0007):.35;waves.forEach((wave,i)=>{wave.material.opacity=moving?.075+.075*(1+Math.sin(time*.00065+i)):.12;});}};
 }
 MM.AtlasTerrain={outline,inside,edgeDistance,trailDistance,plan,build};
})(typeof window!=='undefined'?window:globalThis);
