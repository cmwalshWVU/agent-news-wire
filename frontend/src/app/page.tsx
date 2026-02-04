'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Bell, Shield, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { fetchStats, type Stats } from '@/lib/api';

const features = [
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Get instant notifications on SEC filings, whale movements, DeFi yields, and breaking news.',
  },
  {
    icon: Shield,
    title: 'On-Chain Subscriptions',
    description: 'Powered by Solana. Your subscription lives on-chain with transparent pricing.',
  },
  {
    icon: TrendingUp,
    title: '17 Channels',
    description: 'From regulatory filings to whale movements. Subscribe only to what matters.',
  },
  {
    icon: Zap,
    title: 'Built for Agents',
    description: 'REST API + WebSocket. Perfect for AI agents, trading bots, and automation.',
  },
];

const channels = [
  { name: 'SEC Filings', category: 'regulatory' },
  { name: 'DeFi Yields', category: 'defi' },
  { name: 'Whale Movements', category: 'markets' },
  { name: 'XRP/Ripple', category: 'networks' },
  { name: 'Hedera/HBAR', category: 'networks' },
  { name: 'Bitcoin', category: 'networks' },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(console.error);
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center space-x-2 bg-primary-500/20 text-primary-300 px-4 py-2 rounded-full text-sm mb-6">
          <Zap className="w-4 h-4" />
          <span>Trial Mode Active - All Features Free</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl font-bold mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">
            Bloomberg Terminal
          </span>
          <br />
          <span className="text-white">for the Agent Economy</span>
        </h1>
        
        <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-8">
          Real-time crypto intelligence feed for AI agents. SEC filings, DeFi yields,
          whale movements, and breaking news — delivered instantly.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            <span>View Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            <span>Create Subscription</span>
          </Link>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <StatCard 
            label="Total Alerts" 
            value={stats.alerts.totalAlerts.toLocaleString()} 
          />
          <StatCard 
            label="On-Chain Subscribers" 
            value={stats.onChain.totalSubscribers.toString()} 
          />
          <StatCard 
            label="Price/Alert" 
            value={stats.pricing.trialMode ? 'FREE' : `$${stats.pricing.pricePerAlert}`} 
          />
          <StatCard 
            label="Network" 
            value={stats.onChain.network.toUpperCase()} 
          />
        </div>
      )}
      
      {/* Features */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-dark-800/50 border border-white/10 rounded-xl p-6 hover:border-primary-500/50 transition-colors"
            >
              <div className="p-3 bg-primary-500/20 rounded-lg w-fit mb-4">
                <feature.icon className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-dark-300 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Channels */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Available Channels</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {channels.map((channel, i) => (
            <span
              key={i}
              className={`px-4 py-2 rounded-full text-sm font-medium channel-${channel.category}`}
            >
              {channel.name}
            </span>
          ))}
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white">
            +11 more
          </span>
        </div>
      </div>
      
      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-primary-900/50 to-blue-900/50 rounded-2xl p-12 border border-primary-500/30">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-dark-300 mb-6 max-w-lg mx-auto">
          Connect your Solana wallet, pick your channels, and start receiving real-time alerts.
          Trial mode is active — everything is free.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/subscribe"
            className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Create Subscription</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-800/50 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-dark-400">{label}</div>
    </div>
  );
}
