'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { requirementsMessage, sha256Bytes } from '@/lib/solana/hash';
import { MIN_REWARD_LAMPORTS, createTaskInstruction, taskPda } from '@/lib/solana/instructions';
import { sendInstructions } from '@/lib/solana/send';

const CATEGORIES = ['CODING', 'DESIGN', 'DOCS', 'BUG_FIX'] as const;
const LAMPORTS_PER_SOL = 1_000_000_000n;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function CreateBounty() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<string>('CODING');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [deadline, setDeadline] = useState('');
  const [reward, setReward] = useState('0.1');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!wallet.publicKey) {
      setError('Connect your wallet first.');
      return;
    }

    const criteriaList = criteria
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (criteriaList.length === 0) {
      setError('Add at least one acceptance criterion.');
      return;
    }

    if (criteriaList.length > 20) {
      setError('Use at most 20 acceptance criteria.');
      return;
    }

    const rewardLamports = BigInt(Math.round(Number(reward) * Number(LAMPORTS_PER_SOL)));

    if (rewardLamports < MIN_REWARD_LAMPORTS) {
      setError('The reward must be at least 0.05 SOL.');
      return;
    }

    const deadlineDate = new Date(deadline);

    if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
      setError('Choose a deadline in the future.');
      return;
    }

    setBusy(true);

    try {
      const session = await fetch('/api/auth/session', { cache: 'no-store' });
      const sessionData = await session.json();

      if (!session.ok || sessionData.wallet !== wallet.publicKey.toBase58()) {
        throw new Error('Sign in with your wallet first using the button in the header.');
      }

      const taskId = BigInt(Date.now());
      const task = taskPda(wallet.publicKey, taskId);
      const signature = await sendInstructions(connection, wallet, [
        createTaskInstruction({
          creator: wallet.publicKey,
          taskId,
          requirementsHash: await sha256Bytes(requirementsMessage(description, criteriaList)),
          rewardLamports,
          deadline: BigInt(Math.floor(deadlineDate.getTime() / 1000)),
        }),
      ]);

      setMessage('Escrow funded on Solana. Saving your bounty…');

      const response = await fetch('/api/bounties', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: task.toBase58(),
          title,
          summary,
          description,
          category,
          acceptanceCriteria: criteriaList,
          deadline: deadlineDate.toISOString(),
          rewardLamports: rewardLamports.toString(),
          txSignature: signature,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Could not save the bounty.');

      router.push(`/bounties/${task.toBase58()}`);
      router.refresh();
    } catch (submitError) {
      setError(describeError(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell" style={{ padding: '52px 0 90px' }}>
      <div className="mb-7">
        <h1 className="text-3xl font-extrabold">Post a bounty</h1>
        <p className="muted mt-2">Define the task, set the reward, and lock it in escrow.</p>
      </div>

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6">
        <form className="card p-6 md:p-8 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-semibold">
            Title
            <input
              className="field mt-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={5}
              maxLength={100}
              placeholder="e.g. Fix login redirect bug"
            />
          </label>

          <label className="block text-sm font-semibold">
            Short summary
            <input
              className="field mt-2"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
              minLength={5}
              maxLength={180}
              placeholder="A short description shown on the browse page"
            />
          </label>

          <div>
            <span className="text-sm font-semibold">Category</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setCategory(option)}
                  className="btn"
                  style={{
                    background: category === option ? 'var(--green-soft)' : 'var(--surface)',
                    color: category === option ? 'var(--green)' : 'var(--muted)',
                  }}
                >
                  {option.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold">
            Description
            <textarea
              className="field mt-2 min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              minLength={20}
              maxLength={10000}
              placeholder="Explain what needs to be done."
            />
          </label>

          <label className="block text-sm font-semibold">
            Acceptance criteria
            <textarea
              className="field mt-2 min-h-28"
              value={criteria}
              onChange={(event) => setCriteria(event.target.value)}
              required
              placeholder="One criterion per line"
            />
            <span className="muted text-xs">Each line becomes a separate review criterion.</span>
          </label>

          <label className="block text-sm font-semibold">
            Deadline
            <input
              type="datetime-local"
              className="field mt-2"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              required
              min={new Date(Date.now() + 3_600_000).toISOString().slice(0, 16)}
            />
          </label>

          <label className="block text-sm font-semibold">
            Reward (SOL)
            <input
              type="number"
              step="0.001"
              min="0.05"
              className="field mt-2"
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              required
            />
          </label>

          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Funding escrow…' : 'Create and fund bounty'}
          </button>

          {message && (
            <p role="status" className="text-sm rounded-xl p-4" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
              {message}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              {error}
            </p>
          )}
        </form>

        <aside className="card p-6 h-fit">
          <h2 className="font-bold text-xl">Summary</h2>
          <div className="flex justify-between mt-5 text-sm">
            <span className="muted">Reward</span>
            <strong>{Number(reward || 0)} SOL</strong>
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <span className="muted">Network</span>
            <strong>Devnet</strong>
          </div>
          <p className="muted text-sm leading-6 mt-5">
            The reward is locked in escrow when the bounty is created. If nobody is accepted by the deadline and there
            are no submissions, you can reclaim it.
          </p>
          <p className="muted text-xs mt-5">
            One winner takes the full reward. Submission contents are private to the contributor and bounty creator.
          </p>
          <Link href="/" className="block mt-5 text-sm" style={{ color: 'var(--green)' }}>
            Back to browse
          </Link>
        </aside>
      </div>
    </div>
  );
}
