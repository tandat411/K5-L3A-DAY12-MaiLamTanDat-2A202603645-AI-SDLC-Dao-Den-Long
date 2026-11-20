#!/usr/bin/env node
// src/headless.js — Test Contract v1.0 Runner
// Karpathy Guidelines: Direct CLI parsing, robust exit codes, deterministic JSONL stream

import fs from 'node:fs';
import path from 'node:path';
import { GameEngine } from './engine.js';

function parseArgs(argv) {
  const args = {
    seed: 1,
    night: 1,
    scenario: null,
    inputs: null,
    ticks: 60,
    out: null,
    snapshot_every: 10
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && i + 1 < argv.length) {
      args.seed = parseInt(argv[++i], 10);
    } else if (arg === '--night' && i + 1 < argv.length) {
      args.night = parseInt(argv[++i], 10);
    } else if (arg === '--scenario' && i + 1 < argv.length) {
      args.scenario = argv[++i];
    } else if (arg === '--inputs' && i + 1 < argv.length) {
      args.inputs = argv[++i];
    } else if (arg === '--ticks' && i + 1 < argv.length) {
      args.ticks = parseInt(argv[++i], 10);
    } else if (arg === '--out' && i + 1 < argv.length) {
      args.out = argv[++i];
    } else if (arg === '--snapshot-every' && i + 1 < argv.length) {
      args.snapshot_every = parseInt(argv[++i], 10);
    }
  }

  return args;
}

function loadJsonFile(filePath) {
  if (!filePath) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Error reading/parsing JSON file ${filePath}: ${err.message}\n`);
    process.exit(2);
  }
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.out) {
    process.stderr.write('Missing required argument: --out <file.jsonl>\n');
    process.exit(1);
  }

  // Load contract tuning
  let tuning = null;
  try {
    const contractPath = path.resolve(process.cwd(), 'game.contract.json');
    if (fs.existsSync(contractPath)) {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      tuning = contract.tuning;
    }
  } catch (err) {
    process.stderr.write(`Warning: Failed to load game.contract.json: ${err.message}\n`);
  }

  const scenarioData = loadJsonFile(args.scenario);
  const inputsData = loadJsonFile(args.inputs);

  // Validate inputs format if provided
  let inputFrames = [];
  if (inputsData) {
    if (!Array.isArray(inputsData.frames)) {
      process.stderr.write('Invalid inputs file: "frames" array is required\n');
      process.exit(2);
    }
    inputFrames = inputsData.frames;
  }

  const engine = new GameEngine({
    seed: args.seed,
    tuning,
    scenario: scenarioData
  });

  const outLines = [];

  // Snapshot tick 0
  outLines.push(JSON.stringify(engine.getSnapshot()));

  // Index input frames by tick for fast lookup
  let frameIdx = 0;

  const totalTicks = args.ticks;
  for (let step = 0; step < totalTicks; step++) {
    // Current tick before step is step
    while (frameIdx < inputFrames.length && inputFrames[frameIdx].tick <= step) {
      engine.applyInputFrame(inputFrames[frameIdx]);
      frameIdx++;
    }

    const events = engine.step();

    // Stream any events that happened during this step
    for (const evt of events) {
      outLines.push(JSON.stringify(evt));
    }

    // Periodic Snapshot
    if (engine.tick % args.snapshot_every === 0) {
      outLines.push(JSON.stringify(engine.getSnapshot()));
    }

    // If game ended, stop simulation early
    if (engine.state !== 'playing') {
      break;
    }
  }

  // Final mandatory End line
  outLines.push(
    JSON.stringify({
      type: 'end',
      ticks: engine.tick,
      state: engine.state,
      score: engine.score
    })
  );

  // Write output jsonl file
  try {
    const outDir = path.dirname(path.resolve(args.out));
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(args.out, outLines.join('\n') + '\n', 'utf-8');
  } catch (err) {
    process.stderr.write(`Failed to write output to ${args.out}: ${err.message}\n`);
    process.exit(1);
  }

  process.exit(0);
}

main();
