import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'pgn-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const rawDir = path.join(rootDir, 'tmp', 'master-data', 'raw');
const outputDir = path.join(rootDir, 'public', 'masters');
const tmpDir = path.join(rootDir, 'tmp');

const PGM_PLAYERS = [
  {
    id: 'ding',
    file: 'Ding.pgn',
    name: 'Ding Liren',
    aliases: ['Ding Liren', 'Ding,Liren'],
  },
  {
    id: 'hou',
    file: 'Hou.pgn',
    name: 'Hou Yifan',
    aliases: ['Hou Yifan', 'Hou,Y', 'Hou,Yifan'],
  },
  {
    id: 'wei',
    file: 'Wei.pgn',
    name: 'Wei Yi',
    aliases: ['Wei Yi', 'Wei,Yi'],
  },
  {
    id: 'yu',
    file: 'Yu.pgn',
    name: 'Yu Yangyi',
    aliases: ['Yu Yangyi', 'Yu,Yangyi'],
  },
];

const JU_GAMES = [
  { id: 'ju-1', file: 'ju_5633796.html', event: 'FIDE Women’s World Rapid Championships 2024', site: 'New York, USA', date: '2024.12.27', openingGroup: 'Women’s Rapid World Championship' },
  { id: 'ju-2', file: 'ju_5633999.html', event: 'FIDE Women’s World Rapid Championships 2024', site: 'New York, USA', date: '2024.12.27', openingGroup: 'Women’s Rapid World Championship' },
  { id: 'ju-3', file: 'ju_5634064.html', event: 'FIDE Women’s World Rapid Championships 2024', site: 'New York, USA', date: '2024.12.27', openingGroup: 'Women’s Rapid World Championship' },
  { id: 'ju-4', file: 'ju_5635718.html', event: 'FIDE Women’s World Rapid Championships 2024', site: 'New York, USA', date: '2024.12.30', openingGroup: 'Women’s Rapid World Championship' },
  { id: 'ju-5', file: 'ju_5633584.html', event: 'FIDE Women’s World Rapid Championships 2024', site: 'New York, USA', date: '2024.12.29', openingGroup: 'Women’s Rapid World Championship' },
];

