export const USER_STORAGE_KEY = '@oraned_all_users';
export const AUTH_USER_KEY = '@AuthUser';

export const USER_NAME_KEY = '@user_name';
export const USER_EMAIL_KEY = '@user_email';

export function createUser(name, email, password) {
  return { name, email, password };
}

export function createAuthUser(name, email) {
  return { name, email };
}
