// App shell — three tabs (Browse / Cart / Orders). Each tab is its own
// native stack so detail screens push within the tab.

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RestaurantListScreen } from '../screens/RestaurantListScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { OrdersListScreen } from '../screens/OrdersListScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { useCart } from '../state/cart';
import type {
  AppTabsParamList,
  BrowseStackParamList,
  CartStackParamList,
  OrdersStackParamList,
} from './types';

const Tabs = createBottomTabNavigator<AppTabsParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

function BrowseStackNav() {
  return (
    <BrowseStack.Navigator>
      <BrowseStack.Screen
        name="RestaurantList"
        component={RestaurantListScreen}
        options={{ title: 'Browse' }}
      />
      <BrowseStack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={{ title: 'Menu' }}
      />
    </BrowseStack.Navigator>
  );
}

function CartStackNav() {
  return (
    <CartStack.Navigator>
      <CartStack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'Cart' }}
      />
    </CartStack.Navigator>
  );
}

function OrdersStackNav() {
  return (
    <OrdersStack.Navigator>
      <OrdersStack.Screen
        name="OrdersList"
        component={OrdersListScreen}
        options={{ title: 'My orders' }}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order' }}
      />
    </OrdersStack.Navigator>
  );
}

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
  );
}

export function AppTabs() {
  const cartCount = useCart().count;
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1d4ed8',
      }}
    >
      <Tabs.Screen
        name="BrowseTab"
        component={BrowseStackNav}
        options={{
          title: 'Browse',
          tabBarIcon: ({ focused }) => <TabIcon glyph="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="CartTab"
        component={CartStackNav}
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ focused }) => <TabIcon glyph="🛒" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="OrdersTab"
        component={OrdersStackNav}
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => <TabIcon glyph="📦" focused={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}