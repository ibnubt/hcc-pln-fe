// Login statis sederhana (demo). Kredensial dibaca dari env di sisi server.
// Untuk produksi, ganti dengan SSO PLN / NextAuth.

export const AUTH_COOKIE = "hcc_auth";
export const AUTH_MAX_AGE = 60 * 60 * 8; // 8 jam

export function checkCredentials(username: string, password: string) {
  const U = process.env.DASHBOARD_USER ?? "admin";
  const P = process.env.DASHBOARD_PASS ?? "pln2026";
  return username.trim() === U && password === P;
}
