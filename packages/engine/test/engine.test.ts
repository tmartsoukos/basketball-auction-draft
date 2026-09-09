import { describe, expect, it } from 'vitest';
import {
  applyBid,
  applyPass,
  canBid,
  checkGameOver,
  createInitialState,
  minimumBid,
  nextRound,
  summarize,
} from '../src/engine';
import type { GameState, Player, SeatIndex } from '../src/types';

const POOL = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];

const PLAYERS: Player[] = POOL.map((id, i) => ({
  id,
  name: `Player ${i + 1}`,
  league: 'nba',
  team: 'Team',
  position: 'PG',
  overallRating: 80 + i,
  photoUrl: null,
}));

function freshGame(overrides: Partial<Parameters<typeof createInitialState>[0]> = {}) {
  return createInitialState({
    mode: 'nba',
    pool: POOL,
    nicknames: ['Α', 'Β'],
    ...overrides,
  });
}

function startedGame(overrides: Partial<Parameters<typeof createInitialState>[0]> = {}) {
  const res = nextRound(freshGame(overrides));
  if (!res.ok) throw new Error('nextRound απέτυχε');
  return res.state;
}

function expectOk(res: ReturnType<typeof applyBid>): GameState {
  if (!res.ok) throw new Error(`Αναμενόταν επιτυχία, ήρθε ${res.code}: ${res.message}`);
  return res.state;
}

function bid(state: GameState, seat: SeatIndex, amount: number): GameState {
  return expectOk(applyBid(state, seat, amount));
}

describe('αρχική κατάσταση', () => {
  it('δίνει σε κάθε παίκτη το αρχικό budget και άδειο ρόστερ', () => {
    const s = freshGame();
    expect(s.phase).toBe('lobby');
    expect(s.seats[0].budget).toBe(20);
    expect(s.seats[1].budget).toBe(20);
    expect(s.seats[0].roster).toEqual([]);
    expect(s.round).toBe(0);
  });

  it('σέβεται custom budget και increment', () => {
    const s = freshGame({ startingBudget: 35, increment: 2 });
    expect(s.seats[0].budget).toBe(35);
    expect(s.increment).toBe(2);
  });
});

describe('έναρξη γύρου', () => {
  it('αποκαλύπτει τον πρώτο παίκτη και δίνει τη σειρά στο seat 0', () => {
    const s = startedGame();
    expect(s.phase).toBe('auction');
    expect(s.round).toBe(1);
    expect(s.currentPlayerId).toBe('p1');
    expect(s.pool).toHaveLength(9);
    expect(s.openerSeat).toBe(0);
    expect(s.turnSeat).toBe(0);
  });

  it('εναλλάσσει ποιος ανοίγει τη δημοπρασία ανά γύρο', () => {
    let s = startedGame();
    s = expectOk(applyBid(s, 0, 1));
    s = expectOk(applyPass(s, 1));
    s = expectOk(nextRound(s));
    expect(s.round).toBe(2);
    expect(s.openerSeat).toBe(1);
    expect(s.turnSeat).toBe(1);
    expect(s.currentPlayerId).toBe('p2');
  });

  it('δεν επιτρέπει νέο γύρο ενώ τρέχει δημοπρασία', () => {
    const s = startedGame();
    const res = nextRound(s);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('WRONG_PHASE');
  });
});

