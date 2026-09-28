// Definition of all Shot types based on the Bolouri Tennis & Padel Academy Sheet + Ret. Serve
export const SHOT_TYPES = [
  {
    id: 'Ret. Serve',
    short: 'Ret. Serve',
    name: 'Return of Serve',
    category: 'Return',
    badgeClass: 'badge-return',
    icon: '↩️',
    description: 'Direct return of the opponent service'
  },
  {
    id: 'Serve',
    short: 'Serve',
    name: 'Serve / Ace',
    category: 'Serve',
    badgeClass: 'badge-serve',
    icon: '⚡',
    description: 'Service ace, service winner or fault'
  },
  {
    id: 'Smash',
    short: 'Smash',
    name: 'Smash (Remate)',
    category: 'Overhead',
    badgeClass: 'badge-smash',
    icon: '💥',
    description: 'Aggressive overhead power smash (x3, x4, flat)'
  },
  {
    id: 'F.H',
    short: 'F.H',
    name: 'Forehand',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🎾',
    description: 'Forehand baseline drive or stroke'
  },
  {
    id: 'B.H',
    short: 'B.H',
    name: 'Backhand',
    category: 'Groundstroke',
    badgeClass: 'badge-ground',
    icon: '🎾',
    description: 'Backhand baseline drive or stroke'
  },
  {
    id: 'FVol',
    short: 'FVol',
    name: 'Forehand Volley',
    category: 'Volley',
    badgeClass: 'badge-volley',
    icon: '🛡️',
    description: 'Forehand volley at the net'
  },
  {
    id: 'BVol',
    short: 'BVol',
    name: 'Backhand Volley',
    category: 'Volley',
    badgeClass: 'badge-volley',
    icon: '🛡️',
    description: 'Backhand volley at the net'
  },
  {
    id: 'Band',
    short: 'Band',
    name: 'Bandeja',
    category: 'Tactical Overhead',
    badgeClass: 'badge-bandeja',
    icon: '📐',
    description: 'Control slice overhead to keep the net'
  },
  {
    id: 'Baj',
    short: 'Baj',
    name: 'Bajada',
    category: 'Wall Shot',
    badgeClass: 'badge-wall',
    icon: '🧱',
    description: 'Aggressive attacking ball coming off the back wall'
  },
  {
    id: 'Vib',
    short: 'Vib',
    name: 'Vibora',
    category: 'Tactical Overhead',
    badgeClass: 'badge-vibora',
    icon: '🐍',
    description: 'Aggressive sidespin overhead aimed low into glass'
  },
  {
    id: 'Lob',
    short: 'Lob',
    name: 'Lob (Globo)',
    category: 'Defense',
    badgeClass: 'badge-defense',
    icon: '🏹',
    description: 'High defensive lob over the net players'
  },
  {
    id: 'Drop',
    short: 'Drop',
    name: 'Dropshot (Dejada)',
    category: 'Finesse',
    badgeClass: 'badge-finesse',
    icon: '🪶',
    description: 'Soft touch shot landing short near the net'
  },
  {
    id: 'Chiq.',
    short: 'Chiq.',
    name: 'Chiquita',
    category: 'Tactical Transition',
    badgeClass: 'badge-chiquita',
    icon: '🎯',
    description: 'Soft dip shot aimed at the feet of net players'
  }
];

export const SHOT_CATEGORIES = [
  'All',
  'Overhead',
  'Volley',
  'Groundstroke',
  'Return',
  'Serve',
  'Tactical Overhead',
  'Wall Shot',
  'Defense',
  'Finesse',
  'Tactical Transition'
];
