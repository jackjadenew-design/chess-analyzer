import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'pgn-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const inputDir = path.join(rootDir, 'tmp', 'master-data', 'raw');
const outputDir = path.join(rootDir, 'public', 'masters');

const MASTERS = [
  { id: 'carlsen', file: 'Carlsen.pgn', name: 'Magnus Carlsen' },
  { id: 'anand', file: 'Anand.pgn', name: 'Viswanathan Anand' },
  { id: 'kasparov', file: 'Kasparov.pgn', name: 'Garry Kasparov' },
  { id: 'karpov', file: 'Karpov.pgn', name: 'Anatoly Karpov' },
  { id: 'kramnik', file: 'Kramnik.pgn', name: 'Vladimir Kramnik' },
  { id: 'fischer', file: 'Fischer.pgn', name: 'Bobby Fischer' },
  { id: 'tal', file: 'Tal.pgn', name: 'Mikhail Tal' },
  { id: 'capablanca', file: 'Capablanca.pgn', name: 'Jose Raul Capablanca' },
  { id: 'alekhine', file: 'Alekhine.pgn', name: 'Alexander Alekhine' },
  { id: 'botvinnik', file: 'Botvinnik.pgn', name: 'Mikhail Botvinnik' },
];

function normalizeHeaderValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function mapHeaders(game) {
  const headers = {};
  for (const header of game.headers ?? []) {
    headers[header.name] = normalizeHeaderValue(header.value);
  }
  return headers;
}

function getOpeningGroup(headers) {
  const opening = normalizeHeaderValue(headers.Opening);
  if (opening) {
    return opening
      .replace(/\s+/g, ' ')
      .split(/[:(]/)[0]
      .split(',')[0]
      .trim();
  }

  const eco = normalizeHeaderValue(headers.ECO);
  const family = eco[0]?.toUpperCase();
  switch (family) {
    case 'A':
      return 'Flank Openings';
    case 'B':
      return 'Semi-Open Games';
    case 'C':
      return 'Open Games';
    case 'D':
      return 'Closed Games';
    case 'E':
      return 'Indian Defences';
    default:
      return 'Miscellaneous';
  }
}

function splitGames(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}(?=\[Event\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function selectGames(games, count) {
  const selected = [];
  const groupCounts = new Map();

  for (const game of games) {
    const currentCount = groupCounts.get(game.openingGroup) ?? 0;
    if (currentCount >= 4) continue;
    selected.push(game);
    groupCounts.set(game.openingGroup, currentCount + 1);
    if (selected.length === count) return selected;
  }

  for (const game of games) {
    if (selected.length === count) break;
    if (selected.some((candidate) => candidate.pgn === game.pgn)) continue;
    selected.push(game);
  }

  return selected;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const manifest = [];

  for (const master of MASTERS) {
    const raw = await fs.readFile(path.join(inputDir, master.file), 'utf8');
    const chunks = splitGames(raw);
    const parsedGames = [];

    for (const chunk of chunks) {
      try {
        const [game] = parse(chunk);
        if (!game) continue;
        const headers = mapHeaders(game);
        const moves = chunk.split(/\n\n/)[1]?.trim() ?? '';
        if (!moves) continue;
        parsedGames.push({
          id: `${master.id}-${parsedGames.length + 1}`,
          event: headers.Event || 'Unknown event',
          site: headers.Site || '',
          date: headers.Date || '',
          round: headers.Round || '',
          white: headers.White || '',
          black: headers.Black || '',
          result: headers.Result || '*',
          eco: headers.ECO || '',
          opening: headers.Opening || '',
          openingGroup: getOpeningGroup(headers),
          pgn: chunk,
        });
      } catch {
        // Skip malformed games in source archives.
      }
    }

    const selected = selectGames(parsedGames, 20);
    if (selected.length < 20) {
      throw new Error(`${master.name} has only ${selected.length} games after filtering.`);
    }

    const payload = {
      id: master.id,
      name: master.name,
      source: 'PGN Mentor',
      games: selected,
    };

    await fs.writeFile(
      path.join(outputDir, `${master.id}.json`),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8'
    );

    manifest.push({
      id: master.id,
      name: master.name,
      gameCount: selected.length,
    });
  }

  await fs.writeFile(
    path.join(outputDir, 'index.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
