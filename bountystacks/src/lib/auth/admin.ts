import { getSession } from '@/lib/auth/session';

/** Admin wallets are configured server-side; never expose this allowlist to the browser. */
export function configuredAdminWallets(): string[] {
  return (process.env.ADMIN_WALLET_ADDRESSES ?? '')
    .split(',')
    .map((wallet) => wallet.trim())
    .filter(Boolean);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return { ok: false as const, status: 401, error: 'Wallet sign-in required.' };
  if (!configuredAdminWallets().includes(session.wallet)) {
    return { ok: false as const, status: 403, error: 'Administrator access required.' };
  }
  return { ok: true as const, wallet: session.wallet };
}
