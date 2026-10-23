/* Reward160. One ten-second transformation per level entry, never a saved timer. */
(function(root){
  'use strict';const MM=root.MM=root.MM||{},EPS=1e-8;
  const underwater=g=>MM.UnderwaterMode?.active(g)===true;
  const active=g=>underwater(g)&&(g.merfolk?.remaining||0)>EPS;
  function reset(g){g.merfolk={remaining:0,used:false};if(g.player)g.player.merfolkTime=0;}
  function stop(g){if(g.merfolk)g.merfolk.remaining=0;if(g.player)g.player.merfolkTime=0;}
  function activate(g){
    if(g.screen!=='playing'||g.weaponPicker?.open||!underwater(g)||MM.MapManager?.suppressed(g)
      ||!MM.SaveManager?.unlocked(g,160))return false;
    if(!g.merfolk)reset(g);if(g.merfolk.used||active(g))return false;
    g.merfolk.used=true;g.merfolk.remaining=10;g.player.merfolkTime=10;
    // Existing stuns, silence, shields and the real oxygen amount stay intact.
    if(g.underwater){g.underwater.suffocationTime=0;g.underwater.damageClock=0;}
    MM.UnderwaterMode?.oxygenChanged(g);
    MM.UnderwaterMode?.bubbleBurst(g,g.player.x,g.player.y-g.player.h*.5);
    g.toast?.('HÓA NGƯ NHÂN · 10 giây · Boss vẫn gây sát thương');g.sound?.play('shield');g.updateUI?.();return true;
  }
  // Return exactly the protected part of this simulation step, including the
  // final partial frame. Oxygen then consumes only the remaining active time.
  function advance(g,dt){
    if(!active(g))return 0;
    const elapsed=Math.min(Math.max(0,dt),g.merfolk.remaining);
    g.merfolk.remaining=Math.max(0,g.merfolk.remaining-elapsed);
    if(g.merfolk.remaining<EPS)g.merfolk.remaining=0;
    g.player.merfolkTime=g.merfolk.remaining;return elapsed;
  }
  function protectsHP(g,spec={}){
    if(!active(g))return false;
    const owner=spec.owner||spec.source||spec;
    // Boss-owned summons remain boss attacks; an unlabelled environmental
    // effect cannot accidentally inherit ordinary-enemy HP immunity.
    if(spec.sourceBoss===true||owner.boss||owner.summonOwner?.boss||owner.projectionOwner?.boss)return false;
    return spec.sourceBoss===false||!!spec.owner||!!spec.ordinaryEnemy;
  }
  MM.MerfolkTransformation={reset,stop,activate,advance,active,protectsOxygen:active,protectsHP};
})(typeof window!=='undefined'?window:globalThis);
