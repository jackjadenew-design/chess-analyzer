/**
 * PGN import/export utilities.
 * Uses pgn-parser for full variation + comment support on import.
 * Uses a custom serializer for export (avoids chess.js limitations with variations).
 */

import { Chess } from 'chess.js';
import { MoveNode, GameHeaders } from '../types/chess.types';
import {
  STARTING_FEN,
  createRootNode,
  buildNodeMap,
  generateId,
} from './tree';

// ─── PGN Import ───────────────────────────────────────────────────────────────

/**
 * Parse a PGN string into a MoveNode tree.
 * Supports variations (RAVs), comments, and NAGs.
 * Falls back to chess.js mainline-only parsing if pgn-parser fails.
 */
export async function parsePgn(
  pgn: string
): Promise<{ root: MoveNode; headers: GameHeaders; nodeMap: Map<string, MoveNode> }> {
  try {
    const { parse } = await import('pgn-parser');
    const [game] = parse(pgn);
    if (!game) throw new Error('No game found in PGN');

    const headers: GameHeaders = {};
    (game.headers || []).forEach((h: { name: string; value: string }) => {
      headers[h.name] = h.value;
    });

    // Start from initial position (or FEN header if custom start)
    const startFen = headers['FEN'] ?? STARTING_FEN;
    const root = createRootNode(startFen);

    // Recursively process moves
    processMoves(game.moves || [], root, startFen, 0);

    const nodeMap = buildNodeMap(root);
    return { root, headers, nodeMap };
  } catch (err) {
    console.warn('pgn-parser failed, falling back to chess.js mainline parse:', err);
    return parsePgnFallback(pgn);
  }
}

/**
 * Recursively process parsed moves from pgn-parser into our MoveNode tree.
 */
function processMoves(
  moves: any[],
  parentNode: MoveNode,
  parentFen: string,
  depth: number
): void {
  if (!moves || moves.length === 0) return;

  let currentParent = parentNode;
  let currentFen = parentFen;

  for (const moveData of moves) {
    if (!moveData.move) continue;

    const chess = new Chess(currentFen);
    let result: ReturnType<Chess['move']> | null = null;

    try {
      result = chess.move(moveData.move);
    } catch {
      console.warn(`Illegal move "${moveData.move}" in PGN, skipping.`);
      continue;
    }

    const newFen = chess.fen();
    const ply = currentParent.ply + 1;

    const newNode: MoveNode = {
      id: generateId(),
      san: result.san,
      fen: newFen,
      ply,
      parentId: currentParent.id,
      children: [],
      comment: extractComment(moveData),
      nags: extractNags(moveData),
    };

    currentParent.children.push(newNode);

    // Process RAVs (Recursive Annotation Variations) as sibling branches
    if (moveData.ravs && moveData.ravs.length > 0) {
      for (const rav of moveData.ravs) {
        processMoves(rav.moves || [], currentParent, currentFen, depth + 1);
      }
    }

    currentParent = newNode;
    currentFen = newFen;
  }
}

function extractComment(moveData: any): string | undefined {
  const comments: string[] = [];
  if (moveData.comments) {
    for (const c of moveData.comments) {
      if (c.text) comments.push(c.text.trim());
    }
  }
  return comments.length > 0 ? comments.join(' ') : undefined;
}

function extractNags(moveData: any): string[] | undefined {
  if (!moveData.nags || moveData.nags.length === 0) return undefined;
  return moveData.nags.map((n: string | number) => `$${n}`);
}

/** Fallback: parse mainline only via chess.js */
function parsePgnFallback(pgn: string): {
  root: MoveNode;
  headers: GameHeaders;
  nodeMap: Map<string, MoveNode>;
} {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    chess.reset();
  }

  const rawHeaders = chess.header();
  const headers = Object.entries(rawHeaders).reduce<GameHeaders>((acc, [key, value]) => {
    if (value != null) {
      acc[key] = value;
    }
    return acc;
  }, {});
  const startFen = headers['FEN'] ?? STARTING_FEN;
  const root = createRootNode(startFen);

  const history = chess.history({ verbose: true });
  const tempChess = new Chess(startFen);

  let currentParent = root;
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    tempChess.move(move.san);
    const newNode: MoveNode = {
      id: generateId(),
      san: move.san,
      fen: tempChess.fen(),
      ply: currentParent.ply + 1,
      parentId: currentParent.id,
      children: [],
    };
    currentParent.children.push(newNode);
    currentParent = newNode;
  }

  const nodeMap = buildNodeMap(root);
  return { root, headers, nodeMap };
}

// ─── PGN Export ───────────────────────────────────────────────────────────────

/**
 * Serialize the variation tree back to a valid PGN string.
 * Handles nested variations, comments, and NAGs.
 */
export function exportPgn(root: MoveNode, headers: GameHeaders = {}): string {
  const headerStr = Object.entries(headers)
    .map(([k, v]) => `[${k} "${v ?? '?'}"]`)
    .join('\n');

  const movesStr = serializeLine(root.children[0] ?? null, root.ply, true);
  const result = headers['Result'] ?? '*';

  return `${headerStr}\n\n${movesStr}${movesStr ? ' ' : ''}${result}\n`.trim();
}

function serializeLine(
  node: MoveNode | null,
  parentPly: number,
  isFirstMove: boolean
): string {
  if (!node) return '';

  const parts: string[] = [];
  let current: MoveNode | null = node;
  let first = isFirstMove;

  while (current) {
    const isWhite = current.ply % 2 === 1;
    const moveNum = Math.ceil(current.ply / 2);

    // Move number annotation
    if (isWhite) {
      parts.push(`${moveNum}.`);
    } else if (first) {
      parts.push(`${moveNum}...`);
    }
    first = false;

    // The move itself
    parts.push(current.san);

    // NAGs
    if (current.nags && current.nags.length > 0) {
      current.nags.forEach((nag) => parts.push(nag));
    }

    // Comment
    if (current.comment) {
      parts.push(`{ ${current.comment} }`);
    }

    // Variations (children[1+])
    for (let i = 1; i < current.children.length; i++) {
      const variation = serializeLine(current.children[i], current.ply - 1, true);
      if (variation) parts.push(`( ${variation} )`);
    }

    current = current.children[0] ?? null;
  }

  return parts.join(' ');
}

/** Download a PGN string as a .pgn file */
export function downloadPgn(pgn: string, filename = 'game.pgn'): void {
  const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
