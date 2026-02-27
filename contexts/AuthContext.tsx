import { supabase } from '@/lib/supabase';
import { hydrateFromSupabase, useClosetStore } from '@/stores/closetStore';
import { useSocialStore } from '@/stores/socialStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Required for expo-auth-session on web
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username?: string, firstName?: string, lastName?: string, dob?: string) => Promise<{ needsConfirmation: boolean }>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (session?.user) {
        useClosetStore.getState().setUserId(session.user.id);
        hydrateFromSupabase(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        // Wire user ID into local store and hydrate on sign-in
        if (session?.user) {
          useClosetStore.getState().setUserId(session.user.id);
          if (event === 'SIGNED_IN') {
            hydrateFromSupabase(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          useClosetStore.getState().setUserId(null);
        }

        // Auto-create profile row for new users (no DB trigger exists)
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const userId = session.user.id;
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (!existing) {
            const displayName =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0] ||
              'User';
            const username =
              session.user.user_metadata?.username ||
              session.user.email?.split('@')[0];

            await supabase.from('profiles').upsert({
              id: userId,
              display_name: displayName,
              username: username,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, username?: string, firstName?: string, lastName?: string, dob?: string): Promise<{ needsConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
          dob,
        }
      }
    });
    if (error) throw error;
    // If the user is returned but session is null, email confirmation is needed
    const needsConfirmation = !!data.user && !data.session;
    return { needsConfirmation };
  };

  const signInWithApple = async () => {
    if (Platform.OS === 'ios') {
      // Native Apple Sign In on iOS
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } else {
      // Web/Android: use OAuth redirect
      const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'wardrobewizai' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);

          // Try PKCE first (code in search params)
          const code = url.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            return;
          }

          // Fallback to Implicit (tokens in hash)
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          }
        }
      }
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = AuthSession.makeRedirectUri({ scheme: 'wardrobewizai' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);

        // Check for error in query or hash
        const queryError = url.searchParams.get('error');
        const queryErrorDesc = url.searchParams.get('error_description');
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const hashError = hashParams.get('error');
        const hashErrorDesc = hashParams.get('error_description');

        if (queryError || hashError) {
          const desc = queryErrorDesc || hashErrorDesc;
          throw new Error(desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : (queryError || hashError)!);
        }

        // Try PKCE first (code in search params)
        const code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          return;
        }

        // Fallback to Implicit (tokens in hash)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
  };

  const signOut = async () => {
    useClosetStore.getState().clearAllData();
    useSocialStore.getState().clearAllData();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const deleteAccount = async () => {
    const userId = session?.user?.id;
    if (!userId) throw new Error('No authenticated user');

    // 1. Delete follows (both directions)
    await supabase.from('follows').delete().eq('follower_id', userId);
    await supabase.from('follows').delete().eq('following_id', userId);

    // 2. Delete posts
    await supabase.from('posts').delete().eq('user_id', userId);

    // 3. Delete digital twin
    await supabase.from('digital_twins').delete().eq('user_id', userId);

    // 4. Delete outfits
    await supabase.from('outfits').delete().eq('user_id', userId);

    // 5. Delete items
    await supabase.from('items').delete().eq('user_id', userId);

    // 6. Delete storage files (wardrobe-images bucket)
    try {
      const { data: files } = await supabase.storage
        .from('wardrobe-images')
        .list(userId);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from('wardrobe-images').remove(paths);
      }
    } catch {
      // Storage cleanup is best-effort
    }

    // 7. Delete profile (cascade handles any remaining refs)
    await supabase.from('profiles').delete().eq('id', userId);

    // 8. Clear all local storage
    useClosetStore.getState().clearAllData();
    useSocialStore.getState().clearAllData();
    await AsyncStorage.clear();

    // 9. Sign out
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
