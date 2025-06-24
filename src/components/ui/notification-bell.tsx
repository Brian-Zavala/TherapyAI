'use client';

/**
 * Notification Bell Component
 * Trigger component for opening notification center with unread count
 */

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { NotificationCenter } from './notification-center';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications?unreadOnly=true&limit=1');
      if (!response.ok) return;
      
      const data = await response.json();
      setUnreadCount(data.summary?.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh unread count when notification center closes
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Refresh count when notification center closes
  useEffect(() => {
    if (!isOpen) {
      fetchUnreadCount();
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 ${className}`}
        disabled={loading}
      >
        <Bell className="w-5 h-5 text-white" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}

        {/* Pulse animation for urgent notifications */}
        {unreadCount > 0 && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-red-500/20"
            animate={{ opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
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