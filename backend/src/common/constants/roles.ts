export const ROLES = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  RIDER: 'rider',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: ReadonlyArray<Role> = Object.values(ROLES);