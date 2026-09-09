// ΠΑΡΑΓΟΜΕΝΟ ΑΡΧΕΙΟ — μην το επεξεργάζεσαι. Τρέξε: npm run sync:shared

import type { GameMode, Player } from './types.ts';

export const PLAYER_POOLS: Record<GameMode, Player[]> = {
  "euroleague": [
    {
      "id": "el_pg_1",
      "name": "Facundo Campazzo",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "PG",
      "overallRating": 88,
      "photoUrl": null
    },
    {
      "id": "el_pg_2",
      "name": "Kendrick Nunn",
      "league": "euroleague",
      "team": "Panathinaikos",
      "position": "PG",
      "overallRating": 90,
      "photoUrl": null
    },
    {
      "id": "el_sg_1",
      "name": "Kevin Punter",
      "league": "euroleague",
      "team": "Partizan",
      "position": "SG",
      "overallRating": 86,
      "photoUrl": null
    },
    {
      "id": "el_sg_2",
      "name": "Shane Larkin",
      "league": "euroleague",
      "team": "Anadolu Efes",
      "position": "SG",
      "overallRating": 87,
      "photoUrl": null
    },
    {
      "id": "el_sf_1",
      "name": "Mario Hezonja",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "SF",
      "overallRating": 85,
      "photoUrl": null
    },
    {
      "id": "el_sf_2",
      "name": "Alec Peters",
      "league": "euroleague",
      "team": "Zalgiris Kaunas",
      "position": "SF",
      "overallRating": 82,
      "photoUrl": null
    },
    {
      "id": "el_pf_1",
      "name": "Nikola Mirotic",
      "league": "euroleague",
      "team": "Olympiacos",
      "position": "PF",
      "overallRating": 89,
      "photoUrl": null
    },
    {
      "id": "el_pf_2",
      "name": "Jan Vesely",
      "league": "euroleague",
      "team": "FC Barcelona",
      "position": "PF",
      "overallRating": 84,
      "photoUrl": null
    },
    {
      "id": "el_c_1",
      "name": "Walter Tavares",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "C",
      "overallRating": 90,
      "photoUrl": null
    },
    {
      "id": "el_c_2",
      "name": "Mathias Lessort",
      "league": "euroleague",
      "team": "Panathinaikos",
      "position": "C",
      "overallRating": 86,
      "photoUrl": null
    }
  ],
  "nba": [
    {
      "id": "nba_pg_1",
      "name": "Luka Doncic",
      "league": "nba",
      "team": "Los Angeles Lakers",
      "position": "PG",
      "overallRating": 96,
      "photoUrl": null
    },
    {
      "id": "nba_pg_2",
      "name": "Shai Gilgeous-Alexander",
      "league": "nba",
      "team": "Oklahoma City Thunder",
      "position": "PG",
      "overallRating": 97,
      "photoUrl": null
    },
    {
      "id": "nba_sg_1",
      "name": "Anthony Edwards",
      "league": "nba",
      "team": "Minnesota Timberwolves",
      "position": "SG",
      "overallRating": 93,
      "photoUrl": null
    },
    {
      "id": "nba_sg_2",
      "name": "Devin Booker",
      "league": "nba",
      "team": "Phoenix Suns",
      "position": "SG",
      "overallRating": 92,
      "photoUrl": null
    },
    {
      "id": "nba_sf_1",
      "name": "Jayson Tatum",
      "league": "nba",
      "team": "Boston Celtics",
      "position": "SF",
      "overallRating": 95,
      "photoUrl": null
    },
    {
      "id": "nba_sf_2",
      "name": "Kevin Durant",
      "league": "nba",
      "team": "Houston Rockets",
      "position": "SF",
      "overallRating": 93,
      "photoUrl": null
    },
    {
      "id": "nba_pf_1",
      "name": "Giannis Antetokounmpo",
      "league": "nba",
      "team": "Milwaukee Bucks",
      "position": "PF",
      "overallRating": 97,
      "photoUrl": null
    },
    {
      "id": "nba_pf_2",
      "name": "Anthony Davis",
      "league": "nba",
      "team": "Dallas Mavericks",
      "position": "PF",
      "overallRating": 91,
      "photoUrl": null
    },
    {
      "id": "nba_c_1",
      "name": "Nikola Jokic",
      "league": "nba",
      "team": "Denver Nuggets",
      "position": "C",
      "overallRating": 98,
      "photoUrl": null
    },
    {
      "id": "nba_c_2",
      "name": "Victor Wembanyama",
      "league": "nba",
      "team": "San Antonio Spurs",
      "position": "C",
      "overallRating": 94,
      "photoUrl": null
    }
  ],
  "mixed": [
    {
      "id": "mx_pg_1",
      "name": "Facundo Campazzo",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "PG",
      "overallRating": 88,
      "photoUrl": null
    },
    {
      "id": "mx_pg_2",
      "name": "Jalen Brunson",
      "league": "nba",
      "team": "New York Knicks",
      "position": "PG",
      "overallRating": 92,
      "photoUrl": null
    },
    {
      "id": "mx_sg_1",
      "name": "Kevin Punter",
      "league": "euroleague",
      "team": "Partizan",
      "position": "SG",
      "overallRating": 86,
      "photoUrl": null
    },
    {
      "id": "mx_sg_2",
      "name": "Jalen Green",
      "league": "nba",
      "team": "Phoenix Suns",
      "position": "SG",
      "overallRating": 85,
      "photoUrl": null
    },
    {
      "id": "mx_sf_1",
      "name": "Mario Hezonja",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "SF",
      "overallRating": 85,
      "photoUrl": null
    },
    {
      "id": "mx_sf_2",
      "name": "DeMar DeRozan",
      "league": "nba",
      "team": "Sacramento Kings",
      "position": "SF",
      "overallRating": 86,
      "photoUrl": null
    },
    {
      "id": "mx_pf_1",
      "name": "Nikola Mirotic",
      "league": "euroleague",
      "team": "Olympiacos",
      "position": "PF",
      "overallRating": 89,
      "photoUrl": null
    },
    {
      "id": "mx_pf_2",
      "name": "Julius Randle",
      "league": "nba",
      "team": "Minnesota Timberwolves",
      "position": "PF",
      "overallRating": 88,
      "photoUrl": null
    },
    {
      "id": "mx_c_1",
      "name": "Walter Tavares",
      "league": "euroleague",
      "team": "Real Madrid",
      "position": "C",
      "overallRating": 90,
      "photoUrl": null
    },
    {
      "id": "mx_c_2",
      "name": "Alperen Sengun",
      "league": "nba",
      "team": "Houston Rockets",
      "position": "C",
      "overallRating": 91,
      "photoUrl": null
    }
  ]
} as Record<GameMode, Player[]>;

export function poolFor(mode: GameMode): Player[] {
  return PLAYER_POOLS[mode];
}
