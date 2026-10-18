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
  MM.Story={stories,get,forLevel,progress,nextLevel};
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
    for(const s of stories)text('story-progress-'+s.id,`${progress(s,g.save.completed)}/50 màn`);
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
    for(const button of document.querySelectorAll('[data-story-choice]'))button.addEventListener('click',()=>open(g,Number(button.dataset.storyChoice)));
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
