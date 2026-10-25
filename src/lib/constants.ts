export const SESSION_COOKIE = "pages_session";
export const ROLE_COOKIE = "pages_role";
export const SESSION_SECONDS = 60 * 60 * 24 * 14;

export type AccountRole = "admin" | "user";

export const LIMITS = {
  pageName: 60,
  welcome: 240,
  visitorName: 40,
  message: 2000,
  staffName: 40,
  password: 72,
  avatarMaxEdge: 1024,
  avatarTargetBytes: 1024 * 1024,
  avatarBytes: 8 * 1024 * 1024,
} as const;
