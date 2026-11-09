// Theme palettes. Brand colours stay constant; surfaces and tints adapt to light/dark.
export interface Palette {
  isDark: boolean;
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  dark: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  inputBorder: string;
  text: { primary: string; secondary: string; muted: string; inverse: string };
  // soft tints (badges, banners)
  primarySoft: string;
  successSoft: string;
  successText: string;
  premiumSoft: string;
  premiumText: string;
  errorSoft: string;
  errorBorder: string;
  warnSoft: string;
  warnBorder: string;
  orangeSoft: string;
  orangeBorder: string;
  infoSoft: string;
  overlay: string;
  shadow: string;
}

export const LIGHT: Palette = {
  isDark: false,
  primary: '#4f46e5',
  primaryLight: '#818cf8',
  secondary: '#d946ef',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dark: '#020617',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#eef2f7',
  border: '#e2e8f0',
  inputBorder: '#c7d2fe',
  text: { primary: '#0f172a', secondary: '#64748b', muted: '#94a3b8', inverse: '#ffffff' },
  primarySoft: '#e0e7ff',
  successSoft: '#d1fae5',
  successText: '#059669',
  premiumSoft: '#ede9fe',
  premiumText: '#7c3aed',
  errorSoft: '#fef2f2',
  errorBorder: '#fecaca',
  warnSoft: '#fffbeb',
  warnBorder: '#fde68a',
  orangeSoft: '#fff7ed',
  orangeBorder: '#fed7aa',
  infoSoft: '#eff6ff',
  overlay: 'rgba(2,6,23,0.55)',
  shadow: '#4f46e5',
};

export const DARK: Palette = {
  isDark: true,
  primary: '#6366f1',
  primaryLight: '#a5b4fc',
  secondary: '#e879f9',
  accent: '#22d3ee',
  success: '#10b981',
  warning: '#fbbf24',
  error: '#f87171',
  dark: '#020617',
  background: '#0b1120',
  surface: '#131c31',
  surfaceAlt: '#1c2842',
  border: '#26334f',
  inputBorder: '#34447a',
  text: { primary: '#f1f5f9', secondary: '#9aa8c0', muted: '#6b7a96', inverse: '#ffffff' },
  primarySoft: '#26285e',
  successSoft: '#0f2e25',
  successText: '#34d399',
  premiumSoft: '#2b2150',
  premiumText: '#a78bfa',
  errorSoft: '#3a1519',
  errorBorder: '#6b2128',
  warnSoft: '#3a2c0c',
  warnBorder: '#6b5214',
  orangeSoft: '#3a200d',
  orangeBorder: '#6b3a14',
  infoSoft: '#112544',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
};
