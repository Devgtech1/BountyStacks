'use client';

import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import { sha256Bytes } from '@/lib/solana/hash';
import { refundExpiredTaskInstruction, submitSolutionInstruction } from '@/lib/solana/instructions';
import { sendInstructions } from '@/lib/solana/send';

export type BountyActionsData = {
  id: string;
  creatorWallet: string;
  deadline: string;
  submissionCount: number;
  status: string;
  criteria: string[];
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function BountyActions({ bounty }: { bounty: BountyActionsData }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const walletAddress = wallet.publicKey?.toBase58() ?? '';
  const isCreator = walletAddress === bounty.creatorWallet;
  const isOpen = bounty.status === 'OPEN';
  const deadlinePassed = now > 0 && now > new Date(bounty.deadline).getTime();
  const canRefund = isCreator && isOpen && deadlinePassed && bounty.submissionCount === 0;

  async function submitSolution(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!wallet.publicKey) {
      setError('Connect your wallet first.');
      return;
    }

    if (content.trim().length < 20) {
      setError('Describe your solution in at least 20 characters.');
      return;
    }

    setBusy(true);

    try {
      const task = new PublicKey(bounty.id);
      const signature = await sendInstructions(connection, wallet, [
        submitSolutionInstruction({
          submitter: wallet.publicKey,
          task,
          solutionHash: await sha256Bytes(content),
        }),
      ]);

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bountyId: bounty.id, content, txSignature: signature }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Could not record the submission.');

      setContent('');
      setMessage(`Submission confirmed on Solana: ${signature.slice(0, 12)}…`);
      router.refresh();
    } catch (submitError) {
      setError(describeError(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function reclaimEscrow() {
    setError('');
    setMessage('');

    if (!wallet.publicKey) {
      setError('Connect your wallet first.');
      return;
    }

    setBusy(true);

    try {
      const task = new PublicKey(bounty.id);
      const signature = await sendInstructions(connection, wallet, [
        refundExpiredTaskInstruction({ creator: wallet.publicKey, task }),
      ]);

      const response = await fetch(`/api/bounties/${bounty.id}/refund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txSignature: signature }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Could not record the refund.');

      setMessage(`Escrow refunded on Solana: ${signature.slice(0, 12)}…`);
      router.refresh();
    } catch (refundError) {
      setError(describeError(refundError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold">Submit a solution</h2>
      <p className="muted text-sm mt-2">Only you and the creator can see your submission.</p>

      {!wallet.connected && (
        <p className="muted text-sm mt-4">Connect your wallet from the header to take part.</p>
      )}

      {wallet.connected && isCreator && (
        <div className="mt-4 space-y-3">
          <p className="muted text-sm">
            You are the creator of this bounty. Contributors submit the work; you review and accept one winner.
          </p>
          {canRefund ? (
            <>
              <p className="muted text-xs">
                The deadline has passed with no submissions, so you can reclaim the escrowed reward.
              </p>
              <button type="button" className="btn btn-secondary w-full" onClick={reclaimEscrow} disabled={busy}>
                {busy ? 'Reclaiming…' : 'Reclaim escrow'}
              </button>
            </>
          ) : (
            <p className="muted text-xs">
              Escrow can only be reclaimed after the deadline when no submissions exist.
            </p>
          )}
        </div>
      )}

      {wallet.connected && !isCreator && !isOpen && (
        <p className="muted text-sm mt-4">This bounty is {bounty.status.toLowerCase()} and no longer accepts submissions.</p>
      )}

      {wallet.connected && !isCreator && isOpen && deadlinePassed && (
        <p className="muted text-sm mt-4">The submission deadline has passed.</p>
      )}

      {wallet.connected && !isCreator && isOpen && !deadlinePassed && (
        <form className="space-y-4 mt-4" onSubmit={submitSolution}>
          <label className="block text-sm font-semibold">
            Your solution
            <textarea
              className="field mt-2 min-h-32"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste your work, links, or a clear description of what you delivered."
              required
              minLength={20}
              maxLength={20000}
            />
          </label>
          <p className="muted text-xs">
            Your submission is encrypted before storage. Only its SHA-256 hash is recorded on-chain.
          </p>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Submitting…' : 'Encrypt and submit'}
          </button>
          <p className="muted text-xs">Sign in with your wallet in the header first if the submission is rejected.</p>
        </form>
      )}

      {message && (
        <p role="status" className="text-sm rounded-xl p-4 mt-4" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm rounded-xl p-4 mt-4" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
