import { useState } from 'react';
import type { SeatIndex } from '@bad/engine';
import { minimumBid } from '@bad/engine';
import type { GameView } from '../lib/useGame';
import { ApiError, passBid, placeBid } from '../lib/api';
import { playerById } from '../lib/players';
import { PlayerCard } from '../components/PlayerCard';
import { SeatPanel } from '../components/SeatPanel';

interface Props {
  view: GameView;
  seatIndex: SeatIndex;
  sessionToken: string;
  gameId: string;
  opponentOnline: boolean;
}

export function AuctionScreen({ view, seatIndex, sessionToken, gameId, opponentOnline }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const { state } = view;
  const player = playerById(state.currentPlayerId);
  const myTurn = state.turnSeat === seatIndex;
  const min = minimumBid(state);
  const myBudget = state.seats[seatIndex].budget;
  const canAffordMin = myBudget >= min;

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setCustomAmount('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Κάτι πήγε στραβά.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="round-head">
        <span>
          Γύρος {state.round}/{state.totalRounds}
        </span>
        <span className={opponentOnline ? 'badge ready' : 'badge'}>
          {opponentOnline ? 'Αντίπαλος online' : 'Αντίπαλος offline'}
        </span>
      </div>

      {player && <PlayerCard player={player} />}

      <div className="bid-box">
        {state.highestBidderSeat === null ? (
          <p>Καμία προσφορά ακόμα. Ελάχιστη προσφορά: {min}</p>
        ) : (
          <p>
            Υψηλότερη προσφορά: <strong>{state.highestBid}</strong> από{' '}
            {state.seats[state.highestBidderSeat].nickname}
          </p>
        )}
        <p className={myTurn ? 'turn-indicator mine' : 'turn-indicator'}>
          {myTurn ? 'Είναι η σειρά σου' : `Σειρά: ${state.seats[state.turnSeat].nickname}`}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button
          className="primary"
          disabled={!myTurn || busy || !canAffordMin}
          onClick={() => act(() => placeBid({ gameId, sessionToken, amount: min }))}
        >
          Προσφορά {min}
        </button>
        <button
          className="secondary"
          disabled={!myTurn || busy}
          onClick={() => act(() => passBid({ gameId, sessionToken }))}
        >
          Αποχωρώ
        </button>
      </div>

      <div className="custom-bid">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={myBudget}
          value={customAmount}
          placeholder={`Δικό σου ποσό (≥ ${min})`}
          onChange={(e) => setCustomAmount(e.target.value)}
          disabled={!myTurn || busy}
        />
        <button
          className="secondary"
          disabled={!myTurn || busy || !customAmount}
          onClick={() => act(() => placeBid({ gameId, sessionToken, amount: Number(customAmount) }))}
        >
          Προσφορά
        </button>
      </div>

      {!canAffordMin && myTurn && (
        <p className="muted">Δεν σου φτάνει το budget για προσφορά — μπορείς μόνο να αποχωρήσεις.</p>
      )}

      <div className="seats">
        <SeatPanel seat={state.seats[0]} isMe={seatIndex === 0} isTurn={state.turnSeat === 0} />
        <SeatPanel seat={state.seats[1]} isMe={seatIndex === 1} isTurn={state.turnSeat === 1} />
      </div>
    </div>
  );
}
