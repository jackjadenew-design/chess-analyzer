import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Crown,
  ExternalLink,
  FlipVertical2,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';

import ThemeToggle from '../components/UI/ThemeToggle';
import { puzzleStarterPack } from '../data/puzzleStarterPack';
import { PuzzleRecord } from '../types/puzzle.types';
import { Theme } from '../types/chess.types';

type Language = 'zh' | 'en';
type RatingFilter = 'all' | 'beginner' | 'club' | 'advanced';
type SideFilter = 'all' | 'white' | 'black';

const LANGUAGE_KEY = 'language';
const THEME_KEY = 'puzzles-theme';
const PROGRESS_KEY = 'puzzle-progress-v1';

type PuzzleProgress = {
  solvedIds: string[];
  streak: number;
  bestStreak: number;
};

const defaultProgress: PuzzleProgress = {
  solvedIds: [],
  streak: 0,
  bestStreak: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readProgress(): PuzzleProgress {
  if (typeof window === 'undefined') return defaultProgress;
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress;
    const parsed = JSON.parse(raw) as PuzzleProgress;
    return {
      solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds : [],
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
    };
  } catch {
    return defaultProgress;
  }
}

function ratingBandForPuzzle(puzzle: PuzzleRecord): RatingFilter {
  if (puzzle.rating < 700) return 'beginner';
  if (puzzle.rating < 1050) return 'club';
  return 'advanced';
}

function applyUciMove(chess: Chess, uci: string) {
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
  });
}

function buildSolutionLine(fen: string, moves: string[]): string[] {
  const chess = new Chess(fen);
  const line: string[] = [];

  moves.forEach((uci, index) => {
    const move = applyUciMove(chess, uci);
    if (!move) return;
    const prefix =
      index % 2 === 0
        ? `${Math.ceil((chess.history().length) / 2)}.`
        : `${Math.ceil((chess.history().length) / 2)}...`;
    line.push(`${prefix} ${move.san}`);
  });

  return line;
}

const textMap = {
  zh: {
    title: 'Puzzles',
    subtitle: '独立训练页，题库结构已按公开 puzzle pack 预留，可继续扩展为 Lichess 分块题库。',
    openAnalyzer: '打开分析器',
    starterPack: 'Starter Pack',
    puzzleCount: '题数',
    solved: '已解',
    streak: '连对',
    bestStreak: '最佳连对',
    filters: '筛选',
    theme: '主题',
    side: '先手方',
    rating: '难度',
    kidsMode: '儿童模式',
    kidsModeHint: '保留基础将杀与儿童友好的残局题型。',
    all: '全部',
    white: '白方',
    black: '黑方',
    beginner: '入门',
    club: '进阶',
    advanced: '挑战',
    nextRandom: '下一题',
    reset: '重置',
    showHint: '提示',
    showLine: '显示解答',
    correct: '正确，继续算下去。',
    solvedText: '解答完成。',
    wrong: '这步不对，先看强制将军和封锁逃跑格。',
    hiddenLine: '解答会在完成或点击“显示解答”后出现。',
    trainingBoard: '训练棋盘',
    puzzleList: '题库列表',
    learningFocus: '教学重点',
    solutionLine: '解答主线',
    source: '来源',
    starterNote:
      '这一版先内置了一个可直接上线的 starter pack。后续只要按同样的数据结构继续分块导入，就可以无缝扩充为大题库。',
    themes: {
      mateIn1: '一手将杀',
      mateIn2: '两手将杀',
      queenMate: '后终结',
      rookMate: '车终结',
      checkmate: '将杀网',
      endgame: '残局',
      kidFriendly: '儿童友好',
    },
  },
  en: {
    title: 'Puzzles',
    subtitle:
      'Dedicated training page with a starter pack now, and a data shape ready for future Lichess-style puzzle shards.',
    openAnalyzer: 'Open Analyzer',
    starterPack: 'Starter Pack',
    puzzleCount: 'Puzzles',
    solved: 'Solved',
    streak: 'Streak',
    bestStreak: 'Best streak',
    filters: 'Filters',
    theme: 'Theme',
    side: 'Side to move',
    rating: 'Difficulty',
    kidsMode: 'Kids mode',
    kidsModeHint: 'Keep only basic mates and child-friendly endgame patterns.',
    all: 'All',
    white: 'White',
    black: 'Black',
    beginner: 'Beginner',
    club: 'Club',
    advanced: 'Advanced',
    nextRandom: 'Next puzzle',
    reset: 'Reset',
    showHint: 'Hint',
    showLine: 'Reveal line',
    correct: 'Correct. Keep calculating.',
    solvedText: 'Puzzle solved.',
    wrong: 'That is not the move. Start with forcing checks and king squares.',
    hiddenLine: 'The line appears after solving or when you reveal it.',
    trainingBoard: 'Training Board',
    puzzleList: 'Puzzle List',
    learningFocus: 'Teaching Focus',
    solutionLine: 'Solution line',
    source: 'Source',
    starterNote:
      'This page ships with a starter pack first. You can later scale it by adding more puzzle shards in the same format.',
    themes: {
      mateIn1: 'Mate in 1',
      mateIn2: 'Mate in 2',
      queenMate: 'Queen Net',
      rookMate: 'Rook Net',
      checkmate: 'Mate Net',
      endgame: 'Endgame',
      kidFriendly: 'Kid Friendly',
    },
  },
} as const;