describe('προσφορές', () => {
  it('απορρίπτει προσφορά εκτός σειράς', () => {
    const s = startedGame();
    const res = applyBid(s, 1, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });

  it('απαιτεί τουλάχιστον 1 στην πρώτη προσφορά', () => {
    const s = startedGame();
    const res = applyBid(s, 0, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BID_TOO_LOW');
  });

  it('απαιτεί υπέρβαση της τρέχουσας προσφοράς κατά το increment', () => {
    let s = startedGame({ increment: 2 });
    s = bid(s, 0, 5);
    expect(minimumBid(s)).toBe(7);
    const tooLow = applyBid(s, 1, 6);
    expect(tooLow.ok).toBe(false);
    if (!tooLow.ok) expect(tooLow.code).toBe('BID_TOO_LOW');
    expect(expectOk(applyBid(s, 1, 7)).highestBid).toBe(7);
  });

  it('απορρίπτει προσφορά πάνω από το budget', () => {
    const s = startedGame({ startingBudget: 10 });
    const res = applyBid(s, 0, 11);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BID_OVER_BUDGET');
  });

  it('μετά από προσφορά περνάει η σειρά στον αντίπαλο', () => {
    let s = startedGame();
    s = bid(s, 0, 3);
    expect(s.turnSeat).toBe(1);
    expect(s.highestBidderSeat).toBe(0);
  });

  it('δηλώνει ότι δεν μπορεί να πλειοδοτήσει όποιος δεν έχει budget', () => {
    let s = startedGame({ startingBudget: 3 });
    s = bid(s, 0, 3);
    expect(canBid(s)).toBe(false);
  });
});

describe('αποχώρηση (pass)', () => {
  it('δίνει τον παίκτη στον πλειοδότη και αφαιρεί το ποσό', () => {
    let s = startedGame();
    s = bid(s, 0, 4);
    s = expectOk(applyPass(s, 1));
    expect(s.phase).toBe('round_result');
    expect(s.lastResult).toEqual({ round: 1, playerId: 'p1', winnerSeat: 0, price: 4 });
    expect(s.seats[0].budget).toBe(16);
    expect(s.seats[0].roster).toEqual(['p1']);
    expect(s.seats[1].budget).toBe(20);
  });

  it('αν περάσουν και οι δύο χωρίς προσφορά, ο παίκτης μένει αδιάθετος', () => {
    let s = startedGame();
    s = expectOk(applyPass(s, 0));
    expect(s.phase).toBe('auction');
    expect(s.turnSeat).toBe(1);
    s = expectOk(applyPass(s, 1));
    expect(s.phase).toBe('round_result');
    expect(s.lastResult?.winnerSeat).toBeNull();
    expect(s.seats[0].roster).toEqual([]);
    expect(s.seats[1].roster).toEqual([]);
  });

  it('απορρίπτει pass εκτός σειράς', () => {
    const s = startedGame();
    const res = applyPass(s, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });
});

describe('χωρίς περιορισμό θέσης', () => {
  it('επιτρέπει στον ίδιο παίκτη να πάρει πολλούς της ίδιας θέσης', () => {
    let s = startedGame();
    s = bid(s, 0, 1);
    s = expectOk(applyPass(s, 1));
    s = expectOk(nextRound(s));
    s = expectOk(applyPass(s, 1));
    s = bid(s, 0, 1);
    s = expectOk(applyPass(s, 1));
    expect(s.seats[0].roster).toEqual(['p1', 'p2']);
  });
});

describe('τέλος παιχνιδιού', () => {
  it('τελειώνει μετά από 10 γύρους και βγάζει νικητή στο συνολικό rating', () => {
    let s = freshGame();
    for (let i = 0; i < 10; i++) {
      s = expectOk(nextRound(s));
      // Το seat που ανοίγει προσφέρει 1, ο άλλος αποχωρεί.
      const opener = s.openerSeat;
      s = bid(s, opener, 1);
      s = expectOk(applyPass(s, opener === 0 ? 1 : 0));
    }
    expect(s.round).toBe(10);
    expect(checkGameOver(s)).toBe(true);
    s = expectOk(nextRound(s));
    expect(s.phase).toBe('finished');
    expect(s.pool).toHaveLength(0);

    const summary = summarize(s, PLAYERS);
    expect(summary.seats[0].roster).toHaveLength(5);
    expect(summary.seats[1].roster).toHaveLength(5);
    expect(summary.seats[0].budgetLeft).toBe(15);
    // Seat 0 πήρε τους p1,p3,p5,p7,p9 (ratings 80,82,84,86,88) = 420
    expect(summary.seats[0].totalRating).toBe(420);
    // Seat 1 πήρε τους p2,p4,p6,p8,p10 (ratings 81,83,85,87,89) = 425
    expect(summary.seats[1].totalRating).toBe(425);
    expect(summary.winnerSeat).toBe(1);
  });

  it('δεν θεωρεί το παιχνίδι τελειωμένο στη μέση', () => {
    let s = startedGame();
    expect(checkGameOver(s)).toBe(false);
    s = bid(s, 0, 1);
    s = expectOk(applyPass(s, 1));
    expect(checkGameOver(s)).toBe(false);
  });

  it('δεν επιτρέπει ενέργειες μετά τη λήξη', () => {
    let s = freshGame();
    s = { ...s, phase: 'finished' };
    const res = nextRound(s);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('GAME_OVER');
    expect(applyBid(s, 0, 1).ok).toBe(false);
    expect(applyPass(s, 0).ok).toBe(false);
  });

  it('ισοπαλία στο rating δίνει winnerSeat null', () => {
    const s = freshGame();
    const tied: GameState = {
      ...s,
      seats: [
        { ...s.seats[0], roster: ['p1'] },
        { ...s.seats[1], roster: ['p1'] },
      ],
    };
    expect(summarize(tied, PLAYERS).winnerSeat).toBeNull();
  });
});
