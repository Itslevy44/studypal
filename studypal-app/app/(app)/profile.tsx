import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../context/ToastContext';
import { ensurePermission, remindersEnabled, setRemindersEnabled } from '../../lib/notifications';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { Card } from '../../components/ui/Card';
import { UpdateModal } from '../../components/UpdateModal';
import { RADIUS, SHADOW, APP_VERSION, APP_VERSION_CODE } from '../../constants';
import { useUpdateChecker } from '../../lib/useUpdateChecker';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Palette } from '../../constants/theme';

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const toast = useToast();
  const styles = useThemedStyles(createStyles);
  const { user, logout, refreshUser } = useAuth();
  const { updateAvailable, updateInfo, checking, checkForUpdate, dismissUpdate, openDownload } = useUpdateChecker();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const handleCheckForUpdates = async () => {
    setCheckedOnce(false);
    await checkForUpdate();
    setCheckedOnce(true);
  };

  // After a manual check completes, react to the result
  useEffect(() => {
    if (!checkedOnce) return;
    if (updateAvailable && updateInfo) {
      setShowUpdateModal(true);
    } else {
      toast.show(`You're on the latest version (${APP_VERSION}).`, 'success');
    }
    setCheckedOnce(false);
  }, [checkedOnce, updateAvailable, updateInfo]);

  const [reminders, setReminders] = useState(true);
  useEffect(() => { remindersEnabled().then(setReminders); }, []);
  const toggleReminders = async (on: boolean) => {
    if (on && !(await ensurePermission())) {
      toast.show('Allow notifications for StudyPal in your phone settings.', 'error');
      return;
    }
    setReminders(on);
    await setRemindersEnabled(on);
    toast.show(on ? 'Reminders on. New exams and renewals will notify you.' : 'Reminders off', 'info');
  };

  const [universities, setUniversities] = useState<any[]>([]);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [saving, setSaving] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api.universities.list()
      .then((d) => setUniversities(d.universities || []))
      .catch(() => {});
  }, []);

  const univName = universities.find((u) => u.id === user?.university)?.name || user?.university || '—';

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.show('Name cannot be empty.', 'error'); return; }
    setSaving(true);
    try {
      await api.auth.updateProfile({ fullName: fullName.trim() });
      await refreshUser();
      toast.show('Profile updated', 'success');
    } catch (e: any) {
      toast.show(e.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.show('All password fields are required.', 'error'); return; }
    if (newPw !== confirmPw) { toast.show('New passwords do not match.', 'error'); return; }
    if (newPw.length < 6) { toast.show('Password must be at least 6 characters.', 'error'); return; }
    setSavingPw(true);
    try {
      await api.auth.updateProfile({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.show('Password changed', 'success');
    } catch (e: any) {
      toast.show(e.message || 'Failed to change password.', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    logout(); // clears auth state → (app)/_layout.tsx detects null user → redirects immediately
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.avatarName}>{user?.fullName}</Text>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
            <Text style={styles.avatarYear}>{user?.yearOfStudy} • {univName}</Text>
          </View>
        </View>

        {/* Profile info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Your full name"
          />
          <View style={styles.readonlyField}>
            <Text style={styles.roLabel}>Email Address</Text>
            <Text style={styles.roValue}>{user?.email}</Text>
            <Text style={styles.roHint}>Email cannot be changed.</Text>
          </View>
          <View style={styles.readonlyField}>
            <Text style={styles.roLabel}>University</Text>
            <Text style={styles.roValue}>{univName}</Text>
          </View>
          <GradientButton label={saving ? 'Saving…' : 'Save Changes'} onPress={handleSaveProfile} loading={saving} />
        </Card>

        {/* Password change */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Input label="Current Password" value={currentPw} onChangeText={setCurrentPw} secureTextEntry secureToggle placeholder="••••••••" />
          <Input label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry secureToggle placeholder="Min 6 characters" />
          <Input label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry secureToggle placeholder="Repeat new password" />
          <GradientButton label={savingPw ? 'Updating…' : 'Update Password'} onPress={handleChangePassword} loading={savingPw} variant="ghost" />
        </Card>

        {/* Appearance */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.segment}>
            {([['system', 'phone-portrait-outline', 'System'], ['light', 'sunny-outline', 'Light'], ['dark', 'moon-outline', 'Dark']] as const).map(([key, icon, label]) => {
              const active = mode === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setMode(key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={icon} size={16} color={active ? '#fff' : colors.text.secondary} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Reminders */}
        <Card style={styles.section}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Reminders</Text>
              <Text style={styles.switchHint}>Exam countdown alerts and subscription renewal notices.</Text>
            </View>
            <Switch
              value={reminders}
              onValueChange={toggleReminders}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* App info + update check */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION} (build {APP_VERSION_CODE})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: updateAvailable ? colors.warning : colors.success }]}>
              {updateAvailable ? 'Update available' : 'Up to date'}
            </Text>
          </View>
          <GradientButton
            label={checking ? 'Checking…' : 'Check for Updates'}
            onPress={handleCheckForUpdates}
            loading={checking}
            variant="ghost"
            style={{ marginTop: 8 }}
          />
          {/* Show update button immediately if update is already known */}
          {updateAvailable && !checking && (
            <TouchableOpacity
              style={styles.updateNowBtn}
              onPress={() => setShowUpdateModal(true)}
            >
              <Text style={styles.updateNowText}>Update now — v{updateInfo?.latestVersion}</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Sign out */}
        <GradientButton
          label="Sign Out"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* Update modal — shown when update is available and user taps Check/Update Now */}
      {showUpdateModal && updateInfo && (
        <UpdateModal
          info={updateInfo}
          onUpdate={() => {
            openDownload();
          }}
          onDismiss={async () => {
            await dismissUpdate();
            setShowUpdateModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchHint: { fontSize: 12, color: c.text.secondary, marginTop: -8 },
  segment: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: RADIUS.lg, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  segmentItemActive: { backgroundColor: c.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: c.text.secondary },
  segmentTextActive: { color: '#fff' },
  root: { flex: 1, backgroundColor: c.background },
  scroll: { padding: 20, paddingBottom: 48 },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: c.primary, borderRadius: RADIUS.xxl,
    padding: 20, marginBottom: 20, ...SHADOW.lg,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  avatarInfo: { flex: 1 },
  avatarName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  avatarEmail: { color: '#a5b4fc', fontSize: 13, marginTop: 2 },
  avatarYear: { color: '#a5b4fc', fontSize: 12, marginTop: 4 },
  section: { marginBottom: 16, padding: 20 },
  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: c.text.primary,
    marginBottom: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  readonlyField: { marginBottom: 16 },
  roLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: c.text.secondary, marginBottom: 6 },
  roValue: { fontSize: 14, color: c.text.muted, backgroundColor: c.surfaceAlt, borderRadius: RADIUS.md, padding: 12 },
  roHint: { fontSize: 11, color: c.text.muted, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  infoLabel: { fontSize: 13, color: c.text.secondary, fontWeight: '600' },
  infoValue: { fontSize: 13, color: c.text.primary, fontWeight: '700' },
  logoutBtn: { marginTop: 8 },
  updateNowBtn: {
    marginTop: 10,
    backgroundColor: c.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updateNowText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
