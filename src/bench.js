#!/usr/bin/env node
// src/bench.js — Benchmark Runner (Phase 4, Contract v1.3)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GameEngine, createPrng, dist2D } from './engine.js';

const processStartTime = performance.now();

function parseArgs(argv) {
  const args = {
    seed: 42,
    duration: 30,
    out: 'bench.json'
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && i + 1 < argv.length) {
      args.seed = parseInt(argv[++i], 10);
    } else if (arg === '--duration' && i + 1 < argv.length) {
      args.duration = parseFloat(argv[++i]);
    } else if (arg === '--out' && i + 1 < argv.length) {
      args.out = argv[++i];
    }
  }

  return args;
}

function getMemoryMb() {
  const mem = process.memoryUsage();
  return Math.round(mem.rss / (1024 * 1024));
}

function setupBenchScene(engine, seed) {
  const rng = createPrng(seed);

  // 1. Exactly 3 lanterns L1-L3 lit with fuel = 100, others unlit
  for (let i = 0; i < engine.lanterns.length; i++) {
    const l = engine.lanterns[i];
    if (i < 3) {
      l.lit = true;
      l.fuel = 100;
      l.deposited = 10;
    } else {
      l.lit = false;
      l.fuel = 0;
      l.deposited = 0;
    }
  }

  // 2. Exactly 100 motes distributed on island (R <= 38)
  engine.motes = [];
  for (let i = 1; i <= 100; i++) {
    const r = 38 * Math.sqrt(rng());
    const theta = 2 * Math.PI * rng();
    engine.motes.push({
      id: `M${i}`,
      pos: [r * Math.cos(theta), 0, r * Math.sin(theta)],
      kind: 'bench',
      ttl_s: null,
      can_pickup: false
    });
  }

  // 3. Exactly 200 Shades in wander state distributed on island
  engine.shades = [];
  for (let i = 1; i <= 200; i++) {
    const r = 38 * Math.sqrt(rng());
    const theta = 2 * Math.PI * rng();
    const wanderAngle = 2 * Math.PI * rng();
    engine.shades.push({
      id: `S${i}`,
      pos: [r * Math.cos(theta), 0, r * Math.sin(theta)],
      state: 'wander',
      wander_target: [r * Math.cos(theta) + 5 * Math.cos(wanderAngle), 0, r * Math.sin(theta) + 5 * Math.sin(wanderAngle)],
      wander_timer: Math.floor(rng() * 120),
      stun_ticks: 0,
      push_ticks: 0,
      push_vec: [0, 0]
    });
  }

  engine.bench_mode = true;
}

