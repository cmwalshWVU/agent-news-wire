'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Bell, TrendingUp, Users, DollarSign, 
  Activity, RefreshCw, ExternalLink, Zap 
} from 'lucide-react';
import { fetchStats, fetchAlerts, getPDAInfo, type Stats, type Alert, type PDAInfo } from '@/lib/api';
import { AlertCard } from '@/components/AlertCard';

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pdaInfo, setPdaInfo] = useState<PDAInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadData = async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        fetchStats(),
        fetchAlerts(undefined, 20),
      ]);
      setStats(statsData);
      setAlerts(alertsData.alerts || []);
      
      if (publicKey) {
        const pda = await getPDAInfo(publicKey.toBase58());
        setPdaInfo(pda);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [publicKey]);
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-dark-700 rounded w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-dark-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-dark-700 rounded-xl"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-dark-400 mt-1">Real-time crypto intelligence</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Bell}
          label="Total Alerts"
          value={stats?.alerts.totalAlerts.toLocaleString() || '0'}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="On-Chain Subscribers"
          value={stats?.onChain.totalSubscribers.toString() || '0'}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Price/Alert"
          value={stats?.pricing.trialMode ? 'FREE' : `$${stats?.pricing.pricePerAlert}`}
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Alerts Delivered"
          value={stats?.onChain.totalAlertsDelivered.toLocaleString() || '0'}
          color="orange"
        />
      </div>
      
      {/* Wallet Status */}
      {connected && pdaInfo && (
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <span>Your Subscription</span>
          </h2>
          
          {pdaInfo.existsOnChain ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-dark-400 mb-1">Status</div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Active On-Chain</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-dark-400 mb-1">Balance</div>
                <div className="font-medium">
                  {stats?.pricing.trialMode ? 'Unlimited (Trial)' : `${pdaInfo.subscriber?.balance} USDC`}
                </div>
              </div>
              <div>
                <div className="text-sm text-dark-400 mb-1">Alerts Received</div>
                <div className="font-medium">{pdaInfo.subscriber?.alertsReceived}</div>
              </div>
            </div>
          ) : (
            <div className="text-dark-300">
              <p>No on-chain subscription found for this wallet.</p>
              <a href="/subscribe" className="text-primary-400 hover:underline mt-2 inline-block">
                Create subscription →
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* Channel Breakdown */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Alerts by Channel</h2>
          <div className="bg-dark-800/50 border border-white/10 rounded-xl p-4 space-y-3">
            {stats && Object.entries(stats.alerts.byChannel)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([channel, count]) => (
                <div key={channel} className="flex items-center justify-between">
                  <span className="text-sm text-dark-300">{channel}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            }
          </div>
        </div>
        
        {/* Recent Alerts */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            <a 
              href="/alerts" 
              className="text-sm text-primary-400 hover:underline flex items-center space-x-1"
            >
              <span>View all</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.alertId} alert={alert} compact />
            ))}
            {alerts.length === 0 && (
              <div className="text-center text-dark-400 py-8">
                No alerts yet. Check back soon!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* API Status */}
      <div className="bg-dark-800/30 border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-dark-400">API Status:</span>
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400">Connected</span>
            </span>
          </div>
          <div className="text-dark-400">
            Network: <span className="text-white">{stats?.onChain.network.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };
  
  return (
    <div className="bg-dark-800/50 border border-white/10 rounded-xl p-4">
      <div className="flex items-center space-x-3 mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-dark-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
