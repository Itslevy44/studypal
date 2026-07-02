import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { storage } from '../../lib/storage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { GradientButton } from '../../components/ui/GradientButton';
import { MpesaModal } from '../../components/MpesaModal';
import { COLORS, RADIUS, SHADOW } from '../../constants';
import * as FileSystem from 'expo-file-system';

const YEARS = ['', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];

export default function PapersScreen() {
  const { user, refreshUser } = useAuth();
  const [papers, setPapers] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCourse, setSearchCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const universityName = (id: string) =>
    universities.find((u) => u.id === id)?.name || id;

  const loadPapers = useCallback(async (course = searchCourse, year = selectedYear) => {
    try {
      const data = await api.papers.list({
        university: user?.university,
        course: course || undefined,
        year: year || undefined,
      });
      setPapers(data.papers || []);
    } catch {
      setPapers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.university, searchCourse, selectedYear]);

  useEffect(() => {
    api.universities.list().then((d) => setUniversities(d.universities || [])).catch(() => {});
    loadPapers();
  }, []);

  const onRefresh = () => { setRefreshing(true); loadPapers(); };

  const hasAccess = (p: any) => p.cost === 0 || !!(user as any)?.hasActiveSubscription;

  const handleDownload = async (paper: any) => {
    setDownloadingId(paper.id);
    try {
      const token = await storage.getToken();
      const dest = `${FileSystem.documentDirectory}${paper.id}.pdf`;
      const result = await FileSystem.downloadAsync(
        api.papers.downloadUrl(paper.id), dest,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (result.status === 200) {
        // Save metadata alongside the PDF so the downloads screen can show proper names
        const meta = {
          id: paper.id,
          title: paper.title || paper.course,
          course: paper.course,
          examPeriod: paper.examPeriod || '',
          yearOfStudy: paper.yearOfStudy || '',
          savedAt: new Date().toISOString(),
        };
        await FileSystem.writeAsStringAsync(
          `${FileSystem.documentDirectory}${paper.id}.meta.json`,
          JSON.stringify(meta)
        );
        Alert.alert('Downloaded!', `"${paper.title || paper.course}" saved to your device.`);
      } else {
        Alert.alert('Error', 'Failed to download paper.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Browse Past Papers</Text>
        <Text style={styles.pageSub}>{universityName(user?.university ?? '')}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by course, e.g. MATH 101"
          placeholderTextColor={COLORS.text.muted}
          value={searchCourse}
          onChangeText={setSearchCourse}
          onSubmitEditing={() => loadPapers(searchCourse, selectedYear)}
          returnKeyType="search"
        />
        {searchCourse ? (
          <TouchableOpacity onPress={() => { setSearchCourse(''); loadPapers('', selectedYear); }}>
            <Text style={{ color: COLORS.text.muted, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Year filter pills */}
      <View style={styles.pills}>
        {YEARS.map((y) => (
          <TouchableOpacity
            key={y || 'all'}
            style={[styles.pill, selectedYear === y && styles.pillActive]}
            onPress={() => { setSelectedYear(y); loadPapers(searchCourse, y); }}
          >
            <Text style={[styles.pillText, selectedYear === y && styles.pillTextActive]}>
              {y || 'All Years'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderItem = ({ item: paper }: { item: any }) => {
    const free = paper.cost === 0;
    const accessible = hasAccess(paper);
    const isDl = downloadingId === paper.id;
    return (
      <Card style={styles.card} elevated>
        <View style={styles.cardTop}>
          <Badge label={paper.course} />
          {free
            ? <Badge label="FREE" color="#059669" bg="#d1fae5" />
            : <Badge label="Subscription" color="#7c3aed" bg="#ede9fe" />}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{paper.title}</Text>
        <Text style={styles.cardMeta}>
          {universityName(paper.university)} • {paper.examPeriod} • {paper.yearOfStudy}
        </Text>
        <View style={styles.cardMeta2}>
          <Text style={styles.metaSmall}>{paper.fileSize}</Text>
          <Text style={styles.metaSmall}>•</Text>
          <Text style={styles.metaSmall}>{paper.totalDownloads} downloads</Text>
        </View>
        {accessible ? (
          <GradientButton
            label={isDl ? 'Downloading…' : free ? 'Download Free' : 'Download'}
            variant="success"
            loading={isDl}
            onPress={() => handleDownload(paper)}
            small style={styles.cardBtn}
          />
        ) : (
          <GradientButton
            label="Unlock All Papers — KES 100 / 3 months"
            onPress={() => setMpesaTarget(paper)}
            small style={styles.cardBtn}
          />
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No Papers Found</Text>
              <Text style={styles.emptySub}>Try changing your filters or search term.</Text>
            </Card>
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text.primary },
  pageSub: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    borderWidth: 2, borderColor: '#c7d2fe',
    paddingHorizontal: 14, marginBottom: 14, ...SHADOW.sm,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 14, fontWeight: '500', color: COLORS.text.primary },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: '#f1f5f9',
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  pillTextActive: { color: '#fff' },
  card: { marginBottom: 14, padding: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  cardMeta: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 4 },
  cardMeta2: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  metaSmall: { fontSize: 11, color: COLORS.text.muted },
  cardBtn: { width: '100%' },
  emptyCard: { alignItems: 'center', padding: 36, marginTop: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center' },
});
