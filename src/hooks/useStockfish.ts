import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EngineEval, EngineVersion, PvLine } from '../types/chess.types';

interface UseStockfishOptions {
  enabled?: boolean;
  depth?: number;
  multiPV?: number;
  engineVersion?: EngineVersion;
  debounceMs?: number;
}

interface ParsedPvLine extends PvLine {
  multipv: number;
  score: number | null;
  mate: number | null;
}

const DEFAULT_EVAL: EngineEval = {
  score: null,
  mate: null,
  depth: 0,
  bestMove: null,
  pvLines: [],
  isRunning: false,
  engineError: false,
};

const BASE_URL = import.meta.env.BASE_URL;

const ENGINE_WORKERS: Record<
  EngineVersion,
  { script: string; wasm?: string }
> = {
  stockfish16: {
    script: `${BASE_URL}engines/stockfish16/stockfish-nnue-16-single.js`,
  },
  stockfish18: {
    script: `${BASE_URL}stockfish/stockfish-18-lite-single.js`,
    wasm: `${BASE_URL}stockfish/stockfish-18-lite-single.wasm`,
  },
};

function getWorkerUrl(engineVersion: EngineVersion): string {
  const config = ENGINE_WORKERS[engineVersion];
  if (!config.wasm || typeof window === 'undefined') {
    return config.script;
  }

  const scriptUrl = new URL(config.script, window.location.origin);
  const wasmUrl = new URL(config.wasm, window.location.origin);
  scriptUrl.hash = `${encodeURIComponent(wasmUrl.toString())},worker`;

  return scriptUrl.toString();
}

function toWhitePerspective(value: number, isWhiteTurn: boolean): number {
  return isWhiteTurn ? value : -value;
}

function parseInfoLine(line: string, isWhiteTurn: boolean): ParsedPvLine | null {
  if (!line.startsWith('info') || line.includes(' string ')) return null;

  const parts = line.trim().split(/\s+/);
  const pvIndex = parts.indexOf('pv');
  if (pvIndex === -1) return null;

  const multipvIndex = parts.indexOf('multipv');
  const multipv =
    multipvIndex !== -1 ? parseInt(parts[multipvIndex + 1] ?? '1', 10) || 1 : 1;

  const scoreIndex = parts.indexOf('score');
  let score: number | null = null;
  let mate: number | null = null;

  if (scoreIndex !== -1) {
    const scoreType = parts[scoreIndex + 1];
    const rawValue = parseInt(parts[scoreIndex + 2] ?? '0', 10);

    if (scoreType === 'cp' && Number.isFinite(rawValue)) {
      score = toWhitePerspective(rawValue, isWhiteTurn);
    }

    if (scoreType === 'mate' && Number.isFinite(rawValue)) {
      mate = toWhitePerspective(rawValue, isWhiteTurn);
    }
  }

  return {
    moves: parts.slice(pvIndex + 1),
    multipv,
    score,
    mate,
  };
}

function parseDepth(line: string): number {
  const parts = line.trim().split(/\s+/);
  const depthIndex = parts.indexOf('depth');
  if (depthIndex === -1) return 0;

  const depth = parseInt(parts[depthIndex + 1] ?? '0', 10);
  return Number.isFinite(depth) ? depth : 0;
}

function buildEvalData(
  lines: ParsedPvLine[],
  depth: number,
  bestMove: string | null,
  isRunning: boolean,
  hasError: boolean
): EngineEval {
  const topLine = lines[0];

  return {
    score: topLine?.mate !== null ? null : (topLine?.score ?? null),
    mate: topLine?.mate ?? null,
    depth,
    bestMove,
    pvLines: lines.map(({ moves }) => ({ moves })),
    isRunning,
    engineError: hasError,
  };
}

