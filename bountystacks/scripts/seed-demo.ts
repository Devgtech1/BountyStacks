/**
 * Seed one open demo bounty through the public API.
 *
 *   npx tsx scripts/seed-demo.ts
 *   APP_URL=https://bountystacks.vercel.app npx tsx scripts/seed-demo.ts
 *
 * Locks the reward in escrow on devnet, so only run it with devnet SOL.
 */
import { readFileSync } from 'node:fs';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
}

const BASE = process.env.APP_URL || 'http://localhost:3000';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC, 'confirmed');

async function login(keypair: Keypair): Promise<string> {
  const wallet = keypair.publicKey.toBase58();
  const challenge = (await fetch(`${BASE}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallet }),
  }).then((response) => response.json())) as { message?: string; error?: string };

  if (!challenge.message) throw new Error(`challenge failed: ${challenge.error ?? 'unknown'}`);

  const signature = nacl.sign.detached(new TextEncoder().encode(challenge.message), keypair.secretKey);
  const verified = await fetch(`${BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallet, message: challenge.message, signature: bs58.encode(signature) }),
  });

  if (!verified.ok) throw new Error(`sign-in failed: ${await verified.text()}`);

  const raw = verified.headers.getSetCookie?.() ?? [verified.headers.get('set-cookie') ?? ''];
  return raw
    .map((entry) => entry.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function main() {
  const { createTaskInstruction, taskPda } = await import('../src/lib/solana/instructions');
  const { requirementsMessage, sha256Bytes } = await import('../src/lib/solana/hash');

  const creator = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(readFileSync(process.env.CREATOR_KEYPAIR || '.devnet/creator.json', 'utf8')) as number[]
    )
  );

  const cookie = await login(creator);
  if (!cookie) throw new Error('sign-in did not return a session cookie');

  const description =
    'Build a small React component that shows a live countdown to a bounty deadline. It should update every second, format the remaining time as days/hours/minutes/seconds, and render a clear "expired" state. Keep it dependency-free and accessible.';
  const criteria = [
    'Renders days, hours, minutes and seconds',
    'Updates every second without leaking timers',
    'Shows a clear expired state at zero',
    'Keyboard and screen-reader friendly',
  ];
  const title = 'Countdown timer component for bounty deadlines';
  const summary = 'Dependency-free React countdown with an accessible expired state.';
  const rewardLamports = BigInt(0.1 * LAMPORTS_PER_SOL);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
  const taskId = BigInt(Date.now());

  const task = taskPda(creator.publicKey, taskId);
  const tx = new Transaction().add(
    createTaskInstruction({
      creator: creator.publicKey,
      taskId,
      requirementsHash: await sha256Bytes(requirementsMessage(description, criteria)),
      rewardLamports,
      deadline,
    })
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [creator], { commitment: 'confirmed' });

  const response = await fetch(`${BASE}/api/bounties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      id: task.toBase58(),
      title,
      summary,
      description,
      category: 'CODING',
      acceptanceCriteria: criteria,
      deadline: new Date(Number(deadline) * 1000).toISOString(),
      rewardLamports: rewardLamports.toString(),
      txSignature: signature,
    }),
  });

  if (!response.ok) throw new Error(`create failed: ${response.status} ${await response.text()}`);

  console.log('Seeded open bounty:', `${BASE}/bounties/${task.toBase58()}`);
}

main().catch((error) => {
  console.error('SEED FAILED:', error);
  process.exitCode = 1;
});
