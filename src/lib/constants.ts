export const SESSION_COOKIE = "pages_session";
export const ROLE_COOKIE = "pages_role";
export const REF_COOKIE = "pages_ref";
export const SESSION_SECONDS = 60 * 60 * 24 * 14;
export const REF_COOKIE_SECONDS = 60 * 60 * 24 * 60;

export type AccountRole = "admin" | "user";

export const LIMITS = {
  pageName: 60,
  welcome: 240,
  givenName: 40,
  message: 2000,
  staffName: 80,
  password: 72,
  avatarMaxEdge: 1024,
  avatarTargetBytes: 1024 * 1024,
  avatarBytes: 8 * 1024 * 1024,
} as const;
