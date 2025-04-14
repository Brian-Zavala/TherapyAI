'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import useButtonSound from '@/hooks/useButtonSound'

export default function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated, logout, isLoading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const playSound = useButtonSound()
  
  const toggleMenu = () => {
    playSound()
    setIsMenuOpen(!isMenuOpen)
  }
  
  // Define consistent link styles
  const linkStyles = (isActive) => 
    isActive 
      ? 'text-white font-bold' 
      : 'text-indigo-100 hover:text-white'
  
  return (
    <header className="bg-gradient-to-tr from-blue-500 to-blue-600 shadow-sm sticky top-0 z-40 w-full">
      <div className="w-full py-3">
        <div className="flex justify-between items-center w-full px-2">
          {/* Logo/Site Title - far left aligned */}
          <div className="flex-none pl-6">
            <Link href="/" className="text-white text-xl font-semibold flex items-center">
              TherapyAI
            </Link>
          </div>
          
          {/* Spacer to push hamburger to the right */}
          <div className="flex-1"></div>
          
          {/* Hamburger button - visible on all screen sizes */}
          <div className="flex-none pr-6">
            <button 
              className="p-2 focus:outline-none cursor-pointer rounded-lg hover:bg-blue-500 transition-colors"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <div className="w-6 h-5 relative flex items-center justify-center">
                <span 
                  className={`absolute h-0.5 bg-white transition-all duration-300 transform ${
                    isMenuOpen 
                      ? 'w-6 rotate-45' 
                      : 'w-6 -translate-y-2'
                  }`}
                ></span>
                <span 
                  className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
                    isMenuOpen 
                      ? 'opacity-0' 
                      : 'opacity-100'
                  }`}
                ></span>
                <span 
                  className={`absolute h-0.5 bg-white transition-all duration-300 transform ${
                    isMenuOpen 
                      ? 'w-6 -rotate-45' 
                      : 'w-6 translate-y-2'
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* No backdrop overlay to prevent the black screen issue */}
      
      {/* Menu drawer - appears for all screen sizes */}
      <div 
        className={`fixed top-0 right-0 h-screen bg-gradient-to-r from-blue-600 to-blue-500 z-50 overflow-y-auto shadow-2xl transition-all duration-300 ease-in-out w-72 transform ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="pt-4 px-4 flex justify-end items-center border-b border-blue-800 pb-4">
         
          <button
            onClick={toggleMenu}
            className="p-2 text-white hover:bg-blue-500 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-4 py-6 flex flex-col space-y-2">
          <Link 
            href="/" 
            className={`${linkStyles(pathname === '/')} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
            onClick={() => setIsMenuOpen(false)}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          
          {isLoading ? (
            <div className="text-indigo-100 py-2 px-3 flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          ) : isAuthenticated ? (
            <>
              <Link 
                href="/dashboard/therapy" 
                className={`${linkStyles(pathname === '/dashboard/therapy')} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Therapy
              </Link>
              <Link 
                href="/dashboard" 
                className={`${linkStyles(pathname === '/dashboard')} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Dashboard
              </Link>
              <Link 
                href="/dashboard/sessions" 
                className={`${linkStyles(pathname === '/dashboard/sessions')} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Sessions
              </Link>
              <Link 
                href="/dashboard/resources" 
                className={`${linkStyles(pathname.includes('/resources'))} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Resources
              </Link>
              <Link 
                href="/dashboard/profile" 
                className={`${linkStyles(pathname === '/dashboard/profile')} py-2 px-3 rounded-lg hover:bg-blue-500 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              
              <div className="pt-4 mt-4 border-t border-blue-600">
                <button 
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="text-indigo-100 hover:cursor-pointer hover:text-white w-full py-2 px-3 text-left hover:bg-gradient-to-r from-red-500 via-red-500/50 to-red-500/5 rounded-lg hover:frombg-red-700 transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className={`${linkStyles(pathname === '/auth/login')} py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </Link>
              <Link 
                href="/auth/register" 
                className={`${linkStyles(pathname === '/auth/register')} py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}