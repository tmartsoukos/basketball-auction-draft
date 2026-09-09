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
    noBidPasses: 0,
    lastResult: null,
  };
}

/** Το ελάχιστο ποσό που επιτρέπεται να δηλώσει αυτός που έχει σειρά. */
export function minimumBid(state: GameState): number {
  return state.highestBid === 0 ? 1 : state.highestBid + state.increment;
}

/** Μπορεί αυτός που έχει σειρά να πλειοδοτήσει, ή είναι αναγκασμένος να περάσει; */
export function canBid(state: GameState): boolean {
  if (state.phase !== 'auction') return false;
  return state.seats[state.turnSeat].budget >= minimumBid(state);
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

  return {
    ok: true,
    state: {
      ...state,
      phase: 'auction',
      round,
      pool: restPool,
      currentPlayerId: nextPlayerId,
      openerSeat,
      turnSeat: openerSeat,
      highestBid: 0,
      highestBidderSeat: null,
      noBidPasses: 0,
    },
  };
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

  return {
    ok: true,
    state: {
      ...state,
      highestBid: amount,
      highestBidderSeat: seat,
      noBidPasses: 0,
      turnSeat: other(seat),
    },
  };
}

/**
 * Αποχώρηση από τη δημοπρασία.
 * - Αν υπάρχει ήδη προσφορά, ο πλειοδότης παίρνει τον παίκτη στο ποσό της.
 * - Αν δεν υπάρχει προσφορά, περνάει η σειρά· αν περάσουν και οι δύο, ο παίκτης μένει αδιάθετος.
 */
export function applyPass(state: GameState, seat: SeatIndex): EngineResult {
  if (state.phase !== 'auction') {
    return fail('WRONG_PHASE', 'Δεν βρίσκεται σε εξέλιξη δημοπρασία.');
  }
  if (seat !== state.turnSeat) {
    return fail('NOT_YOUR_TURN', 'Δεν είναι η σειρά σου.');
  }

  const playerId = state.currentPlayerId as string;

  if (state.highestBidderSeat === null) {
    const noBidPasses = state.noBidPasses + 1;
    if (noBidPasses < 2) {
      return { ok: true, state: { ...state, noBidPasses, turnSeat: other(seat) } };
    }
    return {
      ok: true,
      state: {
        ...state,
        phase: 'round_result',
        noBidPasses,
        lastResult: { round: state.round, playerId, winnerSeat: null, price: 0 },
      },
    };
  }

  const winnerSeat = state.highestBidderSeat;
  const price = state.highestBid;
  const seats = state.seats.map((s) =>
    s.seatIndex === winnerSeat
      ? { ...s, budget: s.budget - price, roster: [...s.roster, playerId] }
      : s
  ) as [SeatState, SeatState];

  return {
    ok: true,
    state: {
      ...state,
      phase: 'round_result',
      seats,
      lastResult: { round: state.round, playerId, winnerSeat, price },
    },
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
