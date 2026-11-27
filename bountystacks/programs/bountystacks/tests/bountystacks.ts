import * as anchor from '@coral-xyz/anchor';
import { BN, Program, AnchorError } from '@coral-xyz/anchor';
import { Bountystacks } from '../../../target/types/bountystacks';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { strict as assert } from 'assert';
import { createHash } from 'crypto';

describe('BountyStacks escrow lifecycle', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Bountystacks as Program<Bountystacks>;
  const creator = provider.wallet.publicKey;
  const contributor = Keypair.generate();
  const otherWallet = Keypair.generate();
  const reward = new BN(0.1 * LAMPORTS_PER_SOL);
  let nextTaskId = new BN(Date.now());

  const sha = (value: string): number[] =>
    Array.from(createHash('sha256').update(value).digest());

  function taskId(): BN {
    nextTaskId = nextTaskId.addn(1);
    return nextTaskId;
  }

  function taskPda(id: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('task'), creator.toBuffer(), id.toArrayLike(Buffer, 'le', 8)],
      program.programId,
    )[0];
  }

  function submissionPda(task: PublicKey, wallet: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('submission'), task.toBuffer(), wallet.toBuffer()],
      program.programId,
    )[0];
  }

  function completionPda(task: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('completion'), task.toBuffer()],
      program.programId,
    )[0];
  }

  async function createTask(
    id: BN,
    deadlineOffsetSeconds = 3600,
    taskReward = reward,
  ): Promise<PublicKey> {
    const task = taskPda(id);
    const deadline = new BN(Math.floor(Date.now() / 1000) + deadlineOffsetSeconds);
    await program.methods
      .createTask(id, sha(`requirements-${id.toString()}`), taskReward, deadline)
      .accounts({ creator, task, systemProgram: SystemProgram.programId })
      .rpc();
    return task;
  }

  async function expectFailure(
    action: Promise<unknown>,
    expectedText: string,
  ): Promise<void> {
    try {
      await action;
      assert.fail(`Expected transaction to fail with ${expectedText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const anchorCode = (error as AnchorError)?.error?.errorCode?.code;
      assert(
        message.includes(expectedText) || anchorCode === expectedText,
        `Expected ${expectedText}, received: ${message}`,
      );
    }
  }

  before(async () => {
    for (const wallet of [contributor, otherWallet]) {
      const signature = await provider.connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL,
      );
      const latest = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction(
        { signature, ...latest },
        'confirmed',
      );
    }
  });

  it('creates, submits, accepts, pays exactly once and records completion', async () => {
    const id = taskId();
    const task = await createTask(id);
    const submission = submissionPda(task, contributor.publicKey);
    const completion = completionPda(task);

    await program.methods
      .submitSolution(sha('private submission content hash'))
      .accounts({
        submitter: contributor.publicKey,
        task,
        submission,
        systemProgram: SystemProgram.programId,
      })
      .signers([contributor])
      .rpc();

    const beforeBalance = await provider.connection.getBalance(contributor.publicKey);
    await program.methods
      .acceptSubmission()
      .accounts({
        creator,
        task,
        submission,
        winner: contributor.publicKey,
        completion,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const afterBalance = await provider.connection.getBalance(contributor.publicKey);

    assert.equal(afterBalance - beforeBalance, reward.toNumber());

    const record = await program.account.completionRecord.fetch(completion);
    assert.equal(record.winner.toBase58(), contributor.publicKey.toBase58());
    assert.equal(record.rewardPaid.toNumber(), reward.toNumber());

    await expectFailure(
      program.methods
        .acceptSubmission()
        .accounts({
          creator,
          task,
          submission,
          winner: contributor.publicKey,
          completion,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'already in use',
    );
  });

  it('prevents the creator from submitting to their own task', async () => {
    const id = taskId();
    const task = await createTask(id);
    const submission = submissionPda(task, creator);

    await expectFailure(
      program.methods
        .submitSolution(sha('self submission'))
        .accounts({
          submitter: creator,
          task,
          submission,
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      'CreatorCannotSubmit',
    );
  });

  it('rejects a reward below the on-chain minimum', async () => {
    const id = taskId();
    const task = taskPda(id);
    const deadline = new BN(Math.floor(Date.now() / 1000) + 3600);

    await expectFailure(
      program.methods
        .createTask(id, sha('below minimum'), new BN(1), deadline)
        .accounts({ creator, task, systemProgram: SystemProgram.programId })
        .rpc(),
      'RewardBelowMinimum',
    );
  });

  it('refunds an expired task when no contributor submitted', async () => {
    const id = taskId();
    const task = await createTask(id, 2);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await program.methods
      .refundExpiredTask()
      .accounts({ creator, task })
      .rpc();

    const account = await program.account.task.fetch(task);
    assert.equal(account.status.refunded, {});
  });

  it('prevents a refund after a contributor has submitted work', async () => {
    const id = taskId();
    const task = await createTask(id, 2);
    const submission = submissionPda(task, contributor.publicKey);

    await program.methods
      .submitSolution(sha('work submitted before expiry'))
      .accounts({
        submitter: contributor.publicKey,
        task,
        submission,
        systemProgram: SystemProgram.programId,
      })
      .signers([contributor])
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await expectFailure(
      program.methods.refundExpiredTask().accounts({ creator, task }).rpc(),
      'SubmissionsExist',
    );
  });

  it('rejects an expiry refund signed by a wallet other than the creator', async () => {
    const id = taskId();
    const task = await createTask(id, 2);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await expectFailure(
      program.methods
        .refundExpiredTask()
        .accounts({ creator: otherWallet.publicKey, task })
        .signers([otherWallet])
        .rpc(),
      'Unauthorized',
    );
  });
});
