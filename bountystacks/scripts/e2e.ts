/**
 * End-to-end devnet smoke test.
 *
 * Exercises the real flow against a running server:
 *   wallet sign-in -> create bounty (escrow) -> submit -> accept -> verify
 *
 * Run locally:  npx tsx scripts/e2e.ts
 * Run against the deployed app:
 *   APP_URL=https://bountystacks.vercel.app npx tsx scripts/e2e.ts
 *
 * Needs a funded creator keypair at .devnet/creator.json (or CREATOR_KEYPAIR)
 * and the program deployed on devnet.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Load .env, but let an explicitly provided environment win (e.g. when testing
// the deployed app against a different database).
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
}

const BASE = process.env.APP_URL || 'http://localhost:3000';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC, 'confirmed');

function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, 'utf8')) as number[]));
}

/** Real wallet login: challenge -> sign -> verify -> session cookie. */
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
  const cookie = raw
    .map((entry) => entry.split(';')[0])
    .filter(Boolean)
    .join('; ');

  if (!cookie) throw new Error('sign-in did not return a session cookie');
  return cookie;
}

async function api<T>(path: string, cookie: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(`${path} -> ${response.status}: ${data.error ?? 'unknown error'}`);
  return data;
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
  // Imported lazily so the .env values above are loaded before the module reads them.
  const {
    acceptSubmissionInstruction,
    createTaskInstruction,
    submitSolutionInstruction,
    taskPda,
  } = await import('../src/lib/solana/instructions');
  const { requirementsMessage, sha256Bytes } = await import('../src/lib/solana/hash');

  const creator = loadKeypair(process.env.CREATOR_KEYPAIR || '.devnet/creator.json');
  const contributor = await ensureContributor(creator);
  const creatorWallet = creator.publicKey.toBase58();
  const contributorWallet = contributor.publicKey.toBase58();

  console.log('Server  :', BASE);
  console.log('Program :', process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID);
  console.log('Creator :', creatorWallet, (await connection.getBalance(creator.publicKey)) / LAMPORTS_PER_SOL, 'SOL');
  console.log('Contrib :', contributorWallet, (await connection.getBalance(contributor.publicKey)) / LAMPORTS_PER_SOL, 'SOL');

  const creatorCookie = await login(creator);
  const contributorCookie = await login(contributor);
  console.log('Signed in with both wallets.');

  const description = 'Write a small TypeScript utility that formats lamports as SOL with three decimals.';
  const criteria = ['Handles zero and large values', 'Has at least one unit test', 'Documented in the README'];
  const rewardLamports = BigInt(0.1 * LAMPORTS_PER_SOL);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const taskId = BigInt(Date.now());

  console.log('\n[1/4] Creating bounty with escrow...');
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

  await api('/api/bounties', creatorCookie, {
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

  console.log('\n[2/4] Contributor submits a solution...');
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

  await api('/api/submissions', contributorCookie, {
    bountyId: task.toBase58(),
    content,
    txSignature: submissionSignature,
  });
  console.log('    submission recorded');

  console.log('\n[3/4] Creator accepts the submission...');
  const list = await api<{ id: string }[]>(`/api/submissions?bountyId=${task.toBase58()}`, creatorCookie);
  const submissionId = list[0]?.id;
  if (!submissionId) throw new Error('Creator could not see the submission.');

  const acceptTx = new Transaction().add(
    acceptSubmissionInstruction({ creator: creator.publicKey, task, winner: contributor.publicKey })
  );
  const acceptSignature = await sendAndConfirmTransaction(connection, acceptTx, [creator], { commitment: 'confirmed' });

  await api(`/api/submissions/${submissionId}/accept`, creatorCookie, {
    txSignature: acceptSignature,
    checkedCriteria: criteria.map(() => true),
  });

  console.log('\n[4/4] Verifying the completion record...');
  const verified = await api<{ verified: boolean; winner: string; rewardLamports: string }>(
    `/api/verify/${task.toBase58()}`,
    creatorCookie
  );
  console.log('    verified:', verified.verified, '| winner:', verified.winner, '| reward:', verified.rewardLamports);

  const creatorBalance = await connection.getBalance(creator.publicKey);
  const contributorBalance = await connection.getBalance(contributor.publicKey);
  console.log('\nFinal balances (SOL):', creatorBalance / LAMPORTS_PER_SOL, '/', contributorBalance / LAMPORTS_PER_SOL);
  console.log('\nE2E PASSED');
}

main().catch((error) => {
  console.error('\nE2E FAILED:', error);
  process.exitCode = 1;
});
