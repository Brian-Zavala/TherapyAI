'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Music, 
  Shuffle, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Play, 
  Pause, 
  X, 
  Heart, 
  Music2 
} from 'lucide-react'

// Note: You'll need to add these music files to your project
// For now, we'll use the click.mp3 for all tracks as a placeholder
const tracks = [
  { 
    title: 'Peaceful Mind', 
    artist: 'Mindful Melodies', 
    src: '/sounds/click.mp3', 
    image: '/images/happy-couple.jpg'
  },
  { 
    title: 'Calm Reflections', 
    artist: 'Therapy Sounds', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-elliot-mackaphy.jpg'
  },
  { 
    title: 'Ocean Waves', 
    artist: 'Nature Therapy', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-jada-pearson.jpg'
  },
  { 
    title: 'Forest Whispers', 
    artist: 'Woodland Sounds', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-maya-thompson.jpg'
  },
  { 
    title: 'Gentle Rain', 
    artist: 'Rain Therapy', 
    src: '/sounds/click.mp3', 
    image: '/images/happy-couple.jpg'
  },
  { 
    title: 'Meditation Flow', 
    artist: 'Inner Peace', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-elliot-mackaphy.jpg'
  },
  { 
    title: 'Healing Tones', 
    artist: 'Sound Healing', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-jada-pearson.jpg'
  },
  { 
    title: 'Deep Relaxation', 
    artist: 'Therapy Sessions', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-maya-thompson.jpg'
  },
  { 
    title: 'Soft Piano', 
    artist: 'Piano Therapy', 
    src: '/sounds/click.mp3', 
    image: '/images/happy-couple.jpg'
  },
  { 
    title: 'Mindful Journey', 
    artist: 'Journey Within', 
    src: '/sounds/click.mp3', 
    image: '/images/dr-elliot-mackaphy.jpg'
  },
]

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(tracks[currentTrack].src)
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration)
        }
      })
      
      audioRef.current.addEventListener('ended', () => {
        nextTrack()
      })
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.remove()
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [currentTrack])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.debug('Music playback error:', err)
          setIsPlaying(false)
        })
        
        // Update progress every second
        progressIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
          }
        }, 1000)
      } else {
        audioRef.current.pause()
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const nextTrack = () => {
    getNextTrack()
  }

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }
  
  // Shuffle mode state
  const [isShuffleMode, setIsShuffleMode] = useState(false)
  // Repeat mode state 
  const [isRepeatMode, setIsRepeatMode] = useState(false)
  
  const shuffle = () => {
    setIsShuffleMode(!isShuffleMode)
  }
  
  const repeat = () => {
    setIsRepeatMode(!isRepeatMode)
  }
  
  // Function to get the next track based on current mode
  const getNextTrack = () => {
    if (isShuffleMode) {
      // Get random track that's not the current one
      let randomIndex
      do {
        randomIndex = Math.floor(Math.random() * tracks.length)
      } while (randomIndex === currentTrack && tracks.length > 1)
      
      setCurrentTrack(randomIndex)
    } else {
      // Normal sequential next
      setCurrentTrack((prev) => (prev + 1) % tracks.length)
    }
    setIsPlaying(true)
  }
  
  // Handle track ending
  useEffect(() => {
    const handleTrackEnd = () => {
      if (isRepeatMode) {
        // Restart current track
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(err => {
            console.debug('Music playback error:', err)
          })
        }
      } else {
        // Play next track
        getNextTrack()
      }
    }
    
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleTrackEnd)
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleTrackEnd)
      }
    }
  }, [isRepeatMode, isShuffleMode, currentTrack])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget
      const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.clientWidth
      const newTime = clickPosition * audioRef.current.duration
      
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      setProgress(clickPosition * 100)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <>
      {/* Music Player Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all duration-300 cursor-pointer"
          aria-label={isOpen ? "Close music player" : "Open music player"}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Music className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Music Player */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-8 right-8 z-40 w-11/12 sm:w-10/12 md:w-2/3 lg:w-1/2 max-w-lg"
          >
            <div className="bg-white shadow-lg rounded-lg w-full">
              <div className="flex flex-col md:flex-row">
                <div className="hidden md:block md:w-2/5">
                  <img 
                    className="w-full h-full object-cover rounded-l-lg" 
                    src={tracks[currentTrack].image} 
                    alt={`${tracks[currentTrack].title} album cover`}
                  />
                </div>
                <div className="w-full md:w-3/5 p-3 sm:p-4 md:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                        aria-label="Minimize music player"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="cursor-pointer text-red-500">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-6 md:mt-8">
                    <h3 className="text-lg sm:text-xl md:text-2xl text-gray-800 font-medium truncate">{tracks[currentTrack].title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{tracks[currentTrack].artist}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 sm:mt-6 md:mt-8">
                    <div className="text-gray-600">
                      <button 
                        onClick={shuffle} 
                        className={`cursor-pointer hover:text-red-500 transition-colors duration-300 ${isShuffleMode ? 'text-red-500' : ''}`}
                        aria-label="Shuffle tracks"
                      >
                        <Shuffle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                    <div className="text-gray-600">
                      <button 
                        onClick={prevTrack} 
                        className="cursor-pointer hover:text-red-500 transition-colors duration-300"
                        aria-label="Previous track"
                      >
                        <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                    <button 
                      onClick={togglePlay} 
                      className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white rounded-full bg-red-500 shadow-lg cursor-pointer"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      ) : (
                        <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      )}
                    </button>
                    <div className="text-gray-600">
                      <button 
                        onClick={nextTrack} 
                        className="cursor-pointer hover:text-red-500 transition-colors duration-300"
                        aria-label="Next track"
                      >
                        <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                    <div className="text-gray-600">
                      <button 
                        onClick={repeat} 
                        className={`cursor-pointer hover:text-red-500 transition-colors duration-300 ${isRepeatMode ? 'text-red-500' : ''}`}
                        aria-label="Repeat track"
                      >
                        <Repeat className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                  <p>{formatTime(currentTime)}</p>
                  <p>{formatTime(duration)}</p>
                </div>
                <div className="mt-1">
                  <div 
                    className="h-1 bg-gray-300 rounded-full cursor-pointer"
                    onClick={handleProgressClick}
                  >
                    <div 
                      className="h-1 bg-red-500 rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 -top-1.5 transform translate-x-1/2">
                        <Music2 
                          className="w-2 h-2 sm:w-3 sm:h-3 text-red-500 cursor-pointer" 
                          strokeWidth={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}