import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const idsRef = useRef<Set<string>>(ids);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const loaded = new Set<string>(JSON.parse(raw));
        idsRef.current = loaded;
        setIds(loaded);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(async (id: string) => {
    const copy = new Set(idsRef.current);
    const nowBookmarked = !copy.has(id);
    if (nowBookmarked) copy.add(id); else copy.delete(id);
    idsRef.current = copy;
    setIds(copy);
    AsyncStorage.setItem(KEY, JSON.stringify([...copy])).catch(() => {});
    return nowBookmarked;
  }, []);

  const isBookmarked = useCallback((id: string) => ids.has(id), [ids]);

  return <Ctx.Provider value={{ ids, isBookmarked, toggle }}>{children}</Ctx.Provider>;
}

export function useBookmarks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBookmarks must be used inside BookmarksProvider');
  return ctx;
}
