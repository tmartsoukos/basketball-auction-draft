import { describe, expect, it } from 'vitest';
import {
  applyBid,
  applyPass,
  canBid,
  checkGameOver,
  createInitialState,
  maxBid,
  minimumBid,
  nextRound,
  slotsLeft,
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

function expectOk(res: ReturnType<typeof applyBid>): GameState {
  if (!res.ok) throw new Error(`Αναμενόταν επιτυχία, ήρθε ${res.code}: ${res.message}`);
  return res.state;
}

function startedGame(overrides: Partial<Parameters<typeof createInitialState>[0]> = {}) {
  return expectOk(nextRound(freshGame(overrides)));
}

function bid(state: GameState, seat: SeatIndex, amount: number): GameState {
  return expectOk(applyBid(state, seat, amount));
}

const opponent = (seat: SeatIndex): SeatIndex => (seat === 0 ? 1 : 0);

/** Ο ανοίγων δηλώνει `amount` και ο αντίπαλος αποχωρεί. */
function uncontestedRound(state: GameState, amount = 1): GameState {
  const opener = state.turnSeat;
  const afterBid = bid(state, opener, amount);
  return expectOk(applyPass(afterBid, opponent(opener)));
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
    let s = uncontestedRound(startedGame());
    s = expectOk(nextRound(s));
    expect(s.round).toBe(2);
    expect(s.openerSeat).toBe(1);
    expect(s.turnSeat).toBe(1);
    expect(s.currentPlayerId).toBe('p2');
  });

  it('δεν επιτρέπει νέο γύρο ενώ τρέχει δημοπρασία', () => {
    const res = nextRound(startedGame());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('WRONG_PHASE');
  });
});

