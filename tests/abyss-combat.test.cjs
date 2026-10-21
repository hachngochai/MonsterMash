'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const root=path.join(__dirname,'../js');
const plain=value=>JSON.parse(JSON.stringify(value));

function fixture(type='minotaurCalf',{level,boss,random=.25}={}) {
  const context=vm.createContext({});
  for(const name of ['abyss-config','abyss-combat'])vm.runInContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),context);
  const MM=context.MM,combat=MM.AbyssCombat,config=MM.AbyssConfig;
  const bosses=config.bosses,isBoss=boss ?? !!bosses[type];
  const spec=isBoss?bosses[type]:config.enemies[type];
  const levels={minotaurLord:110,flowerDemon:120,mirrorTurtle:130,fossilRoc:140,thousandHands:150};
  const hits=[],killed=[];
  const g={screen:'playing',level:{id:level || levels[type] || 101,hazardTypes:[]},enemies:[],player:{x:480,y:438,w:38,h:54,
    health:100,maxHealth:100,ammo:50,maxAmmo:70,dir:1,invulnerable:0,rollTime:0,shieldTime:0,shieldHits:0,
    grounded:true,vy:0,vx:0,stunTime:0},shieldCount:0,progression:{rewards:[],equipped:'gun'},random:()=>random,
    updateUI(){},floating(){},burst(){},toast(){},sound:{play(){}},clearInputs(){this.inputClears=(this.inputClears || 0)+1;},
    applyCombatEffect(effect){
      const p=this.player;
      if(this.screen!=='playing'||p.rollTime>0||p.invulnerable>0&&!effect.forceHit)return false;
      if(p.shieldTime>0&&p.shieldHits>0){p.shieldHits--;hits.push({...effect,blocked:true});return false;}
      if(!p.immortalTime)p.health-=effect.damage || 0;
      if(effect.stun)p.stunTime=Math.max(p.stunTime,effect.stun);
      if(effect.knockup){p.vy=effect.knockup;p.grounded=false;}
      hits.push({...effect,blocked:false});return true;
    },
    killEnemy(e){if(e.dead)return;if(combat.beforeKill(this,e)===false)return;e.dead=true;e.health=0;combat.onKill(this,e);this.enemies=this.enemies.filter(x=>x!==e);killed.push(e);},
    spawn(name,side=1){const s=config.enemies[name],e={...s,type:name,archetype:name,boss:false,x:side<0?24:936,y:438,
      maxHealth:s.health,phase:'active',age:0,hit:0,dir:-side};this.enemies.push(e);combat.init(this,e);return e;}
  };
  const e={...spec,type:isBoss?'boss':type,archetype:type,boss:isBoss,x:180,y:438,maxHealth:spec.health,phase:'active',dir:1,age:0,hit:0};
  g.enemies.push(e);combat.init(g,e);return {context,MM,combat,config,g,e,hits,killed};
}
function advance(f,seconds,step=1/120) {
  for(let left=seconds;left>1e-8;){const dt=Math.min(left,step);f.combat.update(f.g,dt);
    for(const e of [...f.g.enemies])f.combat.updateEnemy(f.g,e,dt);left-=dt;}
}
function forceCast(f,index=0) {
  f.e.abyssState=f.e.abyssForm==='knight'?'knight':'patrol';f.e.abyssSkillIndex=index;f.e.abyssNext=f.e.abyssClock;
  advance(f,1/120);advance(f,f.e.abyssDuration+1/120);
}
function realGame(level=150,{equipped='gun',rewards=[]}={}) {
  const context=vm.createContext({});
  for(const name of ['abyss-config','underwater-config','campaign','bosses','golem','wolves','kong','dragons','mythic','abyss-combat',
    'save-manager','boss-manager','map-manager','skill-manager','weapon-manager','input-manager','game']) {
    vm.runInContext(fs.readFileSync(path.join(root,name+'.js'),'utf8'),context,{filename:name+'.js'});
  }
  const MM=context.MM,save={version:2,completed:[],progression:{version:1,rewards,equipped,lifeKills:0}};
  const storage={getItem(){return JSON.stringify(save);},setItem(){}};
  const g=new MM.Game({headless:true,random:()=>.3,storage});g.start(level);
  g.spawnTimer=g.ammoTimer=100000;g.level.hazardTypes=[];g.player.invulnerable=0;g.player.health=g.player.maxHealth=100;
  return {MM,g,context};
}
function advanceGame(g,seconds,step=1/120) {for(let left=seconds;left>1e-8;){const dt=Math.min(left,step);g.update(dt);left-=dt;}}

test('Abyss fixed specification values are distinct from provisional balance and old actors are not owned',()=>{
  const f=fixture();
  assert.equal(f.config.balanceStatus,'provisional-playtest');
  assert.equal(f.config.fixed.parasiteFrenzy,1);assert.equal(f.config.fixed.flowerIllusions,3);
  assert.equal(f.config.fixed.turtleDamageRatio,.5);assert.equal(f.config.fixed.reflectionRatio,1);
  assert.equal(f.config.fixed.waterColumns,5);assert.equal(f.config.fixed.turtleVanishInterval,15);
  assert.equal(f.config.fixed.emotionInterval,20);assert.equal(f.config.fixed.mazeEmotionInterval,15);
  for(const type of ['spider','greenZombie','vampire','werewolf','dragon','chimera'])assert.equal(f.combat.owns(f.g,{archetype:type}),false);
});

