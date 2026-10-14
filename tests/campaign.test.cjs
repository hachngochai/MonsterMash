'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/campaign.js'), 'utf8'), context);
const campaign = context.MM.Campaign;

test('campaign has 60 sequential levels and six boss milestones', () => {
  assert.equal(campaign.worlds.length, 6);
  assert.equal(campaign.levels.length, 60);
  campaign.levels.forEach((level, index) => {
    assert.equal(level.id, index + 1);
    assert.equal(level.world, Math.floor(index / 10));
    assert.equal(level.boss, level.id % 10 === 0);
    assert.ok(level.name && level.story);
    assert.ok(level.target >= 10 && level.target <= 42);
    assert.ok(level.spawnInterval >= 0.9 && level.spawnInterval <= 2.4);
    assert.ok(level.maxAlive >= 3 && level.maxAlive <= 7);
    assert.ok(level.types.length > 0);
    level.types.forEach(type => assert.ok(campaign.enemyTypes[type], type));
    if (level.boss) assert.ok(Number.isInteger(level.bossHealth) && level.bossHealth >= 18);
  });
  assert.equal(campaign.getLevel(50).bossHealth, 34);
  assert.equal(campaign.getLevel(60).bossHealth, 54);
});

test('saved level ids clamp safely, including invalid or obsolete saves', () => {
  assert.equal(campaign.getLevel(-50).id, 1);
  assert.equal(campaign.getLevel(500).id, 60);
  assert.equal(campaign.getLevel(Infinity).id, 60);
  assert.equal(campaign.getLevel(-Infinity).id, 1);
  assert.equal(campaign.getLevel(undefined).id, 1);
  assert.equal(campaign.getLevel('broken').id, 1);
  assert.equal(campaign.getLevel('12').id, 12);
  assert.equal(campaign.getLevel(12.9).id, 12);
});

test('new enemies arrive gradually and recovery levels reduce pressure', () => {
  const firstAppearances = { skeleton: 1, zombie: 3, spider: 12, ghost: 22, greenZombie: 30, vampire: 42, golem: 51 };
  Object.entries(firstAppearances).forEach(([type, id]) => {
    assert.equal(campaign.levels.find(level => level.types.includes(type)).id, id);
  });
  campaign.levels.filter(level => level.recovery).forEach(level => {
    const previous = campaign.getLevel(level.id - 1);
    assert.ok(level.spawnInterval > previous.spawnInterval, `level ${level.id} spawn recovery`);
    assert.ok(level.maxAlive <= previous.maxAlive, `level ${level.id} concurrent recovery`);
    assert.ok(level.target < previous.target, `level ${level.id} length recovery`);
    assert.ok(level.speedMultiplier < previous.speedMultiplier, `level ${level.id} speed recovery`);
  });
  for (let index = 1; index < campaign.levels.length; index += 1) {
    const previous = campaign.levels[index - 1];
    const level = campaign.levels[index];
    assert.ok(previous.spawnInterval / level.spawnInterval < 1.23, `no abrupt spawn spike at ${level.id}`);
    assert.ok(level.speedMultiplier / previous.speedMultiplier < 1.06, `no abrupt speed spike at ${level.id}`);
  }
});

test('difficulty settings scale pressure while keeping health whole', () => {
  const story = campaign.tuning('story');
  const normal = campaign.tuning('normal');
  const hard = campaign.tuning('hard');
  assert.ok(story.health > normal.health && normal.health > hard.health);
  assert.ok(story.spawnMultiplier > normal.spawnMultiplier && normal.spawnMultiplier > hard.spawnMultiplier);
  assert.ok(story.speedMultiplier < normal.speedMultiplier && normal.speedMultiplier < hard.speedMultiplier);
  assert.equal(campaign.tuning('unknown').health, normal.health);
  assert.equal(campaign.tuning('__proto__').health, normal.health);
  normal.health = 99;
  assert.equal(campaign.tuning('normal').health, 5);
  ['story', 'normal', 'hard'].forEach(difficulty => {
    campaign.levels.forEach(level => {
      [...level.types, ...(level.boss ? ['boss'] : [])].forEach(type => {
        const enemy = campaign.createEnemy(type, level, difficulty, -1, () => 0.5);
        assert.ok(Number.isInteger(enemy.health) && enemy.health > 0);
        assert.equal(enemy.health, enemy.maxHealth);
        assert.ok(Number.isFinite(enemy.speed) && enemy.speed > 0);
        assert.ok(enemy.warning >= 0.85);
      });
    });
  });
});

