import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const MODES = ['euroleague', 'nba', 'mixed'];
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LEAGUES = ['euroleague', 'nba'];
const MAX_RATING_DIFF_RATIO = 0.15;

const errors = [];

for (const mode of MODES) {
  const file = join(here, `players_${mode}.json`);
  const players = JSON.parse(readFileSync(file, 'utf-8'));
  const label = `players_${mode}.json`;

  if (players.length !== 10) {
    errors.push(`${label}: πρέπει να έχει 10 παίκτες, έχει ${players.length}`);
  }

  const ids = new Set();
  for (const p of players) {
    if (ids.has(p.id)) errors.push(`${label}: διπλό id "${p.id}"`);
    ids.add(p.id);

    if (!POSITIONS.includes(p.position)) {
      errors.push(`${label}: ο "${p.name}" έχει άκυρη θέση "${p.position}"`);
    }
    if (!LEAGUES.includes(p.league)) {
      errors.push(`${label}: ο "${p.name}" έχει άκυρο league "${p.league}"`);
    }
    if (!Number.isInteger(p.overallRating) || p.overallRating < 70 || p.overallRating > 99) {
      errors.push(`${label}: ο "${p.name}" έχει rating εκτός 70-99 (${p.overallRating})`);
    }
    if (typeof p.name !== 'string' || !p.name.trim()) {
      errors.push(`${label}: παίκτης χωρίς όνομα (id ${p.id})`);
    }
    if (typeof p.team !== 'string' || !p.team.trim()) {
      errors.push(`${label}: ο "${p.name}" δεν έχει ομάδα`);
    }
    if (!('photoUrl' in p)) {
      errors.push(`${label}: ο "${p.name}" δεν έχει πεδίο photoUrl`);
    }
  }

  for (const pos of POSITIONS) {
    const pair = players.filter((p) => p.position === pos);
    if (pair.length !== 2) {
      errors.push(`${label}: η θέση ${pos} έχει ${pair.length} παίκτες αντί για 2`);
      continue;
    }
    const [a, b] = pair;
    const high = Math.max(a.overallRating, b.overallRating);
    const diff = Math.abs(a.overallRating - b.overallRating);
    const ratio = diff / high;
    if (ratio > MAX_RATING_DIFF_RATIO) {
      errors.push(
        `${label}: το ζευγάρι ${pos} (${a.name} ${a.overallRating} vs ${b.name} ${b.overallRating}) ` +
          `έχει διαφορά ${(ratio * 100).toFixed(1)}% > ${MAX_RATING_DIFF_RATIO * 100}%`
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Αποτυχία επικύρωσης δεξαμενής παικτών:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('OK: και τα 3 datasets έχουν 10 παίκτες, 2 ανά θέση, με ισορροπημένα ratings.');
