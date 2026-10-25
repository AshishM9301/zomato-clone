// Tiny Button — primary, secondary, destructive variants. The customer
// app doesn't need a design system; this is just enough to avoid
// hand-rolled styling in every screen.

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#1d4ed8' : '#fff'} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'ghost' ? styles.labelGhost : styles.labelOnFill,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: { fontSize: 15, fontWeight: '600' },
  labelOnFill: { color: '#fff' },
  labelGhost: { color: '#1d4ed8' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});

const variantStyles: Record<Variant, ViewStyle> = StyleSheet.create({
  primary: { backgroundColor: '#1d4ed8' },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  destructive: { backgroundColor: '#b91c1c' },
  ghost: { backgroundColor: 'transparent' },
});