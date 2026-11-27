# Deployment readiness — BountyStacks

This document is intentionally conservative. A successful Next.js build alone does not mean the marketplace is end-to-end functional.

## What this source package currently provides

- Next.js App Router interface and wallet connection components.
- Wallet-message authentication backed by PostgreSQL/Prisma.
- Encrypted off-chain submission storage helpers.
- Initial API routes for bounties, submissions, dashboards, reports, disputes and admin moderation.
- An Anchor escrow program draft with create, submit, accept and no-submission expiry-refund instructions.
- Anchor integration-test source covering payment, duplicate acceptance, creator self-submission, minimum reward, expiry refund, refund blocking after submission and unauthorized refund attempts.

## Blocking items before a public Devnet demo

1. Install dependencies and run `npm run typecheck` and `npm run build` from this directory.
2. Generate the Prisma client and apply `prisma/schema.prisma` to the configured Supabase/PostgreSQL database.
3. Build and test the Anchor program with the supported Rust, Solana and Anchor toolchain. The test source is not evidence that the tests pass.
4. Generate the Anchor IDL, deploy the program to Devnet, and configure the actual deployed program ID. The current program ID is an Anchor placeholder.
5. Implement and verify browser transaction construction for create, submit, accept and refund. The current create-bounty page deliberately does not send transactions; it displays a readiness message instead.
6. Implement and verify on-chain dispute settlement and platform-fee collection. Admin dispute decisions currently update database records only and do not move escrow funds. The contract currently pays the full advertised reward and does not collect the proposed platform fee.
7. Test the complete flow using fresh Devnet wallets and verify every transaction on Solana Explorer.
8. Deploy the web app with production environment variables and confirm the database, wallet authentication, RPC and program are reachable.

## Important safety notes

- Do not use mainnet or real-value SOL with this revision.
- Do not claim escrow is audited or production-secure.
- Do not claim the platform fee or dispute arbitration is enforced on-chain; neither is implemented in this contract revision.
- A dispute record in PostgreSQL is not an escrow resolution.
- The expiry-refund instruction intentionally rejects refunds if any submission exists. Until a tested on-chain dispute/settlement path exists, those funds can remain locked.
- Never commit `.env`, wallet keypairs, seed phrases or private keys.
- The `.env.example` file contains placeholders only. Create `.env` locally and generate fresh secrets privately.

## Running the website locally

Do not use VS Code Live Server / “Go Live” for this Next.js project. From the folder containing `package.json`, run:

```bash
npm install
npx prisma generate
npm run dev
```

Then open `http://localhost:3000` in a browser. Use `npm run build` for a production build check.
