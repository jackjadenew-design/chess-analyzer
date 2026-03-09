import React, { createContext, useContext } from 'react';

export type Language = 'zh' | 'en';
type HeaderField = 'White' | 'Black' | 'Event' | 'Site' | 'Date' | 'Result';
type PieceKey = 'q' | 'r' | 'b' | 'n';

type TranslationTree = {
  app: {
    title: string;
    pro: string;
    tabs: Record<'info' | 'moves' | 'pgn', string>;
    engineStatus: {
      ready: (engineName: string) => string;
      loading: (engineName: string) => string;
      error: string;
    };
    newGame: string;
    importFile: string;
    authorInfo: string;
    author: string;
    email: string;
    leaveMessage: string;
    startingPosition: string;
    statusBar: string;
    vs: string;
    confirm: {
      title: string;
      description: string;
      cancel: string;
      discardAndContinue: string;
    };
    contact: {
      title: string;
      description: string;
      name: string;
      namePlaceholder: string;
      message: string;
      messagePlaceholder: string;
      cancel: string;
      send: string;
    };
    language: string;
    switchLanguage: string;
  };
  engine: {
    title: string;
    error: string;
    off: string;
    initializing: string;
    searching: string;
    ready: string;
    loading: string;
    engineError: string;
    toggle: string;
    depth: string;
    analysisDepth: string;
    analysing: string;
    complete: string;
    analyzeGame: string;
    analysisInProgress: string;
    bestMove: string;
    principalVariations: string;
    trend: string;
    trendWaiting: string;
    analysisSummary: string;
    analyzedMoves: string;
    accuracy: string;
    brilliant: string;
    best: string;
    excellent: string;
    good: string;
    dubious: string;
    mistake: string;
    blunder: string;
    brilliantHint: string;
    bestHint: string;
    excellentHint: string;
    goodHint: string;
    dubiousHint: string;
    mistakeHint: string;
    blunderHint: string;
    summaryInfo: string;
    stockfish16: string;
    stockfish18: string;
  };
  gameInfo: {
    title: string;
    fields: Record<HeaderField, { label: string; placeholder: string }>;
  };
  annotation: {
    title: string;
    save: string;
    saveHint: string;
    clear: string;
    selectMove: string;
    move: string;
    moveQuality: string;
    comment: string;
    placeholder: string;
  };
  pgn: {
    title: string;
    import: string;
    copied: string;
    copyFen: string;
    copyPgn: string;
    download: string;
    newGame: string;
    importPlaceholder: string;
    importPgn: string;
    importing: string;
    file: string;
    clickToCopyFen: string;
    pastePgn: string;
    parseFailed: string;
    parseFileFailed: string;
    white: string;
    black: string;
  };
  board: {
    firstMove: string;
    previousMove: string;
    nextMove: string;
    lastMove: string;
    flipBoard: string;
    start: string;
    move: string;
    whiteShort: string;
    blackShort: string;
    check: string;
    checkmate: string;
    draw: string;
    stalemate: string;
    choosePromotion: string;
    pieces: Record<PieceKey, string>;
  };
  moveList: {
    empty: string;
    annotate: string;
    delete: string;
  };
  masters: {
    title: string;
    subtitle: string;
    loadGames: string;
    loading: string;
    openingTypes: string;
    availableGames: string;
    source: string;
    noGames: string;
    openGame: string;
  };
  theme: {
    switchToLight: string;
    switchToDark: string;
  };
};

