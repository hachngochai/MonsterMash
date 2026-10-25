/* V3 controls use the same input actions on desktop and touch screens. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {}, states = new WeakMap();
  const names = {gun:'Súng',bones:'Xương Phân Ba',club:'Chùy Golem',bow:'Cung Hắc Ám',spear:'Giáo Bạch Kim',axes:'Song Rìu'};
  const descriptions = {
    gun:'1 đạn / phát',bones:'3 xương · 3 đạn / lượt',club:'Cận chiến · 3 sát thương',
    bow:'5 mũi tên · 5 đạn / lượt',spear:'Đâm gần / ném xa',axes:'Cận chiến · nhấn đúp hướng để Lăn Chém',
    hammer:'Cận chiến · búa chiến Minotaur',scythe:'Chém + sóng xa · G hoán đổi với quái thường',lightningOrb:'Giữ bắn · tối đa 5 mục tiêu · 1 HP thực mất = 1 đạn',
    easterEgg:'Ngẫu nhiên 1/7 vũ khí Phục Sinh trong 20 giây',dreamBook:'Triệu hồi bản sao · 10 giây hồi chiêu'
  };
  function node(game,id) { return game.ui?.[id] || root.document?.getElementById(id); }
  function state(game) {
    if (!states.has(game)) states.set(game,{bound:false,pointer:null,pickerSignature:'',rewardSignature:null,wasOpen:false});
    return states.get(game);
  }
  function text(element,value) { if(element && element.textContent!==value)element.textContent=value; }
  function bind(game) {
    const s=state(game);if(s.bound || !root.document)return;
    s.bound=true;
    const button=node(game,'weapon-button');
    if(button) {
      const cancel=event=>{
        if(s.pointer!==event.pointerId)return;
        s.pointer=null;
        if(MM.InputManager?.weaponCancel)MM.InputManager.weaponCancel(game);
        else MM.InputManager?.reset(game);
      };
      button.addEventListener('pointerdown',event=>{
        if(s.pointer!==null || event.button>0 || button.disabled)return;
        event.preventDefault();event.stopPropagation();
        if(!MM.InputManager?.weaponDown(game))return;
        s.pointer=event.pointerId;button.setPointerCapture?.(event.pointerId);
      });
      button.addEventListener('pointerup',event=>{
        if(s.pointer!==event.pointerId)return;
        event.preventDefault();event.stopPropagation();s.pointer=null;
        MM.InputManager?.weaponUp(game);
        if(button.hasPointerCapture?.(event.pointerId))button.releasePointerCapture(event.pointerId);
        sync(game);
      });
      button.addEventListener('pointercancel',cancel);
      button.addEventListener('lostpointercapture',cancel);
      button.addEventListener('contextmenu',event=>event.preventDefault());
      button.addEventListener('click',event=>{
        // Keyboard activation has no pointer sequence. Touch clicks are already
        // resolved on pointerup so they cannot cycle a second time.
        if(event.detail===0 && !button.disabled) {MM.WeaponManager?.cycle(game);sync(game);game.canvas?.focus({preventScroll:true});}
      });
    }
    for(const [id,mode] of [['aim-high','high'],['aim-ground','ground']])node(game,id)?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();MM.WeaponManager?.setAim(game,mode);sync(game);game.canvas?.focus({preventScroll:true});
    });
    node(game,'scythe-swap')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();MM.WeaponManager?.tryScytheSwap(game);sync(game);game.canvas?.focus({preventScroll:true});
    });
    node(game,'merfolk-button')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();if(game.level.island)MM.ResurrectionRewards?.activate(game);else MM.MerfolkTransformation?.activate(game);sync(game);game.canvas?.focus({preventScroll:true});
    });
    node(game,'island-interact')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();MM.IslandCombat?.interact(game);sync(game);game.canvas?.focus({preventScroll:true});});
    node(game,'weapon-confirm')?.addEventListener('click',()=>{MM.InputManager?.select(game);sync(game);});
    node(game,'weapon-cancel')?.addEventListener('click',()=>{MM.InputManager?.close(game);sync(game);});
    node(game,'weapon-picker')?.addEventListener('keydown',event=>{
      if(event.key!=='Tab' || !game.weaponPicker?.open)return;
      const picker=node(game,'weapon-picker');
      const controls=[...picker.querySelectorAll('button:not([disabled])')].filter(control=>!control.hidden&&control.tabIndex>=0);
      if(!controls.length)return;
      event.preventDefault();
      const index=controls.indexOf(root.document.activeElement),step=event.shiftKey?-1:1;
      controls[(index+step+controls.length)%controls.length].focus({preventScroll:true});
    });
  }
  function sync(game) {
    const s=state(game), W=MM.WeaponManager;
    if(!root.document || !W)return;
    if(!s.bound)bind(game);
    const suppressed=MM.MapManager?.suppressed(game)===true, weapon=W.current(game), available=W.available(game);
    const label=W.names?.[weapon]||names[weapon]||weapon;
    const weaponButton=node(game,'weapon-button');
    if(weaponButton) {
      weaponButton.hidden=![10,60,90,100,120,140,170,230,240].some(level=>MM.SaveManager?.unlocked(game,level));
      text(weaponButton,label+' ↔');weaponButton.disabled=game.screen!=='playing'||suppressed||available.length<2;
      weaponButton.title=MM.SaveManager?.unlocked(game,60)?'Nhấn để đổi nhanh · giữ để chọn vũ khí':'Nhấn để đổi vũ khí';
      weaponButton.setAttribute('aria-label','Vũ khí: '+label+'. '+weaponButton.title);
    }
    const free=MM.UnderwaterMode?.freeSwim(game)===true;
    const manual=MM.MapManager?.manualAim(game)===true&&!free;
    const swimControls=node(game,'swim-controls');if(swimControls)swimControls.hidden=!free||game.screen!=='playing';
    const merfolk=node(game,'merfolk-button');
    if(merfolk){
      if(game.level.island){
        merfolk.hidden=!MM.SaveManager?.unlocked(game,210);const remaining=game.resurrection?.moaiCooldown||0,ally=game.resurrection?.moai;
        const key=MM.KeyBindings?.label(MM.KeyBindings.normalize(game.settings.keyBindings).merfolk)||'R';
        text(merfolk,ally?'Tiểu Moai · '+Math.ceil(ally.health)+' HP':remaining>0?'Tiểu Moai · '+remaining.toFixed(1)+'s':'Tiểu Moai · '+key);
        merfolk.disabled=game.screen!=='playing'||!!game.weaponPicker?.open||!!ally||remaining>0;merfolk.title='Gọi một Tiểu Moai 12 HP · '+key+' · Hồi 10 giây';merfolk.classList.remove('merfolk-active');
      }else{
      merfolk.hidden=!MM.UnderwaterMode?.active(game)||!MM.SaveManager?.unlocked(game,160);
      const remaining=game.merfolk?.remaining||0,used=game.merfolk?.used;
      const key=MM.KeyBindings?.label(MM.KeyBindings.normalize(game.settings.keyBindings).merfolk)||'R';
      text(merfolk,remaining>0?'Ngư Nhân · '+(Math.ceil(remaining*10)/10).toFixed(1)+'s':used?'Ngư Nhân · Đã dùng':'Ngư Nhân · '+key);
      merfolk.disabled=game.screen!=='playing'||!!game.weaponPicker?.open||!!used;
      merfolk.classList.toggle('merfolk-active',remaining>0);
      merfolk.title='10 giây miễn hao oxy và HP quái thường; Boss vẫn gây sát thương · một lượt mỗi màn';
      }
    }
    const interact=node(game,'island-interact'),judgment=(game.enemies||[]).find(e=>!e.dead&&e.islandState==='judgment');
    if(interact){interact.hidden=!game.level.island||!judgment;text(interact,'✧ Phong ấn · '+(MM.KeyBindings?.label(MM.KeyBindings.normalize(game.settings.keyBindings).interact)||'E'));interact.disabled=game.screen!=='playing'||!game.island?.seals?.some(z=>!z.activated&&Math.abs(z.x-game.player.x)<=55);}
    const swap=node(game,'scythe-swap');
    if(swap) {
      swap.hidden=weapon!=='scythe'||suppressed;
      const remaining=game.scytheSwapCooldown||0;
      const key=MM.KeyBindings?.label(MM.KeyBindings.normalize(game.settings.keyBindings).scytheSwap)||'G';
      text(swap,remaining>1e-8?'Hoán đổi · '+(Math.ceil(remaining*10)/10).toFixed(1)+'s':'⇄ Hoán đổi · '+key);
      swap.disabled=game.screen!=='playing'||!!game.weaponPicker?.open||remaining>1e-8
        ||petrified(game.player)||!W.swapTarget(game);
      swap.title='Đổi chỗ với quái thường gần nhất · Boss miễn nhiễm · Hồi 6 giây';
    }
    for(const [id,mode] of [['aim-high','high'],['aim-ground','ground']]) {
      const control=node(game,id);if(!control)continue;
      control.hidden=!manual;control.disabled=game.screen!=='playing';
      control.setAttribute('aria-pressed',String(game.aimMode===mode));
    }
    const details=[];
    if(game.resurrection?.armorRemaining>0)details.push('GIÁP NGƯ NHÂN '+game.resurrection.armorRemaining.toFixed(1)+'s');
    if(MM.ResurrectionRewards?.currentForm(game))details.push(MM.ResurrectionRewards.names[game.resurrection.form]+' '+Math.ceil(game.resurrection.formRemaining)+'s');
    if(game.island?.slow>0)details.push('CHẬM '+Math.ceil(game.island.slow)+'s');if(game.island?.vulnerable>0)details.push('YẾU GIÁP '+Math.ceil(game.island.vulnerable)+'s');if(game.island?.fear>0)details.push('HOẢNG SỢ');
    if(suppressed)details.push(MM.MapManager?.bloodMoon(game)?'Màn 70 · Giữ để bắn liên tục · nhấn đúp / nút LƯỚT':'Màn 70 · kỹ năng thưởng tạm khóa');
    else {
      if((game.player?.immortalTime||0)>0)details.push('BẤT TỬ '+(Math.ceil(game.player.immortalTime*10)/10).toFixed(1)+'s');
      if(game.skillState?.darkReady)details.push('HẮC HÓA SẴN SÀNG');
      if(MM.SaveManager?.unlocked(game,50))details.push('Hút Máu '+(game.progression?.lifeKills||0)+'/10');
      if(manual)details.push(game.aimMode==='high'?'Bắn tầm cao ↗':'Bắn mặt đất →');
    }
    const status=node(game,'progression-status');
    if(status){text(status,details.join(' · '));status.hidden=!details.length;}

    const dash=node(game,'dash-controls'),p=game.player;
    if(dash) {
      const active=game.screen==='playing'&&!game.weaponPicker?.open&&MM.MapManager?.bloodMoon(game)===true
        && !(game.enemies||[]).some(e=>e.boss&&e.bloodMoon&&!e.dead&&e.health>0&&e.wolfState==='transform');
      dash.hidden=!active;
      if(active) {
        const cooldown=Math.max(p.rollCooldown||0,p.rollTime||0,p.stunTime||0,p.petrifyTime||0);
        const label=cooldown>1e-8?(Math.ceil(cooldown*10)/10).toFixed(1)+'s':'LƯỚT';
        for(const control of dash.querySelectorAll('button')) {
          control.classList.toggle('cooling',cooldown>1e-8);
          text(control.querySelector('[data-dash-label]'),label);
        }
      }
    }

    const picker=node(game,'weapon-picker'),open=!!game.weaponPicker?.open;
    if(picker) {picker.hidden=!open;picker.setAttribute('aria-hidden',String(!open));}
    const options=node(game,'weapon-options');
    const selected=Math.max(0,Math.min(available.length-1,game.weaponPicker?.selected||0));
    const signature=available.join(',')+'|'+selected+'|'+weapon;
    if(open&&options&&signature!==s.pickerSignature) {
      const retainFocus=options.contains(root.document.activeElement);
      s.pickerSignature=signature;
      const fragment=root.document.createDocumentFragment();
      available.forEach((id,index)=>{
        const choice=root.document.createElement('button');choice.type='button';choice.className='weapon-option';
        choice.dataset.weapon=id;choice.setAttribute('aria-pressed',String(index===selected));
        choice.tabIndex=index===selected?0:-1;
        const title=root.document.createElement('strong');title.textContent=W.names?.[id]||names[id]||id;
        const detail=root.document.createElement('small');detail.textContent=descriptions[id]||'';
        choice.append(title,detail);
        choice.addEventListener('click',()=>{if(!game.weaponPicker?.open)return;game.weaponPicker.selected=index;sync(game);});
        fragment.append(choice);
      });
      options.replaceChildren(fragment);
      if(retainFocus)options.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
    }
    if(open&&!s.wasOpen)options?.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
    if(!open&&s.wasOpen)game.canvas?.focus({preventScroll:true});
    s.wasOpen=open;

    const ledger=node(game,'reward-log'), rewards=game.progression?.rewards||[];
    const rewardSignature=rewards.join(',');
    if(ledger&&rewardSignature!==s.rewardSignature) {
      s.rewardSignature=rewardSignature;
      const fragment=root.document.createDocumentFragment();
      if(!rewards.length) {
        const empty=root.document.createElement('p');empty.textContent='Hạ boss để mở vũ khí và kỹ năng, lưu cùng hành trình.';fragment.append(empty);
      } else rewards.forEach(level=>{
        const entry=root.document.createElement('span');entry.className='reward-entry';
        entry.textContent=level+' · '+(MM.BossManager?.rewards?.[level]?.name||'Phần thưởng');fragment.append(entry);
      });
      ledger.replaceChildren(fragment);
    }
  }
  MM.ProgressionUI={bind,sync};
  function petrified(p){return p.stunTime>0||p.petrifyTime>0||p.rollTime>0;}
})(typeof window!=='undefined'?window:globalThis);
