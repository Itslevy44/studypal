import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS, SHADOW } from '../../constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
  style?: ViewStyle;
  small?: boolean;
}

const variantsFor = (colors: Palette) => ({
  primary: { bg: colors.primary, text: '#fff' },
  success: { bg: colors.success, text: '#fff' },
  danger: { bg: colors.error, text: '#fff' },
  ghost: { bg: colors.surfaceAlt, text: colors.text.primary },
});

export function GradientButton({
  label, onPress, loading, disabled, variant = 'primary', style, small,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { bg, text } = variantsFor(colors)[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        { backgroundColor: bg },
        small && styles.small,
        (disabled || loading) && styles.disabled,
        SHADOW.md,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={[styles.label, { color: text }, small && styles.smallLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  base: {
    height: 52,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  small: { height: 40, paddingHorizontal: 16, borderRadius: RADIUS.lg },
  disabled: { opacity: 0.55 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  smallLabel: { fontSize: 13 },
});
