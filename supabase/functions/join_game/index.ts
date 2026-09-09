import { errorResponse, json, preflight, readBody } from './http.ts';
import { loadGameByRoomCode, serviceClient } from './db.ts';

interface Body {
  roomCode?: string;
  nickname?: string;
  sessionToken?: string;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;

  const body = await readBody<Body>(req);
  const roomCode = (body.roomCode ?? '').trim().toUpperCase();
  const nickname = (body.nickname ?? '').trim().slice(0, 20);

  if (!roomCode) return errorResponse('BAD_ROOM_CODE', 'Χρειάζεται κωδικός δωματίου.');

  const client = serviceClient();
  const loaded = await loadGameByRoomCode(client, roomCode);
  if (!loaded) return errorResponse('ROOM_NOT_FOUND', 'Δεν βρέθηκε δωμάτιο με αυτόν τον κωδικό.', 404);

  const gameId = loaded.game.id;

  // Επανασύνδεση: ίδιο token, ίδια θέση, ό,τι κι αν έχει προχωρήσει το παιχνίδι.
  if (body.sessionToken) {
    const { data: session } = await client
      .from('game_sessions')
      .select('seat_index')
      .eq('game_id', gameId)
      .eq('token', body.sessionToken)
      .maybeSingle();
    if (session) {
      return json({
        gameId,
        roomCode: loaded.game.room_code,
        seatIndex: session.seat_index,
        sessionToken: body.sessionToken,
        reconnected: true,
      });
    }
  }

  if (!nickname) return errorResponse('BAD_NICKNAME', 'Χρειάζεται nickname.');

  const takenSeats = loaded.players.map((p) => p.seat_index);
  if (takenSeats.includes(1)) return errorResponse('ROOM_FULL', 'Το δωμάτιο είναι γεμάτο.', 409);

  const sessionToken = crypto.randomUUID();
  const { error } = await client.from('game_players').insert({
    game_id: gameId,
    seat_index: 1,
    nickname,
    budget: loaded.game.starting_budget,
  });
  if (error) return errorResponse('ROOM_FULL', 'Το δωμάτιο είναι γεμάτο.', 409);

  await client.from('game_sessions').insert({ game_id: gameId, seat_index: 1, token: sessionToken });

  return json({
    gameId,
    roomCode: loaded.game.room_code,
    seatIndex: 1,
    sessionToken,
    reconnected: false,
  });
});
