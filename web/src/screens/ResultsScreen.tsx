import type { SeatIndex } from '@bad/engine';
import { summarize } from '@bad/engine';
import type { GameView } from '../lib/useGame';
import { playersByIds } from '../lib/players';

interface Props {
  view: GameView;
  seatIndex: SeatIndex;
  onNewGame: () => void;
}

export function ResultsScreen({ view, seatIndex, onNewGame }: Props) {
  const allDrafted = playersByIds([...view.state.seats[0].roster, ...view.state.seats[1].roster]);
  const summary = summarize(view.state, allDrafted);

  return (
    <div className="screen">
      <h2>Τελικά ρόστερ</h2>

      <p className="banner">
        {summary.winnerSeat === null
          ? 'Ισοπαλία στο συνολικό rating!'
          : `Νικητής: ${summary.seats[summary.winnerSeat].nickname}`}
      </p>

      <div className="seats">
        {summary.seats.map((seat) => (
          <div key={seat.seatIndex} className="seat-panel">
            <div className="seat-head">
              <strong>
                {seat.nickname}
                {seat.seatIndex === seatIndex ? ' (εσύ)' : ''}
              </strong>
              <span className="budget">{seat.budgetLeft}€</span>
            </div>
            <p className="total-rating">Συνολικό rating: {seat.totalRating}</p>
            <ul className="roster">
              {seat.roster.map((p) => (
                <li key={p.id}>
                  <span className="pos">{p.position}</span> {p.name}
                  <span className="rating-inline">{p.overallRating}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button className="primary" onClick={onNewGame}>
        Νέο παιχνίδι
      </button>
    </div>
  );
}
