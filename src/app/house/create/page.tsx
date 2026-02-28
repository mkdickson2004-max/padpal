'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Home, MapPin, ArrowRight, Loader2 } from 'lucide-react'

export default function CreateHouse() {
  const [step, setStep] = useState(1)
  const [houseName, setHouseName] = useState('')
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(150)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const router = useRouter()

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Get lat/lng from address (simplified - in production use geocoding API)
      const code = generateInviteCode()

      const { data: house, error: houseError } = await supabase
        .from('houses')
        .insert({
          name: houseName,
          address,
          geofence_radius_m: radius,
          invite_code: code,
          created_by: user.id,
          lat: 40.7128, // Default to NYC - would geocode in production
          lng: -74.0060
        })
        .select()
        .single()

      if (houseError) throw houseError

      // Create membership
      await supabase.from('memberships').insert({
        house_id: house.id,
        user_id: user.id,
        role: 'admin'
      })

      setInviteCode(code)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home size={32} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold">Create Your House</h1>
              <p className="text-gray-500 mt-2">Set up PadPal for your home</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Name</label>
                <input
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g., The Castle, 420 College Ave"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="relative">
                  <MapPin size={20} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full address"
                    className="w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geofence Radius: {radius}m
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Roommates must be within this distance to count as "home"
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!houseName || !address}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Confirm Details</h2>
              <p className="text-gray-500 mt-2">Review before creating</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div>
                <span className="text-sm text-gray-500">House Name</span>
                <p className="font-medium">{houseName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Address</span>
                <p className="font-medium">{address}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Geofence</span>
                <p className="font-medium">{radius}m radius</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={20} className="animate-spin" /> Creating...</>
                ) : (
                  'Create House'
                )}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">House Created!</h2>
              <p className="text-gray-500 mt-2">Share this code with your roommates</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6 text-center">
              <span className="text-sm text-blue-600 font-medium uppercase tracking-wide">Invite Code</span>
              <p className="text-4xl font-bold text-blue-700 tracking-wider mt-2">{inviteCode}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode)
                  alert('Copied!')
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Copy Code
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
