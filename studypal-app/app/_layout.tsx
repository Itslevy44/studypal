import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider } from '../context/AuthContext';
import { UpdateModal } from '../components/UpdateModal';
import { useUpdateChecker } from '../lib/useUpdateChecker';
import { COLORS } from '../constants';

SplashScreen.preventAutoHideAsync();

function AppWithUpdateChecker() {
  const { updateInfo, dismissUpdate, openDownload } = useUpdateChecker();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
      </Stack>

      {updateInfo && (
        <UpdateModal
          info={updateInfo}
          onUpdate={openDownload}
          onDismiss={dismissUpdate}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // Prevent screenshots and screen recordings across the entire app
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={COLORS.dark} />
      <AppWithUpdateChecker />
    </AuthProvider>
  );
}