test('enemy spawn geometry, boss archetype and malformed inputs are safe', () => {
  const left = campaign.createEnemy('skeleton', 1, 'normal', -1, () => 0.5);
  const right = campaign.createEnemy('skeleton', 1, 'normal', 1, () => 0.5);
  assert.equal(left.x, -50);
  assert.equal(left.dir, 1);
  assert.equal(right.x, 1010);
  assert.equal(right.dir, -1);
  assert.equal(left.y, 438);
  assert.equal(left.phase, 'warning');
  assert.equal(left.health, 1);
  const boss = campaign.createEnemy('boss', 20, 'normal', 1, () => 0.5);
  assert.equal(boss.archetype, 'zombie');
  assert.equal(boss.health, 22);
  assert.equal(boss.boss, true);
  assert.ok(boss.w > campaign.enemyTypes.zombie.w && boss.h > campaign.enemyTypes.zombie.h);
  const fallback = campaign.createEnemy('missing', undefined, 'missing', 0, () => NaN);
  assert.equal(fallback.type, 'skeleton');
  assert.ok(Number.isFinite(fallback.speed));
  assert.equal(campaign.createEnemy('__proto__', 1, '__proto__', 1, () => 0.5).type, 'skeleton');
  assert.equal(campaign.createEnemy('skeleton', { id: 50 }, 'normal', -1, () => Infinity).health, 1);
});

test('finite ammunition grows with enemy durability and remains collectible', () => {
  campaign.levels.forEach(level => {
    assert.ok(Number.isInteger(level.initialAmmo) && level.initialAmmo >= 3);
    assert.ok(Number.isInteger(level.ammoCapacity) && level.ammoCapacity >= level.initialAmmo);
    assert.ok(Number.isInteger(level.ammoPerCrate) && level.ammoPerCrate >= 5 && level.ammoPerCrate < level.ammoCapacity);
    assert.ok(level.ammoInterval >= 4.5 && level.ammoInterval <= 5.8);
    assert.ok(level.initialAmmo < level.target, `level ${level.id} requires collecting supplies`);
    ['story', 'normal', 'hard'].forEach(difficulty => {
      const settings = campaign.tuning(difficulty);
      const crate = Math.max(1, Math.round(level.ammoPerCrate * settings.ammoMultiplier));
      const initial = Math.max(1, Math.round(level.initialAmmo * settings.ammoMultiplier));
      // Crates keep arriving after the final regular spawn. Verify that the
      // expected mixed wave has a finite, practical supply time in every mode.
      const regularDemand = Array.from({ length: level.target }, (_, index) => campaign.createEnemy(level.types[index % level.types.length], level, difficulty, -1, () => 0.5).health).reduce((sum, health) => sum + health, 0);
      const demand = regularDemand + (level.boss ? campaign.createEnemy('boss', level, difficulty, -1, () => 0.5).health : 0);
      const cratesNeeded = Math.max(0, Math.ceil((demand - initial - (level.boss ? crate : 0)) / crate));
      assert.ok(cratesNeeded * level.ammoInterval <= 75, `level ${level.id} ${difficulty}: expected supply takes ${cratesNeeded * level.ammoInterval}s`);
      assert.ok(crate >= campaign.createEnemy(level.types[0], level, difficulty, -1, () => 0.5).health);
    });
  });
  assert.ok(campaign.tuning('story').ammoMultiplier > campaign.tuning('normal').ammoMultiplier);
  assert.ok(campaign.tuning('normal').ammoMultiplier > campaign.tuning('hard').ammoMultiplier);
});

