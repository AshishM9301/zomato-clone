// RestaurantListScreen — search + scrollable list. Tapping a row pushes
// RestaurantDetail. Search has a 300ms debounce so we don't fire a request
// on every keystroke.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listRestaurants } from '../api/restaurants';
import type { Restaurant } from '../types';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/States';
import type { BrowseStackParamList } from '../nav/types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RestaurantList'>;

export function RestaurantListScreen({ navigation }: Props) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ['restaurants', debouncedQ],
    queryFn: () => listRestaurants(debouncedQ || undefined),
  });

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <TextInput
          style={styles.input}
          placeholder="Search restaurants"
          placeholderTextColor="#9ca3af"
          value={q}
          onChangeText={setQ}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No restaurants"
          description={
            debouncedQ
              ? `No results for "${debouncedQ}".`
              : 'When restaurants are open, they show up here.'
          }
        />
      ) : (
        <FlatList
          data={query.data!.items}
          keyExtractor={(r) => r.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Row item={item} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })} />}
        />
      )}
    </View>
  );
}

function Row({ item, onPress }: { item: Restaurant; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.business}>{item.business_name}</Text>
      <Text style={styles.address} numberOfLines={1}>
        {item.address}
      </Text>
      {!item.is_open ? <Text style={styles.closed}>Closed</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  list: { paddingVertical: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  rowPressed: { backgroundColor: '#f3f4f6' },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  business: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  address: { fontSize: 13, color: '#374151', marginTop: 2 },
  closed: { marginTop: 4, fontSize: 11, color: '#b91c1c', fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
});