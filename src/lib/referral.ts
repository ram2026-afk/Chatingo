export const REFERRAL_STORAGE = "chat-in-go-ref";

export function cleanReferralCode(value: unknown) {
  if (typeof value !== "string") return "";
  const code = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (code.length < 6 || code.length > 32) return "";
  return code;
}

export function referralCodeFromUserId(userId: string) {
  return userId.replace(/-/g, "").toLowerCase();
}

export function userIdFromReferralCode(value: unknown) {
  const code = cleanReferralCode(value);
  if (!/^[a-f0-9]{32}$/.test(code)) return "";
  return [
    code.slice(0, 8),
    code.slice(8, 12),
    code.slice(12, 16),
    code.slice(16, 20),
    code.slice(20),
  ].join("-");
}

export function saveClientReferral(value: unknown) {
  const code = cleanReferralCode(value);
  if (!code || typeof window === "undefined") return "";
  try {
    window.localStorage.setItem(REFERRAL_STORAGE, code);
  } catch {
    return code;
  }
  return code;
}

export function readClientReferral() {
  if (typeof window === "undefined") return "";
  try {
    return cleanReferralCode(window.localStorage.getItem(REFERRAL_STORAGE) ?? "");
  } catch {
    return "";
  }
}
