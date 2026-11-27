import { PublicKey } from '@solana/web3.js';
import { solanaConnection } from './connection';

export function programId(): PublicKey {
  const value = process.env.NEXT_PUBLIC_SOLANA_PROGRAM_ID;

  if (!value || value === 'REPLACE_AFTER_ANCHOR_DEPLOY') {
    throw new Error('NEXT_PUBLIC_SOLANA_PROGRAM_ID is not configured');
  }

  return new PublicKey(value);
}

/**
 * Confirms that a transaction succeeded, was signed by the expected wallet,
 * invoked the BountyStacks program, and included the expected PDA.
 */
export async function verifyProgramTransaction(
  signature: string,
  signer: string,
  expectedAccount?: PublicKey
) {
  const tx = await solanaConnection.getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) {
    throw new Error('Transaction is missing, failed, or not confirmed.');
  }

  const message = tx.transaction.message;
  const messageKeys = message as unknown as {
    staticAccountKeys?: PublicKey[];
    accountKeys?: PublicKey[];
    header: { numRequiredSignatures: number };
  };
  const staticKeys = messageKeys.staticAccountKeys ?? messageKeys.accountKeys;

  if (!staticKeys) {
    throw new Error('Could not read transaction account keys.');
  }

  const loadedKeys = [
    ...(tx.meta?.loadedAddresses?.writable ?? []),
    ...(tx.meta?.loadedAddresses?.readonly ?? []),
  ];
  const allKeys = [...staticKeys, ...loadedKeys];
  const signerKey = new PublicKey(signer);
  const requiredSignatures = messageKeys.header.numRequiredSignatures;

  const signerPresent = staticKeys.some(
    (key, index) => key.equals(signerKey) && index < requiredSignatures
  );

  if (!signerPresent) {
    throw new Error('The connected wallet did not sign this transaction.');
  }

  const pid = programId();
  if (!staticKeys.some((key) => key.equals(pid))) {
    throw new Error('Transaction did not invoke the BountyStacks program.');
  }

  if (expectedAccount && !allKeys.some((key) => key.equals(expectedAccount))) {
    throw new Error('Transaction did not include the expected BountyStacks account.');
  }

  return tx;
}
