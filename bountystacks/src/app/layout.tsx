import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { SolanaWalletProvider } from '@/components/wallet/wallet-provider';
import { Navbar } from '@/components/layout/navbar';
export const metadata: Metadata = { title:'BountyStacks — Get work done. Get paid on-chain.', description:'A Solana-powered bounty platform with escrow and verifiable completion records.' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="en" suppressHydrationWarning><body><ThemeProvider><SolanaWalletProvider><Navbar/><main>{children}</main></SolanaWalletProvider></ThemeProvider></body></html>; }
