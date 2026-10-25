import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  description: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});