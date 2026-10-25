// JWT storage. Uses react-native-keychain (Android Keystore-backed) so the
// token isn't readable by other apps. Same keychain entry on every install
// (so uninstall+reinstall doesn't keep the old token, since keychain wipes
// with the app's data).

import * as Keychain from 'react-native-keychain';

const SERVICE = 'zc.customer.token';
const USERNAME = 'jwt';

let cachedToken: string | null = null;

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await Keychain.setGenericPassword(USERNAME, token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) return null;
  cachedToken = creds.password;
  return cachedToken;
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // ignore — already cleared
  }
}
