import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS, SHADOW } from '../../constants';
import { useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, style, elevated }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, elevated && SHADOW.md, style]}>
      {children}
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
});
