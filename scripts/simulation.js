/**
 * Tam Quốc Loạn Nhập — Multi-Agent Simulation Engine
 * Tick-based concurrency: all agents decide simultaneously on world state at tick start
 * World resolves collisions, updates state, produces narrative
 */

const fs = require('fs');
const path = require('path');

// Load world bible
const WORLD_BIBLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'world_bible.json'), 'utf-8'));

// Load personas
const PERSONA_DIR = path.join(__dirname, '..', 'personas');
const PERSONAS = {};
fs.readdirSync(PERSONA_DIR).filter(f => f.endsWith('.json')).forEach(f => {
  const p = JSON.parse(fs.readFileSync(path.join(PERSONA_DIR, f), 'utf-8'));
  PERSONAS[p.id] = p;
});

// Deterministic RNG (seeded)
class SeededRNG {
  constructor(seed = 12345) { this.seed = seed >>> 0; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
  choice(arr) { return arr[this.nextInt(arr.length)]; }
  shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = this.nextInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}

// World State
class World {
  constructor(seed = 12345) {
    this.rng = new SeededRNG(seed);
    this.tick = 0;
    this.provinces = this.initProvinces();
    this.factions = this.initFactions();
    this.history = [];
    this.knowledgeGraph = this.initKnowledgeGraph(); // who knows whom
    this.deadFactions = new Set();
  }

  initProvinces() {
    const provs = {};
    WORLD_BIBLE.provinces.forEach(p => {
      provs[p.id] = { ...p, owner: p.owner, garrison: 0, fortification: 0, devastation: 0 };
    });
    // Assign initial garrisons based on faction starting provinces
    Object.values(WORLD_BIBLE.factions).forEach(f => {
      const startProvs = f.starting_provinces || (f.starting_province ? [f.starting_province] : []);
      startProvs.forEach(pid => {
        if (provs[pid]) {
          provs[pid].owner = f.id;
          provs[pid].garrison = Math.floor(f.stats.troops / startProvs.length);
        }
      });
    });
    return provs;
  }

  initFactions() {
    const facs = {};
    WORLD_BIBLE.factions.forEach(f => {
      const startProvs = f.starting_provinces || (f.starting_province ? [f.starting_province] : []);
      facs[f.id] = {
        ...f,
        provinces: startProvs,
        stats: { ...f.stats },
        alive: true,
        knownFactions: new Set([f.id]),
        lastAction: null,
        lastQuote: null,
        statusBadge: 'Idle',
        resources: { troops: f.stats.troops, grain: f.stats.grain, gold: 0 }
      };
    });
    return facs;
  }

  initKnowledgeGraph() {
    const kg = {};
    Object.keys(this.factions).forEach(fid => { kg[fid] = new Set([fid]); });
    // Historical warlords know each other
    const historical = ['cao_cao', 'liu_bei', 'sun_quan'];
    historical.forEach(a => historical.forEach(b => { if (a !== b) kg[a].add(b); }));
    // Time-displaced know NO ONE initially (fog of war)
    return kg;
  }

  // Get observable provinces for a faction (own + neighbors)
  getObservableProvinces(factionId) {
    const fac = this.factions[factionId];
    if (!fac || !fac.alive) return {};
    const observable = new Set(fac.provinces);
    fac.provinces.forEach(pid => {
      const prov = this.provinces[pid];
      if (prov) prov.neighbors.forEach(n => observable.add(n));
    });
    const result = {};
    observable.forEach(pid => {
      const p = this.provinces[pid];
      if (p) result[pid] = { ...p };
    });
    return result;
  }

  // Get known factions (for diplomacy target selection)
  getKnownFactions(factionId) {
    const fac = this.factions[factionId];
    if (!fac || !fac.alive) return [];
    return Array.from(this.knowledgeGraph[factionId]).filter(id => this.factions[id]?.alive && id !== factionId);
  }

