'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
class PixelCanvas{
  constructor(w,h){this._width=w;this._height=h;this.pixels=new Uint8ClampedArray(w*h*4);}
  get width(){return this._width;}set width(value){this._width=value;this.pixels=new Uint8ClampedArray(value*this._height*4);}
  get height(){return this._height;}set height(value){this._height=value;this.pixels=new Uint8ClampedArray(this._width*value*4);}
  getContext(){const canvas=this;return {
    drawImage(image,...args){
      let sx=0,sy=0,sw=image.width,sh=image.height,dx=0,dy=0,dw=sw,dh=sh;
      if(args.length===4)[dx,dy,dw,dh]=args;else if(args.length===8)[sx,sy,sw,sh,dx,dy,dw,dh]=args;
      if(sx===0&&sy===0&&dx===0&&dy===0&&sw===dw&&sh===dh&&dw===canvas.width&&dh===canvas.height){canvas.pixels.set(image.pixels);return;}
      for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
        const source=((Math.floor(sy+y*sh/dh))*image.width+Math.floor(sx+x*sw/dw))*4,to=((dy+y)*canvas.width+dx+x)*4;
        canvas.pixels.set(image.pixels.subarray(source,source+4),to);
      }
    },getImageData(){return {data:new Uint8ClampedArray(canvas.pixels),width:canvas.width,height:canvas.height};},
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
    putImageData(data){canvas.pixels.set(data.data);}
  };}
}
function fixture(){const scope=vm.createContext({OffscreenCanvas:PixelCanvas});for(const name of ['cosmic-config','cosmic-art'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),scope,{filename:name});return scope.MM;}
function sheet(bridge=false){const im=new PixelCanvas(160,240),rect=(l,t,r,b,id,alpha=255)=>{for(let y=t;y<b;y++)for(let x=l;x<r;x++)im.pixels.set([id,30+id,50+id,alpha],(y*160+x)*4);};
  rect(8,10,96,46,1);rect(105,12,151,49,2);rect(10,90,65,131,3);rect(105,95,146,136,4);rect(15,180,71,221,5);
  rect(35,51,45,59,1); // A detached foot belongs to the first figure.
  rect(7,10,8,46,1,20);rect(96,10,98,46,1,70); // Preserve dim glow outside opaque cores.
  if(bridge)rect(35,131,37,180,77,30); // A faint bridge connects figures three and five.
  return im;
}
function extract(MM,image,region='blackHole'){
  assert.equal(MM.CosmicArt.setSheet(region,image),true);const audit=MM.CosmicArt.getState().sheets[region];
  assert.ok(audit,'pixel extraction must succeed rather than fall back to rectangular slicing');assert.equal(audit.figures,5);
  const outputs=MM.CosmicConfig.authored.regions.find(r=>r.id===region).enemies.map(archetype=>{
    let out;const c={save(){},restore(){},translate(){},scale(){},drawImage(image){out=image;}};
    assert.equal(MM.CosmicArt.drawEnemy(c,{settings:{effects:false}},{archetype,x:0,y:0,h:80,dir:1},0),true);
    assert.ok(out instanceof PixelCanvas);return out;
  });
  return {outputs,audit};
}
function counts(image){const totals=new Map();for(let at=0;at<image.pixels.length;at+=4)if(image.pixels[at+3]>6){const id=image.pixels[at];totals.set(id,(totals.get(id)||0)+1);}return totals;}

test('cross-gutter silhouettes and detached feet stay with their figure, without sampling a neighbor',()=>{
  const MM=fixture(),input=sheet(),{outputs}=extract(MM,input);const expected=counts(input);
  for(let i=0;i<5;i++){
    const actual=counts(outputs[i]);assert.equal(actual.get(i+1),expected.get(i+1),'all body, glow and detached-foot pixels remain');
    for(let j=0;j<5;j++)if(i!==j)assert.ok(!actual.has(j+1),'neighbor silhouette never leaks into figure '+(i+1));
  }
});

test('faint glow bridges cannot merge two separate opaque figures or promote a detached fragment into a model',()=>{
  const MM=fixture(),input=sheet(true),{outputs}=extract(MM,input);const expected=counts(input);
  for(let i=0;i<5;i++){
    const actual=counts(outputs[i]);assert.equal(actual.get(i+1),expected.get(i+1));
    for(let j=0;j<5;j++)if(i!==j)assert.ok(!actual.has(j+1),'each opaque figure keeps a unique owner');
  }
  assert.equal(outputs.reduce((n,image)=>n+(counts(image).get(77)||0),0),expected.get(77),'bridge glow is assigned once, not cropped or duplicated');
});

