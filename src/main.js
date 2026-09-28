// Main Application Controller for PadelScore
import { SHOT_TYPES, SHOT_CATEGORIES } from './shotTypes.js';
import {
  createDefaultMatch,
  createDemoMatch,
  computeMatchScore,
  loadCurrentMatch,
  saveCurrentMatch,
  archiveCurrentMatch
} from './state.js';
import { calculateMatchStatistics, generateTacticalInsights } from './analytics.js';
import { playPointSound, toggleSound, isSoundEnabled } from './audio.js';
import { exportSessionToHtml } from './exportHtml.js';
import confetti from 'canvas-confetti';

// Current active match state
let currentMatch = loadCurrentMatch();

// Pending point selection
let pendingPoint = {
  team: 'T1',
  wonBy: 'W',
  player: 'L',
  shot: 'Ret. Serve', // Default to Return of Serve
  note: ''
};

let currentShotCategory = 'All';

// DOM Elements cache
const elements = {
  // Scoreboard
  liveCourt: document.getElementById('live-court-text'),
  liveRule: document.getElementById('live-rule-text'),
  liveTimer: document.getElementById('live-match-timer'),
  sbT1Name: document.getElementById('sb-t1-name'),
  sbT1Players: document.getElementById('sb-t1-players'),
  sbT1Sets: document.getElementById('sb-t1-sets'),
  sbT1Games: document.getElementById('sb-t1-games'),
  sbT1Points: document.getElementById('sb-t1-points'),
  t1ServerDot: document.getElementById('t1-server-dot'),
  sbT2Name: document.getElementById('sb-t2-name'),
  sbT2Players: document.getElementById('sb-t2-players'),
  sbT2Sets: document.getElementById('sb-t2-sets'),
  sbT2Games: document.getElementById('sb-t2-games'),
  sbT2Points: document.getElementById('sb-t2-points'),
  t2ServerDot: document.getElementById('t2-server-dot'),

  // Record Pad
  btnTeamT1: document.getElementById('btn-team-t1'),
  btnTeamT2: document.getElementById('btn-team-t2'),
  recT1Name: document.getElementById('rec-t1-name'),
  recT1Sub: document.getElementById('rec-t1-sub'),
  recT2Name: document.getElementById('rec-t2-name'),
  recT2Sub: document.getElementById('rec-t2-sub'),
  btnWonW: document.getElementById('btn-won-w'),
  btnWonE: document.getElementById('btn-won-e'),
  playerHeading: document.getElementById('player-select-heading'),
  btnPlayerL: document.getElementById('btn-player-l'),
  btnPlayerR: document.getElementById('btn-player-r'),
  recPlayerLName: document.getElementById('rec-player-l-name'),
  recPlayerRName: document.getElementById('rec-player-r-name'),
  shotCatFilter: document.getElementById('shot-category-filter'),
  shotGrid: document.getElementById('shot-btn-grid'),
  pointNoteInput: document.getElementById('point-note-input'),
  btnUndoPoint: document.getElementById('btn-undo-point'),
  btnLogPoint: document.getElementById('btn-log-point'),
  logPointText: document.getElementById('log-point-text'),

  // Sheet View
  sheetDate: document.getElementById('sheet-meta-date'),
  sheetCourt: document.getElementById('sheet-meta-court'),
  sheetT1: document.getElementById('sheet-meta-t1'),
  sheetT2: document.getElementById('sheet-meta-t2'),
  sheetFormat: document.getElementById('sheet-meta-format'),
  sheetTime: document.getElementById('sheet-meta-time'),
  pointTableBody: document.getElementById('point-table-body'),

  // Summary View
  summaryMatrixTable: document.getElementById('summary-matrix-table'),
  summaryFinalScores: document.getElementById('summary-final-scores'),
  summaryWinnerBadge: document.getElementById('summary-winner-badge'),
  btnExportHtmlSummary: document.getElementById('btn-export-html-summary'),
  btnExportHtmlSettings: document.getElementById('btn-export-html-settings'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnPrintSummary: document.getElementById('btn-print-summary'),

  // Analytics View
  kpiTotalPoints: document.getElementById('kpi-total-points'),
  kpiPtsSplit: document.getElementById('kpi-pts-split'),
  kpiWinnersVal: document.getElementById('kpi-winners-val'),
  kpiWeRatio: document.getElementById('kpi-we-ratio'),
  kpiReturnsVal: document.getElementById('kpi-returns-val'),
  kpiOverheadsVal: document.getElementById('kpi-overheads-val'),
  insightsList: document.getElementById('analytics-insights-list'),
  playerCompGrid: document.getElementById('player-comparison-grid'),
  chartShotBars: document.getElementById('chart-shot-bars'),
  chartMomentum: document.getElementById('chart-momentum'),

  // Settings
  settingsForm: document.getElementById('match-settings-form'),
  settingTitle: document.getElementById('setting-title'),
  settingCourt: document.getElementById('setting-court'),
  settingDate: document.getElementById('setting-date'),
  settingFormat: document.getElementById('setting-format'),
  settingRule: document.getElementById('setting-rule'),
  settingServer: document.getElementById('setting-server'),
  settingT1Name: document.getElementById('setting-t1-name'),
  settingT1Left: document.getElementById('setting-t1-left'),
  settingT1Right: document.getElementById('setting-t1-right'),
  settingT2Name: document.getElementById('setting-t2-name'),
  settingT2Left: document.getElementById('setting-t2-left'),
  settingT2Right: document.getElementById('setting-t2-right'),
  btnNewMatch: document.getElementById('btn-new-match'),
  btnLoadDemo: document.getElementById('btn-load-demo'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnImportJson: document.getElementById('btn-import-json'),
  jsonFileInput: document.getElementById('json-file-input'),

  // Header & Nav
  btnSoundToggle: document.getElementById('btn-sound-toggle'),
  btnDemoLoadTop: document.getElementById('btn-demo-load'),
  btnPwaInstall: document.getElementById('btn-pwa-install'),
  navItems: document.querySelectorAll('.nav-item'),
  tabs: document.querySelectorAll('.tab-content'),

  // Edit Point Modal
  editModal: document.getElementById('edit-point-modal'),
  editModalTitle: document.getElementById('edit-modal-title'),
  btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
  btnCancelEdit: document.getElementById('btn-cancel-edit'),
  editPointForm: document.getElementById('edit-point-form'),
  editPointIdx: document.getElementById('edit-point-idx'),
  editTeamT1: document.getElementById('edit-team-t1'),
  editTeamT2: document.getElementById('edit-team-t2'),
  editT1NameLbl: document.getElementById('edit-t1-name-lbl'),
  editT2NameLbl: document.getElementById('edit-t2-name-lbl'),
  editWonW: document.getElementById('edit-won-w'),
  editWonE: document.getElementById('edit-won-e'),
  editPlayerHeading: document.getElementById('edit-player-heading'),
  editPlayerL: document.getElementById('edit-player-l'),
  editPlayerR: document.getElementById('edit-player-r'),
  editPlayerLLbl: document.getElementById('edit-player-l-lbl'),
  editPlayerRLbl: document.getElementById('edit-player-r-lbl'),
  editShotSelect: document.getElementById('edit-shot-select'),
  editNoteInput: document.getElementById('edit-note-input')
};

// Current editing point state for modal
let editingPoint = {
  index: -1,
  team: 'T1',
  wonBy: 'W',
  player: 'L',
  shot: 'Ret. Serve',
  note: ''
};

// ========================================================
// INITIALIZATION
// ========================================================
function initApp() {
  // If match has 0 points and user hasn't modified, load demo to let them experience all features immediately
  if (!currentMatch.points || currentMatch.points.length === 0) {
    // Keep clean match or prompt
  }

  setupEventListeners();
  renderShotCategories();
  renderShotButtons();
  updateSoundButton();
  updateUI();
  setupPwa();
}

// ========================================================
// EVENT LISTENERS
// ========================================================
function setupEventListeners() {
  // Navigation tabs
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTabId = item.getAttribute('data-tab');
      switchTab(targetTabId);
    });
  });

  // Sound toggle
  elements.btnSoundToggle.addEventListener('click', () => {
    const enabled = toggleSound();
    updateSoundButton();
  });

  // Demo Load buttons
  const loadDemoAction = () => {
    if (confirm('Load sample professional match with realistic points and analytics?')) {
      currentMatch = createDemoMatch();
      saveCurrentMatch(currentMatch);
      updateUI();
      switchTab('tab-analytics');
    }
  };
  elements.btnDemoLoadTop.addEventListener('click', loadDemoAction);
  elements.btnLoadDemo.addEventListener('click', loadDemoAction);

  // New Match
  elements.btnNewMatch.addEventListener('click', () => {
    if (confirm('Start a new match? Current match will be archived.')) {
      archiveCurrentMatch(currentMatch);
      currentMatch = createDefaultMatch();
      saveCurrentMatch(currentMatch);
      updateUI();
      switchTab('tab-settings');
    }
  });

  // Record Pad: Team Select
  elements.btnTeamT1.addEventListener('click', () => {
    pendingPoint.team = 'T1';
    playPointSound('click');
    updateRecordPad();
  });
  elements.btnTeamT2.addEventListener('click', () => {
    pendingPoint.team = 'T2';
    playPointSound('click');
    updateRecordPad();
  });

  // Record Pad: Won By Select
  elements.btnWonW.addEventListener('click', () => {
    pendingPoint.wonBy = 'W';
    playPointSound('click');
    updateRecordPad();
  });
  elements.btnWonE.addEventListener('click', () => {
    pendingPoint.wonBy = 'E';
    playPointSound('click');
    updateRecordPad();
  });

  // Record Pad: Player Select
  elements.btnPlayerL.addEventListener('click', () => {
    pendingPoint.player = 'L';
    playPointSound('click');
    updateRecordPad();
  });
  elements.btnPlayerR.addEventListener('click', () => {
    pendingPoint.player = 'R';
    playPointSound('click');
    updateRecordPad();
  });

  // Quick note pills
  document.querySelectorAll('.quick-note-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const noteText = pill.getAttribute('data-note');
      elements.pointNoteInput.value = noteText;
      pendingPoint.note = noteText;
    });
  });

  elements.pointNoteInput.addEventListener('input', (e) => {
    pendingPoint.note = e.target.value;
  });

  // Log Point
  elements.btnLogPoint.addEventListener('click', handleLogPoint);

  // Undo Point
  elements.btnUndoPoint.addEventListener('click', handleUndoPoint);

  // Settings form submit
  elements.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsFromForm();
  });

  // Export CSV
  elements.btnExportCsv.addEventListener('click', exportToCsv);

  // Export HTML Report (Single file named after players and date)
  if (elements.btnExportHtmlSummary) {
    elements.btnExportHtmlSummary.addEventListener('click', () => {
      exportSessionToHtml(currentMatch);
    });
  }
  if (elements.btnExportHtmlSettings) {
    elements.btnExportHtmlSettings.addEventListener('click', () => {
      exportSessionToHtml(currentMatch);
    });
  }

  // Print Summary
  elements.btnPrintSummary.addEventListener('click', () => {
    window.print();
  });

  // Export JSON
  elements.btnExportJson.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentMatch, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `padel_match_${currentMatch.date || 'data'}.json`);
    dlAnchor.click();
  });

  // Import JSON
  elements.btnImportJson.addEventListener('click', () => {
    elements.jsonFileInput.click();
  });
  elements.jsonFileInput.addEventListener('change', handleImportJson);

  // Edit Point Modal Listeners
  populateEditShotSelect();

  elements.editTeamT1.addEventListener('click', () => {
    editingPoint.team = 'T1';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editTeamT2.addEventListener('click', () => {
    editingPoint.team = 'T2';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editWonW.addEventListener('click', () => {
    editingPoint.wonBy = 'W';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editWonE.addEventListener('click', () => {
    editingPoint.wonBy = 'E';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editPlayerL.addEventListener('click', () => {
    editingPoint.player = 'L';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editPlayerR.addEventListener('click', () => {
    editingPoint.player = 'R';
    playPointSound('click');
    updateEditModalUI();
  });
  elements.editShotSelect.addEventListener('change', (e) => {
    editingPoint.shot = e.target.value;
  });
  elements.editNoteInput.addEventListener('input', (e) => {
    editingPoint.note = e.target.value;
  });

  elements.btnCloseEditModal.addEventListener('click', closeEditPointModal);
  elements.btnCancelEdit.addEventListener('click', closeEditPointModal);
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) closeEditPointModal();
  });

  elements.editPointForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idx = parseInt(elements.editPointIdx.value, 10);
    if (!isNaN(idx) && currentMatch.points[idx]) {
      currentMatch.points[idx].team = editingPoint.team;
      currentMatch.points[idx].wonBy = editingPoint.wonBy;
      currentMatch.points[idx].player = editingPoint.player;
      currentMatch.points[idx].shot = editingPoint.shot;
      currentMatch.points[idx].note = elements.editNoteInput.value.trim();

      saveCurrentMatch(currentMatch);
      closeEditPointModal();
      playPointSound('click');
      updateUI();
      renderScoresheetTable();
    }
  });
}

// Populate Edit Shot dropdown
function populateEditShotSelect() {
  if (!elements.editShotSelect) return;
  elements.editShotSelect.innerHTML = '';
  SHOT_TYPES.forEach(shot => {
    const opt = document.createElement('option');
    opt.value = shot.id;
    opt.textContent = `${shot.icon} ${shot.short} — ${shot.name}`;
    elements.editShotSelect.appendChild(opt);
  });
}

// Update Edit Modal UI elements
function updateEditModalUI() {
  const t1 = currentMatch.team1;
  const t2 = currentMatch.team2;

  elements.editT1NameLbl.textContent = t1.name;
  elements.editT2NameLbl.textContent = t2.name;

  elements.editTeamT1.classList.toggle('selected', editingPoint.team === 'T1');
  elements.editTeamT2.classList.toggle('selected', editingPoint.team === 'T2');

  elements.editWonW.classList.toggle('selected', editingPoint.wonBy === 'W');
  elements.editWonE.classList.toggle('selected', editingPoint.wonBy === 'E');

  let targetTeam = editingPoint.team === 'T1' ? t1 : t2;
  if (editingPoint.wonBy === 'E') {
    targetTeam = editingPoint.team === 'T1' ? t2 : t1;
    elements.editPlayerHeading.textContent = `Error Made By (${targetTeam.name})`;
  } else {
    elements.editPlayerHeading.textContent = `Winner Hit By (${targetTeam.name})`;
  }

  elements.editPlayerLLbl.textContent = targetTeam.leftPlayer || 'Left Player';
  elements.editPlayerRLbl.textContent = targetTeam.rightPlayer || 'Right Player';

  elements.editPlayerL.classList.toggle('selected', editingPoint.player === 'L');
  elements.editPlayerR.classList.toggle('selected', editingPoint.player === 'R');

  elements.editShotSelect.value = editingPoint.shot;
}

// Open / Close Modal
function openEditPointModal(idx) {
  const pt = currentMatch.points[idx];
  if (!pt) return;

  editingPoint = {
    index: idx,
    team: pt.team,
    wonBy: pt.wonBy,
    player: pt.player,
    shot: pt.shot,
    note: pt.note || ''
  };

  elements.editPointIdx.value = idx;
  elements.editModalTitle.textContent = `✏️ Edit Point #${idx + 1}`;
  elements.editNoteInput.value = editingPoint.note;

  updateEditModalUI();
  elements.editModal.classList.add('active');
}

function closeEditPointModal() {
  elements.editModal.classList.remove('active');
}

function switchTab(tabId) {
  elements.navItems.forEach(nav => {
    nav.classList.toggle('active', nav.getAttribute('data-tab') === tabId);
  });
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.id === tabId);
  });

  // Refresh view when switching tabs
  if (tabId === 'tab-sheet') renderScoresheetTable();
  if (tabId === 'tab-summary') renderSummaryMatrix();
  if (tabId === 'tab-analytics') renderAnalyticsView();
  if (tabId === 'tab-settings') populateSettingsForm();
}

function updateSoundButton() {
  const enabled = isSoundEnabled();
  elements.btnSoundToggle.textContent = enabled ? '🔊' : '🔇';
  elements.btnSoundToggle.title = enabled ? 'Sound Enabled' : 'Sound Muted';
}

// ========================================================
// SHOT CATEGORIES & BUTTONS RENDERING
// ========================================================
function renderShotCategories() {
  elements.shotCatFilter.innerHTML = '';
  SHOT_CATEGORIES.forEach(cat => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `cat-pill ${cat === currentShotCategory ? 'active' : ''}`;
    pill.textContent = cat;
    pill.addEventListener('click', () => {
      currentShotCategory = cat;
      renderShotCategories();
      renderShotButtons();
    });
    elements.shotCatFilter.appendChild(pill);
  });
}

