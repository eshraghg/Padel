// Main Application Controller for PadelScore / TennisScore
import {
  SPORTS,
  getSport,
  getSportId,
  isSingles,
  getShotTypes,
  getShotCategories,
  getShotKeyText,
  getPlayerKeys,
  normalizeScoringRule,
  getMatchTypeLabel,
  getTeamPlayersText
} from './sports.js';
import {
  createDefaultMatch,
  createDemoMatch,
  computeMatchScore,
  getServerDetails,
  getMatchGamesBreakdown,
  loadCurrentMatch,
  saveCurrentMatch,
  archiveCurrentMatch,
  getScoringRuleLabel,
  getPointPlayerName
} from './state.js';
import { calculateMatchStatistics, generateTacticalInsights, getPlayerRank, countOverheadWinners } from './analytics.js';
import { renderRadarChartSvg, buildPlayerRadarData } from './radarChart.js';
import { playPointSound, toggleSound, isSoundEnabled } from './audio.js';
import { exportSessionToHtml } from './exportHtml.js';
import confetti from 'canvas-confetti';

// Current active match state
let currentMatch = loadCurrentMatch();

// Active Scope / Filter State
let currentFilter = {
  mode: 'all', // 'all', 'game', 'period'
  selectedGame: null, // gameNumber e.g. 1, 2
  fromMilestoneId: 'start',
  toMilestoneId: null
};

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
  // Branding
  brandTitle: document.getElementById('brand-title'),

  // Scoreboard
  liveCourt: document.getElementById('live-court-text'),
  liveRule: document.getElementById('live-rule-text'),
  liveTimer: document.getElementById('live-match-timer'),
  liveServerBadge: document.getElementById('live-server-badge'),
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
  playerSection: document.getElementById('player-select-section'),
  playerHeading: document.getElementById('player-select-heading'),
  btnPlayerL: document.getElementById('btn-player-l'),
  btnPlayerR: document.getElementById('btn-player-r'),
  recPlayerLName: document.getElementById('rec-player-l-name'),
  recPlayerRName: document.getElementById('rec-player-r-name'),
  shotChoiceHeading: document.getElementById('shot-choice-heading'),
  shotCountIndicator: document.getElementById('shot-count-indicator'),
  quickNotePills: document.getElementById('quick-note-pills'),
  shotCatFilter: document.getElementById('shot-category-filter'),
  shotGrid: document.getElementById('shot-btn-grid'),
  pointNoteInput: document.getElementById('point-note-input'),
  autosaveBar: document.getElementById('autosave-bar'),
  autosaveStatusText: document.getElementById('autosave-status-text'),
  btnQuickJson: document.getElementById('btn-quick-json'),
  btnUndoPoint: document.getElementById('btn-undo-point'),
  btnLogPoint: document.getElementById('btn-log-point'),
  logPointText: document.getElementById('log-point-text'),

  // Sheet View
  sheetSportBadge: document.getElementById('sheet-sport-badge'),
  sheetSubtitle: document.getElementById('sheet-subtitle'),
  sheetLegend: document.getElementById('sheet-legend'),
  sheetShotKey: document.getElementById('sheet-shot-key'),
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
  kpiOverheadsSub: document.getElementById('kpi-overheads-sub'),
  playerCompHeading: document.getElementById('player-comp-heading'),
  insightsList: document.getElementById('analytics-insights-list'),
  playerCompGrid: document.getElementById('player-comparison-grid'),
  playerRadarGrid: document.getElementById('player-radar-grid'),
  chartShotBars: document.getElementById('chart-shot-bars'),
  chartMomentum: document.getElementById('chart-momentum'),

  // Settings
  settingsForm: document.getElementById('match-settings-form'),
  settingSport: document.getElementById('setting-sport'),
  settingTeamFormat: document.getElementById('setting-team-format'),
  settingTeamFormatGroup: document.getElementById('setting-team-format-group'),
  settingTitle: document.getElementById('setting-title'),
  settingCourt: document.getElementById('setting-court'),
  settingDate: document.getElementById('setting-date'),
  settingFormat: document.getElementById('setting-format'),
  settingRule: document.getElementById('setting-rule'),
  settingServerTeam: document.getElementById('setting-server-team'),
  settingServerPlayer: document.getElementById('setting-server-player'),
  settingServerT1Player: document.getElementById('setting-server-t1-player'),
  settingServerT2Player: document.getElementById('setting-server-t2-player'),
  settingT1Heading: document.getElementById('setting-t1-heading'),
  settingT2Heading: document.getElementById('setting-t2-heading'),
  settingT1LeftLabel: document.getElementById('setting-t1-left-label'),
  settingT2LeftLabel: document.getElementById('setting-t2-left-label'),
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
  editPlayerGroup: document.getElementById('edit-player-group'),
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
  setupEventListeners();
  setupFilterEventListeners();
  applySportUI();
  updateSoundButton();
  updateUI();
  setupPwa();

  const matchDate = currentMatch.date || new Date().toISOString().split('T')[0];
  updateAutosaveBarStatus(`${getSportId(currentMatch)}_match_${matchDate}.json`, false);
}

// Re-render everything that depends on the match type (Padel / Tennis, Singles / Doubles)
function applySportUI() {
  const sport = getSport(currentMatch);
  normalizeScoringRule(currentMatch);

  document.title = `${sport.name} Game-Score Analysis | Bolouri Tennis & Padel Academy`;
  elements.brandTitle.textContent = sport.brand;

  // Record pad: shots & quick notes
  const shotIds = getShotTypes(currentMatch).map(s => s.id);
  if (!shotIds.includes(pendingPoint.shot)) pendingPoint.shot = 'Ret. Serve';
  if (!getShotCategories(currentMatch).includes(currentShotCategory)) currentShotCategory = 'All';
  elements.shotCountIndicator.textContent = `${shotIds.length} Shots`;
  renderShotCategories();
  renderShotButtons();
  populateEditShotSelect();

  elements.quickNotePills.innerHTML = sport.quickNotes
    .map(q => `<button type="button" class="quick-note-pill" data-note="${q.note}">${q.label}</button>`)
    .join('');
  elements.pointNoteInput.placeholder = sport.notePlaceholder;

  // Scoresheet header & shot key
  elements.sheetSportBadge.textContent = getMatchTypeLabel(currentMatch).toUpperCase();
  elements.sheetSubtitle.textContent = `${sport.name} Game-Score Analysis – Point-by-Point Sheet`;
  elements.sheetLegend.textContent = isSingles(currentMatch)
    ? "Won by W = own winning shot • Won by E = opponent's error"
    : "Won by W = own winning shot • Won by E = opponent's error • L = Left player • R = Right player";
  elements.sheetShotKey.textContent = getShotKeyText(currentMatch);

  // Analytics labels
  elements.kpiOverheadsSub.textContent = sport.overheadLabel;
  elements.playerCompHeading.textContent = isSingles(currentMatch)
    ? '👥 Player Performance'
    : '👥 Player Performance (Left vs Right)';
}

