export const Colors = {
  bg: '#f7f0eb',
  bg2: '#e8ddd5',
  bg3: '#fdfaf8',
  ink: '#6b5a50',
  ink2: '#9a8a80',
  ink3: '#b8a89e',
  ink4: '#d4c8c0',
  acc: '#8a7060',

  // Habit swatches
  dustyRose: '#c4b0a8',
  sage: '#b0baa8',
  slate: '#a8b4c0',
  mauve: '#c0b0c0',
  warmSand: '#c0baa8',
  seafoam: '#a8c0b8',
  lavender: '#b8b0c0',
};

export const HabitSwatches = [
  Colors.dustyRose,
  Colors.sage,
  Colors.slate,
  Colors.mauve,
  Colors.warmSand,
  Colors.seafoam,
  Colors.lavender,
];

export const Typography = {
  serif: 'Georgia, serif' as const,
  navLabel: {
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: Colors.ink2,
  },
  sectionLabel: {
    fontFamily: 'Georgia',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: Colors.ink3,
  },
  body: {
    fontFamily: 'Georgia',
    fontSize: 14,
    color: Colors.ink,
  },
  bodySmall: {
    fontFamily: 'Georgia',
    fontSize: 13,
    color: Colors.ink,
  },
};
