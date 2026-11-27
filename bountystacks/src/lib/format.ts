export const shortWallet = (value: string) => `${value.slice(0, 4)}…${value.slice(-4)}`;
export const lamportsToSol = (lamports: bigint | number) => Number(lamports) / 1_000_000_000;
export const solToLamports = (sol: number) => BigInt(Math.round(sol * 1_000_000_000));
