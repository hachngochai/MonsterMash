/* V3 tap/hold interpretation shared by keyboard and touch controls. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const DOUBLE = .28, HOLD = .35;
  const enabled = g => MM.MapManager?.skillsEnabled ? MM.MapManager.skillsEnabled(g) : g.level?.id !== 70;
  const unlocked = (g, level) => !!MM.SaveManager?.unlocked?.(g, level);
  const now = g => g.inputState?.clock || 0;
  const InputManager = {
    doubleWindow:DOUBLE, holdWindow:HOLD,
    init(g) {
      g.inputState = {clock:0, lastDir:0, lastDirAt:-Infinity, weaponHeld:false, weaponDownAt:0, holdOpened:false};
      g.weaponPicker = {open:false, selected:0};
    },
    reset(g) {
      const state = g.inputState;
      if (!state) return;
      state.lastDir = 0; state.lastDirAt = -Infinity;
      state.weaponHeld = false; state.holdOpened = false;
    },
    directionTap(g, direction) {
      const dir = direction < 0 ? -1 : 1;
      if (g.weaponPicker?.open) { this.navigate(g, dir); return true; }
      if (g.screen !== 'playing') return false;
      if (!g.inputState) this.init(g);
      const state = g.inputState;
      if (state.lastDir === dir && now(g) - state.lastDirAt <= DOUBLE) {
        // Consume this pair even if the current action is still on cooldown.
        state.lastDir = 0; state.lastDirAt = -Infinity;
        if (enabled(g) && MM.WeaponManager.current(g) === 'axes') return MM.WeaponManager.tryRollSlash(g, dir);
        if (g.level?.id === 70) return !!g.tryRoll?.(dir);
        return false;
      }
      state.lastDir = dir; state.lastDirAt = now(g);
      return false;
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
      if (['KeyW', 'KeyS'].includes(code) && MM.WeaponManager.setAim(g, code === 'KeyW' ? 'high' : 'ground')) {
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
      if (state.weaponHeld && !state.holdOpened && unlocked(g, 60)
        && now(g) - state.weaponDownAt >= HOLD - 1e-8) {
        if (this.open(g)) state.holdOpened = true;
      }
    }
  };
  MM.InputManager = InputManager;
})(typeof window !== 'undefined' ? window : globalThis);
