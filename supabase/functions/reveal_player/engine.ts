// ΠΑΡΑΓΟΜΕΝΟ ΑΡΧΕΙΟ — μην το επεξεργάζεσαι. Τρέξε: npm run sync:shared

import type {
  EngineErrorCode,
  EngineResult,
  GameMode,
  GameState,
  Player,
  SeatIndex,
  SeatState,
} from './types.ts';

export const DEFAULT_BUDGET = 20;
export const DEFAULT_INCREMENT = 1;
export const DEFAULT_TOTAL_ROUNDS = 10;

const other = (seat: SeatIndex): SeatIndex => (seat === 0 ? 1 : 0);

const fail = (code: EngineErrorCode, message: string): EngineResult => ({
  ok: false,
  code,
  message,
});

export interface CreateStateInput {
  mode: GameMode;
  startingBudget?: number;
  increment?: number;
  totalRounds?: number;
  /** Ids της δεξαμενής, ήδη ανακατεμένα από τον server. */
  pool: string[];
  nicknames: [string, string];
}

export function createInitialState(input: CreateStateInput): GameState {
  const startingBudget = input.startingBudget ?? DEFAULT_BUDGET;
  const increment = input.increment ?? DEFAULT_INCREMENT;
  const totalRounds = input.totalRounds ?? DEFAULT_TOTAL_ROUNDS;

  const seats: [SeatState, SeatState] = [
    { seatIndex: 0, nickname: input.nicknames[0], budget: startingBudget, roster: [] },
    { seatIndex: 1, nickname: input.nicknames[1], budget: startingBudget, roster: [] },
  ];

  return {
    mode: input.mode,
    startingBudget,
    increment,
    totalRounds,
    phase: 'lobby',
    round: 0,
    pool: [...input.pool],
    seats,
    currentPlayerId: null,
    openerSeat: 0,
    turnSeat: 0,
    highestBid: 0,
    highestBidderSeat: null,
    lastResult: null,
  };
}

/** Πόσους παίκτες αποκτά συνολικά κάθε ομάδα: οι μισοί γύροι στον καθένα. */
export function rosterTarget(state: GameState): number {
  return state.totalRounds / 2;
}

/** Πόσες θέσεις λείπουν ακόμα από την πεντάδα ενός seat. */
export function slotsLeft(state: GameState, seat: SeatIndex): number {
  return rosterTarget(state) - state.seats[seat].roster.length;
}

/** Το ελάχιστο ποσό που επιτρέπεται να δηλώσει αυτός που έχει σειρά. */
export function minimumBid(state: GameState): number {
  return state.highestBid === 0 ? 1 : state.highestBid + state.increment;
}

/**
 * Το μέγιστο ποσό που επιτρέπεται να δηλώσει ένα seat: πρέπει να του μείνει
 * τουλάχιστον 1 για κάθε θέση που θα του λείπει μετά από αυτή την αγορά,
 * ώστε να μπορεί πάντα να συμπληρώσει την πεντάδα του.
 */
export function maxBid(state: GameState, seat: SeatIndex): number {
  const slots = slotsLeft(state, seat);
  if (slots <= 0) return 0;
  return state.seats[seat].budget - slots + 1;
}

/** Μπορεί αυτός που έχει σειρά να πλειοδοτήσει, ή του επιτρέπεται μόνο να αποχωρήσει; */
export function canBid(state: GameState): boolean {
  if (state.phase !== 'auction') return false;
  return maxBid(state, state.turnSeat) >= minimumBid(state);
}

/** Ο ανοίγων δεν επιτρέπεται να αποχωρήσει: κάθε γύρος πρέπει να καταλήξει σε αγορά. */
export function mustBid(state: GameState, seat: SeatIndex): boolean {
  return state.phase === 'auction' && state.turnSeat === seat && state.highestBidderSeat === null;
}

function award(
  state: GameState,
  winnerSeat: SeatIndex,
  playerId: string,
  price: number,
  auto = false
): GameState {
  const seats = state.seats.map((s) =>
    s.seatIndex === winnerSeat
      ? { ...s, budget: s.budget - price, roster: [...s.roster, playerId] }
      : s
  ) as [SeatState, SeatState];

  return {
    ...state,
    phase: 'round_result',
    seats,
    lastResult: { round: state.round, playerId, winnerSeat, price, ...(auto ? { auto } : {}) },
  };
}

/**
 * Ξεκινά τον επόμενο γύρο: αποκαλύπτει τον επόμενο παίκτη της δεξαμενής,
 * εναλλάσσει ποιος ανοίγει τη δημοπρασία και μηδενίζει την κατάσταση προσφορών.
 */