test('parasite self-attacks for exactly one second without rearming from a hit during frenzy',()=>{
  const f=fixture('parasite');f.e.health=f.e.maxHealth=10;
  const first={kind:'gun'};f.combat.hit(f.g,f.e,1,first);assert.equal(f.e.frenzyTime,1);
  advance(f,.4);const remaining=f.e.frenzyTime;f.combat.hit(f.g,f.e,1,{kind:'bones'});
  assert.equal(f.e.frenzyTime,remaining);advance(f,.6);
  assert.equal(f.e.frenzyTime,0);assert.ok(Math.abs(f.e.health-7)<1e-8);
  assert.equal(f.e.abyssState,'rest');advance(f,2);assert.ok(Math.abs(f.e.health-7)<1e-8);
  f.combat.hit(f.g,f.e,1,{kind:'gun'});assert.equal(f.e.frenzyTime,0,'a new hit cannot rearm frenzy before ten active seconds');
  advance(f,6.99);f.combat.hit(f.g,f.e,1,{kind:'gun'});assert.equal(f.e.frenzyTime,0);
  advance(f,.01);f.combat.hit(f.g,f.e,1,{kind:'gun'});assert.equal(f.e.frenzyTime,1);
  assert.ok(Math.abs(f.e.nextParasiteFrenzyAt-20)<1e-8);
});

test('parasite self-death is counted once and cannot recursively create another frenzy',()=>{
  const f=fixture('parasite');f.e.health=1.5;f.combat.hit(f.g,f.e,1,{kind:'gun'});
  advance(f,2);assert.equal(f.killed.length,1);assert.equal(f.g.enemies.length,0);
});

test('mushrooms spawn away from the player, swell before circular explosion, and disappear',()=>{
  const f=fixture();f.g.level.hazardTypes=['mushroom'];advance(f,8);
  const z=f.g.abyssHazards[0];assert.equal(z.phase,'idle');assert.ok(Math.abs(z.x-f.g.player.x)>=f.config.combat.arena.spawnSafety);
  f.g.player.x=z.x;advance(f,.01);assert.equal(z.phase,'warning');assert.equal(f.hits.length,0);
  advance(f,.9);assert.equal(f.hits.length,0);advance(f,.12);assert.equal(f.hits.length,1);assert.equal(f.hits[0].damage,1);
  advance(f,.3);assert.equal(f.g.abyssHazards.length,0);
});

test('projectile and melee contacts can trigger traps without bypassing their warning',()=>{
  const f=fixture();const z=f.combat.addHazard(f.g,'mushroom',{x:350,y:438,w:60,h:32,phase:'idle',timer:10});
  assert.equal(f.combat.hitHazards(f.g,{x:380,y:420},320,420),true);assert.equal(z.phase,'warning');assert.equal(f.hits.length,0);
  const a=f.combat.addHazard(f.g,'spirit',{x:550,y:438,w:60,h:32,phase:'idle',timer:10});
  f.g.player.x=500;f.combat.meleeHazards(f.g,{dir:1,range:100});assert.equal(a.phase,'warning');
});

test('falling stone warns, physically descends, collides once and breaks on the floor',()=>{
  const f=fixture();f.g.player.x=420;
  const z=f.combat.addHazard(f.g,'stalactite',{x:420,y:50,w:30,h:50,phase:'warning',timer:1,vy:340,direction:1,damage:1});
  advance(f,.99);assert.equal(z.phase,'warning');assert.equal(z.y,50);assert.equal(f.hits.length,0);
  advance(f,.02);assert.equal(z.phase,'falling');assert.ok(z.y>50);advance(f,2);
  assert.equal(f.hits.length,1);assert.equal(f.g.abyssHazards.length,0);
});

test('Minotaur has actual axe, locked charge with wall stun, cave falls, and capped reinforcements',()=>{
  const axe=fixture('minotaurLord');axe.g.player.x=330;forceCast(axe,0);advance(axe,.03);
  assert.ok(axe.hits.some(h=>h.damage===2));
  const charge=fixture('minotaurLord');charge.g.player.x=800;forceCast(charge,1);
  const dir=charge.e.abyssAttackDir;charge.g.player.x=30;advance(charge,1.7);
  assert.equal(charge.e.abyssAttackDir,dir);assert.equal(charge.e.abyssState,'stunned');
  const stomp=fixture('minotaurLord');forceCast(stomp,2);
  assert.equal(stomp.g.abyssHazards.filter(z=>z.kind==='stalactite').length,stomp.config.combat.minotaur.stompCount);
  const roar=fixture('minotaurLord');forceCast(roar,3);forceCast(roar,3);forceCast(roar,3);
  assert.equal(roar.g.enemies.filter(e=>e.abyssSummoner===roar.e).length,roar.config.combat.limits.summons);
});

test('flower creates exactly three harmless fake bodies and a hit explodes one into stun without kill rewards',()=>{
  const f=fixture('flowerDemon');forceCast(f,1);
  const clones=f.g.enemies.filter(e=>e.flowerIllusion);assert.equal(clones.length,3);
  const e=clones[0];f.g.player.x=e.x;const before=f.g.player.health;advance(f,.2);
  assert.equal(f.g.player.health,before);assert.equal(f.hits.length,0);
  assert.equal(f.combat.hit(f.g,e,10,{kind:'gun'}),false);
  assert.equal(f.g.player.stunTime,f.config.combat.status.cloneExplosionStun);
  assert.equal(f.g.enemies.filter(e=>e.flowerIllusion).length,2);assert.equal(f.killed.length,0);
  f.combat.onKill(f.g,f.e);assert.equal(f.g.enemies.filter(e=>e.flowerIllusion).length,0);
});

test('pollen causes delayed bounded self-attacks and an active shield cleanses hallucination',()=>{
  const f=fixture('flowerDemon');
  f.combat.addHazard(f.g,'pollen',{x:f.g.player.x,w:100,h:24,phase:'active',timer:7,damage:0});
  advance(f,.05);assert.ok(f.g.abyss.status.hallucination>3);assert.equal(f.hits.length,0);
  advance(f,1.6);assert.equal(f.hits.filter(h=>h.kind==='hallucination-self').length,1);
  f.g.player.shieldTime=3;f.g.player.shieldHits=3;advance(f,.01);assert.equal(f.g.abyss.status.hallucination,0);
  const hp=f.g.player.health;advance(f,5);assert.equal(f.g.player.health,hp);
  const natural=fixture();natural.combat.statusEffect(natural.g,'hallucination',4);advance(natural,5);
  assert.equal(natural.g.abyss.status.hallucination,0);assert.equal(natural.hits.length,2);
});

