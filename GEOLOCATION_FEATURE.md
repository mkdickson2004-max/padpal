# Geolocation "Who's Home" Feature - Implementation Summary

## Files Created/Modified

### 1. Geolocation Service (`/src/lib/geolocation.ts`)
Complete geolocation utility with:
- **Haversine formula** for accurate distance calculation between coordinates
- **Browser Geolocation API** wrappers with proper error handling
- **Geofence checking** - returns `isAtHome`, `isNearby` (within 2x radius), distance, accuracy
- **Permission handling** - check/request geolocation permissions
- **Watch position** for real-time updates
- Helper functions: `getTimeSince()`, error message mapping

### 2. WhoIsHome Component (`/src/components/WhoIsHome.tsx`)
Full-featured React component with:
- **Real-time presence display** - shows avatars grouped by: At Home / Nearby / Away
- **Check-in button** - "I'm Home" with visual feedback states
- **Auto-refresh** - polls every 30 seconds + Supabase realtime subscription
- **Permission modal** - explains why location is needed before requesting
- **Error handling** - graceful handling of denied permissions, GPS errors
- **Green pulse indicator** for users currently home
- **Last seen time** for away users

### 3. Database Migration (`/supabase/migrations/001_add_presence_tracking.sql`)
New schema additions:
```sql
-- Added to users table:
last_seen_at timestamp with time zone

-- New presence_events table:
- id, user_id, house_id
- lat, lng, distance_m, is_at_home
- accuracy, created_at

-- Indexes for performance
-- RLS policies for security
-- Trigger to auto-update users.last_seen_at
```

### 4. Dashboard Integration (`/src/app/dashboard/page.tsx`)
- Replaced old `WhosHomeCard` with new `WhoIsHome` component
- Removed old placeholder function

### 5. Supabase Types (`/src/lib/supabase.ts`)
- Added `PresenceEvent` type definition

## Features Implemented

### Check-In Flow
1. User clicks "I'm Home" button
2. Gets fresh GPS position with high accuracy
3. Calculates distance to house using Haversine formula
4. Records presence event to database
5. Auto-updates `users.last_seen_at` via trigger
6. Shows success state ("You're Home" with green badge)

### Real-Time Updates
- **Polling**: Every 30 seconds fetches latest presence data
- **Supabase Realtime**: Subscribes to new presence_events inserts
- **Local state**: Updates immediately on successful check-in

### Edge Cases Handled
- **Permission denied**: Shows "Enable Location Access" button + modal
- **GPS timeout/unavailable**: Shows user-friendly error message
- **Inaccurate GPS**: Displays accuracy value, warns if >100m
- **No house coordinates**: Component handles gracefully
- **Offline**: Error state with retry option

### UI States
- **Loading**: Spinner while initializing
- **At Home**: Green badge "You're Home"
- **Nearby**: Yellow "Check In (Nearby)" button
- **Away**: White "I'm Home" button
- **Permission denied**: "Enable Location Access" with explanation modal

## API Usage

```typescript
// Check if user is at home
const result = await checkGeofence(houseLat, houseLng, radiusMeters);
// Returns: { isAtHome, isNearby, distance, accuracy, position }

// Watch position continuously
const stopWatching = watchPosition(
  (pos) => console.log(pos),
  (err) => console.error(err)
);
```

## Database Queries

```typescript
// Record check-in
await supabase.from('presence_events').insert({
  user_id, house_id, lat, lng,
  distance_m, is_at_home, accuracy
});

// Get recent presence for house
await supabase
  .from('presence_events')
  .select('*')
  .eq('house_id', houseId)
  .order('created_at', { ascending: false });
```

## Security
- RLS policies ensure users only see presence events from their house
- Users can only insert their own presence events
- Location data is never shared outside house membership

## Testing Checklist
- [ ] Check-in works when within geofence radius
- [ ] "Nearby" shows when within 2x radius
- [ ] Permission modal appears on first use
- [ ] Denying permission shows helpful error
- [ ] Real-time updates work (open in 2 browsers)
- [ ] Last seen times update correctly
- [ ] Green pulse indicator animates for home users
- [ ] Refresh button updates data
- [ ] Auto-refresh every 30 seconds works