test('original enemy skills progress with the campaign and Dracula combines skills', () => {
  assert.equal(campaign.enemyTypes.zombie.ability, 'ledge-drop');
  assert.equal(campaign.enemyTypes.spider.ability, 'silk-drop');
  assert.equal(campaign.enemyTypes.ghost.ability, 'sine-drop');
  assert.equal(campaign.enemyTypes.vampire.ability, 'bat-morph');
  assert.equal(campaign.getLevel(1).abilitySpawnEvery, 0);
  assert.equal(campaign.getLevel(3).abilitySpawnEvery, 4);
  campaign.levels.forEach(level => {
    assert.ok([0, 3, 4].includes(level.abilitySpawnEvery));
    assert.ok(level.abilityWarning >= 1.5);
    assert.ok(level.abilityInterval >= 6.5);
    if (level.recovery) assert.equal(level.abilitySpawnEvery, 4);
    if (level.boss) assert.ok(level.bossAbilities.length >= 1);
    else assert.equal(level.bossAbilities.length, 0);
  });
  const spider = campaign.createEnemy('spider', 12, 'normal', 1, () => 0.5);
  assert.equal(spider.ability, 'silk-drop');
  assert.equal(spider.abilityCooldown, campaign.getLevel(12).abilityInterval);
  const finalBoss = campaign.createEnemy('boss', 50, 'normal', 1, () => 0.5);
  assert.equal(finalBoss.abilities.join(','), 'bat-morph,shadow-drop');
});

test('boss milestones use their explicit identities and retain original native skills', () => {
  const order = [
    [10, 'skeleton', 'bone-volley', 18],
    [20, 'zombie', 'ledge-drop', 22],
    [30, 'spider', 'silk-drop', 26],
    [40, 'ghost', 'sine-drop', 30],
    [50, 'vampire', 'bat-morph,shadow-drop', 34],
    [60, 'golem', 'club-swing', 54]
  ];
  order.forEach(([id, archetype, abilities, health]) => {
    const level = campaign.getLevel(id);
    const boss = campaign.createEnemy('boss', level, 'normal', -1, () => 0.5);
    assert.equal(level.bossArchetype, archetype);
    assert.equal(boss.archetype, archetype);
    assert.equal(level.bossAbilities.join(','), abilities);
    assert.equal(boss.abilities.join(','), abilities);
    assert.equal(boss.health, health);
    assert.ok(level.bossSkills.length > 0);
    assert.equal(boss.bossSkills.join(','), level.bossSkills.join(','));
  });
  assert.equal(campaign.getLevel(20).name, 'Thây ma xanh');
  assert.equal(campaign.getLevel(30).name, 'Nhện chúa');
  assert.equal(campaign.getLevel(40).name, 'Bóng ma trắng');
  assert.equal(campaign.getLevel(50).name, 'Dracula');
  assert.equal(campaign.getLevel(60).name, 'Golem chúa');
  campaign.levels.filter(level => !level.boss).forEach(level => {
    assert.equal(level.bossArchetype, null);
    assert.equal(level.bossSkills.length, 0);
  });
});

test('levels 30–40 limit regular enemies while preserving both milestone bosses', () => {
  const allowed = new Set(['skeleton', 'zombie', 'greenZombie', 'spider']);
  const encountered = new Set();
  for (let id = 30; id <= 40; id += 1) {
    const level = campaign.getLevel(id);
    level.types.forEach(type => {
      assert.ok(allowed.has(type), `level ${id} includes forbidden regular ${type}`);
      encountered.add(type);
    });
    assert.ok(!/ma cà rồng|hóa dơi/i.test(level.story));
    assert.ok(!level.tutorial || !/ma cà rồng|hóa dơi/i.test(level.tutorial));
  }
  assert.deepEqual([...encountered].sort(), [...allowed].sort());
  assert.equal(campaign.createEnemy('boss', 30, 'normal', 1, () => 0.5).archetype, 'spider');
  assert.equal(campaign.createEnemy('boss', 40, 'normal', 1, () => 0.5).archetype, 'ghost');

  const regular = campaign.createEnemy('zombie', 32, 'normal', 1, () => 0.5);
  const green = campaign.createEnemy('greenZombie', 32, 'normal', 1, () => 0.5);
  assert.equal(green.type, 'greenZombie');
  assert.equal(green.archetype, 'zombie');
  assert.equal(green.variant, 'green');
  assert.equal(green.ability, 'ledge-drop');
  assert.ok(green.health > regular.health);
  assert.ok(green.speed > regular.speed);
  assert.equal(green.boss, false);
  assert.equal(green.bossSkills.length, 0, 'regular green zombies do not inherit the level 20 boss immunity');
});