test('turtle vanishes exactly every fifteen active seconds, without an intangible hitbox',()=>{
  const f=fixture('mirrorTurtle');f.e.abyssNext=1000;advance(f,14.99);
  assert.equal(f.e.invisible,false);advance(f,.01);assert.equal(f.e.invisible,true);assert.equal(!!f.e.intangible,false);
  const hp=f.e.health;f.combat.hit(f.g,f.e,1,{kind:'gun'});assert.equal(f.e.health,hp-.5);assert.equal(f.e.invisible,true);
  advance(f,5);assert.equal(f.e.invisible,false);advance(f,10);assert.equal(f.e.abyssVanishCount,2);
});

test('Cung Hắc and Giáo Bạch reveal the hidden turtle and its fifty percent reduction preserves fractional HP',()=>{
  for(const weapon of ['bow','spear']) {
    const f=fixture('mirrorTurtle');f.e.invisible=true;f.e.invisibleTime=5;
    const hp=f.e.health;assert.equal(f.combat.hit(f.g,f.e,3,{weaponId:weapon}),true);
    assert.equal(f.e.invisible,false);assert.equal(f.e.health,hp-1.5);
    f.combat.hit(f.g,f.e,1,{kind:'club',melee:true});assert.equal(f.e.health,hp-2);
  }
});

test('mirror returns one projectile with exactly one hundred percent source damage; melee is not reflected',()=>{
  const f=fixture('mirrorTurtle');f.e.mirrorShield=true;f.e.abyssNext=1000;f.g.player.x=390;
  const hp=f.e.health;assert.equal(f.combat.hit(f.g,f.e,5,{kind:'gun'}),false);
  assert.equal(f.e.health,hp);assert.equal(f.g.abyssShots.length,1);assert.equal(f.g.abyssShots[0].damage,5);
  advance(f,1);assert.equal(f.g.player.health,95);assert.equal(f.g.abyssShots.length,0);
  f.combat.hit(f.g,f.e,3,{kind:'hammer',melee:true});assert.equal(f.e.health,hp-1.5);
  f.combat.hit(f.g,f.e,4,{kind:'reflection',reflected:true});assert.equal(f.e.health,hp-3.5);
  assert.equal(f.g.abyssShots.length,0,'reflections never recursively reflect');
});

test('water escape releases precisely five separated columns and applies real knock-up',()=>{
  const f=fixture('mirrorTurtle');forceCast(f,1);
  const columns=f.g.abyssHazards.filter(z=>z.kind==='water-column');assert.equal(columns.length,5);
  assert.ok(columns.every((z,i)=>i===0 || z.x-columns[i-1].x>z.w+f.g.player.w));
  f.g.player.x=columns[2].x;advance(f,1.3);
  assert.ok(f.hits.some(h=>h.knockup===f.config.combat.turtle.waterKnockup));assert.equal(f.g.player.grounded,false);
  assert.equal(f.g.player.vy,f.config.combat.turtle.waterKnockup);
});

test('crow drops at five-second cadence and pauses do not advance attacks',()=>{
  const f=fixture('abyssCrow');advance(f,4.99);assert.equal(f.g.abyssHazards.length,0);
  f.g.screen='paused';advance(f,20);assert.equal(f.e.abyssClock,4.99);
  f.g.screen='playing';advance(f,.01);assert.equal(f.e.abyssCasts,1);
  assert.equal(f.g.abyssHazards[0].kind,'stalactite');advance(f,5);assert.equal(f.e.abyssCasts,2);
  f.g.killEnemy(f.e);advance(f,20);assert.equal(f.g.abyssHazards.length,0);
});

test('lantern uses one of swap or reversal every six seconds and reversal expires without changing bindings',()=>{
  const swap=fixture('lanternSkeleton',{random:.1});swap.e.speed=0;swap.g.settings={keys:{left:'KeyQ'}};
  const from=swap.e.x,player=swap.g.player.x;advance(swap,6);
  assert.equal(swap.e.abyssCasts,1);assert.equal(swap.g.player.x,from);assert.equal(swap.e.x,player);
  assert.equal(swap.g.abyss.status.reverse,0);
  const reverse=fixture('lanternSkeleton',{random:.9});reverse.e.speed=0;advance(reverse,6);
  assert.equal(reverse.e.abyssCasts,1);assert.equal(reverse.combat.inputDirection(reverse.g),-1);
  assert.equal(reverse.combat.invertAction(reverse.g,'left'),'right');assert.equal(reverse.combat.invertAction(reverse.g,'up'),'down');
  advance(reverse,4);assert.equal(reverse.combat.inputDirection(reverse.g),1);
  assert.deepEqual(swap.g.settings.keys,{left:'KeyQ'});
});

test('rolling stone has a ten-second cadence, warning, a one-way collision and offscreen cleanup',()=>{
  const f=fixture('lanternSkeleton');f.e.abyssNext=1000;f.g.level.hazardTypes=['rollingStone'];
  advance(f,9.99);assert.equal(f.g.abyssHazards.length,0);advance(f,.01);
  const z=f.g.abyssHazards[0];assert.equal(z.kind,'rolling-rock');assert.equal(z.phase,'warning');assert.ok(z.x<0 || z.x>960);
  advance(f,5);assert.ok(f.hits.some(h=>h.kind==='abyss-rolling-rock'));
  f.g.level.hazardTypes=[];advance(f,5);assert.equal(f.g.abyssHazards.length,0);
});

