import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { RADIUS } from '../../constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

export function Skeleton({ width = '100%', height = 14, style }: {
  width?: DimensionValue; height?: number; style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: 6, backgroundColor: colors.border, opacity: pulse }, style]} />;
}

export function PaperCardSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={80} height={22} style={{ borderRadius: RADIUS.full }} />
        <Skeleton width={48} height={22} style={{ borderRadius: RADIUS.full }} />
      </View>
      <Skeleton width="85%" height={16} style={{ marginTop: 14 }} />
      <Skeleton width="60%" height={12} style={{ marginTop: 10 }} />
      <Skeleton height={40} style={{ marginTop: 16, borderRadius: RADIUS.lg }} />
    </View>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  card: {
    backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: c.border, padding: 18, marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
