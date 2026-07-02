import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { api } from '../lib/api';
import { storage } from '../lib/storage';
import { APP_VERSION_CODE } from '../constants';

export interface UpdateInfo {
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string;
  releaseNotes: string;
  mandatory: boolean;
}

const CHECK_INTERVAL_MS = 1000 * 60 * 60; // check at most once per hour

export function useUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Throttle: skip if we already checked recently
        const lastCheck = await storage.getLastUpdateCheck();
        if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

        const info = await api.update.check();
        await storage.setLastUpdateCheck(Date.now());

        if (cancelled) return;

        // Only show if server has a newer version code
        if (info.latestVersionCode > APP_VERSION_CODE) {
          // For non-mandatory updates, check if user already dismissed this version
          if (!info.mandatory) {
            const dismissed = await storage.getDismissedVersion();
            if (dismissed === info.latestVersion) return;
          }
          setUpdateInfo(info);
        }
      } catch {
        // Silently ignore — no internet or server error
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  const dismiss = async () => {
    if (updateInfo && !updateInfo.mandatory) {
      await storage.setDismissedVersion(updateInfo.latestVersion);
    }
    setUpdateInfo(null);
  };

  const openDownload = () => {
    if (updateInfo?.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl);
    }
  };

  return { updateInfo, dismiss, openDownload };
}