test('cursed valley has its own restricted cast, collectible ammunition and giant final boss', () => {
  const world = campaign.worlds[5];
  assert.equal(world.name, 'Thung lũng nguyền rủa');
  assert.equal(world.enemy, 'golem');
  const allowed = new Set(['skeleton', 'golem', 'spider']);
  for (let id = 51; id <= 60; id += 1) {
    const level = campaign.getLevel(id);
    assert.equal(level.world, 5);
    level.types.forEach(type => assert.ok(allowed.has(type), `level ${id}: ${type}`));
    assert.equal(level.initialAmmo, 8);
    assert.equal(level.ammoCapacity, 38);
    assert.equal(level.ammoPerCrate, 15);
    assert.ok(level.ammoInterval >= 4.5 && level.ammoInterval <= 4.8);
  }
  assert.equal(campaign.getLevel(51).recovery, true);
  assert.equal(campaign.getLevel(55).recovery, true);
  const golem = campaign.createEnemy('golem', 51, 'normal', -1, () => 0.5);
  const boss = campaign.createEnemy('boss', 60, 'normal', -1, () => 0.5);
  assert.equal(golem.ability, 'club-swing');
  assert.equal(golem.w, 74);
  assert.equal(golem.h, 108);
  assert.equal(boss.w, 156);
  assert.equal(boss.h, 172);
  assert.equal(boss.maxHealth, 54);
  assert.equal(boss.bossSkills.join(','), 'rage-ground-slam,triple-smash');
  assert.ok(boss.w > golem.w * 2 && boss.h > golem.h * 1.5);
});

test('elapsed attack pressure has gradual world transitions and conservative caps', () => {
  assert.equal(campaign.getLevel(1).enemyPressureCap, 1.5);
  assert.equal(campaign.getLevel(50).enemyPressureCap, 1.65);
  assert.equal(campaign.getLevel(10).bossPressureCap, 1.7);
  assert.equal(campaign.getLevel(50).bossPressureCap, 1.85);
  campaign.levels.forEach((level, index) => {
    assert.ok(level.enemyPressureCap >= 1.5 && level.enemyPressureCap <= 1.6875);
    assert.ok(level.bossPressureCap >= 1.7 && level.bossPressureCap <= 1.8875);
    assert.ok(level.bossPressureCap > level.enemyPressureCap);
    assert.ok(level.pressureRampSeconds >= 81.25 && level.pressureRampSeconds <= 100);
    assert.ok(level.bossRampSeconds >= 62.5 && level.bossRampSeconds <= 75);
    assert.ok(level.pressureWarmup >= 12);
    assert.equal(level.bossWarmup, 4);
    if (level.recovery) assert.ok(level.pressureWarmup > 12);
    if (index > 0) {
      const previous = campaign.levels[index - 1];
      assert.ok(level.enemyPressureCap - previous.enemyPressureCap <= 0.038);
      assert.ok(level.bossPressureCap - previous.bossPressureCap <= 0.038);
      assert.ok(previous.pressureRampSeconds - level.pressureRampSeconds <= 3.75);
      assert.ok(previous.bossRampSeconds - level.bossRampSeconds <= 2.5);
    }
    ['story', 'normal', 'hard'].forEach(difficulty => {
      const settings = campaign.tuning(difficulty);
      const enemyCap = 1 + (level.enemyPressureCap - 1) * settings.pressureMultiplier;
      const bossCap = 1 + (level.bossPressureCap - 1) * settings.pressureMultiplier;
      assert.ok(enemyCap < 1.76 && bossCap < 1.98);
      assert.ok(1 + 0.35 * (bossCap - 1) < 1.35, 'bounded pressure movement growth');
      assert.ok(level.abilityInterval / bossCap >= 3.25, 'skills retain time for reactions');
    });
  });
  assert.equal(campaign.tuning('story').pressureMultiplier, 0.75);
  assert.equal(campaign.tuning('normal').pressureMultiplier, 1);
  assert.equal(campaign.tuning('hard').pressureMultiplier, 1.1);
  assert.equal(campaign.tuning('normal').speedMultiplier, 1);
  assert.equal(campaign.tuning('normal').spawnMultiplier, 1);
});
