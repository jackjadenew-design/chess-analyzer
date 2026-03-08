import React, { useMemo } from 'react';
import { Activity, Info } from 'lucide-react';

import { useI18n } from '../../i18n';
import {
  EngineEvalHistoryEntry,
  GameAnalysisSummary,
  MoveNode,
  MoveQualityCategory,
  MoveQualityMark,
  SelectedMoveQualityFilter,
} from '../../types/chess.types';

interface EvalTrendChartProps {
  points: Array<{
    node: MoveNode;
    evalEntry?: EngineEvalHistoryEntry;
  }>;
  currentNodeId: string;
  canAnalyze: boolean;
  isAnalyzing: boolean;
  progressText: string | null;
  analysisDepth: number;
  summary: GameAnalysisSummary | null;
  qualityMarks: Record<string, MoveQualityMark>;
  selectedFilter: SelectedMoveQualityFilter | null;
  onAnalysisDepthChange: (depth: number) => void;
  onSelectFilter: (filter: SelectedMoveQualityFilter | null) => void;
  onSelectNode: (nodeId: string) => void;
  onAnalyze: () => void;
}

function normalizeValue(entry?: EngineEvalHistoryEntry): number | null {
  if (!entry) return null;
  if (entry.mate !== null) {
    return entry.mate > 0 ? 1 : -1;
  }
  if (entry.score === null) return null;
  return Math.tanh(entry.score / 240);
}

