'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/cosmic-config.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(existing = {}) {
  const context = vm.createContext({MM: existing});
  vm.runInContext(source, context);
  return context.MM.CosmicConfig;
}

// The roster and reward numbers are the authored design contract, rather than
// provisional health, damage or spawn tuning for a playable campaign.
const regions = [
  ['mercury', 'hermes', ['mercurianPyroSlug', 'solarFlareSpecter', 'craterBurrower', 'livingCinnabar', 'moltenCoreDrone']],
  ['venus', 'aphrodite', ['venutianAcidStalker', 'sulfurGolem', 'greenhouseSpore', 'vesperSkimmer', 'corrosiveWisp']],
  ['mars', 'ares', ['martianDustWorm', 'ironOxideBerserker', 'phobosDrone', 'dustDevilElemental', 'aresSpider']],
  ['jupiter', 'zeus', ['jovianGasWhale', 'plasmaEel', 'vortexPhantom', 'jupiterSpore', 'atmosphericWisp']],
  ['saturn', 'chronos', ['saturnianRingCrafter', 'frostCrystalGolem', 'titanMethaneLeech', 'ringAsteroidSentient', 'ringRiderDrone']],
  ['uranus', 'ouranos', ['uranianFrostBender', 'methanePhantom', 'cyanFrostGuard', 'iceClusterMine', 'auroraJellyfish']],
  ['neptune', 'poseidon', ['neptunianAbyssalSiren', 'stormLeviathan', 'tritonIceDemon', 'darkSpotVoidling', 'sonicWindWraith']],
  ['moon', 'selene', ['lunarShadowStalker', 'regolithGolem', 'apolloMalfunctioningMech', 'crescentWisp', 'polarIceBeetle']],
  ['sun', 'helios', ['solarCoreElemental', 'prominenceDragon', 'sunspotShadowFiend', 'nuclearFusionParasite', 'photonPhoenix']],
  ['blackHole', 'singularitySovereign', ['singularityVoidEater', 'spaghettifiedConstruct', 'timeWarpSpecter', 'eventHorizonParasite', 'gravitationalAnomaly']]
];

const essenceNumbers = {
  mercury: {duration:5, ammoCost:20, rangeFraction:.5, damagePerSecond:99, unlock:260},
  venus: {duration:5, cooldown:10, unlock:270},
  mars: {duration:5, ammoCost:20, rangeFraction:.5, damagePerSecond:99, unlock:280},
  jupiter: {duration:5, ammoCost:20, rangeFraction:.5, damagePerHit:99, unlock:290},
  saturn: {projectileCount:3, damagePerHit:20, ammoCost:0, unlock:300},
  uranus: {summonCount:2, summonHealth:20, cooldown:10, unlock:310},
  neptune: {duration:15, stateInterval:2, pullDamage:2, pushDamage:999, unlock:320},
  moon: {healthBonus:50, palmDamageBonus:5, freezeChance:.25, unlock:330},
  sun: {healthBonus:50, palmDamageBonus:5, burnDamagePerSecond:3, burnDuration:2, unlock:340},
  blackHole: {duration:8, cooldown:15, absorbedArmorFraction:.5, armorCap:100, damagePerSecond:50, finalTrueDamage:2000, unlock:350}
};

test('cosmic design has exactly ten regions, fifty distinct enemies and ten matching boss rewards', () => {
  const {authored} = fixture();
  assert.equal(authored.regions.length, 10);
  assert.equal(Object.keys(authored.enemies).length, 50);
  assert.equal(authored.essences.length, 10);
  assert.equal(new Set(authored.regions.map(region => region.boss)).size, 10);
  assert.deepEqual(plain(authored.regions.map(region => region.id)), regions.map(([id]) => id));
  assert.deepEqual(plain(authored.essences.map(essence => essence.id)), regions.map(([id]) => id));

  const identities = [];
  regions.forEach(([id, boss, roster], index) => {
    const region = authored.regions[index];
    assert.equal(region.boss, boss);
    assert.deepEqual(plain(region.enemies), roster);
    assert.equal(region.first, 251 + index * 10);
    assert.equal(region.last, 260 + index * 10);
    assert.equal(region.world, 25 + index);
    assert.ok(region.name && region.subtitle && region.story && region.terrain);
    assert.equal(region.background, 'assets/backgrounds/cosmic/' + id + '.png');
    assert.equal(region.bossSprite, 'assets/sprites/cosmic/' + boss + '.png');
    for (const type of roster) {
      const enemy = authored.enemies[type];
      assert.equal(enemy.id, type);
      assert.equal(enemy.region, id);
      assert.ok(enemy.name && enemy.shape && enemy.ability, type + ' has an authored identity');
      identities.push(type);
    }
    assert.equal(authored.essences[index].unlock, region.last);
  });
  assert.equal(new Set(identities).size, 50, 'regions must not borrow or duplicate an enemy identity');
  assert.deepEqual(Object.keys(authored.enemies).sort(), identities.sort());
});

