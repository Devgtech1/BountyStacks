import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/admin';
const schema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']), reason: z.string().min(10).max(2000) });
export async function POST(req: Request, { params }: { params: Promise<{ wallet: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  const { wallet } = await params;
  try {
    const body = schema.parse(await req.json());
    if (wallet === admin.wallet) return NextResponse.json({ error: 'You cannot suspend or ban your own administrator wallet.' }, { status: 400 });
    const user = await db.user.update({ where: { walletAddress: wallet }, data: { status: body.status, moderationReason: body.reason, moderatedAt: new Date() } });
    await db.auditLog.create({ data: { actorWallet: admin.wallet, action: `USER_${body.status}`, targetType: 'USER', targetId: wallet, details: { reason: body.reason } } });
    return NextResponse.json({ wallet: user.walletAddress, status: user.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update user status.' }, { status: 400 }); }
}