test('fossil bird cannot die on its first HP bar and the knight has actual scythe, dash, portal, combo and wave',()=>{
  const f=fixture('fossilRoc');f.combat.hit(f.g,f.e,10000,{kind:'gun'});
  assert.equal(f.e.abyssForm,'knight');assert.equal(f.e.health,f.config.combat.roc.knightHealth);assert.equal(f.killed.length,0);
  advance(f,f.config.combat.roc.transition);assert.equal(f.e.abyssState,'knight');assert.equal(f.e.y,438);
  for(const index of [0,1,2,3,4]) {
    f.g.abyssHazards=[];f.g.abyssShots=[];f.e.x=200;f.g.player.x=550;
    forceCast(f,index);
    if(index===0)assert.ok(f.g.abyssHazards.some(z=>z.kind==='scythe-arc'));
    if(index===1)assert.equal(f.e.abyssState,'charge');
    if(index===2)assert.ok(f.g.abyssHazards.some(z=>z.kind==='scythe-arc'&&z.phase==='warning'));
    if(index===3){advance(f,.1);assert.equal(f.e.abyssState,'combo');assert.ok(f.g.abyssHazards.some(z=>z.kind==='scythe-arc'));}
    if(index===4)assert.ok(f.g.abyssShots.some(s=>s.kind==='scythe-wave'));
  }
  f.combat.hit(f.g,f.e,10000,{kind:'gun'});assert.equal(f.e.health,0);f.g.killEnemy(f.e);assert.equal(f.killed.length,1);
});

test('fossil sonic collision reverses input and portal strike gives a fresh dodge warning after teleport',()=>{
  const f=fixture('fossilRoc');f.g.player.x=520;forceCast(f,0);advance(f,2);
  assert.ok(f.g.abyss.status.reverse>0);assert.ok(f.g.shake>0);
  const before=f.g.player.x;forceCast(f,1);assert.notEqual(f.g.player.x,before);
  const strike=f.g.abyssHazards.find(z=>z.kind==='rift-strike');assert.ok(strike);
  assert.equal(strike.phase,'warning');assert.ok(strike.timer>1);
});

test('deity rotates one active head at twenty seconds, not four independent boss HP pools',()=>{
  const f=fixture('thousandHands');assert.equal(f.e.emotion,'joy');assert.equal(f.combat.gravityDirection(f.g),-1);
  advance(f,19.99);assert.equal(f.e.emotion,'joy');advance(f,.01);assert.equal(f.e.emotion,'rage');
  assert.equal(f.combat.gravityDirection(f.g),1);assert.equal(f.g.enemies.filter(e=>e.boss).length,1);
  advance(f,20);assert.equal(f.e.emotion,'love');assert.equal(f.g.enemies.filter(e=>e.playerShadow).length,1);
  advance(f,20);assert.equal(f.e.emotion,'hate');assert.equal(f.g.abyss.darkness,true);
});

test('deity maze refills only once and only Rage projection damages its shared HP regardless of active head',()=>{
  const f=fixture('thousandHands'),max=f.e.maxHealth;
  f.combat.hit(f.g,f.e,max/2,{kind:'gun'});assert.equal(f.e.abyssPhase,2);assert.equal(f.e.health,max);assert.equal(f.e.mazeRefills,1);
  const projections=f.g.enemies.filter(e=>e.emotionProjection);assert.equal(projections.length,4);
  assert.equal(f.g.enemies.filter(e=>e.boss).length,1);advance(f,f.config.combat.deity.transition);
  const rage=projections.find(e=>e.emotion==='rage');assert.equal(f.e.emotion,'joy');
  for(const clone of projections.filter(e=>e!==rage))assert.equal(f.combat.hit(f.g,clone,30,{kind:'gun'}),false);
  assert.equal(f.e.health,max);assert.equal(f.combat.hit(f.g, rage,max/2,{kind:'gun'}),true);
  assert.equal(f.e.health,max/2);assert.equal(f.e.mazeRefills,1);
  assert.equal(f.combat.hit(f.g,f.e,100,{kind:'gun'}),false,'central statue is not a second target');
  f.combat.hit(f.g,rage,max,{kind:'gun'});assert.equal(f.killed.length,1);assert.equal(f.g.enemies.length,0);
  assert.equal(f.g.abyss.gravity,1);assert.equal(f.g.abyss.darkness,false);assert.equal(f.g.abyss.maze,false);
});

test('maze emotion cadence is fifteen seconds, projections move while Rage remains the true target',()=>{
  const f=fixture('thousandHands');f.combat.hit(f.g,f.e,f.e.maxHealth/2,{kind:'gun'});
  const rage=f.g.enemies.find(e=>e.emotionProjection&&e.emotion==='rage'),x=rage.x;
  advance(f,14.99);assert.equal(f.e.emotion,'joy');assert.notEqual(rage.x,x);advance(f,.01);assert.equal(f.e.emotion,'rage');
  const before=f.e.health;f.combat.hit(f.g,rage,1,{kind:'gun'});assert.equal(f.e.health,before-1);
});

test('dark player clones own copied HP, weapons, unlocked skills, ammo and cooldowns without touching the save',()=>{
  const f=fixture('thousandHands');f.g.progression={rewards:[10,20,30,40,50,80,90,100],equipped:'axes'};
  f.g.player.health=12;f.g.player.maxHealth=20;f.g.player.ammo=15;f.g.shieldCount=3;
  f.MM.WeaponManager={profile(){return {kind:'axes',equipped:'axes',damage:2,cost:0,cooldown:.55,range:80,melee:true};}};
  f.e.emotion='love';const shadow=f.combat.spawnShadow(f.g,f.e);
  assert.equal(shadow.health,12);assert.equal(shadow.shadowSnapshot.weapon,'axes');assert.deepEqual(plain(shadow.shadowSnapshot.unlocks),f.g.progression.rewards);
  assert.notEqual(shadow.shadowSnapshot.unlocks,f.g.progression.rewards);assert.equal('save' in shadow,false);
  shadow.health=3;assert.equal(f.g.player.health,12);shadow.phase='active';shadow.x=f.g.player.x-90;
  advance(f,.1);assert.ok(shadow.shadowRollTime>0);assert.ok(Math.abs(shadow.shadowRollCooldown-(f.config.combat.deity.shadowRollCooldown-.1+1/120))<1e-8);
  const attacks=f.hits.length;advance(f,.1);assert.ok(f.hits.length<=attacks+1,'one roll cannot repeatedly damage one target');
  const other=f.combat.spawnShadow(f.g,f.e);assert.equal(other,null,'no clone from clone or unbounded duplicate');
  f.e.emotion='rage';advance(f,.01);assert.equal(f.g.enemies.some(e=>e.playerShadow),false);
});

