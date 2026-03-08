/**
 * EnginePanel — displays Stockfish evaluation data.
 * Shows: score, best move, top 3 PV lines, depth slider, engine status.
 */

import React, { useCallback } from 'react';
import { Cpu, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { EngineEval, EngineVersion } from '../../types/chess.types';
import { Chess } from 'chess.js';
import { useI18n } from '../../i18n';

interface EnginePanelProps {
  enabled: boolean;
  depth: number;
  engineVersion: EngineVersion;
  evalData: EngineEval;
  currentFen: string;
  isEngineReady: boolean;
  engineError: string | null;
  onToggleEnabled: () => void;
  onDepthChange: (depth: number) => void;
  onEngineVersionChange: (version: EngineVersion) => void;
}

const EnginePanel: React.FC<EnginePanelProps> = ({
  enabled,
  depth,
  engineVersion,
  evalData,
  currentFen,
  isEngineReady,
  engineError,
  onToggleEnabled,
  onDepthChange,
  onEngineVersionChange,
}) => {
  const { strings } = useI18n();

  const handleDepthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDepth = parseInt(e.target.value, 10);
      onDepthChange(newDepth);
    },
    [onDepthChange]
  );

  const scoreDisplay = () => {
    if (!enabled) return { text: strings.engine.off, color: 'text-surface-400' };
    if (evalData.engineError || engineError) return { text: strings.engine.engineError, color: 'text-red-400' };
    if (!isEngineReady) return { text: strings.engine.loading, color: 'text-surface-400' };
    if (evalData.mate !== null) {
      const sign = evalData.mate > 0 ? '+' : '';
      return { text: `M${sign}${evalData.mate}`, color: evalData.mate > 0 ? 'text-accent-500' : 'text-red-400' };
    }
    if (evalData.score !== null) {
      const pawns = evalData.score / 100;
      const sign = pawns > 0 ? '+' : '';
      return {
        text: `${sign}${pawns.toFixed(2)}`,
        color: pawns > 0.5 ? 'text-accent-500' : pawns < -0.5 ? 'text-surface-400' : 'text-surface-50',
      };
    }
    return { text: '0.00', color: 'text-surface-400' };
  };

  const score = scoreDisplay();

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-accent-500" />
          <span className="text-xs font-semibold tracking-wider text-surface-300 uppercase">
            {strings.engine.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Engine status indicator */}
          {!enabled ? (
            <span className="flex items-center gap-1 text-xs text-surface-500">
              <span className="h-1.5 w-1.5 rounded-full bg-surface-500" />
              {strings.engine.off}
            </span>
          ) : engineError ? (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={11} />
              {strings.engine.error}
            </span>
          ) : !isEngineReady ? (
            <span className="flex items-center gap-1 text-xs text-surface-400">
              <Loader2 size={11} className="animate-spin" />
              {strings.engine.initializing}
            </span>
          ) : evalData.isRunning ? (
            <span className="animate-pulse-soft flex items-center gap-1 text-xs text-accent-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
              {strings.engine.searching}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {strings.engine.ready}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-surface-700 bg-surface-900 px-3 py-2.5">
        <span className="text-xs font-medium text-surface-300">{strings.engine.toggle}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggleEnabled}
          className={[
            'relative h-7 w-12 rounded-full border transition-colors',
            enabled
              ? 'border-accent-500/40 bg-accent-500/20'
              : 'border-surface-600 bg-surface-700',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-5 w-5 rounded-full transition-all',
              enabled ? 'left-6 bg-accent-400' : 'left-1 bg-surface-300',
            ].join(' ')}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['stockfish16', strings.engine.stockfish16],
          ['stockfish18', strings.engine.stockfish18],
        ] as const).map(([version, label]) => {
          const active = engineVersion === version;
          return (
            <button
              key={version}
              onClick={() => onEngineVersionChange(version)}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-400'
                  : 'border-surface-600 bg-surface-900 text-surface-300 hover:border-surface-500 hover:text-surface-50',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Score + Best move */}
      <div className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2.5">
        <div>
          <div className={`text-2xl font-mono font-bold tabular-nums ${score.color}`}>
            {score.text}
          </div>
          <div className="text-xs text-surface-400 mt-0.5">
            {strings.engine.depth} {evalData.depth} · {evalData.isRunning ? strings.engine.analysing : strings.engine.complete}
          </div>
        </div>
      {enabled && evalData.bestMove && (
          <div className="text-right">
            <div className="text-xs text-surface-400 mb-1">{strings.engine.bestMove}</div>
            <div className="rounded bg-surface-700 px-2 py-1 font-mono text-sm font-semibold text-accent-400">
              {formatUciMove(evalData.bestMove, currentFen)}
            </div>
          </div>
        )}
      </div>

      {/* Depth slider */}
      <div className={`flex items-center gap-3 ${enabled ? '' : 'opacity-50'}`}>
        <span className="text-xs text-surface-400 w-10 shrink-0">{strings.engine.depth}</span>
        <input
          type="range"
          min={5}
          max={30}
          value={depth}
          disabled={!enabled}
          onChange={handleDepthChange}
          className="accent-accent-500 h-1 flex-1 cursor-pointer"
        />
        <span className="w-6 shrink-0 text-right font-mono text-xs text-accent-500">{depth}</span>
      </div>

      {/* PV Lines */}
      {enabled && evalData.pvLines.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-surface-400" />
            <span className="text-[10px] font-semibold tracking-wider text-surface-400 uppercase">
              {strings.engine.principalVariations}
            </span>
          </div>
          {evalData.pvLines.slice(0, 3).map((pv, idx) => (
            <PvLine key={idx} pv={pv.moves} fen={currentFen} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── PV Line row ──────────────────────────────────────────────────────────────

interface PvLineProps {
  pv: string[];
  fen: string;
  index: number;
}

const PvLine: React.FC<PvLineProps> = ({ pv, fen, index }) => {
  const san = uciLinesToSan(pv.slice(0, 8), fen);

  const lineColors = [
    'border-l-accent-500 bg-accent-500/5',
    'border-l-surface-400 bg-surface-700/50',
    'border-l-surface-500 bg-surface-800/50',
  ];

  return (
    <div
      className={`border-l-2 pl-2 py-1.5 rounded-r text-xs font-mono text-surface-300 leading-relaxed ${lineColors[index] ?? lineColors[2]}`}
    >
      <span className="text-[10px] text-surface-500 mr-1">#{index + 1}</span>
      {san}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert UCI move (e.g. "e2e4") to SAN using chess.js */
function formatUciMove(uci: string, fen: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
    const move = chess.move({ from, to, promotion: promo });
    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

/** Convert an array of UCI moves to a SAN string starting from fen */
function uciLinesToSan(uciMoves: string[], fen: string): string {
  try {
    const chess = new Chess(fen);
    const parts: string[] = [];
    let moveNum = parseInt(fen.split(' ')[5] ?? '1', 10);
    let isWhite = fen.split(' ')[1] === 'w';

    for (const uci of uciMoves) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;

      if (isWhite) parts.push(`${moveNum}.`);
      else if (parts.length === 0) parts.push(`${moveNum}...`);

      const move = chess.move({ from, to, promotion: promo });
      if (!move) break;
      parts.push(move.san);

      if (!isWhite) moveNum++;
      isWhite = !isWhite;
    }
    return parts.join(' ');
  } catch {
    return uciMoves.slice(0, 6).join(' ');
  }
}

export default React.memo(EnginePanel);
