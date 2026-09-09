import { errorResponse, json, preflight, readBody } from './http.ts';
import { generateRoomCode, serviceClient, shuffle } from './db.ts';
import { poolFor } from './players.ts';
import { DEFAULT_INCREMENT, DEFAULT_BUDGET, DEFAULT_TOTAL_ROUNDS } from './engine.ts';
import type { GameMode } from './types.ts';

interface Body {
  mode?: GameMode;
  nickname?: string;
  startingBudget?: number;
  increment?: number;
}

const MODES: GameMode[] = ['euroleague', 'nba', 'mixed'];

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  const body = await readBody<Body>(req);
  const mode = body.mode ?? 'mixed';
  const nickname = (body.nickname ?? '').trim().slice(0, 20);
  const startingBudget = Math.trunc(body.startingBudget ?? DEFAULT_BUDGET);
  const increment = Math.trunc(body.increment ?? DEFAULT_INCREMENT);

  if (!MODES.includes(mode)) return errorResponse('BAD_MODE', 'Άγνωστη κατηγορία πρωταθλήματος.');
  if (!nickname) return errorResponse('BAD_NICKNAME', 'Χρειάζεται nickname.');
  if (startingBudget < 10 || startingBudget > 50) {
    return errorResponse('BAD_BUDGET', 'Το budget πρέπει να είναι 10-50.');
  }
  if (increment < 1 || increment > 10) {
    return errorResponse('BAD_INCREMENT', 'Το βήμα προσφοράς πρέπει να είναι 1-10.');
  }

  const client = serviceClient();
  const pool = shuffle(poolFor(mode).map((p) => p.id));

  let game: { id: string; room_code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !game; attempt++) {
    const { data, error } = await client
      .from('games')
      .insert({
        room_code: generateRoomCode(),
        mode,
        starting_budget: startingBudget,
        increment,
        total_rounds: DEFAULT_TOTAL_ROUNDS,
        pool,
      })
      .select('id, room_code')
      .single();
    if (!error) game = data as { id: string; room_code: string };
    else if (error.code !== '23505') {
      return errorResponse('DB_ERROR', error.message, 500);
    }
  }
  if (!game) return errorResponse('ROOM_CODE_FAILED', 'Δεν βρέθηκε ελεύθερος κωδικός δωματίου.', 500);

  const sessionToken = crypto.randomUUID();

  await client.from('game_players').insert({
    game_id: game.id,
    seat_index: 0,
    nickname,
    budget: startingBudget,
  });
  await client.from('game_sessions').insert({
    game_id: game.id,
    seat_index: 0,
    token: sessionToken,
  });
  await client.from('game_pool').insert(
    pool.map((playerId, index) => ({ game_id: game!.id, player_id: playerId, draw_order: index }))
  );

  return json({ gameId: game.id, roomCode: game.room_code, seatIndex: 0, sessionToken });
});