function renderShotButtons() {
  elements.shotGrid.innerHTML = '';

  const filtered = currentShotCategory === 'All' 
    ? SHOT_TYPES 
    : SHOT_TYPES.filter(s => s.category.toLowerCase().includes(currentShotCategory.toLowerCase()));

  filtered.forEach(shot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `shot-btn ${pendingPoint.shot === shot.id ? 'selected' : ''}`;
    btn.setAttribute('data-shot', shot.id);

    btn.innerHTML = `
      <div style="font-size:1.1rem;">${shot.icon}</div>
      <span class="shot-abbr">${shot.short}</span>
      <span class="shot-full">${shot.name}</span>
    `;

    btn.addEventListener('click', () => {
      pendingPoint.shot = shot.id;
      playPointSound('click');
      document.querySelectorAll('.shot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });

    elements.shotGrid.appendChild(btn);
  });
}

// ========================================================
// UI UPDATE DISPATCHER
// ========================================================
function updateUI() {
  const scoreState = computeMatchScore(currentMatch);

  // 1. Update Scoreboard
  updateScoreboard(scoreState);

  // 2. Update Record Pad
  updateRecordPad();

  // 3. Update current tab
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    if (activeTab.id === 'tab-sheet') renderScoresheetTable();
    else if (activeTab.id === 'tab-summary') renderSummaryMatrix();
    else if (activeTab.id === 'tab-analytics') renderAnalyticsView();
    else if (activeTab.id === 'tab-settings') populateSettingsForm();
  }
}

// Update live header scoreboard
function updateScoreboard(state) {
  elements.liveCourt.textContent = currentMatch.court || 'Court 1';
  elements.liveRule.textContent = currentMatch.scoringRule === 'advantage' ? 'Advantage (Ad)' : 'Punto de Oro';

  // Team 1
  elements.sbT1Name.textContent = currentMatch.team1.name;
  elements.sbT1Players.textContent = `L: ${currentMatch.team1.leftPlayer || 'Left'} • R: ${currentMatch.team1.rightPlayer || 'Right'}`;
  elements.sbT1Games.textContent = state.games.T1;
  elements.sbT1Points.textContent = state.isTiebreak ? state.tiebreakPoints.T1 : state.gameScore.T1;

  // Team 2
  elements.sbT2Name.textContent = currentMatch.team2.name;
  elements.sbT2Players.textContent = `L: ${currentMatch.team2.leftPlayer || 'Left'} • R: ${currentMatch.team2.rightPlayer || 'Right'}`;
  elements.sbT2Games.textContent = state.games.T2;
  elements.sbT2Points.textContent = state.isTiebreak ? state.tiebreakPoints.T2 : state.gameScore.T2;

  // Server Dots
  elements.t1ServerDot.classList.toggle('hidden', state.currentServerTeam !== 'T1');
  elements.t2ServerDot.classList.toggle('hidden', state.currentServerTeam !== 'T2');

  // Sets History Pills
  elements.sbT1Sets.innerHTML = '';
  elements.sbT2Sets.innerHTML = '';
  state.completedSets.forEach(cs => {
    const pill1 = document.createElement('div');
    pill1.className = 'set-pill';
    pill1.textContent = cs.t1;
    elements.sbT1Sets.appendChild(pill1);

    const pill2 = document.createElement('div');
    pill2.className = 'set-pill';
    pill2.textContent = cs.t2;
    elements.sbT2Sets.appendChild(pill2);
  });
}

// Update the Record Pad buttons, labels, and player names
function updateRecordPad() {
  const t1 = currentMatch.team1;
  const t2 = currentMatch.team2;

  // Team buttons
  elements.recT1Name.textContent = t1.name;
  elements.recT1Sub.textContent = `L: ${t1.leftPlayer || 'L'} | R: ${t1.rightPlayer || 'R'}`;
  elements.recT2Name.textContent = t2.name;
  elements.recT2Sub.textContent = `L: ${t2.leftPlayer || 'L'} | R: ${t2.rightPlayer || 'R'}`;

  elements.btnTeamT1.classList.toggle('selected', pendingPoint.team === 'T1');
  elements.btnTeamT2.classList.toggle('selected', pendingPoint.team === 'T2');

  // Won By buttons
  elements.btnWonW.classList.toggle('selected', pendingPoint.wonBy === 'W');
  elements.btnWonE.classList.toggle('selected', pendingPoint.wonBy === 'E');

  // Player Selection (Step 3)
  // CRITICAL RULE FROM PDF:
  // "Won by W = own winning shot • Won by E = opponent's error • L = Left player • R = Right player"
  let targetTeam = pendingPoint.team === 'T1' ? t1 : t2;
  let errorMode = false;

  if (pendingPoint.wonBy === 'E') {
    // If won by opponent error, the error was committed by the OTHER team!
    targetTeam = pendingPoint.team === 'T1' ? t2 : t1;
    errorMode = true;
    elements.playerHeading.textContent = `3. Error Made By (${targetTeam.name})`;
  } else {
    elements.playerHeading.textContent = `3. Winner Hit By (${targetTeam.name})`;
  }

  elements.recPlayerLName.textContent = targetTeam.leftPlayer || 'Left Player';
  elements.recPlayerRName.textContent = targetTeam.rightPlayer || 'Right Player';

  elements.btnPlayerL.classList.toggle('selected', pendingPoint.player === 'L');
  elements.btnPlayerR.classList.toggle('selected', pendingPoint.player === 'R');

  // Next Point Counter on Log button
  const nextPtIndex = (currentMatch.points?.length || 0) + 1;
  elements.logPointText.textContent = `LOG POINT #${nextPtIndex}`;
}

// ========================================================
// LOG POINT & UNDO POINT
// ========================================================
function handleLogPoint() {
  const prevScoreState = computeMatchScore(currentMatch);

  const newPoint = {
    id: 'pt_' + Date.now(),
    index: currentMatch.points.length + 1,
    team: pendingPoint.team,
    wonBy: pendingPoint.wonBy,
    player: pendingPoint.player,
    shot: pendingPoint.shot,
    note: pendingPoint.note ? pendingPoint.note.trim() : '',
    timestamp: Date.now()
  };

  currentMatch.points.push(newPoint);
  saveCurrentMatch(currentMatch);

  const newScoreState = computeMatchScore(currentMatch);

  // Check if game or set or match completed
  if (newScoreState.matchFinished) {
    playPointSound('game');
    triggerConfetti();
    alert(`🏆 Match Finished! Winner: ${newScoreState.matchWinner === 'T1' ? currentMatch.team1.name : currentMatch.team2.name}`);
  } else if (newScoreState.completedSets.length > prevScoreState.completedSets.length) {
    playPointSound('game');
    triggerConfetti();
  } else if (newScoreState.games.T1 !== prevScoreState.games.T1 || newScoreState.games.T2 !== prevScoreState.games.T2) {
    playPointSound('game');
  } else {
    playPointSound(pendingPoint.wonBy === 'W' ? 'winner' : 'error');
  }

  // Clear note input for next point
  elements.pointNoteInput.value = '';
  pendingPoint.note = '';

  updateUI();
}

function handleUndoPoint() {
  if (!currentMatch.points || currentMatch.points.length === 0) {
    alert('No points to undo.');
    return;
  }

  const removed = currentMatch.points.pop();
  saveCurrentMatch(currentMatch);
  playPointSound('click');
  updateUI();
}

function triggerConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 }
  });
}

