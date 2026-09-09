export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type League = 'euroleague' | 'nba';
export type GameMode = 'euroleague' | 'nba' | 'mixed';
export type SeatIndex = 0 | 1;

export interface Player {
  id: string;
  name: string;
  league: League;
  team: string;
  position: Position;
  overallRating: number;
  photoUrl: string | null;
}

export interface SeatState {
  seatIndex: SeatIndex;
  nickname: string;
  budget: number;
  roster: string[];
}

export type Phase = 'lobby' | 'auction' | 'round_result' | 'finished';

export interface RoundResult {
  round: number;
  playerId: string;
  winnerSeat: SeatIndex;
  price: number;
  /** Ανατέθηκε χωρίς δημοπρασία, επειδή η πεντάδα του αντιπάλου ήταν ήδη πλήρης. */
  auto?: boolean;
}

export interface GameState {
  mode: GameMode;
  startingBudget: number;
  increment: number;
  totalRounds: number;
  phase: Phase;
  round: number;
  /** Ids παικτών που δεν έχουν βγει ακόμα σε δημοπρασία, σε προκαθορισμένη τυχαία σειρά. */
  pool: string[];
  seats: [SeatState, SeatState];
  currentPlayerId: string | null;
  /** Ποιο seat ανοίγει τη δημοπρασία του τρέχοντος γύρου. */
  openerSeat: SeatIndex;
  /** Ποιο seat έχει σειρά να ενεργήσει. */
  turnSeat: SeatIndex;
  highestBid: number;
  highestBidderSeat: SeatIndex | null;
  lastResult: RoundResult | null;
}

export type EngineErrorCode =
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'BID_TOO_LOW'
  | 'BID_OVER_BUDGET'
  | 'BID_OVER_RESERVE'
  | 'OPENER_MUST_BID'
  | 'GAME_OVER';

export type EngineResult =
  | { ok: true; state: GameState }
  | { ok: false; code: EngineErrorCode; message: string };
