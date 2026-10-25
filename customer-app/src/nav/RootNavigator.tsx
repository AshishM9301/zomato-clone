// Root navigator — switches between Auth stack and App tabs based on the
// auth context. While bootstrapping, shows a tiny spinner so we don't
// flicker through Login.

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { state } = useAuth();
  return (
    <NavigationContainer>
      {state.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {state.status === 'authenticated' ? (
            <Stack.Screen name="App" component={AppTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});