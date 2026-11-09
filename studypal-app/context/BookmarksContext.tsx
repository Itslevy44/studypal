import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sp_bookmarks';

interface BookmarksCtx {
  ids: Set<string>;
  isBookmarked: (id: string) => boolean;
  toggle: (id: string) => Promise<boolean>; // returns new state
}

const Ctx = createContext<BookmarksCtx | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setIds(new Set(JSON.parse(raw))))
      .catch(() => {});
  }, []);

  const toggle = useCallback(async (id: string) => {
    let next = false;
    setIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else { copy.add(id); next = true; }
      AsyncStorage.setItem(KEY, JSON.stringify([...copy])).catch(() => {});
      return copy;
    });
    return next;
  }, []);

  const isBookmarked = useCallback((id: string) => ids.has(id), [ids]);

  return <Ctx.Provider value={{ ids, isBookmarked, toggle }}>{children}</Ctx.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBookmarks must be used inside BookmarksProvider');
  return ctx;
}
