'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated, logout, isLoading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  // Define consistent link styles
  const linkStyles = (isActive) => 
    isActive 
      ? 'text-white font-bold' 
      : 'text-indigo-100 hover:text-white'
  
  return (
    <header className="bg-zinc-700 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        {/* Desktop navigation */}
        <nav className="hidden md:flex justify-center items-center space-x-6">
          <Link href="/" className={linkStyles(pathname === '/')}>
            Home
          </Link>
          
          {isLoading ? (
            <span className="text-indigo-100">Loading...</span>
          ) : isAuthenticated ? (
            <>
              <Link href="/dashboard/therapy" className={linkStyles(pathname === '/dashboard/therapy')}>
                Therapy
              </Link>
              <Link href="/dashboard" className={linkStyles(pathname === '/dashboard')}>
                Dashboard
              </Link>
              <Link href="/dashboard/resources" className={linkStyles(pathname.includes('/resources'))}>
                Resources
              </Link>
              <Link href="/dashboard/profile" className={linkStyles(pathname === '/dashboard/profile')}>
                Profile
              </Link>
              <button 
                onClick={logout}
                className="text-indigo-100 hover:text-white cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={linkStyles(pathname === '/auth/login')}>
                Login
              </Link>
              <Link href="/auth/register" className={linkStyles(pathname === '/auth/register')}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
        
        {/* Mobile navigation */}
        <div className="md:hidden flex justify-end">
          <button 
            className="p-2 focus:outline-none cursor-pointer"
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
      
      {/* Mobile menu drawer - appears below the header instead of overlaying */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-indigo-400">
          <div className="container mx-auto px-4 py-6 flex flex-col space-y-4 bg-zinc-700">
            <Link 
              href="/" 
              className={`${linkStyles(pathname === '/')} py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {isLoading ? (
              <span className="text-indigo-100 py-2">Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard/therapy" 
                  className={`${linkStyles(pathname === '/dashboard/therapy')} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Therapy
                </Link>
                <Link 
                  href="/dashboard" 
                  className={`${linkStyles(pathname === '/dashboard')} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/dashboard/resources" 
                  className={`${linkStyles(pathname.includes('/resources'))} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Resources
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className={`${linkStyles(pathname === '/dashboard/profile')} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="text-indigo-100 hover:text-white py-2 text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className={`${linkStyles(pathname === '/auth/login')} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/auth/register" 
                  className={`${linkStyles(pathname === '/auth/register')} py-2`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}