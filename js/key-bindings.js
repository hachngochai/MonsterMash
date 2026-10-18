/* Translate physical bindings before the shared tap/hold and weapon input rules. */
(function(root){
 'use strict';const MM=root.MM=root.MM||{};
 const defaults={left:'ArrowLeft',right:'ArrowRight',jump:'ArrowUp',shootLeft:'KeyA',shootRight:'KeyD',shield:'Space',weapon:'KeyF',aimHigh:'KeyW',aimGround:'KeyS',pause:'KeyP'};
 const names={left:'Đi trái',right:'Đi phải',jump:'Nhảy / nhảy cao',shootLeft:'Bắn trái',shootRight:'Bắn phải',shield:'Khiên / bất tử',weapon:'Đổi / giữ chọn vũ khí',aimHigh:'Bắn tầm cao',aimGround:'Bắn mặt đất',pause:'Tạm dừng'};
 const valid=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Space|ShiftLeft|ShiftRight|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Minus|Equal|Backquote)$/.test(code);
 const label=code=>({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'Space',ShiftLeft:'Shift trái',ShiftRight:'Shift phải',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',Minus:'−',Equal:'=',Backquote:'`'}[code]||code.replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num '));
 function swap(map,action,code){const other=Object.keys(defaults).find(key=>key!==action&&map[key]===code),old=map[action];map[action]=code;if(other)map[other]=old;return other;}
 function normalize(raw){
  const source=raw&&typeof raw==='object'?raw:{},desired=Object.fromEntries(Object.entries(defaults).map(([action,code])=>[action,valid(source[action])?source[action]:code]));
  if(new Set(Object.values(desired)).size===Object.keys(defaults).length)return desired;
  const result={...defaults};for(const action of Object.keys(defaults))if(valid(source[action]))swap(result,action,source[action]);return result;
 }
 function set(g,action,code){if(!Object.hasOwn(defaults,action)||!valid(code))return false;const map=normalize(g.settings.keyBindings);swap(map,action,code);g.settings.keyBindings=map;g.clearInputs();g.persist();sync(g);return true;}
 function translate(g,event,release=false){
  if(!release&&(event.ctrlKey||event.altKey||event.metaKey))return null;
  const map=normalize(g.settings.keyBindings),physical=event.code;
  let code=physical;
  if(g.weaponPicker?.open&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape'].includes(physical))code=physical;
  else{
   const action=Object.keys(defaults).find(key=>map[key]===physical);
   if(action){code=defaults[action];if(action==='aimHigh'&&MM.MapManager?.manualAim(g)!==true&&(map.aimHigh!==defaults.aimHigh||map.jump!==defaults.jump))code='Unbound:'+physical;}
   else if(physical==='Escape'||physical==='Enter'||physical==='Tab')code=physical;
   else if(physical==='KeyJ'&&map.shootLeft===defaults.shootLeft)code='KeyJ';
   else if(physical==='KeyL'&&map.shootRight===defaults.shootRight)code='KeyL';
   else code='Unbound:'+physical;
  }
  return {code,repeat:event.repeat,target:event.target,preventDefault:()=>event.preventDefault?.()};
 }
 function capture(g,event){
  if(!g.keyCapture)return false;event.preventDefault?.();
  if(event.repeat)return true;
  const status=g.ui?.['key-binding-status'];
  if(event.code==='Escape'){g.keyCapture=null;sync(g);if(status)status.textContent='Đã hủy đổi phím.';return true;}
  if(event.ctrlKey||event.altKey||event.metaKey||!valid(event.code)){if(status)status.textContent='Chọn một phím chữ, số, mũi tên, Space hoặc Shift. Esc để hủy.';return true;}
  const action=g.keyCapture;g.keyCapture=null;set(g,action,event.code);if(status)status.textContent=names[action]+': '+label(event.code)+' · Đã lưu. Phím trùng được hoán đổi.';return true;
 }
 function sync(g){
  if(g.headless||!g.ui)return;const map=normalize(g.settings.keyBindings),signature=JSON.stringify(map)+'|'+g.keyCapture;if(g.bindingUISignature===signature)return;g.bindingUISignature=signature;
  for(const button of root.document.querySelectorAll('[data-bind-action]')){const action=button.dataset.bindAction;button.textContent=g.keyCapture===action?'Nhấn phím…':label(map[action]);button.classList.toggle('recording',g.keyCapture===action);button.setAttribute('aria-label',names[action]+': '+button.textContent);}
  for(const node of root.document.querySelectorAll('[data-key-label]'))node.textContent=label(map[node.dataset.keyLabel]);
  const desc=`Đi: ${label(map.left)} / ${label(map.right)}. Nhảy: ${label(map.jump)}. Bắn: ${label(map.shootLeft)} / ${label(map.shootRight)}. Khiên: ${label(map.shield)}.`;
  if(g.ui['current-key-guide'])g.ui['current-key-guide'].textContent=desc+' Esc luôn tạm dừng; Enter xác nhận bảng vũ khí.';
  g.canvas?.setAttribute('aria-label','Sân chơi. '+desc);
  if(g.ui['shield-button'])g.ui['shield-button'].title=label(map.shield)+' hoặc vuốt xuống';
  if(g.ui['aim-high'])g.ui['aim-high'].textContent='↗ Tầm cao · '+label(map.aimHigh);
  if(g.ui['aim-ground'])g.ui['aim-ground'].textContent='→ Mặt đất · '+label(map.aimGround);
 }
 function bind(g){
  const grid=g.ui['key-binding-grid'];if(!grid)return;
  for(const action of Object.keys(defaults)){const row=root.document.createElement('div'),name=root.document.createElement('span'),button=root.document.createElement('button');row.className='key-binding-row';name.textContent=names[action];button.type='button';button.dataset.bindAction=action;button.addEventListener('click',()=>{g.clearInputs();g.keyCapture=action;sync(g);g.ui['key-binding-status'].textContent='Nhấn phím mới cho '+names[action]+'. Esc để hủy.';});row.append(name,button);grid.append(row);}
  g.ui['key-preset-apply']?.addEventListener('click',()=>{g.keyCapture=null;g.settings.keyBindings=g.ui['key-preset'].value==='wasd'?{...defaults,left:'KeyA',right:'KeyD',jump:'KeyW',shootLeft:'KeyJ',shootRight:'KeyL',aimHigh:'KeyI',aimGround:'KeyK'}:{...defaults};g.clearInputs();g.persist();sync(g);g.ui['key-binding-status'].textContent='Đã áp dụng và lưu bộ phím.';});
  g.ui['settings-dialog']?.addEventListener('close',()=>{g.keyCapture=null;sync(g);});sync(g);
 }
 MM.KeyBindings={defaults,names,normalize,label,set,translate,capture,bind,sync};
})(typeof window!=='undefined'?window:globalThis);
