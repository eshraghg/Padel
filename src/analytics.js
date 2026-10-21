// Analytics & Statistical Engine for Padel / Tennis Matches
import { getSport, getShotTypes, isSingles } from './sports.js';
import { isServeShot } from './shotTypes.js';

export function calculateMatchStatistics(match, pointsSubset = null) {
  const points = pointsSubset !== null ? pointsSubset : (match.points || []);
  
  // Initialize matrix for each shot type
  const shotIds = getShotTypes(match).map(s => s.id);
  
  const stats = {
    totalPoints: points.length,
    t1TotalWon: 0,
    t2TotalWon: 0,
    t1Winners: 0,
    t2Winners: 0,
    t1Errors: 0,
    t2Errors: 0,

    // Player breakdowns
    players: {
      'T1-L': { name: match.team1.leftPlayer || 'T1 Left', winners: 0, errors: 0, shots: {} },
      'T1-R': { name: match.team1.rightPlayer || 'T1 Right', winners: 0, errors: 0, shots: {} },
      'T2-L': { name: match.team2.leftPlayer || 'T2 Left', winners: 0, errors: 0, shots: {} },
      'T2-R': { name: match.team2.rightPlayer || 'T2 Right', winners: 0, errors: 0, shots: {} }
    },

    // Per shot matrix (Matching PDF End-of-Set Summary + Ret. Serve)
    shotMatrix: {},

    // Net vs Baseline
    netShots: { T1: 0, T2: 0 },
    baselineShots: { T1: 0, T2: 0 },
    overheadShots: { T1: 0, T2: 0 },

    // Momentum curve (point differential: T1 points - T2 points over time)
    momentum: []
  };

  // Prepopulate shot matrix
  shotIds.forEach(id => {
    stats.shotMatrix[id] = {
      t1Winners: 0,
      t2Winners: 0,
      t1Errors: 0,
      t2Errors: 0,
      total: 0
    };
    Object.keys(stats.players).forEach(pKey => {
      stats.players[pKey].shots[id] = { winners: 0, errors: 0 };
    });
  });

  let runningDiff = 0;

  points.forEach((pt, idx) => {
    const isT1 = pt.team === 'T1';
    
    if (isT1) {
      stats.t1TotalWon++;
      runningDiff++;
    } else {
      stats.t2TotalWon++;
      runningDiff--;
    }

    stats.momentum.push({
      pointIndex: idx + 1,
      matchIndex: pt.pointIndex || (idx + 1),
      diff: runningDiff,
      winner: pt.team,
      shot: pt.shot
    });

    const shotId = pt.shot;
    if (!stats.shotMatrix[shotId]) {
      stats.shotMatrix[shotId] = { t1Winners: 0, t2Winners: 0, t1Errors: 0, t2Errors: 0, total: 0 };
    }
    stats.shotMatrix[shotId].total++;

    const isWinner = pt.wonBy === 'W';
    const playerSide = pt.player === 'R' ? 'R' : 'L';

    if (isWinner) {
      if (isT1) {
        stats.t1Winners++;
        stats.shotMatrix[shotId].t1Winners++;
        const pKey = `T1-${playerSide}`;
        if (stats.players[pKey]) {
          stats.players[pKey].winners++;
          if (stats.players[pKey].shots[shotId]) stats.players[pKey].shots[shotId].winners++;
        }
      } else {
        stats.t2Winners++;
        stats.shotMatrix[shotId].t2Winners++;
        const pKey = `T2-${playerSide}`;
        if (stats.players[pKey]) {
          stats.players[pKey].winners++;
          if (stats.players[pKey].shots[shotId]) stats.players[pKey].shots[shotId].winners++;
        }
      }
    } else {
      if (isT1) {
        // T1 won point because T2 committed an error
        stats.t2Errors++;
        stats.shotMatrix[shotId].t2Errors++;
        const pKey = `T2-${playerSide}`;
        if (stats.players[pKey]) {
          stats.players[pKey].errors++;
          if (stats.players[pKey].shots[shotId]) stats.players[pKey].shots[shotId].errors++;
        }
      } else {
        // T2 won point because T1 committed an error
        stats.t1Errors++;
        stats.shotMatrix[shotId].t1Errors++;
        const pKey = `T1-${playerSide}`;
        if (stats.players[pKey]) {
          stats.players[pKey].errors++;
          if (stats.players[pKey].shots[shotId]) stats.players[pKey].shots[shotId].errors++;
        }
      }
    }

    // Shot grouping stats
    const netTypes = ['FVol', 'BVol', 'FDVol', 'BDVol', 'H.Volley'];
    const overheadTypes = ['Smash', 'Band', 'Baj', 'Vib', 'Rulo', 'Gancho'];
    const baselineTypes = ['F.H', 'B.H', 'FSlice', 'BSlice', 'Lob', 'Drop', 'Chiq.', 'Ret. Serve', 'Serve', 'C.Pared',
      'F.H DTL', 'F.H CC', 'B.H DTL', 'B.H CC', 'On Rise', 'Kick S.', 'Slice S.', 'Flat S.'];

    const scoringTeam = pt.team;
    if (netTypes.includes(shotId)) stats.netShots[scoringTeam]++;
    else if (overheadTypes.includes(shotId)) stats.overheadShots[scoringTeam]++;
    else if (baselineTypes.includes(shotId)) stats.baselineShots[scoringTeam]++;
  });

  return stats;
}

