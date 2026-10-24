const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

function looksLikePlaceholder(value: string) {
  return (
    value.includes('YOUR_PROJECT_REF') ||
    value.includes('your-anon-public-key')
  );
}

export function getSupabaseConfigError(): string | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.';
  }

  if (looksLikePlaceholder(SUPABASE_URL) || looksLikePlaceholder(SUPABASE_PUBLISHABLE_KEY)) {
    return 'Supabase env values are still placeholders in .env.';
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)) {
    return 'VITE_SUPABASE_URL is invalid. It should look like https://<project-ref>.supabase.co';
  }

  return null;
}

export function getFriendlySupabaseErrorMessage(error: unknown, fallback: string): string {
  const configError = getSupabaseConfigError();
  if (configError) {
    return import.meta.env.DEV ? `${configError} Restart \`npm run dev\` after updating .env.` : fallback;
  }

  const message =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message || '')
        : '';

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return import.meta.env.DEV
      ? 'Could not reach Supabase. Check your internet/VPN, then verify .env values and restart `npm run dev`.'
      : 'Could not connect. Check your internet connection and try again.';
  }

  return message || fallback;
}
