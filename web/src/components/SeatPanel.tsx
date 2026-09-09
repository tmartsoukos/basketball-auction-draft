import type { SeatState } from '@bad/engine';
import { playersByIds } from '../lib/players';

interface Props {
  seat: SeatState;
  isMe: boolean;
  isTurn?: boolean;
}

export function SeatPanel({ seat, isMe, isTurn }: Props) {
  const roster = playersByIds(seat.roster);

  return (
    <div className={isTurn ? 'seat-panel turn' : 'seat-panel'}>
      <div className="seat-head">
        <strong>
          {seat.nickname}
          {isMe ? ' (εσύ)' : ''}
        </strong>
        <span className="budget">{seat.budget}€</span>
      </div>
      {roster.length === 0 ? (
        <p className="muted">Κανένας παίκτης ακόμα</p>
      ) : (
        <ul className="roster">
          {roster.map((p) => (
            <li key={p.id}>
              <span className="pos">{p.position}</span> {p.name}
              <span className="rating-inline">{p.overallRating}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
