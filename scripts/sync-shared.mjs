// Αντιγράφει τον καθαρό κώδικα του engine, τα datasets και τα shared helpers
// μέσα σε κάθε φάκελο Edge Function, ώστε κάθε function να είναι αυτοτελής για το Deno.
// Μοναδική πηγή αλήθειας: packages/engine/src, data/*.json, supabase/shared-src.
// Τρέξε: npm run sync:shared

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'supabase', 'functions');

const HEADER = '// ΠΑΡΑΓΟΜΕΝΟ ΑΡΧΕΙΟ — μην το επεξεργάζεσαι. Τρέξε: npm run sync:shared\n\n';

// Το Deno απαιτεί ρητή κατάληξη .ts στα relative imports.
const withTsExtensions = (source) =>
  source.replace(/from '\.\/([a-zA-Z0-9_-]+)'/g, "from './$1.ts'");

const engineSrc = join(root, 'packages', 'engine', 'src');
const types = withTsExtensions(readFileSync(join(engineSrc, 'types.ts'), 'utf-8'));
const engine = withTsExtensions(readFileSync(join(engineSrc, 'engine.ts'), 'utf-8'));

const sharedSrc = join(root, 'supabase', 'shared-src');
const http = readFileSync(join(sharedSrc, 'http.ts'), 'utf-8');
const db = readFileSync(join(sharedSrc, 'db.ts'), 'utf-8');

const dataDir = join(root, 'data');
const pools = {
  euroleague: JSON.parse(readFileSync(join(dataDir, 'players_euroleague.json'), 'utf-8')),
  nba: JSON.parse(readFileSync(join(dataDir, 'players_nba.json'), 'utf-8')),
  mixed: JSON.parse(readFileSync(join(dataDir, 'players_mixed.json'), 'utf-8')),
};

const players = `import type { GameMode, Player } from './types.ts';

export const PLAYER_POOLS: Record<GameMode, Player[]> = ${JSON.stringify(pools, null, 2)} as Record<GameMode, Player[]>;

export function poolFor(mode: GameMode): Player[] {
  return PLAYER_POOLS[mode];
}
`;

const files = {
  'types.ts': types,
  'engine.ts': engine,
  'players.ts': players,
  'http.ts': http,
  'db.ts': db,
};

// Κάθε function παίρνει μόνο ό,τι χρησιμοποιεί, για να μένει μικρό το bundle.
const NEEDS = {
  create_game: ['types.ts', 'engine.ts', 'players.ts', 'http.ts', 'db.ts'],
  join_game: ['types.ts', 'http.ts', 'db.ts'],
  set_ready: ['types.ts', 'engine.ts', 'http.ts', 'db.ts'],
  reveal_player: ['types.ts', 'engine.ts', 'http.ts', 'db.ts'],
  place_bid: ['types.ts', 'engine.ts', 'http.ts', 'db.ts'],
  pass_bid: ['types.ts', 'engine.ts', 'http.ts', 'db.ts'],
};

const targets = readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const fn of targets) {
  const dir = join(functionsDir, fn);
  mkdirSync(dir, { recursive: true });
  const needed = NEEDS[fn] ?? Object.keys(files);
  for (const file of needed) {
    writeFileSync(join(dir, file), HEADER + files[file], 'utf-8');
  }
  for (const file of Object.keys(files)) {
    if (!needed.includes(file) && existsSync(join(dir, file))) rmSync(join(dir, file));
  }
}

console.log(`OK: shared αρχεία συγχρονίστηκαν σε ${targets.length} functions (${targets.join(', ')}).`);
