import { useState, useEffect, useCallback, useRef } from 'react';
import type { TaskStatus } from '../types/index.js';
import { getWebSocketUrl } from '../api/api.js';
import { config, isDevelopment } from '../config/env.js';

interface UseTaskWebSocketResult {
  status: TaskStatus['status'];
  progress: number;
  pdfUrl?: string;
  error?: string;
  isConnected: boolean;
  connectionAttempts: number;
}

export function useTaskWebSocket(taskId: string): UseTaskWebSocketResult {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<TaskStatus['status']>('pending');
  const [progress, setProgress] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);

  const resetReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const connect = useCallback(() => {
    // Stop trying to reconnect after max attempts
    if (connectionAttempts >= config.WS_RECONNECT_ATTEMPTS) {
      setError('Unable to establish WebSocket connection. Using manual status checks instead.');
      return;
    }

    // Don't reconnect if component is unmounted
    if (isUnmountedRef.current) {
      return;
    }

    if (isDevelopment) {
      console.log(`WebSocket connection attempt ${connectionAttempts + 1}/${config.WS_RECONNECT_ATTEMPTS} for task: ${taskId}`);
    }

    try {
      const ws = new WebSocket(getWebSocketUrl(taskId));

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }

        if (isDevelopment) {
          console.log('WebSocket connected successfully');
        }
        setIsConnected(true);
        setError(undefined);
        setConnectionAttempts(0);
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;

        // Add debug logging to see raw messages
        console.log('[WS RAW MESSAGE]', event.data);

        try {
          const message = JSON.parse(event.data);
          console.log('[PARSED]', message.state, message.info);

          // Handle backend message format: { state, info }
          switch (message.state) {
            case 'PENDING':
              setStatus('pending');
              // Keep existing progress if no new progress provided
              if (message.info?.progress !== undefined) {
                setProgress(message.info.progress);
              }
              break;
            
            case 'PROCESSING':
            case 'IN_PROGRESS':
            case 'PROGRESS':
              setStatus('processing');
              if (message.info?.progress !== undefined) {
                setProgress(message.info.progress);
              }
              break;
            
            case 'SUCCESS':
            case 'COMPLETED':
              setProgress(100);
              setStatus('completed');
              if (message.info?.pdf_url) {
                // Construct full URL if backend provides relative path
                let fullPdfUrl = message.info.pdf_url;
                if (fullPdfUrl.startsWith('/')) {
                  // Remove trailing slash from API URL and prepend to relative path
                  const baseUrl = config.API_BASE_URL.replace(/\/$/, '');
                  fullPdfUrl = baseUrl + fullPdfUrl;
                }
                
                if (isDevelopment) {
                  console.log('Raw PDF URL from backend:', message.info.pdf_url);
                  console.log('Full PDF URL constructed:', fullPdfUrl);
                }
                
                setPdfUrl(fullPdfUrl);
              }
              // Don't close immediately - let user see completion
              setTimeout(() => ws.close(), 1000);
              break;
            
            case 'FAILED':
            case 'ERROR':
              setStatus('failed');
              setError(message.info?.error || message.error || 'Task failed');
              ws.close();
              break;
            
            default:
              console.warn('Unknown WebSocket state:', message.state);
          }
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError);
          console.error('Raw message was:', event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        
        if (isUnmountedRef.current) return;

        if (isDevelopment) {
          console.log('WebSocket closed:', event.code, event.reason);
        }

        // Only attempt to reconnect if haven't exceeded max attempts and task isn't finished
        if (connectionAttempts < config.WS_RECONNECT_ATTEMPTS && 
            event.code !== 1000 && // Don't reconnect on normal closure
            !event.wasClean) { // Don't reconnect on clean closure
          setConnectionAttempts(prev => prev + 1);
          resetReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              connect();
            }
          }, config.WS_RECONNECT_DELAY);
        }
      };

      ws.onerror = (event) => {
        if (isDevelopment) {
          console.error('WebSocket error:', event);
        }
        setIsConnected(false);
      };

      setSocket(ws);
    } catch (error) {
      if (isDevelopment) {
        console.error('Failed to create WebSocket:', error);
      }
      setError('Failed to create WebSocket connection');
    }
  }, [taskId, connectionAttempts, resetReconnectTimeout]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      resetReconnectTimeout();
      if (socket) {
        socket.close();
      }
    };
  }, [connect, resetReconnectTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      resetReconnectTimeout();
    };
  }, [resetReconnectTimeout]);

  return {
    status,
    progress,
    pdfUrl,
    error,
    isConnected,
    connectionAttempts,
  };
}