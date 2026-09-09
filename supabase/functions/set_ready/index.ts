import { errorResponse, json, preflight, readBody } from './http.ts';
import {
  ConflictError,
  authenticateSeat,
  expectationOf,
  loadGame,
  persistState,
  serviceClient,
} from './db.ts';
import { nextRound } from './engine.ts';

interface Body {
  gameId?: string;
  sessionToken?: string;
  ready?: boolean;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  const body = await readBody<Body>(req);
  if (!body.gameId) return errorResponse('BAD_REQUEST', 'Λείπει το gameId.');

  const client = serviceClient();
  const seat = await authenticateSeat(client, body.gameId, body.sessionToken);
  if (seat === null) return errorResponse('UNAUTHORIZED', 'Άκυρο session για αυτό το παιχνίδι.', 401);

  const loaded = await loadGame(client, body.gameId);
  if (!loaded) return errorResponse('GAME_NOT_FOUND', 'Το παιχνίδι δεν βρέθηκε.', 404);
  if (loaded.game.phase !== 'lobby') {
    return errorResponse('WRONG_PHASE', 'Το παιχνίδι έχει ήδη ξεκινήσει.');
  }

  const ready = body.ready !== false;
  await client
    .from('game_players')
    .update({ is_ready: ready })
    .eq('game_id', body.gameId)
    .eq('seat_index', seat);

  const { data: players } = await client
    .from('game_players')
    .select('seat_index, is_ready')
    .eq('game_id', body.gameId);

  const rows = players ?? [];
  const bothReady = rows.length === 2 && rows.every((p) => p.is_ready === true);

  if (!bothReady) return json({ started: false, ready });

  const started = nextRound(loaded.state);
  if (!started.ok) return errorResponse(started.code, started.message);

  try {
    await persistState(client, body.gameId, started.state, expectationOf(loaded.state));
  } catch (err) {
    if (err instanceof ConflictError) return json({ started: true, ready });
    throw err;
  }

  return json({ started: true, ready });
});
