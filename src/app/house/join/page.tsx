'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { KeyRound, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

export default function JoinHouse() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [houseName, setHouseName] = useState('')
  const router = useRouter()

  const handleJoin = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // Find house by invite code
      const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('invite_code', code.toUpperCase())
        .single()

      if (houseError || !house) {
        throw new Error('Invalid invite code')
      }

      // Check if already member
      const { data: existing } = await supabase
        .from('memberships')
        .select('*')
        .eq('house_id', house.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        router.push('/dashboard')
        return
      }

      // Create membership
      const { error: joinError } = await supabase
        .from('memberships')
        .insert({
          house_id: house.id,
          user_id: user.id,
          role: 'member'
        })

      if (joinError) throw joinError

      setHouseName(house.name)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to {houseName}!</h1>
          <p className="text-gray-500 mb-6">You're now a member of the house</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">Join a House</h1>
          <p className="text-gray-500 mt-2">Enter the invite code from your roommate</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full p-4 text-2xl text-center tracking-widest border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || code.length < 6}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> Joining...</>
            ) : (
              <>
                Join House <ArrowRight size={20} />
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
