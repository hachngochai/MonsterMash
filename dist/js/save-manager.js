/* Boss rewards share the save record for the current expedition. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const milestones = Object.freeze([10,20,30,40,50,60,70,80,90,100]);
  const weaponLevels = Object.freeze({gun:0,bones:10,club:60,bow:90,spear:90,axes:100});
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const milestone = value => Number.isInteger(value) && milestones.includes(value);

  function normalize(raw, completed) {
    const outer = record(raw) ? raw : {};
    const source = record(outer.progression) ? outer.progression : outer;
    const historical = Array.isArray(completed) ? completed : Array.isArray(outer.completed) ? outer.completed : [];
    // Completed boss maps are the only proof imported from pre-V3 saves.
    // A selected/resume map never implies that its boss has been defeated.
    const imported=source.version===1&&Array.isArray(source.rewards)?[]:historical;
    const rewards = [...new Set([...(Array.isArray(source.rewards) ? source.rewards : []), ...imported].filter(milestone))].sort((a,b) => a-b);
    const proposed = typeof source.equipped === 'string' ? source.equipped : 'gun';
    const required = Object.prototype.hasOwnProperty.call(weaponLevels, proposed) ? weaponLevels[proposed] : Infinity;
    const equipped = required === 0 || rewards.includes(required) ? proposed : 'gun';
    const lifeKills = Number.isFinite(source.lifeKills) ? Math.max(0,Math.min(9,Math.floor(source.lifeKills))) : 0;
    return {version:1,rewards,equipped,lifeKills};
  }

  function unlocked(game, level) {
    if (!milestone(level)) return false;
    return normalize(game?.progression || game?.save?.progression,game?.save?.completed).rewards.includes(level);
  }

  function weaponUnlocked(game, weapon) {
    if (!Object.prototype.hasOwnProperty.call(weaponLevels, weapon)) return false;
    return weaponLevels[weapon] === 0 || unlocked(game,weaponLevels[weapon]);
  }

  function write(game) {
    if (!game || !record(game.save)) return null;
    const clean = normalize(game.progression || game.save.progression,game.save.completed);
    // Keep references held by the runtime managers valid after a save.
    const state = record(game.progression) ? game.progression : {};
    Object.keys(state).forEach(key => { if (!(key in clean)) delete state[key]; });
    Object.assign(state,clean);
    game.progression = state;
    game.save.progression = state;
    game.persist?.();
    return state;
  }

  MM.SaveManager = {normalize,write,unlocked,weaponUnlocked,milestones,weaponLevels};
})(typeof window !== 'undefined' ? window : globalThis);
