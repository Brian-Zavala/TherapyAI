/**
 * Demo component showing how to integrate MCP memory with a chat interface
 * This provides context-aware responses by searching memory for relevant information
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  memoryContext?: string
}

export function MemoryAwareChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [memories, setMemories] = useState<any>(null)
  const [isSearchingMemories, setIsSearchingMemories] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Search memories function
  const searchMemories = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setMemories(null)
      return
    }
    
    setIsSearchingMemories(true)
    try {
      const response = await fetch(`/api/memory?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.success) {
        setMemories(data)
      }
    } catch (error) {
      console.error('Failed to search memories:', error)
    } finally {
      setIsSearchingMemories(false)
    }
  }
  
  // Auto-search memories as user types
  useEffect(() => {
    if (input.length > 15) {
      const timeoutId = setTimeout(() => {
        searchMemories(input)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    } else {
      setMemories(null)
    }
  }, [input])
  
  // Handle sending message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      // Prepare context from memory
      let contextPrompt = input
      
      if (memories && memories.memories && memories.memories.length > 0) {
        // Add memory context to the prompt
        contextPrompt = `${memories.promptContext}\n\n## User Question\n${input}`
        
        console.log('[MemoryAwareChat] Using memory context:', {
          memoriesFound: memories.memories.length,
          matchedTerms: memories.memories[0]?.matchedTerms
        })
      }
      
      // Here you would call your AI API with the enhanced prompt
      // For demo, we'll simulate a response
      const response = await simulateAIResponse(contextPrompt, memories)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        memoryContext: memories?.memories?.length 
          ? `Used ${memories.memories.length} memories`
          : undefined
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save important conversations
      if (input.toLowerCase().includes('fix') || input.toLowerCase().includes('error')) {
        // For demo, we'll just log it
        console.log('Would save conversation:', {
          id: `chat_${Date.now()}`,
          summary: [
            `User asked: ${input}`,
            `Assistant responded with solution`,
            `Context: ${memories?.memories?.[0]?.name || 'General'}`
          ],
          relatedEntities: memories?.memories?.map((m: any) => m.name)
        })
      }
    } catch (error) {
      console.error('[MemoryAwareChat] Error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Simulate AI response (replace with actual AI API call)
  async function simulateAIResponse(
    prompt: string, 
    memories: any
  ): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (memories && memories.memories.length > 0) {
      const topMemory = memories.memories[0]
      return `Based on previous experience with ${topMemory.name}, I can help with that. ${topMemory.observations[0] || 'Let me analyze this issue...'}`
    }
    
    return "I'll help you with that. Could you provide more details about what you're trying to achieve?"
  }
  
  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Memory-Aware Assistant</h3>
        <p className="text-sm text-gray-500">
          Ask questions about your therapy platform
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.memoryContext && (
                  <p className="text-xs mt-1 opacity-70">
                    {message.memoryContext}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Memory indicator */}
      {memories && memories.memories && memories.memories.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 text-sm text-blue-700">
          Found {memories.memories.length} relevant memories
          {isSearchingMemories && ' (searching...)'}
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about VAPI, sessions, or any technical issue..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// Example usage in a page:
/*
import { MemoryAwareChat } from '@/components/demo/MemoryAwareChat'

export default function DemoPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Memory-Aware Chat Demo</h1>
      <MemoryAwareChat />
    </div>
  )
}
*/