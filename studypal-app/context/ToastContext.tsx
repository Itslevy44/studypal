import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW } from '../constants';

type Kind = 'success' | 'error' | 'info';
interface ToastCtx { show: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(Ctx);

const ICONS: Record<Kind, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};
const TINT: Record<Kind, string> = {
  success: COLORS.success,
  error: COLORS.error,
  info: COLORS.primaryLight,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: Kind = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 2800);
  }, [opacity]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { top: insets.top + 8, opacity }]}
        >
          <View style={[styles.toast, SHADOW.lg]}>
            <Ionicons name={ICONS[toast.kind]} size={20} color={TINT[toast.kind]} />
            <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.dark, borderRadius: RADIUS.lg,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
});
