// OrdersListScreen — customer's order history. Tapping a row pushes
// OrderDetail (which polls every 5s).

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listOrders } from '../api/orders';
import { EmptyState, ErrorState } from '../components/States';
import { Money } from '../components/Money';
import { StatusPill } from '../components/StatusPill';
import { formatDateTime, truncateId } from '../format';
import type { OrdersStackParamList } from '../nav/types';
import type { Order } from '../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrdersList'>;

export function OrdersListScreen({ navigation }: Props) {
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: () => listOrders(),
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  if ((query.data?.items.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order, it'll show up here."
      />
    );
  }

  return (
    <FlatList
      data={query.data!.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item }) => (
        <Row
          item={item}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        />
      )}
    />
  );
}

function Row({ item, onPress }: { item: Order; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowHead}>
        <Text style={styles.id}>{truncateId(item.id)}</Text>
        <StatusPill status={item.status} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
        <Money cents={item.total_cents} bold />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  pressed: { backgroundColor: '#f3f4f6' },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { fontFamily: 'monospace', fontSize: 13, color: '#111827' },
  rowBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  date: { fontSize: 12, color: '#6b7280' },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
});