test('all one hundred blueprints are sequential, introduce enemies gradually and retain boss warmups', () => {
  const {authored, getRegion, enemyPool} = fixture();
  assert.equal(authored.stages.length, 100);
  assert.deepEqual(plain(authored.stages.map(stage => stage.id)), Array.from({length:100}, (_, i) => 251 + i));
  assert.deepEqual(plain(authored.stages.filter(stage => stage.boss).map(stage => stage.id)), Array.from({length:10}, (_, i) => 260 + i * 10));
  const counts = [1, 2, 2, 3, 4, 5, 5, 5, 5, 5];

  authored.stages.forEach((stage, index) => {
    const region = authored.regions[Math.floor(index / 10)];
    const local = index % 10;
    assert.equal(stage.stage, local + 1);
    assert.equal(stage.region, region.id);
    assert.equal(stage.world, region.world);
    assert.equal(getRegion(stage.id), region);
    assert.equal(stage.boss, local === 9);
    assert.equal(stage.ordinaryWarmup, true);
    assert.equal(stage.bossArchetype, local === 9 ? region.boss : null);
    assert.equal(stage.bossName, local === 9 ? region.bossName : null);
    assert.deepEqual(plain(stage.types), plain(region.enemies.slice(0, counts[local])));
    assert.deepEqual(plain(enemyPool(region, stage.stage)), plain(stage.types));
    assert.notEqual(stage.types, region.enemies, 'stage roster is not a mutable alias');
  });
});

test('planet lookup respects both edges of the authored range without manufacturing a destination', () => {
  const {authored, getRegion} = fixture();
  for (const region of authored.regions) {
    assert.equal(getRegion(region.first), region);
    assert.equal(getRegion(String(region.last)), region);
  }
  for (const invalid of [250, 351, -1, Infinity, -Infinity, NaN, undefined, null, 'broken']) {
    assert.equal(getRegion(invalid), null, String(invalid));
  }
});

test('ten UFO crossings connect Island to each region in order and stop after the final boss', () => {
  const {authored} = fixture();
  assert.equal(authored.crossings.length, 10);
  authored.crossings.forEach((crossing, index) => {
    assert.equal(crossing.from, 250 + index * 10);
    assert.equal(crossing.to, crossing.from + 1);
    assert.equal(crossing.fromRegion, index ? regions[index - 1][0] : 'island');
    assert.equal(crossing.toRegion, regions[index][0]);
    assert.equal(crossing.firstBoarding, index === 0);
  });
  assert.equal(authored.crossings.some(crossing => crossing.from === 350 || crossing.to > 350), false);
  assert.deepEqual(plain(authored.chapter), {name:'Đại Chiến Vũ Trụ', subtitle:'The Cosmic Expedition', first:251, last:350});
});

test('every boss retains its distinct authored skill set', () => {
  const {authored} = fixture();
  const skills = [
    ['mercury-quake', 'blazing-meteor-rain'], ['acid-vortex', 'acid-rain'],
    ['thermal-dust-storm', 'martian-ground-rift'], ['green-thunder-columns', 'extreme-pressure-wave'],
    ['defensive-ice-rings', 'rolling-ice-boulders'], ['eternal-ice-lance', 'silver-icicle-rain'],
    ['gravitational-pull', 'gravitational-push'], ['judgment-crescent', 'frozen-stasis-zones'],
    ['nuclear-storm', 'supreme-solar-ray'], ['void-pull', 'time-rend', 'extinction-shockwave']
  ];
  authored.regions.forEach((region, index) => assert.deepEqual(plain(region.bossSkills), skills[index]));
  assert.equal(authored.enemies.livingCinnabar.ability, 'three-fragments');
  assert.equal(authored.enemies.sulfurGolem.ability, 'harden');
  assert.equal(authored.enemies.frostCrystalGolem.ability, 'front-reflection');
  assert.equal(authored.enemies.timeWarpSpecter.ability, 'reverse-bullets');
  assert.equal(authored.enemies.eventHorizonParasite.ability, 'projectile-gravity');
});

