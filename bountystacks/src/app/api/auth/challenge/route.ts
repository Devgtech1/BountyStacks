import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db/prisma';
import { PublicKey } from '@solana/web3.js';
const schema=z.object({wallet:z.string().min(32).max(64)});
export async function POST(req:Request){try{const {wallet}=schema.parse(await req.json());new PublicKey(wallet);const nonce=randomBytes(24).toString('hex');const expiresAt=new Date(Date.now()+5*60*1000);await db.walletNonce.upsert({where:{walletAddress:wallet},create:{walletAddress:wallet,nonce,expiresAt},update:{nonce,expiresAt}});return NextResponse.json({message:`Sign in to BountyStacks on Solana Devnet.\nWallet: ${wallet}\nNonce: ${nonce}\nThis signature will not send a transaction.`});}catch{return NextResponse.json({error:'Invalid wallet address.'},{status:400});}}
