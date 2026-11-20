import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { GameEngine } from '../src/engine.js';

test('Phase 2 — Dash Feature (Contract v1.1)', () => {
  const outPath = 'tests/output_dash.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/dash.json --inputs tests/scenarios/inputs_dash.json --ticks 25 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const dashEvt = objects.find((o) => o.type === 'event' && o.name === 'dash');
  assert.ok(dashEvt, 'dash event should be emitted');

  const lateSnap = objects.filter((o) => o.type === 'snapshot').pop();
  assert.ok(lateSnap.player.pos[2] > 2.0, 'Player should cover significant distance while dashing');
});

test('Phase 2 — Gió Lạc (Drifter) Steal Feature', () => {
  const outPath = 'tests/output_drifter.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  // Run with drifter near player
  execSync(
    'node src/headless.js --seed 42 --night 2 --scenario tests/scenarios/drifter.json --inputs tests/scenarios/inputs_drifter.json --ticks 60 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const stealEvt = objects.find((o) => o.type === 'event' && o.name === 'drifter_steal');
  assert.ok(stealEvt, 'drifter_steal event should be emitted');
  assert.equal(stealEvt.data.amount, 3);
  assert.equal(stealEvt.data.carried, 3); // 6 - 3 = 3
});

test('Phase 2 — Bùa Gió (Charm) Pickup Feature', () => {
  const outPath = 'tests/output_charm.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 2 --scenario tests/scenarios/charm.json --inputs tests/scenarios/inputs_charm.json --ticks 30 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const charmEvt = objects.find((o) => o.type === 'event' && o.name === 'charm_picked');
  assert.ok(charmEvt, 'charm_picked event should be emitted');
  assert.equal(charmEvt.data.charm_id, 'C1');

  const lateSnap = objects.filter((o) => o.type === 'snapshot').pop();
  assert.ok(lateSnap.player.charm_s > 0, 'player should have charm active');
});

test('Phase 2 — Pause and Resume Feature', () => {
  const outPath = 'tests/output_pause.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/pause.json --inputs tests/scenarios/inputs_pause.json --ticks 25 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const pausedEvt = objects.find((o) => o.type === 'event' && o.name === 'paused');
  const resumedEvt = objects.find((o) => o.type === 'event' && o.name === 'resumed');
  assert.ok(pausedEvt, 'paused event should be emitted');
  assert.ok(resumedEvt, 'resumed event should be emitted');

  const pausedSnap = objects.find((o) => o.type === 'snapshot' && o.state === 'paused');
  assert.ok(pausedSnap, 'snapshot during pause should record state: "paused"');
});

test('Phase 2 — Fall off island & Respawn', () => {
  const engine = new GameEngine({
    night: 1,
    scenario: {
      player: { pos: [39.5, 0, 0], carried: 5, flames: 3 }
    }
  });

  // Walk player off edge (R > 40)
  for (let i = 0; i < 40; i++) {
    engine.current_input.move = [1, 0];
    engine.step();
  }

  // Engine gravity pulls player down to Y < -10
  for (let i = 0; i < 60; i++) {
    engine.current_input.move = [0, 0];
    engine.step();
  }

  // Verify fall event
  const fallHit = engine.events.find(
    (e) => e.name === 'player_hit' && e.data.by === 'fall'
  );
  assert.ok(engine.player.flames === 2 || fallHit, 'Player should lose 1 flame from fall');
});

test('Phase 2 — Night 2 Bounce Pad Launch', () => {
  const engine = new GameEngine({
    night: 2,
    scenario: {
      player: { pos: [20, 0, 18], carried: 0, flames: 3 }
    }
  });

  // Step on bounce pad
  engine.step();

  assert.ok(engine.player.is_launched, 'Player should be launched by bounce pad');
  assert.equal(engine.player.vel[1], 14, 'Launch vertical velocity should be 14');
  assert.ok(engine.player.launch_vel[0] > 0, 'Launch velocity X should head towards Island B');
});

test('Phase 2 — Performance DoD: 21,600 ticks in <= 30 seconds', () => {
  const engine = new GameEngine({ night: 1 });
  const start = performance.now();

  for (let i = 0; i < 21600; i++) {
    engine.step();
    if (engine.state !== 'playing') break;
  }

  const durationMs = performance.now() - start;
  assert.ok(
    durationMs < 30000,
    `Simulation took ${durationMs.toFixed(1)}ms, must be < 30,000ms`
  );
});
