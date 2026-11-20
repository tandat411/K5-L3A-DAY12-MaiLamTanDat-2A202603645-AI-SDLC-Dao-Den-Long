import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { validateName, sortEntries } from '../src/leaderboard.js';

test('Phase 4 — Contract v1.3 Schema & Commands', () => {
  const contractPath = path.resolve(process.cwd(), 'game.contract.json');
  assert.ok(fs.existsSync(contractPath), 'game.contract.json must exist');

  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  assert.equal(contract.contract_version, '1.3');
  assert.ok(contract.bench_cmd, 'bench_cmd must be defined');
  assert.ok(contract.soak_cmd, 'soak_cmd must be defined');
  assert.ok(contract.run_cmd, 'run_cmd must be defined');
  assert.ok(contract.headless_cmd, 'headless_cmd must be defined');
});

test('Phase 4 — Leaderboard validation & sort logic', () => {
  assert.equal(validateName('May_1'), true);
  assert.equal(validateName('Hero12345678'), true);
  assert.equal(validateName('ab'), false); // too short (<3)
  assert.equal(validateName('ThisNameIsWayTooLong'), false); // too long (>12)
  assert.equal(validateName('Bad Name!'), false); // invalid characters

  const unsorted = [
    { name: 'PlayerB', score: 100, achieved_at: '2026-11-20T10:00:00Z' },
    { name: 'PlayerA', score: 200, achieved_at: '2026-11-20T10:05:00Z' },
    { name: 'PlayerC', score: 100, achieved_at: '2026-11-20T09:00:00Z' } // earlier timestamp wins tie
  ];

  const sorted = sortEntries(unsorted);
  assert.equal(sorted[0].name, 'PlayerA');
  assert.equal(sorted[1].name, 'PlayerC'); // 100 score, achieved at 09:00
  assert.equal(sorted[2].name, 'PlayerB'); // 100 score, achieved at 10:00
});

test('Phase 4 — Leaderboard Export CLI', () => {
  const tmpOut = path.resolve(process.cwd(), 'tests/tmp_export_lb.json');
  if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);

  execSync(`node src/headless.js --export-leaderboard "${tmpOut}"`);
  assert.ok(fs.existsSync(tmpOut), 'Exported file must exist');

  const data = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
  assert.ok(Array.isArray(data.entries), 'entries array required');
  assert.ok(data.entries.length > 0, 'should contain entries');

  fs.unlinkSync(tmpOut);
});

test('Phase 4 — Soak Test Output Thresholds', () => {
  const soakPath = path.resolve(process.cwd(), 'soak.json');
  assert.ok(fs.existsSync(soakPath), 'soak.json must exist');

  const data = JSON.parse(fs.readFileSync(soakPath, 'utf8'));
  assert.equal(data.nights, 10);
  assert.equal(data.crashes, 0);
  assert.ok(data.mem_end_mb <= 1.2 * data.mem_start_mb, 'mem_end_mb <= 1.2 * mem_start_mb');
});

test('Phase 4 — Benchmark Output Thresholds', () => {
  const benchPath = path.resolve(process.cwd(), 'bench.json');
  assert.ok(fs.existsSync(benchPath), 'bench.json must exist');

  const data = JSON.parse(fs.readFileSync(benchPath, 'utf8'));
  assert.equal(data.contract_version, '1.3');
  assert.ok(data.avg_fps >= 60, `avg_fps (${data.avg_fps}) >= 60`);
  assert.ok(data.p1_low_fps >= 30, `p1_low_fps (${data.p1_low_fps}) >= 30`);
  assert.ok(data.load_ms <= 10000, `load_ms (${data.load_ms}) <= 10000`);
});
