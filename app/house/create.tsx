import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import * as Clipboard from 'expo-clipboard';

export default function CreateHouseScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [houseName, setHouseName] = useState('');
    const [address, setAddress] = useState('');
    const [radius, setRadius] = useState(150);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const generateInviteCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreate = async () => {
        setLoading(true);
        setError('');

        try {
            if (!user) { router.replace('/'); return; }

            // Ensure user profile exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!existingUser) {
                const { error: userError } = await supabase
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email!,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        avatar_url: user.user_metadata?.avatar_url || null,
                    });
                if (userError && userError.code !== '23505') {
                    throw new Error('Failed to create user profile: ' + userError.message);
                }
            }

            const code = generateInviteCode();

            const { data: house, error: houseError } = await supabase
                .from('houses')
                .insert({
                    name: houseName,
                    address,
                    geofence_radius_m: radius,
                    invite_code: code,
                    created_by: user.id,
                    lat: 0, lng: 0,
                })
                .select()
                .single();

            if (houseError) {
                if (houseError.code === '23505' && houseError.message.includes('invite_code')) {
                    // Retry with new code
                    const retryCode = generateInviteCode();
                    const { data: retryHouse, error: retryError } = await supabase
                        .from('houses')
                        .insert({
                            name: houseName, address,
                            geofence_radius_m: radius,
                            invite_code: retryCode,
                            created_by: user.id,
                            lat: 0, lng: 0,
                        })
                        .select()
                        .single();
                    if (retryError) throw retryError;
                    await supabase.from('memberships').insert({
                        house_id: retryHouse.id, user_id: user.id, role: 'admin',
                    });
                    setInviteCode(retryCode);
                    setStep(3);
                    return;
                }
                throw houseError;
            }

            await supabase.from('memberships').insert({
                house_id: house.id, user_id: user.id, role: 'admin',
            });

            setInviteCode(code);
            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = async () => {
        try {
            await Clipboard.setStringAsync(inviteCode);
            Alert.alert('Copied!', 'Invite code copied to clipboard');
        } catch {
            Alert.alert('Code', inviteCode);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Progress Bar */}
            <View style={styles.progressRow}>
                {[1, 2, 3].map(s => (
                    <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
                ))}
            </View>

            {step === 1 && (
                <View>
                    <View style={styles.iconWrap}>
                        <Text style={styles.iconEmoji}>🏠</Text>
                    </View>
                    <Text style={styles.title}>Create Your House</Text>
                    <Text style={styles.subtitle}>Set up PadPal for your home</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>House Name</Text>
                        <TextInput
                            style={styles.input}
                            value={houseName}
                            onChangeText={setHouseName}
                            placeholder="e.g., The Castle, 420 College Ave"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address</Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Full address"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Geofence Radius: <Text style={{ color: '#2563EB' }}>{radius}m</Text></Text>
                        <Text style={styles.hint}>Roommates must be within this distance to count as "home"</Text>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryButton, (!houseName || !address) && styles.buttonDisabled]}
                        onPress={() => setStep(2)}
                        disabled={!houseName || !address}
                    >
                        <Text style={styles.primaryButtonText}>Continue →</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {step === 2 && (
                <View>
                    <Text style={styles.title}>Confirm Details</Text>
                    <Text style={styles.subtitle}>Review before creating</Text>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>HOUSE NAME</Text>
                            <Text style={styles.summaryValue}>{houseName}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>ADDRESS</Text>
                            <Text style={styles.summaryValue}>{address}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>GEOFENCE</Text>
                            <Text style={styles.summaryValue}>{radius}m radius</Text>
                        </View>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Create House</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                        <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            )}

            {step === 3 && (
                <View>
                    <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={styles.iconEmoji}>✅</Text>
                    </View>
                    <Text style={styles.title}>House Created!</Text>
                    <Text style={styles.subtitle}>Share this code with your roommates</Text>

                    <View style={styles.codeCard}>
                        <Text style={styles.codeLabel}>INVITE CODE</Text>
                        <Text style={styles.codeText}>{inviteCode}</Text>
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/dashboard')}>
                        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={copyCode}>
                        <Text style={styles.secondaryButtonText}>Copy Code</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    progressRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
    progressDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
    progressDotActive: { backgroundColor: '#2563EB' },
    iconWrap: {
        width: 64, height: 64, borderRadius: 16, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16,
    },
    iconEmoji: { fontSize: 32 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6 },
    hint: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    input: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A',
    },
    errorText: {
        color: '#E11D48', fontSize: 14, fontWeight: '600', backgroundColor: '#FFF1F2',
        padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
        marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8,
    },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    secondaryButton: {
        backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
        marginBottom: 12,
    },
    secondaryButtonText: { color: '#475569', fontSize: 17, fontWeight: '700' },
    backButton: { alignItems: 'center', paddingVertical: 12 },
    backButtonText: { color: '#94A3B8', fontSize: 15 },
    buttonDisabled: { opacity: 0.5 },
    summaryCard: {
        backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 24,
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    summaryRow: { marginBottom: 16 },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.5 },
    summaryValue: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 4 },
    codeCard: {
        backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#BFDBFE', borderRadius: 16,
        padding: 24, marginBottom: 24, alignItems: 'center',
    },
    codeLabel: { fontSize: 11, fontWeight: '700', color: '#3B82F6', letterSpacing: 1.5, marginBottom: 8 },
    codeText: { fontSize: 36, fontWeight: '800', color: '#1D4ED8', letterSpacing: 6 },
});
