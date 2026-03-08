/**
 * Pure tree manipulation utilities for the variation tree.
 * These functions are intentionally free of chess.js so they
 * remain fast and independently testable.
 */

import { MoveNode } from '../types/chess.types';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

let _idCounter = 0;
export function generateId(): string {
  return `node_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Create the root node (empty state before any moves) */
export function createRootNode(fen: string = STARTING_FEN): MoveNode {
  return {
    id: 'root',
    san: '',
    fen,
    ply: 0,
    parentId: null,
    children: [],
  };
}

/** Build a flat Map<id, MoveNode> from any tree root for O(1) lookups */
export function buildNodeMap(root: MoveNode): Map<string, MoveNode> {
  const map = new Map<string, MoveNode>();
  const traverse = (node: MoveNode) => {
    map.set(node.id, node);
    node.children.forEach(traverse);
  };
  traverse(root);
  return map;
}

/**
 * Add a child move to a parent node (immutable - returns new tree root).
 * If an identical SAN already exists as a child, returns its id instead
 * of creating a duplicate.
 */
export function addMove(
  root: MoveNode,
  nodeMap: Map<string, MoveNode>,
  parentId: string,
  san: string,
  fen: string,
  ply: number
): { newRoot: MoveNode; newNodeId: string; nodeMap: Map<string, MoveNode> } {
  const parent = nodeMap.get(parentId);
  if (!parent) throw new Error(`Parent node ${parentId} not found`);

  // Idempotency: if this exact move already exists, return existing id
  const existing = parent.children.find((c) => c.san === san);
  if (existing) {
    return { newRoot: root, newNodeId: existing.id, nodeMap };
  }

  const newNode: MoveNode = {
    id: generateId(),
    san,
    fen,
    ply,
    parentId,
    children: [],
  };

  // Produce updated tree via structural cloning of the affected path only
  const newRoot = replaceNode(root, parentId, (node) => ({
    ...node,
    children: [...node.children, newNode],
  }));

  const newMap = buildNodeMap(newRoot);
  return { newRoot, newNodeId: newNode.id, nodeMap: newMap };
}

/**
 * Update a node's annotation fields (comment, nags).
 * Returns a new root (immutable update).
 */
export function updateNodeAnnotation(
  root: MoveNode,
  nodeId: string,
  updates: { comment?: string; nags?: string[] }
): MoveNode {
  return replaceNode(root, nodeId, (node) => ({ ...node, ...updates }));
}

/**
 * Delete a node and all its descendants.
 * Cannot delete the root node.
 */
export function deleteNode(
  root: MoveNode,
  nodeId: string
): MoveNode {
  if (nodeId === 'root') return root;
  const nodeToDelete = findNode(root, nodeId);
  if (!nodeToDelete || !nodeToDelete.parentId) return root;

  return replaceNode(root, nodeToDelete.parentId, (parent) => ({
    ...parent,
    children: parent.children.filter((c) => c.id !== nodeId),
  }));
}

/**
 * Promote a variation to mainline.
 * Swaps variation at index `variationIndex` with children[0].
 */
export function promoteVariation(
  root: MoveNode,
  parentId: string,
  variationIndex: number
): MoveNode {
  return replaceNode(root, parentId, (parent) => {
    const children = [...parent.children];
    if (variationIndex <= 0 || variationIndex >= children.length) return parent;
    [children[0], children[variationIndex]] = [children[variationIndex], children[0]];
    return { ...parent, children };
  });
}

/** Find a node by id (returns undefined if not found) */
export function findNode(root: MoveNode, id: string): MoveNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Get the path from root to a node as an array of node ids */
export function getPathToNode(root: MoveNode, targetId: string): string[] {
  const path: string[] = [];
  const search = (node: MoveNode): boolean => {
    path.push(node.id);
    if (node.id === targetId) return true;
    for (const child of node.children) {
      if (search(child)) return true;
    }
    path.pop();
    return false;
  };
  search(root);
  return path;
}

/** Get the mainline as an ordered array of MoveNodes (excluding root) */
export function getMainline(root: MoveNode): MoveNode[] {
  const line: MoveNode[] = [];
  let current = root.children[0];
  while (current) {
    line.push(current);
    current = current.children[0];
  }
  return line;
}

/** Navigate: go to previous node (parent) */
export function getPrevNodeId(
  nodeMap: Map<string, MoveNode>,
  currentId: string
): string {
  return nodeMap.get(currentId)?.parentId ?? currentId;
}

/** Navigate: go to next node (first child = mainline) */
export function getNextNodeId(
  nodeMap: Map<string, MoveNode>,
  currentId: string
): string {
  const node = nodeMap.get(currentId);
  return node?.children[0]?.id ?? currentId;
}

/** Navigate: go to the very first position (root) */
export function getFirstNodeId(): string {
  return 'root';
}

/** Navigate: go to the end of the current mainline */
export function getLastNodeId(
  nodeMap: Map<string, MoveNode>,
  currentId: string
): string {
  let node = nodeMap.get(currentId);
  while (node && node.children.length > 0) {
    node = node.children[0];
  }
  return node?.id ?? currentId;
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Immutably replaces a node identified by `targetId` in the tree.
 * Only the path from root to the target is cloned; everything else is shared.
 */
function replaceNode(
  node: MoveNode,
  targetId: string,
  updater: (n: MoveNode) => MoveNode
): MoveNode {
  if (node.id === targetId) return updater(node);
  // Check if any descendant path might contain targetId (fast path: avoid cloning unrelated branches)
  const updatedChildren = node.children.map((child) =>
    replaceNode(child, targetId, updater)
  );
  // If nothing changed, return original reference
  const changed = updatedChildren.some((c, i) => c !== node.children[i]);
  if (!changed) return node;
  return { ...node, children: updatedChildren };
}
