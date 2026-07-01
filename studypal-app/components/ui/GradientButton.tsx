import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../../constants';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger' | 'ghost';
  style?: ViewStyle;
  small?: boolean;
}

const VARIANTS = {
  primary: { bg: COLORS.primary, text: '#fff' },
  success: { bg: COLORS.success, text: '#fff' },
  danger: { bg: COLORS.error, text: '#fff' },
  ghost: { bg: '#f1f5f9', text: COLORS.text.primary },
};

export function GradientButton({
  label, onPress, loading, disabled, variant = 'primary', style, small,
}: Props) {
  const { bg, text } = VARIANTS[variant];
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

const styles = StyleSheet.create({
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
