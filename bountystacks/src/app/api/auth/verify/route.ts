import { NextResponse } from 'next/server';
import { z } from 'zod';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { db } from '@/lib/db/prisma';
import { createSessionToken, sessionCookieName } from '@/lib/auth/session';
const schema=z.object({wallet:z.string(),message:z.string(),signature:z.string()});
export async function POST(req:Request){try{const {wallet,message,signature}=schema.parse(await req.json());const existing=await db.user.findUnique({where:{walletAddress:wallet},select:{status:true}});if(existing && existing.status!=='ACTIVE')return NextResponse.json({error:'This wallet is currently restricted from using BountyStacks.'},{status:403});const record=await db.walletNonce.findUnique({where:{walletAddress:wallet}});if(!record||record.expiresAt.getTime()<Date.now()||!message.includes(`Nonce: ${record.nonce}`)||!message.includes(`Wallet: ${wallet}`))return NextResponse.json({error:'Challenge expired. Request a new signature.'},{status:401});const valid=nacl.sign.detached.verify(new TextEncoder().encode(message),bs58.decode(signature),new PublicKey(wallet).toBytes());if(!valid)return NextResponse.json({error:'Wallet signature is invalid.'},{status:401});await db.walletNonce.delete({where:{walletAddress:wallet}});await db.user.upsert({where:{walletAddress:wallet},create:{walletAddress:wallet},update:{}});const response=NextResponse.json({ok:true,wallet});response.cookies.set(sessionCookieName,createSessionToken(wallet),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});return response;}catch{return NextResponse.json({error:'Unable to verify wallet signature.'},{status:400});}}