  // Resolve all actions simultaneously
  resolveTick(actions) {
    this.tick++;
    const events = [];

    // Phase 1: Internal actions (reform, recruit, build, tax)
    events.push(...this.resolveInternal(actions));

    // Phase 2: Military movement & combat
    events.push(...this.resolveMilitary(actions));

    // Phase 3: Diplomacy
    events.push(...this.resolveDiplomacy(actions));

    // Phase 4: Subterfuge
    events.push(...this.resolveSubterfuge(actions));

    // Phase 5: Upkeep (grain consumption, income)
    events.push(...this.resolveUpkeep());

    // Phase 6: Check victory/death
    events.push(...this.checkVictory());

    // Update knowledge graph from events
    this.updateKnowledge(events);

    // Record history
    this.history.push({ tick: this.tick, events, factionsSnapshot: this.snapshotFactions() });

    return { tick: this.tick, events, factions: this.snapshotFactions(), provinces: this.snapshotProvinces() };
  }

  resolveInternal(actions) {
    const events = [];
    Object.entries(actions).forEach(([fid, action]) => {
      const fac = this.factions[fid];
      if (!fac || !fac.alive) return;
      if (action.type !== 'INTERNAL') return;

      const prov = this.provinces[fac.provinces[0]]; // capital province
      if (!prov) return;

      switch (action.subtype) {
        case 'RECRUIT': {
          const cost = action.amount * 2; // 2 grain per troop
          if (fac.resources.grain >= cost && fac.resources.troops + action.amount <= prov.population * 0.1) {
            fac.resources.troops += action.amount;
            fac.resources.grain -= cost;
            events.push({ type: 'RECRUIT', faction: fid, amount: action.amount, province: prov.id });
          }
          break;
        }
        case 'FARM': {
          const gain = Math.floor(prov.population * 0.001 * (prov.fertility / 10));
          fac.resources.grain += gain;
          events.push({ type: 'FARM', faction: fid, gain, province: prov.id });
          break;
        }
        case 'BUILD': {
          const cost = 500;
          if (fac.resources.grain >= cost) {
            fac.resources.grain -= cost;
            prov.fortification = Math.min(10, prov.fortification + 1);
            events.push({ type: 'BUILD', faction: fid, province: prov.id, level: prov.fortification });
          }
          break;
        }
        case 'REFORM': {
          // Abstract: improves loyalty, reduces corruption over time
          fac.stats.loyalty = Math.min(100, fac.stats.loyalty + 2);
          events.push({ type: 'REFORM', faction: fid, loyalty: fac.stats.loyalty });
          break;
        }
        case 'TAX': {
          const gain = Math.floor(prov.population * WORLD_BIBLE.economy.base_tax_per_pop);
          fac.resources.gold += gain;
          fac.stats.loyalty = Math.max(0, fac.stats.loyalty - 1);
          events.push({ type: 'TAX', faction: fid, gold: gain, loyalty: fac.stats.loyalty });
          break;
        }
      }
    });
    return events;
  }

