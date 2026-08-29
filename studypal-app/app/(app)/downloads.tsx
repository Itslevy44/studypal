import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
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
      } catch { /* no metadata */ }
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
  } catch { return []; }
}

/** Build a self-contained HTML page that renders a PDF from a base64 string using PDF.js */
function buildPdfViewerHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; display: flex; flex-direction: column; align-items: center; }
  #loading { color: #818cf8; font-family: sans-serif; font-size: 14px; padding: 40px; text-align: center; }
  canvas { display: block; width: 100%; margin-bottom: 8px; background: white; }
  #controls {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(15,23,42,0.95); padding: 10px 16px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid #1e293b; z-index: 100;
  }
  .ctrl-btn {
    background: #4f46e5; color: white; border: none; border-radius: 8px;
    padding: 8px 18px; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .ctrl-btn:disabled { opacity: 0.35; }
  #page-info { color: #94a3b8; font-size: 13px; font-family: sans-serif; }
  #pages { padding-bottom: 60px; width: 100%; }
</style>
</head>
<body>
<div id="loading">📄 Loading PDF...</div>
<div id="pages"></div>
<div id="controls" style="display:none">
  <button class="ctrl-btn" id="prev" onclick="changePage(-1)">‹ Prev</button>
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
  // Render all pages for smooth scrolling
  for (let i = 1; i <= pdf.numPages; i++) {
    await renderPage(i);
  }
}).catch((err) => {
  document.getElementById('loading').textContent = '❌ Failed to load PDF: ' + err.message;
});

function changePage(delta) {
  const newPage = currentPage + delta;
  if (newPage < 1 || newPage > (pdfDoc ? pdfDoc.numPages : 1)) return;
  currentPage = newPage;
  const canvas = document.getElementById('page-' + newPage);
  if (canvas) canvas.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('page-info').textContent = newPage + ' / ' + (pdfDoc ? pdfDoc.numPages : '?');
  document.getElementById('prev').disabled = newPage === 1;
  document.getElementById('next').disabled = newPage === (pdfDoc ? pdfDoc.numPages : 1);
}
</script>
</body>
</html>`;
}

export default function DownloadsScreen() {
  const [papers, setPapers] = useState<DownloadedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewing, setViewing] = useState<DownloadedPaper | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    const list = await listDownloadedPapers();
    setPapers(list);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPaper = async (paper: DownloadedPaper) => {
    setPdfLoading(true);
    setViewing(paper);
    try {
      const base64 = await FileSystem.readAsStringAsync(paper.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfHtml(buildPdfViewerHtml(base64));
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
        {/* Header */}
        <View style={styles.viewerHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.viewerBadge}>🔒 Secure Viewer</Text>
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
        ) : pdfHtml ? (
          <WebView
            source={{ html: pdfHtml }}
            style={{ flex: 1, backgroundColor: '#1a1a2e' }}
            originWhitelist={['*']}
            javaScriptEnabled
            allowsInlineMediaPlayback
            // Block sharing / context menus
            onLongPress={() => {}}
            allowFileAccess={false}
            // Allow loading PDF.js from CDN
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
                  <Text style={styles.viewBtnText}>📖  Read Paper</Text>
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
  viewerBadge: { color: '#818cf8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  viewerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#94a3b8', fontWeight: '700', fontSize: 14 },
});
