import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/admin';
const schema = z.object({ outcome: z.enum(['RESOLVED_FOR_CONTRIBUTOR', 'RESOLVED_FOR_CREATOR', 'DISMISSED']), resolution: z.string().min(20).max(4000) });
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { id } = await params;
  try {
    const body = schema.parse(await req.json());
    const dispute = await db.dispute.update({ where: { id }, data: { status: body.outcome, resolution: body.resolution, resolvedByWallet: admin.wallet, resolvedAt: new Date() } });
    await db.auditLog.create({ data: { actorWallet: admin.wallet, action: 'DISPUTE_DECISION_RECORDED', targetType: 'DISPUTE', targetId: id, details: { outcome: body.outcome, resolution: body.resolution } } });
    // This records the adjudication only. It deliberately does NOT move SOL; a reviewed
    // Anchor dispute-resolution instruction must execute the corresponding escrow transfer.
    return NextResponse.json({ id: dispute.id, status: dispute.status, fundsMoved: false, note: 'Decision recorded. Escrow remains locked until the corresponding authorized on-chain instruction is executed.' });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not resolve dispute.' }, { status: 400 }); }
}