  resolveMilitary(actions) {
    const events = [];
    const movements = [];

    // Collect movements
    Object.entries(actions).forEach(([fid, action]) => {
      const fac = this.factions[fid];
      if (!fac || !fac.alive) return;
      if (action.type !== 'MILITARY') return;
      if (!action.target || !action.amount) return;

      const sourceProvId = fac.provinces.find(p => this.provinces[p].garrison >= action.amount);
      if (!sourceProvId) return;

      movements.push({ faction: fid, from: sourceProvId, to: action.target, troops: action.amount, intent: action.subtype });
    });

    // Group by target province
    const byTarget = {};
    movements.forEach(m => { (byTarget[m.to] = byTarget[m.to] || []).push(m); });

    // Resolve each target
    Object.entries(byTarget).forEach(([targetId, movers]) => {
      const targetProv = this.provinces[targetId];
      if (!targetProv) return;

      const defenderId = targetProv.owner;
      const defenderFac = this.factions[defenderId];
      const defenderTroops = targetProv.garrison;

      // Separate attackers by faction
      const attackersByFac = {};
      movers.forEach(m => { (attackersByFac[m.faction] = attackersByFac[m.faction] || []).push(m); });

      Object.entries(attackersByFac).forEach(([atkFid, atkMovements]) => {
        const atkFac = this.factions[atkFid];
        if (!atkFac || !atkFac.alive) return;

        const totalAtkTroops = atkMovements.reduce((s, m) => s + m.troops, 0);
        const intent = atkMovements[0].intent; // RAID, SIEGE, EXPAND

        // Combat resolution
        const atkPower = this.calculatePower(atkFac, totalAtkTroops, targetProv, true);
        const defPower = this.calculatePower(defenderFac, defenderTroops, targetProv, false);

        const atkCasualties = Math.floor(totalAtkTroops * WORLD_BIBLE.combat.base_casualty_rate * (defPower / (atkPower + 1)));
        const defCasualties = Math.floor(defenderTroops * WORLD_BIBLE.combat.base_casualty_rate * (atkPower / (defPower + 1)));

        let outcome = 'STALEMATE';
        if (atkPower > defPower * 1.3) outcome = 'VICTORY';
        else if (defPower > atkPower * 1.3) outcome = 'DEFEAT';

        // Apply casualties
        atkFac.resources.troops -= atkCasualties;
        targetProv.garrison -= defCasualties;

        // Movement: return surviving troops or garrison
        if (outcome === 'VICTORY' && intent !== 'RAID') {
          // Capture province
          const oldOwner = targetProv.owner;
          if (oldOwner && this.factions[oldOwner]) {
            this.factions[oldOwner].provinces = this.factions[oldOwner].provinces.filter(p => p !== targetId);
            this.factions[oldOwner].stats.territory = this.factions[oldOwner].provinces.length;
            this.factions[oldOwner].stats.prestige -= 3;
          }
          targetProv.owner = atkFid;
          targetProv.garrison = totalAtkTroops - atkCasualties;
          atkFac.provinces.push(targetId);
          atkFac.stats.territory = atkFac.provinces.length;
          atkFac.stats.prestige += 5;
        } else if (intent === 'RAID') {
          // Raid: steal grain, return
          const stolen = Math.min(targetProv.population * 0.01, atkFac.resources.troops * 10);
          atkFac.resources.grain += stolen;
          targetProv.devastation = Math.min(100, targetProv.devastation + 10);
        } else {
          // Failed attack: troops return to source
          const sourceProv = this.provinces[atkMovements[0].from];
          if (sourceProv) sourceProv.garrison += totalAtkTroops - atkCasualties;
        }

        events.push({
          type: 'BATTLE',
          attacker: atkFid,
          defender: defenderId,
          province: targetId,
          atkTroops: totalAtkTroops,
          defTroops: defenderTroops,
          atkCasualties,
          defCasualties,
          outcome,
          intent
        });
      });
    });

    return events;
  }

  calculatePower(fac, troops, province, isAttacker) {
    if (!fac || troops <= 0) return 0;
    let power = troops * (fac.stats.loyalty / 100) * (fac.stats.prestige / 100);

    // Terrain
    const terrainMod = WORLD_BIBLE.combat.terrain_modifiers.plains; // simplified
    power *= terrainMod;

    // Fortification
    if (!isAttacker) power *= (1 + province.fortification * 0.1);

    // Cavalry bonus for time-displaced (if they have cavalry tech)
    if (fac.type === 'time_displaced' && isAttacker) {
      power *= WORLD_BIBLE.combat.cavalry_bonus_plains;
    }

    // Naval bonus for Sun Quan
    if (fac.id === 'sun_quan' && (province.id === 'yang' || province.id === 'jiang' || province.id === 'jiao')) {
      power *= WORLD_BIBLE.combat.naval_bonus_river_coast;
    }

    // Random factor
    power *= this.rng.nextFloat(0.8, 1.2);

    return power;
  }

  resolveDiplomacy(actions) {
    const events = [];
    Object.entries(actions).forEach(([fid, action]) => {
      const fac = this.factions[fid];
      if (!fac || !fac.alive) return;
      if (action.type !== 'DIPLOMACY') return;
      if (!action.target || !this.factions[action.target]?.alive) return;

      const targetFac = this.factions[action.target];
      const known = this.knowledgeGraph[fid].has(action.target);
      if (!known && action.subtype !== 'SPY') return; // Can't diplomat unknown

      switch (action.subtype) {
        case 'ALLY': {
          if (fac.stats.prestige > targetFac.stats.prestige * 0.8 && this.rng.next() < 0.3) {
            // Alliance formed (simplified)
            events.push({ type: 'ALLIANCE', faction: fid, target: action.target });
            fac.stats.prestige += 2;
            targetFac.stats.prestige += 2;
          }
          break;
        }
        case 'THREATEN': {
          if (fac.stats.troops > targetFac.stats.troops * 2 && this.rng.next() < 0.4) {
            targetFac.stats.loyalty = Math.max(0, targetFac.stats.loyalty - 10);
            events.push({ type: 'THREATEN', faction: fid, target: action.target, effect: 'loyalty_drop' });
          }
          break;
        }
        case 'TRADE': {
          const grain = Math.min(5000, fac.resources.grain);
          fac.resources.grain -= grain;
          targetFac.resources.grain += grain;
          events.push({ type: 'TRADE', faction: fid, target: action.target, grain });
          break;
        }
        case 'SPY': {
          if (this.rng.next() < 0.5) {
            this.knowledgeGraph[fid].add(action.target);
            events.push({ type: 'SPY_SUCCESS', faction: fid, target: action.target });
          } else {
            events.push({ type: 'SPY_FAIL', faction: fid, target: action.target });
          }
          break;
        }
      }
    });
    return events;
  }

