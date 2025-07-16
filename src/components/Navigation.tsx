"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useCallback, useRef } from "react";
import useButtonSound from "@/hooks/useButtonSound";
import { motion, AnimatePresence } from "framer-motion";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const playSound = useButtonSound();

  // Optimize menu opening/closing with RAF
  const optimizedSetMenuOpen = useCallback((open: boolean) => {
    if (mobileMenuRef.current) {
      // Pre-optimize for animation
      mobileMenuRef.current.style.willChange = open ? 'opacity, visibility, transform' : 'auto';
    }
    requestAnimationFrame(() => {
      setIsMenuOpen(open);
    });
  }, []);

  // Optimized mobile detection with throttling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkIfMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 1024); // Tailwind's lg breakpoint - includes tablets
      }, 100); // Throttle resize events
    };

    // Initial check
    checkIfMobile();

    // Add event listener for resize
    window.addEventListener("resize", checkIfMobile, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIfMobile);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        event.preventDefault();
        optimizedSetMenuOpen(false);
      }
    },
    [isMenuOpen, optimizedSetMenuOpen]
  );

  const toggleMenu = useCallback(() => {
    playSound();
    optimizedSetMenuOpen(!isMenuOpen);
  }, [playSound, optimizedSetMenuOpen, isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape, { passive: false });
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener("keydown", handleEscape);
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, handleEscape]);

  // Define consistent link styles
  const linkStyles = (isActive: boolean) =>
    isActive ? "text-white font-bold" : "text-gray-100 hover:text-white";

  // Don't show navbar on auth pages, intro, or during onboarding - moved after all hook calls
  if (pathname?.startsWith("/auth/") || pathname?.startsWith("/welcome") || pathname === "/intro") {
    return null;
  }

  return (
    <div className="fixed top-2 w-full flex justify-between items-center z-40 px-4 py-4 nav-container">
      {/* Logo/Site Title - left aligned */}
      <div className="absolute text-white text-lg font-semibold">
        TherapyAI&#8482;
      </div>

      {/* Thin menu tab that expands on hover - hidden when menu is open */}
      {!isMenuOpen && (
        <div
          id="menu-tab"
          className="hidden lg:block cursor-pointer"
          onMouseOver={() => {
            setIsMenuOpen(true);
            playSound();
          }}
        ></div>
      )}

      {/* Centered Menu */}
      <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none z-50">
        <div className="pointer-events-auto">
          <input
            type="radio"
            name="toggle"
            id="toggleOpen"
            className="hidden"
            checked={isMenuOpen}
            onChange={() => {}} // Controlled by React state
          />
          <input
            type="radio"
            name="toggle"
            id="toggleClose"
            className="hidden"
            checked={!isMenuOpen}
            onChange={() => {}} // Controlled by React state
          />

          <figure id="welcomeMessage">
            <figcaption>
              <h1>
                <label
                  htmlFor="toggleOpen"
                  title="Click to Open"
                  className="cursor-pointer"
                ></label>
                <label
                  htmlFor="toggleClose"
                  title="Click to Close"
                  className="cursor-pointer"
                  onClick={() => {
                    setIsMenuOpen(false);
                    playSound();
                  }}
                >
                  ✖
                </label>

                {/* M */}
                <b>
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      window.location.href = "/";
                    }}
                    tabIndex={isMenuOpen ? 0 : -1}
                  >
                    Home
                  </a>
                </b>

                {/* E */}
                {isAuthenticated && (
                  <b>
                    <a
                      href="/dashboard/therapy"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMenuOpen(false);
                        window.location.href = "/dashboard/therapy";
                      }}
                      tabIndex={isMenuOpen ? 0 : -1}
                    >
                      Therapy
                    </a>
                  </b>
                )}

                {/* N */}
                {isAuthenticated && (
                  <b>
                    <a
                      href="/dashboard/sessions"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMenuOpen(false);
                        window.location.href = "/dashboard/sessions";
                      }}
                      tabIndex={isMenuOpen ? 0 : -1}
                    >
                      Sessions
                    </a>
                  </b>
                )}

                {/* U */}
                {isAuthenticated && (
                  <b>
                    <a
                      href="/dashboard"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMenuOpen(false);
                        router.push("/dashboard");
                      }}
                      tabIndex={isMenuOpen ? 0 : -1}
                    >
                      Dashboard
                    </a>
                  </b>
                )}

                {!isAuthenticated ? (
                  <>
                    <b>
                      <a
                        href="/auth/login"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          window.location.href = "/auth/login";
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        Login
                      </a>
                    </b>

                    <b>
                      <a
                        href="/auth/register"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          window.location.href = "/auth/register";
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        Register
                      </a>
                    </b>
                  </>
                ) : (
                  <>
                    <b>
                      <a
                        href="/dashboard/resources"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          window.location.href = "/dashboard/resources";
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        Resources
                      </a>
                    </b>

                    <b>
                      <a
                        href="/dashboard/profile"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          window.location.href = "/dashboard/profile";
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        Profile
                      </a>
                    </b>
                    <b>
                      <a
                        href="/support"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          window.location.href = "/support";
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                      >
                        Support
                      </a>
                    </b>
                    <b>
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          await logout();
                        }}
                        tabIndex={isMenuOpen ? 0 : -1}
                        className="text-red-400 hover:text-red-300"
                      >
                        Logout
                      </a>
                    </b>
                  </>
                )}
              </h1>
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Mobile Menu Button - visible on mobile and tablet */}
      <div className="lg:hidden top-2 right-2 absolute z-50">
        <button
          ref={menuBtnRef}
          className="focus:outline-none cursor-pointer"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        >
          <div 
            className="bg-black w-10 h-10 flex items-center justify-center border-1 border-white rounded-sm"
            style={{ willChange: 'background-color', transform: 'translateZ(0)' }}
          >
            <div 
              className="w-6 h-5 relative flex items-center justify-center"
              style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            >
              <span
                className={`absolute h-0.5 bg-white transition-all duration-300 transform ${
                  isMenuOpen
                    ? "w-6 rotate-45 translate-y-0"
                    : "w-6 -translate-y-2"
                }`}
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
              ></span>
              <span
                className={`absolute h-0.5 w-6 bg-white transition-all duration-300 ${
                  isMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                }`}
                style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
              ></span>
              <span
                className={`absolute h-0.5 bg-white transition-all duration-300 transform ${
                  isMenuOpen
                    ? "w-6 -rotate-45 translate-y-0"
                    : "w-6 translate-y-2"
                }`}
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
              ></span>
            </div>
          </div>
        </button>
      </div>

      {/* Mobile Menu - covers entire screen (for mobile and tablet) - Framer Motion Optimized */}
      <AnimatePresence mode="wait">
        {isMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            className="lg:hidden fixed inset-0 bg-gradient-to-r from-neutral-900 via-black to-neutral-900 backdrop-blur-sm z-50 overflow-y-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.25,
              ease: [0.23, 1, 0.32, 1], // Custom easing for smooth animation
              layout: { duration: 0.2 }
            }}
            style={{
              willChange: 'transform, opacity',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
        <div className="container mx-auto max-w-4xl px-4 h-full flex flex-col">
          <div className="pt-4 px-4 flex justify-end items-center pb-4">
            <button
              onClick={() => optimizedSetMenuOpen(false)}
              className="p-2 text-white hover:bg-white/35 rounded-full transition-colors cursor-pointer"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <motion.div 
            className="flex-1 flex flex-col justify-center items-center py-10 space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/"
                className={`menu-item js-cdpn-mobile-menu__link text-2xl text-center w-full ${linkStyles(pathname === "/")} py-4 px-6 rounded-lg hover:bg-black transition-colors flex items-center justify-center`}
                onClick={() => optimizedSetMenuOpen(false)}
                style={{ willChange: 'background-color, transform', transform: 'translateZ(0)' }}
              >
              <svg
                className="w-7 h-7 mr-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </Link>
            </motion.div>

            {isLoading ? (
              <div className="text-indigo-100 py-4 px-6 text-2xl flex items-center justify-center">
                <svg
                  className="animate-spin mr-4 h-7 w-7 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </div>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/dashboard/therapy"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/dashboard/therapy")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ willChange: 'background-color, transform', transform: 'translateZ(0)' }}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Therapy
                </Link>
                <Link
                  href="/dashboard"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/dashboard")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ willChange: 'background-color, transform', transform: 'translateZ(0)' }}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/sessions"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/dashboard/sessions")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Sessions
                </Link>
                <Link
                  href="/dashboard/resources"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname.includes("/resources"))} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Resources
                </Link>
                <Link
                  href="/dashboard/profile"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/dashboard/profile")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </Link>
                <Link
                  href="/support"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/support")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Support
                </Link>

                <div className="pt-8 mt-4 border-t border-stone-600/50 w-full flex justify-center">
                  <button
                    onClick={async () => {
                      await logout();
                      setIsMenuOpen(false);
                    }}
                    className="text-2xl text-indigo-100 hover:cursor-pointer hover:text-white py-4 px-6 text-center hover:bg-red-600/30 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg
                      className="w-7 h-7 mr-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/auth/login")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className={`menu-item text-2xl text-center w-full ${linkStyles(pathname === "/auth/register")} py-4 px-6 rounded-lg hover:bg-black/30 transition-colors flex items-center justify-center`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg
                    className="w-7 h-7 mr-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Sign Up
                </Link>
              </>
            )}
          </motion.div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG gradient definition */}
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient
            id="svgGradient"
            x1="0"
            y1="0"
            x2="20"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#00ffc3" />
            <stop offset="0.09090909090909091" stopColor="#00fad9" />
            <stop offset="0.18181818181818182" stopColor="#00f4f0" />
            <stop offset="0.2727272727272727" stopColor="#00eeff" />
            <stop offset="0.36363636363636365" stopColor="#00e6ff" />
            <stop offset="0.4545454545454546" stopColor="#00dcff" />
            <stop offset="0.5454545454545454" stopColor="#00d2ff" />
            <stop offset="0.6363636363636364" stopColor="#00c5ff" />
            <stop offset="0.7272727272727273" stopColor="#00b8ff" />
            <stop offset="0.8181818181818182" stopColor="#6da8ff" />
            <stop offset="0.9090909090909092" stopColor="#9f97ff" />
            <stop offset="1" stopColor="#c285ff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
