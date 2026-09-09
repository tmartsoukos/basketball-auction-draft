import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const MODES = ['euroleague', 'nba', 'mixed'];
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LEAGUES = ['euroleague', 'nba'];
const PER_POSITION = 6;
const POOL_SIZE = POSITIONS.length * PER_POSITION;
const MAX_RATING_DIFF_RATIO = 0.15;

const errors = [];

for (const mode of MODES) {
  const file = join(here, `players_${mode}.json`);
  const players = JSON.parse(readFileSync(file, 'utf-8'));
  const label = `players_${mode}.json`;

  if (players.length !== POOL_SIZE) {
    errors.push(`${label}: πρέπει να έχει ${POOL_SIZE} παίκτες, έχει ${players.length}`);
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

  // Σε κάθε γύρο κληρώνονται 2 παίκτες ανά θέση, οπότε όλη η ομάδα θέσης πρέπει να
  // είναι κοντά σε rating: όποιοι δύο κι αν βγουν, η δημοπρασία να έχει νόημα.
  for (const pos of POSITIONS) {
    const group = players.filter((p) => p.position === pos);
    if (group.length !== PER_POSITION) {
      errors.push(`${label}: η θέση ${pos} έχει ${group.length} παίκτες αντί για ${PER_POSITION}`);
      continue;
    }
    const ratings = group.map((p) => p.overallRating);
    const high = Math.max(...ratings);
    const low = Math.min(...ratings);
    const ratio = (high - low) / high;
    if (ratio > MAX_RATING_DIFF_RATIO) {
      const best = group.find((p) => p.overallRating === high);
      const worst = group.find((p) => p.overallRating === low);
      errors.push(
        `${label}: η θέση ${pos} (${best.name} ${high} vs ${worst.name} ${low}) ` +
          `έχει διαφορά ${(ratio * 100).toFixed(1)}% > ${MAX_RATING_DIFF_RATIO * 100}%`
      );
    }
  }

  if (mode === 'mixed') {
    for (const league of LEAGUES) {
      if (!players.some((p) => p.league === league)) {
        errors.push(`${label}: δεν περιέχει κανέναν παίκτη από ${league}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Αποτυχία επικύρωσης δεξαμενής παικτών:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK: και τα 3 datasets έχουν ${POOL_SIZE} παίκτες, ${PER_POSITION} ανά θέση, με ισορροπημένα ratings.`
);
