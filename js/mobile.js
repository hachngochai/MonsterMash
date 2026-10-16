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
      this.landingPending = null;
      this.landingPrepared = false;
      this.landingArmed = false;
      this.exitPending = null;
      this.ownsFullscreen = false;
      this.ownsOrientation = false;
      this.lockPending = null;
      this.wasFullscreen = Boolean(this.document?.fullscreenElement);
      this.layoutKey = null;
      this.rotated = false;
      this.onFullscreenChange = this.handleFullscreenChange.bind(this);
      this.onResize = () => { this.sync(); this.game.resize?.(); };
      this.onButton = () => {
        this.landingArmed = false;
        if (this.document?.fullscreenElement) this.leave(true);
        else this.enter(true);
        this.game.canvas?.focus?.({ preventScroll: true });
      };
      this.onLandingGesture = event => {
        if (!this.landingArmed || !this.mobile || this.game.screen !== 'home' || event?.isTrusted === false) return;
        // Let the dedicated button own its click so a preceding pointerup
        // cannot enter fullscreen and then immediately toggle it back off.
        if (event?.target?.id === 'fullscreen-button' || event?.target?.closest?.('#fullscreen-button')) return;
        this.landingArmed = false;
        this.enter();
      };
      this.document?.addEventListener?.('fullscreenchange', this.onFullscreenChange);
      this.document?.addEventListener?.('click', this.onLandingGesture);
      this.document?.addEventListener?.('pointerup', this.onLandingGesture);
      this.root.addEventListener?.('resize', this.onResize);
      this.root.addEventListener?.('orientationchange', this.onResize);
      this.root.visualViewport?.addEventListener?.('resize', this.onResize);
      this.root.visualViewport?.addEventListener?.('scroll', this.onResize);
      this.root.screen?.orientation?.addEventListener?.('change', this.onResize);
      this.button?.addEventListener?.('click', this.onButton);
      this.sync();
      this.prepareLanding();
    }

    get mobile() {
      let coarse = false;
      try { coarse = this.root.matchMedia?.('(pointer:coarse)')?.matches === true; } catch { /* Detection is optional. */ }
      return coarse || Number(this.root.navigator?.maxTouchPoints) > 0;
    }

    isCurrent(record) {
      const tracked = record.kind === 'landing' ? this.landingPending === record : this.pending === record;
      return tracked && record.epoch === this.epoch && this.active && ['home', 'playing'].includes(this.game.screen);
    }

    prepareLanding() {
      if (this.landingPrepared || !this.mobile || this.game.screen !== 'home') return this.landingPending?.promise || Promise.resolve(false);
      this.landingPrepared = true;
      this.landingArmed = true;
      this.active = true;
      const record = { kind: 'landing', epoch: ++this.epoch, promise: null };
      this.landingPending = record;
      // Installed/PWA browsers may allow this immediately. Normal tabs often
      // refuse until fullscreen; the first eligible gesture retries there.
      record.promise = this.completeLanding(record);
      return record.promise;
    }

    async completeLanding(record) {
      try {
        await this.lockLandscape(record);
        return this.isCurrent(record) && this.ownsOrientation;
      } finally {
        if (this.landingPending === record) this.landingPending = null;
        this.sync();
      }
    }

    enter(force = false) {
      // This method must be called directly from the start/resume click. Request
      // fullscreen before any await so the browser retains user activation.
      if (!['home', 'playing'].includes(this.game.screen) || (!force && !this.mobile)) {
        this.sync();
        return Promise.resolve(false);
      }
      // A canceled request is still settling. Do not schedule a later request,
      // since it would have lost the original click's user activation.
      if (this.pending) return this.pending.promise || Promise.resolve(false);
      this.landingArmed = false;
      if (!this.active) this.epoch++;
      this.active = true;
      const record = { kind: 'entry', epoch: this.epoch, requested: false, promise: null };
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
        if (this.mobile) {
          if (this.landingPending) await this.landingPending.promise;
          if (this.isCurrent(record)) await this.lockLandscape(record);
        }
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
      this.landingArmed = false;
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
        this.landingArmed = false;
        this.epoch++;
        this.ownsFullscreen = false;
        this.unlockOrientation();
        this.game.clearInputs?.();
        this.game.lastTime = 0;
        if (this.game.screen === 'playing') this.game.togglePause?.();
      }
      this.sync();
      this.game.resize?.();
    }

    sync() {
      const fullscreen = Boolean(this.document?.fullscreenElement);
      const visual = this.root.visualViewport;
      const width = visual?.width || this.root.innerWidth || this.target?.clientWidth || 0;
      const height = visual?.height || this.root.innerHeight || this.target?.clientHeight || 0;
      const portrait = width > 0 && height > 0 ? height > width : String(this.root.screen?.orientation?.type || '').startsWith('portrait');
      const rotated = portrait && (this.mobile || (width > 0 && width <= 600));
      const left = Number.isFinite(visual?.offsetLeft) ? visual.offsetLeft : 0;
      const top = Number.isFinite(visual?.offsetTop) ? visual.offsetTop : 0;
      const key = [rotated,width,height,left,top].join(':');
      const changed = key !== this.layoutKey;
      if(changed) {
        const hadLayout = this.layoutKey !== null;
        this.layoutKey = key;this.rotated = rotated;this.game.mobileRotation = rotated;
        if(this.target?.dataset)this.target.dataset.landscape = rotated ? 'rotated' : 'native';
        const style=this.target?.style;
        for(const [name,value] of [['vw',width],['vh',height],['left',left],['top',top]])style?.setProperty?.('--mobile-'+name,value+'px');
        // A finger captured against the previous geometry must never keep moving.
        if(hadLayout)this.game.clearInputs?.();
      }
      const label = fullscreen ? 'Thoát toàn màn hình' : this.mobile && portrait && this.game.screen === 'home' ? 'Chơi ngang' : 'Toàn màn hình';
      if (this.button) {
        const text = this.button.querySelector?.('[data-fullscreen-label]');
        if (text) text.textContent = label;
        else this.button.textContent = label;
        this.button.title = label;
        this.button.setAttribute?.('aria-label', label);
        this.button.setAttribute?.('aria-pressed', String(fullscreen));
      }
      if (this.hint) {
        this.hint.hidden = !(this.mobile && portrait && ['home', 'playing'].includes(this.game.screen));
        if(rotated)this.hint.textContent='↻ Khung ngang · xoay máy để cầm dễ hơn';
      }
      return changed;
    }
  }

  global.MM = global.MM || {};
  global.MM.MobileView = Controller;
})(typeof window !== 'undefined' ? window : globalThis);
