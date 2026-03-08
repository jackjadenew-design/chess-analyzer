// ─── Core Game Tree ──────────────────────────────────────────────────────────

/**
 * A node in the variation tree. Each node represents a position after a move.
 * The root node is special: san = '', fen = STARTING_FEN, ply = 0.
 * children[0] is always the mainline continuation; children[1+] are variations.
 */
export interface MoveNode {
  id: string;
  /** Standard Algebraic Notation, e.g. "e4", "Nf3", "O-O". Empty for root. */
  san: string;
  /** Full FEN string after this move is played. */
  fen: string;
  /** Half-move count from the starting position (root = 0). */
  ply: number;
  /** Optional text annotation for this position. */
  comment?: string;
  /** Numeric Annotation Glyphs, stored as "$N" strings, e.g. ["$1", "$4"] */
  nags?: string[];
  /** Parent node ID. null only for the root. */
  parentId: string | null;
  /** Child nodes. children[0] = mainline; children[1+] = variations. */
  children: MoveNode[];
}

// ─── Engine / Stockfish ───────────────────────────────────────────────────────

export interface PvLine {
  moves: string[]; // UCI move strings
  san?: string[];  // SAN equivalents (computed lazily)
}

export interface EngineEval {
  /** Centipawn score from White's perspective. null when mate found. */
  score: number | null;
  /** Moves to mate. Positive = White mates, negative = Black mates. null if no mate. */
  mate: number | null;
  /** Current search depth. */
  depth: number;
  /** Best move in UCI format, e.g. "e2e4". */
  bestMove: string | null;
  /** Up to 3 principal variation lines (multiPV). */
  pvLines: PvLine[];
  /** True while the engine is searching. */
  isRunning: boolean;
  /** True if the engine failed to load. */
  engineError: boolean;
}

export interface EngineEvalHistoryEntry {
  score: number | null;
  mate: number | null;
  depth: number;
  bestMove?: string | null;
}

export type MoveQualityCategory =
  | 'brilliant'
  | 'good'
  | 'dubious'
  | 'mistake'
  | 'blunder';

export type PlayerSide = 'white' | 'black';

export interface MoveQualityCounts {
  brilliant: number;
  good: number;
  dubious: number;
  mistake: number;
  blunder: number;
}

export interface PlayerAnalysisSummary {
  accuracy: number | null;
  moveCount: number;
  counts: MoveQualityCounts;
}

export interface MoveQualityMark {
  side: PlayerSide;
  quality: MoveQualityCategory;
}

export interface SelectedMoveQualityFilter {
  side: PlayerSide;
  quality: MoveQualityCategory;
}

export interface GameAnalysisSummary {
  white: PlayerAnalysisSummary;
  black: PlayerAnalysisSummary;
  analyzedMoves: number;
}

export type EngineVersion = 'stockfish16' | 'stockfish18';

// ─── UI / Interaction ─────────────────────────────────────────────────────────

export type PieceSymbol = 'q' | 'r' | 'b' | 'n';

export interface PromotionInfo {
  from: string;
  to: string;
  color: 'w' | 'b';
}

export type Square = string; // e.g. "e4", "g8"

export interface SquareHighlight {
  [square: string]: { background: string };
}

// ─── PGN / Import-Export ──────────────────────────────────────────────────────

export interface GameHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  White?: string;
  Black?: string;
  Result?: string;
  [key: string]: string | undefined;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light';
