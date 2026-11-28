import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  Transaction,
  type TransactionInstruction,
  type TransactionSignature,
} from '@solana/web3.js';

/** Sends a transaction through the connected wallet and waits for confirmation. */
export async function sendInstructions(
  connection: Connection,
  wallet: WalletContextState,
  instructions: TransactionInstruction[]
): Promise<TransactionSignature> {
  if (!wallet.publicKey) throw new Error('Connect your wallet first.');
  if (!wallet.sendTransaction) throw new Error('This wallet cannot send transactions.');

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction();
  transaction.add(...instructions);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = blockhash;

  const signature = await wallet.sendTransaction(transaction, connection);
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}
