'use client';

import { FC } from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type Alert } from '@/lib/api';

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
}

export const AlertCard: FC<AlertCardProps> = ({ alert, compact = false }) => {
  const priorityColors = {
    critical: 'border-l-red-500 bg-red-500/5',
    high: 'border-l-orange-500 bg-orange-500/5',
    medium: 'border-l-yellow-500 bg-yellow-500/5',
    low: 'border-l-green-500 bg-green-500/5',
  };
  
  const sentimentIcons = {
    bullish: <TrendingUp className="w-4 h-4 text-green-400" />,
    bearish: <TrendingDown className="w-4 h-4 text-red-400" />,
    neutral: <Minus className="w-4 h-4 text-gray-400" />,
  };
  
  const getChannelCategory = (channel: string) => {
    const [category] = channel.split('/');
    return category;
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };
  
  if (compact) {
    return (
      <div className={`border-l-4 ${priorityColors[alert.priority]} rounded-r-lg p-4 animate-fade-in`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full channel-${getChannelCategory(alert.channel)}`}>
                {alert.channel}
              </span>
              <span className="text-xs text-dark-400">{formatTime(alert.timestamp)}</span>
            </div>
            <h3 className="font-medium text-sm line-clamp-2">{alert.headline}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {sentimentIcons[alert.sentiment]}
            <span className="text-xs text-dark-400">{alert.impactScore}/10</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`border-l-4 ${priorityColors[alert.priority]} rounded-r-xl p-6 animate-fade-in bg-dark-800/30`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-0.5 rounded-full channel-${getChannelCategory(alert.channel)}`}>
            {alert.channel}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full bg-dark-700 capitalize`}>
            {alert.priority}
          </span>
        </div>
        <span className="text-xs text-dark-400">{formatTime(alert.timestamp)}</span>
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{alert.headline}</h3>
      <p className="text-dark-300 text-sm mb-4">{alert.summary}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            {sentimentIcons[alert.sentiment]}
            <span className="text-xs text-dark-400 capitalize">{alert.sentiment}</span>
          </div>
          <div className="text-xs text-dark-400">
            Impact: <span className="text-white">{alert.impactScore}/10</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {alert.tickers.length > 0 && (
            <div className="flex space-x-1">
              {alert.tickers.slice(0, 3).map((ticker) => (
                <span key={ticker} className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded">
                  {ticker}
                </span>
              ))}
            </div>
          )}
          
          {alert.sourceUrl && (
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-dark-400" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