test('only axes shadow rolls deal extra roll damage; other copied weapons use their own ammo and cadence',()=>{
  for(const weapon of ['gun','bones','club','bow','spear','axes']) {
    const f=fixture('thousandHands');f.g.progression.rewards=[10,30,40,60,90,100];f.e.emotion='love';
    const profiles={gun:{damage:1,cost:1,cooldown:.5},bones:{damage:1,cost:3,cooldown:.65,count:3,spread:[-12,0,12]},
      club:{damage:3,cost:0,cooldown:.75,range:95,melee:true},bow:{damage:1,cost:5,cooldown:.9,count:5,spread:[-12,-6,0,6,12]},
      spear:{damage:3,cost:1,cooldown:.8},axes:{damage:2,cost:0,cooldown:.55,range:80,melee:true}};
    f.MM.WeaponManager={profile(){return {...profiles[weapon],kind:weapon,equipped:weapon};}};
    const clone=f.combat.spawnShadow(f.g,f.e);clone.phase='active';clone.x=f.g.player.x-90;clone.shadowShotTimer=0;
    advance(f,.1);assert.equal(clone.shadowRollTime>0,weapon==='axes',weapon);
    if(weapon!=='axes')assert.ok(!f.hits.some(h=>h.kind==='shadow-axes-roll'),weapon);
    if(['gun','bones','bow','spear'].includes(weapon))assert.ok(clone.ammo<f.g.player.ammo,weapon);
  }
});

test('Abyss reset clears hazards, shadows, gravity, reverse status and darkness on restart',()=>{
  const f=fixture('thousandHands');f.e.emotion='love';f.combat.spawnShadow(f.g,f.e);
  f.g.abyss.status.reverse=3;f.g.abyss.status.hallucination=4;f.g.abyss.darkness=true;
  f.combat.addHazard(f.g,'hand',{owner:f.e,x:400});
  f.combat.reset(f.g);assert.equal(f.g.abyssHazards.length,0);assert.equal(f.g.abyssShots.length,0);
  assert.equal(f.g.enemies.some(e=>e.playerShadow||e.emotionProjection||e.flowerIllusion),false);
  assert.equal(f.g.abyss.gravity,1);assert.equal(f.g.abyss.darkness,false);assert.equal(f.g.abyss.status.reverse,0);
  assert.equal(f.g.player.abyssReverse,0);assert.equal(f.g.player.abyssHallucination,0);
});

test('real Game: joy reverses physical gravity to a collidable ceiling and jumping pushes away from that ceiling',()=>{
  const {g,MM}=realGame(150),boss=g.spawn('boss',-1);boss.phase='active';boss.abyssNext=1000;boss.nextEmotion=1000;
  advanceGame(g,1.5);assert.equal(MM.AbyssCombat.gravityDirection(g),-1);
  assert.equal(g.player.y,MM.AbyssCombat.ceilingY(g));assert.equal(g.player.grounded,true);
  g.jump();advanceGame(g,.1);assert.ok(g.player.y>MM.AbyssCombat.ceilingY(g));assert.equal(g.player.grounded,false);
  g.goHome();assert.equal(g.abyss.gravity,1);g.start(101);assert.equal(g.abyss.gravity,1);assert.equal(g.player.y,438);
});

test('real Game: turtle reflection preserves five HP of damage while its own half damage is applied once',()=>{
  const {g}=realGame(130),boss=g.spawn('boss',-1);boss.phase='active';boss.x=300;boss.abyssNext=1000;boss.nextVanish=1000;
  const max=boss.health;boss.mirrorShield=true;g.player.x=500;
  assert.equal(g.dealEnemyDamage(boss,5,{kind:'gun',dir:-1}),false);assert.equal(boss.health,max);
  advanceGame(g,.9);assert.equal(g.player.health,95);
  boss.mirrorShield=false;g.dealEnemyDamage(boss,3,{kind:'club',melee:true});assert.equal(boss.health,max-1.5);
});

test('real Game: neither first bird HP nor first deity threshold grants premature boss completion',()=>{
  for(const level of [140,150]) {
    const {g}=realGame(level),boss=g.spawn('boss',-1);boss.phase='active';g.bossSpawned=true;
    g.dealEnemyDamage(boss,10000,{kind:'gun'});
    assert.equal(boss.dead,undefined);assert.equal(g.bossDefeated,false);assert.equal(g.screen,'playing');
    assert.equal(g.progression.rewards.includes(level),false);
    if(level===140)assert.equal(boss.abyssForm,'knight');else assert.equal(boss.abyssPhase,2);
  }
});

