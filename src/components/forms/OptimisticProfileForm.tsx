"use client";

// Phase 2: React 19 useOptimistic Profile Form
// Provides instant UI feedback while saving to server

import { useOptimistic, useTransition, useState, startTransition } from "react";
import { motion } from "framer-motion";

interface ProfileData {
  name: string;
  phone: string;
  familyMembers: number;
  therapyType: string;
  timeZone: string;
}

interface OptimisticProfileFormProps {
  initialData: ProfileData;
  onSave: (data: ProfileData) => Promise<{ success: boolean; error?: string }>;
}

export default function OptimisticProfileForm({ 
  initialData, 
  onSave 
}: OptimisticProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // useOptimistic for instant UI updates
  const [optimisticProfile, updateOptimisticProfile] = useOptimistic(
    initialData,
    (currentProfile: ProfileData, newProfile: ProfileData) => ({
      ...currentProfile,
      ...newProfile
    })
  );

  const handleSubmit = async (formData: FormData) => {
    const newProfile: ProfileData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      familyMembers: parseInt(formData.get('familyMembers') as string),
      therapyType: formData.get('therapyType') as string,
      timeZone: formData.get('timeZone') as string,
    };

    // Immediately update UI optimistically
    updateOptimisticProfile(newProfile);
    setMessage({ type: 'success', text: 'Saving changes...' });

    // Use startTransition for non-urgent updates
    startTransition(async () => {
      try {
        const result = await onSave(newProfile);
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Profile updated successfully!' });
          setTimeout(() => setMessage(null), 3000);
        } else {
          // Revert optimistic update on error
          updateOptimisticProfile(initialData);
          setMessage({ type: 'error', text: result.error || 'Failed to save changes' });
        }
      } catch (error) {
        // Revert optimistic update on error
        updateOptimisticProfile(initialData);
        setMessage({ type: 'error', text: 'An unexpected error occurred' });
      }
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Profile Settings</h3>
        {isPending && (
          <div className="flex items-center space-x-2 text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Syncing...</span>
          </div>
        )}
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-100 border border-green-500/30' 
              : 'bg-red-500/20 text-red-100 border border-red-500/30'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-1">
            Full Name
          </label>
          <motion.input
            key={optimisticProfile.name} // Re-render when optimistic value changes
            whileFocus={{ scale: 1.01 }}
            type="text"
            id="name"
            name="name"
            defaultValue={optimisticProfile.name}
            className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 focus:ring-green-500/50 focus:border-green-500/50 text-white placeholder-white/40"
            placeholder="Enter your full name"
          />
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-white/90 mb-1">
            Phone Number
          </label>
          <motion.input
            key={optimisticProfile.phone}
            whileFocus={{ scale: 1.01 }}
            type="tel"
            id="phone"
            name="phone"
            defaultValue={optimisticProfile.phone}
            className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 focus:ring-green-500/50 focus:border-green-500/50 text-white placeholder-white/40"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* Family Members Count */}
        <div>
          <label htmlFor="familyMembers" className="block text-sm font-medium text-white/90 mb-1">
            Family Members
          </label>
          <motion.select
            key={optimisticProfile.familyMembers}
            whileFocus={{ scale: 1.01 }}
            id="familyMembers"
            name="familyMembers"
            defaultValue={optimisticProfile.familyMembers}
            className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 focus:ring-green-500/50 focus:border-green-500/50 text-white"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1} className="bg-gray-800">
                {i + 1} member{i > 0 ? 's' : ''}
              </option>
            ))}
          </motion.select>
        </div>

        {/* Therapy Type */}
        <div>
          <label htmlFor="therapyType" className="block text-sm font-medium text-white/90 mb-1">
            Therapy Type
          </label>
          <motion.select
            key={optimisticProfile.therapyType}
            whileFocus={{ scale: 1.01 }}
            id="therapyType"
            name="therapyType"
            defaultValue={optimisticProfile.therapyType}
            className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 focus:ring-green-500/50 focus:border-green-500/50 text-white"
          >
            <option value="couple" className="bg-gray-800">Couple Therapy</option>
            <option value="family" className="bg-gray-800">Family Therapy</option>
            <option value="individual" className="bg-gray-800">Individual Therapy</option>
            <option value="group" className="bg-gray-800">Group Therapy</option>
          </motion.select>
        </div>

        {/* Time Zone */}
        <div>
          <label htmlFor="timeZone" className="block text-sm font-medium text-white/90 mb-1">
            Time Zone
          </label>
          <motion.select
            key={optimisticProfile.timeZone}
            whileFocus={{ scale: 1.01 }}
            id="timeZone"
            name="timeZone"
            defaultValue={optimisticProfile.timeZone}
            className="w-full px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 focus:ring-green-500/50 focus:border-green-500/50 text-white"
          >
            <option value="America/New_York" className="bg-gray-800">Eastern Time</option>
            <option value="America/Chicago" className="bg-gray-800">Central Time</option>
            <option value="America/Denver" className="bg-gray-800">Mountain Time</option>
            <option value="America/Los_Angeles" className="bg-gray-800">Pacific Time</option>
          </motion.select>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isPending}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
            isPending
              ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg'
          }`}
        >
          {isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving Changes...
            </span>
          ) : (
            'Save Changes'
          )}
        </motion.button>
      </form>

      {/* Live Preview of Optimistic State */}
      <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <h4 className="text-sm font-medium text-white/80 mb-2">Live Preview:</h4>
        <div className="text-xs text-white/60 space-y-1">
          <div>Name: {optimisticProfile.name || 'Not set'}</div>
          <div>Phone: {optimisticProfile.phone || 'Not set'}</div>
          <div>Family: {optimisticProfile.familyMembers} member(s)</div>
          <div>Type: {optimisticProfile.therapyType}</div>
          <div>Zone: {optimisticProfile.timeZone}</div>
        </div>
      </div>
    </div>
  );
}