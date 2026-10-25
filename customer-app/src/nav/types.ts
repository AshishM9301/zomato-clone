// Nav types. Keeping param lists in one file so any screen can import
// them and TypeScript catches typos.

import type { NavigatorScreenParams } from '@react-navigation/native';

// Auth stack — only Login at the moment.
export type AuthStackParamList = {
  Login: undefined;
};

// App stack — bottom tabs + a stack of detail screens accessible from any tab.
export type BrowseStackParamList = {
  RestaurantList: undefined;
  RestaurantDetail: { restaurantId: string };
};

export type CartStackParamList = {
  Cart: undefined;
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type AppTabsParamList = {
  BrowseTab: NavigatorScreenParams<BrowseStackParamList>;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabsParamList>;
};