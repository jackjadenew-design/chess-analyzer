# Chess Analyzer — Pro Edition

A professional chess review and analysis application built with React + TypeScript + Stockfish WASM.

![Chess Analyzer Screenshot](./docs/screenshot.png)

## Features

- 🏁 **Full Variation Tree** — Infinite branching, mainline + sub-variations, Lichess-style move list
- 🤖 **Stockfish 16 Engine** — Real-time evaluation, best move, Top-3 PV lines, adjustable depth
- 📊 **Evaluation Bar** — Animated vertical bar showing advantage
- 📝 **Annotation System** — NAG symbols (!!, !, !?, ?!, ?, ??) + freeform text comments
- 📥 **PGN Import** — Full variation + comment support via `pgn-parser`
- 📤 **PGN Export** — Download or copy as standard PGN
- 🔄 **FEN Support** — Copy FEN for any position
- ⌨️ **Keyboard Navigation** — Arrow keys to navigate, F to flip board
- 🎨 **Dark/Light Mode** — Professional dark-first theme

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

## Build for Production

```bash
npm run build
npm run preview
```

---

## Architecture

```
src/
├── types/
│   └── chess.types.ts          # Shared interfaces (MoveNode, EngineEval, etc.)
│
├── utils/
│   ├── tree.ts                 # Pure tree manipulation (no chess.js)
│   ├── nag.ts                  # NAG symbol definitions and helpers
│   └── pgn.ts                  # PGN import/export
│
├── hooks/
│   ├── useChessTree.ts         # Variation tree state (useReducer)
│   ├── useChessGame.ts         # Board interaction + chess.js
│   └── useStockfish.ts         # Stockfish Web Worker lifecycle
│
├── components/
│   ├── Board/
│   │   ├── ChessBoard.tsx      # react-chessboard wrapper + nav controls
│   │   └── EvalBar.tsx         # Vertical evaluation bar
│   ├── MoveList/
│   │   └── MoveList.tsx        # Recursive Lichess-style move list
│   ├── Engine/
│   │   └── EnginePanel.tsx     # Eval display + depth slider + PV lines
│   ├── Annotation/
│   │   └── AnnotationPanel.tsx # Comment editor + NAG buttons
│   ├── PGN/
│   │   └── PgnPanel.tsx        # PGN/FEN import/export panel
│   └── UI/
│       ├── PromotionModal.tsx  # Pawn promotion piece selector
│       └── ThemeToggle.tsx     # Dark/light toggle
│
├── App.tsx                     # Root: layout + hook composition
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + custom styles

public/
└── stockfish.worker.js         # Stockfish Web Worker (loads from CDN)
```

### Hook Composition Pattern

```
useChessTree  →  pure tree manipulation (no chess.js)
    ↓
useChessGame  →  chess.js + board state, calls tree.addMove()
    ↓
useStockfish  →  worker lifecycle + eval stream
    ↓
App           →  composes all three, renders layout
```

---

## MoveNode Tree Structure

```typescript
interface MoveNode {
  id: string;
  san: string;         // "e4", "Nf3", "O-O"
  fen: string;         // Full FEN after this move
  ply: number;         // Half-moves from start (root = 0)
  comment?: string;    // Text annotation
  nags?: string[];     // ["$1", "$4"] (NAG codes)
  parentId: string | null;
  children: MoveNode[]; // children[0] = mainline, [1+] = variations
}
```

### Example tree (1. e4 e5 2. Nf3 with variation 2...d5):

```
root (fen: starting position)
  └── e4 (ply: 1)
       └── e5 (ply: 2)
            └── Nf3 (ply: 3)
                 ├── Nc6 (ply: 4)  ← mainline
                 └── d5  (ply: 4)  ← variation
```

---

## Stockfish Integration

The engine runs in a separate **Web Worker** (`/public/stockfish.worker.js`) to keep the UI thread responsive.

**Load sequence:**
1. Worker loads Stockfish 16 via `importScripts` from jsdelivr CDN
2. Sends `uci` → waits for `uciok`
3. Sets `MultiPV 3` for top-3 lines
4. On position change: `stop` → `position fen <fen>` → `go depth <n>`
5. Streams `info score ...` lines back to UI (debounced 300ms)

**Fallback:** If the CDN is unreachable, the worker emits an error message and the UI shows an "Engine Error" badge gracefully.

---

## PGN Import

Uses `pgn-parser` for full variation support:

```pgn
1. e4 e5 2. Nf3 (2. d4 exd4 { The center game }) 2...Nc6 3. Bb5 *
```

Falls back to chess.js mainline-only parsing if pgn-parser fails.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous move |
| `→` | Next move (mainline) |
| `↑` | Go to start |
| `↓` | Go to end of mainline |
| `F` | Flip board |

---

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 4 | Build tool |
| Tailwind CSS | 3 | Styling |
| chess.js | 1.x | Chess logic / move validation |
| react-chessboard | 4.x | Board rendering |
| pgn-parser | 1.4 | PGN parsing with variations |
| Stockfish | 16 | Chess engine (WASM) |
| Lucide React | 0.263 | Icons |

---

## License

MIT
