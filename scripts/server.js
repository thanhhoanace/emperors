/**
 * Tam Quốc Loạn Nhập — Real-time 3D Simulation Server
 * WebSocket-based continuous async multi-agent simulation
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Load world data
const WORLD = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'world_bible.json'), 'utf-8'));

// Deterministic RNG
class SeededRNG {
  constructor(seed = 12345) { this.seed = seed >>> 0; }
  next() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 0x100000000; }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
  choice(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}

// World simulation state
class Simulation {
  constructor(seed = 12345) {
    this.rng = new SeededRNG(seed);
    this.tick = 0;
    this.running = true;
    this.clients = new Set();
    this.provinces = this.initProvinces();
    this.factions = this.initFactions();
    this.knowledgeGraph = this.initKnowledgeGraph();
    this.eventLog = [];

    // Action cooldowns per faction (simulate async independent decisions)
    this.actionCooldowns = {};
    this.lastActionTime = {};
    FACTION_IDS.forEach(id => {
      this.actionCooldowns[id] = 0;
      this.lastActionTime[id] = 0;
    });

    // Start simulation loop
    this.loopInterval = setInterval(() => this.step(), 100); // 10 ticks/sec internal
  }

  initProvinces() {
    const provs = {};
    WORLD.provinces.forEach(p => {
      provs[p.id] = { ...p, owner: p.owner, garrison: 0, fortification: 0, devastation: 0 };
    });
    WORLD.factions.forEach(f => {
      const starts = f.starting_provinces || (f.starting_province ? [f.starting_province] : []);
      starts.forEach(pid => {
        if (provs[pid]) {
          provs[pid].owner = f.id;
          provs[pid].garrison = Math.floor(f.stats.troops / starts.length);
        }
      });
    });
    return provs;
  }

  initFactions() {
    const facs = {};
    WORLD.factions.forEach(f => {
      const starts = f.starting_provinces || (f.starting_province ? [f.starting_province] : []);
      facs[f.id] = {
        ...f,
        provinces: [...starts],
        stats: { ...f.stats },
        alive: true,
        knownFactions: new Set([f.id]),
        lastAction: 'IDLE',
        lastQuote: '—',
        action: 'IDLE',
        targetProvince: null,
        quote: '—',
        resources: { troops: f.stats.troops, grain: f.stats.grain, gold: 0 }
      };
    });
    return facs;
  }

  initKnowledgeGraph() {
    const kg = {};
    Object.keys(this.factions).forEach(fid => { kg[fid] = new Set([fid]); });
    const historical = ['cao_cao', 'liu_bei', 'sun_quan'];
    historical.forEach(a => historical.forEach(b => { if (a !== b) kg[a].add(b); }));
    return kg;
  }

  getObservableProvinces(factionId) {
    const fac = this.factions[factionId];
    if (!fac || !fac.alive) return {};
    const observable = new Set(fac.provinces);
    fac.provinces.forEach(pid => {
      const prov = this.provinces[pid];
      if (prov) prov.neighbors.forEach(n => observable.add(n));
    });
    const result = {};
    observable.forEach(pid => { const p = this.provinces[pid]; if (p) result[pid] = { ...p }; });
    return result;
  }

  getKnownFactions(factionId) {
    const fac = this.factions[factionId];
    if (!fac || !fac.alive) return [];
    return Array.from(this.knowledgeGraph[factionId]).filter(id => this.factions[id]?.alive && id !== factionId);
  }

  // Each faction decides action independently based on cooldown
  factionDecide(fid) {
    const fac = this.factions[fid];
    if (!fac || !fac.alive) return null;

    const now = this.tick;
    const cooldown = this.actionCooldowns[fid] || 0;
    if (now < cooldown) return null; // Not ready to act yet

    const view = this.getFactionView(fid);
    const action = this.generateAction(fid, view);

    // Set cooldown based on action type
    const baseCooldown = {
      INTERNAL: 8 + this.rng.nextInt(5),
      MILITARY: 12 + this.rng.nextInt(8),
      DIPLOMACY: 10 + this.rng.nextInt(6),
      SUBTERFUGE: 15 + this.rng.nextInt(10)
    }[action.type] || 10;

    this.actionCooldowns[fid] = now + baseCooldown;
    this.lastActionTime[fid] = now;

    // Update faction state for UI
    fac.action = action.type;
    fac.targetProvince = action.target || null;
    fac.quote = action.quote || '—';
    fac.lastAction = action;

    return action;
  }

  generateAction(fid, view) {
    const fac = this.factions[fid];
    const known = this.getKnownFactions(fid);
    const obsProv = Object.values(view.observableProvinces);
    const neighbors = obsProv.filter(p => p.owner !== fid && p.owner !== 'neutral').map(p => p.id);
    const ownProvs = view.faction.provinces;

    // Personality-based weights
    const personality = fac.personality || '';
    const isTimeDisplaced = fac.type === 'time_displaced';

    // Build action candidates
    const candidates = [];

    // INTERNAL actions
    if (fac.resources.grain < fac.resources.troops * 0.5) {
      candidates.push({ type: 'INTERNAL', subtype: 'FARM', weight: 30, quote: 'Lương thảo là gốc quân sự.' });
    }
    if (fac.resources.troops < 5000 && fac.resources.grain > 1000) {
      candidates.push({ type: 'INTERNAL', subtype: 'RECRUIT', amount: 500, weight: 25, quote: 'Thuận tay thuân chân, đao giáo là nghề.' });
    }
    if (ownProvs.length > 0) {
      const cap = this.provinces[ownProvs[0]];
      if (cap && cap.fortification < 3 && fac.resources.grain > 2000) {
        candidates.push({ type: 'INTERNAL', subtype: 'BUILD', weight: 15, quote: 'Củng cố vững chắc, kẻ địch không dám đến.' });
      }
    }
    if (fac.stats.loyalty < 60) {
      candidates.push({ type: 'INTERNAL', subtype: 'REFORM', weight: 20, quote: 'Dân an thì quốc vững.' });
    }

    // MILITARY actions
    if (neighbors.length > 0 && fac.resources.troops > 1000) {
      const target = this.rng.choice(neighbors);
      const targetProv = this.provinces[target];
      const targetFac = targetProv ? this.factions[targetProv.owner] : null;
      // Time-displaced prefer EXPAND, historical prefer DEFEND/RAID
      const subtype = isTimeDisplaced ? 'EXPAND' : (targetFac?.type === 'historical' ? 'RAID' : 'EXPAND');
      const amount = Math.min(fac.resources.troops * 0.3, 5000);
      candidates.push({ type: 'MILITARY', subtype, target, amount: Math.floor(amount), weight: 35,
        quote: subtype === 'EXPAND' ? 'Mở rộng疆土, vĩ nghiệp dang dở.' : 'Cướp lộc gia súc, khuấy động địch.' });
    }

    // DIPLOMACY actions
    if (known.length > 0) {
      const target = this.rng.choice(known);
      const targetFac = this.factions[target];
      if (targetFac && fac.stats.prestige > targetFac.stats.prestige * 0.7) {
        candidates.push({ type: 'DIPLOMACY', subtype: 'ALLY', target, weight: 15, quote: 'Liền môi chi giao, cùng chống kẻ địch.' });
      }
      candidates.push({ type: 'DIPLOMACY', subtype: 'SPY', target, weight: 10, quote: 'Biết mình biết ta, trăm trận trăm thắng.' });
    }

    // SUBTERFUGE actions
    if (known.length > 0 && this.rng.next() < 0.3) {
      const target = this.rng.choice(known);
      const subtypes = ['SABOTAGE', 'SOW_DISCORD'];
      if (isTimeDisplaced) subtypes.push('STEAL_TECH');
      const subtype = this.rng.choice(subtypes);
      candidates.push({ type: 'SUBTERFUGE', subtype, target, weight: 8, quote: 'Thương khinh nhật nguyệt, mưu lược thâm sâu.' });
    }

    if (candidates.length === 0) {
      return { type: 'IDLE', quote: 'Tĩnh để quan biến.' };
    }

    // Weighted random selection
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let roll = this.rng.next() * totalWeight;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) return c;
    }
    return candidates[candidates.length - 1];
  }

  // Resolve all pending actions simultaneously
  resolveActions(actions) {
    const events = [];

    // Group by type for resolution order
    const byType = { INTERNAL: [], MILITARY: [], DIPLOMACY: [], SUBTERFUGE: [] };
    Object.entries(actions).forEach(([fid, a]) => { if (a && a.type !== 'IDLE') byType[a.type].push({ fid, ...a }); });

    // INTERNAL
    byType.INTERNAL.forEach(a => { events.push(...this.resolveInternal(a.fid, a)); });

    // MILITARY - collect all movements first
    const movements = byType.MILITARY.map(a => ({ ...a }));
    events.push(...this.resolveMilitary(movements));

    // DIPLOMACY
    byType.DIPLOMACY.forEach(a => { events.push(...this.resolveDiplomacy(a.fid, a)); });

    // SUBTERFUGE
    byType.SUBTERFUGE.forEach(a => { events.push(...this.resolveSubterfuge(a.fid, a)); });

    // UPKEEP
    events.push(...this.resolveUpkeep());

    // VICTORY CHECK
    events.push(...this.checkVictory());

    // KNOWLEDGE UPDATE
    this.updateKnowledge(events);

    return events;
  }

  resolveInternal(fid, action) {
    const fac = this.factions[fid];
    const ownProvs = fac.provinces;
    const prov = ownProvs ? this.provinces[ownProvs[0]] : null;
    const events = [];
    if (!prov) return events;

    switch (action.subtype) {
      case 'RECRUIT': {
        const amount = action.amount || 500;
        const cost = amount * 2;
        if (fac.resources.grain >= cost && fac.resources.troops + amount < prov.population * 0.15) {
          fac.resources.troops += amount;
          fac.resources.grain -= cost;
          events.push({ type: 'INTERNAL', faction: fid, subtype: 'RECRUIT', amount, province: prov.id });
        }
        break;
      }
      case 'FARM': {
        const gain = Math.floor(prov.population * 0.001 * (prov.fertility / 10) * (1 - prov.devastation / 200));
        fac.resources.grain += gain;
        events.push({ type: 'INTERNAL', faction: fid, subtype: 'FARM', gain, province: prov.id });
        break;
      }
      case 'BUILD': {
        const cost = 500;
        if (fac.resources.grain >= cost) {
          fac.resources.grain -= cost;
          prov.fortification = Math.min(5, prov.fortification + 1);
          events.push({ type: 'INTERNAL', faction: fid, subtype: 'BUILD', province: prov.id, level: prov.fortification });
        }
        break;
      }
      case 'REFORM': {
        fac.stats.loyalty = Math.min(100, fac.stats.loyalty + 3);
        fac.stats.prestige = Math.min(100, fac.stats.prestige + 1);
        events.push({ type: 'INTERNAL', faction: fid, subtype: 'REFORM', loyalty: fac.stats.loyalty });
        break;
      }
    }
    return events;
  }

  resolveMilitary(movements) {
    const events = [];
    if (movements.length === 0) return events;

    // Group by target
    const byTarget = {};
    movements.forEach(m => { (byTarget[m.target] = byTarget[m.target] || []).push(m); });

    Object.entries(byTarget).forEach(([targetId, movers]) => {
      const targetProv = this.provinces[targetId];
      if (!targetProv) return;
      const defenderId = targetProv.owner;
      const defenderFac = this.factions[defenderId];
      const defenderTroops = targetProv.garrison;

      // Separate by attacker
      const byAttacker = {};
      movers.forEach(m => { (byAttacker[m.fid] = byAttacker[m.fid] || []).push(m); });

      Object.entries(byAttacker).forEach(([atkFid, atkMovements]) => {
        const atkFac = this.factions[atkFid];
        if (!atkFac || !atkFac.alive) return;
        const totalAtk = atkMovements.reduce((s, m) => s + (m.amount || 0), 0);
        const intent = atkMovements[0].subtype;

        // Send movement event for visualization
        events.push({ type: 'MOVEMENT', faction: atkFid, from: atkMovements[0].from || atkFac.provinces[0], to: targetId });

        const atkPower = this.calcPower(atkFac, totalAtk, targetProv, true);
        const defPower = this.calcPower(defenderFac, defenderTroops, targetProv, false);

        const atkCas = Math.floor(totalAtk * 0.15 * (defPower / (atkPower + 1)));
        const defCas = Math.floor(defenderTroops * 0.15 * (atkPower / (defPower + 1)));

        let outcome = 'STALEMATE';
        if (atkPower > defPower * 1.3) outcome = 'VICTORY';
        else if (defPower > atkPower * 1.3) outcome = 'DEFEAT';

        atkFac.resources.troops -= atkCas;
        targetProv.garrison -= defCas;

        if (outcome === 'VICTORY' && intent !== 'RAID') {
          const oldOwner = targetProv.owner;
          if (oldOwner && this.factions[oldOwner]) {
            this.factions[oldOwner].provinces = this.factions[oldOwner].provinces.filter(p => p !== targetId);
          }
          targetProv.owner = atkFid;
          targetProv.garrison = totalAtk - atkCas;
          atkFac.provinces.push(targetId);
          atkFac.stats.prestige += 3;
          if (this.factions[oldOwner]) this.factions[oldOwner].stats.prestige -= 2;
        } else if (intent === 'RAID') {
          const stolen = Math.min(targetProv.population * 0.005, atkFac.resources.troops * 5);
          atkFac.resources.grain += stolen;
          targetProv.devastation = Math.min(100, targetProv.devastation + 15);
        } else {
          // Failed - troops return (handled client-side)
        }

        events.push({
          type: 'BATTLE', attacker: atkFid, defender: defenderId, province: targetId,
          atkTroops: totalAtk, defTroops: defenderTroops,
          atkCasualties: atkCas, defCasualties: defCas, outcome, intent
        });
      });
    });
    return events;
  }

  calcPower(fac, troops, prov, isAttacker) {
    if (!fac || troops <= 0) return 1;
    let p = troops * (fac.stats.loyalty/100) * (fac.stats.prestige/100);
    if (!isAttacker) p *= (1 + prov.fortification * 0.15);
    if (fac.type === 'time_displaced' && isAttacker) p *= 1.25;
    if (fac.id === 'sun_quan' && ['yang','jiang','jiao'].includes(prov.id)) p *= 1.3;
    if (fac.id === 'cao_cao') p *= 1.1; // Cao Cao slight bonus
    return p * this.rng.nextFloat(0.85, 1.15);
  }

  resolveDiplomacy(fid, action) {
    const events = [];
    const fac = this.factions[fid];
    if (!fac || !fac.alive) return events;
    const targetFac = this.factions[action.target];
    if (!targetFac || !targetFac.alive) return events;
    if (!this.knowledgeGraph[fid].has(action.target) && action.subtype !== 'SPY') return events;

    switch (action.subtype) {
      case 'ALLY': { if (this.rng.next() < 0.25) { events.push({ type: 'DIPLOMACY', subtype: 'ALLY', faction: fid, target: action.target }); fac.stats.prestige += 1; targetFac.stats.prestige += 1; } break; }
      case 'TRADE': { const g = Math.min(2000, fac.resources.grain); fac.resources.grain -= g; targetFac.resources.grain += g; events.push({ type: 'DIPLOMACY', subtype: 'TRADE', faction: fid, target: action.target, grain: g }); break; }
      case 'THREATEN': { if (fac.resources.troops > targetFac.resources.troops * 1.5 && this.rng.next() < 0.3) { targetFac.stats.loyalty = Math.max(0, targetFac.stats.loyalty - 8); events.push({ type: 'DIPLOMACY', subtype: 'THREATEN', faction: fid, target: action.target }); } break; }
      case 'SPY': { if (this.rng.next() < 0.4) { this.knowledgeGraph[fid].add(action.target); events.push({ type: 'DIPLOMACY', subtype: 'SPY', faction: fid, target: action.target, success: true }); } break; }
    }
    return events;
  }

  resolveSubterfuge(fid, action) {
    const events = [];
    const fac = this.factions[fid];
    const targetFac = this.factions[action.target];
    if (!targetFac || !targetFac.alive) return events;

    switch (action.subtype) {
      case 'ASSASSINATE': {
        if (this.rng.next() < 0.1) { targetFac.stats.prestige -= 10; targetFac.stats.loyalty -= 5; events.push({ type: 'SUBTERFUGE', subtype: 'ASSASSINATE', faction: fid, target: action.target, success: true }); }
        else { fac.stats.prestige -= 3; events.push({ type: 'SUBTERFUGE', subtype: 'ASSASSINATE', faction: fid, target: action.target, success: false }); }
        break;
      }
      case 'SABOTAGE': {
        if (this.rng.next() < 0.2) { const pid = targetFac.provinces[0]; if (pid) { this.provinces[pid].devastation = Math.min(100, this.provinces[pid].devastation + 20); targetFac.resources.grain = Math.max(0, targetFac.resources.grain - 1000); events.push({ type: 'SUBTERFUGE', subtype: 'SABOTAGE', faction: fid, target: action.target, province: pid }); } }
        break;
      }
      case 'SOW_DISCORD': {
        if (this.rng.next() < 0.15) { targetFac.stats.loyalty = Math.max(0, targetFac.stats.loyalty - 6); events.push({ type: 'SUBTERFUGE', subtype: 'SOW_DISCORD', faction: fid, target: action.target }); }
        break;
      }
      case 'STEAL_TECH': {
        if (fac.type === 'time_displaced' && targetFac.type === 'time_displaced' && this.rng.next() < 0.05) {
          events.push({ type: 'SUBTERFUGE', subtype: 'STEAL_TECH', faction: fid, target: action.target, note: 'Đoạt được bí pháp lạ...' });
        }
        break;
      }
    }
    return events;
  }

  resolveUpkeep() {
    const events = [];
    Object.values(this.factions).forEach(fac => {
      if (!fac.alive) return;
      const consumption = fac.resources.troops * 0.03; // 3% per tick
      fac.resources.grain -= consumption;
      if (fac.resources.grain < 0) {
        const lost = Math.ceil(-fac.resources.grain / 0.03);
        fac.resources.troops = Math.max(0, fac.resources.troops - lost);
        fac.stats.loyalty = Math.max(0, fac.stats.loyalty - 3);
        fac.resources.grain = 0;
        events.push({ type: 'INTERNAL', faction: fac.id, subtype: 'STARVATION', lost });
      }
      // Income
      let income = 0;
      fac.provinces.forEach(pid => {
        const prov = this.provinces[pid];
        if (prov) income += Math.floor(prov.population * 0.008 * (1 - prov.devastation / 200));
      });
      fac.resources.gold += income;
    });
    return events;
  }

  checkVictory() {
    const events = [];
    const alive = Object.values(this.factions).filter(f => f.alive);
    alive.forEach(fac => {
      if (fac.provinces.length === 0) {
        fac.alive = false;
        events.push({ type: 'ELIMINATED', faction: fac.id, name: fac.name });
      }
    });
    const aliveNow = Object.values(this.factions).filter(f => f.alive);
    if (aliveNow.length === 1) {
      events.push({ type: 'VICTORY', faction: aliveNow[0].id, name: aliveNow[0].name, tick: this.tick });
      this.running = false;
    } else if (this.tick >= 500) {
      const winner = aliveNow.reduce((a, b) => a.provinces.length > b.provinces.length ? a : b);
      events.push({ type: 'TIME_LIMIT', faction: winner.id, name: winner.name, tick: this.tick });
      this.running = false;
    }
    return events;
  }

  updateKnowledge(events) {
    events.forEach(e => {
      if (e.type === 'BATTLE') {
        if (this.knowledgeGraph[e.attacker]) this.knowledgeGraph[e.attacker].add(e.defender);
        if (this.knowledgeGraph[e.defender]) this.knowledgeGraph[e.defender].add(e.attacker);
      } else if (['ALLIANCE','TRADE','THREATEN','SPY'].includes(e.subtype) && e.faction && e.target) {
        if (this.knowledgeGraph[e.faction]) this.knowledgeGraph[e.faction].add(e.target);
        if (this.knowledgeGraph[e.target]) this.knowledgeGraph[e.target].add(e.faction);
      }
    });
  }

  getFactionView(fid) {
    const fac = this.factions[fid];
    if (!fac || !fac.alive) return null;
    return {
      tick: this.tick,
      faction: {
        id: fac.id, name: fac.name, color: fac.color,
        stats: { ...fac.stats }, resources: { ...fac.resources },
        provinces: fac.provinces.map(pid => {
          const p = this.provinces[pid]; return p ? { id: p.id, name: p.name, garrison: p.garrison, fortification: p.fortification, population: p.population, fertility: p.fertility } : null;
        }).filter(Boolean)
      },
      observableProvinces: this.getObservableProvinces(fid),
      knownFactions: this.getKnownFactions(fid).map(id => {
        const f = this.factions[id]; return { id, name: f.name, color: f.color, provinces: f.provinces.length, troops: f.resources.troops };
      }),
      worldInfo: { year: 200 + Math.floor(this.tick/52), season: ['Xuân','Hạ','Thu','Đông'][Math.floor((this.tick%52)/13)] }
    };
  }

  getFullState() {
    return {
      tick: this.tick,
      factions: Object.fromEntries(
        Object.entries(this.factions).map(([id, f]) => [id, {
          id: f.id, name: f.name, color: f.color, alive: f.alive,
          provinces: [...f.provinces],
          stats: { ...f.stats }, resources: { ...f.resources },
          action: f.action, quote: f.quote, targetProvince: f.targetProvince,
          knownFactions: Array.from(this.knowledgeGraph[id])
        }])
      ),
      provinces: Object.fromEntries(
        Object.entries(this.provinces).map(([id, p]) => [id, {
          id: p.id, name: p.name, owner: p.owner, garrison: p.garrison,
          fortification: p.fortification, devastation: p.devastation,
          population: p.population, fertility: p.fertility
        }])
      )
    };
  }

  step() {
    if (!this.running) return;
    this.tick++;

    // Each faction decides independently
    const actions = {};
    FACTION_IDS.forEach(fid => {
      const action = this.factionDecide(fid);
      if (action) actions[fid] = action;
    });

    // Resolve all
    const events = this.resolveActions(actions);

    // Broadcast to clients
    if (events.length > 0) {
      this.broadcast({ type: 'EVENTS', events, tick: this.tick });
    }

    // Periodic full state sync
    if (this.tick % 20 === 0) {
      this.broadcast({ type: 'STATE', data: this.getFullState() });
    }
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  }

  addClient(ws) { this.clients.add(ws); }
  removeClient(ws) { this.clients.delete(ws); }

  reset(seed) {
    this.rng = new SeededRNG(seed);
    this.tick = 0;
    this.running = true;
    this.provinces = this.initProvinces();
    this.factions = this.initFactions();
    this.knowledgeGraph = this.initKnowledgeGraph();
    this.eventLog = [];
    FACTION_IDS.forEach(id => { this.actionCooldowns[id] = 0; this.lastActionTime[id] = 0; });
    this.broadcast({ type: 'STATE', data: this.getFullState() });
  }
}

const FACTION_IDS = ['li_shimin', 'qin_shihuang', 'zhu_yuanzhang', 'liu_che', 'cao_cao', 'liu_bei', 'sun_quan'];

const simulations = new Map(); // sessionId -> Simulation

// WebSocket handling
wss.on('connection', (ws, req) => {
  console.log('WS client connected');
  let currentSim = null;

  // Auto-join with new simulation if no JOIN within 500ms
  const autoJoinTimer = setTimeout(() => {
    if (!currentSim) {
      const sessionId = `sim_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const sim = new Simulation(Math.floor(Math.random() * 1000000));
      simulations.set(sessionId, sim);
      currentSim = sim;
      sim.addClient(ws);
      ws.send(JSON.stringify({ type: 'JOINED', sessionId, state: sim.getFullState() }));
    }
  }, 500);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'JOIN') {
        clearTimeout(autoJoinTimer);
        const sessionId = msg.sessionId || `sim_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        let sim = simulations.get(sessionId);
        if (!sim) {
          sim = new Simulation(msg.seed);
          simulations.set(sessionId, sim);
        }
        currentSim = sim;
        sim.addClient(ws);
        ws.send(JSON.stringify({ type: 'JOINED', sessionId, state: sim.getFullState() }));
      } else if (msg.type === 'TICK') {
        if (currentSim) currentSim.step();
      } else if (msg.type === 'RESET') {
        if (currentSim) currentSim.reset(msg.seed);
      } else if (msg.type === 'PAUSE') {
        if (currentSim) currentSim.running = !msg.paused;
      }
      // SPEED is client-side only
    } catch (e) { console.error('WS message error', e); }
  });

  ws.on('close', () => {
    if (currentSim) currentSim.removeClient(ws);
    console.log('WS client disconnected');
  });
});

// REST fallback for initial load
app.post('/api/simulate/new', (req, res) => {
  const sessionId = `sim_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const sim = new Simulation(req.body.seed);
  simulations.set(sessionId, sim);
  res.json({ sessionId, state: sim.getFullState() });
});

app.get('/api/simulate/sessions', (req, res) => {
  const sessions = Array.from(simulations.entries()).map(([id, sim]) => ({
    id, tick: sim.tick, running: sim.running
  }));
  res.json(sessions);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket on ws://localhost:${PORT}/ws`);
});