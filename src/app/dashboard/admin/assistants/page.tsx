'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { COUPLE_THERAPY_ASSISTANT_CONFIG } from '@/lib/vapi';

interface Assistant {
  id: string;
  model: {
    provider: string;
    model: string;
    messages: { role: string; content: string }[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage: string;
  createdAt: string;
}

export default function AssistantsPage() {
  const router = useRouter();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newAssistant, setNewAssistant] = useState({
    model: {
      provider: COUPLE_THERAPY_ASSISTANT_CONFIG.model.provider,
      model: COUPLE_THERAPY_ASSISTANT_CONFIG.model.model,
      messages: [{ 
        role: 'system', 
        content: COUPLE_THERAPY_ASSISTANT_CONFIG.model.messages[0].content 
      }]
    },
    voice: {
      provider: COUPLE_THERAPY_ASSISTANT_CONFIG.voice.provider,
      voiceId: COUPLE_THERAPY_ASSISTANT_CONFIG.voice.voiceId
    },
    firstMessage: COUPLE_THERAPY_ASSISTANT_CONFIG.firstMessage
  });

  // Fetch assistants when component mounts
  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    setLoading(true);
    try {
      // This is a placeholder. The API endpoint to list assistants should be implemented
      const response = await fetch('/api/vapi/assistants');
      
      if (!response.ok) {
        throw new Error('Failed to fetch assistants');
      }
      
      const data = await response.json();
      setAssistants(data);
    } catch (err) {
      console.error('Error fetching assistants:', err);
      setError('Failed to load assistants. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const createAssistant = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/vapi/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssistant)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create assistant');
      }
      
      const data = await response.json();
      setSuccess(`Assistant created successfully with ID: ${data.id}`);
      
      // Refresh the list
      fetchAssistants();
      
      // Reset form
      setNewAssistant({
        model: {
          provider: COUPLE_THERAPY_ASSISTANT_CONFIG.model.provider,
          model: COUPLE_THERAPY_ASSISTANT_CONFIG.model.model,
          messages: [{ 
            role: 'system', 
            content: COUPLE_THERAPY_ASSISTANT_CONFIG.model.messages[0].content 
          }]
        },
        voice: {
          provider: COUPLE_THERAPY_ASSISTANT_CONFIG.voice.provider,
          voiceId: COUPLE_THERAPY_ASSISTANT_CONFIG.voice.voiceId
        },
        firstMessage: COUPLE_THERAPY_ASSISTANT_CONFIG.firstMessage
      });
    } catch (err) {
      console.error('Error creating assistant:', err);
      setError(err instanceof Error ? err.message : 'Failed to create assistant');
    } finally {
      setCreating(false);
    }
  };

  const handleSystemPromptChange = (content: string) => {
    setNewAssistant(prev => ({
      ...prev,
      model: {
        ...prev.model,
        messages: [{ role: 'system', content }]
      }
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Assistant Management
      </h1>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md mb-6 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md mb-6 text-green-700 dark:text-green-300">
          {success}
        </div>
      )}
      
      {/* Create New Assistant Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Create New Assistant
        </h2>
        
        <div className="space-y-4">
          {/* System Prompt */}
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Prompt
            </label>
            <textarea
              id="systemPrompt"
              rows={5}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              value={newAssistant.model.messages[0].content}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
            />
          </div>
          
          {/* Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI Model
              </label>
              <select
                id="model"
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                value={newAssistant.model.model}
                onChange={(e) => setNewAssistant(prev => ({
                  ...prev,
                  model: {
                    ...prev.model,
                    model: e.target.value
                  }
                }))}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="voice" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Voice
              </label>
              <select
                id="voice"
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                value={newAssistant.voice.voiceId}
                onChange={(e) => setNewAssistant(prev => ({
                  ...prev,
                  voice: {
                    ...prev.voice,
                    voiceId: e.target.value
                  }
                }))}
              >
                <option value="jennifer">Jennifer (Female, Warm)</option>
                <option value="adam">Adam (Male, Professional)</option>
                <option value="joanna">Joanna (Female, Clear)</option>
                <option value="matthew">Matthew (Male, Friendly)</option>
              </select>
            </div>
          </div>
          
          {/* First Message */}
          <div>
            <label htmlFor="firstMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Message
            </label>
            <input
              type="text"
              id="firstMessage"
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              value={newAssistant.firstMessage}
              onChange={(e) => setNewAssistant(prev => ({
                ...prev,
                firstMessage: e.target.value
              }))}
            />
          </div>
          
          {/* Create Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={createAssistant}
            disabled={creating}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-indigo-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Assistant'}
          </motion.button>
        </div>
      </div>
      
      {/* Assistants List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Existing Assistants
          </h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading assistants...</p>
          </div>
        ) : assistants.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No assistants found. Create your first assistant above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Voice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {assistants.map((assistant) => (
                  <tr key={assistant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                      {assistant.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assistant.model.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assistant.voice.voiceId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(assistant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">
                        Edit
                      </a>
                      <a href="#" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        Delete
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}