  resolveSubterfuge(actions) {
    const events = [];
    Object.entries(actions).forEach(([fid, action]) => {
      const fac = this.factions[fid];
      if (!fac || !fac.alive) return;
      if (action.type !== 'SUBTERFUGE') return;
      if (!action.target || !this.factions[action.target]?.alive) return;

      const targetFac = this.factions[action.target];

      switch (action.subtype) {
        case 'ASSASSINATE': {
          if (this.rng.next() < 0.15) {
            targetFac.stats.prestige -= 15;
            targetFac.stats.loyalty -= 10;
            events.push({ type: 'ASSASSINATE', faction: fid, target: action.target, success: true });
          } else {
            fac.stats.prestige -= 5;
            events.push({ type: 'ASSASSINATE', faction: fid, target: action.target, success: false });
          }
          break;
        }
        case 'SABOTAGE': {
          if (this.rng.next() < 0.3) {
            const provId = targetFac.provinces[0];
            if (provId) {
              this.provinces[provId].devastation = Math.min(100, this.provinces[provId].devastation + 20);
              targetFac.resources.grain = Math.max(0, targetFac.resources.grain - 2000);
              events.push({ type: 'SABOTAGE', faction: fid, target: action.target, province: provId });
            }
          }
          break;
        }
        case 'SOW_DISCORD': {
          if (this.rng.next() < 0.25) {
            targetFac.stats.loyalty = Math.max(0, targetFac.stats.loyalty - 8);
            events.push({ type: 'SOW_DISCORD', faction: fid, target: action.target });
          }
          break;
        }
        case 'STEAL_TECH': {
          // Time-displaced can try to steal each other's future knowledge (flavor)
          if (fac.type === 'time_displaced' && targetFac.type === 'time_displaced' && this.rng.next() < 0.1) {
            events.push({ type: 'STEAL_TECH', faction: fid, target: action.target, note: 'Rumors of strange methods...' });
          }
          break;
        }
      }
    });
    return events;
  }

  resolveUpkeep() {
    const events = [];
    Object.values(this.factions).forEach(fac => {
      if (!fac.alive) return;

      // Grain consumption
      const consumption = fac.resources.troops * WORLD_BIBLE.economy.grain_consumption_per_troop;
      fac.resources.grain -= consumption;

      if (fac.resources.grain < 0) {
        // Starvation: lose troops, loyalty drops
        const starved = Math.ceil(-fac.resources.grain / WORLD_BIBLE.economy.grain_consumption_per_troop);
        fac.resources.troops = Math.max(0, fac.resources.troops - starved);
        fac.stats.loyalty = Math.max(0, fac.stats.loyalty - 5);
        fac.resources.grain = 0;
        events.push({ type: 'STARVATION', faction: fac.id, lost: starved });
      }

      // Income from territory
      let income = 0;
      fac.provinces.forEach(pid => {
        const prov = this.provinces[pid];
        if (prov) income += Math.floor(prov.population * WORLD_BIBLE.economy.base_tax_per_pop * (1 - prov.devastation / 200));
      });
      fac.resources.gold += income;

      // Prestige decay/growth
      if (fac.provinces.length > fac.stats.territory) fac.stats.prestige += 1;
      else if (fac.provinces.length < fac.stats.territory) fac.stats.prestige -= 2;
    });
    return events;
  }