describe('προσφορές', () => {
  it('απορρίπτει προσφορά εκτός σειράς', () => {
    const res = applyBid(startedGame(), 1, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });

  it('απαιτεί τουλάχιστον 1 στην πρώτη προσφορά', () => {
    const res = applyBid(startedGame(), 0, 0);
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
    expect(bid(s, 1, 7).highestBid).toBe(7);
  });

  it('απορρίπτει προσφορά πάνω από το budget', () => {
    const res = applyBid(startedGame({ startingBudget: 10 }), 0, 11);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BID_OVER_BUDGET');
  });

  it('μετά από προσφορά περνάει η σειρά στον αντίπαλο', () => {
    const s = bid(startedGame(), 0, 3);
    expect(s.turnSeat).toBe(1);
    expect(s.highestBidderSeat).toBe(0);
  });
});

describe('αποθεματικό για τις κενές θέσεις', () => {
  it('κρατάει 1 για κάθε θέση που θα λείπει μετά την αγορά', () => {
    const s = startedGame();
    // Budget 20, λείπουν 5 παίκτες: μετά την αγορά πρέπει να μείνουν 4.
    expect(slotsLeft(s, 0)).toBe(5);
    expect(maxBid(s, 0)).toBe(16);

    const tooHigh = applyBid(s, 0, 17);
    expect(tooHigh.ok).toBe(false);
    if (!tooHigh.ok) expect(tooHigh.code).toBe('BID_OVER_RESERVE');

    const ok = bid(s, 0, 16);
    expect(ok.highestBid).toBe(16);
  });

  it('χαλαρώνει καθώς γεμίζει το ρόστερ', () => {
    let s = uncontestedRound(startedGame(), 16);
    expect(s.seats[0].budget).toBe(4);
    s = expectOk(nextRound(s));
    // Του λείπουν 4 παίκτες με 4 budget: μπορεί να δώσει μόνο 1 τη φορά.
    expect(maxBid(s, 0)).toBe(1);

    s = uncontestedRound(s, 1); // γύρος 2, ανοίγει το seat 1
    s = expectOk(nextRound(s));
    expect(s.seats[0].roster).toHaveLength(1);
    expect(maxBid(s, 0)).toBe(1);
  });

  it('θεωρεί ότι δεν μπορεί να πλειοδοτήσει όποιος δεν φτάνει το ελάχιστο', () => {
    const s = bid(startedGame({ startingBudget: 10 }), 0, 6);
    // Το seat 1 έχει επίσης όριο 6, αλλά χρειάζεται τουλάχιστον 7 για να πλειοδοτήσει.
    expect(maxBid(s, 1)).toBe(6);
    expect(minimumBid(s)).toBe(7);
    expect(canBid(s)).toBe(false);
  });
});

describe('υποχρεωτική προσφορά από τον ανοίγοντα', () => {
  it('δεν επιτρέπει στον ανοίγοντα να αποχωρήσει', () => {
    const res = applyPass(startedGame(), 0);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('OPENER_MUST_BID');
  });

  it('επιτρέπει αποχώρηση μόνο αφού υπάρχει προσφορά', () => {
    const s = uncontestedRound(startedGame(), 4);
    expect(s.phase).toBe('round_result');
    expect(s.lastResult).toEqual({ round: 1, playerId: 'p1', winnerSeat: 0, price: 4 });
    expect(s.seats[0].budget).toBe(16);
    expect(s.seats[0].roster).toEqual(['p1']);
    expect(s.seats[1].budget).toBe(20);
  });
});

describe('αυτόματη ανάθεση όταν κλείσει η μία πεντάδα', () => {
  it('δίνει τον παίκτη στον άλλον για 1, χωρίς δημοπρασία', () => {
    const base = freshGame();
    const withFullRoster: GameState = {
      ...base,
      phase: 'round_result',
      round: 6,
      pool: ['p7', 'p8', 'p9', 'p10'],
      seats: [
        { ...base.seats[0], roster: ['p1', 'p2', 'p3', 'p4', 'p5'], budget: 5 },
        { ...base.seats[1], roster: ['p6'], budget: 14 },
      ],
    };

    const s = expectOk(nextRound(withFullRoster));
    expect(s.phase).toBe('round_result');
    expect(s.lastResult).toEqual({
      round: 7,
      playerId: 'p7',
      winnerSeat: 1,
      price: 1,
      auto: true,
    });
    expect(s.seats[1].roster).toEqual(['p6', 'p7']);
    expect(s.seats[1].budget).toBe(13);
    expect(s.seats[0].roster).toHaveLength(5);
  });
});

describe('χωρίς περιορισμό θέσης', () => {
  it('επιτρέπει στον ίδιο παίκτη να πάρει πολλούς της ίδιας θέσης', () => {
    let s = uncontestedRound(startedGame());
    s = expectOk(nextRound(s));
    // Γύρος 2: ανοίγει το seat 1, το seat 0 πλειοδοτεί και το seat 1 αποχωρεί.
    s = bid(s, 1, 1);
    s = bid(s, 0, 2);
    s = expectOk(applyPass(s, 1));
    expect(s.seats[0].roster).toEqual(['p1', 'p2']);
  });
});

describe('τέλος παιχνιδιού', () => {
  it('μοιράζει και τους 10 παίκτες σε δύο πεντάδες', () => {
    let s = freshGame();
    for (let i = 0; i < 10; i++) {
      s = expectOk(nextRound(s));
      if (s.phase === 'auction') s = uncontestedRound(s);
    }
    expect(s.round).toBe(10);
    expect(checkGameOver(s)).toBe(true);

    s = expectOk(nextRound(s));
    expect(s.phase).toBe('finished');
    expect(s.pool).toHaveLength(0);
    expect(s.seats[0].roster).toHaveLength(5);
    expect(s.seats[1].roster).toHaveLength(5);

    const summary = summarize(s, PLAYERS);
    expect(summary.seats[0].budgetLeft).toBe(15);
    // Seat 0 πήρε τους p1,p3,p5,p7,p9 (ratings 80,82,84,86,88).
    expect(summary.seats[0].totalRating).toBe(420);
    expect(summary.seats[1].totalRating).toBe(425);
    expect(summary.winnerSeat).toBe(1);
  });

  it('καταλήγει 5-5 ακόμα κι όταν ο ένας αγοράζει επιθετικά', () => {
    let s = freshGame();
    for (let i = 0; i < 10; i++) {
      s = expectOk(nextRound(s));
      if (s.phase !== 'auction') continue;
      // Το seat 0 δίνει ό,τι μπορεί, το seat 1 πλειοδοτεί μόνο όταν του βγαίνει.
      const opener = s.turnSeat;
      s = bid(s, opener, opener === 0 ? maxBid(s, 0) : 1);
      const responder = opponent(opener);
      if (responder === 0 && canBid(s)) s = bid(s, 0, minimumBid(s));
      s = expectOk(applyPass(s, s.turnSeat));
    }
    s = expectOk(nextRound(s));

    expect(s.phase).toBe('finished');
    expect(s.seats[0].roster).toHaveLength(5);
    expect(s.seats[1].roster).toHaveLength(5);
    expect(s.seats[0].budget).toBeGreaterThanOrEqual(0);
    expect(s.seats[1].budget).toBeGreaterThanOrEqual(0);
    const sold = s.seats[0].roster.length + s.seats[1].roster.length;
    expect(sold).toBe(10);
  });

  it('δεν θεωρεί το παιχνίδι τελειωμένο στη μέση', () => {
    let s = startedGame();
    expect(checkGameOver(s)).toBe(false);
    s = uncontestedRound(s);
    expect(checkGameOver(s)).toBe(false);
  });

  it('δεν επιτρέπει ενέργειες μετά τη λήξη', () => {
    const s: GameState = { ...freshGame(), phase: 'finished' };
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
