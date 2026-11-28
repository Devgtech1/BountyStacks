# BountyStacks

**Get work done. Get paid on-chain.** BountyStacks is a Solana-powered bounty marketplace. Creators publish a task with clear acceptance criteria and lock a SOL reward in escrow. Contributors compete by submitting solutions. The creator accepts one winner, the program pays that contributor, and a completion record can be checked independently on Solana.

> **Status:** deployed to Solana **devnet** and live at https://bountystacks.vercel.app. The Anchor program is at `5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg`, the app uses Supabase PostgreSQL, and the create → submit → accept → verify flow has been exercised end to end on devnet. It is **not audited**, does not yet implement on-chain disputes or platform fees, and must not be used with real-value SOL. See `docs/BUILD_STATUS.md` and `docs/DEPLOYMENT.md`.

## Product rules

- Open competition: multiple contributors may submit; one winner receives the full reward.
- Submission privacy: the contributor sees their own submission; the creator sees submissions for their own bounty; other users see only the count.
- Private submission content is stored off-chain. Only SHA-256 hashes and public transaction facts belong on-chain.
- The on-chain program prevents the creator from submitting to their own task and prevents accepting a task twice.
- The contract expiry-refund instruction now rejects refunds if any on-chain submission exists. Such funds remain locked pending a future, audited dispute-resolution instruction.
- The current minimum is a fixed **0.05 SOL placeholder**, not a USD/Pyth price check.

## Stack

- Next.js App Router, React, TypeScript and Tailwind CSS
- Solana wallet adapter (Phantom and Solflare)
- Anchor 0.31 / Rust program
- PostgreSQL + Prisma
- Wallet-message authentication (signed nonce; no password)
- AES-256-GCM encryption helper for private submission content

## Repository layout

```text
src/app/                 Next.js pages and route handlers
src/components/          Shared navigation, wallet and bounty UI
src/lib/auth/            Signed-wallet session helpers
src/lib/crypto/          Private submission encryption helpers
src/lib/db/              Prisma client
src/lib/solana/          Solana RPC connection
prisma/schema.prisma     PostgreSQL schema
programs/bountystacks/   Anchor program and tests
docs/                    Architecture, security and demo notes
```

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL database
- Rust toolchain, Solana CLI and Anchor 0.31.1 (use WSL2 on Windows)
- Phantom or Solflare wallet configured for Devnet

## Local setup

1. Copy `.env.example` to `.env` and fill in the database URL, session secret, encryption key and `ADMIN_WALLET_ADDRESSES` (your public administrator wallet address).
2. Install packages: `npm install`.
3. Generate Prisma client: `npx prisma generate`.
4. Apply the database schema: `npx prisma db push`.
5. Start the website: `npm run dev`.
6. Visit `http://localhost:3000`.

Generate secrets (PowerShell):

```powershell
# Session secret: use a long random value (at least 32 characters)
# Encryption key: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Anchor program

The program ID in `Anchor.toml` and `lib.rs` is a placeholder Anchor development ID. Generate a fresh program keypair, update the program ID, and sync it before deployment:

```bash
anchor keys list
anchor keys sync
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

After deployment, replace `NEXT_PUBLIC_SOLANA_PROGRAM_ID` in the deployment environment and add the real Devnet program address plus its Solana Explorer link here. **No deployment address is claimed yet.**

## Backend administration and moderation

- Configure `ADMIN_WALLET_ADDRESSES` with your administrator wallet public key(s). This is a server-only variable; never use a `NEXT_PUBLIC_` prefix.
- Sign in with that wallet, then open `/admin`. Admin APIs enforce the allowlist server-side.
- User status changes (active, suspended, banned), reports, dispute records and administrative audit events are persisted in PostgreSQL.
- A recorded dispute decision does **not** transfer SOL. The Anchor program still needs a reviewed arbitration instruction before an administrator can safely release disputed escrow on-chain.
- Moderation is an application access control, not a way to seize funds. Existing escrow remains controlled by program rules.

## Important unfinished integration work

This initial source package is not yet an end-to-end functioning marketplace. Before accepting a hackathon submission, complete and verify:

1. Build the Anchor program and fix any compiler/IDL issues.
2. Complete Anchor client instruction construction and transaction confirmation in the Next.js create, submit, accept and refund flows; generate and configure the deployed IDL.
3. Finish authenticated bounty/submission API routes and enforce creator/contributor access checks on every read and write.
4. Add a production-grade encryption key management strategy; the current helper is a local starting point.
5. Add database persistence only after verifying the corresponding on-chain transaction and PDA state.
6. Add integration tests for unauthorized reads, multiple submissions, expiry/refund, wrong winner, double acceptance and replayed signatures.
7. Implement and audit the on-chain dispute-resolution and platform-fee instructions; the current contract does not yet collect platform revenue or resolve contested escrow.
8. Configure a production Postgres provider, deploy the web app, and test with fresh Devnet wallets.
9. Record a real demo video only after the deployed flow works.

## Escrow policy decision required

The supplied mockup contains two different rules: page 2 says the creator gets funds back if the deadline passes without an accepted solution; page 8 says that if the creator does nothing during a review period, the reward is released to the contributor automatically. These are materially different financial outcomes. The initial contract follows the safer explicit rule: **creator can reclaim after the task deadline if no winner has been accepted**. It does not implement automatic payout to an unreviewed submission. Do not change this without an explicit product decision and a secure deterministic rule.

## Current implementation status

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for what is implemented in this revision and the remaining Devnet, smart-contract, security and deployment work.

## Security

- Never commit `.env`, wallet keypairs, seed phrases or private keys.
- The public Solana ledger is not private. Never put submission URLs, notes, or contents in program accounts or transaction logs.
- A hash proves integrity, not confidentiality. Keep content off-chain and enforce access control server-side.
- Have the program reviewed and tested before mainnet use. This repository targets Devnet only.