test('extraction conserves every visible source pixel exactly once at its original sheet coordinate',()=>{
  const MM=fixture(),input=sheet(true),before=new Uint8ClampedArray(input.pixels),{outputs,audit}=extract(MM,input);
  const reconstructed=new Uint8ClampedArray(input.pixels.length),seen=new Uint8Array(input.width*input.height);
  outputs.forEach((out,index)=>{
    const [left,top]=audit.frames[index];for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
      const from=(y*out.width+x)*4;if(out.pixels[from+3]<=6)continue;const at=(top+y)*input.width+left+x;
      assert.equal(seen[at],0,'a source pixel cannot be owned by two figures');seen[at]=1;reconstructed.set(out.pixels.subarray(from,from+4),at*4);
    }
  });
  for(let at=0;at<input.width*input.height;at++)if(before[at*4+3]>6){assert.equal(seen[at],1);assert.deepEqual(Array.from(reconstructed.subarray(at*4,at*4+4)),Array.from(before.subarray(at*4,at*4+4)));}
  assert.deepEqual(input.pixels,before,'importing does not modify the artist sheet');
});

// The production sheets are non-interlaced RGBA8 PNGs. Decode losslessly with
// Node's built-in inflater so this release check requires no browser or package.
function png(file){
  const source=fs.readFileSync(file),compressed=[];let width,height,offset=8;
  assert.equal(source.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  while(offset<source.length){const size=source.readUInt32BE(offset),type=source.toString('ascii',offset+4,offset+8),data=source.subarray(offset+8,offset+8+size);offset+=size+12;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],6);assert.equal(data[12],0);}
    if(type==='IDAT')compressed.push(data);if(type==='IEND')break;
  }
  const raw=zlib.inflateSync(Buffer.concat(compressed)),stride=width*4,image=new PixelCanvas(width,height);let at=0;
  for(let y=0;y<height;y++){const filter=raw[at++],row=y*stride,previous=row-stride;
    assert.ok(filter>=0&&filter<=4);
    for(let x=0;x<stride;x++){
      const value=raw[at++],left=x>=4?image.pixels[row+x-4]:0,above=y?image.pixels[previous+x]:0,corner=y&&x>=4?image.pixels[previous+x-4]:0;
      let prediction=0;
      if(filter===1)prediction=left;else if(filter===2)prediction=above;else if(filter===3)prediction=Math.floor((left+above)/2);
      else if(filter===4){const p=left+above-corner,da=Math.abs(p-left),db=Math.abs(p-above),dc=Math.abs(p-corner);prediction=da<=db&&da<=dc?left:db<=dc?above:corner;}
      image.pixels[row+x]=(value+prediction)&255;
    }
  }
  assert.equal(at,raw.length);return image;
}

test('all fifty released atlas models preserve their complete visible pixels without duplicated neighboring parts',async t=>{
  const MM=fixture();
  for(const region of MM.CosmicConfig.authored.regions)await t.test(region.id,()=>{
    const input=png('assets/sprites/cosmic/'+region.id+'-enemies.png'),{outputs,audit}=extract(MM,input,region.id);
    assert.equal(outputs.length,5);assert.ok(Array.from(audit.corePixels).every(n=>n>10000),'every model owns a substantial independent body');
    const seen=new Uint8Array(input.width*input.height);let duplicate=false,mismatch=false,owned=0,visible=0;
    for(let at=0;at<seen.length;at++)if(input.pixels[at*4+3]>6)visible++;
    outputs.forEach((out,index)=>{const [left,top]=audit.frames[index];for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
      const from=(y*out.width+x)*4;if(out.pixels[from+3]<=6)continue;const at=(top+y)*input.width+left+x;
      if(seen[at])duplicate=true;seen[at]=1;owned++;
      for(let channel=0;channel<4;channel++)if(out.pixels[from+channel]!==input.pixels[at*4+channel])mismatch=true;
    }});
    assert.equal(duplicate,false,'neighboring models never duplicate a source part');assert.equal(mismatch,false,'source RGBA stays exact');
    assert.equal(owned,visible,'no visible wing, foot, weapon or glow is cropped at an arbitrary atlas boundary');
  });
});
