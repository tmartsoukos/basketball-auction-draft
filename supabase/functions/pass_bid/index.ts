import { errorResponse, json, preflight, readBody } from './http.ts';
import {
  ConflictError,
  authenticateSeat,
  expectationOf,
  loadGame,
  persistState,
  recordBidEvent,
  recordRoundOutcome,
  serviceClient,
} from './db.ts';
import { applyPass, checkGameOver } from './engine.ts';

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

  const result = applyPass(loaded.state, seat);
  if (!result.ok) return errorResponse(result.code, result.message);

  try {
    await persistState(client, body.gameId, result.state, expectationOf(loaded.state));
  } catch (err) {
    if (err instanceof ConflictError) {
      return errorResponse('CONFLICT', 'Η κατάσταση άλλαξε στο μεταξύ. Δοκίμασε ξανά.', 409);
    }
    throw err;
  }

  await recordBidEvent(client, body.gameId, result.state.round, seat, 'pass', null);

  if (result.state.phase === 'round_result' && result.state.lastResult) {
    await recordRoundOutcome(client, body.gameId, result.state.lastResult);
  }

  return json({
    phase: result.state.phase,
    lastResult: result.state.lastResult,
    gameOver: checkGameOver(result.state),
  });
});
