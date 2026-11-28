# BountyStacks implementation status

This file distinguishes verified functionality from work that still requires
implementation or an independent review.

## Verified in this revision

- PostgreSQL/Prisma schema applied to a hosted Supabase PostgreSQL database and
  to a local PostgreSQL 16 instance.
- `npm ci`, `npm run lint`, `npm run typecheck` and `npm run build` pass.
- The Anchor program compiles with the Solana SBF toolchain and is deployed to
  devnet at `5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg`.
- Browser transaction builders for `create_task`, `submit_solution`,
  `accept_submission` and `refund_expired_task` send real devnet transactions.
- The end-to-end flow was exercised on devnet: create (with escrow) → submit →
  accept (winner paid 0.1 SOL) → verify the completion record.
- Server-side verification of the on-chain task/submission/completion accounts
  before the database is updated.
- Wallet sign-in (nonce challenge + signature) and session cookie handling.
- Administrator wallet allowlist, admin overview API and `/admin` panel.
- Expiry refunds are rejected on-chain once any submission exists.

## Still required before a real-money or production launch

- Add and audit an on-chain dispute-resolution instruction. Admin dispute
  decisions currently record an outcome only; escrow remains locked and no
  funds move from the admin API.
- Implement platform-fee collection in the Anchor program. A database setting
  or frontend calculation is not sufficient to enforce fees.
- Implement a review window and a deterministic timeout/escalation path. Do not
  automatically pay an arbitrary submission when a creator becomes inactive.
- Add automated integration/security tests covering unauthorized access, bans,
  report handling, duplicate submissions, refunds with submissions, dispute
  outcomes and fee accounting.
- Obtain an independent smart-contract security review before mainnet use.

## Important limitations

- The platform targets Solana **devnet** only.
- Admin moderation prevents further application access but cannot confiscate or
  freeze SOL held in a PDA unless the on-chain program explicitly provides a
  secure, audited rule for that action.
- A database dispute decision is not an on-chain settlement.
- Platform revenue must be read from confirmed treasury transactions, not
  inferred from completed bounty volume.
- The program is not audited. Do not accept real-value SOL.
