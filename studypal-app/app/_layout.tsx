import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { BookmarksProvider } from '../context/BookmarksContext';
import { UpdateModal } from '../components/UpdateModal';
import { useUpdateChecker } from '../lib/useUpdateChecker';
import { COLORS } from '../constants';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />;
}

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
    <SafeAreaProvider>
      <ThemeProvider>
      <AuthProvider>
        <BookmarksProvider>
          <ToastProvider>
            <ThemedStatusBar />
            <AppWithUpdateChecker />
          </ToastProvider>
        </BookmarksProvider>
      </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
