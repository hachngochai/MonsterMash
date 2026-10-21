/* Story territories share one saved expedition; unfinished regions expose
 * planned landmarks without creating levels or granting future boss rewards. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{};
  const stories=[
    {id:1,start:1,end:50,name:'Miền Nhật Thực',tagline:'Khi bình minh quên đường trở lại.',color:'#e8ad63',
      intro:['Đêm không còn kết thúc. Từ nghĩa địa sương mù đến những con phố bỏ hoang, từng ngọn đèn tắt đi và người sống dần biến mất. Bạn là người giữ ngọn đèn cuối cùng của thị trấn. Trong ánh lửa yếu ớt, một tấm bản đồ hiện lên: mọi dấu vết đều dẫn về Cổng Nhật Thực.',
        'Hãy theo những chiếc đèn lồng, vượt khu rừng tơ và lâu đài trăng máu để tìm Dracula. Người ta nói hắn đã đánh cắp bình minh. Nhưng dưới nét mực của bản đồ còn một lời nhắn chưa trọn: “Nếu cánh cổng mở ra, đừng tin rằng bóng tối đã hết…”'],
      arcs:['Chiếc chìa khóa trong nghĩa địa hé lộ con đường mà những người mất tích đã đi qua.','Sâu dưới rừng tơ, dấu ấn màu xanh cho thấy lời nguyền đang được nuôi dưỡng.','Tiếng chuông giữa phố vắng dẫn đến một mạng lưới kéo bóng tối vào thành phố.','Bóng ma canh lâu đài giữ ký ức về một cánh cổng cổ hơn cả Dracula.','Tại Cổng Nhật Thực, người giữ đèn phải giành lại bình minh từ hai bản thể của Dracula.'],
      ending:'Dracula hóa tro. Những mái nhà đón ánh sáng đầu tiên sau một đêm tưởng như vô tận. Nhưng khi Cổng Nhật Thực vỡ ra, mặt đất dưới chân bạn cũng rạn nứt. Từ bên kia khe đá, một khu rừng nguyên sơ gọi tên ngọn đèn. Dracula đã bị hạ; thứ mà hắn giam giữ vừa thức giấc.'},
    {id:2,start:51,end:100,name:'Lời Nguyền Cổ Thú',tagline:'Có những thứ đã ngủ từ trước loài người.',color:'#a7cfa8',
      intro:['Ánh sáng đã trở về thị trấn, nhưng những vết nứt vẫn lan rộng. Tấm bản đồ cũ mọc thêm những đường gân như rễ cây, dẫn bạn vào Thung lũng nguyền rủa. Đá biết bước đi, tiếng hú nhuộm đỏ mặt trăng và những dây leo che kín dấu chân của một nền văn minh đã mất.',
        'Các cổ thú không chỉ săn người: chúng đang canh giữ một lời thề bị lãng quên. Hãy đi qua rừng sâu, tìm Rồng ngàn tuổi và lần theo vòng Âm Dương đến Tàn tích thần thoại. Ở đó, Chimera giữ ba mảnh ký ức. Ngọn đèn có thể đóng khe nứt — hoặc mở ra một con đường chưa ai từng trở về.'],
      arcs:['Golem chúa đập vỡ lớp đá che một lối đi đã bị phong kín hàng nghìn năm.','Dưới Trăng Máu, Lang Vương bảo vệ dấu chân dẫn tới trái tim khu rừng.','KingKong giữ một ngôi đền trên tán cây; dây leo ở đó mang cùng dấu ấn với tấm bản đồ.','Rồng ngàn tuổi hóa thành kỵ sĩ, thử thách người mang đèn trước khi trao bí mật Âm Dương.','Ba bản thể của Chimera nắm giữ ba mảnh lời thề. Chỉ khi cả ba gục xuống, khe nứt mới có thể khép lại.'],
      ending:'Ba vương thú trở về với đá. Bạn đặt ngọn đèn vào tâm vòng Âm Dương; những vết nứt trên mặt đất khép lại, nhưng dưới đền cổ một cầu thang vừa lộ ra. Tấm bản đồ hiện thêm nét mực đỏ dẫn xuống lòng núi. Bình minh đã trở lại rừng sâu, còn ngọn đèn của bạn vẫn nghiêng về phía bóng tối bên dưới. Một tiếng gầm vọng lên từ Mê Cung Minotaur. Câu chuyện của ngọn đèn chưa dừng ở đây.'},
    {id:3,start:101,end:150,name:'Vực Sâu Cổ Đại',tagline:'Ánh sáng cuối cùng xuống miền chưa từng thấy mặt trời.',color:'#c39ae8',
      intro:['Bên dưới ngôi đền của Chimera, những bậc thang đá dẫn vào một thế giới bị xóa khỏi ký ức. Ngọn đèn cuối cùng hóa thành đuốc, soi những chiếc sừng vỡ trong mê cung. Không có mặt trời dưới này; chỉ có khe dung nham, những bộ xương bị rễ cây điều khiển và một tiếng tim đập từ tận đáy vực.',
        'Theo con đường thạch anh xuống hồ ngầm, vượt Vách Đá Vọng Âm để tìm Lăng Mộ Luân Hồi. Thiên Thủ Cổ Thần đang canh giữ điều gì đó còn cổ hơn lời nguyền trên mặt đất. Bốn gương mặt của tượng biết cười, nổi giận, yêu thương và căm ghét. Nếu ánh đuốc bị nuốt mất, hãy nhớ: ánh sáng bạn đã giành lại không chỉ nằm trong ngọn lửa.'],
      arcs:['Minotaur Chúa giữ cửa mê cung. Hãy đọc dấu nấm độc và bụi nhũ đá để tìm lối xuống sâu hơn.','Trong hang ký sinh, Mộc Tâm Hoa Quỷ kéo những bộ xương bằng rễ đen. Phân biệt thực và ảo để lấy lại Búa Minotaur.','Hồ ngầm giữ chiếc mai gương của Xích Kính Quái Sùng. Giữa khúc xạ và phản đòn, thạch anh sẽ trao ánh sáng cho vũ khí.','Tiếng hét của Hóa Thạch Sí Vũ đảo lộn phương hướng. Hạ cả linh hồn chim lẫn Kị Sĩ Xương để mở cửa lăng mộ.','Thiên Thủ Cổ Thần xoay một đầu bốn mặt. Trong Mê Cung Luân Hồi, chỉ cơn Nộ chân thực mới chạm tới trái tim của tượng.'],
      ending:'Những cánh tay đá lần lượt hạ xuống. Hỉ, Nộ, Ái và Ố tan vào cùng một gương mặt bình yên, còn ánh sáng nhỏ trên vũ khí của bạn xuyên qua lớp bụi ngàn năm. Mê Cung Luân Hồi sụp đổ, để lộ một dòng nước đang chảy về phía bình minh. Bạn mang ngọn đèn trở lên, cùng ký ức về những người đã canh giữ vực sâu. Ở mép bản đồ, một ký hiệu chưa từng thấy vẫn âm thầm phát sáng.'},
    {id:4,start:151,end:170,plannedEnd:200,name:'Hải Vực Quên Lãng',tagline:'Theo dòng ký ức xuống miền biển chưa thức giấc.',color:'#75d8e8',
      intro:['Dòng nước sau Lăng Mộ Luân Hồi không dẫn trở lên mặt đất. Nó cuốn người giữ đèn qua một cánh cổng chìm, tới những rặng san hô mọc giữa tàn tích của một hải quốc. Ánh nắng còn xuyên qua mặt biển, nhưng mỗi bậc đá phía dưới lại giữ một ký ức đã bị quên lãng.',
        'Hãy học cách thở, giữ nguồn oxy dự trữ và bơi qua những sinh vật đang canh vùng biển nông. Quái Ngư Song Trảo giữ lối xuống tầng trung, nơi cá mập con và sứa điện bơi giữa san hô phát quang. Sứa Ma Khổng Lồ che giấu lối đi trong những ảo ảnh giống hệt nhau. Bản đồ đã hé mở từ 151 đến 170; các miền sâu hơn còn nằm dưới màn nước chưa được khám phá.'],
      arcs:['Tầng Biển Nông thử thách hơi thở giữa san hô. Piranha, cá nóc và cá ngựa canh giữ đường tới Quái Ngư Song Trảo.','Tầng Trung Đầu Tiên chìm trong ánh lam và điện tím. Né sứa bất tử, vượt hàm cá mập để tìm Bóng Ma Điện Quang giữa ảo giác hoán đổi.','Vùng biển 171–180 chưa được triển khai.','Vùng biển 181–190 vẫn đang được phong kín.','Vùng biển 191–200 chờ bộ kỹ năng và cốt truyện tiếp theo.'],
      ending:'Những xúc tu điện cuối cùng lặng xuống. Hai bóng Sứa Ma tan khỏi sân cổ, để lại dòng nước không còn bị ảo giác bẻ hướng. Người giữ đèn lấy lại nhịp thở giữa những rạn san hô phát quang và những bức tường đá xanh thẳm. Bên dưới nơi Bóng Ma Điện Quang từng canh giữ, một đường nứt dẫn vào tầng nước chưa có tên. Tầng Trung Đầu Tiên đã được vượt qua; những miền sâu hơn của Hải Vực Quên Lãng vẫn chờ hành trình tiếp tục.'}
  ];
  const get=id=>stories.find(s=>s.id===Number(id))||stories[0];
  const forLevel=id=>stories.find(s=>id>=s.start&&id<=s.end)||stories[0];
  const progress=(story,completed=[])=>new Set(completed.filter(id=>Number.isInteger(id)&&id>=story.start&&id<=story.end)).size;
  const nextLevel=(story,completed=[])=>{const done=new Set(completed);for(let id=story.start;id<=story.end;id++)if(!done.has(id))return id;return story.start;};
  const length=story=>story.end-story.start+1;
  const milestones=(story,rewards=[])=>Array.from({length:5},(_,i)=>{const level=story.start+9+i*10,available=level<=story.end,cleared=available&&rewards.includes(level);return {level,available,planned:!available,cleared,mark:cleared?'O':'X'};});
  const routes={
    1:{points:[[110,140],[150,208],[260,180],[360,236],[290,320],[160,308]],controls:[[75,185],[175,145],[338,160],[370,302],[212,355]]},
    2:{points:[[600,135],[650,185],[850,165],[790,265],[620,280],[880,315]],controls:[[585,175],[730,100],[875,245],[705,225],[735,375]]},
    3:{points:[[160,130],[270,208],[440,150],[650,215],[780,302],[460,315]],controls:[[145,195],[335,105],[570,120],[820,210],[625,370]]},
    4:{points:[[125,130],[295,195],[485,115],[735,180],[800,315],[475,330]],controls:[[180,105],[355,100],[630,75],[855,235],[660,375]]}
  };
  // Surface islands are half as wide as the Abyss: frame each more closely
  // without moving its terrain, exploration route or boss hit targets.
  const viewports={1:{x:-50,y:-20,width:600,height:430},2:{x:455,y:-20,width:600,height:430},3:{x:50,y:-20,width:900,height:430},4:{x:50,y:-20,width:900,height:430}};
  const viewport=story=>Object.assign({},viewports[typeof story==='object'?story.id:get(story).id]);
  const crossingRoutes=[
    {from:50,entrance:51,to:60,outStory:1,inStory:2,outPath:'M160 308C170 375 345 388 460 325',inPath:'M490 125C535 104 562 133 600 135Q585 175 650 185'},
    {from:100,entrance:101,to:110,outStory:2,inStory:3,outPath:'M880 315C910 379 1000 382 1045 315',inPath:'M75 130C100 105 130 126 160 130Q145 195 270 208'},
    {from:150,entrance:151,to:160,outStory:3,inStory:4,outPath:'M460 315C520 380 840 385 925 300',inPath:'M70 155C95 120 110 120 125 130Q180 105 295 195'}
  ];
  function trail(story){
    const route=routes[story.id],dots=[];let path='M'+route.points[0].join(' ');
    route.controls.forEach((control,i)=>{
      const from=route.points[i],to=route.points[i+1];path+='Q'+control.join(' ')+' '+to.join(' ');
      for(let n=0;n<9;n++){const t=(i===0?0:.2)+(i===0?.8:.6)*n/8,u=1-t;
        const level=story.start+i*10+n;
        if(level<=story.end)dots.push({level,x:u*u*from[0]+2*u*t*control[0]+t*t*to[0],y:u*u*from[1]+2*u*t*control[1]+t*t*to[1]});}
    });
    return {path,dots,bosses:route.points.slice(1)};
  }
  MM.Story={stories,get,forLevel,progress,nextLevel,length,milestones,trail,viewport,crossingRoutes};
  const selected=g=>get(g.selectedStory||1);
  function select(g,id){g.selectedStory=get(id).id;g.buildMap?.();g.updateUI?.();}
  function navigate(g,id){
    const destination=Number(id);if(!Number.isInteger(destination)||destination<1||destination>stories.length||destination===selected(g).id)return false;
    const direction=destination>selected(g).id?1:-1;select(g,destination);
    const map=document.querySelector('.atlas-map');
    if(g.settings?.reducedMotion!==true&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      map?.animate?.([{opacity:.45,transform:`translateX(${direction*18}px)`},{opacity:1,transform:'translateX(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.25,1)'});
    return true;
  }
  function sync(g){
    if(g.headless||!g.ui)return;
    const story=selected(g),count=progress(story,g.save.completed);
    const text=(id,value)=>{if(g.ui[id])g.ui[id].textContent=value;};
    text('atlas-story-name',story.name);text('atlas-tagline',story.tagline);
    text('start-label',count>0&&count<length(story)?'Tiếp bước · Màn '+nextLevel(story,g.save.completed):'Bước vào câu chuyện');
    text('save-label',`${String(story.start).padStart(2,'0')}—${story.end} · ${count}/${length(story)} MÀN ĐÃ QUA${story.plannedEnd?` · ${story.end+1}–${story.plannedEnd} SẮP MỞ`:''}`);
    text('campaign-title',story.name);text('map-story-description',story.tagline+' Chọn một điểm trên hành trình.');
    g.ui['home-overlay']?.setAttribute('data-story',String(story.id));
    const atlasPage='chapter'+story.id,view=viewport(story);
    const map=document.querySelector('.atlas-map');map?.setAttribute('data-atlas-view',atlasPage);map?.setAttribute('data-atlas-camera',[view.x,view.y,view.width,view.height].join(' '));
    map?.setAttribute('aria-label',`Bản đồ ${story.id} trên ${stories.length}: ${story.name}. Vuốt ngang để đổi cốt truyện.`);
    document.querySelector('.atlas-art')?.setAttribute('viewBox',[view.x,view.y,view.width,view.height].join(' '));
    for(const page of document.querySelectorAll('[data-atlas-page]')){
      if(page.dataset.atlasPage===atlasPage)page.removeAttribute('hidden');else page.setAttribute('hidden','');
    }
    for(const button of document.querySelectorAll('[data-atlas-switch]'))button.setAttribute('aria-pressed',String(button.dataset.atlasSwitch===atlasPage));
    for(const region of document.querySelectorAll('[data-atlas-region]')){
      const regionName=story.id===4?'ocean':story.id===3?'abyss':'surface';
      if(region.dataset.atlasRegion===regionName)region.removeAttribute('hidden');else region.setAttribute('hidden','');
    }
    for(const button of document.querySelectorAll('[data-atlas-dot]'))button.setAttribute('aria-current',String(Number(button.dataset.atlasDot)===story.id));
    if(g.ui['atlas-previous']){g.ui['atlas-previous'].disabled=story.id===1;g.ui['atlas-previous'].setAttribute('aria-label',story.id>1?'Cốt truyện trước: '+get(story.id-1).name:'Đang ở cốt truyện đầu');}
    if(g.ui['atlas-next']){g.ui['atlas-next'].disabled=story.id===stories.length;g.ui['atlas-next'].setAttribute('aria-label',story.id<stories.length?'Cốt truyện tiếp: '+get(story.id+1).name:'Đang ở cốt truyện cuối');}
    text('atlas-page-count',`${String(story.id).padStart(2,'0')} / ${String(stories.length).padStart(2,'0')}`);
    for(const button of document.querySelectorAll('[data-story-choice]'))button.setAttribute('aria-pressed',String(Number(button.dataset.storyChoice)===story.id));
    const rewards=Array.from(new Set([...(g.progression?.rewards||[]),...(g.save.completed||[]).filter(id=>id%10===0)]));
    for(const route of crossingRoutes)for(const suffix of ['out','in'])g.ui[`atlas-crossing-${route.from}-${suffix}`]?.classList.toggle('open',rewards.includes(route.from));
    const signature=g.save.completed.join(',');
    if(g.storyDotSignature!==signature){
      g.storyDotSignature=signature;const completed=new Set(g.save.completed);
      for(const dot of g.storyDots||[])dot.node.classList.toggle('cleared',completed.has(dot.level));
    }
    for(const s of stories){
      const marks=milestones(s,rewards);
      const bossCount=marks.filter(m=>m.available).length;
      text('story-progress-'+s.id,`${marks.filter(m=>m.cleared).length}/${bossCount} boss · ${progress(s,g.save.completed)}/${length(s)} màn${s.plannedEnd?` · ${s.end+1}–${s.plannedEnd} sắp mở`:''}`);
      for(const mark of marks){
        const button=g.ui['atlas-boss-'+mark.level];if(!button)continue;
        const label=mark.planned?`Mốc ${mark.level} · Chưa mở trong đợt này`:`Boss màn ${mark.level} · ${mark.cleared?'Đã khám phá':'Chưa đánh bại'} · Xem hành trình`;
        if(button.getAttribute('aria-label')===label)continue;
        button.setAttribute('aria-label',label);button.title=label;
        button.disabled=mark.planned;button.classList.toggle('planned',mark.planned);
        button.classList.toggle('cleared',mark.cleared);
        button.querySelector('.atlas-mark-symbol').textContent=mark.mark;
      }
    }
  }
  function open(g,id=selected(g).id,launch){
    select(g,id);const s=selected(g);
    g.storyLaunch=launch||{level:nextLevel(s,g.save.completed),options:{}};
    const title=g.ui['story-title'];if(title)title.textContent=s.name;
    const kicker=g.ui['story-kicker'];if(kicker)kicker.textContent=`CỐT TRUYỆN ${String(s.id).padStart(2,'0')} · MÀN ${s.start}—${s.end}`;
    const intro=g.ui['story-intro'];if(intro){intro.textContent='';for(const paragraph of s.intro){const p=document.createElement('p');p.textContent=paragraph;intro.append(p);}}
    const route=g.ui['story-route'];if(route){route.textContent='';MM.Campaign.worlds.filter(w=>w.id>=Math.floor((s.start-1)/10)&&w.id<=Math.floor((s.end-1)/10)).forEach((w,i)=>{const li=document.createElement('li'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=w.name;span.textContent=s.arcs[i];li.append(strong,span);route.append(li);});}
    const begin=g.ui['story-begin'];if(begin)begin.textContent='Lên đường · Màn '+g.storyLaunch.level+' →';
    g.openDialog('story-dialog');
  }
  function bind(g){
    g.storyDots=[];
    for(const story of stories){
      const dotsGroup=g.ui[story.id===4?'atlas-ocean-dots':story.id===3?'atlas-abyss-dots':'atlas-level-dots'];if(!dotsGroup)continue;
      const route=trail(story),path=g.ui['atlas-trail-'+story.id];path?.setAttribute('d',route.path);
      const view=viewport(story);
      route.bosses.forEach(([x,y],i)=>{const button=g.ui['atlas-boss-'+(story.start+9+i*10)];button?.style.setProperty('--mark-x',(x-view.x)/view.width*100+'%');button?.style.setProperty('--mark-y',(y-view.y)/view.height*100+'%');});
      for(const dot of route.dots){
        const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',dot.x);circle.setAttribute('cy',dot.y);circle.setAttribute('r','3.2');circle.setAttribute('class','atlas-level-dot');circle.setAttribute('data-level-dot',dot.level);circle.setAttribute('data-atlas-page','chapter'+story.id);
        const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent='Màn '+dot.level;circle.append(title);dotsGroup.append(circle);g.storyDots.push({level:dot.level,node:circle});
      }
    }
    for(const button of document.querySelectorAll('[data-atlas-switch]'))button.addEventListener('click',()=>navigate(g,Number(button.dataset.atlasSwitch.replace('chapter',''))));
    for(const button of document.querySelectorAll('[data-atlas-dot]'))button.addEventListener('click',()=>navigate(g,Number(button.dataset.atlasDot)));
    for(const button of document.querySelectorAll('[data-story-jump]'))button.addEventListener('click',()=>navigate(g,Number(button.dataset.storyJump)));
    g.ui['atlas-previous']?.addEventListener('click',()=>navigate(g,selected(g).id-1));g.ui['atlas-next']?.addEventListener('click',()=>navigate(g,selected(g).id+1));
    bindSwipe(g,document.querySelector('.atlas-map'));
    for(const button of document.querySelectorAll('[data-story-choice]'))button.addEventListener('click',()=>open(g,Number(button.dataset.storyChoice)));
    for(const button of document.querySelectorAll('[data-boss-marker]'))button.addEventListener('click',()=>{
      const level=Number(button.dataset.bossMarker);if(level>MM.Campaign.levels.length)return;select(g,forLevel(level).id);g.openDialog('levels-dialog');
      g.ui['level-map'].querySelector('#world-map-'+Math.floor((level-1)/10))?.scrollIntoView({block:'start'});
    });
    g.ui['story-begin']?.addEventListener('click',()=>{const launch=g.storyLaunch;g.ui['story-dialog'].close();if(launch)g.start(launch.level,launch.options);});
  }
  function bindSwipe(g,map){
    if(!map)return;let drag=null;
    const point=event=>g.mobileRotation?{x:event.clientY,y:-event.clientX}:{x:event.clientX,y:event.clientY};
    map.addEventListener('pointerdown',event=>{
      if(g.screen!=='home'||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0)||event.target?.closest?.('button,a,input,select,textarea,[contenteditable="true"]'))return;
      const p=point(event);drag={id:event.pointerId,x:p.x,y:p.y,dx:0,dy:0,locked:false,cancelled:false};
    });
    map.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;const p=point(event);drag.dx=p.x-drag.x;drag.dy=p.y-drag.y;
      if(!drag.locked&&Math.abs(drag.dy)>12&&Math.abs(drag.dy)>Math.abs(drag.dx)){drag.cancelled=true;return;}
      if(drag.cancelled)return;
      if(!drag.locked&&Math.abs(drag.dx)>12&&Math.abs(drag.dx)>Math.abs(drag.dy)*1.4){drag.locked=true;map.setPointerCapture?.(event.pointerId);}
      if(drag.locked&&event.cancelable)event.preventDefault();
    },{passive:false});
    map.addEventListener('pointerup',event=>{
      if(!drag||drag.id!==event.pointerId)return;const gesture=drag;drag=null;
      if(map.hasPointerCapture?.(event.pointerId))map.releasePointerCapture(event.pointerId);
      if(gesture.cancelled||!gesture.locked||Math.abs(gesture.dx)<44||Math.abs(gesture.dx)<Math.abs(gesture.dy)*1.4)return;
      navigate(g,selected(g).id+(gesture.dx<0?1:-1));
    });
    map.addEventListener('pointercancel',()=>{drag=null;});
    map.addEventListener('lostpointercapture',()=>{drag=null;});
  }
  function result(g){
    const story=forLevel(g.level.id);
    if(g.screen!=='won'||g.level.id!==story.end)return;
    g.ui['result-kicker'].textContent=story.plannedEnd?'HOÀN THÀNH CHẶNG HIỆN TẠI':'KHÉP LẠI CỐT TRUYỆN '+String(story.id).padStart(2,'0');
    g.ui['result-title'].textContent=story.plannedEnd?'Tầng Trung Đầu Tiên · Đã vượt qua':story.name;
    g.ui['result-description'].textContent=story.ending;
    const following=stories.find(s=>s.start===story.end+1);
    g.ui['result-primary'].textContent=following?'Đến '+following.name+' →':'Trở về bản đồ →';
    g.resultAction=following?()=>open(g,following.id,{level:following.start,options:{carry:true}}):()=>g.goHome();
  }
  MM.StoryUI={selected,select,navigate,sync,open,bind,bindSwipe,result};
})(typeof window!=='undefined'?window:globalThis);
