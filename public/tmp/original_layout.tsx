"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users away from auth pages (login/signup)
    if (status === "authenticated") {
      router.push("/dashboard"); // Or your intended redirect path
    }
  }, [status, router]);

  // --- Loading State ---
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        {/* Simple loading spinner */}
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- Render Auth Layout (if not authenticated and not loading) ---
  // Only render the layout if the user is unauthenticated
  if (status === "unauthenticated") {
    return (
      // Outermost container: Takes at least screen height, positions elements vertically
      <div className="relative flex flex-col w-full min-h-screen bg-white dark:bg-gray-900">
        {/* 1. Background Gradient Layer (Behind everything) */}
        {/* Stays behind image and content */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-400/ via-blue-600 to-blue-800 -z-10" // Adjusted gradient colors
          aria-hidden="true"
        >
          {/* You could add an overlay here if needed, e.g. */}
          {/* <div className="absolute inset-0 bg-black/10"></div> */}
        </div>

        {/* 2. Upside-down 'U' shape with clip-path */}
        <div
          className="relative w-full h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden z-10"
          style={{
            backgroundImage: `url('/images/login/yoga.png')`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            clipPath:
              "polygon(0% 65% 0% 65%, 18% 78%, 18% 78%, 44% 83%, 44% 83%, 69% 83%, 69% 83%, 93% 78%, 93% 78%, 100% 64%, 100% 64%, 0% 30%, 0% 30%, 100% 32%, 100% 32%, 0% 0%, 0% 0%, 100% 0%, 100% 0%, 51% 0%, 51% 0%)",
            WebkitClipPath:
              "polygon(0% 65% 0% 65%, 18% 78%, 18% 78%, 44% 83%, 44% 83%, 69% 83%, 69% 83%, 93% 78%, 93% 78%, 100% 64%, 100% 64%, 0% 30%, 0% 30%, 100% 32%, 100% 32%, 0% 0%, 0% 0%, 100% 0%, 100% 0%, 51% 0%, 51% 0%)",
            transition: "0.4s cubic-bezier(1, -1, 0, 2)",
          }}
        >
          {/* Nested div for fallback and better browser support */}
          <div className="absolute inset-0">
            <img
              src="/images/login/yoga.png"
              alt="Login background"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Semi-transparent overlay for bottom fade effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-indigo-800 to-transparent z-20"></div>
        </div>

        {/* 3. Content Area (Below the image) */}
        {/* Centers the children horizontally and provides padding */}
        <div className="flex justify-center items-start flex-grow w-full px-4 py-8 sm:px-6 lg:px-8">
          {/* Content Wrapper: Applies max-width, relative positioning, z-index */}
          {/* Negative margin pulls it slightly over the faded image bottom */}
          <div className="relative z-10 w-full max-w-md mt-[-8vh] md:mt-[-5vh]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Optional: Return null or a placeholder if status is 'authenticated'
  // but the redirect hasn't happened yet (usually handled by useEffect)
  return null;
}
