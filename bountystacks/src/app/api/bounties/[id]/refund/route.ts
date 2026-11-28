import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { db } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { solanaConnection } from '@/lib/solana/connection';
import { programId, verifyProgramTransaction } from '@/lib/solana/verify';

const REFUNDED_STATUS = 2;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Wallet sign-in required.' }, { status: 401 });

  const { id } = await params;

  try {
    const body = (await req.json()) as { txSignature?: string };

    if (!body.txSignature) return NextResponse.json({ error: 'A transaction signature is required.' }, { status: 400 });

    const bounty = await db.bounty.findUnique({ where: { id } });
    if (!bounty) return NextResponse.json({ error: 'Bounty not found.' }, { status: 404 });
    if (bounty.creatorWallet !== session.wallet) {
      return NextResponse.json({ error: 'Only this bounty creator can reclaim escrow.' }, { status: 403 });
    }
    if (bounty.status !== 'OPEN') return NextResponse.json({ error: 'This bounty is not open.' }, { status: 409 });
    if (bounty.deadline.getTime() > Date.now()) {
      return NextResponse.json({ error: 'The deadline has not passed yet.' }, { status: 409 });
    }
    if (bounty.submissionCount > 0) {
      return NextResponse.json(
        { error: 'Contributors have submitted work; escrow cannot be refunded through the expiry path.' },
        { status: 409 }
      );
    }

    const taskKey = new PublicKey(id);
    await verifyProgramTransaction(body.txSignature, session.wallet, taskKey);

    const account = await solanaConnection.getAccountInfo(taskKey, 'confirmed');
    if (!account || !account.owner.equals(programId()) || account.data.length < 102) {
      return NextResponse.json({ error: 'On-chain task account was not found.' }, { status: 409 });
    }

    const data = account.data;
    const creator = data.subarray(8, 40);
    const status = data[100];

    if (!creator.equals(new PublicKey(session.wallet).toBuffer()) || status !== REFUNDED_STATUS) {
      return NextResponse.json({ error: 'On-chain task is not in the refunded state.' }, { status: 409 });
    }

    await db.bounty.update({ where: { id }, data: { status: 'REFUNDED' } });

    return NextResponse.json({ ok: true, signature: body.txSignature });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify the refund.' },
      { status: 400 }
    );
  }
}
