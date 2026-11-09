import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { PaperCardSkeleton } from '../../components/ui/Skeleton';
import { PaperCard } from '../../components/PaperCard';
import { usePaperActions } from '../../hooks/usePaperActions';
import { scheduleSubscriptionReminder } from '../../lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { MpesaModal } from '../../components/MpesaModal';
import { RADIUS, SHADOW } from '../../constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [paperCount, setPaperCount] = useState(0);
  const [freePaperCount, setFreePaperCount] = useState(0);
  const [universityName, setUniversityName] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ expiryDate: string; isTrial: boolean } | null>(null);

  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);
  const actions = usePaperActions();

  // Refresh user once on mount only — not inside loadData to avoid re-render loop
  useEffect(() => { refreshUser(); }, []);

  const loadData = useCallback(async () => {
    try {
      const [papersData, univData, subsData] = await Promise.all([
        api.papers.list({ university: user?.university }),
        api.universities.list(),
        api.subscriptions.active(),
      ]);
      const all: any[] = papersData.papers || [];
      setPapers(all.slice(0, 6));
      setPaperCount(all.length);
      setFreePaperCount(all.filter((p) => p.cost === 0).length);
      const found = (univData.universities || []).find((u: any) => u.id === user?.university);
      setUniversityName(found?.name || user?.university || '');
      // Subscription expiry info
      if (subsData?.subscription) {
        setSubscriptionInfo({
          expiryDate: subsData.subscription.expiryDate,
          isTrial: subsData.subscription.isTrial || false,
        });
        scheduleSubscriptionReminder(subsData.subscription.expiryDate, !!subsData.subscription.isTrial);
      }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.scroll}>
          <View style={[styles.banner, { opacity: 0.6, height: 118 }]} />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Welcome Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <Text style={styles.bannerLabel}>{greeting()}</Text>
            <Text style={styles.bannerName}>{user?.fullName?.split(' ')[0]}</Text>
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
            <Text style={[styles.statValue, { color: colors.success }]}>{freePaperCount}</Text>
          </View>
        </View>

        {/* Study tools shortcuts */}
        <View style={styles.toolsRow}>
          {([
            ['timer', 'timer-outline', 'Focus timer'],
            ['exams', 'calendar-outline', 'Exam countdown'],
            ['gpa', 'calculator-outline', 'GPA calc'],
          ] as const).map(([tab, icon, label]) => (
            <TouchableOpacity
              key={tab}
              style={styles.toolTile}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/(app)/study-tools', params: { tab } })}
            >
              <View style={styles.toolIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
              <Text style={styles.toolLabel} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscription expiry banner */}
        {subscriptionInfo && (() => {
          const daysLeft = Math.ceil((new Date(subscriptionInfo.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 7) return null;
          const expired = daysLeft <= 0;
          const isTrial = subscriptionInfo.isTrial;
          return (
            <View style={[styles.subBanner, expired ? styles.subBannerExpired : daysLeft <= 3 ? styles.subBannerUrgent : styles.subBannerWarning]}>
              <Text style={styles.subBannerText}>
                {expired
                  ? `⚠️ Your ${isTrial ? 'free trial' : 'subscription'} has expired. Renew to keep accessing papers.`
                  : isTrial
                    ? `🎁 Free trial: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left. Subscribe to keep access.`
                    : `⏰ Subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now.`
                }
              </Text>
              <TouchableOpacity
                style={styles.subBannerBtn}
                onPress={() => setMpesaTarget({ _renew: true })}
              >
                <Text style={styles.subBannerBtnText}>Renew — KES 100</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Recent Papers header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Papers</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/papers')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {papers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={44} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No Papers Yet</Text>
            <Text style={styles.emptyText}>No papers are available for your university yet.</Text>
          </Card>
        ) : (
          papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              accessible={hasAccess(paper)}
              bookmarked={actions.isBookmarked(paper.id)}
              downloaded={actions.isDownloaded(paper.id)}
              progress={actions.progressOf(paper.id)}
              onDownload={actions.download}
              onUnlock={setMpesaTarget}
              onToggleBookmark={actions.toggleBookmark}
            />
          ))
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

const createStyles = (c: Palette) => StyleSheet.create({
  toolsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  toolTile: {
    flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 6,
    backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: c.border,
  },
  toolIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '700', color: c.text.primary },
  root: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: c.text.secondary, fontSize: 14 },
  // Banner
  banner: {
    backgroundColor: c.primary,
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
    flex: 1, backgroundColor: c.surface, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: c.border, padding: 18,
  },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.text.muted, marginBottom: 8 },
  statValue: { fontSize: 36, fontWeight: '900', color: c.text.primary },
  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text.primary },
  viewAll: { fontSize: 13, fontWeight: '700', color: c.primary },
  // Paper card
  paperCard: { marginBottom: 12, padding: 18 },
  paperTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paperTitle: { fontSize: 14, fontWeight: '700', color: c.text.primary, marginBottom: 4 },
  paperMeta: { fontSize: 12, color: c.text.muted, marginBottom: 14 },
  paperBtn: { width: '100%' },
  // Empty
  emptyCard: { alignItems: 'center', padding: 36 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text.primary, marginBottom: 6 },
  emptyText: { fontSize: 13, color: c.text.secondary, textAlign: 'center' },
  // Subscription banner
  subBanner: { borderRadius: RADIUS.xl, padding: 14, marginBottom: 20 },
  subBannerWarning: { backgroundColor: c.warnSoft, borderWidth: 1, borderColor: c.warnBorder },
  subBannerUrgent: { backgroundColor: c.orangeSoft, borderWidth: 1, borderColor: c.orangeBorder },
  subBannerExpired: { backgroundColor: c.errorSoft, borderWidth: 1, borderColor: c.errorBorder },
  subBannerText: { fontSize: 13, color: c.text.primary, fontWeight: '600', marginBottom: 10, lineHeight: 18 },
  subBannerBtn: { backgroundColor: c.primary, borderRadius: RADIUS.lg, paddingVertical: 10, alignItems: 'center' },
  subBannerBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
