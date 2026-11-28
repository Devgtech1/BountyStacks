'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { acceptSubmissionInstruction } from '@/lib/solana/instructions';
import { sendInstructions } from '@/lib/solana/send';

type Submission = {
  id: string;
  bountyId: string;
  bountyTitle: string;
  creatorWallet: string;
  bountyStatus: string;
  rewardLamports: string;
  deadline: string;
  contributorWallet: string;
  status: string;
  content: string;
  contentHash: string;
  submittedAt: string;
  reviewerNote: string | null;
  criteria: string[];
  viewer: 'creator' | 'contributor';
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function ReviewSubmission() {
  const { id } = useParams<{ id: string }>();
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/submissions/${id}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load the submission.');
        if (cancelled) return;
        setSubmission(data);
        setChecked(new Array(data.criteria.length).fill(false));
      })
      .catch((loadError) => {
        if (!cancelled) setError(describeError(loadError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const allChecked = useMemo(
    () => submission !== null && checked.length === submission.criteria.length && checked.every(Boolean),
    [checked, submission]
  );

  async function accept() {
    setError('');
    setMessage('');

    if (!submission) return;
    if (!wallet.publicKey) {
      setError('Connect your wallet first.');
      return;
    }
    if (!allChecked) {
      setError('Confirm every acceptance criterion before accepting.');
      return;
    }

    setBusy(true);

    try {
      const task = new PublicKey(submission.bountyId);
      const signature = await sendInstructions(connection, wallet, [
        acceptSubmissionInstruction({
          creator: wallet.publicKey,
          task,
          winner: new PublicKey(submission.contributorWallet),
        }),
      ]);

      const response = await fetch(`/api/submissions/${submission.id}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ txSignature: signature, checkedCriteria: checked }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Could not record the acceptance.');

      setMessage(`Reward released on Solana: ${signature.slice(0, 12)}…`);
      router.refresh();
    } catch (acceptError) {
      setError(describeError(acceptError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell" style={{ padding: '50px 0 90px' }}>
      <Link href="/dashboard/creator" className="muted text-sm">
        Back to dashboard
      </Link>

      <h1 className="text-3xl font-extrabold mt-5">Review submission</h1>

      {loading && <p className="muted mt-3">Loading submission…</p>}

      {error && (
        <div className="card p-5 mt-6 text-sm" role="alert">
          {error}
        </div>
      )}

      {submission && (
        <>
          <p className="muted mt-2">{submission.bountyTitle}</p>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 mt-7">
            <section className="space-y-4">
              <div className="card p-6">
                <h2 className="font-bold">Submitted work</h2>
                <pre className="muted text-sm leading-7 mt-3 whitespace-pre-wrap font-sans">{submission.content}</pre>
              </div>

              <div className="card p-6">
                <h2 className="font-bold">Integrity</h2>
                <p className="muted text-xs mt-3 break-all">SHA-256: {submission.contentHash}</p>
                <p className="muted text-xs mt-2">Submitted {new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="card p-6">
                <h2 className="font-bold">Acceptance checklist</h2>
                <p className="muted text-xs mt-2">
                  Confirm each published criterion before releasing the reward.
                </p>

                <div className="space-y-3 mt-4">
                  {submission.criteria.map((criterion, index) => (
                    <label key={index} className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked[index] ?? false}
                        disabled={submission.viewer !== 'creator' || submission.status !== 'SUBMITTED'}
                        onChange={(event) =>
                          setChecked((current) => {
                            const next = [...current];
                            next[index] = event.target.checked;
                            return next;
                          })
                        }
                      />
                      <span>{criterion}</span>
                    </label>
                  ))}
                </div>

                {submission.viewer === 'creator' && submission.status === 'SUBMITTED' && (
                  <button className="btn btn-primary w-full mt-5" onClick={accept} disabled={busy || !allChecked}>
                    {busy ? 'Releasing reward…' : 'Accept and pay contributor'}
                  </button>
                )}

                {submission.viewer !== 'creator' && (
                  <p className="muted text-xs mt-4">Only the bounty creator can accept this submission.</p>
                )}

                {submission.status !== 'SUBMITTED' && (
                  <p className="muted text-xs mt-4">This submission is {submission.status.toLowerCase()}.</p>
                )}

                {message && (
                  <p role="status" className="text-sm rounded-xl p-4 mt-4" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                    {message}
                  </p>
                )}
              </div>

              <div className="card p-6">
                <h2 className="font-bold">Contributor</h2>
                <p className="muted text-xs mt-2 break-all">{submission.contributorWallet}</p>
                <Link href={`/bounties/${submission.bountyId}`} className="text-sm inline-block mt-3" style={{ color: 'var(--green)' }}>
                  View bounty
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
