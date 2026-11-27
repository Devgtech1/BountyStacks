# BountyStacks — agreed product specification

## Product
A browser-based bounty marketplace built on Solana. Creators publish tasks and lock SOL in escrow. Contributors compete openly. The creator selects one winner and the on-chain program transfers the full reward once. A public verification page reads the completion record.

## Roles
- Creator: posts and funds bounties; sees all submissions to their own bounty; reviews and accepts one.
- Contributor: browses open bounties; submits work; sees only their own submissions and status.
- Public visitor: browses bounty metadata and submission counts; cannot see submission contents; can verify completed work on Solana.

## Privacy
Solana accounts and transaction data are public. The program stores only task metadata required for escrow, requirements hashes, submission hashes and completion proof. Submission text, notes and private links stay in PostgreSQL, encrypted at rest. API responses are authorised using a signed wallet session.

## Competition model
Open competition. Any number of contributors can submit before the deadline. Exactly one accepted submission wins the full reward. The interface must state this rule clearly.

## Main pages from the supplied PDF
1. Landing / browse bounty marketplace (dark and light themes).
2. Bounty detail and private submission.
3. Wallet connection and creator/contributor role selection.
4. Contributor dashboard.
5. Creator dashboard.
6. Post a bounty.
7. Verify completion.
8. Review submission and acceptance criteria.

## Explicitly not in the first release
Community/team accounts, split payouts, claim-first reservations, NFT badges, dispute arbitration, milestones and automatic payout to an unreviewed submission.
