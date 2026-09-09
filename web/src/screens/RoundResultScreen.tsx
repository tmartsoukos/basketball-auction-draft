import { useState } from 'react';
import type { SeatIndex } from '@bad/engine';
import { checkGameOver, rosterTarget } from '@bad/engine';
import type { GameView } from '../lib/useGame';
import { ApiError, revealPlayer } from '../lib/api';
import { playerById } from '../lib/players';
import { SeatPanel } from '../components/SeatPanel';

interface Props {
  view: GameView;
  seatIndex: SeatIndex;
  sessionToken: string;
  gameId: string;
}

export function RoundResultScreen({ view, seatIndex, sessionToken, gameId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state } = view;
  const result = state.lastResult;
  const player = playerById(result?.playerId ?? null);
  const gameOver = checkGameOver(state);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      await revealPlayer({ gameId, sessionToken });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Κάτι πήγε στραβά.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="banner">
        {result && player ? (
          <p>
            Ο <strong>{state.seats[result.winnerSeat].nickname}</strong> πήρε τον{' '}
            <strong>{player.name}</strong> για <strong>{result.price}</strong>.
            {result.auto && ' Η πεντάδα του αντιπάλου είναι πλήρης, οπότε δεν έγινε δημοπρασία.'}
          </p>
        ) : (
          <p>Ο γύρος ολοκληρώθηκε.</p>
        )}
      </div>

      <div className="seats">
        {state.seats.map((seat) => (
          <SeatPanel
            key={seat.seatIndex}
            seat={seat}
            isMe={seatIndex === seat.seatIndex}
            target={rosterTarget(state)}
          />
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={busy} onClick={next}>
        {gameOver ? 'Δες τα αποτελέσματα' : 'Επόμενος γύρος'}
      </button>
    </div>
  );
}
