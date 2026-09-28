// Analytics & Statistical Engine for Padel Matches
import { SHOT_TYPES } from './shotTypes.js';

export function calculateMatchStatistics(match) {
  const points = match.points || [];
  
  // Initialize matrix for each shot type
  const shotIds = SHOT_TYPES.map(s => s.id);
  
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
    // shotStats[shotId] = { t1Winners, t2Winners, t1Errors, t2Errors, total }
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
    const oppTeam = isT1 ? 'T2' : 'T1';
    
    if (isT1) {
      stats.t1TotalWon++;
      runningDiff++;
    } else {
      stats.t2TotalWon++;
      runningDiff--;
    }

    stats.momentum.push({
      pointIndex: idx + 1,
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
      // Winner made by the winning team's player
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
      // Error committed by the losing team's player
      // In the score sheet: Won by E = opponent's error
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
    const netTypes = ['FVol', 'BVol'];
    const overheadTypes = ['Smash', 'Band', 'Baj', 'Vib'];
    const baselineTypes = ['F.H', 'B.H', 'Lob', 'Drop', 'Chiq.', 'Ret. Serve'];

    const scoringTeam = pt.team;
    if (netTypes.includes(shotId)) stats.netShots[scoringTeam]++;
    else if (overheadTypes.includes(shotId)) stats.overheadShots[scoringTeam]++;
    else if (baselineTypes.includes(shotId)) stats.baselineShots[scoringTeam]++;
  });

  return stats;
}

// Generate Coach & Tactical Insights
export function generateTacticalInsights(stats, match) {
  const insights = [];

  if (stats.totalPoints === 0) {
    return ['Start logging points to see live tactical analysis and player performance insights.'];
  }

  // 1. Dominance & Winner/Error ratio
  const t1Ratio = stats.t1Errors > 0 ? (stats.t1Winners / stats.t1Errors).toFixed(2) : stats.t1Winners;
  const t2Ratio = stats.t2Errors > 0 ? (stats.t2Winners / stats.t2Errors).toFixed(2) : stats.t2Winners;

  if (stats.t1Winners > stats.t2Winners) {
    insights.push(`🔥 **${match.team1.name}** is more offensive with **${stats.t1Winners}** winners (W/E ratio: ${t1Ratio}).`);
  } else if (stats.t2Winners > stats.t1Winners) {
    insights.push(`🔥 **${match.team2.name}** is leading the offense with **${stats.t2Winners}** winners (W/E ratio: ${t2Ratio}).`);
  }

  // 2. Best overhead weapons
  const t1Overheads = (stats.shotMatrix['Smash']?.t1Winners || 0) + (stats.shotMatrix['Band']?.t1Winners || 0) + (stats.shotMatrix['Vib']?.t1Winners || 0);
  const t2Overheads = (stats.shotMatrix['Smash']?.t2Winners || 0) + (stats.shotMatrix['Band']?.t2Winners || 0) + (stats.shotMatrix['Vib']?.t2Winners || 0);
  
  if (t1Overheads > 0 || t2Overheads > 0) {
    const leaderTeam = t1Overheads >= t2Overheads ? match.team1.name : match.team2.name;
    const count = Math.max(t1Overheads, t2Overheads);
    insights.push(`💥 **Overhead Dominance:** ${leaderTeam} produced **${count}** winners from Smashes, Bandejas & Viboras.`);
  }

  // 3. Return of Serve efficiency (User requested shot!)
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

  // 4. Player Left vs Right comparison
  const p1L = stats.players['T1-L'];
  const p1R = stats.players['T1-R'];
  if (p1L && p1R && (p1L.winners > 0 || p1R.winners > 0)) {
    if (p1L.winners > p1R.winners) {
      insights.push(`🛡️ **${match.team1.name} Left Player (${p1L.name})** leads their team attack with **${p1L.winners}** winners.`);
    } else if (p1R.winners > p1L.winners) {
      insights.push(`🛡️ **${match.team1.name} Right Player (${p1R.name})** leads their team attack with **${p1R.winners}** winners.`);
    }
  }

  const p2L = stats.players['T2-L'];
  const p2R = stats.players['T2-R'];
  if (p2L && p2R && (p2L.winners > 0 || p2R.winners > 0)) {
    if (p2L.winners > p2R.winners) {
      insights.push(`🛡️ **${match.team2.name} Left Player (${p2L.name})** leads their team attack with **${p2L.winners}** winners.`);
    } else if (p2R.winners > p2L.winners) {
      insights.push(`🛡️ **${match.team2.name} Right Player (${p2R.name})** leads their team attack with **${p2R.winners}** winners.`);
    }
  }

  // 5. Net Game battle
  const netT1 = stats.netShots.T1;
  const netT2 = stats.netShots.T2;
  if (netT1 > 0 || netT2 > 0) {
    const netLeader = netT1 >= netT2 ? match.team1.name : match.team2.name;
    insights.push(`⚡ **Net Control:** ${netLeader} won more points at the volley (${Math.max(netT1, netT2)} vs ${Math.min(netT1, netT2)}).`);
  }

  return insights;
}
