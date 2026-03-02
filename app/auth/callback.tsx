import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleUrl = async () => {
            const url = await Linking.getInitialURL();
            if (url) {
                // Extract tokens from URL fragment
                const params = new URLSearchParams(url.split('#')[1] || '');
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                }
            }
            router.replace('/');
        };

        handleUrl();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 16, color: '#64748B' }}>Completing sign in...</Text>
        </View>
    );
}