export function nextRound(state: GameState): EngineResult {
  if (state.phase === 'auction') {
    return fail('WRONG_PHASE', 'Ο τρέχων γύρος δεν έχει ολοκληρωθεί.');
  }
  if (state.phase === 'finished') {
    return fail('GAME_OVER', 'Το παιχνίδι έχει τελειώσει.');
  }
  if (state.round >= state.totalRounds || state.pool.length === 0) {
    return { ok: true, state: { ...state, phase: 'finished', currentPlayerId: null } };
  }

  const [nextPlayerId, ...restPool] = state.pool;
  const round = state.round + 1;
  const openerSeat = (((round - 1) % 2) as SeatIndex);

  const revealed: GameState = {
    ...state,
    phase: 'auction',
    round,
    pool: restPool,
    currentPlayerId: nextPlayerId,
    openerSeat,
    turnSeat: openerSeat,
    highestBid: 0,
    highestBidderSeat: null,
  };

  // Αν η μία πεντάδα έχει κλείσει, δεν έχει νόημα δημοπρασία: ο παίκτης πάει
  // κατευθείαν στον άλλον στην ελάχιστη τιμή.
  const fullSeat = revealed.seats.find((s) => s.roster.length >= rosterTarget(revealed));
  if (fullSeat) {
    const winnerSeat = other(fullSeat.seatIndex);
    const price = Math.min(1, revealed.seats[winnerSeat].budget);
    return { ok: true, state: award(revealed, winnerSeat, nextPlayerId, price, true) };
  }

  return { ok: true, state: revealed };
}

/** Καταχωρεί προσφορά. Ο έλεγχος σειράς/budget/ελάχιστου ποσού γίνεται εδώ. */
export function applyBid(state: GameState, seat: SeatIndex, amount: number): EngineResult {
  if (state.phase !== 'auction') {
    return fail('WRONG_PHASE', 'Δεν βρίσκεται σε εξέλιξη δημοπρασία.');
  }
  if (seat !== state.turnSeat) {
    return fail('NOT_YOUR_TURN', 'Δεν είναι η σειρά σου.');
  }
  if (!Number.isInteger(amount)) {
    return fail('BID_TOO_LOW', 'Η προσφορά πρέπει να είναι ακέραιος.');
  }
  const min = minimumBid(state);
  if (amount < min) {
    return fail('BID_TOO_LOW', `Η προσφορά πρέπει να είναι τουλάχιστον ${min}.`);
  }
  if (amount > state.seats[seat].budget) {
    return fail('BID_OVER_BUDGET', 'Δεν έχεις αρκετό budget για αυτή την προσφορά.');
  }
  const max = maxBid(state, seat);
  if (amount > max) {
    const reserve = slotsLeft(state, seat) - 1;
    return fail(
      'BID_OVER_RESERVE',
      `Πρέπει να κρατήσεις ${reserve} για τις υπόλοιπες θέσεις σου. Μέγιστη προσφορά: ${max}.`
    );
  }

  return {
    ok: true,
    state: {
      ...state,
      highestBid: amount,
      highestBidderSeat: seat,
      turnSeat: other(seat),
    },
  };
}

/**
 * Αποχώρηση από τη δημοπρασία: ο τελευταίος που πλειοδότησε παίρνει τον παίκτη.
 * Ο ανοίγων δεν μπορεί να αποχωρήσει πριν δηλώσει προσφορά.
 */
export function applyPass(state: GameState, seat: SeatIndex): EngineResult {
  if (state.phase !== 'auction') {
    return fail('WRONG_PHASE', 'Δεν βρίσκεται σε εξέλιξη δημοπρασία.');
  }
  if (seat !== state.turnSeat) {
    return fail('NOT_YOUR_TURN', 'Δεν είναι η σειρά σου.');
  }
  if (state.highestBidderSeat === null) {
    return fail('OPENER_MUST_BID', 'Ανοίγεις τον γύρο, οπότε πρέπει να κάνεις προσφορά.');
  }

  return {
    ok: true,
    state: award(state, state.highestBidderSeat, state.currentPlayerId as string, state.highestBid),
  };
}

/** Το παιχνίδι τελείωσε όταν έχουν παιχτεί όλοι οι γύροι ή αδειάσει η δεξαμενή. */
export function checkGameOver(state: GameState): boolean {
  if (state.phase === 'finished') return true;
  if (state.phase !== 'round_result') return false;
  return state.round >= state.totalRounds || state.pool.length === 0;
}

export interface SeatSummary {
  seatIndex: SeatIndex;
  nickname: string;
  roster: Player[];
  totalRating: number;
  budgetLeft: number;
}

export interface GameSummary {
  seats: [SeatSummary, SeatSummary];
  winnerSeat: SeatIndex | null;
}

/** Τελικά αποτελέσματα: συνολικό rating ανά ρόστερ (χωρίς περιορισμό θέσης). */
export function summarize(state: GameState, players: Player[]): GameSummary {
  const byId = new Map(players.map((p) => [p.id, p]));

  const seats = state.seats.map((s) => {
    const roster = s.roster
      .map((id) => byId.get(id))
      .filter((p): p is Player => p !== undefined);
    return {
      seatIndex: s.seatIndex,
      nickname: s.nickname,
      roster,
      totalRating: roster.reduce((sum, p) => sum + p.overallRating, 0),
      budgetLeft: s.budget,
    };
  }) as [SeatSummary, SeatSummary];

  let winnerSeat: SeatIndex | null = null;
  if (seats[0].totalRating > seats[1].totalRating) winnerSeat = 0;
  else if (seats[1].totalRating > seats[0].totalRating) winnerSeat = 1;

  return { seats, winnerSeat };
}
