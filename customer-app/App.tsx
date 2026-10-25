/**
 * Zomato Customer — App root.
 *
 * Providers (outer → inner):
 *   SafeAreaProvider  — notch + system bar padding
 *   QueryClientProvider — TanStack Query
 *   AuthProvider       — phone+OTP session
 *   CartProvider       — single-restaurant cart, persisted to AsyncStorage
 *
 * RootNavigator switches between AuthStack (Login) and AppTabs based on
 * the auth state.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from './src/state/queryClient';
import { AuthProvider } from './src/auth/AuthContext';
import { CartProvider } from './src/state/cart';
import { RootNavigator } from './src/nav/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;