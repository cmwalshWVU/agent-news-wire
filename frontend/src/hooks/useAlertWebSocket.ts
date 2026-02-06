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
  enabled?: boolean;
}

export function useAlertWebSocket(options: UseAlertWebSocketOptions) {
  const {
    subscriberId,
    onAlert,
    onConnect,
    onDisconnect,
    onError,
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // Store callbacks in refs to avoid dependency issues
  const onAlertRef = useRef(onAlert);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onAlertRef.current = onAlert;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onAlert, onConnect, onDisconnect, onError]);

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    alertsReceived: 0,
    lastAlert: null,
  });

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    if (mountedRef.current) {
      setState(prev => ({ ...prev, connected: false, connecting: false }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!subscriberId || !mountedRef.current) {
      return;
    }

    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const ws = new WebSocket(`${WS_URL}/api/stream?subscriberId=${subscriberId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[WS] Connected to Agent News Wire');
        setState(prev => ({ ...prev, connected: true, connecting: false, error: null }));
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
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
              onAlertRef.current?.(data.alert);
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
              onErrorRef.current?.(data.message);
              break;
          }
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        console.error('[WS] WebSocket error');
        setState(prev => ({ ...prev, error: 'Connection error', connecting: false }));
        onErrorRef.current?.('Connection error');
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('[WS] Disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, connected: false, connecting: false }));
        wsRef.current = null;
        onDisconnectRef.current?.();
      };
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('[WS] Failed to create WebSocket:', e);
      setState(prev => ({ ...prev, error: 'Failed to connect', connecting: false }));
    }
  }, [subscriberId]);

  // Connect when enabled and subscriberId is available
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && subscriberId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, subscriberId, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
