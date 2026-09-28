// Padel match state management & scoring engine

const STORAGE_KEY = 'padel_current_match';
const HISTORY_KEY = 'padel_matches_history';

export function createDefaultMatch() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  return {
    id: 'match_' + Date.now(),
    title: 'Padel Game Score & Analysis',
    court: 'Court 1',
    date: dateStr,
    startTime: timeStr,
    finishTime: '',
    format: 'Best of 3', // 'Best of 1', 'Best of 3', 'Best of 5'
    scoringRule: 'goldenPoint', // 'goldenPoint' (Punto de Oro) or 'advantage'
    team1: {
      id: 'T1',
      name: 'Team 1',
      leftPlayer: 'Player 1 (L)',
      rightPlayer: 'Player 2 (R)',
      color: '#10b981'
    },
    team2: {
      id: 'T2',
      name: 'Team 2',
      leftPlayer: 'Player 3 (L)',
      rightPlayer: 'Player 4 (R)',
      color: '#06b6d4'
    },
    initialServer: 'T1',
    points: []
  };
}

// Compute live state (sets, games, current points, winner) by replaying all points
export function computeMatchScore(match) {
  const isAdvantage = match.scoringRule === 'advantage';
  const setsToWin = match.format === 'Best of 5' ? 3 : (match.format === 'Best of 1' ? 1 : 2);

  let currentSet = 1;
  let setsWon = { T1: 0, T2: 0 };
  let completedSets = [];
  let games = { T1: 0, T2: 0 };
  let gameScore = { T1: '0', T2: '0' };
  let isTiebreak = false;
  let tiebreakPoints = { T1: 0, T2: 0 };
  let matchFinished = false;
  let matchWinner = null;

  // Track serving team (flips each game)
  let totalGamesPlayed = 0;
  
  for (let i = 0; i < match.points.length; i++) {
    const pt = match.points[i];
    const winner = pt.team; // 'T1' or 'T2'
    const loser = winner === 'T1' ? 'T2' : 'T1';

    if (matchFinished) break;

    if (isTiebreak) {
      // Tiebreak scoring: numeric 0, 1, 2...
      tiebreakPoints[winner]++;
      const pW = tiebreakPoints[winner];
      const pL = tiebreakPoints[loser];

      // Tiebreak won if >= 7 and lead >= 2
      if (pW >= 7 && (pW - pL) >= 2) {
        // Set won via tiebreak
        games[winner]++;
        setsWon[winner]++;
        completedSets.push({
          set: currentSet,
          t1: games.T1,
          t2: games.T2,
          tiebreak: { T1: tiebreakPoints.T1, T2: tiebreakPoints.T2 }
        });

        // Reset for next set
        if (setsWon[winner] >= setsToWin) {
          matchFinished = true;
          matchWinner = winner;
        } else {
          currentSet++;
          games = { T1: 0, T2: 0 };
          gameScore = { T1: '0', T2: '0' };
          isTiebreak = false;
          tiebreakPoints = { T1: 0, T2: 0 };
        }
      }
    } else {
      // Normal game scoring: '0' -> '15' -> '30' -> '40'
      const curW = gameScore[winner];
      const curL = gameScore[loser];

      let gameWon = false;

      if (curW === '0') {
        gameScore[winner] = '15';
      } else if (curW === '15') {
        gameScore[winner] = '30';
      } else if (curW === '30') {
        gameScore[winner] = '40';
      } else if (curW === '40') {
        if (curL === '40') {
          if (!isAdvantage) {
            // Golden Point (Punto de Oro) - whoever wins this point wins the game!
            gameWon = true;
          } else {
            // Traditional Advantage: 40-40 -> Ad
            gameScore[winner] = 'Ad';
          }
        } else if (curL === 'Ad') {
          // Advantage cancelled back to deuce (40-40)
          gameScore[loser] = '40';
        } else {
          // Winner was at 40 and loser at 0, 15, or 30 -> Game won!
          gameWon = true;
        }
      } else if (curW === 'Ad') {
        // Player had Ad and won next point -> Game won!
        gameWon = true;
      }

      if (gameWon) {
        games[winner]++;
        totalGamesPlayed++;
        gameScore = { T1: '0', T2: '0' };

        // Check if set is won
        const gW = games[winner];
        const gL = games[loser];

        if (gW >= 6 && (gW - gL) >= 2) {
          // Standard set win (e.g. 6-0, 6-4, 7-5)
          setsWon[winner]++;
          completedSets.push({
            set: currentSet,
            t1: games.T1,
            t2: games.T2,
            tiebreak: null
          });

          if (setsWon[winner] >= setsToWin) {
            matchFinished = true;
            matchWinner = winner;
          } else {
            currentSet++;
            games = { T1: 0, T2: 0 };
          }
        } else if (gW === 6 && gL === 6) {
          // Trigger tiebreak
          isTiebreak = true;
          tiebreakPoints = { T1: 0, T2: 0 };
        }
      }
    }
  }

  // Calculate current server
  const initServer = match.initialServer || 'T1';
  const otherTeam = initServer === 'T1' ? 'T2' : 'T1';
  let currentServerTeam = (totalGamesPlayed % 2 === 0) ? initServer : otherTeam;
  
  if (isTiebreak) {
    // In tiebreak, server switches after pt 1, then every 2 points
    const tbTotal = tiebreakPoints.T1 + tiebreakPoints.T2;
    if (tbTotal === 0) {
      currentServerTeam = (totalGamesPlayed % 2 === 0) ? initServer : otherTeam;
    } else {
      const cycle = Math.floor((tbTotal - 1) / 2);
      currentServerTeam = (cycle % 2 === 0) ? otherTeam : initServer;
    }
  }

  return {
    currentSet,
    setsWon,
    completedSets,
    games,
    gameScore,
    isTiebreak,
    tiebreakPoints,
    matchFinished,
    matchWinner,
    totalGamesPlayed,
    currentServerTeam
  };
}

