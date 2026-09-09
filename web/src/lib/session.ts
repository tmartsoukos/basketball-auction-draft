export interface StoredSession {
  gameId: string;
  roomCode: string;
  seatIndex: 0 | 1;
  sessionToken: string;
}

const KEY = 'bad.session';

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

/** Ο κωδικός δωματίου μπορεί να έρθει και από το link: /?room=ABC123 */
export function roomCodeFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room');
}

export function shareLink(roomCode: string): string {
  return `${window.location.origin}/?room=${roomCode}`;
}
