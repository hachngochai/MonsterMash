/* The ancient Chimera and its three crowned heirs. Combat clocks stop on pause. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {}, W = 960, GROUND = 438, EPS = 1e-8;
  const TYPES = ['lion', 'medusa', 'goatman', 'chimera'];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const kind = e => e?.archetype || e?.type;
  const accepts = e => TYPES.includes(kind(e));
  const alive = e => e && !e.dead && e.health > 0;
  const pressure = (g, e) => g.getPressure?.(e) || {attackRate:1, moveRate:1, warningFloor:.9};
  const warning = (g, e, n = .9) => Math.max(pressure(g,e).warningFloor || .9, n);
  const overlaps = (p,z) => Math.abs(p.x-z.x)<(p.w*.75+z.w)/2 && p.y>z.y-z.h && p.y-p.h*.86<z.y;
  const activeShield = g => g.player.shieldTime > EPS && g.player.shieldHits > 0;
  const flightY = (g,e) => Math.min(GROUND-54,Math.max(235,(g.viewTop||0)+e.h*1.2+68));

  function setup(g,e) {
    if (!accepts(e)) return;
    g.mythicZones ||= []; g.mythicShots ||= [];
    e.baseW ||= e.w; e.baseH ||= e.h;
    e.mythicClock = 0; e.mythicTime = 0; e.mythicActions = []; e.mythicState = 'ground'; e.mythicProgress = 0;
    e.mythicAir = false; e.mythicAirTriggered = false; e.mythicSplit = false;
    // The parent chooses one phase-appropriate skill per four-second cast slot.
    // Its crowned heirs keep their separate attack and special-skill clocks.
    e.nextSkillAt = 4;
    e.nextAttackAt = kind(e)==='medusa' ? 5 : 1.8; e.nextSummonAt = 10;
    e.nextClawAt = 6; e.nextShieldAt = 8; e.mythicShieldUntil = 0;
    e.mythicContactAt = 0; e.mythicShield = false; e.mythicWarning = null;
    e.y = GROUND;
    if (kind(e)==='chimera') e.encounter = e.encounter || {damage:0, totalDamage:0, forms:[], parent:e};
  }
  function clearOwn(g,e) {
    g.mythicZones = (g.mythicZones || []).filter(z=>z.owner!==e);
    g.mythicShots = (g.mythicShots || []).filter(s=>s.owner!==e);
    e.mythicActions = []; e.mythicWarning = null; e.skillWarning = null;
    e.tell = e.charging = false;
  }
  function retire(g,e) {
    clearOwn(g,e); e.dead = true; e.retired = true; e.health = 0;
  }
  function cleanup(g,e) {
    if (!accepts(e)) return;
    clearOwn(g,e); e.intangible = false; e.mythicShield = false;
    for (const minion of g.enemies) if (minion.ownerBoss===e) retire(g,minion);
    g.enemies = g.enemies.filter(other=>other.ownerBoss!==e);
    if (g.player && !g.enemies.some(other=>other!==e && alive(other) && kind(other)==='chimera' && other.mythicAir)) g.player.weaponMode='normal';
  }
  function effect(g,spec) {
    if (g.applyCombatEffect) return g.applyCombatEffect(spec);
    // Standalone previews can omit Game's common status adapter.
    const shield=activeShield(g);
    if (shield || spec.damage>0) g.hurt?.(spec);
    if (!shield && spec.petrify>0) {
      g.player.petrifyTime=Math.max(g.player.petrifyTime||0,spec.petrify);
      g.player.stunTime=Math.max(g.player.stunTime||0,spec.petrify); g.clearInputs?.();
    }
    if (!shield && spec.knockup) {g.player.vy=spec.knockup;g.player.grounded=false;}
    return !shield;
  }
  function award(g,e,amount) {
    const encounter=e.encounter;
    if (!encounter || amount<=0) return;
    encounter.damage += amount; encounter.totalDamage += amount;
    while(encounter.damage>=10) {
      encounter.damage-=10;
      if(g.shieldCount<3) {
        g.shieldCount++;
        g.floating?.(g.player.x,g.player.y-g.player.h-15,'10 MÁU CHIMERA · +1 KHIÊN','#bcebd6');
        g.sound?.play('shield');
      }
    }
    g.updateUI?.();
  }
  function action(g,e,type,seconds,zone,spec={}) {
    const a={owner:e,kind:type,elapsed:0,startAt:e.mythicTime,warning:seconds,duration:seconds+.22,hit:false,...spec};
    if(zone) {
      const z={owner:e,kind:type,phase:'warning',timer:seconds,total:seconds,hitPlayer:false,...zone};
      a.zone=z;g.mythicZones.push(z);
    }
    e.mythicActions.push(a);
    if(g.mythicZones.length>48)g.mythicZones.splice(0,g.mythicZones.length-48);
    return a;
  }
  function windup(g,e,type,label,zone,seconds,extra) {
    const a=action(g,e,type,warning(g,e,seconds),zone,extra);
    a.label=label; e.dir=Math.sign(g.player.x-e.x)||e.dir;return a;
  }
  function targetZone(g,width,height=85) {return {x:clamp(g.player.x,30,W-30),y:GROUND,w:width,h:height};}
  function laser(g,e) {
    const x1=e.x,y1=e.y-e.h*.62,x2=g.player.x,y2=g.player.y-g.player.h*.4;
    windup(g,e,'laser','CHIMERA · TIA HỦY DIỆT',{x:(x1+x2)/2,y:Math.max(y1,y2)+18,w:Math.abs(x2-x1)+50,h:Math.abs(y2-y1)+36,x1,y1,x2,y2},1.1,{damage:1});
  }
  function pounce(g,e,crowned=false) {
    const a=windup(g,e,crowned?'claw':'bite',crowned?'SƯ TỬ VƯƠNG · NHẢY CÀO':'CHIMERA · NHẢY CẮN',targetZone(g,crowned?170:190),.95,{damage:2});
    a.startX=e.x;a.targetX=a.zone.x;a.leap=.55;a.duration=a.warning+a.leap+.2;
    if(!crowned)Object.assign(a.zone,{facing:e.dir,attackElapsed:0,attackWindup:a.warning,attackLeap:a.leap,attackDuration:a.duration});
  }
  function spear(g,e) {
    const near=Math.abs(g.player.x-e.x)<e.w/2+90;
    windup(g,e,near?'stab':'spear',near?'SƯ TỬ · ĐÂM GIÁO':'SƯ TỬ · PHÓNG GIÁO',near?targetZone(g,e.mythicCrowned?200:112,90):null,.9,{damage:1,targetX:g.player.x,targetY:g.player.y-g.player.h*.5});
  }
  function axe(g,e) {
    windup(g,e,'axe','GOATMAN · BỔ RÌU',targetZone(g,e.mythicCrowned?225:135,100),1.05,{damage:e.mythicCrowned?2:1});
  }
  function gaze(g,e) {
    windup(g,e,'petrify','MEDUSA · HÓA ĐÁ · BẬT KHIÊN',{x:W/2,y:GROUND,w:W,h:GROUND},1.05,{damage:0,petrify:1.5,guaranteed:true});
  }
  function roar(g,e) {
    const third=clamp(Math.floor(g.player.x/(W/3)),0,2);
    windup(g,e,'roar','CHIMERA · HỎA PHONG · RỜI VÙNG ĐỎ',{x:third*W/3+W/6,y:GROUND,w:W/3,h:GROUND},1.55,{damage:1,burn:2,knockup:-620});
  }
  function swoop(g,e) {
    const a=windup(g,e,'swoop','CHIMERA KHÓA MỤC TIÊU · BẬT KHIÊN',targetZone(g,100),1.1,{damage:2,guaranteed:true});
    a.startX=e.x;a.startY=e.y;a.leap=.55;a.duration=a.warning+a.leap+.55;
  }
  function rise(g,e) {
    clearOwn(g,e); e.mythicAirTriggered=e.mythicAir=true;e.health=e.maxHealth;
    e.mythicClock=0;e.nextSkillAt=4;e.intangible=true;
    const a=action(g,e,'rise',0,null,{duration:1.2,startY:e.y,label:'CHIMERA TUNG CÁNH · HỒI ĐẦY MÁU'});
    e.mythicState='rise';e.mythicProgress=0;g.player.weaponMode='highAim';g.player.shotTimer=0;
    g.burst?.(e.x,e.y-e.h*.5,'#f1be80',30,'ring');g.updateUI?.();
    return a;
  }
  function split(g,e) {
    clearOwn(g,e);e.mythicSplit=true;e.mythicAir=false;
    const definitions=[['lionMan','crowned',30,210],['medusa','queen',20,480],['goatman','radiant',40,750]];
    const encounter=e.encounter;
    for(const [type,variant,health,x] of definitions) {
      const form=g.spawn(type,x<W/2?-1:1);
      Object.assign(form,{archetype:type==='lionMan'?'lion':type,variant,boss:true,minion:false,phase:'active',warning:0,
        w:76,h:108,baseW:76,baseH:108,x,y:GROUND,health,maxHealth:health,
        encounter,mythicCrowned:true,score:450,chimeraForm:true,abilityState:'ground'});
      setup(g,form);form.encounter=encounter;form.mythicCrowned=true;form.chimeraForm=true;
      encounter.forms.push(form);
    }
    // Retire only after all heirs are present; no kill, score or completion event.
    retire(g,e);g.player.weaponMode='normal';g.player.aimAngle=null;
    g.floating?.(W/2,170,'CHIMERA PHÂN HÓA · BA VƯƠNG THÚ','#edcc9d');
    g.sound?.play('roar');g.updateUI?.();
  }
  function hit(g,e,damage=1) {
    if(!accepts(e))return null;
    if(g.screen!=='playing'||!alive(e)||e.intangible||e.mythicShield)return false;
    if(!e.mythicActions)setup(g,e);
    const amount=Number.isFinite(damage)?Math.max(1,Math.trunc(damage)):1;
    const applied=Math.min(e.health,amount);e.health=Math.max(0,e.health-amount);award(g,e,applied);
    if(kind(e)==='chimera'&&e.boss) {
      if(!e.mythicAirTriggered&&e.health<=e.maxHealth/2)rise(g,e);
      else if(e.mythicAir&&e.health<=10&&!e.mythicSplit)split(g,e);
    }
    return true;
  }
  function shot(g,e,type,targetX,targetY) {
    const x=e.x+e.dir*e.w*.35,y=e.y-e.h*.6;
    const angle=Math.atan2(targetY-y,targetX-x),speed=360;
    if(g.mythicShots.length>=48)g.mythicShots.shift();
    g.mythicShots.push({owner:e,kind:type,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,w:38,h:10,rotation:angle,life:4,damage:1});
  }
  function summon(g,e) {
    const old=g.enemies.filter(other=>alive(other)&&other.ownerBoss===e);
    for(const child of old.slice(0,Math.max(0,old.length+1-6)))retire(g,child);
    const minion=g.spawn('medusa',e.dir===1?-1:1);
    Object.assign(minion,{ownerBoss:e,minion:true,warning:.8,x:clamp(e.x+e.dir*100,30,W-30),summonLife:28});
    g.burst?.(minion.x,GROUND-25,'#c7e59f',14,'ring');
  }
  function lineHit(p,z) {
    // Match the visible beam, rather than its much larger bounding rectangle.
    const px=p.x,py=p.y-p.h*.45,dx=z.x2-z.x1,dy=z.y2-z.y1;
    const t=clamp(((px-z.x1)*dx+(py-z.y1)*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(px-z.x1-t*dx,py-z.y1-t*dy)<p.w*.45+17;
  }
  function impact(g,e,a) {
    if(a.hit)return;
    a.hit=true;
    if(a.kind==='spear'){shot(g,e,'spear',a.targetX,a.targetY);return;}
    const z=a.zone;
    if(z) {z.phase='impact';z.timer=.22;z.hitPlayer=true;}
    const contact=a.guaranteed||(a.kind==='laser'?lineHit(g.player,z):z&&overlaps(g.player,z));
    if(contact) effect(g,{owner:e,x:e.x,kind:'mythic-'+a.kind,damage:a.damage??1,petrify:a.petrify||0,burn:a.burn||0,
      knockup:a.knockup||0,forceHit:!!a.guaranteed});
    g.burst?.(z?.x??e.x,GROUND-14,a.kind==='petrify'?'#bfcebb':'#f4bc87',12,'ring');
    if(a.kind==='bite'||a.kind==='claw')g.sound?.play('roar');
  }
  function updateActions(g,e,dt) {
    let visual=null;
    for(const a of e.mythicActions) {
      // Creation happens after this frame's clock advance. A new warning must
      // receive its full duration instead of losing one frame immediately.
      a.elapsed=Math.max(0,e.mythicTime-a.startAt);
      if(a.kind==='rise') {
        const t=clamp(a.elapsed/a.duration,0,1);e.y=GROUND+(flightY(g,e)-GROUND)*t;e.mythicProgress=t;
        if(a.elapsed+EPS>=a.duration){e.intangible=false;e.mythicClock=0;e.mythicState='air';}
      } else {
        const leap=a.leap||0;
        if(a.zone){a.zone.timer=Math.max(0,a.warning-a.elapsed);a.zone.phase=a.elapsed+EPS>=a.warning+leap?'impact':'warning';}
        if(a.kind==='bite'&&a.zone)a.zone.attackElapsed=a.elapsed;
        if(leap&&a.elapsed>=a.warning) {
          const t=clamp((a.elapsed-a.warning)/leap,0,1);
          if(a.kind==='swoop') {
            const returning=a.elapsed>a.warning+leap;
            if(!returning) {
              e.x=a.startX+(g.player.x-a.startX)*t;e.y=a.startY+(GROUND-a.startY)*t;
              a.zone.x=g.player.x;
            }else{const up=clamp((a.elapsed-a.warning-leap)/.55,0,1);e.y=GROUND+(flightY(g,e)-GROUND)*up;}
          }else{e.x=a.startX+(a.targetX-a.startX)*t;e.y=GROUND-Math.sin(Math.PI*t)*155;}
        }
        if(a.elapsed+EPS>=a.warning+leap)impact(g,e,a);
      }
      if(a.elapsed<a.duration-EPS)visual=a;
      else if(a.zone)a.zone.expired=true;
    }
    e.mythicActions=e.mythicActions.filter(a=>a.elapsed<a.duration-EPS);
    if(visual) {
      e.mythicState=visual.kind+(visual.elapsed<visual.warning?'-windup':'');
      e.mythicProgress=clamp(visual.elapsed/visual.duration,0,1);e.tell=visual.elapsed<visual.warning;
      e.mythicWarning={name:visual.label||'CHIMERA',remaining:Math.max(0,visual.warning-visual.elapsed),total:visual.warning||visual.duration};
    }else {e.mythicState=e.mythicAir?'air':'ground';e.tell=false;e.mythicWarning=null;}
    if(e.mythicShield) e.mythicWarning={name:'GOATMAN HUY HOÀNG · KHIÊN KHÁNG ĐẠN',remaining:Math.max(0,e.mythicShieldUntil-e.mythicClock),total:2};
    e.skillWarning=e.mythicWarning;e.charging=e.mythicActions.some(a=>a.leap&&a.elapsed>=a.warning);
  }
  function updateEntity(g,e,dt) {
    if(!e.mythicActions)setup(g,e);
    e.mythicTime+=dt;
    if(e.ownerBoss) {
      e.summonLife-=dt;
      if(!alive(e.ownerBoss)||e.summonLife<=0){retire(g,e);return;}
    }
    const rising=e.mythicActions.some(a=>a.kind==='rise');
    if(!rising)e.mythicClock+=dt;
    if(kind(e)==='chimera') {
      if(!rising) {
        if(e.mythicAir) {
          if(!e.mythicActions.some(a=>a.kind==='swoop')){const margin=Math.max(110,e.w*.6);e.x=clamp(e.x+Math.sin(e.mythicClock*.85)*dt*22,margin,W-margin);e.y=flightY(g,e)+Math.sin(e.mythicClock*2)*8;}
        }else {
          if(!e.mythicActions.some(a=>a.leap))e.y=GROUND;
        }
        if(e.mythicClock+EPS>=e.nextSkillAt&&!e.mythicActions.length) {
          e.nextSkillAt=e.mythicClock+4;
          const sample=clamp(Number(g.random?.()??Math.random())||0,0,1);
          if(e.mythicAir)sample<.5?roar(g,e):swoop(g,e);
          else sample<.5?laser(g,e):pounce(g,e);
        }
      }
    }else {
      const rates=pressure(g,e),distance=g.player.x-e.x;
      e.dir=Math.sign(distance)||e.dir;
      const standOff=kind(e)==='lion'?e.w/2+58:kind(e)==='medusa'?e.w/2+90:e.w/2+38;
      if(!e.mythicActions.length&&Math.abs(distance)>standOff) e.x=clamp(e.x+e.dir*Math.min(Math.abs(distance)-standOff,e.speed*(rates.moveRate||1)*dt),e.w/2,W-e.w/2);
      if(!e.mythicActions.some(a=>a.leap))e.y=GROUND;
      if(e.mythicClock+EPS>=e.nextAttackAt) {
        if(kind(e)==='medusa'){e.nextAttackAt+=5;gaze(g,e);}
        else if(kind(e)==='lion'){e.nextAttackAt=e.mythicClock+3.5/(rates.attackRate||1);spear(g,e);}
        else if(Math.abs(distance)<e.w/2+120){e.nextAttackAt=e.mythicClock+3.5/(rates.attackRate||1);axe(g,e);}
      }
      if(kind(e)==='medusa'&&overlaps(g.player,{x:e.x,y:e.y,w:e.w*.8,h:e.h*.85})&&e.mythicClock+EPS>=e.mythicContactAt) {
        e.mythicContactAt=e.mythicClock+2.5;
        effect(g,{owner:e,x:e.x,kind:'mythic-medusa-contact',damage:0,petrify:1.5,forceHit:true});
      }
      if(e.mythicCrowned) {
        if(kind(e)==='lion'&&e.mythicClock+EPS>=e.nextClawAt){e.nextClawAt+=6;pounce(g,e,true);}
        if(kind(e)==='medusa'&&e.mythicClock+EPS>=e.nextSummonAt){e.nextSummonAt+=10;summon(g,e);}
        if(kind(e)==='goatman') {
          if(e.mythicClock+EPS>=e.nextShieldAt){e.nextShieldAt+=8;e.mythicShieldUntil=e.mythicClock+2;g.burst?.(e.x,e.y-e.h*.5,'#eacb91',18,'ring');}
          e.mythicShield=e.mythicClock<e.mythicShieldUntil-EPS;
        }
      }
    }
    updateActions(g,e,dt);
  }
  function shotHits(p,s,previousX,previousY) {
    const minX=p.x-(p.w*.75+s.w)/2,maxX=p.x+(p.w*.75+s.w)/2;
    const minY=p.y-p.h*.86-s.h/2,maxY=p.y+s.h/2;
    const dx=s.x-previousX,dy=s.y-previousY;
    let lo=0,hi=1;
    for(const [start,d,min,max] of [[previousX,dx,minX,maxX],[previousY,dy,minY,maxY]]) {
      if(Math.abs(d)<EPS){if(start<min||start>max)return false;continue;}
      const a=(min-start)/d,b=(max-start)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
      if(lo>hi)return false;
    }
    return true;
  }
  function update(g,dt) {
    if(g.screen!=='playing')return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
    g.mythicZones ||= [];g.mythicShots ||= [];
    for(const e of g.enemies.slice()) {
      if(alive(e)&&accepts(e)&&e.phase==='active'&&!(e.petrifiedTime>EPS))updateEntity(g,e,dt);
      if(g.screen!=='playing')break;
    }
    g.mythicZones=g.mythicZones.filter(z=>!z.expired&&alive(z.owner));
    if(g.screen!=='playing')return;
    for(const s of g.mythicShots) {
      if(!alive(s.owner)){s.life=0;continue;}
      const x=s.x,y=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.life>0&&shotHits(g.player,s,x,y)) {effect(g,{owner:s.owner,x:s.x,kind:'mythic-'+s.kind,damage:s.damage});s.life=0;}
      if(g.screen!=='playing')break;
    }
    g.mythicShots=g.mythicShots.filter(s=>s.life>0&&s.x>-60&&s.x<W+60&&s.y>-60&&s.y<GROUND+80);
  }
  MM.MythicCombat={setup,update,hit,cleanup};
})(typeof window!=='undefined'?window:globalThis);
