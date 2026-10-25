// RestaurantDetailScreen — menu items + add to cart. Each line shows a
// stepper so the user can adjust quantity. Disabled items can't be added.

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getRestaurant } from '../api/restaurants';
import { getMenu } from '../api/menus';
import { useCart } from '../state/cart';
import { Button } from '../components/Button';
import { EmptyState, ErrorState } from '../components/States';
import { Money } from '../components/Money';
import type { BrowseStackParamList } from '../nav/types';
import type { MenuItem } from '../types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RestaurantDetail'>;

export function RestaurantDetailScreen({ route }: Props) {
  const { restaurantId } = route.params;
  const cart = useCart();

  const restaurantQuery = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => getRestaurant(restaurantId),
  });

  const menuQuery = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => getMenu(restaurantId, false),
  });

  function add(item: MenuItem) {
    if (cart.wouldReplaceRestaurant(item)) {
      Alert.alert(
        'Replace cart?',
        'Your cart has items from another restaurant. Adding this item will clear the cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => cart.add(item),
          },
        ],
      );
      return;
    }
    cart.add(item);
  }

  return (
    <View style={styles.container}>
      {restaurantQuery.isSuccess ? (
        <View style={styles.header}>
          <Text style={styles.name}>{restaurantQuery.data.name}</Text>
          <Text style={styles.address}>{restaurantQuery.data.address}</Text>
        </View>
      ) : null}

      {menuQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : menuQuery.isError ? (
        <ErrorState error={menuQuery.error} onRetry={() => menuQuery.refetch()} />
      ) : (menuQuery.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No items"
          description="This restaurant hasn't added anything to the menu yet."
        />
      ) : (
        <FlatList
          data={menuQuery.data!.items}
          keyExtractor={(it) => it.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onAdd={() => add(item)}
              qty={cart.items.find((l) => l.menu_item_id === item.id)?.qty ?? 0}
            />
          )}
        />
      )}
    </View>
  );
}

function ItemRow({
  item,
  qty,
  onAdd,
}: {
  item: MenuItem;
  qty: number;
  onAdd: () => void;
}) {
  const cart = useCart();
  const disabled = !item.is_available;
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Money cents={item.price_cents} style={styles.itemPrice} bold />
        {disabled ? <Text style={styles.unavailable}>Unavailable</Text> : null}
      </View>
      {qty === 0 ? (
        <Button
          label="Add"
          variant="secondary"
          onPress={onAdd}
          disabled={disabled}
          style={styles.addBtn}
        />
      ) : (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => cart.setQty(item.id, qty - 1)}
            style={styles.stepperBtn}
            disabled={disabled}
          >
            <Text style={styles.stepperBtnTxt}>−</Text>
          </Pressable>
          <Text style={styles.stepperQty}>{qty}</Text>
          <Pressable
            onPress={() => cart.setQty(item.id, qty + 1)}
            style={styles.stepperBtn}
            disabled={disabled}
          >
            <Text style={styles.stepperBtnTxt}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  address: { marginTop: 4, fontSize: 13, color: '#6b7280' },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemDesc: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  itemPrice: { marginTop: 4, fontSize: 14, color: '#111827' },
  unavailable: { marginTop: 4, fontSize: 11, color: '#b91c1c' },
  addBtn: { paddingHorizontal: 14 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnTxt: { fontSize: 18, fontWeight: '600', color: '#1d4ed8' },
  stepperQty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
});