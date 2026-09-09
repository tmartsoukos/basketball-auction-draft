# Basketball Auction Draft

**▶ Παίξε εδώ: https://tmartsoukos.github.io/basketball-auction-draft/**

Άνοιξε το link στο κινητό σου, φτιάξε δωμάτιο και στείλε τον κωδικό στον αντίπαλο.
Στο Chrome/Safari μπορείς να το προσθέσεις στην αρχική οθόνη και να παίζει σαν κανονική εφαρμογή.

Online PWA δημοπρασίας μπασκετμπολιστών για **δύο παίκτες**, ο καθένας στο δικό του κινητό.
Ο ένας φτιάχνει δωμάτιο, στέλνει link/κωδικό στον άλλον, και πλειοδοτούν εναλλάξ για 10 παίκτες.
Καμία εγκατάσταση από app store — αρκεί ένα link (προαιρετικά «Προσθήκη στην αρχική οθόνη»).

## Κανόνες

- Κάθε παίκτης ξεκινά με ίδιο budget (προεπιλογή 20, ρυθμιζόμενο 10-50).
- Η δεξαμενή έχει 10 μπασκετμπολίστες: **2 για κάθε θέση** (PG, SG, SF, PF, C).
  Μέσα σε κάθε ζευγάρι θέσης τα ratings είναι κοντά (διαφορά ≤ 15%), ώστε κάθε γύρος να έχει ουσιαστικό ανταγωνισμό.
- 10 γύροι. Σε κάθε γύρο αποκαλύπτεται ένας παίκτης με τυχαία σειρά (κληρώνεται server-side στην αρχή του παιχνιδιού).
- Τη δημοπρασία ανοίγει εναλλάξ ο ένας και ο άλλος (γύρος 1: παίκτης 1, γύρος 2: παίκτης 2, κ.ο.κ.).
- English auction: ο πρώτος δηλώνει ποσό ≥ 1, μετά εναλλάσσονται ανεβάζοντας τουλάχιστον κατά το βήμα προσφοράς,
  μέχρι κάποιος να πατήσει «Αποχωρώ». Ο τελευταίος που πλειοδότησε παίρνει τον παίκτη στο ποσό του.
- Αν περάσουν και οι δύο χωρίς καμία προσφορά, ο παίκτης μένει αδιάθετος.
- Καμία προσφορά πάνω από το διαθέσιμο budget. Όποιος δεν έχει αρκετά, μπορεί μόνο να αποχωρήσει.
- **Δεν υπάρχει περιορισμός θέσης στο ρόστερ.** Μπορείς να καταλήξεις με δύο σέντερ και κανέναν πλέι μέικερ — είναι στρατηγική επιλογή.
- Στο τέλος συγκρίνονται τα συνολικά ratings των δύο ρόστερ.

## Αρχιτεκτονική

```
data/                     Τα 3 datasets (euroleague / nba / mixed) + script επικύρωσης
packages/engine/          Καθαρή λογική παιχνιδιού (χωρίς δίκτυο) + unit tests
supabase/migrations/      Schema: games, game_players, game_sessions, game_pool, bid_events
supabase/shared-src/      Helpers των Edge Functions (http, πρόσβαση στη βάση)
supabase/functions/       create_game, join_game, set_ready, reveal_player, place_bid, pass_bid
scripts/                  Συγχρονισμός shared κώδικα στις functions, δημιουργία εικονιδίων PWA
web/                      Vite + React + TypeScript PWA (mobile-first)
```

**Server-authoritative:** όλη η λογική (έλεγχος σειράς, budget, ελάχιστο ποσό, εξέλιξη γύρων) τρέχει σε Edge Functions
με service role key. Οι clients έχουν μόνο δικαίωμα ανάγνωσης μέσω RLS, οπότε κανείς δεν μπορεί να αλλάξει
budget ή ρόστερ από τον browser. Τα session tokens ζουν σε ξεχωριστό πίνακα (`game_sessions`) χωρίς καμία πολιτική RLS,
άρα δεν διαβάζονται ποτέ από τον client.

