import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT, Palette } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'sp_theme_mode';

interface ThemeCtx {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({ colors: LIGHT, isDark: false, mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    }).catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const value = useMemo(
    () => ({ colors: isDark ? DARK : LIGHT, isDark, mode, setMode }),
    [isDark, mode, setMode]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** Build a StyleSheet from the current palette; recomputed only when the theme changes. */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors]);
}
