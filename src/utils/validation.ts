export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

export function cleanName(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

export function cleanEmail(v: string): string {
  return v.trim().toLowerCase();
}

export function validateName(v: string): string | null {
  const t = cleanName(v);
  if (!t) return "Name is required.";
  if (t.length < NAME_MIN)
    return `Name must be at least ${NAME_MIN} characters.`;
  if (t.length > NAME_MAX)
    return `Name must be ${NAME_MAX} characters or fewer.`;
  if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'’_-]*$/u.test(t)) {
    return "Use letters, numbers, spaces and . ' - _ only.";
  }
  return null;
}

export function validateEmail(v: string): string | null {
  const t = cleanEmail(v);
  if (!t) return "Email is required.";
  if (t.length > EMAIL_MAX) return "Email is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t))
    return "Enter a valid email address.";
  return null;
}

// Must match ALLOWED_EMAIL_DOMAINS on the backend (the backend is the real gatekeeper).
// Override with VITE_ALLOWED_EMAIL_DOMAINS in your frontend .env if you add domains.
const DOMAINS_RAW =
  (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS as string | undefined) ??
  "gmail.com,googlemail.com";
export const ALLOWED_EMAIL_DOMAINS = DOMAINS_RAW.split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function validateGoogleEmail(v: string): string | null {
  const base = validateEmail(v);
  if (base) return base;
  const domain = cleanEmail(v).split("@")[1];
  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return "Only Google (Gmail) accounts are supported. Please use your @gmail.com address.";
  }
  return null;
}