function TeachingFocus({
  puzzle,
  language,
}: {
  puzzle: PuzzleRecord;
  language: Language;
}) {
  const notes = language === 'zh'
    ? [
        puzzle.themes.includes('mateIn1')
          ? '先看所有将军。儿童训练里，一手将杀最适合培养“先看强制着”的习惯。'
          : '先找 forcing check，再看王被逼到哪里。两手将杀重点不是算很长，而是先看唯一安全格。',
        puzzle.themes.includes('queenMate')
          ? '后往往负责封锁长对角线和横线，别只盯着“将军”，要看逃跑格有没有彻底封死。'
          : '车的价值在于切断整排整列。先把国王的活动范围切小，再完成最后一击。',
        puzzle.lesson,
      ]
    : [
        puzzle.themes.includes('mateIn1')
          ? 'Start with every forcing check. For kids, mate-in-1 puzzles build the habit of checking forcing moves first.'
          : 'Look for the forcing check first, then ask where the king is forced to go. Mate in 2 is about clean forcing logic, not long calculation.',
        puzzle.themes.includes('queenMate')
          ? 'The queen usually closes long diagonals and files at once. Do not only look at the check; count the escape squares.'
          : 'The rook wins by cutting the king off rank by rank or file by file. Shrink the box, then finish the net.',
        puzzle.lesson,
      ];

  return (
    <div className="space-y-2 rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
      {notes.map((note) => (
        <p key={note} className="text-sm leading-6 text-surface-200">
          {note}
        </p>
      ))}
    </div>
  );
}

