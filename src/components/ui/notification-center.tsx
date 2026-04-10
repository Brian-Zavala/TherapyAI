// @ts-nocheck
'use client';

/**
 * Notification Center Component
 * Now integrated with unified notification system
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Mail, 
  MessageSquare, 
  X,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  Calendar,
  Settings,
  Loader2,
  WifiOff
} from 'lucide-react';
import { useNotificationState, useNotificationActions } from '@/providers/NotificationProvider';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminder' | 'alert'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Use unified notification system
  const { notifications, summary, isLoading, error, isOnline, isConnected } = useNotificationState();
  const { markAsRead, markAllAsRead, deleteNotification, refresh } = useNotificationActions();
  
  const unreadCount = summary.unreadCount;

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="h-5 w-5" />;
      case 'completion':
        return <CheckCircle className="h-5 w-5" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // Get color class based on priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'normal':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  // Get delivery method icon
  const getDeliveryIcon = (method: string) => {
    switch (method) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Filter notifications with memoization
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !notification.readAt;
      return notification.type === filter;
    });
  }, [notifications, filter]);

  // Format date using date-fns
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Mark notification as read with optimistic UI
  const handleMarkAsRead = async (notificationId: string) => {
    setProcessingIds(prev => new Set(prev).add(notificationId));
    try {
      await markAsRead(notificationId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification with confirmation
  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    setProcessingIds(prev => new Set(prev).add(notificationId));
    try {
      await deleteNotification(notificationId);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Notification Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed right-0 top-0 h-full w-full max-w-md bg-gray-900 shadow-xl z-50 overflow-hidden ${className}`}
          >
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-6 w-6 text-green-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-white">Notifications</h2>
                      {!isOnline && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <WifiOff className="h-3 w-3" />
                          Offline
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <p className="text-sm text-gray-400">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-4">
                {['all', 'unread', 'reminder', 'alert'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                      filter === f
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
              {unreadCount > 0 ? (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-green-500 hover:text-green-400 transition-colors flex items-center gap-2"
                >
                  <EyeOff className="h-4 w-4" />
                  Mark all as read
                </button>
              ) : (
                <span className="text-sm text-gray-500">All caught up!</span>
              )}
              
              <button
                onClick={refresh}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Refresh notifications"
              >
                <motion.div
                  animate={isLoading ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                >
                  <Loader2 className="h-4 w-4 text-gray-400" />
                </motion.div>
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                  <p className="text-sm text-gray-400">Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <p className="text-gray-400 mb-2">Failed to load notifications</p>
                  <button
                    onClick={refresh}
                    className="text-sm text-green-500 hover:text-green-400 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              ) : !isOnline ? (
                <div className="text-center py-12">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                  <p className="text-gray-400 mb-2">You're offline</p>
                  <p className="text-sm text-gray-500">Showing cached notifications</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 hover:bg-gray-800/50 transition-colors relative ${
                        !notification.readAt ? 'bg-gray-800/20' : ''
                      } ${
                        processingIds.has(notification.id) ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-medium text-white truncate">
                              {notification.title}
                            </h3>
                            {!notification.readAt && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-400 mb-2">
                            {notification.message}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDate(notification.createdAt)}</span>
                            {notification.deliveryMethod && (
                              <span className="flex items-center gap-1">
                                {getDeliveryIcon(notification.deliveryMethod)}
                                {notification.deliveryMethod}
                              </span>
                            )}
                            {notification.deliveryStatus && (
                              <span className={`px-2 py-0.5 rounded-full ${
                                notification.deliveryStatus === 'delivered'
                                  ? 'bg-green-500/20 text-green-400'
                                  : notification.deliveryStatus === 'failed'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {notification.deliveryStatus}
                              </span>
                            )}
                          </div>

                          {/* Session Info */}
                          {notification.session && (
                            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-400">
                                  Session: {new Date(notification.session.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Theme: {notification.session.theme}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-3 mt-3">
                            {!notification.readAt && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-green-500 hover:text-green-400 transition-colors flex items-center gap-1"
                                disabled={processingIds.has(notification.id)}
                              >
                                <Eye className="h-3 w-3" />
                                Mark as read
                              </button>
                            )}
                            {notification.actionUrl && (
                              <a
                                href={notification.actionUrl}
                                className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
                                onClick={() => {
                                  if (!notification.readAt) {
                                    handleMarkAsRead(notification.id);
                                  }
                                }}
                              >
                                View details →
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 ml-auto"
                              disabled={processingIds.has(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Processing overlay */}
                      {processingIds.has(notification.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                          <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Link */}
            <div className="border-t border-gray-800 p-4">
              <a
                href="/settings/notifications"
                className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                Notification Settings
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};