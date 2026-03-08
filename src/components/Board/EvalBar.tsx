/**
 * EvalBar — vertical evaluation bar displayed to the left of the board.
 * White's advantage fills from the bottom; Black's from the top.
 * Smoothly animated via CSS transitions.
 */

import React, { useMemo } from 'react';
import { EngineEval } from '../../types/chess.types';

interface EvalBarProps {
  evalData: EngineEval;
  orientation?: 'white' | 'black';
  height?: number; // px, should match board size
}

const EvalBar: React.FC<EvalBarProps> = ({
  evalData,
  orientation = 'white',
  height = 480,
}) => {
  // Convert score to a percentage (0–100) representing white's share of the bar
  const whitePercent = useMemo(() => {
    if (evalData.mate !== null) {
      return evalData.mate > 0 ? 100 : 0;
    }
    if (evalData.score === null) return 50;
    // Sigmoid-like mapping: cp → 0..100
    // At ±500cp ≈ 85%/15%, at ±1000cp ≈ 95%/5%
    const normalized = Math.tanh(evalData.score / 600);
    return 50 + normalized * 50;
  }, [evalData.score, evalData.mate]);

  const displayWhitePercent =
    orientation === 'white' ? whitePercent : 100 - whitePercent;

  const scoreLabel = useMemo(() => {
    if (evalData.engineError) return '?';
    if (!evalData.isRunning && evalData.score === null && evalData.mate === null) return '0.00';
    if (evalData.mate !== null) {
      return `M${Math.abs(evalData.mate)}`;
    }
    if (evalData.score !== null) {
      const pawns = evalData.score / 100;
      const sign = pawns > 0 ? '+' : '';
      return `${sign}${pawns.toFixed(2)}`;
    }
    return '...';
  }, [evalData]);

  const scoreColor =
    evalData.mate !== null
      ? evalData.mate > 0
        ? 'text-accent-500'
        : 'text-surface-400'
      : evalData.score !== null && evalData.score > 0
      ? 'text-accent-500'
      : 'text-surface-400';

  return (
    <div
      className="relative select-none"
      style={{ height, width: 28 }}
      title={`Evaluation: ${scoreLabel}`}
    >
      <div
        className={`absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold ${scoreColor} leading-none`}
      >
        {scoreLabel}
      </div>

      <div
        className="relative h-full w-full overflow-hidden rounded border border-surface-600/60"
        style={{ background: 'rgb(var(--evalbar-track))' }}
      >
        <div
          className="absolute top-0 left-0 right-0 bg-surface-600 transition-all duration-500 ease-out"
          style={{
            height: `${100 - displayWhitePercent}%`,
            background: 'rgb(var(--evalbar-dark-fill))',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
          style={{
            height: `${displayWhitePercent}%`,
            background:
              'linear-gradient(to top, rgb(var(--evalbar-light-from)), rgb(var(--evalbar-light-to)))',
          }}
        />

        <div
          className="absolute left-0 right-0 z-10 h-px"
          style={{ top: '50%', background: 'rgb(var(--evalbar-divider))' }}
        />

        {evalData.isRunning && (
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, rgb(var(--accent-500) / 0.08) 50%, transparent 100%)',
              animation: 'pulseSoft 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-surface-400 leading-none">
        d{evalData.depth || 0}
      </div>
    </div>
  );
};

export default React.memo(EvalBar);
