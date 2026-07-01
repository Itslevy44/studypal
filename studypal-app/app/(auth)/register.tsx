import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { GradientButton } from '../../components/ui/GradientButton';
import { COLORS, RADIUS } from '../../constants';
import { api } from '../../lib/api';

const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [universities, setUniversities] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [campus, setCampus] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('Year 1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.universities.list()
      .then((d) => setUniversities(d.universities || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const selected = universities.find((u) => u.id === university);
    setCampuses(selected?.campuses || []);
    setCampus('');
  }, [university, universities]);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !university || !campus) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password, university, campus, yearOfStudy });
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickerStyle = styles.picker;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <View style={styles.topBar} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoSP}>SP</Text></View>
          <View>
            <Text style={styles.appName}>StudyPal</Text>
            <Text style={styles.appSub}>Create your account</Text>
          </View>
        </View>

        <Text style={styles.heading}>Get Started Free</Text>
        <Text style={styles.sub}>Join thousands of Kenyan students studying smarter.</Text>

        {error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" autoCapitalize="words" />
        <Input label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@university.ac.ke" />

        {/* University picker */}
        <Text style={styles.label}>University</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={university} onValueChange={setUniversity} style={pickerStyle}>
            <Picker.Item label="Select University" value="" />
            {universities.map((u) => <Picker.Item key={u.id} label={u.name} value={u.id} />)}
          </Picker>
        </View>

        {/* Campus picker */}
        <Text style={styles.label}>Campus</Text>
        <View style={[styles.pickerBox, !university && styles.pickerDisabled]}>
          <Picker selectedValue={campus} onValueChange={setCampus} enabled={!!university} style={pickerStyle}>
            <Picker.Item label="Select Campus" value="" />
            {campuses.map((c) => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
          </Picker>
        </View>

        {/* Year picker */}
        <Text style={styles.label}>Year of Study</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={yearOfStudy} onValueChange={setYearOfStudy} style={pickerStyle}>
            {YEARS.map((y) => <Picker.Item key={y} label={y} value={y} />)}
          </Picker>
        </View>

        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry secureToggle placeholder="Min 6 characters" />
        <Input label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry secureToggle placeholder="Repeat password" />

        <GradientButton label="Create Account" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { height: 4, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoSP: { color: '#fff', fontWeight: '900', fontSize: 16 },
  appName: { fontSize: 18, fontWeight: '800', color: COLORS.text.primary },
  appSub: { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text.primary, marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 24 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#fecaca', padding: 14, marginBottom: 18 },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: COLORS.text.secondary, marginBottom: 8 },
  pickerBox: { borderWidth: 2, borderColor: '#c7d2fe', borderRadius: RADIUS.lg, marginBottom: 16, backgroundColor: '#fff', overflow: 'hidden' },
  pickerDisabled: { opacity: 0.5 },
  picker: { height: 50, color: COLORS.text.primary },
  btn: { marginTop: 8, marginBottom: 20 },
  linkRow: { alignItems: 'center', marginBottom: 24 },
  linkText: { fontSize: 14, color: COLORS.text.secondary },
  link: { color: COLORS.primary, fontWeight: '700' },
});
