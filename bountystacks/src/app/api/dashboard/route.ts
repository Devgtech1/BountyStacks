import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Wallet sign-in required.' }, { status: 401 });
  try {
    const [created, submitted, won, earned, pending] = await Promise.all([
      db.bounty.findMany({ where: { creatorWallet: session.wallet }, orderBy: { createdAt: 'desc' }, take: 50, include: { _count: { select: { submissions: true } } } }),
      db.submission.findMany({ where: { contributorWallet: session.wallet }, orderBy: { submittedAt: 'desc' }, take: 50, include: { bounty: { select: { id: true, title: true, rewardLamports: true, status: true, deadline: true } } } }),
      db.completion.findMany({ where: { winnerWallet: session.wallet }, orderBy: { completedAt: 'desc' }, include: { bounty: { select: { id: true, title: true } } } }),
      db.completion.aggregate({ where: { winnerWallet: session.wallet }, _sum: { rewardLamports: true }, _count: true }),
      db.submission.count({ where: { contributorWallet: session.wallet, status: 'SUBMITTED' } }),
    ]);
    const review = await db.submission.findMany({ where: { bounty: { creatorWallet: session.wallet }, status: 'SUBMITTED' }, orderBy: { submittedAt: 'asc' }, take: 100, select: { id: true, bountyId: true, contributorWallet: true, submittedAt: true, bounty: { select: { title: true } } } });
    return NextResponse.json({
      wallet: session.wallet,
      creator: { bounties: created.map((b) => ({ id: b.id, title: b.title, category: b.category, status: b.status, rewardLamports: b.rewardLamports.toString(), deadline: b.deadline.toISOString(), submissions: b._count.submissions })), openCount: created.filter((b) => b.status === 'OPEN').length, escrowLamports: created.filter((b) => b.status === 'OPEN').reduce((sum, b) => sum + b.rewardLamports, 0n).toString(), reviewQueue: review },
      contributor: { submissions: submitted.map((s) => ({ id: s.id, bountyId: s.bountyId, bountyTitle: s.bounty.title, status: s.status, submittedAt: s.submittedAt.toISOString(), rewardLamports: s.bounty.rewardLamports.toString(), bountyStatus: s.bounty.status })), earnedLamports: (earned._sum.rewardLamports ?? 0n).toString(), completedCount: earned._count, pendingCount: pending, wins: won.map((w) => ({ bountyId: w.bountyId, title: w.bounty.title, rewardLamports: w.rewardLamports.toString(), completedAt: w.completedAt.toISOString(), signature: w.signature })) },
    });
  } catch (error) {
    console.error('Dashboard data error', error);
    return NextResponse.json({ error: 'Dashboard data is temporarily unavailable. Check database configuration.' }, { status: 503 });
  }
}
