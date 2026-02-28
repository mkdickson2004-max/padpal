// Geolocation service for PadPal
// Uses browser Geolocation API and Haversine formula for distance calculation

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

export interface GeofenceResult {
  isAtHome: boolean
  isNearby: boolean
  distance: number // in meters
  accuracy: number
  position: GeoPosition
}

// Earth's radius in meters
const EARTH_RADIUS_M = 6371000

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(EARTH_RADIUS_M * c)
}

/**
 * Get current position from browser Geolocation API
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    })
  })
}

/**
 * Watch position changes
 * @returns Function to stop watching
 */
export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): () => void {
  if (!navigator.geolocation) {
    errorCallback?.({
      code: 0,
      message: 'Geolocation is not supported by this browser',
    } as GeolocationPositionError)
    return () => {}
  }

  const watchId = navigator.geolocation.watchPosition(
    callback,
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    }
  )

  return () => navigator.geolocation.clearWatch(watchId)
}

/**
 * Check if user is within geofence
 */
export async function checkGeofence(
  houseLat: number,
  houseLng: number,
  geofenceRadiusM: number
): Promise<GeofenceResult> {
  const position = await getCurrentPosition()
  const { latitude: lat, longitude: lng, accuracy } = position.coords

  const distance = calculateDistance(houseLat, houseLng, lat, lng)

  return {
    isAtHome: distance <= geofenceRadiusM,
    isNearby: distance <= geofenceRadiusM * 2 && distance > geofenceRadiusM,
    distance,
    accuracy: Math.round(accuracy),
    position: {
      lat,
      lng,
      accuracy: Math.round(accuracy),
      timestamp: position.timestamp,
    },
  }
}

/**
 * Check geofence status without requesting new position
 * (useful for polling with cached position)
 */
export function checkGeofenceWithPosition(
  position: GeoPosition,
  houseLat: number,
  houseLng: number,
  geofenceRadiusM: number
): GeofenceResult {
  const distance = calculateDistance(houseLat, houseLng, position.lat, position.lng)

  return {
    isAtHome: distance <= geofenceRadiusM,
    isNearby: distance <= geofenceRadiusM * 2 && distance > geofenceRadiusM,
    distance,
    accuracy: position.accuracy,
    position,
  }
}

/**
 * Get human-readable time since timestamp
 */
export function getTimeSince(timestamp: string | number | Date): string {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}

/**
 * Get permission state for geolocation
 */
export async function getGeolocationPermissionState(): Promise<PermissionState> {
  if (!navigator.permissions) {
    return 'prompt'
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return result.state
  } catch {
    return 'prompt'
  }
}

/**
 * Request geolocation permission explicitly
 * Returns true if permission granted, false otherwise
 */
export async function requestGeolocationPermission(): Promise<boolean> {
  try {
    await getCurrentPosition()
    return true
  } catch (error) {
    if (error instanceof GeolocationPositionError) {
      return error.code !== error.PERMISSION_DENIED
    }
    return false
  }
}

// Error code mappings for user-friendly messages
export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location access in your browser settings to use this feature.'
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable. Please check your GPS or network connection.'
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.'
    default:
      return 'An unknown error occurred while getting your location.'
  }
}

// Types for presence events
export interface PresenceEvent {
  id: string
  user_id: string
  house_id: string
  lat: number
  lng: number
  distance_m: number
  is_at_home: boolean
  accuracy: number
  created_at: string
}

export interface UserPresence {
  userId: string
  userName: string
  avatarUrl: string | null
  isAtHome: boolean
  isNearby: boolean
  distance: number
  lastSeenAt: string | null
  lastCheckIn: PresenceEvent | null
}
