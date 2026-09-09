import type { Player } from '@bad/engine';
import euroleague from '../../../data/players_euroleague.json';
import nba from '../../../data/players_nba.json';
import mixed from '../../../data/players_mixed.json';

const all = [...euroleague, ...nba, ...mixed] as Player[];

const byId = new Map(all.map((p) => [p.id, p]));

export function playerById(id: string | null): Player | null {
  return id ? (byId.get(id) ?? null) : null;
}

export function playersByIds(ids: string[]): Player[] {
  return ids.map((id) => byId.get(id)).filter((p): p is Player => p !== undefined);
}

export const POSITION_LABELS: Record<Player['position'], string> = {
  PG: 'Πλέι μέικερ',
  SG: 'Σούτινγκ γκαρντ',
  SF: 'Σμολ φόργουορντ',
  PF: 'Πάουερ φόργουορντ',
  C: 'Σέντερ',
};

export const LEAGUE_LABELS: Record<Player['league'], string> = {
  euroleague: 'EuroLeague',
  nba: 'NBA',
};
