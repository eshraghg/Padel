// Export Session as a Self-Contained HTML File
import { getSport, getSportId, isSingles, getShotTypes, getShotKeyText, getPlayerKeys, getMatchTypeLabel, getTeamPlayersText } from './sports.js';
import { computeMatchScore, getScoringRuleLabel, getPointPlayerName } from './state.js';
import { calculateMatchStatistics, generateTacticalInsights, getPlayerRank, countOverheadWinners } from './analytics.js';
import { renderRadarChartSvg, buildPlayerRadarData } from './radarChart.js';

export function generateReportFilename(match) {
  const clean = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\(\)\[\]]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .replace(/_+/g, '_');

  const p1 = clean(match.team1.leftPlayer) || 'T1L';
  const p2 = clean(match.team1.rightPlayer) || 'T1R';
  const p3 = clean(match.team2.leftPlayer) || 'T2L';
  const p4 = clean(match.team2.rightPlayer) || 'T2R';
  
  const dateStr = match.date || new Date().toISOString().split('T')[0];
  const sportName = getSport(match).name;
  if (isSingles(match)) return `${sportName}_${p1}_vs_${p3}_${dateStr}.html`;
  return `${sportName}_${p1}_${p2}_vs_${p3}_${p4}_${dateStr}.html`;
}

