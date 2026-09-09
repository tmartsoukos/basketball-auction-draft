import type { SeatState } from '@bad/engine';
import { playersByIds } from '../lib/players';

interface Props {
  seat: SeatState;
  isMe: boolean;
  isTurn?: boolean;
  target?: number;
}

export function SeatPanel({ seat, isMe, isTurn, target }: Props) {
  const roster = playersByIds(seat.roster);

  return (
    <div className={isTurn ? 'seat-panel turn' : 'seat-panel'}>
      <div className="seat-head">
        <strong>
          {seat.nickname}
          {isMe ? ' (εσύ)' : ''}
          {target !== undefined && (
            <span className="slots">
              {' '}
              {roster.length}/{target}
            </span>
          )}
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
