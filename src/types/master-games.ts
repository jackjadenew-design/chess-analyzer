export interface MasterSummary {
  id: string;
  name: string;
  gameCount: number;
}

export interface MasterGame {
  id: string;
  event: string;
  site: string;
  date: string;
  round: string;
  white: string;
  black: string;
  result: string;
  eco: string;
  opening: string;
  openingGroup: string;
  pgn: string;
}

export interface MasterCollection {
  id: string;
  name: string;
  source: string;
  games: MasterGame[];
}
