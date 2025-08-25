'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSoundContext } from '@/components/providers/SoundProvider'
import { usePathname } from 'next/navigation'
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
    title: 'Balcony Nights', 
    artist: 'Back to Nature', 
    src: '/sounds/music/balconyNights.mp3', 
    image: '/images/music/1.webp'
  },
  { 
    title: 'Cascsades', 
    artist: 'David Thomas', 
    src: '/sounds/music/Cascades.mp3',
    image: '/images/music/2.webp' 
  },
  { 
    title: 'After The Rain', 
    artist: 'Daniel James', 
    src: '/sounds/music/AfterTheRain.mp3', 
    image: '/images/music/3.webp'
  },
  { 
    title: 'Before The End', 
    artist: 'Dan Phillipson', 
    src: '/sounds/music/BeforeTheEnd.mp3', 
    image: '/images/music/4.webp'
  },
  { 
    title: 'Circles Of Life', 
    artist: 'Todd James Carlin Baker', 
    src: '/sounds/music/life.mp3', 
    image: '/images/music/5.webp'
  },
  { 
    title: 'DNA', 
    artist: 'Rachael Irene Jones', 
    src: '/sounds/music/DNA.mp3', 
    image: '/images/music/6.webp'
  },
  { 
    title: 'Focus Flow', 
    artist: 'Runone', 
    src: '/sounds/music/FocusFlow.mp3', 
    image: '/images/music/7.webp'
  },
  { 
    title: 'Fragile Balance', 
    artist: 'Rainman', 
    src: '/sounds/music/FragileBalance.mp3', 
    image: '/images/music/8.webp'
  },
  { 
    title: 'Fresh Air', 
    artist: 'Mark Russell', 
    src: '/sounds/music/FreshAir.mp3', 
    image: '/images/music/9.webp'
  },
  { 
    title: 'Fresh Starts', 
    artist: 'Rainman', 
    src: '/sounds/music/FreshStarts.mp3', 
    image: '/images/music/10.webp'
  },
  { 
    title: 'Full Moon', 
    artist: 'Alexander Hitchens', 
    src: '/sounds/music/FullMoon.mp3', 
    image: '/images/music/11.webp'
  },
  { 
    title: 'Great Void', 
    artist: 'Benjamin Charles Francis Baptie', 
    src: '/sounds/music/GreatVoid.mp3', 
    image: '/images/music/12.webp'
  },
  { 
    title: 'Happy Endings', 
    artist: 'Rainman', 
    src: '/sounds/music/HappyEndings.mp3', 
    image: '/images/music/13.webp'
  },
  { 
    title: 'Monkeying Around', 
    artist: 'Carolina Vanessa James', 
    src: '/sounds/music/MonkeyAround.mp3', 
    image: '/images/music/14.webp'
  },
  { 
    title: 'Morning Chorus', 
    artist: 'Rainman', 
    src: '/sounds/music/Morning.mp3', 
    image: '/images/music/15.webp'
  },
  { 
    title: 'Open Circle', 
    artist: 'Jonathan Elias', 
    src: '/sounds/music/openCircle.mp3', 
    image: '/images/music/16.webp'
  },
  { 
    title: 'Serenading Stars', 
    artist: 'Journey Sol Terrae', 
    src: '/sounds/music/serenadingStars.mp3', 
    image: '/images/music/17.webp'
  },
  { 
    title: 'Smooth It Out', 
    artist: 'Josh Duplessis', 
    src: '/sounds/music/SmoothItOut.mp3', 
    image: '/images/music/18.webp'
  },
  { 
    title: 'Thinking Of You', 
    artist: 'Pat McCusker', 
    src: '/sounds/music/ThinkingOfYou.mp3', 
    image: '/images/music/19.webp'
  },
  { 
    title: 'Trouble Cleansing', 
    artist: 'Ngok Ting Lam', 
    src: '/sounds/music/troubleCleansing.mp3', 
    image: '/images/music/20.webp'
  },
]