  checkVictory() {
    const events = [];
    const alive = Object.values(this.factions).filter(f => f.alive);

    alive.forEach(fac => {
      // Eliminated only if no provinces
      if (fac.provinces.length === 0) {
        fac.alive = false;
        this.deadFactions.add(fac.id);
        events.push({ type: 'ELIMINATED', faction: fac.id, name: fac.name });
      }
    });

    // Unification check
    const aliveNow = Object.values(this.factions).filter(f => f.alive);
    if (aliveNow.length === 1) {
      events.push({ type: 'VICTORY', faction: aliveNow[0].id, name: aliveNow[0].name, tick: this.tick });
    } else if (this.tick >= WORLD_BIBLE.victory.max_ticks) {
      const winner = aliveNow.reduce((a, b) => a.provinces.length > b.provinces.length ? a : b);
      events.push({ type: 'TIME_LIMIT', faction: winner.id, name: winner.name, tick: this.tick });
    }

    return events;
  }

  updateKnowledge(events) {
    events.forEach(e => {
      if (e.type === 'BATTLE') {
        if (this.knowledgeGraph[e.attacker]) this.knowledgeGraph[e.attacker].add(e.defender);
        if (this.knowledgeGraph[e.defender]) this.knowledgeGraph[e.defender].add(e.attacker);
      } else if (e.type === 'ALLIANCE' || e.type === 'TRADE' || e.type === 'THREATEN') {
        if (this.knowledgeGraph[e.faction]) this.knowledgeGraph[e.faction].add(e.target);
        if (this.knowledgeGraph[e.target]) this.knowledgeGraph[e.target].add(e.faction);
      } else if (e.type === 'SPY_SUCCESS') {
        if (this.knowledgeGraph[e.faction]) this.knowledgeGraph[e.faction].add(e.target);
      }
    });
  }

  snapshotFactions() {
    const snap = {};
    Object.entries(this.factions).forEach(([id, f]) => {
      snap[id] = {
        id: f.id,
        name: f.name,
        color: f.color,
        alive: f.alive,
        provinces: [...f.provinces],
        stats: { ...f.stats },
        resources: { ...f.resources },
        knownFactions: Array.from(this.knowledgeGraph[id]),
        lastAction: f.lastAction,
        lastQuote: f.lastQuote,
        statusBadge: f.statusBadge
      };
    });
    return snap;
  }

  snapshotProvinces() {
    const snap = {};
    Object.entries(this.provinces).forEach(([id, p]) => {
      snap[id] = {
        id: p.id,
        name: p.name,
        owner: p.owner,
        garrison: p.garrison,
        fortification: p.fortification,
        devastation: p.devastation,
        population: p.population,
        fertility: p.fertility
      };
    });
    return snap;
  }

  // For LLM prompt construction
  getFactionView(factionId) {
    const fac = this.factions[factionId];
    if (!fac || !fac.alive) return null;

    const obsProvinces = this.getObservableProvinces(factionId);
    const knownFactions = this.getKnownFactions(factionId).map(id => ({
      id,
      name: this.factions[id].name,
      color: this.factions[id].color,
      provinces: this.factions[id].provinces.length,
      troops: this.factions[id].resources.troops,
      relation: 'unknown' // could track relations
    }));

    return {
      tick: this.tick,
      faction: {
        id: fac.id,
        name: fac.name,
        color: fac.color,
        stats: { ...fac.stats },
        resources: { ...fac.resources },
        provinces: fac.provinces.map(pid => {
          const p = this.provinces[pid];
          return { id: p.id, name: p.name, garrison: p.garrison, fortification: p.fortification, population: p.population, fertility: p.fertility };
        })
      },
      observableProvinces: Object.values(obsProvinces).map(p => ({
        id: p.id, name: p.name, owner: p.owner, garrison: p.garrison,
        population: p.population, fertility: p.fertility, fortification: p.fortification
      })),
      knownFactions,
      worldInfo: {
        year: WORLD_BIBLE.year + Math.floor(this.tick / 52),
        season: ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor((this.tick % 52) / 13)],
        availableTech: WORLD_BIBLE.technology.available,
        unavailableTech: WORLD_BIBLE.technology.unavailable
      }
    };
  }
}

module.exports = { World, WORLD_BIBLE, PERSONAS, SeededRNG };