/* Reward170: a held channel pays only for HP removed, before phase refills. */
(function(root){
  'use strict';
  const MM=root.MM=root.MM||{},EPS=1e-8;
  const fallback=Object.freeze({range:360,tickInterval:.35,damage:1,maxTargets:5,bosses:true});
  const cfg=()=>({...fallback,...MM.PredatorSeaConfig?.rewards?.lightningOrb});
  const amount=n=>Number.isFinite(n)?Math.max(0,n):0;
  // Combat modules use this at the subtraction itself. Measuring HP around a
  // whole hit would count a phase refill or shared-HP projection incorrectly.
  const DamageReceipt={
    subtract(enemy,damage,attack={}){
      const before=amount(enemy?.health);let loss=Math.min(before,amount(damage));
      if(attack.damageReceipt){
        const paid=amount(attack.damageReceipt.damage);
        if(Number.isFinite(attack.damageBudget))loss=Math.min(loss,Math.max(0,attack.damageBudget-paid));
        attack.damageReceipt.damage=paid+loss;
      }
      enemy.health=Math.max(0,before-loss);return loss;
    }
  };
  const eligible=e=>!!e&&!e.dead&&!e.retired&&e.health>EPS&&e.phase==='active'
    &&!e.intangible&&!e.bulletUntargetable&&!e.indestructible;
  const current=g=>MM.WeaponManager?.current(g)==='lightningOrb';
  const ready=g=>g.screen==='playing'&&!g.weaponPicker?.open&&current(g)&&g.player
    &&!(g.player.stunTime>0||g.player.petrifyTime>0||g.player.rollTime>0||g.rollSlash?.time>0)
    &&(!MM.UnderwaterMode||MM.UnderwaterMode.canAttack(g))&&g.player.ammo>EPS;
  const origin=(g,dir)=>({x:g.player.x+dir*(g.player.w/2+16),y:g.player.y-g.player.h*.52});
  function state(g){return g.lightningOrb||(g.lightningOrb={active:false,dir:1,cooldown:0,targets:[],origin:null,age:0});}
  function reset(g){g.lightningOrb={active:false,dir:g.player?.dir||1,cooldown:0,targets:[],origin:null,age:0};return g.lightningOrb;}
  function stop(g){const s=state(g);s.active=false;s.targets.length=0;s.origin=null;s.age=0;}
  function targets(g,dir){
    const c=cfg(),o=origin(g,dir),seen=new Set();
    return (g.enemies||[]).filter(e=>{
      if(seen.has(e)||!eligible(e)||(!c.bosses&&e.boss))return false;seen.add(e);
      const x=e.x,y=e.y-e.h*.5;
      return (x-o.x)*dir>=-e.w*.5&&Math.hypot(x-o.x,y-o.y)<=c.range+Math.max(e.w,e.h)*.25;
    }).sort((a,b)=>Math.hypot(a.x-o.x,a.y-a.h*.5-o.y)-Math.hypot(b.x-o.x,b.y-b.h*.5-o.y))
      .slice(0,c.maxTargets);
  }
  function darkReady(g){return MM.SkillManager?.enabled?.(g,40)===true&&g.skillState?.darkReady===true;}
  function pulse(g,dir){
    const s=state(g),c=cfg();let empowered=darkReady(g),used=false,spent=0;
    const candidates=targets(g,dir);s.targets=[];
    for(const e of candidates){
      if(g.screen!=='playing'||g.player.ammo<=EPS)break;
      const receipt={damage:0},damage=c.damage*(empowered?2:1);
      const attack={kind:'lightningOrb',weaponId:'lightningOrb',dir,damageBudget:g.player.ammo,damageReceipt:receipt};
      g.dealEnemyDamage?.(e,damage,attack);
      const loss=Math.min(g.player.ammo,amount(receipt.damage));
      if(loss<=EPS)continue;
      // Darken is consumed by exactly one successful unit, never a blocked ray.
      if(empowered){MM.SkillManager?.consumeDamage?.(g,c.damage);empowered=false;}
      g.player.ammo=Math.max(0,g.player.ammo-loss);spent+=loss;used=true;
      if(eligible(e))s.targets.push(e);
    }
    if(used){g.sound?.play('shot');g.updateAmmoUI?.();}
    // No damage means no spending; a channel can remain lit while an immune
    // boss changes form, but there are no misleading target rays on that tick.
    return {used,spent};
  }
  function fire(g,direction){
    const s=state(g),dir=direction<0?-1:1,c=cfg();
    if(!ready(g)){stop(g);return false;}
    if(!s.active&&g.player.shotTimer>EPS)return false;
    s.active=true;s.dir=dir;s.origin=origin(g,dir);g.player.dir=dir;g.player.weaponMode='lightningOrb';g.player.aimAngle=null;
    if(s.cooldown<=EPS){
      pulse(g,dir);s.cooldown=c.tickInterval;
      g.player.shotTimer=g.player.shotCooldown=c.tickInterval;
      if(g.player.ammo<=EPS)stop(g);
    }
    return true;
  }
  function update(g,dt,direction=0){
    const s=state(g);if(g.screen!=='playing'||g.weaponPicker?.open){stop(g);return;}
    dt=amount(dt);s.cooldown=Math.max(0,s.cooldown-dt);
    if(!direction||!ready(g)){stop(g);return;}
    s.age+=dt;s.targets=s.targets.filter(eligible);
    fire(g,direction);
    if(s.active)s.origin=origin(g,s.dir);
  }
  MM.DamageReceipt=DamageReceipt;
  MM.LightningOrbWeapon={config:fallback,state,reset,stop,eligible,targets,fire,update};
})(typeof window!=='undefined'?window:globalThis);
