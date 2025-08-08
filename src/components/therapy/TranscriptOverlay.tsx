'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { createPortal } from 'react-dom'

interface TranscriptMessage {
  id: string
  speaker: 'user' | 'therapist'
  text: string
  timestamp: Date
  isTyping?: boolean
}

interface TranscriptOverlayProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  therapistName: string
  therapyType: 'couple' | 'solo' | 'family'
  transcriptChunks: Array<{
    id: string
    speaker: string
    text: string
    timestamp: string
    isFinal: boolean
  }>
}

export default function TranscriptOverlay({
  isOpen,
  onClose,
  sessionId,
  therapistName,
  therapyType,
  transcriptChunks = []
}: TranscriptOverlayProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Convert transcript chunks to messages format
  useEffect(() => {
    const formattedMessages: TranscriptMessage[] = transcriptChunks
      .filter(chunk => chunk.text && chunk.text.trim())
      .map(chunk => ({
        id: chunk.id,
        speaker: chunk.speaker.toLowerCase() === 'user' || 
                 chunk.speaker.toLowerCase() === 'you' || 
                 chunk.speaker.toLowerCase() === 'client' ? 'user' : 'therapist',
        text: chunk.text,
        timestamp: new Date(chunk.timestamp)
      }))
    
    setMessages(formattedMessages)
  }, [transcriptChunks])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Get therapist avatar based on type
  const getTherapistAvatar = () => {
    switch (therapyType) {
      case 'solo':
        return '/images/dr-elliot-mackaphy.webp'
      case 'family':
        return '/images/dr-jada-pearson.webp'
      case 'couple':
      default:
        return '/images/dr-maya-thompson.webp'
    }
  }

  if (!isClient) return null

  const overlayContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[380px] h-[85vh] max-h-[700px] bg-black rounded-[32px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* SMS Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black via-black/95 to-transparent z-10 p-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Close transcript"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <span className="text-green-500 text-xs font-medium">LIVE</span>
                  </div>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={getTherapistAvatar()}
                    alt={therapistName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div className="hidden w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {therapistName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-black"></div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm">{therapistName}</h3>
                  <p className="text-gray-400 text-xs">AI Therapist • Active Now</p>
                </div>
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="h-full pt-24 pb-4 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <div className="space-y-3 pb-4">
                {/* Date Divider */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-800/50 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-gray-400 text-xs font-medium">Today</span>
                  </div>
                </div>
                
                {/* Messages */}
                {messages.map((message, index) => {
                  const isUser = message.speaker === 'user'
                  const showTimestamp = index === 0 || 
                    (messages[index - 1] && 
                     Math.abs(message.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 60000)
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
                        {/* Timestamp */}
                        {showTimestamp && (
                          <div className={`text-[10px] text-gray-500 mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
                            {format(message.timestamp, 'h:mm a')}
                          </div>
                        )}
                        
                        {/* Message Bubble */}
                        <div
                          className={`
                            relative px-4 py-2.5 rounded-2xl shadow-sm
                            ${isUser 
                              ? 'bg-blue-500 text-white rounded-br-md' 
                              : 'bg-gray-800 text-white rounded-bl-md'
                            }
                          `}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                          
                          {/* Message Tail */}
                          <div
                            className={`
                              absolute bottom-0 w-3 h-3
                              ${isUser 
                                ? 'right-0 translate-x-1.5 translate-y-1' 
                                : 'left-0 -translate-x-1.5 translate-y-1'
                              }
                            `}
                          >
                            <svg
                              viewBox="0 0 8 13"
                              className={`
                                ${isUser ? 'text-blue-500' : 'text-gray-800'}
                                ${isUser ? '' : 'scale-x-[-1]'}
                              `}
                            >
                              <path
                                fill="currentColor"
                                d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"
                              />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Read Receipt for user messages */}
                        {isUser && index === messages.length - 1 && (
                          <div className="text-right mt-1">
                            <span className="text-[10px] text-gray-500">Delivered</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex space-x-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-gray-500 rounded-full"
                            animate={{
                              y: [0, -5, 0],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              delay: i * 0.2
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Use React Portal for proper z-index handling
  const portalRoot = document.getElementById('modal-root')
  if (!portalRoot) {
    // Create modal root if it doesn't exist
    const root = document.createElement('div')
    root.id = 'modal-root'
    document.body.appendChild(root)
    return createPortal(overlayContent, root)
  }
  
  return createPortal(overlayContent, portalRoot)
}