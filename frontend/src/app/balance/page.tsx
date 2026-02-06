'use client';

import { useEffect, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  CreditCard, Wallet, Loader2, Plus, 
  ArrowUpCircle, Clock, TrendingUp, ExternalLink, AlertCircle
} from 'lucide-react';
import { getPDAInfo, buildDepositTx, getSubscription, type PDAInfo, type Subscriber } from '@/lib/api';
import { getStoredSubscription } from '@/lib/subscription';
import { toast } from 'sonner';

export default function BalancePage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [pdaInfo, setPdaInfo] = useState<PDAInfo | null>(null);
  const [apiSubscriber, setApiSubscriber] = useState<Subscriber | null>(null);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('10');
  const [showDeposit, setShowDeposit] = useState(false);
  const [recentTx, setRecentTx] = useState<string>('');
  
  // Load balance info
  useEffect(() => {
    const load = async () => {
      if (!publicKey) {
        setLoading(false);
        return;
      }
      
      try {
        const [pda, balance] = await Promise.all([
          getPDAInfo(publicKey.toBase58()),
          connection.getBalance(publicKey),
        ]);
        setPdaInfo(pda);
        setSolBalance(balance / LAMPORTS_PER_SOL);
        
        // Also fetch in-memory subscriber data (has real-time alertsReceived)
        const stored = getStoredSubscription();
        if (stored?.subscriberId) {
          try {
            const sub = await getSubscription(stored.subscriberId);
            setApiSubscriber(sub);
          } catch (err) {
            // Subscriber might not exist in memory (server restart)
            console.log('Could not fetch API subscriber:', err);
          }
        }
      } catch (err) {
        console.error('Failed to load balance:', err);
      } finally {
        setLoading(false);
      }
    };
    
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);
  
  // Handle deposit
  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setDepositing(true);
    
    try {
      // Build deposit transaction
      const txData = await buildDepositTx(publicKey.toBase58(), amount);
      
      // Decode and sign
      const tx = Transaction.from(Buffer.from(txData.transaction, 'base64'));
      const signed = await signTransaction(tx);
      
      // Send
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      
      setRecentTx(signature);
      setShowDeposit(false);
      
      // Refresh balance
      const pda = await getPDAInfo(publicKey.toBase58());
      setPdaInfo(pda);
      
      toast.success(`Deposited ${amount} USDC successfully!`);
    } catch (err: any) {
      console.error('Deposit error:', err);
      toast.error(err.message || 'Failed to deposit');
    } finally {
      setDepositing(false);
    }
  };
  
  // Not connected state
  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Wallet className="w-16 h-16 text-dark-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-dark-400 mb-8">
          Connect your Solana wallet to view your subscription balance and make deposits.
        </p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-dark-700 rounded w-48"></div>
          <div className="h-64 bg-dark-700 rounded-xl"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Balance & Deposits</h1>
        <p className="text-dark-400 mt-1">
          Manage your subscription balance
        </p>
      </div>
      
      {/* Trial Mode Banner */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <div className="font-medium text-green-400">Trial Mode Active</div>
            <div className="text-sm text-dark-300">
              All alerts are free during trial. No deposits required.
            </div>
          </div>
        </div>
      </div>
      
      {/* Balance Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Subscription Balance */}
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-primary-400" />
              </div>
              <span className="font-medium">Subscription Balance</span>
            </div>
          </div>
          
          {pdaInfo?.existsOnChain ? (
            <div>
              <div className="text-4xl font-bold mb-2">
                {pdaInfo.subscriber?.balance || 0} <span className="text-xl text-dark-400">USDC</span>
              </div>
              <div className="text-sm text-dark-400">
                Runway: <span className="text-green-400">Unlimited (Trial)</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg text-dark-400 mb-2">No on-chain subscription</div>
              <a href="/subscribe" className="text-primary-400 hover:underline text-sm">
                Create subscription →
              </a>
            </div>
          )}
        </div>
        
        {/* Wallet Balance */}
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
              <span className="font-medium">Wallet Balance</span>
            </div>
          </div>
          
          <div className="text-4xl font-bold mb-2">
            {solBalance.toFixed(4)} <span className="text-xl text-dark-400">SOL</span>
          </div>
          <div className="text-sm text-dark-400">
            {publicKey?.toBase58().substring(0, 20)}...
          </div>
        </div>
      </div>
      
      {/* Stats */}
      {(pdaInfo?.existsOnChain || apiSubscriber) && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-800/30 rounded-xl p-4 text-center">
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">{apiSubscriber?.alertsReceived ?? pdaInfo?.subscriber?.alertsReceived ?? 0}</div>
            <div className="text-sm text-dark-400">Alerts Received</div>
          </div>
          <div className="bg-dark-800/30 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">∞</div>
            <div className="text-sm text-dark-400">Alerts Remaining</div>
          </div>
          <div className="bg-dark-800/30 rounded-xl p-4 text-center">
            <CreditCard className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">$0.00</div>
            <div className="text-sm text-dark-400">Price/Alert (Trial)</div>
          </div>
        </div>
      )}
      
      {/* Deposit Section */}
      {pdaInfo?.existsOnChain && (
        <div className="bg-dark-800/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Funds</h2>
            {!showDeposit && (
              <button
                onClick={() => setShowDeposit(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Deposit USDC</span>
              </button>
            )}
          </div>
          
          {showDeposit && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-dark-400 mb-2 block">
                  Amount (USDC)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-primary-500"
                    placeholder="10.00"
                    min="1"
                    step="0.01"
                  />
                  <div className="flex space-x-1">
                    {[5, 10, 25, 50].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(amt.toString())}
                        className="px-3 py-2 bg-dark-600 hover:bg-dark-500 rounded-lg text-sm"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-dark-700/50 rounded-lg p-4 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-dark-400">Amount</span>
                  <span>{depositAmount} USDC</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-400">Price per Alert</span>
                  <span>$0.00 (Trial)</span>
                </div>
                <div className="flex justify-between font-medium border-t border-white/10 pt-2 mt-2">
                  <span>Alerts this buys</span>
                  <span className="text-green-400">Unlimited</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeposit(false)}
                  className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={depositing}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {depositing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="w-5 h-5" />
                      <span>Deposit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {!showDeposit && (
            <p className="text-sm text-dark-400">
              Deposit USDC to your subscription vault to pay for alerts (when trial ends).
            </p>
          )}
        </div>
      )}
      
      {/* Recent Transaction */}
      {recentTx && (
        <div className="mt-6 bg-dark-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Recent Transaction</span>
            <a
              href={`https://explorer.solana.com/tx/${recentTx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-primary-400 hover:underline"
            >
              <span>{recentTx.substring(0, 16)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
