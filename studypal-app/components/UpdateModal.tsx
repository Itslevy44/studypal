import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../constants';
import { UpdateInfo } from '../hooks/useUpdateChecker';

interface Props {
  info: UpdateInfo;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateModal({ info, onUpdate, onDismiss }: Props) {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🚀</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.version}>Version {info.latestVersion}</Text>

          {/* Release notes */}
          {!!info.releaseNotes && (
            <ScrollView style={styles.notes} showsVerticalScrollIndicator={false}>
              <Text style={styles.notesLabel}>What's new</Text>
              <Text style={styles.notesText}>{info.releaseNotes}</Text>
            </ScrollView>
          )}

          {/* Actions */}
          <TouchableOpacity style={styles.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
            <Text style={styles.updateBtnText}>⬇ Download Update</Text>
          </TouchableOpacity>

          {/* Only show "Later" for non-mandatory updates */}
          {!info.mandatory && (
            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.laterText}>Remind me later</Text>
            </TouchableOpacity>
          )}

          {info.mandatory && (
            <Text style={styles.mandatoryNote}>
              This update is required to continue using StudyPal.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    ...SHADOW.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
  },
  notes: {
    width: '100%',
    maxHeight: 140,
    backgroundColor: '#f8fafc',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  updateBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOW.md,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  laterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  laterText: {
    fontSize: 13,
    color: COLORS.text.muted,
    fontWeight: '600',
  },
  mandatoryNote: {
    fontSize: 12,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});