// ========================================================
// SCORESHEET TABLE VIEW (Matches PDF pages 1-4)
// ========================================================
function renderScoresheetTable() {
  // Populate metadata
  elements.sheetDate.textContent = currentMatch.date || '-';
  elements.sheetCourt.textContent = currentMatch.court || '-';
  elements.sheetT1.textContent = `${currentMatch.team1.name} (L: ${currentMatch.team1.leftPlayer || 'L'}, R: ${currentMatch.team1.rightPlayer || 'R'})`;
  elements.sheetT2.textContent = `${currentMatch.team2.name} (L: ${currentMatch.team2.leftPlayer || 'L'}, R: ${currentMatch.team2.rightPlayer || 'R'})`;
  elements.sheetFormat.textContent = `${currentMatch.format} • ${currentMatch.scoringRule === 'advantage' ? 'Advantage' : 'Punto de Oro'}`;
  elements.sheetTime.textContent = currentMatch.startTime || '-';

  elements.pointTableBody.innerHTML = '';

  if (!currentMatch.points || currentMatch.points.length === 0) {
    elements.pointTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 24px; color: #94a3b8; font-style: italic;">
          No points recorded yet. Tap "Record" to log live points or load the demo match!
        </td>
      </tr>
    `;
    return;
  }

  // Replay point-by-point to show exact score at each point
  let tempMatch = { ...currentMatch, points: [] };

  currentMatch.points.forEach((pt, idx) => {
    tempMatch.points.push(pt);
    const scoreState = computeMatchScore(tempMatch);

    const isT1 = pt.team === 'T1';
    const wonByText = pt.wonBy === 'W' ? 'W (Winner)' : "E (Error)";
    const wonClass = pt.wonBy === 'W' ? 'won-badge-w' : 'won-badge-e';
    const playerText = pt.player === 'L' ? 'L (Left)' : 'R (Right)';

    const row = document.createElement('tr');
    row.className = 'row-clickable';
    row.title = 'Click to edit this point';
    row.innerHTML = `
      <td style="font-weight:700; color:#64748b;">${idx + 1}</td>
      <td>
        <div class="score-bubbles">
          <span style="font-weight:700; color:#059669;">T1: ${scoreState.isTiebreak ? scoreState.tiebreakPoints.T1 : scoreState.gameScore.T1}</span>
          <span style="color:#94a3b8;">/</span>
          <span style="font-weight:700; color:#0284c7;">T2: ${scoreState.isTiebreak ? scoreState.tiebreakPoints.T2 : scoreState.gameScore.T2}</span>
        </div>
      </td>
      <td>
        <span class="team-badge-cell ${isT1 ? 't1' : 't2'}">${pt.team}</span>
      </td>
      <td>
        <span class="${wonClass}">${wonByText}</span>
      </td>
      <td style="font-weight:700;">${playerText}</td>
      <td>
        <span class="shot-cell-tag">${pt.shot}</span>
      </td>
      <td style="color:#64748b; font-size:0.72rem; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${pt.note || '—'}
      </td>
      <td>
        <div style="display:flex; gap:4px; justify-content:center; align-items:center;">
          <button type="button" class="btn-edit-pt" data-idx="${idx}" title="Edit point">✏️</button>
          <button type="button" class="btn-del-pt" data-idx="${idx}" title="Delete point">🗑️</button>
        </div>
      </td>
    `;

    // Row click -> Edit
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-del-pt')) return;
      openEditPointModal(idx);
    });

    const editBtn = row.querySelector('.btn-edit-pt');
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditPointModal(idx);
    });

    // Row delete event
    const delBtn = row.querySelector('.btn-del-pt');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete point #${idx + 1}?`)) {
        currentMatch.points.splice(idx, 1);
        saveCurrentMatch(currentMatch);
        updateUI();
        renderScoresheetTable();
      }
    });

    elements.pointTableBody.appendChild(row);
  });
}

