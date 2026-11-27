import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/admin';
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    const [users, bounties, submissions, completions, disputes, reports, recentLogs, feeRate] = await Promise.all([
      db.user.count(), db.bounty.count(), db.submission.count(), db.completion.aggregate({ _sum: { rewardLamports: true }, _count: true }),
      db.dispute.findMany({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } }, orderBy: { createdAt: 'asc' }, take: 100, include: { bounty: { select: { title: true } } } }),
      db.report.findMany({ where: { status: { in: ['OPEN', 'REVIEWING'] } }, orderBy: { createdAt: 'asc' }, take: 100 }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      db.platformSetting.findUnique({ where: { key: 'platform_fee_bps' } }),
    ]);
    return NextResponse.json({ counts: { users, bounties, submissions, completed: completions._count }, completedRewardLamports: (completions._sum.rewardLamports ?? 0n).toString(), disputes: disputes.map((d) => ({ id: d.id, bountyId: d.bountyId, bountyTitle: d.bounty.title, openedBy: d.openedByWallet, against: d.againstWallet, reason: d.reason, status: d.status, createdAt: d.createdAt.toISOString() })), reports, auditLogs: recentLogs, feeBasisPoints: feeRate?.value ?? '500' });
  } catch (error) { console.error('Admin overview error', error); return NextResponse.json({ error: 'Admin data unavailable. Check database configuration.' }, { status: 503 }); }
}
