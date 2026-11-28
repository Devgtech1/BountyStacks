import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { lamportsToSol, shortWallet } from '@/lib/format';
import { BountyActions } from '@/components/bounty/bounty-actions';

export const dynamic = 'force-dynamic';

export default async function BountyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bounty = await db.bounty.findUnique({ where: { id } }).catch(() => null);

  if (!bounty) notFound();

  const criteria = Array.isArray(bounty.acceptanceCriteria)
    ? (bounty.acceptanceCriteria as string[])
    : [];

  return (
    <div className="shell" style={{ padding: '48px 0 90px' }}>
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6">
        <section className="space-y-4">
          <span className="text-xs font-bold" style={{ color: 'var(--green)' }}>
            {bounty.category.replace('_', ' ')}
          </span>
          <h1 className="text-3xl font-extrabold">{bounty.title}</h1>

          <div className="card p-6">
            <h2 className="font-bold">Description</h2>
            <p className="muted text-sm leading-7 mt-3 whitespace-pre-wrap">{bounty.description}</p>
          </div>

          <div className="card p-6">
            <h2 className="font-bold">Acceptance criteria</h2>
            <ol className="list-decimal ml-5 mt-3 space-y-2 text-sm muted">
              {criteria.map((criterion, index) => (
                <li key={index}>{criterion}</li>
              ))}
            </ol>
          </div>

          <div className="card p-6">
            <h2 className="font-bold">Rules</h2>
            <p className="muted text-sm leading-7 mt-3">
              One accepted submission per task. Only the creator can accept. If the deadline passes with no
              submissions, the creator may reclaim the reward. If contributors have submitted work, escrow remains
              locked pending the dispute process.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card p-6">
            <span className="muted text-sm">Reward</span>
            <div className="text-3xl font-extrabold mt-2">{lamportsToSol(bounty.rewardLamports)} SOL</div>
            <p className="muted text-xs mt-2">Creator: {shortWallet(bounty.creatorWallet)}</p>
            <p className="muted text-xs mt-2">Deadline: {bounty.deadline.toLocaleString()}</p>
            <p className="muted text-xs mt-2">{bounty.submissionCount} submissions so far</p>
            <p className="font-semibold text-sm mt-4">One winner takes the full reward.</p>
          </div>

          <BountyActions
            bounty={{
              id: bounty.id,
              creatorWallet: bounty.creatorWallet,
              deadline: bounty.deadline.toISOString(),
              submissionCount: bounty.submissionCount,
              status: bounty.status,
              criteria,
            }}
          />

          <div className="card p-6">
            <h2 className="font-bold">Completion record</h2>
            <p className="muted text-sm mt-2">Created when the creator accepts a submission.</p>
            <Link href={`/verify?bountyId=${bounty.id}`} className="btn btn-secondary w-full mt-4">
              Verify on Solana
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
