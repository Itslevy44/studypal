import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../../constants';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, style, ...props }: Props) {
  const [show, setShow] = useState(false);
  const isSecure = props.secureTextEntry && !show;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? isSecure : props.secureTextEntry}
          style={[styles.input, style]}
          placeholderTextColor={COLORS.text.muted}
          autoCapitalize={props.autoCapitalize ?? 'none'}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setShow((s) => !s)} style={styles.eye}>
            <Text style={styles.eyeText}>{show ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
  },
  inputNormal: { borderColor: '#c7d2fe' },  // indigo-200
  inputError: { borderColor: COLORS.error },
  input: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  eye: { padding: 6 },
  eyeText: { fontSize: 16 },
  error: { fontSize: 12, color: COLORS.error, marginTop: 4, fontWeight: '500' },
});
