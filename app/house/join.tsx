import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';
import { supabase } from '../../src/lib/supabase';

export default function JoinHouseScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [houseName, setHouseName] = useState('');

    const handleJoin = async () => {
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

            // Find house by invite code
            const { data: house, error: houseError } = await supabase
                .from('houses')
                .select('*')
                .eq('invite_code', code.toUpperCase())
                .maybeSingle();

            if (houseError || !house) {
                throw new Error('Invalid invite code. Try again.');
            }

            // Check if already member
            const { data: existing } = await supabase
                .from('memberships')
                .select('*')
                .eq('house_id', house.id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                router.replace('/dashboard');
                return;
            }

            // Create membership
            const { error: joinError } = await supabase
                .from('memberships')
                .insert({
                    house_id: house.id,
                    user_id: user.id,
                    role: 'member',
                });

            if (joinError) throw joinError;

            setHouseName(house.name);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {!success ? (
                <View>
                    <View style={styles.iconWrap}>
                        <Text style={styles.iconEmoji}>🔑</Text>
                    </View>
                    <Text style={styles.title}>Join a House</Text>
                    <Text style={styles.subtitle}>Enter the invite code from your roommate</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Invite Code</Text>
                        <TextInput
                            style={styles.codeInput}
                            value={code}
                            onChangeText={(text) => setCode(text.toUpperCase())}
                            placeholder="ABC123"
                            placeholderTextColor="#94A3B8"
                            maxLength={6}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryButton, (code.length < 4 || loading) && styles.buttonDisabled]}
                        onPress={handleJoin}
                        disabled={code.length < 4 || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Join House →</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
                        <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={styles.iconEmoji}>✅</Text>
                    </View>
                    <Text style={styles.title}>You're In!</Text>
                    <Text style={styles.subtitle}>
                        Welcome to <Text style={{ fontWeight: '800', color: '#0F172A' }}>{houseName}</Text>
                    </Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/dashboard')}>
                        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center', flexGrow: 1 },
    iconWrap: {
        width: 64, height: 64, borderRadius: 16, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16,
    },
    iconEmoji: { fontSize: 32 },
    title: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6 },
    codeInput: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 16, fontSize: 28, fontWeight: '800',
        color: '#0F172A', textAlign: 'center', letterSpacing: 8,
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
    buttonDisabled: { opacity: 0.5 },
});
