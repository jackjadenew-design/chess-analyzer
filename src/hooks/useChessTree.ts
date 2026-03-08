/**
 * useChessTree — manages the variation tree state.
 *
 * Responsibilities:
 *  - Hold the MoveNode tree (root) and the nodeMap (O(1) lookups).
 *  - Track the "current node" pointer (which position is on the board).
 *  - Expose mutation methods: addMove, updateAnnotation, deleteVariation, etc.
 *  - Expose navigation methods: goTo, goForward, goBack, goStart, goEnd.
 *
 * This hook is intentionally decoupled from chess.js — callers supply
 * pre-validated san + fen from useChessGame.
 */

import { useReducer, useCallback } from 'react';
import { MoveNode, GameHeaders } from '../types/chess.types';
import {
  createRootNode,
  buildNodeMap,
  addMove as treeAddMove,
  updateNodeAnnotation,
  deleteNode,
  promoteVariation,
  getPrevNodeId,
  getNextNodeId,
  getFirstNodeId,
  getLastNodeId,
  STARTING_FEN,
} from '../utils/tree';

// ─── State & Actions ─────────────────────────────────────────────────────────

interface TreeState {
  root: MoveNode;
  nodeMap: Map<string, MoveNode>;
  currentNodeId: string;
  headers: GameHeaders;
}

type TreeAction =
  | { type: 'ADD_MOVE'; payload: { parentId: string; san: string; fen: string; ply: number } }
  | { type: 'GO_TO'; payload: { nodeId: string } }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'GO_START' }
  | { type: 'GO_END' }
  | { type: 'UPDATE_HEADERS'; payload: { updates: Partial<GameHeaders> } }
  | { type: 'UPDATE_ANNOTATION'; payload: { nodeId: string; comment?: string; nags?: string[] } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'PROMOTE_VARIATION'; payload: { parentId: string; variationIndex: number } }
  | { type: 'LOAD_GAME'; payload: { root: MoveNode; headers: GameHeaders; nodeMap: Map<string, MoveNode> } }
  | { type: 'RESET' };

