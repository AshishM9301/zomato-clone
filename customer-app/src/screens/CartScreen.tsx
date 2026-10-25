// CartScreen — review items, enter address, place order. On success,
// clears the cart and pushes the user to the new order's detail screen.

import React, { useMemo } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createOrder } from '../api/orders';
import { ApiError } from '../api/errors';
import { useCart } from '../state/cart';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Money } from '../components/Money';
import type { OrdersStackParamList } from '../nav/types';

// Flat delivery fee — server also adds it, but we display it here so the
// user sees the total before submitting. See backend/src/modules/orders/
// orders.service.ts.
const DELIVERY_FEE_CENTS = 3000;

export function CartScreen() {
  const cart = useCart();
  const qc = useQueryClient();
  const navigation = useNavigation<
    NativeStackNavigationProp<OrdersStackParamList, 'OrdersList'>
  >();
  const [address, setAddress] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const totalCents = useMemo(
    () => cart.subtotalCents + DELIVERY_FEE_CENTS,
    [cart.subtotalCents],
  );

  const place = useMutation({
    mutationFn: () =>
      createOrder({
        restaurant_id: cart.restaurantId!,
        items: cart.items.map((l) => ({
          menu_item_id: l.menu_item_id,
          qty: l.qty,
        })),
        address: address.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: ({ order }) => {
      cart.clear();
      setAddress('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['orders'] });
      // Switch to the Orders tab and push the detail screen.
      navigation
        .getParent()
        ?.navigate('OrdersTab', {
          screen: 'OrderDetail',
          params: { orderId: order.id },
        } as never);
    },
    onError: (err) => {
      Alert.alert(
        'Could not place order',
        err instanceof ApiError ? err.message : 'Network error',
      );
    },
  });

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add items from a restaurant to get started."
      />
    );
  }

  const canPlace = address.trim().length > 0 && !place.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Items</Text>
        {cart.items.map((line) => (
          <View key={line.menu_item_id} style={styles.line}>
            <View style={styles.lineText}>
              <Text style={styles.lineName}>
                {line.qty} × {line.name_snapshot}
              </Text>
              <Money
                cents={line.unit_price_cents * line.qty}
                style={styles.lineSubtotal}
              />
            </View>
            <View style={styles.lineQty}>
              <Button
                label="−"
                variant="secondary"
                onPress={() => cart.setQty(line.menu_item_id, line.qty - 1)}
                style={styles.qtyBtn}
              />
              <Text style={styles.qtyTxt}>{line.qty}</Text>
              <Button
                label="+"
                variant="secondary"
                onPress={() => cart.setQty(line.menu_item_id, line.qty + 1)}
                style={styles.qtyBtn}
              />
            </View>
          </View>
        ))}

        <Text style={styles.section}>Delivery details</Text>
        <TextInput
          style={styles.input}
          placeholder="Delivery address"
          placeholderTextColor="#9ca3af"
          value={address}
          onChangeText={setAddress}
          multiline
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Notes for the restaurant (optional)"
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={styles.totals}>
          <Row label="Subtotal" cents={cart.subtotalCents} />
          <Row label="Delivery fee" cents={DELIVERY_FEE_CENTS} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Money cents={totalCents} bold style={styles.totalAmount} />
          </View>
        </View>

        <Button
          label={place.isPending ? 'Placing order...' : 'Place order'}
          onPress={() => place.mutate()}
          disabled={!canPlace}
          loading={place.isPending}
          style={{ marginTop: 16 }}
        />
        <Button
          label="Clear cart"
          variant="ghost"
          onPress={() => {
            cart.clear();
            setAddress('');
            setNotes('');
          }}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <View style={styles.subRow}>
      <Text style={styles.subLabel}>{label}</Text>
      <Money cents={cents} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, paddingBottom: 32 },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineText: { flex: 1 },
  lineName: { fontSize: 14, color: '#111827' },
  lineSubtotal: { marginTop: 2, fontSize: 13, color: '#6b7280' },
  lineQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, paddingHorizontal: 0 },
  qtyTxt: { minWidth: 20, textAlign: 'center', fontWeight: '600' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  totals: { marginTop: 16 },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  subLabel: { fontSize: 14, color: '#374151' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  totalAmount: { fontSize: 16, color: '#111827' },
});