export const THEME_MODES = {
  DARK: 'Sombre',
  LIGHT: 'Clair',
  SYSTEM: 'Système',
};

export const THEME_KEYS = ['Sombre', 'Clair', 'Système'];

export const ACCENT_COLORS = [
  '#3b82f6', '#9b59b6', '#2ecc71', '#ed4c67',
  '#f39c12', '#00d2d3', '#f78fb3', '#2c3e50',
  '#4a5568', '#718096', '#a0aec0', '#1a365d',
  '#2b6cb0', '#4eb3a2', '#81e6d9', '#dd6b20',
  '#e53e3e', '#b7791f', '#d69e2e', '#6b46c1',
];

export const DEFAULT_ACCENT = '#3b82f6';

export function resolveIsDark(theme, systemScheme) {
  return theme === THEME_MODES.DARK || (theme === THEME_MODES.SYSTEM && systemScheme === 'dark');
}