function createInitialState(): TreeState {
  const root = createRootNode(STARTING_FEN);
  return {
    root,
    nodeMap: buildNodeMap(root),
    currentNodeId: 'root',
    headers: {
      Event: 'Analysis',
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Result: '*',
    },
  };
}

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'ADD_MOVE': {
      const { parentId, san, fen, ply } = action.payload;
      const { newRoot, newNodeId, nodeMap } = treeAddMove(
        state.root,
        state.nodeMap,
        parentId,
        san,
        fen,
        ply
      );
      return { ...state, root: newRoot, nodeMap, currentNodeId: newNodeId };
    }

    case 'GO_TO':
      return { ...state, currentNodeId: action.payload.nodeId };

    case 'GO_BACK':
      return { ...state, currentNodeId: getPrevNodeId(state.nodeMap, state.currentNodeId) };

    case 'GO_FORWARD':
      return { ...state, currentNodeId: getNextNodeId(state.nodeMap, state.currentNodeId) };

    case 'GO_START':
      return { ...state, currentNodeId: getFirstNodeId() };

    case 'GO_END':
      return { ...state, currentNodeId: getLastNodeId(state.nodeMap, state.currentNodeId) };

    case 'UPDATE_HEADERS': {
      const nextHeaders = { ...state.headers };
      for (const [key, value] of Object.entries(action.payload.updates)) {
        if (value == null || value.trim() === '') {
          delete nextHeaders[key];
        } else {
          nextHeaders[key] = value;
        }
      }
      return { ...state, headers: nextHeaders };
    }

    case 'UPDATE_ANNOTATION': {
      const { nodeId, ...updates } = action.payload;
      const newRoot = updateNodeAnnotation(state.root, nodeId, updates);
      return { ...state, root: newRoot, nodeMap: buildNodeMap(newRoot) };
    }

    case 'DELETE_NODE': {
      const { nodeId } = action.payload;
      // If we're deleting the current node, navigate to parent first
      const currentNode = state.nodeMap.get(state.currentNodeId);
      const targetNode = state.nodeMap.get(nodeId);
      const isAncestorOfCurrent =
        currentNode && targetNode
          ? isAncestor(state.nodeMap, nodeId, state.currentNodeId)
          : false;
      const nextCurrentId =
        nodeId === state.currentNodeId || isAncestorOfCurrent
          ? (targetNode?.parentId ?? 'root')
          : state.currentNodeId;

      const newRoot = deleteNode(state.root, nodeId);
      return { ...state, root: newRoot, nodeMap: buildNodeMap(newRoot), currentNodeId: nextCurrentId };
    }

    case 'PROMOTE_VARIATION': {
      const { parentId, variationIndex } = action.payload;
      const newRoot = promoteVariation(state.root, parentId, variationIndex);
      return { ...state, root: newRoot, nodeMap: buildNodeMap(newRoot) };
    }

    case 'LOAD_GAME': {
      const { root, headers, nodeMap } = action.payload;
      return { root, nodeMap, currentNodeId: 'root', headers };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

/** Returns true if `ancestorId` is an ancestor of `descendantId` */
function isAncestor(
  nodeMap: Map<string, MoveNode>,
  ancestorId: string,
  descendantId: string
): boolean {
  let node = nodeMap.get(descendantId);
  while (node && node.parentId) {
    if (node.parentId === ancestorId) return true;
    node = nodeMap.get(node.parentId);
  }
  return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChessTree() {
  const [state, dispatch] = useReducer(treeReducer, null, createInitialState);

  // ── Computed ──────────────────────────────────────────────────────────────
  const currentNode = state.nodeMap.get(state.currentNodeId) ?? state.root;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMove = useCallback(
    (san: string, fen: string) => {
      const ply = currentNode.ply + 1;
      dispatch({
        type: 'ADD_MOVE',
        payload: { parentId: state.currentNodeId, san, fen, ply },
      });
    },
    [state.currentNodeId, currentNode.ply]
  );

  const updateAnnotation = useCallback(
    (nodeId: string, updates: { comment?: string; nags?: string[] }) => {
      dispatch({ type: 'UPDATE_ANNOTATION', payload: { nodeId, ...updates } });
    },
    []
  );

  const updateHeaders = useCallback((updates: Partial<GameHeaders>) => {
    dispatch({ type: 'UPDATE_HEADERS', payload: { updates } });
  }, []);

  const deleteNodeById = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', payload: { nodeId } });
  }, []);

  const promoteVariationById = useCallback((parentId: string, variationIndex: number) => {
    dispatch({ type: 'PROMOTE_VARIATION', payload: { parentId, variationIndex } });
  }, []);

  const loadGame = useCallback(
    (root: MoveNode, headers: GameHeaders, nodeMap: Map<string, MoveNode>) => {
      dispatch({ type: 'LOAD_GAME', payload: { root, headers, nodeMap } });
    },
    []
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((nodeId: string) => {
    dispatch({ type: 'GO_TO', payload: { nodeId } });
  }, []);

  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);
  const goForward = useCallback(() => dispatch({ type: 'GO_FORWARD' }), []);
  const goStart = useCallback(() => dispatch({ type: 'GO_START' }), []);
  const goEnd = useCallback(() => dispatch({ type: 'GO_END' }), []);

  return {
    // State
    root: state.root,
    nodeMap: state.nodeMap,
    currentNodeId: state.currentNodeId,
    currentNode,
    headers: state.headers,
    // Mutations
    addMove,
    updateHeaders,
    updateAnnotation,
    deleteNodeById,
    promoteVariationById,
    loadGame,
    reset,
    // Navigation
    goTo,
    goBack,
    goForward,
    goStart,
    goEnd,
  };
}
