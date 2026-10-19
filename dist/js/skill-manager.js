/* Permanent boss skills, with combat-only clocks and separate map policy. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const EPS = 1e-8;
  const config = Object.freeze({doubleTap:.28, immortalDuration:12, immortalCost:2,
    immortalRequired:3, highJumpHeight:1.8, gravity:1420, jumpSpeed:610,
    darkInterval:5, lifeKills:10, petrifyInterval:8, petrifyDuration:2});
  const active = g => g.screen === 'playing';
  const frozen = e => (e?.petrifiedTime || 0) > EPS;
  function progression(g) {
    const p = g.save ? (g.save.progression ||= {}) : (g.progression ||= {});
    if (!Array.isArray(p.rewards)) p.rewards = [];
    if (!Number.isInteger(p.lifeKills) || p.lifeKills < 0) p.lifeKills = 0;
    p.lifeKills %= config.lifeKills;
    return p;
  }
  function suppressed(g) {
    if (typeof MM.MapManager?.suppressed === 'function') return MM.MapManager.suppressed(g);
    if (typeof MM.MapManager?.skillsEnabled === 'function') return !MM.MapManager.skillsEnabled(g);
    return g.level?.id === 70;
  }
  function enabled(g, level) { return !suppressed(g) && progression(g).rewards.includes(level); }
  function init(g) {
    progression(g);
    g.skillState = {clock:0,darkClock:0,darkReady:false,petrifyClock:0,
      shieldTapAt:-Infinity,shieldTapInitial:0,shieldTapSpent:0,
      jumpTapAt:-Infinity,jumpEligible:false,jumpStartY:0,jumpBoosted:false,
      highJumpPending:false,killSeen:new WeakSet()};
    if (g.player) g.player.immortalTime = 0;
    return g.skillState;
  }
  function state(g) { return g.skillState || init(g); }
  function reset(g) {
    // Lifesteal progress is stored in the save; these clocks belong to one fight.
    const s = init(g);
    for (const e of g.enemies || []) e.petrifiedTime = 0;
    return s;
  }
  function eligible(e) {
    return !!e && !e.dead && !e.retired && e.health > 0 && !e.boss && !e.petrifyImmune &&
      e.phase === 'active' && !e.bulletUntargetable && !e.intangible && !frozen(e);
  }
  function petrify(g) {
    const pool = (g.enemies || []).filter(eligible);
    if (!pool.length) return null;
    const random = g.random?.() ?? Math.random();
    const e = pool[Math.max(0, Math.min(pool.length - 1, Math.floor(random * pool.length)))];
    e.petrifiedTime = config.petrifyDuration;
    g.burst?.(e.x,e.y-e.h*.5,'#c7c5bd',14,'ring');
    g.floating?.(e.x,e.y-e.h-10,'HÓA ĐÁ · 2 GIÂY','#e2dfd3');
    return e;
  }
  function update(g, dt) {
    if (!active(g)) return;
    dt = Math.max(0, Number.isFinite(dt) ? dt : 0);
    const s = state(g); s.clock += dt;
    if (g.player) {
      g.player.immortalTime = Math.max(0,(g.player.immortalTime || 0)-dt);
      if (g.player.immortalTime < EPS) g.player.immortalTime = 0;
    }
    for (const e of g.enemies || []) if (frozen(e)) {
      e.petrifiedTime = Math.max(0,e.petrifiedTime-dt);
      if (e.petrifiedTime < EPS) e.petrifiedTime = 0;
    }
    if (enabled(g,40)) {
      s.darkClock += dt;
      if (s.darkClock + EPS >= config.darkInterval) {
        s.darkClock = Math.max(0,s.darkClock-Math.floor((s.darkClock+EPS)/config.darkInterval)*config.darkInterval);
        s.darkReady = true;
      }
    }
    if (enabled(g,100)) {
      s.petrifyClock += dt;
      if (s.petrifyClock + EPS >= config.petrifyInterval) {
        s.petrifyClock = Math.max(0,s.petrifyClock-Math.floor((s.petrifyClock+EPS)/config.petrifyInterval)*config.petrifyInterval);
        petrify(g);
      }
    }
  }
  function consumeDamage(g, base) {
    const s = state(g);
    if (enabled(g,40) && s.darkReady) { s.darkReady = false; return base * 2; }
    return base;
  }
  function onKill(g, e) {
    if (!e || typeof e !== 'object' || e.retired || e.bulletUntargetable || e.spiderling ||
        !(e.dead || e.health <= 0) || !enabled(g,50)) return false;
    const s = state(g);
    if (s.killSeen.has(e)) return false;
    s.killSeen.add(e);
    const p = progression(g); p.lifeKills++;
    if (p.lifeKills >= config.lifeKills) {
      p.lifeKills = 0;
      const player = g.player, health = player.health;
      player.health = Math.min(player.maxHealth,player.health+1);
      if (player.health > health) {
        g.floating?.(player.x,player.y-player.h-12,'HÚT MÁU · +1 HP','#e8a9b5');
        g.sound?.play('health');
      }
    }
    g.persist?.();g.updateUI?.();
    return true;
  }
  function shieldTap(g) {
    if (!active(g)) return false;
    const s=state(g),p=g.player, now=s.clock;
    if ((p.immortalTime || 0)>EPS) return false;
    const second = enabled(g,20) && now-s.shieldTapAt <= config.doubleTap+EPS &&
      s.shieldTapInitial >= config.immortalRequired;
    if (second) {
      const remaining=config.immortalCost-s.shieldTapSpent;
      s.shieldTapAt=-Infinity;
      if (g.shieldCount < remaining) return false;
      g.shieldCount-=remaining;
      p.immortalTime=config.immortalDuration;
      // The first tap is a regular shield immediately. Its charge is included
      // in the two-charge conversion, so the gesture cannot double charge.
      p.shieldTime=0;p.shieldHits=0;
      g.burst?.(p.x,p.y-p.h*.5,'#e8d792',24,'ring');
      g.sound?.play('shield');g.toast?.('Khiên Bất Tử · 12 giây');g.updateUI?.();
      return true;
    }
    s.shieldTapAt=now;s.shieldTapInitial=g.shieldCount;
    const before=g.shieldCount,activated=g.activateShield?.()===true;
    s.shieldTapSpent=Math.max(0,before-g.shieldCount);
    return activated;
  }
  function jumpTap(g) {
    if (!active(g)) return false;
    const s=state(g),p=g.player;
    if (p.stunTime>0 || p.petrifyTime>0 || p.rollTime>0 || g.rollSlash?.time>0) return false;
    const second=enabled(g,30) && s.jumpEligible && !s.jumpBoosted && s.clock-s.jumpTapAt <= config.doubleTap+EPS;
    if (second) {
      s.jumpBoosted=true;s.jumpTapAt=-Infinity;
      if (p.grounded && p.jumpBuffer>0) s.highJumpPending=true;
      else if (!p.grounded) {
        const gravity=MM.AbyssCombat?.gravityDirection(g)||1,height=Math.max(0,(s.jumpStartY-p.y)*gravity);
        const target=config.jumpSpeed**2/(2*config.gravity)*config.highJumpHeight;
        p.vy=-gravity*Math.sqrt(Math.max(0,2*config.gravity*(target-height)));
        p.jumpBuffer=0;
      } else return false;
      g.burst?.(p.x,p.y,'#d9edba',10,'ring');
      return true;
    }
    s.jumpTapAt=s.clock;
    if (p.grounded) s.jumpBoosted=false;
    s.jumpEligible=!!(p.grounded || p.coyote>0) && !s.jumpBoosted;
    if (s.jumpEligible) { s.jumpStartY=p.y;s.highJumpPending=false; }
    g.jump?.();return true;
  }
  function jumpVelocity(g, base=-config.jumpSpeed) {
    const s=state(g), high=s.highJumpPending && enabled(g,30);
    s.highJumpPending=false;
    return high ? base*Math.sqrt(config.highJumpHeight) : base;
  }
  MM.SkillManager={config,init,reset,enabled,update,consumeDamage,onKill,shieldTap,jumpTap,jumpVelocity,frozen,eligible};
})(typeof window!=='undefined'?window:globalThis);
