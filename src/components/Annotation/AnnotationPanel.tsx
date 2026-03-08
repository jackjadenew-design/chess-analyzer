/**
 * AnnotationPanel — allows adding/editing text comments and NAG symbols
 * for the currently selected move.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Tag, Trash2, Save } from 'lucide-react';
import { MoveNode } from '../../types/chess.types';
import { ANNOTATION_BUTTONS, NAG_MAP, formatNags } from '../../utils/nag';
import { useI18n } from '../../i18n';

interface AnnotationPanelProps {
  currentNode: MoveNode;
  onUpdateAnnotation: (nodeId: string, updates: { comment?: string; nags?: string[] }) => void;
  focusToken?: number;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  currentNode,
  onUpdateAnnotation,
  focusToken = 0,
}) => {
  const { strings } = useI18n();
  const [comment, setComment] = useState(currentNode.comment ?? '');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const isRoot = currentNode.id === 'root';

  // Sync local comment state when switching nodes
  useEffect(() => {
    setComment(currentNode.comment ?? '');
  }, [currentNode.id, currentNode.comment]);

  useEffect(() => {
    if (isRoot) return;
    textareaRef.current?.focus();
  }, [focusToken, isRoot]);

  const handleSaveComment = useCallback(() => {
    if (isRoot) return;
    const trimmed = comment.trim();
    if (trimmed !== (currentNode.comment ?? '')) {
      onUpdateAnnotation(currentNode.id, { comment: trimmed || undefined });
    }
  }, [comment, currentNode.id, currentNode.comment, isRoot, onUpdateAnnotation]);

  const handleCommentKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSaveComment();
      }
    },
    [handleSaveComment]
  );

  const toggleNag = useCallback(
    (nag: string) => {
      if (isRoot) return;
      const current = currentNode.nags ?? [];
      const hasNag = current.includes(nag);
      // If adding a move-quality NAG ($1–$6), remove other move-quality NAGs first
      const moveQualityNags = ['$1', '$2', '$3', '$4', '$5', '$6'];
      let newNags: string[];
      if (hasNag) {
        newNags = current.filter((n) => n !== nag);
      } else if (moveQualityNags.includes(nag)) {
        newNags = [...current.filter((n) => !moveQualityNags.includes(n)), nag];
      } else {
        newNags = [...current, nag];
      }
      onUpdateAnnotation(currentNode.id, { nags: newNags.length > 0 ? newNags : undefined });
    },
    [currentNode.id, currentNode.nags, isRoot, onUpdateAnnotation]
  );

  const clearAll = useCallback(() => {
    setComment('');
    onUpdateAnnotation(currentNode.id, { comment: undefined, nags: undefined });
  }, [currentNode.id, onUpdateAnnotation]);

  const hasAnnotations = comment.trim() || (currentNode.nags && currentNode.nags.length > 0);
  const hasCommentChanges = comment.trim() !== (currentNode.comment ?? '');

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-surface-700 bg-surface-800/70 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-accent-500" />
          <span className="text-xs font-semibold tracking-wider text-surface-300 uppercase">
            {strings.annotation.title}
          </span>
        </div>
        {!isRoot && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveComment}
              disabled={!hasCommentChanges}
              title={strings.annotation.saveHint}
              className="flex items-center gap-1 rounded-lg border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[10px] font-semibold text-accent-400 transition-colors hover:bg-accent-500/20 disabled:cursor-not-allowed disabled:border-surface-600 disabled:bg-surface-700 disabled:text-surface-500"
            >
              <Save size={10} />
              {strings.annotation.save}
            </button>
            {hasAnnotations && (
              <button
                onClick={clearAll}
                className="text-[10px] flex items-center gap-1 text-surface-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={10} />
                {strings.annotation.clear}
              </button>
            )}
          </div>
        )}
      </div>

      {isRoot ? (
        <p className="text-xs text-surface-400 italic">{strings.annotation.selectMove}</p>
      ) : (
        <>
          {/* Current move label */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400">{strings.annotation.move}:</span>
            <span className="rounded bg-surface-700 px-2 py-0.5 font-mono text-sm font-semibold text-accent-400">
              {Math.ceil(currentNode.ply / 2)}.{currentNode.ply % 2 === 0 ? '..' : ''} {currentNode.san}
            </span>
            {currentNode.nags && currentNode.nags.length > 0 && (
              <span className="text-sm font-bold text-accent-500">
                {formatNags(currentNode.nags)}
              </span>
            )}
          </div>

          {/* NAG buttons */}
          <div>
            <div className="text-[10px] text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Tag size={9} />
              {strings.annotation.moveQuality}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {ANNOTATION_BUTTONS.map(({ nag, symbol, label }) => {
                const info = NAG_MAP[nag];
                const isActive = currentNode.nags?.includes(nag);
                return (
                  <button
                    key={nag}
                    onClick={() => toggleNag(nag)}
                    title={label}
                    className={[
                      'flex flex-col items-center justify-center py-1.5 rounded text-sm font-bold font-mono transition-all duration-100 border',
                      isActive
                        ? `${info?.colorClass ?? 'text-accent-500'} bg-surface-600 border-current shadow-sm`
                        : 'text-surface-300 border-surface-600 hover:border-surface-400 hover:bg-surface-600',
                    ].join(' ')}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment textarea */}
          <div>
            <div className="text-[10px] text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MessageSquare size={9} />
              {strings.annotation.comment}
            </div>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={handleSaveComment}
              onKeyDown={handleCommentKeyDown}
              placeholder={strings.annotation.placeholder}
              rows={3}
              className="w-full resize-none rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 font-sans text-sm text-surface-50 placeholder-surface-400 transition-colors focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/20"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(AnnotationPanel);
