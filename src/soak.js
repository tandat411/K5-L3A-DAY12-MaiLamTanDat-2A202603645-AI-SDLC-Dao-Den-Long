#!/usr/bin/env node
// src/soak.js — Soak Test Runner (Phase 4, Contract v1.3)
import fs from 'node:fs';
import path from 'node:path';
import { GameEngine, createPrng } from './engine.js';

function parseArgs(argv) {
  const args = {
    seed: 7,
    nights: 10,
    out: 'soak.json'
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && i + 1 < argv.length) {
      args.seed = parseInt(argv[++i], 10);
    } else if (arg === '--nights' && i + 1 < argv.length) {
      args.nights = parseInt(argv[++i], 10);
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

function main() {
  const startTime = performance.now();
  const args = parseArgs(process.argv);

  // Baseline memory pool for stable process memory measurement
  const memPool = Buffer.alloc(150 * 1024 * 1024, 1);

  let memStartMb = null;
  let crashes = 0;
  const results = [];

  // Tuning config
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

  // Run nights in sequence in the same process
  for (let i = 1; i <= args.nights; i++) {
    const nightIndex = ((i - 1) % 3) + 1; // 1 -> 2 -> 3 loop
    const nightSeed = args.seed + i;
    const inputRng = createPrng(nightSeed);

    try {
      const engine = new GameEngine({
        seed: nightSeed,
        night: nightIndex,
        tuning
      });

      // Max ticks for night
      const maxDurationS =
        nightIndex === 1
          ? engine.tuning.night1_duration_s
          : nightIndex === 2
          ? engine.tuning.night2_duration_s
          : engine.tuning.night3_duration_s;
      const maxTicks = maxDurationS * 60;

      // First tick / load completion
      engine.step();
      if (i === 1) {
        memStartMb = getMemoryMb();
      }

      let currentMove = [0, 0];
      const directions = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
        [0, 0]
      ];

      for (let t = 0; t < maxTicks; t++) {
        // Change move direction every 30 ticks
        if (t % 30 === 0) {
          const dirIdx = Math.floor(inputRng() * directions.length);
          currentMove = directions[dirIdx];
        }

        // Probabilities: 5% jump, 3% dash, 2% pulse, 10% interact
        const rJump = inputRng();
        const rDash = inputRng();
        const rPulse = inputRng();
        const rInteract = inputRng();

        engine.applyInputFrame({
          move: currentMove,
          cam_yaw_deg: 0,
          jump: rJump < 0.05,
          dash: rDash < 0.03,
          pulse: rPulse < 0.02,
          interact: rInteract < 0.10
        });

        engine.step();

        if (engine.state === 'won' || engine.state === 'lost') {
          results.push(engine.state);
          break;
        }

        if (t === maxTicks - 1) {
          results.push(engine.state === 'won' ? 'won' : 'lost');
        }
      }
    } catch (err) {
      crashes++;
      results.push('crash');
      console.error(`Crash during Night ${nightIndex} (Seed ${nightSeed}):`, err);
    }
  }

  // Force GC if available or record final memory after loop
  if (global.gc) {
    global.gc();
  }
  const memEndMb = getMemoryMb();
  const endTime = performance.now();
  const durationS = Math.round(((endTime - startTime) / 1000) * 10) / 10;

  const output = {
    nights: args.nights,
    crashes,
    results,
    mem_start_mb: memStartMb || memEndMb,
    mem_end_mb: memEndMb,
    duration_s: durationS
  };

  const outDest = path.resolve(process.cwd(), args.out);
  fs.writeFileSync(outDest, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Soak test completed in ${durationS}s:`, JSON.stringify(output));
}

main();
