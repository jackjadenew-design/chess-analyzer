import { PuzzleRecord, PuzzleSide } from '../types/puzzle.types';

type RawPuzzle = {
  id: string;
  fen: string;
  moves: string[];
  motif: 'queenMate' | 'rookMate';
  mateDepth: 1 | 2;
  sideToMove: PuzzleSide;
};

const rawPuzzles: RawPuzzle[] = [
  { id: 'starter-001', fen: '4r3/8/8/8/8/8/5k2/7K b - - 0 1', moves: ['e8h8'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-002', fen: '3K4/8/q2k4/8/8/8/8/8 b - - 0 1', moves: ['a6a8'], motif: 'queenMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-003', fen: '8/8/8/2r5/8/8/5k2/7K b - - 0 1', moves: ['c5h5'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-004', fen: '3K1r2/8/2k5/8/8/8/8/8 b - - 0 1', moves: ['c6d6'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-005', fen: '8/8/8/8/8/2k5/8/1K3q2 b - - 0 1', moves: ['c3b3'], motif: 'queenMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-006', fen: '8/8/8/8/8/4q3/K1k5/8 b - - 0 1', moves: ['e3a7'], motif: 'queenMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-007', fen: 'k7/8/K7/8/8/8/6R1/8 w - - 0 1', moves: ['g2g8'], motif: 'rookMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-008', fen: '8/4K3/7k/8/8/8/8/7R w - - 0 1', moves: ['e7f6'], motif: 'rookMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-009', fen: '8/8/8/8/1q6/2k5/8/1K6 b - - 0 1', moves: ['b4b2'], motif: 'queenMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-010', fen: '8/8/8/8/5K2/7k/8/Q7 w - - 0 1', moves: ['a1h1'], motif: 'queenMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-011', fen: '1k6/8/1K6/8/8/4Q3/8/8 w - - 0 1', moves: ['e3e8'], motif: 'queenMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-012', fen: '8/8/8/8/8/5k1K/7r/8 b - - 0 1', moves: ['h2h1'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-013', fen: '8/8/8/8/4k3/8/8/r4K2 b - - 0 1', moves: ['e4f3'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-014', fen: '8/8/8/1q6/8/3k4/8/3K4 b - - 0 1', moves: ['b5b1'], motif: 'queenMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-015', fen: '8/8/8/8/7r/8/7K/5k2 b - - 0 1', moves: ['f1f2'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-016', fen: '8/8/1R6/8/8/k1K5/8/8 w - - 0 1', moves: ['b6a6'], motif: 'rookMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-017', fen: '4k2Q/8/8/3K4/8/8/8/8 w - - 0 1', moves: ['d5e6'], motif: 'queenMate', mateDepth: 1, sideToMove: 'white' },
  { id: 'starter-018', fen: '8/8/8/r7/8/8/K7/2k5 b - - 0 1', moves: ['c1c2'], motif: 'rookMate', mateDepth: 1, sideToMove: 'black' },
  { id: 'starter-019', fen: '2k5/8/1K6/8/8/2Q5/8/8 w - - 0 1', moves: ['c3d4', 'c8b8', 'd4d8'], motif: 'queenMate', mateDepth: 2, sideToMove: 'white' },
  { id: 'starter-020', fen: '4K3/8/6k1/2q5/8/8/8/8 b - - 0 1', moves: ['c5c7', 'e8f8', 'c7d8'], motif: 'queenMate', mateDepth: 2, sideToMove: 'black' },
  { id: 'starter-021', fen: '5Q2/8/5K1k/8/8/8/8/8 w - - 0 1', moves: ['f8g8', 'h6h5', 'g8g5'], motif: 'queenMate', mateDepth: 2, sideToMove: 'white' },
  { id: 'starter-022', fen: '8/2k5/K7/8/5r2/8/8/8 b - - 0 1', moves: ['f4f5', 'a6a7', 'f5a5'], motif: 'rookMate', mateDepth: 2, sideToMove: 'black' },
  { id: 'starter-023', fen: 'K1q5/3k4/8/8/8/8/8/8 b - - 0 1', moves: ['d7c6', 'a8a7', 'c8b7'], motif: 'queenMate', mateDepth: 2, sideToMove: 'black' },
  { id: 'starter-024', fen: '4k2K/3q4/8/8/8/8/8/8 b - - 0 1', moves: ['e8f7', 'h8h7', 'd7h3'], motif: 'queenMate', mateDepth: 2, sideToMove: 'black' },
  { id: 'starter-025', fen: '8/7K/5k2/8/8/8/6q1/8 b - - 0 1', moves: ['f6f7', 'h7h8', 'g2g7'], motif: 'queenMate', mateDepth: 2, sideToMove: 'black' },
  { id: 'starter-026', fen: '1K6/8/2k5/8/6r1/8/8/8 b - - 0 1', moves: ['g4a4', 'b8c8', 'a4a8'], motif: 'rookMate', mateDepth: 2, sideToMove: 'black' },
];

function buildTitle(puzzle: RawPuzzle): string {
  const motif = puzzle.motif === 'queenMate' ? 'Queen Net' : 'Rook Net';
  return `Mate in ${puzzle.mateDepth} · ${motif}`;
}

function buildLesson(puzzle: RawPuzzle): string {
  if (puzzle.mateDepth === 1) {
    return puzzle.motif === 'queenMate'
      ? 'Start with forcing checks and make sure every king escape square is covered.'
      : 'Use the rook to cut the king off cleanly while your king removes the final flight squares.';
  }

  return puzzle.motif === 'queenMate'
    ? 'Look for the check that drives the king onto a single track, then finish with the net on the next move.'
    : 'First restrict the king with a checking move, then swing the rook across for the final mate.';
}

export const puzzleStarterPack: PuzzleRecord[] = rawPuzzles.map((puzzle, index) => ({
  id: puzzle.id,
  title: buildTitle(puzzle),
  fen: puzzle.fen,
  moves: puzzle.moves,
  rating:
    puzzle.mateDepth === 1
      ? 420 + (index % 9) * 55
      : 860 + (index % 8) * 70,
  themes: [
    puzzle.mateDepth === 1 ? 'mateIn1' : 'mateIn2',
    puzzle.motif,
    'checkmate',
    'endgame',
    'kidFriendly',
  ],
  sideToMove: puzzle.sideToMove,
  source: 'Starter Pack',
  lesson: buildLesson(puzzle),
}));