// Storage helpers
export function loadCurrentMatch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading match:', e);
  }
  const def = createDefaultMatch();
  saveCurrentMatch(def);
  return def;
}

export function saveCurrentMatch(match) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
  } catch (e) {
    console.error('Error saving match:', e);
  }
}

export function loadMatchesHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveMatchesHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function archiveCurrentMatch(match) {
  const history = loadMatchesHistory();
  const existingIdx = history.findIndex(m => m.id === match.id);
  if (existingIdx >= 0) {
    history[existingIdx] = match;
  } else {
    history.unshift(match);
  }
  saveMatchesHistory(history);
}

// Demo Match Generator with realistic professional padel stats
export function createDemoMatch() {
  const match = {
    id: 'demo_' + Date.now(),
    title: 'Premier Padel Showcase - Final',
    court: 'Center Court (Glass Court)',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:30',
    finishTime: '20:15',
    format: 'Best of 3',
    scoringRule: 'goldenPoint',
    team1: {
      id: 'T1',
      name: 'Galán / Lebrón',
      leftPlayer: 'Ale Galán (L)',
      rightPlayer: 'Juan Lebrón (R)',
      color: '#10b981'
    },
    team2: {
      id: 'T2',
      name: 'Tapia / Coello',
      leftPlayer: 'Agustín Tapia (L)',
      rightPlayer: 'Arturo Coello (R)',
      color: '#06b6d4'
    },
    initialServer: 'T1',
    points: []
  };

  // Realistic sample points distribution
  const demoShots = [
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Deep slice to corner' },
    { team: 'T1', wonBy: 'E', player: 'R', shot: 'Ret. Serve', note: 'Aggressive return forced net error' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Bajada down the T' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Kick smash out by 3' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Cross court drop volley' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Vib', note: 'Heavy side-spin into fence' },
    { team: 'T2', wonBy: 'E', player: 'L', shot: 'Lob', note: 'Lob went long over back glass' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Chiquita into feet followed by volley' },
    { team: 'T1', wonBy: 'E', player: 'R', shot: 'Ret. Serve', note: 'T2 Return dumped into net' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Flat smash winner' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Band', note: 'Bandeja to side glass' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Drop', note: 'Disguised dropshot' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Fast volley exchange won' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Serve', note: 'Service ace to middle line' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Overhead smash over fence' },
    { team: 'T2', wonBy: 'E', player: 'L', shot: 'F.H', note: 'Forehand drive into net' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Vib', note: 'Vibora dying on back wall' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'BVol', note: 'Crisp backhand volley' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Ret. Serve', note: 'Return winner down the line' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Bandeja forcing weak reply' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Smash brought back to own court' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'High speed back wall bajada' },
    { team: 'T1', wonBy: 'E', player: 'R', shot: 'B.H', note: 'Backhand error under pressure' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Chiquita setup' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'FVol', note: 'Finishing volley' }
  ];

  match.points = demoShots.map((p, idx) => ({
    id: 'pt_' + (idx + 1),
    index: idx + 1,
    team: p.team,
    wonBy: p.wonBy,
    player: p.player,
    shot: p.shot,
    note: p.note,
    timestamp: Date.now() - (demoShots.length - idx) * 45000
  }));

  return match;
}
