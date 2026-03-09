export type PuzzleSide = 'white' | 'black';

export interface PuzzleRecord {
  id: string;
  title: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  sideToMove: PuzzleSide;
  source: string;
  lesson: string;
}