test('real Game: final boss death grants each new reward once and deity death collapses all temporary expressions',()=>{
  for(const level of [110,120,130,140,150]) {
    const {g,MM}=realGame(level),boss=g.spawn('boss',-1);boss.phase='active';g.bossSpawned=true;
    g.regularSpawned=g.level.target;g.levelKills=g.level.target;boss.abyssNext=1000;
    g.dealEnemyDamage(boss,10000,{kind:'hammer',melee:true});
    if(level===140) {advanceGame(g,MM.AbyssConfig.combat.roc.transition);g.dealEnemyDamage(boss,10000,{kind:'hammer',melee:true});}
    if(level===150) {
      advanceGame(g,MM.AbyssConfig.combat.deity.transition);
      const rage=g.enemies.find(e=>e.emotionProjection&&e.emotion==='rage');
      assert.ok(rage);g.dealEnemyDamage(rage,10000,{kind:'hammer',melee:true});
    }
    advanceGame(g,Math.max(MM.AbyssConfig.combat.death.duration,MM.AbyssConfig.combat.death.minotaurDuration,MM.AbyssConfig.combat.death.deityDuration)+.05);
    assert.equal(g.screen,'won',String(level));assert.equal(g.bossDefeated,true);
    assert.equal(g.progression.rewards.filter(id=>id===level).length,1);
    assert.equal(MM.BossManager.onDefeated(g,boss),false);
    if(level===150){assert.equal(g.abyss.gravity,1);assert.equal(g.abyss.darkness,false);assert.equal(g.enemies.length,0);}
    if(level===110)assert.equal(MM.WeaponManager.available(g).includes('hammer'),false);
    if(level===120)assert.ok(MM.WeaponManager.available(g).includes('hammer'));
    if(level===140)assert.ok(MM.WeaponManager.available(g).includes('scythe'));
  }
});

test('real Game: shadow copies the unlocked inventory without switching the original weapon and can use a melee fallback when empty',()=>{
  const {g,MM}=realGame(150,{equipped:'gun',rewards:[10,20,30,40,50,60,80,90,100,120,130,140]});
  const boss=g.spawn('boss',-1);boss.phase='active';boss.emotion='love';boss.abyssEmotionStarted=true;
  g.player.ammo=0;const shadow=MM.AbyssCombat.spawnShadow(g,boss);shadow.phase='active';shadow.shadowShotTimer=0;
  assert.deepEqual(plain(shadow.shadowSnapshot.weapons),['gun','bones','club','bow','spear','axes','hammer','scythe']);
  assert.equal(shadow.shadowSnapshot.profiles.spear.damage,3);assert.equal(shadow.shadowSnapshot.profiles.spear.range,700);
  assert.equal(g.progression.equipped,'gun');advanceGame(g,.1);
  assert.equal(shadow.shadowSnapshot.weapon,'club');assert.equal(g.progression.equipped,'gun');assert.equal(g.player.ammo,0);
});

test('flower bone animation variants have distinct ground, root, sweep and flower hit areas',()=>{
  const f=fixture('flowerDemon'),variants=[];
  for(let i=0;i<4;i++) {
    f.g.abyssHazards=[];forceCast(f,2);const z=f.g.abyssHazards.find(z=>z.kind==='root');
    assert.ok(z);variants.push(z.boneVariant);
    if(z.boneVariant==='stomp')assert.equal(z.x,f.e.x);
    if(z.boneVariant==='sweep')assert.equal(z.h,f.config.combat.flower.sweepHeight);
    if(z.boneVariant==='flower')assert.equal(z.w,f.config.combat.flower.flowerBiteWidth);
  }
  assert.deepEqual(variants,['stomp','roots','sweep','flower']);
});

test('actual Minotaur death leaves one non-combat fall-and-planted-axe snapshot, not another HP actor',()=>{
  const f=fixture('minotaurLord');f.e.health=0;f.g.killEnemy(f.e);
  assert.equal(f.killed.length,1);assert.equal(f.g.enemies.length,0);assert.equal(f.g.abyssCorpses.length,1);
  const corpse=f.g.abyssCorpses[0];
  assert.equal(corpse.deathStyle,'minotaur-fall');assert.equal(corpse.duration,f.config.combat.death.minotaurDuration);
  assert.equal('health' in corpse,false);assert.equal('maxHealth' in corpse,false);assert.equal('owner' in corpse,false);
  f.combat.onKill(f.g,f.e);assert.equal(f.g.abyssCorpses.length,1,'cleanup is idempotent');
  const x=corpse.x;f.e.x=900;assert.equal(corpse.x,x,'snapshot is independent of the retired actor');
});

test('first boss HP/threshold cannot emit a death snapshot; final deity death collapses after the real kill',()=>{
  for(const type of ['fossilRoc','thousandHands']) {
    const f=fixture(type);f.combat.hit(f.g,f.e,10000,{kind:'hammer',melee:true});
    assert.equal(f.g.abyssCorpses.length,0);assert.equal(f.killed.length,0);
    advance(f,type==='fossilRoc'?f.config.combat.roc.transition:f.config.combat.deity.transition);
    if(type==='fossilRoc'){f.combat.hit(f.g,f.e,10000,{kind:'hammer',melee:true});f.g.killEnemy(f.e);}
    else f.combat.hit(f.g,f.g.enemies.find(e=>e.emotionProjection&&e.emotion==='rage'),10000,{kind:'hammer',melee:true});
    assert.equal(f.killed.length,1);assert.equal(f.g.abyssCorpses.length,1);
    if(type==='thousandHands')assert.equal(f.g.abyssCorpses[0].deathStyle,'deity-collapse');
  }
});

