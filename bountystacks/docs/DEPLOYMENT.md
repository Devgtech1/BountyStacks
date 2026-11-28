# Deployment guide (devnet)

This is the exact procedure used to build, deploy and verify BountyStacks.

## Program deployment record

| Item | Value |
| --- | --- |
| Cluster | Solana devnet |
| Program ID | `5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg` |
| Program data account | `DtarwshXPZ8DGMNdBJ9LXgNmHCXLLjGUZTUJEypoWxDf` |
| Upgrade authority | `fDU4KBfU3LSwnGTfTMsZXRp673J7E5RVPz1nQb9WEsf` |
| Deploy signature | `2jWCZPGZaoh1MtBooBkXd5zpm6ftXivjuUTt9tjoSXZqAc7QriZpbiBkvrFjPDZ4daBDk3neaXFkGdhqGcvXyxUu` |
| Explorer | https://explorer.solana.com/address/5n4acPr6EXFp1USWDxAtk3Fqiex9tsLa7yTK8wjHz4yg?cluster=devnet |

The upgrade authority keypair lives **outside** the repository. Back it up
securely; without it the program cannot be upgraded.

## 1. Toolchain

Install on Linux or WSL2 (Windows does not have the Solana SBF toolchain):

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v2.1.0/install)"   # Solana CLI 2.1.0
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked
rustup toolchain install 1.86.0   # host toolchain for Anchor itself
```

## 2. Build

```bash
cd bountystacks
anchor keys sync          # writes the generated program id into lib.rs and Anchor.toml
anchor build              # -> target/deploy/bountystacks.so + target/idl/bountystacks.json
```

**Important:** the SBF toolchain ships Rust 1.79, which cannot compile crates
that need edition 2024 or a newer MSRV. `Cargo.lock` pins a compatible set
(`anchor-lang = 0.31.1`, `blake3 1.5.5`, `indexmap 2.7.1`, `ahash 0.8.11`,
`proc-macro-crate 3.2.0`, `zeroize 1.8.1`, the `wasm-bindgen 0.2.128` family,
`unicode-segmentation 1.12.0`). Do not run a bare `cargo update`.

## 3. Deploy

```bash
solana config set --url https://api.devnet.solana.com
solana balance                 # the deployer needs ~1.5 SOL
anchor deploy --provider.cluster devnet
```

Devnet SOL must come from https://faucet.solana.com — the JSON-RPC faucet is
closed. 2 SOL is enough to deploy this program (rent ~1.34 SOL).

## 4. Database (Supabase)

1. Create a project at https://supabase.com (free tier).
2. Project Settings → Database → Connection string → **Session pooler** URI.
3. Replace `[YOUR-PASSWORD]` with the database password.
4. Apply the schema from your machine:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
npx prisma db push
```

Prisma needs the direct/session connection for migrations; the app itself can
use the same URL.

## 5. Web app (Vercel)

```bash
npx vercel login          # browser device flow
npx vercel link           # link to the Devgtech1/BountyStacks project
npx vercel env add DATABASE_URL production
npx vercel env add SESSION_SECRET production
npx vercel env add SUBMISSION_ENCRYPTION_KEY production
npx vercel env add ADMIN_WALLET_ADDRESSES production
npx vercel env add NEXT_PUBLIC_SOLANA_CLUSTER production
npx vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
npx vercel env add NEXT_PUBLIC_SOLANA_PROGRAM_ID production
npx vercel env add APP_URL production
npx vercel --prod
```

`NEXT_PUBLIC_*` values are baked in at build time, so set them before the
production build.

## 6. Verify

```bash
npx tsx scripts/e2e.ts     # create -> submit -> accept -> verify on devnet
```

The smoke test needs the web server running, a funded creator keypair at
`.devnet/creator.json` (or `CREATOR_KEYPAIR=/path/to/keypair.json`) and the
program id in `.env`.