export function useStockfish(options: UseStockfishOptions = {}) {
  const {
    enabled = true,
    depth: initialDepth = 18,
    multiPV = 3,
    engineVersion = 'stockfish16',
    debounceMs = 300,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastFenRef = useRef<string | null>(null);
  const turnRef = useRef(true);
  const linesRef = useRef<ParsedPvLine[]>([]);
  const depthRef = useRef(0);
  const bestMoveRef = useRef<string | null>(null);
  const multiPvRef = useRef(multiPV);
  const searchDepthRef = useRef(initialDepth);

  const [depth, setDepth] = useState(initialDepth);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<EngineEval>(DEFAULT_EVAL);

  const postCommand = useCallback((command: string) => {
    workerRef.current?.postMessage(command);
  }, []);

  useEffect(() => {
    multiPvRef.current = multiPV;
  }, [multiPV]);

  useEffect(() => {
    searchDepthRef.current = depth;
  }, [depth]);

  useEffect(() => {
    if (!enabled) {
      setIsEngineReady(false);
      setEngineError(null);
      setEvalData(DEFAULT_EVAL);
      return;
    }

    let worker: Worker;

    setIsEngineReady(false);
    setEngineError(null);
    setEvalData(DEFAULT_EVAL);

    try {
      worker = new Worker(getWorkerUrl(engineVersion));
    } catch (error) {
      setEngineError(
        error instanceof Error ? error.message : 'Failed to create Stockfish worker.'
      );
      setEvalData((current) => ({ ...current, engineError: true }));
      return;
    }

    const handleOutput = (line: string) => {
      if (line === 'uciok') {
        postCommand(`setoption name MultiPV value ${multiPvRef.current}`);
        postCommand('isready');
        return;
      }

      if (line === 'readyok') {
        setIsEngineReady(true);
        setEngineError(null);
        setEvalData((current) => ({ ...current, engineError: false }));

        if (lastFenRef.current) {
          postCommand(`position fen ${lastFenRef.current}`);
          postCommand(`go depth ${searchDepthRef.current}`);
          setEvalData((current) => ({ ...current, isRunning: true }));
        }
        return;
      }

      if (line.startsWith('info ')) {
        const parsed = parseInfoLine(line, turnRef.current);
        if (!parsed) return;

        const nextDepth = parseDepth(line);
        depthRef.current = Math.max(depthRef.current, nextDepth);

        const nextLines = [...linesRef.current];
        const existingIndex = nextLines.findIndex((entry) => entry.multipv === parsed.multipv);
        if (existingIndex === -1) {
          nextLines.push(parsed);
        } else {
          nextLines[existingIndex] = parsed;
        }
        nextLines.sort((a, b) => a.multipv - b.multipv);
        linesRef.current = nextLines;

        setEvalData(
          buildEvalData(nextLines, depthRef.current, bestMoveRef.current, true, false)
        );
        return;
      }

      if (line.startsWith('bestmove')) {
        bestMoveRef.current = line.split(/\s+/)[1] ?? null;
        setEvalData(
          buildEvalData(linesRef.current, depthRef.current, bestMoveRef.current, false, false)
        );
      }
    };

    worker.onmessage = ({ data }: MessageEvent<string>) => {
      if (typeof data !== 'string') return;
      handleOutput(data);
    };

    worker.onerror = (event) => {
      const details =
        [event.message, event.filename, event.lineno ? `line ${event.lineno}` : null]
          .filter(Boolean)
          .join(' · ') || 'Stockfish worker crashed.';
      setEngineError(details);
      setIsEngineReady(false);
      setEvalData((current) => ({ ...current, isRunning: false, engineError: true }));
    };

    workerRef.current = worker;
    worker.postMessage('uci');

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      worker.postMessage('quit');
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled, engineVersion, postCommand]);

  useEffect(() => {
    if (!enabled || !isEngineReady) return;
    postCommand('setoption name UCI_AnalyseMode value true');
    postCommand(`setoption name MultiPV value ${multiPV}`);
  }, [enabled, isEngineReady, multiPV, postCommand]);

  const stop = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    postCommand('stop');
    setEvalData((current) => ({ ...current, isRunning: false }));
  }, [postCommand]);

  const analyzePosition = useCallback(
    (fen: string, depthOverride?: number) => {
      if (!enabled) return;

      lastFenRef.current = fen;
      turnRef.current = fen.split(' ')[1] === 'w';

      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }

      const runSearch = () => {
        bestMoveRef.current = null;
        depthRef.current = 0;
        linesRef.current = [];

        if (!isEngineReady) {
          setEvalData({
            ...DEFAULT_EVAL,
            depth: 0,
            isRunning: false,
            engineError: Boolean(engineError),
          });
          return;
        }

        postCommand('stop');
        postCommand(`position fen ${fen}`);
        postCommand(`go depth ${depthOverride ?? depth}`);

        setEvalData({
          ...DEFAULT_EVAL,
          depth: 0,
          isRunning: true,
          engineError: false,
        });
      };

      if (debounceMs <= 0) {
        runSearch();
        return;
      }

      debounceRef.current = window.setTimeout(runSearch, debounceMs);
    },
    [debounceMs, depth, enabled, engineError, isEngineReady, postCommand]
  );

  const api = useMemo(
    () => ({
      depth,
      evalData,
      isEngineReady,
      engineError,
      setDepth,
      analyzePosition,
      stop,
    }),
    [analyzePosition, depth, engineError, evalData, isEngineReady, stop]
  );

  return api;
}
