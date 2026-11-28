'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { shortWallet } from '@/lib/format';

/** Fired after wallet sign-in or sign-out so data views can refresh. */
export const AUTH_EVENT = 'bountystacks:auth';

export function ConnectButton() {
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean; wallet?: string }) => {
        if (cancelled) return;
        setAuthenticated(
          Boolean(connected && data.authenticated && publicKey && data.wallet === publicKey.toBase58())
        );
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey]);

  async function signIn() {
    if (!publicKey || !signMessage) return;

    setBusy(true);

    try {
      const wallet = publicKey.toBase58();
      const challenge = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet }),
      }).then((response) => response.json());

      if (!challenge.message) throw new Error(challenge.error || 'Could not create a sign-in challenge');

      const signature = await signMessage(new TextEncoder().encode(challenge.message));
      const result = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          wallet,
          message: challenge.message,
          signature: (await import('bs58')).default.encode(signature),
        }),
      });

      if (!result.ok) throw new Error((await result.json()).error || 'Wallet verification failed');

      setAuthenticated(true);
      window.dispatchEvent(new Event(AUTH_EVENT));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Wallet sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    window.dispatchEvent(new Event(AUTH_EVENT));
    await disconnect();
  }

  if (!connected) {
    return (
      <button className="btn btn-primary" onClick={() => setVisible(true)}>
        Connect wallet
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn btn-primary" disabled={busy} onClick={signIn}>
        {busy ? 'Signing…' : `Sign in · ${shortWallet(publicKey!.toBase58())}`}
      </button>
    );
  }

  return (
    <button className="btn btn-secondary" onClick={signOut}>
      {shortWallet(publicKey!.toBase58())} · Sign out
    </button>
  );
}
