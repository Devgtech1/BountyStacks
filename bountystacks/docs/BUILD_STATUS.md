# Build status

Last verified: 2026-11-27.

## What is verified working

- `npm ci` installs cleanly from the committed `package-lock.json`.
- `npm run lint` passes.
- `npm run typecheck` (`prisma generate && tsc --noEmit`) passes.
- `npm run build` produces a production Next.js build.
- `npx prisma db push` applies the schema to a real PostgreSQL 16 database.
- The Next.js dev server serves the landing page, create page, bounty detail,
  review page, verify page and the auth/bounty/submission APIs.
- The Anchor program compiles with the Solana SBF toolchain:
  - `target/deploy/bountystacks.so` (263 KB)
  - `target/idl/bountystacks.json`
- Program ID: `5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg`

## Toolchain used

- Node.js 20+, Next.js 15.5.x, Prisma 6.19.x
- Solana CLI 2.1.0, Anchor CLI 0.31.1, platform-tools v1.43 (Rust 1.79)
- The program pins `anchor-lang = 0.31.1` and several transitive crates in
  `Cargo.lock` so the SBF toolchain's Rust 1.79 can compile them. Do not run a
  bare `cargo update` without re-checking the MSRV of the new versions.

## Still outstanding

- Deploy the program to devnet (blocked on devnet SOL from
  https://faucet.solana.com for the deployer wallet).
- Point a production database (Supabase/Neon PostgreSQL) at the deployed app.
- Deploy the Next.js app to a host (e.g. Vercel) and configure environment
  variables.
- Run the end-to-end devnet smoke test (`npx tsx scripts/e2e.ts`) with two
  funded wallets.
- Independent security review before any mainnet or real-value use.
