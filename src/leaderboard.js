import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PATH = path.resolve(__dirname, '../data/leaderboard.json');

export function validateName(name) {
  if (typeof name !== 'string') return false;
  const regex = /^[A-Za-z0-9_]{3,12}$/;
  return regex.test(name.trim());
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.achieved_at) - new Date(b.achieved_at);
  }).slice(0, 10);
}

export function loadLeaderboard(filePath = DEFAULT_PATH) {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data.entries)) {
        return sortEntries(data.entries);
      }
    }
  } catch (err) {
    // fallback
  }
  return [];
}

export function saveLeaderboard(entries, filePath = DEFAULT_PATH) {
  const sorted = sortEntries(entries);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify({ entries: sorted }, null, 2), 'utf8');
  return sorted;
}

export function addEntry(newEntry, filePath = DEFAULT_PATH) {
  if (!validateName(newEntry.name)) {
    throw new Error('Tên phải từ 3 đến 12 ký tự [A-Za-z0-9_]');
  }
  const current = loadLeaderboard(filePath);
  current.push({
    name: newEntry.name,
    score: Number(newEntry.score) || 0,
    nights_won: Number(newEntry.nights_won) || 0,
    achieved_at: newEntry.achieved_at || new Date().toISOString(),
    seed: Number(newEntry.seed) || 42
  });
  return saveLeaderboard(current, filePath);
}

export function exportLeaderboard(outPath, inPath = DEFAULT_PATH) {
  const current = loadLeaderboard(inPath);
  const dest = path.resolve(process.cwd(), outPath);
  fs.writeFileSync(dest, JSON.stringify({ entries: current }, null, 2), 'utf8');
}
