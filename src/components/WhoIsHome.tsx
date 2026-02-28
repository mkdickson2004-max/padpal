'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  checkGeofence,
  getCurrentPosition,
  getGeolocationPermissionState,
  getGeolocationErrorMessage,
  requestGeolocationPermission,
  calculateDistance,
  getTimeSince,
  type GeofenceResult,
  type PresenceEvent,
  type UserPresence,
} from '@/lib/geolocation'
import { Home, MapPin, AlertCircle, Loader2, RefreshCw, Navigation } from 'lucide-react'

interface WhoIsHomeProps {
  members: any[]
  house: {
    id: string
    name: string
    lat: number
    lng: number
    geofence_radius_m: number
  }
  currentUserId: string
}

export default function WhoIsHome({ members, house, currentUserId }: WhoIsHomeProps) {
  const [userPresences, setUserPresences] = useState<UserPresence[]>([])
  const [myPresence, setMyPresence] = useState<GeofenceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Fetch presence data for all members
  const fetchPresenceData = useCallback(async () => {
    if (!house?.id) return

    try {
      // Get recent presence events for all house members
      const { data: presenceData, error: presenceError } = await supabase
        .from('presence_events')
        .select('*')
        .eq('house_id', house.id)
        .order('created_at', { ascending: false })

      if (presenceError) throw presenceError

      // Get latest presence event per user
      const latestByUser = new Map<string, PresenceEvent>()
      presenceData?.forEach((event) => {
        if (!latestByUser.has(event.user_id)) {
          latestByUser.set(event.user_id, event)
        }
      })

      // Build user presence map
      const presences: UserPresence[] = members.map((member) => {
        const user = member.users
        const lastEvent = latestByUser.get(member.user_id)

        return {
          userId: member.user_id,
          userName: user?.name || user?.email?.split('@')[0] || 'Unknown',
          avatarUrl: user?.avatar_url,
          isAtHome: lastEvent?.is_at_home ?? false,
          isNearby: false,
          distance: lastEvent?.distance_m ?? -1,
          lastSeenAt: user?.last_seen_at,
          lastCheckIn: lastEvent || null,
        }
      })

      setUserPresences(presences)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching presence:', err)
    }
  }, [house?.id, members])

  // Check my location and update presence
  const checkMyLocation = useCallback(async () => {
    if (!house?.lat || !house?.lng) return

    try {
      setError(null)
      const result = await checkGeofence(
        house.lat,
        house.lng,
        house.geofence_radius_m
      )
      setMyPresence(result)
      return result
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError(getGeolocationErrorMessage(err))
        setPermissionState('denied')
      } else {
        setError('Unable to get your location')
      }
      return null
    }
  }, [house?.lat, house?.lng, house?.geofence_radius_m])

  // Handle check-in
  const handleCheckIn = async () => {
    if (!house?.id || checkingIn) return

    setCheckingIn(true)
    setError(null)

    try {
      // Get fresh location
      const result = await checkGeofence(
        house.lat,
        house.lng,
        house.geofence_radius_m
      )

      setMyPresence(result)

      // Record check-in
      const { error: insertError } = await supabase.from('presence_events').insert({
        user_id: currentUserId,
        house_id: house.id,
        lat: result.position.lat,
        lng: result.position.lng,
        distance_m: result.distance,
        is_at_home: result.isAtHome,
        accuracy: result.accuracy,
      })

      if (insertError) throw insertError

      // Refresh presence data
      await fetchPresenceData()
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError(getGeolocationErrorMessage(err))
      } else {
        setError('Failed to check in. Please try again.')
      }
    } finally {
      setCheckingIn(false)
    }
  }

  // Request permission and initial check
  const initializeLocation = async () => {
    const state = await getGeolocationPermissionState()
    setPermissionState(state)

    if (state === 'granted') {
      await checkMyLocation()
    } else if (state === 'prompt') {
      setShowPermissionModal(true)
    }

    setLoading(false)
  }

  // Handle permission grant
  const handleGrantPermission = async () => {
    setShowPermissionModal(false)
    const granted = await requestGeolocationPermission()
    setPermissionState(granted ? 'granted' : 'denied')
    if (granted) {
      await checkMyLocation()
    }
  }

  // Initial load
  useEffect(() => {
    fetchPresenceData()
    initializeLocation()
  }, [fetchPresenceData])

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPresenceData()
      if (permissionState === 'granted') {
        checkMyLocation()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchPresenceData, checkMyLocation, permissionState])

  // Subscribe to realtime presence updates
  useEffect(() => {
    const subscription = supabase
      .channel('presence_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'presence_events',
          filter: `house_id=eq.${house.id}`,
        },
        () => {
          fetchPresenceData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [house.id, fetchPresenceData])

  // Categorize members
  const atHome = userPresences.filter((p) => p.isAtHome)
  const nearby = userPresences.filter((p) => p.isNearby)
  const away = userPresences.filter((p) => !p.isAtHome && !p.isNearby)

  // Get my presence status
  const myStatus = myPresence
    ? myPresence.isAtHome
      ? 'home'
      : myPresence.isNearby
        ? 'nearby'
        : 'away'
    : null

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Home size={20} />
          <h3 className="font-bold">Who's Home</h3>
        </div>
        <button
          onClick={() => {
            fetchPresenceData()
            checkMyLocation()
          }}
          className="p-2 hover:bg-white/20 rounded-full transition"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/80 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Check In Button */}
      <div className="mb-6">
        {permissionState === 'denied' ? (
          <button
            onClick={() => setShowPermissionModal(true)}
            className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <AlertCircle size={18} />
            Enable Location Access
          </button>
        ) : myStatus === 'home' ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/80 rounded-xl font-semibold">
            <AtHomeBadge size="lg" />
            <span>You're Home</span>
          </div>
        ) : myStatus === 'nearby' ? (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checkingIn ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Navigation size={18} />
                <span>Check In (Nearby)</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="w-full py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checkingIn ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <MapPin size={18} />
                <span>I'm Home</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Members Grid */}
      <div className="space-y-4">
        {/* At Home */}
        {atHome.length > 0 && (
          <div>
            <p className="text-sm opacity-80 mb-2 flex items-center gap-1">
              <AtHomeBadge size="sm" />
              Currently Home
            </p>
            <div className="flex flex-wrap gap-2">
              {atHome.map((presence) => (
                <MemberAvatar
                  key={presence.userId}
                  presence={presence}
                  status="home"
                />
              ))}
            </div>
          </div>
        )}

        {/* Nearby */}
        {nearby.length > 0 && (
          <div>
            <p className="text-sm opacity-80 mb-2">Nearby</p>
            <div className="flex flex-wrap gap-2">
              {nearby.map((presence) => (
                <MemberAvatar
                  key={presence.userId}
                  presence={presence}
                  status="nearby"
                />
              ))}
            </div>
          </div>
        )}

        {/* Away */}
        {away.length > 0 && (
          <div>
            <p className="text-sm opacity-80 mb-2">Away</p>
            <div className="flex flex-wrap gap-2">
              {away.map((presence) => (
                <MemberAvatar
                  key={presence.userId}
                  presence={presence}
                  status="away"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs opacity-70">
        <span>Geofence: {house.geofence_radius_m}m radius</span>
        <span>Updated {getTimeSince(lastUpdated)}</span>
      </div>

      {/* Permission Modal */}
      {showPermissionModal && (
        <LocationPermissionModal
          onAccept={handleGrantPermission}
          onDismiss={() => setShowPermissionModal(false)}
        />
      )}
    </div>
  )
}

// Sub-components

function AtHomeBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }

  return (
    <span
      className={`${sizeClasses[size]} bg-green-400 rounded-full inline-block animate-pulse`}
    />
  )
}

function MemberAvatar({
  presence,
  status,
}: {
  presence: UserPresence
  status: 'home' | 'nearby' | 'away'
}) {
  const statusColors = {
    home: 'bg-green-400',
    nearby: 'bg-yellow-400',
    away: 'bg-gray-400',
  }

  const initials = presence.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-2"
      title={
        status === 'away' && presence.lastSeenAt
          ? `Last seen ${getTimeSince(presence.lastSeenAt)}`
          : undefined
      }
    >
      {presence.avatarUrl ? (
        <img
          src={presence.avatarUrl}
          alt={presence.userName}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center text-sm font-bold">
          {initials || '?'}
        </div>
      )}
      <span className="text-sm font-medium">{presence.userName.split(' ')[0]}</span>
      <span className={`w-2 h-2 ${statusColors[status]} rounded-full`} />
    </div>
  )
}

function LocationPermissionModal({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-gray-900">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <MapPin className="text-blue-600" size={20} />
          </div>
          <h3 className="text-lg font-bold">Enable Location</h3>
        </div>

        <p className="text-gray-600 mb-4">
          PadPal uses your location to automatically detect when you're home and
          show your roommates who's around. Your location data is only shared
          with your house members.
        </p>

        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <div className="flex items-start gap-2">
            <Home size={16} className="mt-0.5 text-blue-500" />
            <span>See who's currently home</span>
          </div>
          <div className="flex items-start gap-2">
            <Navigation size={16} className="mt-0.5 text-blue-500" />
            <span>Automatic check-ins when you arrive</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-blue-500" />
            <span>Only shared with your housemates</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            Allow Location
          </button>
        </div>
      </div>
    </div>
  )
}
