# BountyStacks implementation status

This file distinguishes code added in this working revision from functionality that still requires a live environment or further implementation.

## Added in this revision

- PostgreSQL/Prisma models for user moderation state, reports, disputes, audit logs, and platform settings.
- Server-side administrator wallet allowlist via `ADMIN_WALLET_ADDRESSES`.
- Protected administrator overview API and `/admin` control panel.
- Admin actions to activate, suspend, or ban a wallet account, with an audit event.
- Dispute record creation by a bounty creator or a contributor who has submitted to that bounty.
- Administrative dispute decision recording. This does not move SOL.
- Authenticated dashboard API aggregating creator and contributor records from PostgreSQL.
- Creator and contributor dashboards now render database-backed records and statistics instead of hardcoded placeholder cards.
- The Anchor expiry-refund instruction now rejects refunds when at least one on-chain submission exists. This closes the specific creator-refund-after-submission loophole in that instruction.

## Still required before a real-money or production launch

- Apply the updated Prisma schema to a configured PostgreSQL database (`npx prisma db push` for the current MVP workflow).
- Configure a secure `SESSION_SECRET`, `SUBMISSION_ENCRYPTION_KEY`, `DATABASE_URL`, and `ADMIN_WALLET_ADDRESSES`.
- Compile and test the modified Anchor program with the target Anchor/Solana toolchain.
- Add and audit an on-chain dispute-resolution instruction. Admin dispute decisions currently record an outcome only; escrow remains locked and no funds are transferred by the admin API.
- Implement platform-fee collection in the Anchor program. A database setting or frontend calculation is not sufficient to enforce fees.
- Finish the Anchor client and wallet transaction builders for create, submit, accept, refund and dispute flows.
- Implement a review window and a deterministic timeout/escalation path. Do not automatically pay an arbitrary submission when a creator becomes inactive.
- Add automated integration/security tests, including unauthorized access, bans, report handling, duplicate submissions, refunds with submissions, dispute outcomes and fee accounting.
- Deploy the program to Devnet, configure the actual program ID and generated IDL, deploy the web app and test with fresh wallets.
- Obtain an independent smart-contract security review before mainnet use.

## Important limitations

- The platform currently targets Solana Devnet.
- Admin moderation prevents further application access but cannot confiscate or freeze SOL held in a PDA unless the on-chain program explicitly provides a secure, audited rule for that action.
- A database dispute decision is not an on-chain settlement.
- Collected platform revenue must be read from confirmed treasury transactions, not inferred from completed bounty volume.
- This revision has not been compiled or tested in this environment. Do not treat it as a completed, audited deployment.

## Local setup actions required from the project owner

1. Run `npm install` from the folder containing `package.json` (the extracted `bountystacks` folder).
2. Copy `.env.example` to `.env` and configure PostgreSQL, session/encryption secrets, Devnet RPC/program ID (after deployment), and the admin wallet public key.
3. Run `npx prisma generate` and `npx prisma db push` after the database is configured.
4. Run `npm run typecheck` and `npm run build`; send the complete first error output if either fails.
5. Install the Rust, Solana CLI and Anchor toolchain in WSL2 or a supported Linux environment, then run `anchor build` and `anchor test`.
6. Fund a separate test wallet with Devnet SOL, deploy the program, and provide the public program ID (never share wallet seed phrases or private keys).

Do not deploy to mainnet or accept real-value SOL until the escrow, fee and dispute instructions have been audited.
