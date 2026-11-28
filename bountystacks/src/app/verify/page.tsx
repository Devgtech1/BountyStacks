'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ShieldCheck } from 'lucide-react';

type CompletionRecord = {
  bountyId: string;
  title: string;
  creator: string;
  winner: string;
  rewardLamports: string;
  signature: string;
  completedAt: string;
  requirementsHash: string;
};

function VerifyForm() {
  const searchParams = useSearchParams();
  const [id, setId] = useState(searchParams.get('bountyId') ?? '');
  const [record, setRecord] = useState<CompletionRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = useCallback(async (bountyId: string) => {
    if (!bountyId) return;
    setBusy(true);
    setError('');
    setRecord(null);

    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(bountyId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No completion record found.');
      setRecord(data);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Verification unavailable.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const initial = searchParams.get('bountyId');
    if (initial) void verify(initial);
  }, [searchParams, verify]);

  return (
    <div className="shell" style={{ maxWidth: 760, padding: '75px 0 110px' }}>
      <div className="text-center">
        <div className="mx-auto mb-5 rounded-2xl grid place-items-center" style={{ width: 54, height: 54, background: 'var(--green-soft)', color: 'var(--green)' }}>
          <ShieldCheck />
        </div>
        <h1 className="text-3xl font-extrabold">Verify a completion</h1>
        <p className="muted mt-3">Enter a bounty ID to check its on-chain completion record.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verify(id);
        }}
        className="flex flex-col sm:flex-row gap-3 mt-8"
      >
        <input
          className="field flex-1"
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder="Bounty ID"
          required
        />
        <button className="btn btn-primary" disabled={busy}>
          <Search size={16} />
          {busy ? 'Checking…' : 'Verify'}
        </button>
      </form>

      {error && <div className="card p-5 mt-5 text-sm">{error}</div>}

      {record && (
        <div className="card p-6 mt-5 space-y-3 text-sm">
          <p className="font-bold text-base">{record.title}</p>
          <div className="grid sm:grid-cols-[140px_1fr] gap-2">
            <span className="muted">Winner</span>
            <span className="break-all">{record.winner}</span>
            <span className="muted">Creator</span>
            <span className="break-all">{record.creator}</span>
            <span className="muted">Reward</span>
            <span>{(Number(record.rewardLamports) / 1e9).toFixed(3)} SOL</span>
            <span className="muted">Completed</span>
            <span>{new Date(record.completedAt).toLocaleString()}</span>
            <span className="muted">Requirements hash</span>
            <span className="break-all">{record.requirementsHash}</span>
          </div>
          <a
            className="inline-block pt-2 font-semibold"
            style={{ color: 'var(--green)' }}
            href={`https://explorer.solana.com/tx/${record.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View the settlement transaction on Solana Explorer
          </a>
        </div>
      )}

      <p className="muted text-xs mt-5 text-center">
        Verification reads the public Solana record. Private submissions are never displayed here.
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="shell" style={{ padding: '75px 0' }}>Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
