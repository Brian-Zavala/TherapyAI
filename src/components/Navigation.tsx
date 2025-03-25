'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  // In a real app, this would be determined from your auth system
  const isLoggedIn = pathname.startsWith('/dashboard')
  
  return (
    <header className="bg-white shadow-sm relative">
      <nav className="container mx-auto px-4 py-4">
        {/* Logo centered on mobile, left-aligned on desktop */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-blue-500 mx-auto lg:mx-0">Couples Connect</div>
          
          {/* Hamburger button for mobile */}
          <button 
            className="lg:hidden absolute right-4 top-4 flex items-center px-3 py-2 border rounded text-gray-500 border-gray-500 hover:text-blue-500 hover:border-blue-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="fill-current h-3 w-3" viewBox="0 0 20 20">
              <title>Menu</title>
              <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
            </svg>
          </button>
        </div>
        
        {/* Navigation links - centered on both mobile and desktop */}
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row items-center justify-center mt-4 lg:mt-2 w-full`}>
          <Link href="/" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname === '/' ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-500`}>
            Home
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-600`}>
                Dashboard
              </Link>
              <Link href="/dashboard/resources" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname.includes('/resources') ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-600`}>
                Resources
              </Link>
              <Link href="/dashboard/profile" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname === '/dashboard/profile' ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-600`}>
                Profile
              </Link>
              <Link href="/" className={`px-4 py-2 mb-2 lg:mb-0 text-gray-600 hover:text-blue-500`}>
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname === '/auth/login' ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-600`}>
                Login
              </Link>
              <Link href="/auth/register" className={`px-4 py-2 mb-2 lg:mb-0 ${pathname === '/auth/register' ? 'text-blue-500' : 'text-gray-600'} hover:text-blue-600`}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}