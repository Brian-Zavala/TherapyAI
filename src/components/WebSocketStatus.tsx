'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface WebSocketStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionAttempts: number;
  maxAttempts: number;
  onRetry: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function WebSocketStatus({
  isConnected,
  isConnecting,
  error,
  connectionAttempts,
  maxAttempts,
  onRetry,
  onDismiss,
  compact = false
}: WebSocketStatusProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show anything if connected and no error, or if dismissed
  if ((isConnected && !error) || isDismissed) {
    return null;
  }

  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />,
        color: 'bg-blue-500',
        textColor: 'text-blue-100',
        message: connectionAttempts > 0 
          ? `Reconnecting... (${connectionAttempts}/${maxAttempts})`
          : 'Connecting...'
      };
    }

    if (error) {
      return {
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
        color: 'bg-red-500',
        textColor: 'text-red-100',
        message: error
      };
    }

    if (!isConnected) {
      return {
        icon: <WifiIcon className="w-4 h-4" />,
        color: 'bg-yellow-500',
        textColor: 'text-yellow-100',
        message: 'Real-time updates disconnected'
      };
    }

    return {
      icon: <CheckCircleIcon className="w-4 h-4" />,
      color: 'bg-green-500',
      textColor: 'text-green-100',
      message: 'Connected'
    };
  };

  const { icon, color, textColor, message } = getStatusInfo();

  if (compact) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${color} ${textColor}`}
        >
          {icon}
          <span className="truncate max-w-48">{message}</span>
          {error && !isConnecting && (
            <button
              onClick={onRetry}
              className="ml-1 hover:bg-white/20 rounded px-1 transition-colors"
              title="Retry connection"
            >
              <ArrowPathIcon className="w-3 h-3" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        className={`relative overflow-hidden rounded-lg ${color}`}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${textColor}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${textColor}`}>
                  Real-time Connection Status
                </p>
                <p className={`text-xs ${textColor}/90 truncate`}>
                  {message}
                </p>
                {connectionAttempts > 0 && (
                  <div className="mt-1">
                    <div className={`bg-white/20 rounded-full h-1.5 overflow-hidden`}>
                      <div 
                        className="h-full bg-white/40 transition-all duration-300"
                        style={{ width: `${(connectionAttempts / maxAttempts) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {error && !isConnecting && (
                <button
                  onClick={onRetry}
                  className={`px-3 py-1 bg-white/20 hover:bg-white/30 ${textColor} text-xs font-medium rounded transition-colors`}
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`${textColor}/60 hover:${textColor} transition-colors`}
                title="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}