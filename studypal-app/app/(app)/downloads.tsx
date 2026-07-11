import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { COLORS, RADIUS } from '../../constants';

interface DownloadedPaper {
  id: string;
  title: string;
  course: string;
  examPeriod: string;
  yearOfStudy: string;
  fileUri: string;
  savedAt: string;
}

async function listDownloadedPapers(): Promise<DownloadedPaper[]> {
  try {
    const dir = FileSystem.documentDirectory!;
    const files = await FileSystem.readDirectoryAsync(dir);
    const pdfs = files.filter((f) => f.endsWith('.pdf'));

    const results: DownloadedPaper[] = [];
    for (const f of pdfs) {
      const id = f.replace('.pdf', '');
      const metaPath = `${dir}${id}.meta.json`;
      let meta: Partial<DownloadedPaper> = {};
      try {
        const raw = await FileSystem.readAsStringAsync(metaPath);
        meta = JSON.parse(raw);
      } catch {
        // no metadata file — fall back to id
      }
      results.push({
        id,
        title: meta.title || id,
        course: meta.course || 'Paper',
        examPeriod: meta.examPeriod || '—',
        yearOfStudy: meta.yearOfStudy || '—',
        fileUri: `${dir}${f}`,
        savedAt: meta.savedAt || new Date().toISOString(),
      });
    }
    return results;
  } catch {
    return [];
  }
}

export default function DownloadsScreen() {
  const [papers, setPapers] = useState<DownloadedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listDownloadedPapers();
    setPapers(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Open PDF using Android's native PDF viewer via content URI
  const openPaper = async (paper: DownloadedPaper) => {
    setOpeningId(paper.id);
    try {
      // Get a content:// URI that Android can open with any PDF viewer
      const contentUri = await FileSystem.getContentUriAsync(paper.fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
    } catch (e: any) {
      Alert.alert(
        'No PDF Viewer Found',
        'Install a PDF viewer app (e.g. Adobe Acrobat, Google Drive) to open this paper.',
        [{ text: 'OK' }]
      );
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (paper: DownloadedPaper) => {
    Alert.alert(
      'Remove Download',
      `Remove "${paper.title}" from your downloads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await FileSystem.deleteAsync(paper.fileUri, { idempotent: true });
            try {
              await FileSystem.deleteAsync(
                paper.fileUri.replace('.pdf', '.meta.json'),
                { idempotent: true }
              );
            } catch { /* ignore */ }
            load();
          },
        },
      ]
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
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Offline Downloads 📥</Text>
              <Text style={styles.pageSub}>Papers saved to your device</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card} elevated>
              <View style={styles.cardTop}>
                <Badge label={item.course} />
                <Text style={styles.cardDate}>
                  {new Date(item.savedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.examPeriod !== '—' ? `${item.examPeriod} • ` : ''}
                {item.yearOfStudy !== '—' ? `Year ${item.yearOfStudy}` : ''}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.viewBtn, openingId === item.id && styles.viewBtnLoading]}
                  onPress={() => openPaper(item)}
                  disabled={openingId === item.id}
                >
                  {openingId === item.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.viewBtnText}>👁️  Open PDF</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Card style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
              <Text style={styles.emptyTitle}>No Downloads Yet</Text>
              <Text style={styles.emptySub}>
                Papers you download from the Papers tab will appear here for offline study.
              </Text>
            </Card>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text.primary },
  pageSub: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  card: { marginBottom: 14, padding: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate: { fontSize: 11, color: COLORS.text.muted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text.primary, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 14 },
  cardActions: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 1, height: 44, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  viewBtnLoading: { opacity: 0.7 },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', padding: 36, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
});

