'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Zap, LayoutDashboard, Bell, CreditCard, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/subscribe', label: 'Subscribe', icon: Settings },
  { href: '/balance', label: 'Balance', icon: CreditCard },
];

export const Header: FC = () => {
  const pathname = usePathname();
  
  return (
    <header className="sticky top-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <span className="font-bold text-lg">Agent News Wire</span>
              <span className="hidden sm:inline text-xs text-dark-400 ml-2">
                Trial Mode
              </span>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-primary-500/20 text-primary-300' 
                      : 'text-dark-300 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Wallet Button */}
          <div className="flex items-center">
            <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !h-10" />
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-white/10">
        <nav className="flex overflow-x-auto px-4 py-2 space-x-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap
                  ${isActive 
                    ? 'bg-primary-500/20 text-primary-300' 
                    : 'text-dark-400 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
