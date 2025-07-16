'use client';

/**
 * Notification Bell Component
 * Trigger component for opening notification center with unread count
 * Now uses the unified notification system
 */

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from './notification-center';
import { useUnreadCount, useNotificationState } from '@/providers/NotificationProvider';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = useUnreadCount();
  const { isLoading, isConnected } = useNotificationState();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 ${className}`}
        disabled={isLoading}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-white" />
        
        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" 
               title="Reconnecting..." />
        )}
        
        {/* Unread Count Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-medium shadow-lg"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse animation for urgent notifications */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 0, 0.5] }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-lg bg-red-500/20 pointer-events-none"
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default NotificationBell;