**Διαχωρισμός engine / transport:** οι συναρτήσεις `applyBid`, `applyPass`, `nextRound`, `checkGameOver`, `summarize`
είναι καθαρές (καμία κλήση δικτύου ή βάσης) και ζουν στο `packages/engine`. Τις χρησιμοποιούν και οι Edge Functions
και το frontend και τα tests. Το `npm run sync:shared` αντιγράφει αυτόν τον κώδικα μέσα σε κάθε function,
επειδή το Deno χρειάζεται αυτοτελή αρχεία — μοναδική πηγή αλήθειας παραμένει το `packages/engine/src`.

**Realtime:** κάθε δωμάτιο έχει κανάλι `game:{id}`. Οι clients ακούν αλλαγές στους πίνακες `games` και `game_players`
και ξαναδιαβάζουν την κατάσταση, ενώ το Presence δείχνει αν ο αντίπαλος είναι συνδεδεμένος.

## Τοπική εκτέλεση

```bash
npm install
cp web/.env.example web/.env.local   # και συμπλήρωσε τα δύο κλειδιά
npm run dev                          # http://localhost:5173
```

Στο `web/.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Για δοκιμή από κινητό στο ίδιο δίκτυο, ο dev server ακούει και στο LAN (`server.host: true`) —
άνοιξε `http://<IP του υπολογιστή>:5173`.

## Setup του Supabase project

1. Δημιούργησε project στο [supabase.com](https://supabase.com) και πάρε URL + anon key (Settings → API).
2. Τρέξε το `supabase/migrations/0001_init.sql` στον SQL Editor (φτιάχνει πίνακες, RLS, Realtime publication).
3. Ανέβασε τις Edge Functions:

```bash
npm run sync:shared
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase functions deploy create_game join_game set_ready reveal_player place_bid pass_bid
```

Οι functions χρησιμοποιούν τα `SUPABASE_URL` και `SUPABASE_SERVICE_ROLE_KEY` που δίνει αυτόματα το Supabase runtime.

## Deployment

Κάθε push στο `main` τρέχει το `.github/workflows/deploy.yml`: validation + unit tests, build με
`VITE_BASE_PATH=/basketball-auction-draft/`, και δημοσίευση στο GitHub Pages.
Τα `VITE_SUPABASE_URL` και `VITE_SUPABASE_ANON_KEY` έρχονται από τα repository secrets.

## Scripts

| Εντολή | Τι κάνει |
| --- | --- |
| `npm run dev` | Dev server του PWA |
| `npm run build` | Type check + production build (παράγει και το service worker) |
| `npm test` | Unit tests της λογικής παιχνιδιού (vitest, χωρίς δίκτυο) |
| `npm run validate:players` | Ελέγχει 10 παίκτες/mode, 2 ανά θέση, ratings εντός ορίου |
| `npm run check` | validate:players + tests |
| `npm run sync:shared` | Συγχρονίζει engine/datasets/helpers στις Edge Functions |
| `node scripts/generate-icons.mjs` | Ξαναφτιάχνει τα εικονίδια του PWA |

## Σημειώσεις

- Οι φωτογραφίες παικτών είναι `null` προς το παρόν· το πεδίο `photoUrl` υπάρχει έτοιμο και το UI δείχνει τη θέση ως placeholder.
- Δεν υπάρχουν λογαριασμοί: μόνο nickname και session token σε `localStorage`, ώστε να μπορείς να ξαναμπείς
  στο ίδιο παιχνίδι αν κλείσεις κατά λάθος τον browser.
- Δύο παίκτες στην ίδια συσκευή και τον ίδιο browser μοιράζονται `localStorage` — για δοκιμή χρησιμοποίησε
  δεύτερο browser ή διαφορετικό origin (π.χ. `127.0.0.1` αντί για `localhost`).
- Τα ratings είναι στατικά seed data, όχι live στατιστικά.
- Το anon key είναι ενσωματωμένο στο bundle, όπως προβλέπεται από το Supabase: δίνει μόνο δικαίωμα
  ανάγνωσης των δωματίων μέσω RLS. Κάθε εγγραφή (προσφορά, αποχώρηση, νέος γύρος) περνάει από Edge Function
  που απαιτεί έγκυρο session token.
