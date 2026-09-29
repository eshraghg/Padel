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
    // Initial server selection: team ('T1' | 'T2') & starting player ('L' | 'R')
    initialServerTeam: 'T1',
    initialServerPlayer: 'L',
    initialServerPlayerT1: 'L',
    initialServerPlayerT2: 'L',
    initialServer: 'T1', // Kept for backwards compatibility
    points: []
  };
}

/**
 * Determine exact server details (team, player 'L' | 'R', player name)
 * following official Padel rotation rules:
 * - Each team alternates service games.
 * - Within each team, players alternate their service games.
 * - In tiebreaks, the rotation advances every 2 points (after 1st point).
 */
export function getServerDetails(match, totalGamesPlayed, isTiebreak = false, tiebreakPoints = { T1: 0, T2: 0 }) {
  const initTeam = match.initialServerTeam || match.initialServer || 'T1';
  const otherTeam = initTeam === 'T1' ? 'T2' : 'T1';

  // Determine starting server player for each team
  const t1StartPlayer = (initTeam === 'T1' && match.initialServerPlayer)
    ? match.initialServerPlayer
    : (match.initialServerPlayerT1 || 'L');

  const t2StartPlayer = (initTeam === 'T2' && match.initialServerPlayer)
    ? match.initialServerPlayer
    : (match.initialServerPlayerT2 || 'L');

  if (isTiebreak) {
    const tbTotal = (tiebreakPoints.T1 || 0) + (tiebreakPoints.T2 || 0);
    const baseGameIdx = totalGamesPlayed;
    if (tbTotal === 0) {
      return getServerForRegularGame(match, baseGameIdx, initTeam, otherTeam, t1StartPlayer, t2StartPlayer);
    }
    const cycle = Math.floor((tbTotal - 1) / 2) + 1;
    return getServerForRegularGame(match, baseGameIdx + cycle, initTeam, otherTeam, t1StartPlayer, t2StartPlayer);
  }

  return getServerForRegularGame(match, totalGamesPlayed, initTeam, otherTeam, t1StartPlayer, t2StartPlayer);
}

function getServerForRegularGame(match, gameIndex, initTeam, otherTeam, t1StartPlayer, t2StartPlayer) {
  const team = (gameIndex % 2 === 0) ? initTeam : otherTeam;
  const serviceGameCount = Math.floor(gameIndex / 2);
  const isSecondServer = (serviceGameCount % 2 === 1);

  let playerSide;
  if (team === 'T1') {
    playerSide = isSecondServer ? (t1StartPlayer === 'L' ? 'R' : 'L') : t1StartPlayer;
  } else {
    playerSide = isSecondServer ? (t2StartPlayer === 'L' ? 'R' : 'L') : t2StartPlayer;
  }

  const teamObj = team === 'T1' ? match.team1 : match.team2;
  const playerName = playerSide === 'L' ? (teamObj.leftPlayer || 'Left') : (teamObj.rightPlayer || 'Right');

  return {
    team,
    player: playerSide,
    name: playerName,
    label: `${teamObj.name} (${playerName})`
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
  let totalGamesPlayed = 0;

  for (let i = 0; i < (match.points || []).length; i++) {
    const pt = match.points[i];
    const winner = pt.team;
    const loser = winner === 'T1' ? 'T2' : 'T1';

    if (matchFinished) break;

    if (isTiebreak) {
      tiebreakPoints[winner]++;
      const pW = tiebreakPoints[winner];
      const pL = tiebreakPoints[loser];

      if (pW >= 7 && (pW - pL) >= 2) {
        games[winner]++;
        setsWon[winner]++;
        completedSets.push({
          set: currentSet,
          t1: games.T1,
          t2: games.T2,
          tiebreak: { T1: tiebreakPoints.T1, T2: tiebreakPoints.T2 }
        });

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
            gameWon = true; // Punto de Oro
          } else {
            gameScore[winner] = 'Ad';
          }
        } else if (curL === 'Ad') {
          gameScore[loser] = '40';
        } else {
          gameWon = true;
        }
      } else if (curW === 'Ad') {
        gameWon = true;
      }

      if (gameWon) {
        games[winner]++;
        totalGamesPlayed++;
        gameScore = { T1: '0', T2: '0' };

        const gW = games[winner];
        const gL = games[loser];

        if (gW >= 6 && (gW - gL) >= 2) {
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
          isTiebreak = true;
          tiebreakPoints = { T1: 0, T2: 0 };
        }
      }
    }
  }

  // Calculate current server with full player resolution
  const server = getServerDetails(match, totalGamesPlayed, isTiebreak, tiebreakPoints);

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
    currentServerTeam: server.team,
    currentServerPlayer: server.player,
    currentServerName: server.name,
    currentServerLabel: server.label
  };
}

