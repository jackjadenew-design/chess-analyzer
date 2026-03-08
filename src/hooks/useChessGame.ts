/**
 * useChessGame — wraps chess.js for board interaction.
 *
 * Responsibilities:
 *  - Keep a chess.js instance synced to the currentNode's FEN.
 *  - Validate and execute moves (click-to-move, drag-and-drop).
 *  - Detect legal moves + provide square highlights.
 *  - Detect promotion situations.
 *  - Return all board-relevant state.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { MoveNode, SquareHighlight, PromotionInfo, PieceSymbol } from '../types/chess.types';

interface UseChessGameProps {
  currentNode: MoveNode;
  onMove: (san: string, fen: string) => void;
  boardOrientation?: 'white' | 'black';
}

export function useChessGame({ currentNode, onMove }: UseChessGameProps) {
  // chess.js instance - always kept in sync with currentNode.fen
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PromotionInfo | null>(null);

  // Sync chess instance whenever the board position changes
  useEffect(() => {
    try {
      chess.load(currentNode.fen);
    } catch {
      chess.reset();
    }
    setSelectedSquare(null);
  }, [currentNode.fen, chess]);

  // ── Legal move highlights ─────────────────────────────────────────────────
  const legalMoveHighlights = useMemo((): SquareHighlight => {
    if (!selectedSquare) return {};
    const highlights: SquareHighlight = {};
    const moves = chess.moves({ square: selectedSquare, verbose: true });

    // Highlight selected square
    highlights[selectedSquare] = { background: 'rgba(240, 165, 0, 0.4)' };

    for (const move of moves) {
      // Dot for empty squares, ring for captures
      const isCapture = !!move.captured;
      highlights[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(240,165,0,0) 55%, rgba(240,165,0,0.5) 55%)'
          : 'radial-gradient(circle, rgba(240,165,0,0.45) 28%, transparent 28%)',
      };
    }
    return highlights;
  }, [selectedSquare, chess]);

  // ── Last move highlight ───────────────────────────────────────────────────
  const lastMoveHighlights = useMemo((): SquareHighlight => {
    if (!currentNode.san || !currentNode.parentId) return {};
    try {
      // Reconstruct the last move from the parent FEN by replaying
      const tempChess = new Chess(currentNode.fen);
      // Unfortunately chess.js doesn't give us from/to from just FEN+SAN
      // We parse it from the SAN by loading parent FEN and making the move
      const parentChess = new Chess();
      // We can get it from the history if we load the SAN on parent FEN
      // This is not directly available here, so we skip exact highlighting
      // and use a subtle current position indicator instead
      return {};
    } catch {
      return {};
    }
  }, [currentNode]);

  // ── Move execution ────────────────────────────────────────────────────────

  /** Attempt a move from `from` to `to`. Returns true if successful. */
  const tryMove = useCallback(
    (from: string, to: string, promotion?: PieceSymbol): boolean => {
      if (chess.turn() !== (chess.fen().split(' ')[1] as 'w' | 'b')) return false;

      const movingPiece = chess.get(from as Square);
      if (!movingPiece) return false;

      // Detect promotion
      const isPawnPromotion =
        movingPiece.type === 'p' &&
        ((movingPiece.color === 'w' && to[1] === '8') ||
          (movingPiece.color === 'b' && to[1] === '1'));

      if (isPawnPromotion && !promotion) {
        setPendingPromotion({ from, to, color: movingPiece.color });
        return false; // Pause for promotion modal
      }

      try {
        const result = chess.move({
          from: from as Square,
          to: to as Square,
          promotion: promotion ?? 'q',
        });
        if (!result) return false;

        onMove(result.san, chess.fen());
        setSelectedSquare(null);
        return true;
      } catch {
        return false;
      }
    },
    [chess, onMove]
  );

  /** Handle a square click (click-to-move interface) */
  const handleSquareClick = useCallback(
    (square: Square) => {
      if (chess.isGameOver()) return;

      if (selectedSquare) {
        // Second click: attempt move
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }
        const success = tryMove(selectedSquare, square);
        if (!success) {
          // Maybe clicking another own piece — re-select
          const piece = chess.get(square);
          if (piece && piece.color === chess.turn()) {
            setSelectedSquare(square);
          } else {
            setSelectedSquare(null);
          }
        }
      } else {
        // First click: select piece
        const piece = chess.get(square);
        if (piece && piece.color === chess.turn()) {
          setSelectedSquare(square);
        }
      }
    },
    [chess, selectedSquare, tryMove]
  );

  /** Handle drag-and-drop drop */
  const handlePieceDrop = useCallback(
    (from: string, to: string): boolean => {
      setSelectedSquare(null);
      return tryMove(from, to);
    },
    [tryMove]
  );

  /** Complete a promotion after user selects piece */
  const completePromotion = useCallback(
    (piece: PieceSymbol) => {
      if (!pendingPromotion) return;
      tryMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    },
    [pendingPromotion, tryMove]
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelectedSquare(null);
  }, []);

  // ── Board status ──────────────────────────────────────────────────────────
  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) return 'checkmate';
    if (chess.isDraw()) return 'draw';
    if (chess.isStalemate()) return 'stalemate';
    if (chess.isCheck()) return 'check';
    return 'playing';
  }, [currentNode.fen]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    chess,
    selectedSquare,
    legalMoveHighlights,
    lastMoveHighlights,
    pendingPromotion,
    gameStatus,
    handleSquareClick,
    handlePieceDrop,
    completePromotion,
    cancelPromotion,
  };
}
