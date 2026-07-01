import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Input } from './ui/Input';
import { GradientButton } from './ui/GradientButton';
import { COLORS, RADIUS, SHADOW } from '../constants';
import { api } from '../lib/api';

interface Props {
  visible: boolean;
  title: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  defaultPhone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MpesaModal({
  visible, title, amount, accountReference, transactionDesc,
  defaultPhone = '', onClose, onSuccess,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handlePay = async () => {
    if (!phone.trim()) {
      setStatus('error');
      setMessage('Please enter your M-Pesa phone number.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      await api.mpesa.stkPush({ phoneNumber: phone, amount, accountReference, transactionDesc });
      setStatus('success');
      setMessage('✅ STK Push sent! Enter your M-Pesa PIN on your phone to complete.');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
        onSuccess();
      }, 3500);
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message || 'Payment initiation failed. Try again.');
    }
  };

  const handleClose = () => {
    if (status === 'loading') return;
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
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Price tag */}
          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceLabel}>Amount</Text>
              <Text style={styles.price}>KES {amount.toLocaleString()}</Text>
            </View>
            <Text style={styles.priceEmoji}>📱</Text>
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
              {status === 'loading' && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />}
              <Text style={[
                styles.statusText,
                status === 'error' ? { color: COLORS.error } :
                status === 'success' ? { color: COLORS.success } : { color: COLORS.primary },
              ]}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <GradientButton
              label={status === 'loading' ? 'Sending…' : `Pay KES ${amount}`}
              onPress={handlePay}
              loading={status === 'loading'}
              disabled={status === 'success'}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
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
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  subtitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2, maxWidth: 240 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, color: COLORS.text.secondary, fontWeight: '700' },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: 16,
    marginBottom: 20,
  },
  priceLabel: { fontSize: 10, fontWeight: '700', color: COLORS.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  price: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  priceEmoji: { fontSize: 28 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  statusError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statusInfo: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cancelBtn: {
    height: 52, paddingHorizontal: 18, borderRadius: RADIUS.xl,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: COLORS.text.secondary },
  hint: { fontSize: 12, color: COLORS.text.muted, textAlign: 'center' },
});
