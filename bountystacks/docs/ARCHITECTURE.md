# BountyStacks architecture

## Trust boundary

The browser is an untrusted client. A connected wallet signs a nonce to establish a short-lived application session. The server authorises every private submission read using the wallet address in that session. A wallet address sent in a request body is never treated as authentication.

## On-chain responsibilities

The Anchor program owns task escrow and the public state machine. Task PDAs are derived from `task`, creator public key and an eight-byte little-endian task ID. Submission PDAs are derived from `submission`, task PDA and contributor public key. Completion PDAs are derived from `completion` and task PDA.

Only hashes of requirements and solutions are stored in program accounts. The program accepts one winner and transfers the locked reward once. If a task expires while still open, the creator can call the refund instruction.

## Off-chain responsibilities

PostgreSQL stores display content, deadlines, criteria, private submissions and indexing metadata. Submission content is encrypted using AES-256-GCM before insertion. The API returns a contributor's own submissions or all submissions to the bounty creator, never the submissions of another contributor.

The API verifies relevant confirmed Devnet transactions and reads the resulting program-owned PDA before it registers a bounty, submission or completion record. This keeps the database from being the authority for escrow state.

## Important product-policy mismatch

The supplied mockup's bounty rules and review panel disagree about what happens when a creator does not review a submission. Current program behaviour is conservative: no automatic winner is selected; after the bounty deadline, the creator can reclaim the escrow if the task is still open. Automatic release to an unreviewed submission is not implemented because the program cannot infer quality or acceptance criteria without a deterministic, agreed rule.

## Security caveats

The first-pass code is not audited. Session signing, rate limiting, CSRF/origin policy, key rotation, database backups, encrypted object storage for uploaded files, abuse prevention, and transaction replay handling require production hardening. Never deploy to mainnet without a security review.
