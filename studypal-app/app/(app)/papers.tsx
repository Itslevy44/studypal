import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { PaperCardSkeleton } from '../../components/ui/Skeleton';
import { PaperCard } from '../../components/PaperCard';
import { MpesaModal } from '../../components/MpesaModal';
import { usePaperActions } from '../../hooks/usePaperActions';
import { RADIUS, SHADOW } from '../../constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

const YEARS = ['', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
type Sort = 'newest' | 'popular' | 'course';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Most downloaded' },
  { key: 'course', label: 'Course A–Z' },
];

export default function PapersScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, refreshUser } = useAuth();
  const actions = usePaperActions();

  const [papers, setPapers] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [savedOnly, setSavedOnly] = useState(false);
  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);
  const firstRun = useRef(true);

  const universityName = useCallback((id: string) =>
    id === 'all' ? 'General' : (universities.find((u) => u.id === id)?.name || id),
  [universities]);

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    try {
      const data = await api.papers.list({
        university: user?.university,
        course: debouncedQuery || undefined,
        year: year || undefined,
      });
      setPapers(data.papers || []);
    } catch {
      setPapers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.university, debouncedQuery, year]);

  useEffect(() => {
    api.universities.list().then((d) => setUniversities(d.universities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!firstRun.current) setLoading(true);
    firstRun.current = false;
    load();
  }, [load]);

  const hasAccess = (p: any) => p.cost === 0 || !!(user as any)?.hasActiveSubscription;

  const visible = useMemo(() => {
    let list = savedOnly ? papers.filter((p) => actions.isBookmarked(p.id)) : [...papers];
    list.sort((a, b) => {
      if (sort === 'popular') return (b.totalDownloads ?? 0) - (a.totalDownloads ?? 0);
      if (sort === 'course') return String(a.course).localeCompare(String(b.course));
      return new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime();
    });
    return list;
  }, [papers, savedOnly, sort, actions.isBookmarked]);

  const renderItem = ({ item }: { item: any }) => (
    <PaperCard
      paper={item}
      subtitle={item.university === 'all' ? 'General · all universities' : undefined}
      accessible={hasAccess(item)}
      bookmarked={actions.isBookmarked(item.id)}
      downloaded={actions.isDownloaded(item.id)}
      progress={actions.progressOf(item.id)}
      onDownload={actions.download}
      onUnlock={setMpesaTarget}
      onToggleBookmark={actions.toggleBookmark}
    />
  );

  const header = (
    <View>
      <Text style={styles.pageTitle}>Past Papers</Text>
      <Text style={styles.pageSub}>{universityName(user?.university ?? '')}</Text>

      <View style={[styles.searchBox, SHADOW.sm]}>
        <Ionicons name="search" size={18} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by course, e.g. MATH 101"
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        <TouchableOpacity
          style={[styles.pill, savedOnly && styles.pillSaved]}
          onPress={() => setSavedOnly((s) => !s)}
        >
          <Ionicons name={savedOnly ? 'bookmark' : 'bookmark-outline'} size={13}
            color={savedOnly ? '#fff' : colors.text.secondary} />
          <Text style={[styles.pillText, savedOnly && styles.pillTextActive]}>Saved</Text>
        </TouchableOpacity>
        {YEARS.map((y) => (
          <TouchableOpacity
            key={y || 'all'}
            style={[styles.pill, year === y && styles.pillActive]}
            onPress={() => setYear(y)}
          >
            <Text style={[styles.pillText, year === y && styles.pillTextActive]}>{y || 'All years'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.count}>{loading ? ' ' : `${visible.length} paper${visible.length === 1 ? '' : 's'}`}</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSort((s) => SORTS[(SORTS.findIndex((x) => x.key === s) + 1) % SORTS.length].key)}
        >
          <Ionicons name="swap-vertical" size={14} color={colors.primary} />
          <Text style={styles.sortText}>{SORTS.find((s) => s.key === sort)!.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={loading ? [] : visible}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View><PaperCardSkeleton /><PaperCardSkeleton /><PaperCardSkeleton /></View>
          ) : (
            <Card style={styles.empty}>
              <Ionicons name={savedOnly ? 'bookmark-outline' : 'document-text-outline'} size={44} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>{savedOnly ? 'No saved papers' : 'No papers found'}</Text>
              <Text style={styles.emptySub}>
                {savedOnly ? 'Tap the bookmark on a paper to keep it here.' : 'Try a different course or year.'}
              </Text>
            </Card>
          )
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary}
            onRefresh={() => { setRefreshing(true); load(); actions.refreshDownloaded(); }} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <MpesaModal
        visible={!!mpesaTarget}
        title="3-Month All-Access Pass"
        amount={100}
        accountReference="all_access"
        transactionDesc="StudyPal: 3-Month All-Access Pass"
        defaultPhone={(user as any)?.phone ?? ''}
        onClose={() => setMpesaTarget(null)}
        onSuccess={() => { setMpesaTarget(null); refreshUser(); }}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  list: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: c.text.primary },
  pageSub: { fontSize: 13, color: c.text.secondary, marginTop: 2, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 14, marginBottom: 14,
  },
  searchInput: { flex: 1, height: 48, fontSize: 14, fontWeight: '500', color: c.text.primary },
  pills: { gap: 8, paddingBottom: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: c.surfaceAlt,
  },
  pillActive: { backgroundColor: c.primary },
  pillSaved: { backgroundColor: c.secondary },
  pillText: { fontSize: 12, fontWeight: '700', color: c.text.secondary },
  pillTextActive: { color: '#fff' },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  count: { fontSize: 12, fontWeight: '600', color: c.text.muted },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 12, fontWeight: '700', color: c.primary },
  empty: { alignItems: 'center', padding: 36, marginTop: 8, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text.primary },
  emptySub: { fontSize: 13, color: c.text.secondary, textAlign: 'center' },
});