// ========================================================
// SUMMARY MATRIX VIEW (Page 4 End-of-Set Summary + Ret. Serve)
// ========================================================
function renderSummaryMatrix() {
  const stats = calculateMatchStatistics(currentMatch);
  const scoreState = computeMatchScore(currentMatch);
  const shotIds = SHOT_TYPES.map(s => s.id);

  let headerHtml = `
    <thead>
      <tr>
        <th style="text-align:left; min-width:140px;">Category</th>
  `;
  shotIds.forEach(id => {
    const isRet = id === 'Ret. Serve';
    headerHtml += `<th class="${isRet ? 'th-highlight' : ''}">${id}</th>`;
  });
  headerHtml += `<th class="total-cell">TOTAL</th></tr></thead>`;

  let bodyHtml = '<tbody>';

  // 1. T1 Winners (Total)
  bodyHtml += `<tr class="row-t1"><td style="text-align:left; font-weight:800; color:var(--t1-text);">T1 Winners (${currentMatch.team1.name})</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t1Winners || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--t1-text);">${stats.t1Winners}</td></tr>`;

  // 1a. T1 Left Player Winners
  const t1L = stats.players['T1-L'];
  bodyHtml += `<tr class="row-sub"><td style="text-align:left; padding-left:18px;">↳ L: ${t1L.name}</td>`;
  let t1LTotal = 0;
  shotIds.forEach(id => {
    const val = t1L.shots[id]?.winners || 0;
    t1LTotal += val;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell">${t1LTotal}</td></tr>`;

  // 1b. T1 Right Player Winners
  const t1R = stats.players['T1-R'];
  bodyHtml += `<tr class="row-sub"><td style="text-align:left; padding-left:18px;">↳ R: ${t1R.name}</td>`;
  let t1RTotal = 0;
  shotIds.forEach(id => {
    const val = t1R.shots[id]?.winners || 0;
    t1RTotal += val;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell">${t1RTotal}</td></tr>`;

  // 2. T2 Winners (Total)
  bodyHtml += `<tr class="row-t2"><td style="text-align:left; font-weight:800; color:var(--t2-text);">T2 Winners (${currentMatch.team2.name})</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Winners || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--t2-text);">${stats.t2Winners}</td></tr>`;

  // 2a. T2 Left Player Winners
  const t2L = stats.players['T2-L'];
  bodyHtml += `<tr class="row-sub"><td style="text-align:left; padding-left:18px;">↳ L: ${t2L.name}</td>`;
  let t2LTotal = 0;
  shotIds.forEach(id => {
    const val = t2L.shots[id]?.winners || 0;
    t2LTotal += val;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell">${t2LTotal}</td></tr>`;

  // 2b. T2 Right Player Winners
  const t2R = stats.players['T2-R'];
  bodyHtml += `<tr class="row-sub"><td style="text-align:left; padding-left:18px;">↳ R: ${t2R.name}</td>`;
  let t2RTotal = 0;
  shotIds.forEach(id => {
    const val = t2R.shots[id]?.winners || 0;
    t2RTotal += val;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell">${t2RTotal}</td></tr>`;

  // 3. Errors (opp.)
  bodyHtml += `<tr><td style="text-align:left; font-weight:700; color:var(--accent-danger);">T1 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t1Errors || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-danger);">${stats.t1Errors}</td></tr>`;

  bodyHtml += `<tr><td style="text-align:left; font-weight:700; color:var(--accent-danger);">T2 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Errors || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-danger);">${stats.t2Errors}</td></tr>`;

  // Total Points Row
  bodyHtml += `<tr style="border-top:2px solid rgba(255,255,255,0.15);"><td style="text-align:left; font-weight:800; color:#fff;">Total Points Decided</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.total || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-gold);">${stats.totalPoints}</td></tr>`;

  bodyHtml += '</tbody>';
  elements.summaryMatrixTable.innerHTML = headerHtml + bodyHtml;

  // Final set scores list
  if (scoreState.completedSets.length > 0) {
    const scoresStr = scoreState.completedSets.map(cs => `${cs.t1}-${cs.t2}`).join(' , ');
    elements.summaryFinalScores.textContent = scoresStr;
  } else {
    elements.summaryFinalScores.textContent = `Set 1 in progress (${scoreState.games.T1} - ${scoreState.games.T2})`;
  }

  if (scoreState.matchFinished) {
    const winnerName = scoreState.matchWinner === 'T1' ? currentMatch.team1.name : currentMatch.team2.name;
    elements.summaryWinnerBadge.innerHTML = `<span style="background:rgba(16,185,129,0.2); color:#10b981; padding:4px 10px; border-radius:6px; font-weight:800;">Winner: ${winnerName}</span>`;
  } else {
    elements.summaryWinnerBadge.innerHTML = '';
  }
}

// Export Summary to CSV
function exportToCsv() {
  const stats = calculateMatchStatistics(currentMatch);
  const shotIds = SHOT_TYPES.map(s => s.id);

  let csv = 'Bolouri Tennis & Padel Academy - Game-Score Analysis Summary\n';
  csv += `Match: ${currentMatch.title || 'Padel Match'}, Date: ${currentMatch.date}, Court: ${currentMatch.court}\n`;
  csv += `Team 1: ${currentMatch.team1.name} (L: ${currentMatch.team1.leftPlayer} R: ${currentMatch.team1.rightPlayer})\n`;
  csv += `Team 2: ${currentMatch.team2.name} (L: ${currentMatch.team2.leftPlayer} R: ${currentMatch.team2.rightPlayer})\n\n`;

  // Headers
  csv += ['Category', ...shotIds, 'TOTAL'].join(',') + '\n';

  // Rows
  const addCsvRow = (title, vals, total) => {
    csv += [`"${title}"`, ...vals, total].join(',') + '\n';
  };

  addCsvRow('T1 Winners', shotIds.map(id => stats.shotMatrix[id]?.t1Winners || 0), stats.t1Winners);
  addCsvRow(`↳ T1 Left: ${stats.players['T1-L'].name}`, shotIds.map(id => stats.players['T1-L'].shots[id]?.winners || 0), stats.players['T1-L'].winners);
  addCsvRow(`↳ T1 Right: ${stats.players['T1-R'].name}`, shotIds.map(id => stats.players['T1-R'].shots[id]?.winners || 0), stats.players['T1-R'].winners);

  addCsvRow('T2 Winners', shotIds.map(id => stats.shotMatrix[id]?.t2Winners || 0), stats.t2Winners);
  addCsvRow(`↳ T2 Left: ${stats.players['T2-L'].name}`, shotIds.map(id => stats.players['T2-L'].shots[id]?.winners || 0), stats.players['T2-L'].winners);
  addCsvRow(`↳ T2 Right: ${stats.players['T2-R'].name}`, shotIds.map(id => stats.players['T2-R'].shots[id]?.winners || 0), stats.players['T2-R'].winners);

  addCsvRow('T1 Errors', shotIds.map(id => stats.shotMatrix[id]?.t1Errors || 0), stats.t1Errors);
  addCsvRow('T2 Errors', shotIds.map(id => stats.shotMatrix[id]?.t2Errors || 0), stats.t2Errors);
  addCsvRow('Total Points', shotIds.map(id => stats.shotMatrix[id]?.total || 0), stats.totalPoints);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `padel_summary_${currentMatch.date || 'data'}.csv`);
  link.click();
}

// ========================================================
// ANALYTICS & CHARTS VIEW
// ========================================================
function renderAnalyticsView() {
  const stats = calculateMatchStatistics(currentMatch);

  // 1. KPIs
  elements.kpiTotalPoints.textContent = stats.totalPoints;
  elements.kpiPtsSplit.textContent = `${stats.t1TotalWon} - ${stats.t2TotalWon}`;
  elements.kpiWinnersVal.textContent = `${stats.t1Winners} / ${stats.t2Winners}`;
  
  const totalW = stats.t1Winners + stats.t2Winners;
  const totalE = stats.t1Errors + stats.t2Errors;
  const weRatio = totalE > 0 ? (totalW / totalE).toFixed(2) : totalW;
  elements.kpiWeRatio.textContent = `W/E: ${weRatio}`;

  const retWinners = (stats.shotMatrix['Ret. Serve']?.t1Winners || 0) + (stats.shotMatrix['Ret. Serve']?.t2Winners || 0);
  elements.kpiReturnsVal.textContent = retWinners;

  const overheadWinners = (stats.shotMatrix['Smash']?.t1Winners || 0) + (stats.shotMatrix['Smash']?.t2Winners || 0) +
                          (stats.shotMatrix['Band']?.t1Winners || 0) + (stats.shotMatrix['Band']?.t2Winners || 0) +
                          (stats.shotMatrix['Vib']?.t1Winners || 0) + (stats.shotMatrix['Vib']?.t2Winners || 0);
  elements.kpiOverheadsVal.textContent = overheadWinners;

  // 2. Tactical Insights
  const insights = generateTacticalInsights(stats, currentMatch);
  elements.insightsList.innerHTML = '';
  insights.forEach(ins => {
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = ins.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    elements.insightsList.appendChild(div);
  });

  // 3. Player Comparison Cards
  renderPlayerComparisonCards(stats);

  // 4. SVG Shot Distribution Bar Chart
  renderShotDistributionChart(stats);

  // 5. SVG Momentum Flow Chart
  renderMomentumChart(stats);
}

function renderPlayerComparisonCards(stats) {
  elements.playerCompGrid.innerHTML = '';

  const playersList = [
    { key: 'T1-L', team: 'T1', side: 'L', data: stats.players['T1-L'] },
    { key: 'T1-R', team: 'T1', side: 'R', data: stats.players['T1-R'] },
    { key: 'T2-L', team: 'T2', side: 'L', data: stats.players['T2-L'] },
    { key: 'T2-R', team: 'T2', side: 'R', data: stats.players['T2-R'] }
  ];

  playersList.forEach(p => {
    const box = document.createElement('div');
    box.className = 'player-stat-box';

    // Find favorite weapon
    let topShot = '—';
    let topCount = 0;
    Object.entries(p.data.shots).forEach(([shotId, counts]) => {
      if (counts.winners > topCount) {
        topCount = counts.winners;
        topShot = shotId;
      }
    });

    const isT1 = p.team === 'T1';
    const tagColor = isT1 ? 'var(--t1-text)' : 'var(--t2-text)';

    box.innerHTML = `
      <div class="player-stat-header">
        <div class="player-side-pill">${p.side}</div>
        <div class="player-stat-name" style="color:${tagColor};">${p.data.name}</div>
      </div>
      <div class="stat-metric-row">
        <span>Winners:</span>
        <strong style="color:var(--t1-color);">${p.data.winners}</strong>
      </div>
      <div class="stat-metric-row">
        <span>Errors:</span>
        <strong style="color:var(--accent-danger);">${p.data.errors}</strong>
      </div>
      <div class="stat-metric-row">
        <span>Top Shot:</span>
        <strong style="color:var(--accent-gold);">${topShot} (${topCount})</strong>
      </div>
    `;

    elements.playerCompGrid.appendChild(box);
  });
}

function renderShotDistributionChart(stats) {
  const shotIds = SHOT_TYPES.map(s => s.id);
  const width = 640;
  const height = 240;
  const barWidth = 18;
  const gap = 12;
  const startX = 40;
  const baseY = height - 40;

  // Max value for scaling
  let maxVal = 1;
  shotIds.forEach(id => {
    const t1W = stats.shotMatrix[id]?.t1Winners || 0;
    const t2W = stats.shotMatrix[id]?.t2Winners || 0;
    if (t1W > maxVal) maxVal = t1W;
    if (t2W > maxVal) maxVal = t2W;
  });

  const scale = (height - 70) / maxVal;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="overflow:visible;">`;

  // Grid lines
  svg += `<line x1="30" y1="${baseY}" x2="${width - 10}" y2="${baseY}" stroke="#334155" stroke-width="1.5" />`;
  svg += `<line x1="30" y1="${baseY - (height - 80) / 2}" x2="${width - 10}" y2="${baseY - (height - 80) / 2}" stroke="#1e293b" stroke-dasharray="4" />`;
  svg += `<line x1="30" y1="30" x2="${width - 10}" y2="30" stroke="#1e293b" stroke-dasharray="4" />`;

  // Bars
  shotIds.forEach((id, i) => {
    const x = startX + i * (barWidth * 2 + gap);
    const t1W = stats.shotMatrix[id]?.t1Winners || 0;
    const t2W = stats.shotMatrix[id]?.t2Winners || 0;

    const t1H = t1W * scale;
    const t2H = t2W * scale;

    // T1 Bar
    if (t1H > 0) {
      svg += `<rect x="${x}" y="${baseY - t1H}" width="${barWidth}" height="${t1H}" fill="#10b981" rx="3">
                <title>${currentMatch.team1.name} ${id}: ${t1W}</title>
              </rect>`;
      svg += `<text x="${x + barWidth / 2}" y="${baseY - t1H - 4}" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">${t1W}</text>`;
    }

    // T2 Bar
    if (t2H > 0) {
      svg += `<rect x="${x + barWidth + 2}" y="${baseY - t2H}" width="${barWidth}" height="${t2H}" fill="#06b6d4" rx="3">
                <title>${currentMatch.team2.name} ${id}: ${t2W}</title>
              </rect>`;
      svg += `<text x="${x + barWidth + 2 + barWidth / 2}" y="${baseY - t2H - 4}" fill="#06b6d4" font-size="9" font-weight="bold" text-anchor="middle">${t2W}</text>`;
    }

    // Label
    const isRet = id === 'Ret. Serve';
    svg += `<text x="${x + barWidth + 1}" y="${baseY + 16}" fill="${isRet ? '#38bdf8' : '#94a3b8'}" font-size="${isRet ? '9' : '9'}" font-weight="${isRet ? 'bold' : 'normal'}" text-anchor="middle">${id}</text>`;
  });

  // Legend
  svg += `
    <g transform="translate(40, 10)">
      <rect x="0" y="0" width="12" height="12" fill="#10b981" rx="2" />
      <text x="18" y="10" fill="#f8fafc" font-size="11" font-weight="bold">${currentMatch.team1.name} Winners</text>
      <rect x="180" y="0" width="12" height="12" fill="#06b6d4" rx="2" />
      <text x="198" y="10" fill="#f8fafc" font-size="11" font-weight="bold">${currentMatch.team2.name} Winners</text>
    </g>
  `;

  svg += '</svg>';
  elements.chartShotBars.innerHTML = svg;
}

function renderMomentumChart(stats) {
  if (stats.momentum.length === 0) {
    elements.chartMomentum.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">No points logged yet.</div>`;
    return;
  }

  const width = 640;
  const height = 180;
  const paddingX = 40;
  const midY = height / 2;

  let maxDiff = 3;
  stats.momentum.forEach(m => {
    if (Math.abs(m.diff) > maxDiff) maxDiff = Math.abs(m.diff);
  });

  const stepX = (width - paddingX * 2) / Math.max(stats.momentum.length - 1, 1);
  const scaleY = (midY - 25) / maxDiff;

  let pathD = `M ${paddingX} ${midY}`;
  let areaD = `M ${paddingX} ${midY}`;

  stats.momentum.forEach((m, idx) => {
    const x = paddingX + idx * stepX;
    const y = midY - (m.diff * scaleY);
    pathD += ` L ${x} ${y}`;
    areaD += ` L ${x} ${y}`;
  });

  const lastX = paddingX + (stats.momentum.length - 1) * stepX;
  areaD += ` L ${lastX} ${midY} Z`;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">`;

  // Zero Center Axis
  svg += `<line x1="${paddingX}" y1="${midY}" x2="${width - paddingX}" y2="${midY}" stroke="#334155" stroke-width="1.5" />`;
  svg += `<text x="${paddingX - 10}" y="${midY + 4}" fill="#64748b" font-size="10" text-anchor="end">0</text>`;

  // Team labels
  svg += `<text x="${paddingX}" y="20" fill="#10b981" font-size="11" font-weight="bold">▲ ${currentMatch.team1.name} Lead</text>`;
  svg += `<text x="${paddingX}" y="${height - 8}" fill="#06b6d4" font-size="11" font-weight="bold">▼ ${currentMatch.team2.name} Lead</text>`;

  // Shaded area
  svg += `<path d="${areaD}" fill="rgba(16, 185, 129, 0.12)" />`;

  // Momentum line
  svg += `<path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;

  // Points dots
  stats.momentum.forEach((m, idx) => {
    const x = paddingX + idx * stepX;
    const y = midY - (m.diff * scaleY);
    const dotColor = m.winner === 'T1' ? '#10b981' : '#06b6d4';
    svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="${dotColor}">
              <title>Point #${m.pointIndex}: ${m.winner} won with ${m.shot}</title>
            </circle>`;
  });

  svg += '</svg>';
  elements.chartMomentum.innerHTML = svg;
}

// ========================================================
// SETTINGS VIEW & FORM
// ========================================================
function populateSettingsForm() {
  elements.settingTitle.value = currentMatch.title || '';
  elements.settingCourt.value = currentMatch.court || 'Court 1';
  elements.settingDate.value = currentMatch.date || '';
  elements.settingFormat.value = currentMatch.format || 'Best of 3';
  elements.settingRule.value = currentMatch.scoringRule || 'goldenPoint';
  elements.settingServer.value = currentMatch.initialServer || 'T1';

  elements.settingT1Name.value = currentMatch.team1.name || 'Team 1';
  elements.settingT1Left.value = currentMatch.team1.leftPlayer || '';
  elements.settingT1Right.value = currentMatch.team1.rightPlayer || '';

  elements.settingT2Name.value = currentMatch.team2.name || 'Team 2';
  elements.settingT2Left.value = currentMatch.team2.leftPlayer || '';
  elements.settingT2Right.value = currentMatch.team2.rightPlayer || '';
}

function saveSettingsFromForm() {
  currentMatch.title = elements.settingTitle.value.trim();
  currentMatch.court = elements.settingCourt.value.trim();
  currentMatch.date = elements.settingDate.value;
  currentMatch.format = elements.settingFormat.value;
  currentMatch.scoringRule = elements.settingRule.value;
  currentMatch.initialServer = elements.settingServer.value;

  currentMatch.team1.name = elements.settingT1Name.value.trim() || 'Team 1';
  currentMatch.team1.leftPlayer = elements.settingT1Left.value.trim() || 'Player 1 (L)';
  currentMatch.team1.rightPlayer = elements.settingT1Right.value.trim() || 'Player 2 (R)';

  currentMatch.team2.name = elements.settingT2Name.value.trim() || 'Team 2';
  currentMatch.team2.leftPlayer = elements.settingT2Left.value.trim() || 'Player 3 (L)';
  currentMatch.team2.rightPlayer = elements.settingT2Right.value.trim() || 'Player 4 (R)';

  saveCurrentMatch(currentMatch);
  updateUI();
  alert('Match settings updated!');
}

function handleImportJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (imported.team1 && imported.team2 && Array.isArray(imported.points)) {
        currentMatch = imported;
        saveCurrentMatch(currentMatch);
        updateUI();
        alert('Match successfully imported!');
        switchTab('tab-record');
      } else {
        alert('Invalid Padel match file format.');
      }
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  reader.readAsText(file);
}

// ========================================================
// PWA SERVICE WORKER & INSTALL PROMPT
// ========================================================
let deferredInstallPrompt = null;

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('SW registration note:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    elements.btnPwaInstall.style.display = 'flex';
  });

  elements.btnPwaInstall.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        elements.btnPwaInstall.style.display = 'none';
      }
      deferredInstallPrompt = null;
    } else {
      alert('To install on Android: Tap the three dots (⋮) in Chrome, then choose "Add to Home screen" or "Install App".');
    }
  });
}

// Start App!
initApp();
