// src/components/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()
  
  // In a real app, this would be determined from your auth system
  const isLoggedIn = pathname.startsWith('/dashboard')
  
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-xl font-bold text-blue-700">Couples Connect</div>
        <div className="space-x-6">
          <Link href="/" className={`${pathname === '/' ? 'text-blue-700' : 'text-gray-600'} hover:text-blue-700`}>
            Home
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className={`${pathname === '/dashboard' ? 'text-blue-700' : 'text-gray-600'} hover:text-blue-700`}>
                Dashboard
              </Link>
              <Link href="/dashboard/profile" className={`${pathname === '/dashboard/profile' ? 'text-blue-700' : 'text-gray-600'} hover:text-blue-700`}>
                Profile
              </Link>
              <Link href="/" className="text-gray-600 hover:text-blue-700">
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={`${pathname === '/auth/login' ? 'text-blue-700' : 'text-gray-600'} hover:text-blue-700`}>
                Login
              </Link>
              <Link href="/auth/register" className={`${pathname === '/auth/register' ? 'text-blue-700' : 'text-gray-600'} hover:text-blue-700`}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}