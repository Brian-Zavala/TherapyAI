// src/app/api/dashboard/clear-cache/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dashboardCache } from '@/lib/cache/dashboard-cache';
import { findUserByEmailOptimized } from '@/lib/database/optimized-user-queries';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user in the database
    const userResult = await findUserByEmailOptimized(session.user?.email || '');
    const user = userResult ? { id: userResult.id } : null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Clear all dashboard cache for this user
    const cacheKeysToDelete = [
      `dashboard:communication-metrics:${user.id}:solo`,
      `dashboard:communication-metrics:${user.id}:couple`, 
      `dashboard:communication-metrics:${user.id}:family`,
      `dashboard:relationship-progress:${user.id}:solo`,
      `dashboard:relationship-progress:${user.id}:couple`,
      `dashboard:relationship-progress:${user.id}:family`,
      `dashboard:session-counts:${user.id}`,
      `dashboard:insights:${user.id}`,
      `dashboard:insights:${user.id}_solo`,
      `dashboard:insights:${user.id}_couple`,
      `dashboard:insights:${user.id}_family`,
    ];
    
    for (const key of cacheKeysToDelete) {
      await dashboardCache.delete(key);
    }
    
    console.log(`Cleared dashboard cache for user ${user.id}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Dashboard cache cleared successfully',
      clearedKeys: cacheKeysToDelete.length
    });
    
  } catch (error) {
    console.error('Error clearing dashboard cache:', error);
    return NextResponse.json({ 
      error: 'Failed to clear cache' 
    }, { status: 500 });
  }
}