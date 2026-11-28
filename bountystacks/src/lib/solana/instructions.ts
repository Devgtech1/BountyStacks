import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';

/** Minimum reward enforced by the on-chain program (0.05 SOL placeholder). */
export const MIN_REWARD_LAMPORTS = 50_000_000n;

/** Anchor instruction discriminators: sha256("global:<instruction>")[0..8]. */
const DISCRIMINATOR = {
  createTask: Buffer.from([194, 80, 6, 180, 232, 127, 48, 171]),
  submitSolution: Buffer.from([203, 233, 157, 191, 70, 37, 205, 0]),
  acceptSubmission: Buffer.from([65, 133, 222, 91, 162, 82, 229, 203]),
  refundExpiredTask: Buffer.from([74, 224, 213, 90, 157, 163, 14, 239]),
} as const;

export function programId(): PublicKey {
  const value = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID;

  if (!value || value === 'REPLACE_AFTER_ANCHOR_DEPLOY') {
    throw new Error('NEXT_PUBLIC_SOLANA_PROGRAM_ID is not configured.');
  }

  return new PublicKey(value);
}

function u64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function i64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(value);
  return buffer;
}

export function taskPda(creator: PublicKey, taskId: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('task'), creator.toBuffer(), u64(taskId)],
    programId()
  )[0];
}

export function submissionPda(task: PublicKey, submitter: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('submission'), task.toBuffer(), submitter.toBuffer()],
    programId()
  )[0];
}

export function completionPda(task: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('completion'), task.toBuffer()], programId())[0];
}

export function createTaskInstruction(input: {
  creator: PublicKey;
  taskId: bigint;
  requirementsHash: Uint8Array;
  rewardLamports: bigint;
  deadline: bigint;
}): TransactionInstruction {
  if (input.requirementsHash.length !== 32) {
    throw new Error('Requirements hash must be 32 bytes.');
  }

  return new TransactionInstruction({
    programId: programId(),
    keys: [
      { pubkey: input.creator, isSigner: true, isWritable: true },
      { pubkey: taskPda(input.creator, input.taskId), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      DISCRIMINATOR.createTask,
      u64(input.taskId),
      Buffer.from(input.requirementsHash),
      u64(input.rewardLamports),
      i64(input.deadline),
    ]),
  });
}

export function submitSolutionInstruction(input: {
  submitter: PublicKey;
  task: PublicKey;
  solutionHash: Uint8Array;
}): TransactionInstruction {
  if (input.solutionHash.length !== 32) {
    throw new Error('Solution hash must be 32 bytes.');
  }

  return new TransactionInstruction({
    programId: programId(),
    keys: [
      { pubkey: input.submitter, isSigner: true, isWritable: true },
      { pubkey: input.task, isSigner: false, isWritable: true },
      { pubkey: submissionPda(input.task, input.submitter), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([DISCRIMINATOR.submitSolution, Buffer.from(input.solutionHash)]),
  });
}

export function acceptSubmissionInstruction(input: {
  creator: PublicKey;
  task: PublicKey;
  winner: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: programId(),
    keys: [
      { pubkey: input.creator, isSigner: true, isWritable: true },
      { pubkey: input.task, isSigner: false, isWritable: true },
      { pubkey: submissionPda(input.task, input.winner), isSigner: false, isWritable: false },
      { pubkey: input.winner, isSigner: false, isWritable: true },
      { pubkey: completionPda(input.task), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATOR.acceptSubmission),
  });
}

export function refundExpiredTaskInstruction(input: {
  creator: PublicKey;
  task: PublicKey;
}): TransactionInstruction {
  return new TransactionInstruction({
    programId: programId(),
    keys: [
      { pubkey: input.creator, isSigner: true, isWritable: true },
      { pubkey: input.task, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(DISCRIMINATOR.refundExpiredTask),
  });
}
