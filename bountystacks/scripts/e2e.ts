/**
 * End-to-end devnet smoke test.
 *
 * Requires: the Next.js server running on http://localhost:3000, the program
 * deployed to devnet, and a funded creator keypair.
 *
 * Run with: npx tsx scripts/e2e.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';

// Load .env before any module reads process.env.
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (match) process.env[match[1]] = match[2];
}

const {
  acceptSubmissionInstruction,
  createTaskInstruction,
  submissionPda,
  submitSolutionInstruction,
  taskPda,
} = await import('../src/lib/solana/instructions');
const { requirementsMessage, sha256Bytes } = await import('../src/lib/solana/hash');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const SECRET = process.env.SESSION_SECRET || '';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC, 'confirmed');
const db = new PrismaClient();

function sessionToken(wallet: string): string {
  const payload = Buffer.from(JSON.stringify({ wallet, exp: Date.now() + 7 * 86_400_000 })).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

async function api<T>(path: string, wallet: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      cookie: `bountystacks_session=${sessionToken(wallet)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(`${path} -> ${response.status}: ${data.error ?? 'unknown error'}`);
  return data;
}

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]));
}

async function ensureContributor(creator: Keypair): Promise<Keypair> {
  mkdirSync('.devnet', { recursive: true });
  const path = '.devnet/contributor.json';

  if (existsSync(path)) return loadKeypair(path);

  const contributor = Keypair.generate();
  writeFileSync(path, JSON.stringify(Array.from(contributor.secretKey)));

  const transfer = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: contributor.publicKey,
      lamports: Math.floor(0.5 * LAMPORTS_PER_SOL),
    })
  );
  await sendAndConfirmTransaction(connection, transfer, [creator], { commitment: 'confirmed' });

  return contributor;
}

async function main() {
  const creator = loadKeypair(process.env.CREATOR_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`);
  const contributor = await ensureContributor(creator);
  const creatorWallet = creator.publicKey.toBase58();
  const contributorWallet = contributor.publicKey.toBase58();

  console.log('Program :', process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID);
  console.log('Creator :', creatorWallet, (await connection.getBalance(creator.publicKey)) / LAMPORTS_PER_SOL, 'SOL');
  console.log('Contrib :', contributorWallet, (await connection.getBalance(contributor.publicKey)) / LAMPORTS_PER_SOL, 'SOL');

  for (const wallet of [creatorWallet, contributorWallet]) {
    await db.user.upsert({ where: { walletAddress: wallet }, create: { walletAddress: wallet }, update: {} });
  }

  const description = 'Write a small TypeScript utility that formats lamports as SOL with three decimals.';
  const criteria = ['Handles zero and large values', 'Has at least one unit test', 'Documented in the README'];
  const rewardLamports = BigInt(0.1 * LAMPORTS_PER_SOL);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const taskId = BigInt(Date.now());

  console.log('\n[1/4] Creating bounty with escrow…');
  const task = taskPda(creator.publicKey, taskId);
  const createTx = new Transaction().add(
    createTaskInstruction({
      creator: creator.publicKey,
      taskId,
      requirementsHash: await sha256Bytes(requirementsMessage(description, criteria)),
      rewardLamports,
      deadline,
    })
  );
  const createSignature = await sendAndConfirmTransaction(connection, createTx, [creator], { commitment: 'confirmed' });

  await api('/api/bounties', creatorWallet, {
    id: task.toBase58(),
    title: 'Lamport formatting utility',
    summary: 'Small, tested TypeScript helper for SOL formatting.',
    description,
    category: 'CODING',
    acceptanceCriteria: criteria,
    deadline: new Date(Number(deadline) * 1000).toISOString(),
    rewardLamports: rewardLamports.toString(),
    txSignature: createSignature,
  });
  console.log('    bounty:', task.toBase58());

  console.log('\n[2/4] Contributor submits a solution…');
  const content = 'Implemented formatSol(lamports) in src/format.ts with tests covering 0, 0.1 and 1000 SOL.';
  const submissionTx = new Transaction().add(
    submitSolutionInstruction({
      submitter: contributor.publicKey,
      task,
      solutionHash: await sha256Bytes(content),
    })
  );
  const submissionSignature = await sendAndConfirmTransaction(connection, submissionTx, [contributor], {
    commitment: 'confirmed',
  });

  await api('/api/submissions', contributorWallet, {
    bountyId: task.toBase58(),
    content,
    txSignature: submissionSignature,
  });
  console.log('    submission PDA:', submissionPda(task, contributor.publicKey).toBase58());

  console.log('\n[3/4] Creator accepts the submission…');
  const list = await api<{ id: string }[]>(`/api/submissions?bountyId=${task.toBase58()}`, creatorWallet);
  const submissionId = list[0]?.id;
  if (!submissionId) throw new Error('Creator could not see the submission.');

  const acceptTx = new Transaction().add(
    acceptSubmissionInstruction({ creator: creator.publicKey, task, winner: contributor.publicKey })
  );
  const acceptSignature = await sendAndConfirmTransaction(connection, acceptTx, [creator], { commitment: 'confirmed' });

  await api(`/api/submissions/${submissionId}/accept`, creatorWallet, {
    txSignature: acceptSignature,
    checkedCriteria: criteria.map(() => true),
  });

  console.log('\n[4/4] Verifying the completion record…');
  const verified = await api<{ verified: boolean; winner: string; rewardLamports: string }>(
    `/api/verify/${task.toBase58()}`,
    creatorWallet
  );
  console.log('    verified:', verified.verified, '| winner:', verified.winner, '| reward:', verified.rewardLamports);

  const creatorBalance = await connection.getBalance(creator.publicKey);
  const contributorBalance = await connection.getBalance(contributor.publicKey);
  console.log('\nFinal balances (SOL):', creatorBalance / LAMPORTS_PER_SOL, '/', contributorBalance / LAMPORTS_PER_SOL);
  console.log('\nE2E PASSED');
}

main()
  .catch((error) => {
    console.error('\nE2E FAILED:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
