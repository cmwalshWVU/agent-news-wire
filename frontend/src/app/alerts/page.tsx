'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Filter, Wifi, WifiOff, Pause, Play } from 'lucide-react';
import { fetchAlerts, fetchChannels, createAlertWebSocket, createSubscription, type Alert, type Channel } from '@/lib/api';
import { AlertCard } from '@/components/AlertCard';
import { toast } from 'sonner';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  
  // Load initial data
  useEffect(() => {
    const load = async () => {
      try {
        const [alertsData, channelsData] = await Promise.all([
          fetchAlerts(selectedChannel === 'all' ? undefined : selectedChannel, 50),
          fetchChannels(),
        ]);
        setAlerts(alertsData.alerts || []);
        setChannels(channelsData.channels || []);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedChannel]);
  
  // Handle new live alert
  const handleNewAlert = useCallback((alert: Alert) => {
    if (paused) return;
    
    // Check if matches selected channel
    if (selectedChannel !== 'all' && alert.channel !== selectedChannel) return;
    
    setLiveAlerts((prev) => [alert, ...prev].slice(0, 100));
    toast(`New Alert: ${alert.headline.substring(0, 50)}...`, {
      icon: <Bell className="w-4 h-4 text-primary-400" />,
    });
  }, [paused, selectedChannel]);
  
  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    
    const connect = async () => {
      // Check for existing subscriber ID in localStorage
      let subscriberId = localStorage.getItem('anw-subscriber-id');
      
      if (!subscriberId) {
        // Create a new subscription with all available channels
        const allChannels = [
          'regulatory/sec',
          'regulatory/cftc',
          'regulatory/global',
          'institutional/banks',
          'institutional/asset-managers',
          'defi/yields',
          'defi/hacks',
          'defi/protocols',
          'rwa/tokenization',
          'networks/solana',
          'networks/ethereum',
          'networks/hedera',
          'networks/ripple',
          'networks/bitcoin',
          'markets/whale-movements',
          'markets/liquidations'
        ];
        try {
          const res = await createSubscription(allChannels);
          subscriberId = res.subscriber.id;
          localStorage.setItem('anw-subscriber-id', subscriberId);
          console.log('[Alerts] Created new subscription:', subscriberId);
        } catch (err) {
          console.error('[Alerts] Failed to create subscription:', err);
          return;
        }
      }
      
      ws = createAlertWebSocket(
        subscriberId,
        handleNewAlert,
        (error) => {
          console.error('WS Error:', error);
          setWsConnected(false);
          // Clear invalid subscriber ID if connection fails
          if (error.includes('not found')) {
            localStorage.removeItem('anw-subscriber-id');
          }
        },
        () => setWsConnected(true),
        () => setWsConnected(false)
      );
    };
    
    connect();
    
    return () => {
      ws?.close();
    };
  }, [handleNewAlert]);
  
  // Combine live and historical alerts
  const allAlerts = [...liveAlerts, ...alerts.filter(
    a => !liveAlerts.find(la => la.alertId === a.alertId)
  )];
  
  const filteredAlerts = selectedChannel === 'all' 
    ? allAlerts 
    : allAlerts.filter(a => a.channel === selectedChannel);
  
  // Group channels by category
  const channelsByCategory = channels.reduce((acc, ch) => {
    if (!acc[ch.category]) acc[ch.category] = [];
    acc[ch.category].push(ch);
    return acc;
  }, {} as Record<string, Channel[]>);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alerts Feed</h1>
          <p className="text-dark-400 mt-1">Real-time crypto intelligence</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            {wsConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-dark-400" />
                <span className="text-dark-400">Offline</span>
              </>
            )}
          </div>
          
          {/* Pause/Play */}
          <button
            onClick={() => setPaused(!paused)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${paused ? 'bg-primary-500 text-white' : 'bg-dark-700 hover:bg-dark-600'}
            `}
          >
            {paused ? (
              <>
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Live Alert Count */}
      {liveAlerts.length > 0 && (
        <div className="mb-4 flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400">{liveAlerts.length} new alerts since loading</span>
        </div>
      )}
      
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar - Channel Filter */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-dark-800/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-4 h-4 text-dark-400" />
              <span className="font-medium">Filter Channels</span>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setSelectedChannel('all')}
                className={`
                  w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                  ${selectedChannel === 'all' ? 'bg-primary-500/20 text-primary-300' : 'hover:bg-white/5'}
                `}
              >
                All Channels
              </button>
              
              {Object.entries(channelsByCategory).map(([category, chs]) => (
                <div key={category}>
                  <div className="text-xs text-dark-400 uppercase tracking-wider mb-2 px-3">
                    {category}
                  </div>
                  {chs.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${selectedChannel === ch.id ? 'bg-primary-500/20 text-primary-300' : 'hover:bg-white/5 text-dark-300'}
                      `}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content - Alerts */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-dark-700 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert, index) => (
                <div 
                  key={alert.alertId} 
                  className={index < liveAlerts.length ? 'animate-slide-in' : ''}
                >
                  <AlertCard alert={alert} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Alerts Found</h3>
              <p className="text-dark-400">
                {selectedChannel === 'all' 
                  ? 'No alerts have been recorded yet.' 
                  : `No alerts in the ${selectedChannel} channel.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