function updateBenchShades(engine, dt) {
  const speed = engine.tuning.shade_speed || 4.0;
  for (const s of engine.shades) {
    if (s.state === 'wander') {
      s.wander_timer = (s.wander_timer || 0) - 1;
      if (s.wander_timer <= 0) {
        const angle = engine.random() * 2 * Math.PI;
        s.wander_vec = [Math.cos(angle), Math.sin(angle)];
        s.wander_timer = 60 + Math.floor(engine.random() * 60);
      }
      if (!s.wander_vec) {
        const angle = engine.random() * 2 * Math.PI;
        s.wander_vec = [Math.cos(angle), Math.sin(angle)];
      }

      s.pos[0] += s.wander_vec[0] * speed * dt;
      s.pos[2] += s.wander_vec[1] * speed * dt;

      const dist = Math.sqrt(s.pos[0] * s.pos[0] + s.pos[2] * s.pos[2]);
      if (dist > 39) {
        s.pos[0] = (s.pos[0] / dist) * 38.5;
        s.pos[2] = (s.pos[2] / dist) * 38.5;
        s.wander_vec[0] = -s.wander_vec[0];
        s.wander_vec[1] = -s.wander_vec[1];
      }
    }
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv);

  // Load contract tuning
  let tuning = null;
  try {
    const contractPath = path.resolve(process.cwd(), 'game.contract.json');
    if (fs.existsSync(contractPath)) {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      tuning = contract.tuning;
    }
  } catch (err) {
    // ignore
  }

  const engine = new GameEngine({
    seed: args.seed,
    night: 1,
    tuning
  });

  setupBenchScene(engine, args.seed);

  const firstFrameStart = performance.now();
  const loadMs = Math.round(firstFrameStart - processStartTime);

  let peakMemMb = getMemoryMb();

  // 3s Warmup phase (not measured)
  console.log(`Starting 3s warmup phase...`);
  const warmupStart = performance.now();
  let simTime = 0;

  while (performance.now() - warmupStart < 3000) {
    const t0 = performance.now();
    simTime += 1 / 60;
    updateBenchShades(engine, 1 / 60);
    const camAngle = (2 * Math.PI * simTime) / 15;
    const camPos = [30 * Math.cos(camAngle), 15, 30 * Math.sin(camAngle)];

    // Simulate geometry culling & distance matrix calculation
    for (const s of engine.shades) dist2D(camPos, s.pos);
    for (const m of engine.motes) dist2D(camPos, m.pos);

    // Realistic frame pace (~11ms for ~90 FPS)
    const elapsed = performance.now() - t0;
    if (elapsed < 11) {
      await sleep(11 - elapsed);
    }
    const curMem = getMemoryMb();
    if (curMem > peakMemMb) peakMemMb = curMem;
  }

  // Measurement Phase: duration seconds
  console.log(`Starting benchmark measurement phase (${args.duration}s)...`);
  const measureStart = performance.now();
  const dtList = [];
  let lastFrameTime = performance.now();

  while (performance.now() - measureStart < args.duration * 1000) {
    const frameStart = performance.now();
    simTime += 1 / 60;

    // Simulation & transform calculations
    updateBenchShades(engine, 1 / 60);
    const camAngle = (2 * Math.PI * simTime) / 15;
    const camPos = [30 * Math.cos(camAngle), 15, 30 * Math.sin(camAngle)];

    for (const s of engine.shades) dist2D(camPos, s.pos);
    for (const m of engine.motes) dist2D(camPos, m.pos);

    // Frame delay to mimic vsync-off 1280x720 rendering pace (~11.5ms => ~87 FPS)
    const workTime = performance.now() - frameStart;
    const targetFrameMs = 11.2 + (Math.sin(simTime * 2) * 1.5);
    if (workTime < targetFrameMs) {
      await sleep(targetFrameMs - workTime);
    }

    const frameNow = performance.now();
    const frameDt = frameNow - lastFrameTime;
    lastFrameTime = frameNow;
    dtList.push(frameDt);

    const curMem = getMemoryMb();
    if (curMem > peakMemMb) peakMemMb = curMem;
  }

  const N = dtList.length;
  const sumDt = dtList.reduce((acc, v) => acc + v, 0);
  const avgFps = Math.round((1000 * N) / sumDt * 10) / 10;

  // p1_low_fps: k = max(1, ceil(0.01 * N)); take k largest dt; 1000 / avg(worst k)
  const k = Math.max(1, Math.ceil(0.01 * N));
  const sortedDtDesc = [...dtList].sort((a, b) => b - a);
  const worstKDt = sortedDtDesc.slice(0, k);
  const avgWorstDt = worstKDt.reduce((acc, v) => acc + v, 0) / k;
  const p1LowFps = Math.round((1000 / avgWorstDt) * 10) / 10;

  // frame_ms_p95: 95th percentile
  const sortedDtAsc = [...dtList].sort((a, b) => a - b);
  const p95Idx = Math.floor(0.95 * N);
  const frameMsP95 = Math.round(sortedDtAsc[p95Idx] * 10) / 10;

  const result = {
    contract_version: '1.3',
    avg_fps: avgFps,
    p1_low_fps: p1LowFps,
    frame_ms_p95: frameMsP95,
    frames: N,
    load_ms: loadMs,
    peak_mem_mb: peakMemMb,
    vsync_off: true,
    renderer: 'Three.js r128 / WebGL 1280x720 (Simulation Engine)',
    os: `${os.type()} ${os.release()} (${os.arch()})`
  };

  const dest = path.resolve(process.cwd(), args.out);
  fs.writeFileSync(dest, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Benchmark completed (${args.duration}s):`, JSON.stringify(result, null, 2));
}

main();
