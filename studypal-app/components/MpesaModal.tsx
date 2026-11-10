import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Input } from './ui/Input';
import { GradientButton } from './ui/GradientButton';
import { RADIUS, SHADOW } from '../constants';
import { api } from '../lib/api';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { Palette } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
  /** Resolves true once the payment has been recorded (e.g. refresh the user and check their subscription). */
  verify?: () => Promise<boolean>;
}

const POLL_EVERY_MS = 4000;
const POLL_ATTEMPTS = 25; // ~100 seconds for the customer to enter their PIN

export function MpesaModal({
  visible, title, amount, accountReference, transactionDesc,
  defaultPhone = '', onClose, onSuccess, verify,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [phone, setPhone] = useState(defaultPhone);
  const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const runId = useRef(0); // bumped on each payment attempt and on close, so stale polling stops
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; timers.current.forEach(clearTimeout); };
  }, []);

  const handlePay = async () => {
    if (!phone.trim()) {
      setStatus('error');
      setMessage('Please enter your M-Pesa phone number.');
      return;
    }
    const myRun = ++runId.current;
    setStatus('loading');
    setMessage('');
    try {
      await api.mpesa.stkPush({ phoneNumber: phone, amount, accountReference, transactionDesc });
      if (!verify) {
        setStatus('success');
        setMessage('STK push sent. Enter your M-Pesa PIN on your phone to complete.');
        later(() => { setStatus('idle'); setMessage(''); onSuccess(); }, 3500);
        return;
      }
      setStatus('waiting');
      setMessage('Check your phone and enter your M-Pesa PIN. We will confirm automatically.');
      for (let i = 0; i < POLL_ATTEMPTS && alive.current && runId.current === myRun; i++) {
        await new Promise((r) => later(() => r(null), POLL_EVERY_MS));
        if (!alive.current || runId.current !== myRun) return;
        await api.mpesa.reconcile().catch(() => {}); // ask PayHero directly; webhook may be late
        const paid = await verify().catch(() => false);
        if (paid && runId.current === myRun) {
          setStatus('success');
          setMessage('Payment confirmed. Thank you!');
          later(() => { setStatus('idle'); setMessage(''); onSuccess(); }, 1200);
          return;
        }
      }
      if (alive.current && runId.current === myRun) {
        setStatus('error');
        setMessage("We haven't received the payment yet. If you already paid, it can take a minute: pull down to refresh, or try again.");
      }
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message || 'Payment initiation failed. Try again.');
    }
  };

  const handleClose = () => {
    if (status === 'loading') return;
    runId.current++; // stop any in-flight confirmation polling
    setStatus('idle');
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pay via M-Pesa</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{title}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={status === 'loading'} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Price tag */}
          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceLabel}>Amount</Text>
              <Text style={styles.price}>KES {amount.toLocaleString()}</Text>
            </View>
            <Ionicons name="phone-portrait-outline" size={30} color={colors.primary} />
          </View>

          <Input
            label="M-Pesa Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. 0712345678"
          />

          {message ? (
            <View style={[
              styles.statusBox,
              status === 'error' ? styles.statusError :
              status === 'success' ? styles.statusSuccess : styles.statusInfo,
            ]}>
              {(status === 'loading' || status === 'waiting') && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
              <Text style={[
                styles.statusText,
                status === 'error' ? { color: colors.error } :
                status === 'success' ? { color: colors.success } : { color: colors.primary },
              ]}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <GradientButton
              label={status === 'loading' ? 'Sending…' : status === 'waiting' ? 'Waiting for payment…' : `Pay KES ${amount}`}
              onPress={handlePay}
              loading={status === 'loading' || status === 'waiting'}
              disabled={status === 'success' || status === 'waiting'}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              onPress={handleClose}
              disabled={status === 'loading'}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            You&apos;ll receive a prompt on your phone to enter your PIN.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    ...SHADOW.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: c.text.primary },
  subtitle: { fontSize: 13, color: c.text.secondary, marginTop: 2, maxWidth: 240 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: c.text.secondary, fontWeight: '700' },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.premiumSoft,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: c.inputBorder,
    padding: 16,
    marginBottom: 20,
  },
  priceLabel: { fontSize: 10, fontWeight: '700', color: c.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  price: { fontSize: 28, fontWeight: '800', color: c.primary },
  priceEmoji: { fontSize: 28 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  statusError: { backgroundColor: c.errorSoft, borderColor: c.errorBorder },
  statusSuccess: { backgroundColor: c.successSoft, borderColor: c.inputBorder },
  statusInfo: { backgroundColor: c.infoSoft, borderColor: c.inputBorder },
  statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cancelBtn: {
    height: 52, paddingHorizontal: 18, borderRadius: RADIUS.xl,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: c.text.secondary },
  hint: { fontSize: 12, color: c.text.muted, textAlign: 'center' },
});
