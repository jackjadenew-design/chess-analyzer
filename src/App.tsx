import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Crown, Plus, AlertTriangle, FileInput, Info, Eye } from 'lucide-react';

import { useChessTree } from './hooks/useChessTree';
import { useChessGame } from './hooks/useChessGame';
import { useStockfish } from './hooks/useStockfish';

import ChessBoardComponent from './components/Board/ChessBoard';
import MoveList from './components/MoveList/MoveList';
import EnginePanel from './components/Engine/EnginePanel';
import EvalTrendChart from './components/Engine/EvalTrendChart';
import AnnotationPanel from './components/Annotation/AnnotationPanel';
import GameInfoPanel from './components/GameInfo/GameInfoPanel';
import PgnPanel from './components/PGN/PgnPanel';
import ThemeToggle from './components/UI/ThemeToggle';
import MasterGamesPanel from './components/Masters/MasterGamesPanel';

import {
  EngineEvalHistoryEntry,
  EngineVersion,
  GameAnalysisSummary,
  GameHeaders,
  MoveNode,
  MoveQualityCategory,
  MoveQualityCounts,
  MoveQualityMark,
  PieceSymbol,
  PlayerSide,
  SelectedMoveQualityFilter,
  Theme,
} from './types/chess.types';
import { I18nProvider, Language, useI18n } from './i18n';
import { parsePgn } from './utils/pgn';

type SideTab = 'info' | 'moves' | 'pgn';
const DEFAULT_GAME_ANALYSIS_DEPTH = 16;
const VISITOR_COUNTER_API_BASE = 'https://api.counterapi.dev/v1';
const VISITOR_COUNTER_NAMESPACE = 'jackjadenew-design.github.io';
const VISITOR_COUNTER_KEY = 'chess-analyzer-site';
const VISITOR_COUNTER_SESSION_KEY = 'chess-analyzer-visit-tracked';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hasUnsavedGame(
  root: MoveNode,
  nodeMap: Map<string, MoveNode>,
  headers: GameHeaders
): boolean {
  const hasMoves = root.children.length > 0;
  const hasAnnotations = Array.from(nodeMap.values()).some(
    (node) => Boolean(node.comment?.trim()) || Boolean(node.nags?.length)
  );
  const hasCustomHeaders = Object.entries(headers).some(([key, value]) => {
    if (!value?.trim()) return false;
    if (key === 'Event') return value !== 'Analysis';
    if (key === 'Result') return value !== '*';
    if (key === 'Date') return false;
    return true;
  });

  return hasMoves || hasAnnotations || hasCustomHeaders;
}

function collectNodesForAnalysis(root: MoveNode): MoveNode[] {
  const nodes: MoveNode[] = [root];

  const visit = (node: MoveNode) => {
    for (const child of node.children) {
      nodes.push(child);
      visit(child);
    }
  };

  visit(root);
  return nodes;
}

function createEmptyCounts(): MoveQualityCounts {
  return {
    brilliant: 0,
    best: 0,
    excellent: 0,
    good: 0,
    dubious: 0,
    mistake: 0,
    blunder: 0,
  };
}

const MATERIAL_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const WIN_PERCENT_CP_CLAMP = 1000;
const MIN_MOVE_ACCURACY = 1;

function toComparableScore(entry?: EngineEvalHistoryEntry): number | null {
  if (!entry) return null;
  if (entry.mate !== null) {
    const sign = entry.mate > 0 ? 1 : -1;
    return sign * (100000 - Math.min(Math.abs(entry.mate), 50) * 1000);
  }
  return entry.score;
}

function centipawnLossForMove(
  previousScore: number,
  currentScore: number,
  ply: number
): number {
  const moverSign = ply % 2 === 1 ? 1 : -1;
  const previousPerspective = previousScore * moverSign;
  const currentPerspective = currentScore * moverSign;
  return Math.max(0, previousPerspective - currentPerspective);
}

function winPercentFromScore(score: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
}

function clampWinPercentScore(score: number): number {
  return clamp(score, -WIN_PERCENT_CP_CLAMP, WIN_PERCENT_CP_CLAMP);
}

function getMoveWinPercentMetrics(
  previousScore: number,
  currentScore: number,
  ply: number
): {
  before: number;
  after: number;
  drop: number;
} {
  const moverSign = ply % 2 === 1 ? 1 : -1;
  const bestWinPercent = winPercentFromScore(
    clampWinPercentScore(previousScore * moverSign)
  );
  const actualWinPercent = winPercentFromScore(
    clampWinPercentScore(currentScore * moverSign)
  );

  return {
    before: bestWinPercent,
    after: actualWinPercent,
    drop: Math.max(0, bestWinPercent - actualWinPercent),
  };
}

function accuracyFromWinPercentDrop(winDrop: number): number {
  if (winDrop <= 0) return 100;

  const mapped = 103.1668 * Math.exp(-0.04354 * winDrop) - 3.1669;
  return Math.max(MIN_MOVE_ACCURACY, Math.min(100, mapped));
}

