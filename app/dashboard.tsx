import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
  Image, Dimensions, Share, Platform, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/providers/AuthProvider';
import { supabase } from '../src/lib/supabase';
import { API_BASE_URL } from '../src/lib/config';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BillsExpensesScreen } from '../components/Screens';

const { width } = Dimensions.get('window');

const C = {
  bg: '#EEF1F8',
  white: '#FFFFFF',
  primary: '#4A7CF7',
  primaryDark: '#3B6BE0',
  textDark: '#1A1D2E',
  textMid: '#4B5063',
  textLight: '#9399AE',
  cardBorder: '#E8ECF5',
  green: '#4DC97A',
  greenBg: '#E6F9EE',
  orange: '#FF8C6B',
  orangeBg: '#FFF0EB',
  yellow: '#F5C842',
  yellowBg: '#FFF9E0',
  purple: '#9B7EE8',
  teal: '#5BC8D4',
  leaderGold: '#F5C842',
  navInactive: '#9399AE',
};

// ─── Types ───────────────────────────────────────────────────
interface HouseData { id: string; name: string; invite_code: string; }
interface TaskData {
  id: string; type: string; subtype?: string; description: string;
  status: string; points: number; created_at: string; user_id: string;
}
interface MemberData {
  user_id: string; role: string;
  users: { name: string; email: string; avatar_url: string | null };
}
interface BillData {
  id: string; description: string; amount: number; due_date: string;
  status: string; created_by: string; created_at: string;
}
interface BillSplitData {
  id: string; bill_id: string; user_id: string; amount: number;
  is_paid: boolean;
}
interface LeaderboardEntry {
  id: string; user_id: string; points: number; category: string;
}

type TabKey = 'home' | 'chores' | 'bills' | 'leaderboard';

// ─── Chore types ─────────────────────────────────────────────
const CHORES = [
  { type: 'trash', desc: 'Took out trash', points: 5, emoji: '🗑️' },
  { type: 'dishes', desc: 'Did the dishes', points: 8, emoji: '🍽️' },
  { type: 'bathroom', desc: 'Cleaned bathroom', points: 10, emoji: '🚿' },
  { type: 'vacuum', desc: 'Vacuumed', points: 7, emoji: '🧹' },
  { type: 'groceries', desc: 'Grocery run', points: 8, emoji: '🛒' },
  { type: 'beer', desc: 'Beer run', points: 6, emoji: '🍺' },
];