export default function MusicPlayer() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  
  // Define routes where the music player should be hidden
  const hiddenRoutes = [
    '/dashboard/therapy',        // Hide in active therapy sessions
    '/dashboard/therapy/client', // Hide in client therapy view
    '/auth/login',               // Hide on login page
    '/auth/register',            // Hide on register page
    '/welcome',                  // Hide on onboarding page
    '/intro',                    // Hide on intro page
    '/api/sessions'              // Hide on session API routes
  ]
  
  // Get the sound context to register this music player and check session status
  const { registerMusicPlayer, isSessionActive } = useSoundContext()
  
  // Check if the current path starts with any of the hidden routes or if there's an active session
  const shouldHidePlayer = hiddenRoutes.some(route => pathname?.startsWith(route)) || isSessionActive
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const shouldPlayRef = useRef(false)
  
  // This section is now redundant, as we've already registered the music player above
  
  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Initial check
    checkMobile()
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // Register the audio player with the SoundProvider
  useEffect(() => {
    if (audioRef.current) {
      registerMusicPlayer(audioRef)
      console.log('Registered music player with SoundProvider')
    }
  }, [registerMusicPlayer])
  
  // Watch for session activity changes
  useEffect(() => {
    if (isSessionActive && isPlaying) {
      // If a session starts and music is playing, pause it
      console.log('Session started, pausing music playback')
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [isSessionActive, isPlaying])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save current playing state
      if (audioRef.current) {
        shouldPlayRef.current = isPlaying || !audioRef.current.paused
        audioRef.current.pause()
        audioRef.current = null
      }
      
      // Reset time and progress when changing tracks
      setCurrentTime(0)
      setProgress(0)
      
      // Create new audio for current track
      audioRef.current = new Audio(tracks[currentTrack].src)
      
      // Re-register the audio player whenever it changes
      registerMusicPlayer(audioRef)
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current && isFinite(audioRef.current.duration)) {
          setDuration(audioRef.current.duration)
          
          // Auto-play if needed, but only if no therapy session is active
          if ((shouldPlayRef.current || isPlaying) && !isSessionActive) {
            audioRef.current.play().catch(err => {
              console.debug('Music playback error:', err)
              setIsPlaying(false)
            })
            setIsPlaying(true)
            shouldPlayRef.current = false
            
            // Setup progress interval immediately for the new track
            setupProgressInterval()
          } else if (isSessionActive) {
            // If a session is active, don't auto-play
            setIsPlaying(false)
            shouldPlayRef.current = false
          }
        }
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
  }, [currentTrack, isPlaying, isSessionActive, registerMusicPlayer])

  // Setup or update the progress interval
  const setupProgressInterval = () => {
    // Clear any existing interval first
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    
    if (audioRef.current && isPlaying) {
      // Update progress every second
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current && isFinite(audioRef.current.duration) && isFinite(audioRef.current.currentTime)) {
          setCurrentTime(audioRef.current.currentTime)
          const calculatedProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100
          setProgress(isFinite(calculatedProgress) ? calculatedProgress : 0)
        }
      }, 1000)
    }
  }

  // Effect for handling play/pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.debug('Music playback error:', err)
          setIsPlaying(false)
        })
        
        // Setup the progress interval
        setupProgressInterval()
      } else {
        audioRef.current.pause()
        
        // Clear interval when paused
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
  }, [isPlaying, currentTrack])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const nextTrack = () => {
    // Progress and time will be reset in the useEffect that depends on currentTrack
    getNextTrack()
  }

  const prevTrack = () => {
    shouldPlayRef.current = true
    // Progress and time will be reset in the useEffect that depends on currentTrack
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
  
  // Handle repeat mode changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isRepeatMode
    }
  }, [isRepeatMode])

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      const progressBar = e.currentTarget
      const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.clientWidth
      const newTime = clickPosition * audioRef.current.duration
      
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
        setProgress(clickPosition * 100)
      }
    }
  }

  const formatTime = (time: number) => {
    if (!isFinite(time) || time < 0) {
      return '0:00'
    }
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // If we're on a route where the player should be hidden, don't render anything
  if (shouldHidePlayer) {
    return null
  }
  
  return (
    <>
      {/* Music Player Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed bottom-8 right-8  z-[60]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, transition: {
              duration: 0.1,
              delay: 0
            }}}
            transition={{ 
              type: "spring",
              stiffness: 350,
              damping: 25,
              delay: 0.15
            }}
          >
            <button 
              onClick={() => setIsOpen(true)}
              className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all duration-300 cursor-pointer"
              aria-label="Open music player"
            >
              <Music className="w-6 h-6 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Music Player */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              delay: 0.05 
            }}
            className="fixed bottom-8 right-8 z-[55] w-11/12 sm:w-10/12 md:w-2/3 lg:w-1/2 max-w-lg"
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
                <div className="w-full md:w-3/5 p-3 sm:p-4 md:p-6 relative">
                  <div className="flex justify-end items-center">
                    {/* Heart icon removed as it has no function */}
                  </div>
                  
                  {/* Animated Close Button - optimized for all screen sizes */}
                  <AnimatePresence>
                    <motion.button
                      key="close-button"
                      onClick={() => setIsOpen(false)}
                      className="absolute p-0.5 sm:p-1 hover:bg-red-600 rounded-full cursor-pointer z-[65] bg-red-500 flex items-center justify-center shadow-md"
                      initial={{ 
                        // Start from bottom right of player container 
                        bottom: "0.75rem",
                        right: "0.75rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        opacity: 0 
                      }}
                      animate={{ 
                        // Move to top right
                        bottom: "auto",
                        top: "0.5rem", 
                        right: "0.5rem",
                        width: "1.5rem",
                        height: "1.5rem",
                        opacity: 1 
                      }}
                      exit={{
                        // Return to bottom right
                        top: "auto",
                        bottom: "0.75rem", 
                        right: "0.75rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        opacity: 0
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 25,
                        delay: 0.05
                      }}
                      aria-label="Close music player"
                    >
                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                    </motion.button>
                  </AnimatePresence>
                  
                  <div className="mt-3 sm:mt-5 md:mt-8 flex">
                    {/* Small Album Image for Mobile */}
                    <div className="flex-shrink-0 mr-3 md:hidden">
                      <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-md shadow-md border border-gray-200" 
                        src={tracks[currentTrack].image} 
                        alt={`${tracks[currentTrack].title} album cover`}
                      />
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <h3 className="text-lg sm:text-xl md:text-2xl text-gray-800 font-medium truncate">{tracks[currentTrack].title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{tracks[currentTrack].artist}</p>
                    </div>
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