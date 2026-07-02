import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { COLORS, RADIUS, SHADOW } from '../../constants';

interface DownloadedPaper {
  id: string;
  title: string;
  course: string;
  examPeriod: string;
  yearOfStudy: string;
  fileUri: string;
  savedAt: string;
}

// Scan expo-file-system docs dir for downloaded PDFs.
// Reads the companion .meta.json file (saved at download time) for proper names.
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
  const [viewing, setViewing] = useState<DownloadedPaper | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    const list = await listDownloadedPapers();
    setPapers(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Open a paper: read it as base64 and embed in a data URI to avoid
  // Android WebView ERR_ACCESS_DENIED on file:// URIs.
  const openPaper = async (paper: DownloadedPaper) => {
    setPdfLoading(true);
    setViewing(paper);
    try {
      const base64 = await FileSystem.readAsStringAsync(paper.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfBase64(base64);
    } catch {
      Alert.alert('Error', 'Could not open this PDF. The file may be corrupted.');
      setViewing(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const closePaper = () => {
    setViewing(null);
    setPdfBase64(null);
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
            // Also remove the companion metadata file
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

  if (viewing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
        {/* Viewer header */}
        <View style={styles.viewerHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.viewerSecure}>🔒 Secure Viewer</Text>
            <Text style={styles.viewerTitle} numberOfLines={1}>{viewing.title}</Text>
          </View>
          <TouchableOpacity onPress={closePaper} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {pdfLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13 }}>Loading PDF…</Text>
          </View>
        ) : pdfBase64 ? (
          <WebView
            source={{
              // Embed PDF as a base64 data URI — works on Android without file:// permission errors
              uri: `data:application/pdf;base64,${pdfBase64}`,
            }}
            style={{ flex: 1 }}
            allowsInlineMediaPlayback
            javaScriptEnabled={false}
            originWhitelist={['*']}
          />
        ) : null}
      </SafeAreaView>
    );
  }

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
                  style={styles.viewBtn}
                  onPress={() => openPaper(item)}
                >
                  <Text style={styles.viewBtnText}>👁️  View Offline</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
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
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', padding: 36, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  // Viewer
  viewerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  viewerSecure: { color: '#818cf8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  viewerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#94a3b8', fontWeight: '700' },
});