function formatScore(entry?: EngineEvalHistoryEntry): string {
  if (!entry) return '...';
  if (entry.mate !== null) {
    return `M${entry.mate > 0 ? '+' : ''}${entry.mate}`;
  }
  if (entry.score === null) return '...';
  const pawns = entry.score / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

export default function EvalTrendChart({
  points,
  currentNodeId,
  canAnalyze,
  isAnalyzing,
  progressText,
  analysisDepth,
  summary,
  qualityMarks,
  selectedFilter,
  onAnalysisDepthChange,
  onSelectFilter,
  onSelectNode,
  onAnalyze,
}: EvalTrendChartProps) {
  const { strings } = useI18n();
  const qualityOrder: MoveQualityCategory[] = [
    'brilliant',
    'good',
    'dubious',
    'mistake',
    'blunder',
  ];
  const qualityHints: Record<MoveQualityCategory, string> = {
    brilliant: strings.engine.brilliantHint,
    good: strings.engine.goodHint,
    dubious: strings.engine.dubiousHint,
    mistake: strings.engine.mistakeHint,
    blunder: strings.engine.blunderHint,
  };

  const chart = useMemo(() => {
    const width = 820;
    const height = 170;
    const paddingX = 18;
    const paddingY = 20;
    const drawableWidth = width - paddingX * 2;
    const drawableHeight = height - paddingY * 2;

    return points.map((point, index) => {
      const x =
        points.length <= 1
          ? width / 2
          : paddingX + (index / (points.length - 1)) * drawableWidth;
      const normalized = normalizeValue(point.evalEntry);
      const y =
        normalized === null
          ? height / 2
          : paddingY + ((1 - (normalized + 1) / 2) * drawableHeight);

      return {
        ...point,
        x,
        y,
        normalized,
        isCurrent: point.node.id === currentNodeId,
        mark: qualityMarks[point.node.id],
        scoreLabel: formatScore(point.evalEntry),
      };
    });
  }, [currentNodeId, points, qualityMarks]);

  const linePath = useMemo(() => {
    const analyzed = chart.filter((point) => point.normalized !== null);
    if (analyzed.length < 2) return '';

    return analyzed
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');
  }, [chart]);

  const currentPoint = chart.find((point) => point.isCurrent);
  const hasAnalyzedPoints = chart.some((point) => point.evalEntry);

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
            {strings.engine.trend}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-surface-400">
            <span>{strings.engine.analysisDepth}</span>
            <select
              value={analysisDepth}
              disabled={isAnalyzing}
              onChange={(event) => onAnalysisDepthChange(parseInt(event.target.value, 10))}
              className="rounded-lg border border-surface-600 bg-surface-900 px-2 py-1 text-xs text-surface-100 outline-none transition-colors focus:border-accent-400 disabled:cursor-not-allowed disabled:border-surface-700 disabled:text-surface-500"
            >
              {[12, 14, 16, 18, 20].map((depthOption) => (
                <option key={depthOption} value={depthOption}>
                  {depthOption}
                </option>
              ))}
            </select>
          </label>
          {progressText && (
            <div className="font-mono text-[11px] text-surface-400">{progressText}</div>
          )}
          <div className="font-mono text-xs text-accent-400">
            {currentPoint?.scoreLabel ?? '...'}
          </div>
          <button
            type="button"
            disabled={!canAnalyze || isAnalyzing}
            onClick={onAnalyze}
            className="rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-400 transition-colors hover:bg-accent-500/20 disabled:cursor-not-allowed disabled:border-surface-600 disabled:bg-surface-700 disabled:text-surface-400"
          >
            {isAnalyzing ? strings.engine.analysisInProgress : strings.engine.analyzeGame}
          </button>
        </div>
      </div>

      {!hasAnalyzedPoints ? (
        <div className="flex h-32 items-center justify-center text-sm text-surface-400">
          {strings.engine.trendWaiting}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-surface-700 bg-surface-900/80">
            <svg viewBox="0 0 820 170" className="h-44 w-full">
              <line x1="0" x2="820" y1="85" y2="85" stroke="rgb(var(--surface-600))" strokeDasharray="4 6" />
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="rgb(var(--accent-500))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {chart.map((point) => (
                <g key={point.node.id}>
                  {point.evalEntry && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={10}
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => onSelectNode(point.node.id)}
                    />
                  )}
                  {(() => {
                    const isSelectedMatch =
                      selectedFilter &&
                      point.mark &&
                      point.mark.side === selectedFilter.side &&
                      point.mark.quality === selectedFilter.quality;
                    const shouldShowDot = point.isCurrent || Boolean(isSelectedMatch);

                    if (!shouldShowDot) return null;

                    return (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={point.isCurrent ? 5.5 : 4.5}
                        fill={
                          point.isCurrent
                            ? 'rgb(var(--accent-500))'
                            : 'rgb(var(--surface-50))'
                        }
                        stroke={point.isCurrent ? 'rgb(var(--surface-50))' : 'rgb(var(--accent-500))'}
                        strokeWidth={point.isCurrent ? 2 : 2}
                      />
                    );
                  })()}
                  {point.isCurrent && (
                    <>
                      <rect
                        x={Math.max(10, point.x - 24)}
                        y={Math.max(8, point.y - 32)}
                        width="48"
                        height="18"
                        rx="9"
                        fill="rgb(var(--surface-800))"
                        stroke="rgb(var(--accent-500))"
                        strokeWidth="1"
                      />
                      <text
                        x={point.x}
                        y={Math.max(20, point.y - 19)}
                        textAnchor="middle"
                        className="fill-accent-400 font-mono text-[10px]"
                      >
                        {point.scoreLabel}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {summary && (
            <div className="rounded-xl border border-surface-700 bg-surface-900/70 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
                    {strings.engine.analysisSummary}
                  </div>
                  <button
                    type="button"
                    title={strings.engine.summaryInfo}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-surface-600 text-surface-400 transition-colors hover:border-accent-400/40 hover:text-accent-400"
                  >
                    <Info size={11} />
                  </button>
                </div>
                <div className="text-[11px] text-surface-400">
                  {strings.engine.analyzedMoves}: {summary.analyzedMoves}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ['white', strings.pgn.white],
                  ['black', strings.pgn.black],
                ] as const).map(([side, label]) => {
                  const sideSummary = summary[side];
                  return (
                    <div
                      key={side}
                      className="rounded-xl border border-surface-700 bg-surface-800/70 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold text-surface-50">{label}</div>
                        <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-surface-400">
                          {strings.engine.accuracy}
                        </div>
                          <div className="font-mono text-lg font-semibold text-accent-400">
                            {sideSummary.accuracy === null ? '--' : `${sideSummary.accuracy.toFixed(1)}%`}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {qualityOrder.map((quality) => (
                          <button
                            key={`${side}-${quality}`}
                            type="button"
                            title={qualityHints[quality]}
                            onClick={() =>
                              onSelectFilter(
                                selectedFilter?.side === side &&
                                  selectedFilter.quality === quality
                                  ? null
                                  : { side, quality }
                              )
                            }
                            className={[
                              'rounded-lg border px-2.5 py-2 text-left transition-colors',
                              selectedFilter?.side === side &&
                              selectedFilter.quality === quality
                                ? 'border-accent-500/50 bg-accent-500/15'
                                : 'border-surface-700 bg-surface-900/80 hover:border-accent-400/30 hover:bg-surface-800',
                            ].join(' ')}
                          >
                            <div className="text-[10px] uppercase tracking-[0.14em] text-surface-400">
                              {strings.engine[quality]}
                            </div>
                            <div className="mt-1 font-mono text-sm text-surface-100">
                              {sideSummary.counts[quality]}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