const translations: Record<Language, TranslationTree> = {
  zh: {
    app: {
      title: '国际象棋分析器',
      pro: 'PRO',
      tabs: {
        info: '棋局信息',
        moves: '棋谱',
        pgn: 'PGN/FEN',
      },
      engineStatus: {
        ready: (engineName: string) => `${engineName} 已就绪`,
        loading: (engineName: string) => `${engineName} 加载中`,
        error: '引擎错误',
      },
      newGame: '新建棋局',
      importFile: '导入棋谱',
      authorInfo: '作者信息',
      author: '赵少杰',
      email: '邮箱',
      leaveMessage: '给作者留言',
      startingPosition: '初始局面',
      statusBar: '← → 导航 · F 翻转棋盘',
      vs: '对',
      confirm: {
        title: '放弃当前棋局？',
        description: '当前棋局还有未保存内容。确认后将清空当前棋局并开始新棋局。',
        cancel: '取消',
        discardAndContinue: '放弃并继续',
      },
      contact: {
        title: '给作者留言',
        description: '填写后将打开本机邮件客户端，并把内容发送到作者邮箱。',
        name: '署名',
        namePlaceholder: '你的名字或昵称',
        message: '留言内容',
        messagePlaceholder: '请输入你想发给作者的留言…',
        cancel: '取消',
        send: '发送留言',
      },
      language: '中文',
      switchLanguage: '切换到英文',
    },
    engine: {
      title: '引擎',
      error: '错误',
      off: '已关闭',
      initializing: '初始化中',
      searching: '搜索中',
      ready: '已就绪',
      loading: '加载中...',
      engineError: '引擎错误',
      toggle: '引擎开关',
      depth: '深度',
      analysisDepth: '曲线深度',
      analysing: '分析中...',
      complete: '完成',
      analyzeGame: '分析整谱',
      analysisInProgress: '分析中',
      bestMove: '最佳着法',
      principalVariations: '主变化',
      trend: '局面曲线',
      trendWaiting: '导入或输入棋谱后，点击“分析整谱”生成固定曲线。',
      analysisSummary: '分析摘要',
      analyzedMoves: '已分析着法',
      accuracy: '精度',
      brilliant: '妙手',
      best: '最佳着',
      excellent: '优秀着',
      good: '好棋',
      dubious: '疑问手',
      mistake: '错着',
      blunder: '大漏着',
      brilliantHint: '妙手：这是最佳着，并且伴随即时子力牺牲，牺牲后评估仍不落下风。',
      bestHint: '最佳着：与引擎推荐的最佳着一致，最佳着评估与实战着评估几乎没有差距。',
      excellentHint: '优秀着：不是引擎第一选择，但与最佳着非常接近，胜率损失极小。',
      goodHint: '好棋：不是最佳着，但保留了大部分胜率，没有造成明显损失。',
      dubiousHint: '疑问手：不是明显坏棋，但让局面质量出现了可见下降。',
      mistakeHint: '错着：带来了较明显的评估下滑，错过了更强的走法。',
      blunderHint: '大漏着：造成重大失误，通常会显著丢失优势、进入败势或错过关键防守。',
      summaryInfo: '这些着法类型和精度是基于引擎评估的近似识别结果，不等同于人工复盘结论，个别局面可能存在偏差。',
      stockfish16: 'Stockfish 16',
      stockfish18: 'Stockfish 18',
    },
    gameInfo: {
      title: '棋局信息',
      fields: {
        White: { label: '白方', placeholder: '白方棋手' },
        Black: { label: '黑方', placeholder: '黑方棋手' },
        Event: { label: '赛事', placeholder: '比赛或赛事名称' },
        Site: { label: '地点', placeholder: '城市 / 平台' },
        Date: { label: '日期', placeholder: '2026.03.08' },
        Result: { label: '结果', placeholder: '1-0 / 0-1 / 1/2-1/2 / *' },
      },
    },
    annotation: {
      title: '注释',
      save: '保存注释',
      saveHint: '将当前着法的注释保存到这盘棋里；要长期保留，请导出 PGN，否则新开棋局后会丢失。',
      clear: '清空',
      selectMove: '请选择一个着法再进行注释。',
      move: '着法',
      moveQuality: '着法质量',
      comment: '评论',
      placeholder: '添加注释…（Ctrl+Enter 保存）',
    },
    pgn: {
      title: 'PGN / FEN',
      import: '导入',
      copied: '已复制！',
      copyFen: '复制 FEN',
      copyPgn: '复制 PGN',
      download: '下载 .pgn',
      newGame: '新建棋局',
      importPlaceholder: '在这里粘贴 PGN...\n\n1. e4 e5 2. Nf3 Nc6 (2... d5) 3. Bb5 *',
      importPgn: '导入 PGN',
      importing: '导入中...',
      file: '文件',
      clickToCopyFen: '点击复制 FEN',
      pastePgn: '请粘贴 PGN 字符串。',
      parseFailed: 'PGN 解析失败。',
      parseFileFailed: 'PGN 文件解析失败。',
      white: '白方',
      black: '黑方',
    },
    board: {
      firstMove: '开局 (↑)',
      previousMove: '上一步 (←)',
      nextMove: '下一步 (→)',
      lastMove: '末尾 (↓)',
      flipBoard: '翻转棋盘 (F)',
      start: '开局',
      move: '第 {move} 手 ({side})',
      whiteShort: '白',
      blackShort: '黑',
      check: '将军',
      checkmate: '将杀',
      draw: '和棋',
      stalemate: '逼和',
      choosePromotion: '选择升变',
      pieces: {
        q: '后',
        r: '车',
        b: '象',
        n: '马',
      },
    },
    moveList: {
      empty: '还没有着法，开始对局或导入棋谱吧',
      annotate: '注释',
      delete: '删除该步及后续着法',
    },
    masters: {
      title: '大师棋局',
      subtitle: '精选 15 位世界级棋手，含 5 位中国顶尖棋手',
      loadGames: '盘内置棋局',
      loading: '加载中...',
      openingTypes: '开局分类',
      availableGames: '可选棋局',
      source: '来源',
      noGames: '该分类下暂时没有棋局。',
      openGame: '加载这盘棋局',
    },
    theme: {
      switchToLight: '切换到亮色模式',
      switchToDark: '切换到暗色模式',
    },
  },
  en: {
    app: {
      title: 'Chess Analyzer',
      pro: 'PRO',
      tabs: {
        info: 'Game Info',
        moves: 'Scoresheet',
        pgn: 'PGN/FEN',
      },
      engineStatus: {
        ready: (engineName: string) => `${engineName} Ready`,
        loading: (engineName: string) => `${engineName} Loading`,
        error: 'Engine Error',
      },
      newGame: 'New Game',
      importFile: 'Import PGN',
      authorInfo: 'Author info',
      author: 'Shaojie Zhao',
      email: 'Email',
      leaveMessage: 'Leave a message',
      startingPosition: 'Starting position',
      statusBar: '← → navigate · F flip board',
      vs: 'vs',
      confirm: {
        title: 'Discard current game?',
        description: 'The current game has unsaved content. Starting a new game will clear it.',
        cancel: 'Cancel',
        discardAndContinue: 'Discard and Continue',
      },
      contact: {
        title: 'Leave a message',
        description: 'This will open your local mail client and send the message to the author email.',
        name: 'Name',
        namePlaceholder: 'Your name or nickname',
        message: 'Message',
        messagePlaceholder: 'Write the message you want to send to the author…',
        cancel: 'Cancel',
        send: 'Send message',
      },
      language: 'English',
      switchLanguage: 'Switch to Chinese',
    },
    engine: {
      title: 'Engine',
      error: 'Error',
      off: 'Off',
      initializing: 'Initializing',
      searching: 'Searching',
      ready: 'Ready',
      loading: 'Loading...',
      engineError: 'Engine Error',
      toggle: 'Engine toggle',
      depth: 'Depth',
      analysisDepth: 'Curve depth',
      analysing: 'analyzing...',
      complete: 'complete',
      analyzeGame: 'Analyze game',
      analysisInProgress: 'Analyzing',
      bestMove: 'Best move',
      principalVariations: 'Principal Variations',
      trend: 'Evaluation Trend',
      trendWaiting: 'Import or enter a PGN, then click “Analyze game” to build a fixed curve.',
      analysisSummary: 'Analysis Summary',
      analyzedMoves: 'Analyzed moves',
      accuracy: 'Accuracy',
      brilliant: 'Brilliant',
      best: 'Best',
      excellent: 'Excellent',
      good: 'Good',
      dubious: 'Dubious',
      mistake: 'Mistake',
      blunder: 'Blunder',
      brilliantHint: 'Brilliant: the move is best, includes an immediate material sacrifice, and the resulting evaluation stays non-negative.',
      bestHint: 'Best: matches the engine’s best move and leaves little to no gap between best-move eval and played-move eval.',
      excellentHint: 'Excellent: not the engine’s top move, but it stays very close to best and loses only a tiny amount of winning chances.',
      goodHint: 'Good: not the engine’s top move, but it preserves most of the winning chances and avoids meaningful damage.',
      dubiousHint: 'Dubious: not a clear mistake, but it causes a noticeable drop in position quality.',
      mistakeHint: 'Mistake: a clearly inferior move that causes a meaningful evaluation loss.',
      blunderHint: 'Blunder: a major error that usually throws away advantage, misses critical defense, or loses heavily.',
      summaryInfo: 'These move labels and accuracy numbers are heuristic engine-based estimates, not definitive human annotations, so some positions may be judged imperfectly.',
      stockfish16: 'Stockfish 16',
      stockfish18: 'Stockfish 18',
    },
    gameInfo: {
      title: 'Game Info',
      fields: {
        White: { label: 'White', placeholder: 'White player' },
        Black: { label: 'Black', placeholder: 'Black player' },
        Event: { label: 'Event', placeholder: 'Tournament or match' },
        Site: { label: 'Site', placeholder: 'City / platform' },
        Date: { label: 'Date', placeholder: '2026.03.08' },
        Result: { label: 'Result', placeholder: '1-0 / 0-1 / 1/2-1/2 / *' },
      },
    },
    annotation: {
      title: 'Annotation',
      save: 'Save annotation',
      saveHint: 'Save the current move annotation into this game; export the PGN to keep it, or it will be lost when you start a new game.',
      clear: 'Clear',
      selectMove: 'Select a move to annotate it.',
      move: 'Move',
      moveQuality: 'Move quality',
      comment: 'Comment',
      placeholder: 'Add a comment… (Ctrl+Enter to save)',
    },
    pgn: {
      title: 'PGN / FEN',
      import: 'Import',
      copied: 'Copied!',
      copyFen: 'Copy FEN',
      copyPgn: 'Copy PGN',
      download: 'Download .pgn',
      newGame: 'New Game',
      importPlaceholder: 'Paste PGN here...\n\n1. e4 e5 2. Nf3 Nc6 (2... d5) 3. Bb5 *',
      importPgn: 'Import PGN',
      importing: 'Importing...',
      file: 'File',
      clickToCopyFen: 'Click to copy FEN',
      pastePgn: 'Please paste a PGN string.',
      parseFailed: 'Failed to parse PGN.',
      parseFileFailed: 'Failed to parse PGN file.',
      white: 'White',
      black: 'Black',
    },
    board: {
      firstMove: 'First move (↑)',
      previousMove: 'Previous move (←)',
      nextMove: 'Next move (→)',
      lastMove: 'Last move (↓)',
      flipBoard: 'Flip board (F)',
      start: 'Start',
      move: 'Move {move} ({side})',
      whiteShort: 'W',
      blackShort: 'B',
      check: 'CHECK',
      checkmate: 'CHECKMATE',
      draw: 'DRAW',
      stalemate: 'STALEMATE',
      choosePromotion: 'Choose promotion',
      pieces: {
        q: 'Queen',
        r: 'Rook',
        b: 'Bishop',
        n: 'Knight',
      },
    },
    moveList: {
      empty: 'No moves yet — play or import a game',
      annotate: 'Annotate',
      delete: 'Delete from here',
    },
    masters: {
      title: 'Master Games',
      subtitle: '15 elite players, including 5 top Chinese stars',
      loadGames: 'built-in games',
      loading: 'Loading...',
      openingTypes: 'Opening groups',
      availableGames: 'Games',
      source: 'Source',
      noGames: 'No games in this opening group.',
      openGame: 'Load this game',
    },
    theme: {
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
    },
  },
};

const I18nContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  strings: TranslationTree;
} | null>(null);

export function I18nProvider({
  language,
  setLanguage,
  children,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ language, setLanguage, strings: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
