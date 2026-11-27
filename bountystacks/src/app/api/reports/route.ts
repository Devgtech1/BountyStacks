import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/prisma';
import { PublicKey } from '@solana/web3.js';
import { getSession } from '@/lib/auth/session';
const schema = z.object({ reason: z.string().min(20).max(3000), targetWallet: z.string().optional(), bountyId: z.string().optional(), submissionId: z.string().optional() }).refine((v) => v.targetWallet || v.bountyId || v.submissionId, 'A report target is required.');
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Wallet sign-in required.' }, { status: 401 });
  try {
    const body = schema.parse(await req.json());
    if (body.targetWallet) new PublicKey(body.targetWallet);
    if (body.submissionId && !await db.submission.findUnique({ where: { id: body.submissionId }, select: { id: true } })) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    if (body.bountyId && !await db.bounty.findUnique({ where: { id: body.bountyId }, select: { id: true } })) return NextResponse.json({ error: 'Bounty not found.' }, { status: 404 });
    const report = await db.report.create({ data: { reporterWallet: session.wallet, ...body } });
    return NextResponse.json({ id: report.id, status: report.status }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not submit report.' }, { status: 400 }); }
}
