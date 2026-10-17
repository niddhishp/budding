import { POLICY_VERSION } from './consent';

export const ADMIN_ROLES = ['owner', 'operations', 'therapist', 'content_reviewer'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
export type AdminSession = { role: AdminRole; aal: string };

export function hasCurrentConsent(version: unknown) {
  return version === POLICY_VERSION;
}

export function parseAdminSession(value: unknown): AdminSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Record<string, unknown>;
  if (!ADMIN_ROLES.includes(session.role as AdminRole) || !['aal1', 'aal2'].includes(String(session.aal))) return null;
  return { role: session.role as AdminRole, aal: String(session.aal) };
}

export function canManageStaff(session: AdminSession | null) {
  return session?.role === 'owner' && session.aal === 'aal2';
}

/** Cookie-authenticated admin writes must originate from this exact origin. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    // Next can normalize the internal URL to localhost while preserving the
    // browser's Host (e.g. 127.0.0.1). Do not trust arbitrary forwarded hosts.
    const host = request.headers.get('host') ?? target.host;
    return source.host === host && source.protocol === target.protocol;
  } catch { return false; }
}