function getMoveAccuracyMetrics(
  previousScore: number,
  currentScore: number,
  ply: number
): {
  cpLoss: number;
  winPercentBefore: number;
  winPercentAfter: number;
  winPercentDrop: number;
  accuracy: number;
} {
  const cpLoss = centipawnLossForMove(previousScore, currentScore, ply);
  const winPercentMetrics = getMoveWinPercentMetrics(previousScore, currentScore, ply);

  return {
    cpLoss,
    winPercentBefore: winPercentMetrics.before,
    winPercentAfter: winPercentMetrics.after,
    winPercentDrop: winPercentMetrics.drop,
    accuracy: accuracyFromWinPercentDrop(winPercentMetrics.drop),
  };
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function harmonicMean(values: number[]): number | null {
  if (!values.length) return null;

  const denominator = values.reduce(
    (sum, value) => sum + 1 / Math.max(value, MIN_MOVE_ACCURACY),
    0
  );

  return denominator > 0 ? values.length / denominator : null;
}

function getAccuracyWindowSize(moveCount: number): number {
  if (moveCount <= 1) return 1;
  return clamp(Math.round(Math.sqrt(moveCount)), 2, Math.min(8, moveCount));
}

function getVolatilityWeights(positionWinPercents: number[]): number[] {
  if (!positionWinPercents.length) return [];

  const windowSize = getAccuracyWindowSize(positionWinPercents.length);
  const maxStart = Math.max(0, positionWinPercents.length - windowSize);

  return positionWinPercents.map((_, index) => {
    const rawStart = index - Math.floor(windowSize / 2);
    const start = clamp(rawStart, 0, maxStart);
    const end = Math.min(positionWinPercents.length, start + windowSize);
    const volatility = standardDeviation(positionWinPercents.slice(start, end));

    return Math.max(1, volatility);
  });
}

function calculateGameAccuracy(
  moveAccuracies: number[],
  positionWinPercents: number[]
): number | null {
  if (!moveAccuracies.length) return null;

  const weights = getVolatilityWeights(positionWinPercents);
  const weightedTotal = moveAccuracies.reduce(
    (sum, accuracy, index) => sum + accuracy * (weights[index] ?? 1),
    0
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedMean = weightSum > 0 ? weightedTotal / weightSum : null;
  const harmonic = harmonicMean(moveAccuracies);

  if (weightedMean === null && harmonic === null) return null;
  if (weightedMean === null) return Number(harmonic?.toFixed(1));
  if (harmonic === null) return Number(weightedMean.toFixed(1));

  return Number((((weightedMean + harmonic) / 2)).toFixed(1));
}

function normalizeFenForComparison(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

function inferPlayedMoveUci(previousFen: string, currentFen: string): string | null {
  try {
    const chess = new Chess(previousFen);
    const target = normalizeFenForComparison(currentFen);

    for (const move of chess.moves({ verbose: true })) {
      const clone = new Chess(previousFen);
      clone.move(move);
      if (normalizeFenForComparison(clone.fen()) === target) {
        return `${move.from}${move.to}${move.promotion ?? ''}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function materialTotals(fen: string): Record<PlayerSide, number> {
  const totals: Record<PlayerSide, number> = { white: 0, black: 0 };

  try {
    const chess = new Chess(fen);
    for (const row of chess.board()) {
      for (const piece of row) {
        if (!piece) continue;
        const side: PlayerSide = piece.color === 'w' ? 'white' : 'black';
        totals[side] += MATERIAL_VALUES[piece.type] ?? 0;
      }
    }
  } catch {
    return totals;
  }

  return totals;
}

function isBestMove(
  previousNode: MoveNode,
  previousEntry: EngineEvalHistoryEntry,
  currentNode: MoveNode
): boolean {
  const actualMove = inferPlayedMoveUci(previousNode.fen, currentNode.fen);
  if (!actualMove || !previousEntry.bestMove || actualMove !== previousEntry.bestMove) {
    return false;
  }

  return true;
}

function isExcellentMove(metrics: ReturnType<typeof getMoveAccuracyMetrics>): boolean {
  return metrics.winPercentDrop <= 2.5 && metrics.cpLoss <= 35;
}

function isBrilliantMove(
  previousNode: MoveNode,
  previousEntry: EngineEvalHistoryEntry,
  currentNode: MoveNode,
  previousScore: number,
  currentScore: number
): boolean {
  const side: PlayerSide = currentNode.ply % 2 === 1 ? 'white' : 'black';
  const moverSign = currentNode.ply % 2 === 1 ? 1 : -1;
  if (!isBestMove(previousNode, previousEntry, currentNode)) {
    return false;
  }

  const beforeMaterial = materialTotals(previousNode.fen);
  const afterMaterial = materialTotals(currentNode.fen);
  const ownMaterialLoss = beforeMaterial[side] - afterMaterial[side];
  const playedMoveEval = currentScore * moverSign;

  return (
    ownMaterialLoss >= 100 &&
    playedMoveEval >= 0
  );
}

function classifyMoveQuality(
  previousNode: MoveNode,
  previousEntry: EngineEvalHistoryEntry,
  currentNode: MoveNode,
  previousScore: number,
  currentScore: number
): MoveQualityCategory {
  const metrics = getMoveAccuracyMetrics(previousScore, currentScore, currentNode.ply);

  if (
    isBrilliantMove(
      previousNode,
      previousEntry,
      currentNode,
      previousScore,
      currentScore
    )
  ) {
    return 'brilliant';
  }
  if (isBestMove(previousNode, previousEntry, currentNode)) {
    return 'best';
  }
  if (isExcellentMove(metrics)) return 'excellent';
  if (metrics.winPercentDrop >= 20 || metrics.cpLoss >= 250) return 'blunder';
  if (metrics.winPercentDrop >= 10 || metrics.cpLoss >= 120) return 'mistake';
  if (metrics.winPercentDrop >= 4 || metrics.cpLoss >= 50) return 'dubious';
  return 'good';
}

function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-full bg-red-500/15 p-2 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-base font-semibold text-surface-50">{title}</div>
            <div className="mt-1 text-sm text-surface-300">{description}</div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-surface-600 bg-surface-900 px-4 py-2 text-sm text-surface-300 transition-colors hover:border-surface-500 hover:text-surface-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-red-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactAuthorDialog({
  open,
  title,
  description,
  nameLabel,
  namePlaceholder,
  messageLabel,
  messagePlaceholder,
  cancelLabel,
  sendLabel,
  emailLabel,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  cancelLabel: string;
  sendLabel: string;
  emailLabel: string;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setMessage('');
    }
  }, [open]);

  if (!open) return null;

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const subject = name.trim()
      ? `Website message from ${name.trim()}`
      : 'Website message';
    const body = name.trim()
      ? `Name: ${name.trim()}\n\nMessage:\n${trimmedMessage}`
      : trimmedMessage;
    window.location.href = `mailto:geo_zhao@126.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-surface-600 bg-surface-800 p-5 shadow-2xl">
        <div className="mb-4">
          <div className="text-base font-semibold text-surface-50">{title}</div>
          <div className="mt-1 text-sm text-surface-300">{description}</div>
          <div className="mt-2 text-xs text-surface-400">
            {emailLabel}: geo_zhao@126.com
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-surface-300">{nameLabel}</div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={namePlaceholder}
              className="w-full rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-surface-50 placeholder-surface-500 transition-colors focus:border-accent-500/50 focus:outline-none"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-surface-300">{messageLabel}</div>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={messagePlaceholder}
              rows={6}
              className="w-full resize-none rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-surface-50 placeholder-surface-500 transition-colors focus:border-accent-500/50 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-surface-600 bg-surface-900 px-4 py-2 text-sm text-surface-300 transition-colors hover:border-surface-500 hover:text-surface-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:bg-surface-600 disabled:text-surface-400"
          >
            {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Resize panel"
      onMouseDown={onMouseDown}
      className="group relative hidden w-3 shrink-0 cursor-col-resize xl:flex xl:items-stretch"
    >
      <span className="mx-auto w-px bg-surface-600 transition-colors group-hover:bg-accent-500" />
      <span className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2" />
    </button>
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'zh';
    return (window.localStorage.getItem('language') as Language | null) ?? 'zh';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('language', language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppShell />
    </I18nProvider>
  );
}

function AppShell() {
  const { language, setLanguage, strings } = useI18n();
  const [theme, setTheme] = useState<Theme>('dark');
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<SideTab>('moves');
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [engineVersion, setEngineVersion] = useState<EngineVersion>('stockfish16');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [annotationFocusToken, setAnnotationFocusToken] = useState(0);
  const [gameAnalysis, setGameAnalysis] = useState<Record<string, EngineEvalHistoryEntry>>({});
  const [isGameAnalyzing, setIsGameAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ done: 0, total: 0 });
  const [analysisDepth, setAnalysisDepth] = useState(DEFAULT_GAME_ANALYSIS_DEPTH);
  const [selectedMoveQualityFilter, setSelectedMoveQualityFilter] =
    useState<SelectedMoveQualityFilter | null>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(310);
  const [rightPaneWidth, setRightPaneWidth] = useState(560);
  const [activeResize, setActiveResize] = useState<'left' | 'right' | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth >= 1280
  );
  const mainContainerRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const analysisQueueRef = useRef<MoveNode[]>([]);
  const activeAnalysisRef = useRef<MoveNode | null>(null);
  const lastCompletedAnalysisIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(min-width: 1280px)');
    const updateDesktop = () => setIsDesktop(media.matches);

    updateDesktop();
    media.addEventListener('change', updateDesktop);
    return () => media.removeEventListener('change', updateDesktop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const trackedThisSession =
      window.sessionStorage.getItem(VISITOR_COUNTER_SESSION_KEY) === '1';
    const action = trackedThisSession ? '' : '/up';
    const endpoint =
      `${VISITOR_COUNTER_API_BASE}/${encodeURIComponent(VISITOR_COUNTER_NAMESPACE)}` +
      `/${encodeURIComponent(VISITOR_COUNTER_KEY)}${action}`;

    let cancelled = false;

    const loadVisitCount = async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { count?: number; value?: number };
        const nextCount =
          typeof payload.count === 'number'
            ? payload.count
            : typeof payload.value === 'number'
            ? payload.value
            : null;

        if (cancelled || nextCount === null) return;
        setVisitCount(nextCount);

        if (!trackedThisSession) {
          window.sessionStorage.setItem(VISITOR_COUNTER_SESSION_KEY, '1');
        }
      } catch {
        if (!cancelled) {
          setVisitCount(null);
        }
      }
    };

    void loadVisitCount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeResize) return;

    const handleMove = (event: MouseEvent) => {
      if (activeResize === 'left') {
        const workspace = workspaceRef.current;
        if (!workspace) return;

        const rect = workspace.getBoundingClientRect();
        const maxWidth = Math.max(280, rect.width - 420);
        setLeftPaneWidth(clamp(event.clientX - rect.left, 260, maxWidth));
        return;
      }

      const main = mainContainerRef.current;
      if (!main) return;

      const rect = main.getBoundingClientRect();
      const maxWidth = Math.max(360, rect.width - leftPaneWidth - 420);
      setRightPaneWidth(clamp(rect.right - event.clientX, 360, maxWidth));
    };

    const handleUp = () => setActiveResize(null);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [activeResize, leftPaneWidth]);

  useEffect(() => {
    if (!isDesktop) return;

    const clampPaneWidths = () => {
      const mainWidth = mainContainerRef.current?.getBoundingClientRect().width ?? 0;
      if (!mainWidth) return;

      const minLeft = 260;
      const minCenter = 340;
      const minRight = 360;
      const gapAllowance = 24;

      const nextLeft = clamp(
        leftPaneWidth,
        minLeft,
        Math.max(minLeft, mainWidth - rightPaneWidth - minCenter - gapAllowance)
      );
      const nextRight = clamp(
        rightPaneWidth,
        minRight,
        Math.max(minRight, mainWidth - nextLeft - minCenter - gapAllowance)
      );

      if (nextLeft !== leftPaneWidth) setLeftPaneWidth(nextLeft);
      if (nextRight !== rightPaneWidth) setRightPaneWidth(nextRight);
    };

    clampPaneWidths();
    window.addEventListener('resize', clampPaneWidths);
    return () => window.removeEventListener('resize', clampPaneWidths);
  }, [isDesktop, leftPaneWidth, rightPaneWidth]);

  const tree = useChessTree();

  const game = useChessGame({
    currentNode: tree.currentNode,
    onMove: useCallback(
      (san: string, fen: string) => {
        tree.addMove(san, fen);
      },
      [tree.addMove]
    ),
  });

  const liveEngine = useStockfish({
    enabled: engineEnabled,
    depth: 18,
    multiPV: 3,
    engineVersion,
  });

  const analysisEngine = useStockfish({
    enabled: true,
    depth: analysisDepth,
    multiPV: 1,
    engineVersion,
    debounceMs: 0,
  });

  useEffect(() => {
    if (isGameAnalyzing) return;
    liveEngine.analyzePosition(tree.currentNode.fen);
  }, [liveEngine.analyzePosition, isGameAnalyzing, tree.currentNode.fen]);

  const moveTreeSignature = useMemo(
    () =>
      Array.from(tree.nodeMap.values())
        .map((node) => `${node.id}:${node.parentId ?? 'root'}:${node.san}:${node.fen}`)
        .join('|'),
    [tree.nodeMap]
  );

  const stopGameAnalysis = useCallback(
    (shouldStopEngine = true) => {
      analysisQueueRef.current = [];
      activeAnalysisRef.current = null;
      lastCompletedAnalysisIdRef.current = null;
      setIsGameAnalyzing(false);
      setAnalysisProgress((current) =>
        current.done === 0 && current.total === 0 ? current : { done: 0, total: 0 }
      );
      if (shouldStopEngine) {
        analysisEngine.stop();
      }
    },
    [analysisEngine.stop]
  );

  useEffect(() => {
    setGameAnalysis({});
    setSelectedMoveQualityFilter(null);
    stopGameAnalysis(false);
  }, [moveTreeSignature, stopGameAnalysis]);

  const startNextGameAnalysis = useCallback(() => {
    const nextNode = analysisQueueRef.current.shift() ?? null;

    if (!nextNode) {
      activeAnalysisRef.current = null;
      lastCompletedAnalysisIdRef.current = null;
      setIsGameAnalyzing(false);
      setAnalysisProgress((current) => ({ ...current, done: current.total }));
      return;
    }

    activeAnalysisRef.current = nextNode;
    lastCompletedAnalysisIdRef.current = null;
    analysisEngine.analyzePosition(nextNode.fen, analysisDepth);
  }, [analysisDepth, analysisEngine.analyzePosition]);

  const handleAnalyzeGame = useCallback(() => {
    if (!analysisEngine.isEngineReady) return;

    const nodes = collectNodesForAnalysis(tree.root);
    if (!nodes.length) return;

    setActiveTab('moves');
    liveEngine.stop();
    setGameAnalysis({});
    setAnalysisProgress({ done: 0, total: nodes.length });
    analysisQueueRef.current = [...nodes];
    activeAnalysisRef.current = null;
    lastCompletedAnalysisIdRef.current = null;
    setIsGameAnalyzing(true);
    startNextGameAnalysis();
  }, [analysisEngine.isEngineReady, liveEngine.stop, startNextGameAnalysis, tree.root]);

  useEffect(() => {
    if (!isGameAnalyzing) return;
    if (analysisEngine.engineError || !analysisEngine.isEngineReady) {
      stopGameAnalysis(false);
    }
  }, [
    analysisEngine.isEngineReady,
    analysisEngine.engineError,
    isGameAnalyzing,
    stopGameAnalysis,
  ]);

  useEffect(() => {
    if (!isGameAnalyzing) return;
    if (analysisEngine.evalData.isRunning) return;

    const activeNode = activeAnalysisRef.current;
    if (!activeNode) return;
    if (lastCompletedAnalysisIdRef.current === activeNode.id) return;
    if (analysisEngine.evalData.score === null && analysisEngine.evalData.mate === null) return;

    lastCompletedAnalysisIdRef.current = activeNode.id;

    setGameAnalysis((current) => ({
      ...current,
      [activeNode.id]: {
        score: analysisEngine.evalData.score,
        mate: analysisEngine.evalData.mate,
        depth: analysisEngine.evalData.depth,
        bestMove: analysisEngine.evalData.bestMove,
      },
    }));
    setAnalysisProgress((current) => ({
      done: Math.min(current.done + 1, current.total),
      total: current.total,
    }));
    activeAnalysisRef.current = null;

    startNextGameAnalysis();
  }, [
    analysisEngine.evalData.depth,
    analysisEngine.evalData.isRunning,
    analysisEngine.evalData.mate,
    analysisEngine.evalData.score,
    isGameAnalyzing,
    startNextGameAnalysis,
  ]);

  const hasPendingChanges = useMemo(
    () => hasUnsavedGame(tree.root, tree.nodeMap, tree.headers),
    [tree.headers, tree.nodeMap, tree.root]
  );

  const handleCompletePromotion = useCallback(
    (piece: PieceSymbol) => {
      game.completePromotion(piece);
    },
    [game.completePromotion]
  );

  const runReplacingGameAction = useCallback(
    (action: () => void | Promise<void>) => {
      pendingActionRef.current = action;
      if (hasPendingChanges) {
        setShowDiscardDialog(true);
        return;
      }
      void action();
      pendingActionRef.current = null;
    },
    [hasPendingChanges]
  );

  const handleLoadPgnText = useCallback(
    async (pgnText: string) => {
      try {
        const { root, headers, nodeMap } = await parsePgn(pgnText);
        tree.loadGame(root, headers, nodeMap);
        setActiveTab('moves');
      } catch (error) {
        console.error(error);
        window.alert(strings.pgn.parseFileFailed);
      }
    },
    [strings.pgn.parseFileFailed, tree]
  );

  const handleRequestNewGame = useCallback(() => {
    runReplacingGameAction(() => {
      tree.reset();
    });
  }, [runReplacingGameAction, tree]);

  const handleImportFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const text = String(loadEvent.target?.result ?? '');
        if (!text.trim()) return;
        runReplacingGameAction(async () => {
          await handleLoadPgnText(text);
        });
      };
      reader.readAsText(file);
    },
    [handleLoadPgnText, runReplacingGameAction]
  );

  const handleLoadMasterGame = useCallback(
    async (pgnText: string) => {
      runReplacingGameAction(async () => {
        await handleLoadPgnText(pgnText);
      });
    },
    [handleLoadPgnText, runReplacingGameAction]
  );

  const handleCancelDiscard = useCallback(() => {
    pendingActionRef.current = null;
    setShowDiscardDialog(false);
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setShowDiscardDialog(false);
    if (action) {
      void action();
    }
  }, []);

  const handleOpenImport = useCallback(() => {
    importFileRef.current?.click();
  }, []);

  const handleDeleteMove = useCallback(
    (nodeId: string) => {
      if (nodeId === 'root') return;
      tree.deleteNodeById(nodeId);
    },
    [tree]
  );

  const handleAnnotateMove = useCallback(
    (nodeId: string) => {
      tree.goTo(nodeId);
      setActiveTab('moves');
      setAnnotationFocusToken((current) => current + 1);
    },
    [tree]
  );

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isEditableTarget || tree.currentNodeId === 'root') return;

      const isDeleteKey = event.key === 'Delete';
      const isMacShortcut = event.metaKey && event.key === 'Backspace';
      if (!isDeleteKey && !isMacShortcut) return;

      event.preventDefault();
      tree.deleteNodeById(tree.currentNodeId);
    };

    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [tree]);

  const tabs: Array<{ id: SideTab; label: string }> = [
    { id: 'info', label: strings.app.tabs.info },
    { id: 'moves', label: strings.app.tabs.moves },
    { id: 'pgn', label: strings.app.tabs.pgn },
  ];

  const engineStatus = liveEngine.engineError
    ? { label: strings.app.engineStatus.error, className: 'text-red-400 bg-red-400/10 border-red-400/20' }
    : !engineEnabled
    ? { label: strings.engine.off, className: 'text-surface-400 bg-surface-700/40 border-surface-600' }
    : liveEngine.isEngineReady
    ? {
        label: strings.app.engineStatus.ready(strings.engine[engineVersion]),
        className: 'text-green-400 bg-green-400/10 border-green-400/20',
      }
    : {
        label: strings.app.engineStatus.loading(strings.engine[engineVersion]),
        className: 'text-accent-500 bg-accent-500/10 border-accent-500/20',
      };

  const currentBranchNodes = useMemo(() => {
    const path: MoveNode[] = [];
    let node: MoveNode | undefined = tree.nodeMap.get(tree.currentNodeId);

    while (node) {
      path.push(node);
      if (!node.parentId) break;
      node = tree.nodeMap.get(node.parentId);
    }

    path.reverse();

    const tail: MoveNode[] = [];
    let current = tree.currentNode.children[0];
    while (current) {
      tail.push(current);
      current = current.children[0];
    }

    const branch = [...path, ...tail];
    const rootPoint: MoveNode = {
      id: 'root',
      san: '',
      fen: tree.root.fen,
      ply: 0,
      parentId: null,
      children: [],
    };

    return [rootPoint, ...branch.filter((point) => point.id !== 'root')];
  }, [tree.currentNode, tree.currentNodeId, tree.nodeMap, tree.root.fen]);

  const currentBranchPoints = useMemo(
    () =>
      currentBranchNodes.map((nodePoint) => ({
        node: nodePoint,
        evalEntry: gameAnalysis[nodePoint.id],
      })),
    [currentBranchNodes, gameAnalysis]
  );

  const currentBranchQualities = useMemo<Record<string, MoveQualityMark>>(() => {
    const qualities: Record<string, MoveQualityMark> = {};

    for (let index = 1; index < currentBranchPoints.length; index += 1) {
      const previous = currentBranchPoints[index - 1];
      const current = currentBranchPoints[index];
      if (!previous.evalEntry || !current.evalEntry) continue;
      const previousScore = toComparableScore(previous.evalEntry);
      const currentScore = toComparableScore(current.evalEntry);

      if (previousScore === null || currentScore === null) continue;

      const side = current.node.ply % 2 === 1 ? 'white' : 'black';
      qualities[current.node.id] = {
        side,
        quality: classifyMoveQuality(
          previous.node,
          previous.evalEntry,
          current.node,
          previousScore,
          currentScore
        ),
      };
    }

    return qualities;
  }, [currentBranchPoints]);

  const currentBranchSummary = useMemo<GameAnalysisSummary | null>(() => {
    if (currentBranchPoints.length < 2) return null;

    const summary: GameAnalysisSummary = {
      white: {
        accuracy: null,
        moveCount: 0,
        counts: createEmptyCounts(),
      },
      black: {
        accuracy: null,
        moveCount: 0,
        counts: createEmptyCounts(),
      },
      analyzedMoves: 0,
    };

    const accuracyBuckets = {
      white: {
        accuracies: [] as number[],
        positionWinPercents: [] as number[],
      },
      black: {
        accuracies: [] as number[],
        positionWinPercents: [] as number[],
      },
    };

    for (let index = 1; index < currentBranchPoints.length; index += 1) {
      const previous = currentBranchPoints[index - 1];
      const current = currentBranchPoints[index];
      const previousScore = toComparableScore(previous.evalEntry);
      const currentScore = toComparableScore(current.evalEntry);

      if (previousScore === null || currentScore === null) continue;

      const side = current.node.ply % 2 === 1 ? 'white' : 'black';
      const quality = currentBranchQualities[current.node.id]?.quality;
      if (!quality) continue;
      const metrics = getMoveAccuracyMetrics(previousScore, currentScore, current.node.ply);

      summary[side].moveCount += 1;
      summary[side].counts[quality] += 1;
      accuracyBuckets[side].accuracies.push(metrics.accuracy);
      accuracyBuckets[side].positionWinPercents.push(metrics.winPercentBefore);
      summary.analyzedMoves += 1;
    }

    (['white', 'black'] as const).forEach((side) => {
      summary[side].accuracy = calculateGameAccuracy(
        accuracyBuckets[side].accuracies,
        accuracyBuckets[side].positionWinPercents
      );
    });

    return summary.analyzedMoves > 0 ? summary : null;
  }, [currentBranchPoints, currentBranchQualities]);

  return (
    <div className={`flex h-screen flex-col overflow-hidden bg-surface-900 text-surface-50 ${theme}`}>
      <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center border-b border-surface-700 bg-surface-800/80 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono ${engineStatus.className}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {engineStatus.label}
          </div>
        </div>

        <div className="justify-self-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-accent-500" />
              <span className="font-display text-lg font-semibold tracking-wide text-accent-500">
                {strings.app.title}
              </span>
            </div>
            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[10px] font-mono text-accent-500">
              {strings.app.pro}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <div
            title={strings.app.visits}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-surface-600 bg-surface-800/90 px-3 text-xs font-semibold text-surface-300"
          >
            <Eye size={14} className="text-accent-400" />
            <span className="font-mono text-[12px]">
              {visitCount === null
                ? '--'
                : visitCount.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
            </span>
          </div>
          <button
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            title={strings.app.switchLanguage}
            className="rounded-lg border border-surface-600 px-3 py-2 text-xs font-semibold text-surface-300 transition-colors hover:border-accent-400/40 hover:text-accent-400"
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />
          <div className="group relative">
            <button
              title={strings.app.authorInfo}
              onClick={() => setShowContactDialog(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-600 bg-surface-800/90 text-surface-300 transition-colors hover:border-accent-400/40 hover:text-accent-400"
            >
              <Info size={16} />
            </button>

            <div className="pointer-events-none absolute right-0 top-12 hidden w-56 rounded-2xl border border-surface-600 bg-surface-800/95 p-3 text-xs text-surface-200 shadow-2xl group-hover:block">
              <div className="font-semibold text-surface-50">{strings.app.author}</div>
              <div className="mt-1 text-surface-300">
                {strings.app.email}: geo_zhao@126.com
              </div>
              <div className="mt-2 text-surface-400">{strings.app.leaveMessage}</div>
            </div>
          </div>
        </div>
      </header>

      <main
        ref={mainContainerRef}
        className="flex min-h-0 flex-1 overflow-hidden flex-col xl:flex-row"
      >
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden p-4">
          <div
            ref={workspaceRef}
            className="flex h-full min-h-0 flex-col gap-4 overflow-hidden xl:flex-row xl:gap-0"
          >
            <div
              className="w-full shrink-0 overflow-hidden"
              style={isDesktop ? { width: leftPaneWidth } : undefined}
            >
              <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto xl:pr-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRequestNewGame}
                    title={strings.app.newGame}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-surface-600 bg-surface-800 text-surface-100 transition-colors hover:border-accent-400/40 hover:text-accent-400"
                  >
                    <Plus size={20} />
                  </button>

                  <button
                    onClick={handleOpenImport}
                    title={strings.app.importFile}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-surface-600 bg-surface-800 text-surface-100 transition-colors hover:border-accent-400/40 hover:text-accent-400"
                  >
                    <FileInput size={19} />
                  </button>

                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".pgn,.txt"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                </div>

                <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
                  <EnginePanel
                    enabled={engineEnabled}
                    depth={liveEngine.depth}
                    engineVersion={engineVersion}
                    evalData={liveEngine.evalData}
                    currentFen={tree.currentNode.fen}
                    isEngineReady={liveEngine.isEngineReady}
                    engineError={liveEngine.engineError}
                    onToggleEnabled={() => setEngineEnabled((current) => !current)}
                    onDepthChange={liveEngine.setDepth}
                    onEngineVersionChange={setEngineVersion}
                  />
                </div>

                <MasterGamesPanel onLoadPgn={handleLoadMasterGame} />
              </div>
            </div>

            <ResizeHandle onMouseDown={(event) => {
              event.preventDefault();
              setActiveResize('left');
            }} />

            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
              <div className="h-full w-full xl:pl-4" style={isDesktop ? undefined : { maxWidth: 780 }}>
                <div className="mx-auto h-full w-full max-w-[820px]">
                  <ChessBoardComponent
                    currentNode={tree.currentNode}
                    evalData={liveEngine.evalData}
                    legalMoveHighlights={game.legalMoveHighlights}
                    pendingPromotion={game.pendingPromotion}
                    gameStatus={game.gameStatus}
                    onSquareClick={game.handleSquareClick}
                    onPieceDrop={game.handlePieceDrop}
                    onCompletePromotion={handleCompletePromotion}
                    onCancelPromotion={game.cancelPromotion}
                    onGoBack={tree.goBack}
                    onGoForward={tree.goForward}
                    onGoStart={tree.goStart}
                    onGoEnd={tree.goEnd}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <ResizeHandle onMouseDown={(event) => {
          event.preventDefault();
          setActiveResize('right');
        }} />

        <aside
          className="flex min-h-0 min-w-0 w-full shrink-0 flex-col overflow-hidden border-t border-surface-700 xl:border-l xl:border-t-0"
          style={isDesktop ? { width: rightPaneWidth } : undefined}
        >
          <div className="flex border-b border-surface-700 bg-surface-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex-1 border-b-2 py-3 text-xs font-semibold tracking-wide transition-colors',
                  activeTab === tab.id
                    ? 'border-accent-500 bg-surface-700/50 text-accent-500'
                    : 'border-transparent text-surface-400 hover:bg-surface-700/30 hover:text-surface-100',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'info' && (
              <GameInfoPanel headers={tree.headers} onUpdateHeaders={tree.updateHeaders} />
            )}

            {activeTab === 'moves' && (
              <div className="grid gap-4 min-[980px]:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.9fr)]">
                <div className="rounded-xl border border-surface-700 bg-surface-800/70 p-4">
                  {(tree.headers.White || tree.headers.Black || tree.headers.Event) && (
                    <div className="mb-4 border-b border-surface-700 pb-4">
                      <div className="text-sm font-semibold text-surface-50">
                        {tree.headers.White ?? '?'}{' '}
                        <span className="text-xs text-surface-400">{strings.app.vs}</span>{' '}
                        {tree.headers.Black ?? '?'}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-400">
                        {tree.headers.Event && <span>{tree.headers.Event}</span>}
                        {tree.headers.Site && <span>{tree.headers.Site}</span>}
                        {tree.headers.Date && <span>{tree.headers.Date}</span>}
                        {tree.headers.Result && (
                          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-accent-400">
                            {tree.headers.Result}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <MoveList
                    root={tree.root}
                    currentNodeId={tree.currentNodeId}
                    onSelectMove={tree.goTo}
                    onDeleteMove={handleDeleteMove}
                    onAnnotateMove={handleAnnotateMove}
                  />
                </div>

                <AnnotationPanel
                  currentNode={tree.currentNode}
                  onUpdateAnnotation={tree.updateAnnotation}
                  focusToken={annotationFocusToken}
                />

                <div className="min-[980px]:col-span-2">
                  <EvalTrendChart
                    points={currentBranchPoints}
                    currentNodeId={tree.currentNodeId}
                    canAnalyze={analysisEngine.isEngineReady && tree.root.children.length > 0}
                    isAnalyzing={isGameAnalyzing}
                    progressText={
                      isGameAnalyzing
                        ? `${analysisProgress.done}/${analysisProgress.total}`
                        : null
                    }
                    analysisDepth={analysisDepth}
                    summary={currentBranchSummary}
                    qualityMarks={currentBranchQualities}
                    selectedFilter={selectedMoveQualityFilter}
                    onAnalysisDepthChange={setAnalysisDepth}
                    onSelectFilter={setSelectedMoveQualityFilter}
                    onSelectNode={tree.goTo}
                    onAnalyze={handleAnalyzeGame}
                  />
                </div>
              </div>
            )}

            {activeTab === 'pgn' && (
              <PgnPanel
                root={tree.root}
                headers={tree.headers}
                currentNode={tree.currentNode}
                nodeMap={tree.nodeMap}
                onLoadGame={tree.loadGame}
                onReset={handleRequestNewGame}
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-surface-700 bg-surface-800 px-4 py-2 font-mono text-[10px] text-surface-400">
            <span>
              {tree.currentNodeId === 'root'
                ? strings.app.startingPosition
                : `${tree.currentNode.san} · ply ${tree.currentNode.ply}`}
            </span>
            <span className="text-surface-500">{strings.app.statusBar}</span>
          </div>
        </aside>
      </main>

      <ConfirmDialog
        open={showDiscardDialog}
        title={strings.app.confirm.title}
        description={strings.app.confirm.description}
        cancelLabel={strings.app.confirm.cancel}
        confirmLabel={strings.app.confirm.discardAndContinue}
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />

      <ContactAuthorDialog
        open={showContactDialog}
        title={strings.app.contact.title}
        description={strings.app.contact.description}
        nameLabel={strings.app.contact.name}
        namePlaceholder={strings.app.contact.namePlaceholder}
        messageLabel={strings.app.contact.message}
        messagePlaceholder={strings.app.contact.messagePlaceholder}
        cancelLabel={strings.app.contact.cancel}
        sendLabel={strings.app.contact.send}
        emailLabel={strings.app.email}
        onCancel={() => setShowContactDialog(false)}
      />
    </div>
  );
}
