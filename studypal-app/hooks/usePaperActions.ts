import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useBookmarks } from '../context/BookmarksContext';
import { useToast } from '../context/ToastContext';
import { downloadPaper, listDownloadedIds } from '../lib/downloads';

export function usePaperActions() {
  const toast = useToast();
  const { isBookmarked, toggle } = useBookmarks();
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, number>>({});

  const refreshDownloaded = useCallback(async () => setDownloaded(await listDownloadedIds()), []);
  // Re-check on every focus so deleting from the Offline tab updates the 'Saved offline' chips
  useFocusEffect(useCallback(() => { refreshDownloaded(); }, [refreshDownloaded]));

  const download = useCallback(async (paper: any) => {
    setProgress((p) => ({ ...p, [paper.id]: 0 }));
    try {
      await downloadPaper(paper, (f) => setProgress((p) => ({ ...p, [paper.id]: f })));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show(`Saved "${paper.title || paper.course}" for offline use`, 'success');
      refreshDownloaded();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.show(e.message || 'Download failed', 'error');
    } finally {
      setProgress((p) => { const { [paper.id]: _, ...rest } = p; return rest; });
    }
  }, [toast, refreshDownloaded]);

  const toggleBookmark = useCallback(async (paper: any) => {
    const now = await toggle(paper.id);
    toast.show(now ? 'Bookmarked' : 'Bookmark removed', 'info');
  }, [toggle, toast]);

  return {
    download, toggleBookmark, isBookmarked, refreshDownloaded,
    isDownloaded: (id: string) => downloaded.has(id),
    progressOf: (id: string): number | null => (id in progress ? progress[id] : null),
  };
}
