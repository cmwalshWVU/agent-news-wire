import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { Header } from '@/components/Header';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent News Wire - Bloomberg Terminal for the Agent Economy',
  description: 'Real-time crypto intelligence feed for AI agents. SEC filings, DeFi yields, whale movements, and more.',
  keywords: ['crypto', 'AI', 'blockchain', 'news', 'alerts', 'Solana', 'DeFi'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-white/10 py-6 text-center text-dark-400 text-sm">
              <p>Agent News Wire &copy; 2026 | Powered by Solana</p>
              <p className="mt-1 text-xs">Trial Mode - All features free</p>
            </footer>
          </div>
          <Toaster 
            position="bottom-right" 
            theme="dark"
            toastOptions={{
              style: {
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