export function exportSessionToHtml(match, filteredPoints = null, filterContext = null) {
  const activePoints = filteredPoints !== null ? filteredPoints : (match.points || []);
  const scoreState = computeMatchScore(match);
  const stats = calculateMatchStatistics(match, activePoints);
  const insights = generateTacticalInsights(stats, match, filterContext, activePoints);
  const shotTypes = getShotTypes(match);
  const shotIds = shotTypes.map(s => s.id);
  const sport = getSport(match);
  const singles = isSingles(match);

  const t1 = match.team1;
  const t2 = match.team2;

  // Final scores string
  let finalScoresStr = 'In Progress';
  if (scoreState.completedSets.length > 0) {
    finalScoresStr = scoreState.completedSets.map(cs => {
      const tb = cs.tiebreak ? ` (TB ${cs.tiebreak.T1}-${cs.tiebreak.T2})` : '';
      return `${cs.t1}-${cs.t2}${tb}`;
    }).join(' , ');
  } else {
    finalScoresStr = `Set 1 (${scoreState.games.T1} - ${scoreState.games.T2})`;
  }

  const winnerName = scoreState.matchFinished 
    ? (scoreState.matchWinner === 'T1' ? t1.name : t2.name) 
    : 'Match In Progress';

  // Build Point-by-point table rows
  let tempMatch = { ...match, points: [] };
  let pointsRowsHtml = '';

  activePoints.forEach((pt, idx) => {
    tempMatch.points.push(pt);
    const stepScore = computeMatchScore(tempMatch);
    const isT1 = pt.team === 'T1';
    const wonByText = pt.wonBy === 'W' ? 'W (Winner)' : 'E (Error)';
    const wonClass = pt.wonBy === 'W' ? 'color-winner' : 'color-error';
    const playerText = getPointPlayerName(match, pt);

    pointsRowsHtml += `
      <tr>
        <td class="text-center font-bold">${pt.pointIndex || (idx + 1)}</td>
        <td class="text-center score-cell">T1: ${stepScore.isTiebreak ? stepScore.tiebreakPoints.T1 : stepScore.gameScore.T1} / T2: ${stepScore.isTiebreak ? stepScore.tiebreakPoints.T2 : stepScore.gameScore.T2}</td>
        <td class="text-center"><span class="badge ${isT1 ? 'badge-t1' : 'badge-t2'}">${pt.team}</span></td>
        <td class="text-center font-bold ${wonClass}">${wonByText}</td>
        <td class="text-center font-bold">${playerText}</td>
        <td class="text-center"><span class="badge-shot">${pt.shot}</span></td>
        <td class="note-cell">${pt.note || '—'}</td>
      </tr>
    `;
  });

  if (activePoints.length === 0) {
    pointsRowsHtml = `<tr><td colspan="7" class="text-center" style="padding:24px; color:#64748b;">No points recorded in this scope.</td></tr>`;
  }

  // Build Summary Matrix Rows
  let matrixHeaderHtml = `<tr><th style="text-align:left; min-width:140px;">Category</th>`;
  shotIds.forEach(id => {
    const isRet = id === 'Ret. Serve';
    matrixHeaderHtml += `<th class="${isRet ? 'th-highlight' : ''}">${id}</th>`;
  });
  matrixHeaderHtml += `<th>TOTAL</th></tr>`;

  let matrixBodyHtml = '';
  // T1 row
  matrixBodyHtml += `<tr class="row-t1"><td class="font-bold color-t1">T1 Winners (${t1.name})</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t1Winners || 0;
    matrixBodyHtml += `<td class="${val > 0 ? 'font-bold' : 'color-muted'}">${val}</td>`;
  });
  matrixBodyHtml += `<td class="font-bold color-t1">${stats.t1Winners}</td></tr>`;

  // Per-player sub-row (field: 'winners' | 'errors')
  const playerSubRow = (pKey, field) => {
    if (singles) return ''; // one player per side: the team row already covers it
    const p = stats.players[pKey];
    const side = pKey.endsWith('-L') ? 'L' : 'R';
    let row = `<tr class="row-sub"><td>↳ ${side}: ${p.name}</td>`;
    let total = 0;
    shotIds.forEach(id => {
      const val = p.shots[id]?.[field] || 0;
      total += val;
      row += `<td class="${val > 0 ? 'font-bold' : 'color-muted'}">${val}</td>`;
    });
    return row + `<td class="font-bold">${total}</td></tr>`;
  };

  // T1 L / R
  matrixBodyHtml += playerSubRow('T1-L', 'winners');
  matrixBodyHtml += playerSubRow('T1-R', 'winners');

  // T2 row
  matrixBodyHtml += `<tr class="row-t2"><td class="font-bold color-t2">T2 Winners (${t2.name})</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Winners || 0;
    matrixBodyHtml += `<td class="${val > 0 ? 'font-bold' : 'color-muted'}">${val}</td>`;
  });
  matrixBodyHtml += `<td class="font-bold color-t2">${stats.t2Winners}</td></tr>`;

  // T2 L / R
  matrixBodyHtml += playerSubRow('T2-L', 'winners');
  matrixBodyHtml += playerSubRow('T2-R', 'winners');

  // Errors
  matrixBodyHtml += `<tr><td class="font-bold color-error">T1 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t1Errors || 0;
    matrixBodyHtml += `<td class="${val > 0 ? 'font-bold' : 'color-muted'}">${val}</td>`;
  });
  matrixBodyHtml += `<td class="font-bold color-error">${stats.t1Errors}</td></tr>`;
  matrixBodyHtml += playerSubRow('T1-L', 'errors');
  matrixBodyHtml += playerSubRow('T1-R', 'errors');

  matrixBodyHtml += `<tr><td class="font-bold color-error">T2 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Errors || 0;
    matrixBodyHtml += `<td class="${val > 0 ? 'font-bold' : 'color-muted'}">${val}</td>`;
  });
  matrixBodyHtml += `<td class="font-bold color-error">${stats.t2Errors}</td></tr>`;
  matrixBodyHtml += playerSubRow('T2-L', 'errors');
  matrixBodyHtml += playerSubRow('T2-R', 'errors');

  // Total
  matrixBodyHtml += `<tr class="row-total"><td class="font-bold">Total Points Decided</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.total || 0;
    matrixBodyHtml += `<td class="font-bold">${val}</td>`;
  });
  matrixBodyHtml += `<td class="font-bold color-gold">${stats.totalPoints}</td></tr>`;

  // Insights List
  let insightsHtml = '';
  insights.forEach(ins => {
    insightsHtml += `<div class="insight-item">${ins.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
  });

  // Player Comparison Cards
  const playersList = getPlayerKeys(match).map(key => ({
    side: singles ? key.slice(1, 2) : key.slice(3),
    data: stats.players[key],
    teamColor: key.startsWith('T1') ? 'color-t1' : 'color-t2',
    teamTag: key.slice(0, 2)
  }));

  let playerCompHtml = '';
  playersList.forEach(p => {
    let topShot = '—';
    let topCount = 0;
    Object.entries(p.data.shots).forEach(([shotId, counts]) => {
      if (counts.winners > topCount) {
        topCount = counts.winners;
        topShot = shotId;
      }
    });

    playerCompHtml += `
      <div class="player-card">
        <div class="player-header">
          <span class="badge-side">${p.side}</span>
          <span class="font-bold ${p.teamColor}">${p.data.name}</span>
          <span class="badge-rank" title="Player rank (D → C+)">${getPlayerRank(p.data, match)}</span>
        </div>
        <div class="stat-line"><span>Winners:</span> <strong class="color-t1">${p.data.winners}</strong></div>
        <div class="stat-line"><span>Errors:</span> <strong class="color-error">${p.data.errors}</strong></div>
        <div class="stat-line"><span>Top Weapon:</span> <strong class="color-gold">${topShot} (${topCount})</strong></div>
      </div>
    `;
  });

  // Player Shot Radar Charts (Winners & Errors)
  const radarData = buildPlayerRadarData(stats, shotTypes, getPlayerKeys(match));
  let radarHtml = '';
  radarData.players.forEach(p => {
    const winnersTotal = p.winners.reduce((a, b) => a + b, 0);
    const errorsTotal = p.errors.reduce((a, b) => a + b, 0);
    radarHtml += `
      <div class="player-card radar-card">
        <div class="player-header">
          <span class="badge-side">${singles ? p.team.slice(1) : p.side}</span>
          <span class="font-bold ${p.team === 'T1' ? 'color-t1' : 'color-t2'}">${p.name}</span>
          <span class="badge-rank">${getPlayerRank(stats.players[p.key], match)}</span>
        </div>
        <div class="radar-pair">
          <div>
            <div class="radar-label color-winner">Winners (${winnersTotal})</div>
            ${renderRadarChartSvg({ labels: radarData.labels, values: p.winners, color: '#10b981', seriesLabel: 'Winners' })}
          </div>
          <div>
            <div class="radar-label color-error">Errors (${errorsTotal})</div>
            ${renderRadarChartSvg({ labels: radarData.labels, values: p.errors, color: '#ef4444', seriesLabel: 'Errors' })}
          </div>
        </div>
      </div>
    `;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sport.name} Match Report - ${t1.name} vs ${t2.name} (${match.date})</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --border: rgba(255,255,255,0.08);
      --t1: #10b981;
      --t2: #06b6d4;
      --gold: #f59e0b;
      --error: #ef4444;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px;
    }
    .container { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    
    /* Header */
    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--t1); padding-bottom: 12px; margin-bottom: 14px; }
    .title { font-size: 1.4rem; font-weight: 800; color: #fff; }
    .sub { font-size: 0.85rem; color: var(--muted); }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; font-size: 0.82rem; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid var(--border); }
    
    /* Result Box */
    .result-box { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1)); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
    .result-score { font-size: 1.3rem; font-weight: 900; color: var(--gold); }

    /* KPIs */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
    .kpi-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-val { font-size: 1.5rem; font-weight: 900; }
    .kpi-lbl { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; }

    /* Tables */
    .table-wrap { overflow-x: auto; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: center; }
    th { background: #1e293b; color: var(--muted); padding: 8px 6px; border: 1px solid var(--border); font-weight: 700; white-space: nowrap; }
    th.th-highlight { color: var(--t2); background: rgba(6,182,212,0.15); }
    td { padding: 7px 6px; border: 1px solid var(--border); }
    tr:nth-child(even) { background: rgba(255,255,255,0.015); }
    .row-t1 { background: rgba(16,185,129,0.06); }
    .row-t2 { background: rgba(6,182,212,0.06); }
    .row-sub { background: rgba(255,255,255,0.01); color: var(--muted); text-align: left; }
    .row-total { background: rgba(255,255,255,0.08); }

    /* Badges & Colors */
    .color-t1 { color: var(--t1); }
    .color-t2 { color: var(--t2); }
    .color-gold { color: var(--gold); }
    .color-error { color: var(--error); }
    .color-winner { color: var(--t1); }
    .color-muted { color: rgba(255,255,255,0.2); }
    .font-bold { font-weight: 800; }
    .text-center { text-align: center; }
    .badge { padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 0.72rem; }
    .badge-t1 { background: rgba(16,185,129,0.2); color: var(--t1); }
    .badge-t2 { background: rgba(6,182,212,0.2); color: var(--t2); }
    .badge-shot { background: #1e293b; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
    .score-cell { font-family: monospace; font-weight: 700; color: #cbd5e1; }
    .note-cell { color: var(--muted); font-size: 0.72rem; text-align: left; }

    /* Insights */
    .insight-item { background: rgba(255,255,255,0.03); border-left: 3px solid var(--t1); padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; font-size: 0.85rem; }
    .insight-line { margin-top: 4px; }
    .insight-details { margin: 2px 0 4px 12px; font-size: 0.78rem; color: var(--muted); }
    .insight-details summary { cursor: pointer; color: var(--gold); font-weight: 700; }

    /* Player Comp */
    .player-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; }
    .player-card { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
    .player-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .badge-side { width: 22px; height: 22px; background: #334155; border-radius: 4px; font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
    .badge-rank { margin-left: auto; padding: 1px 8px; border-radius: 4px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.4); color: var(--gold); font-weight: 900; font-size: 0.78rem; }
    .radar-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 10px; margin-top: 10px; }
    .radar-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .radar-label { text-align: center; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    @media (max-width: 480px) { .radar-grid { grid-template-columns: 1fr; } .radar-pair { grid-template-columns: 1fr; } }
    .stat-line { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--muted); padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }

    .print-btn { background: var(--t1); color: #022c22; font-weight: 800; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; float: right; }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .card { background: #fff !important; border: 1px solid #ccc !important; }
      .print-btn { display: none !important; }
      th { background: #1e293b !important; color: #fff !important; }
      td { border-color: #cbd5e1 !important; color: #000 !important; }
      .color-t1, .color-t2 { color: #000 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header-box">
        <div>
          <div class="title">Bolouri Tennis & Padel Academy</div>
          <div class="sub">Official ${getMatchTypeLabel(match)} Game-Score Analysis & Match Report</div>
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
      </div>

      <div class="meta-grid">
        <div><strong>Date:</strong> ${match.date || '-'}</div>
        <div><strong>Court:</strong> ${match.court || '-'}</div>
        <div><strong>Format:</strong> ${getMatchTypeLabel(match)} • ${match.format} • ${getScoringRuleLabel(match.scoringRule, getSportId(match))}</div>
        <div><strong>Initial Server:</strong> ${match.initialServerTeam === 'T2' ? match.team2.name : match.team1.name}${singles ? '' : ` (${match.initialServerPlayer === 'R' ? 'Right' : 'Left'})`}</div>
        <div><strong>${singles ? 'Player 1' : 'Team 1'}:</strong> ${getTeamPlayersText(match, t1)}</div>
        <div><strong>${singles ? 'Player 2' : 'Team 2'}:</strong> ${getTeamPlayersText(match, t2)}</div>
        ${filterContext && filterContext.mode !== 'all' ? `<div style="grid-column: 1 / -1; background: rgba(16,185,129,0.15); padding: 8px 12px; border-radius: 6px; color: var(--t1); font-weight:700;"><strong>🎯 Analysis Scope:</strong> ${filterContext.label || (filterContext.mode === 'game' ? 'Game ' + filterContext.gameNumber : 'Filtered Period')} (${activePoints.length} points)</div>` : ''}
      </div>
    </div>

    <!-- Match Result & KPIs -->
    <div class="card">
      <div class="result-box">
        <div>
          <div style="font-size:0.85rem; color:var(--muted); font-weight:700;">MATCH OUTCOME</div>
          <div style="font-size:1.2rem; font-weight:800; color:#fff;">${winnerName}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.85rem; color:var(--muted); font-weight:700;">FINAL SET SCORES</div>
          <div class="result-score">${finalScoresStr}</div>
        </div>
      </div>

      <div class="kpi-grid" style="margin-top:14px;">
        <div class="kpi-card">
          <div class="kpi-lbl">Total Points</div>
          <div class="kpi-val">${stats.totalPoints}</div>
          <div style="font-size:0.75rem; color:var(--muted);">${stats.t1TotalWon} - ${stats.t2TotalWon}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Winners (T1 / T2)</div>
          <div class="kpi-val color-t1">${stats.t1Winners} / ${stats.t2Winners}</div>
          <div style="font-size:0.75rem; color:var(--muted);">Total: ${stats.t1Winners + stats.t2Winners}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Return Winners</div>
          <div class="kpi-val color-t2">${(stats.shotMatrix['Ret. Serve']?.t1Winners || 0) + (stats.shotMatrix['Ret. Serve']?.t2Winners || 0)}</div>
          <div style="font-size:0.75rem; color:var(--muted);">Ret. Serve points</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Overhead Winners</div>
          <div class="kpi-val color-gold">${countOverheadWinners(stats, match)}</div>
          <div style="font-size:0.75rem; color:var(--muted);">${sport.overheadLabel}</div>
        </div>
      </div>
    </div>

    <!-- Tactical Coaching Insights -->
    <div class="card">
      <h3 style="font-size:1rem; font-weight:800; margin-bottom:10px;">🧠 Tactical & Coaching Takeaways</h3>
      ${insightsHtml}
    </div>

    <!-- Player Comparison (Left vs Right) -->
    <div class="card">
      <h3 style="font-size:1rem; font-weight:800;">👥 Player Performance${singles ? '' : ' (Left vs Right)'}</h3>
      <div class="player-grid">
        ${playerCompHtml}
      </div>
    </div>

    <!-- Player Shot Radar Charts -->
    <div class="card">
      <h3 style="font-size:1rem; font-weight:800;">🕸️ Player Shot Radar (Winners vs Errors)</h3>
      <div class="sub">Number of shots per shot type for each player</div>
      <div class="radar-grid">
        ${radarHtml}
      </div>
    </div>

    <!-- End-of-Set Summary Matrix -->
    <div class="card">
      <h3 style="font-size:1rem; font-weight:800;">📊 End-of-Set Summary Matrix</h3>
      <div class="sub" style="margin-bottom:8px;">Breakdown by shot type matching Bolouri Academy Score Sheet (Page 4)</div>
      <div class="table-wrap">
        <table>
          <thead>
            ${matrixHeaderHtml}
          </thead>
          <tbody>
            ${matrixBodyHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Point-by-Point Scoresheet -->
    <div class="card">
      <h3 style="font-size:1rem; font-weight:800;">📋 Point-by-Point Scoresheet</h3>
      <div class="sub" style="margin-bottom:8px;">Sequential point-by-point history log (Pages 1–4)</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Score (T1 / T2)</th>
              <th>Team</th>
              <th>Won by</th>
              <th>Player</th>
              <th>Shot</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${pointsRowsHtml}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px; font-size:0.72rem; color:var(--muted);">
        Shot key: ${getShotKeyText(match)} | Bolouri Tennis & Padel Academy
      </div>
    </div>

    <div style="text-align:center; font-size:0.75rem; color:var(--muted); padding:10px;">
      Report generated on ${new Date().toLocaleString()} by ${sport.brand} App
    </div>
  </div>
</body>
</html>`;

  // Trigger download
  const filename = generateReportFilename(match);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dl = document.createElement('a');
  dl.setAttribute('href', url);
  dl.setAttribute('download', filename);
  dl.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