test('death animation uses active seconds, suppresses attacks and hazards, and is cleaned by expiry or restart',()=>{
  const f=fixture('minotaurLord');f.g.level.hazardTypes=['mushroom','stalactite'];f.g.player.health=1;
  f.combat.addHazard(f.g,'hand',{owner:f.e,x:f.g.player.x,w:100,h:300,phase:'active',timer:1,damage:2});
  f.g.abyss.status.hallucination=4;f.g.player.burnTime=2;f.e.health=0;f.g.killEnemy(f.e);
  assert.equal(f.g.abyssHazards.length,0);assert.equal(f.g.abyssShots.length,0);assert.equal(f.g.player.burnTime,0);
  const corpse=f.g.abyssCorpses[0],duration=corpse.duration;advance(f,duration/2);
  assert.ok(Math.abs(corpse.progress-.5)<1e-8);assert.equal(f.g.player.health,1);assert.equal(f.g.abyss.awaitingVictory,true);
  f.g.screen='paused';advance(f,20);assert.ok(Math.abs(corpse.progress-.5)<1e-8);
  f.g.screen='playing';advance(f,duration/2);assert.equal(f.g.abyssCorpses.length,0);assert.equal(f.g.abyss.awaitingVictory,false);
  assert.equal(f.killed.length,1);assert.equal(f.g.player.health,1);
  const restart=fixture('minotaurLord');restart.e.health=0;restart.g.killEnemy(restart.e);restart.combat.reset(restart.g);
  assert.equal(restart.g.abyssCorpses.length,0);assert.equal(restart.g.abyss.awaitingVictory,false);
});

test('real Game: victory waits for the dead boss animation while death/reward accounting is already final',()=>{
  const {g,MM}=realGame(110),boss=g.spawn('boss',-1);boss.phase='active';g.bossSpawned=true;
  g.regularSpawned=g.level.target;g.levelKills=g.level.target;g.player.health=1;
  g.dealEnemyDamage(boss,10000,{kind:'hammer',melee:true});
  assert.equal(g.bossDefeated,true);assert.equal(g.enemies.length,0);assert.equal(g.progression.rewards.filter(id=>id===110).length,1);
  assert.equal(g.screen,'playing');assert.equal(g.abyssCorpses.length,1);
  const seconds=MM.AbyssConfig.combat.death.minotaurDuration;advanceGame(g,seconds-.01);
  assert.equal(g.screen,'playing');assert.equal(g.player.health,1);advanceGame(g,.02);
  assert.equal(g.screen,'won');assert.equal(g.abyssCorpses.length,0);assert.equal(g.totalKills,1);
});

test('Minotaur rage has an independent ten-second active cadence, freezes while paused and preserves the old skill cycle',()=>{
  const f=fixture('minotaurLord');f.e.abyssNext=1000;f.e.speed=0;
  advance(f,9.99);assert.equal(f.e.minotaurRage,false);assert.equal(f.e.minotaurRageCount,0);
  f.g.screen='paused';advance(f,30);assert.equal(f.e.abyssClock,9.99);assert.equal(f.e.minotaurRagePending,false);
  f.g.screen='playing';advance(f,.01);
  assert.equal(f.config.fixed.minotaurRageInterval,10);assert.equal(f.e.minotaurRage,true);
  assert.equal(f.e.abyssState,'tell');assert.equal(f.e.abyssSkill,'rage-charge');assert.equal(f.e.minotaurRageCount,1);
  assert.ok(Math.abs(f.e.minotaurRageStartedAt-10)<1e-8);assert.equal(f.e.abyssSkillIndex,0);
  advance(f,9.99);assert.equal(f.e.minotaurRageCount,1);advance(f,.01);
  assert.equal(f.e.minotaurRageCount,2);assert.ok(Math.abs(f.e.minotaurRageStartedAt-20)<1e-8);
  assert.equal(f.e.nextMinotaurRage,30);assert.equal(f.e.abyssSkillIndex,0);
  advance(f,4);f.e.abyssNext=f.e.abyssClock;advance(f,1/120);
  assert.equal(f.e.abyssSkill,'axe');assert.equal(f.e.abyssSkillIndex,1,'rage does not replace or advance the original four-skill sequence');
});

test('ten-second rage queues behind a current damage tell and its recovery instead of interrupting or overlapping',()=>{
  const f=fixture('minotaurLord');f.e.abyssClock=9.8;f.e.abyssNext=1000;f.e.speed=0;
  Object.assign(f.e,{abyssState:'tell',abyssSkill:'axe',abyssTimer:.8,abyssDuration:.8,abyssAttackDir:1});
  advance(f,.2);assert.equal(f.e.minotaurRagePending,true);assert.equal(f.e.minotaurRage,false);
  assert.equal(f.e.abyssSkill,'axe');assert.equal(f.e.abyssState,'tell');assert.equal(f.e.minotaurRageCount,0);
  advance(f,.6);assert.equal(f.e.abyssState,'rest');assert.equal(f.e.minotaurRagePending,true);
  advance(f,f.config.combat.minotaur.rest);assert.equal(f.e.abyssState,'patrol');assert.equal(f.e.minotaurRageCount,0);
  advance(f,1/120);assert.equal(f.e.abyssSkill,'rage-charge');assert.equal(f.e.minotaurRageCount,1);
  assert.equal(f.e.minotaurRagePending,false);assert.ok(f.e.minotaurRageStartedAt>11);
  advance(f,.2);assert.equal(f.e.minotaurRageCount,1,'queued rage starts one cast only');
});

test('rage rush is faster than a regular charge, locks its heading and retains the wall-stun opportunity',()=>{
  const regular=fixture('minotaurLord');regular.e.speed=0;regular.e.abyssNext=1000;regular.e.x=200;regular.g.player.x=800;
  forceCast(regular,1);const x=regular.e.x;advance(regular,.1);const normalDistance=regular.e.x-x;
  const rage=fixture('minotaurLord');rage.e.speed=0;rage.e.abyssNext=1000;rage.e.x=200;rage.g.player.x=800;
  advance(rage,10);const dir=rage.e.abyssAttackDir;rage.g.player.x=30;
  advance(rage,rage.config.combat.minotaur.rageWindup);assert.equal(rage.e.abyssState,'charge');
  const start=rage.e.x;advance(rage,.1);const rageDistance=rage.e.x-start;
  assert.ok(rageDistance>normalDistance);assert.ok(Math.abs(rageDistance-rage.config.combat.minotaur.rageSpeed*.1)<1e-7);
  assert.equal(rage.e.abyssAttackDir,dir,'rush cannot retarget after the tell');
  advance(rage,1);assert.equal(rage.e.abyssState,'stunned');assert.equal(rage.e.minotaurRage,true);
  assert.ok(rage.e.abyssTimer<=rage.config.combat.minotaur.wallStun);advance(rage,rage.config.combat.minotaur.wallStun);
  assert.equal(rage.e.minotaurRage,false);assert.equal(rage.e.abyssState,'patrol');
});

