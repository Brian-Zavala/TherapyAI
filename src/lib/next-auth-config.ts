// src/lib/next-auth-config.ts
// 2025 Standard: Client-side NextAuth configuration

export function getBaseUrl() {
  // In the browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // On the server
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // Deployed on Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Deployed on Railway
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  
  // Default to localhost
  return 'http://localhost:3000';
}

// 2025 Standard: NextAuth client configuration
export const nextAuthConfig = {
  baseUrl: getBaseUrl(),
  basePath: '/api/auth',
  credentials: 'include' as RequestCredentials,
};

// 2025 Standard: Custom fetch wrapper for NextAuth
export async function fetchAuth(endpoint: string, options?: RequestInit) {
  const url = `${nextAuthConfig.baseUrl}${nextAuthConfig.basePath}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: nextAuthConfig.credentials,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      console.error(`[NextAuth] Fetch failed: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('[NextAuth] Fetch error:', error);
    throw error;
  }
}