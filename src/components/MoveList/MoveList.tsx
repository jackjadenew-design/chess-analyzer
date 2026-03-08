/**
 * MoveList — renders the variation tree in Lichess-style nested format.
 *
 * Layout rules:
 *  - Mainline: "1. e4 e5 2. Nf3 Nc6 ..."  (pairs on one line)
 *  - Variations: indented blocks wrapped in subtle brackets
 *  - NAG symbols rendered inline after the move
 *  - Comments rendered as italic text below the move chip
 *  - Clicking any move navigates the board to that position
 *  - React.memo on MoveChip to prevent re-render cascades
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { MoveNode } from '../../types/chess.types';
import { formatNags, getNagColorClass } from '../../utils/nag';
import { useI18n } from '../../i18n';

interface MoveListProps {
  root: MoveNode;
  currentNodeId: string;
  onSelectMove: (nodeId: string) => void;
  onDeleteMove: (nodeId: string) => void;
  onAnnotateMove: (nodeId: string) => void;
}

const MoveList: React.FC<MoveListProps> = ({
  root,
  currentNodeId,
  onSelectMove,
  onDeleteMove,
  onAnnotateMove,
}) => {
  const { strings } = useI18n();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  // Auto-scroll active move into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentNodeId]);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) return;
      setContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  if (root.children.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-surface-400 text-sm font-mono">
        {strings.moveList.empty}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-relaxed select-none">
      <RenderVariation
        node={root.children[0]}
        currentNodeId={currentNodeId}
        onSelectMove={onSelectMove}
        onOpenContextMenu={(nodeId, event) => {
          onSelectMove(nodeId);
          setContextMenu({ nodeId, x: event.clientX, y: event.clientY });
        }}
        activeRef={activeRef}
        isTopLevel={true}
      />

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[180px] rounded-xl border border-surface-600 bg-surface-800 p-1.5 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setContextMenu(null);
              onAnnotateMove(contextMenu.nodeId);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-surface-200 transition-colors hover:bg-surface-700 hover:text-accent-400"
          >
            {strings.moveList.annotate}
          </button>
          <button
            onClick={() => {
              setContextMenu(null);
              onDeleteMove(contextMenu.nodeId);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            {strings.moveList.delete}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Variation renderer ───────────────────────────────────────────────────────

interface RenderVariationProps {
  node: MoveNode;
  currentNodeId: string;
  onSelectMove: (id: string) => void;
  onOpenContextMenu: (nodeId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  activeRef: React.MutableRefObject<HTMLButtonElement | null>;
  isTopLevel?: boolean;
  forceShowMoveNumber?: boolean;
}

const RenderVariation: React.FC<RenderVariationProps> = ({
  node,
  currentNodeId,
  onSelectMove,
  onOpenContextMenu,
  activeRef,
  isTopLevel = false,
  forceShowMoveNumber = false,
}) => {
  const elements: React.ReactNode[] = [];
  let current: MoveNode | null = node;
  let firstInLine = true;

  while (current) {
    const isWhite = current.ply % 2 === 1;
    const moveNum = Math.ceil(current.ply / 2);
    const isActive = current.id === currentNodeId;
    const nagText = current.nags ? formatNags(current.nags) : '';
    const nagColor = current.nags ? getNagColorClass(current.nags) : '';

    // Show move number for: white's moves, OR first move of a line if it's black's turn
    const showNumber = isWhite || firstInLine || forceShowMoveNumber;
    const ellipsis = !isWhite && (firstInLine || forceShowMoveNumber);

    elements.push(
      <span key={`${current.id}-wrapper`} className="inline">
        {/* Move number */}
        {showNumber && (
          <span className="text-surface-400 mr-0.5 text-xs">
            {moveNum}.{ellipsis ? '..' : ''}
          </span>
        )}

        {/* Move chip */}
        <MoveChip
          node={current}
          isActive={isActive}
          nagText={nagText}
          nagColor={nagColor}
          onClick={onSelectMove}
          onContextMenu={onOpenContextMenu}
          ref={isActive ? activeRef : undefined}
        />

        {/* Inline comment */}
        {current.comment && (
          <span className="text-surface-400 italic text-xs mx-1">
            {'{'}
            {current.comment}
            {'}'}
          </span>
        )}
      </span>
    );

    firstInLine = false;

    // Render variations (children[1+]) BEFORE continuing mainline
    if (current.children.length > 1) {
      for (let i = 1; i < current.children.length; i++) {
        elements.push(
          <VariationBlock key={`var-${current.children[i].id}`}>
            <RenderVariation
              node={current.children[i]}
              currentNodeId={currentNodeId}
              onSelectMove={onSelectMove}
              onOpenContextMenu={onOpenContextMenu}
              activeRef={activeRef}
              isTopLevel={false}
              forceShowMoveNumber={true}
            />
          </VariationBlock>
        );
      }
    }

    current = current.children[0] ?? null;
  }

  return (
    <div className={isTopLevel ? 'flex flex-wrap gap-y-1 items-baseline' : 'inline'}>
      {elements}
    </div>
  );
};

// ─── Variation block wrapper ──────────────────────────────────────────────────

const VariationBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block w-full mt-1 mb-1">
    <span
      className="inline-flex items-start gap-1 pl-2 border-l-2 border-surface-500 text-surface-300 text-[0.8rem] ml-1"
      style={{ flexWrap: 'wrap' }}
    >
      <span className="text-surface-500 font-mono text-xs leading-6">(</span>
      {children}
      <span className="text-surface-500 font-mono text-xs leading-6">)</span>
    </span>
  </span>
);

// ─── Move chip ────────────────────────────────────────────────────────────────

interface MoveChipProps {
  node: MoveNode;
  isActive: boolean;
  nagText: string;
  nagColor: string;
  onClick: (id: string) => void;
  onContextMenu: (id: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

const MoveChip = React.memo(
  React.forwardRef<HTMLButtonElement, MoveChipProps>(
    ({ node, isActive, nagText, nagColor, onClick, onContextMenu }, ref) => {
      const handleClick = useCallback(() => onClick(node.id), [onClick, node.id]);
      const handleContextMenu = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          onContextMenu(node.id, event);
        },
        [node.id, onContextMenu]
      );

      return (
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          className={[
            'inline-flex items-baseline gap-0.5 px-1.5 py-0.5 rounded text-sm font-mono transition-all duration-100',
            isActive
              ? 'bg-accent-500 text-surface-900 font-semibold shadow-md'
              : 'text-surface-50 hover:bg-surface-600 hover:text-accent-400',
          ].join(' ')}
        >
          <span>{node.san}</span>
          {nagText && (
            <span className={`text-[0.7rem] font-bold ${isActive ? 'text-surface-800' : nagColor}`}>
              {nagText}
            </span>
          )}
        </button>
      );
    }
  )
);

MoveChip.displayName = 'MoveChip';

export default React.memo(MoveList);
