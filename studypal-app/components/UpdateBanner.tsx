import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Linking,
} from 'react-native';
import { RADIUS, SHADOW } from '../constants';
import { UpdateInfo } from '../lib/useUpdateChecker';
import { useThemedStyles } from '../context/ThemeContext';
import type { Palette } from '../constants/theme';

interface Props {
  visible: boolean;
  info: UpdateInfo | null;
  onDismiss: () => void;
  onUpdate: () => void;
}

export function UpdateBanner({ visible, info, onDismiss, onUpdate }: Props) {
  const styles = useThemedStyles(createStyles);
  if (!info) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🚀</Text>
          </View>

          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.versionLine}>
            Version <Text style={styles.versionBold}>{info.latestVersion}</Text> is ready
          </Text>

          {info.releaseNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>What&apos;s new</Text>
              <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.notes}>{info.releaseNotes}</Text>
              </ScrollView>
            </View>
          ) : null}

          {/* Mandatory warning */}
          {info.mandatory && (
            <View style={styles.mandatoryBanner}>
              <Text style={styles.mandatoryText}>
                ⚠️ This update is required to continue using StudyPal.
              </Text>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity style={styles.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
            <Text style={styles.updateBtnText}>Download Update</Text>
          </TouchableOpacity>

          {!info.mandatory && (
            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.laterBtnText}>Remind me later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: c.surface,
    borderRadius: RADIUS.xxl,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...SHADOW.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: c.premiumSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 32 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 4,
  },
  versionLine: {
    fontSize: 14,
    color: c.text.secondary,
    marginBottom: 16,
  },
  versionBold: { color: c.primary, fontWeight: '700' },
  notesBox: {
    width: '100%',
    backgroundColor: c.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: c.text.muted,
    marginBottom: 6,
  },
  notes: { fontSize: 13, color: c.text.secondary, lineHeight: 20 },
  mandatoryBanner: {
    backgroundColor: c.orangeSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: c.orangeBorder,
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  mandatoryText: { fontSize: 12, color: '#c2410c', fontWeight: '600', textAlign: 'center' },
  updateBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.xl,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOW.md,
  },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  laterBtn: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBtnText: { fontSize: 14, color: c.text.secondary, fontWeight: '600' },
});
