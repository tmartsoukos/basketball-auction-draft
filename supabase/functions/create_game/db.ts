// ΠΑΡΑΓΟΜΕΝΟ ΑΡΧΕΙΟ — μην το επεξεργάζεσαι. Τρέξε: npm run sync:shared

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type { GameState, SeatIndex, SeatState } from './types.ts';

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
}

export interface GameRow {
  id: string;
  room_code: string;
  mode: GameState['mode'];
  starting_budget: number;
  increment: number;
  total_rounds: number;
  phase: GameState['phase'];
  round: number;
  pool: string[];
  current_player_id: string | null;
  opener_seat: SeatIndex;
  turn_seat: SeatIndex;
  highest_bid: number;
  highest_bidder_seat: SeatIndex | null;
  last_result: GameState['lastResult'];
}

export interface PlayerRow {
  seat_index: SeatIndex;
  nickname: string;
  budget: number;
  roster: string[];
  is_ready: boolean;
}

export interface LoadedGame {
  game: GameRow;
  players: PlayerRow[];
  state: GameState;
}

export function toState(game: GameRow, players: PlayerRow[]): GameState {
  const seatFor = (index: SeatIndex): SeatState => {
    const row = players.find((p) => p.seat_index === index);
    return {
      seatIndex: index,
      nickname: row?.nickname ?? '',
      budget: row?.budget ?? game.starting_budget,
      roster: row?.roster ?? [],
    };
  };

  return {
    mode: game.mode,
    startingBudget: game.starting_budget,
    increment: game.increment,
    totalRounds: game.total_rounds,
    phase: game.phase,
    round: game.round,
    pool: game.pool,
    seats: [seatFor(0), seatFor(1)],
    currentPlayerId: game.current_player_id,
    openerSeat: game.opener_seat,
    turnSeat: game.turn_seat,
    highestBid: game.highest_bid,
    highestBidderSeat: game.highest_bidder_seat,
    lastResult: game.last_result,
  };
}

export async function loadGame(client: SupabaseClient, gameId: string): Promise<LoadedGame | null> {
  const { data: game } = await client.from('games').select('*').eq('id', gameId).maybeSingle();
  if (!game) return null;

  const { data: players } = await client
    .from('game_players')
    .select('seat_index, nickname, budget, roster, is_ready')
    .eq('game_id', gameId)
    .order('seat_index');

  const rows = (players ?? []) as PlayerRow[];
  return { game: game as GameRow, players: rows, state: toState(game as GameRow, rows) };
}

export async function loadGameByRoomCode(
  client: SupabaseClient,
  roomCode: string
): Promise<LoadedGame | null> {
  const { data } = await client
    .from('games')
    .select('id')
    .eq('room_code', roomCode.toUpperCase())
    .maybeSingle();
  if (!data) return null;
  return loadGame(client, data.id as string);
}

/** Επιστρέφει το seat που αντιστοιχεί στο session token, ή null αν δεν ταιριάζει. */
export async function authenticateSeat(
  client: SupabaseClient,
  gameId: string,
  token: string | undefined
): Promise<SeatIndex | null> {
  if (!token) return null;
  const { data } = await client
    .from('game_sessions')
    .select('seat_index')
    .eq('game_id', gameId)
    .eq('token', token)
    .maybeSingle();
  return data ? ((data.seat_index as SeatIndex) ?? null) : null;
}

export interface ExpectedState {
  phase: GameState['phase'];
  round: number;
  turnSeat: SeatIndex;
  highestBid: number;
}

/** Η κατάσταση που διαβάστηκε πριν την ενέργεια — για optimistic concurrency control. */
export function expectationOf(state: GameState): ExpectedState {
  return {
    phase: state.phase,
    round: state.round,
    turnSeat: state.turnSeat,
    highestBid: state.highestBid,
  };
}

export class ConflictError extends Error {
  constructor() {
    super('Η κατάσταση του παιχνιδιού άλλαξε στο μεταξύ. Δοκίμασε ξανά.');
    this.name = 'ConflictError';
  }
}

/**
 * Γράφει τη νέα κατάσταση σε games και game_players.
 * Το `expect` εξασφαλίζει ότι δεν γράφουμε πάνω σε ενέργεια που πρόλαβε ο αντίπαλος.
 */
export async function persistState(
  client: SupabaseClient,
  gameId: string,
  state: GameState,
  expect: ExpectedState
): Promise<void> {
  const { data: updated } = await client
    .from('games')
    .update({
      phase: state.phase,
      round: state.round,
      pool: state.pool,
      current_player_id: state.currentPlayerId,
      opener_seat: state.openerSeat,
      turn_seat: state.turnSeat,
      highest_bid: state.highestBid,
      highest_bidder_seat: state.highestBidderSeat,
      last_result: state.lastResult,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .eq('phase', expect.phase)
    .eq('round', expect.round)
    .eq('turn_seat', expect.turnSeat)
    .eq('highest_bid', expect.highestBid)
    .select('id');

  if (!updated || updated.length === 0) throw new ConflictError();

  for (const seat of state.seats) {
    await client
      .from('game_players')
      .update({ budget: seat.budget, roster: seat.roster })
      .eq('game_id', gameId)
      .eq('seat_index', seat.seatIndex);
  }
}

export async function recordRoundOutcome(
  client: SupabaseClient,
  gameId: string,
  result: NonNullable<GameState['lastResult']>
): Promise<void> {
  await client
    .from('game_pool')
    .update({
      status: 'sold',
      won_by_seat: result.winnerSeat,
      price: result.price,
    })
    .eq('game_id', gameId)
    .eq('player_id', result.playerId);
}

/** Κωδικός δωματίου χωρίς χαρακτήρες που μπερδεύονται (0/O, 1/I). */
export function generateRoomCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Fisher-Yates με κρυπτογραφικά τυχαίους αριθμούς (server-side). */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function recordBidEvent(
  client: SupabaseClient,
  gameId: string,
  round: number,
  seatIndex: SeatIndex,
  action: 'bid' | 'pass',
  amount: number | null
): Promise<void> {
  await client
    .from('bid_events')
    .insert({ game_id: gameId, round, seat_index: seatIndex, action, amount });
}
