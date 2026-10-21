// Sport configuration (Padel / Tennis): shots, scoring rules, labels & player format
import { SHOT_TYPES } from './shotTypes.js';

export const SPORTS = {
  padel: {
    id: 'padel',
    name: 'Padel',
    brand: 'PadelScore',
    defaultRule: 'goldenPoint',
    // Deuce / 40-40 rules available for this sport, in dropdown order
    rules: [
      { id: 'goldenPoint', label: 'Punto de Oro', option: 'Punto de Oro (Golden Point)' },
      { id: 'advantage', label: 'Advantage (Ad)', option: 'Traditional Advantage (Ad)' },
      { id: 'starPoint', label: 'Star Point', option: 'Star Point (FIP 2026: 2 advantages, then deciding point)' }
    ],
    overheadShots: ['Smash', 'Band', 'Vib'],
    overheadLabel: 'Smash / Band / Vib',
    overheadInsight: 'Smashes, Bandejas & Viboras',
    quickNotes: [
      { note: 'Net cord', label: 'Net cord' },
      { note: 'Out wide', label: 'Out wide' },
      { note: 'Glass out', label: 'Glass out' },
      { note: 'Break Point', label: 'Break Point' },
      { note: 'Golden Point', label: 'Punto de Oro' },
      { note: 'Unforced', label: 'Unforced' }
    ],
    notePlaceholder: 'Point note (e.g. net cord, out wide, break pt)...',
    // Distinct shot types (excluding Serve) needed for D+, C- and C/C+
    rankThresholds: { dPlus: 6, cMinus: 9, c: 11 }
  },
  tennis: {
    id: 'tennis',
    name: 'Tennis',
    brand: 'TennisScore',
    defaultRule: 'advantage',
    rules: [
      { id: 'advantage', label: 'Advantage (Ad)', option: 'Traditional Advantage (Ad)' },
      { id: 'goldenPoint', label: 'No-Ad', option: 'No-Ad (Deciding point at deuce)' }
    ],
    overheadShots: ['Smash'],
    overheadLabel: 'Smash',
    overheadInsight: 'Smashes',
    quickNotes: [
      { note: 'Net cord', label: 'Net cord' },
      { note: 'Out wide', label: 'Out wide' },
      { note: 'Long', label: 'Long' },
      { note: 'Break Point', label: 'Break Point' },
      { note: 'Double Fault', label: 'Double Fault' },
      { note: 'Unforced', label: 'Unforced' }
    ],
    notePlaceholder: 'Point note (e.g. net cord, long, break pt)...',
    // Distinct shot types (excluding serves) needed for D+, C- and C/C+
    rankThresholds: { dPlus: 6, cMinus: 9, c: 11 }
  }
};

export function getSportId(match) {
  return match && match.sport === 'tennis' ? 'tennis' : 'padel';
}

export function getSport(match) {
  return SPORTS[getSportId(match)];
}

// Singles is only offered for tennis; padel is always doubles
export function isSingles(match) {
  return getSportId(match) === 'tennis' && match.teamFormat === 'singles';
}

// Shots offered for the match's sport. Unless `sportOnly`, shots of the other sport
// already recorded in this match (e.g. after switching match type) are kept so their stats still show.
export function getShotTypes(match, { sportOnly = false } = {}) {
  const sport = getSportId(match);
  const used = sportOnly ? new Set() : new Set(((match && match.points) || []).map(p => p.shot));
  return SHOT_TYPES
    .filter(s => s.sports.includes(sport) || used.has(s.id))
    .map(s => (sport === 'tennis' && s.tennisName ? { ...s, name: s.tennisName } : s));
}

// Category pills for the record pad (current sport's shots only)
export function getShotCategories(match) {
  const cats = [];
  getShotTypes(match, { sportOnly: true }).forEach(s => {
    if (!cats.includes(s.category)) cats.push(s.category);
  });
  return ['All', ...cats];
}

// Shot key legend, e.g. "Ret. Serve = Return of Serve • F.H = Forehand • ..."
export function getShotKeyText(match) {
  return getShotTypes(match)
    .filter(s => s.id !== 'Serve')
    .map(s => `${s.short} = ${s.name}`)
    .join(' • ');
}

// Player keys used in stats ('T1-L', ...): one per side in singles, two in doubles
export function getPlayerKeys(match) {
  return isSingles(match) ? ['T1-L', 'T2-L'] : ['T1-L', 'T1-R', 'T2-L', 'T2-R'];
}

// Make the deuce rule valid for the match's sport (e.g. Star Point is padel-only)
export function normalizeScoringRule(match) {
  const sport = getSport(match);
  if (!sport.rules.some(r => r.id === match.scoringRule)) {
    match.scoringRule = sport.defaultRule;
  }
  return match.scoringRule;
}

export function getMatchTypeLabel(match) {
  const sport = getSport(match);
  if (sport.id === 'tennis') return `Tennis ${isSingles(match) ? 'Singles' : 'Doubles'}`;
  return 'Padel';
}

// Team summary text, e.g. "Team 1 (L: A, R: B)" or just "A" in singles
export function getTeamPlayersText(match, team) {
  if (isSingles(match)) return team.leftPlayer || team.name;
  return `${team.name} (L: ${team.leftPlayer || 'L'}, R: ${team.rightPlayer || 'R'})`;
}