// ========================================================
// FILTER & SCOPE LOGIC (Game Dropdown & Period Range)
// ========================================================
function getActiveScopeData() {
  const breakdown = getMatchGamesBreakdown(currentMatch);
  const allPoints = currentMatch.points || [];

  if (allPoints.length === 0) {
    return {
      points: [],
      breakdown,
      filterContext: { mode: 'all', label: 'Full Match' }
    };
  }

  // 1. All match
  if (currentFilter.mode === 'all') {
    return {
      points: allPoints,
      breakdown,
      filterContext: { mode: 'all', label: 'Entire Match' }
    };
  }

  // 2. By Game (Feature 1: Select and view games)
  if (currentFilter.mode === 'game') {
    let targetGame = breakdown.games.find(g => g.gameNumber === currentFilter.selectedGame);
    if (!targetGame && breakdown.games.length > 0) {
      targetGame = breakdown.games[0];
      currentFilter.selectedGame = targetGame.gameNumber;
    }

    if (targetGame) {
      return {
        points: targetGame.points,
        breakdown,
        filterContext: {
          mode: 'game',
          gameNumber: targetGame.gameNumber,
          game: targetGame,
          label: `Game ${targetGame.gameNumber} (${targetGame.scoreAfter})`
        }
      };
    }
  }

  // 3. By Period / Score (Feature 2: Filter specific period, e.g. start to 4-3)
  if (currentFilter.mode === 'period') {
    const milestones = breakdown.scoreMilestones;
    let fromMs = milestones.find(m => m.id === currentFilter.fromMilestoneId);
    if (!fromMs) fromMs = milestones[0]; // 'start'

    let toMs = milestones.find(m => m.id === currentFilter.toMilestoneId);
    if (!toMs) toMs = milestones[milestones.length - 1]; // latest milestone

    let startPtIdx = fromMs.pointIndex; // 0-based slice start
    let endPtIdx = toMs.pointIndex;     // slice end

    if (startPtIdx > endPtIdx) {
      const temp = startPtIdx;
      startPtIdx = endPtIdx;
      endPtIdx = temp;
    }

    const sliced = allPoints.slice(startPtIdx, endPtIdx);
    const label = `${fromMs.label.split('(')[0].trim()} ➔ ${toMs.label.split('(')[0].trim()}`;

    return {
      points: sliced,
      breakdown,
      filterContext: {
        mode: 'period',
        fromMilestone: fromMs,
        toMilestone: toMs,
        label,
        startPtIdx,
        endPtIdx
      }
    };
  }

  return {
    points: allPoints,
    breakdown,
    filterContext: { mode: 'all', label: 'Entire Match' }
  };
}

function renderAllFilterPanels() {
  const { points, breakdown, filterContext } = getActiveScopeData();
  const filterPanels = document.querySelectorAll('.filter-panel-card');

  filterPanels.forEach(panel => {
    // Mode buttons
    panel.querySelectorAll('.filter-mode-btn').forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      btn.classList.toggle('active', mode === currentFilter.mode);
    });

    // Boxes visibility
    const gameBox = panel.querySelector('.filter-game-box');
    const periodBox = panel.querySelector('.filter-period-box');
    if (gameBox) gameBox.style.display = currentFilter.mode === 'game' ? 'flex' : 'none';
    if (periodBox) periodBox.style.display = currentFilter.mode === 'period' ? 'flex' : 'none';

    // Reset button & Banner
    const resetBtn = panel.querySelector('.btn-reset-scope');
    const banner = panel.querySelector('.active-scope-banner');
    const statusLbl = panel.querySelector('.filter-status-lbl');
    const bannerMsg = panel.querySelector('.active-banner-msg');
    const bannerPts = panel.querySelector('.active-banner-pts');

    if (currentFilter.mode === 'all') {
      if (resetBtn) resetBtn.style.display = 'none';
      if (banner) banner.style.display = 'none';
      if (statusLbl) statusLbl.textContent = `Viewing: Entire Match (${currentMatch.points.length} points)`;
    } else {
      if (resetBtn) resetBtn.style.display = 'inline-block';
      if (banner) banner.style.display = 'flex';
      if (statusLbl) statusLbl.textContent = `Filtered: ${filterContext.label} (${points.length} pts)`;
      if (bannerMsg) bannerMsg.textContent = `Showing: ${filterContext.label}`;
      if (bannerPts) bannerPts.textContent = `(${points.length} points in scope)`;
    }

    // Populate Game Dropdown
    const gameSelect = panel.querySelector('.filter-game-select');
    if (gameSelect) {
      gameSelect.innerHTML = '';
      if (breakdown.games.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'No games completed yet';
        gameSelect.appendChild(opt);
      } else {
        breakdown.games.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.gameNumber;
          const statusText = g.inProgress ? 'In Progress' : `${g.scoreAfter}`;
          const breakTag = g.isBreak ? ' [BREAK]' : '';
          opt.textContent = `🎾 Game ${g.gameNumber} (${statusText}) • Server: ${g.serverName} (${g.serverTeam})${breakTag} • ${g.pointsCount} pts`;
          gameSelect.appendChild(opt);
        });
        if (currentFilter.selectedGame) {
          gameSelect.value = currentFilter.selectedGame;
        } else if (breakdown.games.length > 0) {
          gameSelect.value = breakdown.games[0].gameNumber;
        }
      }
    }

    // Populate Period From / To Selects
    const fromSelect = panel.querySelector('.filter-period-from');
    const toSelect = panel.querySelector('.filter-period-to');
    if (fromSelect && toSelect) {
      fromSelect.innerHTML = '';
      toSelect.innerHTML = '';

      breakdown.scoreMilestones.forEach(sm => {
        const optFrom = document.createElement('option');
        optFrom.value = sm.id;
        optFrom.textContent = sm.label;
        fromSelect.appendChild(optFrom);

        const optTo = document.createElement('option');
        optTo.value = sm.id;
        optTo.textContent = sm.label;
        toSelect.appendChild(optTo);
      });

      fromSelect.value = currentFilter.fromMilestoneId || 'start';
      if (currentFilter.toMilestoneId) {
        toSelect.value = currentFilter.toMilestoneId;
      } else if (breakdown.scoreMilestones.length > 1) {
        toSelect.value = breakdown.scoreMilestones[breakdown.scoreMilestones.length - 1].id;
      }
    }

    // Quick Presets
    const presetsWrap = panel.querySelector('.preset-pills-wrap');
    if (presetsWrap) {
      presetsWrap.innerHTML = '';

      // Check if 4-3 milestone exists (User's specific requirement!)
      const milestone43 = breakdown.scoreMilestones.find(sm => sm.scoreText === '4 - 3' || sm.label.includes('4 - 3'));
      if (milestone43) {
        const btn43 = document.createElement('button');
        btn43.type = 'button';
        btn43.className = 'preset-pill-btn';
        btn43.textContent = '⚡ Start ➔ Score 4-3';
        btn43.title = 'Filter from Start to when score was 4 to 3';
        btn43.addEventListener('click', () => {
          currentFilter.mode = 'period';
          currentFilter.fromMilestoneId = 'start';
          currentFilter.toMilestoneId = milestone43.id;
          applyFilterAndRefresh();
        });
        presetsWrap.appendChild(btn43);
      }

      // Check for first 3 games presets
      if (breakdown.games.length >= 2) {
        const btnG2 = document.createElement('button');
        btnG2.type = 'button';
        btnG2.className = 'preset-pill-btn';
        btnG2.textContent = '🎾 Game 2';
        btnG2.title = 'View Game 2 data & analysis';
        btnG2.addEventListener('click', () => {
          currentFilter.mode = 'game';
          currentFilter.selectedGame = 2;
          applyFilterAndRefresh();
        });
        presetsWrap.appendChild(btnG2);
      }

      if (breakdown.games.length >= 1) {
        const btnG1 = document.createElement('button');
        btnG1.type = 'button';
        btnG1.className = 'preset-pill-btn';
        btnG1.textContent = '🎾 Game 1';
        btnG1.addEventListener('click', () => {
          currentFilter.mode = 'game';
          currentFilter.selectedGame = 1;
          applyFilterAndRefresh();
        });
        presetsWrap.appendChild(btnG1);
      }

      // Full Set 1 preset
      const endSet1 = breakdown.scoreMilestones.find(sm => sm.setEnded);
      if (endSet1) {
        const btnSet1 = document.createElement('button');
        btnSet1.type = 'button';
        btnSet1.className = 'preset-pill-btn';
        btnSet1.textContent = '🏆 Set 1';
        btnSet1.addEventListener('click', () => {
          currentFilter.mode = 'period';
          currentFilter.fromMilestoneId = 'start';
          currentFilter.toMilestoneId = endSet1.id;
          applyFilterAndRefresh();
        });
        presetsWrap.appendChild(btnSet1);
      }
    }
  });
}

