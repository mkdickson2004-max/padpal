import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/providers/AuthProvider';
import { supabase } from '../src/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

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

export default function LandingScreen() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            checkHouse();
        }
    }, [user, loading]);

    const checkHouse = async () => {
        const { data } = await supabase
            .from('memberships')
            .select('id')
            .eq('user_id', user!.id)
            .maybeSingle();

        if (data) {
            router.replace('/dashboard');
        }
    };

    const signInWithGoogle = async () => {
        // Force the 'padpal' scheme to bypass Supabase's "+" validation issue 
        // that blocks "exp+padpal://"
        const redirectUrl = 'padpal://auth/callback';

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: false,
            },
        });

        if (data?.url) {
            const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            if (res.type === 'success') {
                const url = res.url;
                const params = new URLSearchParams(url.split('#')[1] || '');
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                }
            } else if (res.type === 'cancel') {
                console.log('Login cancelled');
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.welcomeRoot, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.primary} />
            </View>
        );
    }

    if (user) {
        return (
            <SafeAreaView style={styles.welcomeRoot}>
                <View style={styles.welcomeContainer}>
                    <View style={styles.houseCircle}>
                        <View style={styles.housePlaceholder}>
                            <View style={styles.houseRoof} />
                            <View style={styles.houseBody}>
                                <View style={styles.houseWindow} />
                                <View style={styles.houseDoor} />
                                <View style={styles.houseWindow} />
                            </View>
                        </View>
                        <View style={[styles.leaf, { top: 28, left: 90, transform: [{ rotate: '-30deg' }] }]} />
                        <View style={[styles.leaf, { top: 40, right: 80, transform: [{ rotate: '20deg' }] }]} />
                        <View style={[styles.leaf, { top: 20, right: 110, transform: [{ rotate: '-10deg' }] }]} />
                    </View>

                    <Text style={styles.welcomeTitle}>Welcome back!</Text>
                    <Text style={styles.welcomeSub}>Ready to manage your house?</Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/house/create')}>
                        <Text style={styles.primaryButtonText}>Create a House</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/house/join')}>
                        <Text style={styles.secondaryButtonText}>Join with Code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.welcomeRoot}>
            <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
            <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>

                {/* House illustration placeholder */}
                <View style={styles.houseCircle}>
                    <View style={styles.housePlaceholder}>
                        {/* Roof */}
                        <View style={styles.houseRoof} />
                        {/* Body */}
                        <View style={styles.houseBody}>
                            <View style={styles.houseWindow} />
                            <View style={styles.houseDoor} />
                            <View style={styles.houseWindow} />
                        </View>
                    </View>
                    {/* Decorative leaves */}
                    <View style={[styles.leaf, { top: 28, left: 90, transform: [{ rotate: '-30deg' }] }]} />
                    <View style={[styles.leaf, { top: 40, right: 80, transform: [{ rotate: '20deg' }] }]} />
                    <View style={[styles.leaf, { top: 20, right: 110, transform: [{ rotate: '-10deg' }] }]} />
                </View>

                {/* Headline */}
                <Text style={styles.welcomeTitle}>The House OS{'\n'}for Roommates</Text>
                <Text style={styles.welcomeSub}>Track who's home, split bills automatically, complete chores, and compete for MVP.</Text>

                {/* Feature cards */}
                <View style={styles.featureRow}>
                    <FeatureCard
                        iconType="chores"
                        title="Chores"
                        desc="Organize and track tasks."
                    />
                    <FeatureCard
                        iconType="bills"
                        title="Bills"
                        desc="Manage and split expenses."
                    />
                    <FeatureCard
                        iconType="home"
                        title="Who's Home"
                        desc="See who's in directly."
                    />
                </View>

                {/* Get Started */}
                <TouchableOpacity style={styles.getStartedBtn} onPress={signInWithGoogle} activeOpacity={0.88}>
                    <Text style={styles.getStartedText}>🔵 Sign in with Google</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function FeatureCard({ iconType, title, desc }: { iconType: string; title: string; desc: string }) {
    return (
        <View style={styles.featureCard}>
            <FeatureIcon type={iconType} />
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
        </View>
    );
}

function FeatureIcon({ type }: { type: string }) {
    if (type === 'chores') {
        return (
            <View style={styles.featureIconWrap}>
                <View style={styles.iconBroom} />
                <View style={styles.iconList}>
                    <View style={styles.iconListLine} />
                    <View style={styles.iconListLine} />
                    <View style={styles.iconListLine} />
                </View>
            </View>
        );
    }
    if (type === 'bills') {
        return (
            <View style={styles.featureIconWrap}>
                <View style={styles.iconCalendar}>
                    <View style={styles.iconCalendarTop} />
                    <View style={styles.iconCalendarGrid}>
                        {[...Array(6)].map((_, i) => (
                            <View key={i} style={styles.iconCalendarCell} />
                        ))}
                    </View>
                </View>
                <View style={styles.iconCoin} />
                <View style={[styles.iconCoin, { bottom: 0, left: 2 }]} />
            </View>
        );
    }
    // home / who's home
    return (
        <View style={styles.featureIconWrap}>
            <View style={styles.iconHouseSmall} />
            <View style={styles.iconPersonGroup}>
                <View style={styles.iconPerson} />
                <View style={[styles.iconPerson, { marginLeft: 4 }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    welcomeContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
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
        backgroundColor: C.white,
        borderRadius: 32,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#000',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 6,
    },
    getStartedText: {
        color: C.textDark,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    primaryButton: {
        backgroundColor: C.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%',
        alignItems: 'center', marginBottom: 12,
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    primaryButtonText: { color: C.white, fontSize: 17, fontWeight: '700' },
    secondaryButton: {
        backgroundColor: C.white, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%',
        alignItems: 'center', marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8,
    },
    secondaryButtonText: { color: C.textDark, fontSize: 17, fontWeight: '700' },
    signOutButton: { padding: 12 },
    signOutText: { color: C.textLight, fontSize: 15, fontWeight: '600' },
});
