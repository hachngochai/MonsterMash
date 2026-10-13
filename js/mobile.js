/* Optional mobile fullscreen/orientation control; gameplay never waits for it. */
(function (global) {
  'use strict';

  class Controller {
    constructor(game, browserRoot = global) {
      this.game = game;
      this.root = browserRoot;
      this.document = browserRoot.document;
      this.target = this.document?.documentElement;
      this.button = this.document?.getElementById?.('fullscreen-button');
      this.hint = this.document?.getElementById?.('rotate-hint');
      this.epoch = 0;
      this.active = false;
      this.pending = null;
      this.exitPending = null;
      this.ownsFullscreen = false;
      this.ownsOrientation = false;
      this.lockPending = null;
      this.wasFullscreen = Boolean(this.document?.fullscreenElement);
      this.onFullscreenChange = this.handleFullscreenChange.bind(this);
      this.onResize = () => { this.game.resize?.(); this.sync(); };
      this.onButton = () => {
        if (this.document?.fullscreenElement) this.leave(true);
        else this.enter(true);
        this.game.canvas?.focus?.({ preventScroll: true });
      };
      this.document?.addEventListener?.('fullscreenchange', this.onFullscreenChange);
      this.root.addEventListener?.('resize', this.onResize);
      this.root.addEventListener?.('orientationchange', this.onResize);
      this.root.screen?.orientation?.addEventListener?.('change', this.onResize);
      this.button?.addEventListener?.('click', this.onButton);
      this.sync();
    }

    get mobile() {
      let coarse = false;
      try { coarse = this.root.matchMedia?.('(pointer:coarse)')?.matches === true; } catch { /* Detection is optional. */ }
      return coarse || Number(this.root.navigator?.maxTouchPoints) > 0;
    }

    isCurrent(record) {
      return this.pending === record && record.epoch === this.epoch && this.active && this.game.screen === 'playing';
    }

    enter(force = false) {
      // This method must be called directly from the start/resume click. Request
      // fullscreen before any await so the browser retains user activation.
      if (this.game.screen !== 'playing' || (!force && !this.mobile)) {
        this.sync();
        return Promise.resolve(false);
      }
      // A canceled request is still settling. Do not schedule a later request,
      // since it would have lost the original click's user activation.
      if (this.pending) return this.pending.promise || Promise.resolve(false);
      this.active = true;
      const record = { epoch: ++this.epoch, requested: false, promise: null };
      this.pending = record;
      let fullscreenResult;
      if (this.document?.fullscreenElement !== this.target && this.target &&
          typeof this.target.requestFullscreen === 'function' && this.document.fullscreenEnabled !== false) {
        record.requested = true;
        try { fullscreenResult = this.target.requestFullscreen(); }
        catch { fullscreenResult = Promise.reject(new Error('Fullscreen unavailable')); }
      }
      record.promise = this.completeEntry(record, fullscreenResult);
      return record.promise;
    }

    async completeEntry(record, fullscreenResult) {
      try {
        if (record.requested) {
          try { await fullscreenResult; } catch { /* Continue in the normal page. */ }
          if (this.document?.fullscreenElement === this.target) this.ownsFullscreen = true;
        }
        if (!this.isCurrent(record)) {
          if (record.requested && this.document?.fullscreenElement === this.target) await this.exitFullscreen(true);
          return false;
        }
        if (record.requested && this.document?.fullscreenElement === this.target) this.handleFullscreenChange();
        // Some installed mobile browsers can lock orientation without fullscreen.
        // On desktop the manual button only changes fullscreen mode.
        if (this.mobile) await this.lockLandscape(record);
        if (!this.isCurrent(record)) return false;
        this.sync();
        return Boolean(this.target && this.document?.fullscreenElement === this.target) || this.ownsOrientation;
      } finally {
        if (this.pending === record) this.pending = null;
      }
    }

    async lockLandscape(record) {
      if (this.ownsOrientation || !this.isCurrent(record)) return;
      const orientation = this.root.screen?.orientation;
      if (typeof orientation?.lock !== 'function') return;
      this.lockPending = record;
      try {
        await orientation.lock('landscape');
        if (this.isCurrent(record)) this.ownsOrientation = true;
        else this.unlockOrientation(true);
      } catch { /* Portrait/normal-page play remains available. */ }
      finally {
        if (this.lockPending === record) this.lockPending = null;
        this.sync();
      }
    }

    unlockOrientation(force = false) {
      const shouldUnlock = force || this.ownsOrientation || this.lockPending;
      this.ownsOrientation = false;
      if (!shouldUnlock) return;
      try { this.root.screen?.orientation?.unlock?.(); } catch { /* Unsupported or already unlocked. */ }
    }

    leave(force = false) {
      this.active = false;
      this.epoch++;
      this.unlockOrientation();
      const owned = this.ownsFullscreen || (this.pending?.requested && this.document?.fullscreenElement === this.target);
      this.sync();
      // Home navigation returns immediately even if an old fullscreen request
      // has not settled. completeEntry will clean up its eventual result.
      return this.exitFullscreen(force || Boolean(owned));
    }

    exitFullscreen(allowed) {
      if (this.exitPending) return this.exitPending;
      if (!allowed || !this.document?.fullscreenElement || typeof this.document.exitFullscreen !== 'function') {
        return Promise.resolve(false);
      }
      this.ownsFullscreen = false;
      let result;
      try { result = this.document.exitFullscreen(); }
      catch { this.sync(); return Promise.resolve(false); }
      const pending = Promise.resolve(result).then(() => {
        this.handleFullscreenChange();
        return !this.document.fullscreenElement;
      }, () => { this.sync(); return false; });
      this.exitPending = pending;
      pending.then(() => { if (this.exitPending === pending) this.exitPending = null; });
      return pending;
    }

    handleFullscreenChange() {
      const fullscreen = Boolean(this.document?.fullscreenElement);
      const exited = this.wasFullscreen && !fullscreen;
      this.wasFullscreen = fullscreen;
      if (fullscreen && this.pending?.requested && this.document.fullscreenElement === this.target) {
        this.ownsFullscreen = true;
        if (!this.isCurrent(this.pending)) this.exitFullscreen(true);
      }
      if (exited) {
        this.active = false;
        this.epoch++;
        this.ownsFullscreen = false;
        this.unlockOrientation();
        this.game.clearInputs?.();
        this.game.lastTime = 0;
        if (this.game.screen === 'playing') this.game.togglePause?.();
      }
      this.game.resize?.();
      this.sync();
    }

    sync() {
      const fullscreen = Boolean(this.document?.fullscreenElement);
      const label = fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình';
      if (this.button) {
        const text = this.button.querySelector?.('[data-fullscreen-label]');
        if (text) text.textContent = label;
        else this.button.textContent = label;
        this.button.title = label;
        this.button.setAttribute?.('aria-label', label);
        this.button.setAttribute?.('aria-pressed', String(fullscreen));
      }
      if (this.hint) {
        const width = this.root.innerWidth || this.target?.clientWidth || 0;
        const height = this.root.innerHeight || this.target?.clientHeight || 0;
        const portrait = width > 0 && height > 0 ? height > width : String(this.root.screen?.orientation?.type || '').startsWith('portrait');
        this.hint.hidden = !(this.mobile && portrait && this.game.screen === 'playing');
      }
    }
  }

  global.MM = global.MM || {};
  global.MM.MobileView = Controller;
})(typeof window !== 'undefined' ? window : globalThis);