function applyFilterAndRefresh() {
  const { points, filterContext } = getActiveScopeData();
  renderAllFilterPanels();

  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    if (activeTab.id === 'tab-sheet') renderScoresheetTable(points, filterContext);
    else if (activeTab.id === 'tab-summary') renderSummaryMatrix(points, filterContext);
    else if (activeTab.id === 'tab-analytics') renderAnalyticsView(points, filterContext);
  }
}

function setupFilterEventListeners() {
  document.addEventListener('click', (e) => {
    // Mode button
    const modeBtn = e.target.closest('.filter-mode-btn');
    if (modeBtn) {
      const mode = modeBtn.getAttribute('data-mode');
      currentFilter.mode = mode;
      if (mode === 'game' && !currentFilter.selectedGame) {
        const { breakdown } = getActiveScopeData();
        if (breakdown.games.length > 0) currentFilter.selectedGame = breakdown.games[0].gameNumber;
      }
      playPointSound('click');
      applyFilterAndRefresh();
      return;
    }

    // Reset button
    const resetBtn = e.target.closest('.btn-reset-scope');
    if (resetBtn) {
      currentFilter.mode = 'all';
      playPointSound('click');
      applyFilterAndRefresh();
      return;
    }
  });

  document.addEventListener('change', (e) => {
    // Game select
    if (e.target.matches('.filter-game-select')) {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        currentFilter.mode = 'game';
        currentFilter.selectedGame = val;
        playPointSound('click');
        applyFilterAndRefresh();
      }
      return;
    }

    // Period From select
    if (e.target.matches('.filter-period-from')) {
      currentFilter.mode = 'period';
      currentFilter.fromMilestoneId = e.target.value;
      playPointSound('click');
      applyFilterAndRefresh();
      return;
    }

    // Period To select
    if (e.target.matches('.filter-period-to')) {
      currentFilter.mode = 'period';
      currentFilter.toMilestoneId = e.target.value;
      playPointSound('click');
      applyFilterAndRefresh();
      return;
    }
  });
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
    if (confirm('Load sample professional match with 10 full games, hitting score 4-3, and full analytics?')) {
      currentMatch = createDemoMatch();
      saveCurrentMatch(currentMatch);
      currentFilter.mode = 'all';
      applySportUI();
      updateUI();
      autoSaveMatchJson({ silent: true });
      switchTab('tab-analytics');
    }
  };
  elements.btnDemoLoadTop.addEventListener('click', loadDemoAction);
  elements.btnLoadDemo.addEventListener('click', loadDemoAction);

  // New Match
  elements.btnNewMatch.addEventListener('click', () => {
    if (confirm('Start a new match? Current match will be archived.')) {
      archiveCurrentMatch(currentMatch);
      // Keep the current match type for the new match
      currentMatch = createDefaultMatch(getSportId(currentMatch), currentMatch.teamFormat);
      saveCurrentMatch(currentMatch);
      currentFilter.mode = 'all';
      applySportUI();
      updateUI();
      autoSaveMatchJson({ silent: true });
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
  elements.quickNotePills.addEventListener('click', (e) => {
    const pill = e.target.closest('.quick-note-pill');
    if (!pill) return;
    const noteText = pill.getAttribute('data-note');
    elements.pointNoteInput.value = noteText;
    pendingPoint.note = noteText;
  });

  elements.pointNoteInput.addEventListener('input', (e) => {
    pendingPoint.note = e.target.value;
  });

  // Auto-Save Bar actions
  if (elements.btnQuickJson) {
    elements.btnQuickJson.addEventListener('click', () => {
      autoSaveMatchJson({ forceDownload: true });
    });
  }

  // Log Point
  elements.btnLogPoint.addEventListener('click', handleLogPoint);

  // Undo Point
  elements.btnUndoPoint.addEventListener('click', handleUndoPoint);

  // Settings form submit
  elements.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettingsFromForm();
  });

  // Real-time server label update on settings inputs
  const settingsInputs = [
    elements.settingT1Name, elements.settingT1Left, elements.settingT1Right,
    elements.settingT2Name, elements.settingT2Left, elements.settingT2Right,
    elements.settingServerTeam
  ];
  settingsInputs.forEach(inp => {
    if (inp) {
      inp.addEventListener('input', updateSettingsServerLabels);
      inp.addEventListener('change', updateSettingsServerLabels);
    }
  });

  // Match type changes reshape the form (deuce rules, singles/doubles fields)
  elements.settingSport.addEventListener('change', () => {
    updateSettingsTitleForSport();
    updateSettingsMatchTypeFields();
  });
  elements.settingTeamFormat.addEventListener('change', updateSettingsMatchTypeFields);

  // Export CSV (Scope-aware)
  elements.btnExportCsv.addEventListener('click', exportToCsv);

  // Export HTML Report (Scope-aware)
  const exportHtmlHandler = () => {
    const { points, filterContext } = getActiveScopeData();
    exportSessionToHtml(currentMatch, points, filterContext);
  };
  if (elements.btnExportHtmlSummary) {
    elements.btnExportHtmlSummary.addEventListener('click', exportHtmlHandler);
  }
  if (elements.btnExportHtmlSettings) {
    elements.btnExportHtmlSettings.addEventListener('click', exportHtmlHandler);
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
    dlAnchor.setAttribute('download', `${getSportId(currentMatch)}_match_${currentMatch.date || 'data'}.json`);
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
      autoSaveMatchJson();
      closeEditPointModal();
      playPointSound('click');
      updateUI();
    }
  });
}

