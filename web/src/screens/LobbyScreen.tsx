import { useState } from 'react';
import type { SeatIndex } from '@bad/engine';
import type { GameView } from '../lib/useGame';
import { ApiError, setReady } from '../lib/api';
import { shareLink } from '../lib/session';

interface Props {
  view: GameView;
  seatIndex: SeatIndex;
  sessionToken: string;
  gameId: string;
  opponentOnline: boolean;
  onLeave: () => void;
}

export function LobbyScreen({
  view,
  seatIndex,
  sessionToken,
  gameId,
  opponentOnline,
  onLeave,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const me = view.seatRows.find((r) => r.seat_index === seatIndex);
  const link = shareLink(view.roomCode);

  async function toggleReady() {
    setBusy(true);
    setError(null);
    try {
      await setReady({ gameId, sessionToken, ready: !me?.is_ready });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Κάτι πήγε στραβά.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="screen">
      <h2>Δωμάτιο {view.roomCode}</h2>
      <p className="subtitle">
        Στείλε τον κωδικό ή το link στον αντίπαλο. Ξεκινάτε όταν δηλώσετε και οι δύο έτοιμοι.
      </p>

      <button className="secondary" onClick={copyLink}>
        {copied ? 'Αντιγράφηκε!' : 'Αντιγραφή link πρόσκλησης'}
      </button>

      <div className="info-grid">
        <div>
          <span className="label">Πρωτάθλημα</span>
          <strong>{view.state.mode}</strong>
        </div>
        <div>
          <span className="label">Budget</span>
          <strong>{view.state.startingBudget}</strong>
        </div>
        <div>
          <span className="label">Βήμα</span>
          <strong>{view.state.increment}</strong>
        </div>
        <div>
          <span className="label">Γύροι</span>
          <strong>{view.state.totalRounds}</strong>
        </div>
      </div>

      <ul className="seat-list">
        {[0, 1].map((index) => {
          const row = view.seatRows.find((r) => r.seat_index === index);
          return (
            <li key={index}>
              <span>
                {row ? row.nickname : 'Αναμονή παίκτη…'}
                {index === seatIndex ? ' (εσύ)' : ''}
              </span>
              <span className={row?.is_ready ? 'badge ready' : 'badge'}>
                {row ? (row.is_ready ? 'Έτοιμος' : 'Δεν είναι έτοιμος') : '—'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="subtitle">
        Αντίπαλος: {opponentOnline ? 'συνδεδεμένος' : 'εκτός σύνδεσης'}
      </p>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={busy} onClick={toggleReady}>
        {me?.is_ready ? 'Ακύρωση ετοιμότητας' : 'Είμαι έτοιμος'}
      </button>
      <button className="link" onClick={onLeave}>
        Έξοδος από το δωμάτιο
      </button>
    </div>
  );
}
