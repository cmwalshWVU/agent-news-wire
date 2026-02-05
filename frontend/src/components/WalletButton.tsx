'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton with SSR disabled to prevent hydration mismatch
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export const WalletButton = () => {
  return (
    <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !h-10" />
  );
};
