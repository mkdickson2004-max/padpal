'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Home, Users, Receipt, Trophy, Plus, CheckCircle, Loader2 } from 'lucide-react'
import WhoIsHome from '@/components/WhoIsHome'
import PhotoUpload from '@/components/PhotoUpload'
import BillsManager from '@/components/BillsManager'
import { verifyChorePhoto, type ChoreType } from '@/lib/ai'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [house, setHouse] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [showChoreModal, setShowChoreModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)
    await loadHouseData(user.id)
  }

  const loadHouseData = async (userId: string) => {
    const { data: membership } = await supabase
      .from('memberships')
      .select('house_id')
      .eq('user_id', userId)
      .single()

    if (membership) {
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('id', membership.house_id)
        .single()
      setHouse(houseData)

      const { data: membersData } = await supabase
        .from('memberships')
        .select('*, users(*)')
        .eq('house_id', membership.house_id)
      setMembers(membersData || [])

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('house_id', membership.house_id)
        .order('created_at', { ascending: false })
        .limit(10)
      setTasks(tasksData || [])

      const { data: lbData } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .eq('house_id', membership.house_id)
        .eq('period', 'weekly')
        .order('points', { ascending: false })
      setLeaderboard(lbData || [])
    }
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!house) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <Home size={48} className="mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold mb-2">No House Yet</h2>
          <p className="text-gray-600 mb-6">Create or join a house to get started</p>
          <div className="space-y-3">
            <a href="/house/create" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-center">
              Create House
            </a>
            <a href="/house/join" className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition text-center">
              Join with Code
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{house.name}</h1>
            <p className="text-sm text-gray-500">{house.address}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Who's Home */}
            <WhoIsHome members={members} house={house} currentUserId={user.id} />
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowChoreModal(true)}
                className="bg-green-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition"
              >
                <Plus size={24} />
                <span className="font-semibold">Log Chore</span>
              </button>
              <button 
                onClick={() => setActiveTab('bills')}
                className="bg-orange-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition"
              >
                <Receipt size={24} />
                <span className="font-semibold">Add Bill</span>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activity yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <ActivityItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} members={members} />
        )}

        {activeTab === 'chores' && (
          <ChoresView 
            houseId={house.id} 
            userId={user.id} 
            members={members}
            onComplete={() => loadHouseData(user.id)} 
          />
        )}

        {activeTab === 'bills' && (
          <BillsManager 
            houseId={house.id} 
            members={members} 
            currentUserId={user.id}
          />
        )}
      </main>

      {/* Chore Modal */}
      {showChoreModal && (
        <ChoreModal 
          houseId={house.id}
          userId={user.id}
          onClose={() => setShowChoreModal(false)}
          onComplete={() => {
            setShowChoreModal(false)
            loadHouseData(user.id)
          }}
        />
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-pb">
        <div className="max-w-4xl mx-auto flex justify-around py-3">
          <NavButton 
            icon={<Home size={24} />} 
            label="Home" 
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <NavButton 
            icon={<Trophy size={24} />} 
            label="MVP" 
            active={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
          />
          <NavButton 
            icon={<CheckCircle size={24} />} 
            label="Chores" 
            active={activeTab === 'chores'}
            onClick={() => setActiveTab('chores')}
          />
          <NavButton 
            icon={<Receipt size={24} />} 
            label="Bills" 
            active={activeTab === 'bills'}
            onClick={() => setActiveTab('bills')}
          />
        </div>
      </nav>
    </div>
  )
}

function ActivityItem({ task }: { task: any }) {
  const icons: Record<string, React.ReactNode> = {
    chore: <CheckCircle size={16} className="text-green-500" />,
    supply: <Home size={16} className="text-blue-500" />,
    party: <Users size={16} className="text-purple-500" />,
    bill: <Receipt size={16} className="text-orange-500" />
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
        {icons[task.type] || <CheckCircle size={16} />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{task.description}</p>
        <p className="text-xs text-gray-500">{new Date(task.created_at).toLocaleDateString()}</p>
      </div>
      <span className="text-sm font-bold text-green-600">+{task.points}</span>
    </div>
  )
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  )
}

function LeaderboardView({ leaderboard, members }: { leaderboard: any[], members: any[] }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={24} />
          <h2 className="text-2xl font-bold">MVP of the House</h2>
        </div>
        <p className="opacity-90">This week's rankings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p>No points yet. Start completing tasks!</p>
          </div>
        ) : (
          <div className="divide-y">
            {leaderboard.map((entry, i) => {
              const member = members.find(m => m.user_id === entry.user_id)
              return (
                <div key={entry.id} className="flex items-center gap-4 p-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    i === 0 ? 'bg-yellow-400 text-white' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-orange-300 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {member?.users?.name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{member?.users?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 capitalize">{entry.category.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{entry.points}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ChoresView({ houseId, userId, members, onComplete }: { houseId: string, userId: string, members: any[], onComplete: () => void }) {
  const [loading, setLoading] = useState(false)

  const logChore = async (type: string, description: string, points: number) => {
    setLoading(true)
    await supabase.from('tasks').insert({
      house_id: houseId,
      user_id: userId,
      type: 'chore',
      subtype: type,
      description,
      points,
      status: 'verified'
    })
    setLoading(false)
    onComplete()
  }

  const chores = [
    { type: 'trash', desc: 'Took out trash', points: 5 },
    { type: 'dishes', desc: 'Did the dishes', points: 8 },
    { type: 'bathroom', desc: 'Cleaned bathroom', points: 10 },
    { type: 'vacuum', desc: 'Vacuumed common areas', points: 7 },
    { type: 'groceries', desc: 'Grocery run', points: 8 },
    { type: 'beer', desc: 'Beer run', points: 6 },
  ]

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold">Log Chore</h2>
      <p className="text-gray-600">Complete a chore and earn points. Photo proof coming soon!</p>
      
      <div className="grid grid-cols-1 gap-3">
        {chores.map((chore) => (
          <button
            key={chore.type}
            onClick={() => logChore(chore.type, chore.desc, chore.points)}
            disabled={loading}
            className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <span className="font-medium">{chore.desc}</span>
            </div>
            <span className="text-green-600 font-bold">+{chore.points}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChoreModal({ houseId, userId, onClose, onComplete }: { houseId: string, userId: string, onClose: () => void, onComplete: () => void }) {
  const [step, setStep] = useState<'select' | 'photo' | 'verify'>('select')
  const [selectedChore, setSelectedChore] = useState<{type: ChoreType, desc: string, points: number} | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const chores = [
    { type: 'trash' as ChoreType, desc: 'Took out trash', points: 5 },
    { type: 'dishes' as ChoreType, desc: 'Did the dishes', points: 8 },
    { type: 'bathroom' as ChoreType, desc: 'Cleaned bathroom', points: 10 },
    { type: 'vacuum' as ChoreType, desc: 'Vacuumed', points: 7 },
    { type: 'groceries' as ChoreType, desc: 'Grocery run', points: 8 },
    { type: 'beer' as ChoreType, desc: 'Beer run', points: 6 },
  ]

  const handlePhotoUpload = async (url: string) => {
    setPhotoUrl(url)
    setStep('verify')
    setVerifying(true)

    // AI Verification
    const result = await verifyChorePhoto(url, selectedChore!.type)
    setVerificationResult(result)
    setVerifying(false)

    // Save task
    await supabase.from('tasks').insert({
      house_id: houseId,
      user_id: userId,
      type: 'chore',
      subtype: selectedChore!.type,
      description: selectedChore!.desc,
      photo_url: url,
      points: selectedChore!.points,
      status: result.status,
      ai_confidence: result.confidence
    })

    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Log Chore</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-gray-600 mb-4">Select a chore to log:</p>
              {chores.map((chore) => (
                <button
                  key={chore.type}
                  onClick={() => {
                    setSelectedChore(chore)
                    setStep('photo')
                  }}
                  className="w-full bg-gray-50 p-4 rounded-xl flex items-center justify-between hover:bg-gray-100 transition"
                >
                  <span className="font-medium">{chore.desc}</span>
                  <span className="text-green-600 font-bold">+{chore.points}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'photo' && selectedChore && (
            <div>
              <p className="text-gray-600 mb-4">Take a photo of the completed {selectedChore.desc.toLowerCase()}:</p>
              <PhotoUpload
                houseId={houseId}
                userId={userId}
                onUploadComplete={handlePhotoUpload}
                onError={(err) => alert(err)}
              />
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center py-8">
              {verifying ? (
                <>
                  <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">AI is verifying your photo...</p>
                </>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    verificationResult?.status === 'verified' ? 'bg-green-100' :
                    verificationResult?.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {verificationResult?.status === 'verified' ? (
                      <CheckCircle size={32} className="text-green-600" />
                    ) : verificationResult?.status === 'rejected' ? (
                      <span className="text-red-600 text-2xl">&times;</span>
                    ) : (
                      <span className="text-yellow-600 text-2xl">!</span>
                    )}
                  </div>
                  <p className="font-bold text-lg mb-2">
                    {verificationResult?.status === 'verified' ? 'Verified!' :
                     verificationResult?.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                  </p>
                  <p className="text-gray-600 text-sm mb-4">{verificationResult?.reasoning}</p>
                  <button
                    onClick={onClose}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
