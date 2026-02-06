'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { 
  Bell, Users, DollarSign, Activity, RefreshCw, 
  ExternalLink, Zap, Wallet, AlertCircle, Plus,
  Radio, WifiOff, Wifi
} from 'lucide-react';
import { fetchStats, fetchAlerts, getPDAInfo, createSubscription, type Stats, type Alert, type PDAInfo } from '@/lib/api';
import { decodeChannelBitmap, getChannelShortName, getCategoryColor } from '@/lib/channels';
import { useAlertWebSocket } from '@/hooks/useAlertWebSocket';
import { AlertCard } from '@/components/AlertCard';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { publicKey, connected, connecting } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pdaInfo, setPdaInfo] = useState<PDAInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriberId, setSubscriberId] = useState<string | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [wsEnabled, setWsEnabled] = useState(false);
  
  // Track if we've already tried to setup subscription
  const setupAttemptedRef = useRef(false);
  
  // Decode channels from bitmap
  const subscribedChannels = pdaInfo?.subscriber?.channels 
    ? decodeChannelBitmap(pdaInfo.subscriber.channels)
    : [];

  // Handle incoming live alerts
  const handleLiveAlert = useCallback((alert: Alert) => {
    setLiveAlerts(prev => [alert, ...prev].slice(0, 20));
    toast.success(`New Alert: ${alert.headline.slice(0, 50)}...`, {
      description: alert.channel,
      duration: 5000,
    });
  }, []);

  // WebSocket connection for live alerts
  const { 
    connected: wsConnected, 
    connecting: wsConnecting, 
    error: wsError,
    alertsReceived: wsAlertsReceived,
  } = useAlertWebSocket({
    subscriberId,
    onAlert: handleLiveAlert,
    enabled: wsEnabled,
  });

  const loadData = useCallback(async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        fetchStats(),
        fetchAlerts(undefined, 20),
      ]);
      setStats(statsData);
      setAlerts(alertsData.alerts || []);
      
      // Only fetch PDA info if wallet is connected
      if (publicKey) {
        try {
          const pda = await getPDAInfo(publicKey.toBase58());
          setPdaInfo(pda);
        } catch (err) {
          console.error('Failed to fetch PDA info:', err);
          setPdaInfo(null);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);
  
  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Clear state when wallet disconnects
  useEffect(() => {
    if (!publicKey) {
      setPdaInfo(null);
      setSubscriberId(null);
      setLiveAlerts([]);
      setWsEnabled(false);
      setupAttemptedRef.current = false;
    }
  }, [publicKey]);
  
  // Load data on mount and when wallet changes
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Setup API subscription when on-chain subscription is detected
  useEffect(() => {
    const setupSubscription = async () => {
      if (!publicKey || !pdaInfo?.existsOnChain || subscriberId || setupAttemptedRef.current) {
        return;
      }
      
      const channels = pdaInfo.subscriber?.channels 
        ? decodeChannelBitmap(pdaInfo.subscriber.channels)
        : [];
      
      if (channels.length === 0) {
        return;
      }
      
      setupAttemptedRef.current = true;
      
      try {
        const result = await createSubscription(channels, publicKey.toBase58());
        if (result.success) {
          setSubscriberId(result.subscriber.id);
          setWsEnabled(true);
          console.log('[Dashboard] Created API subscription:', result.subscriber.id);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to create API subscription:', err);
        setupAttemptedRef.current = false; // Allow retry
      }
    };

    setupSubscription();
  }, [publicKey, pdaInfo?.existsOnChain, pdaInfo?.subscriber?.channels, subscriberId]);

  // Combine live alerts with fetched alerts (live alerts first, deduplicated)
  const combinedAlerts = [...liveAlerts, ...alerts.filter(
    a => !liveAlerts.find(la => la.alertId === a.alertId)
  )].slice(0, 20);
  
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
      
      {/* Subscription Status Section */}
      {!connected ? (
        /* Not Connected - Show CTA */
        <div className="bg-gradient-to-r from-primary-900/30 to-dark-800/50 border border-primary-500/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-primary-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">Connect Your Wallet</h2>
                <p className="text-dark-300 text-sm max-w-md">
                  Connect your Solana wallet to create an on-chain subscription and receive 
                  real-time alerts via WebSocket. Trial mode is active - all features are free!
                </p>
              </div>
            </div>
            <button
              onClick={() => setWalletModalVisible(true)}
              disabled={connecting}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Wallet className="w-4 h-4" />
              <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          </div>
        </div>
      ) : pdaInfo?.existsOnChain ? (
        /* Connected & Subscribed - Show Full Status */
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary-400" />
              <span>Your Subscription</span>
            </h2>
            <div className="flex items-center space-x-3">
              {/* WebSocket Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                wsConnected 
                  ? 'bg-green-500/20 text-green-400' 
                  : wsConnecting 
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-dark-600 text-dark-400'
              }`}>
                {wsConnected ? (
                  <>
                    <Radio className="w-3 h-3 animate-pulse" />
                    <span>Live</span>
                  </>
                ) : wsConnecting ? (
                  <>
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>
              <a 
                href={`https://explorer.solana.com/address/${pdaInfo.subscriberPDA}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-dark-400 hover:text-primary-400 flex items-center space-x-1"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          
          {/* Status Row */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-sm text-dark-400 mb-1">Status</div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <span className={`font-medium ${wsConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {wsConnected ? 'Live' : 'Active On-Chain'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-400 mb-1">Balance</div>
              <div className="font-medium">
                {stats?.pricing.trialMode ? (
                  <span className="text-green-400">Unlimited (Trial)</span>
                ) : (
                  `${pdaInfo.subscriber?.balance.toFixed(2)} USDC`
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-400 mb-1">Alerts Received</div>
              <div className="font-medium">
                {(pdaInfo.subscriber?.alertsReceived || 0) + wsAlertsReceived}
                {wsAlertsReceived > 0 && (
                  <span className="text-green-400 text-sm ml-1">(+{wsAlertsReceived} live)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-400 mb-1">Channels Active</div>
              <div className="font-medium">{subscribedChannels.length}</div>
            </div>
          </div>
          
          {/* Subscribed Channels */}
          <div>
            <div className="text-sm text-dark-400 mb-2">Subscribed Channels</div>
            {subscribedChannels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subscribedChannels.map((channel) => (
                  <span 
                    key={channel}
                    className={`px-3 py-1 rounded-full text-sm border ${getCategoryColor(channel)}`}
                  >
                    {getChannelShortName(channel)}
                  </span>
                ))}
                <a
                  href="/subscribe"
                  className="px-3 py-1 rounded-full text-sm border border-dashed border-dark-500 text-dark-400 hover:border-primary-500 hover:text-primary-400 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Manage</span>
                </a>
              </div>
            ) : (
              <div className="text-dark-400 text-sm">
                No channels subscribed yet.{' '}
                <a href="/subscribe" className="text-primary-400 hover:underline">
                  Add channels →
                </a>
              </div>
            )}
          </div>

          {/* WebSocket Error */}
          {wsError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {wsError}
            </div>
          )}
        </div>
      ) : (
        /* Connected but Not Subscribed */
        <div className="bg-dark-800/50 border border-amber-500/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">No Subscription Found</h2>
                <p className="text-dark-300 text-sm max-w-md">
                  Your wallet is connected but doesn't have an on-chain subscription yet. 
                  Create one to start receiving real-time alerts.
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Wallet: {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-6)}
                </p>
              </div>
            </div>
            <a
              href="/subscribe"
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              <span>Create Subscription</span>
            </a>
          </div>
        </div>
      )}
      
      {/* Channel Breakdown & Recent Alerts */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Alerts by Channel</h2>
          <div className="bg-dark-800/50 border border-white/10 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
            {stats && Object.entries(stats.alerts.byChannel)
              .sort(([,a], [,b]) => b - a)
              .map(([channel, count]) => {
                const isSubscribed = subscribedChannels.includes(channel);
                return (
                  <div key={channel} className="flex items-center justify-between">
                    <span className={`text-sm ${isSubscribed ? 'text-primary-400' : 'text-dark-300'}`}>
                      {isSubscribed && '● '}{channel}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })
            }
            {(!stats || Object.keys(stats.alerts.byChannel).length === 0) && (
              <div className="text-center text-dark-400 py-4">
                No alerts yet
              </div>
            )}
          </div>
          {connected && subscribedChannels.length > 0 && (
            <p className="text-xs text-dark-500 mt-2">● = subscribed channel</p>
          )}
        </div>
        
        {/* Recent Alerts */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <span>{wsConnected ? 'Live Alerts' : 'Recent Alerts'}</span>
              {wsConnected && (
                <span className="flex items-center space-x-1 text-sm font-normal text-green-400">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Live</span>
                </span>
              )}
            </h2>
            <a 
              href="/alerts" 
              className="text-sm text-primary-400 hover:underline flex items-center space-x-1"
            >
              <span>View all</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-4">
            {combinedAlerts.slice(0, 5).map((alert) => {
              const isFromSubscribed = subscribedChannels.includes(alert.channel);
              const isLive = liveAlerts.find(la => la.alertId === alert.alertId);
              return (
                <div 
                  key={alert.alertId} 
                  className={`${isFromSubscribed ? 'ring-1 ring-primary-500/30 rounded-xl' : ''}`}
                >
                  {isLive && (
                    <div className="text-xs text-green-400 mb-1 flex items-center space-x-1">
                      <Radio className="w-3 h-3" />
                      <span>Just received</span>
                    </div>
                  )}
                  <AlertCard alert={alert} compact />
                </div>
              );
            })}
            {combinedAlerts.length === 0 && (
              <div className="text-center text-dark-400 py-8 bg-dark-800/30 rounded-xl">
                No alerts yet. Check back soon!
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* API Status */}
      <div className="bg-dark-800/30 border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center space-x-4">
            <span className="text-dark-400">API Status:</span>
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400">Connected</span>
            </span>
            {wsConnected && (
              <>
                <span className="text-dark-600">|</span>
                <span className="flex items-center space-x-2">
                  <Radio className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-green-400">WebSocket Live</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-dark-400">
              Network: <span className="text-white">{stats?.onChain.network?.toUpperCase() || 'DEVNET'}</span>
            </div>
            {connected && (
              <div className="text-dark-400">
                Wallet: <span className="text-white">{publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}</span>
              </div>
            )}
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
