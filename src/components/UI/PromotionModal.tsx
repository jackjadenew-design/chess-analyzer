/**
 * PromotionModal — overlaid on the board when a pawn reaches the last rank.
 * Shows Q, R, B, N choices with piece images from react-chessboard's sprite.
 */

import React from 'react';
import { X } from 'lucide-react';
import { PieceSymbol } from '../../types/chess.types';
import { useI18n } from '../../i18n';

interface PromotionModalProps {
  color: 'w' | 'b';
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

const PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

// Unicode chess pieces as fallback
const PIECE_UNICODE: Record<string, Record<PieceSymbol, string>> = {
  w: { q: '♕', r: '♖', b: '♗', n: '♘' },
  b: { q: '♛', r: '♜', b: '♝', n: '♞' },
};

const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect, onCancel }) => {
  const { strings } = useI18n();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded">
      <div className="bg-surface-700 rounded-xl shadow-2xl p-4 border border-surface-500 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-surface-50">
            {strings.board.choosePromotion}
          </span>
          <button
            onClick={onCancel}
            className="text-surface-400 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PIECES.map((symbol) => (
            <button
              key={symbol}
              onClick={() => onSelect(symbol)}
              title={strings.board.pieces[symbol]}
              className="flex flex-col items-center gap-1 p-3 rounded-lg bg-surface-800 hover:bg-accent-500/20 hover:border-accent-500/50 border border-surface-600 transition-all group"
            >
              <span
                className={`text-4xl leading-none ${
                  color === 'w' ? 'text-white drop-shadow' : 'text-slate-900 drop-shadow'
                } group-hover:scale-110 transition-transform`}
                style={{ textShadow: color === 'b' ? '0 0 2px rgba(255,255,255,0.6)' : '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {PIECE_UNICODE[color][symbol]}
              </span>
              <span className="text-[10px] text-surface-400 group-hover:text-accent-500 font-mono">
                {strings.board.pieces[symbol]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
