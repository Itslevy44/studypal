import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { COLORS, RADIUS } from '../../constants';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      {/* Dark gradient top bar */}
      <View style={styles.topBar} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoSP}>SP</Text>
          </View>
          <View>
            <Text style={styles.appName}>StudyPal</Text>
            <Text style={styles.appSub}>Student Portal</Text>
          </View>
        </View>

        <Text style={styles.heading}>Welcome back 👋</Text>
        <Text style={styles.sub}>Sign in to access your study materials.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="you@university.ac.ke"
          autoComplete="email"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          secureToggle
          placeholder="••••••••"
        />

        <GradientButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          style={styles.btn}
        />

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.link}>Create one free</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { height: 4, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 36 },
  logoBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoSP: { color: '#fff', fontWeight: '900', fontSize: 18 },
  appName: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  appSub: { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heading: { fontSize: 28, fontWeight: '800', color: COLORS.text.primary, marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 28 },
  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#fecaca',
    padding: 14, marginBottom: 18,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  btn: { marginTop: 8, marginBottom: 20 },
  linkRow: { alignItems: 'center' },
  linkText: { fontSize: 14, color: COLORS.text.secondary },
  link: { color: COLORS.primary, fontWeight: '700' },
});
