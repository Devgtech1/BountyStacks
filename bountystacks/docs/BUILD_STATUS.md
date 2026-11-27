# Build status at handoff

This package contains a first-pass Next.js web project, Prisma schema, wallet nonce authentication, submission encryption helper, initial API handlers, an Anchor escrow program draft, TypeScript test draft, README, architecture notes and a sub-three-minute demo script.

Not completed or verified in this environment:

- `npm install`, Prisma migration, TypeScript build and Next.js production build.
- Anchor/Rust compilation and `anchor test` (Rust, Solana CLI and Anchor are not installed in the build environment).
- Generated Anchor IDL and frontend Anchor client transaction builders.
- Fully wired create/submit/accept/refund browser flows.
- Database-backed dashboards and full bounty list/detail APIs.
- Live PostgreSQL credentials, Devnet program deployment, program ID and Explorer address.
- Live web deployment and real screen recording.

The repository intentionally does not contain credentials or pretend a Devnet program has already been deployed. Complete the checklist in the README before presenting the application as fully functional.