test('official essence numbers preserve damage units, ammunition costs, durations and unlock conditions exactly', () => {
  const {authored} = fixture();
  for (const essence of authored.essences) {
    const numeric = Object.fromEntries(Object.entries(essence).filter(([, value]) => typeof value === 'number'));
    assert.deepEqual(numeric, essenceNumbers[essence.id], essence.id);
  }
  assert.equal('damagePerSecond' in authored.essences.find(essence => essence.id === 'jupiter'), false,
    'vines deal 99 per hit, rather than 99 per second');
  assert.deepEqual(plain(authored.fixed), {
    livingCinnabarChildren:3, sulfurGolemImmunity:2, frostGolemFrontReflection:.5, sovereignWaveHealthFraction:.9
  });
  assert.equal(authored.suit.unlock, 250);
  assert.equal(authored.suit.key, 'KeyJ');
});

test('unspecified balance remains explicitly pending and is never disguised as a playable zero', () => {
  const {authored, pending} = fixture();
  assert.deepEqual(Object.keys(pending).sort(), ['bosses', 'campaign', 'enemies', 'essences', 'interactions', 'suit']);
  for (const [category, values] of Object.entries(pending)) {
    assert.ok(Object.keys(values).length > 0, category);
    for (const [name, value] of Object.entries(values)) assert.equal(value, null, category + '.' + name);
  }
  for (const field of ['quota', 'maxAlive', 'spawnInterval', 'ammoCapacity', 'initialAmmo', 'ammoPerCrate', 'ammoInterval', 'gravity']) {
    assert.equal(pending.campaign[field], null, field);
  }
  for (const stage of authored.stages) {
    for (const field of ['target', 'bossHealth', 'spawnInterval', 'maxAlive', 'damage', 'speedMultiplier']) {
      assert.equal(Object.hasOwn(stage, field), false, 'unapproved ' + field + ' at ' + stage.id);
    }
  }
  for (const enemy of Object.values(authored.enemies)) {
    for (const field of ['health', 'damage', 'speed', 'attackCooldown']) assert.equal(Object.hasOwn(enemy, field), false);
  }
  assert.equal(pending.interactions.venusBossRule, null);
  assert.equal(pending.interactions.heliosShieldRule, null);
  assert.equal(pending.interactions.sovereignCurrentOrMaximumHP, null);
});

test('authored and pending data are deeply immutable while requested roster copies remain independent', () => {
  const config = fixture();
  function frozenTree(value, at) {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.isFrozen(value), true, at);
    for (const [key, child] of Object.entries(value)) frozenTree(child, at + '.' + key);
  }
  frozenTree(config.authored, 'authored');
  frozenTree(config.pending, 'pending');
  assert.throws(() => { config.authored.essences[0].damagePerSecond = 9; });
  assert.throws(() => { config.authored.regions[0].enemies.push('skeleton'); });
  assert.throws(() => { config.pending.bosses.health = 120; });

  const before = JSON.stringify(config.authored);
  const pool = config.enemyPool(config.authored.regions[0], 10);
  const second = config.enemyPool(config.authored.regions[0], 10);
  assert.notEqual(pool, second);
  pool.pop();
  pool[0] = 'skeleton';
  assert.equal(second.length, 5);
  assert.equal(second[0], 'mercurianPyroSlug');
  assert.equal(JSON.stringify(config.authored), before);
});

test('loading the design registry leaves the existing campaign and save managers untouched', () => {
  const existing = {Campaign:{levels:[{id:1}, {id:250}]}, SaveManager:{marker:'existing-save'}, retained:{value:42}};
  const campaign = existing.Campaign, saves = existing.SaveManager, retained = existing.retained;
  const before = JSON.stringify(existing);
  fixture(existing);
  assert.equal(existing.Campaign, campaign);
  assert.equal(existing.SaveManager, saves);
  assert.equal(existing.retained, retained);
  const {CosmicConfig, ...unchanged} = existing;
  assert.equal(JSON.stringify(unchanged), before);
  assert.equal(CosmicConfig.authored.stages.length, 100);
});
