import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { GameEngine } from '../src/engine.js';

test('Phase 3 — Fuel Decay & lantern_out Event', () => {
  const outPath = 'tests/output_lantern_out.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/lantern_out.json --ticks 40 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const outEvt = objects.find((o) => o.type === 'event' && o.name === 'lantern_out');
  assert.ok(outEvt, 'lantern_out event should be emitted when fuel reaches 0');
  assert.equal(outEvt.data.lantern_id, 'L1');

  const lateSnap = objects.filter((o) => o.type === 'snapshot').pop();
  const l1 = lateSnap.lanterns.find((l) => l.id === 'L1');
  assert.equal(l1.lit, false);
  assert.equal(l1.ever_lit, true);
  assert.equal(l1.fuel, 0);
});

test('Phase 3 — Refuel Lit Lantern (refuel Event)', () => {
  const outPath = 'tests/output_refuel.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/refuel.json --inputs tests/scenarios/inputs_refuel.json --ticks 20 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const refuelEvt = objects.find((o) => o.type === 'event' && o.name === 'refuel');
  assert.ok(refuelEvt, 'refuel event should be emitted');
  assert.equal(refuelEvt.data.lantern_id, 'L1');
  assert.ok(refuelEvt.data.amount > 0);
  assert.ok(refuelEvt.data.fuel > 75);
});

test('Phase 3 — Relighting ever_lit Lantern (Needs 5 motes, relight: true)', () => {
  const outPath = 'tests/output_relight.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/relight.json --inputs tests/scenarios/inputs_refuel.json --ticks 20 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const litEvt = objects.find((o) => o.type === 'event' && o.name === 'lantern_lit');
  assert.ok(litEvt, 'lantern_lit event should be emitted');
  assert.equal(litEvt.data.relight, true, 'relight flag must be true');

  const lateSnap = objects.filter((o) => o.type === 'snapshot').pop();
  const l1 = lateSnap.lanterns.find((l) => l.id === 'L1');
  assert.equal(l1.lit, true);
  assert.equal(l1.relit_count, 1);
});

test('Phase 3 — Shade Drain & fuel_drain Event', () => {
  const outPath = 'tests/output_drain.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/drain.json --ticks 70 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const drainEvt = objects.find((o) => o.type === 'event' && o.name === 'fuel_drain');
  assert.ok(drainEvt, 'fuel_drain event should be emitted every 60 ticks while draining');
  assert.equal(drainEvt.data.lantern_id, 'L1');
});

test('Phase 3 — Pulse on Draining Shade gives +15 score', () => {
  const engine = new GameEngine({
    night: 1,
    scenario: {
      player: { pos: [0, 0, 23], carried: 3, flames: 3 },
      shades: [{ id: 'S1', pos: [0, 0, 24], state: 'drain', target_lantern_id: 'L1' }],
      lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 20 }]
    }
  });

  const initialScore = engine.score;
  engine.current_input.pulse = true;
  engine.step();

  assert.equal(engine.score, initialScore + 15, 'Pulse on draining shade must award +15 points');
});

test('Phase 3 — New Win Condition: dawn_survived at time_left <= 0 when >= 60% lit', () => {
  const engine = new GameEngine({
    night: 1,
    scenario: {
      time_left_s: 0.1, // about 6 ticks left
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      lanterns: [
        { id: 'L1', lit: true, fuel: 80 },
        { id: 'L2', lit: true, fuel: 80 },
        { id: 'L3', lit: true, fuel: 80 }, // 3/5 lit = 60%
        { id: 'L4', lit: false, fuel: 0 },
        { id: 'L5', lit: false, fuel: 0 }
      ]
    }
  });

  for (let i = 0; i < 15; i++) {
    engine.step();
    if (engine.state !== 'playing') break;
  }

  assert.equal(engine.state, 'won');
  const winEvt = engine.events.find(
    (e) => e.name === 'game_over' && e.data.result === 'won'
  );
  assert.ok(winEvt);
  assert.equal(winEvt.data.reason, 'dawn_survived');
});

test('Phase 3 — Dynamic Capacity Expansion', () => {
  const engine = new GameEngine({
    night: 1,
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: 3, successful_lights: 2 }
    }
  });

  engine.step();
  assert.equal(engine.player.capacity, 14, 'Capacity should be 10 + 2 * 2 = 14');
});
