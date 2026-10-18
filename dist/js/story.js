/* Fifty-stage tales share one run; opening the page starts a new expedition. */
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
      ending:'Ba vương thú trở về với đá. Bạn đặt ngọn đèn vào tâm vòng Âm Dương và các vết nứt dần khép lại. Rừng sâu im tiếng; bình minh cuối cùng cũng chạm tới những tàn tích. Khi quay đi, bạn thấy tấm bản đồ vẫn còn một khoảng trống. Ngoài đường chân trời, một đốm sáng khác vừa được thắp lên. Hành trình này kết thúc. Câu chuyện của ngọn đèn thì chưa.'}
  ];
  const get=id=>stories.find(s=>s.id===Number(id))||stories[0];
  const forLevel=id=>stories.find(s=>id>=s.start&&id<=s.end)||stories[0];
  const progress=(story,completed=[])=>new Set(completed.filter(id=>Number.isInteger(id)&&id>=story.start&&id<=story.end)).size;
  const nextLevel=(story,completed=[])=>{const done=new Set(completed);for(let id=story.start;id<=story.end;id++)if(!done.has(id))return id;return story.start;};
  const milestones=(story,rewards=[])=>Array.from({length:5},(_,i)=>{const level=story.start+9+i*10,cleared=rewards.includes(level);return {level,cleared,mark:cleared?'O':'X'};});
  const routes={
    1:{points:[[110,140],[150,208],[260,180],[360,236],[290,320],[160,308]],controls:[[75,185],[175,145],[338,160],[370,302],[212,355]]},
    2:{points:[[600,135],[650,185],[850,165],[790,265],[620,280],[880,315]],controls:[[585,175],[730,100],[875,245],[705,225],[735,375]]}
  };
  function trail(story){
    const route=routes[story.id],dots=[];let path='M'+route.points[0].join(' ');
    route.controls.forEach((control,i)=>{
      const from=route.points[i],to=route.points[i+1];path+='Q'+control.join(' ')+' '+to.join(' ');
      for(let n=0;n<9;n++){const t=(i===0?0:.2)+(i===0?.8:.6)*n/8,u=1-t;
        dots.push({level:story.start+i*10+n,x:u*u*from[0]+2*u*t*control[0]+t*t*to[0],y:u*u*from[1]+2*u*t*control[1]+t*t*to[1]});}
    });
    return {path,dots,bosses:route.points.slice(1)};
  }
  MM.Story={stories,get,forLevel,progress,nextLevel,milestones,trail};
  const selected=g=>get(g.selectedStory||1);
  function select(g,id){g.selectedStory=get(id).id;g.buildMap?.();g.updateUI?.();}
  function sync(g){
    if(g.headless||!g.ui)return;
    const story=selected(g),count=progress(story,g.save.completed);
    const text=(id,value)=>{if(g.ui[id])g.ui[id].textContent=value;};
    text('atlas-story-name',story.name);text('atlas-tagline',story.tagline);
    text('start-label',count>0&&count<50?'Tiếp bước · Màn '+nextLevel(story,g.save.completed):'Bước vào câu chuyện');
    text('save-label',`${String(story.start).padStart(2,'0')}—${story.end} · ${count}/50 MÀN ĐÃ QUA`);
    text('campaign-title',story.name);text('map-story-description',story.tagline+' Chọn một điểm trên hành trình.');
    g.ui['home-overlay']?.setAttribute('data-story',String(story.id));
    for(const button of document.querySelectorAll('[data-story-choice]'))button.setAttribute('aria-pressed',String(Number(button.dataset.storyChoice)===story.id));
    const rewards=g.progression?.rewards||[];
    g.ui['atlas-crossing']?.classList.toggle('open',rewards.includes(50));
    const signature=g.save.completed.join(',');
    if(g.storyDotSignature!==signature){
      g.storyDotSignature=signature;const completed=new Set(g.save.completed);
      for(const dot of g.storyDots||[])dot.node.classList.toggle('cleared',completed.has(dot.level));
    }
    for(const s of stories){
      const marks=milestones(s,rewards);
      text('story-progress-'+s.id,`${marks.filter(m=>m.cleared).length}/5 boss · ${progress(s,g.save.completed)}/50 màn`);
      for(const mark of marks){
        const button=g.ui['atlas-boss-'+mark.level];if(!button)continue;
        const label=`Boss màn ${mark.level} · ${mark.cleared?'Đã khám phá':'Chưa đánh bại'} · Xem hành trình`;
        if(button.getAttribute('aria-label')===label)continue;
        button.setAttribute('aria-label',label);button.title=label;
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
    const dotsGroup=g.ui['atlas-level-dots'];g.storyDots=[];
    if(dotsGroup)for(const story of stories){
      const route=trail(story),path=g.ui['atlas-trail-'+story.id];path?.setAttribute('d',route.path);
      route.bosses.forEach(([x,y],i)=>{const button=g.ui['atlas-boss-'+(story.start+9+i*10)];button?.style.setProperty('--mark-x',x/10+'%');button?.style.setProperty('--mark-y',y/4+'%');});
      for(const dot of route.dots){
        const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',dot.x);circle.setAttribute('cy',dot.y);circle.setAttribute('r','3.2');circle.setAttribute('class','atlas-level-dot');circle.setAttribute('data-level-dot',dot.level);
        const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent='Màn '+dot.level;circle.append(title);dotsGroup.append(circle);g.storyDots.push({level:dot.level,node:circle});
      }
    }
    for(const button of document.querySelectorAll('[data-story-choice]'))button.addEventListener('click',()=>open(g,Number(button.dataset.storyChoice)));
    for(const button of document.querySelectorAll('[data-boss-marker]'))button.addEventListener('click',()=>{
      const level=Number(button.dataset.bossMarker);select(g,forLevel(level).id);g.openDialog('levels-dialog');
      g.ui['level-map'].querySelector('#world-map-'+Math.floor((level-1)/10))?.scrollIntoView({block:'start'});
    });
    g.ui['story-begin']?.addEventListener('click',()=>{const launch=g.storyLaunch;g.ui['story-dialog'].close();if(launch)g.start(launch.level,launch.options);});
  }
  function result(g){
    const story=forLevel(g.level.id);
    if(g.screen!=='won'||g.level.id!==story.end)return;
    g.ui['result-kicker'].textContent='KHÉP LẠI CỐT TRUYỆN '+String(story.id).padStart(2,'0');
    g.ui['result-title'].textContent=story.name;
    g.ui['result-description'].textContent=story.ending;
    const following=stories.find(s=>s.start===story.end+1);
    g.ui['result-primary'].textContent=following?'Đến '+following.name+' →':'Trở về bản đồ →';
    g.resultAction=following?()=>open(g,following.id,{level:following.start,options:{carry:true}}):()=>g.goHome();
  }
  MM.StoryUI={selected,select,sync,open,bind,result};
})(typeof window!=='undefined'?window:globalThis);
