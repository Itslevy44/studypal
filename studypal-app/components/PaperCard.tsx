import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { GradientButton } from './ui/GradientButton';
import { RADIUS } from '../constants';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { Palette } from '../constants/theme';

interface Props {
  paper: any;
  subtitle?: string;
  accessible: boolean;
  bookmarked: boolean;
  downloaded: boolean;
  /** 0..1 while downloading, null otherwise */
  progress: number | null;
  onDownload: (paper: any) => void;
  onUnlock: (paper: any) => void;
  onToggleBookmark: (paper: any) => void;
}

function PaperCardBase({
  paper, subtitle, accessible, bookmarked, downloaded, progress,
  onDownload, onUnlock, onToggleBookmark,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const free = paper.cost === 0;
  const downloading = progress !== null;
  const pct = downloading ? Math.round((progress ?? 0) * 100) : 0;

  return (
    <Card style={styles.card} elevated>
      <View style={styles.top}>
        <View style={styles.badges}>
          <Badge label={paper.course} />
          {free
            ? <Badge label="FREE" color={colors.successText} bg={colors.successSoft} />
            : <Badge label="PREMIUM" color={colors.premiumText} bg={colors.premiumSoft} />}
        </View>
        <TouchableOpacity
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark paper'}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onToggleBookmark(paper);
          }}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? colors.primary : colors.text.muted}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.title} numberOfLines={2}>{paper.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {subtitle ? `${subtitle} · ` : ''}{paper.examPeriod} · {paper.yearOfStudy}
      </Text>

      <View style={styles.stats}>
        <Ionicons name="document-outline" size={13} color={colors.text.muted} />
        <Text style={styles.statText}>{paper.fileSize}</Text>
        <Ionicons name="download-outline" size={13} color={colors.text.muted} style={{ marginLeft: 10 }} />
        <Text style={styles.statText}>{paper.totalDownloads ?? 0}</Text>
        {downloaded && (
          <View style={styles.savedChip}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.savedText}>Saved offline</Text>
          </View>
        )}
      </View>

      {downloading ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(pct, 4)}%` }]} />
          </View>
          <Text style={styles.progressText}>Downloading… {pct}%</Text>
        </View>
      ) : accessible ? (
        <GradientButton
          label={downloaded ? 'Download again' : free ? 'Download free' : 'Download'}
          variant={downloaded ? 'ghost' : 'success'}
          onPress={() => onDownload(paper)}
          small
        />
      ) : (
        <GradientButton label="Unlock all papers · KES 100" onPress={() => onUnlock(paper)} small />
      )}
    </Card>
  );
}

export const PaperCard = memo(PaperCardBase);

const createStyles = (c: Palette) => StyleSheet.create({
  card: { marginBottom: 14, padding: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: c.text.primary, marginBottom: 4 },
  meta: { fontSize: 12, color: c.text.secondary, marginBottom: 10 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  statText: { fontSize: 11, color: c.text.muted, fontWeight: '600' },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    backgroundColor: c.successSoft, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  savedText: { fontSize: 11, fontWeight: '700', color: c.successText },
  progressWrap: { gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  progressText: { fontSize: 12, fontWeight: '600', color: c.text.secondary, textAlign: 'center' },
});
