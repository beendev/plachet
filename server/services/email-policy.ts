const DEFAULT_DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "tempmail.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "sharklasers.com",
  "maildrop.cc",
  "mintemail.com",
  "getnada.com",
  "temp-mail.org",
  "throwawaymail.com",
  "fakeinbox.com",
  "emailondeck.com",
  "mytemp.email",
]);

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function getEmailDomain(email: unknown) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) return "";
  return normalized.slice(atIndex + 1);
}

export function isDisposableEmailDomain(email: unknown, extraBlockedDomains: string[] = []) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  if (DEFAULT_DISPOSABLE_DOMAINS.has(domain)) return true;

  const normalizedExtra = extraBlockedDomains
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  return normalizedExtra.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

