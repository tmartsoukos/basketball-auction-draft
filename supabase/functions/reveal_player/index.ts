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

  // Και οι δύο clients ζητούν τον επόμενο γύρο· ο δεύτερος απλώς βλέπει το ίδιο state.
  if (loaded.state.phase === 'auction') {
    return json({ round: loaded.state.round, playerId: loaded.state.currentPlayerId });
  }
  if (loaded.state.phase === 'lobby') {
    return errorResponse('WRONG_PHASE', 'Το παιχνίδι δεν έχει ξεκινήσει ακόμα.');
  }
  if (loaded.state.phase === 'finished') {
    return json({ round: loaded.state.round, playerId: null, finished: true });
  }

  const result = nextRound(loaded.state);
  if (!result.ok) return errorResponse(result.code, result.message);

  try {
    await persistState(client, body.gameId, result.state, expectationOf(loaded.state));
  } catch (err) {
    if (err instanceof ConflictError) {
      const fresh = await loadGame(client, body.gameId);
      return json({ round: fresh?.state.round ?? null, playerId: fresh?.state.currentPlayerId ?? null });
    }
    throw err;
  }

  return json({
    round: result.state.round,
    playerId: result.state.currentPlayerId,
    finished: result.state.phase === 'finished',
  });
});