export default function PuzzlesApp() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'zh';
    return (window.localStorage.getItem(LANGUAGE_KEY) as Language | null) ?? 'zh';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (window.localStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark';
  });
  const [progress, setProgress] = useState<PuzzleProgress>(() => readProgress());
  const [themeFilter, setThemeFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [kidsMode, setKidsMode] = useState(false);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(puzzleStarterPack[0]?.id ?? '');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [boardFen, setBoardFen] = useState(puzzleStarterPack[0]?.fen ?? new Chess().fen());
  const [stepIndex, setStepIndex] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const [status, setStatus] = useState<'ready' | 'wrong' | 'solved'>('ready');
  const [mistakeCommitted, setMistakeCommitted] = useState(false);

  const text = textMap[language];
  const analyzerUrl = `${import.meta.env.BASE_URL}`;

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const availableThemes = useMemo(() => {
    const allThemes = new Set<string>();
    puzzleStarterPack.forEach((puzzle) => {
      puzzle.themes.forEach((themeName) => allThemes.add(themeName));
    });
    return Array.from(allThemes);
  }, []);

  const filteredPuzzles = useMemo(() => {
    return puzzleStarterPack.filter((puzzle) => {
      if (themeFilter !== 'all' && !puzzle.themes.includes(themeFilter)) return false;
      if (sideFilter !== 'all' && puzzle.sideToMove !== sideFilter) return false;
      if (ratingFilter !== 'all' && ratingBandForPuzzle(puzzle) !== ratingFilter) return false;
      if (kidsMode && !puzzle.themes.includes('kidFriendly')) return false;
      return true;
    });
  }, [kidsMode, ratingFilter, sideFilter, themeFilter]);

  const currentPuzzle =
    filteredPuzzles.find((puzzle) => puzzle.id === currentPuzzleId) ?? filteredPuzzles[0] ?? null;

  const resetPuzzle = useCallback((puzzle: PuzzleRecord | null) => {
    if (!puzzle) return;
    setBoardFen(puzzle.fen);
    setStepIndex(0);
    setSelectedSquare(null);
    setShowHint(false);
    setShowLine(false);
    setStatus('ready');
    setFeedback(null);
    setMistakeCommitted(false);
    setOrientation(puzzle.sideToMove);
  }, []);

  useEffect(() => {
    if (!currentPuzzle) return;
    if (!filteredPuzzles.some((puzzle) => puzzle.id === currentPuzzle.id)) {
      setCurrentPuzzleId(filteredPuzzles[0]?.id ?? '');
    }
    resetPuzzle(currentPuzzle);
  }, [currentPuzzleId, filteredPuzzles, resetPuzzle, currentPuzzle]);

  const expectedMove = currentPuzzle?.moves[stepIndex] ?? null;

  const legalMoveHighlights = useMemo(() => {
    if (!selectedSquare) return {};
    const chess = new Chess(boardFen);
    const highlights: Record<string, { background: string }> = {
      [selectedSquare]: { background: 'rgba(240, 165, 0, 0.4)' },
    };

    chess.moves({ square: selectedSquare as Square, verbose: true }).forEach((move) => {
      highlights[move.to] = {
        background: move.captured
          ? 'radial-gradient(circle, rgba(240,165,0,0) 55%, rgba(240,165,0,0.55) 55%)'
          : 'radial-gradient(circle, rgba(240,165,0,0.45) 28%, transparent 28%)',
      };
    });

    if (showHint && expectedMove) {
      highlights[expectedMove.slice(0, 2)] = {
        background: 'rgba(94, 234, 212, 0.38)',
      };
    }

    return highlights;
  }, [boardFen, expectedMove, selectedSquare, showHint]);

  const solutionLine = useMemo(
    () => (currentPuzzle ? buildSolutionLine(currentPuzzle.fen, currentPuzzle.moves) : []),
    [currentPuzzle]
  );

  const handlePuzzleSolved = useCallback(() => {
    if (!currentPuzzle) return;
    setStatus('solved');
    setFeedback(text.solvedText);
    setShowLine(true);

    setProgress((current) => {
      const solvedIds = current.solvedIds.includes(currentPuzzle.id)
        ? current.solvedIds
        : [...current.solvedIds, currentPuzzle.id];
      const nextStreak = mistakeCommitted ? 0 : current.streak + 1;

      return {
        solvedIds,
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
      };
    });
  }, [currentPuzzle, mistakeCommitted, text.solvedText]);

  const applyRepliesUntilPlayerTurn = useCallback(
    (chess: Chess, nextStepIndex: number, puzzle: PuzzleRecord) => {
      let step = nextStepIndex;
      while (step < puzzle.moves.length && chess.turn() !== puzzle.fen.split(' ')[1]) {
        const reply = applyUciMove(chess, puzzle.moves[step]);
        if (!reply) break;
        step += 1;
      }
      return step;
    },
    []
  );

  const handleAttemptMove = useCallback(
    (from: string, to: string) => {
      if (!currentPuzzle || !expectedMove) return false;

      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      if (from !== expectedFrom || to !== expectedTo) {
        setStatus('wrong');
        setFeedback(text.wrong);
        setShowHint(false);
        setMistakeCommitted(true);
        setProgress((current) => ({ ...current, streak: 0 }));
        return false;
      }

      const chess = new Chess(boardFen);
      const move = applyUciMove(chess, expectedMove);
      if (!move) return false;

      let nextStep = stepIndex + 1;
      nextStep = applyRepliesUntilPlayerTurn(chess, nextStep, currentPuzzle);

      setBoardFen(chess.fen());
      setSelectedSquare(null);
      setStatus('ready');
      setFeedback(text.correct);
      setShowHint(false);
      setStepIndex(nextStep);

      if (nextStep >= currentPuzzle.moves.length) {
        handlePuzzleSolved();
      }

      return true;
    },
    [
      applyRepliesUntilPlayerTurn,
      boardFen,
      currentPuzzle,
      expectedMove,
      handlePuzzleSolved,
      stepIndex,
      text.correct,
      text.wrong,
    ]
  );

  const onSquareClick = useCallback(
    (square: string) => {
      const chess = new Chess(boardFen);
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }
        const succeeded = handleAttemptMove(selectedSquare, square);
        if (!succeeded) {
          const piece = chess.get(square as Square);
          if (piece && piece.color === chess.turn()) {
            setSelectedSquare(square);
          } else {
            setSelectedSquare(null);
          }
        }
        return;
      }

      const piece = chess.get(square as Square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
    },
    [boardFen, handleAttemptMove, selectedSquare]
  );

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => handleAttemptMove(sourceSquare, targetSquare),
    [handleAttemptMove]
  );

  const jumpToRandomPuzzle = useCallback(() => {
    if (!filteredPuzzles.length) return;
    const unsolved = filteredPuzzles.filter((puzzle) => !progress.solvedIds.includes(puzzle.id));
    const pool = unsolved.length ? unsolved : filteredPuzzles;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPuzzleId(next.id);
  }, [filteredPuzzles, progress.solvedIds]);

  const statusTone =
    status === 'solved'
      ? 'border-green-400/30 bg-green-400/10 text-green-300'
      : status === 'wrong'
      ? 'border-red-400/30 bg-red-400/10 text-red-300'
      : 'border-surface-700 bg-surface-800/70 text-surface-300';

  return (
    <div className={`min-h-screen bg-surface-900 text-surface-50 ${theme}`}>
      <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center border-b border-surface-700 bg-surface-800/80 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <a
            href={analyzerUrl}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-surface-600 px-3 text-xs font-semibold text-surface-300 transition-colors hover:border-accent-400/40 hover:text-accent-400"
          >
            <ArrowLeft size={14} />
            {text.openAnalyzer}
          </a>
        </div>

        <div className="justify-self-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-accent-500" />
              <span className="font-display text-lg font-semibold tracking-wide text-accent-500">
                {text.title}
              </span>
            </div>
            <span className="rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[10px] font-mono text-accent-500">
              {text.starterPack}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setLanguage((current) => (current === 'zh' ? 'en' : 'zh'))}
            className="rounded-lg border border-surface-600 px-3 py-2 text-xs font-semibold text-surface-300 transition-colors hover:border-accent-400/40 hover:text-accent-400"
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1600px] flex-col gap-4 p-4 xl:grid xl:grid-cols-[300px_minmax(0,1fr)_360px] xl:gap-4">
        <section className="space-y-4">
          <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
                  {text.starterPack}
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold text-surface-50">
                  {text.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-surface-300">{text.subtitle}</p>
              </div>
              <Brain className="shrink-0 text-accent-500" size={22} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label={text.puzzleCount} value={String(filteredPuzzles.length)} icon={<Target size={14} />} />
            <StatCard label={text.solved} value={String(progress.solvedIds.length)} icon={<CheckCircle2 size={14} />} />
            <StatCard label={text.bestStreak} value={String(progress.bestStreak)} icon={<Trophy size={14} />} />
          </div>

          <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
                {text.filters}
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-surface-300">
                <input
                  type="checkbox"
                  checked={kidsMode}
                  onChange={(event) => setKidsMode(event.target.checked)}
                  className="h-4 w-4 rounded border-surface-500 bg-surface-900 text-accent-500"
                />
                <span>{text.kidsMode}</span>
              </label>
            </div>
            <p className="mb-3 text-xs leading-5 text-surface-400">{text.kidsModeHint}</p>

            <FilterGroup title={text.theme}>
              <FilterChip active={themeFilter === 'all'} onClick={() => setThemeFilter('all')}>
                {text.all}
              </FilterChip>
              {availableThemes.map((themeName) => (
                <FilterChip
                  key={themeName}
                  active={themeFilter === themeName}
                  onClick={() => setThemeFilter(themeName)}
                >
                  {text.themes[themeName as keyof typeof text.themes] ?? themeName}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title={text.side}>
              {([
                ['all', text.all],
                ['white', text.white],
                ['black', text.black],
              ] as const).map(([value, label]) => (
                <FilterChip
                  key={value}
                  active={sideFilter === value}
                  onClick={() => setSideFilter(value)}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title={text.rating}>
              {([
                ['all', text.all],
                ['beginner', text.beginner],
                ['club', text.club],
                ['advanced', text.advanced],
              ] as const).map(([value, label]) => (
                <FilterChip
                  key={value}
                  active={ratingFilter === value}
                  onClick={() => setRatingFilter(value)}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterGroup>
          </div>

          <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4 text-sm leading-6 text-surface-300">
            <div className="mb-2 flex items-center gap-2 text-accent-400">
              <GraduationCap size={15} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{text.learningFocus}</span>
            </div>
            {text.starterNote}
          </div>
        </section>

        <section className="space-y-4">
          {currentPuzzle ? (
            <>
              <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
                      {text.trainingBoard}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-surface-50">{currentPuzzle.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentPuzzle.themes.map((themeName) => (
                        <span
                          key={themeName}
                          className="rounded-full border border-surface-600 px-2.5 py-1 text-[11px] font-medium text-surface-300"
                        >
                          {text.themes[themeName as keyof typeof text.themes] ?? themeName}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-surface-400">Elo</div>
                    <div className="font-mono text-2xl font-semibold text-accent-400">
                      {currentPuzzle.rating}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 xl:flex-row">
                  <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
                    <div className="flex items-center justify-between rounded-xl bg-surface-700 px-4 py-3">
                      <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
                        {feedback ?? `${text.side}: ${currentPuzzle.sideToMove === 'white' ? text.white : text.black}`}
                      </div>
                      <button
                        onClick={() =>
                          setOrientation((current) => (current === 'white' ? 'black' : 'white'))
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-surface-300 transition-colors hover:bg-surface-600 hover:text-accent-400"
                      >
                        <FlipVertical2 size={18} />
                      </button>
                    </div>

                    <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-surface-700 bg-surface-900/80 p-3">
                      <Chessboard
                        id="puzzle-board"
                        position={boardFen}
                        boardOrientation={orientation}
                        onSquareClick={(square) => onSquareClick(square)}
                        onPieceDrop={onPieceDrop}
                        customSquareStyles={legalMoveHighlights}
                        customBoardStyle={{
                          borderRadius: '6px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}
                        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                        animationDuration={150}
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                      <ActionButton onClick={jumpToRandomPuzzle} icon={<Shuffle size={15} />}>
                        {text.nextRandom}
                      </ActionButton>
                      <ActionButton onClick={() => resetPuzzle(currentPuzzle)} icon={<RotateCcw size={15} />}>
                        {text.reset}
                      </ActionButton>
                      <ActionButton onClick={() => setShowHint(true)} icon={<Lightbulb size={15} />}>
                        {text.showHint}
                      </ActionButton>
                      <ActionButton onClick={() => setShowLine(true)} icon={<ExternalLink size={15} />}>
                        {text.showLine}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </div>

              <TeachingFocus puzzle={currentPuzzle} language={language} />
            </>
          ) : (
            <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-6 text-sm text-surface-300">
              No puzzles match the current filters.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
                {text.solutionLine}
              </div>
              {currentPuzzle && (
                <div className="text-xs text-surface-400">
                  {text.source}: {currentPuzzle.source}
                </div>
              )}
            </div>
            {showLine ? (
              <div className="space-y-2 font-mono text-sm text-surface-100">
                {solutionLine.map((entry) => (
                  <div key={entry} className="rounded-lg border border-surface-700 bg-surface-900/70 px-3 py-2">
                    {entry}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-surface-700 px-3 py-4 text-sm text-surface-400">
                {text.hiddenLine}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-surface-300">
              <Brain size={14} />
              {text.puzzleList}
            </div>
            <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {filteredPuzzles.map((puzzle) => {
                const solved = progress.solvedIds.includes(puzzle.id);
                return (
                  <button
                    key={puzzle.id}
                    type="button"
                    onClick={() => setCurrentPuzzleId(puzzle.id)}
                    className={[
                      'w-full rounded-xl border p-3 text-left transition-colors',
                      currentPuzzle?.id === puzzle.id
                        ? 'border-accent-500/40 bg-accent-500/10'
                        : 'border-surface-700 bg-surface-900/70 hover:border-accent-400/30 hover:bg-surface-800/80',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-surface-50">{puzzle.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {puzzle.themes.slice(0, 3).map((themeName) => (
                            <span
                              key={themeName}
                              className="rounded-full border border-surface-700 px-2 py-0.5 text-[10px] text-surface-400"
                            >
                              {text.themes[themeName as keyof typeof text.themes] ?? themeName}
                            </span>
                          ))}
                        </div>
                      </div>
                      {solved ? (
                        <CheckCircle2 className="shrink-0 text-green-400" size={16} />
                      ) : (
                        <XCircle className="shrink-0 text-surface-600" size={16} />
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-surface-400">
                      <span>{puzzle.sideToMove === 'white' ? text.white : text.black}</span>
                      <span className="font-mono">{puzzle.rating}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-surface-700 bg-surface-800/70 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-surface-400">
        {icon}
        {label}
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold text-accent-400">{value}</div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-surface-400">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-accent-500/40 bg-accent-500/12 text-accent-400'
          : 'border-surface-600 bg-surface-900/80 text-surface-300 hover:border-accent-400/30 hover:text-accent-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-600 bg-surface-800 px-3 py-2 text-sm font-semibold text-surface-100 transition-colors hover:border-accent-400/40 hover:text-accent-400"
    >
      {icon}
      {children}
    </button>
  );
}
