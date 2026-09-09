import { useState } from 'react';
import type { GameMode } from '@bad/engine';
import { ApiError, createGame, joinGame } from '../lib/api';
import type { SessionResponse } from '../lib/api';

interface Props {
  initialRoomCode: string | null;
  onSession: (session: SessionResponse) => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  euroleague: 'EuroLeague',
  nba: 'NBA',
  mixed: 'Mixed',
};

export function LandingScreen({ initialRoomCode, onSession }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [mode, setMode] = useState<GameMode>('mixed');
  const [budget, setBudget] = useState(20);
  const [increment, setIncrement] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const session =
        tab === 'create'
          ? await createGame({ mode, nickname, startingBudget: budget, increment })
          : await joinGame({ roomCode, nickname });
      onSession(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <h1>Basketball Auction Draft</h1>
      <p className="subtitle">Δημοπρασία παικτών για δύο, ο καθένας στο κινητό του.</p>

      <div className="tabs">
        <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')}>
          Δημιουργία
        </button>
        <button className={tab === 'join' ? 'tab active' : 'tab'} onClick={() => setTab('join')}>
          Είσοδος με κωδικό
        </button>
      </div>

      <label className="field">
        <span>Nickname</span>
        <input
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="π.χ. Θέμης"
        />
      </label>

      {tab === 'create' ? (
        <>
          <div className="field">
            <span>Πρωτάθλημα</span>
            <div className="chips">
              {(Object.keys(MODE_LABELS) as GameMode[]).map((m) => (
                <button
                  key={m}
                  className={mode === m ? 'chip active' : 'chip'}
                  onClick={() => setMode(m)}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Αρχικό budget: {budget}</span>
            <input
              type="range"
              min={10}
              max={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span>Βήμα προσφοράς: {increment}</span>
            <input
              type="range"
              min={1}
              max={5}
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value))}
            />
          </label>
        </>
      ) : (
        <label className="field">
          <span>Κωδικός δωματίου</span>
          <input
            value={roomCode}
            maxLength={6}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="π.χ. K7RM2P"
          />
        </label>
      )}

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={busy || !nickname.trim()} onClick={submit}>
        {busy ? 'Περίμενε…' : tab === 'create' ? 'Δημιούργησε παιχνίδι' : 'Μπες στο δωμάτιο'}
      </button>
    </div>
  );
}
