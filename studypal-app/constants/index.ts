// ── App metadata ──────────────────────────────────────────────────────────────
// Bump APP_VERSION and APP_VERSION_CODE with every release.
// The update checker compares APP_VERSION_CODE against the server's latest.
export const APP_VERSION = '1.3.2';
export const APP_VERSION_CODE = 6;

// ── Expo project ──────────────────────────────────────────────────────────────
export const EXPO_PROJECT_ID = '3e16ba97-2ec3-4aae-8e70-edd841d588b1';
export const EXPO_OWNER = 'kiprotichlevy';

// ── Backend ───────────────────────────────────────────────────────────────────
// Point this at your deployed Next.js URL. Never end with a slash.
export const API_BASE_URL = 'https://studypal-rust.vercel.app';

// Endpoint the app polls to check for a newer APK
export const UPDATE_CHECK_URL = `${API_BASE_URL}/api/app/version`;

// ── Design tokens ─────────────────────────────────────────────────────────────
export const COLORS = {
  primary: '#4f46e5',      // indigo-600
  primaryLight: '#818cf8', // indigo-400
  secondary: '#d946ef',    // fuchsia-500
  accent: '#06b6d4',       // cyan-500
  success: '#10b981',      // emerald-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
  dark: '#020617',         // slate-950
  surface: '#ffffff',
  background: '#f8fafc',   // slate-50
  border: '#e2e8f0',       // slate-200
  text: {
    primary: '#0f172a',    // slate-900
    secondary: '#64748b',  // slate-500
    muted: '#94a3b8',      // slate-400
    inverse: '#ffffff',
  },
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  black: 'System',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
};
