import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { APP_VERSION_CODE } from '../constants';
import { storage } from './storage';
import { api } from './api';

export interface UpdateInfo {
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string;
  releaseNotes: string;
  mandatory: boolean;
}

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Check at most every 6 hours

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdate = useCallback(async (force = false) => {
    try {
      setChecking(true);

      // Returns true when the update was surfaced to the user.
      const surface = async (info: UpdateInfo): Promise<boolean> => {
        if (!(info.latestVersionCode > APP_VERSION_CODE)) {
          setUpdateAvailable(false);
          setUpdateInfo(null);
          return false;
        }
        const dismissed = await storage.getDismissedVersion();
        if (!info.mandatory && dismissed === info.latestVersion) return false;
        setUpdateInfo(info);
        setUpdateAvailable(true);
        return true;
      };

      if (!force) {
        // An update we already know about must keep showing between network checks;
        // otherwise a mandatory update would vanish on the next launch within the throttle window.
        const known = await storage.getUpdateInfo();
        if (known && (await surface(known))) return;

        const lastCheck = await storage.getLastUpdateCheck();
        if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
      }

      const info = await api.update.check();
      await storage.setLastUpdateCheck(Date.now());
      await storage.setUpdateInfo(info.latestVersionCode > APP_VERSION_CODE ? info : null);
      await surface(info);
    } catch {
      // Silently fail — don't interrupt the user experience
    } finally {
      setChecking(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(async () => {
    if (updateInfo) {
      await storage.setDismissedVersion(updateInfo.latestVersion);
    }
    setUpdateAvailable(false);
  }, [updateInfo]);

  const openDownload = useCallback(() => {
    if (updateInfo?.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl);
    }
  }, [updateInfo]);

  return {
    updateAvailable,
    updateInfo,
    checking,
    checkForUpdate: () => checkForUpdate(true),
    dismissUpdate,
    openDownload,
  };
}
