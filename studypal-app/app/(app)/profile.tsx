import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { Card } from '../../components/ui/Card';
import { UpdateModal } from '../../components/UpdateModal';
import { COLORS, RADIUS, SHADOW, APP_VERSION, APP_VERSION_CODE } from '../../constants';
import { useUpdateChecker } from '../../lib/useUpdateChecker';

export default function ProfileScreen() {
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
      Alert.alert('Up to date ✓', `You are on the latest version (${APP_VERSION}).`);
    }
    setCheckedOnce(false);
  }, [checkedOnce, updateAvailable, updateInfo]);

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
    if (!fullName.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
    setSaving(true);
    try {
      await api.auth.updateProfile({ fullName: fullName.trim() });
      await refreshUser();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error', 'All password fields are required.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'New passwords do not match.'); return; }
    if (newPw.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
    setSavingPw(true);
    try {
      await api.auth.updateProfile({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Done', 'Password changed successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
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

        {/* App info + update check */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION} (build {APP_VERSION_CODE})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: updateAvailable ? COLORS.warning : COLORS.success }]}>
              {updateAvailable ? '⬆ Update available' : '✓ Up to date'}
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
              <Text style={styles.updateNowText}>🚀 Update Now — v{updateInfo?.latestVersion}</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xxl,
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
    fontSize: 15, fontWeight: '800', color: COLORS.text.primary,
    marginBottom: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  readonlyField: { marginBottom: 16 },
  roLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: COLORS.text.secondary, marginBottom: 6 },
  roValue: { fontSize: 14, color: COLORS.text.muted, backgroundColor: '#f1f5f9', borderRadius: RADIUS.md, padding: 12 },
  roHint: { fontSize: 11, color: COLORS.text.muted, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '600' },
  infoValue: { fontSize: 13, color: COLORS.text.primary, fontWeight: '700' },
  logoutBtn: { marginTop: 8 },
  updateNowBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
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
