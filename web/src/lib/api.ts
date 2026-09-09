import { supabase } from './supabaseClient';
import type { GameMode } from '@bad/engine';

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    // Οι Edge Functions επιστρέφουν το σφάλμα στο σώμα της απάντησης.
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json();
        if (payload?.error) throw new ApiError(payload.error.code, payload.error.message);
      } catch (parsed) {
        if (parsed instanceof ApiError) throw parsed;
      }
    }
    throw new ApiError('NETWORK', error.message);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: { code: string; message: string } }).error;
    throw new ApiError(err.code, err.message);
  }

  return data as T;
}

export interface SessionResponse {
  gameId: string;
  roomCode: string;
  seatIndex: 0 | 1;
  sessionToken: string;
  reconnected?: boolean;
}

export const createGame = (input: {
  mode: GameMode;
  nickname: string;
  startingBudget: number;
  increment: number;
}) => callFunction<SessionResponse>('create_game', input);

export const joinGame = (input: { roomCode: string; nickname?: string; sessionToken?: string }) =>
  callFunction<SessionResponse>('join_game', input);

export const setReady = (input: { gameId: string; sessionToken: string; ready: boolean }) =>
  callFunction<{ started: boolean; ready: boolean }>('set_ready', input);

export const revealPlayer = (input: { gameId: string; sessionToken: string }) =>
  callFunction<{ round: number | null; playerId: string | null; finished?: boolean }>(
    'reveal_player',
    input
  );

export const placeBid = (input: { gameId: string; sessionToken: string; amount?: number }) =>
  callFunction<{ highestBid: number; turnSeat: 0 | 1 }>('place_bid', input);

export const passBid = (input: { gameId: string; sessionToken: string }) =>
  callFunction<{ phase: string; gameOver: boolean }>('pass_bid', input);
