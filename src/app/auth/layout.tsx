"use client";

// Import the server layout's metadata
import "./metadata";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Clean up any potential scroll issues
  useEffect(() => {
    // Reset any overflow constraints that might interfere
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
    
    return () => {
      // No cleanup needed - allow normal scrolling
    };
  }, []);

  useEffect(() => {
    // Redirect authenticated users away from auth pages (login/signup)
    if (status === "authenticated") {
      router.push("/welcome"); // Redirect to welcome/onboarding
    }
  }, [status, router]);

  // --- Loading State ---
  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Simple loading spinner */}
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- Render Auth Layout (if not authenticated and not loading) ---
  // Only render the layout if the user is unauthenticated
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen w-full bg-gray-900">
        {children}
      </div>
    );
  }

  // Optional: Return null or a placeholder if status is 'authenticated'
  // but the redirect hasn't happened yet (usually handled by useEffect)
  return null;
}