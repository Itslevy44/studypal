import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MpesaModal } from '../../components/MpesaModal';
import { COLORS, RADIUS, SHADOW, API_BASE_URL } from '../../constants';

const CATEGORIES = ['All', 'Calculators', 'Furniture', 'Electronics', 'Textbooks', 'Others'];

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [adIndex, setAdIndex] = useState(0);
  const [mpesaTarget, setMpesaTarget] = useState<any | null>(null);
  const [showContact, setShowContact] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, adsRes, noticesRes] = await Promise.all([
        api.marketplace.items(),
        api.marketplace.advertisements(),
        api.marketplace.notices(user?.university),
      ]);
      setItems(itemsRes.items || []);
      setAds(adsRes.advertisements || []);
      setNotices(noticesRes.notices || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.university]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-advance ads
  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setAdIndex((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  const filtered = items.filter((item) => {
    const matchCat = category === 'All' || item.category === category;
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const renderHeader = () => (
    <>
      <Text style={styles.pageTitle}>Marketplace 🛍️</Text>

      {/* Ad carousel */}
      {ads.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.adBox}
          onPress={() => {/* future: open ad link */}}
        >
          {ads[adIndex]?.telegramFileId && (
            <Image
              source={{ uri: `${API_BASE_URL}/api/media/telegram/${ads[adIndex].telegramFileId}` }}
              style={styles.adImage}
            />
          )}
          <View style={styles.adOverlay}>
            <Badge label="Sponsored" color="#fff" bg="#d946ef" />
            <Text style={styles.adTitle}>{ads[adIndex]?.title}</Text>
            {!!ads[adIndex]?.description && (
              <Text style={styles.adDescription} numberOfLines={2}>{ads[adIndex].description}</Text>
            )}
          </View>
          {ads.length > 1 && (
            <View style={styles.adDots}>
              {ads.map((_, i) => (
                <View key={i} style={[styles.dot, i === adIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Notice Board — always shown above items */}
      <View style={styles.noticeSection}>
        <Text style={styles.sectionTitle}>📢 Notice Board</Text>
        {notices.length === 0 ? (
          <Card style={styles.emptyNotice}>
            <Text style={styles.emptyNoticeText}>No announcements at the moment.</Text>
          </Card>
        ) : (
          notices.map((n) => (
            <Card key={n.id} style={styles.noticeCard}>
              <View style={styles.noticeTop}>
                <Badge label={n.category} color={COLORS.primary} bg="#e0e7ff" />
                <Text style={styles.noticeDate}>{new Date(n.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeContent}>{n.content}</Text>
            </Card>
          ))
        )}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search marketplace…"
          placeholderTextColor={COLORS.text.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.pill, category === c && styles.pillActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Items for Sale</Text>
    </>
  );

  const renderItem = ({ item }: { item: any }) => {
    const sold = item.status === 'sold';
    return (
      <Card style={styles.itemCard} elevated>
        {item.telegramFileId ? (
          <Image
            source={{ uri: `${API_BASE_URL}/api/media/telegram/${item.telegramFileId}` }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.itemImage, styles.noImage]}>
            <Text style={{ fontSize: 32 }}>📦</Text>
          </View>
        )}
        {sold && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
        <View style={styles.itemBody}>
          <View style={styles.itemBadges}>
            <Badge label={item.category} />
            <Badge label={item.condition} color="#7c3aed" bg="#ede9fe" />
          </View>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.itemPrice}>KES {item.price?.toLocaleString()}</Text>
          {!sold ? (
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => setMpesaTarget(item)}
              >
                <Text style={styles.buyBtnText}>Pay M-Pesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => setShowContact(showContact === item.id ? null : item.id)}
              >
                <Text style={{ fontSize: 18 }}>📞</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.soldBtn}>
              <Text style={styles.soldBtnText}>Item Sold Out</Text>
            </View>
          )}
          {showContact === item.id && (
            <View style={styles.contactBox}>
              <Text style={styles.contactLabel}>Seller Contact</Text>
              <Text style={styles.contactValue}>{item.contactInfo}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderFooter = () => null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <Card style={styles.empty}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>🛒</Text>
              <Text style={styles.emptyTitle}>No items listed</Text>
              <Text style={styles.emptySub}>Check back later or clear your filters.</Text>
            </Card>
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MpesaModal
        visible={!!mpesaTarget}
        title={mpesaTarget?.title ?? ''}
        amount={mpesaTarget?.price ?? 0}
        accountReference={mpesaTarget?.id ?? ''}
        transactionDesc={`Purchase: ${mpesaTarget?.title ?? ''}`}
        defaultPhone={(user as any)?.phone ?? ''}
        onClose={() => setMpesaTarget(null)}
        onSuccess={() => {
          setItems((prev) => prev.map((i) => i.id === mpesaTarget?.id ? { ...i, status: 'sold' } : i));
          setMpesaTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text.primary, marginBottom: 16 },
  adBox: { height: 200, borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 16, backgroundColor: '#1e1b4b', ...SHADOW.md },
  adImage: { position: 'absolute', width: '100%', height: '100%', opacity: 0.7 },
  adOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, gap: 4, backgroundColor: 'rgba(0,0,0,0.35)' },
  adTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  adDescription: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  adDots: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 14, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    borderWidth: 2, borderColor: '#c7d2fe', paddingHorizontal: 14, marginBottom: 12, ...SHADOW.sm,
  },
  searchInput: { flex: 1, height: 46, fontSize: 14, fontWeight: '500', color: COLORS.text.primary },
  pills: { flexDirection: 'row', marginBottom: 20 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: '#f1f5f9', marginRight: 8 },
  pillActive: { backgroundColor: COLORS.secondary },
  pillText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  pillTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary, marginBottom: 12 },
  itemCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  itemImage: { width: '100%', height: 160 },
  noImage: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  soldOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  soldText: { color: '#f87171', fontSize: 20, fontWeight: '900', letterSpacing: 2, borderWidth: 2, borderColor: '#f87171', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 8 },
  itemBody: { padding: 16 },
  itemBadges: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  itemDesc: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 18, marginBottom: 10 },
  itemPrice: { fontSize: 20, fontWeight: '900', color: COLORS.text.primary, marginBottom: 12 },
  itemActions: { flexDirection: 'row', gap: 10 },
  buyBtn: {
    flex: 1, height: 44, borderRadius: RADIUS.lg, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  contactBtn: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  soldBtn: {
    height: 44, borderRadius: RADIUS.lg, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  soldBtnText: { color: COLORS.text.muted, fontWeight: '700' },
  contactBox: { backgroundColor: '#1e293b', borderRadius: RADIUS.md, padding: 12, marginTop: 8 },
  contactLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  contactValue: { color: '#67e8f9', fontWeight: '700', fontSize: 14 },
  noticeSection: { marginBottom: 16 },
  noticeCard: { marginBottom: 12, padding: 14 },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noticeDate: { fontSize: 11, color: COLORS.text.muted },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  noticeContent: { fontSize: 12, color: COLORS.text.secondary, lineHeight: 18 },
  emptyNotice: { padding: 14, marginBottom: 12 },
  emptyNoticeText: { fontSize: 12, color: COLORS.text.muted, textAlign: 'center' },
  empty: { alignItems: 'center', padding: 36, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center' },
});
