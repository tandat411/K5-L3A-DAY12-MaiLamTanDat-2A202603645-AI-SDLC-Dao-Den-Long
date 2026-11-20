import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

test('Test Contract v1.2: Mote Pickup Scenario', () => {
  const outPath = 'tests/output_pickup.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/pickup.json --inputs tests/scenarios/inputs_pickup.json --ticks 60 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath), 'Output file should exist');
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  // Verify Snapshot tick 0
  const snap0 = objects[0];
  assert.equal(snap0.type, 'snapshot');
  assert.equal(snap0.tick, 0);
  assert.deepEqual(snap0.player.pos, [0, 0, 0]);

  // Verify Event mote_picked happened
  const pickEvt = objects.find(
    (o) => o.type === 'event' && o.name === 'mote_picked'
  );
  assert.ok(pickEvt, 'mote_picked event should be emitted');
  assert.equal(pickEvt.data.carried, 1);

  // Verify End line
  const endLine = objects[objects.length - 1];
  assert.equal(endLine.type, 'end');
  assert.equal(endLine.ticks, 60);
  assert.equal(endLine.state, 'playing');
});

test('Test Contract v1.2: Deposit and Lantern Lit Scenario (Phase 3: no early win)', () => {
  const outPath = 'tests/output_deposit.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/deposit_win.json --inputs tests/scenarios/inputs_deposit.json --ticks 60 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath), 'Output file should exist');
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const depEvt = objects.find((o) => o.type === 'event' && o.name === 'deposit');
  assert.ok(depEvt, 'deposit event should be emitted');
  assert.equal(depEvt.data.lantern_id, 'L1');
  assert.equal(depEvt.data.amount, 10);

  const litEvt = objects.find(
    (o) => o.type === 'event' && o.name === 'lantern_lit'
  );
  assert.ok(litEvt, 'lantern_lit event should be emitted');
  assert.equal(litEvt.data.relight, false);

  // Phase 3 breaking change: No early win on lighting all lanterns. Game continues until dawn_survived!
  const endLine = objects[objects.length - 1];
  assert.equal(endLine.type, 'end');
  assert.equal(endLine.state, 'playing');
});

test('Test Contract v1.2: Pulse Stuns Shade Scenario', () => {
  const outPath = 'tests/output_pulse.jsonl';
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  execSync(
    'node src/headless.js --seed 42 --night 1 --scenario tests/scenarios/pulse.json --inputs tests/scenarios/inputs_pulse.json --ticks 20 --out ' +
      outPath
  );

  assert.ok(fs.existsSync(outPath));
  const lines = fs.readFileSync(outPath, 'utf-8').trim().split('\n');
  const objects = lines.map((l) => JSON.parse(l));

  const pulseEvt = objects.find(
    (o) => o.type === 'event' && o.name === 'pulse'
  );
  assert.ok(pulseEvt, 'pulse event should be emitted');
  assert.deepEqual(pulseEvt.data.stunned_ids, ['S1']);

  const lateSnap = objects.filter((o) => o.type === 'snapshot').pop();
  assert.equal(lateSnap.shades[0].state, 'stunned');
  assert.ok(lateSnap.shades[0].pos[2] > 4.0, 'Shade should be pushed back');
});

test('Test Contract v1.2: Determinism across runs', () => {
  const out1 = 'tests/out_det1.jsonl';
  const out2 = 'tests/out_det2.jsonl';

  execSync(
    'node src/headless.js --seed 12345 --night 1 --ticks 120 --out ' + out1
  );
  execSync(
    'node src/headless.js --seed 12345 --night 1 --ticks 120 --out ' + out2
  );

  const content1 = fs.readFileSync(out1, 'utf-8');
  const content2 = fs.readFileSync(out2, 'utf-8');

  assert.equal(
    content1,
    content2,
    'Deterministic runs must produce exact identical output'
  );
});

test('Test Contract v1.2: Error exit code 2 on invalid JSON input', () => {
  const badPath = 'tests/bad.json';
  fs.writeFileSync(badPath, '{ invalid json');
  try {
    execSync(
      'node src/headless.js --seed 1 --night 1 --scenario ' +
        badPath +
        ' --ticks 10 --out tests/bad.jsonl',
      { stdio: 'pipe' }
    );
    assert.fail('Should fail on invalid json');
  } catch (err) {
    assert.equal(err.status, 2, 'Exit code should be 2');
  } finally {
    if (fs.existsSync(badPath)) fs.unlinkSync(badPath);
  }
});
