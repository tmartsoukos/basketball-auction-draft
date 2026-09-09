import type { Player } from '@bad/engine';
import { LEAGUE_LABELS, POSITION_LABELS } from '../lib/players';

export function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="player-card">
      <div className="avatar" aria-hidden="true">
        {player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.position}
      </div>
      <div className="player-info">
        <h3>{player.name}</h3>
        <p>
          {POSITION_LABELS[player.position]} · {player.team}
        </p>
        <p className="league">{LEAGUE_LABELS[player.league]}</p>
      </div>
      <div className="rating">{player.overallRating}</div>
    </div>
  );
}
