/* V3 tap/hold interpretation shared by keyboard and touch controls. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const DOUBLE = .36, TOUCH_DOUBLE = .42, HOLD = .35, DASH_BUFFER = .14;
  const enabled = g => MM.MapManager?.skillsEnabled ? MM.MapManager.skillsEnabled(g) : g.level?.id !== 70;
  const unlocked = (g, level) => !!MM.SaveManager?.unlocked?.(g, level);
  const now = g => g.inputState?.clock || 0;
  const dashPhase = g => g.screen === 'playing' && g.level?.id === 70 && !g.weaponPicker?.open
    && (MM.MapManager?.bloodMoon ? MM.MapManager.bloodMoon(g) : (g.enemies || []).some(enemy =>
      enemy.boss && !enemy.dead && enemy.health > 0 && enemy.archetype === 'werewolf' && enemy.bloodMoon))
    && !(g.enemies || []).some(enemy => enemy.boss && !enemy.dead && enemy.health > 0
      && enemy.archetype === 'werewolf' && enemy.bloodMoon && enemy.wolfState === 'transform');
  const InputManager = {
    doubleWindow:DOUBLE, touchDoubleWindow:TOUCH_DOUBLE, holdWindow:HOLD, dashBufferWindow:DASH_BUFFER,
    init(g) {
      g.inputState = {clock:0, lastDir:0, lastDirAt:-Infinity, lastDirStamp:null, lastDirSource:null,
        pendingDash:null, weaponHeld:false, weaponDownAt:0, holdOpened:false};
      g.weaponPicker = {open:false, selected:0};
    },
    reset(g) {
      const state = g.inputState;
      if (!state) return;
      state.lastDir = 0; state.lastDirAt = -Infinity;
      state.lastDirStamp = null; state.lastDirSource = null; state.pendingDash = null;
      state.weaponHeld = false; state.holdOpened = false;
    },
    directionTap(g, direction, options = {}) {
      const dir = direction < 0 ? -1 : 1;
      if (g.weaponPicker?.open) { this.navigate(g, dir); return true; }
      if (g.screen !== 'playing') return false;
      if (!g.inputState) this.init(g);
      const state = g.inputState;
      const source = options.source === 'touch' ? 'touch' : 'keyboard';
      const stamp = Number.isFinite(options.timeStamp) ? options.timeStamp / 1000 : null;
      // Browser event time keeps real tap spacing accurate when a slow frame clamps game dt.
      const elapsed = stamp !== null && state.lastDirStamp !== null
        ? stamp - state.lastDirStamp : now(g) - state.lastDirAt;
      const window = source === 'touch' ? TOUCH_DOUBLE : DOUBLE;
      if (state.lastDir === dir && state.lastDirSource === source && elapsed >= 0 && elapsed <= window + 1e-8) {
        // Consume this pair even if the current action is still on cooldown.
        state.lastDir = 0; state.lastDirAt = -Infinity;
        state.lastDirStamp = null; state.lastDirSource = null;
        if (enabled(g) && MM.WeaponManager.current(g) === 'axes') return MM.WeaponManager.tryRollSlash(g, dir);
        if (g.level?.id === 70) return this.requestDash(g, dir);
        return false;
      }
      state.lastDir = dir; state.lastDirAt = now(g); state.lastDirStamp = stamp; state.lastDirSource = source;
      return false;
    },
    requestDash(g, direction) {
      if (!dashPhase(g) || !g.player || g.rollSlash?.time > 0 || g.player.rollTime > 0) return false;
      if (!g.inputState) this.init(g);
      const state = g.inputState, dir = direction < 0 ? -1 : 1;
      if (g.tryRoll?.(dir)) { state.pendingDash = null; return true; }
      const recovery = Math.max(g.player.rollCooldown || 0, g.player.stunTime || 0, g.player.petrifyTime || 0);
      if (recovery <= 0 || recovery > DASH_BUFFER + 1e-8) return false;
      // Retry only a near-ready evade; a single request cannot stack or create damaging rolls.
      // One frame of grace accounts for player cooldowns being updated after this manager.
      if (!state.pendingDash) state.pendingDash = {dir, time:DASH_BUFFER + .05};
      return true;
    },
    weaponDown(g) {
      if (g.screen !== 'playing' || MM.WeaponManager.available(g).length < 2 || g.weaponPicker?.open) return false;
      if (!g.inputState) this.init(g);
      const state = g.inputState;
      if (state.weaponHeld) return true;
      state.weaponHeld = true; state.weaponDownAt = now(g); state.holdOpened = false;
      return true;
    },
    weaponUp(g) {
      const state = g.inputState;
      if (!state?.weaponHeld) return false;
      state.weaponHeld = false;
      if (!state.holdOpened && !g.weaponPicker?.open && g.screen === 'playing') MM.WeaponManager.cycle(g);
      state.holdOpened = false;
      return true;
    },
    weaponCancel(g) {
      const state = g.inputState;
      if (!state) return false;
      const held = state.weaponHeld;
      state.weaponHeld = false; state.holdOpened = false;
      return held;
    },
    open(g) {
      if (g.screen !== 'playing' || !enabled(g) || !unlocked(g, 60)
        || MM.WeaponManager.available(g).length < 2 || g.rollSlash?.time > 0 || g.player.rollTime > 0) return false;
      const state = g.inputState || (this.init(g), g.inputState);
      const options = MM.WeaponManager.available(g);
      g.clearInputs?.();
      // clearInputs may reset tap/hold state; restore only the current hold marker.
      state.weaponHeld = true; state.holdOpened = true;
      state.lastDir = 0; state.lastDirAt = -Infinity;
      g.weaponPicker = {open:true, selected:Math.max(0, options.indexOf(MM.WeaponManager.current(g)))};
      g.updateUI?.();
      return true;
    },
    close(g) {
      if (!g.weaponPicker?.open) return false;
      g.weaponPicker.open = false;
      g.clearInputs?.(); this.reset(g);
      g.updateUI?.();
      return true;
    },
    navigate(g, amount) {
      if (!g.weaponPicker?.open) return false;
      const count = MM.WeaponManager.available(g).length;
      g.weaponPicker.selected = (g.weaponPicker.selected + (amount < 0 ? -1 : 1) + count) % count;
      g.updateUI?.();
      return true;
    },
    select(g, id) {
      if (!g.weaponPicker?.open) return false;
      const options = MM.WeaponManager.available(g);
      const chosen = id || options[g.weaponPicker.selected];
      if (!MM.WeaponManager.select(g, chosen)) return false;
      this.close(g);
      return true;
    },
    keyDown(g, event) {
      const code = event.code;
      if (g.weaponPicker?.open) {
        event.preventDefault?.();
        if (!event.repeat) {
          if (['ArrowLeft', 'ArrowUp'].includes(code)) this.navigate(g, -1);
          else if (['ArrowRight', 'ArrowDown'].includes(code)) this.navigate(g, 1);
          else if (code === 'Enter') this.select(g);
          else if (code === 'Escape') this.close(g);
        }
        return true;
      }
      if (g.screen !== 'playing') return false;
      if (code === 'KeyF' && MM.WeaponManager.available(g).length > 1) {
        event.preventDefault?.(); if (!event.repeat) this.weaponDown(g);
        return true;
      }
      if (['KeyW', 'KeyS'].includes(code) && MM.WeaponManager.setAim(g, MM.AbyssCombat?.invertAction(g,code==='KeyW'?'high':'ground')||(code==='KeyW'?'high':'ground'))) {
        event.preventDefault?.(); return true;
      }
      return false;
    },
    keyUp(g, event) {
      if (event.code === 'KeyF') return this.weaponUp(g);
      return false;
    },
    update(g, dt) {
      if (!g.inputState) this.init(g);
      g.inputState.clock += Math.max(0, dt);
      const state = g.inputState;
      const pending = state.pendingDash;
      if (pending) {
        if (!dashPhase(g) || g.player.rollTime > 0 || g.rollSlash?.time > 0) state.pendingDash = null;
        else if (g.tryRoll?.(pending.dir)) state.pendingDash = null;
        else {
          pending.time -= Math.max(0, dt);
          if (pending.time < -1e-8) state.pendingDash = null;
        }
      }
      if (state.weaponHeld && !state.holdOpened && unlocked(g, 60)
        && now(g) - state.weaponDownAt >= HOLD - 1e-8) {
        if (this.open(g)) state.holdOpened = true;
      }
    }
  };
  MM.InputManager = InputManager;
})(typeof window !== 'undefined' ? window : globalThis);
