// Lightweight logger wrapper used by seed CLI and future services.
// Keeping logging centralized makes it easy to switch to Winston/Pino later without touching business code.
// For Feature 0 we primarily log bootstrap milestones (roles/admin/tags) to help operators audit startup.
// We intentionally avoid logging sensitive values such as plain admin passwords.
export const logger = {
  info: (message: string): void => {
    console.log(`[INFO] ${message}`);
  },
  warn: (message: string): void => {
    console.warn(`[WARN] ${message}`);
  },
  error: (message: string, error?: unknown): void => {
    console.error(`[ERROR] ${message}`, error);
  }
};
