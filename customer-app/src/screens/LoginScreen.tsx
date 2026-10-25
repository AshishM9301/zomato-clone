// Login — phone → request OTP → verify OTP, both stages on one screen.
// In dev, the backend returns `devCode` in the request-otp response; we
// surface it in an Alert so the user can read the code without an SMS.

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { otpSchema, phoneSchema } from '../auth/schema';
import { Button } from '../components/Button';
import { ApiError } from '../api/errors';

export function LoginScreen() {
  const { requestOtp, login, logout } = useAuth();
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [phoneValue, setPhoneValue] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const phoneForm = useForm<{ phone: string }>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  async function onSendCode(values: { phone: string }) {
    setSending(true);
    try {
      const { devCode } = await requestOtp(values.phone);
      setPhoneValue(values.phone);
      setStage('otp');
      if (devCode) {
        // Dev convenience: show the code so the user can copy it.
        // Production would deliver via SMS — see docs/03-open-questions.md.
        Alert.alert('Dev OTP', `Your code is ${devCode}`);
      }
    } catch (err) {
      Alert.alert(
        'Could not send code',
        err instanceof ApiError ? err.message : 'Network error',
      );
    } finally {
      setSending(false);
    }
  }

  async function onVerify(values: { otp: string }) {
    setVerifying(true);
    try {
      await login(phoneValue, values.otp);
      // RootNavigator will switch to AppTabs on auth state change.
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Could not verify code';
      Alert.alert('Verification failed', msg);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Zomato</Text>
          <Text style={styles.subtitle}>
            {stage === 'phone' ? 'Sign in with your phone' : 'Enter the 6-digit code'}
          </Text>

          {stage === 'phone' ? (
            <View style={styles.form}>
              <Controller
                control={phoneForm.control}
                name="phone"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Phone (e.g. 9999999999)"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    autoFocus
                    autoComplete="tel"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {phoneForm.formState.errors.phone ? (
                <Text style={styles.error}>
                  {phoneForm.formState.errors.phone.message}
                </Text>
              ) : null}

              <Button
                label={sending ? 'Sending...' : 'Send code'}
                onPress={phoneForm.handleSubmit(onSendCode)}
                loading={sending}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.helper}>
                Code sent to {phoneValue}.{' '}
                <Text style={styles.link} onPress={() => setStage('phone')}>
                  Change
                </Text>
              </Text>
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    style={[styles.input, styles.otp]}
                    placeholder="123456"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    autoFocus
                    maxLength={6}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {otpForm.formState.errors.otp ? (
                <Text style={styles.error}>
                  {otpForm.formState.errors.otp.message}
                </Text>
              ) : null}

              <Button
                label={verifying ? 'Verifying...' : 'Verify'}
                onPress={otpForm.handleSubmit(onVerify)}
                loading={verifying}
                style={{ marginTop: 16 }}
              />
              <Button
                label="Sign out"
                onPress={logout}
                variant="ghost"
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  brand: { fontSize: 36, fontWeight: '700', color: '#e11d48' },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    color: '#374151',
  },
  form: { gap: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  otp: { letterSpacing: 8, textAlign: 'center', fontSize: 22 },
  helper: { fontSize: 13, color: '#6b7280' },
  link: { color: '#1d4ed8', fontWeight: '500' },
  error: { fontSize: 12, color: '#b91c1c' },
});