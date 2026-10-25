import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { statusColors, statusLabel } from '../format';
import type { OrderStatus } from '../constants';

export function StatusPill({ status }: { status: OrderStatus }) {
  const c = statusColors(status);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.fg }]}>{statusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: { fontSize: 12, fontWeight: '600' },
});