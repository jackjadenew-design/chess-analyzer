/**
 * ChessBoard — wraps react-chessboard with our custom interaction handlers,
 * square highlights, and navigation controls.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Square as ChessSquare } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FlipVertical2,
} from 'lucide-react';
import { MoveNode, SquareHighlight, PromotionInfo, PieceSymbol } from '../../types/chess.types';
import EvalBar from './EvalBar';
import PromotionModal from '../UI/PromotionModal';
import { EngineEval } from '../../types/chess.types';
import { useI18n } from '../../i18n';

interface ChessBoardProps {
  currentNode: MoveNode;
  evalData: EngineEval;
  legalMoveHighlights: SquareHighlight;
  pendingPromotion: PromotionInfo | null;
  gameStatus: string;
  onSquareClick: (square: ChessSquare) => void;
  onPieceDrop: (from: string, to: string) => boolean;
  onCompletePromotion: (piece: PieceSymbol) => void;
  onCancelPromotion: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoStart: () => void;
  onGoEnd: () => void;
}

const ChessBoardComponent: React.FC<ChessBoardProps> = ({
  currentNode,
  evalData,
  legalMoveHighlights,
  pendingPromotion,
  gameStatus,
  onSquareClick,
  onPieceDrop,
  onCompletePromotion,
  onCancelPromotion,
  onGoBack,
  onGoForward,
  onGoStart,
  onGoEnd,
}) => {
  const { strings } = useI18n();
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const boardHostRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState(560);

  const flipBoard = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'));

  useEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    if (!root || !controls) return;

    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const availableWidth = rootRect.width - 40;
      const availableHeight = rootRect.height - controlsRect.height - 12;
      const nextSize = Math.round(Math.min(availableWidth, availableHeight));
      if (nextSize > 0) setBoardSize(nextSize);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(root);
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); onGoBack(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); onGoForward(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); onGoStart(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); onGoEnd(); }
      if (e.key === 'f') flipBoard();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onGoBack, onGoForward, onGoStart, onGoEnd]);

  const statusBadge =
    gameStatus === 'check'
      ? { label: strings.board.check, cls: 'border border-accent-500/30 bg-accent-500/20 text-accent-500' }
      : gameStatus === 'checkmate'
      ? { label: strings.board.checkmate, cls: 'bg-red-500/20 text-red-400 border border-red-500/30' }
      : gameStatus === 'draw'
      ? { label: strings.board.draw, cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' }
      : gameStatus === 'stalemate'
      ? { label: strings.board.stalemate, cls: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' }
      : null;

  return (
    <div ref={rootRef} className="flex h-full w-full flex-col gap-3 overflow-hidden">
      <div
        ref={controlsRef}
        className="flex items-center justify-between rounded-xl bg-surface-700 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <NavButton onClick={onGoStart} title={strings.board.firstMove}>
            <ChevronsLeft size={22} />
          </NavButton>
          <NavButton onClick={onGoBack} title={strings.board.previousMove}>
            <ChevronLeft size={22} />
          </NavButton>
          <NavButton onClick={onGoForward} title={strings.board.nextMove}>
            <ChevronRight size={22} />
          </NavButton>
          <NavButton onClick={onGoEnd} title={strings.board.lastMove}>
            <ChevronsRight size={22} />
          </NavButton>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-400 font-mono">
            {currentNode.ply === 0
              ? strings.board.start
              : strings.board.move
                  .replace('{move}', String(Math.ceil(currentNode.ply / 2)))
                  .replace('{side}', currentNode.ply % 2 === 1 ? strings.board.whiteShort : strings.board.blackShort)}
          </span>

          <NavButton onClick={flipBoard} title={strings.board.flipBoard}>
            <FlipVertical2 size={22} />
          </NavButton>
        </div>
      </div>

      {/* Board row: EvalBar + Board */}
      <div className="flex min-h-0 flex-1 gap-3 items-center justify-center overflow-hidden">
        {/* Evaluation bar */}
        <div className="flex items-stretch">
          <EvalBar evalData={evalData} orientation={orientation} height={boardSize} />
        </div>

        {/* Board container */}
        <div
          ref={boardHostRef}
          className="relative shrink-0"
          style={{ width: boardSize, height: boardSize }}
        >
          {/* Status badge */}
          {statusBadge && (
            <div
              className={`absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded text-xs font-mono font-bold tracking-widest ${statusBadge.cls} animate-fade-in`}
            >
              {statusBadge.label}
            </div>
          )}

          <Chessboard
            id="main-board"
            position={currentNode.fen}
            onSquareClick={(square) => onSquareClick(square as ChessSquare)}
            onPieceDrop={onPieceDrop}
            boardOrientation={orientation}
            customSquareStyles={legalMoveHighlights}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            animationDuration={150}
            arePiecesDraggable={true}
          />

          {/* Promotion modal overlay */}
          {pendingPromotion && (
            <PromotionModal
              color={pendingPromotion.color}
              onSelect={onCompletePromotion}
              onCancel={onCancelPromotion}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className="flex h-11 w-11 items-center justify-center rounded-xl text-surface-300 transition-colors hover:bg-surface-600 hover:text-accent-500 xl:h-12 xl:w-12"
  >
    {children}
  </button>
);

export default React.memo(ChessBoardComponent);
