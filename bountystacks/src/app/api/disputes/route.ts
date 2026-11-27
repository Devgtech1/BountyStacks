import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';

const schema = z.object({ bountyId: z.string().min(32).max(64), reason: z.string().min(30).max(4000), evidence: z.string().max(4000).optional() });
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Wallet sign-in required.' }, { status: 401 });
  try {
    const body = schema.parse(await req.json());
    const bounty = await db.bounty.findUnique({ where: { id: body.bountyId }, include: { submissions: { select: { contributorWallet: true } } } });
    if (!bounty) return NextResponse.json({ error: 'Bounty not found.' }, { status: 404 });
    const participant = bounty.creatorWallet === session.wallet || bounty.submissions.some((s) => s.contributorWallet === session.wallet);
    if (!participant) return NextResponse.json({ error: 'Only the creator or a contributor to this bounty may open a dispute.' }, { status: 403 });
    if (bounty.status !== 'OPEN') return NextResponse.json({ error: 'Only an active bounty can be disputed.' }, { status: 409 });
    const againstWallet = bounty.creatorWallet === session.wallet ? bounty.submissions[0]?.contributorWallet : bounty.creatorWallet;
    if (!againstWallet) return NextResponse.json({ error: 'No opposing participant exists for this dispute.' }, { status: 409 });
    const dispute = await db.dispute.create({ data: { bountyId: bounty.id, openedByWallet: session.wallet, againstWallet, reason: body.reason, evidence: body.evidence } });
    await db.auditLog.create({ data: { actorWallet: session.wallet, action: 'DISPUTE_OPENED', targetType: 'DISPUTE', targetId: dispute.id } });
    return NextResponse.json({ id: dispute.id, status: dispute.status }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not open dispute.' }, { status: 400 });
  }
}
