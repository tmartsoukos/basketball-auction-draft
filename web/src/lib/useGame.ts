import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, SeatIndex, SeatState } from '@bad/engine';
import { supabase } from './supabaseClient';

interface GameRow {
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

export interface SeatRow {
  seat_index: SeatIndex;
  nickname: string;
  budget: number;
  roster: string[];
  is_ready: boolean;
}

export interface GameView {
  state: GameState;
  roomCode: string;
  seatRows: SeatRow[];
}

function toState(game: GameRow, rows: SeatRow[]): GameState {
  const seatFor = (index: SeatIndex): SeatState => {
    const row = rows.find((r) => r.seat_index === index);
    return {
      seatIndex: index,
      nickname: row?.nickname ?? 'Σε αναμονή…',
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

/**
 * Διαβάζει την κατάσταση του δωματίου από τη βάση και την κρατάει ενημερωμένη
 * μέσω Realtime. Ο client δεν υπολογίζει ποτέ μόνος του state — μόνο το εμφανίζει.
 */
export function useGame(gameId: string | null, seatIndex: SeatIndex | null) {
  const [view, setView] = useState<GameView | null>(null);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const refreshRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    if (!gameId) return;
    const [{ data: game }, { data: rows }] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase
        .from('game_players')
        .select('seat_index, nickname, budget, roster, is_ready')
        .eq('game_id', gameId)
        .order('seat_index'),
    ]);
    if (!game) return;
    const seatRows = (rows ?? []) as SeatRow[];
    setView({
      state: toState(game as GameRow, seatRows),
      roomCode: (game as GameRow).room_code,
      seatRows,
    });
  }, [gameId]);

  refreshRef.current = refresh;

  useEffect(() => {
    if (!gameId) {
      setView(null);
      return;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));

    const channel = supabase
      .channel(`game:${gameId}`, { config: { presence: { key: String(seatIndex ?? 'guest') } } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => refreshRef.current()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        () => refreshRef.current()
      )
      .on('presence', { event: 'sync' }, () => {
        const others = Object.keys(channel.presenceState()).filter(
          (key) => key !== String(seatIndex)
        );
        setOpponentOnline(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && seatIndex !== null) {
          await channel.track({ seatIndex, at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, seatIndex, refresh]);

  return { view, opponentOnline, loading, refresh };
}
