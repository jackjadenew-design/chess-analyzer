/**
 * PgnPanel — handles PGN/FEN import and export.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Copy,
  FileText,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { MoveNode, GameHeaders } from '../../types/chess.types';
import { exportPgn, parsePgn, downloadPgn } from '../../utils/pgn';
import { useI18n } from '../../i18n';

interface PgnPanelProps {
  root: MoveNode;
  headers: GameHeaders;
  currentNode: MoveNode;
  nodeMap: Map<string, MoveNode>;
  onLoadGame: (root: MoveNode, headers: GameHeaders, nodeMap: Map<string, MoveNode>) => void;
  onReset: () => void;
}

const PgnPanel: React.FC<PgnPanelProps> = ({
  root,
  headers,
  currentNode,
  onLoadGame,
  onReset,
}) => {
  const { strings } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pgnInput, setPgnInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async () => {
    const pgn = pgnInput.trim();
    if (!pgn) {
      setImportError(strings.pgn.pastePgn);
      return;
    }
    setIsImporting(true);
    setImportError(null);
    try {
      const { root: newRoot, headers: newHeaders, nodeMap } = await parsePgn(pgn);
      onLoadGame(newRoot, newHeaders, nodeMap);
      setPgnInput('');
      setIsExpanded(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : strings.pgn.parseFailed);
    } finally {
      setIsImporting(false);
    }
  }, [pgnInput, onLoadGame]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = ev.target?.result as string;
        setPgnInput(text);
        setIsImporting(true);
        setImportError(null);
        try {
          const { root: newRoot, headers: newHeaders, nodeMap } = await parsePgn(text);
          onLoadGame(newRoot, newHeaders, nodeMap);
          setPgnInput('');
          setIsExpanded(false);
        } catch (err) {
          setImportError(err instanceof Error ? err.message : strings.pgn.parseFileFailed);
          setPgnInput(text);
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [onLoadGame]
  );

  const handleExportDownload = useCallback(() => {
    const pgn = exportPgn(root, headers);
    const white = headers.White ?? strings.pgn.white;
    const black = headers.Black ?? strings.pgn.black;
    downloadPgn(pgn, `${white}_vs_${black}.pgn`);
  }, [root, headers, strings.pgn.black, strings.pgn.white]);

  const handleCopyFen = useCallback(() => {
    navigator.clipboard.writeText(currentNode.fen).then(() => {
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    });
  }, [currentNode.fen]);

  const handleCopyPgn = useCallback(() => {
    const pgn = exportPgn(root, headers);
    navigator.clipboard.writeText(pgn).then(() => {
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    });
  }, [root, headers]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-accent-500" />
          <span className="text-xs font-semibold tracking-wider text-surface-300 uppercase">
            {strings.pgn.title}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-surface-400 transition-colors hover:text-accent-500"
        >
          {strings.pgn.import}
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Game header info */}
      {(headers.White || headers.Black) && (
        <div className="text-xs text-surface-400 font-mono bg-surface-800 rounded px-2.5 py-1.5">
          <span className="text-surface-100">{headers.White ?? '?'}</span>
          <span className="text-surface-500 mx-1.5">vs</span>
          <span className="text-surface-100">{headers.Black ?? '?'}</span>
          {headers.Result && (
            <span className="ml-2 font-semibold text-accent-500">{headers.Result}</span>
          )}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={copiedFen ? <Check size={13} /> : <Copy size={13} />}
          label={copiedFen ? strings.pgn.copied : strings.pgn.copyFen}
          onClick={handleCopyFen}
          active={copiedFen}
        />
        <ActionButton
          icon={copiedPgn ? <Check size={13} /> : <Copy size={13} />}
          label={copiedPgn ? strings.pgn.copied : strings.pgn.copyPgn}
          onClick={handleCopyPgn}
          active={copiedPgn}
        />
        <ActionButton
          icon={<Download size={13} />}
          label={strings.pgn.download}
          onClick={handleExportDownload}
        />
        <ActionButton
          icon={<RotateCcw size={13} />}
          label={strings.pgn.newGame}
          onClick={onReset}
          danger
        />
      </div>

      {/* Import panel (collapsible) */}
      {isExpanded && (
        <div className="flex flex-col gap-2 animate-slide-up">
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder={strings.pgn.importPlaceholder}
            rows={5}
            className="w-full resize-none rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-xs font-mono text-surface-50 placeholder-surface-500 transition-colors focus:border-accent-500/50 focus:outline-none"
          />
          {importError && (
            <p className="text-xs text-red-400 font-mono">{importError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={isImporting || !pgnInput.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-surface-900 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? strings.pgn.importing : strings.pgn.importPgn}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-surface-600 hover:bg-surface-500 text-surface-100 text-xs rounded-lg px-3 py-2 transition-colors"
            >
              <Upload size={13} />
              {strings.pgn.file}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Current FEN display */}
      <div
        className="text-[10px] font-mono text-surface-500 bg-surface-800 rounded px-2 py-1.5 break-all cursor-pointer hover:text-surface-300 transition-colors"
        onClick={handleCopyFen}
        title={strings.pgn.clickToCopyFen}
      >
        {currentNode.fen}
      </div>
    </div>
  );
};

// ─── Small action button ──────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, active, danger }) => (
  <button
    onClick={onClick}
    className={[
      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all',
      active
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : danger
        ? 'bg-surface-700 text-surface-300 hover:bg-red-500/20 hover:text-red-400 border border-surface-600'
        : 'border border-surface-600 bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-accent-500',
    ].join(' ')}
  >
    {icon}
    {label}
  </button>
);

export default React.memo(PgnPanel);
