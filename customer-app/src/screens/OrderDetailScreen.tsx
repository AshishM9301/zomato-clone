// OrderDetailScreen — live order status, polled every 5s. Cancel button
// appears only when status is `placed`. Cancel asks for a reason (Alert +
// TextInput; we use a tiny inline Modal so we can capture the reason
// without a full-screen flow).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { cancelOrder, getOrder } from '../api/orders';
import { ApiError } from '../api/errors';
import { Button } from '../components/Button';
import { EmptyState, ErrorState } from '../components/States';
import { Money } from '../components/Money';
import { StatusPill } from '../components/StatusPill';
import { formatDateTime, truncateId } from '../format';
import { cancelReasonSchema } from '../auth/schema';
import type { OrdersStackParamList } from '../nav/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderDetail'>;

export function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const query = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    refetchInterval: 5_000,
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId, reason.trim()),
    onSuccess: () => {
      setCancelOpen(false);
      setReason('');
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Order cancelled', 'The merchant has been notified.');
    },
    onError: (err) => {
      Alert.alert(
        'Could not cancel',
        err instanceof ApiError ? err.message : 'Network error',
      );
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (query.isError) {
    return (
      <ErrorState error={query.error} onRetry={() => query.refetch()} />
    );
  }
  if (!query.data) {
    return <EmptyState title="Order not found" />;
  }

  const { order, items } = query.data;
  const canCancel = order.status === 'placed';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.id}>{truncateId(order.id)}</Text>
          <StatusPill status={order.status} />
        </View>
        <Text style={styles.timestamps}>
          Placed {formatDateTime(order.created_at)}
          {order.updated_at && order.updated_at !== order.created_at
            ? ` · Updated ${formatDateTime(order.updated_at)}`
            : ''}
        </Text>

        <Text style={styles.section}>Items</Text>
        {items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {it.qty} × {it.name_snapshot}
            </Text>
            <Money cents={it.unit_price_cents * it.qty} />
          </View>
        ))}

        <View style={styles.totals}>
          <Row label="Subtotal" cents={order.subtotal_cents} />
          <Row label="Delivery fee" cents={order.delivery_fee_cents} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Money cents={order.total_cents} bold style={styles.totalAmount} />
          </View>
        </View>

        <Text style={styles.section}>Delivery</Text>
        <Text style={styles.address}>{order.address}</Text>
        {order.notes ? <Text style={styles.notes}>Notes: {order.notes}</Text> : null}
        {order.cancellation_reason ? (
          <Text style={styles.cancelReason}>
            Cancel reason: {order.cancellation_reason}
          </Text>
        ) : null}

        {canCancel ? (
          <Button
            label="Cancel order"
            variant="destructive"
            onPress={() => setCancelOpen(true)}
            style={{ marginTop: 24 }}
          />
        ) : null}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={cancelOpen}
        onRequestClose={() => setCancelOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel this order?</Text>
            <Text style={styles.modalDesc}>
              Tell the merchant why. This can't be undone.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason"
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={setReason}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setCancelOpen(false);
                  setReason('');
                }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelTxt}>Keep order</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const parsed = cancelReasonSchema.safeParse(reason.trim());
                  if (!parsed.success) {
                    Alert.alert('Reason required', parsed.error.issues[0]?.message ?? 'Please give a reason.');
                    return;
                  }
                  cancel.mutate();
                }}
                style={[
                  styles.modalConfirmBtn,
                  cancel.isPending ? styles.modalConfirmBtnDisabled : null,
                ]}
                disabled={cancel.isPending}
              >
                <Text style={styles.modalConfirmTxt}>
                  {cancel.isPending ? 'Cancelling...' : 'Cancel order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { fontFamily: 'monospace', fontSize: 16, color: '#111827' },
  timestamps: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  section: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: { fontSize: 14, color: '#111827' },
  totals: { marginTop: 12 },
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
  address: { fontSize: 14, color: '#111827' },
  notes: { marginTop: 4, fontSize: 13, color: '#6b7280' },
  cancelReason: { marginTop: 4, fontSize: 13, color: '#b91c1c' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalDesc: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  modalInput: {
    marginTop: 12,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  modalCancelTxt: { color: '#374151', fontWeight: '600' },
  modalConfirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
  },
  modalConfirmBtnDisabled: { opacity: 0.5 },
  modalConfirmTxt: { color: '#fff', fontWeight: '600' },
});