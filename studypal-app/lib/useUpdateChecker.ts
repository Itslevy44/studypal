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

      // Throttle checks unless forced
      if (!force) {
        const lastCheck = await storage.getLastUpdateCheck();
        if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
      }

      const info = await api.update.check();
      await storage.setLastUpdateCheck(Date.now());

      if (info.latestVersionCode > APP_VERSION_CODE) {
        // Check if user already dismissed this version
        const dismissed = await storage.getDismissedVersion();
        if (!info.mandatory && dismissed === info.latestVersion) return;

        setUpdateInfo(info);
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
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
