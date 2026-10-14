// Password-reset links must end on /auth/reset-password. Supabase only honours the
// requested redirect when it matches the project's allow-list; otherwise it sends the
// user to the Site URL (the home page), where the recovery token would silently sign
// them in without ever asking for a new password.
//
// This module is imported first in main.tsx, before the Supabase client exists, so it
// can move a recovery link to the reset page while the token is still in the URL.
// The reset page then lets the client pick the token up as usual.

export const RESET_PASSWORD_PATH = '/auth/reset-password';

export function isRecoveryUrl(hash: string, search: string): boolean {
  return /(^|[#&?])type=recovery(&|$)/.test(hash) || /(^|[?&])type=recovery(&|$)/.test(search);
}

if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location;
  if (pathname !== RESET_PASSWORD_PATH && isRecoveryUrl(hash, search)) {
    window.history.replaceState(null, '', `${RESET_PASSWORD_PATH}${search}${hash}`);
  }
}
