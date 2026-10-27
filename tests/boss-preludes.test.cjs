'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(id) {
  const context = vm.createContext({});
  const modules = ['abyss-config','underwater-config','middle-sea-config','predator-sea-config','deep-sea-config','final-sea-config','island-config','campaign','game'];
  for (const name of modules) vm.runInContext(fs.readFileSync('js/' + name + '.js', 'utf8'), context);
  const game = new context.MM.Game({headless:true, random:()=>.5, storage:{getItem:()=>null,setItem(){}}});
  game.start(id);
  return {game, campaign:context.MM.Campaign};
}

test('all 25 boss stages have a positive ordinary quota and a valid enemy pool', () => {
  const {campaign} = fixture(1);
  for (const level of campaign.levels.filter(level => level.boss)) {
    assert.ok(Number.isInteger(level.target) && level.target > 0, 'quota at ' + level.id);
    assert.ok(level.types.length > 0, 'pool at ' + level.id);
    assert.ok(level.types.every(type => campaign.enemyTypes[type]), 'enemy identities at ' + level.id);
    assert.ok(level.maxAlive > 1, 'warmup cap at ' + level.id);
  }
});

test('Island warmups keep the preceding stage roster and quota', () => {
  const {campaign} = fixture(201);
  for (const id of [210,220,230,240,250]) {
    const level = campaign.getLevel(id), preceding = campaign.getLevel(id - 1);
    assert.deepEqual(Array.from(level.types), Array.from(preceding.types));
    assert.equal(level.target, preceding.target);
    assert.equal(level.spawnInterval, preceding.spawnInterval);
    assert.equal(level.maxAlive, preceding.maxAlive);
  }
});

test('each boss is gated by actual ordinary kills, ignores summons and spawns exactly once', () => {
  for (let id = 10; id <= 250; id += 10) {
    const {game:g} = fixture(id);
    g.spawnTimer = 999;
    g.checkCompletion();
    assert.equal(g.bossSpawned, false, 'early boss at ' + id);
    const summoned = g.spawn(g.level.types[0], 1);
    summoned.minion = true;
    g.killEnemy(summoned);
    assert.equal(g.levelKills, 0, 'summon quota at ' + id);
    for (let count = 0; count < g.level.target - 1; count++) {
      g.killEnemy(g.spawn(g.level.types[count % g.level.types.length], 1));
    }
    assert.equal(g.bossSpawned, false, 'boss before final kill at ' + id);
    assert.equal(g.screen, 'playing');
    g.killEnemy(g.spawn(g.level.types[0], 1));
    assert.equal(g.bossSpawned, true);
    assert.equal(g.enemies.filter(enemy => enemy.boss).length, 1);
    assert.equal(g.screen, 'playing');
    for (let i = 0; i < 4; i++) g.checkCompletion();
    assert.equal(g.enemies.filter(enemy => enemy.boss).length, 1, 'duplicate boss at ' + id);
  }
});
