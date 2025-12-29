export const ADMIN_EMAILS = [
  "investors@bermudafranchisegroup.com",
  "rciesco@gmail.com",
] as const;

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase().trim());
}