// Populate Edit Shot dropdown
function populateEditShotSelect() {
  if (!elements.editShotSelect) return;
  elements.editShotSelect.innerHTML = '';
  getShotTypes(currentMatch).forEach(shot => {
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

  // Singles: the side's only player is always credited
  const singles = isSingles(currentMatch);
  elements.editPlayerGroup.style.display = singles ? 'none' : '';
  if (singles) editingPoint.player = 'L';

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

  const { points, filterContext } = getActiveScopeData();
  renderAllFilterPanels();

  if (tabId === 'tab-sheet') renderScoresheetTable(points, filterContext);
  if (tabId === 'tab-summary') renderSummaryMatrix(points, filterContext);
  if (tabId === 'tab-analytics') renderAnalyticsView(points, filterContext);
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
  getShotCategories(currentMatch).forEach(cat => {
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

  const shotTypes = getShotTypes(currentMatch);
  const filtered = currentShotCategory === 'All'
    ? shotTypes
    : shotTypes.filter(s => s.category.toLowerCase().includes(currentShotCategory.toLowerCase()));

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
  const { points, filterContext } = getActiveScopeData();

  // 1. Update Scoreboard (with active serving player resolution)
  updateScoreboard(scoreState);

  // 2. Update Record Pad
  updateRecordPad();

  // 3. Render filter panels across Sheet, Summary, and Analytics
  renderAllFilterPanels();

  // 4. Update current tab
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    if (activeTab.id === 'tab-sheet') renderScoresheetTable(points, filterContext);
    else if (activeTab.id === 'tab-summary') renderSummaryMatrix(points, filterContext);
    else if (activeTab.id === 'tab-analytics') renderAnalyticsView(points, filterContext);
    else if (activeTab.id === 'tab-settings') populateSettingsForm();
  }
}

// Update live header scoreboard
function updateScoreboard(state) {
  elements.liveCourt.textContent = currentMatch.court || 'Court 1';
  if (state.isTiebreak) {
    elements.liveRule.textContent = '⚖️ TIE-BREAK (6-6)';
  } else if (state.isStarPoint) {
    elements.liveRule.textContent = '⭐ STAR POINT';
  } else {
    elements.liveRule.textContent = getScoringRuleLabel(currentMatch.scoringRule, getSportId(currentMatch));
  }

  // Live Server Badge (Feature 3)
  if (elements.liveServerBadge) {
    elements.liveServerBadge.textContent = `🎾 Server: ${state.currentServerName || 'Player 1'}`;
  }

  // Team 1
  elements.sbT1Name.textContent = currentMatch.team1.name;
  const t1Serving = state.currentServerTeam === 'T1';
  const t1ServerSide = t1Serving ? state.currentServerPlayer : null;
  const t1LText = `L: ${currentMatch.team1.leftPlayer || 'Left'}${t1ServerSide === 'L' ? ' 🎾' : ''}`;
  const t1RText = `R: ${currentMatch.team1.rightPlayer || 'Right'}${t1ServerSide === 'R' ? ' 🎾' : ''}`;
  elements.sbT1Players.textContent = isSingles(currentMatch)
    ? (t1Serving ? 'Serving 🎾' : 'Receiving')
    : `${t1LText} • ${t1RText}`;
  elements.sbT1Games.textContent = state.games.T1;
  elements.sbT1Points.textContent = state.isTiebreak ? state.tiebreakPoints.T1 : state.gameScore.T1;

  // Team 2
  elements.sbT2Name.textContent = currentMatch.team2.name;
  const t2Serving = state.currentServerTeam === 'T2';
  const t2ServerSide = t2Serving ? state.currentServerPlayer : null;
  const t2LText = `L: ${currentMatch.team2.leftPlayer || 'Left'}${t2ServerSide === 'L' ? ' 🎾' : ''}`;
  const t2RText = `R: ${currentMatch.team2.rightPlayer || 'Right'}${t2ServerSide === 'R' ? ' 🎾' : ''}`;
  elements.sbT2Players.textContent = isSingles(currentMatch)
    ? (t2Serving ? 'Serving 🎾' : 'Receiving')
    : `${t2LText} • ${t2RText}`;
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

  const singles = isSingles(currentMatch);

  // Team buttons
  elements.recT1Name.textContent = t1.name;
  elements.recT1Sub.textContent = singles ? 'Player 1' : `L: ${t1.leftPlayer || 'L'} | R: ${t1.rightPlayer || 'R'}`;
  elements.recT2Name.textContent = t2.name;
  elements.recT2Sub.textContent = singles ? 'Player 2' : `L: ${t2.leftPlayer || 'L'} | R: ${t2.rightPlayer || 'R'}`;

  elements.btnTeamT1.classList.toggle('selected', pendingPoint.team === 'T1');
  elements.btnTeamT2.classList.toggle('selected', pendingPoint.team === 'T2');

  // Won By buttons
  elements.btnWonW.classList.toggle('selected', pendingPoint.wonBy === 'W');
  elements.btnWonE.classList.toggle('selected', pendingPoint.wonBy === 'E');

  // Player Selection (Step 3) — not needed in singles, the side's only player is credited
  elements.playerSection.style.display = singles ? 'none' : '';
  if (singles) pendingPoint.player = 'L';
  elements.shotChoiceHeading.textContent = singles ? '3. Shot Choice' : '4. Shot Choice (PDF Sheet + Ret. Serve)';

  let targetTeam = pendingPoint.team === 'T1' ? t1 : t2;

  if (pendingPoint.wonBy === 'E') {
    targetTeam = pendingPoint.team === 'T1' ? t2 : t1;
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
// ========================================================
// AUTOMATIC JSON BACKUP & FILE SAVING (Date-Named)
// ========================================================
async function autoSaveMatchJson(options = {}) {
  const safeDate = String(currentMatch.date || new Date().toISOString().split('T')[0]).replace(/[/\\?%*:|"<>]/g, '-').trim();
  const fileName = `${getSportId(currentMatch)}_match_${safeDate}.json`;

  // 1. Date-named LocalStorage backup (prevents accidental loss even if browser is closed)
  try {
    localStorage.setItem(`padel_backup_${safeDate}.json`, JSON.stringify(currentMatch));
    localStorage.setItem('padel_current_match', JSON.stringify(currentMatch));
  } catch (e) {
    console.error('LocalStorage backup error:', e);
  }

  // 2. Automatically save file directly to disk (via local dev-server endpoint)
  // ZERO browser file picker / browse popups!
  let savedToDisk = false;
  try {
    const res = await fetch('/api/save-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentMatch)
    });
    if (res.ok) {
      savedToDisk = true;
    }
  } catch (err) {
    // Silent fallback if server is unreachable
  }

  // 3. ONLY trigger manual file download if explicitly requested (e.g. clicked "📥 JSON" button)
  // NEVER ask or pop up a browse dialog on Log Point!
  if (options.forceDownload) {
    const blob = new Blob([JSON.stringify(currentMatch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 4. Update status indicator with visual pulse
  updateAutosaveBarStatus(fileName, savedToDisk);
}

function updateAutosaveBarStatus(fileName, isSavedToDisk = true) {
  if (!elements.autosaveStatusText) return;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const ptsCount = currentMatch.points?.length || 0;

  const modeText = isSavedToDisk ? '💾 Auto-Saved' : '💾 Auto-Saved (Local)';
  elements.autosaveStatusText.textContent = `${modeText}: ${fileName} (Point #${ptsCount} • ${timeStr})`;

  if (elements.autosaveBar) {
    elements.autosaveBar.classList.remove('saving');
    void elements.autosaveBar.offsetWidth; // trigger reflow
    elements.autosaveBar.classList.add('saving');
    setTimeout(() => {
      if (elements.autosaveBar) elements.autosaveBar.classList.remove('saving');
    }, 800);
  }
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
  autoSaveMatchJson();

  const newScoreState = computeMatchScore(currentMatch);

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

  elements.pointNoteInput.value = '';
  pendingPoint.note = '';

  updateUI();
}

function handleUndoPoint() {
  if (!currentMatch.points || currentMatch.points.length === 0) {
    alert('No points to undo.');
    return;
  }

  currentMatch.points.pop();
  saveCurrentMatch(currentMatch);
  autoSaveMatchJson();
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
// SCORESHEET TABLE VIEW (Matches PDF Point-by-Point Sheet)
// ========================================================
function renderScoresheetTable(pointsToRender = null, filterContext = null) {
  const scopeData = getActiveScopeData();
  const points = pointsToRender !== null ? pointsToRender : scopeData.points;
  const breakdown = scopeData.breakdown;

  elements.sheetDate.textContent = currentMatch.date || '-';
  elements.sheetCourt.textContent = currentMatch.court || '-';
  elements.sheetT1.textContent = getTeamPlayersText(currentMatch, currentMatch.team1);
  elements.sheetT2.textContent = getTeamPlayersText(currentMatch, currentMatch.team2);
  elements.sheetFormat.textContent = `${getMatchTypeLabel(currentMatch)} • ${currentMatch.format} • ${getScoringRuleLabel(currentMatch.scoringRule, getSportId(currentMatch))}`;
  elements.sheetTime.textContent = currentMatch.startTime || '-';

  elements.pointTableBody.innerHTML = '';

  if (!points || points.length === 0) {
    elements.pointTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="padding: 24px; color: #94a3b8; font-style: italic;">
          No points recorded in this scope. Adjust the filter or log points!
        </td>
      </tr>
    `;
    return;
  }

  points.forEach((pt) => {
    const rawIdx = currentMatch.points.findIndex(p => p.id === pt.id);
    const pointIdxNumber = rawIdx >= 0 ? rawIdx + 1 : (pt.index || pt.pointIndex || 1);
    const annPt = breakdown.annotatedPoints.find(ap => ap.id === pt.id || ap.pointIndex === pointIdxNumber) || pt;

    const isT1 = pt.team === 'T1';
    const wonByText = pt.wonBy === 'W' ? 'W (Winner)' : "E (Error)";
    const wonClass = pt.wonBy === 'W' ? 'won-badge-w' : 'won-badge-e';
    const playerText = getPointPlayerName(currentMatch, pt);

    const row = document.createElement('tr');
    row.className = 'row-clickable';
    row.title = 'Click to edit this point';
    row.innerHTML = `
      <td style="font-weight:700; color:#64748b;">${pointIdxNumber}</td>
      <td style="font-weight:800; color:#38bdf8;">G${annPt.gameNumber || '-'}</td>
      <td>
        <div class="score-bubbles">
          <span style="font-weight:700; color:#059669;">T1: ${annPt.scoreDisplayAfter ? annPt.scoreDisplayAfter.split('-')[0] : '0'}</span>
          <span style="color:#94a3b8;">/</span>
          <span style="font-weight:700; color:#0284c7;">T2: ${annPt.scoreDisplayAfter ? annPt.scoreDisplayAfter.split('-')[1] : '0'}</span>
        </div>
      </td>
      <td style="font-size:0.75rem; font-weight:700; color:var(--accent-gold); white-space:nowrap;">
        🎾 ${annPt.serverName || '-'}
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
      <td class="sheet-note-cell" style="color:#64748b; font-size:0.72rem; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${pt.note || '—'}
      </td>
      <td>
        <div style="display:flex; gap:4px; justify-content:center; align-items:center;">
          <button type="button" class="btn-edit-pt" data-real-idx="${rawIdx}" title="Edit point">✏️</button>
          <button type="button" class="btn-del-pt" data-real-idx="${rawIdx}" title="Delete point">🗑️</button>
        </div>
      </td>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-del-pt')) return;
      if (rawIdx >= 0) openEditPointModal(rawIdx);
    });

    const editBtn = row.querySelector('.btn-edit-pt');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (rawIdx >= 0) openEditPointModal(rawIdx);
      });
    }

    const delBtn = row.querySelector('.btn-del-pt');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (rawIdx >= 0 && confirm(`Delete point #${pointIdxNumber}?`)) {
          currentMatch.points.splice(rawIdx, 1);
          saveCurrentMatch(currentMatch);
          updateUI();
        }
      });
    }

    elements.pointTableBody.appendChild(row);
  });
}

// ========================================================
// SUMMARY MATRIX VIEW (Page 4 End-of-Set Summary + Ret. Serve)
// ========================================================
function renderSummaryMatrix(pointsToRender = null, filterContext = null) {
  const scopeData = getActiveScopeData();
  const points = pointsToRender !== null ? pointsToRender : scopeData.points;
  const ctx = filterContext || scopeData.filterContext;

  const stats = calculateMatchStatistics(currentMatch, points);
  const scoreState = computeMatchScore(currentMatch);
  const shotIds = getShotTypes(currentMatch).map(s => s.id);
  const doubles = !isSingles(currentMatch);

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

  // Per-player sub-row (field: 'winners' | 'errors'); singles has one player per side, so no sub-rows
  const playerSubRow = (pKey, field) => {
    if (!doubles) return '';
    const p = stats.players[pKey];
    const side = pKey.endsWith('-L') ? 'L' : 'R';
    let row = `<tr class="row-sub"><td style="text-align:left; padding-left:18px;">↳ ${side}: ${p.name}</td>`;
    let total = 0;
    shotIds.forEach(id => {
      const val = p.shots[id]?.[field] || 0;
      total += val;
      row += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
    });
    return row + `<td class="total-cell">${total}</td></tr>`;
  };

  // 1a/1b. T1 Left & Right Player Winners
  bodyHtml += playerSubRow('T1-L', 'winners');
  bodyHtml += playerSubRow('T1-R', 'winners');

  // 2. T2 Winners (Total)
  bodyHtml += `<tr class="row-t2"><td style="text-align:left; font-weight:800; color:var(--t2-text);">T2 Winners (${currentMatch.team2.name})</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Winners || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--t2-text);">${stats.t2Winners}</td></tr>`;

  // 2a/2b. T2 Left & Right Player Winners
  bodyHtml += playerSubRow('T2-L', 'winners');
  bodyHtml += playerSubRow('T2-R', 'winners');

  // 3. Errors (opp.)
  bodyHtml += `<tr><td style="text-align:left; font-weight:700; color:var(--accent-danger);">T1 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t1Errors || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-danger);">${stats.t1Errors}</td></tr>`;

  // 3a/3b. T1 Left & Right Player Errors
  bodyHtml += playerSubRow('T1-L', 'errors');
  bodyHtml += playerSubRow('T1-R', 'errors');

  bodyHtml += `<tr><td style="text-align:left; font-weight:700; color:var(--accent-danger);">T2 Errors Committed</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.t2Errors || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-danger);">${stats.t2Errors}</td></tr>`;

  // 4a/4b. T2 Left & Right Player Errors
  bodyHtml += playerSubRow('T2-L', 'errors');
  bodyHtml += playerSubRow('T2-R', 'errors');

  // Total Points Row
  bodyHtml += `<tr style="border-top:2px solid rgba(255,255,255,0.15);"><td style="text-align:left; font-weight:800; color:#fff;">Total Points Decided</td>`;
  shotIds.forEach(id => {
    const val = stats.shotMatrix[id]?.total || 0;
    bodyHtml += `<td class="${val > 0 ? 'val-nonzero' : 'val-zero'}">${val}</td>`;
  });
  bodyHtml += `<td class="total-cell" style="color:var(--accent-gold);">${stats.totalPoints}</td></tr>`;

  bodyHtml += '</tbody>';
  elements.summaryMatrixTable.innerHTML = headerHtml + bodyHtml;

  // Final set scores / scope info
  if (ctx && ctx.mode !== 'all') {
    elements.summaryFinalScores.textContent = `${ctx.label} (${points.length} points in scope)`;
  } else if (scoreState.completedSets.length > 0) {
    const scoresStr = scoreState.completedSets.map(cs => {
      const tb = cs.tiebreak ? ` (TB ${cs.tiebreak.T1}-${cs.tiebreak.T2})` : '';
      return `${cs.t1}-${cs.t2}${tb}`;
    }).join(' , ');
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

// Export Summary to CSV (Scope-aware)
function exportToCsv() {
  const { points, filterContext } = getActiveScopeData();
  const stats = calculateMatchStatistics(currentMatch, points);
  const shotIds = getShotTypes(currentMatch).map(s => s.id);
  const doubles = !isSingles(currentMatch);
  const sportName = getSport(currentMatch).name;

  let csv = 'Bolouri Tennis & Padel Academy - Game-Score Analysis Summary\n';
  csv += `Match: ${currentMatch.title || `${sportName} Match`}, Type: ${getMatchTypeLabel(currentMatch)}, Date: ${currentMatch.date}, Court: ${currentMatch.court}\n`;
  csv += `Scope: ${filterContext.label} (${points.length} points)\n`;
  csv += `Team 1: "${getTeamPlayersText(currentMatch, currentMatch.team1)}"\n`;
  csv += `Team 2: "${getTeamPlayersText(currentMatch, currentMatch.team2)}"\n\n`;

  csv += ['Category', ...shotIds, 'TOTAL'].join(',') + '\n';

  const addCsvRow = (title, vals, total) => {
    csv += [`"${title}"`, ...vals, total].join(',') + '\n';
  };
  const addPlayerRows = (team, field) => {
    if (!doubles) return;
    [['L', 'Left'], ['R', 'Right']].forEach(([side, sideName]) => {
      const p = stats.players[`${team}-${side}`];
      addCsvRow(`↳ ${team} ${sideName}: ${p.name}`, shotIds.map(id => p.shots[id]?.[field] || 0), p[field]);
    });
  };

  addCsvRow('T1 Winners', shotIds.map(id => stats.shotMatrix[id]?.t1Winners || 0), stats.t1Winners);
  addPlayerRows('T1', 'winners');

  addCsvRow('T2 Winners', shotIds.map(id => stats.shotMatrix[id]?.t2Winners || 0), stats.t2Winners);
  addPlayerRows('T2', 'winners');

  addCsvRow('T1 Errors', shotIds.map(id => stats.shotMatrix[id]?.t1Errors || 0), stats.t1Errors);
  addPlayerRows('T1', 'errors');
  addCsvRow('T2 Errors', shotIds.map(id => stats.shotMatrix[id]?.t2Errors || 0), stats.t2Errors);
  addPlayerRows('T2', 'errors');
  addCsvRow('Total Points', shotIds.map(id => stats.shotMatrix[id]?.total || 0), stats.totalPoints);

  csv += '\nPlayer,Winners,Errors,Total Shots,Rank\n';
  getPlayerKeys(currentMatch).forEach(key => {
    const p = stats.players[key];
    csv += [`"${p.name}"`, p.winners, p.errors, p.winners + p.errors, getPlayerRank(p, currentMatch)].join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${getSportId(currentMatch)}_summary_${currentMatch.date || 'data'}.csv`);
  link.click();
}

// ========================================================
// ANALYTICS & CHARTS VIEW (Scope-aware for Game & Period)
// ========================================================
function renderAnalyticsView(pointsToRender = null, filterContext = null) {
  const scopeData = getActiveScopeData();
  const points = pointsToRender !== null ? pointsToRender : scopeData.points;
  const ctx = filterContext || scopeData.filterContext;

  const stats = calculateMatchStatistics(currentMatch, points);

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

  elements.kpiOverheadsVal.textContent = countOverheadWinners(stats, currentMatch);

  // 2. Context-Aware Tactical Insights
  const insights = generateTacticalInsights(stats, currentMatch, ctx);
  elements.insightsList.innerHTML = '';
  insights.forEach(ins => {
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = ins.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    elements.insightsList.appendChild(div);
  });

  // 3. Player Comparison Cards
  renderPlayerComparisonCards(stats);

  // 3b. Player Shot Radar Charts (Winners & Errors)
  renderPlayerRadarCharts(stats);

  // 4. SVG Shot Distribution Bar Chart
  renderShotDistributionChart(stats);

  // 5. SVG Momentum Flow Chart
  renderMomentumChart(stats);
}

function renderPlayerComparisonCards(stats) {
  elements.playerCompGrid.innerHTML = '';

  const singles = isSingles(currentMatch);
  const playersList = getPlayerKeys(currentMatch).map(key => ({
    key,
    team: key.slice(0, 2),
    // Side pill: L / R in doubles, player number in singles
    side: singles ? key.slice(1, 2) : key.slice(3),
    data: stats.players[key]
  }));

  playersList.forEach(p => {
    const box = document.createElement('div');
    box.className = 'player-stat-box';

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
        <div class="player-rank-badge" title="Player rank (D → C+)">${getPlayerRank(p.data, currentMatch)}</div>
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

function renderPlayerRadarCharts(stats) {
  if (!elements.playerRadarGrid) return;
  const { players, labels, maxValue } = buildPlayerRadarData(stats, getShotTypes(currentMatch), getPlayerKeys(currentMatch));
  const singles = isSingles(currentMatch);

  elements.playerRadarGrid.innerHTML = players.map(p => {
    const tagColor = p.team === 'T1' ? 'var(--t1-text)' : 'var(--t2-text)';
    const winnersTotal = p.winners.reduce((a, b) => a + b, 0);
    const errorsTotal = p.errors.reduce((a, b) => a + b, 0);
    return `
      <div class="player-radar-box">
        <div class="player-stat-header">
          <div class="player-side-pill">${singles ? p.team.slice(1) : p.side}</div>
          <div class="player-stat-name" style="color:${tagColor};">${p.name}</div>
          <div class="player-rank-badge" title="Player rank (D → C+)">${getPlayerRank(stats.players[p.key], currentMatch)}</div>
        </div>
        <div class="player-radar-pair">
          <div>
            <div class="player-radar-label" style="color:#10b981;">Winners (${winnersTotal})</div>
            ${renderRadarChartSvg({ labels, values: p.winners, color: '#10b981', maxValue, seriesLabel: 'Winners' })}
          </div>
          <div>
            <div class="player-radar-label" style="color:#ef4444;">Errors (${errorsTotal})</div>
            ${renderRadarChartSvg({ labels, values: p.errors, color: '#ef4444', maxValue, seriesLabel: 'Errors' })}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderShotDistributionChart(stats) {
  const shotIds = getShotTypes(currentMatch).map(s => s.id);
  const barWidth = 18;
  const gap = 12;
  const startX = 40;
  const width = Math.max(640, startX + shotIds.length * (barWidth * 2 + gap) + 10);
  const height = 240;
  const baseY = height - 40;

  let maxVal = 1;
  shotIds.forEach(id => {
    const t1W = stats.shotMatrix[id]?.t1Winners || 0;
    const t2W = stats.shotMatrix[id]?.t2Winners || 0;
    if (t1W > maxVal) maxVal = t1W;
    if (t2W > maxVal) maxVal = t2W;
  });

  const scale = (height - 70) / maxVal;

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="overflow:visible;">`;

  svg += `<line x1="30" y1="${baseY}" x2="${width - 10}" y2="${baseY}" stroke="#334155" stroke-width="1.5" />`;
  svg += `<line x1="30" y1="${baseY - (height - 80) / 2}" x2="${width - 10}" y2="${baseY - (height - 80) / 2}" stroke="#1e293b" stroke-dasharray="4" />`;
  svg += `<line x1="30" y1="30" x2="${width - 10}" y2="30" stroke="#1e293b" stroke-dasharray="4" />`;

  shotIds.forEach((id, i) => {
    const x = startX + i * (barWidth * 2 + gap);
    const t1W = stats.shotMatrix[id]?.t1Winners || 0;
    const t2W = stats.shotMatrix[id]?.t2Winners || 0;

    const t1H = t1W * scale;
    const t2H = t2W * scale;

    if (t1H > 0) {
      svg += `<rect x="${x}" y="${baseY - t1H}" width="${barWidth}" height="${t1H}" fill="#10b981" rx="3">
                <title>${currentMatch.team1.name} ${id}: ${t1W}</title>
              </rect>`;
      svg += `<text x="${x + barWidth / 2}" y="${baseY - t1H - 4}" fill="#10b981" font-size="9" font-weight="bold" text-anchor="middle">${t1W}</text>`;
    }

    if (t2H > 0) {
      svg += `<rect x="${x + barWidth + 2}" y="${baseY - t2H}" width="${barWidth}" height="${t2H}" fill="#06b6d4" rx="3">
                <title>${currentMatch.team2.name} ${id}: ${t2W}</title>
              </rect>`;
      svg += `<text x="${x + barWidth + 2 + barWidth / 2}" y="${baseY - t2H - 4}" fill="#06b6d4" font-size="9" font-weight="bold" text-anchor="middle">${t2W}</text>`;
    }

    const isRet = id === 'Ret. Serve';
    svg += `<text x="${x + barWidth + 1}" y="${baseY + 16}" fill="${isRet ? '#38bdf8' : '#94a3b8'}" font-size="9" font-weight="${isRet ? 'bold' : 'normal'}" text-anchor="middle">${id}</text>`;
  });

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
    elements.chartMomentum.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">No points in this scope.</div>`;
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

  svg += `<line x1="${paddingX}" y1="${midY}" x2="${width - paddingX}" y2="${midY}" stroke="#334155" stroke-width="1.5" />`;
  svg += `<text x="${paddingX - 10}" y="${midY + 4}" fill="#64748b" font-size="10" text-anchor="end">0</text>`;

  svg += `<text x="${paddingX}" y="20" fill="#10b981" font-size="11" font-weight="bold">▲ ${currentMatch.team1.name} Lead</text>`;
  svg += `<text x="${paddingX}" y="${height - 8}" fill="#06b6d4" font-size="11" font-weight="bold">▼ ${currentMatch.team2.name} Lead</text>`;

  svg += `<path d="${areaD}" fill="rgba(16, 185, 129, 0.12)" />`;
  svg += `<path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;

  stats.momentum.forEach((m, idx) => {
    const x = paddingX + idx * stepX;
    const y = midY - (m.diff * scaleY);
    const dotColor = m.winner === 'T1' ? '#10b981' : '#06b6d4';
    svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="${dotColor}">
              <title>Point #${m.matchIndex || m.pointIndex}: ${m.winner} won with ${m.shot}</title>
            </circle>`;
  });

  svg += '</svg>';
  elements.chartMomentum.innerHTML = svg;
}

// ========================================================
// SETTINGS VIEW & FORM (Feature 3: Serving Player Selection)
// ========================================================
function populateSettingsForm() {
  elements.settingSport.value = getSportId(currentMatch);
  // Tennis defaults to singles when switching over from a padel match
  elements.settingTeamFormat.value = getSportId(currentMatch) === 'tennis' && !isSingles(currentMatch) ? 'doubles' : 'singles';
  updateSettingsMatchTypeFields();

  elements.settingTitle.value = currentMatch.title || '';
  elements.settingCourt.value = currentMatch.court || 'Court 1';
  elements.settingDate.value = currentMatch.date || '';
  elements.settingFormat.value = currentMatch.format || 'Best of 3';
  elements.settingRule.value = normalizeScoringRule(currentMatch);

  elements.settingT1Name.value = currentMatch.team1.name || 'Team 1';
  elements.settingT1Left.value = currentMatch.team1.leftPlayer || '';
  elements.settingT1Right.value = currentMatch.team1.rightPlayer || '';

  elements.settingT2Name.value = currentMatch.team2.name || 'Team 2';
  elements.settingT2Left.value = currentMatch.team2.leftPlayer || '';
  elements.settingT2Right.value = currentMatch.team2.rightPlayer || '';

  if (elements.settingServerTeam) {
    elements.settingServerTeam.value = currentMatch.initialServerTeam || currentMatch.initialServer || 'T1';
  }
  if (elements.settingServerPlayer) {
    elements.settingServerPlayer.value = currentMatch.initialServerPlayer || 'L';
  }
  if (elements.settingServerT1Player) {
    elements.settingServerT1Player.value = currentMatch.initialServerPlayerT1 || 'L';
  }
  if (elements.settingServerT2Player) {
    elements.settingServerT2Player.value = currentMatch.initialServerPlayerT2 || 'L';
  }

  updateSettingsServerLabels();
}

// Swap the sport name in the title input (e.g. "Padel Game Score & Analysis" -> "Tennis ..."),
// or fill in the default title when it is empty
function updateSettingsTitleForSport() {
  const sport = SPORTS[elements.settingSport.value] || SPORTS.padel;
  const title = elements.settingTitle.value.trim();
  if (!title) {
    elements.settingTitle.value = `${sport.name} Game Score & Analysis`;
    return;
  }
  const names = Object.values(SPORTS).map(s => s.name);
  // Titles naming both sports (e.g. "Bolouri Tennis & Padel Academy") are left as they are
  const mentioned = names.filter(n => new RegExp(`\\b${n}\\b`, 'i').test(title));
  if (mentioned.length !== 1) return;
  elements.settingTitle.value = title.replace(new RegExp(`\\b${mentioned[0]}\\b`, 'gi'), sport.name);
}

// Show the fields that apply to the match type selected in the form (before saving)
function updateSettingsMatchTypeFields() {
  const sport = SPORTS[elements.settingSport.value] || SPORTS.padel;
  const isTennis = sport.id === 'tennis';
  const singles = isTennis && elements.settingTeamFormat.value === 'singles';

  elements.settingTeamFormatGroup.style.display = isTennis ? '' : 'none';
  elements.settingsForm.classList.toggle('singles', singles);

  // Deuce rule options for the sport; switching sport resets to that sport's default rule
  const prevRule = elements.settingRule.value;
  const sportChanged = elements.settingRule.dataset.sport !== sport.id;
  elements.settingRule.dataset.sport = sport.id;
  elements.settingRule.innerHTML = sport.rules
    .map(rule => `<option value="${rule.id}">${rule.option}</option>`)
    .join('');
  elements.settingRule.value = !sportChanged && sport.rules.some(rule => rule.id === prevRule) ? prevRule : sport.defaultRule;

  elements.settingT1Heading.textContent = singles ? 'Player 1' : 'Team 1 Setup';
  elements.settingT2Heading.textContent = singles ? 'Player 2' : 'Team 2 Setup';
  elements.settingT1LeftLabel.textContent = singles ? 'Player Name' : 'Left Player (L)';
  elements.settingT2LeftLabel.textContent = singles ? 'Player Name' : 'Left Player (L)';
  elements.settingT1Left.placeholder = singles ? 'Player 1' : 'Player 1 (L)';
  elements.settingT2Left.placeholder = singles ? 'Player 2' : 'Player 3 (L)';

  updateSettingsServerLabels();
}

function updateSettingsServerLabels() {
  const singles = elements.settingsForm.classList.contains('singles');
  const t1Name = (elements.settingT1Name?.value || '').trim() || 'Team 1';
  const t1L = (elements.settingT1Left?.value || '').trim() || (singles ? 'Player 1' : 'Left Player (T1)');
  const t1R = (elements.settingT1Right?.value || '').trim() || 'Right Player (T1)';

  const t2Name = (elements.settingT2Name?.value || '').trim() || 'Team 2';
  const t2L = (elements.settingT2Left?.value || '').trim() || (singles ? 'Player 2' : 'Left Player (T2)');
  const t2R = (elements.settingT2Right?.value || '').trim() || 'Right Player (T2)';

  if (elements.settingServerTeam && elements.settingServerTeam.options.length >= 2) {
    elements.settingServerTeam.options[0].textContent = `${singles ? t1L : t1Name} Serves First`;
    elements.settingServerTeam.options[1].textContent = `${singles ? t2L : t2Name} Serves First`;
  }

  const activeServerTeam = elements.settingServerTeam ? elements.settingServerTeam.value : 'T1';
  const activeL = activeServerTeam === 'T1' ? t1L : t2L;
  const activeR = activeServerTeam === 'T1' ? t1R : t2R;

  if (elements.settingServerPlayer && elements.settingServerPlayer.options.length >= 2) {
    elements.settingServerPlayer.options[0].textContent = `Left Player (${activeL})`;
    elements.settingServerPlayer.options[1].textContent = `Right Player (${activeR})`;
  }

  if (elements.settingServerT1Player && elements.settingServerT1Player.options.length >= 2) {
    elements.settingServerT1Player.options[0].textContent = `Left Player (${t1L})`;
    elements.settingServerT1Player.options[1].textContent = `Right Player (${t1R})`;
  }

  if (elements.settingServerT2Player && elements.settingServerT2Player.options.length >= 2) {
    elements.settingServerT2Player.options[0].textContent = `Left Player (${t2L})`;
    elements.settingServerT2Player.options[1].textContent = `Right Player (${t2R})`;
  }
}

function saveSettingsFromForm() {
  const newSport = elements.settingSport.value === 'tennis' ? 'tennis' : 'padel';
  const newTeamFormat = newSport === 'tennis' ? elements.settingTeamFormat.value : 'doubles';
  const typeChanged = newSport !== getSportId(currentMatch) || newTeamFormat !== (currentMatch.teamFormat || 'doubles');
  if (typeChanged && currentMatch.points.length > 0 &&
      !confirm('This match already has logged points. Change the match type anyway? Shots not available in the new type will be hidden from summaries.')) {
    return;
  }

  currentMatch.sport = newSport;
  currentMatch.teamFormat = newTeamFormat;
  const singles = isSingles(currentMatch);

  currentMatch.title = elements.settingTitle.value.trim();
  currentMatch.court = elements.settingCourt.value.trim();
  currentMatch.date = elements.settingDate.value;
  currentMatch.format = elements.settingFormat.value;
  currentMatch.scoringRule = elements.settingRule.value;
  normalizeScoringRule(currentMatch);

  if (singles) {
    // Singles: one player per side, who also names the side
    currentMatch.team1.leftPlayer = elements.settingT1Left.value.trim() || 'Player 1';
    currentMatch.team1.name = currentMatch.team1.leftPlayer;
    currentMatch.team2.leftPlayer = elements.settingT2Left.value.trim() || 'Player 2';
    currentMatch.team2.name = currentMatch.team2.leftPlayer;
  } else {
    currentMatch.team1.name = elements.settingT1Name.value.trim() || 'Team 1';
    currentMatch.team1.leftPlayer = elements.settingT1Left.value.trim() || 'Player 1 (L)';
    currentMatch.team1.rightPlayer = elements.settingT1Right.value.trim() || 'Player 2 (R)';

    currentMatch.team2.name = elements.settingT2Name.value.trim() || 'Team 2';
    currentMatch.team2.leftPlayer = elements.settingT2Left.value.trim() || 'Player 3 (L)';
    currentMatch.team2.rightPlayer = elements.settingT2Right.value.trim() || 'Player 4 (R)';
  }

  // Feature 3: Server team & player
  const sTeam = elements.settingServerTeam ? elements.settingServerTeam.value : 'T1';
  const sPlayer = elements.settingServerPlayer ? elements.settingServerPlayer.value : 'L';
  const sT1Player = elements.settingServerT1Player ? elements.settingServerT1Player.value : sPlayer;
  const sT2Player = elements.settingServerT2Player ? elements.settingServerT2Player.value : sPlayer;

  currentMatch.initialServerTeam = sTeam;
  currentMatch.initialServerPlayer = sPlayer;
  currentMatch.initialServerPlayerT1 = sT1Player;
  currentMatch.initialServerPlayerT2 = sT2Player;
  currentMatch.initialServer = sTeam;

  saveCurrentMatch(currentMatch);
  autoSaveMatchJson({ silent: true });
  applySportUI();
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
        autoSaveMatchJson({ silent: true });
        currentFilter.mode = 'all';
        applySportUI();
        updateUI();
        alert('Match successfully imported!');
        switchTab('tab-record');
      } else {
        alert('Invalid match file format.');
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
