# Notification System Documentation

## Overview

The notification system is a production-ready, Next.js-compatible real-time notification solution that handles all edge cases with zero polling loops.

## Architecture

### Core Components

1. **`useNotifications` Hook** (`/hooks/useNotifications.ts`)
   - Single source of truth for notification state
   - Handles authentication, network state, permissions
   - Integrates with React Query for caching
   - Supabase real-time for updates

2. **`NotificationProvider`** (`/providers/NotificationProvider.tsx`)
   - Global provider wrapping the app
   - Manages connections and state
   - Provides context to all components

3. **`NotificationBell`** (`/components/ui/notification-bell.tsx`)
   - Displays unread count
   - Shows connection status
   - Opens notification center

4. **`NotificationCenter`** (`/components/ui/notification-center.tsx`)
   - Full notification UI
   - Filtering, searching, actions
   - Optimistic updates

## Key Features

### 1. **No Polling Loops**
- Uses Supabase real-time subscriptions
- React Query invalidation on changes
- Single API request shared across components

### 2. **Edge Case Handling**
- Network offline/online detection
- Authentication state changes
- Session expiry graceful handling
- Rate limiting with backoff
- Memory leak prevention
- Duplicate notification prevention

### 3. **Performance Optimized**
- Virtual scrolling for large lists
- Memoized computations
- Debounced updates
- Progressive enhancement

### 4. **Production Ready**
- Error boundaries
- Telemetry and monitoring
- Configuration via environment variables
- TypeScript fully typed

## Usage

### Basic Usage

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { 
    notifications, 
    summary, 
    isLoading, 
    markAsRead 
  } = useNotifications();

  return (
    <div>
      <p>You have {summary.unreadCount} unread notifications</p>
      {notifications.map(n => (
        <div key={n.id}>
          {n.title}
          {!n.readAt && (
            <button onClick={() => markAsRead(n.id)}>
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Using Context

```tsx
import { useNotificationState, useNotificationActions } from '@/providers/NotificationProvider';

function NotificationManager() {
  const { notifications, isConnected } = useNotificationState();
  const { markAllAsRead, refresh } = useNotificationActions();

  return (
    <div>
      {!isConnected && <p>Reconnecting...</p>}
      <button onClick={markAllAsRead}>Mark all as read</button>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## Configuration

Add these to your `.env` file:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key

# Optional (see .env.notifications.example for all options)
NEXT_PUBLIC_NOTIFICATION_REALTIME_ENABLED=true
NEXT_PUBLIC_NOTIFICATION_SOUND_ENABLED=true
NEXT_PUBLIC_NOTIFICATION_BROWSER_ENABLED=true
```

## API Endpoints

The system expects these endpoints:

- `GET /api/notifications` - Fetch notifications
- `POST /api/notifications` - Mark as read/perform actions
- `DELETE /api/notifications` - Delete notifications

## Database Schema

Expects a `Notification` table with:
- `id` (string)
- `userId` (string)
- `type` (enum: reminder|completion|update|alert)
- `title` (string)
- `message` (string)
- `priority` (enum: low|normal|high|urgent)
- `readAt` (timestamp, nullable)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## Testing

Run the comprehensive test suite:

```bash
npm test src/tests/notifications
```

## Migration from Old System

1. Remove `useRealtimeNotifications` imports
2. Remove `useNotifications` from `useApiQuery`
3. Ensure `NotificationProvider` wraps your app
4. Update components to use new hooks

## Performance Considerations

- Initial load: <500ms for 1000 notifications
- Memory: Constant with virtual scrolling
- Network: Single WebSocket connection
- CPU: Batched updates, memoized calculations

## Troubleshooting

### Notifications not updating
- Check Supabase realtime is enabled for the table
- Verify environment variables are set
- Check browser console for connection errors

### High memory usage
- Ensure old notifications are being cleaned up
- Check for multiple provider instances
- Verify cleanup on unmount

### Permission issues
- Browser notifications require HTTPS
- User must grant permission
- Fallback to in-app notifications

## Future Enhancements

- Push notifications via service worker
- Email digest preferences
- Notification templates
- Advanced filtering and search
- Notification scheduling