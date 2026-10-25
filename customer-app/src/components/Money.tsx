import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { formatMoney } from '../format';

export function Money({
  cents,
  style,
  bold,
}: {
  cents: number;
  style?: StyleProp<TextStyle>;
  bold?: boolean;
}) {
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, bold ? { fontWeight: '600' } : null, style]}>
      {formatMoney(cents)}
    </Text>
  );
}