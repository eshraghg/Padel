// Definition of all Shot types based on the Bolouri Tennis & Padel Academy Sheet + Ret. Serve
// `sports` lists which match types (see sports.js) offer the shot; `tennisName` overrides the name in tennis
const ALL_SPORTS = ['padel', 'tennis'];
const PADEL_ONLY = ['padel'];

export const SHOT_TYPES = [
  {
    id: 'Ret. Serve',
    sports: ALL_SPORTS,
    short: 'Ret. Serve',
    name: 'Return of Serve',
    category: 'Return',
    badgeClass: 'badge-return',
    icon: '↩️',
    description: 'Direct return of the opponent service'
  },
  {
    id: 'Serve',
    sports: ALL_SPORTS,
    short: 'Serve',
    name: 'Serve / Ace',
    category: 'Serve',
    badgeClass: 'badge-serve',
    icon: '⚡',
    description: 'Service ace, service winner or fault'
  },
  {
    id: 'Smash',
    sports: ALL_SPORTS,
    short: 'Smash',
    name: 'Smash (Remate)',
    tennisName: 'Smash',
    category: 'Overhead',
    badgeClass: 'badge-smash',
    icon: '💥',
    description: 'Aggressive overhead power smash (x3, x4, flat)'
  },
  {
    id: 'F.H',
    sports: ALL_SPORTS,
    short: 'F.H',
    name: 'Forehand',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🎾',
    description: 'Forehand baseline drive or stroke'
  },
  {
    id: 'B.H',
    sports: ALL_SPORTS,
    short: 'B.H',
    name: 'Backhand',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🎾',
    description: 'Backhand baseline drive or stroke'
  },
  {
    id: 'FSlice',
    sports: ALL_SPORTS,
    short: 'FSlice',
    name: 'Forehand Slice',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🔪',
    description: 'Forehand underspin slice that stays low'
  },
  {
    id: 'BSlice',
    sports: ALL_SPORTS,
    short: 'BSlice',
    name: 'Backhand Slice',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🔪',
    description: 'Backhand underspin slice that stays low'
  },
  {
    id: 'FVol',
    sports: ALL_SPORTS,
    short: 'FVol',
    name: 'Forehand Volley',
    category: 'Volley',
    badgeClass: 'badge-volley',
    icon: '🛡️',
    description: 'Forehand volley at the net'
  },
  {
    id: 'BVol',
    sports: ALL_SPORTS,
    short: 'BVol',
    name: 'Backhand Volley',
    category: 'Volley',
    badgeClass: 'badge-volley',
    icon: '🛡️',
    description: 'Backhand volley at the net'
  },
  {
    id: 'Band',
    sports: PADEL_ONLY,
    short: 'Band',
    name: 'Bandeja',
    category: 'Tactical Overhead',
    badgeClass: 'badge-bandeja',
    icon: '📐',
    description: 'Control slice overhead to keep the net'
  },
  {
    id: 'Baj',
    sports: PADEL_ONLY,
    short: 'Baj',
    name: 'Bajada',
    category: 'Wall Shot',
    badgeClass: 'badge-wall',
    icon: '🧱',
    description: 'Aggressive attacking ball coming off the back wall'
  },
  {
    id: 'Vib',
    sports: PADEL_ONLY,
    short: 'Vib',
    name: 'Vibora',
    category: 'Tactical Overhead',
    badgeClass: 'badge-vibora',
    icon: '🐍',
    description: 'Aggressive sidespin overhead aimed low into glass'
  },
  {
    id: 'Lob',
    sports: ALL_SPORTS,
    short: 'Lob',
    name: 'Lob (Globo)',
    tennisName: 'Lob',
    category: 'Defense',
    badgeClass: 'badge-defense',
    icon: '🏹',
    description: 'High defensive lob over the net players'
  },
  {
    id: 'Drop',
    sports: ALL_SPORTS,
    short: 'Drop',
    name: 'Dropshot (Dejada)',
    tennisName: 'Dropshot',
    category: 'Finesse',
    badgeClass: 'badge-finesse',
    icon: '🪶',
    description: 'Soft touch shot landing short near the net'
  },
  {
    id: 'Chiq.',
    sports: PADEL_ONLY,
    short: 'Chiq.',
    name: 'Chiquita',
    category: 'Tactical Transition',
    badgeClass: 'badge-chiquita',
    icon: '🎯',
    description: 'Soft dip shot aimed at the feet of net players'
  },
  {
    id: 'Rulo',
    sports: PADEL_ONLY,
    short: 'Rulo',
    name: 'Rulo',
    category: 'Tactical Overhead',
    badgeClass: 'badge-smash',
    icon: '🌀',
    description: 'Topspin overhead that kicks high off the floor'
  },
  {
    id: 'C.Pared',
    sports: PADEL_ONLY,
    short: 'C.Pared',
    name: 'Contra Pared',
    category: 'Wall Shot',
    badgeClass: 'badge-wall',
    icon: '🔙',
    description: 'Ball hit into own back wall to send it over the net'
  },
  {
    id: 'Gancho',
    sports: PADEL_ONLY,
    short: 'Gancho',
    name: 'Gancho',
    category: 'Tactical Overhead',
    badgeClass: 'badge-vibora',
    icon: '🪝',
    description: 'Hooked overhead with side spin, angled across the court'
  }
];
