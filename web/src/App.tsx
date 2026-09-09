import { useEffect, useState } from 'react';
import type { SessionResponse } from './lib/api';
import { clearSession, loadSession, roomCodeFromUrl, saveSession } from './lib/session';
import { useGame } from './lib/useGame';
import { LandingScreen } from './screens/LandingScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { AuctionScreen } from './screens/AuctionScreen';
import { RoundResultScreen } from './screens/RoundResultScreen';
import { ResultsScreen } from './screens/ResultsScreen';

export default function App() {
  const [session, setSession] = useState<SessionResponse | null>(() => loadSession());
  const { view, opponentOnline, loading } = useGame(session?.gameId ?? null, session?.seatIndex ?? null);

  // Το παιχνίδι μπορεί να έχει σβηστεί από τη βάση όσο ήμασταν κλειστοί.
  useEffect(() => {
    if (session && !loading && view === null) {
      const timer = setTimeout(() => {
        if (view === null) {
          clearSession();
          setSession(null);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [session, view, loading]);

  function onSession(next: SessionResponse) {
    saveSession(next);
    setSession(next);
  }

  function leave() {
    clearSession();
    setSession(null);
    window.history.replaceState({}, '', '/');
  }

  if (!session) {
    return <LandingScreen initialRoomCode={roomCodeFromUrl()} onSession={onSession} />;
  }

  if (!view) {
    return (
      <div className="screen">
        <p className="subtitle">Φόρτωση δωματίου…</p>
      </div>
    );
  }

  const common = {
    view,
    seatIndex: session.seatIndex,
    sessionToken: session.sessionToken,
    gameId: session.gameId,
  };

  switch (view.state.phase) {
    case 'lobby':
      return <LobbyScreen {...common} opponentOnline={opponentOnline} onLeave={leave} />;
    case 'auction':
      return <AuctionScreen {...common} opponentOnline={opponentOnline} />;
    case 'round_result':
      return <RoundResultScreen {...common} />;
    case 'finished':
      return <ResultsScreen view={view} seatIndex={session.seatIndex} onNewGame={leave} />;
  }
}
