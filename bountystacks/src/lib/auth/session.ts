import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/prisma';
const COOKIE = 'bountystacks_session';
type Session = { wallet: string; exp: number };
function secret(){ const value=process.env.SESSION_SECRET; if(!value || value.length<32) throw new Error('SESSION_SECRET must contain at least 32 characters'); return value; }
function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url');}
export function createSessionToken(wallet:string){const payload=Buffer.from(JSON.stringify({wallet,exp:Date.now()+1000*60*60*24*7} satisfies Session)).toString('base64url'); return `${payload}.${sign(payload)}`;}
export function verifySessionToken(token:string):Session|null{try{const [payload,signature]=token.split('.'); if(!payload||!signature)return null; const expected=Buffer.from(sign(payload)); const actual=Buffer.from(signature); if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null; const data=JSON.parse(Buffer.from(payload,'base64url').toString()) as Session; if(data.exp<Date.now()||!data.wallet)return null; return data;}catch{return null;}}
export async function getSession(){const jar=await cookies(); const token=jar.get(COOKIE)?.value; const session=token?verifySessionToken(token):null; if(!session)return null; try { const user=await db.user.findUnique({where:{walletAddress:session.wallet},select:{status:true}}); if(!user || user.status!=='ACTIVE')return null; return session; } catch { return null; }}
export const sessionCookieName=COOKIE;
