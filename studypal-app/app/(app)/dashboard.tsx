import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { storage } from '../../lib/storage';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { GradientButton } from '../../components/ui/GradientButton';
import { MpesaModal } from '../../components/MpesaModal';
import { COLORS, RADIUS, SHADOW } from '../../constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

export default function DashboardScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [paperCount, setPaperCount] = useState(0);
  const [freePaperCount, setFreePaperCount] = useState(0);
  const [universityName, setUniversityName] = useState('');

  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      await refreshUser();
      const [papersData, univData] = await Promise.all([
        api.papers.list({ university: user?.university }),
        api.universities.list(),
      ]);
      const all: any[] = papersData.papers || [];
      setPapers(all.slice(0, 6));
      setPaperCount(all.length);
      setFreePaperCount(all.filter((p) => p.cost === 0).length);
      const found = (univData.universities || []).find((u: any) => u.id === user?.university);
      setUniversityName(found?.name || user?.university || '');
    } catch {
      // Show stale data silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.university]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const hasAccess = (paper: any) => paper.cost === 0 || !!(user as any)?.hasActiveSubscription;

  const handleDownload = async (paper: any) => {
    setDownloadingId(paper.id);
    try {
      const token = await storage.getToken();
      const url = api.papers.downloadUrl(paper.id);
      const dest = `${FileSystem.documentDirectory}${paper.id}.pdf`;
      const result = await FileSystem.downloadAsync(url, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (result.status === 200) {
        // Save metadata so the offline screen shows the correct name
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

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your portal…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Welcome Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <Text style={styles.bannerLabel}>Welcome back</Text>
            <Text style={styles.bannerName}>{user?.fullName?.split(' ')[0]} 👋</Text>
            <Text style={styles.bannerSub}>
              Materials from <Text style={{ color: '#fff', fontWeight: '700' }}>{universityName}</Text>
            </Text>
          </View>
          <View style={styles.yearBox}>
            <Text style={styles.yearLabel}>Year</Text>
            <Text style={styles.yearValue}>{user?.yearOfStudy?.replace('Year ', '') ?? '—'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={styles.statLabel}>Total Papers</Text>
            <Text style={styles.statValue}>{paperCount}</Text>
          </View>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={styles.statLabel}>Free Papers</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{freePaperCount}</Text>
          </View>
        </View>

        {/* Recent Papers header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Papers</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/papers')}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {papers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No Papers Yet</Text>
            <Text style={styles.emptyText}>No papers are available for your university yet.</Text>
          </Card>
        ) : (
          papers.map((paper) => {
            const free = paper.cost === 0;
            const accessible = hasAccess(paper);
            const isDl = downloadingId === paper.id;
            return (
              <Card key={paper.id} style={styles.paperCard} elevated>
                <View style={styles.paperTop}>
                  <Badge label={paper.course} />
                  {free
                    ? <Badge label="FREE" color="#059669" bg="#d1fae5" />
                    : <Badge label={`KES ${paper.cost}`} color="#7c3aed" bg="#ede9fe" />}
                </View>
                <Text style={styles.paperTitle} numberOfLines={2}>{paper.title}</Text>
                <Text style={styles.paperMeta}>{paper.examPeriod} • {paper.yearOfStudy}</Text>

                {accessible ? (
                  <GradientButton
                    label={isDl ? 'Downloading…' : free ? 'Download Free' : 'Download'}
                    variant="success"
                    loading={isDl}
                    onPress={() => handleDownload(paper)}
                    small
                    style={styles.paperBtn}
                  />
                ) : (
                  <GradientButton
                    label="Unlock All — KES 100"
                    onPress={() => setMpesaTarget(paper)}
                    small
                    style={styles.paperBtn}
                  />
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* M-Pesa Modal */}
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
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.text.secondary, fontSize: 14 },
  // Banner
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xxl,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOW.lg,
  },
  bannerText: { flex: 1 },
  bannerLabel: { color: '#a5b4fc', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bannerName: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  bannerSub: { color: '#a5b4fc', fontSize: 13 },
  yearBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    minWidth: 64,
  },
  yearLabel: { color: '#a5b4fc', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  yearValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, padding: 18,
  },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: COLORS.text.muted, marginBottom: 8 },
  statValue: { fontSize: 36, fontWeight: '900', color: COLORS.text.primary },
  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  viewAll: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Paper card
  paperCard: { marginBottom: 12, padding: 18 },
  paperTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paperTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  paperMeta: { fontSize: 12, color: COLORS.text.muted, marginBottom: 14 },
  paperBtn: { width: '100%' },
  // Empty
  emptyCard: { alignItems: 'center', padding: 36 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  emptyText: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center' },
});
