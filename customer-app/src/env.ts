// Env access. react-native-config reads .env at build time and exposes values
// via NativeModules.RNCConfig. We wrap it in a typed module so call sites
// never see `any`.

import Config from 'react-native-config';

export const env = {
  apiBaseUrl: Config.API_BASE_URL ?? 'http://10.0.2.2:4000/api/v1',
} as const;
