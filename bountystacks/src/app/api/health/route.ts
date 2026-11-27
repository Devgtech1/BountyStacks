import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
export async function GET(){try{await db.$queryRaw`SELECT 1`;return NextResponse.json({ok:true,database:'connected',network:process.env.NEXT_PUBLIC_SOLANA_CLUSTER||'devnet'});}catch{return NextResponse.json({ok:false,database:'unavailable'},{status:503});}}