/**
 * Player ranking (lowest → highest): D, D+, C-, C, C+
 * Based on the number of distinct shot types the player was credited with
 * (a winner or an error), excluding serves (padel 'Serve', tennis Kick / Slice / Flat).
 * Padel (19 types): < 6 D • 6–8 D+ • 9–10 C- • 11+ C / C+
 * Tennis (18 types): same thresholds as padel
 * At the top level: C if errors >= winners, otherwise C+ (winners/errors also exclude serves)
 */
export function getPlayerRank(playerStats, match = null) {
  const t = getSport(match).rankThresholds;
  let winners = 0;
  let errors = 0;
  let shotTypes = 0;
  Object.entries(playerStats.shots || {}).forEach(([shotId, s]) => {
    if (isServeShot(shotId)) return;
    const w = s.winners || 0;
    const e = s.errors || 0;
    winners += w;
    errors += e;
    if (w + e > 0) shotTypes++;
  });

  if (shotTypes < t.dPlus) return 'D';
  if (shotTypes < t.cMinus) return 'D+';
  if (shotTypes < t.c) return 'C-';
  return errors >= winners ? 'C' : 'C+';
}

// Generate Coach & Tactical Insights (Context-aware for Game / Period Filters)
export function generateTacticalInsights(stats, match, filterContext = null) {
  const insights = [];

  if (stats.totalPoints === 0) {
    return ['No points found for the selected scope. Adjust the filter or log points to see insights.'];
  }

  // 1. Context header if filtered to Game or Period
  if (filterContext && filterContext.mode === 'game' && filterContext.game) {
    const g = filterContext.game;
    const winnerName = g.winnerTeam === 'T1' ? match.team1.name : (g.winnerTeam === 'T2' ? match.team2.name : 'In Progress');
    const outcomeText = g.winnerTeam ? `won by **${winnerName}** (${g.scoreBefore} ➔ ${g.scoreAfter})` : `currently in progress`;
    const breakText = g.isBreak ? '⚡ **Service Break!** The receiving team broke serve here.' : (g.winnerTeam ? '🛡️ **Service Hold:** Serving team held their service game.' : '');
    insights.push(`🎯 **Game ${g.gameNumber} Analysis:** Game was ${outcomeText} in ${g.pointsCount} points. Server: **${g.serverName}** (${g.serverTeam}). ${breakText}`);
  } else if (filterContext && filterContext.mode === 'period') {
    const leaderTeam = stats.t1TotalWon > stats.t2TotalWon
      ? match.team1.name
      : (stats.t2TotalWon > stats.t1TotalWon ? match.team2.name : 'Tied');
    insights.push(`⏱️ **Period Analysis (${filterContext.label}):** Across these ${stats.totalPoints} points, ${leaderTeam !== 'Tied' ? `**${leaderTeam}** controlled the run` : 'both teams were dead even'} (${stats.t1TotalWon} - ${stats.t2TotalWon} points).`);
  }

  // 2. Dominance & Winner/Error ratio
  const t1Ratio = stats.t1Errors > 0 ? (stats.t1Winners / stats.t1Errors).toFixed(2) : stats.t1Winners;
  const t2Ratio = stats.t2Errors > 0 ? (stats.t2Winners / stats.t2Errors).toFixed(2) : stats.t2Winners;

  if (stats.t1Winners > stats.t2Winners) {
    insights.push(`🔥 **${match.team1.name}** is more offensive with **${stats.t1Winners}** winners (W/E ratio: ${t1Ratio}).`);
  } else if (stats.t2Winners > stats.t1Winners) {
    insights.push(`🔥 **${match.team2.name}** is leading the offense with **${stats.t2Winners}** winners (W/E ratio: ${t2Ratio}).`);
  }

  // 3. Best overhead weapons
  const sport = getSport(match);
  const t1Overheads = countOverheadWinners(stats, match, 't1Winners');
  const t2Overheads = countOverheadWinners(stats, match, 't2Winners');

  if (t1Overheads > 0 || t2Overheads > 0) {
    const leaderTeam = t1Overheads >= t2Overheads ? match.team1.name : match.team2.name;
    const count = Math.max(t1Overheads, t2Overheads);
    insights.push(`💥 **Overhead Dominance:** ${leaderTeam} produced **${count}** winners from ${sport.overheadInsight}.`);
  }

  // 4. Return of Serve efficiency
  const retWinnersT1 = stats.shotMatrix['Ret. Serve']?.t1Winners || 0;
  const retErrorsT1 = stats.shotMatrix['Ret. Serve']?.t1Errors || 0;
  const retWinnersT2 = stats.shotMatrix['Ret. Serve']?.t2Winners || 0;
  const retErrorsT2 = stats.shotMatrix['Ret. Serve']?.t2Errors || 0;

  if (retWinnersT1 > 0 || retWinnersT2 > 0) {
    insights.push(`↩️ **Return of Serve:** ${match.team1.name} has ${retWinnersT1} return winners; ${match.team2.name} has ${retWinnersT2} return winners.`);
  }
  if (retErrorsT1 > 2) {
    insights.push(`⚠️ **Return Caution:** ${match.team1.name} has given away ${retErrorsT1} points on unforced return errors.`);
  }
  if (retErrorsT2 > 2) {
    insights.push(`⚠️ **Return Caution:** ${match.team2.name} has given away ${retErrorsT2} points on unforced return errors.`);
  }

  // 5. Player Left vs Right comparison (doubles only)
  const doubles = !isSingles(match);
  const p1L = stats.players['T1-L'];
  const p1R = stats.players['T1-R'];
  if (doubles && p1L && p1R && (p1L.winners > 0 || p1R.winners > 0)) {
    if (p1L.winners > p1R.winners) {
      insights.push(`🛡️ **${match.team1.name} Left Player (${p1L.name})** leads their team attack with **${p1L.winners}** winners.`);
    } else if (p1R.winners > p1L.winners) {
      insights.push(`🛡️ **${match.team1.name} Right Player (${p1R.name})** leads their team attack with **${p1R.winners}** winners.`);
    }
  }

  const p2L = stats.players['T2-L'];
  const p2R = stats.players['T2-R'];
  if (doubles && p2L && p2R && (p2L.winners > 0 || p2R.winners > 0)) {
    if (p2L.winners > p2R.winners) {
      insights.push(`🛡️ **${match.team2.name} Left Player (${p2L.name})** leads their team attack with **${p2L.winners}** winners.`);
    } else if (p2R.winners > p2L.winners) {
      insights.push(`🛡️ **${match.team2.name} Right Player (${p2R.name})** leads their team attack with **${p2R.winners}** winners.`);
    }
  }

  // 6. Net Game battle
  const netT1 = stats.netShots.T1;
  const netT2 = stats.netShots.T2;
  if (netT1 > 0 || netT2 > 0) {
    const netLeader = netT1 >= netT2 ? match.team1.name : match.team2.name;
    insights.push(`⚡ **Net Control:** ${netLeader} won more points at the volley (${Math.max(netT1, netT2)} vs ${Math.min(netT1, netT2)}).`);
  }

  return insights;
}

// Overhead winners for a team ('t1Winners' | 't2Winners', or both when field is omitted)
export function countOverheadWinners(stats, match, field = null) {
  const fields = field ? [field] : ['t1Winners', 't2Winners'];
  return getSport(match).overheadShots.reduce((sum, id) =>
    sum + fields.reduce((s, f) => s + (stats.shotMatrix[id]?.[f] || 0), 0), 0);
}
