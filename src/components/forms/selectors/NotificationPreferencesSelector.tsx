'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Bell, BellOff, Smartphone, Volume2, Check, X } from 'lucide-react';
import { useState } from 'react';

interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  preview?: string;
}

interface NotificationPreferencesSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function NotificationPreferencesSelector({
  value,
  onChange,
  className = ''
}: NotificationPreferencesSelectorProps) {
  // Parse current value to determine enabled channels
  const getEnabledChannels = (): Set<string> => {
    const channels = new Set<string>();
    if (value === 'email' || value === 'both') channels.add('email');
    if (value === 'sms' || value === 'both') channels.add('sms');
    if (value === 'push') channels.add('push');
    return channels;
  };

  const [enabledChannels, setEnabledChannels] = useState<Set<string>>(getEnabledChannels());
  const [showTestNotification, setShowTestNotification] = useState(false);

  const channels: NotificationChannel[] = [
    {
      id: 'email',
      label: 'Email',
      description: 'Get detailed reminders and summaries in your inbox',
      icon: <Mail size={20} />,
      color: 'blue',
      enabled: enabledChannels.has('email'),
      preview: 'yourname@example.com'
    },
    {
      id: 'sms',
      label: 'SMS Text',
      description: 'Quick reminders sent directly to your phone',
      icon: <MessageSquare size={20} />,
      color: 'green',
      enabled: enabledChannels.has('sms'),
      preview: '+1 (555) 123-4567'
    },
    {
      id: 'push',
      label: 'Push Notifications',
      description: 'Real-time alerts on your devices',
      icon: <Smartphone size={20} />,
      color: 'purple',
      enabled: enabledChannels.has('push'),
      preview: 'Browser & Mobile App'
    },
    {
      id: 'voice',
      label: 'Voice Call',
      description: 'Automated reminder calls for important sessions',
      icon: <Volume2 size={20} />,
      color: 'amber',
      enabled: enabledChannels.has('voice'),
      preview: 'Coming Soon'
    }
  ];

  const toggleChannel = (channelId: string) => {
    const newChannels = new Set(enabledChannels);
    if (newChannels.has(channelId)) {
      newChannels.delete(channelId);
    } else {
      newChannels.add(channelId);
    }
    setEnabledChannels(newChannels);
    
    // Update the form value based on selected channels
    if (newChannels.size === 0) {
      onChange('none');
    } else if (newChannels.has('email') && newChannels.has('sms')) {
      onChange('both');
    } else if (newChannels.has('email')) {
      onChange('email');
    } else if (newChannels.has('sms')) {
      onChange('sms');
    } else {
      onChange('push');
    }
  };

  const toggleAll = () => {
    if (enabledChannels.size === channels.filter(c => c.id !== 'voice').length) {
      setEnabledChannels(new Set());
      onChange('none');
    } else {
      const allChannels = new Set(channels.filter(c => c.id !== 'voice').map(c => c.id));
      setEnabledChannels(allChannels);
      onChange('both');
    }
  };

  const getColorClasses = (color: string, isEnabled: boolean) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; toggle: string }> = {
      blue: {
        bg: isEnabled ? 'from-blue-500/20 to-cyan-500/20' : 'bg-gray-800/50',
        border: isEnabled ? 'border-blue-500/50' : 'border-gray-700/50',
        icon: isEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-300',
        toggle: isEnabled ? 'bg-blue-500' : 'bg-gray-700'
      },
      green: {
        bg: isEnabled ? 'from-green-500/20 to-emerald-500/20' : 'bg-gray-800/50',
        border: isEnabled ? 'border-green-500/50' : 'border-gray-700/50',
        icon: isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-300',
        toggle: isEnabled ? 'bg-green-500' : 'bg-gray-700'
      },
      purple: {
        bg: isEnabled ? 'from-purple-500/20 to-violet-500/20' : 'bg-gray-800/50',
        border: isEnabled ? 'border-purple-500/50' : 'border-gray-700/50',
        icon: isEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-300',
        toggle: isEnabled ? 'bg-purple-500' : 'bg-gray-700'
      },
      amber: {
        bg: 'bg-gray-800/30',
        border: 'border-gray-700/30',
        icon: 'bg-gray-800/50 text-gray-400',
        toggle: 'bg-gray-800'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Master Toggle */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
        <div className="flex items-center gap-2 sm:gap-3">
          <Bell className="text-indigo-400" size={20} />
          <div>
            <p className="text-sm sm:text-base sm:text-lg font-semibold text-white">Notification Channels</p>
            <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-200">Choose how you want to receive reminders</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
        >
          {enabledChannels.size === channels.filter(c => c.id !== 'voice').length ? (
            <>
              <BellOff size={14} />
              <span className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-300">Disable All</span>
            </>
          ) : (
            <>
              <Bell size={14} />
              <span className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-300">Enable All</span>
            </>
          )}
        </button>
      </div>

      {/* Notification Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {channels.map((channel) => {
          const colors = getColorClasses(channel.color, channel.enabled);
          const isComingSoon = channel.id === 'voice';
          
          return (
            <motion.div
              key={channel.id}
              whileHover={!isComingSoon ? { scale: 1.01 } : {}}
              className={`relative p-3 sm:p-4 rounded-xl border transition-all ${
                channel.enabled && !isComingSoon
                  ? `bg-gradient-to-br ${colors.bg} ${colors.border}`
                  : `${colors.bg} ${colors.border}`
              } ${isComingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !isComingSoon && toggleChannel(channel.id)}
            >
              {isComingSoon && (
                <div className="absolute top-2 right-2">
                  <span className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-300 font-medium">Coming Soon</span>
                </div>
              )}
              
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={`p-2 rounded-lg ${colors.icon}`}>
                  {channel.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-semibold text-sm sm:text-base sm:text-lg ${
                      channel.enabled && !isComingSoon ? 'text-white' : 'text-gray-200'
                    }`}>
                      {channel.label}
                    </h4>
                    
                    {/* Toggle Switch */}
                    {!isComingSoon && (
                      <motion.div
                        className={`relative w-10 h-6 rounded-full ${colors.toggle} transition-colors`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChannel(channel.id);
                        }}
                      >
                        <motion.div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                          animate={{ left: channel.enabled ? '20px' : '4px' }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />
                      </motion.div>
                    )}
                  </div>
                  
                  <p className={`text-xs sm:text-sm sm:text-base sm:text-lg mb-2 ${
                    channel.enabled && !isComingSoon ? 'text-gray-300' : 'text-gray-300'
                  }`}>
                    {channel.description}
                  </p>
                  
                  {channel.preview && !isComingSoon && (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs sm:text-sm sm:text-base sm:text-lg ${
                      channel.enabled 
                        ? 'bg-white/10 text-gray-300' 
                        : 'bg-black/20 text-gray-400'
                    }`}>
                      {channel.enabled ? <Check size={10} /> : <X size={10} />}
                      {channel.preview}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="p-3 sm:p-4 bg-black/30 rounded-xl border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm sm:text-base sm:text-lg font-semibold text-white">Current Settings</h4>
          {enabledChannels.size > 0 && (
            <button
              type="button"
              onClick={() => setShowTestNotification(!showTestNotification)}
              className="text-xs sm:text-sm sm:text-base sm:text-lg text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              Test Notifications
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {enabledChannels.size === 0 ? (
            <div className="flex items-center gap-2 text-gray-300">
              <BellOff size={16} />
              <p className="text-sm sm:text-base sm:text-lg">No notifications enabled</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(enabledChannels).map(channelId => {
                const channel = channels.find(c => c.id === channelId);
                if (!channel) return null;
                
                return (
                  <motion.div
                    key={channelId}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full"
                  >
                    {channel.icon}
                    <span className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-300">{channel.label}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Test Notification Preview */}
      <AnimatePresence>
        {showTestNotification && enabledChannels.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20"
          >
            <p className="text-sm sm:text-base sm:text-lg font-semibold text-white mb-3">Test Notification Sent!</p>
            <p className="text-xs sm:text-sm sm:text-base sm:text-lg text-gray-200 mb-3">
              Check your enabled channels for test messages:
            </p>
            <div className="space-y-2">
              {Array.from(enabledChannels).map(channelId => {
                const messages: Record<string, string> = {
                  email: '📧 Check your inbox for "Test Notification from Therapy Platform"',
                  sms: '📱 You should receive a text message shortly',
                  push: '🔔 Look for a browser/app notification'
                };
                return messages[channelId] ? (
                  <p key={channelId} className="text-xs sm:text-sm sm:text-base sm:text-lg text-blue-300">
                    {messages[channelId]}
                  </p>
                ) : null;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}