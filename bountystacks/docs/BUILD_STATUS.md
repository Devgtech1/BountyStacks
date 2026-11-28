# Build status

Last verified: 2026-11-27.

## What is verified working

- `npm ci` installs cleanly from the committed `package-lock.json`.
- `npm run lint` passes.
- `npm run typecheck` (`prisma generate && tsc --noEmit`) passes.
- `npm run build` produces a production Next.js build.
- `npx prisma db push` applies the schema to a real PostgreSQL 17 database
  (Supabase) and to local PostgreSQL 16.
- The site is deployed at **https://bountystacks.vercel.app** and
  `/api/health` reports `{"ok":true,"database":"connected","network":"devnet"}`.
- The Next.js dev server serves the landing page, create page, bounty detail,
  review page, verify page and the auth/bounty/submission APIs.
- The Anchor program compiles with the Solana SBF toolchain and is deployed to
  devnet:
  - `target/deploy/bountystacks.so` (263 KB)
  - `target/idl/bountystacks.json`
- The end-to-end devnet flow passes: create (with escrow) → submit → accept
  (winner paid) → verify the completion record.
- Program ID: `5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg`

## Toolchain used

- Node.js 20+, Next.js 15.5.x, Prisma 6.19.x
- Solana CLI 2.1.0, Anchor CLI 0.31.1, platform-tools v1.43 (Rust 1.79)
- The program pins `anchor-lang = 0.31.1` and several transitive crates in
  `Cargo.lock` so the SBF toolchain's Rust 1.79 can compile them. Do not run a
  bare `cargo update` without re-checking the MSRV of the new versions.

## Still outstanding

- Point a custom domain at the Vercel project (optional).
- Run the end-to-end smoke test against the deployed URL with two fresh funded
  wallets.
- Independent security review before any mainnet or real-value use.
- Dispute resolution and platform fees are not implemented on-chain.
