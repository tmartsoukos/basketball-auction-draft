import { useState } from 'react';
import type { SeatIndex } from '@bad/engine';
import { maxBid, minimumBid, mustBid, rosterTarget, slotsLeft } from '@bad/engine';
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
  const max = maxBid(state, seatIndex);
  const canAffordMin = max >= min;
  const reserve = Math.max(slotsLeft(state, seatIndex) - 1, 0);
  const openerMustBid = mustBid(state, seatIndex);

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
          {myTurn
            ? openerMustBid
              ? 'Ανοίγεις τον γύρο — πρέπει να κάνεις προσφορά'
              : 'Είναι η σειρά σου'
            : `Σειρά: ${state.seats[state.turnSeat].nickname}`}
        </p>
        <p className="muted">
          Μέγιστη προσφορά σου: {Math.max(max, 0)}
          {reserve > 0 && ` (κρατάς ${reserve} για τις υπόλοιπες θέσεις σου)`}
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
        {!openerMustBid && (
          <button
            className="secondary"
            disabled={!myTurn || busy}
            onClick={() => act(() => passBid({ gameId, sessionToken }))}
          >
            Αποχωρώ
          </button>
        )}
      </div>

      <div className="custom-bid">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
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
        {state.seats.map((seat) => (
          <SeatPanel
            key={seat.seatIndex}
            seat={seat}
            isMe={seatIndex === seat.seatIndex}
            isTurn={state.turnSeat === seat.seatIndex}
            target={rosterTarget(state)}
          />
        ))}
      </div>
    </div>
  );
}
