'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Home, Users, Receipt, Trophy, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [hasHouse, setHasHouse] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Check if user has a house
        const { data } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', user.id)
          .single()
        setHasHouse(!!data)
      }
    })
  }, [])

  const signInWithGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center text-white max-w-md px-4">
          <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
          <p className="mb-6 opacity-90">Ready to manage your house?</p>
          
          {hasHouse ? (
            <a href="/dashboard" className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg">
              Go to Dashboard <ArrowRight size={20} />
            </a>
          ) : (
            <div className="space-y-3">
              <a href="/house/create" className="block w-full bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg">
                Create a House
              </a>
              <a href="/house/join" className="block w-full bg-white/20 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/30 transition">
                Join with Code
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-6xl font-bold mb-6">PadPal</h1>
          <p className="text-2xl mb-4 opacity-90">The House OS for Roommates</p>
          <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto">
            Track who's home, split bills automatically, complete chores with proof, 
            and compete for MVP of the House.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <FeatureCard 
              icon={<Home size={32} />}
              title="Who's Home"
              description="See who's at the house with geofence check-ins"
            />
            <FeatureCard 
              icon={<Receipt size={32} />}
              title="Auto Bills"
              description="Forward utility emails → Auto-split Venmo requests"
            />
            <FeatureCard 
              icon={<Users size={32} />}
              title="Chore Proof"
              description="Photo verification with AI. No more 'did you clean?'"
            />
            <FeatureCard 
              icon={<Trophy size={32} />}
              title="MVP Leaderboard"
              description="Compete for house glory. Share your wins."
            />
          </div>

          <button 
            onClick={signInWithGoogle}
            disabled={loading}
            className="inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            {loading ? 'Connecting...' : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left hover:bg-white/20 transition">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-xl mb-2">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  )
}
