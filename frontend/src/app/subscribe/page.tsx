'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { 
  CheckCircle, Circle, Loader2, Wallet, Zap, 
  AlertTriangle, ExternalLink, Check
} from 'lucide-react';
import { 
  fetchChannels, createSubscription, buildCreateTx, 
  getPDAInfo, type Channel, type PDAInfo 
} from '@/lib/api';
import { toast } from 'sonner';

export default function SubscribePage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [pdaInfo, setPdaInfo] = useState<PDAInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [txSignature, setTxSignature] = useState<string>('');
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  
  // Load channels
  useEffect(() => {
    fetchChannels()
      .then((data) => {
        setChannels(data.channels || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load channels:', err);
        setLoading(false);
      });
  }, []);
  
  // Check existing subscription when wallet connects
  useEffect(() => {
    if (publicKey) {
      getPDAInfo(publicKey.toBase58())
        .then(setPdaInfo)
        .catch(console.error);
    } else {
      setPdaInfo(null);
    }
  }, [publicKey]);
  
  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };
  
  const selectAll = () => {
    setSelectedChannels(channels.map((c) => c.id));
  };
  
  const selectNone = () => {
    setSelectedChannels([]);
  };
  
  // Create subscription (on-chain if wallet connected)
  const handleSubscribe = async () => {
    if (selectedChannels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }
    
    setCreating(true);
    
    try {
      if (connected && publicKey && signTransaction) {
        // On-chain subscription
        setStep('confirm');
        
        // Check if already exists
        if (pdaInfo?.existsOnChain) {
          // Just sync with API
          const result = await createSubscription(selectedChannels, publicKey.toBase58());
          setSubscriptionId(result.subscriber.id);
          setStep('success');
          toast.success('Subscription synced successfully!');
        } else {
          // Build and sign transaction
          const txData = await buildCreateTx(publicKey.toBase58(), selectedChannels);
          
          // Decode transaction
          const tx = Transaction.from(Buffer.from(txData.transaction, 'base64'));
          
          // Sign with wallet
          const signed = await signTransaction(tx);
          
          // Send transaction
          const signature = await connection.sendRawTransaction(signed.serialize());
          await connection.confirmTransaction(signature, 'confirmed');
          
          setTxSignature(signature);
          
          // Sync with API
          const result = await createSubscription(selectedChannels, publicKey.toBase58());
          setSubscriptionId(result.subscriber.id);
          
          setStep('success');
          toast.success('Subscription created on-chain!');
        }
      } else {
        // API-only subscription (no wallet)
        const result = await createSubscription(selectedChannels);
        setSubscriptionId(result.subscriber.id);
        setStep('success');
        toast.success('Subscription created!');
      }
    } catch (err: any) {
      console.error('Subscribe error:', err);
      toast.error(err.message || 'Failed to create subscription');
      setStep('select');
    } finally {
      setCreating(false);
    }
  };
  
  // Group channels by category
  const channelsByCategory = channels.reduce((acc, ch) => {
    if (!acc[ch.category]) acc[ch.category] = [];
    acc[ch.category].push(ch);
    return acc;
  }, {} as Record<string, Channel[]>);
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-dark-700 rounded w-48"></div>
          <div className="h-96 bg-dark-700 rounded-xl"></div>
        </div>
      </div>
    );
  }
  
  // Success State
  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Subscription Created!</h1>
        <p className="text-dark-300 mb-6">
          Your subscription is now active. You can receive alerts via WebSocket.
        </p>
        
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6 text-left mb-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm text-dark-400">Subscription ID</div>
              <div className="font-mono text-sm break-all">{subscriptionId}</div>
            </div>
            {txSignature && (
              <div>
                <div className="text-sm text-dark-400">Transaction</div>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-primary-400 hover:underline flex items-center space-x-1"
                >
                  <span>{txSignature.substring(0, 32)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            <div>
              <div className="text-sm text-dark-400">Channels ({selectedChannels.length})</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedChannels.map((ch) => (
                  <span key={ch} className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <a
            href="/alerts"
            className="inline-flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <span>View Alerts</span>
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center space-x-2 bg-dark-700 hover:bg-dark-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <span>Dashboard</span>
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Subscription</h1>
        <p className="text-dark-400 mt-1">
          Select the channels you want to receive alerts from
        </p>
      </div>
      
      {/* Wallet Status */}
      <div className={`
        mb-6 p-4 rounded-xl border
        ${connected ? 'bg-green-500/10 border-green-500/30' : 'bg-dark-800/50 border-white/10'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className={`w-5 h-5 ${connected ? 'text-green-400' : 'text-dark-400'}`} />
            <div>
              {connected ? (
                <>
                  <div className="font-medium">Wallet Connected</div>
                  <div className="text-sm text-dark-400">{publicKey?.toBase58().substring(0, 20)}...</div>
                </>
              ) : (
                <>
                  <div className="font-medium">No Wallet Connected</div>
                  <div className="text-sm text-dark-400">Connect for on-chain subscription</div>
                </>
              )}
            </div>
          </div>
          {pdaInfo?.existsOnChain && (
            <div className="flex items-center space-x-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Already subscribed on-chain</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Channel Selection */}
      <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Select Channels</h2>
          <div className="flex space-x-2">
            <button
              onClick={selectAll}
              className="text-sm text-primary-400 hover:underline"
            >
              Select All
            </button>
            <span className="text-dark-600">|</span>
            <button
              onClick={selectNone}
              className="text-sm text-primary-400 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          {Object.entries(channelsByCategory).map(([category, chs]) => (
            <div key={category}>
              <h3 className="text-sm text-dark-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {chs.map((ch) => {
                  const isSelected = selectedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg text-left transition-all
                        ${isSelected 
                          ? 'bg-primary-500/20 border border-primary-500/50' 
                          : 'bg-dark-700/50 border border-transparent hover:border-white/10'
                        }
                      `}
                    >
                      {isSelected ? (
                        <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-dark-500 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{ch.name}</div>
                        <div className="text-xs text-dark-400">{ch.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary */}
      <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-dark-400">Channels Selected</span>
            <span className="font-medium">{selectedChannels.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Price per Alert</span>
            <span className="font-medium text-green-400">FREE (Trial)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Subscription Type</span>
            <span className="font-medium">
              {connected ? 'On-Chain (Solana)' : 'API Only'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Subscribe Button */}
      <button
        onClick={handleSubscribe}
        disabled={creating || selectedChannels.length === 0}
        className={`
          w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-semibold
          transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${creating 
            ? 'bg-dark-700' 
            : 'bg-primary-500 hover:bg-primary-600'
          }
        `}
      >
        {creating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{step === 'confirm' ? 'Confirm in Wallet...' : 'Creating...'}</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>
              {pdaInfo?.existsOnChain ? 'Update Subscription' : 'Create Subscription'}
            </span>
          </>
        )}
      </button>
      
      {!connected && (
        <p className="text-center text-dark-400 text-sm mt-4">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Connect your wallet for on-chain subscriptions with payment support
        </p>
      )}
    </div>
  );
}
