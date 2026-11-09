import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useUpdateChecker } from '../../lib/useUpdateChecker';
import { UpdateBanner } from '../../components/UpdateBanner';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

const TAB_ICONS: Record<string, [string, string]> = {
  dashboard: ['home', 'home-outline'],
  papers: ['library', 'library-outline'],
  marketplace: ['storefront', 'storefront-outline'],
  downloads: ['cloud-download', 'cloud-download-outline'],
  profile: ['person', 'person-outline'],
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { colors } = useTheme();
  const [on, off] = TAB_ICONS[name] ?? ['ellipse', 'ellipse-outline'];
  return (
    <Ionicons
      name={(focused ? on : off) as any}
      size={24}
      color={focused ? colors.primary : colors.text.muted}
    />
  );
}

export default function AppLayout() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { user, loading } = useAuth();
  const router = useRouter();
  const { updateAvailable, updateInfo, dismissUpdate, openDownload } = useUpdateChecker();

  // Redirect to login immediately when user logs out
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  // Don't render tabs while redirecting
  if (!loading && !user) return null;

  return (
    <>
      <UpdateBanner
        visible={updateAvailable}
        info={updateInfo}
        onDismiss={dismissUpdate}
        onUpdate={openDownload}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="dashboard" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="papers"
          options={{
            title: 'Papers',
            tabBarIcon: ({ focused }) => <TabIcon name="papers" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: 'Market',
            tabBarIcon: ({ focused }) => <TabIcon name="marketplace" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Offline',
            tabBarIcon: ({ focused }) => <TabIcon name="downloads" focused={focused} />,
          }}
        />
        <Tabs.Screen name="study-tools" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          }}
        />
      </Tabs>
    </>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  tabBar: {
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
