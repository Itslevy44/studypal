import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { recordOpened } from '../../lib/downloads';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RADIUS } from '../../constants';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

interface DownloadedPaper {
  id: string;
  title: string;
  course: string;
  examPeriod: string;
  yearOfStudy: string;
  fileUri: string;
  savedAt: string;
  size: number;
}

const formatSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

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
      } catch { /* no metadata */ }
      let size = 0;
      try {
        const info = await FileSystem.getInfoAsync(`${dir}${f}`);
        if (info.exists && 'size' in info) size = info.size ?? 0;
      } catch { /* ignore */ }
      results.push({
        id,
        title: meta.title || id,
        course: meta.course || 'Paper',
        examPeriod: meta.examPeriod || '—',
        yearOfStudy: meta.yearOfStudy || '—',
        fileUri: `${dir}${f}`,
        savedAt: meta.savedAt || new Date().toISOString(),
        size,
      });
    }
    return results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch { return []; }
}

/** Build a self-contained HTML page that renders a PDF from a base64 string using PDF.js */
function buildPdfViewerHtml(base64: string, dark: boolean): string {
  const bg = dark ? '#0b1120' : '#f8fafc';
  const bar = dark ? 'rgba(19,28,49,0.97)' : 'rgba(255,255,255,0.97)';
  const line = dark ? '#26334f' : '#e2e8f0';
  const muted = dark ? '#9aa8c0' : '#64748b';
  const accent = dark ? '#6366f1' : '#4f46e5';
  const disabled = dark ? '#2b3158' : '#c7d2fe';
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${bg}; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; }
  #loading { color: ${accent}; font-size: 14px; padding: 40px; text-align: center; }
  canvas { display: block; width: 100%; margin-bottom: 6px; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  #controls {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: ${bar}; padding: 10px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid ${line}; z-index: 100;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
  }
  .ctrl-btn {
    background: ${accent}; color: white; border: none; border-radius: 8px;
    padding: 8px 18px; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .ctrl-btn:disabled { opacity: 0.35; background: ${disabled}; }
  #page-info { color: ${muted}; font-size: 13px; font-weight: 600; }
  #pages { padding-bottom: 60px; width: 100%; }
</style>
</head>
<body>
<div id="loading">Loading PDF...</div>
<div id="pages"></div>
<div id="controls" style="display:none">
  <button class="ctrl-btn" id="prev" onclick="changePage(-1)" disabled>‹ Prev</button>
  <span id="page-info">1 / 1</span>
  <button class="ctrl-btn" id="next" onclick="changePage(1)">Next ›</button>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const base64 = '${base64}';
const raw = atob(base64);
const bytes = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

let pdfDoc = null, currentPage = 1;
const scale = window.devicePixelRatio > 1 ? 1.5 : 1.2;

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });
  const container = document.getElementById('pages');
  let canvas = document.getElementById('page-' + num);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'page-' + num;
    container.appendChild(canvas);
  }
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
}

pdfjsLib.getDocument({ data: bytes }).promise.then(async (pdf) => {
  pdfDoc = pdf;
  document.getElementById('loading').style.display = 'none';
  document.getElementById('controls').style.display = 'flex';
  document.getElementById('page-info').textContent = '1 / ' + pdf.numPages;
  document.getElementById('next').disabled = pdf.numPages === 1;
  for (let i = 1; i <= pdf.numPages; i++) await renderPage(i);
}).catch((err) => {
  document.getElementById('loading').innerHTML = 'Failed to load PDF.<br><small>' + err.message + '</small>';
});