/**
 * Replays match points and produces:
 * - games: list of all games (Game 1, Game 2...) with server, score, winner, break status & points
 * - annotatedPoints: each point enriched with gameNumber, setNumber, server info, score before/after
 * - scoreMilestones: score checkpoints (e.g. 0-0, 1-0, 1-1, 2-1... 4-3, 6-4)
 */
export function getMatchGamesBreakdown(match) {
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
  let totalGamesPlayed = 0;

  const gamesList = [];
  const annotatedPoints = [];
  const scoreMilestones = [
    {
      id: 'start',
      label: 'Match Start (0 - 0)',
      setNumber: 1,
      gameNumber: 0,
      pointIndex: 0,
      scoreText: '0 - 0',
      games: { T1: 0, T2: 0 }
    }
  ];

  let currentGamePoints = [];
  let gameStartIndex = 0;
  let gameScoreBeforeThisGame = `${games.T1} - ${games.T2}`;

  const points = match.points || [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const winner = pt.team;
    const loser = winner === 'T1' ? 'T2' : 'T1';

    const server = getServerDetails(match, totalGamesPlayed, isTiebreak, tiebreakPoints);
    const scoreBeforePoint = {
      isTiebreak,
      games: { ...games },
      gameScore: { ...gameScore },
      tiebreakPoints: { ...tiebreakPoints }
    };

    let gameWon = false;
    let setWon = false;

    if (isTiebreak) {
      tiebreakPoints[winner]++;
      const pW = tiebreakPoints[winner];
      const pL = tiebreakPoints[loser];

      if (pW >= 7 && (pW - pL) >= 2) {
        games[winner]++;
        setsWon[winner]++;
        completedSets.push({
          set: currentSet,
          t1: games.T1,
          t2: games.T2,
          tiebreak: { T1: tiebreakPoints.T1, T2: tiebreakPoints.T2 }
        });
        gameWon = true;
        setWon = true;
      }
    } else {
      const curW = gameScore[winner];
      const curL = gameScore[loser];

      if (curW === '0') gameScore[winner] = '15';
      else if (curW === '15') gameScore[winner] = '30';
      else if (curW === '30') gameScore[winner] = '40';
      else if (curW === '40') {
        if (curL === '40') {
          if (!isAdvantage) gameWon = true;
          else gameScore[winner] = 'Ad';
        } else if (curL === 'Ad') {
          gameScore[loser] = '40';
        } else {
          gameWon = true;
        }
      } else if (curW === 'Ad') {
        gameWon = true;
      }

      if (gameWon) {
        games[winner]++;
        totalGamesPlayed++;

        const gW = games[winner];
        const gL = games[loser];
        if (gW >= 6 && (gW - gL) >= 2) {
          setsWon[winner]++;
          completedSets.push({
            set: currentSet,
            t1: games.T1,
            t2: games.T2,
            tiebreak: null
          });
          setWon = true;
        } else if (gW === 6 && gL === 6) {
          isTiebreak = true;
          tiebreakPoints = { T1: 0, T2: 0 };
        }
      }
    }

    const currentOverallGameNumber = totalGamesPlayed + (gameWon ? 0 : 1);
    const currentGameInSet = games.T1 + games.T2 + (gameWon ? 0 : 1);

    const annotatedPt = {
      ...pt,
      pointIndex: i + 1,
      setNumber: currentSet,
      gameNumber: currentOverallGameNumber,
      gameInSet: currentGameInSet,
      isTiebreak,
      serverTeam: server.team,
      serverPlayer: server.player,
      serverName: server.name,
      serverLabel: server.label,
      gamesScoreBefore: scoreBeforePoint.games,
      gameScoreBefore: scoreBeforePoint.gameScore,
      tiebreakPointsBefore: scoreBeforePoint.tiebreakPoints,
      gamesScoreAfter: { ...games },
      gameScoreAfter: { ...gameScore },
      tiebreakPointsAfter: { ...tiebreakPoints },
      isGamePoint: gameWon,
      gameWinner: gameWon ? winner : null,
      isBreak: gameWon ? (winner !== server.team) : false,
      scoreDisplayAfter: isTiebreak
        ? `TB ${tiebreakPoints.T1}-${tiebreakPoints.T2}`
        : `${gameScore.T1}-${gameScore.T2}`
    };

    annotatedPoints.push(annotatedPt);
    currentGamePoints.push(annotatedPt);

    if (gameWon) {
      const isBreak = winner !== server.team;
      const gameObj = {
        gameNumber: currentOverallGameNumber,
        setNumber: currentSet,
        gameInSet: currentGameInSet,
        serverTeam: server.team,
        serverPlayer: server.player,
        serverName: server.name,
        receiverTeam: server.team === 'T1' ? 'T2' : 'T1',
        winnerTeam: winner,
        isBreak,
        isTiebreak,
        scoreBefore: gameScoreBeforeThisGame,
        scoreAfter: `${games.T1} - ${games.T2}`,
        pointsCount: currentGamePoints.length,
        startIndex: gameStartIndex,
        endIndex: i,
        points: [...currentGamePoints],
        inProgress: false
      };
      gamesList.push(gameObj);

      scoreMilestones.push({
        id: `game_${currentOverallGameNumber}`,
        label: `Score ${games.T1} - ${games.T2} (End of Game ${currentOverallGameNumber})`,
        setNumber: currentSet,
        gameNumber: currentOverallGameNumber,
        pointIndex: i + 1,
        scoreText: `${games.T1} - ${games.T2}`,
        games: { ...games }
      });

      gameScore = { T1: '0', T2: '0' };
      currentGamePoints = [];
      gameStartIndex = i + 1;
      gameScoreBeforeThisGame = `${games.T1} - ${games.T2}`;

      if (setWon) {
        if (setsWon[winner] >= setsToWin) {
          matchFinished = true;
          matchWinner = winner;
        } else {
          currentSet++;
          games = { T1: 0, T2: 0 };
          gameScore = { T1: '0', T2: '0' };
          isTiebreak = false;
          tiebreakPoints = { T1: 0, T2: 0 };
          gameScoreBeforeThisGame = '0 - 0';
        }
      }
    }
  }

  // Handle uncompleted game in progress
  if (currentGamePoints.length > 0) {
    const server = getServerDetails(match, totalGamesPlayed, isTiebreak, tiebreakPoints);
    const uncompletedGameNumber = totalGamesPlayed + 1;
    const currentGameInSet = games.T1 + games.T2 + 1;
    gamesList.push({
      gameNumber: uncompletedGameNumber,
      setNumber: currentSet,
      gameInSet: currentGameInSet,
      serverTeam: server.team,
      serverPlayer: server.player,
      serverName: server.name,
      receiverTeam: server.team === 'T1' ? 'T2' : 'T1',
      winnerTeam: null,
      isBreak: false,
      isTiebreak,
      scoreBefore: gameScoreBeforeThisGame,
      scoreAfter: `In progress (${gameScore.T1}-${gameScore.T2})`,
      pointsCount: currentGamePoints.length,
      startIndex: gameStartIndex,
      endIndex: points.length - 1,
      points: [...currentGamePoints],
      inProgress: true
    });

    scoreMilestones.push({
      id: 'current',
      label: `Current Score (${games.T1} - ${games.T2}, ${gameScore.T1}-${gameScore.T2})`,
      setNumber: currentSet,
      gameNumber: uncompletedGameNumber,
      pointIndex: points.length,
      scoreText: `${games.T1} - ${games.T2}`,
      games: { ...games }
    });
  }

  return {
    games: gamesList,
    annotatedPoints,
    scoreMilestones,
    scoreState: computeMatchScore(match)
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

// Demo Match Generator with realistic professional padel stats across 10 games (6-4 in Set 1, with milestone at 4-3)
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
    initialServerTeam: 'T1',
    initialServerPlayer: 'L',
    initialServerPlayerT1: 'L',
    initialServerPlayerT2: 'L',
    initialServer: 'T1',
    points: []
  };

  // Realistic point-by-point distribution forming 10 full games (6-4 set, hitting 4-3 at Game 7)
  const demoShots = [
    // Game 1: T1 serves (Ale Galán L) -> T1 holds (1-0)
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Deep slice bandeja to corner' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Kick smash brought back over net' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Bajada down the middle line' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Cross court drop volley' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Serve', note: 'Ace down the center T' },

    // Game 2: T2 serves (Agustín Tapia L) -> T2 holds (1-1)
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Power smash out by 3' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Ret. Serve', note: 'Aggressive return winner down line' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Vib', note: 'Heavy sidespin vibora into side fence' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Chiquita into feet followed by volley' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Bajada into deep corner' },

    // Game 3: T1 serves (Juan Lebrón R) -> T1 holds (2-1)
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Flat smash winner' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Bandeja forcing weak reply' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Drop', note: 'Disguised backhand dropshot' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Fast volley exchange won' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Lebrón overhead smash finish' },

    // Game 4: T2 serves (Arturo Coello R) -> T1 BREAKS! (3-1)
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Ret. Serve', note: 'Return winner off Coello serve' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'BVol', note: 'Crisp backhand volley to fence' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Coello left-handed smash' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Precision chiquita dipping low' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Lebrón break point conversion' },

    // Game 5: T1 serves (Ale Galán L) -> T2 BREAKS BACK! (3-2)
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Tapia lightning bajada' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Ret. Serve', note: 'Coello blistering return winner' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Galán low bandeja to corner' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Tapia drop chiquita' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Drop', note: 'Coello drop volley break' },

    // Game 6: T2 serves (Agustín Tapia L) -> T1 BREAKS! (4-2)
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Ret. Serve', note: 'Lebrón return forcing net error' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Galán reflex volley winner' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Tapia jump smash' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Band', note: 'Bandeja dying on glass wall' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Vib', note: 'Coello vibora into fence' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Punto de Oro break by Galán' },

    // Game 7: T1 serves (Juan Lebrón R) -> T2 BREAKS! (4-3)
    // *** SCORE IS 4-3 AFTER THIS GAME ***
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Ret. Serve', note: 'Tapia return winner down line' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Lebrón overhead smash' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Baj', note: 'Coello heavy bajada' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'FVol', note: 'Galán stop volley' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Chiq.', note: 'Tapia chiquita to feet' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Drop', note: 'Coello dropshot breaks to make it 4-3!' },

    // Game 8: T2 serves (Arturo Coello R) -> T1 BREAKS! (5-3)
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Ret. Serve', note: 'Galán sharp return' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Band', note: 'Lebrón bandeja to back glass' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Coello kick smash' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Galán bajada winner down line' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'FVol', note: 'Lebrón volley winner to lead 5-3' },

    // Game 9: T1 serves (Ale Galán L) -> T2 BREAKS! (5-4)
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Ret. Serve', note: 'Tapia aggressive return' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Galán smash winner' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Vib', note: 'Coello crosscourt vibora' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Baj', note: 'Tapia back wall bajada' },
    { team: 'T2', wonBy: 'W', player: 'R', shot: 'Smash', note: 'Coello overhead break to reach 5-4' },

    // Game 10: T2 serves (Agustín Tapia L) -> T1 BREAKS TO WIN SET (6-4)!
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'Ret. Serve', note: 'Lebrón return winner' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Band', note: 'Galán precise bandeja' },
    { team: 'T2', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Tapia smash save' },
    { team: 'T1', wonBy: 'W', player: 'R', shot: 'BVol', note: 'Lebrón crisp backhand volley (Set Pt)' },
    { team: 'T1', wonBy: 'W', player: 'L', shot: 'Smash', note: 'Galán jump smash wins Set 1 (6-4)!' }
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