function splitGames(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}(?=\[Event\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function mapHeaders(game) {
  const headers = {};
  for (const header of game.headers ?? []) {
    headers[header.name] = String(header.value ?? '').trim();
  }
  return headers;
}

function getOpeningGroup(headers) {
  const opening = String(headers.Opening ?? '').trim();
  if (opening) {
    return opening.split(/[:(,]/)[0].trim();
  }

  const eco = String(headers.ECO ?? '').trim().toUpperCase();
  switch (eco[0]) {
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

function outcomeScore(result, playerIsWhite) {
  if (result === '1-0') return playerIsWhite ? 3 : 0;
  if (result === '0-1') return playerIsWhite ? 0 : 3;
  if (result === '1/2-1/2') return 1;
  return 0;
}

function prestigeBonus(event) {
  const text = event.toLowerCase();
  let score = 0;
  if (text.includes('world')) score += 180;
  if (text.includes('champ')) score += 140;
  if (text.includes('olympiad')) score += 130;
  if (text.includes('candidates')) score += 120;
  if (text.includes('masters')) score += 90;
  if (text.includes('grand prix')) score += 90;
  if (text.includes('cup')) score += 80;
  if (text.includes('super')) score += 80;
  if (text.includes('rapid')) score += 35;
  if (text.includes('blitz')) score += 20;
  return score;
}

function chooseTopGames(games) {
  const chosen = [];
  const opponents = new Set();

  for (const game of games) {
    if (chosen.length === 5) break;
    if (opponents.has(game.opponent)) continue;
    chosen.push(game);
    opponents.add(game.opponent);
  }

  for (const game of games) {
    if (chosen.length === 5) break;
    if (chosen.some((candidate) => candidate.pgn === game.pgn)) continue;
    chosen.push(game);
  }

  return chosen;
}

async function buildPgnMentorCollection(player) {
  const raw = await fs.readFile(path.join(rawDir, player.file), 'utf8');
  const chunks = splitGames(raw);
  const candidates = [];

  for (const chunk of chunks) {
    try {
      const [game] = parse(chunk);
      if (!game) continue;
      const headers = mapHeaders(game);
      const white = headers.White ?? '';
      const black = headers.Black ?? '';
      const playerIsWhite = player.aliases.includes(white);
      const playerIsBlack = player.aliases.includes(black);

      if (!playerIsWhite && !playerIsBlack) continue;

      const opponent = playerIsWhite ? black : white;
      const opponentEloRaw = playerIsWhite ? headers.BlackElo : headers.WhiteElo;
      const opponentElo = Number.parseInt(opponentEloRaw || '0', 10) || 0;
      const score =
        outcomeScore(headers.Result ?? '*', playerIsWhite) * 1000 +
        opponentElo +
        prestigeBonus(headers.Event ?? '');

      candidates.push({
        id: `${player.id}-${candidates.length + 1}`,
        event: headers.Event || 'Unknown event',
        site: headers.Site || '',
        date: headers.Date || '',
        round: headers.Round || '',
        white,
        black,
        result: headers.Result || '*',
        eco: headers.ECO || '',
        opening: headers.Opening || '',
        openingGroup: getOpeningGroup(headers),
        pgn: chunk,
        opponent,
        score,
      });
    } catch {
      // Skip malformed source records.
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const selected = chooseTopGames(candidates).map(({ opponent, score, ...game }) => game);

  if (selected.length < 5) {
    throw new Error(`Not enough games selected for ${player.name}`);
  }

  return {
    id: player.id,
    name: player.name,
    source: 'PGN Mentor',
    games: selected,
  };
}

function parseJuHtml(html, metadata) {
  const summaryMatch = html.match(/<p><b>([^<]+)<\/b>\s*\(([^)]*)\)\s*-\s*<b>([^<]+)<\/b>\s*\(([^)]*)\)<br>([^<]+)\s+\(([^)]*)\),\s*([\d.]+)<\/p>/);
  if (!summaryMatch) {
    throw new Error(`Unable to parse Ju Wenjun game summary from ${metadata.file}`);
  }

  const [, white, whiteElo, black, blackElo, event, site, date] = summaryMatch;
  const moves = Array.from(html.matchAll(/<a class="game0"[^>]*>([^<]+)<\/a>/g)).map((match) => match[1].trim());
  const resultMatch = html.match(/<p>(1-0|0-1|1\/2-1\/2)<\/p>/);
  if (!moves.length || !resultMatch) {
    throw new Error(`Unable to parse Ju Wenjun moves/result from ${metadata.file}`);
  }

  const result = resultMatch[1];
  const pgn = [
    `[Event "${event.trim()}"]`,
    `[Site "${site.trim()}"]`,
    `[Date "${date.trim()}"]`,
    `[Round "?"]`,
    `[White "${white.trim()}"]`,
    `[Black "${black.trim()}"]`,
    `[Result "${result}"]`,
    `[WhiteElo "${whiteElo.trim()}"]`,
    `[BlackElo "${blackElo.trim()}"]`,
    '',
    `${moves.join(' ')} ${result}`,
  ].join('\n');

  return {
    id: metadata.id,
    event: event.trim(),
    site: site.trim(),
    date: date.trim(),
    round: '',
    white: white.trim(),
    black: black.trim(),
    result,
    eco: '',
    opening: metadata.openingGroup,
    openingGroup: metadata.openingGroup,
    pgn,
  };
}

async function buildJuCollection() {
  const games = [];
  for (const entry of JU_GAMES) {
    const html = await fs.readFile(path.join(tmpDir, entry.file), 'utf8');
    games.push(parseJuHtml(html, entry));
  }

  return {
    id: 'ju',
    name: 'Ju Wenjun',
    source: 'Chess-Results / FIDE Women’s World Rapid Championships 2024',
    games,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  for (const player of PGM_PLAYERS) {
    const payload = await buildPgnMentorCollection(player);
    await fs.writeFile(
      path.join(outputDir, `${player.id}.json`),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8'
    );
  }

  const juPayload = await buildJuCollection();
  await fs.writeFile(
    path.join(outputDir, 'ju.json'),
    `${JSON.stringify(juPayload, null, 2)}\n`,
    'utf8'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
