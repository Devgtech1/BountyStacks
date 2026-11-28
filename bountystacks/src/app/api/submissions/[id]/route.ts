import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { decryptSubmission } from '@/lib/crypto/submission';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Wallet sign-in required.' }, { status: 401 });

  const { id } = await params;
  const submission = await db.submission.findUnique({
    where: { id },
    include: {
      bounty: {
        select: {
          id: true,
          title: true,
          creatorWallet: true,
          acceptanceCriteria: true,
          status: true,
          rewardLamports: true,
          deadline: true,
        },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });

  const isCreator = submission.bounty.creatorWallet === session.wallet;
  const isContributor = submission.contributorWallet === session.wallet;

  if (!isCreator && !isContributor) {
    return NextResponse.json({ error: 'You do not have access to this submission.' }, { status: 403 });
  }

  const criteria = Array.isArray(submission.bounty.acceptanceCriteria)
    ? (submission.bounty.acceptanceCriteria as string[])
    : [];

  return NextResponse.json({
    id: submission.id,
    bountyId: submission.bountyId,
    bountyTitle: submission.bounty.title,
    creatorWallet: submission.bounty.creatorWallet,
    bountyStatus: submission.bounty.status,
    rewardLamports: submission.bounty.rewardLamports.toString(),
    deadline: submission.bounty.deadline.toISOString(),
    contributorWallet: submission.contributorWallet,
    status: submission.status,
    content: decryptSubmission(submission.contentCiphertext, submission.contentNonce),
    contentHash: submission.contentHash,
    submittedAt: submission.submittedAt.toISOString(),
    reviewerNote: submission.reviewerNote,
    criteria,
    viewer: isCreator ? 'creator' : 'contributor',
  });
}
