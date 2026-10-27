(function(root){'use strict';const MM=root.MM=root.MM||{},D=()=>MM.CosmicConfig.authored;
 function atlas(g){const doc=root.document,svg=doc.querySelector('.atlas-art'),map=doc.querySelector('.atlas-map');if(!svg||!map)return;
  const ns='http://www.w3.org/2000/svg',node=(tag,attrs,parent,text)=>{const n=doc.createElementNS(ns,tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;parent.append(n);if(attrs?.id)g.ui[attrs.id]=n;return n;};
  for(let part=0;part<1;part++){const id=6,page='chapter'+id,story=MM.Story.get(id),trail=MM.Story.trail(story),group=node('g',{'data-atlas-page':page,hidden:''},svg);
   node('rect',{x:50,y:-20,width:900,height:430,fill:'#0b1426'},group);
   for(let i=0;i<55;i++)node('circle',{cx:65+i*137%865,cy:12+i*73%365,r:i%4?.9:1.8,fill:i%3?'#8daab6':'#d8c9a7',opacity:.7},group);
   node('path',{id:'atlas-trail-'+id,d:trail.path,fill:'none',stroke:'#bac8b386','stroke-width':2,'stroke-dasharray':'6 7'},group);
   const regions=D().regions;

   node('g',{id:'atlas-cosmic-dots-'+id},group);
   const title=doc.createElement('button');title.className='atlas-land land-cosmic';title.dataset.atlasPage=page;title.dataset.storyChoice=id;title.hidden=true;title.innerHTML='<span class="atlas-number">CỐT TRUYỆN VI · 251—350</span><strong>Thiên Hà</strong><small id="story-progress-'+id+'">0/10 boss · 0/100 màn</small>';map.append(title);g.ui['story-progress-'+id]=title.querySelector('small');
   const marks=doc.createElement('div');marks.className='atlas-boss-marks';marks.dataset.atlasPage=page;marks.hidden=true;
   for(let i=0;i<10;i++){const level=story.start+9+i*10,b=doc.createElement('button'),r=regions[i];b.className='atlas-boss-mark cosmic-planet-marker';b.id='atlas-boss-'+level;b.dataset.bossMarker=level;b.innerHTML='<b class="atlas-mark-symbol" aria-hidden="true">X</b><canvas width="180" height="180" aria-hidden="true"></canvas><strong>'+r.name+'</strong><small>'+level+'</small>';const canvas=b.querySelector('canvas');MM.CosmicPlanets.draw(canvas.getContext('2d'),r.id,90,84,r.id==='saturn'||r.id==='uranus'?49:62);marks.append(b);g.ui[b.id]=b;}map.append(marks);
   const tab=doc.createElement('button');tab.dataset.atlasSwitch=page;tab.textContent='VI · Thiên Hà';doc.querySelector('.atlas-page-tabs')?.append(tab);
   const dot=doc.createElement('button');dot.dataset.atlasDot=id;dot.setAttribute('aria-label','Đến cốt truyện '+id);doc.querySelector('.atlas-page-dots')?.append(dot);
  }
  const edition=doc.querySelector('.atlas-edition>span');if(edition)edition.textContent='06 CỐT TRUYỆN · 350 MÀN';
 }
 function bind(g){if(g.headless||!MM.CosmicBalance)return;atlas(g);const doc=root.document,stage=doc.getElementById('stage');if(!stage)return;
  const hud=doc.createElement('aside');hud.className='cosmic-hud';hud.setAttribute('aria-label','Tinh túy hành tinh');hud.hidden=true;
  const jet=doc.createElement('button');jet.textContent='J · Phản lực';jet.onclick=()=>MM.CosmicRewards.jetpack(g);
  const toggle=doc.createElement('button');toggle.textContent='◆ Tinh túy';const panel=doc.createElement('div');panel.className='essence-panel';panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
  const status=doc.createElement('output');status.className='cosmic-status';hud.append(jet,toggle,status,panel);
  const buttons=D().essences.map((e,i)=>{const b=doc.createElement('button');b.style.setProperty('--essence-color',e.color);b.innerHTML='<strong></strong><span></span><small></small><em></em>';b.querySelector('strong').textContent=(i+1)%10+' · '+e.name;b.onclick=()=>MM.CosmicRewards.activate(g,e.id);panel.append(b);return b;});
  for(const event of ['pointerdown','pointerup','pointermove','click'])hud.addEventListener(event,e=>e.stopPropagation());stage.append(hud);g.cosmicUI={hud,jet,toggle,panel,status,buttons};sync(g);
 }
 function sync(g){const ui=g.cosmicUI;if(!ui)return;const playing=g.screen==='playing'||g.screen==='paused',s=g.cosmicRewards;
  ui.hud.hidden=!playing||!MM.SaveManager.unlocked(g,250)||g.level?.id===70;if(ui.hud.hidden)return;
  ui.jet.hidden=!g.level.cosmic;ui.jet.disabled=g.screen!=='playing'||(s?.jetCooldown>0&&!s.jetpack);ui.jet.textContent=s?.jetpack>0?'Phản lực '+s.jetpack.toFixed(1)+'s':s?.jetCooldown>0?'J · '+Math.ceil(s.jetCooldown)+'s':'J · Phản lực';
  const active=D().essences.map(e=>MM.CosmicRewards.describe(g,e.id)).filter(e=>e.active);
  ui.status.textContent=active.map(e=>e.name+(e.remaining?' '+e.remaining.toFixed(1)+'s':' · F thoát')).join(' · ')+(s?.virtualArmor>0?' · Giáp '+s.virtualArmor.toFixed(1):'');
  ui.toggle.textContent='◆ Tinh túy'+(active.length?' · '+active.length:'');
  D().essences.forEach((e,i)=>{const b=ui.buttons[i],owned=MM.SaveManager.unlocked(g,e.unlock),info=MM.CosmicRewards.describe(g,e.id);b.hidden=!owned;b.disabled=g.screen!=='playing'||info.disabled;b.setAttribute('aria-pressed',String(info.active));b.querySelector('span').textContent=info.detail;b.querySelector('small').textContent=info.cost+(info.cooldown?' · hồi '+info.cooldown+'s':'');b.querySelector('em').textContent=info.status;b.setAttribute('aria-label',e.name+'. '+info.detail+'. '+info.cost+'. '+info.status);});
 }
 MM.CosmicUI={bind,sync};
})(typeof window!=='undefined'?window:globalThis);
