/* Fixed orthographic scenery. The map, trails and hit targets share one tiny tilt. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{},game=MM.game,map=root.document?.querySelector('.atlas-map');
  if(!game||!map)return;
  const script=root.document.currentScript?.src;
  const moduleURL=new URL('../vendor/three/three.module.js',script||root.location.href);
  const canvas=root.document.createElement('canvas');canvas.className='atlas-webgl-canvas';canvas.setAttribute('aria-hidden','true');
  let context;try{context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
  if(!context)return;
  let renderer,scene,camera,sun,frame=0,last=0,signature='',lost=false;
  const motion=()=>game.settings.effects!==false&&!game.settings.reducedMotion&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visible=()=>game.screen==='home'&&!root.document.hidden&&!lost;
  function resetTilt(){map.style.setProperty('--atlas-rx','0deg');map.style.setProperty('--atlas-ry','0deg');}
  function render(time=0){
    frame=0;if(!visible()||!renderer)return;
    if(time-last>=33||time===0){last=time;sun.intensity=2.1+(motion()?Math.sin(time*.00025)*.12:0);renderer.render(scene,camera);}
    if(motion())frame=root.requestAnimationFrame(render);
  }
  function sync(){
    const key=[game.screen,root.document.hidden,motion(),lost].join(':');if(key===signature)return;signature=key;
    map.classList.toggle('atlas-animated',visible()&&motion());resetTilt();
    if(frame)root.cancelAnimationFrame(frame);frame=0;if(visible())render();
  }
  function resize(){if(!renderer||!map.clientWidth||!map.clientHeight)return;renderer.setSize(map.clientWidth,map.clientHeight,false);if(visible())renderer.render(scene,camera);}
  MM.Atlas3D={sync};
  import(moduleURL.href).then(THREE=>{
    renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,1.5));renderer.setClearColor(0x000000,0);
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-500,500,200,-200,.1,2000);camera.position.z=1200;
    scene.add(new THREE.HemisphereLight(0xffefc2,0x112b35,2));
    sun=new THREE.DirectionalLight(0xffdaa0,2.1);sun.position.set(-350,420,700);scene.add(sun);
    const rim=new THREE.DirectionalLight(0x7bbfcb,1.1);rim.position.set(450,-220,450);scene.add(rim);
    const land=new THREE.Group(),angle=-.28;land.rotation.x=angle;land.scale.y=1/Math.cos(angle);scene.add(land);
    for(const [i,path] of [...map.querySelectorAll('.atlas-island')].entries()){
      const values=path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),shape=new THREE.Shape();
      for(let n=0;n<values.length;n+=2){const x=values[n]-500,y=200-values[n+1];if(n===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:32,steps:1,bevelEnabled:true,bevelThickness:2,bevelSize:2,bevelSegments:2});geometry.translate(0,0,-32);
      const top=new THREE.MeshStandardMaterial({color:i===0?0x526445:0x3f6550,roughness:.95,flatShading:true});
      const side=new THREE.MeshStandardMaterial({color:i===0?0x253528:0x213c35,roughness:1,flatShading:true});
      land.add(new THREE.Mesh(geometry,[top,side]));
      const shelfGeometry=new THREE.ExtrudeGeometry(shape,{depth:7,steps:1,bevelEnabled:true,bevelThickness:1,bevelSize:4,bevelSegments:1});shelfGeometry.translate(0,0,-34);
      land.add(new THREE.Mesh(shelfGeometry,new THREE.MeshStandardMaterial({color:0x183333,roughness:1,flatShading:true})));
    }
    map.prepend(canvas);map.classList.add('atlas-webgl');resize();sync();
    new root.ResizeObserver(resize).observe(map);
    root.document.addEventListener('visibilitychange',sync);
    root.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',sync);
    map.addEventListener('pointermove',event=>{
      if(event.pointerType!=='mouse'||event.buttons||!visible()||!motion()||game.mobileRotation)return;
      const rect=map.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
      map.style.setProperty('--atlas-rx',(-y*.6).toFixed(3)+'deg');map.style.setProperty('--atlas-ry',(x*.9).toFixed(3)+'deg');
    });
    map.addEventListener('pointerleave',resetTilt);
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;map.classList.remove('atlas-webgl');sync();});
    canvas.addEventListener('webglcontextrestored',()=>{lost=false;map.classList.add('atlas-webgl');signature='';resize();sync();});
  }).catch(()=>{lost=true;map.classList.remove('atlas-webgl','atlas-animated');canvas.remove();if(frame)root.cancelAnimationFrame(frame);frame=0;renderer?.dispose();renderer=null;});
})(typeof window!=='undefined'?window:globalThis);