test('rage contact keeps two damage, hits once per rush and remains blockable by an ordinary shield',()=>{
  for(const shielded of [false,true]) {
    const f=fixture('minotaurLord');f.e.speed=0;f.e.abyssNext=1000;f.e.x=200;f.g.player.x=350;
    if(shielded){f.g.player.shieldTime=2;f.g.player.shieldHits=1;}
    advance(f,10+f.config.combat.minotaur.rageWindup+.4);
    const contact=f.hits.filter(hit=>hit.kind==='abyss-charge');assert.equal(contact.length,1);
    assert.equal(contact[0].damage,2);assert.equal(contact[0].blocked,shielded);
    assert.equal(f.g.player.health,shielded?100:98);
  }
});

test('Minotaur rage visual and pending flags clear on actual death and arena reset',()=>{
  const f=fixture('minotaurLord');f.e.abyssNext=1000;advance(f,10);
  f.e.minotaurRagePending=true;f.e.health=0;f.g.killEnemy(f.e);
  assert.equal(f.e.minotaurRage,false);assert.equal(f.e.minotaurRagePending,false);
  const retry=fixture('minotaurLord');retry.e.abyssNext=1000;advance(retry,10);retry.e.minotaurRagePending=true;
  retry.combat.reset(retry.g);assert.equal(retry.e.minotaurRage,false);assert.equal(retry.e.minotaurRagePending,false);
});

test('child parasite first melee waits ten active seconds and repeats only at the next ten-second deadline',()=>{
  const f=fixture('parasite');f.e.x=400;f.e.speed=0;f.g.player.x=480;
  assert.equal(f.config.fixed.parasiteCastInterval,10);assert.equal(f.e.abyssNext,10);
  advance(f,9.99);assert.equal(f.e.abyssState,'patrol');assert.equal(f.hits.length,0);
  advance(f,.01);assert.equal(f.e.abyssState,'tell');assert.equal(f.e.abyssNext,20);assert.equal(f.hits.length,0);
  advance(f,f.config.combat.regular.windup+.02);assert.equal(f.hits.length,1);
  advance(f,19.99-f.e.abyssClock);assert.equal(f.hits.length,1);assert.equal(f.e.abyssState,'patrol');
  advance(f,.01);assert.equal(f.e.abyssState,'tell');assert.ok(Math.abs(f.e.abyssNext-30)<1e-8);
  advance(f,f.config.combat.regular.windup+.02);assert.equal(f.hits.length,2);
});

test('parasite ten-second melee clock excludes portals, pause and petrification',()=>{
  const f=fixture('parasite');f.e.x=400;f.e.speed=0;f.e.phase='warning';f.e.warning=3;
  advance(f,3);assert.equal(f.e.abyssClock,0);assert.equal(f.e.phase,'active');
  f.g.screen='paused';advance(f,20);assert.equal(f.e.abyssClock,0);
  f.g.screen='playing';f.e.petrifiedTime=2;advance(f,2);assert.equal(f.e.abyssClock,0);
  f.e.petrifiedTime=0;advance(f,9.99);assert.equal(f.e.abyssState,'patrol');assert.equal(f.hits.length,0);
  advance(f,.01);assert.equal(f.e.abyssState,'tell');assert.equal(f.hits.length,0);
});

test('parasite hit-triggered frenzy keeps its one-second duration and ten-second cooldown through pause and freeze',()=>{
  const f=fixture('parasite');f.e.health=f.e.maxHealth=30;f.combat.hit(f.g,f.e,1,{kind:'gun'});
  assert.equal(f.e.frenzyTime,1);assert.equal(f.e.nextParasiteFrenzyAt,10);advance(f,1);assert.equal(f.e.frenzyTime,0);
  f.g.screen='paused';advance(f,10);f.g.screen='playing';f.e.petrifiedTime=2;advance(f,2);f.e.petrifiedTime=0;
  assert.ok(Math.abs(f.e.abyssClock-1)<1e-8);advance(f,8.99);
  f.combat.hit(f.g,f.e,1,{kind:'bow'});assert.equal(f.e.frenzyTime,0);
  advance(f,.01);f.combat.hit(f.g,f.e,1,{kind:'bow'});assert.equal(f.e.frenzyTime,1);
  assert.ok(Math.abs(f.e.nextParasiteFrenzyAt-20)<1e-8);advance(f,1);assert.equal(f.e.frenzyTime,0);
});

test('parasite nerf applies to summoned children while Flower Demon boss timing and phases remain unchanged',()=>{
  const f=fixture('flowerDemon');assert.deepEqual(plain(f.config.combat.flower.intervals),[4.5,4,3.5]);
  advance(f,4.49);assert.equal(f.e.abyssState,'patrol');advance(f,.01);assert.equal(f.e.abyssState,'tell');
  assert.equal(f.e.abyssSkill,'pollen');assert.ok(Math.abs(f.e.abyssNext-9)<1e-8);
  f.e.health=f.e.maxHealth*.6;advance(f,.01);assert.equal(f.e.abyssPhase,2);
  f.e.health=f.e.maxHealth*.2;advance(f,.01);assert.equal(f.e.abyssPhase,3);
  forceCast(f,3);const children=f.g.enemies.filter(e=>e.abyssSummoner===f.e);
  assert.equal(children.length,2);assert.ok(children.every(e=>e.archetype==='parasite'&&e.abyssNext===10&&e.nextParasiteFrenzyAt===0));
});
