'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  alertsReceived: number;
  lastAlert: Alert | null;
}

export interface UseAlertWebSocketOptions {
  subscriberId: string | null;
  onAlert?: (alert: Alert) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export function useAlertWebSocket(options: UseAlertWebSocketOptions) {
  const {
    subscriberId,
    onAlert,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    alertsReceived: 0,
    lastAlert: null,
  });

  const connect = useCallback(() => {
    if (!subscriberId) {
      setState(prev => ({ ...prev, error: 'No subscriber ID provided' }));
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const ws = new WebSocket(`${WS_URL}/api/stream?subscriberId=${subscriberId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to Agent News Wire');
        setState(prev => ({ ...prev, connected: true, connecting: false, error: null }));
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('[WS] Welcome:', data.message);
              break;
              
            case 'alert':
              setState(prev => ({
                ...prev,
                alertsReceived: prev.alertsReceived + 1,
                lastAlert: data.alert,
              }));
              onAlert?.(data.alert);
              break;
              
            case 'warning':
              console.warn('[WS] Warning:', data.message);
              if (data.code === 'LOW_BALANCE') {
                setState(prev => ({ ...prev, error: 'Low balance - alerts paused' }));
              }
              break;
              
            case 'subscription_updated':
              console.log('[WS] Subscription updated:', data.channels);
              break;
              
            case 'error':
              console.error('[WS] Error:', data.message);
              setState(prev => ({ ...prev, error: data.message }));
              onError?.(data.message);
              break;
          }
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error', connecting: false }));
        onError?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, connected: false, connecting: false }));
        wsRef.current = null;
        onDisconnect?.();

        // Auto-reconnect after 5 seconds if not intentionally closed
        if (event.code !== 1000 && autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      setState(prev => ({ ...prev, error: 'Failed to connect', connecting: false }));
    }
  }, [subscriberId, onAlert, onConnect, onDisconnect, onError, autoConnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setState(prev => ({ ...prev, connected: false, connecting: false }));
  }, []);

  // Auto-connect when subscriberId is available
  useEffect(() => {
    if (autoConnect && subscriberId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [subscriberId, autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