function changePage(delta) {
  const newPage = currentPage + delta;
  if (!pdfDoc || newPage < 1 || newPage > pdfDoc.numPages) return;
  currentPage = newPage;
  const canvas = document.getElementById('page-' + newPage);
  if (canvas) canvas.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('page-info').textContent = newPage + ' / ' + pdfDoc.numPages;
  document.getElementById('prev').disabled = newPage === 1;
  document.getElementById('next').disabled = newPage === pdfDoc.numPages;
}
</script>
</body>
</html>`;
}

export default function DownloadsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [papers, setPapers] = useState<DownloadedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewing, setViewing] = useState<DownloadedPaper | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const list = await listDownloadedPapers();
    setPapers(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload every time the tab is shown, so papers downloaded elsewhere appear immediately
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Deep link from Home ("Continue studying"): open that paper once the list is loaded
  const { open: openId } = useLocalSearchParams<{ open?: string }>();
  const handledOpen = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || handledOpen.current === openId || papers.length === 0) return;
    const match = papers.find((p) => p.id === openId);
    if (match) { handledOpen.current = openId; openPaper(match); }
  }, [openId, papers]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSize = useMemo(() => papers.reduce((n, p) => n + (p.size || 0), 0), [papers]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? papers.filter((p) => `${p.course} ${p.title}`.toLowerCase().includes(q)) : papers;
  }, [papers, query]);

  const openPaper = async (paper: DownloadedPaper) => {
    recordOpened(paper.id);
    setPdfLoading(true);
    setViewing(paper);
    try {
      const base64 = await FileSystem.readAsStringAsync(paper.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfHtml(buildPdfViewerHtml(base64, isDark));
    } catch {
      Alert.alert('Error', 'Could not open this PDF. The file may be corrupted.');
      setViewing(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const closePaper = () => {
    setViewing(null);
    setPdfHtml(null);
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

  // ── In-app PDF Viewer ──────────────────────────────────────────────────────
  if (viewing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={styles.viewerHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="lock-closed" size={11} color={colors.primaryLight} />
              <Text style={styles.viewerBadge}>Secure viewer</Text>
            </View>
            <Text style={styles.viewerTitle} numberOfLines={1}>{viewing.title}</Text>
          </View>
          <TouchableOpacity onPress={closePaper} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {pdfLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text.secondary, marginTop: 12, fontSize: 13 }}>Loading PDF…</Text>
          </View>
        ) : pdfHtml ? (
          <WebView
            source={{ html: pdfHtml }}
            style={{ flex: 1, backgroundColor: colors.background }}
            originWhitelist={['*']}
            javaScriptEnabled
            allowsInlineMediaPlayback
            onLongPress={() => {}}
            allowFileAccess={false}
            mixedContentMode="always"
          />
        ) : null}
      </SafeAreaView>
    );
  }

  // ── Downloads List ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Offline Downloads</Text>
              <Text style={styles.pageSub}>
                {papers.length === 0
                  ? 'Papers saved to your device'
                  : `${papers.length} paper${papers.length === 1 ? '' : 's'} · ${formatSize(totalSize)} on this device`}
              </Text>
              {papers.length > 3 && (
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color={colors.text.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search saved papers"
                    placeholderTextColor={colors.text.muted}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                  />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                      <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
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
                {[item.examPeriod !== '—' ? item.examPeriod : '', item.yearOfStudy !== '—' ? item.yearOfStudy : '', item.size ? formatSize(item.size) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => openPaper(item)}
                >
                  <Ionicons name="book-outline" size={17} color="#fff" />
                  <Text style={styles.viewBtnText}>Read paper</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={19} color={colors.error} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Card style={styles.empty}>
              <Ionicons name={papers.length ? 'search-outline' : 'cloud-offline-outline'} size={44} color={colors.text.muted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>{papers.length ? 'No matches' : 'No Downloads Yet'}</Text>
              <Text style={styles.emptySub}>
                {papers.length
                  ? 'Try a different course name.'
                  : 'Papers you download from the Papers tab will appear here for offline study.'}
              </Text>
            </Card>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  list: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
    backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, height: 46, fontSize: 14, fontWeight: '500', color: c.text.primary },
  pageTitle: { fontSize: 26, fontWeight: '800', color: c.text.primary },
  pageSub: { fontSize: 13, color: c.text.secondary, marginTop: 2 },
  card: { marginBottom: 14, padding: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate: { fontSize: 11, color: c.text.muted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.text.primary, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: c.text.secondary, marginBottom: 14 },
  cardActions: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 1, height: 44, borderRadius: RADIUS.lg, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: c.errorSoft, alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', padding: 36, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text.primary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: c.text.secondary, textAlign: 'center', lineHeight: 20 },
  // Viewer
  viewerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: c.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.border,
    elevation: 2,
  },
  viewerBadge: { color: c.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  viewerTitle: { color: c.text.primary, fontSize: 14, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: c.text.secondary, fontWeight: '700', fontSize: 14 },
});
