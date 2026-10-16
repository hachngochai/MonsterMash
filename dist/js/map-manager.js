/* Temporary map rules never alter permanent rewards or equipped weapon saves. */
(function (root) {
  'use strict';
  const MM = root.MM = root.MM || {};
  const suppressed = game => game?.level?.id === 70;
  const skillsEnabled = game => !suppressed(game);
  function bloodMoon(game) {
    return suppressed(game) && (game.enemies || []).some(enemy => enemy?.boss && !enemy.dead && !enemy.retired && enemy.health > 0 && (enemy.archetype || enemy.type) === 'werewolf' && enemy.bloodMoon === true);
  }
  function weapon(game) {
    if (suppressed(game)) return 'gun';
    const equipped = game?.progression?.equipped || game?.save?.progression?.equipped || 'gun';
    return !MM.SaveManager || MM.SaveManager.weaponUnlocked(game,equipped) ? equipped : 'gun';
  }
  const manualAim = game => skillsEnabled(game) && MM.SaveManager?.unlocked(game,80) === true;

  MM.MapManager = {suppressed,skillsEnabled,bloodMoon,weapon,manualAim};
})(typeof window !== 'undefined' ? window : globalThis);
