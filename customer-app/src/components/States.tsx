// Loading + Error states used by every list screen. Re-exports
// `EmptyState` from `./EmptyState` so screens can pull all three
// (loading/error/empty) from a single import path.

export { EmptyState } from './EmptyState';

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/errors';
import { Button } from './Button';

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong.';
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.label}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: 12 }}>
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#b91c1c' },
  label: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});