// ═════════════════════════════════════════════════════════════
// Main Dashboard
// ═════════════════════════════════════════════════════════════
export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [house, setHouse] = useState<HouseData | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bills, setBills] = useState<BillData[]>([]);
  const [billSplits, setBillSplits] = useState<BillSplitData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => { if (user) loadDashboard(); }, [user]);

  const loadDashboard = async () => {
    try {
      const { data: membership } = await supabase
        .from('memberships')
        .select('house_id, role')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!membership) { router.replace('/'); return; }

      const { data: houseData } = await supabase
        .from('houses').select('*').eq('id', membership.house_id).single();
      setHouse(houseData);

      const { data: taskData } = await supabase
        .from('tasks').select('*').eq('house_id', membership.house_id)
        .order('created_at', { ascending: false }).limit(20);
      setTasks(taskData || []);

      const { data: memberData } = await supabase
        .from('memberships')
        .select('user_id, role, users(name, email, avatar_url)')
        .eq('house_id', membership.house_id);
      setMembers((memberData as any) || []);

      const { data: lbData } = await supabase
        .from('leaderboard_entries')
        .select('*').eq('house_id', membership.house_id)
        .eq('period', 'weekly').eq('category', 'total')
        .order('points', { ascending: false });
      setLeaderboard(lbData || []);

      const { data: billData } = await supabase
        .from('bills').select('*').eq('house_id', membership.house_id)
        .order('created_at', { ascending: false });
      setBills(billData || []);

      if (billData && billData.length > 0) {
        const billIds = billData.map((b: any) => b.id);
        const { data: splitData } = await supabase
          .from('bill_splits').select('*').in('bill_id', billIds);
        setBillSplits(splitData || []);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const shareInviteCode = async () => {
    if (!house) return;
    try {
      await Share.share({
        message: `Join my house on PadPal! Use invite code: ${house.invite_code}`,
      });
    } catch { }
  };

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    return m?.users?.name || m?.users?.email?.split('@')[0] || 'Someone';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading your house...</Text>
      </View>
    );
  }

  // ─── Render current tab ────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'chores': return renderChores();
      case 'bills': return renderBills();
      case 'leaderboard': return renderLeaderboard();
    }
  };

  // ═══ HOME TAB ══════════════════════════════════════════════
  const renderHome = () => {
    // Dynamically map members to UI requirements
    const ROOMMATES = members.map((m, i) => {
      const colors = [C.primary, C.purple, C.teal, '#A78BFA'];
      const nameFallback = m.users?.name?.split(' ')[0] || m.users?.email?.split('@')[0] || 'Unknown';

      // Calculate points based on tasks (if we had them properly scored, placeholder for now)
      const userTasks = tasks.filter(t => t.user_id === m.user_id && t.status === 'completed');
      const pts = userTasks.reduce((sum, t) => sum + (t.points || 10), 0);

      return {
        name: nameFallback,
        pts: pts || (1000 - (i * 100)), // Fallback points if none
        pct: Math.max(10, 100 - (i * 15)),
        color: colors[i % colors.length],
        crown: i === 0
      };
    }).sort((a, b) => b.pts - a.pts); // Sort by highest points

    const mappedBills = bills.map(b => ({
      id: b.id,
      name: b.description,
      amount: `$${b.amount}`,
      status: b.status.charAt(0).toUpperCase() + b.status.slice(1),
      statusColor: b.status === 'paid' ? C.green : b.status === 'overdue' ? C.orange : C.yellow,
      statusBg: b.status === 'paid' ? C.greenBg : b.status === 'overdue' ? C.orangeBg : C.yellowBg
    }));

    return (
      <ScrollView style={styles.dashScroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Who's Home */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Who's Home</Text>
          <View style={styles.whosHomeRow}>
            {ROOMMATES.map((r) => (
              <View key={r.name} style={styles.avatarCol}>
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatarCircle, { backgroundColor: r.color + '33' }]}>
                    <View style={[styles.avatarFace, { backgroundColor: r.color }]} />
                  </View>
                  <View style={styles.onlineDot} />
                </View>
                <Text style={styles.avatarName}>{r.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Roommate Leaderboard</Text>
          {ROOMMATES.map((r, i) => (
            <View key={r.name} style={styles.leaderRow}>
              <Text style={styles.leaderRank}>{i + 1}</Text>
              <View style={[styles.leaderAvatarCircle, { backgroundColor: r.color + '33', borderColor: r.crown ? C.leaderGold : 'transparent', borderWidth: r.crown ? 2 : 0 }]}>
                <View style={[styles.leaderAvatarFace, { backgroundColor: r.color }]} />
              </View>
              <View style={styles.leaderInfo}>
                <View style={styles.leaderNameRow}>
                  <Text style={styles.leaderName}>{r.name}</Text>
                  {r.crown && <Text style={styles.crownEmoji}> 👑</Text>}
                  <Text style={styles.leaderPts}>{r.pts.toLocaleString()} pts</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${r.pct}%`, backgroundColor: r.color }]}>
                    {r.pct < 100 && <Text style={styles.progressLabel}>{r.pct}%</Text>}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Shared Bills */}
        <View style={styles.billsSection}>
          <View style={styles.billsHeader}>
            <Text style={styles.sectionTitle}>Shared Bills</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => setActiveTab('bills')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {mappedBills.slice(0, 3).map((b) => (
            <View key={b.name} style={styles.billRow}>
              <Text style={styles.billName}>{b.name}</Text>
              <View style={styles.billRight}>
                <Text style={styles.billAmount}>{b.amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: b.statusBg }]}>
                  <Text style={[styles.statusText, { color: b.statusColor }]}>{b.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    );
  };

  // ═══ CHORES TAB ════════════════════════════════════════════
  const renderChores = () => (
    <View>
      <Text style={styles.tabTitle}>Log a Chore</Text>
      <Text style={styles.tabSubtitle}>Upload proof to earn your points.</Text>

      <TouchableOpacity style={styles.uploadArea} onPress={() => setShowChoreModal(true)}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>☁️</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>Tap to log a chore</Text>
        <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>AI will verify your photo</Text>
      </TouchableOpacity>

      <View style={[styles.section, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>My Recent Chores</Text>
        {tasks.filter(t => t.type === 'chore' && t.user_id === user?.id).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No chores logged yet</Text>
          </View>
        ) : (
          tasks.filter(t => t.type === 'chore' && t.user_id === user?.id).slice(0, 8).map(t => (
            <View key={t.id} style={styles.taskRow}>
              <View style={[styles.taskBadge, {
                backgroundColor: t.status === 'verified' ? '#DCFCE7' : '#FEF3C7',
              }]}>
                <Text>{t.status === 'verified' ? '✅' : '⏳'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskDesc}>{t.description}</Text>
                <Text style={styles.taskMeta}>+{t.points} pts · {t.status}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  // ═══ BILLS TAB ═════════════════════════════════════════════
  const renderBills = () => (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Text style={styles.tabTitle}>Bills</Text>
          <Text style={styles.tabSubtitle}>Split expenses with housemates</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { paddingHorizontal: 20, paddingVertical: 12 }]}
          onPress={() => setShowBillModal(true)}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>+ Add Bill</Text>
        </TouchableOpacity>
      </View>

      {bills.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💸</Text>
          <Text style={styles.emptyText}>No bills yet. Add any shared expense!</Text>
        </View>
      ) : (
        bills.map(bill => {
          const splits = billSplits.filter(s => s.bill_id === bill.id);
          const paidCount = splits.filter(s => s.is_paid).length;
          return (
            <View key={bill.id} style={styles.billCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 }}>
                  {bill.description}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#2563EB' }}>
                  ${(bill.amount / 100).toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                  {paidCount}/{splits.length} paid · Due {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'TBD'}
                </Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: bill.status === 'paid' ? '#DCFCE7' : '#FEF3C7',
                }]}>
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: bill.status === 'paid' ? '#16A34A' : '#D97706',
                  }}>
                    {bill.status === 'paid' ? 'Paid' : 'Open'}
                  </Text>
                </View>
              </View>
              {/* My split */}
              {splits.filter(s => s.user_id === user?.id).map(split => (
                <View key={split.id} style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#475569' }}>
                    Your share: <Text style={{ fontWeight: '700' }}>${(split.amount / 100).toFixed(2)}</Text>
                  </Text>
                  {!split.is_paid ? (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8,
                        borderRadius: 8,
                      }}
                      onPress={async () => {
                        await supabase.from('bill_splits').update({ is_paid: true }).eq('id', split.id);
                        loadDashboard();
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Mark Paid</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>✓ Paid</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );

  // ═══ LEADERBOARD TAB ═══════════════════════════════════════
  const renderLeaderboard = () => (
    <View>
      <Text style={styles.tabTitle}>🏆 Leaderboard</Text>
      <Text style={styles.tabSubtitle}>Weekly chore points ranking</Text>

      {leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.emptyText}>No points yet. Start logging chores!</Text>
        </View>
      ) : (
        leaderboard.map((entry, i) => {
          const isWinner = i === 0;
          return (
            <View key={entry.id} style={[styles.leaderRow, isWinner && styles.leaderRowWinner]}>
              <View style={[styles.rankCircle, isWinner && styles.rankCircleWinner]}>
                <Text style={[styles.rankText, isWinner && { color: '#B45309' }]}>{i + 1}</Text>
              </View>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {getMemberName(entry.user_id)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{getMemberName(entry.user_id)}</Text>
                <Text style={styles.memberRole}>{entry.category} points</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {isWinner && <Text>🏆</Text>}
                <Text style={[styles.pointsText, isWinner && { color: '#B45309' }]}>
                  {entry.points} pts
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ═══ Return ═════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      {/* Top bar */}
      <View style={styles.dashHeader}>
        <View style={styles.padpalLogoRow}>
          <Text style={styles.padpalLogoBlack}>Pad</Text>
          <Text style={styles.padpalLogoBlue}>Pal</Text>
          <View style={styles.padpalMascot}>
            <View style={styles.mascotHead} />
            <View style={styles.mascotRoof} />
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'bills' ? (
        <BillsExpensesScreen />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >
          {activeTab === 'home' && renderHome()}
          {activeTab === 'chores' && renderChores()}
          {activeTab === 'leaderboard' && renderLeaderboard()}
        </ScrollView>
      )}

      {/* ─── Bottom Tab Bar ──── */}
      <View style={styles.tabBar}>
        <TabButton icon="🏠" label="Home" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <TabButton icon="🧹" label="Chores" active={activeTab === 'chores'} onPress={() => setActiveTab('chores')} />
        <TabButton icon="🧾" label="Bills" active={activeTab === 'bills'} onPress={() => setActiveTab('bills')} />
        <TabButton icon="🏆" label="MVP" active={activeTab === 'leaderboard'} onPress={() => setActiveTab('leaderboard')} />
      </View>

      {/* ─── Chore Modal ──── */}
      <ChoreModal
        visible={showChoreModal}
        houseId={house?.id || ''}
        userId={user?.id || ''}
        onClose={() => setShowChoreModal(false)}
        onComplete={() => { setShowChoreModal(false); loadDashboard(); }}
      />

      {/* ─── Bill Modal ──── */}
      <BillModal
        visible={showBillModal}
        houseId={house?.id || ''}
        userId={user?.id || ''}
        members={members}
        onClose={() => setShowBillModal(false)}
        onComplete={() => { setShowBillModal(false); loadDashboard(); }}
      />
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
// Tab Button
// ═════════════════════════════════════════════════════════════
function TabButton({ icon, label, active, onPress }: {
  icon: string; label: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════════════
// Chore Modal
// ═════════════════════════════════════════════════════════════
function ChoreModal({ visible, houseId, userId, onClose, onComplete }: {
  visible: boolean; houseId: string; userId: string;
  onClose: () => void; onComplete: () => void;
}) {
  const [step, setStep] = useState<'select' | 'photo' | 'verify'>('select');
  const [selectedChore, setSelectedChore] = useState<typeof CHORES[0] | null>(null);
  const [photoUri, setPhotoUri] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const reset = () => { setStep('select'); setSelectedChore(null); setPhotoUri(''); setResult(null); };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      handleVerify(res.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library permission is required');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      handleVerify(res.assets[0].uri);
    }
  };

  const handleVerify = async (uri: string) => {
    setStep('verify');
    setVerifying(true);
    try {
      // Upload to Supabase Storage
      const ext = uri.split('.').pop() || 'jpg';
      const path = `${houseId}/${userId}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('chore-photos')
        .upload(path, blob, { contentType: `image/${ext}` });

      const { data: urlData } = supabase.storage.from('chore-photos').getPublicUrl(path);
      const photoUrl = urlData.publicUrl;

      // Try AI verification via API
      let verificationResult = { status: 'pending_review', reasoning: 'Submitted for review', confidence: 0 };
      try {
        const verifyRes = await fetch(`${API_BASE_URL}/api/verify-chore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl, choreType: selectedChore!.type }),
        });
        if (verifyRes.ok) {
          verificationResult = await verifyRes.json();
        }
      } catch { }

      // Save task
      await supabase.from('tasks').insert({
        house_id: houseId,
        user_id: userId,
        type: 'chore',
        subtype: selectedChore!.type,
        description: selectedChore!.desc,
        photo_url: photoUrl,
        points: selectedChore!.points,
        status: verificationResult.status,
        ai_confidence: verificationResult.confidence || 0,
      });

      setResult(verificationResult);
    } catch (e: any) {
      setResult({ status: 'error', reasoning: e.message || 'Something went wrong' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <SafeAreaView style={styles.v2Root}>
        <StatusBar barStyle="dark-content" backgroundColor="#E8EBF0" />

        {/* Top bar */}
        <View style={styles.v2TopBar}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.v2Cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: C.textDark }}>
            {step === 'select' ? 'Select Chore' : step === 'photo' ? 'Add Photo' : 'Verifying'}
          </Text>
          <View style={{ width: 50 }} /> {/* Spacer */}
        </View>

        <ScrollView style={styles.v2Scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.v2Title}>Log Chore</Text>

          {step === 'select' && (
            <>
              {/* Quick Log */}
              <View style={styles.v2QuickCard}>
                <Text style={styles.v2QuickTitle}>Quick Log</Text>
                <View style={styles.v2QuickRow}>
                  {CHORES.slice(0, 3).map((q) => (
                    <TouchableOpacity
                      key={q.type}
                      style={styles.v2QuickBtn}
                      onPress={() => { setSelectedChore(q); setStep('photo'); }}
                    >
                      <Text style={styles.v2QuickEmoji}>{q.emoji}</Text>
                      <Text style={styles.v2QuickLabel}>{q.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={{ fontSize: 15, color: '#64748B', marginBottom: 12, marginTop: 10 }}>Or choose from the list:</Text>
              {CHORES.map(chore => (
                <TouchableOpacity
                  key={chore.type}
                  style={styles.choreOption}
                  onPress={() => { setSelectedChore(chore); setStep('photo'); }}
                >
                  <Text style={{ fontSize: 24 }}>{chore.emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{chore.desc}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#16A34A' }}>+{chore.points}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {step === 'photo' && selectedChore && (
            <>
              <View style={styles.v2Row}>
                <View style={styles.v2SelectCard}>
                  <View style={styles.v2SelectIcon}>
                    <Text style={{ fontSize: 18 }}>{selectedChore.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.v2SelectLabel}>Chore Type</Text>
                    <Text style={styles.v2SelectValue}>{selectedChore.desc}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep('select')} style={{ marginLeft: 'auto' }}>
                    <Text style={{ color: C.textLight, fontSize: 13 }}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.v2PhotoCard} onPress={pickPhoto}>
                <View style={styles.v2PhotoIcon}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </View>
                <View>
                  <Text style={styles.v2SelectLabel}>Action</Text>
                  <Text style={styles.v2SelectValue}>Take Photo</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.v2PhotoCard, { marginTop: 12 }]} onPress={pickFromLibrary}>
                <View style={styles.v2PhotoIcon}>
                  <Text style={{ fontSize: 20 }}>🖼️</Text>
                </View>
                <View>
                  <Text style={styles.v2SelectLabel}>Action</Text>
                  <Text style={styles.v2SelectValue}>Choose from Library</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {step === 'verify' && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              {verifying ? (
                <>
                  <ActivityIndicator size="large" color={C.primary} style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A' }}>Analyzing with AI...</Text>
                  <Text style={{ fontSize: 15, color: '#64748B', marginTop: 8 }}>Looking for proof.</Text>
                </>
              ) : (
                <>
                  <View style={[styles.resultCircle, {
                    backgroundColor: result?.status === 'verified' ? '#DCFCE7' :
                      result?.status === 'error' ? '#FEE2E2' : '#FEF3C7',
                  }]}>
                    <Text style={{ fontSize: 36 }}>
                      {result?.status === 'verified' ? '✅' :
                        result?.status === 'error' ? '❌' : '⏳'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 16 }}>
                    {result?.status === 'verified' ? 'Verified!' :
                      result?.status === 'error' ? 'Error' : 'Submitted!'}
                  </Text>
                  <Text style={{
                    fontSize: 14, color: '#475569', marginTop: 12, textAlign: 'center',
                    backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder
                  }}>
                    "{result?.reasoning || 'Submitted for review'}"
                  </Text>
                  <TouchableOpacity
                    style={[styles.v2SubmitBtn, { marginTop: 24, width: '100%', paddingVertical: 14 }]}
                    onPress={() => { reset(); onComplete(); }}
                  >
                    <Text style={[styles.v2SubmitText, { textAlign: 'center', fontSize: 17 }]}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <Text style={[styles.v2AiNote, { marginTop: 40 }]}>AI verifies chore completion & effort.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════
// Bill Modal
// ═════════════════════════════════════════════════════════════
function BillModal({ visible, houseId, userId, members, onClose, onComplete }: {
  visible: boolean; houseId: string; userId: string;
  members: MemberData[]; onClose: () => void; onComplete: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!description || !amount) return;
    setLoading(true);
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          house_id: houseId,
          description,
          amount: amountCents,
          created_by: userId,
          status: 'open',
          split_type: 'equal',
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create equal splits for all members
      const splitAmount = Math.round(amountCents / members.length);
      const splits = members.map(m => ({
        bill_id: bill.id,
        user_id: m.user_id,
        amount: splitAmount,
        is_paid: m.user_id === userId, // creator auto-paid
      }));

      await supabase.from('bill_splits').insert(splits);

      setDescription('');
      setAmount('');
      onComplete();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Bill</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 18, color: '#94A3B8' }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Electric bill, Groceries"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>Total Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
              Split equally among {members.length} housemates
            </Text>
            {amount ? (
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                ${(parseFloat(amount) / members.length).toFixed(2)} per person
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!description || !amount || loading) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={!description || !amount || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Bill</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 16, color: '#64748B', marginTop: 12 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  houseName: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  inviteCode: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  /* duplicate avatarCircle removed */
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Welcome
  welcomeSection: { marginBottom: 20 },
  /* duplicate welcomeTitle removed */
  welcomeSubtitle: { fontSize: 15, color: '#64748B', marginTop: 6 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '800', color: '#0F172A' },

  // Sections
  section: { marginBottom: 24 },
  /* duplicate sectionTitle removed */

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12,
    marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  memberInitial: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  memberRole: { fontSize: 13, color: '#94A3B8', textTransform: 'capitalize' },

  // Tasks
  taskRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12,
    marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  taskBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  taskDesc: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  taskMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },

  // Tab titles
  tabTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  tabSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 20 },

  // Upload area
  uploadArea: {
    backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0',
    borderRadius: 16, paddingVertical: 40, alignItems: 'center',
  },

  // Bills
  billCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  /* duplicate statusBadge removed */

  // Leaderboard
  /* duplicate leaderRow removed */
  leaderRowWinner: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  rankCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  rankCircleWinner: { backgroundColor: '#FEF3C7' },
  rankText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  pointsText: { fontSize: 15, fontWeight: '800', color: '#475569' },

  // Tab bar
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  tabButton: { alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabLabelActive: { color: '#2563EB' },

  // Buttons
  primaryButton: {
    backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Modal
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  choreOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC',
    padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9',
  },
  selectedChoreCard: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cameraButton: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8FAFC',
    padding: 20, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0',
  },
  resultCircle: {
    width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center',
  },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A',
  },



  /* ─── WELCOME ─── */
  welcomeRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  welcomeScroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  houseCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DDE4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  housePlaceholder: {
    alignItems: 'center',
  },
  houseRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 52,
    borderRightWidth: 52,
    borderBottomWidth: 38,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#A8B4D8',
  },
  houseBody: {
    width: 90,
    height: 65,
    backgroundColor: '#BEC9E8',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  houseWindow: {
    width: 20,
    height: 20,
    backgroundColor: '#F5E97A',
    borderRadius: 3,
    opacity: 0.9,
  },
  houseDoor: {
    width: 18,
    height: 28,
    backgroundColor: '#8894BE',
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  leaf: {
    position: 'absolute',
    width: 14,
    height: 22,
    backgroundColor: '#6DB878',
    borderRadius: 50,
    borderTopLeftRadius: 0,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSub: {
    fontSize: 16,
    color: C.textMid,
    textAlign: 'center',
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  featureCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  iconBroom: {
    width: 6,
    height: 28,
    backgroundColor: '#9399AE',
    borderRadius: 3,
    transform: [{ rotate: '-20deg' }],
    position: 'absolute',
    left: 10,
    top: 6,
  },
  iconList: {
    position: 'absolute',
    right: 4,
    top: 10,
    gap: 4,
  },
  iconListLine: {
    width: 22,
    height: 3,
    backgroundColor: '#9399AE',
    borderRadius: 2,
    marginBottom: 4,
  },
  iconCalendar: {
    width: 32,
    height: 28,
    borderWidth: 2,
    borderColor: '#9399AE',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'absolute',
    right: 4,
    top: 4,
  },
  iconCalendarTop: {
    height: 8,
    backgroundColor: '#9399AE',
    opacity: 0.3,
  },
  iconCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
    gap: 2,
  },
  iconCalendarCell: {
    width: 6,
    height: 4,
    backgroundColor: '#9399AE',
    borderRadius: 1,
    opacity: 0.4,
  },
  iconCoin: {
    width: 18,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9399AE',
    opacity: 0.5,
    position: 'absolute',
    left: 4,
    bottom: 4,
  },
  iconHouseSmall: {
    width: 28,
    height: 22,
    backgroundColor: '#9399AE',
    borderRadius: 3,
    opacity: 0.5,
  },
  iconPersonGroup: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
  },
  iconPerson: {
    width: 12,
    height: 14,
    backgroundColor: '#9399AE',
    borderRadius: 6,
    opacity: 0.6,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 11,
    color: C.textMid,
    textAlign: 'center',
    lineHeight: 15,
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  getStartedText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* ─── DASHBOARD ─── */
  dashRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  dashHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  padpalLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  padpalLogoBlack: {
    fontSize: 26,
    fontWeight: '800',
    color: C.textDark,
    letterSpacing: -0.5,
  },
  padpalLogoBlue: {
    fontSize: 26,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: -0.5,
  },
  padpalMascot: {
    marginLeft: 6,
    width: 36,
    height: 36,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#BEC9E8',
    position: 'absolute',
    bottom: 0,
  },
  mascotRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#A8B4D8',
    position: 'absolute',
    top: 2,
  },
  dashScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textDark,
    marginBottom: 14,
  },
  whosHomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  avatarCol: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  avatarFace: {
    width: 30,
    height: 34,
    borderRadius: 15,
    marginBottom: -4,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.white,
  },
  avatarName: {
    fontSize: 12,
    color: C.textMid,
    fontWeight: '500',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaderRank: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textMid,
    width: 22,
  },
  leaderAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginRight: 12,
  },
  leaderAvatarFace: {
    width: 26,
    height: 30,
    borderRadius: 13,
    marginBottom: -4,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textDark,
  },
  crownEmoji: {
    fontSize: 14,
  },
  leaderPts: {
    fontSize: 13,
    color: C.textMid,
    marginLeft: 'auto',
  },
  progressTrack: {
    height: 16,
    backgroundColor: '#EEF1F8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  progressLabel: {
    fontSize: 10,
    color: C.white,
    fontWeight: '600',
  },
  billsSection: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  billsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textDark,
  },
  seeAllBtn: {
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: 13,
    color: C.textMid,
    fontWeight: '500',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  billName: {
    fontSize: 15,
    color: C.textDark,
    fontWeight: '500',
  },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textDark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    color: C.navInactive,
  },
  navLabelActive: {
    color: C.primary,
    fontWeight: '600',
  },

  /* ─── LOG CHORE V2 ─── */
  v2Root: {
    flex: 1,
    backgroundColor: '#E8EBF0',
  },
  v2TopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  v2Cancel: {
    fontSize: 17,
    color: C.primary,
  },
  v2SubmitBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  v2SubmitText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
  v2Scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  v2Title: {
    fontSize: 34,
    fontWeight: '800',
    color: C.textDark,
    marginBottom: 20,
  },
  v2Row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  v2SelectCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  v2SelectIcon: {
    width: 32,
    height: 32,
    backgroundColor: C.bg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2PhotoCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  v2PhotoIcon: {
    width: 32,
    height: 32,
    backgroundColor: C.primary + '22',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2SelectLabel: {
    fontSize: 11,
    color: C.textLight,
    marginBottom: 2,
  },
  v2SelectValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textDark,
  },
  v2QuickCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  v2QuickTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textDark,
    marginBottom: 14,
  },
  v2QuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  v2QuickBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  v2QuickEmoji: {
    fontSize: 28,
  },
  v2QuickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textDark,
  },
  v2AiNote: {
    textAlign: 'center',
    color: C.textLight,
    fontSize: 13,
    marginBottom: 20,
  },
  v2BlurSection: {
    opacity: 0.25,
    gap: 12,
  },
  v2BlurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  v2BlurDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  v2BlurLine: {
    flex: 1,
    height: 18,
    backgroundColor: C.textLight,
    borderRadius: 9,
  },
  v2BottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  v2NavTab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  v2NavLabel: {
    fontSize: 10,
    color: C.navInactive,
  },

  /* ─── LOG CHORE V1 ─── */
  v1Overlay: {
    flex: 1,
    backgroundColor: '#1A1D2E',
  },
  v1Backdrop: {
    flex: 1,
    opacity: 0.6,
    padding: 16,
    paddingTop: 48,
  },
  v1DashPreview: {
    gap: 12,
  },
  v1PreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  v1PreviewLogo: {},
  v1PreviewBell: {
    position: 'relative',
  },
  v1BellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
  v1PreviewCards: {
    flexDirection: 'row',
    gap: 10,
  },
  v1PreviewCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  v1PreviewCard2: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    width: '45%',
  },
  v1PreviewCardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  v1PreviewCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
  v1Sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 0,
  },
  v1Handle: {
    width: 40,
    height: 4,
    backgroundColor: C.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  v1MascotArea: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
  },
  v1SprayBottle: {
    width: 40,
    height: 60,
    position: 'relative',
  },
  v1BottleBody: {
    width: 28,
    height: 48,
    backgroundColor: '#A8C4E8',
    borderRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 6,
  },
  v1BottleNozzle: {
    width: 20,
    height: 10,
    backgroundColor: '#E89AA8',
    borderRadius: 4,
    position: 'absolute',
    top: 4,
    right: 0,
  },
  v1BottleTrigger: {
    width: 10,
    height: 18,
    backgroundColor: '#D4D8E8',
    borderRadius: 3,
    position: 'absolute',
    right: 4,
    top: 12,
  },
  v1Sponge: {
    width: 44,
    height: 30,
    backgroundColor: '#F5D87A',
    borderRadius: 8,
    marginTop: 24,
  },
  v1Bubble: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.primary,
    opacity: 0.5,
    position: 'absolute',
    right: 60,
    top: 6,
  },
  v1Title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  v1PhotoArea: {
    borderWidth: 2,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    backgroundColor: '#FAFBFD',
    gap: 6,
  },
  v1PhotoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textDark,
  },
  v1PhotoSub: {
    fontSize: 13,
    color: C.textLight,
    textAlign: 'center',
  },
  v1FieldRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  v1FieldGroup: {
    flex: 1,
  },
  v1FieldLabel: {
    fontSize: 13,
    color: C.textMid,
    marginBottom: 6,
    fontWeight: '500',
  },
  v1Dropdown: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  v1DropdownList: {
    marginTop: 4,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  v1DropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  v1DropdownItemText: {
    fontSize: 15,
    color: C.textDark,
  },
  v1NotesInput: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.textDark,
    height: 46,
  },
  v1SubmitBtn: {
    backgroundColor: '#4CAF81',
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF81',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  v1SubmitText: {
    color: C.white,
    fontSize: 17,
    fontWeight: '700',
  },
  v1BottomNav: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  v1NavTab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  v1NavLabel: {
    fontSize: 10,
    color: C.navInactive,
  },
});
